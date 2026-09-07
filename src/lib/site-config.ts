import { defaultContent } from "./content-schema";

/**
 * Practice details, derived from the content file so there is only ever one
 * place to edit them: src/content/site.content.json, or the Content tab in the
 * admin panel.
 *
 * These are the BUILD-TIME values. They are the right choice for anything that
 * has to be known before React renders — page <meta>, JSON-LD, the web app
 * manifest. Anything a visitor reads on the page should use useContent()
 * instead, so an edit in the admin panel shows up without a redeploy.
 *
 * Brand details (address, phone, WhatsApp, email) come from the content file
 * and feed the LocalBusiness structured data that Google reads.
 */

const brand = defaultContent.brand;

/**
 * The site's own address. Used for canonical links, structured data, and every
 * link inside an email.
 *
 * It has to be an environment variable rather than a constant, because the
 * same build runs at several addresses: a Vercel preview URL on each pull
 * request, and the real domain in production. Hardcoding the domain means a
 * preview deployment sends booking confirmations whose "reschedule" link
 * points at production — which either 404s or edits live data.
 *
 * VITE_ prefixed so it reaches the browser too; the footer and <head> need it.
 * Falls back to the real domain so nothing breaks if it is unset.
 */
const siteUrl = (import.meta.env["VITE_SITE_URL"] || "https://wellnesswithanisha.com").replace(
  /\/$/,
  "",
);

export const site = {
  name: brand.name,
  shortName: brand.shortName,
  legalName: brand.name,
  tagline: brand.tagline,
  description: brand.description,
  url: siteUrl,
  email: brand.email,
  /** Digits only, with country code. Used for the WhatsApp deep link. */
  whatsapp: brand.whatsapp,
  phoneDisplay: brand.phoneDisplay,
  address: brand.address,
  geo: { latitude: 12.3416, longitude: 77.5869 },
  mapsQuery: brand.mapsQuery,
  timeZone: "Asia/Kolkata",
  social: brand.social,
  founded: "2022",
} as const;

export const whatsappLink = (message: string) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${site.mapsQuery}`;

export const mapsEmbed = `https://www.google.com/maps?q=${site.mapsQuery}&output=embed`;
