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

## C · Splitting economic stake from money actually transferred

*Deferred 2026-09-22. Agreed as a real gap; not implemented yet.*

### The question that exposed it

"Is ChatGPT still controlled by a nonprofit, and shouldn't Lumo obviously win on this?"

Both halves are instructive. ChatGPT **is** still nonprofit-controlled — the OpenAI Foundation
appoints every director of OpenAI Group PBC and can replace them at will, and a Class N share
preserves that control even if the Foundation sells its 26% stake. A confidential draft S-1 was
filed around June 2026, so this is worth re-checking if OpenAI lists.

Lumo does **not** obviously win, and the evidence runs against the intuition:

| | Documented transfers to a public purpose |
|---|---|
| Proton Foundation | "over $5 million in grants" in total |
| OpenAI Foundation | ~$50M disbursed by early 2026, $1B+ committed for the following year |

On control, OpenAI's formulation is arguably the stronger of the two. So on what our criteria
actually ask, both genuinely qualify. That is the evidence, not a modelling failure.

### The two gaps that are real

1. **We record a distinction and then flatten it.** ChatGPT's scope field already says the stake
   "pays out only if and when value is distributed, and OpenAI has not committed to distributing
   profits", while Proton's is an ongoing revenue transfer. Different in kind, identical verdict.
   The nuance is in the data and invisible in the summary — the same error class we have fixed
   repeatedly elsewhere.
2. **We never ask what proportion of the upside is private.** At OpenAI the Foundation holds 26%,
   Microsoft roughly 27%, and employees and investors roughly 47% — about three-quarters private.
   No binary criterion can express that.

### Proposed shape, when we do it

Split the economic question the way voting and training were split:

- *A public-purpose body holds an economic stake* — ChatGPT and Lumo meet, Claude fails.
- *Money is documented to have actually reached a public purpose* — ChatGPT and Lumo both meet,
  **with the amounts shown**. Claude fails.

This surfaces the numbers instead of hiding them behind a shared verdict, and still declares no
winner, because on this evidence there is not one.

### Also fix at the same time

The live scope note on ChatGPT's economic-stake finding is accurate but incomplete: it explains
that an equity stake may never pay out, without noting that the Foundation has separately
disbursed substantial grants. Not wrong, but it reads more sceptically than the full picture
warrants.

### Coverage check before starting

Proportion-of-upside is documentable today only for OpenAI and the listed companies — four or
five of thirteen. That is a research pass, not a re-modelling, and should be scoped separately
from the split above.

---

## Activation rule

A motivation goes live when its criteria are documented for enough of the catalogue to change
what a reader would consider — not when the topic becomes interesting, and not when the data
becomes easy.
