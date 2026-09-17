import pilotRaw from '../data/recommendation-pilot.json'

// ---------------------------------------------------------------------------
// Recommendation preview — deliberately small.
//
// It reads the researched pilot records and sorts alternatives into three
// states. It computes no score, produces no ranking number, and never fills a
// shortlist to reach a target.
//
// Three rules it will not break:
//
//   1. A priority is a SOFT preference. It orders and explains; it never
//      excludes. A criterion excludes only when the user explicitly makes it a
//      requirement, and only for criteria the evidence can actually assess.
//   2. Unknown is not a verdict. An option with an unresolved requirement is
//      neither shortlisted nor excluded — it is unconfirmed, and we say what
//      is missing.
//   3. An exclusion needs evidence that the option FAILS, not an absence of
//      evidence that it passes.
// ---------------------------------------------------------------------------

const raw = pilotRaw as any

export interface PilotAlternative {
  id: string
  product: string
  provider_maker_id: string
  identity_status: string
  identity_source: string
  identity_note: string
  functional: Record<string, string>
}

export interface PilotCriterion {
  id: string
  label: string
  concept: string
  distinct_from?: string
  supported: boolean
  unsupported_note?: string
}

export type Verdict = 'meets' | 'fails' | 'unconfirmed'
export type FindingStatus = 'in_force' | 'proposed' | 'withdrawn'

export interface Assessment {
  alternative: string
  criterion: string
  verdict: Verdict
  status: FindingStatus
  claim: string
  claim_type: string
  source: string
  source_date: string | null
  scope: string | null
  uncertainty: string
  provenance: string
}

export const pilotMeta = raw._meta
export const pilotCategory = raw.category
export const functionalRequirements = raw.functional_requirements as {
  id: string
  label: string
}[]
export const alternatives = raw.alternatives as PilotAlternative[]
export const criteria = raw.criteria as PilotCriterion[]
export const assessments = raw.assessments as Assessment[]

export const criterionById = new Map(criteria.map((c) => [c.id, c]))
export const alternativeById = new Map(alternatives.map((a) => [a.id, a]))

export function assessmentFor(altId: string, critId: string): Assessment | undefined {
  return assessments.find((a) => a.alternative === altId && a.criterion === critId)
}

/** True where at least one alternative has a meets/fails verdict on this
 *  criterion. Only these may be designated a requirement. */
export function criterionIsAssessable(critId: string): boolean {
  const c = criterionById.get(critId)
  if (!c?.supported) return false
  return assessments.some(
    (a) => a.criterion === critId && (a.verdict === 'meets' || a.verdict === 'fails'),
  )
}

// ---- Functional eligibility (light) ---------------------------------------

export type FunctionalState = 'confirmed' | 'unknown'

/** Light, and honest about its own weakness: "assumed_from_dataset" is not a
 *  confirmation, so it reads as unknown rather than as a pass. */
export function functionalState(alt: PilotAlternative, reqId: string): FunctionalState {
  const v = alt.functional[reqId]
  return v === 'verified_official' || v === 'verified_secondary' ? 'confirmed' : 'unknown'
}

// ---- The result --------------------------------------------------------

export interface CriterionOutcome {
  criterion: PilotCriterion
  weight: 'requirement' | 'priority'
  verdict: Verdict
  assessment?: Assessment
}

export interface AlternativeOutcome {
  alternative: PilotAlternative
  /** confirmed_match | potentially_relevant | excluded */
  bucket: 'confirmed_match' | 'potentially_relevant' | 'excluded'
  /** Requirements the evidence says it meets. */
  met: CriterionOutcome[]
  /** Requirements or priorities with no eligible evidence either way. */
  unresolved: CriterionOutcome[]
  /** Evidence that it fails a stated requirement — the only basis for exclusion. */
  failed: CriterionOutcome[]
  /** Soft priorities it is evidenced to meet, used to explain rather than rank. */
  supportingPriorities: CriterionOutcome[]
  /** Soft priorities it is evidenced to fail — a trade-off, not an exclusion. */
  tradeoffs: CriterionOutcome[]
  /** Functional requirements the user asked for that we cannot confirm. */
  functionalGaps: { id: string; label: string }[]
}

