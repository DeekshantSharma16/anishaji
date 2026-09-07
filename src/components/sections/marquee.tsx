import { useContent } from "@/components/content-provider";

export function Marquee() {
  const { marquee } = useContent();
  const items = marquee.items.length > 0 ? marquee.items : ["wellness"];

  return (
    <div
      className="overflow-hidden border-y border-ink/8 bg-contrast py-5 text-contrast-foreground"
      aria-label="Practice principles"
    >
      <div className="flex min-w-max gap-8 whitespace-nowrap font-display text-sm uppercase tracking-[0.2em] opacity-80 animate-marquee">
        {[...items, ...items].map((item, index) => (
          <span key={`${item}-${index}`} className="flex items-center gap-8">
            {item}
            <span className="text-clay" aria-hidden="true">
              &bull;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
