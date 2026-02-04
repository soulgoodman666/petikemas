import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [
    react()
  ],

  base: '/',

  build: {
    outDir: 'dist',

    // ⚠️ PENTING: jangan pakai terser (CSP-safe)
    minify: 'esbuild',

    // ⚠️ Jangan generate source map
    sourcemap: false,

    target: 'es2018',

    rollupOptions: {
      output: {
        // Boleh chunking, tapi sederhana
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },

  server: {
    port: 5173,
    host: true
  },

  preview: {
    port: 4173,
    host: true
  },

  resolve: {
    alias: {
      '@': '/src'
    }
  }
}))
