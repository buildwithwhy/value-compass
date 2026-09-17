import type { EvidenceBasis } from '../lib/types'
import { BASIS } from '../lib/evidence'

// Evidence basis answers "what does this rest on?". It is deliberately separate
// from the A/B/C confidence flag, which answers "how sure are we?" — a thinly
// sourced claim and a claim with no source at all are different problems.

const TONE: Record<EvidenceBasis, string> = {
  sourced: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  unsourced: 'border-slate-300 bg-slate-50 text-slate-600',
  contextual: 'border-amber-300 bg-amber-50 text-amber-800',
  not_established: 'border-dashed border-slate-400 bg-white text-slate-500',
}

export function EvidenceBadge({
  basis,
  className = '',
}: {
  basis: EvidenceBasis
  className?: string
}) {
  const b = BASIS[basis]
  return (
    <span
      title={b.meaning}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none ${TONE[basis]} ${className}`}
    >
      {b.short}
    </span>
  )
}

export function EvidenceLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs ${className}`}>
      <span className="font-semibold text-slate-700">Evidence:</span>
      {(Object.keys(BASIS) as EvidenceBasis[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <EvidenceBadge basis={k} />
          <span className="text-slate-600">{BASIS[k].meaning}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * The four kinds of statement on this site. Shown on the landing page and the
 * methodology page so a first-time visitor knows what they are reading.
 */
export const STATEMENT_KINDS = [
  {
    key: 'fact',
    label: 'Sourced fact',
    body: 'Who owns what, who invested, what a company says about itself — each with a link to where it came from.',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  },
  {
    key: 'assessment',
    label: 'ValueCompass assessment',
    body: 'Our reading of those facts against a published rubric. A judgement, and labelled as one.',
    className: 'border-violet-300 bg-violet-50 text-violet-900',
  },
  {
    key: 'unknown',
    label: 'Not established',
    body: 'Our research has not established it. We say so and show no score — a gap in our record is not a finding about the company.',
    className: 'border-slate-300 bg-slate-50 text-slate-700',
  },
  {
    key: 'priority',
    label: 'Your priorities',
    body: 'What you tell us matters to you. Nothing is switched on for you by default.',
    className: 'border-teal-300 bg-teal-50 text-teal-900',
  },
] as const

export function StatementKinds({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {STATEMENT_KINDS.map((k) => (
        <div key={k.key} className={`rounded-lg border p-3 ${k.className}`}>
          <p className="text-sm font-bold">{k.label}</p>
          <p className="mt-1 text-xs leading-snug opacity-90">{k.body}</p>
        </div>
      ))}
    </div>
  )
}
