// ---------------------------------------------------------------------------
// Pure schema validators for the src/data/ JSON files.
//
// These back the schema guard tests in src/lib/__tests__/schema-guards.test.ts.
// They return human-readable problem strings (empty array = valid) rather than
// throwing, so a test failure points at the exact record and field. Adding a
// maker, funder, or axis score should keep these lists empty — see
// CONTRIBUTING.md for the field and slug rules they enforce.
// ---------------------------------------------------------------------------

import type { AxisKey, AxisScore, Funder, Maker } from './types'
import { AXIS_KEYS } from './types'

/** URL-safe slug: lowercase letters, digits, hyphen; no leading/trailing hyphen. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CONFIDENCES = ['A', 'B', 'C'] as const
export const AXIS_SCORE_MIN = 0
export const AXIS_SCORE_MAX = 4

export function isUrlSafeSlug(value: unknown): boolean {
  return typeof value === 'string' && SLUG_PATTERN.test(value)
}

/**
 * A score is valid when it is an integer on the 0–4 scale, or an explicit
 * unscored value (null for "not scored" / 'n/a' for "insufficient evidence").
 */
export function isScoreOnScale(score: AxisScore['score']): boolean {
  if (score === null || score === 'n/a') return true
  return (
    typeof score === 'number' &&
    Number.isInteger(score) &&
    score >= AXIS_SCORE_MIN &&
    score <= AXIS_SCORE_MAX
  )
}

export function isScored(entry: AxisScore): boolean {
  return entry.score !== null && entry.score !== 'n/a'
}

/**
 * One axis entry. Scored entries need a note and at least one source URL
 * (the no-score-without-source rule); unscored entries need a note that
 * states a reason, by convention starting with "Not scored.".
 */
export function validateAxisEntry(
  context: string,
  key: AxisKey,
  entry: AxisScore,
): string[] {
  const problems: string[] = []
  const label = `${context}: axis "${key}"`

  if (!entry || typeof entry !== 'object') {
    return [`${label}: entry is missing or not an object`]
  }

  if (!(CONFIDENCES as readonly string[]).includes(entry.confidence)) {
    problems.push(`${label}: confidence must be one of A, B, C`)
  }

  if (!isScoreOnScale(entry.score)) {
    problems.push(
      `${label}: score must be an integer 0–4, null, or 'n/a' (got ${JSON.stringify(entry.score)})`,
    )
  }

  if (typeof entry.note !== 'string' || entry.note.trim() === '') {
    problems.push(`${label}: note must not be empty`)
  } else if (!isScored(entry) && !/^not scored\./i.test(entry.note.trim())) {
    problems.push(
      `${label}: unscored entry must state a reason, by convention a note starting with "Not scored."`,
    )
  }

  if (isScored(entry)) {
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      problems.push(
        `${label}: scored axis requires at least one source URL — no score without a source (leave the axis null/'n/a' instead)`,
      )
    } else if (entry.sources.some((s) => typeof s !== 'string' || s.trim() === '')) {
      problems.push(`${label}: every source must be a non-empty URL string`)
    }
  } else if (!Array.isArray(entry.sources)) {
    problems.push(`${label}: sources must be an array (empty for an unscored axis)`)
  }

  return problems
}

/** One maker record: required fields present with correct types, all six axes valid.
 *
 * Non-emptiness of string/array content is a separate concern (see
 * findEmptyRequiredFields): the dataset carries waived legacy gaps, and
 * ratcheting them lives in the test layer, not in the type-level check.
 */
export function validateMaker(maker: Maker): string[] {
  const context = `maker "${maker?.id ?? '<missing id>'}"`

  if (!maker || typeof maker !== 'object') {
    return ['maker record is missing or not an object']
  }

  const problems: string[] = []

  const stringFields = [
    'id',
    'name',
    'slug',
    'tier',
    'jurisdiction',
    'vc_independent',
    'structure',
    'stated_values',
    'tension_hook',
  ] as const
  for (const field of stringFields) {
    if (typeof maker[field] !== 'string') {
      problems.push(`${context}: required field "${field}" must be a string`)
    }
  }

  if (!isUrlSafeSlug(maker.slug)) {
    problems.push(
      `${context}: slug "${String(maker.slug)}" is not URL-safe (lowercase letters, digits, hyphens)`,
    )
  }

  for (const field of ['products_models', 'founders'] as const) {
    if (!Array.isArray(maker[field])) {
      problems.push(`${context}: required field "${field}" must be an array`)
    }
  }

  if (!maker.axes || typeof maker.axes !== 'object') {
    problems.push(`${context}: required field "axes" is missing`)
    return problems
  }

  for (const key of AXIS_KEYS) {
    const entry = maker.axes[key]
    if (!entry) {
      problems.push(`${context}: axis "${key}" is missing`)
    } else {
      problems.push(...validateAxisEntry(context, key, entry))
    }
  }

  return problems
}

