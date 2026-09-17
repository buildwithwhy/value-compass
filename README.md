# 🧭 Value Compass

**See what your AI choices support.** A local, runnable web app showing the companies behind AI tools, who owns and funds them, and what has been documented about their practices — 18 makers scored on 5 normative value axes, and the network of 34 funder nodes whose capital flows into them.

The project's intent is to ask **open questions, not deliver verdicts**: every maker carries a "worth probing" tension hook, every score carries a visible confidence flag and evidence basis, and funders are shown as *context, never scored*.

Above all it keeps four things apart — **sourced facts**, **ValueCompass assessments**, **what is not established**, and **the visitor's own priorities**. A score whose rationale establishes only that something is undisclosed is not shown: undisclosed is not evidence of bad practice. See [`docs/EVIDENCE_AUDIT.md`](docs/EVIDENCE_AUDIT.md) for what that changed and what still needs research.

## Run it

From this folder:

```bash
npm install
npm run dev
```

Then open the URL Vite prints (e.g. `http://localhost:5173/`).

On startup the app loads and sanity-checks the data files and logs the counts to the browser console:

```
🧭 Value Compass data  makers: 18  ·  funders: 34  ·  resolved funder→maker edges: 89
```

Other scripts:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
```

After editing `makers.json` or `funders.json`, rebuild the derived evidence layer:

```bash
node scripts/build-evidence.mjs   # rewrites src/data/evidence.json + prints a summary
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
| `src/data/funders.json` | 34 funder nodes with cross-holdings into the makers; many carry `notable_for` association tags. |
| `src/data/methodology.md` | The published methodology, rendered as the About page. |
| `src/data/rubric.md` | The original internal design draft. Kept for the record, rendered only at `/about/working-draft` behind a banner saying what it is — it is **not** the published methodology. |
| `src/data/evidence.json` | **Derived, do not hand-edit.** Regenerate with `node scripts/build-evidence.mjs`. |

`makers.json` and `funders.json` are the single source of truth — edit them in place, then
re-run the evidence build.

### The evidence layer

`scripts/build-evidence.mjs` adds no facts. For each of the 90 axis assessments it records
what the written rationale rests on, which of its cited sources are actually about that
maker, and whether the score may be displayed or compared:

| Basis | Meaning | Displayed? | Can win a comparison? |
|---|---|---|---|
| `sourced` | On record, with a source about this maker | yes | if confidence A/B |
| `unsourced` | On record, but no source about this maker attached | yes, badged | if confidence A/B |
| `contextual` | Reasoned from jurisdiction, size, or what it is built on | yes, badged | no |
| `non_disclosure` | Establishes only that the information is undisclosed | **no — gap** | no |

It also transcribes funding relationships verbatim from the records that state them, so
the graph can tell an equity stake from an announced commitment from outright ownership.
Re-run it after any data edit; the classification rules live at the top of the script.

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

**Polarity:** all axes are oriented so that a higher number means more disclosure, more dispersed ownership, or stronger commitments to share value. A **wider shape means higher scores on these five axes** — not an overall verdict on the company, and nothing about product quality. A persistent legend states this near every radar.

**Confidence (A/B/C) is always shown, never hidden:** **A** = solid, **B** = medium / hatched, **C** = hollow / outlined + a low-confidence marker. **Evidence basis** travels alongside it, answering the different question of what the assessment rests on. Anything with no score to show renders as a **gap, never as 0**.

## Features

0. **Landing page** (`/`) — a short introduction and three routes in: find a tool or maker (with a typeahead), compare alternatives, or follow the ownership. Plus the four-kinds-of-statement explainer and live evidence-coverage counts generated from the dataset.

1. **Ownership & funding graph** (`/graph`) — force-directed graph of all 18 makers + 34 funders.
   - **Size by** Connections (degree, default), **Funder reach** (funders sized by how many of the 18 they back — Nvidia/a16z/Fidelity dominate, makers shrink to uniform dots), or **Uniform**. **Emphasize** Makers / Funders / Both dims the other class for a clean money-flow read. Labels follow the current sizing (largest ~15; rest on hover/zoom).
   - Makers colored by `tier`; funders by `parent_type` (hyperscaler / sovereign wealth / venture-growth / strategic corporate / crossover / index manager / hedge-fund parent / conglomerate).
   - Edges: funder→maker (`backs`); **`owns_outright`** drawn dashed; the **index-managers meta-node** linked to public hyperscalers via faint dotted **`owns_economically`** ("passive owners — deepest layer"); **dual-role entities** (Microsoft, Alphabet/Google↔DeepMind, Alibaba) get a distinct ring + a dotted "same entity" link.
   - Hover highlights a node's neighbors and dims the rest; click opens the detail panel. Filters above the graph (maker tier / jurisdiction / product / funder parent-type) + a search box. Collapses to a filterable list on small screens.

