import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Waitlist for full days. Someone waiting on a specific slot is emailed the
 * moment that slot frees up; someone waiting on the whole day hears about any
 * opening on it. Notification is best-effort and never blocks a cancellation.
 */

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(180),
      phone: z.string().trim().max(40).optional(),
      service: z.string().trim().max(120).optional(),
      sessionDate: dateKey,
      sessionTime: z.string().trim().max(40).optional(),
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWaitlistJoined } = await import("./notify-features.server");

    const { error } = await supabaseAdmin.from("waitlist_entries").insert({
      client_name: data.clientName,
      email: data.email,
      phone: data.phone || null,
      service: data.service || null,
      session_date: data.sessionDate,
      session_time: data.sessionTime || null,
    });

    if (error) {
      // 23505 means they're already waiting on this date — treat as success.
      if (error.code !== "23505") {
        console.error("Waitlist join failed", error);
        return { ok: false as const, reason: "We could not add you. Please try again." };
      }
      return { ok: true as const, already: true };
    }

    await sendWaitlistJoined({
      clientName: data.clientName,
      email: data.email,
      sessionDate: data.sessionDate,
      ...(data.sessionTime ? { sessionTime: data.sessionTime } : {}),
    });

    return { ok: true as const };
  });

export const adminWaitlist = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { todayKey } = await import("./schedule");

  const { data, error } = await supabaseAdmin
    .from("waitlist_entries")
    .select(
      "id, client_name, email, phone, service, session_date, session_time, status, created_at",
    )
    .gte("session_date", todayKey())
    .order("session_date", { ascending: true })
    .limit(200);

  if (error) throw new Error("Could not load the waitlist.");
  return data ?? [];
});

export const adminSetWaitlistStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["waiting", "notified", "converted", "expired"]),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("waitlist_entries")
      .update({
        status: data.status,
        ...(data.status === "notified" ? { notified_at: new Date().toISOString() } : {}),
      })
      .eq("id", data.id);

    if (error) return { ok: false as const, reason: "That change didn't save." };
    return { ok: true as const };
  });

/** Tell everyone waiting on a slot that it just opened. */
export const adminNotifyWaitlist = createServerFn({ method: "POST" })
  .validator(z.object({ sessionDate: dateKey, sessionTime: z.string().trim().max(40) }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { notifyWaitlistForSlot } = await import("./waitlist.server");
    const notified = await notifyWaitlistForSlot(data.sessionDate, data.sessionTime);
    return { ok: true as const, notified };
  });
