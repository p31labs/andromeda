import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  site: 'https://phos.p31labs.com',
  vite: {
    ssr: {
      noExternal: ['@astrojs/react'],
    },
  },
});
