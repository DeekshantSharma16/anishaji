import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Session bundles. A request is a reservation, not a payment: the client asks
 * for a bundle, the practitioner activates it once money changes hands at the
 * studio, and sessions are drawn down one at a time from the diary.
 */

const email = z.string().trim().email().max(180);

function makeCode() {
  const raw = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `PK-${raw.slice(0, 8)}`;
}

export const requestPackage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      clientName: z.string().trim().min(2).max(120),
      email,
      packageKey: z.string().trim().min(2).max(60),
      notes: z.string().trim().max(600).optional(),
      website: z.string().max(200).optional(),
    }),
  )
  .handler(async ({ data }) => {
    if (data.website) return { ok: false as const, reason: "We could not save that request." };

    const { findPackage } = await import("./packages-catalog");
    const definition = findPackage(data.packageKey);
    if (!definition) return { ok: false as const, reason: "Please choose one of the bundles." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPackageRequested } = await import("./notify-features.server");

    const expires = new Date(Date.now() + definition.validityWeeks * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const code = makeCode();

    const { data: row, error } = await supabaseAdmin
      .from("client_packages")
      .insert({
        code,
        client_name: data.clientName,
        email: data.email,
        package_key: definition.key,
        label: definition.label,
        sessions_total: definition.sessions,
        notes: data.notes || null,
        expires_at: expires,
      })
      .select("code, label, sessions_total, sessions_used, status, expires_at")
      .single();

    if (error) {
      console.error("Package request failed", error);
      return { ok: false as const, reason: "We could not save that request. Please try again." };
    }

    await sendPackageRequested({
      clientName: data.clientName,
      email: data.email,
      label: definition.label,
      sessions: definition.sessions,
      code,
    });

    return { ok: true as const, package: row };
  });

/** What's left on a bundle, looked up by its code. */
export const lookupPackage = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string().trim().min(4).max(40) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("client_packages")
      .select("code, client_name, label, sessions_total, sessions_used, status, expires_at")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (!row) return { found: false as const };
    return {
      found: true as const,
      package: { ...row, remaining: row.sessions_total - row.sessions_used },
    };
  });

/* ------------------------------------------------------------------ diary */

export const adminPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("./admin-auth.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("client_packages")
    .select(
      "id, code, client_name, email, label, sessions_total, sessions_used, status, expires_at, notes, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error("Could not load packages.");
  return data ?? [];
});

export const adminUpdatePackage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["requested", "active", "completed", "cancelled"]).optional(),
      sessionsUsedDelta: z.number().int().min(-5).max(5).optional(),
      notes: z.string().max(600).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPackageActivated } = await import("./notify-features.server");

    const { data: current } = await supabaseAdmin
      .from("client_packages")
      .select("id, code, client_name, email, label, sessions_total, sessions_used, status")
      .eq("id", data.id)
      .maybeSingle();

    if (!current) return { ok: false as const, reason: "That package no longer exists." };

    const used = Math.min(
      current.sessions_total,
      Math.max(0, current.sessions_used + (data.sessionsUsedDelta ?? 0)),
    );
    const status = data.status ?? (used >= current.sessions_total ? "completed" : current.status);

    const { error } = await supabaseAdmin
      .from("client_packages")
      .update({
        sessions_used: used,
        status,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      })
      .eq("id", data.id);

    if (error) {
      console.error("Package update failed", error);
      return { ok: false as const, reason: "That change didn't save." };
    }

    if (status === "active" && current.status !== "active") {
      await sendPackageActivated({
        clientName: current.client_name,
        email: current.email,
        label: current.label,
        remaining: current.sessions_total - used,
        code: current.code,
      });
    }

    return { ok: true as const, remaining: current.sessions_total - used, status };
  });
