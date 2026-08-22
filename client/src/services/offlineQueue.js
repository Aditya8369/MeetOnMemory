// client/src/services/offlineQueue.js

const DB_NAME = "offline-mutations-db";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

/**
 * Open the IndexedDB database for offline mutations.
 */
export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Queue a mutation to IndexedDB.
 * @param {Object} mutation { url, method, headers, body }
 */
export const queueMutation = async (mutation) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const item = {
      ...mutation,
      timestamp: Date.now(),
      status: "queued",
    };
    const request = store.add(item);

    request.onsuccess = () => {
      // Register for background sync if service worker is active
      if (
        "serviceWorker" in navigator &&
        "sync" in (navigator.serviceWorker.controller || {})
      ) {
        navigator.serviceWorker.ready
          .then((reg) => {
            return reg.sync.register("sync-mutations");
          })
          .then(() => {
            console.log("[Offline Queue] Background sync registered");
          })
          .catch((err) => {
            console.error(
              "[Offline Queue] Failed to register background sync:",
              err,
            );
          });
      } else {
        // Fallback for browsers without SyncManager support
        window.addEventListener("online", async () => {
          console.log(
            "[Offline Queue] Network back online, triggering manual replay",
          );
          // Post a message to sw or trigger sync via client API if online
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "TRIGGER_SYNC",
            });
          }
        });
      }
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Get all queued mutations.
 */
export const getQueuedMutations = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Delete a mutation from the queue.
 */
export const dequeueMutation = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

/**
 * Update mutation status.
 */
export const updateMutationStatus = async (id, status, errorMsg) => {
  const db = await openDB();
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

    getRequest.onerror = (event) => {
      reject(event.target.error);
    };
  });
};
