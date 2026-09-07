import { findService } from "./schedule";
import { site } from "./site-config";

/**
 * Turns "2026-09-14" + "10:30 AM" into a UTC stamp for calendar files.
 * The practice runs on IST (+5:30), which is fixed year-round, so a plain
 * offset is correct here and avoids pulling in a timezone library.
 */
const IST_OFFSET_MINUTES = 330;

export function toUtcStamp(dateKey: string, time: string, addMinutes = 0) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!year || !month || !day || !match) return null;

  let hour = Number(match[1]) % 12;
  if ((match[3] ?? "").toUpperCase() === "PM") hour += 12;

  const utc = Date.UTC(year, month - 1, day, hour, Number(match[2]));
  const shifted = new Date(utc - IST_OFFSET_MINUTES * 60_000 + addMinutes * 60_000);
  return shifted
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

type CalendarInput = {
  service: string;
  sessionDate: string;
  sessionTime: string;
  location: string;
  uid: string;
};

export function buildIcs({ service, sessionDate, sessionTime, location, uid }: CalendarInput) {
  const minutes = findService(service)?.durationMinutes ?? 60;
  const start = toUtcStamp(sessionDate, sessionTime);
  const end = toUtcStamp(sessionDate, sessionTime, minutes);
  if (!start || !end) return null;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@${site.url.replace(/^https?:\/\//, "")}`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${service} — ${site.name}`,
    `LOCATION:${location.replace(/,/g, "\\,")}`,
    `DESCRIPTION:Your session with ${site.name}. Reply to ${site.email} if anything changes.`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Session tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function googleCalendarLink({
  service,
  sessionDate,
  sessionTime,
  location,
}: Omit<CalendarInput, "uid">) {
  const minutes = findService(service)?.durationMinutes ?? 60;
  const start = toUtcStamp(sessionDate, sessionTime);
  const end = toUtcStamp(sessionDate, sessionTime, minutes);
  if (!start || !end) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${service} — ${site.name}`,
    dates: `${start}/${end}`,
    details: `Your session with ${site.name}.`,
    location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Browser-side download without a round trip to the server. */
export function downloadIcs(ics: string, filename = "anisha-session.ics") {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
