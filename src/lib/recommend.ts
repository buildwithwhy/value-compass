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

export interface ProviderRef {
  maker_id: string
  status: string
  source?: string
  retrieval_status?: string
  retrieval_note?: string
  note?: string
}

export interface PilotAlternative {
  id: string
  product: string
  /** Who operates the product. Governance criteria attach here. */
  product_provider: ProviderRef
  /** Whose model serves it. May be unknown without affecting the above. */
  model_provider: ProviderRef
  /** Which model version. Licensing criteria attach here. */
  model_release: { name: string; status: string; note?: string }
  identity_note: string
  functional: Record<string, string>
}

export interface PilotCriterion {
  id: string
  /** Written to be understood on its own, without reading a caveat first. */
  label: string
  /** One plain line under the label. */
  plain?: string
  /**
   * True where the criterion asks a question rather than expressing a desired
   * outcome. We have findings, but there is no direction to prefer, so it is
   * offered as information and never inferred into a preference.
   */
  informational?: boolean
  concept: string
  /** Which of the three identities this criterion can speak to. */
  applies_to: 'product' | 'product_provider' | 'model_release'
  /** The broader claim this finding must NOT be read as. */
  does_not_establish?: string
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

/**
 * True where at least one alternative has a meets/fails verdict on this
 * criterion.
 *
 * This informs the interface; it does NOT gate what a user may require. A
 * requirement we cannot assess stays a requirement and returns an explicit
 * unconfirmed state — silently converting it to a preference would substitute
 * a different intention for the user's.
 */
export function criterionIsAssessable(critId: string): boolean {
  const c = criterionById.get(critId)
  if (!c?.supported) return false
  return assessments.some(
    (a) => a.criterion === critId && (a.verdict === 'meets' || a.verdict === 'fails'),
  )
}

/** How many options have a documented finding either way. Shown before the
 *  visitor chooses, so coverage is not a surprise afterwards. */
export function criterionCoverage(critId: string): { decided: number; total: number } {
  const rows = assessments.filter((a) => a.criterion === critId)
  return {
    decided: rows.filter((a) => a.verdict !== 'unconfirmed').length,
    total: alternatives.length,
  }
}

/**
 * Criteria worth offering first: enough coverage to separate options, and an
 * actual direction to prefer. The rest stay available under "More priorities"
 * with their coverage on show.
 */
export function criterionGroup(c: PilotCriterion): 'core' | 'more' {
  if (c.informational) return 'more'
  return criterionCoverage(c.id).decided >= 2 ? 'core' : 'more'
}

// ---- How a finding reads --------------------------------------------------

export type FindingLabel =
  | 'Documented alignment'
  | 'Documented conflict'
  | 'Not established in our research'

export function findingLabel(verdict: Verdict): FindingLabel {
  if (verdict === 'meets') return 'Documented alignment'
  if (verdict === 'fails') return 'Documented conflict'
  return 'Not established in our research'
}

// ---- Functional eligibility (light) ---------------------------------------

export type FunctionalState = 'confirmed' | 'unknown'

/** Light, and honest about its own weakness: "assumed_from_dataset" is not a
 *  confirmation, so it reads as unknown rather than as a pass. */
export function functionalState(alt: PilotAlternative, reqId: string): FunctionalState {
  const v = alt.functional[reqId]
  return v === 'verified_official' ||
    v === 'verified_official_documentation' ||
    v === 'verified_secondary'
    ? 'confirmed'
    : 'unknown'
}

// ---- The result --------------------------------------------------------

export interface CriterionOutcome {
  criterion: PilotCriterion
  weight: 'requirement' | 'priority'
  verdict: Verdict
  assessment?: Assessment
}

export type Bucket = 'confirmed_match' | 'requirement_not_confirmed' | 'excluded'

export interface AlternativeOutcome {
  alternative: PilotAlternative
  bucket: Bucket
  /** Requirements the evidence says it meets. */
  met: CriterionOutcome[]
  /**
   * No eligible evidence either way. Requirements here block a confirmed
   * match; preferences here are reported and otherwise ignored.
   */
  unresolved: CriterionOutcome[]
  /** Evidence that it fails a stated requirement — the only basis for exclusion. */
  failed: CriterionOutcome[]
  /**
   * Documented alignment with a soft preference. This is FIT, not eligibility:
   * a reason to consider an option, never a reason it qualifies.
   */
  supportingPriorities: CriterionOutcome[]
  /** Documented misalignment with a soft preference — a trade-off, not an exclusion. */
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
  /** Hard requirements we cannot confirm either way. Never shown as satisfied. */
  notConfirmed: AlternativeOutcome[]
  excluded: AlternativeOutcome[]
  /** Criteria the user picked that we cannot assess for anyone. */
  blindCriteria: PilotCriterion[]
  /**
   * Criteria the user made REQUIREMENTS that we cannot assess for any option.
   * The requirement is preserved and the limitation is stated; it is not
   * quietly turned into a preference.
   */
  unassessableRequirements: PilotCriterion[]
  /** True when the user set at least one hard requirement. */
  hasRequirements: boolean
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
      // The user's designation stands whatever the evidence looks like.
      const isRequirement = input.requirements.includes(critId)
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

