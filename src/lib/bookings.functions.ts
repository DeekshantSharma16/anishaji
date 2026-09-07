import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import {
  serviceNames,
  times,
  validateSlot,
  scheduleProblemMessage,
  todayKey,
  maxDateKey,
} from "./schedule";

const BOOKING_FIELDS =
  "id, client_name, email, service, session_date, session_time, location, status, manage_token";

/** Fields safe to hand back to the browser for a lookup. */
const PUBLIC_FIELDS =
  "id, client_name, email, service, session_date, session_time, location, status";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const manageToken = z.string().trim().min(12).max(80);

/** A coarse, privacy-preserving caller fingerprint for rate limiting. */
async function callerHash() {
  let raw = "unknown";
  try {
    const request = getRequest();
    raw =
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request?.headers.get("cf-connecting-ip") ||
      request?.headers.get("x-real-ip") ||
      "unknown";
  } catch {
    // No request context (e.g. during prerender). Fall through.
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${raw}:anisha-practice`),
  );
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const RATE_LIMIT = { max: 5, windowMinutes: 60 };

/**
 * Which times on a given date are already spoken for, either by a live
 * booking or by the practitioner blocking the slot.
 */
export const getAvailability = createServerFn({ method: "POST" })
  .validator(z.object({ sessionDate: dateKey }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [booked, blocked] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select("session_time")
        .eq("session_date", data.sessionDate)
        .in("status", ["pending", "confirmed"]),
      supabaseAdmin.from("blocked_slots").select("block_time").eq("block_date", data.sessionDate),
    ]);

    if (booked.error || blocked.error) {
      console.error("Availability lookup failed", booked.error || blocked.error);
      // Fail open rather than showing an empty diary; the unique index still
      // stops an actual collision at write time.
      return { taken: [] as string[], dayClosed: false };
    }

    const dayClosed = (blocked.data ?? []).some((row) => row.block_time === null);
    const taken = [
      ...(booked.data ?? []).map((row) => row.session_time),
      ...(blocked.data ?? []).map((row) => row.block_time).filter(Boolean),
    ] as string[];

    return { taken: Array.from(new Set(taken)), dayClosed };
  });

/** Next few genuinely open slots, to nudge someone who lands on a full day. */
export const getNextOpenSlots = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { isOpenDay, toDateKey } = await import("./schedule");

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("session_date, session_time")
    .gte("session_date", todayKey())
    .in("status", ["pending", "confirmed"]);

  if (error) return [] as { date: string; time: string }[];

  const taken = new Set((data ?? []).map((row) => `${row.session_date}|${row.session_time}`));
  const open: { date: string; time: string }[] = [];

  for (let day = 1; day <= 21 && open.length < 3; day += 1) {
    const key = toDateKey(new Date(Date.now() + day * 86_400_000));
    if (!isOpenDay(key)) continue;
    for (const time of times) {
      if (!taken.has(`${key}|${time}`)) {
        open.push({ date: key, time });
        break;
      }
    }
  }
  return open;
});

export const createBooking = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(180),
      phone: z.string().trim().max(40).optional(),
      service: z.string().trim().min(2).max(120),
      sessionDate: dateKey,
      sessionTime: z.string().trim().min(2).max(40),
      notes: z.string().trim().max(1000).optional(),
      /** Hidden field. Humans leave it empty; most bots fill it in. */
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) {
      // Silently reject, so the bot doesn't learn what caught it.
      return { ok: false as const, reason: "We could not save your request. Please try again." };
    }

    if (!serviceNames.includes(data.service)) {
      return { ok: false as const, reason: "Please choose one of the listed session types." };
    }

    const problem = validateSlot(data.sessionDate, data.sessionTime);
    if (problem) return { ok: false as const, reason: scheduleProblemMessage[problem] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBookingReceived } = await import("./notify.server");

    const hash = await callerHash();
    const since = new Date(Date.now() - RATE_LIMIT.windowMinutes * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("booking_attempts")
      .select("id", { count: "exact", head: true })
      .eq("client_hash", hash)
      .gte("created_at", since);

    if ((count ?? 0) >= RATE_LIMIT.max) {
      return {
        ok: false as const,
        reason:
          "That's several requests in a short while. Please email us instead and we'll sort it personally.",
      };
    }
    await supabaseAdmin.from("booking_attempts").insert({ client_hash: hash });

    const { data: blocked } = await supabaseAdmin
      .from("blocked_slots")
      .select("id")
      .eq("block_date", data.sessionDate)
      .or(`block_time.is.null,block_time.eq.${data.sessionTime}`)
      .limit(1);

    if (blocked?.length) {
      return { ok: false as const, reason: "That time has just been closed. Please pick another." };
    }

    const token = crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase();
    const intakeToken = crypto.randomUUID().replaceAll("-", "");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        client_name: data.clientName,
        email: data.email,
        phone: data.phone || null,
        service: data.service,
        session_date: data.sessionDate,
        session_time: data.sessionTime,
        notes: data.notes || null,
        manage_token: token,
        intake_token: intakeToken,
        client_hash: hash,
      })
      .select(BOOKING_FIELDS)
      .single();

    if (error) {
      // 23505 is the unique index firing: somebody took the slot first.
      if (error.code === "23505") {
        return {
          ok: false as const,
          reason: "Someone booked that time a moment ago. Please choose another slot.",
          slotTaken: true,
        };
      }
      console.error("Unable to create booking", error);
      return { ok: false as const, reason: "We could not save your request. Please try again." };
    }

    // Phone and note come from the form rather than the select, so the shared
    // BOOKING_FIELDS list stays free of anything we don't want echoed back to
    // the browser on reschedule and cancel.
    await sendBookingReceived({ ...booking, phone: data.phone ?? null, notes: data.notes ?? null });

    // Health history invite and calendar mirror are both best-effort: neither
    // should undo a booking that already saved.
    const { sendIntakeInvite } = await import("./notify-features.server");
    await sendIntakeInvite({
      email: data.email,
      clientName: data.clientName,
      service: data.service,
      sessionDate: data.sessionDate,
      intakeToken,
    });

    const { syncBooking } = await import("./gcal.server");
    await syncBooking(booking.id);

    return { ok: true as const, booking };
  });

export const findBooking = createServerFn({ method: "POST" })
  .validator(z.object({ manageToken }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(PUBLIC_FIELDS)
      .eq("manage_token", data.manageToken.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Unable to find booking", error);
      throw new Error("We could not look up that booking.");
    }
    return booking;
  });

export const rescheduleBooking = createServerFn({ method: "POST" })
  .validator(
    z.object({
      manageToken,
      sessionDate: dateKey,
      sessionTime: z.string().trim().min(2).max(40),
    }),
  )
  .handler(async ({ data }) => {
    const problem = validateSlot(data.sessionDate, data.sessionTime);
    if (problem) return { ok: false as const, reason: scheduleProblemMessage[problem] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBookingChanged } = await import("./notify.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({ session_date: data.sessionDate, session_time: data.sessionTime })
      .eq("manage_token", data.manageToken.trim().toUpperCase())
      .in("status", ["pending", "confirmed"])
      .select(BOOKING_FIELDS)
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, reason: "That slot is taken. Please choose another time." };
      }
      console.error("Unable to reschedule booking", error);
      return { ok: false as const, reason: "We could not update that booking." };
    }
    if (!booking) {
      return {
        ok: false as const,
        reason: "That booking can no longer be changed. Please email us.",
      };
    }

    await sendBookingChanged(booking, "rescheduled");
    const { syncBooking } = await import("./gcal.server");
    await syncBooking(booking.id);
    return { ok: true as const, booking };
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .validator(z.object({ manageToken, reason: z.string().trim().max(400).optional() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBookingChanged } = await import("./notify.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: data.reason || null,
      })
      .eq("manage_token", data.manageToken.trim().toUpperCase())
      .in("status", ["pending", "confirmed"])
      .select(BOOKING_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("Unable to cancel booking", error);
      return { ok: false as const, reason: "We could not cancel that booking." };
    }
    if (!booking) {
      return { ok: false as const, reason: "That booking is already cancelled or completed." };
    }

    await sendBookingChanged(booking, "cancelled");

    // A freed slot is worth more to the people waiting than to the diary.
    const { notifyWaitlistForSlot } = await import("./waitlist.server");
    await notifyWaitlistForSlot(booking.session_date, booking.session_time);

    const { syncBooking } = await import("./gcal.server");
    await syncBooking(booking.id);

    return { ok: true as const, booking };
  });

export const captureLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().trim().email().max(180),
      source: z.string().trim().max(60).default("desk-reset"),
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendLeadMagnet } = await import("./notify.server");

    const { error } = await supabaseAdmin
      .from("leads")
      .upsert({ email: data.email, source: data.source }, { onConflict: "email" });

    if (error && error.code !== "23505") {
      console.error("Unable to save lead", error);
      return { ok: false as const, reason: "That didn't send. Please try again." };
    }

    await sendLeadMagnet(data.email);
    return { ok: true as const };
  });

export const bookingWindow = { min: todayKey, max: maxDateKey };
