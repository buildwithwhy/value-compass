import { describe, expect, it } from 'vitest'
import { EMPTY_LENS } from '../lens'
import { EMPTY_WEIGHTS, EXAMPLE_WEIGHTS } from '../priorities'
import {
  parsePrioritiesParams,
  prioritiesMatch,
  serializePrioritiesParams,
} from '../prioritiesUrl'

describe('parsePrioritiesParams', () => {
  it('returns null when the params are absent', () => {
    expect(parsePrioritiesParams('')).toBeNull()
    expect(parsePrioritiesParams('?category=everyday_assistant')).toBeNull()
  })

  it('reads axis weights and holds unstated axes at zero', () => {
    const p = parsePrioritiesParams('?axes=transparency:2,labour_integrity:1')
    expect(p?.weights).toEqual({ ...EMPTY_WEIGHTS, transparency: 2, labour_integrity: 1 })
    expect(p?.capital).toEqual(EMPTY_LENS)
  })

  it('reads capital keys and leaves unstated keys off', () => {
    const p = parsePrioritiesParams('?capital=sovereign,big_tech')
    expect(p?.weights).toEqual(EMPTY_WEIGHTS)
    expect(p?.capital.sovereign).toBe(true)
    expect(p?.capital.big_tech).toBe(true)
    expect(p?.capital.founder_autocracy).toBe(false)
  })

  it('drops unknown axes, unknown keys and impossible weights', () => {
    expect(
      parsePrioritiesParams('?axes=nonsense:2,transparency:9,wealth_dispersion:1'),
    ).toEqual({
      weights: { ...EMPTY_WEIGHTS, wealth_dispersion: 1 },
      capital: EMPTY_LENS,
    })
    expect(parsePrioritiesParams('?capital=not_a_key')).toBeNull()
    expect(parsePrioritiesParams('?axes=garbage')).toBeNull()
  })
})

describe('serializePrioritiesParams', () => {
  it('returns null when nothing is prioritised', () => {
    expect(serializePrioritiesParams({ weights: EMPTY_WEIGHTS, capital: EMPTY_LENS })).toBeNull()
  })

  it('emits axes in fixed key order, omitting zeros', () => {
    const s = serializePrioritiesParams({
      weights: { ...EMPTY_WEIGHTS, public_sharing: 1, transparency: 2 },
      capital: EMPTY_LENS,
    })
    expect(s).toBe('axes=transparency:2,public_sharing:1')
  })

  it('emits capital keys', () => {
    const s = serializePrioritiesParams({
      weights: EMPTY_WEIGHTS,
      capital: { ...EMPTY_LENS, big_tech: true },
    })
    expect(s).toBe('capital=big_tech')
  })
})

describe('round trip', () => {
  it('reproduces the sender’s state exactly', () => {
    const p = {
      weights: { ...EXAMPLE_WEIGHTS },
      capital: { ...EMPTY_LENS, founder_autocracy: true },
    }
    const parsed = parsePrioritiesParams(`?${serializePrioritiesParams(p)}`)
    expect(parsed).not.toBeNull()
    expect(prioritiesMatch(parsed as NonNullable<typeof parsed>, p)).toBe(true)
  })
})
