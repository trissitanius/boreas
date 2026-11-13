import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Where the site is served from.
// GitHub Pages: '/boreas/' (the repo name). Custom domain (boreasfitness.com): '/'.
const BASE_PATH = '/boreas/'

const BLACK_IRIS = '#080813'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    // Makes Boreas installable and lets it work offline:
    // writes the web app manifest and a service worker that keeps every app file on the phone.
    VitePWA({
      registerType: 'autoUpdate', // a new version installs itself and is used the next time the app opens
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Boreas',
        short_name: 'Boreas',
        description: 'Open-source gym tracker with no login. Always shows what you lifted last time.',
        lang: 'en',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        orientation: 'portrait',
        background_color: BLACK_IRIS,
        theme_color: BLACK_IRIS,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,webmanifest}'],
        navigateFallback: `${BASE_PATH}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
