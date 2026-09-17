import { Fragment, useMemo, useState } from 'react'
import {
  AXIS_KEYS,
  AXIS_LABELS,
  allProducts,
  backersFor,
  makers,
} from '../lib/data'
import { TIER_LABELS } from '../lib/colors'
import { comparableExtremes, displayScore } from '../lib/evidence'
import type { Maker, Tier } from '../lib/types'
import { ConfidenceBadge } from '../components/ConfidenceBadge'
import { EvidenceBadge, EvidenceLegend } from '../components/EvidenceBadge'
import { PolarityLegend } from '../components/PolarityLegend'
import { ValueRadar, type RadarSeries } from '../components/ValueRadar'
import { Chip, SectionTitle } from '../components/ui'
import { isDeepPocket, RelationshipChips } from '../components/FunderCard'
import { CapitalLensPanel, LensNotChosen } from '../components/CapitalLensPanel'
import { CONCERN_LEGEND, evaluateMaker } from '../lib/lens'
import {
  criterionComparison,
  orderByPriorities,
  orderingIntegrity,
  prioritiesLabel,
} from '../lib/priorities'
import { useCapitalLens, usePriorities } from '../lib/prioritiesContext'
import { Link } from 'react-router-dom'

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
      <p className="mb-4 max-w-3xl text-sm leading-snug text-slate-500">
        Pick {MIN}–{MAX} makers to see their scores side by side, the reasoning and sources behind
        each one, and who holds a stake in them. Where the evidence is too thin to separate two
        makers, we say so rather than picking a winner.
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
                className="font-medium normal-case text-teal-700 hover:underline"
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

          {/* Against the visitor's priorities, before the full table */}
          <section>
            <SectionTitle>Against the priorities you set</SectionTitle>
            <PrioritySummary makers={selected} />
          </section>

          {/* Side-by-side table */}
          <section>
            <SectionTitle>Side-by-side</SectionTitle>
            <EvidenceLegend className="mb-2" />
            <CompareTable makers={selected} colors={series.map((s) => s.color)} />
          </section>

          {/* Merged funder picture */}
          <section>
            <SectionTitle>Who holds a stake — shared backers highlighted</SectionTitle>
            <SharedBackers makers={selected} />
          </section>

          {/* Capital findings — a personal filter, shown after the shared facts. */}
          <section>
            <SectionTitle>Capital findings — against a lens you choose</SectionTitle>
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
  const { lens, mode, chosen } = useCapitalLens()
  if (!chosen) return <LensNotChosen />

  const rows = sel
    .map((m) => ({ maker: m, result: evaluateMaker(m, lens) }))
    // Fewest DOCUMENTED matches first. Attributes with no record move nobody,
    // so a maker is never credited for a gap in our research.
    .sort(
      (a, b) =>
        a.result.present.length - b.result.present.length ||
        a.maker.name.localeCompare(b.maker.name),
    )
  const lensLabel = mode === 'example' ? 'the example lens' : 'your lens'
  const anyUnknown = rows.some((r) => r.result.unknown.length > 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="mb-2 text-xs leading-snug text-slate-500">
        Documented matches against <strong>{lensLabel}</strong>, fewest first. Only attributes our
        record can speak to are counted — there is no overall capital score, because producing one
        would mean counting an absent record as a clean result.
        {mode === 'example' && (
          <> The example lens is ValueCompass&apos;s starting point, not a statement of your priorities.</>
        )}
      </p>
      {anyUnknown && (
        <p className="mb-2 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-[11px] leading-snug text-slate-600">
          These makers do not all have the same attributes on record, so this order rests on
          different amounts of evidence for each. Read the per-maker counts rather than the position.
        </p>
      )}
      <ol className="space-y-2.5">
        {rows.map(({ maker, result }, i) => (
          <li
            key={maker.id}
            className="flex items-start gap-3 border-t border-slate-100 pt-2.5 first:border-0 first:pt-0"
          >
            <span className="mt-0.5 w-4 text-sm font-bold text-slate-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-slate-800">{maker.name}</span>
                <span className="text-xs text-slate-500">
                  <strong className="text-amber-700">{result.present.length}</strong> documented
                  match{result.present.length === 1 ? '' : 'es'} ·{' '}
                  <strong className="text-emerald-700">{result.absent.length}</strong> clear ·{' '}
                  <strong className="text-slate-500">{result.unknown.length}</strong> no record
                </span>
              </div>
              {result.present.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {result.present.map((f) => (
                    <li key={f.key} className="text-[11px] leading-snug">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                        {f.label}
                      </span>
                      {f.detail && <span className="ml-1 text-slate-500">{f.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
              {result.unknown.length > 0 && (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  No record for {result.unknown.map((f) => f.label).join(', ')} — counted neither way.
                </p>
              )}
              {result.unverifiedAssociations.length > 0 && (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  Unverified associations, not counted: {result.unverifiedAssociations.join(', ')}.
                </p>
              )}
              {result.pending.length > 0 && (
                <p className="mt-1 text-[11px] leading-snug text-slate-400">
                  {result.pending.length} pending or reported item
                  {result.pending.length === 1 ? '' : 's'} recorded separately, not counted.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600">
          What do these attributes mean?
        </summary>
        <dl className="mt-1.5 space-y-1">
          {CONCERN_LEGEND.map((c) => (
            <div key={c.label} className="text-[11px] leading-snug">
              <dt className="inline rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                {c.label}
              </dt>
              <dd className="ml-1 inline text-slate-500">— {c.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
          You choose which of these count as concerns, in the Capital Lens panel on the left.
          Associations with no source are excluded from every count here.
        </p>
      </details>
    </div>
  )
}

/**
 * How the selection lines up against what the visitor said matters. Placement
 * reuses the same rule as Browse, so a maker the evidence cannot speak to is
 * held apart here too rather than appearing last as though it had lost.
 */
function PrioritySummary({ makers: sel }: { makers: Maker[] }) {
  const { priorities, chosen } = usePriorities()

  if (!chosen) {
    return (
      <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-4">
        <p className="text-sm font-semibold text-teal-900">You have not set any priorities yet</p>
        <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-600">
          We are not going to choose some for you and then tell you which of these is the better
          option. Set them and this section will order the selection against them — and say which of
          your priorities the evidence cannot answer.
        </p>
        <Link
          to="/priorities"
          className="mt-2 inline-block rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
        >
          Set your priorities
        </Link>
      </div>
    )
  }

  const { placed, unplaced } = orderByPriorities(sel, priorities)
  const label = prioritiesLabel(priorities.mode)
  const integrity = orderingIntegrity(placed)
  const criteria = criterionComparison(sel, priorities)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-xs leading-snug text-slate-500">
        Measured against <strong className="text-slate-700">{label}</strong>. Only assessments that
        pass our evidence rule count, so this rests on less than the full table below — the
        per-maker line says how much.
      </p>

      {!integrity.uniform && placed.length > 1 && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            Not a like-for-like ordering
          </p>
          <p className="mt-1 text-xs leading-snug text-amber-800">
            These makers were not scored on the same criteria.{' '}
            {integrity.sharedAxes.length > 0 ? (
              <>
                Only{' '}
                <strong>{integrity.sharedAxes.map((a) => AXIS_LABELS[a]).join(', ')}</strong>{' '}
                {integrity.sharedAxes.length === 1 ? 'has' : 'have'} eligible evidence for all of
                them;{' '}
              </>
            ) : (
              <>No criterion has eligible evidence for all of them; </>
            )}
            <strong>{integrity.unevenAxes.map((a) => AXIS_LABELS[a]).join(', ')}</strong>{' '}
            {integrity.unevenAxes.length === 1 ? 'is' : 'are'} missing for at least one. An average
            over one set of criteria is not comparable with an average over another, however close
            the two numbers look — read the criterion-by-criterion list below instead of the
            positions.
          </p>
        </div>
      )}

      {placed.length === 0 ? (
        <p className="text-sm text-slate-600">
          None of these can be placed against what you asked for — see below.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {placed.map(({ maker, result }, i) => (
            <li key={maker.id} className="flex items-start gap-3 border-t border-slate-100 pt-2.5 first:border-0 first:pt-0">
              <span className="mt-0.5 w-4 text-sm font-bold text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold text-slate-800">{maker.name}</span>
                  {result.strength != null && (
                    <span className="text-sm text-slate-600">
                      {result.strength.toFixed(1)}/4 across{' '}
                      {result.evidenced.map((a) => AXIS_LABELS[a.axis]).join(', ')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-slate-500">
                  Based on {result.evidenced.length} of {result.axes.length} of {label}
                  {result.missing.length > 0 && (
                    <>
                      {' '}
                      — no comparable assessment for{' '}
                      {result.missing.map((m) => AXIS_LABELS[m.axis]).join(', ')}
                    </>
                  )}
                  .
                </p>
                {result.capital && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Capital, counted separately:{' '}
                    <strong className="text-amber-700">{result.capital.present.length}</strong>{' '}
                    documented match{result.capital.present.length === 1 ? '' : 'es'},{' '}
                    {result.capital.unknown.length} with no record.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {criteria.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Criterion by criterion
          </p>
          <p className="mb-2 text-xs leading-snug text-slate-500">
            The part that stays honest when coverage is uneven: one row per criterion you set, with
            only the makers that have eligible evidence for it.
          </p>
          <ul className="space-y-2">
            {criteria.map((row) => (
              <li key={row.axis} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {AXIS_LABELS[row.axis]}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {row.weight === 2 ? 'matters a lot' : 'matters'}
                  </span>
                </div>
                {row.scored.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    No eligible assessment for any of these makers.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {row.scored.map(({ maker, score }) => (
                      <li key={maker.id} className="flex justify-between gap-3">
                        <span className="text-slate-700">{maker.name}</span>
                        <span className="font-semibold text-slate-800">{score}/4</span>
                      </li>
                    ))}
                  </ul>
                )}
                {row.missing.length > 0 && (
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    Not counted: {row.missing.map((m) => `${m.maker.name} (${m.reason})`).join('; ')}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {unplaced.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Not enough established to place
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
            {unplaced.map(({ maker, result }) => (
              <li key={maker.id}>
                {maker.name}
                <span className="ml-1.5 text-xs text-slate-500">
                  — {result.evidenced.length} of {result.axes.length} of {label} have an eligible
                  assessment
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs leading-snug text-slate-500">
            These are not ranked below the others. Too little is published to say where they belong.
          </p>
        </div>
      )}
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
  const { lens, mode, chosen } = useCapitalLens()
  const { priorities } = usePriorities()
  const weights = priorities.weights
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const allExpanded = expanded.size === AXIS_KEYS.length
  // The capital row only exists once a lens has been chosen. It reports
  // documented matches and gaps — never a single score, and never a winner.
  const lensLabel = mode === 'example' ? 'the example lens' : 'your lens'
  // Rows you said matter come first. Nothing is hidden — the ordering just
  // stops you having to hunt for the axis you actually care about.
  const orderedAxes = [...AXIS_KEYS].sort(
    (a, b) => (weights[b] ?? 0) - (weights[a] ?? 0),
  )
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
                  className="text-left text-[11px] font-medium text-teal-700 hover:underline"
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
          {orderedAxes.map((key) => {
            // One rule decides: an assessment may win or lose a comparison only
            // when a source about this maker covers the claim the score rests on.
            // A confidence flag is not evidence. Everything else is shown, and
            // explicitly left out of the ranking.
            const { best, worst, ranked, skipped } = comparableExtremes(sel, key)
            const isOpen = expanded.has(key)
            return (
              <Fragment key={key}>
                <tr className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-700">
                    <button
                      type="button"
                      onClick={() => toggleRow(key)}
                      aria-expanded={isOpen}
                      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-left hover:text-teal-700"
                      title="Show the reason & sources behind these scores"
                    >
                      <span className="inline-flex items-baseline gap-1.5">
                        <span
                          className={`text-[10px] text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          aria-hidden
                        >
                          ▶
                        </span>
                        {AXIS_LABELS[key]}
                      </span>
                      {weights[key] > 0 && (
                        <span
                          className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-800"
                          title={
                            weights[key] === 2
                              ? 'You said this matters a lot'
                              : 'You said this matters'
                          }
                        >
                          {weights[key] === 2 ? 'priority ++' : 'priority'}
                        </span>
                      )}
                    </button>
                    {best == null && (
                      <p className="mt-0.5 text-[11px] font-normal leading-snug text-slate-400">
                        {ranked < 2
                          ? 'Too little evidence here to compare these makers.'
                          : 'These assessments are level, or too uncertain to separate.'}
                      </p>
                    )}
                    {best != null && skipped > 0 && (
                      <p className="mt-0.5 text-[11px] font-normal leading-snug text-slate-400">
                        {skipped} of {sel.length} left out of the ranking — too uncertain.
                      </p>
                    )}
                  </td>
                  {sel.map((m) => {
                    const axis = m.axes[key]
                    const d = displayScore(m, key)
                    const s = d.value
                    const isBest = best != null && d.eligible && s === best
                    const isWorst = worst != null && d.eligible && s === worst
                    return (
                      <td
                        key={m.id}
                        className={`px-3 py-2 ${isBest ? 'bg-emerald-50' : isWorst ? 'bg-rose-50' : ''}`}
                      >
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {s == null ? (
                            <span
                              className="text-slate-400"
                              title="Not established in our current research, so no score is shown."
                            >
                              —
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800">{s}/4</span>
                          )}
                          <EvidenceBadge basis={d.basis} />
                          {s != null && axis && <ConfidenceBadge c={axis.confidence} />}
                          {isBest && (
                            <span title="Highest of the assessments firm enough to rank" aria-label="highest">
                              ▲
                            </span>
                          )}
                          {isWorst && (
                            <span
                              title="Lowest of the assessments firm enough to rank"
                              aria-label="lowest"
                              className="text-rose-500"
                            >
                              ▼
                            </span>
                          )}
                          {s != null && !d.eligible && (
                            <span
                              className="text-[10px] font-medium text-slate-400"
                              title={`Left out of the ranking — ${d.ineligibleBecause}.`}
                            >
                              not ranked
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
                      const d = displayScore(m, key)
                      return (
                        <td key={m.id} className="px-3 py-2 align-top">
                          {d.withheld ? (
                            <p className="text-xs leading-snug text-slate-500">
                              Nothing published. The record reads: “{axis?.note}” — which establishes
                              only that it is undisclosed, so no score is shown.
                            </p>
                          ) : axis?.note ? (
                            <p className="text-xs leading-snug text-slate-600">{axis.note}</p>
                          ) : (
                            <p className="text-xs italic text-slate-400">No note.</p>
                          )}
                          {d.evidence.entity_sources.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                              {d.evidence.entity_sources.map((src) => (
                                <a
                                  key={src}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 underline underline-offset-2 hover:text-blue-800"
                                >
                                  {compareHost(src)} ↗
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1.5 text-[11px] text-slate-400">
                              No source about {m.name} attached
                              {d.evidence.background_sources.length > 0 &&
                                ` (${d.evidence.background_sources.length} background reading)`}
                              .
                            </p>
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
          {chosen && (
            <tr className="border-t-2 border-teal-200 bg-teal-50/40">
              <td className="sticky left-0 bg-teal-50/40 px-3 py-2 font-medium text-teal-800">
                Capital
                <span className="block text-[11px] font-normal text-teal-600">
                  documented against {lensLabel}
                </span>
              </td>
              {sel.map((m) => {
                const r = evaluateMaker(m, lens)
                return (
                  <td key={m.id} className="px-3 py-2">
                    <span className="text-sm text-slate-700">
                      <strong className="text-amber-700">{r.present.length}</strong> match
                      {r.present.length === 1 ? '' : 'es'}
                    </span>
                    <span className="block text-[11px] leading-snug text-slate-500">
                      {r.absent.length} clear · {r.unknown.length} no record
                    </span>
                  </td>
                )
              })}
            </tr>
          )}
        </tbody>
      </table>
      <div className="space-y-1 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs leading-snug text-slate-500">
        <p>
          <span className="rounded bg-emerald-50 px-1">▲ highest</span> /{' '}
          <span className="rounded bg-rose-50 px-1">▼ lowest</span> marks the ends of the range on
          that axis, among the assessments eligible to be ranked. A difference is only called when
          both sides carry a source that covers the claim being made. A confidence flag on its own
          does not qualify an assessment — so an unsourced 4/4 never beats an unsourced 0/4.
        </p>
        <p>
          A dash (—) means our research has not established a finding on that axis. It is missing,
          not zero, it counts neither for nor against the maker, and it is not a claim that the
          company published nothing.
        </p>
        {chosen && (
          <p>
            The capital row counts attributes in {lensLabel} that are <em>documented present</em>,
            alongside how many have no record. Attributes with no record count neither way, and
            there is no combined capital score — one could only be produced by treating a gap in our
            research as a clean result. No winner is marked on this row.
          </p>
        )}
      </div>
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
          <p className="mb-1 text-sm font-semibold text-amber-900">
            Backers these makers have in common
          </p>
          <p className="mb-2 text-xs leading-snug text-amber-800">
            Holding a stake in several of these is a fact about the cap table. It is not by itself
            evidence of control, coordination or harm — and the chips say what kind of stake each one
            is, where the record states it.
          </p>
          <ul className="space-y-2 text-sm text-amber-900">
            {shared.map((r) => (
              <li key={r.name}>
                <span className="font-bold">{r.name}</span>
                <span> — a stake in {r.count} of these:</span>
                <ul className="mt-1 space-y-1">
                  {[...r.backed].map((id) => (
                    <li key={id} className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300">
                        {makerName(id)}
                      </span>
                      <RelationshipChips
                        funderName={r.name}
                        makerId={id}
                        ownsOutright={r.ownsOf.has(id)}
                      />
                    </li>
                  ))}
                </ul>
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
