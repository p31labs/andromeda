// P31 Sovereign Stack Service Worker
// Phase 2: Offline-first PWA shell for ESP32 WiFi AP

const CACHE_NAME = 'p31-sovereign-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // JavaScript bundles will be added at runtime
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip WebSocket connections
  if (event.request.url.startsWith('ws://') || event.request.url.startsWith('wss://')) {
    return;
  }

  // Skip BLE requests (they're not HTTP)
  if (event.request.url.includes('bluetooth')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[ServiceWorker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('[ServiceWorker] Caching new resource:', event.request.url);
              });

            return response;
          })
          .catch((error) => {
            console.log('[ServiceWorker] Fetch failed; returning offline page:', error);
            
            // If request is for a page, return offline page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // For other requests, return a generic error response
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for telemetry when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-telemetry') {
    console.log('[ServiceWorker] Background sync for telemetry');
    event.waitUntil(syncTelemetry());
  }
});

async function syncTelemetry() {
  // This would sync pending telemetry entries when back online
  // Implementation depends on Automerge offline queue
  console.log('[ServiceWorker] Syncing telemetry...');
  
  // Get pending telemetry from IndexedDB
  // Send to network
  // Clear pending queue
  
  return Promise.resolve();
}

// Periodic sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'periodic-telemetry-sync') {
      console.log('[ServiceWorker] Periodic sync for telemetry');
      event.waitUntil(syncTelemetry());
    }
  });
}