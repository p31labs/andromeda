import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@noble/curves/ed25519': path.resolve(__dirname, 'node_modules/@noble/curves/ed25519.js'),
      'framer-motion': path.resolve(__dirname, 'node_modules/framer-motion/dist/es/index.mjs')
    }
  },
  build: {
    rollupOptions: {
      output: { format: 'es' }
    }
  },
  worker: { format: 'es' }
})
