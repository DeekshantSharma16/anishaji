import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

import { getReviews } from "@/lib/reviews.functions";
import { images } from "@/lib/images";

type Entry = { quote: string; name: string; detail: string; avatar?: string };

/**
 * Written testimonials carried over from wellnesswithanisha.com.
 * Shown until the database has reviews of its own.
 */
const fallback: Entry[] = [
  {
    quote:
      "Incredible experience! I've been dealing with back pain for years, and after just a few osteopathy sessions, I feel like a new person. The treatment was tailored to my specific needs, and I'm finally pain-free. Highly recommend!",
    name: "Grace T",
    detail: "osteopathy · chronic back pain",
    avatar: images["avatar-3"],
  },
  {
    quote:
      "I was initially skeptical, but after a few sessions with Dr. Anisha, I noticed a significant improvement in my mobility and overall well-being. The osteopath was knowledgeable and made me feel very comfortable. I'm so glad I gave it a try!",
    name: "David S",
    detail: "osteopathy · mobility",
    avatar: images["avatar-2"],
  },
  {
    quote:
      "The osteopathy treatments have been life-changing. I had chronic neck pain from sitting at a desk all day, and now I can move freely without discomfort. The personalized approach really worked for me!",
    name: "Isabella M",
    detail: "osteopathy · desk-related neck pain",
    avatar: images["avatar-4"],
  },
  {
    quote:
      "I've been attending yoga sessions with Dr. Anisha for the past few weeks, and I'm amazed by the positive impact it's had on my flexibility and mental clarity. The instructor is supportive and creates a calming atmosphere that makes each session a true retreat. I've gained strength and peace of mind.",
    name: "Alex B",
    detail: "yoga · flexibility and mental clarity",
    avatar: images["avatar-1"],
  },
];

const ROTATE_MS = 8000;

type Summary = { rating: number | null; total_reviews: number | null; profile_url: string | null };

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [testimonials, setTestimonials] = useState<Entry[]>(fallback);
  const [summary, setSummary] = useState<Summary | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Live reviews, when the practice has published any. The static set stays as
  // the fallback so the section never renders empty.
  useEffect(() => {
    let cancelled = false;
    getReviews()
      .then((result) => {
        if (cancelled) return;
        if (result.reviews.length) {
          setTestimonials(
            result.reviews.map((review) => ({
              quote: review.body,
              name: review.author_name,
              detail: [review.relative_time, review.source === "google" ? "Google review" : null]
                .filter(Boolean)
                .join(" · "),
            })),
          );
          setActive(0);
        }
        setSummary(result.summary as Summary | null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % testimonials.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, testimonials.length]);

  // Left/right arrows move between tabs, which is what screen reader users expect.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") setActive((value) => (value + 1) % testimonials.length);
    if (event.key === "ArrowLeft")
      setActive((value) => (value - 1 + testimonials.length) % testimonials.length);
  };

  const testimonial = testimonials[active] ?? testimonials[0]!;

  return (
    <section
      className="mx-auto max-w-4xl px-6 py-16"
      aria-label="Patient stories"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {summary?.rating != null && (
        <div className="mb-6 flex justify-center">
          <a
            href={summary.profile_url ?? "#"}
            target={summary.profile_url ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm shadow-lift"
          >
            <span className="flex" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={`size-4 ${
                    index < Math.round(summary.rating ?? 0) ? "fill-clay text-clay" : "text-ink/20"
                  }`}
                />
              ))}
            </span>
            <span className="font-semibold">{summary.rating?.toFixed(1)}</span>
            <span className="text-ink/55">from {summary.total_reviews ?? 0} Google reviews</span>
          </a>
        </div>
      )}

      <figure className="relative rounded-2xl bg-cream p-10 shadow-deep torn-top md:p-14">
        <div className="font-display text-7xl leading-none text-clay/30" aria-hidden="true">
          &ldquo;
        </div>
        <div ref={panelRef} role="tabpanel" aria-live="polite" id={`testimonial-${active}`}>
          <blockquote className="-mt-6 font-display text-2xl italic leading-snug sm:text-3xl">
            {testimonial.quote}
          </blockquote>
          <figcaption className="mt-6 flex flex-wrap items-center gap-3">
            {testimonial.avatar ? (
              <img
                src={testimonial.avatar}
                alt=""
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <span className="h-px w-8 bg-clay" />
            )}
            <span className="font-semibold">{testimonial.name}</span>
            {testimonial.detail && (
              <span className="text-sm text-ink/50">— {testimonial.detail}</span>
            )}
          </figcaption>
        </div>

        <div
          className="mt-8 flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Patient testimonials"
          onKeyDown={onKeyDown}
        >
          {testimonials.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              role="tab"
              aria-selected={active === index}
              aria-controls={`testimonial-${index}`}
              tabIndex={active === index ? 0 : -1}
              aria-label={`Show testimonial from ${item.name}`}
              onClick={() => setActive(index)}
              className={`grid size-8 place-items-center rounded-full border text-xs transition-colors ${
                active === index
                  ? "border-clay bg-clay text-clay-foreground"
                  : "border-ink/15 text-ink/50 hover:border-clay"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </figure>
    </section>
  );
}
