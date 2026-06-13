# Value Compass — Measurement Rubric (v1, design draft)

**Purpose:** Define the five normative axes and a scoring rubric *before* gathering evidence, so scoring is consistent and defensible. This is the "what" layer for the 18 makers.

**Status:** Design draft for your sign-off. Section 7 lists the open decisions to confirm before the evidence pass.

---

## 0. Cross-cutting design (applies to all axes)

**Scale — 0 to 4, anchored.** Not 0–100. Hand-scored private companies can't support two-digit precision; a 5-point anchored scale is honest and still differentiates.

| Score | Meaning |
|---|---|
| 0 | Worst-in-class / actively extractive / fully opaque |
| 1 | Below norm |
| 2 | Industry-typical |
| 3 | Above norm / credible commitments |
| 4 | Best-in-class / binding, verified, leading |
| — | **Insufficient evidence** (record as `n/a`, *not* 0) |

**Polarity — all axes scored so higher = more pro-social.** This makes a radar/compass instantly readable (a "good actor" is a big polygon). Two of your axes are negatively framed, so I recommend renaming for polarity (you can keep your labels as aliases):
- "Exploitation" → **Labour & supply-chain integrity** (4 = treats workers/creators well; 0 = extractive)
- "Wealth distribution" → **Wealth dispersion** (4 = broadly dispersed; 0 = hyper-concentrated)

**Evidence-confidence flag — A / B / C.** Carried alongside *every* score, because data availability is wildly uneven (frontier labs are well-documented; Midjourney and the SMB tools are near-dark).
- **A** = strong, multi-source or externally validated (e.g., FMTI score exists)
- **B** = moderate, some primary disclosure or credible reporting
- **C** = thin / inferred / single-source
- Render C-confidence visually distinct (hollow/greyed) so the compass never *looks* more certain than it is.

**Missing data ≠ zero.** "We can't see it" (`n/a`, low confidence) is different from "we looked and it's bad" (scored 0–1). This distinction is the integrity of the whole tool — e.g., Midjourney scores a real *low* on transparency (FMTI 14) but its labour practices are simply **undisclosed** (`n/a`, C).

**Weighting — equal to start, but exposed as adjustable.** Default each axis at 1.0. Your thesis may justify up-weighting Transparency and Public wealth-sharing later; keep the weights as a config, not hard-coded.

**These axes are designed for MAKERS.** Scoring *funders* on the same five doesn't map cleanly (a VC has no data-labeling supply chain). Funder values are better read from *what else they fund* (your item 1 research) — treat as a separate, lighter lens. Flagged in Section 7.

---

## 1. Transparency
*(absorbs open-vs-closed weights, per your decision)*

**Definition:** How much the maker discloses about how its systems are built and operated — model access, training data, the human labour in the pipeline, compute/energy, evaluations, governance, and downstream impact.

**Poles:** `0` = black box: closed weights, no model card, no data/labour/compute disclosure. `4` = open or well-documented weights + disclosed training-data provenance + labour & compute disclosure + published evals/limitations + transparent governance.

**Sub-indicators:**
1. Model access & weights (closed API → open weights → open weights + training code)
2. Training-data provenance & disclosure
3. Supply-chain / labour disclosure (who labels, where, under what terms)
4. Compute & energy disclosure
5. Evaluations, risks & limitations reporting
6. Governance transparency (decision rights, safety processes)

**External anchor — Stanford FMTI 2025 (use directly where it exists).** The Foundation Model Transparency Index is a validated, CC-BY composite from Stanford HAI / Princeton CITP / MIT. The 2025 edition scored 13 developers including DeepSeek, Alibaba and xAI for the first time; industry average fell from 58/100 (2024) to **40/100 (2025)**, with **IBM highest at 95** and **xAI and Midjourney lowest at 14**. Map FMTI/100 → 0–4 (e.g., ÷25, round), confidence **A**.
- **Open weights ≠ transparent.** Keep weights as *one* sub-indicator, not the axis. DeepSeek ships open weights but is opaque on data — it should not auto-max this axis.
- **Coverage gap:** FMTI covers the frontier labs but **not** the consumer tools (Perplexity, Midjourney is in but Canva, Lovable, Replit, Gamma, Cursor, ElevenLabs, Cohere, Moonshot are not all covered). Those need manual scoring on the same six sub-indicators (confidence B/C).

