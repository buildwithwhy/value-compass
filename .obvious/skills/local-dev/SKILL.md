---
name: local-dev
description: How to get the value-compass dev environment running and verified (from onboarding, 2026-10-30)
---

# local-dev: value-compass

Recorded during onboarding (dev stack verified healthy 2026-10-30).

## Stack & shape

React 18 + Vite 5 + TypeScript + Tailwind SPA. No backend, no database, no external services, no env vars. Static data in `src/data/` imported at build time. Package manager: **npm** (`package-lock.json`).

## Bring-up procedure

1. **Fresh checkouts ship root-owned `node_modules/`.** If `npm install` fails with EACCES on rename, run `sudo chown -R user:user node_modules` first, then `npm install`.
2. Remove any stray `bun.lock` — the project uses npm; do not commit `bun.lock`.
3. `npm install`
4. `npm run dev` — Vite serves on **http://localhost:5173/** (fixed in `vite.config.ts`; parse the printed `Local:` URL rather than assuming).
5. Health check: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → `200`.

## Verification (what "healthy" looks like)

- `npm test` → 4 files, **248 tests pass** in ~1s.
- `npm run build` → clean `tsc -b && vite build` (this doubles as the typecheck; there is no lint script).
- Browser flow (headless Chromium via playwright-core works; install-deps needed `libnspr4`/`libnss3`): load `/`, confirm console logs
  `🧭 Value Compass data  makers: 23 · funders: 34 · resolved funder→maker edges: 89` and
  `[Value Compass] all funder→maker edges resolved cleanly.` — no page errors. Routes are HashRouter: `/#/browse`, `/#/recommend`.
- Screenshots from onboarding: `/tmp/vc-evidence/01-home.png`, `02-browse.png`, `03-recommend.png` (recreate with the flow above; `/tmp` does not survive a new sandbox).

## Data-editing loop

Edit `src/data/makers.json` / `funders.json` in place → `node scripts/build-evidence.mjs` → `npm test`. Never hand-edit `src/data/evidence.json`.

## Known doc drift

README's console example still says `makers: 18`; actual data is 23. The app's startup console log is authoritative.

## Onboarding evidence (2026-10-30)

- Dev server healthy on 5173 (HTTP 200), headless-browser flow check passed, 3 screenshots captured.
- 248/248 unit tests, clean production build.
- Sandbox snapshot `p7bnrahte08bjj8iacmr:default` captured 2026-10-30T18:37:47.340Z.
