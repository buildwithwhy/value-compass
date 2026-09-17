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

**Effect on the dataset:** 14 of 90 assessments were decision-eligible after this change,
down from 35 — and 4 after the follow-up pass below tightened it further.

### 2. Capital fit rewarded absent records as "clear"

**Cause.** `evaluateMaker()` read `sovereign_state: []` as "no concern present" and counted
it toward `clearCount` and the 0–100 `fit`. An empty field in our research became a
positive finding about the company. Separately, the backer-reputation concern fired on the
**presence of any `notable_for` entry**, so 12 funders whose associations carry no source
were driving results.

**Change.** Every attribute now resolves to `documented_present`, `documented_absent` or
`unknown`. Empty lists are `unknown`. A record naming Gulf capital no longer establishes
that Singapore capital is absent. Unverified associations are listed separately, labelled
"not counted", and excluded from every count and ordering.

This pass initially accepted an authored boolean `false` as a documented absence; the
follow-up below removed that, because a typed value is not evidence either.

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

## Follow-up pass — what changed again

Three bounded corrections after review. Details below; the per-record table is generated
into [`CLAIM_REVIEW.md`](CLAIM_REVIEW.md) so it cannot drift from what the app uses.

### Absence now requires evidence, not an authored value

**Previously:** an authored `false` in `capital_profile` became `documented_absent`, carried
by a scope *sentence we wrote*. That sentence described the claim; it did not support it.

**Now:** a documented absence requires a **source** that examined the question, an explicit
**scope**, and an **as-of date** — because an absence decays; "no state-linked holder" is a
claim about a moment. It also carries an **attribution**: `self_report` (the company says
so) or `independent` (a third party checked). These are different claims and are no longer
collapsed.

The dataset contains **no absence evidence meeting that bar**, and none was invented. Every
authored `false` now resolves to **unknown** for decision purposes, with the recorded value
preserved and shown as "recorded as no, unsupported". `ABSENCE_EVIDENCE` in the build script
is the (currently empty) place a real entry goes; the build throws if an entry is missing any
of the four fields.

### Claim support and score justification are now separate questions

**Previously:** one field, `claim_support: direct | partial`, answered both "does the source
establish this?" and "does that justify the score?". Collapsing them let a narrow fact carry
a broad axis score.

**Now:** `claim_support` asks only whether the source directly establishes a **narrow fact**.
`justifies_whole` asks separately whether that fact licenses the **0–4 axis score under a
rule that exists in the rubric**. Eligibility requires both.

Checking the rubric for such rules found exactly one. §1 states an external anchor for
transparency — *"use directly where it exists … Map FMTI/100 → 0–4"* — with bands recorded in
`makers.json`. The other four axes list four or five sub-indicators each and state no
combining rule, so evidence for one sub-indicator cannot settle the axis.

**Supported facts are preserved regardless.** 15 assessments now carry an established fact
while their surrounding score is ineligible. Those facts are displayed on the maker page
under "Established fact, narrower than this score", with the source date.

### xAI culture/ESG, specifically

The question asked was whether the rubric explicitly permits the documented environmental
finding to determine the whole-axis score.

**It does not.** §2 lists four sub-indicators — employee treatment, environmental footprint,
governance quality, mission integrity — and states no rule for combining them. Its only
related instruction concerns *confidence* on the environmental sub-indicator, not axis
aggregation.

So: the **narrow finding is retained** — xAI operated unpermitted gas turbines at its Memphis
site and was sued under the Clean Air Act by the NAACP, SELC and Earthjustice. It is real,
sourced and displayed. The **0/4 is marked unresolved**: "worst-in-class" across four
sub-indicators is not licensed by evidence covering one. No replacement score is proposed and
no retrospective rule was written to preserve eligibility. The recorded 0 is untouched in
`makers.json`. Regression-tested.

The same test applied to the other 19 reviewed records changed several: four FMTI-anchored
transparency scores remain eligible because the index value the rule consumes is transcribed
(xAI 14, Midjourney 14, Mistral 18, Meta 60→31). Four others cite FMTI but record only a
qualitative position — "middle group", "2nd of the six longitudinal firms" — and the rule
maps a *number* to a band, so those are unresolved pending a transcription.

**Decision-eligible falls from 14 to 4.** All four are transparency.

---

