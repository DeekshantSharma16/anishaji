import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { times, todayKey } from "./schedule";

/**
 * The practitioner diary sits behind a single shared passcode held in
 * ADMIN_PASSCODE, exchanged for a signed, httpOnly cookie. That is the right
 * weight for a one-practitioner clinic: no user table, no password resets, and
 * the secret never reaches the browser.
 *
 * Required env:
 *   ADMIN_PASSCODE=<something long>
 *   ADMIN_SESSION_SECRET=<random 32+ chars>
 *
 * If you later add a second practitioner, swap this for Supabase Auth and
 * check the session in these same handlers.
 */

const COOKIE = "practice_session";
const SESSION_HOURS = 12;

async function sign(payload: string) {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time-ish comparison, to avoid leaking the passcode by timing. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function requireAdmin() {
  const raw = getCookie(COOKIE);
  if (!raw) throw new Error("Not signed in.");
  const [expiry, signature] = raw.split(".");
  if (!expiry || !signature) throw new Error("Not signed in.");
  if (Number(expiry) < Date.now()) throw new Error("Your session expired. Please sign in again.");
  if (!safeEqual(await sign(expiry), signature)) throw new Error("Not signed in.");
}

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ passcode: z.string().min(4).max(200) }))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSCODE"];
    if (!expected) return { ok: false as const, reason: "Admin access is not configured yet." };

    // A small delay blunts brute forcing without needing extra infrastructure.
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!safeEqual(data.passcode, expected)) {
      return { ok: false as const, reason: "That passcode doesn't match." };
    }

    const expiry = String(Date.now() + SESSION_HOURS * 3_600_000);
    setCookie(COOKIE, `${expiry}.${await sign(expiry)}`, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_HOURS * 3600,
    });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return { ok: true as const };
});

export const adminSession = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireAdmin();
    return { signedIn: true };
  } catch {
    return { signedIn: false };
  }
});

export const adminDiary = createServerFn({ method: "POST" })
  .validator(
    z.object({
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      status: z.enum(["all", "pending", "confirmed", "cancelled"]).default("all"),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("bookings")
      .select(
        "id, client_name, email, phone, service, session_date, session_time, status, notes, internal_notes, created_at",
      )
      .gte("session_date", data.from || todayKey())
      .order("session_date", { ascending: true })
      .order("session_time", { ascending: true })
      .limit(200);

    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) {
      console.error("Diary load failed", error);
      throw new Error("Could not load the diary.");
    }

    const { data: blocks } = await supabaseAdmin
      .from("blocked_slots")
      .select("id, block_date, block_time, reason")
      .gte("block_date", todayKey())
      .order("block_date", { ascending: true });

    return { bookings: rows ?? [], blocks: blocks ?? [] };
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "confirmed", "cancelled", "declined", "completed"]),
      internalNotes: z.string().max(2000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBookingChanged } = await import("./notify.server");

    const now = new Date().toISOString();
    const patch = {
      status: data.status,
      ...(data.status === "confirmed" ? { confirmed_at: now } : {}),
      ...(data.status === "cancelled" || data.status === "declined" ? { cancelled_at: now } : {}),
      ...(data.internalNotes !== undefined ? { internal_notes: data.internalNotes } : {}),
    };

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update(patch)
      .eq("id", data.id)
      .select(
        "id, client_name, email, service, session_date, session_time, location, status, manage_token",
      )
      .maybeSingle();

    if (error || !booking) {
      console.error("Status update failed", error);
      return { ok: false as const, reason: "Could not update that booking." };
    }

    if (data.status === "confirmed") await sendBookingChanged(booking, "confirmed");
    if (data.status === "cancelled" || data.status === "declined") {
      await sendBookingChanged(booking, "cancelled");
    }
    return { ok: true as const, booking };
  });

export const adminBlockSlot = createServerFn({ method: "POST" })
  .validator(
    z.object({
      blockDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      /** Empty string blocks the whole day. */
      blockTime: z.string().max(40).optional(),
      reason: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    if (data.blockTime && !times.includes(data.blockTime)) {
      return { ok: false as const, reason: "That time isn't on the schedule." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("blocked_slots").insert({
      block_date: data.blockDate,
      block_time: data.blockTime || null,
      reason: data.reason || null,
    });

    if (error && error.code !== "23505") {
      console.error("Block failed", error);
      return { ok: false as const, reason: "Could not block that time." };
    }
    return { ok: true as const };
  });

export const adminUnblockSlot = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("blocked_slots").delete().eq("id", data.id);
    return { ok: true as const };
  });

/** Client history: every visit by one email address. */
export const adminClientHistory = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("bookings")
      .select("id, service, session_date, session_time, status, notes, internal_notes")
      .eq("email", data.email)
      .order("session_date", { ascending: false })
      .limit(50);
    return rows ?? [];
  });
