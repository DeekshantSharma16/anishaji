/*
 * Service worker for Wellness with Anisha.
 *
 * Deliberately conservative, because this site takes bookings:
 *   - Only GET requests are touched. Every POST (a booking, a reschedule, a
 *     cancellation) goes straight to the network, always.
 *   - Pages use network-first, so a visitor never sees a stale diary. The cache
 *     is only a fallback for when the network is genuinely unavailable.
 *   - Hashed build assets and images use cache-first, since their filenames
 *     change whenever their contents do.
 *
 * Bump CACHE_VERSION to force every client to discard its old caches.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `anisha-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `anisha-assets-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const SHELL_FILES = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** Allows the page to activate a waiting worker without a manual reload. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const isAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  url.pathname.startsWith("/images/") ||
  /\.(?:css|js|png|jpe?g|svg|webp|woff2?|ico)$/.test(url.pathname);

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(ASSET_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never interfere with anything that changes server state.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only: leave fonts, Supabase and any third party alone.
  if (url.origin !== self.location.origin) return;

  // Server functions and API routes must always be live.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_serverFn")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
