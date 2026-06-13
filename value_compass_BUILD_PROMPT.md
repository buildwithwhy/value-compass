# Claude Code build prompt — Value Compass

Paste everything below the line into Claude Code, run from the folder that contains the three data files. (Or save this file in that folder and tell Claude Code: "Read value_compass_BUILD_PROMPT.md and build it.")

---

Build a local, runnable web app called **Value Compass**. It visualizes the values and money-flows behind major AI makers. All data is already in this folder — do **not** invent or fetch any data; read only these files:

- `value_compass_makers.json` — 18 AI makers, each fully scored on 5 value axes.
- `value_compass_funders.json` — 34 funder nodes with cross-holdings into the makers.
- `value_compass_rubric.md` — the scoring methodology (use as the "About / Methodology" page).

## Tech stack
- React + Vite + TypeScript, Tailwind CSS. No backend — import the JSON statically.
- Knowledge graph: `react-force-graph-2d` (or cytoscape.js if you prefer).
- Radar/compass chart: Recharts (`RadarChart`).
- Markdown render for the About page: `react-markdown`.
- Must run with `npm install && npm run dev`. Include a short README with run steps.

## Data model (read carefully — join on `id`, not display name)
- Each maker has a short **`id`** (e.g. `"Meta"`, `"Cursor"`, `"Moonshot"`) and a display `name` (e.g. `"Meta (AI)"`). 
- Funder edges live in `funders[].makers_backed` (and `owns_outright`) as arrays of maker **`id`s**. **Build all funder→maker edges by matching these to `makers[].id`.** Do not match on `name`.
- Maker fields: `id, name, tier ("frontier" | "tool" | "frontier_and_funder"), category?, jurisdiction, vc_independent, products_models[], founders[], lead_backers[], structure, stated_values, tension_hook, axes{...}`.
- `axes` has 5 keys: `transparency, culture_esg, labour_integrity, wealth_dispersion, public_sharing`. Each is `{score: 0-4, confidence: "A"|"B"|"C", note: string, sources: string[] (URLs)}`.
- Funder fields: `name, parent_type, rolled_up_vehicles[], makers_backed[], maker_count, key_people[], also_funds, flag?, portfolio_sources?`. One node — "Index managers (Vanguard / BlackRock / State Street)" — has `makers_backed: []` and an `owns_economically[]` instead; treat it as a meta-node (see below).
- Read scale/polarity/confidence definitions from `makers.json._meta` and display them in the UI.

## Core principle: polarity (show this clearly)
All 5 axes are scored so **higher = more pro-social** (more transparent, better culture/ESG, more labour & supply-chain integrity, more dispersed ownership, more public wealth-sharing). On the radar, a **larger polygon = a better-scoring actor**. Put a small persistent legend stating this. Render the 0–4 anchors from `_meta.scale` on hover.

## Confidence rendering (important for credibility)
Every score has confidence A/B/C. Render it visually, never hide it:
- **A** = solid fill / full opacity.
- **B** = medium opacity or hatched.
- **C** = hollow / outlined / greyed, with a small "low-confidence" marker.
Add a confidence legend. If any score is missing/`n/a` in future data, render as a gap, never as 0.

## Feature 1 — Knowledge graph (landing view)
A force-directed graph of **all nodes**: 18 makers + 33 funders.
- **Edges:** funder → maker, from `makers_backed` (+ `owns_outright`, styled dashed for "owns outright").
- **Node size = importance, driven by the data:** size by node degree (number of connected edges). For makers, give `tier: "frontier"` a modest size boost over `"tool"`. This naturally makes Nvidia, a16z, Anthropic, OpenAI etc. the largest nodes. Show node labels for the largest ~15 only; reveal the rest on hover/zoom.
- **Color:** makers colored by `tier`; funders colored by `parent_type` (hyperscaler / sovereign_wealth / venture_growth / strategic_corporate / crossover / index_manager / hedge_fund_parent). Clear legend.
- **Dual-role entities** (Microsoft = maker + funder; "Alphabet / Google" funder ↔ "Google DeepMind" maker; Alibaba = funder + in-house Qwen, backs Moonshot): tag them with a distinct ring/badge and, if easy, draw a dotted "same entity" link between the paired nodes. Keep it simple if it gets fiddly.
- **Index-managers meta-node:** it has no `makers_backed`. Render it behind/linked to the public hyperscaler funder nodes (Microsoft, Amazon, Alphabet/Google, Nvidia) via `owns_economically`, styled differently (e.g. faint dotted), and labeled "passive owners — deepest layer."
- **Interactions:** hover highlights a node's neighbors and dims the rest; click opens the detail panel (Feature 2). Filters above the graph: by maker `tier`, `jurisdiction`, `products_models`, and funder `parent_type`. A search box to find a node by name.

