import { describe, expect, it } from 'vitest'
import fundersRaw from '../../data/funders.json'
import makersRaw from '../../data/makers.json'
import type { Funder, Maker } from '../types'
import {
  findDuplicateFunderIds,
  findDuplicateSlugs,
  findEmptyRequiredFields,
  findUnsourcedScores,
  isUrlSafeSlug,
  validateFunder,
  validateMaker,
  withoutWaivedProblems,
} from '../schema'
import { EMPTY_FIELD_WAIVERS, UNSOURCED_SCORE_WAIVERS } from '../schema-waivers'
import corrupted from './fixtures/corrupted-makers.json'

// Extend the meta-count drift-guard pattern: structural invariants that make
// adding to the dataset safe. A new maker, funder, or axis score cannot ship
// unless it is well-formed — unique URL-safe slug, required fields populated,
// no score without a source, no unscored axis without a stated reason, and
// scores on the observed 0–4 scale. See CONTRIBUTING.md.

const makers = makersRaw.makers as unknown as Maker[]
const funders = fundersRaw.funders as unknown as Funder[]

describe('maker schema guards', () => {
  it('every maker passes the required-field and axis validation', () => {
    // Unsourced scored axes are ratcheted separately (legacy debt); every
    // other rule holds without exception.
    const problems = withoutWaivedProblems(
      makers.flatMap((maker) => validateMaker(maker)),
      UNSOURCED_SCORE_WAIVERS,
    )
    expect(problems).toEqual([])
  })

  it('every maker has a unique, URL-safe slug', () => {
    expect(findDuplicateSlugs(makers)).toEqual([])
    const badSlugs = makers.filter((m) => !isUrlSafeSlug(m.slug))
    expect(badSlugs.map((m) => m.id)).toEqual([])
  })

  it('required fields are populated except for the waived legacy gaps', () => {
    // Both directions asserted: a newly emptied field fails (no waiver for it),
    // and a waiver whose gap was filled fails (the list can only shrink).
    expect(findEmptyRequiredFields(makers)).toEqual([...EMPTY_FIELD_WAIVERS].sort())
  })

  it('every scored axis entry has a non-empty note and a source reference', () => {
    const unsourced = findUnsourcedScores(makers).map((u) => `${u.makerId}|${u.axis}`)
    // Legacy debt the blueprint deferred to the sourced-research workstream
    // lives in the waiver ratchet; anything new fails here. Both directions
    // are asserted so the waiver list can only shrink.
    expect(unsourced.sort()).toEqual([...UNSOURCED_SCORE_WAIVERS].sort())
  })

  it('every unscored axis entry states an explicit reason', () => {
    // Covered structurally by validateMaker, but assert directly so a failure
    // names the rule instead of surfacing as a generic field problem.
    const reasonless = makers.flatMap((maker) =>
      Object.entries(maker.axes)
        .filter(
          ([, entry]) =>
            (entry.score === null || entry.score === 'n/a') &&
            !/^not scored\./i.test(entry.note.trim()),
        )
        .map(([key]) => `${maker.id}|${key}`),
    )
    expect(reasonless).toEqual([])
  })

  it('every score falls within the observed 0–4 integer scale', () => {
    const offScale = makers.flatMap((maker) =>
      Object.entries(maker.axes)
        .filter(([, entry]) => {
          if (entry.score === null || entry.score === 'n/a') return false
          return (
            typeof entry.score !== 'number' ||
            !Number.isInteger(entry.score) ||
            entry.score < 0 ||
            entry.score > 4
          )
        })
        .map(([key]) => `${maker.id}|${key}`),
    )
    expect(offScale).toEqual([])
  })
})

describe('funder schema guards', () => {
  it('every funder passes the required-field and join validation', () => {
    const makerIds = new Set(makers.map((m) => m.id))
    const problems = funders.flatMap((funder) => validateFunder(funder, makerIds))
    expect(problems).toEqual([])
  })

  it('every funder has a unique, URL-safe id', () => {
    expect(findDuplicateFunderIds(funders)).toEqual([])
  })
})

describe('guards fail on a deliberately corrupted fixture', () => {
  // Deliberately malformed — cast from untrusted JSON, like the real data files.
  const badMakers = corrupted.makers as unknown as Maker[]
  const badFunders = corrupted.funders as unknown as Funder[]
  const badMakerIds = new Set(badMakers.map((m) => m.id))

  it('detects an out-of-scale score', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('transparency": score must be an integer 0–4'))
  })

  it('detects a non-integer score', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('labour_integrity": score must be an integer 0–4'))
  })

  it('detects an invalid confidence level', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('confidence must be one of A, B, C'))
  })

  it('detects a scored axis without sources (no-score-without-source rule)', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(
      expect.stringContaining('transparency": scored axis requires at least one source URL'),
    )
  })

  it('detects a scored axis with an empty note', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('transparency": note must not be empty'))
  })

  it('detects an unscored axis without an explicit reason', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(
      expect.stringContaining('culture_esg": unscored entry must state a reason'),
    )
  })

  it('detects an invalid slug format', () => {
    expect(isUrlSafeSlug(badMakers[0].slug)).toBe(false)
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('is not URL-safe'))
  })

  it('detects duplicate slugs', () => {
    expect(findDuplicateSlugs(badMakers)).toEqual(['not-safe!'])
  })

  it('detects a missing required field and a non-array field', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(expect.stringContaining('required field "jurisdiction"'))
    expect(problems).toContainEqual(expect.stringContaining('required field "founders" must be an array'))
  })

  it('detects an unscored axis whose sources is not an array', () => {
    const problems = validateMaker(badMakers[0])
    expect(problems).toContainEqual(
      expect.stringContaining('public_sharing": sources must be an array'),
    )
  })

  it('detects a dangling funder portfolio edge', () => {
    const problems = validateFunder(badFunders[0], badMakerIds)
    expect(problems).toContainEqual(
      expect.stringContaining('"Ghost Maker", which is not a maker id'),
    )
  })

  it('detects an invalid funder id and duplicate funder ids', () => {
    expect(isUrlSafeSlug(badFunders[0].id)).toBe(false)
    expect(findDuplicateFunderIds(badFunders)).toEqual(['bad_capital'])
  })

  it('detects an empty required field via the ratchet function', () => {
    expect(findEmptyRequiredFields(badMakers)).toEqual([
      'Bad Maker One|vc_independent',
      'Bad Maker Two|founders',
      'Bad Maker Two|products_models',
    ])
  })

  it('a valid record in the fixture raises no problems of its own kind', () => {
    // Bad Maker Two exists only to collide slugs; with the collision resolved
    // its axes must validate cleanly — proving the failures above come from
    // the specific corruptions, not from the validator rejecting everything.
    const deDuplicated = badMakers.map((m, i) =>
      i === 0 ? m : { ...m, slug: `bad-maker-two-${i}` },
    )
    const second = validateMaker(deDuplicated[1])
    expect(second).toEqual([])
  })
})
