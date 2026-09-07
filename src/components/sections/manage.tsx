import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { times, todayKey, maxDateKey, isOpenDay, formatDateKey } from "@/lib/schedule";
import {
  cancelBooking,
  findBooking,
  getAvailability,
  rescheduleBooking,
} from "@/lib/bookings.functions";
import { track, events } from "@/lib/analytics";

type ManagedBooking = {
  id: string;
  client_name: string;
  email: string;
  service: string;
  session_date: string;
  session_time: string;
  location: string;
  status: string;
};

const statusTone: Record<string, string> = {
  pending: "bg-sand/50 text-ink",
  confirmed: "bg-moss/25 text-ink",
  cancelled: "bg-destructive/10 text-destructive",
  declined: "bg-destructive/10 text-destructive",
  completed: "bg-ink/10 text-ink/70",
};

export function ManageSection({ initialToken }: { initialToken?: string }) {
  const [manageToken, setManageToken] = useState(initialToken ?? "");
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState<string>(times[0] as string);
  const [taken, setTaken] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (initialToken) setManageToken(initialToken);
  }, [initialToken]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) return;
    let cancelled = false;
    getAvailability({ data: { sessionDate: newDate } })
      .then((result) => {
        if (cancelled) return;
        setTaken(result.dayClosed ? times : result.taken);
      })
      .catch(() => setTaken([]));
    return () => {
      cancelled = true;
    };
  }, [newDate]);

  const lookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await findBooking({ data: { manageToken } });
      if (!result) {
        setBooking(null);
        toast.error("We couldn't find a booking with that code.");
        return;
      }
      setBooking(result as ManagedBooking);
      setConfirmCancel(false);
    } catch {
      toast.error("We couldn't look up that booking.");
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isOpenDay(newDate)) {
      toast.error("The studio runs Tuesday to Saturday. Please pick one of those days.");
      return;
    }
    setBusy(true);
    try {
      const result = await rescheduleBooking({
        data: { manageToken, sessionDate: newDate, sessionTime: newTime },
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setBooking(result.booking as ManagedBooking);
      track(events.bookingRescheduled);
      toast.success("Your new time is saved.");
    } catch {
      toast.error("We couldn't update that booking.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      const result = await cancelBooking({ data: { manageToken } });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setBooking(result.booking as ManagedBooking);
      setConfirmCancel(false);
      track(events.bookingCancelled);
      toast.success("Your session is cancelled. The slot is open again.");
    } catch {
      toast.error("We couldn't cancel that booking.");
    } finally {
      setBusy(false);
    }
  };

  const changeable = booking && ["pending", "confirmed"].includes(booking.status);

  return (
    <section id="manage" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="border-t border-ink/10 pt-16">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
          <div>
            <span className="font-hand text-2xl text-clay">plans shift</span>
            <h2 className="mt-1 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Manage your booking
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed text-ink/65">
              Use the private code from your confirmation email to review, move, or cancel an
              appointment. No account needed.
            </p>
          </div>

          <div className="rounded-2xl bg-cream p-7 shadow-lift md:p-9">
            <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row">
              <label className="min-w-0 flex-1">
                <span className="eyebrow">Private booking code</span>
                <input
                  value={manageToken}
                  onChange={(event) => setManageToken(event.target.value)}
                  placeholder="Paste your booking code"
                  className="form-control mt-1.5 font-mono uppercase tracking-widest"
                  required
                />
              </label>
              <Button type="submit" variant="ink" className="sm:mt-5" disabled={busy}>
                Find booking
              </Button>
            </form>

            {booking && (
              <div className="mt-7 border-t border-ink/10 pt-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl font-bold">{booking.service}</div>
                    <div className="mt-1 text-sm text-ink/60">{booking.location}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                      statusTone[booking.status] ?? "bg-ink/10"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3">
                    <CalendarDays className="size-4 shrink-0 text-clay" />
                    {formatDateKey(booking.session_date)}
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-paper px-4 py-3">
                    <Clock3 className="size-4 shrink-0 text-clay" />
                    {booking.session_time}
                  </div>
                </div>

                {changeable ? (
                  <>
                    <form
                      onSubmit={reschedule}
                      className="mt-6 grid gap-3 border-t border-ink/10 pt-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                    >
                      <label>
                        <span className="eyebrow">New date</span>
                        <input
                          type="date"
                          value={newDate}
                          min={todayKey()}
                          max={maxDateKey()}
                          onChange={(event) => setNewDate(event.target.value)}
                          className="form-control mt-1.5"
                          required
                        />
                      </label>
                      <label>
                        <span className="eyebrow">New time</span>
                        <select
                          value={newTime}
                          onChange={(event) => setNewTime(event.target.value)}
                          className="form-control mt-1.5"
                        >
                          {times.map((time) => (
                            <option key={time} value={time} disabled={taken.includes(time)}>
                              {time}
                              {taken.includes(time) ? " — taken" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button type="submit" variant="clay" disabled={busy}>
                        <RefreshCw /> {busy ? "Saving…" : "Change time"}
                      </Button>
                    </form>

                    <div className="mt-5 border-t border-ink/10 pt-5">
                      {confirmCancel ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-ink/70">
                            Cancel this session? The slot goes back to the diary.
                          </span>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={cancel}
                            disabled={busy}
                          >
                            Yes, cancel it
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setConfirmCancel(false)}
                          >
                            Keep it
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmCancel(true)}
                        >
                          <Trash2 /> Cancel this session
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-6 border-t border-ink/10 pt-6 text-sm text-ink/60">
                    This booking is {booking.status} and can no longer be changed here. Email us and
                    we'll help directly.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
