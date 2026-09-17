import { backersFor } from './data'
import { associationsAreUnverified, relationshipsFor } from './evidence'
import type { CapitalProfile, Funder, Maker } from './types'

// ---------------------------------------------------------------------------
// Capital Lens — a visitor-configured filter, never a fixed sixth score.
//
// The correction that shapes this file: a field being empty in our record is
// NOT the same as the attribute being absent from the company. The old model
// treated `sovereign_state: []` as "clear" and credited the maker for it, which
// turned gaps in our research into positive findings.
//
// Every attribute now resolves to one of three states:
//
//   documented_present — the record names something
//   documented_absent  — the record carries an explicit authored value, within
//                        a stated scope (and the scope is always shown)
//   unknown            — no record. Counts neither for nor against.
//
// Pending and historical status is preserved separately and never folded into
// a present-tense finding.
// ---------------------------------------------------------------------------

export interface LensConfig {
  founder_autocracy: boolean
  sovereign: boolean
  sovereign_gulf: boolean
  sovereign_singapore: boolean
  sovereign_china: boolean
  big_tech: boolean
  circular_vendor: boolean
  backer_reputation: boolean
  index_concentration: boolean
}

// Nothing is a concern until a visitor says it is.
export const EMPTY_LENS: LensConfig = {
  founder_autocracy: false,
  sovereign: false,
  sovereign_gulf: false,
  sovereign_singapore: false,
  sovereign_china: false,
  big_tech: false,
  circular_vendor: false,
  backer_reputation: false,
  index_concentration: false,
}

// An editorial example, offered by name and never applied without being asked
// for. Capital is activated separately — see prioritiesContext.
export const EXAMPLE_LENS: LensConfig = {
  founder_autocracy: true,
  sovereign: true,
  sovereign_gulf: true,
  sovereign_singapore: true,
  sovereign_china: true,
  big_tech: true,
  circular_vendor: true,
  backer_reputation: true,
  index_concentration: false,
}

export type LensMode = 'unset' | 'example' | 'custom'

export const LENS_MODE_LABELS: Record<LensMode, string> = {
  unset: 'No lens chosen',
  example: 'Example lens (ValueCompass editorial)',
  custom: 'Your lens',
}

export type SovBucket = 'gulf' | 'singapore' | 'china' | 'other'

export function sovBucket(s: string): SovBucket {
  const t = s.toLowerCase()
  if (t.startsWith('gulf')) return 'gulf'
  if (t.startsWith('singapore')) return 'singapore'
  if (t.startsWith('china')) return 'china'
  return 'other'
}

export const INDEPENDENCE_LABELS: Record<CapitalProfile['independence_type'], string> = {
  independent: 'Independent',
  self_or_public: 'Self-funded / public',
  vc_backed: 'VC-backed',
  corporate_owned: 'Corporate-owned',
  hedge_fund_parented: 'Hedge-fund parented',
}

// ---- Attribute states ------------------------------------------------------

export type AttributeState = 'documented_present' | 'documented_absent' | 'unknown'

export interface AttributeFinding {
  key: string
  label: string
  state: AttributeState
  /** What the record says, when it says anything. */
  detail: string | null
  /** For documented_absent and unknown: the scope, or why we cannot claim one. */
  scope: string | null
}

export interface LensResult {
  /** Attributes the visitor switched on, in a stable order. */
  findings: AttributeFinding[]
  present: AttributeFinding[]
  absent: AttributeFinding[]
  unknown: AttributeFinding[]
  activeCount: number
  /**
   * Share of switched-on attributes our record can speak to, 0–1. Shown beside
   * any finding, so an answer resting on one documented attribute out of six is
   * never read as a full picture.
   */
  coverage: number
  /**
   * Announced, contingent, reported-but-not-closed, or historical items.
   * Preserved verbatim and never counted as a present-tense finding.
   */
  pending: { label: string; detail: string }[]
  /**
   * Backer associations with no source on record. Surfaced so they are visible,
   * counted nowhere.
   */
  unverifiedAssociations: string[]
}

export interface ConcernHit {
  key: string
  label: string
  detail: string
}

/**
 * The substantive reputation reasons a funder carries — skipping a pure
 * "Co-founded by X" identification lead-in.
 */
