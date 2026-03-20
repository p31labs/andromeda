import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@p31/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@p31/spaceship-earth': path.resolve(__dirname, '../spaceship-earth/src'),
    },
  },
});
