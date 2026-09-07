import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarOff, Check, Loader2, LogOut, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  adminBlockSlot,
  adminClientHistory,
  adminDiary,
  adminLogin,
  adminLogout,
  adminSession,
  adminSetStatus,
  adminUnblockSlot,
} from "@/lib/admin.functions";
import {
  CalendarPanel,
  IntakeView,
  PackagesPanel,
  ReviewsPanel,
  WaitlistPanel,
} from "@/components/admin/feature-panels";
import { ContentEditor } from "@/components/admin/content-editor";
import { MailPanel } from "@/components/admin/mail-panel";
import { formatDateKey, times, todayKey } from "@/lib/schedule";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Practice diary | Wellness with Anisha" },
      {
        name: "description",
        content:
          "Private practitioner diary for Wellness with Anisha: bookings, session bundles, waitlist, reviews and calendar sync.",
      },
      // Keep the diary out of search results entirely.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Row = {
  id: string;
  client_name: string;
  email: string;
  phone: string | null;
  service: string;
  session_date: string;
  session_time: string;
  status: string;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
};

type Block = { id: string; block_date: string; block_time: string | null; reason: string | null };

const filters = ["all", "pending", "confirmed", "cancelled"] as const;
const tabs = ["diary", "bundles", "waitlist", "reviews", "calendar", "email", "website"] as const;

/** The tab keys are short; these are what the practitioner actually reads. */
const tabLabels: Record<(typeof tabs)[number], string> = {
  diary: "Diary",
  bundles: "Bundles",
  waitlist: "Waitlist",
  reviews: "Reviews",
  calendar: "Calendar",
  email: "Email",
  website: "Website text",
};

function AdminPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ email: string; rows: unknown[] } | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number]>("diary");
  const [intakeFor, setIntakeFor] = useState<string | null>(null);

  useEffect(() => {
    adminSession().then((result) => setSignedIn(result.signedIn));
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await adminDiary({ data: { status: filter } });
      setRows(result.bookings as Row[]);
      setBlocks(result.blocks as Block[]);
    } catch {
      setSignedIn(false);
    } finally {
      setBusy(false);
    }
  }, [filter]);

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn, load]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await adminLogin({ data: { passcode } });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setPasscode("");
      setSignedIn(true);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: Row["status"]) => {
    const result = await adminSetStatus({
      data: { id, status: status as "confirmed" | "cancelled" | "completed" },
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success(`Marked ${status}.`);
    load();
  };

  const block = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await adminBlockSlot({
      data: {
        blockDate: String(form.get("blockDate") || ""),
        blockTime: String(form.get("blockTime") || ""),
        reason: String(form.get("reason") || ""),
      },
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Time blocked.");
    (event.target as HTMLFormElement).reset();
    load();
  };

  if (signedIn === null) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-clay" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-cream p-8 shadow-deep">
          <h1 className="font-display text-2xl font-bold">Practice diary</h1>
          <p className="mt-2 text-sm text-ink/60">Enter the practice passcode to continue.</p>
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Passcode"
            autoComplete="current-password"
            className="form-control mt-5"
            required
          />
          <Button type="submit" variant="ink" className="mt-4 w-full" disabled={busy}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </div>
    );
  }

  const grouped = rows.reduce<Record<string, Row[]>>((acc, row) => {
    (acc[row.session_date] ||= []).push(row);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Practice diary</h1>
          <p className="mt-1 text-sm text-ink/55">
            {rows.length} upcoming {rows.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await adminLogout();
            setSignedIn(false);
          }}
        >
          <LogOut /> Sign out
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-ink/10 pb-4">
        {tabs.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={tab === option ? "clay" : "ghost"}
            onClick={() => setTab(option)}
          >
            {tabLabels[option]}
          </Button>
        ))}
      </div>

      {tab === "website" && <ContentEditor />}
      {tab === "email" && <MailPanel />}
      {tab === "bundles" && <PackagesPanel />}
      {tab === "waitlist" && <WaitlistPanel />}
      {tab === "reviews" && <ReviewsPanel />}
      {tab === "calendar" && <CalendarPanel />}

      {tab === "diary" && (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((option) => (
              <Button
                key={option}
                size="sm"
                variant={filter === option ? "ink" : "paperOutline"}
                onClick={() => setFilter(option)}
              >
                {option}
              </Button>
            ))}
          </div>

          {busy && <p className="mt-6 text-sm text-ink/50">Loading…</p>}

          <div className="mt-8 space-y-8">
            {Object.entries(grouped).map(([date, dayRows]) => (
              <section key={date}>
                <h2 className="font-display text-lg font-bold text-clay">{formatDateKey(date)}</h2>
                <div className="mt-3 space-y-3">
                  {dayRows.map((row) => (
                    <article key={row.id} className="rounded-xl bg-cream p-5 shadow-lift">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-display text-lg font-bold">
                            {row.session_time} · {row.client_name}
                          </div>
                          <div className="mt-1 text-sm text-ink/60">
                            {row.service} · {row.email}
                            {row.phone ? ` · ${row.phone}` : ""}
                          </div>
                          {row.notes && (
                            <p className="mt-2 max-w-xl text-sm italic text-ink/60">
                              "{row.notes}"
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-ink/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                          {row.status}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {row.status === "pending" && (
                          <Button
                            size="sm"
                            variant="clay"
                            onClick={() => setStatus(row.id, "confirmed")}
                          >
                            <Check /> Confirm
                          </Button>
                        )}
                        {row.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="paperOutline"
                            onClick={() => setStatus(row.id, "cancelled")}
                          >
                            <X /> Cancel
                          </Button>
                        )}
                        {row.status === "confirmed" && (
                          <Button
                            size="sm"
                            variant="paperOutline"
                            onClick={() => setStatus(row.id, "completed")}
                          >
                            Mark complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const rowsForClient = await adminClientHistory({
                              data: { email: row.email },
                            });
                            setHistory({ email: row.email, rows: rowsForClient });
                          }}
                        >
                          History
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIntakeFor(intakeFor === row.id ? null : row.id)}
                        >
                          {intakeFor === row.id ? "Hide intake" : "Intake"}
                        </Button>
                      </div>
                      {intakeFor === row.id && <IntakeView bookingId={row.id} email={row.email} />}
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {!busy && rows.length === 0 && (
              <p className="text-sm text-ink/50">Nothing in the diary for this filter.</p>
            )}
          </div>

          {history && (
            <div className="mt-10 rounded-xl bg-bone p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">History · {history.email}</h2>
                <Button size="sm" variant="ghost" onClick={() => setHistory(null)}>
                  Close
                </Button>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-ink/70">
                {(
                  history.rows as {
                    id: string;
                    service: string;
                    session_date: string;
                    status: string;
                  }[]
                ).map((item) => (
                  <li key={item.id}>
                    {formatDateKey(item.session_date)} — {item.service} ({item.status})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="mt-14 border-t border-ink/10 pt-8">
            <h2 className="font-display text-xl font-bold">Block time off</h2>
            <form
              onSubmit={block}
              className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            >
              <label>
                <span className="eyebrow">Date</span>
                <input
                  name="blockDate"
                  type="date"
                  min={todayKey()}
                  className="form-control mt-1.5"
                  required
                />
              </label>
              <label>
                <span className="eyebrow">Time</span>
                <select name="blockTime" className="form-control mt-1.5">
                  <option value="">Whole day</option>
                  {times.map((time) => (
                    <option key={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="eyebrow">Reason</span>
                <input
                  name="reason"
                  type="text"
                  placeholder="Optional"
                  className="form-control mt-1.5"
                />
              </label>
              <Button type="submit" variant="ink">
                <CalendarOff /> Block
              </Button>
            </form>

            {blocks.length > 0 && (
              <ul className="mt-6 space-y-2 text-sm">
                {blocks.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-cream px-4 py-2"
                  >
                    <span>
                      {formatDateKey(item.block_date)} — {item.block_time ?? "whole day"}
                      {item.reason ? ` (${item.reason})` : ""}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await adminUnblockSlot({ data: { id: item.id } });
                        load();
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
