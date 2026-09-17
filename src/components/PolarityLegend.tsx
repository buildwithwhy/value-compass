import { Link } from 'react-router-dom'

/**
 * Sits next to every radar. It has one job: say what the shape does and does
 * not mean, before anyone reads a wider polygon as a better company.
 */
export function PolarityLegend({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 ${className}`}
    >
      <p className="leading-snug">
        <span className="font-semibold">How to read this.</span> Each axis is a ValueCompass
        assessment scored 0–4 against a{' '}
        <Link to="/about" className="text-teal-700 underline underline-offset-2 hover:text-teal-900">
          published rubric
        </Link>
        , oriented so a higher number means more disclosure, more dispersed ownership, and stronger
        commitments to share value. A wider shape means{' '}
        <span className="font-semibold">higher scores on these five axes</span> — it is not an
        overall verdict on the company, and it says nothing about product quality.
      </p>
      <p className="mt-1 leading-snug text-slate-500">
        Gaps in the shape are axes where nothing has been published. They are missing, not zero.
      </p>
    </div>
  )
}
