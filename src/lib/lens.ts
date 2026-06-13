import { backersFor } from './data'
import type { CapitalProfile, Funder, Maker } from './types'

// ---------------------------------------------------------------------------
// Capital Lens — a USER-CONFIGURABLE filter, never a fixed sixth score.
// Each concern maps to objective capital_profile fields (or, for backer
// reputation, to the notable_for tags of a maker's funders). The user decides
// which attributes count as concerns; we only state the facts.
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

// Defaults per the build prompt (index concentration OFF; everything else ON).
export const DEFAULT_LENS: LensConfig = {
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

export interface ConcernHit {
  key: string
  label: string
  detail: string
}

/**
 * The substantive reputation reasons a funder is flagged — its notable public
 * associations, skipping a pure "Co-founded by X" identification lead-in (so
 * a16z surfaces its Trump-administration alignment, Founders Fund surfaces
 * Thiel's political donations, etc.). Returned as readable sentences; full
 * list + sources also live on the funder popup.
 */
export function reputationReasons(f: Funder): string[] {
  const items = f.notable_for ?? []
  if (!items.length) return []
  const first = items[0]
  const pureIdentification =
    /^(co-founders?|co-founded by|founders?|founded by)\b/i.test(first) && !/[;,(]/.test(first)
  return pureIdentification && items.length > 1 ? items.slice(1) : items
}

// Plain-English meaning of each concern tag, for an explanatory key.
export const CONCERN_LEGEND: { label: string; meaning: string }[] = [
  { label: 'Founder autocracy', meaning: 'A founder holds outright or super-voting control.' },
  {
    label: 'Sovereign / state capital',
    meaning: 'Backed by a state-linked fund (Gulf, Singapore, or China-linked).',
  },
  {
    label: 'Big Tech / competitor capital',
    meaning: 'Funded by hyperscalers, and/or entangled with a direct competitor.',
  },
  {
    label: 'Circular vendor ties',
    meaning: 'A chipmaker invests in it while it also buys that chipmaker’s hardware.',
  },
  {
    label: 'Backer reputation & figure stances',
    meaning: 'One or more backers carry notable public associations (see each maker’s detail).',
  },
  {
    label: 'Index concentration',
    meaning: 'Economically held by passive index funds (universal-owner concern).',
  },
]

export interface LensResult {
  hits: ConcernHit[]
  activeCount: number // how many concerns the user has enabled
  clearCount: number // enabled concerns NOT present in this maker
  fit: number // 0-100, higher = fewer of the user's concerns present
}

/**
 * Evaluate a maker against the user's lens. Higher fit = cleaner capital under
 * the chosen concerns. Returns which concerns triggered, for transparency.
 */
export function evaluateMaker(maker: Maker, lens: LensConfig): LensResult {
  const cp = maker.capital_profile
  const hits: ConcernHit[] = []
  let active = 0

  // Founder autocracy → founder_control
  if (lens.founder_autocracy) {
    active++
    if (cp && cp.founder_control) {
      hits.push({
        key: 'founder_autocracy',
        label: 'Founder autocracy',
        detail: typeof cp.founder_control === 'string' ? cp.founder_control : 'founder voting control',
      })
    }
  }

  // Sovereign / state capital → sovereign_state, gated by sub-bucket toggles
  const subsOn: SovBucket[] = [
    lens.sovereign_gulf ? 'gulf' : null,
    lens.sovereign_singapore ? 'singapore' : null,
    lens.sovereign_china ? 'china' : null,
  ].filter(Boolean) as SovBucket[]
  if (lens.sovereign && subsOn.length) {
    active++
    const matched = (cp?.sovereign_state ?? []).filter((s) => subsOn.includes(sovBucket(s)))
    if (matched.length) {
      hits.push({
        key: 'sovereign',
        label: 'Sovereign / state capital',
        detail: matched.join('; '),
      })
    }
  }

  // Big Tech / competitor capital → big_tech_capital + competitor_entanglement
  if (lens.big_tech) {
    active++
    const bt = cp?.big_tech_capital ?? []
    const comp = cp?.competitor_entanglement
    if (bt.length || comp) {
      const parts: string[] = []
      if (bt.length) parts.push(`Big Tech capital: ${bt.join(', ')}`)
      if (comp) parts.push('competitor entanglement')
      hits.push({ key: 'big_tech', label: 'Big Tech / competitor capital', detail: parts.join('; ') })
    }
  }

  // Circular vendor ties → circular_vendor
  if (lens.circular_vendor) {
    active++
    const cv = cp?.circular_vendor ?? []
    if (cv.length) {
      hits.push({
        key: 'circular_vendor',
        label: 'Circular vendor ties',
        detail: `invests via / buys from ${cv.join(', ')}`,
      })
    }
  }

  // Backer reputation → presence of notable_for on this maker's funders
  if (lens.backer_reputation) {
    active++
    const repBackers = backersFor(maker.id)
      .map((b) => b.funder)
      .filter((f) => (f.notable_for ?? []).length > 0)
    if (repBackers.length) {
      hits.push({
        key: 'backer_reputation',
        label: 'Backer reputation & figure stances',
        detail: repBackers.map((f) => f.name).join(', '),
      })
    }
  }

  // Index concentration → index_held (OFF by default)
  if (lens.index_concentration) {
    active++
    if (cp?.index_held) {
      hits.push({
        key: 'index_concentration',
        label: 'Index concentration',
        detail: 'held by passive index funds (universal-owner concern)',
      })
    }
  }

  const clear = active - hits.length
  const fit = active === 0 ? 100 : Math.round((clear / active) * 100)
  return { hits, activeCount: active, clearCount: clear, fit }
}
