import { Car, Clock3, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useContent } from "@/components/content-provider";
import { mapsEmbedFor, mapsLinkFor, whatsappLinkFor } from "@/lib/content-schema";
import { openingHoursLabel } from "@/lib/schedule";

export function Visit() {
  const { visit, brand } = useContent();

  return (
    <section id="visit" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="mb-12">
        <span className="eyebrow">{visit.eyebrow}</span>
        <h2 className="section-title mt-3 text-4xl sm:text-5xl">{visit.title}</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface overflow-hidden bg-bone p-0">
          <iframe
            src={mapsEmbedFor(brand)}
            title={`Map showing ${brand.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[320px] w-full border-0 md:h-full md:min-h-[360px]"
          />
        </div>

        <div className="surface p-8 md:p-10">
          <div className="space-y-6 text-sm">
            <Row icon={<MapPin className="size-4" />} title="Address">
              {brand.address.street}
              <br />
              {brand.address.locality} {brand.address.postalCode}
            </Row>
            <Row icon={<Clock3 className="size-4" />} title="Hours">
              {openingHoursLabel}
              <br />
              {visit.hoursNote}
            </Row>
            <Row icon={<Car className="size-4" />} title="Getting here">
              {visit.gettingHere}
            </Row>
            <Row icon={<Phone className="size-4" />} title="Reach us">
              <a href={`tel:+${brand.whatsapp}`} className="transition-colors hover:text-clay">
                {brand.phoneDisplay}
              </a>
              <br />
              <a href={`mailto:${brand.email}`} className="transition-colors hover:text-clay">
                {brand.email}
              </a>
            </Row>
          </div>

          <div className="mt-9 flex flex-wrap gap-3 border-t border-ink/10 pt-7">
            <Button asChild variant="ink">
              <a href={mapsLinkFor(brand)} target="_blank" rel="noopener noreferrer">
                Get directions
              </a>
            </Button>
            <Button asChild variant="paperOutline">
              <a
                href={whatsappLinkFor(brand, "Hello, I have a question about visiting the studio.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-clay/12 text-clay">
        {icon}
      </span>
      <div>
        <div className="eyebrow">{title}</div>
        <div className="mt-1.5 leading-relaxed text-ink/65">{children}</div>
      </div>
    </div>
  );
}
