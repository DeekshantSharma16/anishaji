/**
 * Scheduling rules shared by the client form and the server functions.
 * The server re-validates everything here, so the UI can never smuggle
 * through a Sunday, a past date, or a time that is not on the grid.
 */

export type ServiceTone = "cream" | "moss" | "sand";

export type Service = {
  slug: string;
  name: string;
  duration: string;
  durationMinutes: number;
  price: number;
  detail: string;
  tags: string[];
  tone: ServiceTone;
  online: boolean;
};

/**
 * The four disciplines offered, carried over from wellnesswithanisha.com.
 *
 * TODO(anisha): prices are placeholders. The old site never listed rates,
 * so there was nothing to bring across.
 */
export const services: Service[] = [
  {
    slug: "osteopathy",
    name: "Osteopathy",
    duration: "60 min",
    durationMinutes: 60,
    price: 3500,
    detail:
      "Hands-on structural treatment that finds the cause of pain rather than chasing the symptom, so the body can hold its own alignment again.",
    tags: ["pain relief", "alignment"],
    // Osteopathy carries the moss fill now; physiotherapy takes the cream card
    // it vacated. The CMS can override this per service, but these are the
    // defaults the page falls back to.
    tone: "moss",
    online: false,
  },
  {
    slug: "physiotherapy",
    name: "Physiotherapy",
    duration: "45 min",
    durationMinutes: 45,
    price: 2800,
    detail:
      "Targeted rehabilitation and movement work to rebuild strength, restore mobility, and keep an old injury from becoming a permanent habit.",
    tags: ["mobility", "rehab"],
    tone: "cream",
    online: false,
  },
  {
    slug: "yoga-and-meditation",
    name: "Yoga and Meditation",
    duration: "60 min",
    durationMinutes: 60,
    price: 2200,
    detail:
      "Authentic yoga and guided meditation, taught by a certified instructor and shaped around your body rather than a class plan.",
    tags: ["breath", "flexibility"],
    tone: "sand",
    online: true,
  },
  {
    slug: "art-of-living-programs",
    name: "Art of Living Programs",
    duration: "Multi-day",
    durationMinutes: 120,
    price: 0,
    detail:
      "Mindfulness and breath programs from the Art of Living tradition, including the Happiness Program, for stress relief and lasting inner calm.",
    tags: ["mindfulness", "stress relief"],
    tone: "cream",
    online: true,
  },
];

/** Extra options the enquiry form accepts beyond a named session. */
export const enquiryOptions = ["General Counselling", "Other"];

export const serviceNames = [...services.map((service) => service.name), ...enquiryOptions];

export const findService = (name: string) => services.find((service) => service.name === name);

/** Slot grid. Keep in sync with the practitioner's real day. */
export const times = ["09:00 AM", "10:30 AM", "12:00 PM", "02:30 PM", "04:00 PM", "05:30 PM"];

/** 0 = Sunday. The practice runs Tuesday to Saturday. */
export const openDays = [2, 3, 4, 5, 6];

export const openingHoursLabel = "Tue–Sat · 9am–6pm";

/** How far ahead someone may book. */
export const BOOKING_HORIZON_DAYS = 90;

/** Local (not UTC) YYYY-MM-DD, so late-evening visitors don't jump a day. */
export function toDateKey(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function maxDateKey() {
  const date = new Date();
  date.setDate(date.getDate() + BOOKING_HORIZON_DAYS);
  return toDateKey(date);
}

export function isOpenDay(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return false;
  return openDays.includes(new Date(year, month - 1, day).getDay());
}

export function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type ScheduleProblem =
  "invalid-format" | "past-date" | "too-far" | "closed-day" | "unknown-time" | null;

/** Server-side gate. Returns null when the date/time pair is acceptable. */
export function validateSlot(dateKey: string, time: string): ScheduleProblem {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "invalid-format";
  if (dateKey < todayKey()) return "past-date";
  if (dateKey > maxDateKey()) return "too-far";
  if (!isOpenDay(dateKey)) return "closed-day";
  if (!times.includes(time)) return "unknown-time";
  return null;
}

export const scheduleProblemMessage: Record<Exclude<ScheduleProblem, null>, string> = {
  "invalid-format": "That date doesn't look right. Please pick one from the calendar.",
  "past-date": "That date has already passed. Please choose an upcoming day.",
  "too-far": "We only open the diary three months ahead. Please pick a nearer date.",
  "closed-day": "The studio is open Tuesday to Saturday. Please choose one of those days.",
  "unknown-time": "That time isn't on the schedule. Please pick one of the listed times.",
};
