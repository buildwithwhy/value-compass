# ValueCompass screenshots — Hopperlace redesign handoff

## Capture details

| | |
|---|---|
| **URL** | https://www.valuecompass.ai/#/recommend |
| **Captured** | 2026-09-22, after the evidence corrections below |
| **Version** | The live deployed build, bundle `index-7DTGXexv.js`. No app code exists only locally. |
| **Viewport** | 1440 × 900 CSS pixels, 100% zoom |
| **Files** | 2880 × 1800 PNG, true 2× device pixel ratio |
| **Method** | Headless Chrome on the live site. The only interaction was clicking the controls a visitor clicks. No DOM edits, no injected CSS, no cursor or tooltip in frame. |

## The example

**Preferences selected (2), neither marked must-have:**
- *A foundation or non-profit holds control of the company*
- *A public-purpose body has a documented economic stake or revenue share*

Because both are soft preferences, nothing is ruled out and all 13 options remain listed.

## What the example now shows

**Worth considering: ChatGPT, Claude and Lumo.**

- **ChatGPT** — documented in favour on both. The OpenAI Foundation controls OpenAI Group PBC and
  holds roughly 26% of the equity.
- **Lumo** — documented in favour on both. The Proton Foundation is primary shareholder and
  Proton states 1% of revenues goes to its charitable activities when finances allow.
- **Claude** — documented in favour on control only. Anthropic states that following its April
  2026 board appointment, *"Trust-appointed directors now make up a majority of the Board."* The
  economic question is **not established**.

The first criterion is documented on both sides and separates the options. The second is not: two
options are documented in favour and eleven are unresolved, so the page does not claim it
separates anything.

## Corrections made before this capture

These changed the result, and the changes are visible in the images.

1. **Present control, not a future commitment.** Claude's control finding previously cited a 2023
   statement that the Trust *"will elect a majority of the board within 4 years"*. That is a
   projection. It now rests on Anthropic's April 2026 statement of present fact. Same verdict,
   sound basis.
2. **A narrow fact no longer carries a broad negative.** Claude was previously marked **documented
   against** on the economic question because its Trust's Class T stock carries no economic
   rights. That is a fact about one trust; the criterion asks whether *any* public-purpose body
   holds a stake. The narrow finding is kept and the verdict is now **unresolved**. Consequently a
   must-have on this criterion would exclude nobody, where it previously excluded Claude.
3. **The criterion's wording matched what it asks.** It previously said money *"actually reaches"*
   a non-profit while accepting an ownership interest. It now reads: *whether a public-purpose
   organisation holds a financial interest in the business or has a documented right to a share of
   revenue.* Ownership interests, revenue-sharing rights and actual payments stay separate in the
   evidence.
4. **The summary says why an option is not listed.** It previously said options without a positive
   finding were ones we *"simply have nothing to say about"*. It now distinguishes **part
   documented against, part unresolved** (Gemini, Meta AI, Microsoft Copilot) from **not yet
   researched** (DeepSeek, Duck.ai, Grok, Kimi, Perplexity, Qwen Chat, Vibe).

**Compared with the previous capture**, Claude no longer shows a red trade-off, and the second
criterion no longer carries a "separates them" banner. The example is less dramatic and better
supported.

## The images

| File | Use | Shows |
|---|---|---|
| `valuecompass-01-choosing-priorities.png` | **Hopperlace hero** | Page identity, the question "Who am I empowering with this choice?", its sub-questions, two ticked preferences with per-criterion coverage |
| `valuecompass-02-seeing-the-advice.png` | **ValueCompass section** | The recommendation summary, the three options worth considering, and the breakdown of why the others are not listed |
| `valuecompass-03-evidence-on-the-cards.png` | ValueCompass section, supporting | ChatGPT and Claude side by side with "Who gets paid, and what this runs on" expanded, and each finding quoted from source |

**Why three rather than two.** The summary and the card evidence do not fit legibly in one
1440 × 900 frame, so they were captured separately rather than scaled down. Use 01 and 02 as the
complementary pair; 03 carries the most detail.

## Uncertainty visible in these images

Please do not crop these out — removing them would change what the images claim.

- Seven options are unestablished on the control criterion; eleven on the economic criterion.
- Claude's card carries a **"What we could not check"** section, not a negative finding.
- ChatGPT's relationship block names what is open: *whether OpenAI distributes profits at all, and
  so whether the Foundation's stake ever pays out.*
- The header carries `ONE CATEGORY · RESEARCHED PILOT` and states there is no overall score and
  nothing has been tested for quality.
- The asterisk on ChatGPT's *"Some no-cost entry path"* marks a capability confirmed only from
  secondary sources.

## One thing a designer should know

The header reads *"Preferences for this page are set below"* rather than showing site-wide
settings, because this page holds its own state. Intentional, not placeholder text.

## Reproducing

Open the URL, expand *"Who am I empowering with this choice?"*, tick the two preferences named
above, leave both must-have boxes clear, and screenshot at 1440 × 900 with a device pixel ratio
of 2.
