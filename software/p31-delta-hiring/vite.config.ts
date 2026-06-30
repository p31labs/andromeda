import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './',
  server: { port: 3150 },
  build: { outDir: 'dist', sourcemap: true },
  resolve: {
    alias: {
      '@p31/shared': path.resolve(__dirname, '../packages/shared/src')
    }
  }
});
