import { site } from "./site-config";

/**
 * Google Calendar sync for the practitioner's own diary.
 *
 * One connection, stored server-side: a refresh token in calendar_connections
 * that never reaches the browser. Confirmed bookings become events; moves and
 * cancellations follow. Every function here is best-effort — a Google outage
 * must not stop a booking from being saved.
 *
 * Required env:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   (OAuth client, web application)
 *   ADMIN_SESSION_SECRET                      (signs the OAuth state)
 */

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export function calendarConfigured() {
  return Boolean(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]);
}

export function redirectUri(origin?: string) {
  const base = (origin || process.env["PUBLIC_SITE_URL"] || site.url).replace(/\/$/, "");
  return `${base}/api/public/google-calendar-callback`;
}

export function authorizeUrl(state: string, origin?: string) {
  const params = new URLSearchParams({
    client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  return (await response.json()) as TokenResponse;
}

export async function exchangeCode(code: string, origin?: string) {
  return tokenRequest({
    code,
    client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
    client_secret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
    redirect_uri: redirectUri(origin),
    grant_type: "authorization_code",
  });
}

/** A valid access token for the stored connection, refreshing when stale. */
async function accessToken() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: connection } = await supabaseAdmin
    .from("calendar_connections")
    .select("refresh_token, access_token, expires_at, calendar_id")
    .maybeSingle();

  if (!connection || !calendarConfigured()) return null;

  const stillFresh =
    connection.access_token &&
    connection.expires_at &&
    new Date(connection.expires_at).getTime() > Date.now() + 60_000;

  if (stillFresh) {
    return { token: connection.access_token as string, calendarId: connection.calendar_id };
  }

  const refreshed = await tokenRequest({
    refresh_token: connection.refresh_token,
    client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
    client_secret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
    grant_type: "refresh_token",
  });

  if (!refreshed.access_token) {
    console.error("Google token refresh failed", refreshed.error, refreshed.error_description);
    return null;
  }

  await supabaseAdmin.from("calendar_connections").update({
    access_token: refreshed.access_token,
    expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { token: refreshed.access_token, calendarId: connection.calendar_id };
}

export async function googleUserEmail(token: string) {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const info = (await response.json()) as { email?: string };
    return info.email ?? null;
  } catch {
    return null;
  }
}

type BookingEvent = {
  id: string;
  client_name: string;
  email: string;
  service: string;
  session_date: string;
  session_time: string;
  location?: string | null;
  google_event_id?: string | null;
  notes?: string | null;
};

/** "10:00 AM" (or "10:00") on a date key, as an RFC3339 local time. */
function toIsoLocal(sessionDate: string, sessionTime: string, addMinutes = 0) {
  const match = sessionTime.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  let hours = match ? Number(match[1]) : 9;
  const minutes = match ? Number(match[2]) : 0;
  const meridiem = match?.[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const total = hours * 60 + minutes + addMinutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${sessionDate}T${hh}:${mm}:00`;
}

const TIMEZONE = "Asia/Kolkata";

/** Create or move the calendar event for a booking. Returns the event id. */
export async function upsertBookingEvent(booking: BookingEvent) {
  try {
    const auth = await accessToken();
    if (!auth) return null;

    const body = {
      summary: `${booking.service} — ${booking.client_name}`,
      description: [
        `Client: ${booking.client_name} (${booking.email})`,
        booking.notes ? `Notes: ${booking.notes}` : null,
        `Diary: ${site.url}/admin`,
      ]
        .filter(Boolean)
        .join("\n"),
      location: booking.location || `${site.address.street}, ${site.address.locality}`,
      start: {
        dateTime: toIsoLocal(booking.session_date, booking.session_time),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: toIsoLocal(booking.session_date, booking.session_time, 60),
        timeZone: TIMEZONE,
      },
    };

    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`;
    const response = await fetch(
      booking.google_event_id ? `${base}/${booking.google_event_id}` : base,
      {
        method: booking.google_event_id ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      console.error("Calendar event write failed", response.status, await response.text());
      return null;
    }

    const event = (await response.json()) as { id?: string };
    return event.id ?? null;
  } catch (error) {
    console.error("Calendar sync error", error);
    return null;
  }
}

export async function deleteBookingEvent(eventId: string) {
  try {
    const auth = await accessToken();
    if (!auth) return false;
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${auth.token}` } },
    );
    return response.ok || response.status === 410;
  } catch (error) {
    console.error("Calendar delete error", error);
    return false;
  }
}

/** Sync helper used by the booking flows: writes the event and stores its id. */
export async function syncBooking(bookingId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, client_name, email, service, session_date, session_time, location, status, notes, google_event_id",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return;

  const live = booking.status === "confirmed" || booking.status === "pending";

  if (!live) {
    if (booking.google_event_id) {
      await deleteBookingEvent(booking.google_event_id);
      await supabaseAdmin.from("bookings").update({ google_event_id: null }).eq("id", booking.id);
    }
    return;
  }

  const eventId = await upsertBookingEvent(booking);
  if (eventId && eventId !== booking.google_event_id) {
    await supabaseAdmin.from("bookings").update({ google_event_id: eventId }).eq("id", booking.id);
  }
}
