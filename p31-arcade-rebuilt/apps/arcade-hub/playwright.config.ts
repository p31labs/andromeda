import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  webServer: {
    command: 'npx vite --port 4322',
    port: 4322,
    reuseExistingServer: !process.env.CI,
    cwd: '.',
  },
  use: {
    baseURL: 'http://localhost:4322',
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
