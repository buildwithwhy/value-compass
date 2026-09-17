import type { ReactNode } from 'react'
import { backersFor } from '../lib/data'
import { associationsAreUnverified, funderAssociationStatus } from '../lib/evidence'
import {
  CONCERN_LEGEND,
  evaluateMaker,
  INDEPENDENCE_LABELS,
  reputationReasons,
  type AttributeFinding,
  type LensResult,
} from '../lib/lens'
import { useCapitalLens } from '../lib/prioritiesContext'
import type { Funder, Maker } from '../lib/types'
import { LensNotChosen } from './CapitalLensPanel'
import { SectionTitle } from './ui'

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-700">{children}</dd>
    </div>
  )
}

/** No record — visually distinct from a recorded absence. */
function NoRecord() {
  return (
    <span
      className="text-slate-400"
      title="No entry in this dataset. Not a finding that the attribute is absent."
    >
      No record
    </span>
  )
}

/** Always-shown factual capital profile. No scoring, and no reading an empty
 *  field as a clean result. */
export function CapitalProfileCard({ maker }: { maker: Maker }) {
  const cp = maker.capital_profile
  if (!cp) return null
  const recordedFalse = (b: boolean) =>
    b ? (
      <span className="font-semibold text-slate-800">Yes</span>
    ) : (
      <span className="text-slate-600" title="Recorded as false in this dataset.">
        Recorded as no
      </span>
    )
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Independence">{INDEPENDENCE_LABELS[cp.independence_type]}</Fact>
        <Fact label="Founder control">
          {cp.founder_control ? (
            cp.founder_control
          ) : (
            <span className="text-slate-600">Recorded as none</span>
          )}
        </Fact>
        <Fact label="Competitor on the cap table">{recordedFalse(cp.competitor_entanglement)}</Fact>
        <Fact label="Sovereign / state capital">
          {cp.sovereign_state.length ? cp.sovereign_state.join('; ') : <NoRecord />}
        </Fact>
        <Fact label="Big Tech capital">
          {cp.big_tech_capital.length ? cp.big_tech_capital.join(', ') : <NoRecord />}
        </Fact>
        <Fact label="Circular vendor">
          {cp.circular_vendor.length ? cp.circular_vendor.join(', ') : <NoRecord />}
        </Fact>
        <Fact label="Public parent held by index funds">{recordedFalse(cp.index_held)}</Fact>
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
        These record <strong>who holds a stake</strong>. Holding a stake is not voting control, and
        it does not mean a share of what you pay goes to that holder. Voting control is listed only
        where the record states it. <strong>“No record”</strong> means this dataset has no entry —
        not that we checked and found none.
      </p>
    </div>
  )
}

