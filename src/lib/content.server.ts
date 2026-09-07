import { defaultContent, parseContent, type SiteContent } from "./content-schema";

/**
 * Plain server-side reader for the live content document.
 *
 * content.functions.ts wraps this in a server function for the browser. Other
 * server code (email templates, structured data) calls this directly, because
 * a server function invoked from the server would round-trip through the
 * router for nothing.
 *
 * Never throws. If Supabase is unreachable or the saved document no longer
 * matches the schema, the bundled default comes back, so a confirmation email
 * still goes out with the old wording rather than not going out at all.
 */

const ROW_ID = "live";

/** Cached briefly: one booking sends three emails, all wanting the same document. */
let cache: { at: number; content: SiteContent } | null = null;
const CACHE_MS = 30_000;

export async function getLiveContent(): Promise<SiteContent> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.content;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("content")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error || !data?.content) return defaultContent;

    const parsed = parseContent(data.content);
    if (!parsed.ok) {
      console.warn("[content] Saved content no longer matches the schema:", parsed.problems);
      return defaultContent;
    }

    cache = { at: Date.now(), content: parsed.content };
    return parsed.content;
  } catch (problem) {
    console.warn("[content] Falling back to the bundled default:", problem);
    return defaultContent;
  }
}

/** Called after a save, so the next email uses the new wording immediately. */
export function clearContentCache() {
  cache = null;
}
