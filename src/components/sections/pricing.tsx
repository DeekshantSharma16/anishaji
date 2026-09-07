import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useContent } from "@/components/content-provider";
import { services } from "@/lib/schedule";
import { packageCatalog, rupees, type PackageDefinition } from "@/lib/packages-catalog";
import { requestPackage } from "@/lib/packages.functions";

export function Pricing() {
  const { pricing } = useContent();
  const [chosen, setChosen] = useState<PackageDefinition | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!chosen) return;
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const result = await requestPackage({
        data: {
          clientName: String(form.get("pk_name") || ""),
          email: String(form.get("pk_email") || ""),
          packageKey: chosen.key,
          notes: String(form.get("pk_notes") || ""),
          website: String(form.get("website") || ""),
        },
      });
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      setCode(result.package.code);
      toast.success("Bundle reserved. Keep your code for booking.");
    } catch {
      toast.error("That didn't send. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <span className="eyebrow">{pricing.eyebrow}</span>
        <h2 className="section-title mt-3 text-4xl sm:text-5xl">{pricing.title}</h2>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-ink/55">{pricing.note}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <article className="surface surface-hover flex flex-col p-7">
          <h3 className="section-title text-xl">{pricing.singleSession.title}</h3>
          <div className="section-title mt-2 text-3xl text-clay">
            {pricing.singleSession.priceLabel}
          </div>
          <p className="mt-3 text-sm leading-relaxed opacity-75">{pricing.singleSession.detail}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">
            {pricing.singleSession.includes.map((line) => (
              <li key={line} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-clay" />
                <span className="opacity-80">{line}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="paperOutline" className="mt-6 w-full">
            <a href="#book">Book</a>
          </Button>
        </article>

        {packageCatalog.map((item) => (
          <article
            key={item.key}
            className={`surface surface-hover flex flex-col p-7 ${
              item.featured ? "bg-contrast text-contrast-foreground" : ""
            }`}
          >
            <h3 className="section-title text-xl">{item.label}</h3>
            <div className="section-title mt-2 text-3xl text-clay">{rupees(item.price)}</div>
            <p className="mt-1 text-xs opacity-60">
              {item.sessions} sessions · {rupees(item.perSession)} each · valid {item.validityWeeks}{" "}
              weeks
            </p>
            <p className="mt-3 text-sm leading-relaxed opacity-75">{item.detail}</p>
            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {item.includes.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-clay" />
                  <span className="opacity-80">{line}</span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant={item.featured ? "clay" : "paperOutline"}
              className="mt-6 w-full"
              onClick={() => {
                setCode(null);
                setChosen(item);
              }}
            >
              Reserve this bundle
            </Button>
          </article>
        ))}
      </div>

      {chosen && (
        <div className="surface mx-auto mt-8 max-w-xl p-7 shadow-deep">
          {code ? (
            <div>
              <h3 className="font-display text-2xl font-bold">{chosen.label} reserved</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink/70">
                Your bundle code is{" "}
                <code className="font-mono tracking-[0.14em] text-clay">{code}</code>. Mention it
                when you book — Dr. Anisha activates it at your first session, once payment is made
                at the studio.
              </p>
              <Button asChild variant="ink" className="mt-5">
                <a href="#book">Book the first session</a>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-display text-2xl font-bold">Reserve the {chosen.label}</h3>
              <p className="text-sm text-ink/60">
                {chosen.sessions} sessions for {rupees(chosen.price)}. No payment now.
              </p>
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  name="pk_name"
                  required
                  placeholder="Your name"
                  autoComplete="name"
                  className="form-control"
                />
                <input
                  name="pk_email"
                  type="email"
                  required
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="form-control"
                />
              </div>
              <textarea
                name="pk_notes"
                rows={2}
                placeholder="Anything we should know? (optional)"
                className="form-control resize-none"
              />
              <div className="flex gap-2">
                <Button type="submit" variant="ink" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                  {isSubmitting ? "Reserving…" : "Reserve the bundle"}
                </Button>
                <Button type="button" variant="paperOutline" onClick={() => setChosen(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink/45">
        Individual session rates:{" "}
        {services
          .map((service) => `${service.name} ₹${service.price.toLocaleString("en-IN")}`)
          .join(" · ")}
      </p>
    </section>
  );
}
