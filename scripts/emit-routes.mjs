// ---------------------------------------------------------------------------
// emit-routes.mjs — post-build step that ships a real file for every canonical
// route, sibling to export-api.mjs (which builds the data surface).
//
// Why: a static host can only answer 200 for paths that are real files. The
// SPA fallback (404.html — see the vite plugin of the same intent) keeps deep
// links *rendering*, but GitHub Pages answers a missing path with HTTP 404 —
// the wrong status for URLs the sitemap publishes as citable, indexable
// coordinates. So the build copies the app shell to <route>/index.html for
// every canonical route; the deployed site answers each sitemap URL with
// 200 + the app, and genuinely unknown paths remain 404s.
//
// The route set is derived from the same data the app renders (maker slugs,
// funder ids, recommend categories) plus the static routes, so it cannot
// drift from the dataset. Deterministic: pure copies, sorted route order.
//
// Usage: node scripts/emit-routes.mjs   (wired into `npm run build`)
// ---------------------------------------------------------------------------

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// Same shape the coordinates tests enforce for slugs/ids; recommend category
// ids additionally use underscores (fine in a URL segment — the router's
// :category param reads them as-is).
const URL_SAFE_SEGMENT = /^[a-z0-9_-]+$/

// Static routes rendered by App.tsx — keep in sync with the <Routes> there.
// (The /switch and /priorities redirects are client-side only and are not
// published; a direct load falls through to the SPA shell and the app
// performs the redirect itself.)
const STATIC_ROUTES = ['graph', 'browse', 'compare', 'recommend', 'about', 'about/working-draft']

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'))
}

// Pure: inputs in, sorted route list out. Fails loudly on a segment that
// would not survive as a path segment.
export function canonicalRoutes({ makers, funders, categories }) {
  const routes = [
    ...STATIC_ROUTES,
    ...categories.map((c) => `recommend/${c.id}`),
    ...makers.map((m) => `maker/${m.slug}`),
    ...funders.map((f) => `funder/${f.id}`),
  ]
  const bad = routes.filter((r) => !r.split('/').every((seg) => URL_SAFE_SEGMENT.test(seg)))
  if (bad.length) throw new Error(`emit-routes: non-URL-safe route segments: ${bad.join(', ')}`)
  return [...new Set(routes)].sort()
}

function main() {
  const routes = canonicalRoutes({
    makers: readJson('src/data/makers.json').makers,
    funders: readJson('src/data/funders.json').funders,
    categories: readJson('src/data/recommendation-pilot.json').categories,
  })

  for (const route of routes) {
    const dir = join(dist, route)
    mkdirSync(dir, { recursive: true })
    copyFileSync(join(dist, 'index.html'), join(dir, 'index.html'))
  }
  console.log(`emit-routes: wrote ${routes.length} route shells from dist/index.html`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
