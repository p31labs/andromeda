import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      manifest: {
        name: 'P31 Gridiron',
        short_name: 'Gridiron',
        description: 'Local-first 2.5D football management simulation',
        theme_color: '#1a3d1a',
        background_color: '#0f2a0f',
        display: 'standalone',
        orientation: 'landscape',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@db': path.resolve(__dirname, './src/db'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@components': path.resolve(__dirname, './src/components'),
      '@p31/arcade-theme': path.resolve(__dirname, '../../p31-arcade-theme/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'pglite': ['@electric-sql/pglite'],
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
        }
      }
    }
  }
});
