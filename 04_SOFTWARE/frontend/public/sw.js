/**
 * P31 Sovereign Cockpit Service Worker
 * Offline-first fallback routing and caching strategy
 */

const CACHE_NAME = 'p31-sovereign-v1';
const OFFLINE_URL = '/offline.html';

// Critical assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  OFFLINE_URL
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('localhost') &&
      !url.hostname.includes('trimtab-signal.workers.dev')) {
    return;
  }

  // Handle API requests with fallback logic
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('trimtab-signal.workers.dev')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          
          // Return original response with mesh status header
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: new Headers({
              ...Object.fromEntries(response.headers),
              'X-Mesh-Status': 'Online'
            })
          });
        })
        .catch(async () => {
          // Network failure - try cache first
          const cached = await caches.match(request);
          if (cached) {
            return new Response(cached.body, {
              status: cached.status,
              headers: new Headers({
                ...Object.fromEntries(cached.headers),
                'X-Mesh-Status': 'Offline',
                'X-Cache-Source': 'ServiceWorker'
              })
            });
          }
          
          // No cache available - return offline API response
          return new Response(JSON.stringify({
            offline: true,
            timestamp: Date.now(),
            message: 'Operating in local-only mode',
            vertices: {
              A: { status: 'local' },
              B: { status: 'local' },
              C: { status: 'local' },
              D: { status: 'local' }
            }
          }), {
            headers: {
              'Content-Type': 'application/json',
              'X-Mesh-Status': 'Offline'
            }
          });
        })
    );
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle static assets - cache first, network fallback
  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request))
  );
});

// Handle sync events for background data upload
self.addEventListener('sync', (event) => {
  if (event.tag === 'p31-sync-queue') {
    event.waitUntil(syncQueuedData());
  }
});

async function syncQueuedData() {
  const queue = await getIndexedDBQueue();
  for (const item of queue) {
    try {
      await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body
      });
      await removeFromIndexedDBQueue(item.id);
    } catch (e) {
      // Will retry on next sync
    }
  }
}

// Simple IndexedDB queue implementation
function getIndexedDBQueue() {
  return new Promise((resolve) => {
    const open = indexedDB.open('p31-offline-queue', 1);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('queue', 'readonly');
      const store = tx.objectStore('queue');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    };
    open.onerror = () => resolve([]);
  });
}

function removeFromIndexedDBQueue(id) {
  return new Promise((resolve) => {
    const open = indexedDB.open('p31-offline-queue', 1);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      store.delete(id);
      tx.oncomplete = resolve;
    };
    open.onerror = resolve;
  });
}
