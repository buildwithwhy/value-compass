# Recommendation pilot — everyday AI assistants

Can ValueCompass support **one** useful recommendation journey? This is a narrow test: one
category, six alternatives, four criteria, three users. No new scoring infrastructure, and
no attempt to revive the composite scores.

Research conducted **2026-09-17**. Records in
[`src/data/recommendation-pilot.json`](../src/data/recommendation-pilot.json). Every finding
is **automated and provisional** — produced by a model reading a source, not by a human
re-reading it. Nothing here is marked human-reviewed.

**The short answer:** yes for one of the three users, no for another, and partially for the
third — and the reasons why are more useful than the shortlists.

---

## Routine research items, resolved

### FMTI transcription — 1 of 4 resolved

| Developer | Result | Effect |
|---|---|---|
| **DeepSeek** | **32/100** — stated on the index page | Band 30–49 → **2**. Matches the recorded score. Now decision-eligible. |
| Anthropic | Not obtainable | Paper gives middle-group average (36) and a rank, never the score |
| OpenAI | Not obtainable | "Decreased by 14 points" and a rank, never the score |
| Google | Not obtainable | Appears only in the middle-group list |

Attempted across four sources: the index page, the arXiv HTML, the Stanford HAI article, and
the 49-page paper PDF (text-extracted locally). Figure 7 plots per-company totals but the
values are not in the PDF's text layer. **The three remaining scores are not resolvable from
the cited sources** — they would need the CRFM data board or a direct request. No number was
guessed.

Two things worth having found:

- **Edition and date pinned:** *The 2025 Foundation Model Transparency Index*, published
  **11 December 2025**, average 40.69/100.
- **The scores attach to a flagship model, not a company** — Claude 4, o3, Gemini 2.5,
  Grok 3, Llama 4, DeepSeek-R1, Mistral Medium 3, Midjourney V7. That is a scope limit the
  dataset had lost. A December-2025 score for o3 is weak evidence about what ChatGPT runs
  in September 2026, and the eligible transparency scores should carry that caveat.

Existing values corroborated along the way: Meta 60→31, Mistral 55→18, xAI 14, Midjourney 14.

**Eligible assessments: 4 → 5.**

### Midjourney labour — left unresolved, as instructed

"Image makers carry the creator-consent sub-indicator most heavily (active litigation is the
signal)" remains a weighting statement, not an aggregation rule. The supported findings are
kept — the Disney/Universal suit of June 2025 and the 2023 artists' class action, both
sourced and dated. The 1/4 composite stays unresolved. No aggregation rule was written.

### Canva public-sharing — reviewed, and it narrows

Read the cited source. It changes the picture in three ways:

1. **It is a pledge, not a structure.** The founders "committed to give away 30% of Canva to
   the Canva Foundation". §5's own rule weights "legally binding structures (trust/PBC/
   charter) far above PR pledges" — and 4/4 is defined as the *binding* tier.
2. **The access clause is absent.** A 4 also requires "broad affordable or free access". The
   page does not mention free education or nonprofit tiers. It says Canva works with 60,000
   schools and 130,000 non-profits — a customer count, not a commitment.
3. **It is dated 2021.** Five years old, with no execution evidence on the page beyond a
   $10M pilot donation.

The supported fact is preserved and now carries its date. **The 4/4 stays unresolved and no
replacement score is proposed** — the right next step is a human re-score against §5.

### Deferred, as instructed

No new aggregation rules. Absence research was scoped to criteria selected below — and none
of those four needed an absence finding, so no absence evidence was gathered.

---

## The category, and why

**Everyday AI assistants.** Selected on two axes, both required:

**User relevance.** It is the highest-frequency personal AI choice most people make, and it
is genuinely substitutable — the switching cost is a habit and a subscription, not a data
migration. The same task can be done by any of the six, so the choice can actually turn on
values rather than capability.

**Achievable evidence coverage.** Six providers are already makers in this dataset. More
importantly it is where the surviving evidence is: model licences are public, versioned and
checkable in minutes, and provider governance is covered by proxy statements and charters. A
category like AI coding tools would have failed on both counts — thinner governance records
and much weaker substitutability.

**What this does not do:** capability differences between these six are real and are not
assessed. This answers "which of these fits what I care about", not "which is best".

## The six alternatives

| Product | Provider | Functional status |
|---|---|---|
| ChatGPT | OpenAI | From dataset record; not re-verified |
| Claude | Anthropic | From dataset record; not re-verified |
| Gemini | Google DeepMind | From dataset record; governance attaches to Alphabet |
| Microsoft Copilot | Microsoft | From dataset record; **which model a user gets varies by surface**, so which provider they are choosing is itself unresolved |
| Le Chat | Mistral | Free tier ~20–25 messages/day (secondary source); one source refers to a rename to "Vibe" |
| DeepSeek assistant | DeepSeek | **Unconfirmed.** Hosted reasoner API retired 2026-07-24; consumer-app status could only be found on a site that disclaims any association with DeepSeek |

