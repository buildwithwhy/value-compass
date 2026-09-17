// ---------------------------------------------------------------------------
// build-evidence.mjs — derives src/data/evidence.json from the existing
// makers.json / funders.json records.
//
// It invents nothing. It only CLASSIFIES what each axis rationale already
// rests on, so the app can tell four things apart:
//   1. sourced fact           2. ValueCompass assessment
//   3. unknown / unverified   4. visitor preference
//
// Every classification records the rule that fired, so it is reviewable and
// re-runnable:  node scripts/build-evidence.mjs
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const makersFile = read('src/data/makers.json')
const fundersFile = read('src/data/funders.json')
const makers = makersFile.makers

// ---------------------------------------------------------------------------
// 1. Background sources — cited across many makers as sector context. They are
//    real sources, but they are not evidence ABOUT the maker they hang off.
//    FMTI is the exception: it IS entity evidence for the firms it scored, and
//    background for the makers whose own note says they were not scored.
// ---------------------------------------------------------------------------

const BACKGROUND = {
  'https://blogs.lse.ac.uk/medialse/2025/11/14/the-perilous-future-of-ai-work-in-the-global-south/':
    'Sector background on Global-South AI data work — not specific to any one maker.',
  'https://www.brookings.edu/articles/reimagining-the-future-of-data-and-ai-labor-in-the-global-south':
    'Sector background on Global-South AI data labour — not specific to any one maker.',
  'https://www.effectivealtruism.org/articles/cullen-okeefe-the-windfall-clause-sharing-the-benefits-of-advanced-ai':
    'Conceptual reference (the Windfall Clause proposal) — not a record of any maker’s commitments.',
}

const FMTI_SOURCES = [
  'https://crfm.stanford.edu/fmti/December-2025/index.html',
  'https://hai.stanford.edu/news/transparency-in-ai-is-on-the-decline',
  'https://arxiv.org/html/2512.10169v1',
]

const NOT_IN_FMTI = /not (in )?fmti|not fmti-scored|not a foundation-model developer/i

// ---------------------------------------------------------------------------
// 2. Rationale classification.
// ---------------------------------------------------------------------------

// The rationale establishes only that nobody has published anything.
const NON_DISCLOSURE = [
  /no public disclosure/i,
  /\bno (public )?(esg |labour |environmental )?(disclosure|information)\b/i,
  /not disclosed/i,
  /undisclosed/i,
  /\bopaque\b/i,
  /little (public|esg) (information|detail)/i,
  /publishes little/i,
  /(minimal|limited|little) .{0,24}disclosure/i,
  /little (direct|visibility)/i,
  /no model or data disclosure/i,
  /discloses almost nothing/i,
]