export function reputationReasons(f: Funder): string[] {
  const items = f.notable_for ?? []
  if (!items.length) return []
  const first = items[0]
  const pureIdentification =
    /^(co-founders?|co-founded by|founders?|founded by)\b/i.test(first) && !/[;,(]/.test(first)
  return pureIdentification && items.length > 1 ? items.slice(1) : items
}

export const CONCERN_LEGEND: { label: string; meaning: string }[] = [
  { label: 'Founder control', meaning: 'A founder holds outright or super-voting control.' },
  {
    label: 'Sovereign / state capital',
    meaning: 'A state-linked fund holds a stake (Gulf, Singapore, or China-linked).',
  },
  {
    label: 'Big Tech / competitor capital',
    meaning: 'A hyperscaler holds a stake, and/or a direct competitor is on the cap table.',
  },
  {
    label: 'Circular vendor ties',
    meaning: 'A chipmaker invests in it while it also buys that chipmaker’s hardware.',
  },
  {
    label: 'Backer associations',
    meaning: 'A backer carries notable public associations that we have a source for.',
  },
  {
    label: 'Index concentration',
    meaning: 'A public parent is economically held by passive index funds.',
  },
]

// A list field that is empty tells us nothing: this dataset never recorded a
// scope for these, so "[]" cannot be read as "we checked and found none".
const LIST_EMPTY_IS_UNKNOWN =
  'This dataset records named entries only. An empty list means we have no record — not that we checked and found none.'

// An explicit boolean was authored as a value, so absence is a finding — but
// only within the scope this dataset actually covers.
const BOOLEAN_SCOPE =
  'Recorded as false in this dataset’s capital profile. Scope is limited to the entities modelled here.'

function finding(
  key: string,
  label: string,
  state: AttributeState,
  detail: string | null,
  scope: string | null,
): AttributeFinding {
  return { key, label, state, detail, scope }
}

/**
 * Evaluate a maker against the lens. Reports what is documented present, what
 * is documented absent within a stated scope, and what is unknown — with no
 * single number standing in for the three.
 */
export function evaluateMaker(maker: Maker, lens: LensConfig): LensResult {
  const cp = maker.capital_profile
  const findings: AttributeFinding[] = []

  // Founder control — `false` is an authored value, so absence is documented.
  if (lens.founder_autocracy) {
    if (!cp) {
      findings.push(
        finding('founder_autocracy', 'Founder control', 'unknown', null, 'No capital profile on record.'),
      )
    } else if (cp.founder_control) {
      findings.push(
        finding(
          'founder_autocracy',
          'Founder control',
          'documented_present',
          typeof cp.founder_control === 'string' ? cp.founder_control : 'founder voting control',
          null,
        ),
      )
    } else {
      findings.push(
        finding('founder_autocracy', 'Founder control', 'documented_absent', null, BOOLEAN_SCOPE),
      )
    }
  }

  // Sovereign / state capital. A record naming Gulf capital does not establish
  // that Singapore capital is absent, so a non-match is unknown, not absent.
  const subsOn: SovBucket[] = [
    lens.sovereign_gulf ? 'gulf' : null,
    lens.sovereign_singapore ? 'singapore' : null,
    lens.sovereign_china ? 'china' : null,
  ].filter(Boolean) as SovBucket[]
  if (lens.sovereign && subsOn.length) {
    const matched = (cp?.sovereign_state ?? []).filter((s) => subsOn.includes(sovBucket(s)))
    findings.push(
      matched.length
        ? finding(
            'sovereign',
            'Sovereign / state capital',
            'documented_present',
            matched.join('; '),
            null,
          )
        : finding('sovereign', 'Sovereign / state capital', 'unknown', null, LIST_EMPTY_IS_UNKNOWN),
    )
  }

  // Big Tech / competitor capital. Two signals: a named-list half that is
  // unknown when empty, and an authored boolean. Unknown wins, because half the
  // question has no record behind it.
  if (lens.big_tech) {
    const bt = cp?.big_tech_capital ?? []
    const comp = cp?.competitor_entanglement
    if (bt.length || comp) {
      const parts: string[] = []
      if (bt.length) parts.push(`Big Tech capital: ${bt.join(', ')}`)
      if (comp) parts.push('competitor on the cap table')
      findings.push(
        finding('big_tech', 'Big Tech / competitor capital', 'documented_present', parts.join('; '), null),
      )
    } else {
      findings.push(
        finding('big_tech', 'Big Tech / competitor capital', 'unknown', null, LIST_EMPTY_IS_UNKNOWN),
      )
    }
  }

  if (lens.circular_vendor) {
    const cv = cp?.circular_vendor ?? []
    findings.push(
      cv.length
        ? finding(
            'circular_vendor',
            'Circular vendor ties',
            'documented_present',
            `invests via / buys from ${cv.join(', ')}`,
            null,
          )
        : finding('circular_vendor', 'Circular vendor ties', 'unknown', null, LIST_EMPTY_IS_UNKNOWN),
    )
  }

  // Backer associations. An unverified association cannot become an established
  // concern — it is surfaced separately and counted nowhere.
  const unverifiedAssociations: string[] = []
  if (lens.backer_reputation) {
    const withAssociations = backersFor(maker.id)
      .map((b) => b.funder)
      .filter((f) => (f.notable_for ?? []).length > 0)
    const sourced = withAssociations.filter((f) => !associationsAreUnverified(f))
    for (const f of withAssociations) {
      if (associationsAreUnverified(f)) unverifiedAssociations.push(f.name)
    }
    findings.push(
      sourced.length
        ? finding(
            'backer_reputation',
            'Backer associations',
            'documented_present',
            sourced.map((f) => f.name).join(', '),
            null,
          )
        : finding(
            'backer_reputation',
            'Backer associations',
            'unknown',
            null,
            'Backer associations are a thin first pass in this dataset. No sourced association on record is not a finding that none exists.',
          ),
    )
  }

  if (lens.index_concentration) {
    findings.push(
      cp?.index_held
        ? finding(
            'index_concentration',
            'Index concentration',
            'documented_present',
            'a public parent is held by passive index funds',
            null,
          )
        : finding('index_concentration', 'Index concentration', 'documented_absent', null, BOOLEAN_SCOPE),
    )
  }

  // Pending / reported / historical, preserved apart from present-tense facts.
  const pending: { label: string; detail: string }[] = []
  for (const rel of relationshipsFor(maker.id)) {
    if (rel.status === 'completed' || rel.status === 'unspecified') continue
    pending.push({
      label: `${rel.funder} — ${rel.status}`,
      detail: rel.quote ?? 'Recorded as not completed.',
    })
  }
  for (const s of cp?.sovereign_state ?? []) {
    if (/reported|announced|pending/i.test(s)) {
      pending.push({ label: 'Sovereign / state capital', detail: s })
    }
  }

  const present = findings.filter((f) => f.state === 'documented_present')
  const absent = findings.filter((f) => f.state === 'documented_absent')
  const unknown = findings.filter((f) => f.state === 'unknown')
  const activeCount = findings.length

  return {
    findings,
    present,
    absent,
    unknown,
    activeCount,
    coverage: activeCount === 0 ? 0 : (present.length + absent.length) / activeCount,
    pending,
    unverifiedAssociations,
  }
}
