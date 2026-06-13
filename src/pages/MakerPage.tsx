import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getFunder, getMaker } from '../lib/data'
import { MakerDetail } from '../components/MakerDetail'
import { Drawer } from '../components/Drawer'
import { FunderDetail } from '../components/FunderCard'

export function MakerPage() {
  const { id } = useParams<{ id: string }>()
  const maker = getMaker(id ? decodeURIComponent(id) : undefined)
  const [funderName, setFunderName] = useState<string | null>(null)
  const funder = getFunder(funderName ?? undefined)

  if (!maker) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-slate-600">Maker “{id}” not found.</p>
        <Link to="/browse" className="text-violet-700 hover:underline">
          ← Back to browse
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <Link to="/browse" className="mb-3 inline-block text-sm text-violet-700 hover:underline">
        ← All makers
      </Link>
      <MakerDetail maker={maker} onOpenFunder={setFunderName} />

      <Drawer
        open={funder != null}
        onClose={() => setFunderName(null)}
        title={<span className="text-lg font-bold text-slate-900">{funder?.name}</span>}
      >
        {funder && <FunderDetail funder={funder} onOpenMaker={() => setFunderName(null)} />}
      </Drawer>
    </div>
  )
}
