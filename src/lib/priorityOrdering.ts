import { getMaker } from './data'
import {
  hasPriorities,
  orderByPriorities,
  orderingIntegrity,
  type OrderingIntegrity,
  type Priorities,
} from './priorities'
import type { Maker } from './types'
import type { Advice, AdviceOption } from './recommend'

// ---------------------------------------------------------------------------
// Priorities applied to the tool finder's results.
//
// This is the one place recommendation ordering bends to the visitor's axis
// priorities, and it bends through the SAME engine used everywhere else
// (orderByPriorities) — never through a second scoring idea. The rules that
// implies, which the UI must keep visible:
//
//   - Only decision-eligible evidence moves an option (the engine's rule).
//   - An option that cannot be placed is held apart, not ranked down — an
//     unknown is not a bad result.
//   - When placed options were not all evidenced on the same axes, the
//     ordering is indicative only, and the interface says so.
//
// Buckets never change: a priority orders and explains, it never excludes.
// ---------------------------------------------------------------------------

/** Structural stand-in for anything carrying an alternative — outcome cards and advice rows alike. */
interface HasAlternative {
  alternative: { product_provider: { maker_id: string } }
}

export interface PrioritizedGroup<T> {
  /** Enough evidence-backed scoring to order, strongest first. */
  placed: T[]
  /** Could not be placed on the stated priorities — held apart, not penalised. */
  unplaced: T[]
  /** Whether the placed options were all evidenced on the same axes. */
  integrity: OrderingIntegrity
}

/**
 * Reorder one already-bucketed group (confirmed, not-confirmed, excluded) by
 * the visitor's priorities. Membership is untouched — position only. Returns
 * null when the priorities are unset or the group is too small to order,
 * which the caller reads as "keep the default alphabetical order".
 */
export function prioritizeAlternatives<T extends HasAlternative>(
  rows: T[],
  p: Priorities,
): PrioritizedGroup<T> | null {
  if (!hasPriorities(p) || rows.length < 2) return null

  const makerOf = new Map<T, Maker | null>()
  for (const row of rows) {
    // An operator outside the maker directory has no axis record at all —
    // unknowable, not zero.
    makerOf.set(row, getMaker(row.alternative.product_provider.maker_id) ?? null)
  }
  const unique = [...new Set([...makerOf.values()].filter((m): m is Maker => m != null))]
  if (unique.length === 0) return null

  const { placed, unplaced } = orderByPriorities(unique, p)
  const rankOf = new Map<Maker, number>()
  placed.forEach((r, i) => rankOf.set(r.maker, i))
  const unplacedRankOf = new Map<Maker, number>()
  unplaced.forEach((r, i) => unplacedRankOf.set(r.maker, i))
  const rank = (row: T, ranks: Map<Maker, number>): number => {
    const m = makerOf.get(row)
    return m && ranks.has(m) ? (ranks.get(m) as number) : Number.POSITIVE_INFINITY
  }

  const placedRows = rows
    .filter((r) => rank(r, rankOf) !== Number.POSITIVE_INFINITY)
    .sort((a, b) => rank(a, rankOf) - rank(b, rankOf))
  const unplacedRows = rows
    .filter((r) => rank(r, rankOf) === Number.POSITIVE_INFINITY)
    // Stable sort keeps same-maker and unknown-operator rows alphabetical,
    // the order they arrived in.
    .sort((a, b) => rank(a, unplacedRankOf) - rank(b, unplacedRankOf))

  return { placed: placedRows, unplaced: unplacedRows, integrity: orderingIntegrity(placed) }
}

/**
 * The advice's groups, reordered the same way. Group MEMBERSHIP is evidence
 * the advice already established ("confirmed on everything we can check");
 * this only decides which of a group's equal members reads first.
 */
export function prioritizeAdvice(advice: Advice, p: Priorities): Advice | null {
  if (!hasPriorities(p)) return null
  const lift = <T extends AdviceOption>(rows: T[]): T[] => {
    const g = prioritizeAlternatives(rows, p)
    return g ? [...g.placed, ...g.unplaced] : rows
  }
  return {
    ...advice,
    lead: lift(advice.lead),
    compromises: lift(advice.compromises),
    needConfirmation: lift(advice.needConfirmation),
    ruledOut: lift(advice.ruledOut),
    rest: lift(advice.rest),
  }
}