**First real gap:** functional eligibility is the weakest layer. Five of six product
identities are assumed from the dataset rather than checked, and the sixth is unconfirmed.
For a recommendation product this is backwards — it is the cheapest thing to verify and the
most embarrassing to get wrong.

## The four criteria

Chosen to keep distinct concepts apart, per the brief:

| Criterion | The concept | Distinct from |
|---|---|---|
| **Voting control** | Who can outvote everyone else | Owning the upside |
| **Economic ownership** | Who holds the financial upside | Who directs the company |
| **Public-benefit structure** | A legal obligation to weigh non-shareholder interests | A stated intention |
| **Model access & licensing** | Whether you could run it without the provider | Everything above |

**A stated bias:** model access was chosen partly *because* it is well-evidenced. That
favours open-weight providers. It was not chosen to produce a convenient winner — it
produces an awkward one, since the best-evidenced option on this criterion is the one whose
consumer product we could not confirm exists.

### Coverage — the finding that shapes everything below

| Criterion | Assessable | Unassessable |
|---|---|---|
| Voting control | **1** of 6 (Gemini) | 5 |
| Economic ownership | 2 of 6 | 4 |
| Public-benefit structure | 2 of 6 | 4 |
| Model access & licensing | 2 of 6 | 4 |

---

## Scenario 1 — "I want to be able to leave"

**Task.** Drafting and summarising for a small consultancy. Wants an assistant they can keep
using if the provider changes terms, raises prices, or discontinues the product.

**Requirements.** General chat assistant. **Hard requirement:** published model weights they
could run independently.

**Priorities.** Model access first. Everything else secondary.

**Eligible alternatives.** Two have a positive finding: **Le Chat** (Mistral) and the
**DeepSeek assistant**. Four have no published weights — but note that for ChatGPT, Claude,
Gemini and Copilot this was *not verified in this pass*. It is very likely true and it is
recorded as unverified anyway.

**Conditional shortlist — supported, with one strong and one blocked.**

**1. Le Chat.** Mistral publishes Large 3 and Small 4 under Apache 2.0 and Medium 3.5 under
a modified MIT licence, self-hostable with commercial use and fine-tuning permitted. It also
has a confirmed free entry path (~20–25 messages/day).
*Compromise:* the licence terms come from secondary aggregators, not Mistral's own docs.
"Modified MIT" is the phrase to check — a modified permissive licence can carry use
restrictions that would defeat the entire point of the requirement. **Read the licence file
before relying on this.**

**2. DeepSeek — blocked on function, not on values.** DeepSeek-R1's weights are MIT-licensed
and downloadable, permitting commercial use and derivatives. This is the single cleanest
finding in the pilot. But the hosted reasoner API was retired on 2026-07-24, and consumer-app
availability could not be confirmed from any source affiliated with DeepSeek. There is also a
version mismatch: the verified licence covers R1, while the current flagship is V4, whose
licence was not checked. **Not shortlisted — the hard requirement is met by a model the user
may not be able to get as a product.**

**Unresolved.** Whether Le Chat's "modified MIT" is genuinely permissive. Whether DeepSeek's
consumer app exists. Whether Mistral's Le Chat has been renamed.

**If priorities changed.** Add "no individual with voting control" as a second hard
requirement and **the shortlist empties** — Mistral's control structure is unassessed, and
DeepSeek's recorded ~89.5% founder control is unsourced, so neither can be confirmed either
way. The answer changes not because the alternatives got worse but because we cannot speak to
the second question at all.

---

## Scenario 2 — "No one person should be able to override the board"

**Task.** Same everyday assistant use. Cares about governance concentration after watching
founder-controlled platforms change their terms unilaterally.

**Requirements.** General chat assistant. **Hard requirement:** no individual or pair holding
majority voting control.

**Priorities.** Voting control first, public-benefit structure second.

**Eligible alternatives.** **One** alternative can be assessed at all.

- **Gemini — assessed, and it fails.** Page and Brin together control **52.7%** of Alphabet's
  total voting power, per the April 2026 proxy: Class B shares carry ten votes each, Class C
  none. This is the best-evidenced finding in the entire pilot — specific, dated, from a
  filing, and internally consistent (27.1% + 25.2%).
- **ChatGPT, Claude, Copilot, Le Chat, DeepSeek — unconfirmed.** Microsoft's "no founder
  control bloc" and DeepSeek's "~89.5% via High-Flyer" are both recorded in the dataset with
  **no source**. Anthropic is mid-change: founders are reported to be receiving enhanced
  voting rights, but the vote ratio is explicitly undisclosed and Anthropic has not commented.
  OpenAI's nonprofit board control is recorded but its structure page returned 403.

**Conditional shortlist — not supported.** One alternative is assessable and it fails the
hard requirement. The other five are unconfirmed, and **an unknown hard requirement stays
unconfirmed** — they are not shortlisted and not excluded. They are unassessable.

**This is the correct output, not a failure of the format.** Telling this user "try Claude"
would mean treating five gaps in our research as five passes. The useful thing we can tell
them is narrower and true: *if you are choosing between these six on this criterion, we can
only tell you that Gemini fails it.*

