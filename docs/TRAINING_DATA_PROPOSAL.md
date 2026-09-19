# Training on your data — research, and a proposal

Research completed 2026-09-20. **Nothing is implemented.** This proposes exact criteria and a
revised motivation structure, and shows how `/recommend` would change, for approval first.

---

## 1. What the research found

Twelve of thirteen documented from official sources. That makes this the **best-covered
criterion in the pilot**, ahead of content export at 6 of 13.

| Product | Used for training? | Can you switch it off? | How |
|---|---|---|---|
| **Lumo** | **No** — never | n/a | Proton: *"Lumo doesn't use your conversations or inputs to train the large language model."* |
| **Duck.ai** | **No** — contractually barred | n/a | Providers *"never use your Duck.ai conversations to train their models"*, plus zero data retention |
| **ChatGPT** | Yes, **on by default** (Free/Plus/Pro) | Yes, in product | Settings → Data Controls → *Improve the model for everyone*. Temporary Chat excluded |
| **Gemini** | Yes, by default | Yes, in product | *Keep Activity* |
| **Microsoft Copilot** | Yes | Yes, in product | Account → Privacy → *Training on conversation activity* |
| **Vibe (Mistral)** | Yes on **Free**; not on paid tiers | Yes, in product | *Allow your interactions to be used to train our models* |
| **Grok** | Yes | Yes, in product | Settings → Data → *Improve the Model*; also Private Chat |
| **Perplexity** | Yes, by default (Free/Pro/Max) | Yes, in product | Settings → *AI Data Usage* |
| **Claude** | Only where the user allows it | Yes, in product | Privacy Settings → *Model Improvement* |
| **DeepSeek** | Yes | Only by **email** | `privacy@deepseek.com` |
| **Qwen Chat** | Yes (de-identified) | Only by **email** | `privacy@qwen.com` |
| **Kimi** | Yes | Only by **support request** | Contact per §11 of the policy |
| **Meta AI** | **Not established** | **Not established** | Help Centre articles read do not address training |

### Details that matter more than the headline

- **Gemini**: human reviewers see a subset, and reviewed chats *"are not deleted when you delete
  your activity"* — retained up to three years. Turning Keep Activity off does not reach them.
- **Copilot**: opting out *"will not exclude your conversations from being used for other general
  product or system improvements nor from use for advertising"*. The off-switch is narrower than
  it sounds.
- **Claude**: allowing training extends retention to **five years**; declining keeps the **30-day**
  period. Incognito chats are never used. Excludes Work/Gov/Edu/API.
- **Grok** and **Qwen**: feedback you volunteer may still be used after opting out.
- **Vibe**: the free tier trains, the paid tiers do not — the only product in the set where the
  answer depends on what you pay.
- **Duck.ai**: the promise is contractual and made by the *operator* about the *model providers* —
  a clean demonstration of why this pilot separates those two identities.

### Two judgement calls I want you to rule on

**1 · Claude.** Anthropic states it uses chats *"if you choose to allow us"*, and that declining
keeps a 30-day retention period. That reads as opt-in. But neither page I read states the
toggle's default at signup, and the August 2025 rollout presented existing users with a prompted
choice. I propose recording Claude as **unconfirmed** on the default question rather than reading
"if you choose" as proof the default is off. It is the conservative call, and it may understate
Anthropic. **Your call.**

**2 · Lumo and Duck.ai on the off-switch question.** They have nothing to switch off because
nothing is used. Recording them as *unconfirmed* would be wrong; recording them as *meets* means
the criterion measures the outcome rather than the mechanism. I propose **meets, with scope
stating the outcome is achieved by never training rather than by a setting.**

---

## 2. Proposed criteria

Two, not one. They answer genuinely different questions and the second is the one nobody
publishes a comparison of.

### `c_training_default` — "Your conversations are not used to train the model"

| Verdict | Count | Who |
|---|---|---|
| Documented in favour | **2** | Lumo, Duck.ai |
| Documented against | **9** | ChatGPT, Gemini, Copilot, Vibe, Grok, Perplexity, DeepSeek, Kimi, Qwen Chat |
| Not established | **2** | Claude, Meta AI |

**This would be the first criterion in the pilot documented on both sides across almost the whole
catalogue.** Every existing criterion is lopsided — export is 6 in favour and 0 against; commitment
continuity is 1 against and 0 in favour.

### `c_training_off_switch` — "You can switch training off in the app's own settings"

| Verdict | Count | Who |
|---|---|---|
| Documented in favour | **9** | ChatGPT, Claude, Gemini, Copilot, Vibe, Grok, Perplexity, + Lumo and Duck.ai (nothing to switch off) |
| Not established | **4** | DeepSeek, Kimi, Qwen Chat (email/support route documented; no statement that a setting does not exist), Meta AI |

The email-only providers are recorded as **not established** rather than as failures. A documented
email route is not evidence that an in-product setting is absent — that distinction is the
project's absence rule, and it costs us a sharper finding on purpose.

### Not proposed

- **A "how long is it retained" criterion.** Genuinely interesting — Claude 30 days vs 5 years,
  Gemini's 3-year human-review retention — but it is a number, not a direction to prefer, and it
  would need its own research pass across all thirteen. Better as an `access_note` for now.
- **A "human reviewers see it" criterion.** Only Gemini documents it clearly; one finding is not
  a criterion.

---

## 3. Proposed motivation structure

Your five, with the labels corrected as you asked and honest about what can ship.

### 1 · Who am I empowering with this choice? — **active**
*Ownership shape, operator scale, parent structure, control.*

