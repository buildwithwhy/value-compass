import { Link, useNavigate, useParams } from 'react-router-dom'
import { getMaker, getMakerBySlug } from '../lib/data'
import { MakerDetail } from '../components/MakerDetail'
import { funderPath } from '../lib/routes'

export function MakerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // Canonical URLs carry the slug; ids (the pre-slug display-name routes) keep
  // resolving until the routing migration adds real redirects (D4).
  const ref = id ? decodeURIComponent(id) : undefined
  const maker = getMakerBySlug(ref) ?? getMaker(ref)

  if (!maker) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-slate-600">Maker “{id}” not found.</p>
        <Link to="/browse" className="text-teal-700 hover:underline">
          ← Back to browse
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <Link to="/browse" className="mb-3 inline-block text-sm text-teal-700 hover:underline">
        ← All makers
      </Link>
      {/* Funder references navigate to the funder's own page — the detail
          surface is URL-addressable here rather than drawer-bound. */}
      <MakerDetail maker={maker} onOpenFunder={(funderId) => navigate(funderPath(funderId))} />
    </div>
  )
}
