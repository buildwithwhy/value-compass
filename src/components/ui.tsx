import type { ReactNode } from 'react'

export function Chip({
  children,
  active,
  onClick,
  title,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  title?: string
}) {
  const base =
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors'
  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        aria-pressed={active}
        className={`${base} ${
          active
            ? 'border-teal-400 bg-teal-100 text-teal-800'
            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        {children}
      </button>
    )
  }
  return (
    <span title={title} className={`${base} border-slate-200 bg-slate-100 text-slate-600`}>
      {children}
    </span>
  )
}

/** Factual tag (jurisdiction, vc_independent) — visually distinct from scores. */
export function Tag({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: 'slate' | 'amber' | 'sky'
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    sky: 'bg-sky-50 text-sky-800 border-sky-200',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs ${tones[tone]}`}
    >
      <span className="font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{children}</h3>
  )
}

export function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10"
      style={{ background: color }}
    />
  )
}
