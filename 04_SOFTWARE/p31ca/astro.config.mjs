// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://p31ca.org',
  // Avoid /dome <-> /dome/ redirect ping-pong with static hosts (see ground-truth routes.dome note).
  trailingSlash: 'always',
  vite: {
    build: {
      sourcemap: false
    }
  }
});