const STATE_STYLE = {
  documented_present: {
    heading: 'Documented matches',
    cls: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  documented_absent: {
    heading: 'Documented clear, within scope',
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  unknown: {
    heading: 'No record',
    cls: 'border-dashed border-slate-300 bg-slate-50 text-slate-600',
  },
} as const

function FindingList({
  state,
  items,
  maker,
  onOpenFunder,
}: {
  state: keyof typeof STATE_STYLE
  items: AttributeFinding[]
  maker: Maker
  onOpenFunder?: (name: string) => void
}) {
  if (items.length === 0) return null
  const s = STATE_STYLE[state]
  const repBackers: Funder[] =
    state === 'documented_present'
      ? backersFor(maker.id)
          .map((b) => b.funder)
          .filter((f) => (f.notable_for ?? []).length > 0 && !associationsAreUnverified(f))
      : []
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        {s.heading} ({items.length})
      </p>
      <ul className="space-y-1.5">
        {items.map((f) => (
          <li key={f.key} className={`rounded-md border px-2.5 py-1.5 text-xs ${s.cls}`}>
            <span className="font-semibold">{f.label}</span>
            {f.detail && <span> — {f.detail}</span>}
            {f.scope && <p className="mt-0.5 text-[11px] leading-snug opacity-80">{f.scope}</p>}
            {f.key === 'backer_reputation' && repBackers.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {repBackers.map((b) => (
                  <li key={b.name} className="leading-snug">
                    {onOpenFunder ? (
                      <button
                        type="button"
                        onClick={() => onOpenFunder(b.name)}
                        className="font-semibold underline decoration-amber-400 underline-offset-2"
                      >
                        {b.name} ↗
                      </button>
                    ) : (
                      <span className="font-semibold">{b.name}</span>
                    )}
                    <ul className="ml-3 mt-0.5 list-disc space-y-0.5 marker:text-amber-400">
                      {reputationReasons(b).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Capital findings. There is no score here by design: a single 0–100 number
 * could only be produced by treating "we have no record" as a good result,
 * which is exactly the error this replaces. Three counts, and the coverage
 * behind them.
 */
export function CapitalFindings({
  maker,
  result,
  onOpenFunder,
}: {
  maker: Maker
  result?: LensResult
  onOpenFunder?: (name: string) => void
}) {
  const { lens, mode, chosen } = useCapitalLens()

  if (!chosen) return <LensNotChosen />

  const r = result ?? evaluateMaker(maker, lens)

  if (r.activeCount === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Every attribute is switched off, so there is nothing to check against.
      </div>
    )
  }

  const whose = mode === 'example' ? 'the example lens' : 'your lens'
  const documented = r.present.length + r.absent.length

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-800">Capital findings</h4>
        <span className="text-xs text-slate-500">under {whose}</span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          { n: r.present.length, label: 'documented matches', cls: 'text-amber-700' },
          { n: r.absent.length, label: 'documented clear', cls: 'text-emerald-700' },
          { n: r.unknown.length, label: 'no record', cls: 'text-slate-500' },
        ].map((x) => (
          <div key={x.label} className="rounded-lg border border-slate-200 py-2">
            <dt className={`text-xl font-extrabold ${x.cls}`}>{x.n}</dt>
            <dd className="mt-0.5 text-[11px] leading-snug text-slate-600">{x.label}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-xs leading-snug text-slate-500">
        Our record can speak to <strong className="text-slate-700">{documented}</strong> of{' '}
        {r.activeCount} attributes in {whose}
        {r.unknown.length > 0 && (
          <> — the other {r.unknown.length} count neither for nor against {maker.name}</>
        )}
        . There is no overall score: producing one would mean treating an absent record as a good
        result.
      </p>

      <FindingList
        state="documented_present"
        items={r.present}
        maker={maker}
        onOpenFunder={onOpenFunder}
      />
      <FindingList
        state="documented_absent"
        items={r.absent}
        maker={maker}
        onOpenFunder={onOpenFunder}
      />
      <FindingList state="unknown" items={r.unknown} maker={maker} onOpenFunder={onOpenFunder} />

      {r.pending.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-300 bg-slate-50 p-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pending or reported — not counted ({r.pending.length})
          </p>
          <ul className="mt-1 space-y-1 text-xs leading-snug text-slate-600">
            {r.pending.map((p, i) => (
              <li key={i}>
                <span className="font-semibold text-slate-700">{p.label}</span> — {p.detail}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-slate-500">
            Announced, contingent or reported-but-not-closed. Recorded here and kept out of the
            present-tense findings above.
          </p>
        </div>
      )}

      {r.unverifiedAssociations.length > 0 && (
        <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Unverified associations — not counted ({r.unverifiedAssociations.length})
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-600">
            {r.unverifiedAssociations.join(', ')} carry recorded associations with no source. They
            cannot become an established concern, so they do not appear in the counts above.
          </p>
        </div>
      )}

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
          Each reports an attribute from the maker's record. Calling it a concern is a judgement you
          make in the Capital Lens panel.
        </p>
      </details>
    </div>
  )
}

/** Backer associations — with each funder's verification status stated. */
export function BackerReputation({
  maker,
  onOpenFunder,
}: {
  maker: Maker
  onOpenFunder?: (name: string) => void
}) {
  const backers: Funder[] = backersFor(maker.id)
    .map((b) => b.funder)
    .filter((f) => (f.notable_for ?? []).length > 0)

  if (backers.length === 0) return null

  const unverified = backers.filter(associationsAreUnverified).length

  return (
    <div>
      <SectionTitle>Backer associations</SectionTitle>
      <p className="mb-2 text-xs leading-snug text-slate-500">
        Public associations of backers' key figures, recorded without a good-or-bad reading.
        {unverified > 0 && (
          <>
            {' '}
            <strong>
              {unverified} of {backers.length}
            </strong>{' '}
            carry no source and are marked unverified — leads for research, not established fact.
            They are excluded from every finding and ordering on this site.
          </>
        )}
      </p>
      <div className="space-y-2">
        {backers.map((f) => {
          const status = funderAssociationStatus(f.name)
          const isUnverified = status?.associations_status === 'unverified'
          return (
            <div
              key={f.name}
              className={`rounded-lg border p-3 ${
                isUnverified
                  ? 'border-dashed border-slate-300 bg-slate-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 font-semibold text-slate-800">
                {onOpenFunder ? (
                  <button
                    type="button"
                    onClick={() => onOpenFunder(f.name)}
                    className="text-teal-700 underline decoration-teal-300 underline-offset-2 hover:text-teal-900"
                    title={`Open ${f.name}`}
                  >
                    {f.name} ↗
                  </button>
                ) : (
                  f.name
                )}
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    isUnverified
                      ? 'border-dashed border-slate-400 bg-white text-slate-500'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                  title={
                    isUnverified
                      ? 'No source on record for these associations. Counted nowhere.'
                      : `${status?.source_count} source(s) on record for ${status?.claim_count} association(s).`
                  }
                >
                  {isUnverified ? 'Unverified — not counted' : 'Sourced'}
                </span>
              </div>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-600">
                {(f.notable_for ?? []).map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
              {f.reputation_sources && f.reputation_sources.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                  {f.reputation_sources.map((s, i) => (
                    <a
                      key={i}
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800"
                    >
                      {hostname(s)} ↗
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  No source on record. Awaiting research — not established fact, and excluded from
                  every finding and ordering here.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
