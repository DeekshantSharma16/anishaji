import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { joinWaitlist } from "@/lib/waitlist.functions";
import { formatDateKey } from "@/lib/schedule";

/**
 * Shown when a day is closed or fully booked. Someone who names a time hears
 * about that time; someone who leaves it blank hears about any opening.
 */
export function WaitlistForm({
  sessionDate,
  sessionTime,
  service,
}: {
  sessionDate: string;
  sessionTime?: string;
  service?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const result = await joinWaitlist({
        data: {
          clientName: String(form.get("wl_name") || ""),
          email: String(form.get("wl_email") || ""),
          sessionDate,
          ...(form.get("wl_any") ? {} : sessionTime ? { sessionTime } : {}),
          ...(service ? { service } : {}),
          website: String(form.get("website") || ""),
        },
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setJoined(true);
      toast.success("You're on the waitlist. We'll email the moment something frees up.");
    } catch {
      toast.error("That didn't send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (joined) {
    return (
      <p className="mt-3 rounded-lg bg-moss/10 px-4 py-3 text-sm text-ink/75">
        You're on the list for {formatDateKey(sessionDate)}. We'll be in touch if a slot opens.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-lg bg-sand/30 px-4 py-4">
      <p className="text-sm text-ink/70">
        Nothing free on {formatDateKey(sessionDate)}. Join the waitlist and we'll email you first if
        it opens up.
      </p>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="wl_name"
          required
          placeholder="Your name"
          autoComplete="name"
          className="form-control"
        />
        <input
          name="wl_email"
          type="email"
          required
          placeholder="you@email.com"
          autoComplete="email"
          className="form-control"
        />
      </div>
      {sessionTime && (
        <label className="flex items-center gap-2 text-xs text-ink/60">
          <input name="wl_any" type="checkbox" className="size-4 accent-current" />
          Any time that day works, not just {sessionTime}
        </label>
      )}
      <Button type="submit" variant="clay" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        {isSubmitting ? "Adding you…" : "Join the waitlist"}
      </Button>
    </form>
  );
}
