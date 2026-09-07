import { Link } from "@tanstack/react-router";

import { useContent } from "@/components/content-provider";
import { mapsLinkFor, whatsappLinkFor } from "@/lib/content-schema";
import { images } from "@/lib/images";
import { InstallButton } from "@/components/install-button";
import { openingHoursLabel } from "@/lib/schedule";

export function SiteFooter() {
  const { brand, footer } = useContent();
  const site = brand;

  return (
    <footer className="mt-8 bg-contrast text-contrast-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <img
            src={images.logo}
            alt={site.name}
            width={512}
            height={169}
            loading="lazy"
            decoding="async"
            className="h-20 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-70">{footer.blurb}</p>
          <p className="mt-5 text-sm opacity-70">
            {site.address.street}
            <br />
            {site.address.locality} {site.address.postalCode}
            <br />
            {openingHoursLabel}
          </p>
        </div>

        <div className="md:col-span-3">
          <div className="mb-4 text-xs uppercase tracking-widest opacity-50">Practice</div>
          <div className="flex flex-col gap-2 text-sm opacity-80">
            <a href="/#work" className="transition-colors hover:text-clay">
              The work
            </a>
            <a href="/#pricing" className="transition-colors hover:text-clay">
              Pricing
            </a>
            <Link to="/first-visit" className="transition-colors hover:text-clay">
              Your first visit
            </Link>
            <Link to="/notes" className="transition-colors hover:text-clay">
              Notes
            </Link>
            <a href="/#story" className="transition-colors hover:text-clay">
              About
            </a>
          </div>
        </div>

        <div className="md:col-span-4">
          <div className="mb-4 text-xs uppercase tracking-widest opacity-50">Connect</div>
          <div className="flex flex-col gap-2 text-sm opacity-80">
            <a href="/#book" className="transition-colors hover:text-clay">
              Book an appointment
            </a>
            <a href="/#manage" className="transition-colors hover:text-clay">
              Manage a booking
            </a>
            <a href={`mailto:${site.email}`} className="transition-colors hover:text-clay">
              {site.email}
            </a>
            <a href={`tel:+${site.whatsapp}`} className="transition-colors hover:text-clay">
              {site.phoneDisplay}
            </a>
            <a
              href={whatsappLinkFor(brand, "Hello, I'd like to ask about a session.")}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-clay"
            >
              WhatsApp
            </a>
            <a
              href={mapsLinkFor(brand)}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-clay"
            >
              Directions
            </a>
            <a href="/#faq" className="transition-colors hover:text-clay">
              FAQ
            </a>
            <InstallButton className="mt-2 self-start" />
          </div>
        </div>
      </div>

      <div className="border-t border-contrast-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs opacity-60 sm:flex-row">
          <span>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </span>
          <span className="font-hand text-lg opacity-100">{footer.signoff}</span>
        </div>
      </div>
    </footer>
  );
}
