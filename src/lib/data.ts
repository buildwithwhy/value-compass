import makersRaw from '../data/makers.json'
import fundersRaw from '../data/funders.json'
import rubricMarkdown from '../data/rubric.md?raw'
import methodologyMarkdown from '../data/methodology.md?raw'
import {
  AXIS_KEYS,
  type AxisKey,
  type Funder,
  type GraphLink,
  type GraphNode,
  type Maker,
  type MakersMeta,
  type ParentBucket,
} from './types'

// ---------------------------------------------------------------------------
// Raw data access. We deliberately read ONLY these files (no fetching, no
// invented data) and join funder→maker strictly on `id`.
// ---------------------------------------------------------------------------

export const makersMeta = makersRaw._meta as MakersMeta
export const makers = makersRaw.makers as Maker[]
export const funders = fundersRaw.funders as Funder[]
export const fundersMeta = fundersRaw._meta as Record<string, unknown>
export const concentrationRanking = (
  fundersRaw.concentration_ranking_among_18_makers ?? []
) as { funder: string; count: number; note?: string }[]
// methodologyMarkdown is the public methodology. rubricMarkdown is the original
// internal design draft — kept for the record, and shown only on a page that
// says what it is. It is not the site's published methodology.
export { methodologyMarkdown, rubricMarkdown }

export const AXIS_LABELS: Record<AxisKey, string> = {
  transparency: 'Transparency',
  culture_esg: 'Culture / ESG',
  labour_integrity: 'Labour & supply-chain integrity',
  wealth_dispersion: 'Wealth dispersion',
  public_sharing: 'Public wealth-sharing',
  open_weights: 'Open weights / source availability',
}

// Compact labels for tight UI (radar axis ticks, table headers).
export const AXIS_SHORT: Record<AxisKey, string> = {
  transparency: 'Transparency',
  culture_esg: 'Culture/ESG',
  labour_integrity: 'Labour',
  wealth_dispersion: 'Wealth disp.',
  public_sharing: 'Public sharing',
  open_weights: 'Open weights',
}

// Single readable word for very tight spots (card axis bars).
export const AXIS_ABBR: Record<AxisKey, string> = {
  transparency: 'Transp.',
  culture_esg: 'ESG',
  labour_integrity: 'Labour',
  wealth_dispersion: 'Wealth',
  public_sharing: 'Public',
  open_weights: 'Open wts.',
}

// ---- Lookups ---------------------------------------------------------------

const makerById = new Map<string, Maker>()
for (const m of makers) makerById.set(m.id, m)

const makerBySlug = new Map<string, Maker>()
for (const m of makers) makerBySlug.set(m.slug, m)

const funderById = new Map<string, Funder>()
for (const f of funders) funderById.set(f.id, f)

export function getMaker(id: string | undefined): Maker | undefined {
  return id ? makerById.get(id) : undefined
}
export function getMakerBySlug(slug: string | undefined): Maker | undefined {
  return slug ? makerBySlug.get(slug) : undefined
}
export function getFunder(id: string | undefined): Funder | undefined {
  return id ? funderById.get(id) : undefined
}

/**
 * Canonical maker URL path: always the slug, never the raw id (which can
 * contain spaces). Accepts either a maker id or a slug so call sites holding
 * a `maker_id` reference can link without a second lookup. Unknown refs fall
 * back to the encoded id — callers normally guard with makerInDirectory.
 */
export function makerPath(ref: string): string {
  const m = makerBySlug.get(ref) ?? makerById.get(ref)
  return m ? `/maker/${m.slug}` : `/maker/${encodeURIComponent(ref)}`
}

// ---- Parent-type normalization --------------------------------------------
// Raw values look like "strategic_corporate (chipmaker)", "sovereign_wealth
// (Qatar)", "hyperscaler (also a MAKER, node #8)" — collapse to a bucket.

export function parentBucket(parentType: string): ParentBucket {
  const t = parentType.toLowerCase()
  if (t.startsWith('index_manager')) return 'index_manager'
  if (t.startsWith('hedge_fund')) return 'hedge_fund_parent'
  if (t.startsWith('hyperscaler')) return 'hyperscaler'
  if (t.startsWith('sovereign_wealth')) return 'sovereign_wealth'
  if (t.startsWith('strategic_conglomerate')) return 'strategic_conglomerate'
  if (t.startsWith('strategic_corporate')) return 'strategic_corporate'
  if (t.startsWith('crossover')) return 'crossover'
  if (t.startsWith('venture_growth')) return 'venture_growth'
  // Fallbacks for unforeseen qualifiers.
  if (t.includes('sovereign')) return 'sovereign_wealth'
  if (t.includes('venture')) return 'venture_growth'
  return 'strategic_corporate'
}

// ---------------------------------------------------------------------------
// Reverse lookup: which funders back a given maker id?
// Matches on makers_backed AND owns_outright (join on id, never name).
// ---------------------------------------------------------------------------

export interface FunderBacking {
  funder: Funder
  ownsOutright: boolean
}

