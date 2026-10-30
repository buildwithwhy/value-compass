import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { legacyHashToPath, withBasePath } from './lib/routes'
import { sanityCheck } from './lib/data'
import './index.css'

// Deployment base ('/' locally; '/value-compass/' on the GitHub Pages project
// site). BrowserRouter needs it so every in-app link stays under the base,
// and the legacy-hash rewrite — which bypasses the router via the history
// API — must apply it by hand.
const basePath = import.meta.env.BASE_URL

// Legacy HashRouter deep links (`/#/maker/Anthropic`) address the path inside
// the fragment. Rewrite them onto the real path before the router mounts, so
// an old link lands on its route — which then handles slug canonicalization —
// instead of falling through to the homepage.
const legacyPath = legacyHashToPath(window.location.hash)
if (legacyPath) window.history.replaceState(null, '', withBasePath(basePath, legacyPath))

// Load & sanity-check the three JSON files before first render (prints counts).
sanityCheck()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
