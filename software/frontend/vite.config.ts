import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      crypto: path.resolve(__dirname, 'src/shims/crypto-empty.ts'),
      stream: path.resolve(__dirname, 'src/shims/empty.ts'),
      buffer: path.resolve(__dirname, 'src/shims/empty.ts'),
      util: path.resolve(__dirname, 'src/shims/empty.ts'),
      events: path.resolve(__dirname, 'src/shims/empty.ts'),
      assert: path.resolve(__dirname, 'src/shims/empty.ts'),
      path: path.resolve(__dirname, 'src/shims/empty.ts'),
      fs: path.resolve(__dirname, 'src/shims/empty.ts'),
      os: path.resolve(__dirname, 'src/shims/empty.ts'),
      http: path.resolve(__dirname, 'src/shims/empty.ts'),
      https: path.resolve(__dirname, 'src/shims/empty.ts'),
      zlib: path.resolve(__dirname, 'src/shims/empty.ts'),
      net: path.resolve(__dirname, 'src/shims/empty.ts'),
      tls: path.resolve(__dirname, 'src/shims/empty.ts'),
      child_process: path.resolve(__dirname, 'src/shims/empty.ts'),
    },
  },
});
