# ValueCompass screenshots — Hopperlace redesign handoff

## Capture details

| | |
|---|---|
| **URL** | https://www.valuecompass.ai/#/recommend |
| **Captured** | 2026-09-22 |
| **Version** | The live deployed build. Nothing app-related exists only locally — the one unpushed commit is a research-roadmap note with no `src/` changes. |
| **Viewport** | 1440 × 900 CSS pixels, 100% zoom |
| **Files** | 2880 × 1800 PNG (true 2× device pixel ratio, not upscaled) |
| **Method** | Headless Chrome driving the live site. The only interaction was clicking the same controls a visitor clicks. No DOM edits, no injected CSS, no cursor or tooltip in frame. |

## The example

An ownership and financial-benefit decision, which is the strongest demonstration the
implemented research currently supports.

**Preferences selected (2):**
- *A foundation or non-profit holds control of the company*
- *A public-purpose body has a documented economic stake or revenue share*

**Must-haves: none.** Both are soft preferences, so nothing is ruled out and all 13 options stay
listed.

### Why this example

It shows the thing ValueCompass does that a review site cannot: two criteria that sound like the
same question give **different answers about the same company**.

Claude is documented **in favour** on foundation control — Anthropic's Long-Term Benefit Trust
will elect a majority of the board within four years — and documented **against** on economic
stake, because that same Trust holds Class T stock explicitly *"designed to insulate the Trustees
from financial interest in Anthropic."* One source, opposite verdicts, and the page says so rather
than smoothing it into a score.

No winner is declared. Three options are worth considering and the trade-off is stated in the
open.

## The images

| File | Use | Shows |
|---|---|---|
| `valuecompass-01-choosing-priorities.png` | **Hopperlace hero** | The page identity, the plain-language question "Who am I empowering with this choice?", its sub-questions, and two ticked preferences with per-criterion coverage |
| `valuecompass-02-seeing-the-advice.png` | **ValueCompass section** | The full recommendation summary: both criteria documented on each side, "Worth considering, and why", and Claude's trade-off in red |
| `valuecompass-03-evidence-on-the-cards.png` | ValueCompass section, supporting | ChatGPT and Claude side by side with "Who gets paid, and what this runs on" expanded, and the documented alignment and conflict quoted from source |

**Why three rather than two.** The summary and the card evidence do not fit legibly in one
1440 × 900 frame. Per the brief, they were captured separately rather than shrunk. Use 01 and 02
as the pair if only two are needed; 03 is the strongest single image for depth.

### Suggested pairing

01 answers *"what do I ask?"* and 02 answers *"what do I learn?"* — that is the complementary pair.
If the hero needs the more visually distinctive image, 03 has the most colour and the clearest
side-by-side contrast.

## Limitations visible in these images — do not crop them out

These are real and deliberate. They are the product's argument, not blemishes.

1. **Most options are unknown.** The summary states *7 we could not establish* on control and
   *10 we could not establish* on economic stake. Only 3 and 2 of 13 respectively are documented
   in favour.
2. **Ten options have nothing to say.** *"10 other options have no documented finding in favour on
   what you picked … they are not ruled out; we simply have nothing to say about them here."*
3. **Named unknowns on every card.** ChatGPT's reads *"We have not established: Whether OpenAI
   distributes profits at all, and so whether the Foundation's stake ever pays out."*
4. **The pilot's own framing.** The header carries `ONE CATEGORY · RESEARCHED PILOT` and states
   *"There is no overall score here and nothing has been tested for quality."*
5. **Some coverage is second-hand.** The asterisk on ChatGPT's *"Some no-cost entry path"* tag
   marks a capability confirmed only from secondary sources.

## One thing a designer should know

The header reads *"Preferences for this page are set below"* rather than showing site-wide
settings, because this page holds its own state. That is intentional and not placeholder text.

## Reproducing

The capture script is not committed — it lives outside the repo and drives the live site through
headless Chrome. To recapture, open the URL, expand *"Who am I empowering with this choice?"*,
tick the two preferences named above, and screenshot at 1440 × 900 with a device pixel ratio of 2.
