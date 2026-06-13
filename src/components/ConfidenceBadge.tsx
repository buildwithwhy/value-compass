import type { Confidence } from '../lib/types'

const STYLES: Record<Confidence, { cls: string; title: string }> = {
  A: {
    cls: 'bg-slate-800 text-white border-slate-800',
    title: 'A · strong / externally validated',
  },
  B: {
    cls: 'bg-slate-200 text-slate-800 border-slate-400 hatch-b text-opacity-90',
    title: 'B · moderate / some primary disclosure',
  },
  C: {
    cls: 'bg-transparent text-slate-500 border-dashed border-slate-400',
    title: 'C · thin / inferred / single-source',
  },
}

/**
 * Confidence badge. A = solid, B = medium/hatched, C = hollow/outlined+greyed,
 * matching the project's "never hide confidence" requirement.
 */
export function ConfidenceBadge({ c }: { c: Confidence }) {
  const s = STYLES[c]
  return (
    <span
      title={s.title}
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border px-1 text-[11px] font-bold leading-none ${s.cls}`}
    >
      {c}
      {c === 'C' && <span className="sr-only"> low confidence</span>}
    </span>
  )
}

export function ConfidenceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      <span className="font-semibold text-slate-700">Confidence:</span>
      {(['A', 'B', 'C'] as Confidence[]).map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5">
          <ConfidenceBadge c={c} />
          <span>{STYLES[c].title.replace(/^[ABC] · /, '')}</span>
        </span>
      ))}
    </div>
  )
}