// The rationale points at something that actually happened or is on record.
const AFFIRMATIVE = [
  /sued|lawsuit|litigation|class action|clean air act/i,
  /documented/i,
  /~?\$[\d.]+ ?\/? ?(hr|hour|b\b|m\b)/i,
  /\b\d+(\.\d+)?%/i,
  /fmti 2025 (score|middle|found)|fmti 2025 \(|score (fell|halved)|tied for the lowest|lowest score|rose to|declined ~|score halved/i,
  /\b(pbc|long-term benefit trust|giving pledge|pledge 1%|b corp)\b/i,
  /publishes (an |a |mature|model cards)/i,
  /released|releases|ships|shipping|gives models away/i,
  /recapitaliz|scrapped|pivoted|conversion/i,
  /operated dozens|complaints reported|allegations|turmoil|departures|board crisis|reporting\b/i,
  /wholly owned|voting control|supermajority|controls|retains|holds/i,
  /widely held/i,
  /runs cohere for ai|nonprofit open research lab/i,
  /pays a large contributor community/i,
  /free tier|paid-only|paid\/closed|paid product|free education/i,
  /consent and provenance tooling|safety\/consent tooling/i,
]

// The rationale reasons from where the company is or what layer it sits on,
// rather than from anything observed about the company itself.
const CONTEXTUAL = [
  { re: /eu (context|labour norms)|stronger eu/i, what: 'EU jurisdiction' },
  { re: /chinese data-labour context|prc|china-based/i, what: 'Chinese jurisdiction' },
  { re: /inherited (exposure|conditions)|depends on frontier|upstream labour it does not control|inherits upstream/i, what: 'sits on top of another maker’s models' },
  { re: /similar to \w+/i, what: 'analogy to another maker' },
  { re: /young(,| ) .{0,20}startup|very young|fast-scaling startup|tiny profitable team|lean, profitable, small team|smaller footprint/i, what: 'company size / age' },
  { re: /quant-fund parent culture/i, what: 'parent-company sector' },
  { re: /no major culture scandals|no notable workplace scandal|no major documented abuses/i, what: 'absence of reported incidents' },
]

// ---------------------------------------------------------------------------
// Claim review — two separate questions, deliberately not collapsed.
//
//   claim_support       Does the cited material directly establish a narrow
//                       FACT about this maker?
//   justifies_whole     Does that fact, under a scoring rule that actually
//                       exists in the rubric, justify the whole 0–4 axis score?
//
// A source can settle a narrow fact without licensing a broad score. Those
// facts are preserved and displayed either way — they are the material a
// narrower, conditional recommendation could later rest on.
//
// Only ONE axis carries an explicit whole-axis rule. rubric.md §1:
//   "External anchor — Stanford FMTI 2025 (use directly where it exists) …
//    Map FMTI/100 → 0–4"
// with the bands recorded in makers.json _meta.key_anchors.transparency
// (0=<=12, 1=13-29, 2=30-49, 3=50-74, 4=>=75).
//
// No other axis has an aggregation rule. Culture/ESG, labour, wealth
// dispersion and public sharing each list four or five sub-indicators and say
// nothing about how one combines into a score. Evidence for one sub-indicator
// therefore cannot settle the axis, and we do not invent a rule to let it.
//
// provenance is 'automated_provisional' throughout: these classifications were
// produced by reading the recorded rationale against the rubric, not by a human
// re-reading the sources. Nothing here is labelled human-reviewed.
// ---------------------------------------------------------------------------

const NO_RULE =
  'None. The rubric lists sub-indicators for this axis but states no rule for combining them into a 0–4 score.'
const FMTI_RULE =
  'rubric.md §1 — "External anchor: Stanford FMTI 2025 (use directly where it exists) … Map FMTI/100 → 0–4", with bands in makers.json _meta.key_anchors.transparency.'
const FMTI_DATE = 'December 2025 (FMTI 2025 edition)'
const NOT_STATED = 'not stated in record'

const R = (o) => ({ provenance: 'automated_provisional', ...o })

const CLAIM_REVIEW = {
  // ---- Transparency: the one axis with a whole-axis rule -----------------
  // Justified where the FMTI value the rule consumes is actually transcribed.
  'xAI/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact: 'xAI scored 14/100 in FMTI 2025, tied lowest of the firms scored.',
    source_date: FMTI_DATE,
    unsupported_clauses: [],
    scoring_rule: FMTI_RULE,
    justifies_whole: true,
    justification_note: 'Recorded value 14 falls in band 13–29 → 1. Recorded score is 1.',
  }),
  'Midjourney/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact: 'Midjourney scored 14/100 in FMTI 2025, tied lowest of the firms scored.',
    source_date: FMTI_DATE,
    unsupported_clauses: ['"no model or data disclosure" — a broader claim than the index value'],
    scoring_rule: FMTI_RULE,
    justifies_whole: true,
    justification_note: 'Recorded value 14 falls in band 13–29 → 1. Recorded score is 1.',
  }),
  'Mistral/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact: 'Mistral scored 18/100 in FMTI 2025, down more than two-thirds.',
    source_date: FMTI_DATE,
    unsupported_clauses: [],
    scoring_rule: FMTI_RULE,
    justifies_whole: true,
    justification_note: 'Recorded value 18 falls in band 13–29 → 1. Recorded score is 1.',
  }),
  'Meta/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact: 'Meta’s FMTI score fell from 60 to 31 between the 2024 and 2025 editions.',
    source_date: FMTI_DATE,
    unsupported_clauses: [
      '"released no technical report for Llama 4"',
      '"now also shipping the closed-weight Muse Spark"',
    ],
    scoring_rule: FMTI_RULE,
    justifies_whole: true,
    justification_note: 'Recorded value 31 falls in band 30–49 → 2. Recorded score is 2.',
  }),

  // Same rule, but the value it consumes is not transcribed — only a
  // qualitative position. Mapping "middle group" to a band is a judgement the
  // rule does not make, so the score is unresolved until the number is recorded.
  'Anthropic/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'Anthropic was the highest-scoring frontier lab in FMTI 2025, rising to 2nd of the six longitudinal firms.',
    source_date: FMTI_DATE,
    unsupported_clauses: ['"opaque on data/compute/environment" — not carried by the index position'],
    scoring_rule: FMTI_RULE,
    justifies_whole: false,
    justification_note:
      'Attempted 2026-09-17 across the index page, the arXiv HTML, the Stanford HAI article and the 49-page paper PDF. None states Anthropic’s numeric score; the paper reports only the middle-group average of 36 and a rank. The rule maps a number to a band, so it cannot be applied. Not resolvable from the cited sources.',
  }),
  'OpenAI/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'OpenAI placed in the FMTI 2025 middle group, down roughly 14 points year on year.',
    source_date: FMTI_DATE,
    unsupported_clauses: ['"limited o3 disclosure"'],
    scoring_rule: FMTI_RULE,
    justifies_whole: false,
    justification_note:
      'Attempted 2026-09-17 across all four cited sources. The paper and index report OpenAI’s decline of 14 points and its rank, never the 2025 score. Not resolvable from the cited sources.',
  }),
  'Google DeepMind/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact: 'Google DeepMind placed in the FMTI 2025 middle group.',
    source_date: FMTI_DATE,
    unsupported_clauses: ['"criticized for delayed Gemini model cards/technical reports"'],
    scoring_rule: FMTI_RULE,
    justifies_whole: false,
    justification_note:
      'Attempted 2026-09-17 across all four cited sources. Google appears only in the middle-group list (average 36); no numeric score is stated. Not resolvable from the cited sources.',
  }),
  // Verified 2026-09-17 against the cited index page, which states DeepSeek's
  // score numerically. The band mapping can now be checked.
  'DeepSeek/transparency': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'DeepSeek scored 32/100 in the 2025 FMTI, its first year in the index. The score is attached to its flagship DeepSeek-R1.',
    source_date: FMTI_DATE,
    unsupported_clauses: ['"opaque on data and training" — a broader claim than the index value'],
    scoring_rule: FMTI_RULE,
    justifies_whole: true,
    justification_note:
      'Verified 2026-09-17 from crfm.stanford.edu/fmti/December-2025/index.html, which states DeepSeek 32. Band 30–49 → 2. Recorded score is 2.',
  }),

  // ---- Axes with no aggregation rule -------------------------------------
  // Narrow facts established and preserved; whole-axis scores unresolved.
  'xAI/culture_esg': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'xAI operated unpermitted gas turbines at its Memphis site and was sued under the Clean Air Act by the NAACP, SELC and Earthjustice.',
    source_date: NOT_STATED,
    unsupported_clauses: [
      'Sub-indicator 1 — employee treatment and retention: no evidence on record',
      'Sub-indicator 3 — governance quality: no evidence on record',
      'Sub-indicator 4 — mission integrity: no evidence on record',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'The finding is serious, documented and sourced, and it sits squarely in sub-indicator 2 (environmental footprint and disclosure). The rubric lists four sub-indicators for this axis and gives no rule permitting one of them to set the axis score, so a 0/4 — "worst-in-class" across all four — is not licensed by this evidence. The narrow finding stands; the whole-axis score is unresolved. No replacement score is proposed.',
  }),
  'Anthropic/wealth_dispersion': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'Amazon holds roughly 15–19% and Google roughly 14% of Anthropic’s economics.',
    source_date: '2026-06-04 (from the cited URL path)',
    unsupported_clauses: [
      'Sub-indicator 1 — founder/insider voting control',
      'Sub-indicator 3 — employee equity breadth',
      'Sub-indicator 4 — pay dispersion',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'Backer concentration (sub-indicator 2) is directly evidenced. Three of four sub-indicators are not, and no rule combines them.',
  }),
  'OpenAI/wealth_dispersion': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'After the October 2025 recapitalisation the OpenAI Foundation holds ~26% and controls the board, Microsoft ~27%, and ~47% sits with employees and investors.',
    source_date: '2025-10-28 (from the cited URL path)',
    unsupported_clauses: [
      'Sub-indicator 3 — employee equity breadth',
      'Sub-indicator 4 — pay dispersion',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'The strongest non-FMTI case in the set: sub-indicators 1 and 2 are both directly evidenced by a primary source and contemporaneous reporting. Two sub-indicators remain unevidenced and no rule combines them, so the score is unresolved rather than justified.',
  }),
  'OpenAI/public_sharing': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'OpenAI removed the capped-profit mechanism in the October 2025 restructuring; the nonprofit Foundation retains ~26% and board control.',
    source_date: '2025-10-28 (from the cited URL path)',
    unsupported_clauses: [
      'Sub-indicator 3 — affordable / free access',
      'Sub-indicator 4 — public-interest outputs',
    ],
    scoring_rule:
      'rubric.md §5 states a weighting instruction ("weight legally binding structures far above PR pledges") but no rule producing a 0–4 from it.',
    justifies_whole: false,
    justification_note:
      'Structural commitments (sub-indicator 1) are directly evidenced. The weighting instruction ranks kinds of evidence; it does not map them to a score.',
  }),
  'Midjourney/labour_integrity': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'Midjourney was sued by Disney and Universal in June 2025, and by an artists’ class action in 2023, over training on creators’ work without compensation.',
    source_date: '2025-06-11 (from the cited URL paths)',
    unsupported_clauses: [
      'Sub-indicator 1 — data-worker wages and conditions',
      'Sub-indicator 2 — content-moderation mental-health support',
      'Sub-indicator 3 — supply-chain visibility',
    ],
    scoring_rule:
      'rubric.md §3 caveat: "Image/music/voice makers carry the creator-consent sub-indicator most heavily (active litigation is the signal)." A weighting statement, not an aggregation rule.',
    justifies_whole: false,
    justification_note:
      'The closest call outside transparency. The rubric does say this sub-indicator weighs most heavily for image makers and names litigation as the signal — but "most heavily" is not "determines the axis", and three sub-indicators have no evidence. Worth a human decision on whether §3 should be tightened into a rule.',
  }),
  // Source read 2026-09-17. It narrows the claim in three ways at once.
  'Canva/public_sharing': R({
    claim_support: 'establishes_fact',
    supported_fact:
      'In September 2021 Melanie Perkins and Cliff Obrecht committed to give 30% of Canva to the Canva Foundation, a charitable entity. The source describes a pledge, not a binding legal structure.',
    source_date: '2021-09-20, updated 2021-10-05 (stated on the page)',
    unsupported_clauses: [
      '"free education/nonprofit tiers" — the page does not mention them. It says Canva works with 60,000 schools and 130,000 non-profits, which is a customer count, not a free-tier commitment.',
      'Sub-indicator 1 — structural commitments',
      'Sub-indicator 4 — public-interest outputs',
    ],
    scoring_rule:
      'rubric.md §5 — "Critical scoring rule — binding vs soft. Weight legally binding structures (trust/PBC/charter) far above PR pledges." §5 also defines 4 as "binding structures … + broad affordable or free access + public-interest releases".',
    justifies_whole: false,
    justification_note:
      'Reviewed 2026-09-17 against the cited source. Three problems, and the aggregation question is the least of them. (1) The source calls this a pledge; §5 explicitly weights pledges below binding structures, and 4 is defined as the binding tier. (2) The access clause that a 4 also requires is not in the source at all. (3) The commitment is five years old with no evidence of execution on the page beyond a $10M pilot donation. The supported fact is preserved and dated. No replacement score is proposed — the correct next step is a human re-score against §5, not an automated one.',
  }),

  // ---- Partial claim support ---------------------------------------------
  // The source covers one clause of a multi-clause rationale. Where a narrow
  // fact is nonetheless established, it is preserved.
  'Anthropic/culture_esg': R({
    claim_support: 'partial',
    supported_fact:
      'FMTI 2025 records no environmental disclosure from Anthropic, in line with its peers.',
    source_date: FMTI_DATE,
    unsupported_clauses: [
      '"strong mission-aligned culture"',
      '"unusually robust governance (PBC + Long-Term Benefit Trust)"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'FMTI measures disclosure, not culture or governance quality, which is what most of a 3/4 rests on.',
  }),
  'OpenAI/culture_esg': R({
    claim_support: 'partial',
    supported_fact:
      'OpenAI completed its contested for-profit restructuring in October 2025.',
    source_date: '2025-10-28 (from the cited URL path)',
    unsupported_clauses: [
      '"2023 board crisis"',
      '"safety-team departures"',
      '"environmental non-disclosure"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note: 'One clause of four is sourced.',
  }),
  'Meta/culture_esg': R({
    claim_support: 'partial',
    supported_fact: 'Yann LeCun departed Meta’s AI organisation in 2025.',
    source_date: NOT_STATED,
    unsupported_clauses: [
      '"Llama 4 benchmark-integrity allegations"',
      '"$100M poaching"',
      '"founder voting control"',
      '"corporate sustainability reporting exists"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note: 'One clause of five is sourced.',
  }),
  'Meta/public_sharing': R({
    claim_support: 'partial',
    supported_fact:
      'Meta released Muse Spark, a closed-weight frontier model, in April 2026.',
    source_date: '2026-04-08 (from the cited URL path)',
    unsupported_clauses: [
      '"still releases Llama as open weights"',
      '"no profit-sharing commitment"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'The pivot is sourced; the open-weight releases the score balances it against are not.',
  }),
  'Canva/culture_esg': R({
    claim_support: 'partial',
    supported_fact: 'Canva participates in Pledge 1%.',
    source_date: NOT_STATED,
    unsupported_clauses: [
      '"strong workplace and social reputation"',
      '"comparatively light emitter"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note: 'The pledge is sourced; the workplace and emissions clauses are not.',
  }),
  'Canva/wealth_dispersion': R({
    claim_support: 'none',
    supported_fact: null,
    source_date: NOT_STATED,
    unsupported_clauses: [
      '"founder stakes significant"',
      '"broad employee ownership"',
      '"a wide investor base"',
    ],
    scoring_rule: NO_RULE,
    justifies_whole: false,
    justification_note:
      'The cited source is the equity pledge page. It speaks to neither the cap table nor employee ownership, so it establishes no fact on this axis.',
  }),
}

// Hand-checked exceptions: the cited source is about this maker, but not about
// the claim it is attached to. Read each source before adding a line here.
const SOURCE_MISMATCH = {
  'DeepSeek/public_sharing':
    'The cited source reports the 2026 funding round. It does not document the open-weight releases or the pricing the score rests on.',
  'Cohere/public_sharing':
    'The cited source reports the Aleph Alpha merger financing. It does not document Cohere For AI or the Aya releases the score rests on.',
  'Google DeepMind/culture_esg':
    'The cited sources are the Stanford transparency index. They do not document the Alphabet sustainability reporting or the dual-class voting the score rests on.',
}

function classifyAxis(maker, axisKey, axis) {
  const note = axis.note ?? ''
  const sources = axis.sources ?? []
  const notInFmti = NOT_IN_FMTI.test(note)

  const mismatch = SOURCE_MISMATCH[`${maker.id}/${axisKey}`]
  const background = []
  const entity = []
  for (const s of sources) {
    if (BACKGROUND[s]) background.push({ url: s, why: BACKGROUND[s] })
    else if (FMTI_SOURCES.includes(s) && notInFmti)
      background.push({
        url: s,
        why: 'Stanford FMTI 2025 — this maker was not among the firms it scored, so it is context, not a measurement of this maker.',
      })
    else if (mismatch) background.push({ url: s, why: mismatch })
    else entity.push(s)
  }

  const nonDisclosure = NON_DISCLOSURE.some((re) => re.test(note))
  const affirmative = AFFIRMATIVE.some((re) => re.test(note))
  const contextual = CONTEXTUAL.filter((c) => c.re.test(note))

  let basis
  let rule
  if (nonDisclosure && !affirmative) {
    basis = 'not_established'
    rule =
      'Our research record contains no finding for this maker on this axis — only an observation that we did not locate disclosure. It does not establish the scope or date of any non-disclosure.'
  } else if (!affirmative && contextual.length) {
    basis = 'contextual'
    rule = `The rationale reasons from ${contextual.map((c) => c.what).join(' and ')} rather than from evidence about this maker.`
  } else if (entity.length > 0) {
    basis = 'sourced'
    rule = 'The rationale points at something on record and carries at least one source about this maker.'
  } else {
    basis = 'unsourced'
    rule = 'The rationale points at something on record, but no source about this maker is attached.'
  }

  // Display rule. A score we cannot establish is withheld from the compass and
  // the matrix. The recorded value is kept and shown on request.
  const withheld = basis === 'not_established'

  // ---- The single eligibility rule -------------------------------------
  // One gate for ordering, comparison markers, switching differences and any
  // future recommendation. Two conditions, both required:
  //
  //   1. relevant, traceable support for the actual claim  (basis 'sourced'
  //      means at least one source about this maker survived the background
  //      and mismatch filters);
  //   2. an assessment justified by that support           (claim support
  //      reviewed as 'direct', not one clause of a five-clause rationale).
  //
  // Confidence is NOT part of the gate. An A/B flag records how sure the
  // author felt; it is not evidence, and on its own it cannot qualify a score
  // to move another company up or down.
  const review =
    CLAIM_REVIEW[`${maker.id}/${axisKey}`] ??
    (basis === 'sourced'
      ? {
          claim_support: 'unreviewed',
          supported_fact: null,
          source_date: NOT_STATED,
          unsupported_clauses: [],
          scoring_rule: NO_RULE,
          justifies_whole: false,
          justification_note:
            'A source about this maker is cited, but the fit between source and claim has not been reviewed.',
          provenance: 'automated_provisional',
        }
      : {
          claim_support: 'none',
          supported_fact: null,
          source_date: NOT_STATED,
          unsupported_clauses: [],
          scoring_rule: NO_RULE,
          justifies_whole: false,
          justification_note: 'No source about this maker to review.',
          provenance: 'automated_provisional',
        })

  // Two conditions, kept separate on purpose. A source can settle a narrow
  // fact (claim_support) without licensing a 0–4 axis score (justifies_whole).
  const decisionEligible =
    basis === 'sourced' && review.claim_support === 'establishes_fact' && review.justifies_whole

  return {
    maker: maker.id,
    axis: axisKey,
    recorded_score: axis.score,
    confidence: axis.confidence,
    basis,
    rule,
    withheld,
    claim_support: review.claim_support,
    supported_fact: review.supported_fact,
    source_date: review.source_date,
    unsupported_clauses: review.unsupported_clauses,
    scoring_rule: review.scoring_rule,
    justifies_whole: review.justifies_whole,
    justification_note: review.justification_note,
    provenance: review.provenance,
    decision_eligible: decisionEligible,
    entity_sources: entity,
    background_sources: background,
    context_used: contextual.map((c) => c.what),
  }
}

const axisEvidence = {}
const rows = []
for (const m of makers) {
  axisEvidence[m.id] = {}
  for (const [k, axis] of Object.entries(m.axes)) {
    const e = classifyAxis(m, k, axis)
    rows.push(e)
    axisEvidence[m.id][k] = {
      basis: e.basis,
      rule: e.rule,
      withheld: e.withheld,
      claim_support: e.claim_support,
      supported_fact: e.supported_fact,
      source_date: e.source_date,
      unsupported_clauses: e.unsupported_clauses,
      scoring_rule: e.scoring_rule,
      justifies_whole: e.justifies_whole,
      justification_note: e.justification_note,
      provenance: e.provenance,
      decision_eligible: e.decision_eligible,
      entity_sources: e.entity_sources,
      background_sources: e.background_sources,
      context_used: e.context_used,
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Backer-association verification status — notable_for with no source is
//    unverified, and must not read as an established fact.
// ---------------------------------------------------------------------------

const funderEvidence = {}
for (const f of fundersFile.funders) {
  const notable = f.notable_for ?? []
  if (!notable.length) continue
  const sourced = (f.reputation_sources ?? []).length > 0
  funderEvidence[f.name] = {
    associations_status: sourced ? 'partially_sourced' : 'unverified',
    source_count: (f.reputation_sources ?? []).length,
    claim_count: notable.length,
  }
}

// ---------------------------------------------------------------------------
// 3b. Absence evidence.
//
// An authored `false` in capital_profile is a value someone typed. It is not
// evidence that the attribute is absent, and a scope sentence written by us is
// not evidence either — it describes the claim, it does not support it.
//
// To record a documented absence, an entry needs all three:
//
//   source        something that examined the question and reported nothing
//   scope         what was actually covered (which entities, which filings)
//   as_of         the date that coverage runs to — an absence is always
//                 "as of" a date; it decays
//
// plus `attribution`, because these are different claims:
//   'self_report'  the company says it has no such holder
//   'independent'  a third party checked and found none
//
// This table is EMPTY. The dataset contains no absence evidence meeting the
// bar, and none is invented to fill it. Every authored `false` therefore
// resolves to unknown for decision purposes, with the recorded value preserved
// and shown for review. Adding a real entry here is a one-line editorial act.
//
//   'xAI/founder_control': {
//     source: 'https://…', scope: '…', as_of: 'YYYY-MM-DD',
//     attribution: 'independent', note: '…',
//   },
// ---------------------------------------------------------------------------

const ABSENCE_EVIDENCE = {}

const ABSENCE_ATTRIBUTES = [
  'founder_control',
  'competitor_entanglement',
  'index_held',
  'sovereign_state',
  'big_tech_capital',
  'circular_vendor',
]

const absenceEvidence = {}
for (const m of makers) {
  for (const attr of ABSENCE_ATTRIBUTES) {
    const entry = ABSENCE_EVIDENCE[`${m.id}/${attr}`]
    if (!entry) continue
    if (!entry.source || !entry.scope || !entry.as_of || !entry.attribution) {
      throw new Error(
        `absence evidence for ${m.id}/${attr} is missing source, scope, as_of or attribution`,
      )
    }
    absenceEvidence[`${m.id}/${attr}`] = entry
  }
}

// ---------------------------------------------------------------------------
// 4. Funding relationships.
//
// The graph draws one kind of line for "backs". That flattens an equity stake,
// an announced commitment that has not closed, a supplier who is also an
// investor, and outright ownership into the same claim. Below, every entry is
// transcribed VERBATIM from the record that already states it — nothing here is
// new information, it is the existing text made machine-readable.
//
//   type    what the relationship is
//   status  completed | announced | pending | contingent | unspecified
//   as_of   the date the record itself states, or null. Never inferred.
// ---------------------------------------------------------------------------

const REL = (funder, maker, o) => ({ funder, maker, ...o })

const relationships = [
  REL('Alphabet / Google', 'Google DeepMind', {
    type: 'outright_ownership',
    status: 'completed',
    as_of: null,
    quote: 'Alphabet (wholly owned)',
    quoted_from: 'makers.json → Google DeepMind.lead_backers',
  }),
  REL('Alphabet / Google', 'Anthropic', {
    type: 'equity_investment',
    status: 'completed',
    voting: 'none_stated',
    as_of: null,
    quote: 'Anthropic ~14%, capped 15%, no votes/board',
    quoted_from: 'funders.json → Alphabet / Google.flag',
  }),
  REL('Amazon', 'Anthropic', {
    type: 'equity_investment',
    status: 'completed',
    as_of: null,
    quote: 'Largest Anthropic investor (~$8B in, ~$74B paper)',
    quoted_from: 'funders.json → Amazon.also_funds',
  }),
  REL('Amazon', 'OpenAI', {
    type: 'funding_commitment',
    status: 'contingent',
    as_of: '2026-02',
    quote:
      'committed up to $50B to OpenAI in Feb 2026 ($15B initial + $35B contingent on an OpenAI IPO/listing), bundled with AWS Trainium compute',
    quoted_from: 'funders.json → Amazon.also_funds',
  }),
  REL('Microsoft', 'OpenAI', {
    type: 'equity_investment',
    status: 'completed',
    as_of: null,
    quote: '~$13B+ into OpenAI (~27%)',
    quoted_from: 'funders.json → Microsoft.also_funds',
  }),
  REL('Microsoft', 'Anthropic', {
    type: 'unspecified',
    status: 'unspecified',
    as_of: null,
    quote: 'a committed Anthropic backer',
    quoted_from: 'funders.json → Microsoft.also_funds',
  }),
  REL('Microsoft', 'Mistral', {
    type: 'equity_investment',
    status: 'completed',
    as_of: '2024',
    quote: 'a minor ~$16M strategic stake in Mistral (2024, Azure partnership)',
    quoted_from: 'funders.json → Microsoft.also_funds',
  }),
  REL('ASML', 'Mistral', {
    type: 'equity_investment',
    status: 'completed',
    voting: 'board_presence_stated',
    as_of: null,
    quote: 'largest Mistral shareholder (~11%, €1.3B); CFO on strategic committee',
    quoted_from: 'funders.json → ASML.flag',
  }),
  REL('High-Flyer', 'DeepSeek', {
    type: 'controlling_stake',
    status: 'completed',
    as_of: null,
    quote: 'CONTROLLING parent of DeepSeek (founder Liang Wenfeng ~89.5%)',
    quoted_from: 'funders.json → High-Flyer.flag',
  }),
  REL('Tencent', 'DeepSeek', {
    type: 'equity_investment',
    status: 'pending',
    as_of: '2026-06',
    quote:
      'first-ever external round (~$7.4B led by Tencent & CATL, with the state-backed National AI Industry Fund) near closing as of June 2026',
    quoted_from: 'makers.json → DeepSeek.structure',
  }),
  REL('Nvidia', 'Anthropic', {
    type: 'commercial_dependency',
    status: 'completed',
    as_of: null,
    quote: 'its Anthropic check was tied to $30B Azure spend + Nvidia hardware purchases',
    quoted_from: 'funders.json → Nvidia.flag',
  }),
  REL('Saudi PIF / Humain', 'xAI', {
    type: 'equity_investment',
    status: 'completed',
    as_of: null,
    quote: '$3B into xAI Series E (now SpaceX shares)',
    quoted_from: 'funders.json → Saudi PIF / Humain.flag',
  }),
  REL('Thrive Capital', 'OpenAI', {
    type: 'equity_investment',
    status: 'completed',
    as_of: '2025-12',
    quote: 'OpenAI: $29B → $285B; OpenAI took a reciprocal stake in Thrive Holdings (Dec 2025)',
    quoted_from: 'funders.json → Thrive Capital.flag',
  }),
  REL('NFDG (Nat Friedman & Daniel Gross)', 'Perplexity', {
    type: 'equity_investment',
    status: 'completed',
    as_of: '2025',
    quote:
      'In mid-2025 Meta hired both partners to co-lead Meta Superintelligence Labs and bought a stake (up to ~49%) in NFDG’s holdings; the fund stopped making new investments.',
    quoted_from: 'funders.json → NFDG.also_funds',
  }),
  REL('NFDG (Nat Friedman & Daniel Gross)', 'ElevenLabs', {
    type: 'equity_investment',
    status: 'completed',
    as_of: '2025',
    quote:
      'In mid-2025 Meta hired both partners to co-lead Meta Superintelligence Labs and bought a stake (up to ~49%) in NFDG’s holdings; the fund stopped making new investments.',
    quoted_from: 'funders.json → NFDG.also_funds',
  }),
]

for (const target of ['Microsoft', 'Alphabet/Google', 'Amazon', 'Nvidia', 'Meta']) {
  relationships.push(
    REL('Index managers (Vanguard / BlackRock / State Street)', target, {
      type: 'passive_economic',
      status: 'completed',
      as_of: null,
      quote:
        'they passively own ~5-10% each of every public anchor (Microsoft, Alphabet, Amazon, Nvidia, Meta)',
      quoted_from: 'funders.json → Index managers.also_funds',
    }),
  )
}

const relationshipIndex = {}
for (const r of relationships) {
  relationshipIndex[`${r.funder}→${r.maker}`] = r
}

// Any funder→maker edge without a transcribed entry above is recorded as
// "type not specified in this dataset" rather than silently reading as equity.
let edgesTotal = 0
for (const f of fundersFile.funders) {
  const ids = new Set([...(f.makers_backed ?? []), ...(f.owns_outright ?? [])])
  for (const id of ids) {
    edgesTotal++
    const key = `${f.name}→${id}`
    if (!relationshipIndex[key] && (f.owns_outright ?? []).includes(id)) {
      relationshipIndex[key] = {
        funder: f.name,
        maker: id,
        type: 'outright_ownership',
        status: 'completed',
        as_of: null,
        quote: null,
        quoted_from: 'funders.json → owns_outright',
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Report
// ---------------------------------------------------------------------------

const count = (pred) => rows.filter(pred).length
const byBasis = {}
for (const r of rows) byBasis[r.basis] = (byBasis[r.basis] ?? 0) + 1

const summary = {
  axis_records: rows.length,
  by_basis: byBasis,
  withheld: count((r) => r.withheld),
  decision_eligible: count((r) => r.decision_eligible),
  establishes_fact: count((r) => r.claim_support === 'establishes_fact'),
  claim_support_partial: count((r) => r.claim_support === 'partial'),
  claim_support_unreviewed: count((r) => r.claim_support === 'unreviewed'),
  facts_preserved_without_eligible_score: count(
    (r) => r.supported_fact != null && !r.decision_eligible,
  ),
  human_reviewed: count((r) => r.provenance === 'human_reviewed'),
  no_sources_at_all: count((r) => r.entity_sources.length === 0 && r.background_sources.length === 0),
  background_only: count((r) => r.entity_sources.length === 0 && r.background_sources.length > 0),
  confidence_c: count((r) => r.confidence === 'C'),
  recorded_na: count((r) => r.recorded_score === 'n/a' || r.recorded_score === null),
  funders_with_unverified_associations: Object.values(funderEvidence).filter(
    (f) => f.associations_status === 'unverified',
  ).length,
  funders_with_associations: Object.keys(funderEvidence).length,
  absence_evidence_records: Object.keys(absenceEvidence).length,
  funder_maker_edges: edgesTotal,
  edges_with_transcribed_detail: Object.keys(relationshipIndex).length,
}

const out = {
  _meta: {
    title: 'Value Compass — evidence classification',
    generated_by: 'scripts/build-evidence.mjs (re-run after editing makers.json / funders.json)',
    what_this_is:
      'A derived layer. It adds no facts. For every recorded axis assessment it records what the written rationale rests on, which of its sources are about that maker, and whether the score may be shown or compared.',
    display_rule:
      'Where our research record contains no finding for a maker on an axis, no score is shown. The recorded value is preserved and shown on request. We do not state that the maker published nothing — only that we have not established it.',
    eligibility_rule:
      'One rule governs ordering, comparison markers, switching differences and any recommendation: the assessment must carry relevant, traceable support for the actual claim (a source about this maker that covers what the score rests on), and the assessment must be justified by that support. Confidence A or B alone is not sufficient. A single authoritative source can carry a narrow factual claim; the number of sources does not determine quality.',
    bases: {
      sourced: 'Rationale points at something on record and cites a source about this maker.',
      unsourced: 'Rationale points at something on record, but no source about this maker is attached.',
      contextual: 'Rationale reasons from jurisdiction, company size or position in the stack, not from evidence about this maker.',
      not_established: 'Our research has not established a finding for this maker on this axis.',
    },
    claim_support: {
      establishes_fact: 'The cited material directly establishes a narrow fact about this maker. The fact is preserved and displayed whether or not the axis score is eligible.',
      partial: 'The cited material covers part of a multi-part rationale. Any narrow fact it does establish is preserved.',
      unreviewed: 'A source about this maker is cited, but the fit between source and claim has not been reviewed.',
      none: 'No source about this maker to review.',
    },
    score_justification_rule:
      'A narrow fact justifies a whole 0–4 axis score only under a scoring rule that exists in the rubric. Transparency has one (the FMTI anchor and its band mapping). No other axis does: each lists sub-indicators and states no rule for combining them, so evidence for one sub-indicator cannot settle the axis. We do not write a rule after the fact to keep a score eligible.',
    provenance_note:
      'Every classification here is automated_provisional: produced by reading the recorded rationale against the rubric, not by a human re-reading the sources. None is marked human-reviewed.',
    summary,
  },
  relationship_types: {
    outright_ownership: 'Wholly owned by this entity.',
    controlling_stake: 'A stake the record describes as controlling.',
    equity_investment: 'Money invested for a stake. Not by itself control.',
    funding_commitment: 'Money announced or committed. Check the status field for whether it has been paid.',
    commercial_dependency: 'An investor who is also a supplier or customer of the maker.',
    passive_economic: 'Index-fund ownership of a public parent. Economic exposure, exercised through routine governance votes.',
    unspecified: 'This dataset records a backing relationship but not what kind.',
  },
  relationship_statuses: {
    completed: 'The record describes this as done.',
    announced: 'Announced. The record does not say it has closed.',
    pending: 'The record describes it as not yet closed.',
    contingent: 'Part or all of it depends on a future event.',
    unspecified: 'The record does not say.',
  },
  absence_evidence_requirements: {
    what_counts:
      'A documented absence needs a source that examined the question, an explicit scope, and a date the coverage runs to. An authored false value is not evidence, and a scope sentence written by us describes a claim rather than supporting it.',
    attribution: {
      self_report: 'The company states there is no such holder.',
      independent: 'A third party checked and found none.',
    },
    current_count: Object.keys(absenceEvidence).length,
  },
  absence_evidence: absenceEvidence,
  background_sources: BACKGROUND,
  axis_evidence: axisEvidence,
  funder_association_status: funderEvidence,
  relationships: relationshipIndex,
}

writeFileSync(join(root, 'src/data/evidence.json'), JSON.stringify(out, null, 2) + '\n')

// ---------------------------------------------------------------------------
// 6. Emit the claim-review table as markdown, so the report cannot drift from
//    the classifications the app actually uses.
// ---------------------------------------------------------------------------

const esc = (v) => String(v ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const reviewed = rows
  .filter((r) => r.claim_support === 'establishes_fact' || r.claim_support === 'partial')
  .sort((a, b) =>
    Number(b.decision_eligible) - Number(a.decision_eligible) ||
    a.maker.localeCompare(b.maker) ||
    a.axis.localeCompare(b.axis),
  )

const md = [
  '# Claim review',
  '',
  '<!-- Generated by scripts/build-evidence.mjs. Do not edit by hand. -->',
  '',
  'Two questions, kept apart. **Claim support** asks whether the cited material',
  'directly establishes a narrow fact. **Justifies whole score** asks whether that',
  'fact licenses the 0–4 axis score under a scoring rule that exists in the rubric.',
  'A record can pass the first and fail the second; the fact is preserved either way.',
  '',
  `**Provenance: every row is automated and provisional** — produced by reading the recorded rationale against the rubric, not by a human re-reading the sources. ${summary.human_reviewed} rows are human-reviewed.`,
  '',
  `${summary.decision_eligible} of ${summary.axis_records} assessments are decision-eligible. ${summary.facts_preserved_without_eligible_score} establish a fact that is preserved while the surrounding score is not.`,
  '',
  '| Maker / axis | Score | Fact the source establishes | Source date | Clauses not carried | Applicable rule | Justifies whole score? | Provenance |',
  '|---|---|---|---|---|---|---|---|',
  ...reviewed.map((r) =>
    [
      `**${r.maker}** / ${r.axis}`,
      `${r.recorded_score}/4 (${r.confidence})`,
      esc(r.supported_fact),
      esc(r.source_date),
      r.unsupported_clauses.length ? esc(r.unsupported_clauses.join('; ')) : '—',
      esc(r.scoring_rule),
      r.justifies_whole ? '**yes**' : `no — ${esc(r.justification_note)}`,
      r.provenance === 'human_reviewed' ? 'human-reviewed' : 'automated, provisional',
    ].join(' | '),
  ).map((line) => `| ${line} |`),
  '',
].join('\n')

writeFileSync(join(root, 'docs/CLAIM_REVIEW.md'), md)

console.log('summary', summary)
console.log('\n--- withheld (no finding established) ---')
for (const r of rows.filter((r) => r.withheld))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}`)
console.log('\n--- contextual ---')
for (const r of rows.filter((r) => r.basis === 'contextual'))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}  [${r.context_used.join(', ')}]`)
console.log('\n--- decision-eligible (the only records allowed to move an ordering) ---')
for (const r of rows.filter((r) => r.decision_eligible))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} ${r.recorded_score}/${r.confidence}`)
console.log('\n--- narrow fact established, whole-axis score NOT justified ---')
for (const r of rows.filter((r) => r.supported_fact && !r.decision_eligible))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} ${r.recorded_score}/${r.confidence}  ${r.supported_fact.slice(0, 70)}…`)
console.log('\n--- unsourced ---')
for (const r of rows.filter((r) => r.basis === 'unsourced'))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}`)
console.log('\n--- background-source-only (cited sources are not about this maker) ---')
for (const r of rows.filter((r) => r.entity_sources.length === 0 && r.background_sources.length > 0))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} ${r.background_sources.length} background source(s)`)
