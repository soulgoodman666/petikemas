import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/petikemas/',
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: false,
    rollupOptions: {}
  }
})
