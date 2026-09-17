// ---------------------------------------------------------------------------
// Domain types — mirror the shapes in src/data/makers.json & funders.json.
// Fields are kept optional where the data is genuinely uneven, so the UI can
// hide elements gracefully (per the build prompt) instead of crashing.
// ---------------------------------------------------------------------------

export type Tier = 'frontier' | 'tool' | 'frontier_and_funder'
export type Confidence = 'A' | 'B' | 'C'
export const AXIS_KEYS = [
  'transparency',
  'culture_esg',
  'labour_integrity',
  'wealth_dispersion',
  'public_sharing',
] as const
export type AxisKey = (typeof AXIS_KEYS)[number]

export interface AxisScore {
  score: number | 'n/a' | null
  confidence: Confidence
  note: string
  sources: string[]
}

export type Axes = Record<AxisKey, AxisScore>

export type IndependenceType =
  | 'independent'
  | 'self_or_public'
  | 'vc_backed'
  | 'corporate_owned'
  | 'hedge_fund_parented'

// Objective, factual capital attributes. Whether any of these counts as a
// "concern" is the user's call via the Capital Lens — NOT a fixed 6th score.
export interface CapitalProfile {
  independence_type: IndependenceType
  founder_control: false | string
  sovereign_state: string[] // descriptive buckets: "Gulf …", "Singapore …", "China-linked …"
  big_tech_capital: string[] // hyperscaler backers
  competitor_entanglement: boolean
  circular_vendor: string[] // chipmaker backers it also buys from
  index_held: boolean
  note?: string
}

export interface Maker {
  id: string
  name: string
  tier: Tier
  category?: string
  jurisdiction: string
  vc_independent: string
  products_models: string[]
  founders: string[]
  lead_backers: string[]
  structure: string
  stated_values: string
  tension_hook: string
  axes: Axes
  capital_profile?: CapitalProfile
}

export interface Funder {
  name: string
  parent_type: string
  rolled_up_vehicles?: string[]
  makers_backed: string[]
  owns_outright?: string[]
  owns_economically?: string[]
  maker_count?: number
  key_people?: string[]
  also_funds?: string
  also_backs_outside_18?: string[]
  flag?: string
  portfolio_sources?: string[]
  // v1 reputation layer — factual public associations of key figures.
  notable_for?: string[]
  reputation_sources?: string[]
}

// ---- Evidence layer --------------------------------------------------------
// Derived (src/data/evidence.json, built by scripts/build-evidence.mjs). It
// adds no facts — it records what each assessment already rests on, so the app
// can keep four things apart: sourced facts, ValueCompass assessments, unknown
// or unverified information, and the visitor's own priorities.

export type EvidenceBasis = 'sourced' | 'unsourced' | 'contextual' | 'not_established'

/** Whether the cited material directly establishes a narrow fact. */
export type ClaimSupport = 'establishes_fact' | 'partial' | 'unreviewed' | 'none'

/** How a classification was produced. Never 'human_reviewed' unless a human did. */
export type ReviewProvenance = 'automated_provisional' | 'human_reviewed'

/**
 * Evidence that an attribute is absent. Needs all four: an authored `false` is
 * a typed value, and a scope sentence describes a claim rather than supporting
 * it. `as_of` matters because an absence decays.
 */
export interface AbsenceEvidence {
  source: string
  scope: string
  as_of: string
  attribution: 'self_report' | 'independent'
  note?: string
}

export interface BackgroundSource {
  url: string
  why: string
}

export interface AxisEvidence {
  basis: EvidenceBasis
  rule: string
  /** True when our research has not established a finding — no score is shown. */
  withheld: boolean
  claim_support: ClaimSupport
  /** The narrow fact the source settles. Preserved even when the score is not. */
  supported_fact: string | null
  source_date: string
  unsupported_clauses: string[]
  /** The rubric rule that would license a whole-axis score, or that none does. */
  scoring_rule: string
  /** Whether the supported fact justifies the whole 0–4 score under that rule. */
  justifies_whole: boolean
  justification_note: string
  provenance: ReviewProvenance
  /**
   * The single gate. True only when there is relevant, traceable support for
   * the actual claim AND the assessment is justified by it. Governs ordering,
   * comparison markers, switching differences and any recommendation.
   */
  decision_eligible: boolean
  entity_sources: string[]
  background_sources: BackgroundSource[]
  context_used: string[]
}

export type RelationshipType =
  | 'outright_ownership'
  | 'controlling_stake'
  | 'equity_investment'
  | 'funding_commitment'
  | 'commercial_dependency'
  | 'passive_economic'
  | 'unspecified'

export type RelationshipStatus =
  | 'completed'
  | 'announced'
  | 'pending'
  | 'contingent'
  | 'unspecified'

export interface Relationship {
  funder: string
  maker: string
  type: RelationshipType
  status: RelationshipStatus
  /** The date the underlying record states, or null. Never inferred. */
  as_of: string | null
  quote: string | null
  quoted_from: string
  /** Only present where the record itself speaks to voting rights. */
  voting?: 'none_stated' | 'board_presence_stated'
}

export interface FunderAssociationStatus {
  associations_status: 'partially_sourced' | 'unverified'
  source_count: number
  claim_count: number
}

export interface EvidenceSummary {
  axis_records: number
  by_basis: Record<EvidenceBasis, number>
  withheld: number
  decision_eligible: number
  establishes_fact: number
  claim_support_partial: number
  claim_support_unreviewed: number
  facts_preserved_without_eligible_score: number
  human_reviewed: number
  absence_evidence_records: number
  no_sources_at_all: number
  background_only: number
  confidence_c: number
  recorded_na: number
  funders_with_unverified_associations: number
  funders_with_associations: number
  funder_maker_edges: number
  edges_with_transcribed_detail: number
}

export interface ScaleMeta {
  [k: string]: string
}

export interface MakersMeta {
  title: string
  version: string
  count: number
  polarity: string
  scale: ScaleMeta
  confidence: Record<Confidence, string>
  axis_aliases?: Record<string, string>
  tags_not_scored?: Record<string, string>
  key_anchors?: Record<string, string>
  join_key?: string
}

// Canonical parent-type buckets used for coloring & filtering. The raw data
// carries qualifiers like "strategic_corporate (chipmaker)" which we normalize.
export type ParentBucket =
  | 'hyperscaler'
  | 'sovereign_wealth'
  | 'venture_growth'
  | 'strategic_corporate'
  | 'crossover'
  | 'index_manager'
  | 'hedge_fund_parent'
  | 'strategic_conglomerate'

// ---- Graph model -----------------------------------------------------------

export type GraphNodeKind = 'maker' | 'funder'

export interface GraphNode {
  id: string // namespaced: "maker:<id>" or "funder:<name>"
  kind: GraphNodeKind
  label: string
  // maker fields
  maker?: Maker
  tier?: Tier
  // funder fields
  funder?: Funder
  parentBucket?: ParentBucket
  // computed
  degree: number
  size: number
  isDualRole: boolean
  isMetaNode: boolean
  // mutable runtime positions assigned by react-force-graph
  x?: number
  y?: number
}

export type EdgeKind = 'backs' | 'owns_outright' | 'owns_economically' | 'same_entity'

export interface GraphLink {
  source: string
  target: string
  kind: EdgeKind
}