/** One funder record: required fields, URL-safe id, portfolio edges reference real maker ids. */
export function validateFunder(funder: Funder, makerIds: ReadonlySet<string>): string[] {
  const context = `funder "${funder?.name ?? '<missing name>'}"`

  if (!funder || typeof funder !== 'object') {
    return ['funder record is missing or not an object']
  }

  const problems: string[] = []

  for (const field of ['id', 'name', 'parent_type'] as const) {
    const value = funder[field]
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${context}: required field "${field}" must be a non-empty string`)
    }
  }

  if (!isUrlSafeSlug(funder.id)) {
    problems.push(
      `${context}: id "${String(funder.id)}" is not URL-safe (lowercase letters, digits, hyphens)`,
    )
  }

  for (const field of ['makers_backed', 'owns_outright'] as const) {
    const targets = funder[field]
    if (!targets) continue
    if (!Array.isArray(targets)) {
      problems.push(`${context}: field "${field}" must be an array`)
      continue
    }
    for (const target of targets) {
      if (!makerIds.has(target)) {
        problems.push(
          `${context}: "${field}" references "${target}", which is not a maker id (join on id, not display name)`,
        )
      }
    }
  }

  return problems
}

/** Maker slugs appearing more than once — slugs are route addresses, so duplicates collide. */
export function findDuplicateSlugs(makers: readonly Maker[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const maker of makers) {
    if (typeof maker?.slug === 'string') {
      if (seen.has(maker.slug)) duplicates.add(maker.slug)
      seen.add(maker.slug)
    }
  }
  return [...duplicates].sort()
}

/** Funder ids appearing more than once — ids are the join key and route addresses. */
export function findDuplicateFunderIds(funders: readonly Funder[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const funder of funders) {
    if (typeof funder?.id === 'string') {
      if (seen.has(funder.id)) duplicates.add(funder.id)
      seen.add(funder.id)
    }
  }
  return [...duplicates].sort()
}

export interface UnsourcedScore {
  makerId: string
  axis: AxisKey
}

/** Required maker fields whose content is present but empty, keyed `makerId|field`. */
export function findEmptyRequiredFields(makers: readonly Maker[]): string[] {
  const found: string[] = []
  for (const maker of makers) {
    if (!maker || typeof maker !== 'object') continue
    for (const field of [
      'id',
      'name',
      'slug',
      'tier',
      'jurisdiction',
      'vc_independent',
      'structure',
      'stated_values',
      'tension_hook',
      'products_models',
      'founders',
    ] as const) {
      const value = maker[field]
      const isEmptyString = typeof value === 'string' && value.trim() === ''
      const isEmptyArray = Array.isArray(value) && value.length === 0
      if (isEmptyString || isEmptyArray) found.push(`${maker.id}|${field}`)
    }
  }
  return found.sort()
}

/** All scored-but-unsourced axis entries, as `makerId|axis` keys for the waiver ratchet. */
export function findUnsourcedScores(makers: readonly Maker[]): UnsourcedScore[] {
  const found: UnsourcedScore[] = []
  for (const maker of makers) {
    if (!maker?.axes) continue
    for (const key of AXIS_KEYS) {
      const entry = maker.axes[key]
      if (entry && isScored(entry) && (!Array.isArray(entry.sources) || entry.sources.length === 0)) {
        found.push({ makerId: maker.id, axis: key })
      }
    }
  }
  return found
}

/**
 * Drop problems that match a waived `makerId|axis` legacy-debt key, so a test
 * over validateMaker output can hold every other rule strictly while the
 * unsourced-score debt is ratcheted separately (see schema-waivers.ts).
 */
export function withoutWaivedProblems(
  problems: readonly string[],
  waivedKeys: readonly string[],
): string[] {
  const waived = new Set(waivedKeys)
  return problems.filter((problem) => {
    const match = problem.match(
      /^maker "(.*)": axis "(.*)": scored axis requires at least one source URL/,
    )
    return !(match && waived.has(`${match[1]}|${match[2]}`))
  })
}
