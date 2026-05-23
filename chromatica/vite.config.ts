/**
 * Chromatica - Vite Configuration
 * Version: 2.0.0 - Pure in-memory, NO PGlite
 * 
 * Build tool: Vite 5.x
 * Target: Modern browsers
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: '**/*.{tsx,ts}',
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@voice': resolve(__dirname, 'src/voice'),
      '@db': resolve(__dirname, 'src/db'),
      '@p31/shared': resolve(__dirname, '../andromeda/04_SOFTWARE/packages/shared/src'),
    },
  },

  server: {
    port: 5173,
    host: true,
    open: false,
    cors: true,
    hmr: {
      overlay: true,
    },
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'esbuild',
    cssMinify: true,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-state': ['zustand'],
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    reportCompressedSize: true,
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
    ],
    exclude: [],
  },

  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase',
    },
  },

  preview: {
    port: 4173,
    host: true,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  envPrefix: 'P31_',

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
      ],
    },
  },
});
