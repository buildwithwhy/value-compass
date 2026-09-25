import pilotRaw from '../data/recommendation-pilot.json'
import makersRaw from '../data/makers.json'

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

/** A documented limit on getting at the product at all — not a capability. */
export interface AccessNote {
  label: string
  detail: string
  source: string
}

export interface PilotPlan {
  id: string
  label: string
}

export interface PilotAlternative {
  id: string
  product: string
  /** Which recommendation category this product belongs to. */
  category?: string
  /** One factual sentence, shown before any preference is chosen. */
  discovery?: string
  /** One short useful fact for this category. Authored, not research prose. */
  discovery_fact?: string
  /** Which evidence record the fact summarises, so it can be rechecked. */
  discovery_fact_from?: string
  official_url?: string
  /**
   * Named plans, where a finding actually differs between them. Empty means
   * every finding we hold is plan-invariant, so no selector is offered.
   * Labels are the provider's own and are never equated across companies.
   */
  plans?: PilotPlan[]
  /** Who operates the product. Governance criteria attach here. */
  product_provider: ProviderRef
  /** Whose model serves it. May be unknown without affecting the above. */
  model_provider: ProviderRef
  /** Which model version. Licensing criteria attach here. */
  model_release: { name: string; status: string; note?: string }
  identity_note: string
  functional: Record<string, string>
  /**
   * True where the operator serves models it does not publish. Worth showing
   * plainly: it means the governance you are choosing and the model you are
   * talking to belong to different companies.
   */
  uses_third_party_models?: boolean
  access_notes?: AccessNote[]
  /**
   * Who gets paid, who owns it, what it runs on, and the specific things we
   * could not establish. Deliberately prose: these are relationships a person
   * reads, not a graph to traverse.
   */
  relationships?: {
    pays: string
    free_tier?: string
    owners: string[]
    suppliers: string[]
    unknowns: string[]
  }
  /**
   * Whether the operator has a page in the maker directory. Computed from
   * makers.json when the pilot is built, so it cannot drift from the
   * directory by being authored twice.
   */
  maker_in_directory?: boolean
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
  /** Categories this question applies to. */
  categories?: string[]
  informational?: boolean
  /**
   * Supporting evidence rather than a headline question. Still selectable and
   * still capable of excluding when made a must-have — it simply stops being
   * what a motivation leads with. Share-voting findings sit here: they are the
   * best-sourced governance evidence we have and the worst summary of "who am
   * I empowering".
   */
  nested?: boolean
  concept: string
  /** Which of the three identities this criterion can speak to. */
  applies_to: 'product' | 'product_provider' | 'model_release'
  /** The broader claim this finding must NOT be read as. */
  does_not_establish?: string
  distinct_from?: string
  supported: boolean
  unsupported_note?: string
}

const makerIds = new Set<string>(
  ((makersRaw as any).makers as Array<{ id: string }>).map((m) => m.id),
)

/** Does this operator have a maker page to link to? */
export function makerInDirectory(makerId: string): boolean {
  return makerIds.has(makerId)
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
  source_url?: string
  /** The practical answer, in the words a person choosing a tool would use. */
  plain?: string
  /** A qualification that changes the decision. Stays beside the answer. */
  condition?: string | null
  /**
   * Verdicts that differ by plan. The top-level verdict is the answer when no
   * plan is chosen, which is deliberately the unresolved one rather than the
   * most favourable tier.
   */
  by_plan?: Record<string, { verdict: Verdict; claim: string; scope?: string; uncertainty?: string }>
  /** A policy that has been announced but has not started yet. */
  effective_from?: string
  /** Regions the finding explicitly does not apply to. */
  regions_excluded?: string[]
}

export const pilotMeta = raw._meta
export const pilotCategory = raw.category
export const functionalRequirements = raw.functional_requirements as {
  id: string
  label: string
}[]
export interface PilotCategoryDef {
  id: string
  label: string
  definition: string
  researched_on: string
  scope_note?: string
}
export const categories = raw.categories as PilotCategoryDef[]
export const DEFAULT_CATEGORY = categories[0].id

export const alternatives = raw.alternatives as PilotAlternative[]

