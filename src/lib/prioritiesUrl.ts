import { AXIS_KEYS } from './data'
import { EMPTY_LENS, type LensConfig } from './lens'
import { EMPTY_WEIGHTS, type AxisWeight, type AxisWeights, type Priorities } from './priorities'
import type { AxisKey } from './types'

// ---------------------------------------------------------------------------
// Axis priorities in the URL, so a recommendation view can be shared.
//
// One param per half of the priorities state:
//
//   ?axes=transparency:2,labour_integrity:1
//   &capital=sovereign,big_tech
//
// The parsed form is a COMPLETE specification, not a patch: an axis absent
// from the param was 0 for whoever shared the link, and a capital key absent
// was off. Applying it therefore reproduces the sender's state exactly
// instead of merging two visitors' ideas together.
//
// Parsing is deliberately lenient. A malformed or half-garbled value degrades
// to "nothing shared" — a broken link must never render as a crash or as
// invented priorities.
// ---------------------------------------------------------------------------

export const AXES_PARAM = 'axes'
export const CAPITAL_PARAM = 'capital'

/** The subset of `Priorities` that travels in the URL. */
export type PrioritiesState = Pick<Priorities, 'weights' | 'capital'>

const VALID_WEIGHTS: readonly AxisWeight[] = [1, 2]

function parseAxisWeights(raw: string | null): Partial<AxisWeights> {
  if (!raw) return {}
  const out: Partial<AxisWeights> = {}
  for (const pair of raw.split(',')) {
    const sep = pair.indexOf(':')
    if (sep <= 0) continue
    const axis = pair.slice(0, sep) as AxisKey
    const weight = Number(pair.slice(sep + 1))
    if (!AXIS_KEYS.includes(axis)) continue
    if (!VALID_WEIGHTS.includes(weight as AxisWeight)) continue
    out[axis] = weight as AxisWeight
  }
  return out
}

function parseCapitalKeys(raw: string | null): (keyof LensConfig)[] {
  if (!raw) return []
  const known = new Set(Object.keys(EMPTY_LENS))
  return raw
    .split(',')
    .filter((k): k is keyof LensConfig => known.has(k))
}

/** null when the search carries no (or no usable) priorities params. */
export function parsePrioritiesParams(search: string): PrioritiesState | null {
  const params = new URLSearchParams(search)
  const rawAxes = params.get(AXES_PARAM)
  const rawCapital = params.get(CAPITAL_PARAM)
  if (rawAxes == null && rawCapital == null) return null

  const parsedAxes = parseAxisWeights(rawAxes)
  const capitalKeys = parseCapitalKeys(rawCapital)
  if (Object.keys(parsedAxes).length === 0 && capitalKeys.length === 0) return null

  const weights: AxisWeights = { ...EMPTY_WEIGHTS, ...parsedAxes }
  const capital: LensConfig = { ...EMPTY_LENS }
  for (const k of capitalKeys) capital[k] = true
  return { weights, capital }
}

/** A shareable query fragment (`axes=…&capital=…`), or null when nothing is prioritised. */
export function serializePrioritiesParams(p: PrioritiesState): string | null {
  const axes = AXIS_KEYS.filter((a) => p.weights[a] > 0).map((a) => `${a}:${p.weights[a]}`)
  const capital = (Object.keys(EMPTY_LENS) as (keyof LensConfig)[]).filter((k) => p.capital[k])
  if (axes.length === 0 && capital.length === 0) return null
  // Assembled by hand rather than via URLSearchParams, which percent-encodes
  // the ':' and ',' and makes shared links unreadable. The alphabet is
  // [a-z_0-9,:=] — every character is safe in a query string as-is.
  const parts: string[] = []
  if (axes.length > 0) parts.push(`${AXES_PARAM}=${axes.join(',')}`)
  if (capital.length > 0) parts.push(`${CAPITAL_PARAM}=${capital.join(',')}`)
  return parts.join('&')
}

/** Whether two priorities states would share the same link. */
export function prioritiesMatch(a: PrioritiesState, b: PrioritiesState): boolean {
  return serializePrioritiesParams(a) === serializePrioritiesParams(b)
}