export interface RecommendationInput {
  /** Functional requirements the user needs. */
  functional: string[]
  /** Criterion ids the user cares about, in no order. */
  priorities: string[]
  /** Subset of priorities the user has explicitly made hard requirements. */
  requirements: string[]
}

export interface RecommendationResult {
  confirmed: AlternativeOutcome[]
  potential: AlternativeOutcome[]
  excluded: AlternativeOutcome[]
  /** Criteria the user picked that we cannot assess for anyone. */
  blindCriteria: PilotCriterion[]
  /** True when nothing could be confirmed — a state to explain, not to hide. */
  noConfirmedMatch: boolean
}

export function recommend(input: RecommendationInput): RecommendationResult {
  const outcomes: AlternativeOutcome[] = alternatives.map((alt) => {
    const met: CriterionOutcome[] = []
    const unresolved: CriterionOutcome[] = []
    const failed: CriterionOutcome[] = []
    const supportingPriorities: CriterionOutcome[] = []
    const tradeoffs: CriterionOutcome[] = []

    for (const critId of input.priorities) {
      const criterion = criterionById.get(critId)
      if (!criterion) continue
      const assessment = assessmentFor(alt.id, critId)
      const verdict: Verdict = assessment?.verdict ?? 'unconfirmed'
      const isRequirement = input.requirements.includes(critId) && criterionIsAssessable(critId)
      const row: CriterionOutcome = {
        criterion,
        weight: isRequirement ? 'requirement' : 'priority',
        verdict,
        assessment,
      }

      if (isRequirement) {
        if (verdict === 'meets') met.push(row)
        else if (verdict === 'fails') failed.push(row)
        else unresolved.push(row)
      } else {
        if (verdict === 'meets') supportingPriorities.push(row)
        else if (verdict === 'fails') tradeoffs.push(row)
        else unresolved.push(row)
      }
    }

    const functionalGaps = input.functional
      .filter((reqId) => functionalState(alt, reqId) === 'unknown')
      .map((reqId) => ({
        id: reqId,
        label: functionalRequirements.find((f) => f.id === reqId)?.label ?? reqId,
      }))

    // Exclusion requires evidence of failure against a stated requirement.
    // Nothing else excludes — not a functional gap, and never an unknown.
    let bucket: AlternativeOutcome['bucket']
    if (failed.length > 0) bucket = 'excluded'
    else if (unresolved.length > 0 || functionalGaps.length > 0) bucket = 'potentially_relevant'
    else bucket = 'confirmed_match'

    return {
      alternative: alt,
      bucket,
      met,
      unresolved,
      failed,
      supportingPriorities,
      tradeoffs,
      functionalGaps,
    }
  })

  const blindCriteria = input.priorities
    .map((id) => criterionById.get(id))
    .filter((c): c is PilotCriterion => !!c)
    .filter((c) => !assessments.some((a) => a.criterion === c.id && a.verdict !== 'unconfirmed'))

  // Within a bucket, order by how much is evidenced — never by a score, and
  // ties are left as ties rather than broken arbitrarily.
  const byEvidence = (a: AlternativeOutcome, b: AlternativeOutcome) =>
    b.met.length + b.supportingPriorities.length - (a.met.length + a.supportingPriorities.length) ||
    a.unresolved.length - b.unresolved.length ||
    a.alternative.product.localeCompare(b.alternative.product)

  const confirmed = outcomes.filter((o) => o.bucket === 'confirmed_match').sort(byEvidence)
  const potential = outcomes.filter((o) => o.bucket === 'potentially_relevant').sort(byEvidence)
  const excluded = outcomes.filter((o) => o.bucket === 'excluded').sort(byEvidence)

  return {
    confirmed,
    potential,
    excluded,
    blindCriteria,
    noConfirmedMatch: confirmed.length === 0,
  }
}
