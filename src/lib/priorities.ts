import { AXIS_KEYS, makers } from './data'
import { comparableExtremes, displayScore } from './evidence'
import { evaluateMaker, type LensConfig, type LensResult } from './lens'
import type { AxisKey, Maker } from './types'

// ---------------------------------------------------------------------------
// Priorities — one model for "what matters to you", spanning the five scored
// axes and the capital attributes.
//
// Two commitments shape everything here:
//
//   1. Only DECISION-ELIGIBLE assessments are allowed to move a maker up or
//      down — the same single rule the comparison markers and the switching
//      view use (see isDecisionEligible). An axis with no source for its claim
//      contributes nothing, in either direction, whatever its confidence flag.
//
//   2. Conduct and capital are never added together. A weighted conduct score
//      and a count of capital attributes measure different things, and a single
//      blended number would hide which one was driving the answer.
// ---------------------------------------------------------------------------

/** Three levels, not a slider. The underlying scores are 0–4 hand assessments;
 *  a continuous weight would imply precision the evidence cannot carry. */
export type AxisWeight = 0 | 1 | 2

export const AXIS_WEIGHT_LABELS: Record<AxisWeight, string> = {
  0: 'Not a priority',
  1: 'Matters',
  2: 'Matters a lot',
}

export type AxisWeights = Record<AxisKey, AxisWeight>

export const EMPTY_WEIGHTS: AxisWeights = {
  transparency: 0,
  culture_esg: 0,
  labour_integrity: 0,
  wealth_dispersion: 0,
  public_sharing: 0,
}

/**
 * An editorial example, offered by name. It is one defensible reading of the
 * rubric — weighted toward what is most externally verifiable — and it is never
 * presented as the visitor's own.
 */
export const EXAMPLE_WEIGHTS: AxisWeights = {
  transparency: 2,
  culture_esg: 1,
  labour_integrity: 2,
  wealth_dispersion: 1,
  public_sharing: 1,
}

/**
 * Provisional. At least half the weight assigned must have eligible evidence
 * before a maker is placed in an exploratory ordering.
 *
 * This is a threshold for EXPLORING the dataset, not a guarantee of anything.
 * It is not a recommendation bar: a maker clearing it can still have been
 * scored on a different half of the criteria than the maker above it, which is
 * why orderingIntegrity() exists and why the interface says so.
 */
export const PLACEMENT_THRESHOLD = 0.5

// ---- Evaluation ------------------------------------------------------------

export interface PriorityAxisResult {
  axis: AxisKey
  weight: AxisWeight
  /** Present only when the assessment passes the eligibility rule. */
  score: number | null
  /** Why it could not count, when it could not. */
  missingReason: 'not_established' | 'ineligible' | null
  /** The specific reason, in words fit for the interface. */
  missingDetail?: string | null
}

export interface PriorityResult {
  /** Every prioritised axis, in weight order, evidenced or not. */
  axes: PriorityAxisResult[]
  evidenced: PriorityAxisResult[]
  missing: PriorityAxisResult[]
  /** Share of your assigned weight with eligible evidence behind it, 0–1. */
  coverage: number
  /** Weighted mean of the evidenced scores, 0–4. Null when nothing counts. */
  strength: number | null
  /** False when too little of what you asked about is known for this maker. */
  placeable: boolean
  /** Capital, kept separate and never folded into `strength`. */
  capital: LensResult | null
}

const NOTHING: PriorityResult = {
  axes: [],
  evidenced: [],
  missing: [],
  coverage: 0,
  strength: null,
  placeable: false,
  capital: null,
}

export interface Priorities {
  weights: AxisWeights
  capital: LensConfig
  mode: 'unset' | 'example' | 'custom'
}

/**
 * Whose settings these are. Example-derived settings are never called the
 * visitor's — they did not choose them, they accepted a preview of ours.
 */
export function prioritiesLabel(mode: Priorities['mode'], possessive = false): string {
  if (mode === 'example') return possessive ? 'the example priorities’' : 'the example priorities'
  return possessive ? 'your priorities’' : 'your priorities'
}

export function anyAxisPrioritised(w: AxisWeights): boolean {
  return AXIS_KEYS.some((k) => w[k] > 0)
}

export function anyCapitalPrioritised(c: LensConfig): boolean {
  return Object.values(c).some(Boolean)
}

