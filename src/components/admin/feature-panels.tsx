import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatDateKey } from "@/lib/schedule";
import { intakeQuestions } from "@/lib/intake-questions";
import { adminPackages, adminUpdatePackage } from "@/lib/packages.functions";
import {
  adminNotifyWaitlist,
  adminSetWaitlistStatus,
  adminWaitlist,
} from "@/lib/waitlist.functions";
import {
  adminDeleteReview,
  adminReviews,
  adminSaveReview,
  adminSetReviewSummary,
  adminRefreshGoogleReviews,
} from "@/lib/reviews.functions";
import {
  adminCalendarAuthUrl,
  adminCalendarDisconnect,
  adminCalendarResync,
  adminCalendarStatus,
} from "@/lib/calendar-sync.functions";
import { adminIntakeFor, adminResendIntake } from "@/lib/intake.functions";

/** Small shared shell so every diary panel looks the same. */
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/* --------------------------------------------------------------- packages */

type PackageRow = Awaited<ReturnType<typeof adminPackages>>[number];

export function PackagesPanel() {
  const [rows, setRows] = useState<PackageRow[]>([]);
  const load = useCallback(() => {
    adminPackages()
      .then(setRows)
      .catch(() => toast.error("Could not load bundles."));
  }, []);
  useEffect(load, [load]);

  const update = async (id: string, patch: { status?: PackageRow["status"]; delta?: number }) => {
    const result = await adminUpdatePackage({
      data: {
        id,
        ...(patch.status
          ? { status: patch.status as "requested" | "active" | "completed" | "cancelled" }
          : {}),
        ...(patch.delta !== undefined ? { sessionsUsedDelta: patch.delta } : {}),
      },
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Bundle updated.");
    load();
  };

  return (
    <Panel title="Session bundles">
      {rows.length === 0 && <p className="text-sm text-ink/50">No bundles yet.</p>}
      {rows.map((row) => (
        <article key={row.id} className="rounded-xl bg-cream p-5 shadow-lift">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-display text-lg font-bold">
                {row.label} · <span className="font-mono text-sm">{row.code}</span>
              </div>
              <div className="mt-1 text-sm text-ink/60">
                {row.client_name} · {row.email}
              </div>
              <div className="mt-1 text-sm text-ink/60">
                {row.sessions_used}/{row.sessions_total} used
                {row.expires_at ? ` · expires ${formatDateKey(row.expires_at)}` : ""}
              </div>
            </div>
            <span className="rounded-full bg-ink/8 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
              {row.status}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {row.status !== "active" && (
              <Button size="sm" variant="clay" onClick={() => update(row.id, { status: "active" })}>
                Activate
              </Button>
            )}
            <Button size="sm" variant="paperOutline" onClick={() => update(row.id, { delta: 1 })}>
              Use a session
            </Button>
            <Button size="sm" variant="ghost" onClick={() => update(row.id, { delta: -1 })}>
              Undo one
            </Button>
            {row.status !== "cancelled" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update(row.id, { status: "cancelled" })}
              >
                Cancel
              </Button>
            )}
          </div>
        </article>
      ))}
    </Panel>
  );
}

/* --------------------------------------------------------------- waitlist */

type WaitRow = Awaited<ReturnType<typeof adminWaitlist>>[number];

export function WaitlistPanel() {
  const [rows, setRows] = useState<WaitRow[]>([]);
  const load = useCallback(() => {
    adminWaitlist()
      .then(setRows)
      .catch(() => toast.error("Could not load the waitlist."));
  }, []);
  useEffect(load, [load]);

  return (
    <Panel title="Waitlist">
      {rows.length === 0 && <p className="text-sm text-ink/50">Nobody waiting right now.</p>}
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-cream p-4 shadow-lift"
        >
          <div>
            <div className="font-display font-bold">
              {formatDateKey(row.session_date)} · {row.session_time ?? "any time"}
            </div>
            <div className="text-sm text-ink/60">
              {row.client_name} · {row.email}
              {row.service ? ` · ${row.service}` : ""}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-ink/8 px-3 py-1 text-xs uppercase tracking-widest">
              {row.status}
            </span>
            {row.session_time && (
              <Button
                size="sm"
                variant="paperOutline"
                onClick={async () => {
                  const result = await adminNotifyWaitlist({
                    data: {
                      sessionDate: row.session_date,
                      sessionTime: row.session_time as string,
                    },
                  });
                  toast.success(`Emailed ${result.notified} waiting.`);
                  load();
                }}
              >
                Email openings
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await adminSetWaitlistStatus({ data: { id: row.id, status: "converted" } });
                load();
              }}
            >
              Booked
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await adminSetWaitlistStatus({ data: { id: row.id, status: "expired" } });
                load();
              }}
            >
              Remove
            </Button>
          </div>
        </article>
      ))}
    </Panel>
  );
}

/* ---------------------------------------------------------------- reviews */