## Feature 2 — Detail page / panel (per maker)
Opened by clicking a maker node, or from a browsable list/grid of all 18 makers.
- **Header:** display `name`, `tier`, `category`, `jurisdiction` (factual tag), `vc_independent` (categorical tag), and `products_models[]` rendered as filterable chips. Then `stated_values`.
- **Tension hook:** render `tension_hook` in a visually distinct "worth probing →" callout, framed as an **open question, not a verdict** (this is core to the project's intent). Prefix with something like "Worth probing:".
- **Value Compass radar:** the 5 axes, 0–4, higher = better (big polygon = good). Beside/below the radar, list each axis with its `score`, a confidence badge (A/B/C styled as above), the `note` (the plain-English reason), and `sources[]` rendered as clickable links.
- **Funder picture:** reverse-lookup — find all funders whose `makers_backed` (or `owns_outright`) includes this maker's `id`. For each, show `name`, `parent_type`, `key_people[]`, and `also_funds`. Visually flag deep-pocket strategic types (hyperscaler / sovereign_wealth / index_manager). Also show this maker's own `founders[]`, `lead_backers[]`, and `structure`.

## Feature 2b — Capital Lens (user-configurable; NOT a fixed score)

Capital character is value-laden — "clean capital" depends on what the user cares about — so this is a **user-driven filter, not a sixth axis on the conduct radar.** Keep it visually separate from the 5-axis compass.

New data:
- Each maker has `capital_profile` (objective facts): `independence_type` (independent | self_or_public | vc_backed | corporate_owned | hedge_fund_parented), `founder_control` (false or a description), `sovereign_state` (array of buckets: Gulf / Singapore / China-linked), `big_tech_capital` (array of hyperscaler backers), `competitor_entanglement` (bool), `circular_vendor` (array of chipmaker backers it also buys from), `index_held` (bool).
- Many funders have `notable_for` (array of factual public associations of key figures) and sometimes `reputation_sources` (URLs).

**Always show the factual capital profile** on the maker detail page — neutral, no scoring. Surface the `notable_for` tags of the funders that back this maker, each with its source link and a small "v1 — factual association, not a judgment" note.

**The Lens (user picks concerns).** A toggle panel; each toggle maps to a capital_profile field. Default preset in parentheses:
- Founder autocracy (ON) → `founder_control`
- Sovereign / state capital (ON), with independent sub-toggles per bucket: Gulf, Singapore, China-linked → `sovereign_state`
- Big Tech / competitor capital (ON) → `big_tech_capital` + `competitor_entanglement`
- Circular vendor ties (ON) → `circular_vendor`
- Backer reputation & figure stances (ON) → presence of `notable_for` on this maker's funders
- Index concentration (OFF by default — it's the abstract passive-universal-owner concern) → `index_held`

**Computed "capital fit" score**, recomputed live as toggles change: higher = fewer of the user's selected concerns present in this maker's capital. Show *which* concerns triggered (e.g., "flagged: Gulf sovereign capital, circular vendor"). Because it's lens-dependent, never present it as an objective/fixed number — label it "your capital lens." Independence (Midjourney) should top the score under most lenses; the entangled frontier labs (Anthropic, OpenAI, xAI, DeepMind) should fall under a strict lens.

Reputation tags are stated as fact and must stay neutral (no good/bad valence); render sources; show the "v1, needs dedicated research" caveat. The Lens also applies in Compare (Feature 3): let users sort/compare makers by capital fit under their chosen lens.

## Feature 3 — Compare view
- Let the user select **2–4** makers/tools/models (selection filterable by `tier` and `products_models`).
- **Overlaid radar:** all selected makers on one radar (distinct colors), respecting confidence styling.
- **Side-by-side table:** rows = the 5 axes (score + confidence badge) plus `jurisdiction`, `vc_independent`, and `products_models`. Make best/worst per axis visually obvious (remember higher = better).
- **Merged funder picture:** show each maker's backers and **highlight shared backers** (intersection) — e.g. "Nvidia backs 3 of these." This is the key comparative insight.

## Cross-cutting requirements
- **About / Methodology page:** render `value_compass_rubric.md` with `react-markdown`. Link to it from a persistent header.
- **Funders are context, not scored.** Never show value scores for funder nodes. But make them prominent and explorable (a funder, when clicked, should show `key_people`, `also_funds`, `rolled_up_vehicles`, `flag`, and the list of makers it backs).
- Clean, neutral, accessible design (good contrast, keyboard-navigable, readable typography). Mobile-responsive: the graph can collapse to a simpler list/filter view on small screens.
- Persistent header nav: **Graph · Browse makers · Compare · About**.
- Don't fabricate anything. If a field is absent, hide that element gracefully. If a funder→maker edge target doesn't match a maker `id`, log a console warning rather than crashing.

## Deliverable
A working app I can launch with `npm run dev`, plus a README. Start by loading and sanity-checking the three JSON files (print counts: 18 makers, 34 funders, and the number of resolved funder→maker edges — it should be 89), then build Feature 1, then 2, then 3.
