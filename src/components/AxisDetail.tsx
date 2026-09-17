import { AXIS_KEYS, AXIS_LABELS } from '../lib/data'
import { BASIS, displayScore } from '../lib/evidence'
import type { Maker } from '../lib/types'
import { ConfidenceBadge } from './ConfidenceBadge'
import { EvidenceBadge } from './EvidenceBadge'

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`score ${score} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < score ? 'bg-teal-700' : 'bg-slate-200'}`}
        />
      ))}
      <span className="ml-1 text-xs font-bold text-slate-700">{score}/4</span>
    </span>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SourceLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
    >
      {hostname(href)} ↗
    </a>
  )
}

/**
 * Per-axis breakdown: what we are showing, what it rests on, and the sources —
 * with the sources that are about this maker kept apart from the ones that are
 * sector background.
 */
export function AxisDetail({ maker }: { maker: Maker }) {
  return (
    <ul className="space-y-3">
      {AXIS_KEYS.map((key) => {
        const axis = maker.axes[key]
        if (!axis) return null
        const d = displayScore(maker, key)
        const ev = d.evidence
        return (
          <li key={key} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">{AXIS_LABELS[key]}</span>
              <span className="flex flex-wrap items-center gap-2">
                {d.value != null ? (
                  <ScoreDots score={d.value} />
                ) : (
                  <span className="text-xs font-semibold text-slate-500">No score shown</span>
                )}
                <EvidenceBadge basis={d.basis} />
                {d.value != null && <ConfidenceBadge c={axis.confidence} />}
              </span>
            </div>

            {d.withheld ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <p className="text-sm leading-snug text-slate-700">
                  Not established in our current research. We have no finding for {maker.name} on
                  this axis, so no score is shown. This is a gap in our record — we have not
                  established the scope or date of any non-disclosure, and it is not evidence of
                  poor practice.
                </p>
                <p className="mt-1.5 text-xs leading-snug text-slate-500">
                  What the record says: “{axis.note}”
                </p>
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                    Earlier recorded assessment (held for review)
                  </summary>
                  <p className="mt-1 text-xs text-slate-500">
                    {maker.name} was recorded at{' '}
                    <span className="font-semibold text-slate-700">
                      {d.recorded == null ? 'n/a' : `${d.recorded}/4`}
                    </span>{' '}
                    with confidence {axis.confidence}. That value is kept in the dataset and is
                    awaiting editorial research; it does not feed the compass, the matrix or any
                    comparison.
                  </p>
                </details>
              </div>
            ) : (
              <>
                {axis.note && <p className="text-sm leading-snug text-slate-600">{axis.note}</p>}
                <p className="mt-1.5 text-xs leading-snug text-slate-500">{BASIS[d.basis].meaning}</p>
                {ev.supported_fact && (
                  <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      {d.eligible ? 'Established fact behind this score' : 'Established fact, narrower than this score'}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-emerald-900">
                      {ev.supported_fact}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-emerald-800">
                      Source date: {ev.source_date}.
                    </p>
                  </div>
                )}
                {!d.eligible && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                      Why this score cannot decide anything
                    </summary>
                    <div className="mt-1 space-y-1 text-xs leading-snug text-slate-600">
                      <p>{ev.justification_note}</p>
                      <p>
                        <span className="font-semibold text-slate-700">Applicable rule:</span>{' '}
                        {ev.scoring_rule}
                      </p>
                      {ev.unsupported_clauses.length > 0 && (
                        <div>
                          <p className="font-semibold text-slate-700">Not carried by the source:</p>
                          <ul className="ml-4 list-disc">
                            {ev.unsupported_clauses.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <p className="text-slate-400">
                        Review provenance:{' '}
                        {ev.provenance === 'human_reviewed'
                          ? 'human-reviewed'
                          : 'automated, provisional — not human-reviewed'}
                        .
                      </p>
                    </div>
                  </details>
                )}
                {ev.context_used.length > 0 && (
                  <p className="mt-1 text-xs leading-snug text-amber-700">
                    Reasoned from {ev.context_used.join(' and ')} — not from evidence about{' '}
                    {maker.name}.
                  </p>
                )}
              </>
            )}

            {ev.entity_sources.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sources about {maker.name}
                </p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {ev.entity_sources.map((src) => (
                    <SourceLink key={src} href={src} />
                  ))}
                </div>
              </div>
            )}

            {ev.background_sources.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
                  Background reading ({ev.background_sources.length}) — not about {maker.name}
                </summary>
                <ul className="mt-1 space-y-1">
                  {ev.background_sources.map((b) => (
                    <li key={b.url} className="text-xs leading-snug text-slate-500">
                      <SourceLink href={b.url} />
                      <span className="ml-1.5">{b.why}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        )
      })}
    </ul>
  )
}
