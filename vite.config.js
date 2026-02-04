import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  base: '/', // Base path for Netlify deployment
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    minify: 'terser', // Use terser for better minification
    target: 'es2015', // Target ES2015 for better browser compatibility
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-react']
        },
        // Ensure proper chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Mobile and performance optimizations
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
    // Ensure proper module resolution
    commonjsOptions: {
      include: []
    }
  },
  server: {
    port: 5173,
    host: true,
    // Proper CORS for development
    cors: true
  },
  preview: {
    port: 4173,
    host: true
  },
  // Environment variables handling
  define: {
    global: 'globalThis'
  },
  // Ensure proper module resolution
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js']
  }
})
