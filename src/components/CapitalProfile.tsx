import type { ReactNode } from 'react'
import { backersFor } from '../lib/data'
import {
  CONCERN_LEGEND,
  evaluateMaker,
  INDEPENDENCE_LABELS,
  reputationGist,
  type LensResult,
} from '../lib/lens'
import { useCapitalLens } from '../lib/lensContext'
import type { Funder, Maker } from '../lib/types'
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
          {cp.founder_control ? cp.founder_control : <span className="text-slate-500">None</span>}
        </Fact>
        <Fact label="Competitor entanglement">{yesNo(cp.competitor_entanglement)}</Fact>
        <Fact label="Sovereign / state capital">
          {cp.sovereign_state.length ? cp.sovereign_state.join('; ') : <span className="text-slate-500">None</span>}
        </Fact>
        <Fact label="Big Tech capital">
          {cp.big_tech_capital.length ? cp.big_tech_capital.join(', ') : <span className="text-slate-500">None</span>}
        </Fact>
        <Fact label="Circular vendor">
          {cp.circular_vendor.length ? cp.circular_vendor.join(', ') : <span className="text-slate-500">None</span>}
        </Fact>
        <Fact label="Held by index funds">{yesNo(cp.index_held)}</Fact>
      </dl>
      <p className="mt-3 text-xs italic text-slate-400">
        Objective capital attributes. Whether any of these is a “concern” is your call via the Capital
        Lens — it is not scored.
      </p>
    </div>
  )
}

/** Fit gauge + triggered concerns, always labeled "your capital lens". */
export function CapitalFitBadge({
  maker,
  result,
  onOpenFunder,
}: {
  maker: Maker
  result?: LensResult
  onOpenFunder?: (name: string) => void
}) {
  const { lens } = useCapitalLens()
  const r = result ?? evaluateMaker(maker, lens)
  const color =
    r.fit >= 80 ? '#16a34a' : r.fit >= 50 ? '#ca8a04' : r.fit >= 25 ? '#ea580c' : '#dc2626'
  // Backers (of this maker) that carry reputation associations — used to make
  // the "backer reputation" flag explain *why* and link to each funder.
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
            Capital fit: {r.clearCount}/{r.activeCount} of your selected concerns are clear
          </p>
          <p className="text-xs text-slate-500">
            “Your capital lens” — higher = fewer of <em>your</em> concerns present. Lens-dependent, not
            an objective rating.
          </p>
        </div>
      </div>

      {r.hits.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
            Flagged under your lens
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
                    Why this is here: who funds a maker can carry political, geopolitical or
                    governance associations that may shape its incentives — you decide whether they
                    matter.
                  </p>
                  <ul className="mt-1.5 space-y-1">
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
                        <span className="text-amber-700"> — {reputationGist(f)}</span>
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
          No concerns flagged under your current lens.
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
          You choose which of these count as concerns in the Capital Lens panel. Backer reputation
          tags are factual associations (v1), not judgments.
        </p>
      </details>
    </div>
  )
}

/** Backer reputation — neutral factual associations, sources, v1 caveat. */
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

  return (
    <div>
      <SectionTitle>Backer reputation (v1)</SectionTitle>
      <p className="mb-2 text-xs italic text-slate-400">
        Factual public associations of backers’ key figures — stated as fact, neutral (no good/bad
        valence). v1 first pass; needs dedicated sourced research before any public launch.
      </p>
      <div className="space-y-2">
        {backers.map((f) => (
          <div key={f.name} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-1 font-semibold text-slate-800">
              {onOpenFunder ? (
                <button
                  type="button"
                  onClick={() => onOpenFunder(f.name)}
                  className="text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-900"
                  title={`Open ${f.name}`}
                >
                  {f.name} ↗
                </button>
              ) : (
                f.name
              )}
            </div>
            <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-600">
              {(f.notable_for ?? []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
            {f.reputation_sources && f.reputation_sources.length > 0 && (
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
            )}
            <p className="mt-1 text-[11px] italic text-slate-400">
              v1 — factual association, not a judgment.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