- **new** — what shape of owner sits behind it *(from `independence_type`: subsidiary, mega-cap,
  hedge-fund-parented, VC-backed, foundation — already populated for 10 of 13)*
- *nested evidence* — no single person holds a voting majority; founders together; board election
  rights

Voting findings stay, nested, and stop driving recommendations on their own.

### 2 · What other powerful actors is this choice connected to? — **declared, not active**
*Major investors, parent companies, strategic dependencies, institutional relationships.*

Per your instruction this is **not researched yet**. Of 14 funder associations assessed, 12 are
`unverified` — shipping it today would be a section of blanks. Shown as a named, inactive area
with what it will cover and what standard it needs first.

Note the reframing you asked for: the label no longer claims your subscription money flows to
these actors. *Connected to* and *dependent on* are what the evidence can support. A strategic
dependency — Microsoft is recorded as `frontier_and_funder`, both a maker and a backer of rivals —
is a documented relationship, not a money-flow claim.

### 3 · How much control do I keep — and can I leave? — **active, and substantially stronger**
*Training on user data, export, portability, account requirements, lock-in.*

- **new** — your conversations are not used to train the model
- **new** — you can switch training off in the app's settings
- *existing* — export, account transfer, cross-service migration
- *nested evidence* — you could run the model yourself

### 4 · Have they behaved consistently with what they say? — **active but thin**
*Commitments, reversals, documented conduct.*

- *existing* — past public-benefit promises have been kept (1 of 13)
- Keeps its research-gap note.

### 5 · Where does the economic value go? — **declared, not active**
*Profit distribution, worker and creator compensation, tax and economic contribution,
non-profit/cooperative structures.*

Declared as an open research question, **not** dismissed. To be explicit about the correction:
I previously put tax contribution in the "too weak to bother" tier, and my stated reason was that
it is hard to research. That is the same sourcing bias the audit itself identified, applied by me
one section later. Difficulty is a reason it is unanswered, not a reason it is unimportant.

**What moves out of the old structure:** foundation/non-profit ownership leaves the voting
criterion and becomes an ownership-shape fact under motivation 1. It is not promoted into a
"who benefits" claim, because we cannot document who benefits.

---

## 4. How `/recommend` would actually change

### Worked example — someone picks "your conversations are not used to train the model" as a preference

**Today:** the criterion does not exist. The nearest thing is prose in Lumo's and Duck.ai's access
notes, which cannot be selected, compared or reasoned about.

**After:**

> **What we found**
> **Your conversations are not used to train the model**
> **2 documented** in favour — Lumo, Duck.ai. **9 documented** against — ChatGPT, Gemini,
> Microsoft Copilot, Vibe, Grok, Perplexity, DeepSeek, Kimi, Qwen Chat. **2** we could not
> establish — Claude, Meta AI.
>
> *Documented both ways, so this one genuinely separates them: Lumo and Duck.ai over ChatGPT,
> Gemini, … — on this point.*
>
> **Worth considering, and why**
> **Duck.ai** — documented in favour on "Your conversations are not used to train the model".
> **Lumo** — documented in favour on "Your conversations are not used to train the model".

Two products most people have never heard of arrive at the top of the reasoning **on a documented
fact a user actually asked about** — which is the entire point of the site, and something no
existing criterion achieves.

### The same thing as a must-have

**Nine of thirteen options would be excluded on documented evidence.** That has never happened
before: today the largest documented exclusion is two options on founder voting. For the first
time the exclusion path does real work rather than leaving everything unconfirmed.

**This is worth pausing on.** A single criterion that removes 9 of 13 is powerful. It is
user-selected and evidence-backed, so I think it is legitimate — but it will dominate any session
where it is set as a must-have, and Claude and Meta AI will sit in *requirement not confirmed*
purely because we could not establish their default. The guidance summary handles that correctly
today: it will say we cannot establish whether they are better on this point, and name it as the
next question.

### What does not change

Alphabetical ordering, the three buckets, the eligibility gate, the absence rule, and the
principle that we publish documented facts and trade-offs rather than deciding which arrangements
are good. *"Trains on your conversations"* is stated as a fact; plenty of people will not mind, and
some will prefer the product that improves from their use.

---

## 5. What I would build, in order

1. Add both training criteria with the 24 researched assessments *(13 + 11 — Lumo and Duck.ai
   need only one each)*
2. Restructure motivations 1, 3, 4 as active; 2 and 5 as declared-inactive
3. Move foundation ownership out of the voting criterion into ownership shape
4. Add `independence_type` as the ownership-shape criterion for the 10 operators that have a
   maker page
5. Regression checks: a criterion documented on both sides separates; the email-only providers
   stay *unconfirmed* rather than becoming failures; nested voting evidence cannot drive a
   recommendation alone; declared-inactive motivations select nothing

**Not doing:** investor research, until there is a sourcing standard and coverage that will not
produce blanks.

---

## 6. Open questions for you

1. **Claude's default** — record as unconfirmed (conservative, may understate Anthropic), or read
   *"if you choose to allow us"* as documenting an opt-in default?
2. **Lumo and Duck.ai on the off-switch criterion** — *meets* on the outcome, as proposed?
3. **Should motivations 2 and 5 be visible** as declared-but-inactive areas, or hidden until they
   have evidence? Visible is more honest about intent; hidden avoids a page that advertises what
   it cannot do.
4. **Meta AI** — accept *not established*, or spend another pass trying to source it? Its Help
   Centre pages fetch cleanly but simply do not address training, so this is a genuine
   documentation gap rather than a retrieval failure.
