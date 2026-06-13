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
