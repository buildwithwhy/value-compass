import { useCapitalLens } from '../lib/prioritiesContext'
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
 * The Capital Lens. Every attribute starts switched off: a concern is only the
 * visitor's once they say so. The example lens is offered by name so the
 * interface never presents an editorial default as someone's own priorities.
 */
export function CapitalLensPanel({ compact = false }: { compact?: boolean }) {
  const { lens, mode, useExampleLens, clear } = useCapitalLens()
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-teal-900">
          🔍 Capital Lens
        </h3>
        {mode !== 'unset' && (
          <button
            type="button"
            onClick={clear}
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {mode === 'unset' && (
        <div className="mb-2 rounded-lg border border-teal-200 bg-white p-2.5">
          <p className="text-xs leading-snug text-slate-600">
            Nothing is switched on. Pick the capital attributes you want flagged — or start from our
            example lens and change it.
          </p>
          <button
            type="button"
            onClick={useExampleLens}
            className="mt-2 rounded-md bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Use the example lens
          </button>
        </div>
      )}

      {mode === 'example' && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
          You are using the <strong>ValueCompass example lens</strong> — an editorial starting point,
          not a statement of your priorities. Change any switch to make it yours.
        </p>
      )}

      {mode === 'custom' && (
        <p className="mb-2 text-xs leading-snug text-teal-800">
          <strong>Your lens.</strong> These are the attributes you asked to have flagged.
        </p>
      )}

      <p className="mb-2 text-xs leading-snug text-teal-700">
        The attributes themselves are facts from each maker's record. Which of them counts as a
        concern is a judgement — yours, not a score.
      </p>

      <div className={compact ? 'grid grid-cols-1 gap-0.5' : 'grid grid-cols-1 gap-0.5 sm:grid-cols-2'}>
        <Toggle k="founder_autocracy" label="Founder control" hint="a founder holds outright or super-voting control" />
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
          label="Backer associations"
          hint="funders whose key figures carry notable public associations"
        />
        <Toggle
          k="index_concentration"
          label="Index concentration"
          hint="passive universal-owner exposure"
        />
      </div>
    </div>
  )
}

/** Inline prompt shown wherever a capital-fit number would otherwise appear. */
export function LensNotChosen({ className = '' }: { className?: string }) {
  const { useExampleLens } = useCapitalLens()
  return (
    <div className={`rounded-lg border border-dashed border-teal-300 bg-teal-50/50 p-3 ${className}`}>
      <p className="text-sm font-semibold text-teal-900">No lens chosen yet</p>
      <p className="mt-1 text-xs leading-snug text-slate-600">
        Capital fit compares makers against the attributes <em>you</em> say matter. We have not
        chosen any for you, so there is nothing to score yet. The factual capital profile below is
        shown either way.
      </p>
      <button
        type="button"
        onClick={useExampleLens}
        className="mt-2 rounded-md bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800"
      >
        Use the example lens
      </button>
    </div>
  )
}