    // Three states, and the middle one exists so an unknown requirement is
    // never rendered as satisfied.
    //
    //   excluded                  evidence says it FAILS a stated requirement
    //   requirement_not_confirmed a stated requirement (including a functional
    //                             one) cannot be confirmed either way
    //   confirmed_match           every stated requirement is evidenced met
    //
    // Unknown SOFT preferences land in `unresolved` and are reported, but they
    // do not move an option out of confirmed_match — an unknown preference must
    // neither reward nor penalise.
    const unresolvedRequirements = unresolved.filter((r) => r.weight === 'requirement')
    let bucket: Bucket
    if (failed.length > 0) bucket = 'excluded'
    else if (unresolvedRequirements.length > 0 || functionalGaps.length > 0)
      bucket = 'requirement_not_confirmed'
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
    .filter((c) => !criterionIsAssessable(c.id))

  const unassessableRequirements = blindCriteria.filter((c) => input.requirements.includes(c.id))

  // Within a bucket, order by how much is documented — never by a score, and
  // ties are left as ties rather than broken arbitrarily. Ordering is not a
  // ranking: two options with the same documented reasons stay level.
  const byEvidence = (a: AlternativeOutcome, b: AlternativeOutcome) =>
    b.met.length + b.supportingPriorities.length - (a.met.length + a.supportingPriorities.length) ||
    a.unresolved.length - b.unresolved.length ||
    a.alternative.product.localeCompare(b.alternative.product)

  const confirmed = outcomes.filter((o) => o.bucket === 'confirmed_match').sort(byEvidence)
  const notConfirmed = outcomes
    .filter((o) => o.bucket === 'requirement_not_confirmed')
    .sort(byEvidence)
  const excluded = outcomes.filter((o) => o.bucket === 'excluded').sort(byEvidence)

  return {
    confirmed,
    notConfirmed,
    excluded,
    blindCriteria,
    unassessableRequirements,
    hasRequirements: input.requirements.length > 0,
    noConfirmedMatch: confirmed.length === 0,
  }
}

// ---------------------------------------------------------------------------
// Result summary — what the selected preferences actually turned up.
//
// It reports counts and names options. It never nominates a winner, and it
// offers direction only where a single option holds the only documented
// finding in favour — stated as one documented attribute, not a verdict.
// ---------------------------------------------------------------------------

export interface PreferenceSummary {
  criterion: PilotCriterion
  aligned: PilotAlternative[]
  conflicting: PilotAlternative[]
  unresolved: PilotAlternative[]
  /** Set only where exactly one eligible option has a documented alignment
   *  and no other does. Deliberately narrow. */
  soleAligned: PilotAlternative | null
}

export function summarisePreferences(
  result: RecommendationResult,
  input: RecommendationInput,
): PreferenceSummary[] {
  // Counts describe the evidence across every researched option. Reporting only
  // the survivors would delete a documented finding from "what we found" the
  // moment some other requirement excluded the option carrying it.
  const inPlay = new Set(
    [...result.confirmed, ...result.notConfirmed].map((o) => o.alternative.id),
  )

  return input.priorities
    .map((id) => criterionById.get(id))
    .filter((c): c is PilotCriterion => !!c && !c.informational)
    .map((criterion) => {
      const aligned: PilotAlternative[] = []
      const conflicting: PilotAlternative[] = []
      const unresolved: PilotAlternative[] = []
      for (const alt of alternatives) {
        const v = assessmentFor(alt.id, criterion.id)?.verdict ?? 'unconfirmed'
        if (v === 'meets') aligned.push(alt)
        else if (v === 'fails') conflicting.push(alt)
        else unresolved.push(alt)
      }
      // Direction is only worth offering for something the user can still pick.
      const sole = aligned.length === 1 && inPlay.has(aligned[0].id) ? aligned[0] : null
      return { criterion, aligned, conflicting, unresolved, soleAligned: sole }
    })
}
