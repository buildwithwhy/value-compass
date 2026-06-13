import { AXIS_KEYS, AXIS_LABELS, numericScore } from '../lib/data'
import type { Maker } from '../lib/types'
import { ConfidenceBadge } from './ConfidenceBadge'

function ScoreDots({ score }: { score: number | null }) {
  if (score == null) {
    return <span className="text-xs font-medium text-slate-400">n/a (gap, not 0)</span>
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label={`score ${score} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < score ? 'bg-violet-600' : 'bg-slate-200'}`}
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

/** Per-axis list: score, confidence badge, plain-English note, source links. */
export function AxisDetail({ maker }: { maker: Maker }) {
  return (
    <ul className="space-y-3">
      {AXIS_KEYS.map((key) => {
        const axis = maker.axes[key]
        if (!axis) return null
        const score = numericScore(axis.score)
        return (
          <li key={key} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">{AXIS_LABELS[key]}</span>
              <span className="flex items-center gap-2">
                <ScoreDots score={score} />
                <ConfidenceBadge c={axis.confidence} />
              </span>
            </div>
            {axis.note && <p className="text-sm leading-snug text-slate-600">{axis.note}</p>}
            {axis.sources && axis.sources.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {axis.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
                  >
                    {hostname(src)} ↗
                  </a>
                ))}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
