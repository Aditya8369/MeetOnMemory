/**
 * offlineDb.js
 * Foundational wrapper for IndexedDB using native API to act as a local store for Offline PWA.
 */

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MeetOnMemory_LocalDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("mutationsQueue")) {
        db.createObjectStore("mutationsQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains("cachedMeetings")) {
        db.createObjectStore("cachedMeetings", { keyPath: "meetingId" });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("[Offline DB] Failed to open IndexedDB", event);
      reject(event.target.error);
    };
  });
}

export async function queueMutation(mutation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["mutationsQueue"], "readwrite");
    const store = transaction.objectStore("mutationsQueue");
    const request = store.add({ ...mutation, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = (err) => reject(err);
  });
}
