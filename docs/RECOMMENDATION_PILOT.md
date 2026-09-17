# Recommendation pilot — everyday AI assistants

One category, six alternatives, eight criteria, one working preview at `/recommend`.

Research conducted **2026-09-17**. Records in
[`src/data/recommendation-pilot.json`](../src/data/recommendation-pilot.json). Every finding
is **automated and provisional** — a model read a source; no human re-read it.

---

## Corrections to the first pass

Four of my earlier conclusions were wrong. Three were inference errors; one was a retrieval
failure I stopped short of.

### I concluded evidence was unavailable when it was printed on a chart

I reported Anthropic, OpenAI and Google's FMTI scores as "not resolvable from the cited
sources" after text extraction from the paper PDF failed. The values were on the official
total-scores chart the whole time.

Inspecting the image gives **all thirteen**: IBM 95 · Writer 72 · AI21 66 · **Anthropic 46**
· **Google 41** · Amazon 39 · **OpenAI 35** · **DeepSeek 32** · Meta 31 · Alibaba 26 ·
Mistral 18 · Midjourney 14 · xAI 14. They average exactly **40.69** — the published figure —
and the three cluster averages (78 / 36 / 15) reproduce, so the read is self-checking.

All eight FMTI-scored makers in the dataset now verify against the band mapping.
**Decision-eligible assessments: 4 → 8.**

The standing rule this produced: *when text extraction misses a labelled chart, inspect the
image before concluding the evidence is unavailable.*

**Scope, corrected.** I had over-narrowed this to "a model score". Stanford assesses
**developer transparency, including organisational practices**, conducted against a named
flagship (Claude 4, o3, Gemini 2.5, DeepSeek-R1…). So it is evidence about the organisation
as assessed in December 2025 — neither a pure model score nor a score of any current
consumer product. Each record now carries that.

### I let an API retirement stand in for a product retirement

I wrote that DeepSeek's consumer product could not be confirmed. `deepseek.com` returns a
302 to `chat.deepseek.com` — a consumer web chat. The product exists; the official domain
resolves to it. What retired on 2026-07-24 was the hosted `deepseek-reasoner` **API alias**,
which says nothing about the consumer app.

Product identity is now checked for the others too: **4 of 6 verified from official sources**
(Claude, Copilot, Mistral, DeepSeek), ChatGPT verified only from secondary sources after
`openai.com` paths returned 403, and **Gemini not verified at all** — `gemini.google.com`
could not be fetched.

Two things this turned up: Mistral's homepage now presents the assistant as **"Vibe"** while
the app-store badges still say "Le Chat by Mistral AI", and **Copilot's underlying model
varies by surface**, so which provider a Copilot user is choosing is itself unresolved.

### I conflated a founder bloc with an individual

I wrote that Gemini "fails" a requirement of *no individual with majority voting control*, on
the basis that Page and Brin hold 52.7% **between them**. Individually they hold 27.1% and
25.2%. Neither controls unilaterally.

Control is now three separate criteria — **individual control**, **founder-bloc control**,
**board-election rights** — and Alphabet's single filing yields *opposite* verdicts on the
first two. That is the point: a bloc needs its members to agree; an individual does not.

### I treated published weights as proof of portability

"Mistral publishes open weights" does not establish that Vibe/Le Chat is portable. Portability
is now three criteria:

| | Status |
|---|---|
| **Independent model hosting** | R1's MIT licence is solid, but **which model the consumer app routes to is unverified** — so the link to the product is missing. Mistral's licences were not read directly; *"modified MIT"* could carry use restrictions. Both **unconfirmed**. |
| **Export of your own content** | **Not researched for any of the six.** |
| **Migration to another service** | **Not researched for any of the six.** |

The portability dimension most users actually mean — getting your conversations out — we
have nothing on.

### Two more, corrected

**Public benefit.** I ranked Claude above ChatGPT because OpenAI withdrew its capped-profit
mechanism. That mixed two questions. On **current mechanisms** both have a PBC form plus a
non-shareholder body with board rights — comparable, and not rankable on what we have. The
withdrawal is now its own criterion, **commitment continuity**, which a user may or may not
care about. Anthropic's reported founder super-voting is recorded as **proposed**, not in
force — the ratio is undisclosed and Anthropic has not commented.

**"Mutually exclusive."** I wrote that two criteria were mutually exclusive across these
products. Nothing established that. It is **"no confirmed match among the researched
options"** — a statement about our evidence, not about the market. And no promise that more
research would produce a match.

---

## The three scenarios, corrected

Priorities are **soft by default**. A criterion excludes only when the user explicitly makes
it a requirement, and only where the evidence can actually decide.

