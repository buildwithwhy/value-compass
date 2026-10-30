import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spa404Fallback()],
  server: {
    port: 5173,
    open: false,
  },
})
