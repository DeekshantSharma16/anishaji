import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site-config";

export const Route = createFileRoute("/first-visit")({
  head: () => ({
    meta: pageMeta({
      title: `Your first visit | ${site.name}`,
      description:
        "What happens in a first osteopathy session, what to wear, how long it takes, and what it costs.",
      path: "/first-visit",
    }),
    links: [{ rel: "canonical", href: `${site.url}/first-visit` }],
  }),
  component: FirstVisit,
});

const steps = [
  {
    title: "Before you arrive",
    body: "Wear something you can move in. Bring any scans or reports you already have, though you don't need them to start. Eat normally; this isn't a fasting appointment.",
  },
  {
    title: "The first fifteen minutes",
    body: "We talk. What brought you in, what you've already tried, how it behaves across a day. This part matters more than most people expect, and it shapes everything that follows.",
  },
  {
    title: "Assessment",
    body: "Standing, seated, and lying assessment of posture, range, breath, and structural line. You stay clothed. Nothing is done without telling you first what it is and why.",
  },
  {
    title: "Treatment",
    body: "Hands-on work, usually gentle. Some techniques produce a click, most don't. If anything is uncomfortable, say so and we change the approach immediately.",
  },
  {
    title: "What you leave with",
    body: "One or two things to do at home, not a printout of twenty exercises. Plus an honest view of how many sessions this is likely to take, and whether you need someone other than us.",
  },
];

function FirstVisit() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-16">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Your first visit", path: "/first-visit" },
        ])}
      />

      <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/55 hover:text-clay">
        <ArrowLeft className="size-4" /> Back to the practice
      </Link>

      <header className="mt-8">
        <span className="font-hand text-2xl text-clay">no surprises</span>
        <h1 className="mt-1 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Your first visit
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/70">
          Most hesitation about a first appointment comes from not knowing what happens in the room.
          Here is the whole thing, start to finish.
        </p>
      </header>

      <ol className="mt-12 space-y-8">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-clay/15 font-display text-lg font-bold text-clay">
              {index + 1}
            </span>
            <div>
              <h2 className="font-display text-xl font-bold">{step.title}</h2>
              <p className="mt-2 leading-relaxed text-ink/70">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-14 rounded-2xl bg-cream p-8 text-center shadow-lift">
        <h2 className="font-display text-2xl font-bold">Ready when you are</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/65">
          Sixty minutes, no payment taken at booking, and you can move or cancel it yourself at any
          time.
        </p>
        <Button asChild variant="clay" size="xl" className="mt-6">
          <a href="/#book">
            Book a session <ArrowRight />
          </a>
        </Button>
      </div>
    </main>
  );
}
