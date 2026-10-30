import { Link } from 'react-router-dom'

/**
 * A real 404 for unknown routes — the old catch-all silently rendered the
 * home view. `title`/`message` let maker and funder pages name what was
 * not found instead of a generic page.
 */
export function NotFoundPage({
  title = 'Page not found',
  message,
}: {
  title?: string
  message?: string
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
      {message && <p className="mt-2 text-sm text-slate-600">{message}</p>}
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        The address may be mistyped, or the record may not exist in the directory.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          to="/"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Home
        </Link>
        <Link
          to="/browse"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Browse makers
        </Link>
        <Link
          to="/graph"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
        >
          Ownership graph
        </Link>
      </div>
    </div>
  )
}
