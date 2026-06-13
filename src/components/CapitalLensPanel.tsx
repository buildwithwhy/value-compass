import { useCapitalLens } from '../lib/lensContext'
import type { LensConfig } from '../lib/lens'

function Toggle({
  k,
  label,
  hint,
  indent,
}: {
  k: keyof LensConfig
  label: string
  hint?: string
  indent?: boolean
}) {
  const { lens, setKey } = useCapitalLens()
  const on = lens[k]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setKey(k, !on)}
      className={`flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-left hover:bg-white/70 ${
        indent ? 'ml-5' : ''
      }`}
    >
      {/* In-flow flex knob — cannot overflow onto the label */}
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          on ? 'bg-teal-700' : 'bg-slate-300'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="min-w-0 flex-1 text-sm leading-tight">
        <span className={`font-medium ${on ? 'text-slate-800' : 'text-slate-600'}`}>{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
    </button>
  )
}

/**
 * The Capital Lens toggle panel. Lets the user pick which capital attributes
 * count as concerns. State is global (shared across maker detail & compare).
 */
export function CapitalLensPanel({ compact = false }: { compact?: boolean }) {
  const { lens, reset, isDefault } = useCapitalLens()
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-teal-900">
          🔍 Your Capital Lens
        </h3>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Reset to default
          </button>
        )}
      </div>
      <p className="mb-2 text-xs leading-snug text-teal-700">
        Pick which capital attributes <em>you</em> count as concerns. This is a personal lens — not a
        score and not a sixth axis. It re-computes “capital fit” live.
      </p>
      <div className={compact ? 'grid grid-cols-1 gap-0.5' : 'grid grid-cols-1 gap-0.5 sm:grid-cols-2'}>
        <Toggle k="founder_autocracy" label="Founder autocracy" hint="founder voting control" />
        <Toggle
          k="big_tech"
          label="Big Tech / competitor capital"
          hint="hyperscaler backers & competitor entanglement"
        />
        <div>
          <Toggle k="sovereign" label="Sovereign / state capital" hint="state-linked funds" />
          {lens.sovereign && (
            <div className="mb-1">
              <Toggle k="sovereign_gulf" label="Gulf (UAE / Qatar / Saudi)" indent />
              <Toggle k="sovereign_singapore" label="Singapore (GIC / Temasek)" indent />
              <Toggle k="sovereign_china" label="China-linked" indent />
            </div>
          )}
        </div>
        <Toggle k="circular_vendor" label="Circular vendor ties" hint="chip backers it also buys from" />
        <Toggle
          k="backer_reputation"
          label="Backer reputation & figure stances"
          hint="funders with notable public associations"
        />
        <Toggle
          k="index_concentration"
          label="Index concentration"
          hint="passive universal-owner exposure (off by default)"
        />
      </div>
    </div>
  )
}
