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
const DB_NAME = "offline-mutations-db";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getQueuedMutations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function deleteMutation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

function updateMutationStatus(db, id, status, errorMsg) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.status = status;
        data.error = errorMsg;
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = (event) => reject(event.target.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = (event) => reject(event.target.error);
  });
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

async function syncMutations() {
  let db;
  try {
    db = await openDB();
  } catch (err) {
    console.error("[Service Worker] Failed to open DB for sync:", err);
    return;
  }

  const mutations = await getQueuedMutations(db);
  if (!mutations || mutations.length === 0) {
    return;
  }

  for (const mutation of mutations) {
    if (mutation.status === "syncing" || mutation.status === "conflict") {
      continue;
    }

    try {
      await updateMutationStatus(db, mutation.id, "syncing");

      const fetchOptions = {
        method: mutation.method,
        headers: {
          ...mutation.headers,
          "Content-Type": "application/json",
        },
      };

      if (
        mutation.body &&
        mutation.method !== "GET" &&
        mutation.method !== "HEAD"
      ) {
        fetchOptions.body =
          typeof mutation.body === "string"
            ? mutation.body
            : JSON.stringify(mutation.body);
      }

      const response = await fetch(mutation.url, fetchOptions);

      if (response.ok) {
        await deleteMutation(db, mutation.id);
        await notifyClients({
          type: "SYNC_SUCCESS",
          mutationId: mutation.id,
          url: mutation.url,
        });
      } else if (response.status === 409) {
        await updateMutationStatus(
          db,
          mutation.id,
          "conflict",
          "Merge conflict during sync",
        );
        await notifyClients({
          type: "SYNC_CONFLICT",
          mutationId: mutation.id,
          url: mutation.url,
          message: "A merge conflict occurred. Please review details offline.",
        });
      } else {
        const errorText = await response
          .text()
          .catch(() => "Unknown response error");
        await updateMutationStatus(db, mutation.id, "failed", errorText);
        await notifyClients({
          type: "SYNC_FAILURE",
          mutationId: mutation.id,
          url: mutation.url,
          error: errorText,
        });
      }
    } catch (fetchErr) {
      console.error(
        "[Service Worker] Fetch failed during sync replay:",
        fetchErr,
      );
      await updateMutationStatus(db, mutation.id, "queued");
      break;
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    console.log("[Service Worker] Syncing local DB mutations to server");
    event.waitUntil(syncMutations());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    console.log("[Service Worker] Received TRIGGER_SYNC instruction");
    event.waitUntil(syncMutations());
  }
});

// Web Push Notification Events
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: "MeetOnMemory", body: event.data.text() };
    }
  }

  const title = data.title || "MeetOnMemory Notification";
  const options = {
    body: data.body || "You have a new update.",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

/* eslint-disable no-undef */
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js",
);

if (workbox) {
  // Ensure authenticated API requests are NEVER cached.
  workbox.routing.registerRoute(({ url, request }) => {
    // Exclude requests that include Authorization headers or target protected API endpoints
    if (
      url.pathname.startsWith("/api/") ||
      request.headers.has("Authorization")
    ) {
      return true;
    }
    return false;
  }, new workbox.strategies.NetworkOnly());

  // Continue runtime caching for static assets.
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image",
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: "static-resources",
    }),
  );

  // Preserve offline support for public resources
  workbox.routing.registerRoute(
    ({ request }) => request.mode === "navigate",
    new workbox.strategies.NetworkFirst({
      cacheName: "pages-cache",
    }),
  );
}
