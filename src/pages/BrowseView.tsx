import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AXIS_KEYS, AXIS_LABELS, AXIS_SHORT, allProducts, makers, numericScore } from '../lib/data'
import { TIER_COLORS, TIER_LABELS, fitColor, scoreColor } from '../lib/colors'
import type { AxisKey, Confidence, Maker, Tier } from '../lib/types'
import { evaluateMaker } from '../lib/lens'
import { useCapitalLens } from '../lib/lensContext'
import { ConfidenceBadge, ConfidenceLegend } from '../components/ConfidenceBadge'
import { CapitalLensPanel } from '../components/CapitalLensPanel'
import { Chip, Tag } from '../components/ui'

const TIERS: Tier[] = ['frontier', 'tool', 'frontier_and_funder']

type SortKey = AxisKey | 'name' | 'tier' | 'fit'
type ViewMode = 'matrix' | 'cards'

export function BrowseView() {
  const { lens } = useCapitalLens()
  const fitById = useMemo(() => {
    const m = new Map<string, number>()
    for (const mk of makers) m.set(mk.id, evaluateMaker(mk, lens).fit)
    return m
  }, [lens])
  const [view, setView] = useState<ViewMode>('matrix')
  const [tierFilter, setTierFilter] = useState<Set<Tier>>(new Set())
  const [productFilter, setProductFilter] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return makers.filter((m) => {
      if (tierFilter.size && !tierFilter.has(m.tier)) return false
      if (productFilter.size && !m.products_models.some((p) => productFilter.has(p))) return false
      if (query && !`${m.name} ${m.category ?? ''} ${m.jurisdiction}`.toLowerCase().includes(query))
        return false
      return true
    })
  }, [tierFilter, productFilter, q])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      if (sortKey === 'tier') return (a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name)) * dir
      if (sortKey === 'fit')
        return ((fitById.get(a.id) ?? 0) - (fitById.get(b.id) ?? 0)) * dir || a.name.localeCompare(b.name)
      // axis: n/a always sorts last regardless of direction
      const sa = numericScore(a.axes[sortKey]?.score)
      const sb = numericScore(b.axes[sortKey]?.score)
      if (sa == null && sb == null) return a.name.localeCompare(b.name)
      if (sa == null) return 1
      if (sb == null) return -1
      return (sa - sb) * dir || a.name.localeCompare(b.name)
    })
    return arr
  }, [filtered, sortKey, sortDir, fitById])

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    next.has(val) ? next.delete(val) : next.add(val)
    setter(next)
  }

  function setSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      // axes default to high→low (best first); name/tier default A→Z
      setSortDir(key === 'name' || key === 'tier' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Browse makers</h1>
          <p className="text-sm text-slate-500">
            All {makers.length} makers across the 5 value axes (higher = better). Click any row or card
            for the full compass, axis reasons &amp; sources, and funder picture.
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
          {(['matrix', 'cards'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium capitalize ${
                view === v ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v === 'matrix' ? '▣ Matrix' : '⊞ Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="my-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search makers…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-400"
          aria-label="Search makers"
        />
        <div className="flex flex-wrap gap-1.5">
          {TIERS.map((t) => (
            <Chip key={t} active={tierFilter.has(t)} onClick={() => toggle(tierFilter, t, setTierFilter)}>
              {TIER_LABELS[t]}
            </Chip>
          ))}
        </div>
        <details>
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-slate-500">
            Filter by product / model ({productFilter.size || 'all'})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allProducts().map((p) => (
              <Chip
                key={p}
                active={productFilter.has(p)}
                onClick={() => toggle(productFilter, p, setProductFilter)}
              >
                {p}
              </Chip>
            ))}
          </div>
        </details>
      </div>

      {/* Shared axis + score legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <ScoreLegend />
        <ConfidenceLegend />
        <span className="text-slate-400">{sorted.length} shown</span>
      </div>

      {/* Capital Lens — drives the "Capital fit" column; collapsible to keep focus on scores */}
      {view === 'matrix' && (
        <details className="mb-3 rounded-xl border border-violet-200 bg-violet-50/40">
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-violet-900">
            🔍 Capital Lens — tune the “Capital fit” column
          </summary>
          <div className="px-3 pb-3">
            <CapitalLensPanel />
          </div>
        </details>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No makers match your search and filters.
        </div>
      ) : view === 'matrix' ? (
        <MatrixView
          makers={sorted}
          fitById={fitById}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={setSort}
        />
      ) : (
        <CardsView makers={sorted} />
      )}
    </div>
  )
}

function ScoreLegend() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold text-slate-700">Score:</span>
      <span className="text-slate-400">worse</span>
      {[0, 1, 2, 3, 4].map((s) => (
        <span
          key={s}
          className="inline-flex h-4 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ background: scoreColor(s) }}
        >
          {s}
        </span>
      ))}
      <span className="text-slate-400">better</span>
      <span
        className="ml-1 inline-flex h-4 items-center rounded border border-slate-300 bg-slate-100 px-1 text-[10px] text-slate-500"
        title="insufficient evidence — rendered as a gap, never 0"
      >
        n/a
      </span>
    </span>
  )
}