export function ReviewsPanel() {
  const [state, setState] = useState<Awaited<ReturnType<typeof adminReviews>> | null>(null);
  const load = useCallback(() => {
    adminReviews()
      .then(setState)
      .catch(() => toast.error("Could not load reviews."));
  }, []);
  useEffect(load, [load]);

  const addReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const element = event.currentTarget;
    const result = await adminSaveReview({
      data: {
        authorName: String(form.get("authorName") || ""),
        rating: Number(form.get("rating") || 5),
        body: String(form.get("body") || ""),
        relativeTime: String(form.get("relativeTime") || ""),
        published: true,
        position: 0,
      },
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Review saved.");
    element.reset();
    load();
  };

  const saveSummary = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rating = String(form.get("summaryRating") || "");
    const total = String(form.get("summaryTotal") || "");
    const url = String(form.get("profileUrl") || "");
    const result = await adminSetReviewSummary({
      data: {
        rating: rating ? Number(rating) : null,
        totalReviews: total ? Number(total) : null,
        profileUrl: url ? url : null,
      },
    });
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("Rating badge updated.");
    load();
  };

  return (
    <Panel title="Reviews & rating">
      {state?.googleConfigured && (
        <Button
          size="sm"
          variant="clay"
          onClick={async () => {
            const result = await adminRefreshGoogleReviews();
            if (!result.ok) {
              toast.error(result.reason);
              return;
            }
            toast.success("Pulled the latest Google reviews.");
            load();
          }}
        >
          Refresh from Google
        </Button>
      )}

      <form
        onSubmit={saveSummary}
        className="grid gap-3 rounded-xl bg-bone p-4 sm:grid-cols-4 sm:items-end"
      >
        <label>
          <span className="eyebrow">Rating</span>
          <input
            name="summaryRating"
            type="number"
            step="0.1"
            min="1"
            max="5"
            defaultValue={state?.summary?.rating ?? ""}
            className="form-control mt-1.5"
          />
        </label>
        <label>
          <span className="eyebrow">Total reviews</span>
          <input
            name="summaryTotal"
            type="number"
            min="0"
            defaultValue={state?.summary?.total_reviews ?? ""}
            className="form-control mt-1.5"
          />
        </label>
        <label>
          <span className="eyebrow">Google profile URL</span>
          <input
            name="profileUrl"
            type="url"
            defaultValue={state?.summary?.profile_url ?? ""}
            className="form-control mt-1.5"
          />
        </label>
        <Button type="submit" variant="ink">
          Save badge
        </Button>
      </form>

      <form
        onSubmit={addReview}
        className="grid gap-3 rounded-xl bg-bone p-4 sm:grid-cols-4 sm:items-end"
      >
        <label>
          <span className="eyebrow">Name</span>
          <input name="authorName" required className="form-control mt-1.5" />
        </label>
        <label>
          <span className="eyebrow">Stars</span>
          <input
            name="rating"
            type="number"
            min="1"
            max="5"
            defaultValue={5}
            className="form-control mt-1.5"
          />
        </label>
        <label>
          <span className="eyebrow">When</span>
          <input name="relativeTime" placeholder="2 weeks ago" className="form-control mt-1.5" />
        </label>
        <Button type="submit" variant="ink">
          Add review
        </Button>
        <label className="sm:col-span-4">
          <span className="eyebrow">Review</span>
          <textarea name="body" rows={2} required className="form-control mt-1.5 resize-none" />
        </label>
      </form>

      {(state?.reviews ?? []).map((review) => (
        <article
          key={review.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-cream p-4 shadow-lift"
        >
          <div>
            <div className="font-display font-bold">
              {review.author_name} · {review.rating}★{" "}
              <span className="text-xs uppercase tracking-widest text-ink/45">{review.source}</span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-ink/65">{review.body}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await adminDeleteReview({ data: { id: review.id } });
              load();
            }}
          >
            Delete
          </Button>
        </article>
      ))}
    </Panel>
  );
}

/* --------------------------------------------------------------- calendar */

export function CalendarPanel() {
  const [state, setState] = useState<Awaited<ReturnType<typeof adminCalendarStatus>> | null>(null);
  const load = useCallback(() => {
    adminCalendarStatus()
      .then(setState)
      .catch(() => toast.error("Could not read the calendar connection."));
  }, []);
  useEffect(load, [load]);

  return (
    <Panel title="Google Calendar">
      {!state?.configured && (
        <p className="text-sm text-ink/60">
          Add the Google client ID and secret to the backend to enable calendar sync.
        </p>
      )}
      {state?.connection ? (
        <div className="rounded-xl bg-cream p-4 shadow-lift">
          <p className="text-sm text-ink/70">
            Connected as <strong>{state.connection.account_email ?? "Google account"}</strong> ·
            calendar {state.connection.calendar_id}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="clay"
              onClick={async () => {
                const result = await adminCalendarResync();
                toast.success(`Synced ${result.synced} sessions.`);
              }}
            >
              Resync upcoming
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await adminCalendarDisconnect();
                toast.success("Disconnected.");
                load();
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ink"
          disabled={!state?.configured}
          onClick={async () => {
            const result = await adminCalendarAuthUrl({ data: { origin: window.location.origin } });
            if (!result.ok) {
              toast.error(result.reason);
              return;
            }
            window.location.href = result.url;
          }}
        >
          Connect Google Calendar
        </Button>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ intake */

export function IntakeView({ bookingId, email }: { bookingId: string; email: string }) {
  const [state, setState] = useState<Awaited<ReturnType<typeof adminIntakeFor>> | null>(null);

  useEffect(() => {
    adminIntakeFor({ data: { bookingId } })
      .then(setState)
      .catch(() => toast.error("Could not load the intake form."));
  }, [bookingId]);

  return (
    <div className="mt-4 rounded-xl bg-bone p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-bold">Health history · {email}</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const result = await adminResendIntake({ data: { bookingId } });
            if (!result.ok) {
              toast.error(result.reason);
              return;
            }
            toast.success("Intake link re-sent.");
          }}
        >
          Re-send link
        </Button>
      </div>
      {state?.answers ? (
        <dl className="mt-3 space-y-2 text-sm">
          {intakeQuestions.map((question) => {
            const answer = state.answers?.[question.key];
            if (!answer) return null;
            return (
              <div key={question.key}>
                <dt className="text-ink/50">{question.label}</dt>
                <dd className="text-ink/80">{answer}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-ink/55">Not filled in yet.</p>
      )}
    </div>
  );
}
