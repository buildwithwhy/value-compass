import { NavLink, useLocation } from 'react-router-dom'
import { AXIS_KEYS } from '../lib/data'
import { anyCapitalPrioritised } from '../lib/priorities'
import { usePriorities } from '../lib/prioritiesContext'

const NAV = [
  { to: '/browse', label: 'Browse' },
  { to: '/compare', label: 'Compare' },
  { to: '/recommend', label: 'Recommend' },
  { to: '/switch', label: 'Switching' },
  { to: '/graph', label: 'Ownership' },
  { to: '/about', label: 'Methodology' },
]

/** Always visible, so it is never unclear whether something is being applied
 *  on the visitor's behalf — or whose selection it is. */
function PrioritiesChip() {
  const { priorities, chosen } = usePriorities()
  const { pathname } = useLocation()

  // The recommendation preview keeps its own selections and does not read
  // these. Showing them there implied unrelated defaults were driving the
  // results, so the chip stands down and points at where the settings live.
  if (pathname.startsWith('/recommend')) {
    // The page's own controls are right there; saying so was noise.
    return null
  }
  const axisCount = AXIS_KEYS.filter((k) => priorities.weights[k] > 0).length
  const capital = anyCapitalPrioritised(priorities.capital)

  if (!chosen) {
    return (
      <NavLink
        to="/priorities"
        className="rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
      >
        Set your priorities
      </NavLink>
    )
  }

  const parts = [
    axisCount > 0 ? `${axisCount} ${axisCount === 1 ? 'axis' : 'axes'}` : null,
    capital ? 'capital' : null,
  ].filter(Boolean)

  return (
    <NavLink
      to="/priorities"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
      title={
        priorities.mode === 'example'
          ? 'You are using the ValueCompass example priorities, not your own'
          : 'Your priorities'
      }
    >
      <span
        className={`h-2 w-2 rounded-full ${
          priorities.mode === 'example' ? 'bg-amber-500' : 'bg-teal-600'
        }`}
      />
      {priorities.mode === 'example' ? 'Example priorities' : 'Your priorities'}
      <span className="text-slate-400">· {parts.join(' + ')}</span>
    </NavLink>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <NavLink to="/" end className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <span aria-hidden>🧭</span>
          <span>
            Value <span className="text-teal-700">Compass</span>
          </span>
        </NavLink>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto">
          <PrioritiesChip />
        </div>
      </div>
    </header>
  )
}
