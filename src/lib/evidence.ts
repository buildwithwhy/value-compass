import evidenceRaw from '../data/evidence.json'
import { makers, numericScore } from './data'
import type {
  AbsenceEvidence,
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
  eligibility_rule: string
  bases: Record<EvidenceBasis, string>
  claim_support: Record<string, string>
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
  claim_support: 'none',
  supported_fact: null,
  source_date: 'not stated in record',
  unsupported_clauses: [],
  scoring_rule: 'No classification on record.',
  justifies_whole: false,
  justification_note: 'No classification on record.',
  provenance: 'automated_provisional',
  decision_eligible: false,
  entity_sources: [],
  background_sources: [],
  context_used: [],
}

// ---------------------------------------------------------------------------
// THE eligibility rule.
//
// Every path that lets one maker outrank, beat or be recommended over another
// goes through this function — ordering, comparison markers, switching
// differences, and any recommendation built later. It is deliberately the only
// place the question is answered, so the four cannot drift apart.
//
// It asks two things, and confidence is not one of them:
//   1. is there relevant, traceable support for the actual claim?
//   2. is the assessment justified by that support?
//
// An A or B confidence flag records how sure an author felt. That is not
// evidence, and on its own it has never been enough to move another company
// up or down a list.
// ---------------------------------------------------------------------------

export function isDecisionEligible(makerId: string, axis: AxisKey): boolean {
  return axisEvidenceFor(makerId, axis).decision_eligible
}

/** Why an assessment cannot drive a decision, in words fit for the interface. */
export function ineligibilityReason(makerId: string, axis: AxisKey): string | null {
  const ev = axisEvidenceFor(makerId, axis)
  if (ev.decision_eligible) return null
  switch (ev.basis) {
    case 'not_established':
      return 'not established in our current research'
    case 'unsourced':
      return 'no source on record for this claim'
    case 'contextual':
      return 'inferred from context, not from evidence about this maker'
    default:
      if (ev.claim_support === 'partial') return 'the cited source covers only part of this claim'
      if (ev.claim_support === 'unreviewed')
        return 'the fit between source and claim has not been reviewed'
      return 'the evidence settles a narrower fact than this score claims'
  }
}

/**
 * The narrow fact a source settles, whatever happened to the axis score.
 * Preserved deliberately: a broad score can fail while the fact under it holds,
 * and these facts are what a narrower, conditional recommendation could rest on.
 */
export function supportedFactFor(makerId: string, axis: AxisKey): string | null {
  return axisEvidenceFor(makerId, axis).supported_fact
}

// ---- Absence evidence ------------------------------------------------------

const absenceEvidence = raw.absence_evidence as Record<string, AbsenceEvidence>

export const absenceRequirements = raw.absence_evidence_requirements as {
  what_counts: string
  attribution: Record<'self_report' | 'independent', string>
  current_count: number
}

/**
 * Evidence that a capital attribute is absent, or undefined. An authored
 * `false` in the source data does NOT reach here — it is a typed value, not a
 * finding, and it resolves to unknown for decision purposes.
 */
export function absenceEvidenceFor(
  makerId: string,
  attribute: string,
): AbsenceEvidence | undefined {
  return absenceEvidence[`${makerId}/${attribute}`]
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

/** Every transcribed relationship touching a maker, whatever its status. */
export function relationshipsFor(makerId: string): Relationship[] {
  return Object.values(relationships).filter((r) => r.maker === makerId)
}

/**
 * Relationships the record does not describe as done. Kept apart from
 * present-tense findings: an announced or contingent commitment is not
 * current ownership.
 */
export function pendingRelationshipsFor(makerId: string): Relationship[] {
  return relationshipsFor(makerId).filter(
    (r) => r.status !== 'completed' && r.status !== 'unspecified',
  )
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
  not_established: {
    label: 'Not established',
    short: 'Not established',
    meaning:
      'Not established in our current research. We have not found a finding for this maker here — that is a gap in our record, not a statement about the company.',
    tone: 'unknown',
  },
}

// ---- Score display ---------------------------------------------------------

export interface DisplayScore {
  /** What the compass and matrix show. Null means "we are not showing a number". */
  value: number | null
  /** What the dataset recorded, kept whatever we display. Preserved for review. */
  recorded: number | null
  withheld: boolean
  /** The single gate — see isDecisionEligible. */
  eligible: boolean
  /** Why not, when not. */
  ineligibleBecause: string | null
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
    eligible: ev.decision_eligible,
    ineligibleBecause: ineligibilityReason(maker.id, axis),
    basis: ev.basis,
    evidence: ev,
  }
}

/**
 * Highest and lowest across a selection, counting only decision-eligible
 * assessments. Returns nulls when there is nothing safe to mark, so a caller
 * says "not enough support to rank" rather than inventing a winner.
 */
export function comparableExtremes(
  selection: Maker[],
  axis: AxisKey,
): { best: number | null; worst: number | null; ranked: number; skipped: number } {
  const values: number[] = []
  let skipped = 0
  for (const m of selection) {
    const d = displayScore(m, axis)
    if (d.eligible && d.value != null) values.push(d.value)
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
  /** Records that pass the eligibility rule. */
  eligible: number
}

export function coverageFor(selection: Maker[] = makers): Coverage {
  const c: Coverage = {
    total: 0,
    sourced: 0,
    unsourced: 0,
    contextual: 0,
    notEstablished: 0,
    eligible: 0,
  }
  for (const m of selection) {
    for (const axis of Object.keys(m.axes) as AxisKey[]) {
      const ev = axisEvidenceFor(m.id, axis)
      c.total++
      if (ev.decision_eligible) c.eligible++
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

export interface AxisCoverage {
  total: number
  /** Makers whose assessment on this axis passes the eligibility rule. */
  eligible: number
  /** Makers where our research has not established a finding on this axis. */
  withheld: number
  sourced: number
}

// Computed once over the static dataset — the panel asks for this on every
// render, and it cannot change without a rebuild.
const axisCoverage = new Map<AxisKey, AxisCoverage>()

/**
 * How much the dataset can actually say on one axis. Shown where a visitor
 * chooses priorities, so an axis the evidence cannot answer is visible as a
 * dead end before it is picked rather than after.
 */
export function coverageByAxis(axis: AxisKey): AxisCoverage {
  const cached = axisCoverage.get(axis)
  if (cached) return cached
  const c: AxisCoverage = { total: 0, eligible: 0, withheld: 0, sourced: 0 }
  for (const m of makers) {
    const ev = axisEvidenceFor(m.id, axis)
    c.total++
    if (ev.decision_eligible) c.eligible++
    if (ev.withheld) c.withheld++
    if (ev.basis === 'sourced') c.sourced++
  }
  axisCoverage.set(axis, c)
  return c
}

// ---- Backer associations ---------------------------------------------------

/**
 * Whether a funder's `notable_for` entries carry any source. Unsourced ones are
 * shown as unverified rather than as established fact.
 */
export function associationsAreUnverified(f: Funder): boolean {
  return funderAssociationStatus(f.name)?.associations_status === 'unverified'
}
