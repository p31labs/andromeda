/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { setDefaultHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { offlineFallback } from 'workbox-recipes';

declare let self: ServiceWorkerGlobalScope;

// Clean old caches on activate
cleanupOutdatedCaches();

// Precache all Astro build assets (HTML, JS, CSS, Wasm, GLSL)
precacheAndRoute(self.__WB_MANIFEST, {
  directoryIndex: 'index.html',
  cleanURLs: true,
});

// Network-first for all other requests
setDefaultHandler(new NetworkOnly());

// Graceful offline fallback
offlineFallback({
  pageFallback: 'offline.html',
});
