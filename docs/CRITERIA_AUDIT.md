# Values criteria audit

An audit of what `/recommend` currently asks, against what an ordinary consumer or small
organisation is actually trying to find out. No criteria are changed here — this is the map and
the argument for redrawing it.

Written 2026-09-20 against 13 alternatives, 9 criteria, 4 motivations.

---

## 1. The complaint, verified

> *The power-concentration section seems too focused on founder ownership/shareholding as an end
> in itself.*

It is, and the clearest demonstration is what the section currently says about **Microsoft
Copilot**:

> **Documented alignment** — Microsoft has a single class of common stock with one vote per share
> and no supervoting class. The largest holder in the 2025 proxy is Vanguard at 8.95%.

So Copilot **passes** "no single person holds more than half the votes". Under the current
framing it is among the most power-dispersed options in the catalogue.

Now compare **Lumo**, whose controlling shareholder is a Swiss non-profit foundation legally
bound to a purpose. Same criterion, same verdict: **documented alignment**.

The criterion cannot tell those two apart. One is a ~$3T company that is among the largest
owners of AI compute on earth; the other is a non-profit foundation. Both "meet". What the
criterion actually measures is **dispersion of shareholding**, and the page reads it as
**dispersion of power**. For a widely-held mega-cap those two things point in opposite
directions: shareholding is maximally dispersed *because* the company is enormous.

Three of the nine criteria — a third of the entire values layer — are share-voting questions.
That is the over-weighting, and it is not a presentation problem.

---

## 2. What exists today

### The nine pilot criteria, by coverage

| Criterion | Documented | Answers which human question? |
|---|---|---|
| You can download your own conversations | 6 of 13 | Can I leave |
| No single person holds more than half the votes | 4 of 13 | Who has influence *(proxy)* |
| Who can appoint and remove the board *(informational)* | 4 of 13 | Who has influence *(proxy)* |
| You could run the model yourself | 4 of 13 | Can I leave *(weak proxy)* |
| A legal duty to weigh more than shareholder returns | 3 of 13 | Who benefits *(proxy)* |
| The founders together hold less than half the votes | 3 of 13 | Who has influence *(proxy)* |
| Past public-benefit promises have been kept | 1 of 13 | Have they kept their word |
| Move content to another account, same provider | 1 of 13 | Can I leave |
| Move content to a different company's product | **0 of 13** | Can I leave |

### Directory evidence the pilot does not use

The maker directory holds considerably more than `/recommend` draws on:

| Field | Populated | Currently used by /recommend |
|---|---|---|
| `capital_profile.independence_type` | 18 of 18 | no |
| `capital_profile.big_tech_capital` | 7 of 18 non-empty | no |
| `capital_profile.sovereign_state` | 6 of 18 non-empty | no |
| `capital_profile.circular_vendor` | 8 of 18 non-empty | no |
| `capital_profile.index_held` | 3 of 18 true | no |
| `jurisdiction` | 18 of 18 (free text) | no |
| `lead_backers`, `founders` | 18 of 18 (free text) | no |
| `funders.json` | 34 funders, 20 relationships | no |
| axis: `transparency` | **8 of 18 decision-eligible** | no |
| axis: `wealth_dispersion` | **0 of 18 decision-eligible** | no |
| axis: `labour_integrity` | **0 of 18 decision-eligible** | no |
| axis: `culture_esg` | **0 of 18 decision-eligible** | no |
| axis: `public_sharing` | **0 of 18 decision-eligible** | no |

**The single most important line in this table:** the four axes that map most directly onto the
questions a values-driven user is asking — where the money goes, how workers are treated, whether
the culture matches the marketing — have **zero** decision-eligible records between them. The one
axis that does clear the bar, transparency, is the most abstract of the five.

We are not short of *topics*. We are short of evidence on the topics that matter most, and rich in
evidence on the topic that is easiest to source.

---

## 3. Mapping the eight questions

| The user's question | Covered by | Coverage | Verdict |
|---|---|---|---|
| **Who am I empowering?** | individual/founder voting, board rights | 4 of 13 | **Mismeasured.** Answers "is shareholding concentrated", not "is this entity powerful". Says nothing about parent companies. |
| **Who benefits from my money?** | public-benefit duty | 3 of 13 | **Partial and indirect.** A duty to weigh non-shareholders is not a record of money reaching anyone. |
| **Who has influence over this company?** | — | 0 | **Absent from the pilot.** The data exists in `capital_profile` and `funders.json` and is unused. |
| **Does it contribute economically where it earns?** | — | 0 | **Absent, and not cheaply fixable.** See §6. |
| **What else am I indirectly supporting?** | — | 0 | **Absent from the pilot.** Richest unused seam; sourcing is weak. |
| **How much control do I retain?** | export, account transfer | 6 / 1 of 13 | **Partial.** Missing the question most people ask first: does my use train the model? |
| **How easily can I leave?** | export, transfer, migration | 6 / 1 / 0 of 13 | **Best-covered area**, and still zero on cross-service migration. |
| **Have they kept their word?** | commitment continuity | 1 of 13 | **Named but empty.** One finding, and it is a withdrawal. |

