import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages serves this project from a /anderpark-app/ subpath (this
  // fork's repo name); the native Capacitor builds need assets at root, so
  // this only applies in gh-pages mode.
  base: mode === 'gh-pages' ? '/anderpark-app/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: mode === 'gh-pages' ? 'dist-pages' : 'dist',
  },
}))