const backersByMakerId = new Map<string, FunderBacking[]>()
for (const f of funders) {
  for (const mid of f.makers_backed ?? []) {
    if (!makerById.has(mid)) continue
    const arr = backersByMakerId.get(mid) ?? []
    arr.push({ funder: f, ownsOutright: false })
    backersByMakerId.set(mid, arr)
  }
  for (const mid of f.owns_outright ?? []) {
    if (!makerById.has(mid)) continue
    const arr = backersByMakerId.get(mid) ?? []
    // If already present via makers_backed, upgrade to ownsOutright.
    const existing = arr.find((b) => b.funder.id === f.id)
    if (existing) existing.ownsOutright = true
    else arr.push({ funder: f, ownsOutright: true })
    backersByMakerId.set(mid, arr)
  }
}

export function backersFor(makerId: string): FunderBacking[] {
  return backersByMakerId.get(makerId) ?? []
}

// ---------------------------------------------------------------------------
// Graph construction. Node ids are namespaced to avoid the Microsoft maker /
// Microsoft funder collision. Edges are validated against maker ids; an
// unresolved target logs a console warning rather than crashing.
// ---------------------------------------------------------------------------

const MAKER_PREFIX = 'maker:'
const FUNDER_PREFIX = 'funder:'

export const makerNodeId = (id: string) => MAKER_PREFIX + id
export const funderNodeId = (id: string) => FUNDER_PREFIX + id

// Detect dual-role entities: a funder that IS a maker (id ↔ slug join), or
// one that owns a maker outright.
function detectDualRole(): {
  funderIsDual: Set<string>
  makerIsDual: Set<string>
  sameEntityLinks: GraphLink[]
} {
  const funderIsDual = new Set<string>()
  const makerIsDual = new Set<string>()
  const sameEntityLinks: GraphLink[] = []

  for (const f of funders) {
    // A funder whose id equals a maker's slug IS that maker (Microsoft,
    // Alibaba) — the id-based dual-role join.
    const pairedMakerId = makers.find((m) => m.slug === f.id)?.id

    // (b) owns_outright → maker (e.g. Alphabet/Google → Google DeepMind).
    const owned = (f.owns_outright ?? []).filter((id) => makerById.has(id))

    const targets = new Set<string>()
    if (pairedMakerId) targets.add(pairedMakerId)
    for (const o of owned) targets.add(o)

    if (targets.size > 0) {
      funderIsDual.add(f.id)
      for (const mid of targets) {
        makerIsDual.add(mid)
        sameEntityLinks.push({
          source: funderNodeId(f.id),
          target: makerNodeId(mid),
          kind: 'same_entity',
        })
      }
    }
  }

  // Alibaba runs Qwen in-house (no separate maker node) — tag it as dual-role
  // for the badge even though there's no pair link to draw.
  if (funderById.has('alibaba')) funderIsDual.add('alibaba')

  return { funderIsDual, makerIsDual, sameEntityLinks }
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
  resolvedEdgeCount: number
  warnings: string[]
}

let cachedGraph: GraphData | null = null

export function buildGraph(): GraphData {
  if (cachedGraph) return cachedGraph

  const warnings: string[] = []
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const degree = new Map<string, number>()
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1)

  const { funderIsDual, makerIsDual, sameEntityLinks } = detectDualRole()

  // --- funder→maker edges (backs + owns_outright) ---
  let resolvedEdgeCount = 0
  for (const f of funders) {
    const fid = funderNodeId(f.id)
    const seen = new Set<string>() // avoid double edge if id in both arrays
    for (const mid of f.makers_backed ?? []) {
      if (!makerById.has(mid)) {
        warnings.push(`Funder "${f.name}" backs unknown maker id "${mid}" — skipped.`)
        continue
      }
      if (seen.has(mid)) continue
      seen.add(mid)
      const owns = (f.owns_outright ?? []).includes(mid)
      links.push({
        source: fid,
        target: makerNodeId(mid),
        kind: owns ? 'owns_outright' : 'backs',
      })
      bump(fid)
      bump(makerNodeId(mid))
      resolvedEdgeCount++
    }
    for (const mid of f.owns_outright ?? []) {
      if (!makerById.has(mid)) {
        warnings.push(`Funder "${f.name}" owns unknown maker id "${mid}" — skipped.`)
        continue
      }
      if (seen.has(mid)) continue
      seen.add(mid)
      links.push({ source: fid, target: makerNodeId(mid), kind: 'owns_outright' })
      bump(fid)
      bump(makerNodeId(mid))
      resolvedEdgeCount++
    }
  }

  // --- index-manager meta-node: owns_economically → funder (or maker) nodes ---
  for (const f of funders) {
    if (!f.owns_economically) continue
    const fid = funderNodeId(f.id)
    for (const targetRaw of f.owns_economically) {
      const targetNodeId = resolveOwnsEconomicallyTarget(targetRaw)
      if (!targetNodeId) {
        warnings.push(
          `Meta-node "${f.name}" owns_economically unresolved target "${targetRaw}" — skipped.`,
        )
        continue
      }
      links.push({ source: fid, target: targetNodeId, kind: 'owns_economically' })
      bump(fid)
      bump(targetNodeId)
    }
  }

  // same-entity dotted links (do not contribute to degree-based sizing)
  links.push(...sameEntityLinks)

  // --- build maker nodes ---
  for (const m of makers) {
    const nid = makerNodeId(m.id)
    nodes.push({
      id: nid,
      kind: 'maker',
      label: m.name,
      maker: m,
      tier: m.tier,
      degree: degree.get(nid) ?? 0,
      size: 0,
      isDualRole: makerIsDual.has(m.id) || m.tier === 'frontier_and_funder',
      isMetaNode: false,
    })
  }

  // --- build funder nodes ---
  for (const f of funders) {
    const nid = funderNodeId(f.id)
    const bucket = parentBucket(f.parent_type)
    nodes.push({
      id: nid,
      kind: 'funder',
      label: f.name,
      funder: f,
      parentBucket: bucket,
      degree: degree.get(nid) ?? 0,
      size: 0,
      isDualRole: funderIsDual.has(f.id),
      isMetaNode: bucket === 'index_manager',
    })
  }

  // --- size by degree, with a modest frontier boost for makers ---
  const maxDegree = Math.max(1, ...nodes.map((n) => n.degree))
  for (const n of nodes) {
    const base = 3 + (n.degree / maxDegree) * 13 // 3..16 px radius
    let boost = 1
    if (n.kind === 'maker' && (n.tier === 'frontier' || n.tier === 'frontier_and_funder')) {
      boost = 1.25
    }
    if (n.isMetaNode) boost = 1.1
    n.size = base * boost
  }

  cachedGraph = { nodes, links, resolvedEdgeCount, warnings }
  return cachedGraph
}