Four of the eight questions have no representation at all.

---

## 4. Gaps

**No ownership-shape fact.** The directory already carries `independence_type`, and across the
ten pilot operators that have a maker page it resolves into five genuinely different shapes:

| Shape | Operators |
|---|---|
| `corporate_owned` — a subsidiary of a larger company | Gemini (Alphabet), Grok (xAI, reported as a SpaceX subsidiary) |
| `self_or_public` — the operator *is* the mega-cap | Microsoft Copilot, Meta AI |
| `hedge_fund_parented` | DeepSeek (High-Flyer) |
| `vc_backed` | ChatGPT, Claude, Vibe, Perplexity, Kimi |
| *no maker page* | Qwen Chat, Lumo, Duck.ai |

For a person asking "who am I empowering", that single field does more work than every share-class
finding combined — and it distinguishes cases the voting criteria collapse. DeepSeek being
parented by a hedge fund, and Grok sitting inside SpaceX, are exactly the facts someone means by
the question. Neither appears anywhere in `/recommend`.

Note what this also reveals: Copilot and Meta AI are `self_or_public`, meaning the operator is not
owned by anyone larger because it *is* the larger thing. That is the same fact the voting
criterion was reading as reassuring dispersion.

**No investor fact.** Who funded a company is a direct answer to "who has influence" and "who else
am I supporting". We hold named backers for all 18 makers and a 34-funder graph, and use none of
it in the recommendation.

**No training-on-your-data fact.** Probably the single most commonly asked consumer question about
an AI assistant. Currently it appears only as prose in Lumo's and Duck.ai's `access_notes`, where
it cannot be compared, filtered or reasoned about.

**No scale fact.** "How big is this company" is the plain-language version of the power question,
and `tier` already exists in the directory.

**Nothing on where value lands.** No revenue share, no employee ownership, no creator or worker
compensation. The `wealth_dispersion` axis was built for exactly this and has no usable records.

## 5. Overlaps and misfilings

**Two criteria for one question.** `c_individual_majority_voting` and
`c_founder_bloc_majority_voting` differ only in whether the bloc must agree. The distinction is
real — it produced opposite verdicts on the same Alphabet filing, which is genuinely instructive —
but it is a governance nuance carrying two of nine slots. It belongs *inside* a power section as
detail, not as two top-level questions.

**Lumo's foundation ownership is filed under the wrong question.** It currently appears as
"no single person holds more than half the votes". But a non-profit foundation owning the company
is an answer to *who benefits from what I pay*, not to *is voting dispersed*. Filing it under
voting is what makes it indistinguishable from Microsoft.

**`c_model_hosting` sits under leaving but does not answer it.** We already established and test
that running the weights is not reproducing the service. It is a weak proxy for independence
filed under portability.

**`c_board_election_rights` is informational** — no direction to prefer — so it occupies a slot
while contributing nothing to guidance.

---

## 6. Three tiers

### Tier 1 — things users plausibly care about directly

These need no explanation of why they matter.

- **Who owns this product** — the ownership shape: subsidiary, mega-cap, hedge fund, VC-backed,
  foundation, and which specific entity
- **Who funded it** — named backers, including states, competitors and customers
- **Does my use train the model**
- **Can I get my conversations out**
- **Can I use it without an account**
- **Has the company kept commitments it made**

### Tier 2 — structural facts that matter because they imply something else

Legitimate, but they need a sentence explaining the inference, and they should sit *under* a
tier-1 question rather than beside it.

- **Individual vs founder-bloc voting majority** → implies whether one party can override everyone
- **Board election rights** → implies who can actually change direction
- **Public-benefit corporate form** → implies directors *may* weigh non-shareholders; not that they do
- **Open model weights** → implies some independence from the provider; not service portability
- **Index-held** → implies a reader's pension fund likely already owns the company, so "not
  supporting it" may be less available than it appears
- **Operator is itself a funder of competitors** → Microsoft is recorded as `frontier_and_funder`;
  implies choosing it also supports the labs it backs, which is the indirect-support question
  arriving through a side door

### Tier 3 — interesting, too weak or obscure to be a criterion