export function hasPriorities(p: Priorities): boolean {
  return p.mode !== 'unset' && (anyAxisPrioritised(p.weights) || anyCapitalPrioritised(p.capital))
}

export function evaluatePriorities(maker: Maker, p: Priorities): PriorityResult {
  if (!hasPriorities(p)) return NOTHING

  const axes: PriorityAxisResult[] = []
  for (const axis of AXIS_KEYS) {
    const weight = p.weights[axis]
    if (weight === 0) continue
    const d = displayScore(maker, axis)
    if (d.eligible && d.value != null) {
      axes.push({ axis, weight, score: d.value, missingReason: null })
    } else {
      axes.push({
        axis,
        weight,
        score: null,
        missingReason: d.withheld ? 'not_established' : 'ineligible',
        missingDetail: d.ineligibleBecause,
      })
    }
  }
  axes.sort((a, b) => b.weight - a.weight)

  const evidenced = axes.filter((a) => a.score != null)
  const missing = axes.filter((a) => a.score == null)

  const totalWeight = axes.reduce((s, a) => s + a.weight, 0)
  const evidencedWeight = evidenced.reduce((s, a) => s + a.weight, 0)
  const coverage = totalWeight === 0 ? 0 : evidencedWeight / totalWeight
  const strength =
    evidencedWeight === 0
      ? null
      : evidenced.reduce((s, a) => s + a.weight * (a.score as number), 0) / evidencedWeight

  const capital = anyCapitalPrioritised(p.capital) ? evaluateMaker(maker, p.capital) : null

  return {
    axes,
    evidenced,
    missing,
    coverage,
    strength,
    // No axes prioritised at all → capital alone decides placement.
    placeable:
      totalWeight === 0 ? capital != null : strength != null && coverage >= PLACEMENT_THRESHOLD,
    capital,
  }
}

// ---- Ordering --------------------------------------------------------------

export interface PlacedMaker {
  maker: Maker
  result: PriorityResult
}

export interface PriorityOrdering {
  /** Enough of what you asked about is known to put these in an order. */
  placed: PlacedMaker[]
  /**
   * Too little is known to place these. They are held apart rather than sorted
   * to the bottom — an unknown is not a bad result, and a list that buries them
   * would read as though it were.
   */
  unplaced: PlacedMaker[]
}

export function orderByPriorities(
  selection: Maker[],
  p: Priorities,
): PriorityOrdering {
  const rows = selection.map((maker) => ({ maker, result: evaluatePriorities(maker, p) }))
  if (!hasPriorities(p)) return { placed: rows, unplaced: [] }

  const axesOn = anyAxisPrioritised(p.weights)
  const placed = rows.filter((r) => r.result.placeable)
  const unplaced = rows.filter((r) => !r.result.placeable)

  placed.sort((a, b) => {
    if (axesOn) {
      const d = (b.result.strength ?? 0) - (a.result.strength ?? 0)
      if (Math.abs(d) > 1e-9) return d
    }
    // Capital only breaks ties, or decides outright when no axis is
    // prioritised — and only DOCUMENTED matches count. Unknown attributes move
    // nobody, which is the whole point of the tri-state model.
    const ca = a.result.capital?.present.length ?? 0
    const cb = b.result.capital?.present.length ?? 0
    if (ca !== cb) return ca - cb
    return a.maker.name.localeCompare(b.maker.name)
  })
  unplaced.sort((a, b) => {
    // Most-known first, so the ones closest to being placeable read first.
    const d = b.result.coverage - a.result.coverage
    if (Math.abs(d) > 1e-9) return d
    return a.maker.name.localeCompare(b.maker.name)
  })

  return { placed, unplaced }
}

// ---- Is an ordering safe to present as an ordering? ------------------------

export interface OrderingIntegrity {
  /** True when every placed maker was scored on the same set of criteria. */
  uniform: boolean
  /** Criteria evidenced for every placed maker — the only fair basis. */
  sharedAxes: AxisKey[]
  /** Criteria evidenced for some but not all — why the average is not comparable. */
  unevenAxes: AxisKey[]
}

/**
 * A weighted average over criteria A and B is not comparable with one over
 * criteria B and C, however similar the two numbers look. This reports whether
 * the placed makers were actually measured on the same things, so the interface
 * can present a genuine ordering as an ordering and an uneven one as a prompt
 * to read the criterion-level detail instead.
 */
