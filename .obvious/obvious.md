# Value Compass — Agent Guidance

Local, runnable React SPA showing the companies behind AI tools, who funds them, and how they score on 5 normative value axes. No backend, no database, no external services — all data is static JSON in `src/data/`, imported statically.

## Stack

- **React 18 + Vite 5 + TypeScript 5**, Tailwind CSS 3 (PostCSS)
- **react-force-graph-2d** — knowledge-graph landing view
- **Recharts (RadarChart)** — 5-axis value radar
- **react-router-dom** (HashRouter) — client-side routing
- **react-markdown + remark-gfm** — methodology rubric rendering
- **Vitest** — unit tests (no lint script configured)

## Commands

```bash
npm install               # npm is the package manager (package-lock.json; do not use bun.lock)
npm run dev               # Vite dev server → http://localhost:5173/ (port is fixed in vite.config.ts)
npm run build             # tsc -b && vite build → dist/  (this is the typecheck)
npm test                  # vitest run (248 tests, ~1s)
node scripts/build-evidence.mjs   # regenerate derived src/data/evidence.json — never hand-edit it
npm run preview           # serve the production build locally
```

There is no lint script. `npm run build` performs the typecheck; treat a clean build as passing typecheck.

## Environment

None required. No `.env`, no secrets, no services. If a future change adds required env vars, document them here.

## Codebase map

See [codebase-map.md](./codebase-map.md) for the folder-level map.

Key data rule: `src/data/makers.json` and `src/data/funders.json` are the single source of truth. After editing either, run `node scripts/build-evidence.mjs` then `npm test`. `src/data/evidence.json` is derived — never edit it by hand.

## Local verification

1. `npm run dev` → confirm Vite prints `Local: http://localhost:5173/`
2. `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → expect `200`
3. `npm test` → 4 files, 248 tests pass
4. `npm run build` → clean build, no TS errors
5. Primary flow in a browser (the app logs its data sanity check to the console):
   `🧭 Value Compass data  makers: 23 · funders: 34 · resolved funder→maker edges: 89`
   and `[Value Compass] all funder→maker edges resolved cleanly.`
   Note: README still says "makers: 18" — the data has since grown to 23; the console log is the live truth.

## Sandbox snapshot

- **snapshotId:** `p7bnrahte08bjj8iacmr:default`
- **Captured:** 2026-10-30T18:37:47.340Z (ISO-8601)
- **State captured at:** dependencies installed (npm), dev server verified healthy on port 5173, 248/248 tests passing, clean production build, headless-browser flow check passed with screenshots.

## Gotchas

- `node_modules/` shipped root-owned in fresh checkouts — if `npm install` fails with EACCES, `sudo chown -R user:user node_modules` first.
- An untracked `bun.lock` appeared at some point; the project uses npm. Do not commit `bun.lock`.
- HashRouter means routes live after `#` (e.g. `/#/browse`, `/#/recommend`) — deep links need the hash form.
