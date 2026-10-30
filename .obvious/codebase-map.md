# Codebase Map — value-compass

Depth cap 2. Single source of truth for data: `src/data/makers.json` + `src/data/funders.json`; `src/data/evidence.json` is derived.

| Path | Type | What lives here |
|---|---|---|
| `src/` | dir | App source: entry, pages, components, lib, data |
| `src/components/` | dir | Presentational components — `ValueRadar` (Recharts radar), `MakerDetail`, `FunderCard`, `AdvicePanel`, `PrioritiesPanel`, `CapitalProfile`, `ConfidenceBadge`/`EvidenceBadge`, `Header`, `Drawer`, graph legends |
| `src/data/` | dir | Static data: `makers.json` (23 makers, 5 value axes + capital profile), `funders.json` (34 funder nodes), `company-research.json`, `recommendation-pilot.json`, `methodology.md` (About page), `rubric.md` (internal draft, `/#/about/working-draft`), derived `evidence.json` |
| `src/lib/` | dir | Domain logic: `data.ts` (loaders), `evidence.ts` (`isDecisionEligible()` gate), `priorities.ts` + `prioritiesContext.tsx` (user priorities), `recommend.ts` (recommendation engine), `companyFacts.ts`, `lens.ts`, `colors.ts`, `types.ts` |
| `src/lib/__tests__/` | dir | Vitest suites: advice, companyFacts, eligibility, recommend (248 tests) |
| `src/pages/` | dir | Route views (HashRouter): `HomeView` (force-graph), `BrowseView`, `CompareView`, `RecommendView`, `MakerPage`, `AboutView` |
| `scripts/` | dir | `build-evidence.mjs` — regenerates `src/data/evidence.json` from the source-of-truth JSONs |
| `docs/` | dir | Research/audit notes (`EVIDENCE_AUDIT.md`, `CLAIM_REVIEW.md`, …), handoff captures, screenshots |
| `index.html` | file | Vite entry HTML |
| `vite.config.ts` | file | Vite config — dev server fixed on port 5173, `open: false` |
| `package.json` | file | npm scripts and dependencies (React 18, Vite 5, TS 5, Tailwind 3, Vitest) |
| `tsconfig.json` | file | TypeScript config (project references via `tsc -b`) |
| `tailwind.config.js` / `postcss.config.js` | file | Tailwind/PostCSS setup |
