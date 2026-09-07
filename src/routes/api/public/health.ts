import { createFileRoute } from "@tanstack/react-router";

/**
 * Health check, and the thing that keeps a free-tier Supabase project awake.
 *
 * Supabase pauses a free project after seven days with no database activity.
 * A live site never gets there on its own — every visitor who opens the
 * booking form queries availability — but a site that is still being built,
 * or one that goes quiet over a holiday, does.
 *
 * So this route makes one deliberately cheap read. It counts rows in
 * blocked_slots with `head: true`, which returns no rows at all, just a count
 * header. That is enough to reset the inactivity clock without moving any
 * real data.
 *
 * Nothing here is secret, so there is no auth: the response says whether the
 * database answered and nothing else. It is still marked noindex, because a
 * status endpoint has no business in search results.
 *
 * Point a scheduler at it every few days. See .github/workflows/keep-alive.yml.
 */

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = Date.now();

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("blocked_slots")
            .select("id", { count: "exact", head: true });

          if (error) throw new Error(error.message);

          return Response.json(
            { ok: true, database: "reachable", ms: Date.now() - startedAt },
            { headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } },
          );
        } catch (problem) {
          // A 503 rather than a 200 so the scheduler's own failure alert fires.
          // A keep-alive that silently fails is worse than none: it removes the
          // one moment you would otherwise have noticed the project was down.
          console.error("[health] database unreachable", problem);
          return Response.json(
            { ok: false, database: "unreachable" },
            {
              status: 503,
              headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" },
            },
          );
        }
      },
    },
  },
});