/** Products in one category, alphabetical. Categories never mix. */
export function alternativesIn(category: string): PilotAlternative[] {
  return alternatives
    .filter((a) => a.category === category)
    .sort((x, y) => x.product.localeCompare(y.product))
}
export const criteria = raw.criteria as PilotCriterion[]

export function criteriaIn(category: string): PilotCriterion[] {
  return criteria.filter((c) => (c.categories ?? []).includes(category))
}
export function functionalIn(category: string) {
  return functionalRequirements.filter((f) =>
    ((f as { categories?: string[] }).categories ?? []).includes(category),
  )
}
export const assessments = raw.assessments as Assessment[]

export const criterionById = new Map(criteria.map((c) => [c.id, c]))
export const alternativeById = new Map(alternatives.map((a) => [a.id, a]))

/**
 * The vocabulary a functional record may use. Kept explicit because a value
 * outside it silently reads as "not verified" — which is how a third spelling
 * of "verified_official_documentation" quietly turned four researched
 * capabilities into gaps.
 */
export const FUNCTIONAL_STATUSES = [
  'verified_official_documentation',
  'verified_secondary',
  'unknown',
] as const

function isVerified(v: string | undefined): boolean {
  return v === 'verified_official_documentation' || v === 'verified_secondary'
}

/**
 * Capabilities every alternative in the category is verified to have. They are
 * the price of entry rather than a distinction, so cards state the ones that
 * differ and the page states these once.
 */
export const baselineCapabilityIds = new Set(
  functionalRequirements
    .filter((f) => alternatives.every((a) => isVerified(a.functional[f.id])))
    .map((f) => f.id),
)

/**
 * The task/capability tags we have actually verified for an alternative.
 *
 * These are the same researched functional records the filters use — not a new
 * benchmark. A tag missing here means we did not verify it, NOT that the
 * product lacks it, and nothing about relative quality is implied: two products
 * carrying the same tag have not been compared on how well they do it.
 */
export function verifiedCapabilities(
  alt: PilotAlternative,
): { id: string; label: string; secondhand: boolean }[] {
  return functionalRequirements
    .filter((f) => isVerified(alt.functional[f.id]))
    .map((f) => ({
      id: f.id,
      label: f.label,
      secondhand: alt.functional[f.id] === 'verified_secondary',
    }))
}

