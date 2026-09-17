import type { ReactNode } from 'react'
import { backersFor } from '../lib/data'
import { associationsAreUnverified, funderAssociationStatus } from '../lib/evidence'
import {
  CONCERN_LEGEND,
  evaluateMaker,
  INDEPENDENCE_LABELS,
  reputationReasons,
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

/** Always-shown, neutral factual capital profile. No scoring here. */
export function CapitalProfileCard({ maker }: { maker: Maker }) {
  const cp = maker.capital_profile
  if (!cp) return null
  const yesNo = (b: boolean) => (
    <span className={b ? 'font-semibold text-slate-800' : 'text-slate-500'}>{b ? 'Yes' : 'No'}</span>
  )
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Independence">{INDEPENDENCE_LABELS[cp.independence_type]}</Fact>
        <Fact label="Founder control">
          {cp.founder_control ? cp.founder_control : <span className="text-slate-500">None recorded</span>}
        </Fact>
        <Fact label="Competitor on the cap table">{yesNo(cp.competitor_entanglement)}</Fact>
        <Fact label="Sovereign / state capital">
          {cp.sovereign_state.length ? cp.sovereign_state.join('; ') : <span className="text-slate-500">None recorded</span>}
        </Fact>
        <Fact label="Big Tech capital">
          {cp.big_tech_capital.length ? cp.big_tech_capital.join(', ') : <span className="text-slate-500">None recorded</span>}
        </Fact>
        <Fact label="Circular vendor">
          {cp.circular_vendor.length ? cp.circular_vendor.join(', ') : <span className="text-slate-500">None recorded</span>}
        </Fact>
        <Fact label="Public parent held by index funds">{yesNo(cp.index_held)}</Fact>
      </dl>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
        These record <strong>who holds a stake</strong>. Holding a stake is not the same as holding
        voting control, and it does not mean a share of what you pay goes to that holder. Voting
        control is listed only where the record states it. “None recorded” means this dataset has no
        entry — not that none exists.
      </p>
    </div>
  )
}

/**
 * Capital fit — only ever shown once the visitor has chosen a lens, and always
 * labelled with whose lens it is.
 */
export function CapitalFitBadge({
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
        Every attribute is switched off, so there is nothing to check against. Turn something on in
        the Capital Lens.
      </div>
    )
  }

  const color =
    r.fit >= 80 ? '#16a34a' : r.fit >= 50 ? '#ca8a04' : r.fit >= 25 ? '#ea580c' : '#dc2626'
  const whose = mode === 'example' ? 'the example lens' : 'your lens'
  // Backers of this maker that carry recorded associations — used to make the
  // flag explain *why* and link through to each funder.
  const repBackers: Funder[] = backersFor(maker.id)
    .map((b) => b.funder)
    .filter((f) => (f.notable_for ?? []).length > 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4"
          style={{ borderColor: color }}
        >
          <span className="text-lg font-extrabold leading-none" style={{ color }}>
            {r.fit}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-slate-400">fit</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {r.clearCount} of {r.activeCount} attributes in {whose} are clear
          </p>
          <p className="text-xs text-slate-500">
            {mode === 'example' ? (
              <>
                Counted against the <strong>ValueCompass example lens</strong>, not your stated
                priorities. Change a switch to make it yours.
              </>
            ) : (
              <>Counted against the attributes you chose. It moves when you change them.</>
            )}
          </p>
        </div>
      </div>

      {r.hits.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            Present in {maker.name}
          </p>
          <ul className="space-y-1.5">
            {r.hits.map((h) =>
              h.key === 'backer_reputation' && repBackers.length > 0 ? (
                <li
                  key={h.key}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
                >
                  <span className="font-semibold">{h.label}</span>
                  <p className="mt-0.5 text-[11px] italic leading-snug text-amber-700">
                    Who funds a maker can carry political, geopolitical or governance associations
                    that may shape its incentives. Whether they matter is your call.
                  </p>
                  <ul className="mt-1.5 space-y-2">
                    {repBackers.map((f) => (
                      <li key={f.name} className="leading-snug">
                        {onOpenFunder ? (
                          <button
                            type="button"
                            onClick={() => onOpenFunder(f.name)}
                            className="font-semibold text-amber-900 underline decoration-amber-400 underline-offset-2 hover:text-amber-700"
                            title={`Open ${f.name} for full details & sources`}
                          >
                            {f.name} ↗
                          </button>
                        ) : (
                          <span className="font-semibold">{f.name}</span>
                        )}
                        {associationsAreUnverified(f) && (
                          <span className="ml-1.5 rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            unverified
                          </span>
                        )}
                        <ul className="ml-3 mt-0.5 list-disc space-y-0.5 text-amber-800 marker:text-amber-400">
                          {reputationReasons(f).map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li
                  key={h.key}
                  className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
                >
                  <span className="font-semibold">{h.label}</span>
                  <span className="text-amber-700"> — {h.detail}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
          None of the attributes in {whose} are present in {maker.name}'s record.
        </p>
      )}

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
          Each tag reports an attribute from the maker's record. Calling it a concern is a judgement
          you make in the Capital Lens panel.
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
            <strong>{unverified} of {backers.length}</strong> carry no source yet and are marked
            unverified — treat those as leads for research, not as established fact.
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
                isUnverified ? 'border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
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
                      ? 'No source on record for these associations.'
                      : `${status?.source_count} source(s) on record for ${status?.claim_count} association(s).`
                  }
                >
                  {isUnverified ? 'Unverified' : 'Sourced'}
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
                  No source on record. Awaiting research — do not read as established fact.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
