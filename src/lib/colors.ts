import type { Confidence, ParentBucket, Tier } from './types'

// Maker tier colors (warm / accent family).
export const TIER_COLORS: Record<Tier, string> = {
  frontier: '#7c3aed', // violet
  tool: '#0ea5e9', // sky
  frontier_and_funder: '#db2777', // pink (dual: Microsoft)
}

export const TIER_LABELS: Record<Tier, string> = {
  frontier: 'Frontier lab',
  tool: 'Tool / model',
  frontier_and_funder: 'Frontier + funder',
}

// Funder parent-type colors (cool / earth family, distinct from maker hues).
export const PARENT_COLORS: Record<ParentBucket, string> = {
  hyperscaler: '#0d9488', // teal
  sovereign_wealth: '#ca8a04', // amber/gold
  venture_growth: '#16a34a', // green
  strategic_corporate: '#475569', // slate
  crossover: '#9333ea', // purple
  index_manager: '#78716c', // stone (passive owners)
  hedge_fund_parent: '#dc2626', // red
  strategic_conglomerate: '#c2410c', // burnt orange
}

export const PARENT_LABELS: Record<ParentBucket, string> = {
  hyperscaler: 'Hyperscaler',
  sovereign_wealth: 'Sovereign wealth',
  venture_growth: 'Venture / growth',
  strategic_corporate: 'Strategic corporate',
  crossover: 'Crossover / asset mgr',
  index_manager: 'Index manager (passive)',
  hedge_fund_parent: 'Hedge-fund parent',
  strategic_conglomerate: 'Conglomerate / megafund',
}

export function nodeColor(opts: {
  kind: 'maker' | 'funder'
  tier?: Tier
  parentBucket?: ParentBucket
}): string {
  if (opts.kind === 'maker' && opts.tier) return TIER_COLORS[opts.tier]
  if (opts.kind === 'funder' && opts.parentBucket) return PARENT_COLORS[opts.parentBucket]
  return '#94a3b8'
}

// ---- Confidence visual styling --------------------------------------------
// A = solid full-opacity, B = medium / hatched, C = hollow / outlined / greyed.

export interface ConfidenceStyle {
  fillOpacity: number
  strokeOpacity: number
  hatched: boolean
  hollow: boolean
  label: string
}

export const CONFIDENCE_STYLE: Record<Confidence, ConfidenceStyle> = {
  A: { fillOpacity: 0.85, strokeOpacity: 1, hatched: false, hollow: false, label: 'A · strong' },
  B: { fillOpacity: 0.4, strokeOpacity: 1, hatched: true, hollow: false, label: 'B · moderate' },
  C: { fillOpacity: 0.0, strokeOpacity: 0.7, hatched: false, hollow: true, label: 'C · thin' },
}

// ---- Score heatmap (0–4, higher = better → red→green) ---------------------
export const SCORE_SCALE = ['#dc2626', '#f97316', '#eab308', '#84cc16', '#16a34a']

export function scoreColor(score: number | null): string {
  if (score == null) return '#e2e8f0' // n/a → neutral grey (a gap, never 0)
  const i = Math.max(0, Math.min(4, Math.round(score)))
  return SCORE_SCALE[i]
}

// Capital-fit color (0–100, higher = fewer of the user's concerns present).
export function fitColor(fit: number): string {
  if (fit >= 80) return '#16a34a'
  if (fit >= 50) return '#ca8a04'
  if (fit >= 25) return '#ea580c'
  return '#dc2626'
}

// Strategic deep-pocket buckets to flag prominently in the funder picture.
export const DEEP_POCKET_BUCKETS: ParentBucket[] = [
  'hyperscaler',
  'sovereign_wealth',
  'index_manager',
]
