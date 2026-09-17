# How Value Compass works

Value Compass records who is behind AI products — the companies, who owns and funds
them, and what has been documented about their practices and commitments. This page
explains what we measure, how we score it, and what we do when the evidence runs out.

---

## Four kinds of statement

Everything on this site is one of four things, and the interface says which:

| | What it is |
|---|---|
| **Sourced fact** | Who owns what, who invested, what a company has committed to — with a link to where it came from. |
| **ValueCompass assessment** | Our reading of those facts against the rubric below. A judgement, labelled as one. |
| **Not established** | Our research has not established it. We say so, and show no score — a gap in our record, not a finding about the company. |
| **Your priorities** | What you tell us matters to you — across the five axes and the capital attributes. Nothing is switched on for you by default. |

The distinction that matters most is the third. **"We looked and it is bad" and "we have
not established it" are different findings.** Treating them the same is the easiest way
for a tool like this to mislead, so where our research has established nothing, no score
is shown at all — neither a good one nor a bad one.

We are careful about which of those two we are claiming. Saying a company disclosed
nothing is itself a finding, and it needs a scope and a date: *what* was checked, and
*when*. Where we do not have that, we say **"not established in our current research"**,
because the gap is in our record, not necessarily in the company's conduct.

---

## The five axes

Every maker is scored 0–4 on five axes. They are oriented so that a higher number always
means more disclosure, more dispersed ownership, or stronger commitments to share value.

| Axis | A higher score means |
|---|---|
| **Transparency** | More is documented: weights, training data, the human labour in the pipeline, compute and energy, evaluations, governance. |
| **Culture / ESG** | Better treatment of its own people and the environment, and governance that holds up. |
| **Labour & supply-chain integrity** | Data workers, moderators and creators are treated and compensated fairly. |
| **Wealth dispersion** | Ownership and control are spread more widely, rather than concentrated in a founder or a few large backers. |
| **Public wealth-sharing** | Binding structures and broad access that share value with the public, rather than stated intent alone. |

### The 0–4 scale

| Score | Meaning |
|---|---|
| 0 | Worst-in-class, actively extractive, or fully opaque |
| 1 | Below the industry norm |
| 2 | Industry-typical |
| 3 | Above the norm; credible commitments |
| 4 | Best-in-class; binding and verified |

Five points, not a hundred. Hand-scored private companies cannot support two-digit
precision, and a scale that implies it would be false precision.

### What the compass shape means

A wider polygon means higher scores on these five axes under this rubric. It is **not** an
overall verdict on a company, and it says nothing about whether a product is any good. A
gap in the polygon is an axis with no score shown — missing, not zero.

---

## How much we trust each assessment

Two separate flags travel with every score, because they answer different questions.

**Confidence — how sure are we?**

- **A** — strong, externally validated (for example, a Stanford FMTI score exists)
- **B** — moderate; some primary disclosure or credible reporting
- **C** — thin, inferred, or resting on a single source

**Evidence basis — what does it rest on?**

- **Sourced** — something on the record, with a source about that maker
- **No source** — something on the record, but no source about that maker is attached yet
- **Inferred** — reasoned from jurisdiction, company size, or what the product is built on, rather than from evidence about the company itself
- **Not established** — the rationale establishes only that the information is undisclosed

A claim can be confidently thin, or uncertain but well sourced. Collapsing the two hides
exactly the problems a reader needs to see.

### One rule decides everything

Ordering a list, marking a winner in a comparison, calling a difference in the switching
view, and any recommendation we build later all ask the same question, so they all go
through the same gate. An assessment may drive a decision only when **both** of these
hold:

1. **There is relevant, traceable support for the actual claim.** Not a source about the
   company somewhere — a source that covers the thing the score rests on. Sector
   background and reasoning from jurisdiction or company size never qualify.
2. **The assessment is justified by that support.** A source covering one clause of a
   five-clause rationale does not carry the other four.

**A confidence flag is not evidence.** An A or B records how sure the author felt. On its
own it has never been enough, and the most visible bug this rule fixes came from treating
it as though it were: two makers were marked highest and lowest against each other on
ownership dispersion while both cells were labelled "No source".

**The number of sources does not determine quality.** One authoritative source can carry a
narrow factual claim — a cap-table percentage, a court filing, a published index score.
Four sources that each cover a different fragment of a broad claim cannot.

Assessments that fail the gate are **kept, not deleted**. They stay visible with their
reasoning, their sources and the reason they were excluded, because they are the record of
what we thought and the starting point for the research that would make them usable.

**We withhold a score where nothing is established.** No number on the compass, in the
matrix or in any comparison. The recorded value stays in the dataset, marked for editorial
review, and is readable on the maker's page.

### Sources that are about the maker, and sources that are not

Some sources in this dataset are sector background — research on data labour in the Global
South, or a proposal for how AI windfalls could be shared. They are worth reading and they
are cited honestly, but they are not evidence about any particular company. Those are
listed separately, under "background reading", and never counted as support for a claim
about a maker.

The Stanford Foundation Model Transparency Index is treated as evidence about the firms it
actually scored, and as background for the makers whose own record notes they were not
covered by it.

---

## Ownership and funding

The money map distinguishes relationships that a single line would flatten together:

- **Outright ownership** — wholly owned
- **Controlling stake** — a stake the record describes as controlling
- **Equity stake** — money invested for a share. Not by itself control.
- **Funding commitment** — money announced or committed; check whether it has been paid
- **Investor & supplier** — an investor who is also selling to, or buying from, the maker
- **Passive index holding** — index-fund ownership of a public parent, exercised through routine governance votes

Where this dataset records that someone backs a maker but does not say what kind of stake
it is, the interface says exactly that rather than implying equity.

Three things this map deliberately does not claim:

1. **A stake is not control.** Voting rights are shown only where a record states them.
2. **A connection is not harm.** Who funds a company can shape its incentives; that is a reason to look, not a finding.
3. **A stake is not a claim on your subscription.** Nothing here traces what you pay into any investor's pocket.

**Funders are never scored.** The five axes are built for makers — a venture fund has no
data-labelling supply chain. Funders appear as context, with what they also fund and who
runs them.

---

## The Capital Lens

Whether sovereign capital, founder control or Big Tech money counts as a problem is a
value judgement, and not one we are willing to make on a reader's behalf. So it is kept
out of the scores entirely.

Each maker carries a factual capital profile — independence, founder control,
state-linked capital, hyperscaler backers, circular vendor ties, index holding. Every
attribute resolves to one of three states, never two:

- **Documented present** — our record names something.
- **Documented clear** — our record carries an explicit value, and we show the scope that
  absence holds within.
- **No record** — we have no entry. It counts neither for nor against.

That third state is the correction. An empty field is not a clean bill of health, and the
earlier version of this tool credited makers for gaps in our own research. There is now no
overall capital score at all: any single number would have to decide what an unknown is
worth, and the honest answer is nothing.

Pending, announced, contingent and reported-but-unclosed items are recorded **separately**
and never fold into a present-tense finding. A commitment that has not closed is not
ownership.

The Capital Lens lets you switch on the ones you want flagged. **Everything starts
switched off.** We offer an example as a starting point, shown to you in full before it is
applied, with the capital half as a separate decision from the axis weights — asking for
example priorities must not quietly switch on a lens you never looked at. Where example
settings are in effect the interface names them as ours; they are never described as
yours.

**Backer associations** record public associations of funders' key figures. Where an entry
has no source it is marked unverified, and it is excluded from every finding, count and
ordering on this site. An unverified association cannot become an established concern, and
it will never count against a maker in a recommendation.

---

## Priorities, and what they are allowed to do

You can tell the site which of the five axes matter to you, and how much — **not a
priority**, **matters**, or **matters a lot**. Three levels, not a slider, for the same
reason the scores are 0–4 and not 0–100: a continuous weight would imply precision the
underlying assessments cannot carry.

Nothing is selected for you. An example set is offered by name, and wherever it is in use
the interface says so rather than calling it yours.

Three rules govern what stated priorities are allowed to do:

**Only eligible assessments count.** The gate above applies unchanged. A priority you set
that the evidence cannot answer moves nobody up and nobody down.

**A maker is only placed when enough is known.** We place a maker only when at least
**half the weight you assigned** has eligible evidence behind it. This threshold is
**provisional and made for exploring the dataset** — it is not a guarantee, and it is not a
bar that qualifies anything for a recommendation. The rest are shown in a separate group
with how much is known about each. They are not at the bottom of a ranking; they are off
it.

**An average is only an ordering when it is taken over the same things.** A maker scored
on transparency and ownership is not comparable with one scored on ownership and public
sharing, however close the two averages look. Where the placed makers were not measured on
the same criteria, we say so and point you at the criterion-by-criterion breakdown instead
of the positions.

**Conduct and capital are never added together.** A weighted score across the axes and a
count of capital attributes measure different things. A single blended number would hide
which one was driving the answer, so they are always reported side by side.

When you choose priorities, each axis states how many of the makers it can actually
separate — so an axis the evidence cannot speak to is visible as a dead end before you pick
it, not after.

## What would switching change

From any maker you can pick an alternative and see what moves: the axes you prioritised,
and the funding relationships recorded for each — those associated with your current
provider, those associated with the alternative, and those **recorded for both**.

Two things that view does not claim. It does not trace customer spending: nothing here
follows what you pay to anyone, so no switch is described as redirecting your money. And a
funder appearing under one maker and not the other means our record has no entry for the
second — not that no relationship exists.

A difference is only called a difference when both sides are firm enough to compare.
Otherwise it is listed as something you cannot know, never quietly rounded down to "no
change". The page ends with every axis where at least one side has published nothing, so
it is clear what you would be choosing blind.

Suggested alternatives are simply the other makers in the same tier. This dataset does not
model which products actually substitute for each other, and we are not going to invent
that — you can pick any maker.

## What this does not cover

- **Model capability, accuracy, safety or price.** There are better benchmarks for all of these; none of them are here.
- **Companies outside the current set.** The dataset covers 18 makers and 34 funder nodes, chosen for reach rather than completeness.
- **Recommendations.** The site shows how options differ and what backs the difference. Which trade-off is worth making is yours.

## Known limits of the current dataset

The evidence coverage figures on the About page are generated from the dataset itself
rather than asserted, and they are not flattering yet. Most assessments carry no source
about the maker they describe, many rest on a single thin reading, and the tool layer is
far less documented than the frontier labs. Those gaps are visible on every page they
affect. They are the work in front of us, not a footnote.