## The eligibility rule, in full

```
decision_eligible =
     basis === 'sourced'                        // a source about this maker, for this claim
  && claim_support === 'establishes_fact'       // it settles a narrow fact
  && justifies_whole === true                   // and a rubric rule gets from that to the score
```

- **`basis === 'sourced'`** — at least one cited source is about this maker and survived
  the background filter (sector reading on Global-South data labour, the Windfall Clause
  proposal, FMTI for makers it did not score) and the hand-checked mismatch filter.
- **`claim_support === 'establishes_fact'`** — the cited material directly settles a narrow
  fact about this maker.
- **`justifies_whole`** — a rubric rule licenses the move from that fact to a 0–4 score.
  Only transparency has one.

Each is recorded per assessment in `scripts/build-evidence.mjs` with its reasoning, and
rendered into [`CLAIM_REVIEW.md`](CLAIM_REVIEW.md). Every classification is
**`automated_provisional`** — produced by reading the recorded rationale against the rubric,
not by a human re-reading the sources. Nothing is labelled human-reviewed, and the build
counts how many are (currently zero).

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

Per-axis eligibility across all 18 makers, after the follow-up pass:

| Axis | Eligible | Establishes a narrower fact | Not established |
|---|---|---|---|
| Transparency | **4** | 4 | 6 |
| Culture / ESG | 0 | 5 | 10 |
| Labour & supply-chain integrity | 0 | 1 | 5 |
| Wealth dispersion | 0 | 2 | 0 |
| Public wealth-sharing | 0 | 3 | 0 |

**Under the example priorities — all five axes — no maker is placeable.** Ask only about
transparency and four are: xAI, Meta, Mistral, Midjourney. That is the shape of the current
evidence, and the interface states it rather than working around it.

### What this does and does not rule out

**It rules out broad recommendations across the existing five axes.** A recommendation of
the form "given what you care about across transparency, culture, labour, ownership and
public sharing, use X" is not supportable: four of those five axes have no eligible
whole-axis score for any maker.

**It does not rule out narrower conditional recommendations.** Nineteen records now carry an
established, sourced, dated fact. Several are precise and directly decision-relevant — the
post-recapitalisation ownership split at OpenAI, the removal of the capped-profit mechanism,
Anthropic's backer concentration, Midjourney's creator-consent litigation, xAI's Clean Air
Act suit, Meta's closed-weight pivot. A recommendation conditioned on *one* of those, scoped
to what the fact actually covers and dated, is a different and much smaller claim than a
whole-axis ordering — and the facts to support that class of claim exist today.

The gap is between **facts we can stand behind** and **axis scores we can stand behind**.
Closing it is a research problem, and the research below is the prerequisite:

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

## Editorial decisions still unresolved

Five, and none of them needs code.

1. **Transcribe four FMTI scores.** Anthropic, OpenAI, Google DeepMind and DeepSeek cite
   FMTI 2025 but record only a qualitative position. The rule maps a number to a band; the
   number is in a source already cited. Transcribing it takes eligible transparency scores
   from 4 to 8 — the single highest-value action available.

2. **Decide whether §3 is a rule.** The rubric says image and voice makers "carry the
   creator-consent sub-indicator most heavily (active litigation is the signal)". If that is
   meant as an aggregation rule it should say so, and Midjourney's labour score becomes
   eligible. If it is guidance, it should stay guidance. This is the closest call in the set.

3. **Canva's public-sharing 4/4.** §5's own rule weights binding structures far above
   pledges, and an equity pledge is the softer category. The score looks high against the
   rubric independently of the aggregation question.

4. **Whether to write aggregation rules at all.** Four axes have none. Writing them would
   make scores eligible — which is exactly why it should be a deliberate methodological
   decision taken on its merits, not a fix applied to raise a coverage number. It was
   deliberately not done here.

5. **Whether any absence evidence exists to record.** The tri-state model is built and
   tested; the table is empty because nothing in the dataset meets the bar. If a company's
   filings or a third-party review can establish, say, "no state-linked holder as of
   2026-03, scope: disclosed holders above 1%", that is one entry and the attribute becomes
   a real finding.

The two judgement calls flagged in the previous pass are resolved: absence no longer rests
on an authored boolean, and the claim-support classification is now split in two with the
rubric-rule question answered explicitly per record.
