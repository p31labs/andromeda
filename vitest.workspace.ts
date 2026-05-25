import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './04_SOFTWARE/bonding/vitest.config.ts',
  },
  {
    extends: './04_SOFTWARE/p31ca/vitest.config.ts',
  },
  {
    extends: './shared-components/onboarding/vitest.config.ts',
  },
  {
    extends: './packages/ui-facets/vitest.config.ts',
  },
]);
