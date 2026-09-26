import { NavLink } from 'react-router-dom'

// Finding a tool is the journey; the rest supports it. Methodology and the
// ownership graph move to the footer rather than competing for the same row.
const NAV = [
  { to: '/recommend', label: 'Find an AI tool' },
  { to: '/compare', label: 'Compare tools' },
  { to: '/browse', label: 'Explore companies' },
]

/** Always visible, so it is never unclear whether something is being applied
 *  on the visitor's behalf — or whose selection it is. */
export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:gap-x-5 sm:py-3">
        <NavLink to="/" end className="flex items-center gap-2 text-base font-extrabold text-slate-900 sm:text-lg">
          <span aria-hidden>🧭</span>
          <span>
            Value <span className="text-teal-700">Compass</span>
          </span>
        </NavLink>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-2 py-1 text-[13px] font-medium transition-colors sm:px-2.5 sm:py-1.5 sm:text-sm ${
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
        </div>
      </div>
    </header>
  )
}