**Unresolved.** Five of six providers' voting structures. Four are one proxy statement or
charter away — Microsoft and Alphabet file publicly; Anthropic's will be in its prospectus.

**If priorities changed.** Drop the requirement from hard to "matters" and the answer still
does not move, because there is still nothing to rank the other five on. Coverage, not
weighting, is the binding constraint — which is exactly the case where changing your
priorities *should not* change the answer, and the interface should say so.

---

## Scenario 3 — "I want a real public-benefit commitment"

**Task.** Same everyday use, at a values-led nonprofit. Wants a provider structurally
obliged to weigh more than shareholder returns.

**Requirements.** General chat assistant. No hard requirement — this is a strong preference.

**Priorities.** Public-benefit structure first, economic ownership second.

**Eligible alternatives.** Two have any recorded structure: **Claude** and **ChatGPT**. For
Gemini, Copilot, Le Chat and DeepSeek, no public-benefit structure is recorded — which is an
**absence of record**, not a finding that none exists.

**Conditional shortlist — partially supported, and the ordering is uncomfortable.**

**1. Claude (Anthropic).** A Delaware Public Benefit Corporation with a Long-Term Benefit
Trust holding Class T shares that carry **no economic rights** and elect an increasing number
of a seven-member board, intended to reach a majority. The no-economic-rights design is the
substantive part: the trustees do not gain from the company's success.
*Compromises, and they are live.* The Trust had **three** trustees as of 2026-08-19, down
from four after a departure on 2026-08-04; the 2023 description said five. Founders are
reported to be receiving enhanced voting rights with an **undisclosed** ratio, and Anthropic
has not commented. A trust that elects a board majority means something different if the
founders hold super-votes over it. **The structure is real; its current balance of power is
not established.**

**2. ChatGPT (OpenAI).** A for-profit PBC controlled by the nonprofit OpenAI Foundation,
which holds ~26% and controls the board.
*Compromise, and it is the decisive one.* The **capped-profit mechanism was removed** in the
October 2025 recapitalisation. That is a commitment that existed and was withdrawn — which is
evidence about the company, not a neutral absence. A user choosing on this criterion should
weigh a withdrawn commitment differently from one that was never made.

**Why Claude ranks above ChatGPT here:** not because Anthropic scores higher on anything, but
because its structure has not been withdrawn. Both findings are dated and neither was
re-verified against a primary source in this pass.

**Unresolved.** Anthropic's post-IPO voting balance — the single fact that would most change
this answer, and it is undisclosed rather than merely unresearched. Whether any of the other
four has a structure we simply have not recorded.

**If priorities changed.** Add Scenario 1's portability requirement and **this shortlist
inverts to empty**: both Claude and ChatGPT are closed-weight, and the two open-weight
options have no recorded public-benefit structure. The two criteria this dataset can evidence
best are, on current coverage, **mutually exclusive across these six products**. That is a
real finding about the market, and the most decision-relevant thing in this report.

---

## Does it work?

**For one user in three, yes.** Scenario 1 gets a genuine, evidence-linked shortlist with a
specific thing to check before acting. Scenario 3 gets a defensible ordering of two, with the
compromise in each stated plainly. Scenario 2 gets a clear, honest "we cannot answer this" —
which is a useful output, though not a satisfying one.

None of the three needed an overall ethical score, and adding one would have hidden the thing
each user actually needed to know.

## The specific gaps preventing useful recommendations

In the order I would fix them.

1. **Functional verification of all six products.** Five product identities are assumed from
   the dataset; one is unconfirmed. This is the cheapest gap to close and the most damaging to
   leave — a recommendation for a product that has changed name, tier or availability is worse
   than no recommendation. *Half a day.*

2. **Voting control for five of six providers.** The criterion with the sharpest user
   relevance and the worst coverage. Microsoft and Alphabet file proxies publicly; Anthropic's
   prospectus will disclose its ratio. Closing this makes Scenario 2 answerable. *Two of the
   five are a single document each.*

3. **Read the licences directly.** The strongest criterion rests on secondary aggregators for
   Mistral. "Modified MIT" specifically must be read, because a use restriction there would
   invalidate the Scenario 1 shortlist entirely.

4. **Model-to-product mapping.** FMTI scores attach to Claude 4, o3, Gemini 2.5 — not to the
   assistants people use today. Copilot's underlying model varies by surface. Until products
   map to models and models to dates, provider-level findings will keep being applied to the
   wrong thing.

5. **The three unobtainable FMTI scores.** Lowest priority of these five: transparency did not
   drive any of the three scenarios. Worth closing for the general dataset, not for this
   journey.

**What is not a gap:** the number of makers passing a placement threshold. Nothing in this
pilot used one. Two well-evidenced criteria and six honestly-described alternatives produced a
useful answer for two users out of three, and the third got a truthful refusal. Closing gap 1
and gap 2 would make it three out of three — and neither requires a single change to the
scoring model.
