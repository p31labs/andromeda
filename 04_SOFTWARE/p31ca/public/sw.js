// P31 Labs — Shared Service Worker
// Covers: donate.html, ecosystem.html, health.html, telemetry.html
// Cache-first for shell HTML/JS; stale-while-revalidate for fonts.

const CACHE = 'p31ca-v1';
const SHELL = [
  '/health.html',
  '/telemetry.html',
  '/donate.html',
  '/ecosystem.html',
  '/p31-telemetry.js',
];
const FONT_RE = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com)/;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;

  // Fonts: stale-while-revalidate
  if (FONT_RE.test(request.url)) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fresh = fetch(request).then(res => {
            cache.put(request, res.clone());
            return res;
          });
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Same-origin HTML/JS: cache-first
  if (new URL(request.url).origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }))
    );
  }
});
