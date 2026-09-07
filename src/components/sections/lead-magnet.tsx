import { useState, type FormEvent } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { captureLead } from "@/lib/bookings.functions";
import { track, events } from "@/lib/analytics";

export function LeadMagnet() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await captureLead({
        data: {
          email: String(form.get("email") || ""),
          source: "desk-reset",
          website: String(form.get("company") || ""),
        },
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setSent(true);
      track(events.leadCaptured, { source: "desk-reset" });
    } catch {
      toast.error("That didn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="grid items-center gap-8 rounded-2xl bg-moss p-8 text-moss-foreground shadow-deep md:grid-cols-[1fr_auto] md:p-11">
        <div>
          <span className="font-hand text-2xl text-moss-foreground/70">free, no strings</span>
          <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            The four-minute reset for desk spines
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-moss-foreground/75">
            Three movements and one breath pattern for the space between meetings. Sent straight to
            your inbox.
          </p>
        </div>

        {sent ? (
          <p className="text-sm font-medium text-moss-foreground/90">
            On its way. Check your inbox in a minute.
          </p>
        ) : (
          <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-3 sm:flex-row">
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input name="company" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <input
              name="email"
              type="email"
              required
              placeholder="you@email.com"
              aria-label="Your email address"
              className="form-control bg-cream/95"
            />
            <Button type="submit" variant="clay" disabled={busy}>
              <Download /> {busy ? "Sending…" : "Send it"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
