# Research roadmap — value dimensions not yet in the product

Two motivations are deliberately **absent from `/recommend`**. They are real research areas, not
abandoned ones. They stay here until there is enough coverage to genuinely inform a choice,
because a live section that cannot answer its own question advertises a capability we do not have.

Last reviewed 2026-09-20.

---

## A · What other powerful actors is this choice connected to?

*Major investors, parent companies, strategic dependencies, significant institutional
relationships.*

### Why it is not live

Of 14 funder associations assessed, **12 are `unverified`** and 2 are `partially_sourced`. Under
the eligibility gate every finding would enter as *unknown*, so the section would be blanks.

`capital_profile` in `makers.json` carries `sovereign_state`, `big_tech_capital`,
`circular_vendor`, `competitor_entanglement` and `index_held` for all 18 makers — but the object
has **no sources field**. It is populated, not sourced. The same applies to `independence_type`,
which is why the live ownership-shape criterion is documented for six of thirteen rather than ten.

### What it needs first

1. A sourcing standard for a funding relationship: what counts as establishing that A invested in
   B, at what date, and in what round.
2. Coverage across the pilot's thirteen operators, not the directory's eighteen makers.
3. A decision on the unit. "Nvidia invested in the maker" and "the maker runs on Nvidia hardware"
   are different relationships and should not share a label.

### The framing, already corrected once

An earlier draft called this *"Who else does my money end up supporting?"*. That claims a money
flow we cannot document: an investor relationship does not mean subscription revenue reaches that
investor. **Connected to** and **dependent on** are what the evidence can carry.

Note one fact already in hand: Microsoft is recorded as `frontier_and_funder` — both a maker in
this category and a backer of competing labs. That is a documented relationship rather than a
money-flow claim, and it is the shape this section should take.

---

## B · Where does the economic value go?

*Profit distribution, worker and creator compensation, tax and economic contribution,
non-profit and cooperative structures.*

### Why it is not live

There is no usable evidence. The `wealth_dispersion` axis was built for exactly this question and
has **0 of 18 decision-eligible records**. So do `labour_integrity`, `culture_esg` and
`public_sharing`.

### Why it is not dismissed

An earlier audit draft put tax and economic contribution in a "too weak to deserve a criterion"
tier, and the stated reason was that it is hard to research neutrally. That is the same sourcing
bias the audit had identified one section earlier: our evidence base is strongest where sourcing
was easiest, not where the question mattered most.

Difficulty is a reason this is unanswered. It is not a reason it is unimportant. **Treated as an
open research question.**

### What it needs first

1. A neutral formulation. "Contributes economically where it earns" is contested; "publishes
   country-by-country reporting" or "has a documented tax settlement" are facts.
2. A source type that survives the eligibility gate — filings, not commentary.
3. Honesty about what a consumer can act on. Some of this may inform without ever becoming a
   criterion.

### Related unknowns worth naming

- No finding anywhere in this dataset covers creator compensation or the labour that went into
  training data. The conduct motivation says so explicitly rather than implying coverage.
- Non-profit and foundation ownership *is* documented for one operator, but it sits under
  ownership shape as a structural fact. It is not evidence about where money goes, and is not
  presented as such.

---

## Activation rule

A motivation goes live when its criteria are documented for enough of the catalogue to change
what a reader would consider — not when the topic becomes interesting, and not when the data
becomes easy.