Worth keeping as directory context. Not worth a recommendation criterion.

- **Tax / economic contribution where earned.** No dataset here supports it, the definition is
  contested, and it would require jurisdiction-by-jurisdiction filings. Incorporation location is
  *not* a proxy for it and should not be used as one.
- **Circular vendor financing** (Nvidia investing in customers who buy its chips). Genuinely
  important at industry level; very hard to connect to one person's assistant choice.
- **`competitor_entanglement` as currently defined** — true for 4 of 18, definition too loose to
  act on.
- **Jurisdiction of incorporation** as a proxy for anything — legal form, not behaviour.
- **`wealth_dispersion` as currently scored** — right question, zero usable records.

---

## 7. Proposed motivation structure

Five questions, replacing the current four. Each is phrased as a person would ask it, with
tier-2 facts nested underneath rather than promoted alongside.

### 1 · "Who am I handing power to?"
*Currently: "How concentrated is power in the companies I support?"*

- **new** — What shape of owner sits behind this: subsidiary, mega-cap, hedge fund, VC-backed,
  foundation *(from `independence_type`, already populated for 10 of 13)*
- **new** — How large is the operator *(from `tier`; Microsoft is recorded as
  `frontier_and_funder` — both a maker and a funder of its competitors)*
- *nested detail* — no single person holds a voting majority; founders together; board election
  rights

The reframing fixes the Copilot case: a subsidiary-of-Microsoft fact and a dispersed-shareholding
fact can both be true and are shown as different things.

### 2 · "Who else does my money end up supporting?"
*New section. Answers the indirect-support question entirely absent today.*

- **new** — Documented state or sovereign-fund investors
- **new** — Documented big-tech or competitor investors

Strictly factual: *Gulf sovereign funds are documented backers* — not *this is bad*. The whole
point is that a reader may weigh that in either direction, and some will find it reassuring.

### 3 · "Who benefits from what I pay?"
*Currently: "Who benefits from my spending on AI?"*

- **moved here** — Non-profit or foundation ownership *(currently misfiled under voting)*
- *existing* — A legal duty to weigh more than shareholder returns
- Keep the research-gap note. This remains the thinnest section.

### 4 · "How much control do I keep, and can I leave?"
*Merges the control and portability questions.*

- **new** — Is your conversation used to train the model
- **new** — Can you use it without an account
- *existing* — export, account transfer, cross-service migration
- *nested detail* — you could run the model yourself

### 5 · "Have they kept their word?"
*Unchanged in substance.*

- *existing* — Past public-benefit promises have been kept
- Keep the gap note: one finding across thirteen options, and it is a withdrawal.

**Dropped as a heading:** none. **Dropped as criteria:** none — the three voting criteria become
nested detail rather than disappearing.

---

## 8. What this would cost, honestly

Adding the new tier-1 facts is **not** cheap, and the constraint is sourcing rather than research
appetite:

1. **Funder associations are mostly unverified.** Of 14 assessed, **12 are `unverified`** and 2
   are `partially_sourced`. Under the current eligibility gate every investor criterion would
   enter as *unknown* for almost every option. Adding the section without re-sourcing produces a
   page of blanks that looks like a finding.
2. **Three of thirteen operators have no maker page.** Proton, DuckDuckGo and Alibaba would be
   unknown on every directory-derived fact from the outset.
3. **Training-on-your-data needs fresh research** for all thirteen. It is well documented by
   providers, so this is the cheapest genuine win on the list.
4. **Parent company and operator scale are nearly free** — already in the directory, need only
   sourcing to this pilot's standard.

Recommended order if we proceed: parent company → training-on-your-data → account requirement →
investor facts (only after re-sourcing).

---

## 9. What I would not do

- **Do not add a tax or economic-contribution criterion.** No usable data, contested definition,
  and the neutrality principle is hardest to hold here.
- **Do not score or rank any of this.** "Backed by sovereign funds" and "owned by a foundation"
  are facts a reader weighs, not points.
- **Do not delete the voting criteria.** They are the strongest-sourced governance evidence we
  have, and the Alphabet case shows the individual/bloc distinction changes the answer. Demote,
  do not discard.
- **Do not add anything merely because the directory already holds it.** `circular_vendor` and
  `index_held` are the temptation — both easy, neither actionable for a single consumer.

---

## 10. The one-line summary

The values layer currently measures **how evenly a company's shares are held** and presents it as
**how much power you are handing over**. For a widely-held mega-cap those are opposites. The fix
is not more governance detail — it is to ask who owns the thing, who funded it, and what happens
to your data, and to move share-voting underneath those questions as supporting detail.
