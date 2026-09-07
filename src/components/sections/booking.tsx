import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Clock3,
  Compass,
  Copy,
  Loader2,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { services, times, todayKey, maxDateKey, isOpenDay, formatDateKey } from "@/lib/schedule";
import { WaitlistForm } from "@/components/sections/waitlist";

import { createBooking, getAvailability } from "@/lib/bookings.functions";
import { buildIcs, downloadIcs, googleCalendarLink } from "@/lib/calendar";
import { track, events } from "@/lib/analytics";

export type Booking = {
  id: string;
  client_name: string;
  email: string;
  service: string;
  session_date: string;
  session_time: string;
  location: string;
  status: string;
  manage_token: string;
};

/** The date input starts on the next open day rather than an empty field. */
function firstOpenDate() {
  const cursor = new Date();
  for (let i = 1; i <= 14; i += 1) {
    const candidate = new Date(cursor.getTime() + i * 86_400_000);
    const key = candidate.toISOString().slice(0, 10);
    if (isOpenDay(key)) return key;
  }
  return todayKey();
}

export function BookingSection({
  preselectedService,
  onBooked,
}: {
  preselectedService?: string;
  onBooked: (booking: Booking) => void;
}) {
  const [date, setDate] = useState(firstOpenDate);
  const [time, setTime] = useState<string>(times[0] as string);
  const [service, setService] = useState(services[0]!.name);
  const [taken, setTaken] = useState<string[]>([]);
  const [dayClosed, setDayClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (preselectedService) setService(preselectedService);
  }, [preselectedService]);

  // Refresh the slot grid whenever the chosen date changes.
  useEffect(() => {
    let cancelled = false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;

    setLoadingSlots(true);
    getAvailability({ data: { sessionDate: date } })
      .then((result) => {
        if (cancelled) return;
        setTaken(result.taken);
        setDayClosed(result.dayClosed);
        // If the currently selected time just became unavailable, move off it.
        if (result.taken.includes(time)) {
          const next = times.find((slot) => !result.taken.includes(slot));
          if (next) setTime(next);
        }
      })
      .catch(() => {
        if (!cancelled) setTaken([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
    // `time` is deliberately excluded: we only refetch on date change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const closedDay = !isOpenDay(date) || dayClosed;
  const slotsLeft = times.filter((slot) => !taken.includes(slot)).length;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (closedDay) {
      toast.error("The studio is closed that day. Please choose Tuesday to Saturday.");
      return;
    }
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const element = event.currentTarget;

    try {
      const result = await createBooking({
        data: {
          clientName: String(form.get("name") || ""),
          email: String(form.get("email") || ""),
          phone: String(form.get("phone") || ""),
          service,
          sessionDate: date,
          sessionTime: time,
          notes: String(form.get("message") || ""),
          website: String(form.get("website") || ""),
        },
      });

      if (!result.ok) {
        toast.error(result.reason);
        track(events.bookingFailed, { reason: result.reason });
        if ("slotTaken" in result && result.slotTaken) {
          setTaken((current) => Array.from(new Set<string>([...current, time])));
        }
        return;
      }

      onBooked(result.booking as Booking);
      track(events.bookingSubmitted, { service, date });
      toast.success("Request received. Check your email for the booking code.");
      element.reset();
      setTaken((current) => Array.from(new Set<string>([...current, time])));
    } catch {
      toast.error("Something went wrong. Please try again or WhatsApp us.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="book" className="mx-auto max-w-6xl px-6 py-16 md:py-24">
      <div className="grid items-start gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="font-hand text-2xl text-clay">let's begin</span>
          <h2 className="mt-1 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Book a first session
          </h2>
          <p className="mt-5 max-w-sm leading-relaxed text-ink/65">
            Pick a date and we'll show you the times that are genuinely free. Your private booking
            code arrives by email straight away.
          </p>
          <div className="mt-8 space-y-3 text-sm">
            <InfoRow icon={<Compass />} text="In-studio hands-on care" />
            <InfoRow icon={<Clock3 />} text="Tue–Sat · 9am–6pm" />
            <InfoRow icon={<Mail />} text="Confirmation within one working day" />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          onFocus={() => {
            if (!touched) {
              setTouched(true);
              track(events.bookingStarted);
            }
          }}
          className="space-y-5 rounded-2xl bg-cream p-7 shadow-deep torn-b md:col-span-7 md:p-9"
        >
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>
              Website
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Name"
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Phone"
              name="phone"
              type="tel"
              placeholder="Optional"
              autoComplete="tel"
            />
            <label className="block">
              <span className="eyebrow">Session type</span>
              <select
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="form-control mt-1.5"
              >
                {services.map((item) => (
                  <option key={item.slug}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="eyebrow">Preferred date</span>
            <input
              type="date"
              value={date}
              min={todayKey()}
              max={maxDateKey()}
              onChange={(event) => setDate(event.target.value)}
              className="form-control mt-1.5"
              required
            />
          </label>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Preferred time</span>
              {loadingSlots ? (
                <span className="flex items-center gap-1 text-xs text-ink/45">
                  <Loader2 className="size-3 animate-spin" /> checking
                </span>
              ) : !closedDay ? (
                <span className="text-xs text-ink/45">
                  {slotsLeft === 0 ? "fully booked" : `${slotsLeft} of ${times.length} free`}
                </span>
              ) : null}
            </div>

            {closedDay ? (
              <p className="mt-2 rounded-lg bg-sand/40 px-4 py-3 text-sm text-ink/70">
                The studio is closed on {formatDateKey(date)}. We run Tuesday to Saturday.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {times.map((slot) => {
                  const unavailable = taken.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={unavailable}
                      aria-pressed={time === slot}
                      onClick={() => setTime(slot)}
                      className={`rounded-lg border px-2 py-2.5 text-sm transition-colors ${
                        unavailable
                          ? "cursor-not-allowed border-ink/10 bg-ink/5 text-ink/30 line-through"
                          : time === slot
                            ? "border-clay bg-clay text-clay-foreground"
                            : "border-ink/15 bg-paper hover:border-clay hover:text-clay"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <label className="block">
            <span className="eyebrow">What's bringing you in?</span>
            <textarea
              name="message"
              rows={3}
              placeholder="A line or two is plenty."
              className="form-control mt-1.5 resize-none"
            />
          </label>

          <Button
            type="submit"
            variant="ink"
            size="xl"
            className="w-full"
            disabled={isSubmitting || closedDay || slotsLeft === 0}
          >
            {isSubmitting ? "Saving your request…" : "Request my session"}
            {!isSubmitting && <ArrowRight />}
          </Button>
          <p className="text-center text-xs text-ink/40">
            No payment required. Your request is reviewed within one working day.
          </p>
        </form>

        {!loadingSlots && (closedDay || slotsLeft === 0) && (
          <div className="md:col-span-12">
            <WaitlistForm
              sessionDate={date}
              service={service}
              {...(closedDay ? {} : { sessionTime: time })}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** Confirmation panel, shown once a request is saved. */
export function BookingConfirmation({ booking }: { booking: Booking }) {
  const ics = buildIcs({
    service: booking.service,
    sessionDate: booking.session_date,
    sessionTime: booking.session_time,
    location: booking.location,
    uid: booking.id,
  });
  const gcal = googleCalendarLink({
    service: booking.service,
    sessionDate: booking.session_date,
    sessionTime: booking.session_time,
    location: booking.location,
  });

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.manage_token);
      toast.success("Booking code copied.");
    } catch {
      toast.error("Couldn't copy. Please note it down manually.");
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="relative overflow-hidden rounded-2xl bg-moss p-8 text-moss-foreground shadow-deep md:p-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-cream text-moss">
                <Check />
              </span>
              <span className="eyebrow text-moss-foreground/60">Request received</span>
            </div>
            <h2 className="mt-5 font-display text-3xl font-bold">You're on the practice list.</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-moss-foreground/75">
              We've saved your request for{" "}
              <strong className="text-moss-foreground">{booking.service}</strong> on{" "}
              <strong className="text-moss-foreground">
                {formatDateKey(booking.session_date)}
              </strong>{" "}
              at <strong className="text-moss-foreground">{booking.session_time}</strong>. A
              confirmation is on its way to {booking.email}.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {ics && (
                <Button
                  type="button"
                  variant="paperOutline"
                  className="border-moss-foreground/40 text-moss-foreground hover:border-moss-foreground hover:text-moss-foreground"
                  onClick={() => {
                    downloadIcs(ics);
                    track(events.calendarAdded, { kind: "ics" });
                  }}
                >
                  <CalendarPlus /> Add to calendar
                </Button>
              )}
              {gcal && (
                <Button
                  asChild
                  variant="paperOutline"
                  className="border-moss-foreground/40 text-moss-foreground hover:border-moss-foreground hover:text-moss-foreground"
                >
                  <a
                    href={gcal}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track(events.calendarAdded, { kind: "google" })}
                  >
                    Google Calendar
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="border-moss-foreground/20 md:border-l md:pl-7">
            <span className="eyebrow text-moss-foreground/60">Private booking code</span>
            <div className="mt-2 flex items-center gap-2">
              <code className="font-mono text-lg tracking-[0.14em] text-moss-foreground">
                {booking.manage_token}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={copyCode}
                aria-label="Copy booking code"
                className="text-moss-foreground hover:bg-moss-foreground/15 hover:text-moss-foreground"
              >
                <Copy />
              </Button>
            </div>
            <p className="mt-2 max-w-[220px] text-xs leading-relaxed text-moss-foreground/60">
              Use this below to reschedule or cancel. It's also in your email.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow">{label}</span>
      <input
        required={required}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="form-control mt-1.5"
      />
    </label>
  );
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-8 place-items-center rounded-full bg-clay/15 text-clay">
        {icon}
      </span>
      {text}
    </div>
  );
}
