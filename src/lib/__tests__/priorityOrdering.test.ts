import { describe, expect, it } from 'vitest'
import { buildAdvice, recommend } from '../recommend'
import { EMPTY_LENS } from '../lens'
import { EMPTY_WEIGHTS, EXAMPLE_WEIGHTS, type Priorities } from '../priorities'
import { prioritizeAdvice, prioritizeAlternatives } from '../priorityOrdering'

// Real data throughout: the ordering rules are only meaningful against the
// actual eligibility flags in evidence.json.
const CATEGORY = 'everyday_assistant'

const unset: Priorities = { weights: EMPTY_WEIGHTS, capital: EMPTY_LENS, mode: 'unset' }
const transparencyFirst: Priorities = {
  weights: { ...EMPTY_WEIGHTS, transparency: 2 },
  capital: EMPTY_LENS,
  mode: 'custom',
}
const example: Priorities = {
  weights: { ...EXAMPLE_WEIGHTS },
  capital: EMPTY_LENS,
  mode: 'example',
}

function confirmedOutcomes() {
  return recommend({ category: CATEGORY, functional: [], priorities: [], requirements: [] })
    .confirmed
}

const products = (rows: { alternative: { product: string } }[]) =>
  rows.map((r) => r.alternative.product)

describe('prioritizeAlternatives', () => {
  it('returns null when no priorities are set', () => {
    expect(prioritizeAlternatives(confirmedOutcomes(), unset)).toBeNull()
  })

  it('places options with eligible evidence first and holds the rest apart', () => {
    const g = prioritizeAlternatives(confirmedOutcomes(), transparencyFirst)
    expect(g).not.toBeNull()
    // Claude (Anthropic) tops the placed group: a top transparency score,
    // name-ordered among ties. Duck.ai (DuckDuckGo) has no eligible
    // transparency assessment, so it must sit in the unplaced half.
    const names = products(g!.placed)
    expect(names[0]).toBe('Claude')
    expect(names).not.toContain('Duck.ai')
    expect(products(g!.unplaced)).toContain('Duck.ai')
    expect(g!.placed.length + g!.unplaced.length).toBe(confirmedOutcomes().length)
    expect(g!.integrity.uniform).toBe(true)
  })

  it('places nobody when the spread of priorities outruns the evidence', () => {
    // All five example axes at once: coverage lands below the placement
    // threshold, so the honest answer is an order for no one — held apart
    // rather than ranked.
    const g = prioritizeAlternatives(confirmedOutcomes(), example)
    expect(g).not.toBeNull()
    expect(g!.placed).toEqual([])
    expect(g!.unplaced.length).toBe(confirmedOutcomes().length)
  })

  it('reorders without changing membership', () => {
    const rows = confirmedOutcomes()
    const g = prioritizeAlternatives(rows, transparencyFirst)
    expect([...products(g!.placed), ...products(g!.unplaced)].sort()).toEqual(
      products(rows).sort(),
    )
  })
})

describe('prioritizeAdvice', () => {
  it('returns null when no priorities are set', () => {
    const advice = buildAdvice({
      category: CATEGORY,
      functional: [],
      priorities: ['c_training_default'],
      requirements: [],
    })
    expect(prioritizeAdvice(advice, unset)).toBeNull()
  })

  it('reorders the lead group without changing who is in it', () => {
    const advice = buildAdvice({
      category: CATEGORY,
      functional: [],
      priorities: ['c_training_default'],
      requirements: [],
    })
    const reordered = prioritizeAdvice(advice, transparencyFirst)
    expect(reordered).not.toBeNull()
    expect(products(reordered!.lead).sort()).toEqual(products(advice.lead).sort())
  })
})
