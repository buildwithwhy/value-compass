import { Fragment, useMemo, useState } from 'react'
import {
  AXIS_KEYS,
  AXIS_LABELS,
  allProducts,
  backersFor,
  makers,
  numericScore,
} from '../lib/data'
import { TIER_LABELS } from '../lib/colors'
import type { Maker, Tier } from '../lib/types'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { PolarityLegend } from '../components/PolarityLegend'
import { ValueRadar, type RadarSeries } from '../components/ValueRadar'
import { Chip, SectionTitle } from '../components/ui'
import { isDeepPocket } from '../components/FunderCard'
import { CapitalLensPanel } from '../components/CapitalLensPanel'
import { CONCERN_LEGEND, evaluateMaker } from '../lib/lens'
import { useCapitalLens } from '../lib/lensContext'

// Distinct overlay palette (independent of tier color so series stay readable).
const COMPARE_COLORS = ['#7c3aed', '#0ea5e9', '#f59e0b', '#16a34a']
const MAX = 4
const MIN = 2
const TIERS: Tier[] = ['frontier', 'tool', 'frontier_and_funder']

export function CompareView() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [tierFilter, setTierFilter] = useState<Set<Tier>>(new Set())
  const [productFilter, setProductFilter] = useState<Set<string>>(new Set())

  const selectable = useMemo(() => {
    return makers.filter((m) => {
      if (tierFilter.size && !tierFilter.has(m.tier)) return false
      if (productFilter.size && !m.products_models.some((p) => productFilter.has(p))) return false
      return true
    })
  }, [tierFilter, productFilter])

  const selected = selectedIds.map((id) => makers.find((m) => m.id === id)!).filter(Boolean)
  const series: RadarSeries[] = selected.map((m, i) => ({
    maker: m,
    color: COMPARE_COLORS[i % COMPARE_COLORS.length],
  }))

  function toggleMaker(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX) return prev // cap at 4
      return [...prev, id]
    })
  }

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set)
    next.has(val) ? next.delete(val) : next.add(val)
    setter(next)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <h1 className="text-xl font-extrabold text-slate-900">Compare</h1>
      <p className="mb-4 text-sm text-slate-500">
        Select {MIN}–{MAX} makers to overlay their Value Compass, compare axes side-by-side, and see
        shared backers.
      </p>

      {/* Selector */}
      <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
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
        <div>
          <div className="mb-1 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Makers ({selectedIds.length}/{MAX} selected)
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="font-medium normal-case text-violet-700 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectable.map((m) => {
              const idx = selectedIds.indexOf(m.id)
              const active = idx >= 0
              const atCap = selectedIds.length >= MAX && !active
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={atCap}
                  onClick={() => toggleMaker(m.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-transparent text-white'
                      : atCap
                        ? 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                  style={active ? { background: COMPARE_COLORS[idx % COMPARE_COLORS.length] } : undefined}
                >
                  {active && <span aria-hidden>✓</span>}
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {selected.length < MIN ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          Select at least {MIN} makers to compare.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overlaid radar */}
          <section>
            <SectionTitle>Overlaid Value Compass</SectionTitle>
            <PolarityLegend className="mb-2" />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <ValueRadar series={series} height={380} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {series.map((s) => (
                  <span key={s.maker.id} className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    {s.maker.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Side-by-side table */}
          <section>
            <SectionTitle>Side-by-side</SectionTitle>
            <CompareTable makers={selected} colors={series.map((s) => s.color)} />
          </section>

          {/* Merged funder picture */}
          <section>
            <SectionTitle>Merged funder picture — shared backers highlighted</SectionTitle>
            <SharedBackers makers={selected} />
          </section>

          {/* Capital fit under the user's lens — kept last: it's a personal
              filter, shown after the objective conduct & funder factors. */}
          <section>
            <SectionTitle>Capital fit — under your lens</SectionTitle>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
              <CapitalLensPanel compact />
              <CapitalFitRanking makers={selected} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function CapitalFitRanking({ makers: sel }: { makers: Maker[] }) {
  const { lens } = useCapitalLens()
  const ranked = sel
    .map((m) => ({ maker: m, result: evaluateMaker(m, lens) }))
    .sort((a, b) => b.result.fit - a.result.fit)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs text-slate-500">
        Ranked by “capital fit” — higher = fewer of <em>your</em> selected concerns present.
        Lens-dependent, not an objective rating. The amber tags are the concerns you enabled that{' '}
        <em>are</em> present in each maker; the grey text says exactly what triggered it.
      </p>
      <ol className="space-y-2.5">
        {ranked.map(({ maker, result }, i) => {
          const color =
            result.fit >= 80
              ? '#16a34a'
              : result.fit >= 50
                ? '#ca8a04'
                : result.fit >= 25
                  ? '#ea580c'
                  : '#dc2626'
          return (
            <li key={maker.id} className="flex items-start gap-3 border-t border-slate-100 pt-2.5 first:border-0 first:pt-0">
              <span className="mt-0.5 w-4 text-sm font-bold text-slate-400">{i + 1}</span>
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] text-xs font-extrabold"
                style={{ borderColor: color, color }}
              >
                {result.fit}
              </span>
              <div className="min-w-0">
                <span className="font-semibold text-slate-800">{maker.name}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {result.clearCount}/{result.activeCount} clear
                </span>
                {result.hits.length > 0 ? (
                  <ul className="mt-1 space-y-0.5">
                    {result.hits.map((h) => (
                      <li key={h.key} className="text-[11px] leading-snug">
                        <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                          {h.label}
                        </span>
                        <span className="text-slate-500">{h.detail}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-0.5 text-[11px] text-emerald-700">No concerns flagged.</div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {/* What the tags mean */}
      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          What do these tags mean?
        </summary>
        <dl className="mt-1.5 space-y-1">
          {CONCERN_LEGEND.map((c) => (
            <div key={c.label} className="text-[11px] leading-snug">
              <dt className="inline rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
                {c.label}
              </dt>
              <dd className="ml-1 inline text-slate-500">— {c.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1.5 text-[11px] italic text-slate-400">
          You choose which of these count as concerns in the Capital Lens panel on the left. Backer
          reputation tags are factual associations (v1), not judgments.
        </p>
      </details>
    </div>
  )
}

function compareHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function CompareTable({ makers: sel, colors }: { makers: Maker[]; colors: string[] }) {
  const { lens } = useCapitalLens()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const allExpanded = expanded.size === AXIS_KEYS.length
  // best/worst per axis (higher = better). n/a excluded from extremes.
  const fits = sel.map((m) => evaluateMaker(m, lens).fit)
  const bestFit = Math.max(...fits)
  const worstFit = Math.min(...fits)
  const fitDistinct = bestFit !== worstFit
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse bg-white text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
              <div className="flex flex-col gap-0.5">
                <span>Axis / attribute</span>
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(allExpanded ? new Set() : new Set(AXIS_KEYS as readonly string[]))
                  }
                  className="text-left text-[11px] font-medium text-violet-700 hover:underline"
                >
                  {allExpanded ? 'Collapse all reasons' : 'Show all reasons ▾'}
                </button>
              </div>
            </th>
            {sel.map((m, i) => (
              <th key={m.id} className="px-3 py-2 text-left font-semibold text-slate-800">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />
                  {m.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {AXIS_KEYS.map((key) => {
            const scores = sel.map((m) => numericScore(m.axes[key]?.score))
            const present = scores.filter((s): s is number => s != null)
            const best = present.length ? Math.max(...present) : null
            const worst = present.length ? Math.min(...present) : null
            const distinct = best !== worst
            const isOpen = expanded.has(key)
            return (
              <Fragment key={key}>
                <tr className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">
                    <button
                      type="button"
                      onClick={() => toggleRow(key)}
                      aria-expanded={isOpen}
                      className="flex items-center gap-1.5 text-left hover:text-violet-700"
                      title="Show the reason & sources behind these scores"
                    >
                      <span
                        className={`text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        ▶
                      </span>
                      {AXIS_LABELS[key]}
                    </button>
                  </td>
                  {sel.map((m) => {
                    const axis = m.axes[key]
                    const s = numericScore(axis?.score)
                    const isBest = distinct && s != null && s === best
                    const isWorst = distinct && s != null && s === worst
                    return (
                      <td
                        key={m.id}
                        className={`px-3 py-2 ${isBest ? 'bg-emerald-50' : isWorst ? 'bg-rose-50' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {s == null ? (
                            <span className="text-slate-400">n/a</span>
                          ) : (
                            <span className="font-bold text-slate-800">{s}/4</span>
                          )}
                          {axis && <ConfidenceBadge c={axis.confidence} />}
                          {isBest && (
                            <span title="best of selection" aria-label="best">
                              ▲
                            </span>
                          )}
                          {isWorst && (
                            <span title="worst of selection" aria-label="worst" className="text-rose-500">
                              ▼
                            </span>
                          )}
                        </span>
                      </td>
                    )
                  })}
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50/60">
                    <td className="sticky left-0 bg-slate-50/60 px-3 py-2 align-top text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Why / sources
                    </td>
                    {sel.map((m) => {
                      const axis = m.axes[key]
                      return (
                        <td key={m.id} className="px-3 py-2 align-top">
                          {axis?.note ? (
                            <p className="text-xs leading-snug text-slate-600">{axis.note}</p>
                          ) : (
                            <p className="text-xs italic text-slate-400">No note.</p>
                          )}
                          {axis?.sources && axis.sources.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                              {axis.sources.map((src, i) => (
                                <a
                                  key={i}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 underline underline-offset-2 hover:text-blue-800"
                                >
                                  {compareHost(src)} ↗
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )}
              </Fragment>
            )
          })}
          {/* factual rows */}
          <tr className="border-t-2 border-slate-200">
            <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">Jurisdiction</td>
            {sel.map((m) => (
              <td key={m.id} className="px-3 py-2 text-slate-600">
                {m.jurisdiction}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">
              VC / independent
            </td>
            {sel.map((m) => (
              <td key={m.id} className="px-3 py-2 text-slate-600">
                {m.vc_independent}
              </td>
            ))}
          </tr>
          <tr className="border-t border-slate-100">
            <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">
              Products / models
            </td>
            {sel.map((m) => (
              <td key={m.id} className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {m.products_models.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr className="border-t-2 border-violet-200 bg-violet-50/40">
            <td className="sticky left-0 bg-violet-50/40 px-3 py-2 font-medium text-violet-800">
              Capital fit (your lens)
            </td>
            {sel.map((m) => {
              const fit = evaluateMaker(m, lens).fit
              const isBest = fitDistinct && fit === bestFit
              const isWorst = fitDistinct && fit === worstFit
              return (
                <td
                  key={m.id}
                  className={`px-3 py-2 ${isBest ? 'bg-emerald-50' : isWorst ? 'bg-rose-50' : ''}`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-bold text-slate-800">{fit}</span>
                    {isBest && <span title="best fit" aria-label="best">▲</span>}
                    {isWorst && (
                      <span title="worst fit" aria-label="worst" className="text-rose-500">
                        ▼
                      </span>
                    )}
                  </span>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
        <span className="rounded bg-emerald-50 px-1">▲ best</span> /{' '}
        <span className="rounded bg-rose-50 px-1">▼ worst</span> per axis — higher score = more
        pro-social. n/a = insufficient evidence (excluded from best/worst).
      </p>
    </div>
  )
}

function SharedBackers({ makers: sel }: { makers: Maker[] }) {
  // funderName -> set of maker ids it backs (within selection)
  const map = new Map<string, { backed: Set<string>; ownsOf: Set<string>; parentType: string }>()
  for (const m of sel) {
    for (const { funder, ownsOutright } of backersFor(m.id)) {
      const entry = map.get(funder.name) ?? {
        backed: new Set<string>(),
        ownsOf: new Set<string>(),
        parentType: funder.parent_type,
      }
      entry.backed.add(m.id)
      if (ownsOutright) entry.ownsOf.add(m.id)
      map.set(funder.name, entry)
    }
  }

  const rows = [...map.entries()]
    .map(([name, v]) => ({ name, ...v, count: v.backed.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  const shared = rows.filter((r) => r.count >= 2)

  if (rows.length === 0) {
    return <p className="text-sm italic text-slate-400">No modeled funder nodes back these makers.</p>
  }

  const makerName = (id: string) => sel.find((m) => m.id === id)?.name ?? id

  return (
    <div className="space-y-4">
      {shared.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm font-semibold text-amber-900">
            Shared backers — the key comparative insight:
          </p>
          <ul className="space-y-1.5 text-sm text-amber-900">
            {shared.map((r) => (
              <li key={r.name} className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold">{r.name}</span>
                <span>backs {r.count} of these:</span>
                {[...r.backed].map((id) => (
                  <span
                    key={id}
                    className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300"
                  >
                    {makerName(id)}
                    {r.ownsOf.has(id) && ' (owns)'}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* per-maker columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sel.map((m) => {
          const backers = backersFor(m.id)
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <h3 className="mb-2 font-semibold text-slate-800">{m.name}</h3>
              {backers.length === 0 ? (
                <p className="text-xs italic text-slate-400">No modeled funder nodes.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {backers.map(({ funder, ownsOutright }) => {
                    const isShared = (map.get(funder.name)?.backed.size ?? 0) >= 2
                    return (
                      <li
                        key={funder.name}
                        className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${
                          isShared ? 'bg-amber-100 font-medium text-amber-900' : 'text-slate-600'
                        }`}
                      >
                        {isShared && <span aria-hidden>★</span>}
                        <span>{funder.name}</span>
                        {ownsOutright && <span className="text-[10px] uppercase text-slate-500">owns</span>}
                        {isDeepPocket(funder) && (
                          <span className="ml-auto rounded bg-rose-100 px-1 text-[10px] font-bold uppercase text-rose-700">
                            deep
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
