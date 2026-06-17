// @ts-nocheck — build config; strict PluginOption typing conflicts with @tailwindcss/vite
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import AstroPWA from '@vite-pwa/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://phosphorus31.org',
  trailingSlash: 'always',
  viewTransitions: true,
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'site.webmanifest'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glsl}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: 'module',
        navigateFallback: '/',
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      preserveSymlinks: true,
    },
  },
});