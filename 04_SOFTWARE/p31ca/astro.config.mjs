import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  integrations: [tailwind(), react()],
  site: 'https://p31ca.org',
  trailingSlash: 'always',
  vite: {
    resolve: {
       alias: {
         '@shared-components': resolve(__dirname, '../../shared-components'),
         'framer-motion': resolve(__dirname, 'node_modules/framer-motion'),
         'lucide-react': resolve(__dirname, 'node_modules/lucide-react'),
         '@noble/curves/ed25519': resolve(__dirname, 'node_modules/@noble/curves/ed25519.js'),
         '@noble/curves': resolve(__dirname, 'node_modules/@noble/curves/index.js'),
          '@noble/ed25519': resolve(__dirname, 'node_modules/@noble/ed25519/index.js'),
          '@lib': resolve(__dirname, 'src/lib'),
          '@/lib': resolve(__dirname, 'src/lib'),
        },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        external: ['@electric-sql/pglite'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three')) return 'three';
          },
        },
      },
    },
    plugins: [],
  }
});
