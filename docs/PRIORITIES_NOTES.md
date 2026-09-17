# Milestone 2 — priority-based comparisons

What was built, the rules it holds itself to, and the one finding that should shape
milestone 3.

---

## The finding

**The feature works. The dataset cannot yet carry it.**

Under the example priorities (all five axes weighted), only **8 of 18 makers can be
placed**. Ten cannot, and seven of those have **zero** of the five priorities backed by a
comparable assessment:

| Cannot be placed | Share of assigned weight with evidence |
|---|---|
| Perplexity, ElevenLabs, Lovable, Replit, Gamma, Cursor, Moonshot | **0%** |
| Canva, Cohere | 29% |
| Mistral | 43% |

Per-axis, across all 18 makers:

| Axis | Comparable | Nothing published |
|---|---|---|
| Transparency | 10 | 6 |
| Culture / ESG | 7 | 10 |
| Labour & supply-chain integrity | **3** | 5 |
| Wealth dispersion | 9 | 0 |
| Public wealth-sharing | 6 | 0 |

A visitor who cares most about labour — arguably the axis this project exists for — can be
separated on it for three of eighteen makers. The entire tool layer is unplaceable.

This is not a bug in the ordering. It is the evidence audit from milestone 1 showing up
where it bites. The interface says so plainly at every point: each axis states its coverage
before you pick it, unplaceable makers get their own group with a reason, and the switching
view will tell you all five of your priorities are uncomparable when they are. But no
amount of honest presentation substitutes for the research in
[`EVIDENCE_AUDIT.md`](EVIDENCE_AUDIT.md).

**Milestone 3 should be evidence, not features.** Closing the 40 unsourced assessments and
the 24 background-only labour scores would roughly double what this milestone can do,
without another line of product code.

---

## Rules the priority layer holds itself to

Each of these is enforced in `src/lib/priorities.ts` and stated on `/about`.

**Only comparable assessments count.** An axis withheld under the milestone-1 rule, or one
carrying confidence C, contributes nothing to an ordering — in either direction. A priority
the evidence cannot answer moves nobody.

**A maker is placed only when enough is known.** At least half the weight assigned must
have evidence behind it (`PLACEMENT_THRESHOLD = 0.5`). The rest go in a separate group
with how much is known about each. They are **not** sorted to the bottom: a list that
buried unknowns would read as a ranking in which they had lost.

**Conduct and capital are never summed.** A weighted axis score and a count of capital
attributes measure different things. They are always reported side by side, so it is never
unclear which is driving an answer.

**A change is only a change when both sides can carry it.** In the switching view, a
direction is given only when both makers are firm enough to compare. Otherwise it is
`unknown` — explicitly not `same`.

**Three levels, not a slider.** *Not a priority* / *matters* / *matters a lot*. A
continuous weight would imply precision the 0–4 hand assessments cannot support — the same
argument the rubric makes for not using a 0–100 scale.

---

## What was built

| Surface | What it does |
|---|---|
| `/priorities` | Set axis weights and capital attributes in one model. Each axis shows how many makers it can separate, and how many have published nothing. Nothing pre-selected. |
| `/switch/:from/:to` | What changes on your priorities, backers you leave / take on / **cannot escape**, a structural comparison, and every axis where one side has published nothing. |
| Browse | Orders by priority strength with a separate unplaceable group; prioritised axis columns emphasised. |
| Compare | Axis rows ordered by weight and badged; an "against your priorities" summary reusing the same placement rule. |
| Header | A chip that always names whose priorities are in effect — yours, the example, or none. |

### Migration

The milestone-1 capital lens (`value-compass.capital-lens.v2`) is read once and carried
into `value-compass.priorities.v1`, so an existing choice is not lost. Both old keys are
then removed. A visitor arriving with only a capital lens set sees the axis panel as
unset — because they never chose anything there, whatever the stored mode says.

### Suggested alternatives

Same-tier makers, nothing cleverer. This dataset does not model feature-level
substitutability and inventing one would be exactly the kind of fabricated finding the
project refuses elsewhere. The UI says so and lets you pick anyone.

---

## Deliberately not built

- **No recommendation, shortlist or "best for you" page.** The chosen shape orders and
  annotates the existing views. With 8 of 18 placeable, a ranked recommendation surface
  would project confidence that does not exist.
- **No blended score.** See the rules above.
- **No new entity data.** `makers.json` and `funders.json` remain untouched by this
  milestone, as in milestone 1. Everything derives from them plus `evidence.json`.

## Open questions for you

1. **Is 50% the right placement threshold?** It is one constant
   (`PLACEMENT_THRESHOLD`). At 33% roughly two more makers become placeable; at 67%, two
   fewer. The current value is a judgement, not a finding.
2. **Should the example priorities exist at all?** They make the feature explorable in one
   click, and they are labelled everywhere. But the safest version of this product offers
   no default at all.
3. **Should unplaceable makers be hidden rather than grouped?** Currently grouped, on the
   argument that seeing what cannot be assessed is itself informative.
