/**
 * Crystal Interiors service worker – installable, fast repeat visits, offline.
 *
 *  - Pages: network first (always fresh), cached copy or /offline/ when offline.
 *  - /_astro/* and /styles/*: stale-while-revalidate (fast, self-updating).
 *  - Images (site + res.cloudinary.com): stale-while-revalidate, capped.
 *  - Never touches /admin/, /api/, /build.json, POSTs or other origins' data.
 *
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const OFFLINE = "/offline/";
const PRECACHE = ["/", OFFLINE, "/manifest.webmanifest", "/images/favicons/favicon.svg"];
const MAX_IMAGES = 150;
const SKIP = /^\/(admin|api|mcp|cdn-cgi|build\.json)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, ASSETS, IMAGES];
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key)));
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

function staleWhileRevalidate(event, cacheName, max) {
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const hit = await cache.match(event.request);
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok || response.type === "opaque") {
            cache.put(event.request, response.clone());
            if (max) trim(cacheName, max);
          }
          return response;
        })
        .catch(() => hit);
      if (hit) event.waitUntil(network);
      return hit || network;
    }),
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === "https://res.cloudinary.com" && request.destination === "image") {
    staleWhileRevalidate(event, IMAGES, MAX_IMAGES);
    return;
  }
  if (url.origin !== self.location.origin || SKIP.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = (await event.preloadResponse) || (await fetch(request));
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return response;
        } catch {
          return (await caches.match(request)) || (await caches.match(OFFLINE)) || Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_astro/") || url.pathname.startsWith("/styles/")) {
    staleWhileRevalidate(event, ASSETS);
    return;
  }

  if (request.destination === "image") staleWhileRevalidate(event, IMAGES, MAX_IMAGES);
});
