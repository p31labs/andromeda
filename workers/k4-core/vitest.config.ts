/**
 * vitest.config.ts — k4-core test configuration
 * P31 Labs, Inc. | EIN 42-1888158
 *
 * Uses @cloudflare/vitest-pool-workers to run tests inside workerd runtime.
 * See: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */

import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
  test: {
    // cloudflareTest() Vite plugin handles pool configuration (v0.13.0+ API)
  },
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: './wrangler.toml',
      },
      miniflare: {
        // Bindings defined in wrangler.toml
        // Per-test-file storage isolation by default
      },
    }),
  ],
});
