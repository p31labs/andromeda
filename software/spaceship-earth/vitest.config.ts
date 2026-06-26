import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
