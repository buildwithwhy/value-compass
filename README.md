# 🧭 Value Compass

A local, runnable web app that visualizes the **values and money-flows** behind major AI makers — 18 makers scored on 5 normative value axes, and the network of 34 funder nodes whose capital flows into them.

The project's intent is to ask **open questions, not deliver verdicts**: every maker carries a "worth probing" tension hook, every score carries a visible confidence flag, and funders are shown as *context, never scored*.

## Run it

From this folder:

```bash
npm install
npm run dev
```

Then open the URL Vite prints (e.g. `http://localhost:5173/`).

On startup the app loads and sanity-checks the three data files and logs the counts to the browser console:

```
🧭 Value Compass data  makers: 18  ·  funders: 34  ·  resolved funder→maker edges: 89
```

Other scripts:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
```

## Tech stack

- **React + Vite + TypeScript**, **Tailwind CSS** — no backend; the JSON is imported statically.
- **`react-force-graph-2d`** — the knowledge-graph landing view.
- **Recharts (`RadarChart`)** — the 5-axis Value Compass radar.
- **`react-markdown` + `remark-gfm`** — renders the methodology rubric on the About page.
- **`react-router-dom`** (HashRouter) — client-side routing, no server config needed.

## Data

All data lives in **`src/data/`** and is imported statically — nothing is fetched or invented:

| File | What it is |
|---|---|
| `src/data/makers.json` | 18 AI makers, each scored on the 5 value axes + a factual `capital_profile`. |
| `src/data/funders.json` | 34 funder nodes with cross-holdings into the makers; many carry `notable_for` reputation tags. |
| `src/data/rubric.md` | The scoring methodology, rendered as the About page. |

These three files are the single source of truth — edit them in place to update the app.

### Join rule

Funder→maker edges are built **by matching `funders[].makers_backed` / `owns_outright` to `makers[].id`** — never on display name. An edge whose target doesn't resolve to a maker `id` logs a `console.warn` rather than crashing. With the current data, all **89** edges resolve cleanly.

## The five axes (all 0–4, higher = better)

| Axis | Higher score means |
|---|---|
| Transparency | More open / documented (weights, data, labour, compute, evals, governance) |
| Culture / ESG | Better treatment of people & planet, robust governance |
| Labour & supply-chain integrity | Data workers & creators treated/compensated fairly |
| Wealth dispersion | Ownership & control more broadly dispersed (less concentrated) |
| Public wealth-sharing | Binding structures + access that share value with the public |

**Polarity:** all axes are oriented so a **larger polygon = a better-scoring actor**. A persistent legend states this near every radar.

**Confidence (A/B/C) is always shown, never hidden:** **A** = solid, **B** = medium / hatched, **C** = hollow / outlined + a low-confidence marker. Missing data renders as a **gap (`n/a`), never as 0**.

## Features

1. **Knowledge graph** (`/`) — force-directed graph of all 18 makers + 34 funders.
   - **Size by** Connections (degree, default), **Funder reach** (funders sized by how many of the 18 they back — Nvidia/a16z/Fidelity dominate, makers shrink to uniform dots), or **Uniform**. **Emphasize** Makers / Funders / Both dims the other class for a clean money-flow read. Labels follow the current sizing (largest ~15; rest on hover/zoom).
   - Makers colored by `tier`; funders by `parent_type` (hyperscaler / sovereign wealth / venture-growth / strategic corporate / crossover / index manager / hedge-fund parent / conglomerate).
   - Edges: funder→maker (`backs`); **`owns_outright`** drawn dashed; the **index-managers meta-node** linked to public hyperscalers via faint dotted **`owns_economically`** ("passive owners — deepest layer"); **dual-role entities** (Microsoft, Alphabet/Google↔DeepMind, Alibaba) get a distinct ring + a dotted "same entity" link.
   - Hover highlights a node's neighbors and dims the rest; click opens the detail panel. Filters above the graph (maker tier / jurisdiction / product / funder parent-type) + a search box. Collapses to a filterable list on small screens.

2. **Browse + Maker detail** (`/browse`, `/maker/:id`) — a **sortable matrix heatmap** (18 makers × 5 axes, color-coded score cells that encode confidence: solid A / hatched B / outlined C; click any column header to sort, hover a cell for the reason) with a **polished card view** toggle (labeled axis bars + shared legend). Plus a per-maker page with: header (name, tier, category, jurisdiction, ownership tag, product chips, stated values); the **tension hook** as a "worth probing" open-question callout; the **Value Compass radar** with per-axis score, confidence badge, plain-English note and clickable sources; and the **funder picture** (reverse-lookup of every funder backing this maker, deep-pocket strategics flagged, plus the maker's own founders / lead backers / structure).

2b. **Capital Lens** (on every maker detail + in Compare) — capital character is value-laden, so this is a **user-driven filter, not a sixth axis**, kept visually separate from the conduct compass.
   - The **factual capital profile** is always shown, neutral and unscored (`independence_type`, `founder_control`, `sovereign_state`, `big_tech_capital`, `competitor_entanglement`, `circular_vendor`, `index_held`).
   - The **Lens** is a toggle panel where you pick which attributes count as *your* concerns — founder autocracy, sovereign/state capital (with Gulf / Singapore / China-linked sub-toggles), Big Tech & competitor capital, circular vendor ties, backer reputation, and index concentration (off by default). Your choices persist in `localStorage`.
   - A **"capital fit"** gauge recomputes live as you toggle (higher = fewer of your concerns present) and shows *which* concerns triggered. It's always labeled "your lens" — never an objective number. Independent makers (e.g. Midjourney) top it under most lenses; the entangled frontier labs fall under a strict lens.
   - **Backer reputation** surfaces the `notable_for` associations of a maker's funders, each with its source link and a "v1 — factual association, not a judgment" caveat. Stated as fact, neutral valence.

3. **Compare** (`/compare`) — select **2–4** makers (filterable by tier & product) to get an **overlaid radar**, a **side-by-side table** (5 axes + jurisdiction / ownership / products + a **capital-fit row**, with best & worst highlighted) where **each axis row expands to reveal the plain-English reason + source links** for every selected maker, a **capital-fit ranking** under your lens, and a **merged funder picture that highlights shared backers** (e.g. "Nvidia backs 3 of these").

4. **About / Methodology** (`/about`) — the rubric rendered from `rubric.md`, plus a quick reference for polarity, the 0–4 scale anchors, the confidence flags, and how the Capital Lens differs from the scored axes.

## Project structure

```
src/
  data/              copies of the three source files (imported statically)
  lib/
    types.ts         domain + graph types
    data.ts          loading, id-join, reverse lookup, graph builder, sanity check
    colors.ts        tier / parent-type palettes + confidence styling
  components/        Header, ValueRadar, AxisDetail, ConfidenceBadge, MakerDetail,
                     FunderCard/FunderDetail, GraphLegend, PolarityLegend, Drawer, ui
  pages/             GraphView, BrowseView, MakerPage, CompareView, AboutView
  App.tsx            routes + layout
  main.tsx           entry; runs the data sanity check
```

## Design notes

- Clean, neutral, accessible: good contrast, keyboard-navigable (focus rings, Esc closes panels), readable typography, mobile-responsive (the graph degrades to a list/filter view).
- Nothing is fabricated: absent fields hide gracefully; funders are never assigned value scores; tension hooks are framed as questions, not conclusions.
