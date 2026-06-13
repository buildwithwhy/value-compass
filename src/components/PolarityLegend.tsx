/**
 * Small persistent legend stating the polarity rule. Shown near every radar so
 * the chart is instantly readable: larger polygon = better-scoring actor.
 */
export function PolarityLegend({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 ${className}`}
    >
      <span aria-hidden className="mt-0.5 text-sm">
        🧭
      </span>
      <p className="leading-snug">
        <span className="font-semibold">All 5 axes: 0–4, higher = more pro-social.</span> A{' '}
        <span className="font-semibold">larger polygon</span> means a better-scoring actor (more
        transparent, better culture/ESG, more labour integrity, more dispersed ownership, more public
        wealth-sharing).
      </p>
    </div>
  )
}
