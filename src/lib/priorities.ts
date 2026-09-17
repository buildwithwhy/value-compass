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
//   1. Only assessments firm enough to compare are allowed to move a maker up
//      or down. An axis we withheld, or one resting on a thin single source,
//      contributes nothing — in either direction.
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

/** At least half the weight you assigned must have evidence behind it before we
 *  will place a maker in a priority ordering. Stated in the methodology. */
export const PLACEMENT_THRESHOLD = 0.5

// ---- Evaluation ------------------------------------------------------------

export interface PriorityAxisResult {
  axis: AxisKey
  weight: AxisWeight
  /** Present only when the assessment is firm enough to compare. */
  score: number | null
  /** Why it could not count, when it could not. */
  missingReason: 'not_established' | 'too_uncertain' | null
}

export interface PriorityResult {
  /** Every prioritised axis, in weight order, evidenced or not. */
  axes: PriorityAxisResult[]
  evidenced: PriorityAxisResult[]
  missing: PriorityAxisResult[]
  /** Share of your assigned weight that has evidence behind it, 0–1. */
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
    if (d.comparable && d.value != null) {
      axes.push({ axis, weight, score: d.value, missingReason: null })
    } else {
      axes.push({
        axis,
        weight,
        score: null,
        missingReason: d.withheld ? 'not_established' : 'too_uncertain',
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
    // Capital only breaks ties, or decides outright when no axis is prioritised.
    const ca = a.result.capital?.fit ?? 0
    const cb = b.result.capital?.fit ?? 0
    if (cb !== ca) return cb - ca
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
    const bothCount = a.comparable && a.value != null && b.comparable && b.value != null

    let direction: ChangeDirection = 'unknown'
    let unknownBecause: string | null = null

    if (bothCount) {
      if (rankable.best == null) direction = 'same'
      else direction = (b.value as number) > (a.value as number) ? 'better' : 'worse'
    } else {
      const sides: string[] = []
      if (!a.comparable || a.value == null) sides.push(from.name)
      if (!b.comparable || b.value == null) sides.push(to.name)
      const why = [a, b].some((d) => d.withheld)
        ? 'nothing has been published'
        : 'the assessment is too thin to compare'
      unknownBecause = `${sides.join(' and ')}: ${why}`
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
