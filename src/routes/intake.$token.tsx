import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getIntakeContext, submitIntake } from "@/lib/intake.functions";
import { intakeQuestions } from "@/lib/intake-questions";
import { formatDateKey } from "@/lib/schedule";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/intake/$token")({
  head: ({ params }) => {
    // Each intake link is a private, single-session form. Give every token its
    // own title/description so distinct URLs never share metadata, and keep the
    // whole route out of search results.
    const reference = params.token.slice(0, 8).toUpperCase();
    return {
      meta: [
        ...pageMeta({
          title: `Health history for session ${reference} | Wellness with Anisha`,
          description: `A few questions before session ${reference}, so your first hour is spent on treatment rather than paperwork.`,
          path: `/intake/${params.token}`,
        }),
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: IntakePage,
});

type Context = Awaited<ReturnType<typeof getIntakeContext>>;

function IntakePage() {
  const { token } = Route.useParams();
  const [context, setContext] = useState<Context | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getIntakeContext({ data: { token } })
      .then((result) => {
        if (!cancelled) setContext(result);
      })
      .catch(() => {
        if (!cancelled) setContext({ found: false });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers: Record<string, string> = {};
    for (const question of intakeQuestions) {
      const value = String(form.get(question.key) || "").trim();
      if (value) answers[question.key] = value;
    }

    setIsSubmitting(true);
    try {
      const result = await submitIntake({
        data: { token, answers, website: String(form.get("website") || "") },
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setDone(true);
      toast.success("Thank you — your answers are with the practice.");
    } catch {
      toast.error("That didn't save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <span className="font-hand text-2xl text-clay">before we meet</span>
      <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">Your health history</h1>

      {!context && (
        <p className="mt-8 flex items-center gap-2 text-sm text-ink/55">
          <Loader2 className="size-4 animate-spin" /> Opening your form…
        </p>
      )}

      {context && !context.found && (
        <p className="mt-8 rounded-2xl bg-cream p-7 text-sm leading-relaxed text-ink/70 shadow-lift">
          This form link is no longer valid. If your session is still coming up, reply to your
          booking email and we'll send a fresh link.
        </p>
      )}

      {context?.found && (done || context.submittedAt) && (
        <div className="mt-8 rounded-2xl bg-moss p-8 text-moss-foreground shadow-deep">
          <span className="grid size-11 place-items-center rounded-full bg-cream text-moss">
            <Check />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold">All done.</h2>
          <p className="mt-3 leading-relaxed text-moss-foreground/75">
            Dr. Anisha will read this before your {context.booking.service} on{" "}
            {formatDateKey(context.booking.session_date)} at {context.booking.session_time}.
          </p>
        </div>
      )}

      {context?.found && !done && !context.submittedAt && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-2xl bg-cream p-7 shadow-deep md:p-9"
        >
          <p className="text-sm leading-relaxed text-ink/65">
            For {context.booking.client_name} · {context.booking.service} ·{" "}
            {formatDateKey(context.booking.session_date)} at {context.booking.session_time}. Takes
            about three minutes and stays private to the practice.
          </p>

          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {intakeQuestions.map((question) => (
            <label key={question.key} className="block">
              <span className="eyebrow">
                {question.label}
                {question.required ? " *" : ""}
              </span>
              {question.help && (
                <span className="mt-1 block text-xs text-ink/50">{question.help}</span>
              )}

              {question.type === "textarea" && (
                <textarea
                  name={question.key}
                  rows={3}
                  maxLength={question.maxLength ?? 800}
                  required={question.required ?? false}
                  className="form-control mt-1.5 resize-none"
                />
              )}
              {question.type === "text" && (
                <input
                  name={question.key}
                  type="text"
                  maxLength={question.maxLength ?? 200}
                  required={question.required ?? false}
                  className="form-control mt-1.5"
                />
              )}
              {question.type === "choice" && (
                <select
                  name={question.key}
                  required={question.required ?? false}
                  defaultValue=""
                  className="form-control mt-1.5"
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {(question.options ?? []).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              )}
              {question.type === "scale" && (
                <select
                  name={question.key}
                  required={question.required ?? false}
                  defaultValue=""
                  className="form-control mt-1.5"
                >
                  <option value="" disabled>
                    Choose 0–10
                  </option>
                  {Array.from({ length: 11 }, (_, index) => (
                    <option key={index}>{index}</option>
                  ))}
                </select>
              )}
            </label>
          ))}

          <Button type="submit" variant="ink" size="xl" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send to the practice"}
          </Button>
        </form>
      )}
    </main>
  );
}
