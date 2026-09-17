import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AXIS_KEYS, AXIS_LABELS, backersFor, getMaker, makers } from '../lib/data'
import { displayScore } from '../lib/evidence'
import { INDEPENDENCE_LABELS } from '../lib/lens'
import {
  hasPriorities,
  prioritiesLabel,
  priorityChanges,
  suggestedAlternatives,
  type ChangeDirection,
  type PriorityChange,
} from '../lib/priorities'
import { usePriorities } from '../lib/prioritiesContext'
import { TIER_COLORS, TIER_LABELS } from '../lib/colors'
import { RelationshipChips } from '../components/FunderCard'
import { SectionTitle } from '../components/ui'
import type { Funder, Maker } from '../lib/types'

// ---------------------------------------------------------------------------
// "What would switching change?"
//
// The discipline of this page is in what it refuses to say. A difference is
// only a difference when both sides are firm enough to compare; otherwise it is
// listed under what you cannot know, never quietly rounded to "no change".
// ---------------------------------------------------------------------------

const DIRECTION_STYLE: Record<ChangeDirection, { label: string; cls: string }> = {
  better: { label: 'Higher', cls: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
  worse: { label: 'Lower', cls: 'border-rose-300 bg-rose-50 text-rose-900' },
  same: { label: 'No change', cls: 'border-slate-200 bg-slate-50 text-slate-700' },
  unknown: { label: 'Cannot tell', cls: 'border-dashed border-slate-300 bg-white text-slate-500' },
}

function MakerPicker({
  label,
  value,
  exclude,
  onChange,
}: {
  label: string
  value: Maker | undefined
  exclude?: string
  onChange: (id: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value?.id ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500"
      >
        <option value="">Choose a maker…</option>
        {makers
          .filter((m) => m.id !== exclude)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>
    </label>
  )
}

function ChangeRow({ change, from, to }: { change: PriorityChange; from: Maker; to: Maker }) {
  const style = DIRECTION_STYLE[change.direction]
  return (
    <li className={`rounded-lg border p-3 ${style.cls}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{AXIS_LABELS[change.axis]}</span>
        <span className="flex items-center gap-2 text-xs">
          {change.weight === 2 && (
            <span className="rounded-full bg-white/70 px-2 py-0.5 font-semibold">
              matters a lot
            </span>
          )}
          <span className="rounded-full border border-current px-2 py-0.5 font-bold">
            {style.label}
          </span>
        </span>
      </div>
      {change.direction === 'unknown' ? (
        <p className="mt-1 text-xs leading-snug">
          No honest comparison is possible here — {change.unknownBecause}. This counts neither for
          nor against the switch.
        </p>
      ) : (
        <p className="mt-1 text-sm">
          {from.name} <strong>{change.from}/4</strong> → {to.name}{' '}
          <strong>{change.to}/4</strong>
          {change.direction === 'same' && (
            <span className="ml-1 text-xs">— the same score under this rubric.</span>
          )}
        </p>
      )}
    </li>
  )
}

function FunderList({
  title,
  intro,
  entries,
  makerId,
  tone,
}: {
  title: string
  intro: string
  entries: { funder: Funder; ownsOutright: boolean }[]
  makerId?: string
  tone: 'leave' | 'gain' | 'keep'
}) {
  const border =
    tone === 'keep' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
  return (
    <div className={`rounded-xl border p-3 ${border}`}>
      <h3 className="text-sm font-bold text-slate-800">
        {title} <span className="font-normal text-slate-500">({entries.length})</span>
      </h3>
      <p className="mt-0.5 text-xs leading-snug text-slate-600">{intro}</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm italic text-slate-400">None.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {entries.map(({ funder, ownsOutright }) => (
            <li key={funder.name} className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-medium text-slate-800">{funder.name}</span>
              <RelationshipChips
                funderName={funder.name}
                makerId={makerId}
                ownsOutright={ownsOutright}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SwitchView() {
  const { from: fromId, to: toId } = useParams<{ from?: string; to?: string }>()
  const navigate = useNavigate()
  const { priorities, chosen } = usePriorities()

  const from = getMaker(fromId ? decodeURIComponent(fromId) : undefined)
  const to = getMaker(toId ? decodeURIComponent(toId) : undefined)

  const alternatives = useMemo(
    () => (from ? suggestedAlternatives(from, priorities) : []),
    [from, priorities],
  )

  const changes = useMemo(
    () => (from && to && hasPriorities(priorities) ? priorityChanges(from, to, priorities) : []),
    [from, to, priorities],
  )

  const funders = useMemo(() => {
    if (!from || !to) return null
    const a = backersFor(from.id)
    const b = backersFor(to.id)
    const aNames = new Set(a.map((x) => x.funder.name))
    const bNames = new Set(b.map((x) => x.funder.name))
    return {
      leave: a.filter((x) => !bNames.has(x.funder.name)),
      gain: b.filter((x) => !aNames.has(x.funder.name)),
      keep: b.filter((x) => aNames.has(x.funder.name)),
    }
  }, [from, to])

  const go = (f?: string, t?: string) => {
    if (!f) return navigate('/switch')
    navigate(t ? `/switch/${encodeURIComponent(f)}/${encodeURIComponent(t)}` : `/switch/${encodeURIComponent(f)}`)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900">What would switching change?</h1>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        Pick what you use now and something you might move to. This shows what actually changes on
        the things you said matter, who you would stop and start funding — and what nobody has
        published, so you know what you would be choosing blind.
      </p>

      {/* Pickers */}
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end">
        <MakerPicker
          label="You use"
          value={from}
          exclude={to?.id}
          onChange={(id) => go(id, to?.id)}
        />
        <span aria-hidden className="hidden pb-2 text-lg text-slate-400 sm:block">
          →
        </span>
        <MakerPicker
          label="You are considering"
          value={to}
          exclude={from?.id}
          onChange={(id) => go(from?.id, id)}
        />
      </div>

      {/* Alternatives */}
      {from && alternatives.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Others in the same tier
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {alternatives.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => go(from.id, m.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  to?.id === m.id
                    ? 'border-teal-500 bg-teal-100 text-teal-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: TIER_COLORS[m.tier] }}
                />
                {m.name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs leading-snug text-slate-500">
            These are simply the other {TIER_LABELS[from.tier].toLowerCase()}s in the dataset. It
            does not model which products actually substitute for each other — you know that better
            than we do, so pick anyone above.
          </p>
        </div>
      )}

      {!from || !to ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Choose both sides to see what changes.
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* 1. Your priorities */}
          <section>
            <SectionTitle>What changes on {prioritiesLabel(priorities.mode)}</SectionTitle>
            {!chosen ? (
              <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/50 p-4">
                <p className="text-sm font-semibold text-teal-900">
                  You have not said what matters to you yet
                </p>
                <p className="mt-1 text-xs leading-snug text-slate-600">
                  We are not going to pick priorities on your behalf and then tell you this switch
                  is an improvement. Everything factual below is shown either way.
                </p>
                <Link
                  to="/priorities"
                  className="mt-2 inline-block rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                >
                  Set your priorities
                </Link>
              </div>
            ) : changes.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                You have prioritised capital attributes but no scored axes, so there is nothing to
                compare here. The capital picture is below.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {changes.map((c) => (
                    <ChangeRow key={c.axis} change={c} from={from} to={to} />
                  ))}
                </ul>
                {(() => {
                  const unknown = changes.filter((c) => c.direction === 'unknown').length
                  if (unknown === 0) return null
                  return (
                    <p className="mt-2 text-xs leading-snug text-slate-500">
                      {unknown} of {changes.length} of {prioritiesLabel(priorities.mode)} cannot be compared between
                      these two. That is the honest state of the evidence, not a neutral result —
                      switching would mean accepting that you do not know.
                    </p>
                  )
                })()}
              </>
            )}
          </section>

          {/* 2. Money */}
          {funders && (
            <section>
              <SectionTitle>Recorded funding relationships</SectionTitle>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <FunderList
                  title={`Associated with ${from.name}`}
                  intro={`Recorded as holding a stake in ${from.name}, with no entry for ${to.name} in our records.`}
                  entries={funders.leave}
                  makerId={from.id}
                  tone="leave"
                />
                <FunderList
                  title={`Associated with ${to.name}`}
                  intro={`Recorded as holding a stake in ${to.name}, with no entry for ${from.name} in our records.`}
                  entries={funders.gain}
                  makerId={to.id}
                  tone="gain"
                />
                <FunderList
                  title="Recorded for both"
                  intro="Our records show a stake in each of them."
                  entries={funders.keep}
                  makerId={to.id}
                  tone="keep"
                />
              </div>
              <div className="mt-2 space-y-1 text-xs leading-snug text-slate-500">
                <p>
                  These are <strong>recorded relationships</strong>, not a trace of money. This site
                  does not track customer spending, so nothing here shows where what you pay ends
                  up, or who gains from your switching.
                </p>
                <p>
                  A funder appearing in only one column means our records have no entry for the
                  other — <strong>not</strong> that no relationship exists. Check each chip for what
                  kind of stake is recorded; entries marked pending, announced or contingent are not
                  current ownership.
                </p>
              </div>
            </section>
          )}

          {/* 3. Structure */}
          <section>
            <SectionTitle>What else is different</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-600"></th>
                    <th className="px-3 py-2 font-semibold text-slate-800">{from.name}</th>
                    <th className="px-3 py-2 font-semibold text-slate-800">{to.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Jurisdiction', a: from.jurisdiction, b: to.jurisdiction },
                    { label: 'Ownership', a: from.vc_independent, b: to.vc_independent },
                    {
                      label: 'Independence',
                      a: from.capital_profile
                        ? INDEPENDENCE_LABELS[from.capital_profile.independence_type]
                        : '—',
                      b: to.capital_profile
                        ? INDEPENDENCE_LABELS[to.capital_profile.independence_type]
                        : '—',
                    },
                    {
                      label: 'Founder control',
                      a: from.capital_profile?.founder_control || 'None recorded',
                      b: to.capital_profile?.founder_control || 'None recorded',
                    },
                    { label: 'Structure', a: from.structure, b: to.structure },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                      <td className="px-3 py-2 text-slate-600">{row.a}</td>
                      <td className="px-3 py-2 text-slate-600">{row.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. The unknowns */}
          <section>
            <SectionTitle>What you cannot know either way</SectionTitle>
            <UnknownAxes from={from} to={to} />
          </section>

          <p className="text-xs leading-snug text-slate-500">
            This page does not recommend a switch. It shows what differs, what the difference rests
            on, and what is unknown — the decision is yours.{' '}
            <Link to={`/compare`} className="text-teal-700 underline underline-offset-2">
              Full side-by-side comparison
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

/** Every axis where our research has established nothing for at least one side —
 *  listed whether or not the visitor prioritised it, because it is what the
 *  switch hides. */
function UnknownAxes({ from, to }: { from: Maker; to: Maker }) {
  const rows = AXIS_KEYS.map((axis) => {
    const a = displayScore(from, axis)
    const b = displayScore(to, axis)
    const blind: string[] = []
    if (a.withheld) blind.push(from.name)
    if (b.withheld) blind.push(to.name)
    return { axis, blind }
  }).filter((r) => r.blind.length > 0)

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Our research has established a position for both makers on all five axes. That is unusual
        in this dataset.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <ul className="space-y-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.axis} className="flex flex-wrap items-baseline gap-2">
            <span className="font-medium text-slate-800">{AXIS_LABELS[r.axis]}</span>
            <span className="text-slate-500">
              not established for {r.blind.join(' or ')}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
        On {rows.length} of five axes our research has established nothing for at least one side,
        so you would be switching without that information. A gap in our record is not evidence of
        bad practice — but it is also not reassurance.
      </p>
    </div>
  )
}
