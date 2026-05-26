/**
 * P31 Smallball Service Worker
 * Dev-mode friendly: no caching on localhost
 */

const CACHE_NAME = 'p31-smallball-v1';

const isDev = typeof location !== 'undefined' &&
  (location.hostname === 'localhost' ||
   location.hostname === '127.0.0.1' ||
   location.hostname.endsWith('.local'));

self.addEventListener('install', (event) => {
  if (isDev) {
    console.log('[SW] Dev mode - skipping install cache');
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html', '/manifest.json']);
    }).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  if (isDev) {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map(n => caches.delete(n)))
      )
    );
  } else {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      )
    );
  }
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (isDev) return;
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') ||
      url.pathname.includes('@') ||
      url.pathname.includes('?t=') ||
      url.pathname.includes('?v=')) return;
  if (event.request.headers.get('accept')?.includes('text/event-stream')) return;

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
