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
    basis = 'non_disclosure'
    rule = 'The rationale reports only that information is not published, and points to nothing observed about this maker.'
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

  // Display rule — stated publicly in the methodology.
  // A score whose only basis is "nobody published this" is withheld from the
  // compass, the matrix and every comparison. The recorded value is kept.
  const withheld = basis === 'non_disclosure'

  // Comparison rule — a difference is only called when both sides rest on
  // evidence about the maker AND carry confidence A or B.
  const comparable = (basis === 'sourced' || basis === 'unsourced') && axis.confidence !== 'C'

  return {
    maker: maker.id,
    axis: axisKey,
    recorded_score: axis.score,
    confidence: axis.confidence,
    basis,
    rule,
    withheld,
    comparable,
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
      comparable: e.comparable,
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
  comparable: count((r) => r.comparable),
  no_sources_at_all: count((r) => r.entity_sources.length === 0 && r.background_sources.length === 0),
  background_only: count((r) => r.entity_sources.length === 0 && r.background_sources.length > 0),
  confidence_c: count((r) => r.confidence === 'C'),
  recorded_na: count((r) => r.recorded_score === 'n/a' || r.recorded_score === null),
  funders_with_unverified_associations: Object.values(funderEvidence).filter(
    (f) => f.associations_status === 'unverified',
  ).length,
  funders_with_associations: Object.keys(funderEvidence).length,
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
      'A score whose rationale establishes only that information is undisclosed is withheld from the compass, the matrix and all comparisons. The recorded value is preserved and shown on request.',
    comparison_rule:
      'A difference between two makers is only called when both assessments rest on evidence about that maker and carry confidence A or B.',
    bases: {
      sourced: 'Rationale points at something on record and cites a source about this maker.',
      unsourced: 'Rationale points at something on record, but no source about this maker is attached.',
      contextual: 'Rationale reasons from jurisdiction, company size or position in the stack, not from evidence about this maker.',
      non_disclosure: 'Rationale establishes only that the information is not published.',
    },
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
  background_sources: BACKGROUND,
  axis_evidence: axisEvidence,
  funder_association_status: funderEvidence,
  relationships: relationshipIndex,
}

writeFileSync(join(root, 'src/data/evidence.json'), JSON.stringify(out, null, 2) + '\n')

console.log('summary', summary)
console.log('\n--- withheld (rationale = non-disclosure only) ---')
for (const r of rows.filter((r) => r.withheld))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}`)
console.log('\n--- contextual ---')
for (const r of rows.filter((r) => r.basis === 'contextual'))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}  [${r.context_used.join(', ')}]`)
console.log('\n--- unsourced ---')
for (const r of rows.filter((r) => r.basis === 'unsourced'))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} recorded ${r.recorded_score}/${r.confidence}`)
console.log('\n--- background-source-only (cited sources are not about this maker) ---')
for (const r of rows.filter((r) => r.entity_sources.length === 0 && r.background_sources.length > 0))
  console.log(`  ${r.maker.padEnd(16)} ${r.axis.padEnd(18)} ${r.background_sources.length} background source(s)`)
