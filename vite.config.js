import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Chrome extensions require relative asset paths so that
  // chrome-extension:// URLs resolve correctly. './' turns all
  // /assets/... references into ./assets/... and removes the
  // crossorigin attribute that breaks dynamic chunk loading in MV3.
  base: './',
  build: {
    sourcemap: mode === 'development',
    minify: mode !== 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime — stable, cache-friendly
          'react-vendor': ['react', 'react-dom'],
          // Firebase split by sub-package so each chunk stays under 500 kB
          'firebase-app':       ['firebase/app'],
          'firebase-auth':      ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
        },
      },
    },
  },
}))