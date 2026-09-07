import { site } from "./site-config";
import { services, openDays, times } from "./schedule";
import { notes } from "./notes-content";

/**
 * Structured data. For a neighbourhood clinic this is the single highest
 * leverage SEO change: it is what fills the Google knowledge panel and makes
 * the FAQ answers eligible for rich results.
 */

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function medicalBusinessLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "@id": `${site.url}/#practice`,
    name: site.name,
    description: site.description,
    url: site.url,
    email: site.email,
    telephone: site.phoneDisplay,
    foundingDate: site.founded,
    priceRange: "₹₹",
    image: `${site.url}/og-image.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    openingHoursSpecification: openDays.map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dayNames[day],
      opens: "09:00",
      closes: "18:00",
    })),
    medicalSpecialty: ["Osteopathic", "PhysicalTherapy"],
    availableService: services.map((service) => ({
      "@type": "MedicalTherapy",
      name: service.name,
      description: service.detail,
    })),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Sessions",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        name: service.name,
        price: service.price,
        priceCurrency: "INR",
      })),
    },
    sameAs: [site.social.instagram, site.social.linkedin],
  };
}

export function faqLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleLd(slug: string) {
  const note = notes.find((item) => item.slug === slug);
  if (!note) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: note.title,
    description: note.excerpt,
    datePublished: note.publishedAt,
    author: { "@type": "Person", name: "Dr. Anisha" },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: `${site.url}/notes/${note.slug}`,
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}

/** Shared meta builder so every route gets a complete, correct head. */
export function pageMeta({
  title,
  description,
  path = "/",
  image = "/og-image.jpg",
  type = "website",
}: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: string;
}) {
  const url = `${site.url}${path}`;
  return [
    { title },
    { name: "description", content: description },
    { name: "author", content: "Dr. Anisha" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:image", content: `${site.url}${image}` },
    { property: "og:locale", content: "en_IN" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: `${site.url}${image}` },
  ];
}

export const slotCount = times.length;
