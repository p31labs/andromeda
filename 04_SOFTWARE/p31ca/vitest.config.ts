import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      'ui-facets': path.resolve(__dirname, '../../packages/ui-facets/src/index.ts'),
      'ui-facets/*': path.resolve(__dirname, '../../packages/ui-facets/src/*'),
      '@/shared-components': path.resolve(__dirname, '../../shared-components/onboarding'),
      '@p31/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@astrojs/react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
      '@astrojs/react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
});