2. **Browse + Maker detail** (`/browse`, `/maker/:id`) — a **sortable matrix heatmap** (18 makers × 5 axes, color-coded score cells that encode confidence: solid A / hatched B / outlined C, with a dash where nothing has been published; click any column header to sort, hover a cell for the reason) with a **polished card view** toggle (labeled axis bars + shared legend). Plus a per-maker page with: header (name, tier, category, jurisdiction, ownership tag, product chips, stated values); the **tension hook** as a "worth probing" open-question callout; the **Value Compass radar** with per-axis score, confidence badge, plain-English note and clickable sources; and the **funder picture** (reverse-lookup of every funder backing this maker, deep-pocket strategics flagged, plus the maker's own founders / lead backers / structure).

2b. **Capital Lens** (on every maker detail + in Compare) — capital character is value-laden, so this is a **user-driven filter, not a sixth axis**, kept visually separate from the conduct compass.
   - The **factual capital profile** is always shown, neutral and unscored (`independence_type`, `founder_control`, `sovereign_state`, `big_tech_capital`, `competitor_entanglement`, `circular_vendor`, `index_held`).
   - The **Lens** is a toggle panel where you pick which attributes you want flagged — founder control, sovereign/state capital (with Gulf / Singapore / China-linked sub-toggles), Big Tech & competitor capital, circular vendor ties, backer associations, index concentration. **Everything starts off.** A named **ValueCompass example lens** is offered as a starting point and is banner-labelled wherever it is in use; touching any switch makes the lens yours. Choices persist in `localStorage` under a `v2` key that also records *whether* a lens was chosen.
   - A **"capital fit"** gauge appears only once a lens is chosen, counting how many attributes in that lens are absent from a maker's record. It always names whose lens it is, and it is not a rating of the company. Independent makers (e.g. Midjourney) top it under most lenses; the entangled frontier labs fall under a strict lens.
   - **Backer reputation** surfaces the `notable_for` associations of a maker's funders, each with its source link and a "v1 — factual association, not a judgment" caveat. Stated as fact, neutral valence.

3. **Compare** (`/compare`) — select **2–4** makers (filterable by tier & product) to get an **overlaid radar**, a **side-by-side table** (5 axes + jurisdiction / ownership / products) where **each axis row expands to reveal the reason, the sources about that maker, and what is only background reading**, a **shared-backer picture with the stake type on each edge**, and — once a lens is chosen — a capital-fit row and ranking. Highest/lowest is only marked when **both** sides rest on evidence about the maker and carry confidence A or B; otherwise the row says the assessments are too uncertain to separate.

4. **About / Methodology** (`/about`) — the rubric rendered from `rubric.md`, plus a quick reference for polarity, the 0–4 scale anchors, the confidence flags, and how the Capital Lens differs from the scored axes.

## Project structure

```
src/
  data/              source data + the derived evidence layer (imported statically)
  lib/
    types.ts         domain + graph types
    data.ts          loading, id-join, reverse lookup, graph builder, sanity check
    colors.ts        tier / parent-type palettes + confidence styling
    evidence.ts      evidence bases, withheld scores, comparability, relationships
  components/        Header, ValueRadar, AxisDetail, ConfidenceBadge, MakerDetail,
                     FunderCard/FunderDetail, GraphLegend, PolarityLegend, Drawer, ui
  pages/             HomeView, GraphView, BrowseView, MakerPage, CompareView, AboutView
  App.tsx            routes + layout
  main.tsx           entry; runs the data sanity check
```

## Design notes

- Clean, neutral, accessible: good contrast, keyboard-navigable (focus rings, Esc closes panels), readable typography, mobile-responsive (the graph degrades to a list/filter view).
- Nothing is fabricated: absent fields hide gracefully; funders are never assigned value scores; tension hooks are framed as questions, not conclusions.
- Nothing is switched on for the visitor: the Capital Lens starts empty, and an editorial preset is offered by name rather than presented as their priorities.
