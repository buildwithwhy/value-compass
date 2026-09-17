import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AXIS_LABELS, makers } from '../lib/data'
import { orderByPriorities, PLACEMENT_THRESHOLD, prioritiesLabel } from '../lib/priorities'
import { usePriorities } from '../lib/prioritiesContext'
import { PrioritiesPanel } from '../components/PrioritiesPanel'

export function PrioritiesView() {
  const { priorities, chosen } = usePriorities()
  const { placed, unplaced } = useMemo(
    () => orderByPriorities(makers, priorities),
    [priorities],
  )

  const stated = useMemo(
    () =>
      (Object.keys(priorities.weights) as (keyof typeof priorities.weights)[])
        .filter((k) => priorities.weights[k] > 0)
        .sort((a, b) => priorities.weights[b] - priorities.weights[a]),
    [priorities],
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Set your priorities</h1>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        Tell the site what you care about and it will order and annotate itself around that — on
        Browse, in comparisons, and when you look at what switching would change. Nothing is
        selected for you, and nothing here is a recommendation.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <PrioritiesPanel />

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-800">What this changes</h2>
            {!chosen ? (
              <p className="mt-2 text-sm leading-snug text-slate-600">
                Once you pick something, this panel shows how far the evidence gets you — how many
                of the {makers.length} makers can actually be placed against what you asked for, and
                how many cannot.
              </p>
            ) : (
              <>
                {stated.length === 0 && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
                    You have set capital attributes but no scored axes. Ordering will follow capital
                    fit alone, and none of the five axes will move anything. Pick at least one axis
                    to order by conduct.
                  </p>
                )}
                {stated.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {priorities.mode === 'example' ? 'The example sets' : 'You asked about'}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                      {stated.map((k) => (
                        <li key={k}>
                          {AXIS_LABELS[k]}
                          <span className="ml-1.5 text-xs text-slate-400">
                            {priorities.weights[k] === 2 ? 'matters a lot' : 'matters'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {stated.length > 0 && (
                  <>
                    <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <dt className="text-2xl font-extrabold text-slate-800">{placed.length}</dt>
                        <dd className="mt-0.5 text-xs leading-snug text-slate-600">
                          can be placed against {prioritiesLabel(priorities.mode)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-2xl font-extrabold text-slate-500">{unplaced.length}</dt>
                        <dd className="mt-0.5 text-xs leading-snug text-slate-600">
                          too little published to place
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
                      We place a maker when at least{' '}
                      {Math.round(PLACEMENT_THRESHOLD * 100)}% of the weight you assigned has
                      eligible evidence behind it. The rest are held apart rather than sorted to
                      the bottom — an unestablished record is not a bad result, and a list that
                      buried them would read as though it were.
                    </p>
                  </>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/browse"
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    See Browse in this order
                  </Link>
                  <Link
                    to="/compare"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Compare
                  </Link>
                </div>
              </>
            )}
          </div>

          {chosen && unplaced.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-bold text-slate-700">
                Too little established to place ({unplaced.length})
              </h2>
              <ul className="mt-2 space-y-1.5">
                {unplaced.map(({ maker, result }) => (
                  <li key={maker.id} className="text-sm">
                    <Link
                      to={`/maker/${encodeURIComponent(maker.id)}`}
                      className="font-medium text-slate-800 hover:text-teal-700 hover:underline"
                    >
                      {maker.name}
                    </Link>
                    <span className="ml-1.5 text-xs text-slate-500">
                      {result.evidenced.length} of {result.axes.length} of{' '}
                      {prioritiesLabel(priorities.mode)} have eligible evidence
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
