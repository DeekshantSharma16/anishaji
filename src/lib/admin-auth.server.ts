import { getCookie } from "@tanstack/react-start/server";

/**
 * Shared practitioner-session check, so every new server function can reuse
 * the same signed cookie the diary already issues in admin.functions.ts.
 * Server-only: never import this from a component.
 */

export const ADMIN_COOKIE = "practice_session";

export async function signPayload(payload: string) {
  const secret = process.env["ADMIN_SESSION_SECRET"];
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set.");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function requireAdmin() {
  const raw = getCookie(ADMIN_COOKIE);
  if (!raw) throw new Error("Not signed in.");
  const [expiry, signature] = raw.split(".");
  if (!expiry || !signature) throw new Error("Not signed in.");
  if (Number(expiry) < Date.now()) throw new Error("Your session expired. Please sign in again.");
  if (!safeEqual(await signPayload(expiry), signature)) throw new Error("Not signed in.");
}
