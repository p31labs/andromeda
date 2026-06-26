<<<<<<< HEAD
const PAIN_THRESHOLD = 7;
const CACHE_NAME = 'hearth-shell-v1';
const SHELL_URLS = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/_astro/')) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
          cache.put(e.request, res.clone());
          return res;
        }))
      )
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

function notifyClients(data) {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const client of clients) {
      client.postMessage(data);
    }
  });
}

self.addEventListener('message', (e) => {
  if (e.data?.type === 'PAIN_ALERT') {
    const alert = e.data;
    notifyClients({ type: 'PAIN_ALERT', ...alert });
=======
/// <reference lib="webworker" />

const PAIN_THRESHOLD = 7;

interface PainNotification {
  level: number;
  timestamp: number;
  source: string;
}

self.addEventListener('message', (e: MessageEvent) => {
  if (e.data?.type === 'PAIN_ALERT') {
    const alert = e.data as PainNotification;

    // Broadcast to all clients
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'PAIN_ALERT', ...alert });
      }
    });

    // If pain level exceeds threshold, force spoon drop notification
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    if (alert.level >= PAIN_THRESHOLD) {
      self.registration.showNotification('⚠ Pain Alert', {
        body: `Pain level ${alert.level} detected. Spoon capacity reduced.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pain-alert',
        requireInteraction: true,
        data: alert,
      });
    }
<<<<<<< HEAD
    try {
      caches.open('hearth-alerts').then((cache) => {
        cache.put(
          new Request('/hearth-alerts/last-pain'),
          new Response(JSON.stringify(alert), { headers: { 'Content-Type': 'application/json' } })
=======

    // Store for persistence
    try {
      (self as any).caches?.open('hearth-alerts').then((cache: Cache) => {
        cache.put(
          'last-pain',
          new Response(JSON.stringify(alert), { headers: { 'Content-Type': 'application/json' } }),
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        );
      });
    } catch { /* */ }
  }
});

<<<<<<< HEAD
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-actions') {
    e.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_ACTIONS' });
        }
      })()
    );
  }
});

self.addEventListener('push', (e) => {
  try {
    const data = e.data?.json();
    if (!data) return;
    const title = data.title || '🧸 Hearth Alert';
    const body = data.level !== undefined
      ? (data.level >= PAIN_THRESHOLD
        ? `High pain detected (${data.level}/10). Spoons reduced.`
        : `Pain check: level ${data.level}`)
      : (data.body || 'PHOS notification');
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'hearth-push',
      data: data.data || data,
      requireInteraction: data.requireInteraction || false,
=======
self.addEventListener('push', (e: PushEvent) => {
  try {
    const data = e.data?.json() as PainNotification | undefined;
    if (!data) return;

    self.registration.showNotification('🧸 Hearth Alert', {
      body: data.level >= PAIN_THRESHOLD
        ? `High pain detected (${data.level}/10). Spoons reduced.`
        : `Pain check: level ${data.level}`,
      icon: '/icon-192.png',
      tag: 'hearth-push',
      data,
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    });
  } catch { /* */ }
});

<<<<<<< HEAD
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url)) {
=======
self.addEventListener('notificationclick', (e: NotificationEvent) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/hearth')) {
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
          client.focus();
          return;
        }
      }
<<<<<<< HEAD
      self.clients.openWindow(url);
    })
  );
});
=======
      self.clients.openWindow('/');
    }),
  );
});

export {};
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
