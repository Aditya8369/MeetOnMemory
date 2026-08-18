/**
 * sw.js
 * Foundational Service Worker for Offline-First PWA capabilities.
 * Intercepts requests and serves from cache when offline.
 */

const CACHE_NAME = "meet-on-memory-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Simple network-first, fallback to cache strategy for API calls and static assets
  if (event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
  }
});

// Background sync for offline mutations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    console.log("[Service Worker] Syncing local DB mutations to server");
    // Placeholder: Fetch queued mutations from IndexedDB and replay to API
  }
});
