import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Practitioner-side Google Calendar connection: status, the consent link, a
 * manual resync, and disconnect. The refresh token stays in the database.
 */

export const adminCalendarStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { calendarConfigured } = await import("./gcal.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("calendar_connections")
    .select("account_email, calendar_id, connected_at, updated_at")
    .maybeSingle();

  return {
    configured: calendarConfigured(),
    connection: data ?? null,
  };
});

export const adminCalendarAuthUrl = createServerFn({ method: "POST" })
  .validator(z.object({ origin: z.string().trim().max(200).optional() }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { calendarConfigured, authorizeUrl } = await import("./gcal.server");
    const { signPayload } = await import("./admin-auth.server");

    if (!calendarConfigured()) {
      return {
        ok: false as const,
        reason: "Add the Google client ID and secret first, then connect.",
      };
    }

    // The state is a short-lived signed nonce, checked in the callback so a
    // stranger can't attach their own calendar to the practice.
    const expiry = String(Date.now() + 10 * 60_000);
    const state = `${expiry}.${await signPayload(`gcal:${expiry}`)}`;

    return { ok: true as const, url: authorizeUrl(state, data.origin) };
  });

export const adminCalendarDisconnect = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  await supabaseAdmin.from("calendar_connections").delete().eq("id", true);
  await supabaseAdmin
    .from("bookings")
    .update({ google_event_id: null })
    .not("google_event_id", "is", null);

  return { ok: true as const };
});

/** Push every upcoming live booking into the connected calendar. */
export const adminCalendarResync = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { syncBooking } = await import("./gcal.server");
  const { todayKey } = await import("./schedule");

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("id")
    .gte("session_date", todayKey())
    .in("status", ["pending", "confirmed"])
    .limit(100);

  for (const booking of bookings ?? []) {
    await syncBooking(booking.id);
  }

  return { ok: true as const, synced: bookings?.length ?? 0 };
});
