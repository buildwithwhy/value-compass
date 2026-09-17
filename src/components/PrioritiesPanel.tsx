import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AXIS_KEYS, AXIS_LABELS } from '../lib/data'
import { coverageByAxis } from '../lib/evidence'
import {
  anyAxisPrioritised,
  AXIS_WEIGHT_LABELS,
  EXAMPLE_WEIGHTS,
  type AxisWeight,
} from '../lib/priorities'
import { CONCERN_LEGEND, EXAMPLE_LENS } from '../lib/lens'
import { usePriorities } from '../lib/prioritiesContext'
import { CapitalLensPanel } from './CapitalLensPanel'

const AXIS_BLURB: Record<(typeof AXIS_KEYS)[number], string> = {
  transparency: 'How much is documented about how the system is built and run.',
  culture_esg: 'How the company treats its own people and the environment.',
  labour_integrity: 'How data workers, moderators and creators are treated and paid.',
  wealth_dispersion: 'How widely ownership and control are spread.',
  public_sharing: 'Binding commitments and access that share value with the public.',
}

const WEIGHTS: AxisWeight[] = [0, 1, 2]

function AxisRow({ axis }: { axis: (typeof AXIS_KEYS)[number] }) {
  const { priorities, setAxisWeight } = usePriorities()
  const current = priorities.weights[axis]
  const cov = coverageByAxis(axis)

  return (
    <div className="border-t border-slate-100 py-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800">{AXIS_LABELS[axis]}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{AXIS_BLURB[axis]}</p>
        </div>
        <div
          role="radiogroup"
          aria-label={`How much ${AXIS_LABELS[axis]} matters to you`}
          className="inline-flex shrink-0 overflow-hidden rounded-md border border-slate-300"
        >
          {WEIGHTS.map((w, i) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={current === w}
              onClick={() => setAxisWeight(axis, w)}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                i > 0 ? 'border-l border-slate-300' : ''
              } ${
                current === w
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {AXIS_WEIGHT_LABELS[w]}
            </button>
          ))}
        </div>
      </div>
      {current > 0 && (
        <p className="mt-1.5 text-xs leading-snug text-slate-500">
          {cov.eligible === 0 ? (
            <span className="text-amber-700">
              No maker has an assessment that passes our evidence rule on this axis, so
              prioritising it cannot separate anyone.
            </span>
          ) : (
            <>
              <strong className="text-slate-700">{cov.eligible}</strong> of {cov.total} makers have
              an assessment that passes our evidence rule here
              {cov.withheld > 0 && (
                <>
                  ; for <strong className="text-slate-700">{cov.withheld}</strong> we have
                  established nothing
                </>
              )}
              .
            </>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * Where a visitor says what matters. Nothing is pre-selected, and each axis
 * states up front how many makers it can actually separate — so a priority that
 * the evidence cannot answer is visibly a dead end before it is chosen, not
 * after.
 */
export function PrioritiesPanel({ compact = false }: { compact?: boolean }) {
  const { priorities, chosen, clear } = usePriorities()
  const { mode } = priorities
  // The banner describes the AXES specifically. A visitor arriving with only a
  // capital lens set has chosen nothing here yet, whatever the overall mode is.
  const axesSet = anyAxisPrioritised(priorities.weights)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">What matters to you</h3>
          {chosen && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-teal-700 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {!axesSet && <ExamplePreview />}

        {axesSet && mode === 'example' && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
            You are using the <strong>ValueCompass example priorities</strong> — one defensible
            reading of the rubric, not a statement of what you care about. Change anything to make it
            yours.
          </p>
        )}

        <div className={compact ? '' : 'sm:px-1'}>
          {AXIS_KEYS.map((axis) => (
            <AxisRow key={axis} axis={axis} />
          ))}
        </div>

        <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
          Only assessments that pass our evidence rule count toward an ordering: there has to be a
          source that covers the claim the score rests on. A confidence flag on its own is not
          enough, and an unsourced assessment contributes nothing — in either direction.{' '}
          <Link to="/about" className="text-teal-700 underline underline-offset-2">
            How this works
          </Link>
          .
        </p>
      </div>

      <div>
        <CapitalLensPanel compact={compact} />
        <p className="mt-1.5 px-1 text-xs leading-snug text-slate-500">
          Capital is kept separate and is never added to the scores above. A weighted conduct score
          and a count of capital attributes measure different things; blending them would hide which
          one was driving the answer.
        </p>
      </div>
    </div>
  )
}

/**
 * The example is opt-in and never applied sight-unseen: this shows exactly
 * which weights it would set, and makes the capital half a separate decision.
 * Asking for example axis weights must not silently switch on a capital lens
 * the visitor never looked at.
 */
function ExamplePreview() {
  const { applyExample } = usePriorities()
  const [open, setOpen] = useState(false)
  const [withCapital, setWithCapital] = useState(false)

  const capitalLabels = CONCERN_LEGEND.filter((_, i) => {
    const keys = Object.keys(EXAMPLE_LENS) as (keyof typeof EXAMPLE_LENS)[]
    // CONCERN_LEGEND order mirrors the six top-level attributes.
    const topLevel = [
      'founder_autocracy',
      'sovereign',
      'big_tech',
      'circular_vendor',
      'backer_reputation',
      'index_concentration',
    ] as const
    return keys.includes(topLevel[i]) && EXAMPLE_LENS[topLevel[i]]
  }).map((c) => c.label)

  return (
    <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50/60 p-3">
      <p className="text-xs leading-snug text-slate-600">
        No axis is selected. Say which of these you care about below — or preview our example set
        and apply it if you agree with it.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 rounded-md border border-teal-300 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
        >
          Preview the example priorities
        </button>
      ) : (
        <div className="mt-2 rounded-md border border-teal-200 bg-white p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            The example would set
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
            {AXIS_KEYS.map((axis) => (
              <li key={axis} className="flex justify-between gap-3">
                <span>{AXIS_LABELS[axis]}</span>
                <span
                  className={
                    EXAMPLE_WEIGHTS[axis] === 0 ? 'text-slate-400' : 'font-medium text-teal-800'
                  }
                >
                  {AXIS_WEIGHT_LABELS[EXAMPLE_WEIGHTS[axis]]}
                </span>
              </li>
            ))}
          </ul>

          <label className="mt-2.5 flex cursor-pointer items-start gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={withCapital}
              onChange={(e) => setWithCapital(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Also switch on the example <strong>capital attributes</strong>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                {capitalLabels.join(', ')}. Separate from the axes above, and off unless you ask
                for it.
              </span>
            </span>
          </label>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyExample({ axes: true, capital: withCapital })}
              className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Apply the example
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Applied settings stay labelled as the example until you change one. They are
            ValueCompass&apos;s starting point, not a statement of your priorities.
          </p>
        </div>
      )}
    </div>
  )
}