export function orderingIntegrity(placed: PlacedMaker[]): OrderingIntegrity {
  if (placed.length < 2) return { uniform: true, sharedAxes: [], unevenAxes: [] }
  const counts = new Map<AxisKey, number>()
  for (const row of placed) {
    for (const a of row.result.evidenced) counts.set(a.axis, (counts.get(a.axis) ?? 0) + 1)
  }
  const sharedAxes: AxisKey[] = []
  const unevenAxes: AxisKey[] = []
  for (const [axis, n] of counts) {
    if (n === placed.length) sharedAxes.push(axis)
    else unevenAxes.push(axis)
  }
  return { uniform: unevenAxes.length === 0, sharedAxes, unevenAxes }
}

/**
 * Criterion-level comparison — kept whatever the ordering does, because it is
 * the part that stays honest when coverage is uneven. One row per prioritised
 * criterion, with the makers that have eligible evidence for it.
 */
export interface CriterionRow {
  axis: AxisKey
  weight: AxisWeight
  scored: { maker: Maker; score: number }[]
  missing: { maker: Maker; reason: string }[]
}

export function criterionComparison(selection: Maker[], p: Priorities): CriterionRow[] {
  const rows: CriterionRow[] = []
  for (const axis of AXIS_KEYS) {
    const weight = p.weights[axis]
    if (weight === 0) continue
    const scored: { maker: Maker; score: number }[] = []
    const missing: { maker: Maker; reason: string }[] = []
    for (const maker of selection) {
      const d = displayScore(maker, axis)
      if (d.eligible && d.value != null) scored.push({ maker, score: d.value })
      else missing.push({ maker, reason: d.ineligibleBecause ?? 'no eligible assessment' })
    }
    scored.sort((a, b) => b.score - a.score || a.maker.name.localeCompare(b.maker.name))
    rows.push({ axis, weight, scored, missing })
  }
  return rows.sort((a, b) => b.weight - a.weight)
}

// ---- Comparing two makers on the stated priorities -------------------------

export type ChangeDirection = 'better' | 'worse' | 'same' | 'unknown'

export interface PriorityChange {
  axis: AxisKey
  weight: AxisWeight
  from: number | null
  to: number | null
  direction: ChangeDirection
  /** Set when direction is 'unknown' — which side is missing, and why. */
  unknownBecause: string | null
}

/**
 * What moves, and what cannot be said to move, between two makers on the axes
 * the visitor prioritised. A direction is only given when both sides are firm
 * enough to compare — otherwise it is 'unknown', never 'same'.
 */
export function priorityChanges(from: Maker, to: Maker, p: Priorities): PriorityChange[] {
  const out: PriorityChange[] = []
  for (const axis of AXIS_KEYS) {
    const weight = p.weights[axis]
    if (weight === 0) continue
    const a = displayScore(from, axis)
    const b = displayScore(to, axis)
    const rankable = comparableExtremes([from, to], axis)
    const bothCount = a.eligible && a.value != null && b.eligible && b.value != null

    let direction: ChangeDirection = 'unknown'
    let unknownBecause: string | null = null

    if (bothCount) {
      if (rankable.best == null) direction = 'same'
      else direction = (b.value as number) > (a.value as number) ? 'better' : 'worse'
    } else {
      const parts: string[] = []
      if (!a.eligible || a.value == null) parts.push(`${from.name}: ${a.ineligibleBecause}`)
      if (!b.eligible || b.value == null) parts.push(`${to.name}: ${b.ineligibleBecause}`)
      unknownBecause = parts.join('; ')
    }

    out.push({ axis, weight, from: a.value, to: b.value, direction, unknownBecause })
  }
  return out.sort((x, y) => y.weight - x.weight)
}

// ---- Alternatives ----------------------------------------------------------

/**
 * Makers in the same tier, as candidates to switch to. This dataset does not
 * model feature-level substitutability and we are not going to invent it — the
 * UI says so, and lets you pick anyone.
 */
export function suggestedAlternatives(maker: Maker, p: Priorities, limit = 6): Maker[] {
  const sameTier = makers.filter((m) => m.id !== maker.id && m.tier === maker.tier)
  const sameCategory = sameTier.filter((m) => m.category && m.category === maker.category)
  const pool = sameCategory.length >= 2 ? sameCategory : sameTier
  if (!hasPriorities(p)) return pool.slice(0, limit)
  const { placed, unplaced } = orderByPriorities(pool, p)
  return [...placed, ...unplaced].slice(0, limit).map((r) => r.maker)
}
