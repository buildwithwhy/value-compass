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
