import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  optimizeDeps: {
    exclude: ['@automerge/automerge']
  },
  build: {
    target: 'esnext'
  }
})