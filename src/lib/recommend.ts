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
    criterionIds: [
      'c_training_default',
      'c_training_control',
      'c_content_export',
      'c_account_transfer',
      'c_service_migration',
      'c_model_hosting',
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

/** Every criterion belongs to exactly one motivation; asserted in the tests. */
export const motivationForCriterion = new Map<string, Motivation>(
  motivations.flatMap((m) => m.criterionIds.map((id) => [id, m] as [string, Motivation])),
)

/** How many of a motivation's criteria have any documented finding at all. */
export function motivationCoverage(m: Motivation): { documented: number; total: number } {
  const documented = m.criterionIds.filter((id) => criterionCoverage(id).decided > 0).length
  return { documented, total: m.criterionIds.length }
}

export interface PreferenceSummary {
  criterion: PilotCriterion
  aligned: PilotAlternative[]
  conflicting: PilotAlternative[]
  unresolved: PilotAlternative[]
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
      for (const alt of alternatives) {
        const v = assessmentFor(alt.id, criterion.id)?.verdict ?? 'unconfirmed'
        if (v === 'meets') aligned.push(alt)
        else if (v === 'fails') conflicting.push(alt)
        else unresolved.push(alt)
      }
      return {
        criterion,
        aligned,
        conflicting,
        unresolved,
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
  /** The single most useful thing to research next, or null. */
  nextQuestion: PilotCriterion | null
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
      const v = assessmentFor(alt.id, c.id)?.verdict ?? 'unconfirmed'
      if (v === 'meets') alignsOn.push(c)
      else if (v === 'fails') conflictsOn.push(c)
      else unknownOn.push(c)
    }
    return { alternative: alt, alignsOn, conflictsOn, unknownOn }
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

  const openQuestions = separations
    .filter((s) => s.aligned.length === 0 && s.conflicting.length === 0)
    .map((s) => s.criterion)

  // The most useful next question is the one that would resolve a live
  // difference: a criterion where someone is documented to conflict and
  // someone else is simply unknown. Failing that, an entirely open question.
  const fromDifference = matchedGroups.flatMap((g) => g.differences).map((d) => d.criterion)[0]
  const nextQuestion = fromDifference ?? openQuestions[0] ?? null

  return {
    separations,
    considered,
    unaligned,
    matchedGroups: matchedGroups.filter((g) => g.members.length > 0),
    openQuestions,
    nextQuestion,
    cannotDistinguish: separations.length > 0 && separations.every((s) => !s.separates &&
      s.aligned.length === 0 && s.conflicting.length === 0),
  }
}
