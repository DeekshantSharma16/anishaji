import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { Hero } from "@/components/sections/hero";
import { Marquee } from "@/components/sections/marquee";
import { Services } from "@/components/sections/services";
import { Quiz } from "@/components/sections/quiz";
import { Pricing } from "@/components/sections/pricing";
import { Story } from "@/components/sections/story";
import { Testimonials } from "@/components/sections/testimonials";
import { NotesTeaser } from "@/components/sections/notes-teaser";
import { LeadMagnet } from "@/components/sections/lead-magnet";
import { Faq } from "@/components/sections/faq";
import { Visit } from "@/components/sections/visit";
import { BookingSection, BookingConfirmation, type Booking } from "@/components/sections/booking";
import { ManageSection } from "@/components/sections/manage";
import { faqs } from "@/lib/faq-content";
import { faqLd, medicalBusinessLd, pageMeta } from "@/lib/seo";
import { site } from "@/lib/site-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: `Dr. Anisha | Osteopathy & Physiotherapy in ${site.address.locality}`,
      description: site.description,
      path: "/",
    }),
    links: [{ rel: "canonical", href: site.url }],
  }),
  component: HomePage,
});

function HomePage() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [preselected, setPreselected] = useState<string>();

  const chooseService = (service: string) => {
    setPreselected(service);
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <JsonLd data={medicalBusinessLd()} />
      <JsonLd data={faqLd(faqs)} />

      <main id="top">
        <Hero />
        <Marquee />
        <Reveal>
          <Services onChoose={chooseService} />
        </Reveal>
        <Reveal>
          <Quiz onPick={setPreselected} />
        </Reveal>
        <Reveal>
          <Pricing />
        </Reveal>
        <Reveal>
          <Story />
        </Reveal>
        <Reveal>
          <Testimonials />
        </Reveal>
        <Reveal>
          <NotesTeaser />
        </Reveal>
        <Reveal>
          <LeadMagnet />
        </Reveal>
        <Reveal>
          <Faq />
        </Reveal>
        <Reveal>
          <Visit />
        </Reveal>
        <Reveal>
          <BookingSection
            {...(preselected ? { preselectedService: preselected } : {})}
            onBooked={setBooking}
          />
        </Reveal>
        {booking && <BookingConfirmation booking={booking} />}
        <Reveal>
          <ManageSection {...(booking ? { initialToken: booking.manage_token } : {})} />
        </Reveal>
      </main>
    </>
  );
}
