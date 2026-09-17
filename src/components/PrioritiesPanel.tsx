import { Link } from 'react-router-dom'
import { AXIS_KEYS, AXIS_LABELS } from '../lib/data'
import { coverageByAxis } from '../lib/evidence'
import { anyAxisPrioritised, AXIS_WEIGHT_LABELS, type AxisWeight } from '../lib/priorities'
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
          {cov.comparable === 0 ? (
            <span className="text-amber-700">
              No maker has an assessment firm enough to compare on this axis, so prioritising it
              will not separate anyone.
            </span>
          ) : (
            <>
              <strong className="text-slate-700">{cov.comparable}</strong> of {cov.total} makers have
              an assessment firm enough to compare here
              {cov.withheld > 0 && (
                <>
                  ; <strong className="text-slate-700">{cov.withheld}</strong> have published nothing
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
  const { priorities, chosen, useExample, clear } = usePriorities()
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

        {!axesSet && (
          <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50/60 p-3">
            <p className="text-xs leading-snug text-slate-600">
              No axis is selected. Say which of these you care about and the site will order and
              annotate itself around them — or start from our example and change it.
            </p>
            <button
              type="button"
              onClick={useExample}
              className="mt-2 rounded-md bg-teal-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Use the example priorities
            </button>
          </div>
        )}

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
          Only assessments firm enough to compare count toward an ordering. An axis we withheld, or
          one resting on a single thin source, contributes nothing — in either direction.{' '}
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
