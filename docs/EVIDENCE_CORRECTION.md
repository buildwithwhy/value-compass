# Evidence correction — audit findings and changes

A focused correction of the live site, made in preparation for conditional recommendations.
The design, the data files and the existing features are unchanged; what changed is which
records are allowed to influence an outcome, and what the interface claims.

`makers.json` and `funders.json` are **byte-identical to `main`**. No score was rewritten,
no source invented, no verification date fabricated.

---

## The seven reported issues: cause, and change

### 1. DeepSeek vs Microsoft showed highest/lowest despite "No source"

**Cause.** The comparison gate was
`(basis === 'sourced' || basis === 'unsourced') && confidence !== 'C'`. The `unsourced`
branch admitted assessments with **zero** sources about the maker, so a confidence flag
alone qualified them. DeepSeek's wealth dispersion (0/B) and Microsoft's (4/A) both carry
no entity source, so both passed, and the table marked a winner between two unsupported
numbers.

**Change.** One eligibility rule, in `isDecisionEligible()`, now gates ordering, comparison
markers, switching differences and any future recommendation. It requires a source about
the maker that covers **the claim**, plus a review that the assessment is justified by it.
Confidence was removed from the gate entirely. Both cells now read "not ranked", and the
row says the makers cannot be compared. Regression-tested.

**Effect on the dataset:** 14 of 90 assessments are decision-eligible, down from 35.

### 2. Capital fit rewarded absent records as "clear"

**Cause.** `evaluateMaker()` read `sovereign_state: []` as "no concern present" and counted
it toward `clearCount` and the 0–100 `fit`. An empty field in our research became a
positive finding about the company. Separately, the backer-reputation concern fired on the
**presence of any `notable_for` entry**, so 12 funders whose associations carry no source
were driving results.

**Change.** Every attribute now resolves to `documented_present`, `documented_absent`
(with the scope shown) or `unknown`. Empty lists are `unknown`; only an authored boolean
`false` is a documented absence. A record naming Gulf capital no longer establishes that
Singapore capital is absent. Unverified associations are listed separately, labelled "not
counted", and excluded from every count and ordering.

### 3. Missing evidence described as "nothing has been published"

**Cause.** The milestone-1 rule was named `non_disclosure` and the copy asserted the
company had published nothing — a finding about the company that our research does not
support. We had checked our own record, not the world.

**Change.** The basis is renamed `not_established`, and the phrasing across nine files is
now **"not established in our current research"**, framed as a gap in our record. We assert
non-disclosure only where a source establishes its scope and date — in this dataset that is
the FMTI-scored transparency findings, which are sourced and unaffected.

### 4. Switching implied it traced customer spending

**Cause.** The headings were "Who you would stop and start funding", "Backers you leave
behind", "Backers you take on" and "Backers you cannot escape". The site holds no
payment-flow data, so all four claimed more than the records support. "Cannot escape" also
asserted a negative from an absence.

**Change.** Headings are now "Recorded funding relationships", "Associated with *X*",
"Associated with *Y*" and "Recorded for both", with two statements beneath: that these are
recorded relationships rather than a trace of money, and that a funder appearing in one
column means our records have no entry for the other — **not** that no relationship exists.
Pending, announced and contingent entries keep their status chips and are never presented
as current ownership.

### 5. The example-priorities button activated the capital lens

**Cause.** `useExample()` set `{ weights: EXAMPLE_WEIGHTS, capital: EXAMPLE_LENS }` in one
call. Asking for example axis weights switched on six capital attributes the visitor had
never seen.

**Change.** `applyExample({ axes, capital })` takes each half separately. The button is now
a **preview**: it shows every weight the example would set, with an unchecked box for the
capital half, and applies nothing until confirmed.

### 6. Example settings were sometimes called "your priorities"

**Cause.** Copy interpolated possessives without checking `mode`, and two banners keyed off
the global mode rather than the specific settings — so a visitor with example *axis*
weights and no capital lens saw "You are using the ValueCompass example lens" above six
switched-off toggles.

**Change.** A shared `prioritiesLabel(mode)` helper; eight call sites corrected across
Compare, Switching, Browse and Priorities. Both banners now key off whether that half is
actually set.

### 7. "5 axises"

**Cause.** `` `${axisCount} axis${axisCount === 1 ? '' : 'es'}` `` in the header chip.
**Change.** Correct plural. Now reads "5 axes".

---

## Also corrected while in here

- The comparison-table footer still described the old rule ("carry confidence A or B"). It
  now states the eligibility rule, with an explicit example: an unsourced 4/4 never beats
  an unsourced 0/4.
