// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';

export default defineConfig({
  site: 'https://p31ca.org',
  trailingSlash: 'always',
  viewTransitions: true,
  integrations: [
    tailwind(),
    react(),
    AstroPWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glsl}'],
        exclude: [/\.wasm$/],
        directoryIndex: 'index.html',
        cleanURLs: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  vite: {
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
          },
        },
      },
    },
    resolve: {
      preserveSymlinks: true,
    },
  },
});
