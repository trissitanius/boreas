import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Where the site is served from.
// GitHub Pages: '/boreas/' (the repo name). Custom domain (boreasfitness.com): '/'.
const BASE_PATH = '/boreas/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
