import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import {
  allJurisdictions,
  allParentBuckets,
  allProducts,
  buildGraph,
  getFunder,
  getMaker,
} from '../lib/data'
import { nodeColor, PARENT_LABELS } from '../lib/colors'
import type { GraphLink, GraphNode, ParentBucket, Tier } from '../lib/types'
import { Drawer } from '../components/Drawer'
import { GraphLegend } from '../components/GraphLegend'
import { MakerDetail } from '../components/MakerDetail'
import { FunderDetail } from '../components/FunderCard'
import { Chip } from '../components/ui'

const LABELLED_TOP_N = 15

type Selection =
  | { kind: 'maker'; id: string }
  | { kind: 'funder'; name: string }
  | null

export function GraphView() {
  const graph = useMemo(() => buildGraph(), [])
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined)
  const [size, setSize] = useState({ w: 800, h: 560 })
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selection, setSelection] = useState<Selection>(null)
  const [search, setSearch] = useState('')

  // filters
  const [tierFilter, setTierFilter] = useState<Set<Tier>>(new Set())
  const [jurisFilter, setJurisFilter] = useState<Set<string>>(new Set())
  const [productFilter, setProductFilter] = useState<Set<string>>(new Set())
  const [parentFilter, setParentFilter] = useState<Set<ParentBucket>>(new Set())
  const [showFilters, setShowFilters] = useState(false)

  // presentation controls
  const [sizeBy, setSizeBy] = useState<'connections' | 'funder_reach' | 'uniform'>('connections')
  const [emphasis, setEmphasis] = useState<'makers' | 'funders' | 'both'>('both')

  // Log any unresolved-edge warnings once (per build prompt).
  useEffect(() => {
    for (const w of graph.warnings) console.warn('[Value Compass]', w)
  }, [graph.warnings])

  // Measure container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: Math.max(420, el.clientHeight) })
    return () => ro.disconnect()
  }, [])

  // ---- dynamic node sizing (driven by the Size-by control) ----
  const maxima = useMemo(() => {
    let degree = 1
    let funderReach = 1
    for (const n of graph.nodes) {
      degree = Math.max(degree, n.degree)
      if (n.kind === 'funder') {
        const reach = n.isMetaNode ? n.degree : (n.funder?.maker_count ?? 0)
        funderReach = Math.max(funderReach, reach)
      }
    }
    return { degree, funderReach }
  }, [graph.nodes])

  const sizeOf = (n: GraphNode): number => {
    if (sizeBy === 'uniform') return n.kind === 'maker' ? 7 : 6
    if (sizeBy === 'funder_reach') {
      if (n.kind === 'funder') {
        const reach = n.isMetaNode ? n.degree : (n.funder?.maker_count ?? 0)
        return 4 + (reach / maxima.funderReach) * 16 // 4..20
      }
      return 5 // makers shrink to a uniform dot so funders dominate
    }
    // connections (default): degree-based with a modest frontier boost
    const base = 3 + (n.degree / maxima.degree) * 13
    let boost = 1
    if (n.kind === 'maker' && (n.tier === 'frontier' || n.tier === 'frontier_and_funder')) boost = 1.25
    if (n.isMetaNode) boost = 1.1
    return base * boost
  }

  // Repaint / relax the layout when sizing or emphasis changes (the canvas
  // otherwise stops its RAF loop after the sim cools).
  useEffect(() => {
    fgRef.current?.d3ReheatSimulation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeBy, emphasis])

  // ---- visibility predicates from filters ----
  const makerVisible = (n: GraphNode) => {
    const m = n.maker!
    if (tierFilter.size && !tierFilter.has(m.tier)) return false
    if (jurisFilter.size && !jurisFilter.has(m.jurisdiction)) return false
    if (productFilter.size && !m.products_models.some((p) => productFilter.has(p))) return false
    return true
  }
  const funderVisible = (n: GraphNode) => {
    if (parentFilter.size && !parentFilter.has(n.parentBucket!)) return false
    return true
  }
  const nodeVisible = (n: GraphNode) => (n.kind === 'maker' ? makerVisible(n) : funderVisible(n))

  const visibleIds = useMemo(() => {
    const s = new Set<string>()
    for (const n of graph.nodes) if (nodeVisible(n)) s.add(n.id)
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, tierFilter, jurisFilter, productFilter, parentFilter])

  const filteredData = useMemo(() => {
    const nodes = graph.nodes.filter((n) => visibleIds.has(n.id))
    const links = graph.links.filter(
      (l) =>
        visibleIds.has(typeof l.source === 'string' ? l.source : (l.source as any).id) &&
        visibleIds.has(typeof l.target === 'string' ? l.target : (l.target as any).id),
    )
    return { nodes, links }
  }, [graph, visibleIds])

  // adjacency for hover highlight (based on full graph)
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const add = (a: string, b: string) => {
      if (!map.has(a)) map.set(a, new Set())
      map.get(a)!.add(b)
    }
    for (const l of graph.links) {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id
      add(s, t)
      add(t, s)
    }
    return map
  }, [graph.links])

  const searchMatch = useMemo(() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    return graph.nodes.find((n) => n.label.toLowerCase().includes(q)) ?? null
  }, [search, graph.nodes])

  const topLabelIds = useMemo(() => {
    const sorted = [...graph.nodes].sort((a, b) => sizeOf(b) - sizeOf(a))
    return new Set(sorted.slice(0, LABELLED_TOP_N).map((n) => n.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, sizeBy, maxima])

  function focusNode(n: GraphNode) {
    if (!fgRef.current) return
    if (n.x != null && n.y != null) {
      fgRef.current.centerAt(n.x, n.y, 600)
      fgRef.current.zoom(4, 600)
    }
  }

  const didFitRef = useRef(false)
  const fitView = () => fgRef.current?.zoomToFit(500, 60)

  function openNode(n: GraphNode) {
    if (n.kind === 'maker') setSelection({ kind: 'maker', id: n.maker!.id })
    else setSelection({ kind: 'funder', name: n.funder!.name })
  }

  // ---- node canvas drawing ----
  const highlightNeighbors = hoverId ? adjacency.get(hoverId) ?? new Set<string>() : null

  function paintNode(node: GraphNode, ctx: CanvasRenderingContext2D, scale: number) {
    const r = sizeOf(node)
    const color = nodeColor({ kind: node.kind, tier: node.tier, parentBucket: node.parentBucket })
    const hoverDim = !!(hoverId && hoverId !== node.id && !highlightNeighbors?.has(node.id))
    const searchDim = !!(searchMatch && searchMatch.id !== node.id && search.trim().length > 0)
    // Emphasis dims the other class — but only when not actively hovering, so
    // neighbor exploration still works in any emphasis mode.
    const emphasisDim =
      !hoverId &&
      ((emphasis === 'makers' && node.kind === 'funder') ||
        (emphasis === 'funders' && node.kind === 'maker'))
    const dimmed = hoverDim || searchDim || emphasisDim

    ctx.globalAlpha = dimmed ? (emphasisDim && !hoverDim && !searchDim ? 0.12 : 0.15) : 1

    // meta-node (index managers): faint dotted ring, hollow
    ctx.beginPath()
    ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI)
    if (node.isMetaNode) {
      ctx.fillStyle = '#f5f5f4'
      ctx.fill()
      ctx.setLineDash([1, 2])
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5 / scale
      ctx.stroke()
      ctx.setLineDash([])
    } else {
      ctx.fillStyle = color
      ctx.fill()
    }

    // dual-role ring
    if (node.isDualRole) {
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, r + 2.5 / scale, 0, 2 * Math.PI)
      ctx.strokeStyle = '#db2777'
      ctx.lineWidth = 2 / scale
      ctx.stroke()
    }

    // search highlight ring
    if (searchMatch && searchMatch.id === node.id) {
      ctx.beginPath()
      ctx.arc(node.x!, node.y!, r + 5 / scale, 0, 2 * Math.PI)
      ctx.strokeStyle = '#2563eb'
      ctx.lineWidth = 2.5 / scale
      ctx.stroke()
    }

    // labels: top-N always; hovered + neighbors; everything when zoomed in
    const showLabel =
      !dimmed &&
      (topLabelIds.has(node.id) ||
        scale > 2.2 ||
        hoverId === node.id ||
        highlightNeighbors?.has(node.id) ||
        (searchMatch && searchMatch.id === node.id))

    if (showLabel) {
      const fontSize = Math.max(10 / scale, 2.2)
      ctx.font = `${node.kind === 'maker' ? '600 ' : ''}${fontSize}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = node.label
      const tw = ctx.measureText(label).width
      ctx.fillStyle = 'rgba(255,255,255,0.82)'
      ctx.fillRect(node.x! - tw / 2 - 1 / scale, node.y! + r + 1 / scale, tw + 2 / scale, fontSize + 1 / scale)
      ctx.fillStyle = '#0f172a'
      ctx.fillText(label, node.x!, node.y! + r + 1.5 / scale)
    }

    ctx.globalAlpha = 1
  }

  function linkColor(l: GraphLink): string {
    const dim = hoverId
      ? !(
          (typeof l.source === 'object' && (l.source as any).id === hoverId) ||
          (typeof l.target === 'object' && (l.target as any).id === hoverId) ||
          l.source === hoverId ||
          l.target === hoverId
        )
      : false
    const base: Record<GraphLink['kind'], string> = {
      backs: '#94a3b8',
      owns_outright: '#334155',
      owns_economically: '#a8a29e',
      same_entity: '#db2777',
    }
    const c = base[l.kind]
    return dim ? withAlpha(c, 0.08) : withAlpha(c, l.kind === 'owns_economically' ? 0.5 : 0.55)
  }

  const totalMakers = graph.nodes.filter((n) => n.kind === 'maker').length
  const totalFunders = graph.nodes.filter((n) => n.kind === 'funder').length

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      {/* Intro / counts */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Knowledge graph</h1>
          <p className="text-sm text-slate-500">
            {totalMakers} makers · {totalFunders} funders · {graph.resolvedEdgeCount} resolved
            funder→maker edges. Node size = degree (frontier labs get a small boost). Hover to
            highlight neighbors; click for detail.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchMatch) focusNode(searchMatch)
          }}
          placeholder="Search a node (maker or funder)…"
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-400"
          aria-label="Search nodes"
        />
        {searchMatch && (
          <button
            type="button"
            onClick={() => focusNode(searchMatch)}
            className="text-sm text-teal-700 hover:underline"
          >
            Focus “{searchMatch.label}”
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-expanded={showFilters}
        >
          {showFilters ? 'Hide filters' : 'Filters'}
          {activeFilterCount({ tierFilter, jurisFilter, productFilter, parentFilter }) > 0 &&
            ` (${activeFilterCount({ tierFilter, jurisFilter, productFilter, parentFilter })})`}
        </button>
        {activeFilterCount({ tierFilter, jurisFilter, productFilter, parentFilter }) > 0 && (
          <button
            type="button"
            onClick={() => {
              setTierFilter(new Set())
              setJurisFilter(new Set())
              setProductFilter(new Set())
              setParentFilter(new Set())
            }}
            className="text-sm text-slate-500 hover:text-slate-800 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Presentation controls: emphasize funders or makers, choose sizing */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <Segmented
          label="Size by"
          value={sizeBy}
          onChange={(v) => setSizeBy(v as typeof sizeBy)}
          options={[
            { value: 'connections', label: 'Connections' },
            { value: 'funder_reach', label: 'Funder reach' },
            { value: 'uniform', label: 'Uniform' },
          ]}
        />
        <Segmented
          label="Emphasize"
          value={emphasis}
          onChange={(v) => setEmphasis(v as typeof emphasis)}
          options={[
            { value: 'makers', label: 'Makers' },
            { value: 'funders', label: 'Funders' },
            { value: 'both', label: 'Both' },
          ]}
        />
        <button
          type="button"
          onClick={fitView}
          className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          title="Re-center and zoom to fit all visible nodes"
        >
          Fit to view
        </button>
        <span className="text-xs text-slate-400">
          {sizeBy === 'funder_reach'
            ? 'Funders sized by how many of the 18 they back.'
            : sizeBy === 'uniform'
              ? 'All nodes equal size — read the network, not the weights.'
              : 'Nodes sized by number of connections.'}
        </span>
      </div>

      {showFilters && (
        <FilterPanel
          tierFilter={tierFilter}
          setTierFilter={setTierFilter}
          jurisFilter={jurisFilter}
          setJurisFilter={setJurisFilter}
          productFilter={productFilter}
          setProductFilter={setProductFilter}
          parentFilter={parentFilter}
          setParentFilter={setParentFilter}
        />
      )}

      {/* Graph (desktop) + mobile fallback */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div
          ref={containerRef}
          className="relative hidden h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white md:block"
        >
          {filteredData.nodes.length === 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/80 text-center text-sm text-slate-500">
              <p>No nodes match the current filters.</p>
              <button
                type="button"
                onClick={() => {
                  setTierFilter(new Set())
                  setJurisFilter(new Set())
                  setProductFilter(new Set())
                  setParentFilter(new Set())
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            </div>
          )}
          <ForceGraph2D
            ref={fgRef as any}
            graphData={filteredData}
            width={size.w}
            height={size.h}
            backgroundColor="#ffffff"
            nodeRelSize={1}
            nodeVal={(n: GraphNode) => sizeOf(n)}
            nodeColor={(n: GraphNode) =>
              nodeColor({ kind: n.kind, tier: n.tier, parentBucket: n.parentBucket })
            }
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(node.x!, node.y!, sizeOf(node) + 2, 0, 2 * Math.PI)
              ctx.fill()
            }}
            linkColor={linkColor as any}
            linkWidth={(l: GraphLink) => (l.kind === 'owns_outright' ? 1.6 : 1)}
            linkLineDash={(l: GraphLink) =>
              l.kind === 'owns_outright'
                ? [4, 3]
                : l.kind === 'owns_economically'
                  ? [1, 3]
                  : l.kind === 'same_entity'
                    ? [2, 2]
                    : null
            }
            linkDirectionalParticles={0}
            onNodeHover={(n: GraphNode | null) => setHoverId(n ? n.id : null)}
            onNodeClick={(n: GraphNode) => openNode(n)}
            onBackgroundClick={() => setSelection(null)}
            onEngineStop={() => {
              if (!didFitRef.current && filteredData.nodes.length) {
                fitView()
                didFitRef.current = true
              }
            }}
            cooldownTicks={120}
            d3VelocityDecay={0.3}
          />
        </div>

        {/* Legend sidebar */}
        <aside className="rounded-xl border border-slate-200 bg-white p-3">
          <GraphLegend />
        </aside>
      </div>

      {/* Mobile fallback: filterable list */}
      <MobileList
        nodes={filteredData.nodes}
        onOpen={openNode}
        className="md:hidden"
      />

      {/* Detail drawer */}
      <Drawer
        open={selection != null}
        onClose={() => setSelection(null)}
        title={
          selection?.kind === 'maker' ? (
            <span className="text-lg font-bold text-slate-900">Maker detail</span>
          ) : selection?.kind === 'funder' ? (
            <span className="text-lg font-bold text-slate-900">Funder detail</span>
          ) : null
        }
      >
        {selection?.kind === 'maker' && (
          <MakerDetailById
            id={selection.id}
            onOpenFunder={(name) => setSelection({ kind: 'funder', name })}
          />
        )}
        {selection?.kind === 'funder' && (
          <FunderDetailByName
            name={selection.name}
            onOpenMaker={(id) => setSelection({ kind: 'maker', id })}
          />
        )}
      </Drawer>
    </div>
  )
}

// small helpers below

function activeFilterCount(f: {
  tierFilter: Set<unknown>
  jurisFilter: Set<unknown>
  productFilter: Set<unknown>
  parentFilter: Set<unknown>
}) {
  return f.tierFilter.size + f.jurisFilter.size + f.productFilter.size + f.parentFilter.size
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function MakerDetailById({ id, onOpenFunder }: { id: string; onOpenFunder: (n: string) => void }) {
  const m = getMaker(id)
  if (!m) return <p className="text-sm text-slate-500">Maker not found.</p>
  return <MakerDetail maker={m} onOpenFunder={onOpenFunder} />
}

function FunderDetailByName({ name, onOpenMaker }: { name: string; onOpenMaker: (id: string) => void }) {
  const f = getFunder(name)
  if (!f) return <p className="text-sm text-slate-500">Funder not found.</p>
  return (
    <div>
      <h3 className="mb-2 text-xl font-extrabold text-slate-900">{f.name}</h3>
      <FunderDetail funder={f} onOpenMaker={onOpenMaker} />
    </div>
  )
}

function FilterPanel(props: {
  tierFilter: Set<Tier>
  setTierFilter: (s: Set<Tier>) => void
  jurisFilter: Set<string>
  setJurisFilter: (s: Set<string>) => void
  productFilter: Set<string>
  setProductFilter: (s: Set<string>) => void
  parentFilter: Set<ParentBucket>
  setParentFilter: (s: Set<ParentBucket>) => void
}) {
  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setter(next)
  }
  const tiers: Tier[] = ['frontier', 'tool', 'frontier_and_funder']
  return (
    <div className="mb-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <FilterGroup label="Maker tier">
        {tiers.map((t) => (
          <Chip
            key={t}
            active={props.tierFilter.has(t)}
            onClick={() => toggle(props.tierFilter, t, props.setTierFilter)}
          >
            {t}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Jurisdiction">
        {allJurisdictions().map((j) => (
          <Chip
            key={j}
            active={props.jurisFilter.has(j)}
            onClick={() => toggle(props.jurisFilter, j, props.setJurisFilter)}
          >
            {j}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Product / model">
        {allProducts().map((p) => (
          <Chip
            key={p}
            active={props.productFilter.has(p)}
            onClick={() => toggle(props.productFilter, p, props.setProductFilter)}
          >
            {p}
          </Chip>
        ))}
      </FilterGroup>
      <FilterGroup label="Funder parent type">
        {allParentBuckets().map((b) => (
          <Chip
            key={b}
            active={props.parentFilter.has(b)}
            onClick={() => toggle(props.parentFilter, b, props.setParentFilter)}
          >
            {PARENT_LABELS[b]}
          </Chip>
        ))}
      </FilterGroup>
    </div>
  )
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
        {options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
              i > 0 ? 'border-l border-slate-300' : ''
            } ${
              value === o.value
                ? 'bg-teal-700 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function MobileList({
  nodes,
  onOpen,
  className = '',
}: {
  nodes: GraphNode[]
  onOpen: (n: GraphNode) => void
  className?: string
}) {
  const makers = nodes.filter((n) => n.kind === 'maker').sort((a, b) => b.size - a.size)
  const funders = nodes.filter((n) => n.kind === 'funder').sort((a, b) => b.size - a.size)
  return (
    <div className={`mt-2 ${className}`}>
      <p className="mb-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
        The force graph is best on a larger screen — here is a filterable list of the same nodes.
      </p>
      <h2 className="mb-1 mt-3 text-sm font-bold text-slate-700">Makers ({makers.length})</h2>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {makers.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: nodeColor({ kind: 'maker', tier: n.tier }),
                }}
              />
              <span className="font-medium text-slate-800">{n.label}</span>
              <span className="ml-auto text-xs text-slate-400">deg {n.degree}</span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mb-1 mt-4 text-sm font-bold text-slate-700">Funders ({funders.length})</h2>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {funders.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => onOpen(n)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: nodeColor({ kind: 'funder', parentBucket: n.parentBucket }) }}
              />
              <span className="font-medium text-slate-800">{n.label}</span>
              <span className="ml-auto text-xs text-slate-400">backs {n.funder?.maker_count ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
