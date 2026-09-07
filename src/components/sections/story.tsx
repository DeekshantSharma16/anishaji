import { useContent } from "@/components/content-provider";
import { images } from "@/lib/images";

export function Story() {
  const { story } = useContent();

  return (
    <section id="story" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="surface overflow-hidden p-8 md:p-14">
        <div className="grid items-center gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <img
              src={images.portrait}
              alt="Dr. Anisha practising yoga outdoors in a garden"
              width={1600}
              height={899}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] w-full rounded-[calc(var(--radius)+6px)] object-cover shadow-lift"
            />
          </div>
          <div className="md:col-span-7">
            <span className="eyebrow">{story.eyebrow}</span>
            <h2 className="section-title mt-3 text-3xl sm:text-[2.75rem]">{story.title}</h2>

            {story.paragraphs.map((paragraph, index) => (
              <p
                key={index}
                className={`max-w-xl leading-[1.75] text-ink/65 ${index === 0 ? "mt-7" : "mt-4"}`}
              >
                {paragraph}
              </p>
            ))}

            <div className="mt-9 flex flex-wrap gap-2">
              {story.credentials.map((credential) => (
                <span
                  key={credential}
                  className="rounded-full border border-ink/10 px-4 py-1.5 text-sm font-medium text-ink/75"
                >
                  {credential}
                </span>
              ))}
              <span className="rounded-full bg-clay/12 px-4 py-1.5 text-sm font-medium text-clay">
                {story.highlightCredential}
              </span>
            </div>

            <div className="mt-9 flex items-center gap-4 border-t border-ink/10 pt-7">
              <div className="grid size-12 place-items-center rounded-full bg-bone font-display text-lg font-bold text-clay">
                {story.personName.replace("Dr. ", "").charAt(0)}
              </div>
              <div>
                <div className="section-title text-lg">{story.personName}</div>
                <div className="text-sm text-ink/50">{story.personRole}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
