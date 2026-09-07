import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Reviews and the live rating badge.
 *
 * Reviews live in the database so the site never depends on a third party at
 * render time. When GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID are set, the
 * practitioner can pull the latest Google reviews into that same table with
 * one click; without them the manually curated testimonials still show.
 */

export const getReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [reviews, summary] = await Promise.all([
    supabaseAdmin
      .from("reviews")
      .select("id, author_name, author_photo, rating, body, relative_time, source")
      .eq("published", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("review_summary")
      .select("rating, total_reviews, profile_url, fetched_at")
      .maybeSingle(),
  ]);

  return {
    reviews: reviews.data ?? [],
    summary: summary.data ?? null,
  };
});

/* ------------------------------------------------------------------ diary */

export const adminReviews = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [reviews, summary] = await Promise.all([
    supabaseAdmin
      .from("reviews")
      .select("id, author_name, rating, body, relative_time, source, published, position")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("review_summary")
      .select("rating, total_reviews, profile_url, fetched_at")
      .maybeSingle(),
  ]);

  return {
    reviews: reviews.data ?? [],
    summary: summary.data ?? null,
    googleConfigured: Boolean(
      process.env["GOOGLE_PLACES_API_KEY"] && process.env["GOOGLE_PLACE_ID"],
    ),
  };
});

export const adminSaveReview = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      authorName: z.string().trim().min(2).max(120),
      rating: z.number().int().min(1).max(5),
      body: z.string().trim().min(4).max(1200),
      relativeTime: z.string().trim().max(60).optional(),
      published: z.boolean().default(true),
      position: z.number().int().min(0).max(99).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      author_name: data.authorName,
      rating: data.rating,
      body: data.body,
      relative_time: data.relativeTime || null,
      published: data.published,
      position: data.position,
      source: "manual" as const,
    };

    const { error } = data.id
      ? await supabaseAdmin.from("reviews").update(row).eq("id", data.id)
      : await supabaseAdmin.from("reviews").insert(row);

    if (error) {
      console.error("Review save failed", error);
      return { ok: false as const, reason: "That review didn't save." };
    }
    return { ok: true as const };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    return { ok: true as const };
  });

export const adminSetReviewSummary = createServerFn({ method: "POST" })
  .validator(
    z.object({
      rating: z.number().min(1).max(5).nullable(),
      totalReviews: z.number().int().min(0).max(100000).nullable(),
      profileUrl: z.string().trim().url().max(400).nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("review_summary").upsert({
      id: true,
      rating: data.rating,
      total_reviews: data.totalReviews,
      profile_url: data.profileUrl,
      fetched_at: new Date().toISOString(),
    });

    if (error) return { ok: false as const, reason: "That didn't save." };
    return { ok: true as const };
  });

/** Pull the latest reviews from the Google Places API, if it's configured. */
export const adminRefreshGoogleReviews = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();

  const key = process.env["GOOGLE_PLACES_API_KEY"];
  const placeId = process.env["GOOGLE_PLACE_ID"];
  if (!key || !placeId) {
    return {
      ok: false as const,
      reason: "Google reviews aren't connected yet. Add the Places API key and place ID first.",
    };
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "rating,userRatingCount,googleMapsUri,reviews.name,reviews.rating,reviews.text,reviews.relativePublishTimeDescription,reviews.authorAttribution",
      },
    });

    if (!response.ok) {
      console.error("Places API failed", response.status, await response.text());
      return {
        ok: false as const,
        reason: "Google refused that request. Check the key and place ID.",
      };
    }

    const payload = (await response.json()) as {
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
      reviews?: {
        name?: string;
        rating?: number;
        text?: { text?: string };
        relativePublishTimeDescription?: string;
        authorAttribution?: { displayName?: string; photoUri?: string };
      }[];
    };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();

    await supabaseAdmin.from("review_summary").upsert({
      id: true,
      rating: payload.rating ?? null,
      total_reviews: payload.userRatingCount ?? null,
      profile_url: payload.googleMapsUri ?? null,
      fetched_at: now,
    });

    const rows = (payload.reviews ?? [])
      .filter((review) => review.text?.text && review.authorAttribution?.displayName)
      .map((review, index) => ({
        author_name: review.authorAttribution!.displayName!,
        author_photo: review.authorAttribution?.photoUri ?? null,
        rating: review.rating ?? 5,
        body: review.text!.text!,
        relative_time: review.relativePublishTimeDescription ?? null,
        source: "google" as const,
        external_id: review.name ?? `google-${index}`,
        published: true,
        position: index,
        fetched_at: now,
      }));

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("reviews")
        .upsert(rows, { onConflict: "external_id" });
      if (error) {
        console.error("Review upsert failed", error);
        return { ok: false as const, reason: "We fetched them but couldn't save them." };
      }
    }

    return { ok: true as const, imported: rows.length, rating: payload.rating ?? null };
  } catch (error) {
    console.error("Google reviews refresh failed", error);
    return { ok: false as const, reason: "We couldn't reach Google just now." };
  }
});
