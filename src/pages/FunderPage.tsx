import { Link, useParams } from 'react-router-dom'
import { getFunder } from '../lib/data'
import { FunderDetail } from '../components/FunderCard'
import { NotFoundPage } from './NotFoundPage'

/**
 * The shareable funder page. The funder detail surface used to exist only
 * inside Drawers (graph + maker pages); this route gives every funder in
 * funders.json a real URL — name, parent type, stakes with their evidence
 * chips, and backed makers as links to their maker pages.
 */
export function FunderPage() {
  const { slug } = useParams<{ slug: string }>()
  // Funder ids are the slug coordinate; names are display-only.
  const funder = getFunder(slug ? decodeURIComponent(slug) : undefined)

  if (!funder) {
    return (
      <NotFoundPage
        title="Funder not found"
        message={`No funder with id “${slug}” is recorded in the directory.`}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <Link to="/graph" className="mb-3 inline-block text-sm text-teal-700 hover:underline">
        ← Ownership graph
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{funder.name}</h1>
      <div className="mt-4">
        {/* No onOpenMaker: FunderDetail renders backed makers as real links. */}
        <FunderDetail funder={funder} />
      </div>
    </div>
  )
}