export function assessmentFor(altId: string, critId: string): Assessment | undefined {
  return assessments.find((a) => a.alternative === altId && a.criterion === critId)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * The verdict that actually applies, given the plan the visitor chose and the
 * date we are asking on.
 *
 * Three rules, each a real failure this guards against:
 *
 *   1. No plan chosen means the plan-unspecified verdict — never the most
 *      favourable tier. An unspecified plan cannot inherit an enterprise
 *      protection.
 *   2. A policy that starts in the future is not a description of today. It
 *      is reported, and it does not decide anything until it takes effect.
 *   3. A finding that excludes some regions cannot be applied as a general
 *      answer while we do not know where the visitor is.
 */
/**
 * Why an answer is unresolved. "We have not looked" and "it depends on your
 * plan, your region, or a date that has not arrived" are different answers,
 * and telling a reader the second is a research gap is simply wrong.
 */
export type UnresolvedKind = 'conditional' | 'conflicting' | 'unresearched'

export function unresolvedKind(altId: string, critId: string): UnresolvedKind {
  const a = assessmentFor(altId, critId)
  if (!a) return 'unresearched'
  if (a.effective_from || a.regions_excluded || a.by_plan) return 'conditional'
  if (/conflict/i.test(a.uncertainty ?? '')) return 'conflicting'
  return 'unresearched'
}

/** Which of a product's plans meet a criterion, so a visitor can see the
 *  options before committing to one. Null where the product has no plans or
 *  the finding does not vary by plan. */
export function planAvailability(
  altId: string,
  critId: string,
): { qualifying: PilotPlan[]; other: PilotPlan[] } | null {
  const alt = alternativeById.get(altId)
  const a = assessmentFor(altId, critId)
  if (!alt?.plans?.length || !a?.by_plan) return null
  const qualifying = alt.plans.filter((p) => a.by_plan![p.id]?.verdict === 'meets')
  return { qualifying, other: alt.plans.filter((p) => !qualifying.includes(p)) }
}

/**
 * The answer in consumer terms.
 *
 * "Not established in our research" covers four different situations, and a
 * person choosing a tool needs to know which one they are in: is it their
 * plan, a policy that has not started, two pages that disagree, or a gap.
 */
export type AnswerLabel =
  | 'Yes'
  | 'No'
  | 'Depends on your plan'
  | 'Published policies disagree'
  | 'Takes effect later'
  | 'Not confirmed'

export function answerLabel(altId: string, critId: string, verdict: Verdict): AnswerLabel {
  if (verdict === 'meets') return 'Yes'
  if (verdict === 'fails') return 'No'
  const a = assessmentFor(altId, critId)
  if (a?.effective_from) return 'Takes effect later'
  if (a?.by_plan) return 'Depends on your plan'
  if (/conflict|disagree/i.test(a?.uncertainty ?? '')) return 'Published policies disagree'
  return 'Not confirmed'
}

export function resolvedVerdict(
  altId: string,
  critId: string,
  plan?: string,
  asOf: string = todayISO(),
): { verdict: Verdict; assessment?: Assessment; reason?: 'future' | 'regional' } {
  const a = assessmentFor(altId, critId)
  if (!a) return { verdict: 'unconfirmed' }

  if (a.effective_from && a.effective_from > asOf) {
    return { verdict: 'unconfirmed', assessment: a, reason: 'future' }
  }
  if (a.regions_excluded && a.regions_excluded.length > 0) {
    return { verdict: 'unconfirmed', assessment: a, reason: 'regional' }
  }
  if (plan && a.by_plan && a.by_plan[plan]) {
    return { verdict: a.by_plan[plan].verdict, assessment: a }
  }
  return { verdict: a.verdict, assessment: a }
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
export function criterionCoverage(
  critId: string,
  category?: string,
): { decided: number; conditional: number; total: number } {
  // Coverage is per category. A question shared by both categories has a
  // different answer in each, and showing the combined number would misreport
  // how much is known about the products actually on screen.
  const cats = criterionById.get(critId)?.categories ?? []
  const scope = alternatives.filter((a) =>
    category ? a.category === category : cats.includes(a.category ?? ''),
  )
  const ids = new Set(scope.map((a) => a.id))
  const rows = assessments.filter((a) => a.criterion === critId && ids.has(a.alternative))
  // An answer that depends on a plan is evidence we hold, not evidence we
  // lack. Counting it as nothing made a researched question look unresearched.
  const conditional = rows.filter(
    (a) => a.verdict === 'unconfirmed' && a.by_plan &&
      Object.values(a.by_plan).some((v) => v.verdict !== 'unconfirmed'),
  ).length
  return {
    decided: rows.filter((a) => a.verdict !== 'unconfirmed').length,
    conditional,
    total: scope.length,
  }
}

/**
 * Criteria worth offering first: enough coverage to separate options, and an
 * actual direction to prefer. The rest stay available under "More priorities"
 * with their coverage on show.
 */
/** @deprecated Criteria are grouped by motivation now. Kept for the coverage
 *  tests, which still care about how thin a criterion's evidence is. */
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
  // One definition of "verified", shared with the capability tags. The records
  // previously carried two spellings of the same status; they are normalised in
  // the data and FUNCTIONAL_STATUSES is asserted in the tests so a third cannot
  // reappear and read as unknown.
  return isVerified(alt.functional[reqId]) ? 'confirmed' : 'unknown'
}

// ---- The result --------------------------------------------------------

export interface CriterionOutcome {
  /** Which product this row belongs to, so the row can show its plan options. */
  alternativeId: string
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
  /** Which category is being asked about. Results never cross categories. */
  category?: string
  /** Chosen plan per product id, where the product offers a choice. */
  plans?: Record<string, string>
  /** Date to evaluate announced policies against. Tests pin this. */
  asOf?: string
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
  // Results never cross categories: the pool, the counts and the guidance
  // are all drawn from the one the visitor is asking about.
  const category = input.category ?? DEFAULT_CATEGORY
  const pool = alternativesIn(category)
  const outcomes: AlternativeOutcome[] = pool.map((alt) => {
    const met: CriterionOutcome[] = []
    const unresolved: CriterionOutcome[] = []
    const failed: CriterionOutcome[] = []
    const supportingPriorities: CriterionOutcome[] = []
    const tradeoffs: CriterionOutcome[] = []

    for (const critId of input.priorities) {
      const criterion = criterionById.get(critId)
      if (!criterion) continue
      const resolved = resolvedVerdict(alt.id, critId, input.plans?.[alt.id], input.asOf)
      const assessment = resolved.assessment
      const verdict: Verdict = resolved.verdict
      // The user's designation stands whatever the evidence looks like.
      const isRequirement = input.requirements.includes(critId)
      const row: CriterionOutcome = {
        alternativeId: alt.id,
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

  // Alphabetical within every group, always.
  //
  // Ordering by supporting findings still read as a ranking however it was
  // labelled, and it tracked how much we had researched an option rather than
  // anything about the option. Guidance now comes from the summary, which can
  // say WHY, so position is free to carry nothing at all.
  const byName = (a: AlternativeOutcome, b: AlternativeOutcome) =>
    a.alternative.product.localeCompare(b.alternative.product)

  const confirmed = outcomes.filter((o) => o.bucket === 'confirmed_match').sort(byName)
  const notConfirmed = outcomes
    .filter((o) => o.bucket === 'requirement_not_confirmed')
    .sort(byName)
  const excluded = outcomes.filter((o) => o.bucket === 'excluded').sort(byName)

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

// ---------------------------------------------------------------------------
// Motivations — broad starting questions.
//
// These are NOT axes, scores, or bundles. Opening one reveals the concrete
// criteria we can actually assess underneath it, and the user still ticks
// those individually. Each carries what it does NOT establish, because the
// gap between a motivation and the evidence we hold is the easiest place for
// this page to mislead.
// ---------------------------------------------------------------------------

/** A distinct question inside a motivation. Control, financial benefit and
 *  supplier dependency are different relationships and must not be blurred. */
export interface MotivationGroup {
  heading: string
  blurb?: string
  criterionIds: string[]
}

export interface Motivation {
  id: string
  /** The question a person might arrive with. */
  question: string
  /** What we can speak to underneath it. */
  blurb: string
  criterionIds: string[]
  /** Wording that differs by category — a builder asks about code, not chats. */
  blurb_by_category?: Record<string, string>
  /** Sub-questions, where one motivation covers several distinct relationships. */
  groups?: MotivationGroup[]
  /** Behind a disclosure. Each is a claim this section must not be taken to
   *  support — but they are context, not the lead. */
  limits: string[]
  /** Named where the dataset does not yet cover the motivation properly. */
  gap?: string
}

export const motivations: Motivation[] = [
  {
    id: 'm_power',
    question: 'Who am I empowering with this choice?',
    blurb:
      'Who controls the company, who benefits financially from it, and which other companies it depends on.',
    criterionIds: [
      'c_nonprofit_control',
      'c_parent_independence',
      'c_individual_majority_voting',
      'c_founder_bloc_majority_voting',
      'c_board_election_rights',
      'c_public_purpose_stake',
      'c_public_benefit',
      'c_ownership_shape',
    ],
    groups: [
      {
        heading: 'Who controls the company I’m supporting?',
        blurb: 'Parent companies, controlling owners and who decides the board.',
        criterionIds: [
          'c_nonprofit_control',
          'c_parent_independence',
          'c_individual_majority_voting',
          'c_founder_bloc_majority_voting',
          'c_board_election_rights',
        ],
      },
      {
        heading: 'Who benefits financially from my choice?',
        blurb:
          'Who receives the money, and whether any public-purpose body has a real economic stake — which is not the same as a mission.',
        criterionIds: ['c_public_purpose_stake', 'c_public_benefit'],
      },
      {
        heading: 'Which other companies does this product depend on?',
        blurb:
          'Model suppliers and commercial dependencies. Shown as context on each option rather than as something to prefer — a third-party supplier can be better or worse for you depending on why you care.',
        criterionIds: ['c_ownership_shape'],
      },
    ],
    limits: [
      'Controlling a company and benefiting financially from it are different. One provider here has a trust that controls the board and is deliberately insulated from any financial interest.',
      'A public-benefit duty obliges directors to weigh other interests. It distributes nothing, and is not evidence that anyone is paid.',
      'An investor’s stake does not mean your subscription is paid to that investor, and using a supplier’s model does not tell us the payment terms.',
      'Holding no voting majority does not mean holding no control of the board.',
    ],
  },
  {
    id: 'm_control',
    question: 'How much control do I keep — and can I leave?',
    blurb:
      'Whether your conversations train the model, whether you can stop that yourself, and whether you can take your history with you.',
    blurb_by_category: {
      app_builder:
        'Whether your prompts and code train the model, whether you can stop that yourself, and whether you can take the project with you.',
    },
    criterionIds: [
      'c_training_default',
      'c_training_control',
      'c_content_export',
      'c_account_transfer',
      'c_service_migration',
      'c_model_hosting',
      // App builders ask the same questions about different objects: your
      // project code rather than your conversations.
      'c_work_training_default',
      'c_work_training_control',
      'c_code_export',
      'c_external_hosting',
      'c_backend_migration',
    ],
    limits: [
      'Training, retention and advertising are separate uses. Stopping one does not stop the others, and several providers say so explicitly.',
      'Exporting a file is not the same as using it somewhere else.',
      'Being able to run a model yourself is not being able to reproduce the service built around it.',
    ],
  },
  {
    id: 'm_conduct',
    question: 'Have they behaved consistently with what they say?',
    blurb: 'Whether a commitment, once adopted, has been kept.',
    criterionIds: ['c_commitment_continuity'],
    limits: [
      'A commitment is a statement of intent, not evidence of any outcome.',
      'This pilot holds no findings about workers, creators or anyone whose data or labour went into these systems. Nothing here should be read as covering them.',
    ],
    gap:
      'Only one option has a documented finding, and it is a withdrawal. Absence of a finding for the other twelve is absence of research, not a clean record.',
  },
]

/** The criteria of a motivation that apply in one category. */
export function motivationCriteria(m: Motivation, category: string): PilotCriterion[] {
  return m.criterionIds
    .map((id) => criterionById.get(id))
    .filter((c): c is PilotCriterion => !!c && (c.categories ?? []).includes(category))
}

/** Motivations that have anything to ask in this category. */
export function motivationBlurb(m: Motivation, category: string): string {
  return m.blurb_by_category?.[category] ?? m.blurb
}

export function motivationsIn(category: string): Motivation[] {
  return motivations.filter((m) => motivationCriteria(m, category).length > 0)
}

/** Every criterion belongs to exactly one motivation; asserted in the tests. */
export const motivationForCriterion = new Map<string, Motivation>(
  motivations.flatMap((m) => m.criterionIds.map((id) => [id, m] as [string, Motivation])),
)

/** How many of a motivation's criteria have any documented finding at all. */
export function motivationCoverage(
  m: Motivation,
  category: string = DEFAULT_CATEGORY,
): { documented: number; total: number } {
  const cs = motivationCriteria(m, category)
  const documented = cs.filter((c) => criterionCoverage(c.id, category).decided > 0).length
  return { documented, total: cs.length }
}

export interface PreferenceSummary {
  criterion: PilotCriterion
  aligned: PilotAlternative[]
  conflicting: PilotAlternative[]
  unresolved: PilotAlternative[]
  /** Why the unresolved ones are unresolved, where they agree on a reason. */
  unresolvedKinds: UnresolvedKind[]
  /**
   * Options that could meet this on a plan the visitor has not selected.
   * Showing these is the difference between "we found nothing" and "we found
   * something, and here is what it would take".
   */
  planRoutes: { alternative: PilotAlternative; plans: PilotPlan[] }[]
  /**
   * True where the criterion has a documented finding on BOTH sides. Only then
   * does the evidence point anywhere: alignment against conflict is a reason to
   * favour one option over another on this point. Alignment against an unknown
   * is not — it says we did not look.
   */
  separates: boolean
}

export function summarisePreferences(
  result: RecommendationResult,
  input: RecommendationInput,
): PreferenceSummary[] {
  void result
  return input.priorities
    .map((id) => criterionById.get(id))
    .filter((c): c is PilotCriterion => !!c && !c.informational)
    .map((criterion) => {
      const aligned: PilotAlternative[] = []
      const conflicting: PilotAlternative[] = []
      const unresolved: PilotAlternative[] = []
      for (const alt of alternativesIn(input.category ?? DEFAULT_CATEGORY)) {
        const v = resolvedVerdict(alt.id, criterion.id, input.plans?.[alt.id], input.asOf).verdict
        if (v === 'meets') aligned.push(alt)
        else if (v === 'fails') conflicting.push(alt)
        else unresolved.push(alt)
      }
      return {
        criterion,
        aligned,
        conflicting,
        unresolved,
        unresolvedKinds: [...new Set(unresolved.map((a) => unresolvedKind(a.id, criterion.id)))],
        planRoutes: unresolved
          .map((alt) => ({ alternative: alt, plans: planAvailability(alt.id, criterion.id)?.qualifying ?? [] }))
          .filter((x) => x.plans.length > 0),
        separates: aligned.length > 0 && conflicting.length > 0,
      }
    })
}

// ---------------------------------------------------------------------------
// Guidance
//
// What the summary is allowed to say, and what it is not:
//
//   - An option with a documented alignment on something the user chose is
//     worth considering, and we say on what.
//   - An option carrying a documented conflict is still worth considering, and
//     we say so alongside the conflict rather than demoting it silently.
//   - Where two options are documented to align on exactly the same criteria,
//     any conflict one of them carries is the honest thing to raise — and if
//     the other is merely unknown there, we say we cannot establish that it is
//     better, rather than implying it.
//   - Nothing is a winner for having more researched fields.
// ---------------------------------------------------------------------------

export interface OptionNote {
  alternative: PilotAlternative
  /** Why its unknowns are unknown, so the copy can say which. */
  unknownKinds: UnresolvedKind[]
  alignsOn: PilotCriterion[]
  conflictsOn: PilotCriterion[]
  unknownOn: PilotCriterion[]
}

/** Options documented to align on exactly the same selected criteria. */
export interface MatchedGroup {
  alignsOn: PilotCriterion[]
  members: OptionNote[]
  /** Where members of the group differ: one conflicts, another is unknown. */
  differences: {
    criterion: PilotCriterion
    conflicting: PilotAlternative[]
    unknown: PilotAlternative[]
  }[]
}

export interface Guidance {
  /** Per selected criterion, who aligns, who conflicts, who is unknown. */
  separations: PreferenceSummary[]
  /** Every option with at least one documented alignment, alphabetical. */
  considered: OptionNote[]
  /**
   * Options with no documented alignment, split by WHY. Calling them all
   * "nothing to say" flattened a documented conflict into the same bucket as
   * an unresearched question, which are not the same situation for a reader.
   */
  unaligned: {
    /** Every selected criterion is a documented conflict. */
    conflicted: OptionNote[]
    /** Nothing documented either way on any of them. */
    unresolved: OptionNote[]
    /** Some conflicts, some unresolved. */
    mixed: OptionNote[]
  }
  matchedGroups: MatchedGroup[]
  /** Selected criteria with no documented finding for anyone. */
  openQuestions: PilotCriterion[]
  /** What we should research next to break a tie. May be one already chosen. */
  nextQuestion: PilotCriterion | null
  /** A different question we can actually answer, for when this one fails. */
  suggestion: PilotCriterion | null
  /** True where no selected criterion has any documented finding at all. */
  cannotDistinguish: boolean
}

const sameIds = (a: PilotCriterion[], b: PilotCriterion[]) =>
  a.length === b.length && a.every((c, i) => c.id === b[i].id)

export function buildGuidance(
  result: RecommendationResult,
  input: RecommendationInput,
): Guidance {
  const separations = summarisePreferences(result, input)
  const chosen = separations.map((s) => s.criterion)

  // Only options the user can still pick. An excluded option keeps its finding
  // in the counts above, but it is not something to consider.
  const inPlay = [...result.confirmed, ...result.notConfirmed]
    .map((o) => o.alternative)
    .sort((a, b) => a.product.localeCompare(b.product))

  const noteFor = (alt: PilotAlternative): OptionNote => {
    const alignsOn: PilotCriterion[] = []
    const conflictsOn: PilotCriterion[] = []
    const unknownOn: PilotCriterion[] = []
    for (const c of chosen) {
      const v = resolvedVerdict(alt.id, c.id, input.plans?.[alt.id], input.asOf).verdict
      if (v === 'meets') alignsOn.push(c)
      else if (v === 'fails') conflictsOn.push(c)
      else unknownOn.push(c)
    }
    return {
      alternative: alt,
      alignsOn,
      conflictsOn,
      unknownOn,
      unknownKinds: [...new Set(unknownOn.map((c) => unresolvedKind(alt.id, c.id)))],
    }
  }

  const notes = inPlay.map(noteFor)
  const considered = notes.filter((n) => n.alignsOn.length > 0)
  const rest = notes.filter((n) => n.alignsOn.length === 0)
  const unaligned = {
    conflicted: rest.filter((n) => n.conflictsOn.length > 0 && n.unknownOn.length === 0),
    unresolved: rest.filter((n) => n.conflictsOn.length === 0),
    mixed: rest.filter((n) => n.conflictsOn.length > 0 && n.unknownOn.length > 0),
  }

  // Group by identical alignment sets. No cap and no truncation: a tie of six
  // is reported as a tie of six.
  const matchedGroups: MatchedGroup[] = []
  for (const note of considered) {
    const existing = matchedGroups.find((g) => sameIds(g.alignsOn, note.alignsOn))
    if (existing) existing.members.push(note)
    else matchedGroups.push({ alignsOn: note.alignsOn, members: [note], differences: [] })
  }
  for (const g of matchedGroups) {
    if (g.members.length < 2) continue
    for (const c of chosen) {
      if (g.alignsOn.some((a) => a.id === c.id)) continue
      const conflicting = g.members
        .filter((m) => m.conflictsOn.some((x) => x.id === c.id))
        .map((m) => m.alternative)
      const unknown = g.members
        .filter((m) => m.unknownOn.some((x) => x.id === c.id))
        .map((m) => m.alternative)
      // Only worth raising where the group actually splits on it.
      if (conflicting.length > 0 && unknown.length > 0) {
        g.differences.push({ criterion: c, conflicting, unknown })
      }
    }
  }

  // Genuinely open. A question answerable by choosing a plan is not open —
  // saying "no option has a finding either way" directly under a line listing
  // which plans qualify is a contradiction.
  const openQuestions = separations
    .filter((s) => s.aligned.length === 0 && s.conflicting.length === 0 && s.planRoutes.length === 0)
    .map((s) => s.criterion)

  // The most useful next question is the one that would resolve a live
  // difference: a criterion where someone is documented to conflict and
  // someone else is simply unknown. Failing that, an entirely open question.
  // Two different things, previously conflated.
  //
  // nextQuestion points at what WE should research to break a tie — it may
  // well be a criterion the visitor already chose, which is the point.
  //
  // suggestion is what to offer someone we have just told we cannot help:
  // proposing the same question back at them is a loop, not a next step.
  const asked = new Set(input.priorities)
  const fromDifference = matchedGroups.flatMap((g) => g.differences).map((d) => d.criterion)[0]
  const nextQuestion = fromDifference ?? openQuestions[0] ?? null
  const suggestion =
    criteriaIn(input.category ?? DEFAULT_CATEGORY).find(
      (c) =>
        !asked.has(c.id) &&
        !c.informational &&
        criterionCoverage(c.id, input.category).decided > 0,
    ) ?? null

  return {
    separations,
    considered,
    unaligned,
    matchedGroups: matchedGroups.filter((g) => g.members.length > 0),
    openQuestions,
    nextQuestion,
    suggestion,
    // Not "nothing to act on" if a documented plan would settle it.
    cannotDistinguish:
      separations.length > 0 &&
      separations.every(
        (s) =>
          !s.separates &&
          s.aligned.length === 0 &&
          s.conflicting.length === 0 &&
          s.planRoutes.length === 0,
      ),
  }
}
