import { z } from "zod";

import rawContent from "@/content/site.content.json";

/**
 * The content layer.
 *
 * Everything a non-developer is allowed to change lives in one shape, defined
 * once here and validated on both ends. The file at src/content/site.content.json
 * is the shipped default; the admin CMS stores an edited copy in Supabase and
 * that copy wins at runtime. If the database is empty, unreachable, or holds
 * something that no longer matches this schema, the site falls back to the
 * bundled JSON, so a bad save can never take the page down.
 *
 * What is deliberately NOT here: session prices, slot times, open days and
 * durations. Those are validated server-side when someone books, so they stay
 * in src/lib/schedule.ts where the booking handler can trust them. The CMS can
 * restyle and reword a service; it cannot invent one.
 */

const link = z.object({
  href: z.string(),
  label: z.string(),
  internal: z.boolean().default(false),
});

const stat = z.object({
  value: z.string(),
  label: z.string(),
});

export const serviceTones = ["cream", "moss", "sand", "clay"] as const;
export type ServiceTone = (typeof serviceTones)[number];

const serviceCopy = z.object({
  /** Must match a slug in schedule.ts. Unknown slugs are ignored. */
  slug: z.string(),
  name: z.string(),
  duration: z.string(),
  detail: z.string(),
  tags: z.array(z.string()),
  tone: z.enum(serviceTones),
});

/** A CSS colour a browser understands. Hex keeps it friendly for colour pickers. */
const colour = z.string().min(3).max(40);

export const contentSchema = z.object({
  brand: z.object({
    name: z.string(),
    shortName: z.string(),
    tagline: z.string(),
    description: z.string(),
    email: z.string(),
    /** Digits only, with country code. Feeds the WhatsApp deep link. */
    whatsapp: z.string(),
    phoneDisplay: z.string(),
    address: z.object({
      street: z.string(),
      locality: z.string(),
      region: z.string(),
      postalCode: z.string(),
      country: z.string(),
    }),
    mapsQuery: z.string(),
    social: z.object({
      instagram: z.string(),
      linkedin: z.string(),
    }),
  }),

  theme: z.object({
    paper: colour,
    cream: colour,
    ink: colour,
    clay: colour,
    moss: colour,
    sand: colour,
    bone: colour,
    radius: z.string(),
  }),

  nav: z.object({
    wordmarkLead: z.string(),
    wordmarkTail: z.string(),
    ctaLabel: z.string(),
    links: z.array(link),
  }),

  hero: z.object({
    eyebrow: z.string(),
    titleLead: z.string(),
    titleHighlight: z.string(),
    body: z.string(),
    primaryCtaLabel: z.string(),
    secondaryCtaLabel: z.string(),
    imageCaption: z.string(),
    stats: z.array(stat),
  }),

  marquee: z.object({
    items: z.array(z.string()),
  }),

  services: z.object({
    eyebrow: z.string(),
    title: z.string(),
    note: z.string(),
    ctaLabel: z.string(),
    items: z.array(serviceCopy),
  }),

  story: z.object({
    eyebrow: z.string(),
    title: z.string(),
    paragraphs: z.array(z.string()),
    credentials: z.array(z.string()),
    highlightCredential: z.string(),
    personName: z.string(),
    personRole: z.string(),
  }),

  pricing: z.object({
    eyebrow: z.string(),
    title: z.string(),
    note: z.string(),
    singleSession: z.object({
      title: z.string(),
      priceLabel: z.string(),
      detail: z.string(),
      includes: z.array(z.string()),
    }),
  }),

  visit: z.object({
    eyebrow: z.string(),
    title: z.string(),
    hoursNote: z.string(),
    gettingHere: z.string(),
  }),

  footer: z.object({
    blurb: z.string(),
    signoff: z.string(),
  }),
});

export type SiteContent = z.infer<typeof contentSchema>;

/** The shipped default. Parsed at module load so a typo in the JSON fails loudly in dev. */
export const defaultContent: SiteContent = contentSchema.parse(rawContent);

/**
 * Accepts anything and returns something safe to render. Used on both the
 * server (reading the database) and in the admin editor (reading an uploaded
 * file), so neither path can put a half-shaped object in front of a visitor.
 */
export function parseContent(value: unknown):
  | { ok: true; content: SiteContent }
  | {
      ok: false;
      problems: string[];
    } {
  const result = contentSchema.safeParse(value);
  if (result.success) return { ok: true, content: result.data };
  return {
    ok: false,
    problems: result.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    ),
  };
}

/** Convenience links built from whatever brand block is live. */
export const whatsappLinkFor = (brand: SiteContent["brand"], message: string) =>
  `https://wa.me/${brand.whatsapp}?text=${encodeURIComponent(message)}`;

export const mapsLinkFor = (brand: SiteContent["brand"]) =>
  `https://www.google.com/maps/search/?api=1&query=${brand.mapsQuery}`;

export const mapsEmbedFor = (brand: SiteContent["brand"]) =>
  `https://www.google.com/maps?q=${brand.mapsQuery}&output=embed`;