### 1 — "I want to be able to leave"

*Requirement: independent model hosting.*

**No confirmed match. Six potentially relevant. Nothing excluded.**

DeepSeek-R1's MIT licence permits self-hosting, commercial use and derivatives — the cleanest
licence finding in the pilot. But it does not establish that the assistant a user actually
opens is portable, because the app's model routing is unverified. Mistral's licences come
from aggregators, and "modified MIT" is unread.

Nothing is ruled out, because nothing is *evidenced* to fail. Six options each display the
same unresolved requirement.

**If the user meant "take my conversations elsewhere"** — the more common reading — we have
literally nothing, and the preview says so rather than answering a different question.

### 2 — "No one person should be able to override the board"

**The answer depends on which predicate the user means, and the preview makes them choose.**

| Predicate | Gemini | Other five |
|---|---|---|
| No **individual** with majority control | **Meets** — Page 27.1%, Brin 25.2%, neither >50% | Unconfirmed |
| No **founder bloc** with majority control | **Fails** — 52.7% combined | Unconfirmed |

Same provider, same April 2026 proxy, opposite outcomes. Under the individual reading Gemini
is the only confirmed match on that criterion; under the bloc reading it is the only evidenced
exclusion. The other five are unconfirmed either way and are neither shortlisted nor ruled
out.

This is the scenario the first pass got wrong, and the correction changes the recommendation.

### 3 — "I want a real public-benefit commitment"

*Requirement: public-benefit mechanism in force.*

**Two confirmed on that criterion: Claude and ChatGPT. Not ranked against each other.**

- **Claude** — Delaware PBC; Long-Term Benefit Trust holding Class T shares with no economic
  rights, electing an increasing share of a seven-member board. Trustees: three as of
  2026-08-19, down from five in the 2023 description.
- **ChatGPT** — for-profit PBC controlled by the nonprofit OpenAI Foundation, which holds
  ~26% and controls the board.

On equivalent dimensions — a PBC form plus a non-shareholder body with board rights — these
are comparable. We have no basis to put one above the other.

**Add commitment continuity as a second preference** and ChatGPT picks up a trade-off, not an
exclusion: the capped-profit mechanism existed and was removed in October 2025. Whether that
matters is the user's call, and it is a different question from what is in force now.

**Add independent model hosting as a requirement** and there is **no confirmed match among
the researched options** — because model hosting is unconfirmed for all six, not because the
criteria conflict.

---

## What the preview can honestly recommend today

At `/recommend`: pick what you need it to do, pick what matters, optionally mark something a
requirement. Results come back in three states — **confirmed match**, **potentially relevant
with unresolved requirements**, **ruled out on evidence** — each with the claim, its type,
source, date, scope, uncertainty and provenance.

**It can honestly recommend, today:**

- **On voting control, for Gemini only** — and only once the user says which predicate they
  mean. This is the one place the pilot gives a clean, filing-backed answer.
- **On public-benefit mechanisms in force** — Claude and ChatGPT both qualify; the preview
  presents them unranked rather than inventing a tiebreak.
- **On commitment continuity** — one evidenced trade-off against ChatGPT, correctly separated
  from its current arrangements.

**It cannot recommend on portability at all**, and it says so instead of substituting a
licence fact for a product fact.

Design properties worth noting, all enforced by tests: nothing is ever excluded by an
unknown; a soft priority never excludes, however bad the finding; the *requirement* checkbox
is disabled for criteria no alternative has a finding on; and a functional gap reads as
"not confirmed", never as a fail. 58 checks pass, 17 of them on this engine.

## The research items that would most change a user's choice

1. **Voting control for the other five providers.** The criterion with the sharpest relevance
   and one of six covered. Microsoft and Alphabet file proxies publicly; Anthropic's ratio
   will be in its prospectus. This alone turns Scenario 2 from one answer into six.

2. **Read the Mistral licence files, and resolve model routing.** Scenario 1 currently returns
   nothing confirmable. Two reads would settle it: what "modified MIT" actually permits, and
   which model each consumer app serves. Without the second, a licence finding can never
   attach to a product.

3. **Content export, for all six.** The portability dimension users actually mean, and we have
   zero coverage. Likely answerable from published help documentation in an afternoon.

4. **Gemini's product identity, and ChatGPT's from source.** One is unverified, the other
   secondary. The cheapest items here, and a recommendation resting on a misidentified product
   is worse than no recommendation.

What is *not* on this list: any change to the scoring model, any new criteria, or more makers
clearing a threshold. The pilot answers two of three scenarios usefully and refuses the third
honestly. Closing items 1 and 2 would make it three.
