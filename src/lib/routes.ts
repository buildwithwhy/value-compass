// URL helpers for the canonical route set. Pure functions — main.tsx and the
// pages compose them, and the unit tests pin the shapes the sitemap hangs off.

/**
 * Rewrites a legacy HashRouter deep link to the path it addressed, or null
 * when the hash is not a legacy route. `#/maker/Anthropic` → `/maker/Anthropic`;
 * `#/compare?from=X` → `/compare?from=X`. Bare and section-style hashes
 * (`#`, `#section`) return null.
 */
export function legacyHashToPath(hash: string): string | null {
  if (!hash.startsWith('#/')) return null
  return hash.slice(1).replace(/^\/{2,}/, '/')
}

/**
 * Canonical funder URL path. Funder ids are the URL-safe slug coordinate
 * (unique, lowercase-hyphenated); names are display-only and may contain
 * " / " or parentheses, so they are never routed on. Encoding stays defensive.
 */
export function funderPath(id: string): string {
  return `/funder/${encodeURIComponent(id)}`
}

/**
 * Prefixes an in-app path with the deployment base (Vite's `base`, mirrored to
 * the app as BASE_URL). Root deployments ('/') are untouched. window.history
 * calls bypass the router's basename handling, so any raw path written there
 * must be joined with the base first.
 */
export function withBasePath(base: string, path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (base === '' || base === '/') return suffix
  return `${base.replace(/\/+$/, '')}${suffix}`
}