---

## 2. Internal culture / ESG

**Definition:** How the company treats its own people and the planet, and whether its governance and mission claims hold up internally.

**Poles:** `0` = toxic/high-churn workplace, no environmental reporting, governance scandals, mission-integrity failures (e.g., coercive NDAs). `4` = strong workplace, credible + reported environmental commitments, robust independent governance, demonstrable mission consistency.

**Sub-indicators:**
1. Employee treatment & retention (churn, talent-war poaching, layoffs, Glassdoor signal)
2. Environmental footprint & disclosure (datacenter energy/water/carbon, siting, reporting)
3. Governance quality (board independence, dual-class control, audit, conflicts)
4. Mission integrity (whistleblower/NDA practices, internal vs stated values)

**External anchors:** B Corp / B Lab certification (binary positive signal; note it's *not* legally binding); ESG E/S/G vocabulary (SASB/GRI); environmental disclosure (CDP). 

**Caveats:** Private firms rarely publish ESG. Frontier labs' energy footprints are large but under-disclosed (FMTI flags compute/energy as among the most opaque areas) — score environmental sub-indicator with low confidence unless reported. Mission-integrity is partly observable via press (e.g., NDA/non-disparagement episodes, mass departures).

---

## 3. Labour & supply-chain integrity
*(your "exploitation" axis, polarity-flipped)*

**Definition:** How the people at the bottom of the value chain are treated — data labelers/annotators, RLHF raters, content moderators (disproportionately Global South) — plus creators and rights-holders whose work trains the models.

**Poles:** `0` = sub-living wages, trauma exposure without mental-health support, opaque BPO subcontracting, uncompensated scraping of creators' work. `4` = living wages, mental-health support, direct or auditable employment, consent/compensation for training data.

**Sub-indicators:**
1. Data-worker wages & conditions
2. Content-moderation mental-health support
3. Supply-chain visibility (direct employment vs opaque BPO via Sama/Remotasks/Scale-type vendors)
4. Creator / IP consent & compensation (training-data sourcing, opt-outs, licensing, litigation)
5. Labour litigation / documented complaints

**External anchors & benchmarks:** Fairwork (Oxford Internet Institute) cloudwork/AI ratings; Equidem's 2025 survey (76 workers, Colombia/Ghana/Kenya); IHRB; RFK Human Rights; researchers Milagros Miceli (DAIR/Weizenbaum) and Chinasa Okolo (Brookings). **Wage benchmark:** Global-South labelers commonly earn ~$1.50–2/hour; in the OpenAI/Kenya case the vendor Sama was reportedly paid ~$12.50/hour per worker while workers received ~$2/hour to review violent/abusive content — a useful anchor for the gap between client spend and worker pay.

**Caveats:** Most makers don't disclose their labeling subcontractors, so **absence of evidence is not a clean record** — score `n/a`/C rather than 4. Tools that *buy* labeled data or sit on top of frontier APIs (Cursor, Lovable, Gamma, Perplexity) **inherit upstream conditions** — note an "inherited exposure" tag. Image/music/voice makers (Midjourney, ElevenLabs, Suno-type) carry the creator-consent sub-indicator most heavily (active litigation is the signal).

---

## 4. Wealth dispersion
*(your "wealth distribution" axis, polarity set so higher = more dispersed)*

**Definition:** How concentrated the equity, control and returns are — founder/insider control, breadth of employee ownership, cap-table concentration among a few mega-backers, pay dispersion. **Descriptive** (how concentrated it *is*), distinct from Axis 5 (whether they intend to *share* it).

**Poles:** `0` = hyper-concentrated: single founder with supervoting control + a few hyperscalers/sovereigns owning most economics + thin employee equity. `4` = broadly dispersed ownership, wide employee equity, no single controlling bloc.

**Sub-indicators:**
1. Founder/insider voting control (dual-class / supervoting)
2. Backer concentration — share held by top 3 backers *(computable from your funder audit)*
3. Employee equity breadth
4. Pay dispersion (exec-vs-median; HQ-vs-data-worker)

**Data source:** Your existing funder audit already supplies (1) and (2). This axis is the most *computable* of the five.

**Caveats:** Employee-equity and pay-dispersion data is thin for private firms (confidence C for those sub-indicators). Don't double-count with the VC/independent tag (Section 6).

---

## 5. Public wealth-sharing
*(its own axis — confirmed as the 5th of "the new five")*

**Definition:** Stated intent **plus binding mechanisms** to share value with the broader public. Not how concentrated wealth is, but whether they've committed to giving it away or making it broadly accessible.

**Poles:** `0` = no commitments, pure value capture. `4` = binding structures (nonprofit control / enforceable windfall-type clause / large irrevocable pledges) + broad affordable or free access + public-interest releases.

**Sub-indicators:**
1. Structural commitments (nonprofit-controlled, PBC, Long-Term Benefit Trust, capped-profit)
2. Profit/equity pledges (Windfall Clause-style, Giving Pledge, Pledge 1%, founder donations)
3. Affordable / free access (free tiers, low-cost models, Global-South access)
4. Public-interest outputs (open weights *for public benefit*, open research, public datasets)

**External anchors:** The **Windfall Clause** (GovAI / Cullen O'Keefe) — an ex-ante commitment to donate a share of extreme future profits — as the conceptual ceiling. Real-world structures to score against: OpenAI's nonprofit-controlled PBC + its $25B Foundation commitment; Anthropic's PBC + Long-Term Benefit Trust; xAI's PBC; B Corp (B Lab); Canva's founder pledge (~30% of equity via Pledge 1%); Giving Pledge signatories.

**Critical scoring rule — binding vs soft.** Weight legally binding structures (trust/PBC/charter) far above PR pledges. **This axis is where your pillar-3 "stated vs observed" tension bites hardest** (e.g., OpenAI's capped-profit → uncapped-PBC → nonprofit-control reversal saga). Record a separate **"stated vs observed gap"** note per maker here, phrased as an open question, not a verdict.

---

## 6. Retained tag + factual descriptors (not 0–4 axes)

- **VC-backed vs independent** — keep as a **binary/categorical tag** (your decision to retain it), e.g., `independent` (Midjourney), `VC-backed`, `corporate-owned` (DeepMind/Meta AI), `hedge-fund-parented` (DeepSeek). It correlates with Wealth dispersion but shouldn't be double-scored into it.
- **Legal jurisdiction(s) / HQ** — factual metadata, listed not scored: e.g., US/Delaware PBC, France (Mistral), PRC (DeepSeek/Moonshot), Canada (Cohere), Australia (Canva), Sweden (Lovable), UK/US (ElevenLabs). Useful for the regulatory-exposure read.

---

## 7. Open decisions to confirm before the evidence pass

1. **Polarity reframes** — accept "Labour & supply-chain integrity" and "Wealth dispersion" (higher = better), or keep your original negative labels with inverted scoring noted?
2. **Public wealth-sharing as its own 5th axis** — confirmed by "the new five"? (Assuming yes.)
3. **VC/independent** — as a tag (recommended) vs a scored axis?
4. **Weighting** — equal to start, weights adjustable later?
5. **Scale** — 0–4 + confidence flag (recommended) vs 0–100?
6. **Funders** — do they get scored on a *separate* funder lens fed by the "what else they fund" research, or stay unscored context? (These five don't fit VCs.)
7. **Scope of first evidence pass** — all 18 makers at once, or pilot on ~4 contrasting makers (e.g., Anthropic, xAI, Midjourney, DeepSeek) to stress-test the rubric before scaling?

---

## 8. Sequenced next steps
1. You confirm Section 7.
2. **Evidence pass A — makers:** pull FMTI scores, labour reporting, ESG/B-Corp signals, structures, pledges; score all 18 on the five axes with confidence flags.
3. **Evidence pass B — funders:** the "what else they fund + key people" research (your item 1) → a separate funder-values read.
4. Assemble into the scored dataset (extend the makers JSON with an `axes` block) for the prototype's compass view.
