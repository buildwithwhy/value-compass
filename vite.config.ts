import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages answers an unknown path with 404.html. Shipping a copy of the
 * SPA shell there is what lets BrowserRouter routes survive a direct load on
 * the static host — the app boots, reads the real path, and renders the right
 * page (or its own 404 view for genuinely unknown routes).
 */
function spa404Fallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(resolved) {
      outDir = resolve(resolved.root, resolved.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

// Deployment base: '/' for local/dev/preview builds. The GitHub Pages project
// site serves the app under /value-compass/, so `npm run build:pages` sets
// BASE_PATH for that build. Vite rewrites built asset URLs with it, and the
// router reads the same value through import.meta.env.BASE_URL.
const basePath = process.env.BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [react(), spa404Fallback()],
  server: {
    port: 5173,
    open: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Testing Library registers its auto-cleanup off the global afterEach hook,
    // which only exists with globals on. Tests still import from 'vitest'
    // explicitly for types, so the two modes coexist.
    globals: true,
  },
})
