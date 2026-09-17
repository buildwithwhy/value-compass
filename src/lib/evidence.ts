import evidenceRaw from '../data/evidence.json'
import { makers, numericScore } from './data'
import type {
  AxisEvidence,
  AxisKey,
  EvidenceBasis,
  EvidenceSummary,
  FunderAssociationStatus,
  Funder,
  Maker,
  Relationship,
  RelationshipStatus,
  RelationshipType,
} from './types'

// ---------------------------------------------------------------------------
// The evidence layer, as the UI consumes it.
//
// One idea runs through this file: a number we recorded is not the same thing
// as a number we can stand behind. Everything below exists so the interface can
// say which it is looking at, next to the claim rather than in a footnote.
// ---------------------------------------------------------------------------

const raw = evidenceRaw as any

export const evidenceMeta = raw._meta as {
  title: string
  what_this_is: string
  display_rule: string
  comparison_rule: string
  bases: Record<EvidenceBasis, string>
  summary: EvidenceSummary
}

export const evidenceSummary = evidenceMeta.summary
export const relationshipTypeLabels = raw.relationship_types as Record<RelationshipType, string>
export const relationshipStatusLabels = raw.relationship_statuses as Record<
  RelationshipStatus,
  string
>

const axisEvidence = raw.axis_evidence as Record<string, Record<string, AxisEvidence>>
const funderStatus = raw.funder_association_status as Record<string, FunderAssociationStatus>
const relationships = raw.relationships as Record<string, Relationship>

// A record we have no classification for is treated as unsourced rather than
// quietly assumed good.
const FALLBACK: AxisEvidence = {
  basis: 'unsourced',
  rule: 'No evidence classification on record for this assessment.',
  withheld: false,
  comparable: false,
  entity_sources: [],
  background_sources: [],
  context_used: [],
}

export function axisEvidenceFor(makerId: string, axis: AxisKey): AxisEvidence {
  return axisEvidence[makerId]?.[axis] ?? FALLBACK
}

export function funderAssociationStatus(name: string): FunderAssociationStatus | undefined {
  return funderStatus[name]
}

export function relationshipFor(funderName: string, makerId: string): Relationship | undefined {
  return relationships[`${funderName}→${makerId}`]
}

// ---- How each basis reads in the interface --------------------------------

export interface BasisPresentation {
  label: string
  short: string
  /** One line, written to sit beside the claim it qualifies. */
  meaning: string
  tone: 'sourced' | 'assessment' | 'unknown'
}

export const BASIS: Record<EvidenceBasis, BasisPresentation> = {
  sourced: {
    label: 'Sourced',
    short: 'Sourced',
    meaning: 'Rests on something on record, with a source about this maker.',
    tone: 'sourced',
  },
  unsourced: {
    label: 'No source attached',
    short: 'No source',
    meaning: 'Rests on something on record, but no source about this maker is attached yet.',
    tone: 'assessment',
  },
  contextual: {
    label: 'Inferred from context',
    short: 'Inferred',
    meaning: 'Reasons from where the company is or what it is built on, not from evidence about the company itself.',
    tone: 'assessment',
  },
  non_disclosure: {
    label: 'Not established',
    short: 'Not established',
    meaning: 'Nothing has been published on this. Undisclosed is not the same as bad — so no score is shown.',
    tone: 'unknown',
  },
}

// ---- Score display ---------------------------------------------------------

export interface DisplayScore {
  /** What the compass, matrix and comparisons use. Null means "we are not showing a number". */
  value: number | null
  /** What the dataset recorded, kept whatever we display. */
  recorded: number | null
  withheld: boolean
  comparable: boolean
  basis: EvidenceBasis
  evidence: AxisEvidence
}

export function displayScore(maker: Maker, axis: AxisKey): DisplayScore {
  const ev = axisEvidenceFor(maker.id, axis)
  const recorded = numericScore(maker.axes[axis]?.score ?? null)
  return {
    value: ev.withheld ? null : recorded,
    recorded,
    withheld: ev.withheld,
    comparable: ev.comparable,
    basis: ev.basis,
    evidence: ev,
  }
}

/**
 * Best and worst across a selection, counting only assessments that may take
 * part in a comparison. Returns nulls when there is nothing safe to rank, so a
 * caller can say "too uncertain to rank" instead of inventing a winner.
 */
export function comparableExtremes(
  selection: Maker[],
  axis: AxisKey,
): { best: number | null; worst: number | null; ranked: number; skipped: number } {
  const values: number[] = []
  let skipped = 0
  for (const m of selection) {
    const d = displayScore(m, axis)
    if (d.comparable && d.value != null) values.push(d.value)
    else skipped++
  }
  if (values.length < 2) return { best: null, worst: null, ranked: values.length, skipped }
  const best = Math.max(...values)
  const worst = Math.min(...values)
  if (best === worst) return { best: null, worst: null, ranked: values.length, skipped }
  return { best, worst, ranked: values.length, skipped }
}

// ---- Coverage, for the landing page and the methodology --------------------

export interface Coverage {
  total: number
  sourced: number
  unsourced: number
  contextual: number
  notEstablished: number
  comparable: number
}

export function coverageFor(selection: Maker[] = makers): Coverage {
  const c: Coverage = {
    total: 0,
    sourced: 0,
    unsourced: 0,
    contextual: 0,
    notEstablished: 0,
    comparable: 0,
  }
  for (const m of selection) {
    for (const axis of Object.keys(m.axes) as AxisKey[]) {
      const ev = axisEvidenceFor(m.id, axis)
      c.total++
      if (ev.comparable) c.comparable++
      if (ev.basis === 'sourced') c.sourced++
      else if (ev.basis === 'unsourced') c.unsourced++
      else if (ev.basis === 'contextual') c.contextual++
      else c.notEstablished++
    }
  }
  return c
}

export function makerCoverage(maker: Maker): Coverage {
  return coverageFor([maker])
}

// ---- Backer associations ---------------------------------------------------

/**
 * Whether a funder's `notable_for` entries carry any source. Unsourced ones are
 * shown as unverified rather than as established fact.
 */
export function associationsAreUnverified(f: Funder): boolean {
  return funderAssociationStatus(f.name)?.associations_status === 'unverified'
}
