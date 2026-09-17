import { NavLink } from 'react-router-dom'

const NAV = [
  { to: '/browse', label: 'Browse makers' },
  { to: '/compare', label: 'Compare' },
  { to: '/graph', label: 'Ownership graph' },
  { to: '/about', label: 'Methodology' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
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
                `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
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
        <p className="ml-auto hidden text-xs text-slate-500 md:block">
          See what your AI choices support
        </p>
      </div>
    </header>
  )
}