// Resolve an owns_economically string ("Alphabet/Google", "Microsoft", "Meta")
// to a graph node id. Exact coordinate match first (funder id, maker slug),
// then the display-name heuristics — the strings predate the ids.
function resolveOwnsEconomicallyTarget(raw: string): string | null {
  const norm = raw.trim().toLowerCase().replace(/\s+/g, '')
  for (const f of funders) {
    if (f.id === norm) return funderNodeId(f.id)
  }
  for (const m of makers) {
    if (m.slug === norm) return makerNodeId(m.id)
  }
  // funder match (normalize spaces & slashes, e.g. "Alphabet / Google")
  for (const f of funders) {
    if (f.name.toLowerCase().replace(/\s+/g, '') === norm) return funderNodeId(f.id)
  }
  // partial funder match (handles "Alphabet/Google" vs "Alphabet / Google")
  for (const f of funders) {
    const fn = f.name.toLowerCase().replace(/\s+/g, '')
    if (fn.includes(norm) || norm.includes(fn.split('/')[0])) return funderNodeId(f.id)
  }
  // maker match (e.g. "Meta")
  for (const m of makers) {
    if (m.id.toLowerCase().replace(/\s+/g, '') === norm) return makerNodeId(m.id)
    if (m.name.toLowerCase().replace(/\s+/g, '').includes(norm)) return makerNodeId(m.id)
  }
  return null
}

// Sanity-check the three data files on startup, per the build prompt: print
// the counts (makers, funders, resolved funder→maker edges) and surface any
// unresolved-edge warnings instead of crashing.
let sanityChecked = false
export function sanityCheck(): void {
  if (sanityChecked) return
  sanityChecked = true
  const g = buildGraph()
  // eslint-disable-next-line no-console
  console.log(
    `%c🧭 Value Compass data%c  makers: ${makers.length}  ·  funders: ${funders.length}  ·  resolved funder→maker edges: ${g.resolvedEdgeCount}`,
    'font-weight:bold;color:#7c3aed',
    'color:inherit',
  )
  if (g.warnings.length) {
    console.warn(`[Value Compass] ${g.warnings.length} edge warning(s):`)
    for (const w of g.warnings) console.warn('  •', w)
  } else {
    // eslint-disable-next-line no-console
    console.log('[Value Compass] all funder→maker edges resolved cleanly.')
  }
}

// ---- Filter option helpers -------------------------------------------------

// Computed once over the static dataset — stable references avoid re-sorting
// and prevent needless re-renders from new array identities each call.
const _jurisdictions = [...new Set(makers.map((m) => m.jurisdiction))].sort()
const _products = (() => {
  const set = new Set<string>()
  for (const m of makers) for (const p of m.products_models) set.add(p)
  return [...set].sort()
})()
const _parentBuckets = [...new Set(funders.map((f) => parentBucket(f.parent_type)))]

export function allJurisdictions(): string[] {
  return _jurisdictions
}

export function allProducts(): string[] {
  return _products
}

export function allParentBuckets(): ParentBucket[] {
  return _parentBuckets
}

// Numeric score or null (n/a → null so the UI renders a gap, never a 0).
export function numericScore(v: number | 'n/a' | null): number | null {
  if (typeof v === 'number') return v
  return null
}

export { AXIS_KEYS }
