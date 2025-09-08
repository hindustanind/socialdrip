// src/dev/purgeCache.ts

/**
 * A utility for development to completely clear all client-side storage.
 * To use, open the browser dev tools and run: `window.PURGE_CACHE()`
 */
async function purgeCache() {
  if (process.env.NODE_ENV === 'production') {
    console.log("Cache purge is disabled in production.");
    return;
  }

  console.group('%c[Cache Purge] Starting...', 'color: red; font-weight: bold;');

  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log(`Service worker for ${registration.scope} unregistered.`);
      }
    }
  } catch (e) {
    console.error("Error unregistering service workers:", e);
  }

  try {
    // 2. Clear Cache Storage
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        console.log(`Cache storage '${key}' deleted.`);
      }
    }
  } catch (e) {
    console.error("Error clearing cache storage:", e);
  }

  try {
    // 3. Clear IndexedDB
    if ('indexedDB' in window) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(db.name!);
            deleteRequest.onsuccess = () => {
              console.log(`IndexedDB '${db.name}' deleted.`);
              resolve();
            };
            deleteRequest.onerror = (event) => {
              console.error(`Error deleting IndexedDB '${db.name}':`, (event.target as any).error);
              reject();
            };
            deleteRequest.onblocked = () => {
              console.warn(`IndexedDB '${db.name}' delete is blocked. Please close other tabs of this app.`);
              reject(new Error('IndexedDB delete blocked'));
            };
          });
        }
      }
    }
  } catch (e) {
    console.error("Error clearing IndexedDB:", e);
  }

  try {
    // 4. Clear localStorage
    localStorage.clear();
    console.log("localStorage cleared.");
  } catch (e) {
    console.error("Error clearing localStorage:", e);
  }

  try {
    // 5. Clear sessionStorage
    sessionStorage.clear();
    console.log("sessionStorage cleared.");
  } catch (e) {
    console.error("Error clearing sessionStorage:", e);
  }
  
  console.log('%c[Cache Purge] Complete. Please reload the page.', 'color: red; font-weight: bold;');
  console.groupEnd();
}

export function installPurgeCacheUtil() {
    if (process.env.NODE_ENV !== 'production') {
        (window as any).PURGE_CACHE = purgeCache;
        console.log('[Dev Util] `window.PURGE_CACHE()` is available to clear all storage.');
    }
}
