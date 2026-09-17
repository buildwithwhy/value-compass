import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AXIS_ABBR,
  AXIS_KEYS,
  AXIS_LABELS,
  AXIS_SHORT,
  allProducts,
  makers,
} from '../lib/data'
import { TIER_COLORS, TIER_LABELS, scoreColor } from '../lib/colors'
import { coverageFor, displayScore } from '../lib/evidence'
import type { AxisKey, Confidence, Maker, Tier } from '../lib/types'
import { evaluateMaker } from '../lib/lens'
import { orderByPriorities, orderingIntegrity, PLACEMENT_THRESHOLD } from '../lib/priorities'
import { useCapitalLens, usePriorities } from '../lib/prioritiesContext'
import { ConfidenceBadge, ConfidenceLegend } from '../components/ConfidenceBadge'
import { EvidenceLegend } from '../components/EvidenceBadge'
import { CapitalLensPanel } from '../components/CapitalLensPanel'
import { Chip, Tag } from '../components/ui'

const TIERS: Tier[] = ['frontier', 'tool', 'frontier_and_funder']

type SortKey = AxisKey | 'name' | 'tier' | 'fit' | 'priorities'
type ViewMode = 'matrix' | 'cards'

export function BrowseView() {
  const { lens, mode, chosen } = useCapitalLens()
  const { priorities, chosen: hasPrio } = usePriorities()
  // Documented matches and unknowns per maker. Deliberately not a single
  // number: the old 0–100 could only be produced by counting an absent record
  // as a clean result.
  const capitalById = useMemo(() => {
    const m = new Map<string, { present: number; unknown: number; active: number }>()
    for (const mk of makers) {
      const r = evaluateMaker(mk, lens)
      m.set(mk.id, { present: r.present.length, unknown: r.unknown.length, active: r.activeCount })
    }
    return m
  }, [lens])
  const [view, setView] = useState<ViewMode>('matrix')
  const [tierFilter, setTierFilter] = useState<Set<Tier>>(new Set())
  const [productFilter, setProductFilter] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  // Priorities, once stated, are what the visitor asked to see the list by.
  const [sortKey, setSortKey] = useState<SortKey>(hasPrio ? 'priorities' : 'name')
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

  // Priority ordering keeps two groups. Makers we cannot place are held apart
  // rather than sorted to the bottom — an unknown is not a bad result, and a
  // single list would read as though it were.
  const priorityGroups = useMemo(() => {
    if (sortKey !== 'priorities' || !hasPrio) return null
    return orderByPriorities(filtered, priorities)
  }, [sortKey, hasPrio, filtered, priorities])

  const sorted = useMemo(() => {
    if (priorityGroups) return priorityGroups.placed.map((r) => r.maker)
    const arr = [...filtered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sortKey === 'name' || sortKey === 'priorities') return a.name.localeCompare(b.name) * dir
      if (sortKey === 'tier') return (a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name)) * dir
      if (sortKey === 'fit') {
        // Fewest documented matches first. Unknowns move nobody.
        const ca = capitalById.get(a.id)?.present ?? 0
        const cb = capitalById.get(b.id)?.present ?? 0
        return (ca - cb) * dir || a.name.localeCompare(b.name)
      }
      // axis: makers with no score shown always sort last, in either direction
      const sa = displayScore(a, sortKey).value
      const sb = displayScore(b, sortKey).value
      if (sa == null && sb == null) return a.name.localeCompare(b.name)
      if (sa == null) return 1
      if (sb == null) return -1
      return (sa - sb) * dir || a.name.localeCompare(b.name)
    })
    return arr
  }, [filtered, sortKey, sortDir, capitalById, priorityGroups])

  const unplaced = priorityGroups?.unplaced ?? []
  const integrity = priorityGroups ? orderingIntegrity(priorityGroups.placed) : null
  const prioritisedAxes = useMemo(
    () => new Set(AXIS_KEYS.filter((k) => priorities.weights[k] > 0)),
    [priorities],
  )

  const coverage = useMemo(() => coverageFor(), [])

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
          <p className="max-w-2xl text-sm leading-snug text-slate-500">
            All {makers.length} makers, scored 0–4 on five axes against a{' '}
            <Link to="/about" className="text-teal-700 underline underline-offset-2">
              published rubric
            </Link>
            . The scores are ValueCompass assessments, not measurements. Click any row for the
            reasons, the sources, and who holds a stake.
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
                view === v ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
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
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-400"
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
      <div className="mb-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <ScoreLegend />
          <span className="text-slate-400">{sorted.length} shown</span>
        </div>
        <EvidenceLegend />
        <ConfidenceLegend />
        <p className="border-t border-slate-100 pt-2 leading-snug text-slate-500">
          Across all {coverage.total} assessments in the dataset,{' '}
          <strong className="text-slate-700">{coverage.sourced}</strong> carry a source about the
          maker they describe and{' '}
          for <strong className="text-slate-700">{coverage.notEstablished}</strong> our research has
          established nothing — those show no score.
        </p>
      </div>

      {/* Priorities banner — says whose ordering this is, and what it cost */}
      <div className="mb-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
        {!hasPrio ? (
          <p className="text-sm leading-snug text-slate-700">
            <strong className="text-teal-900">Order this list by what matters to you.</strong>{' '}
            Nothing is applied by default.{' '}
            <Link to="/priorities" className="font-semibold text-teal-700 underline underline-offset-2">
              Set your priorities
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm leading-snug text-slate-700">
              {sortKey === 'priorities' ? (
                <>
                  Ordered by{' '}
                  <strong className="text-teal-900">
                    {priorities.mode === 'example' ? 'the example priorities' : 'your priorities'}
                  </strong>
                  {unplaced.length > 0 && (
                    <>
                      {' '}
                      — {unplaced.length} maker{unplaced.length === 1 ? '' : 's'} could not be
                      placed and {unplaced.length === 1 ? 'is' : 'are'} listed separately below.
                    </>
                  )}
                </>
              ) : (
                <>
                  Sorted by column.{' '}
                  <button
                    type="button"
                    onClick={() => setSort('priorities')}
                    className="font-semibold text-teal-700 underline underline-offset-2"
                  >
                    Order by{' '}
                    {priorities.mode === 'example' ? 'the example priorities' : 'your priorities'}
                  </button>
                </>
              )}
            </p>
            <Link to="/priorities" className="text-xs font-medium text-teal-700 hover:underline">
              Change
            </Link>
          </div>
        )}
      </div>

      {integrity && !integrity.uniform && sorted.length > 1 && (
        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            An exploratory order, not a like-for-like ranking
          </p>
          <p className="mt-1 max-w-4xl text-xs leading-snug text-amber-800">
            These makers were not all scored on the same criteria, so their averages are taken over
            different evidence. {integrity.unevenAxes.map((a) => AXIS_LABELS[a]).join(', ')}{' '}
            {integrity.unevenAxes.length === 1 ? 'is' : 'are'} missing for at least one of them. Use
            this to explore, and read the individual cells rather than the position — the{' '}
            <Link to="/compare" className="font-semibold underline underline-offset-2">
              comparison view
            </Link>{' '}
            breaks it down criterion by criterion.
          </p>
        </div>
      )}

      {/* Capital Lens — drives the "Capital" column; collapsible to keep focus on scores */}
      {view === 'matrix' && (
        <details className="mb-3 rounded-xl border border-teal-200 bg-teal-50/40">
          <summary className="cursor-pointer px-3 py-2 text-sm font-bold text-teal-900">
            🔍 Capital Lens —{' '}
            {chosen
              ? `tune the “Capital” column (${mode === 'example' ? 'example lens' : 'your lens'})`
              : 'choose what matters to you to add a “Capital” column'}
          </summary>
          <div className="px-3 pb-3">
            <CapitalLensPanel />
          </div>
        </details>
      )}

      {sorted.length === 0 && unplaced.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No makers match your search and filters.
        </div>
      ) : view === 'matrix' ? (
        <>
          {sorted.length > 0 && (
            <MatrixView
              makers={sorted}
              capitalById={capitalById}
              showFit={chosen}
              lensLabel={mode === 'example' ? 'the example lens' : 'your lens'}
              prioritisedAxes={prioritisedAxes}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={setSort}
            />
          )}
          {unplaced.length > 0 && (
            <UnplacedGroup rows={unplaced} className="mt-4" />
          )}
        </>
      ) : (
        <>
          <CardsView makers={sorted} />
          {unplaced.length > 0 && (
            <UnplacedGroup rows={unplaced} className="mt-5" />
          )}
        </>
      )}
    </div>
  )
}

