import { ArrowUpRight } from "lucide-react";

import { useContent } from "@/components/content-provider";
import { services as bookableServices } from "@/lib/schedule";

/**
 * Cards are merged from two sources on purpose. The list of services and their
 * durations come from schedule.ts, because the booking handler validates
 * against that same list. The wording, tags and colour come from the CMS. So
 * the practitioner can rename a card or restyle it without any chance of
 * offering a session the server would then refuse to book.
 */

const toneClasses: Record<string, { card: string; chip: string; index: string }> = {
  moss: {
    card: "bg-moss text-moss-foreground",
    chip: "bg-white/15",
    index: "bg-white/15",
  },
  clay: {
    card: "bg-clay text-clay-foreground",
    chip: "bg-white/15",
    index: "bg-white/15",
  },
  sand: {
    card: "bg-sand/55 text-ink",
    chip: "bg-ink/8 text-ink/75",
    index: "bg-ink/10 text-ink",
  },
  cream: {
    card: "bg-cream text-ink",
    chip: "bg-ink/6 text-ink/70",
    index: "bg-ink/8 text-ink",
  },
};

export function Services({ onChoose }: { onChoose: (service: string) => void }) {
  const { services } = useContent();
  const copyBySlug = new Map(services.items.map((item) => [item.slug, item]));

  const cards = bookableServices.map((bookable) => {
    const copy = copyBySlug.get(bookable.slug);
    return {
      slug: bookable.slug,
      /** The booking form matches on this, so it has to stay the schedule name. */
      bookingName: bookable.name,
      name: copy?.name ?? bookable.name,
      duration: copy?.duration ?? bookable.duration,
      detail: copy?.detail ?? bookable.detail,
      tags: copy?.tags ?? bookable.tags,
      tone: (copy?.tone ?? bookable.tone) as string,
      online: bookable.online,
    };
  });

  return (
    <section id="work" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">{services.eyebrow}</span>
          <h2 className="section-title mt-3 text-4xl sm:text-5xl">{services.title}</h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-ink/55 md:text-right">
          {services.note}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((service, index) => {
          const tone = toneClasses[service.tone] ?? toneClasses["cream"]!;
          return (
            <article
              key={service.slug}
              className={`surface surface-hover flex flex-col p-7 ${tone.card}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid size-8 place-items-center rounded-full font-display text-xs font-bold ${tone.index}`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-medium uppercase tracking-[0.12em] opacity-55">
                  {service.duration}
                </span>
              </div>

              <h3 className="section-title mt-6 text-2xl">{service.name}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed opacity-75">{service.detail}</p>

              <div className="mt-6 flex flex-wrap gap-1.5">
                {service.tags.map((tag) => (
                  <span key={tag} className={`rounded-full px-2.5 py-1 text-xs ${tone.chip}`}>
                    {tag}
                  </span>
                ))}
                {service.online && (
                  <span className={`rounded-full px-2.5 py-1 text-xs ${tone.chip}`}>
                    online available
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => onChoose(service.bookingName)}
                className="mt-7 inline-flex items-center gap-1.5 self-start border-b border-current/40 pb-0.5 text-sm font-medium opacity-85 transition-opacity hover:opacity-100"
              >
                {services.ctaLabel}
                <ArrowUpRight className="size-4" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
