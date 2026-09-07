import { ArrowDown, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useContent } from "@/components/content-provider";
import { images } from "@/lib/images";

/**
 * The hero previously tilted the photo, tore its edge and floated four
 * concentric rings beside it. Each of those is a "look at the craft" gesture,
 * and stacked together they compete with the one thing that should carry the
 * page: the photograph and the sentence. This version keeps a single, very
 * quiet ambient wash and lets typography and whitespace do the work.
 */
export function Hero() {
  const { hero } = useContent();

  return (
    <header className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 md:pb-28 md:pt-16">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-[520px] opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(60% 55% at 72% 28%, color-mix(in oklab, var(--clay) 12%, transparent), transparent 70%)",
        }}
      />

      <div className="relative grid items-center gap-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-7">
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-cream/70 px-4 py-2 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-clay" />
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-ink/65">
              {hero.eyebrow}
            </span>
          </div>

          <h1 className="section-title max-w-[16ch] text-5xl sm:text-6xl lg:text-[4.25rem]">
            {hero.titleLead}{" "}
            <span className="relative inline-block italic text-clay">
              {hero.titleHighlight}
              <span
                className="absolute -bottom-1 left-0 h-px w-full"
                style={{ background: "color-mix(in oklab, var(--clay) 45%, transparent)" }}
              />
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-[1.7] text-ink/65">{hero.body}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild variant="clay" size="xl">
              <a href="#book">
                {hero.primaryCtaLabel} <ArrowRight />
              </a>
            </Button>
            <Button asChild variant="paperOutline" size="xl">
              <a href="#quiz">
                {hero.secondaryCtaLabel} <ArrowDown />
              </a>
            </Button>
          </div>

          <div className="mt-14 grid max-w-lg grid-cols-2 gap-y-7 border-t border-ink/10 pt-8 sm:grid-cols-4 sm:gap-x-4">
            {hero.stats.map((item) => (
              <div key={item.label}>
                <div className="section-title text-3xl">{item.value}</div>
                <div className="mt-1 text-[0.68rem] uppercase tracking-[0.12em] text-ink/45">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5">
          <figure className="relative">
            <div className="overflow-hidden rounded-[calc(var(--radius)+14px)] shadow-deep">
              <img
                src={images["treatment-room"]}
                alt="Therapist's hands working on a client's foot during a treatment session"
                width={1600}
                height={1067}
                fetchPriority="high"
                decoding="async"
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <figcaption className="absolute bottom-5 left-5 right-5 rounded-full bg-contrast/85 px-5 py-2.5 text-center text-sm font-medium text-contrast-foreground backdrop-blur-md">
              {hero.imageCaption}
            </figcaption>
          </figure>
        </div>
      </div>
    </header>
  );
}