// --- score cell shared by matrix; encodes score (color) + confidence (style) ---
function ScoreCell({
  score,
  confidence,
  note,
  size = 'md',
}: {
  score: number | null
  confidence?: Confidence
  note?: string
  size?: 'md' | 'sm'
}) {
  const bg = scoreColor(score)
  // Confidence styling: A solid, B translucent + hatch, C hollow/outlined.
  const conf = confidence ?? 'A'
  const dims = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'
  if (score == null) {
    return (
      <span
        title={note || 'insufficient evidence (n/a)'}
        className={`inline-flex ${dims} items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-400`}
      >
        n/a
      </span>
    )
  }
  const base = `relative inline-flex ${dims} items-center justify-center rounded font-bold`
  if (conf === 'C') {
    return (
      <span
        title={note}
        className={`${base} border-2 border-dashed bg-white`}
        style={{ borderColor: bg, color: bg }}
      >
        {score}
      </span>
    )
  }
  return (
    <span
      title={note}
      className={`${base} text-white`}
      style={{ background: bg, opacity: conf === 'B' ? 0.6 : 1 }}
    >
      {score}
      {conf === 'B' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,.7) 0 2px, transparent 2px 4px)',
          }}
        />
      )}
    </span>
  )
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
  title,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-0.5 font-semibold ${
        active ? 'text-violet-700' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? '' : 'opacity-30'}`}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  )
}

function MatrixView({
  makers: rows,
  fitById,
  sortKey,
  sortDir,
  onSort,
}: {
  makers: Maker[]
  fitById: Map<string, number>
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2">
              <SortHeader
                label="Maker"
                active={sortKey === 'name'}
                dir={sortDir}
                onClick={() => onSort('name')}
              />
            </th>
            {AXIS_KEYS.map((k) => (
              <th key={k} className="px-2 py-2 text-center">
                <SortHeader
                  label={AXIS_SHORT[k]}
                  title={AXIS_LABELS[k]}
                  active={sortKey === k}
                  dir={sortDir}
                  onClick={() => onSort(k)}
                />
              </th>
            ))}
            <th className="border-l border-violet-200 bg-violet-50/40 px-2 py-2 text-center">
              <SortHeader
                label="Capital fit"
                title="Capital fit under your current Capital Lens — higher = fewer of your concerns present. Lens-dependent, not an objective rating."
                active={sortKey === 'fit'}
                dir={sortDir}
                onClick={() => onSort('fit')}
              />
            </th>
            <th className="px-3 py-2">
              <SortHeader
                label="Tier"
                active={sortKey === 'tier'}
                dir={sortDir}
                onClick={() => onSort('tier')}
              />
            </th>
            <th className="px-3 py-2 font-semibold text-slate-600">Jurisdiction</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              key={m.id}
              onClick={() => navigate(`/maker/${encodeURIComponent(m.id)}`)}
              className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-violet-50/40"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-slate-800 group-hover:bg-violet-50"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: TIER_COLORS[m.tier] }}
                  />
                  {m.name}
                </span>
              </th>
              {AXIS_KEYS.map((k) => {
                const ax = m.axes[k]
                return (
                  <td key={k} className="px-2 py-1.5 text-center">
                    <ScoreCell
                      score={numericScore(ax?.score)}
                      confidence={ax?.confidence}
                      note={ax?.note}
                    />
                  </td>
                )
              })}
              <td className="border-l border-violet-100 bg-violet-50/30 px-2 py-1.5 text-center">
                {(() => {
                  const fit = fitById.get(m.id) ?? 0
                  return (
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-xs font-extrabold"
                      style={{ borderColor: fitColor(fit), color: fitColor(fit) }}
                      title="Your capital lens (not an objective score)"
                    >
                      {fit}
                    </span>
                  )
                })()}
              </td>
              <td className="px-3 py-2 text-xs text-slate-500">{TIER_LABELS[m.tier]}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{m.jurisdiction}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
        Cell color = score (red→green, higher is better). Solid = confidence A · hatched = B ·
        outlined = C. The violet <strong>Capital fit</strong> column reflects your Capital Lens
        (higher = fewer of your concerns present) — not an objective score. Hover a cell for the
        reason; click a row for full detail.
      </p>
    </div>
  )
}

function CardsView({ makers: rows }: { makers: Maker[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((m) => (
        <Link
          key={m.id}
          to={`/maker/${encodeURIComponent(m.id)}`}
          className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: TIER_COLORS[m.tier] }} />
            <h2 className="font-bold text-slate-900 group-hover:text-violet-700">{m.name}</h2>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.category && <Tag label="" value={m.category} tone="sky" />}
            <Tag label="" value={m.jurisdiction.split('(')[0].trim()} />
          </div>

          {/* labeled axis bars */}
          <div className="mt-4 flex items-end justify-between gap-1.5">
            {AXIS_KEYS.map((k) => {
              const ax = m.axes[k]
              const s = numericScore(ax?.score)
              const conf = ax?.confidence ?? 'A'
              return (
                <div
                  key={k}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${AXIS_LABELS[k]}: ${s == null ? 'n/a' : `${s}/4`} (confidence ${conf})${
                    ax?.note ? ` — ${ax.note}` : ''
                  }`}
                >
                  <div className="flex h-16 w-full items-end">
                    {s == null ? (
                      <div className="h-1.5 w-full rounded-sm border border-dashed border-slate-300 bg-slate-50" />
                    ) : (
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height: `${10 + s * 22}%`,
                          background: scoreColor(s),
                          opacity: conf === 'C' ? 0.35 : conf === 'B' ? 0.65 : 1,
                          border: conf === 'C' ? `1.5px dashed ${scoreColor(s)}` : undefined,
                          backgroundImage:
                            conf === 'B'
                              ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.6) 0 2px, transparent 2px 4px)'
                              : undefined,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    {AXIS_SHORT[k].slice(0, 4)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span className="mr-1">Confidence:</span>
            {AXIS_KEYS.map((k) => (
              <ConfidenceBadge key={k} c={m.axes[k].confidence} />
            ))}
          </div>
        </Link>
      ))}
    </div>
  )
}
