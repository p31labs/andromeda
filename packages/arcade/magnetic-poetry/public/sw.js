/**
 * Magnetic Poetry Service Worker
 * Dev-mode friendly: no caching on localhost
 */

const CACHE_NAME = 'magnetic-poetry-v1';

// Check if running on localhost/dev
const isDev = typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
   location.hostname === '127.0.0.1' ||
   location.hostname.endsWith('.local'));

// Install: Skip in dev mode
self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('[SW] Dev mode - skipping install cache');
    self.skipWaiting();
    return;
  }

  // Production: cache minimal static assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/manifest.json']);
    }).catch(() => {
      // Silent fail - app works without cache
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  if (isDev) {
    console.log('[SW] Dev mode - clearing any old caches');
    // Clear all caches in dev mode
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map(n => caches.delete(n)))
      )
    );
  } else {
    // Production: clean old versions
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      )
    );
  }
  self.clients.claim();
});

// Fetch: Pass-through in dev, cache in production
self.addEventListener('fetch', (event) => {
  // Always skip in dev mode - let Vite handle everything
  if (isDev) return;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and Vite HMR
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') ||
      url.pathname.includes('@') ||
      url.pathname.includes('?t=') ||
      url.pathname.includes('?v=')) return;

  // Skip HMR WebSocket
  if (event.request.headers.get('accept')?.includes('text/event-stream')) return;

  // Production: stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
