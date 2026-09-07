import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { contentSchema, defaultContent, type SiteContent } from "./content-schema";

/**
 * Content is read on every render of the shell, so this handler must be
 * cheap and must never throw. Any failure — no Supabase, empty table, a row
 * saved before a schema change — degrades to the bundled default rather than
 * taking the site down. The practitioner sees the old copy; nobody sees a 500.
 */

const ROW_ID = "live";

export const loadSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteContent> => {
    const { getLiveContent } = await import("./content.server");
    return getLiveContent();
  },
);

/**
 * Saving is gated by the same practitioner passcode session the diary uses,
 * and the payload is re-validated here. The browser cannot save a shape the
 * site would not be able to render.
 */
export const saveSiteContent = createServerFn({ method: "POST" })
  .validator(z.object({ content: contentSchema }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ id: ROW_ID, content: data.content, updated_at: new Date().toISOString() });

    if (error) return { ok: false as const, reason: error.message };

    // Email templates read this document too, so drop the cache or the next
    // confirmation goes out with the wording that was just replaced.
    const { clearContentCache } = await import("./content.server");
    clearContentCache();

    return { ok: true as const };
  });

/** Puts the site back to the copy that ships in src/content/site.content.json. */
export const resetSiteContent = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("site_content").delete().eq("id", ROW_ID);

  if (error) return { ok: false as const, reason: error.message };

  const { clearContentCache } = await import("./content.server");
  clearContentCache();

  return { ok: true as const, content: defaultContent };
});