/**
 * Makers the evidence cannot place against the stated priorities. Presented as
 * a distinct state with its own explanation — not as the tail of a ranking.
 */
function UnplacedGroup({
  rows,
  className = '',
}: {
  rows: ReturnType<typeof orderByPriorities>['unplaced']
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-slate-300 bg-slate-50 p-4 ${className}`}>
      <h2 className="text-sm font-bold text-slate-700">
        Not enough established to place ({rows.length})
      </h2>
      <p className="mt-1 max-w-3xl text-xs leading-snug text-slate-600">
        Fewer than {Math.round(PLACEMENT_THRESHOLD * 100)}% of the priorities in effect have
        eligible evidence for these makers, so we will not rank them. They are not at the bottom of
        the list — they are off it, and they remain in search. An unestablished record is not a bad
        result.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ maker, result }) => (
          <li key={maker.id}>
            <Link
              to={`/maker/${encodeURIComponent(maker.id)}`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-teal-300"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: TIER_COLORS[maker.tier] }}
              />
              <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                {maker.name}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {result.evidenced.length}/{result.axes.length} known
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
        className="ml-1 inline-flex h-4 items-center rounded border border-dashed border-slate-300 bg-slate-50 px-1 text-[10px] text-slate-500"
        title="Nothing published on this axis — shown as a gap, never as a zero."
      >
        —
      </span>
    </span>
  )
}

// --- score cell shared by matrix; encodes score (color) + confidence (style) ---
function ScoreCell({
  score,
  confidence,
  note,
  withheld,
  size = 'md',
}: {
  score: number | null
  confidence?: Confidence
  note?: string
  withheld?: boolean
  size?: 'md' | 'sm'
}) {
  const bg = scoreColor(score)
  // Confidence styling: A solid, B translucent + hatch, C hollow/outlined.
  const conf = confidence ?? 'A'
  const dims = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs'
  if (score == null) {
    return (
      <span
        title={
          withheld
            ? 'Not established in our current research — a gap in our record, not a finding about the company. No score is shown.'
            : note || 'No score recorded.'
        }
        className={`inline-flex ${dims} items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium text-slate-400`}
      >
        {withheld ? '—' : 'n/a'}
        <span className="sr-only">
          {withheld ? 'not established, no score shown' : 'no score recorded'}
        </span>
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
        active ? 'text-teal-700' : 'text-slate-600 hover:text-slate-900'
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
  capitalById,
  showFit,
  lensLabel,
  prioritisedAxes,
  sortKey,
  sortDir,
  onSort,
}: {
  makers: Maker[]
  capitalById: Map<string, { present: number; unknown: number; active: number }>
  showFit: boolean
  lensLabel: string
  prioritisedAxes: Set<AxisKey>
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
            {AXIS_KEYS.map((k) => {
              const prioritised = prioritisedAxes.has(k)
              return (
                <th
                  key={k}
                  className={`px-2 py-2 text-center ${prioritised ? 'bg-teal-50/70' : ''}`}
                >
                  <SortHeader
                    label={AXIS_SHORT[k]}
                    title={prioritised ? `${AXIS_LABELS[k]} — one of the priorities in effect` : AXIS_LABELS[k]}
                    active={sortKey === k}
                    dir={sortDir}
                    onClick={() => onSort(k)}
                  />
                  {prioritised && (
                    <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                      priority
                    </span>
                  )}
                </th>
              )
            })}
            {showFit && (
              <th className="border-l border-teal-200 bg-teal-50/40 px-2 py-2 text-center">
                <SortHeader
                  label="Capital"
                  title={`Documented matches against ${lensLabel}, with how many attributes have no record. Not a rating of the company.`}
                  active={sortKey === 'fit'}
                  dir={sortDir}
                  onClick={() => onSort('fit')}
                />
              </th>
            )}
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
              className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-teal-50/40"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold text-slate-800 group-hover:bg-teal-50"
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
                const d = displayScore(m, k)
                const prioritised = prioritisedAxes.has(k)
                return (
                  <td
                    key={k}
                    className={`px-2 py-1.5 text-center ${
                      prioritised ? 'bg-teal-50/40' : prioritisedAxes.size > 0 ? 'opacity-60' : ''
                    }`}
                  >
                    <ScoreCell
                      score={d.value}
                      confidence={ax?.confidence}
                      note={ax?.note}
                      withheld={d.withheld}
                    />
                  </td>
                )
              })}
              {showFit && (
                <td className="border-l border-teal-100 bg-teal-50/30 px-2 py-1.5 text-center">
                  {(() => {
                    const c = capitalById.get(m.id)
                    if (!c) return null
                    return (
                      <span
                        className="inline-flex flex-col items-center leading-tight"
                        title={`${c.present} documented match(es) against ${lensLabel}; ${c.unknown} of ${c.active} attributes have no record.`}
                      >
                        <span className="text-sm font-extrabold text-amber-700">{c.present}</span>
                        <span className="text-[10px] text-slate-500">
                          match{c.present === 1 ? '' : 'es'}
                        </span>
                        {c.unknown > 0 && (
                          <span className="text-[10px] text-slate-400">{c.unknown} unknown</span>
                        )}
                      </span>
                    )
                  })()}
                </td>
              )}
              <td className="px-3 py-2 text-xs text-slate-500">{TIER_LABELS[m.tier]}</td>
              <td className="px-3 py-2 text-xs text-slate-500">{m.jurisdiction}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs leading-snug text-slate-500">
        Cell colour = the assessed score (red→green). Solid = confidence A · hatched = B · outlined =
        C. A dash (<span className="font-semibold">—</span>) means our research has not established
        a finding on that axis, so no score is shown.
        {showFit && (
          <>
            {' '}
            The <strong>Capital</strong> column counts attributes in {lensLabel} that are
            <em> documented present</em> for each maker, and how many have no record at all.
            Attributes with no record count neither for nor against. There is no overall capital
            score, because producing one would mean scoring an absent record as a good result.
          </>
        )}{' '}
        Hover a cell for the reason; click a row for the sources.
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
            <h2 className="font-bold text-slate-900 group-hover:text-teal-700">{m.name}</h2>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.category && <Tag label="" value={m.category} tone="sky" />}
            <Tag label="" value={m.jurisdiction.split('(')[0].trim()} />
          </div>

          {/* labeled axis bars */}
          <div className="mt-4 flex items-end justify-between gap-1.5">
            {AXIS_KEYS.map((k) => {
              const ax = m.axes[k]
              const d = displayScore(m, k)
              const s = d.value
              const conf = ax?.confidence ?? 'A'
              return (
                <div
                  key={k}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={
                    d.withheld
                      ? `${AXIS_LABELS[k]}: not established in our current research, so no score is shown.`
                      : `${AXIS_LABELS[k]}: ${s == null ? 'no score' : `${s}/4`} (confidence ${conf})${
                          ax?.note ? ` — ${ax.note}` : ''
                        }`
                  }
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
                  <span className="text-[10px] font-medium text-slate-500">{AXIS_ABBR[k]}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
            <span className="mr-1">Confidence:</span>
            {AXIS_KEYS.map((k) =>
              displayScore(m, k).withheld ? (
                <span
                  key={k}
                  title={`${AXIS_LABELS[k]}: not established`}
                  className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-dashed border-slate-300 px-1 text-[11px] font-bold leading-none text-slate-400"
                >
                  —
                </span>
              ) : (
                <ConfidenceBadge key={k} c={m.axes[k].confidence} />
              ),
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
