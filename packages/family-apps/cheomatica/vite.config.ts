import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared-components'),
      'framer-motion': path.resolve(__dirname, 'node_modules/framer-motion'),
      '@noble/curves/ed25519': path.resolve(__dirname, 'node_modules/@noble/curves/ed25519.js'),
      '@noble/curves': path.resolve(__dirname, 'node_modules/@noble/curves/index.js')
    }
  },
  optimizeDeps: {
    include: ['framer-motion']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: { format: 'es' }
    }
  },
  worker: {
    format: 'es'
  }
})
