import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getMaker, getMakerBySlug } from '../lib/data'
import { MakerDetail } from '../components/MakerDetail'
import { funderPath } from '../lib/routes'
import { NotFoundPage } from './NotFoundPage'

export function MakerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ref = id ? decodeURIComponent(id) : undefined
  // Canonical URLs carry the slug. A legacy display-name id (`/maker/Anthropic`)
  // redirects to its slug so old links converge on one address; anything else
  // is a real 404, not the homepage.
  const maker = getMakerBySlug(ref)
  if (!maker) {
    const legacy = getMaker(ref)
    if (legacy) return <Navigate to={`/maker/${legacy.slug}`} replace />
    return (
      <NotFoundPage
        title="Maker not found"
        message={`No maker “${id}” is recorded in the directory.`}
      />
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