- The site footer claimed "an undisclosed practice earns no score at all" — the same
  unsupported non-disclosure claim as §3.
- **Averages over unequal criteria.** New in this pass: where placed makers were not scored
  on the same criteria, Browse and Compare now say so and point at a criterion-by-criterion
  breakdown rather than presenting the positions as an ordering. A maker averaged over
  transparency and ownership is not comparable with one averaged over ownership and public
  sharing, however close the numbers look.
- **The 50% threshold** is documented as provisional and exploratory — explicitly not a
  bar that qualifies anything for a recommendation.

---

## The eligibility rule, in full

```
decision_eligible = basis === 'sourced' && claim_support === 'direct'
```

- **`basis === 'sourced'`** — at least one cited source is about this maker and survived
  the background filter (sector reading on Global-South data labour, the Windfall Clause
  proposal, FMTI for makers it did not score) and the hand-checked mismatch filter.
- **`claim_support === 'direct'`** — a reviewed judgement that the cited material covers
  what the score rests on. Recorded per assessment in `scripts/build-evidence.mjs` with a
  one-line reason each, so every call is inspectable and arguable.

Source **count** is deliberately not part of this. Anthropic's ownership-dispersion score
rests on one report and is eligible; Meta's culture score cites a piece covering one clause
of a four-clause rationale and is not.

**Nothing is deleted.** Ineligible assessments keep their score, reasoning, sources and
badge, and now carry the specific reason they cannot decide anything.

---

## Regression checks

`npm test` — 29 checks in `src/lib/__tests__/eligibility.test.ts`, run against the real
modules and the real dataset:

| Area | Checks |
|---|---|
| Unsupported winner markers | The exact DeepSeek/Microsoft case; an exhaustive sweep asserting no marker ever uses an ineligible cell; confidence alone does not qualify; one authoritative source does; partial claim support does not |
| Unknown capital attributes | Empty list → unknown not clear; authored `false` → documented absent with scope; a Gulf entry does not establish Singapore absence; no `fit` or `clearCount` survives anywhere; unverified associations never counted; coverage reported |
| Pending relationships | Tencent→DeepSeek stays pending; Amazon→OpenAI stays contingent and never becomes ownership; a reported-but-unclosed capital entry surfaces as pending |
| Unequal coverage | Uneven criteria detected; uniform criteria reported as uniform; criterion-level comparison always available; unplaceable makers held apart; unsupported switching differences read "unknown", never "no change" |
| Example / reset | Axis and capital halves separable; example settings never labelled the visitor's; empty lens yields no findings; empty priorities order nothing |

---

## What this costs, and what still needs research

The stricter rule makes the evidence gap visible rather than creating it.

**Under the example priorities, 2 of 18 makers can now be placed** (previously 8). Per-axis
eligibility across all 18 makers:

| Axis | Eligible | Not established |
|---|---|---|
| Transparency | 8 | 6 |
| Culture / ESG | 1 | 10 |
| Labour & supply-chain integrity | 1 | 5 |
| Wealth dispersion | 2 | 0 |
| Public wealth-sharing | 2 | 0 |

**This dataset cannot yet support conditional recommendations.** One eligible assessment on
labour and one on culture is not a basis for telling someone which product to use. The
research in [`EVIDENCE_AUDIT.md`](EVIDENCE_AUDIT.md) is the prerequisite, and its order of
priority is unchanged:

1. **40 assessments cite no source at all.** Every culture score outside the frontier labs,
   most public-sharing scores, Microsoft's 4/4 on ownership dispersion.
2. **24 cite only sector background.** The OpenAI/Kenya and Meta/Scale AI labour scores are
   the highest-value fixes — both are real documented cases attached to general articles.
3. **6 sourced assessments have only partial claim support** (listed in `CLAIM_SUPPORT`).
   Each needs either a source for the rest of its rationale or a narrower rationale.
4. **12 of 14 funders' associations have no source.** Several are politically charged
   characterisations of named living people. They are now excluded from all logic, but they
   are still published.
5. **69 of 89 funder→maker edges record no stake type**, so most relationship chips read
   "stake type not recorded".

**Two judgements in this change are mine and should be reviewed:**

- The 14 `direct` / 6 `partial` classifications in `scripts/build-evidence.mjs`. Each
  carries its reasoning; several are arguable, particularly xAI's culture score (one
  documented environmental case carrying a 0/4) and Google DeepMind's transparency score
  (FMTI band, with an unsourced model-card clause attached).
- Treating an empty list as `unknown` while treating an authored `false` as
  `documented_absent`. The dataset never recorded a scope for either, so the boolean is
  given more weight than it may deserve. A scope statement in the source data would settle
  it properly.
