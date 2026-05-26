
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../out/webview',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'webview.js',
        chunkFileNames: 'webview.js',
        assetFileNames: 'webview.[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
