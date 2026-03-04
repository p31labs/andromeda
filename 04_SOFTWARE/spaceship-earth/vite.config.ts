import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@p31/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@p31/node-zero': path.resolve(__dirname, '../packages/node-zero/src'),
      '@p31/love-ledger': path.resolve(__dirname, '../packages/love-ledger/src'),
      '@p31/game-engine': path.resolve(__dirname, '../packages/game-engine/src'),
    },
    dedupe: ['three', '@react-three/fiber', '@react-three/drei'],
  },
});
