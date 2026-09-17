import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { makers, makersMeta, methodologyMarkdown, rubricMarkdown } from '../lib/data'
import { coverageFor, evidenceMeta, evidenceSummary } from '../lib/evidence'
import { ConfidenceLegend } from '../components/ConfidenceBadge'
import { EvidenceLegend, StatementKinds } from '../components/EvidenceBadge'
import { PolarityLegend } from '../components/PolarityLegend'

function CoverageTable() {
  const cov = useMemo(() => coverageFor(), [])
  const rows = [
    { label: 'Carry a source about the maker they describe', n: cov.sourced },
    { label: 'Rest on something on record, but no source is attached yet', n: cov.unsourced },
    { label: 'Reason from jurisdiction, size or what the product is built on', n: cov.contextual },
    { label: 'Not established in our current research — no score shown', n: cov.notEstablished },
  ]
  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 pr-3 text-slate-600">{r.label}</td>
              <td className="py-1.5 text-right font-bold text-slate-800">{r.n}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-200">
            <td className="py-1.5 pr-3 font-semibold text-slate-700">
              Total axis assessments ({makers.length} makers × 5 axes)
            </td>
            <td className="py-1.5 text-right font-extrabold text-slate-900">{cov.total}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs leading-snug text-slate-500">
        Of these, <strong className="text-slate-700">{cov.eligible}</strong> pass the evidence rule
        and may take part in an ordering, a comparison marker or a switching difference. {evidenceSummary.background_only} cite only background
        reading that is not about the maker in question.
      </p>
    </div>
  )
}

/**
 * The published methodology. `draft` swaps in the original internal design
 * document, which is kept for the record on its own clearly-labelled route —
 * it was written for sign-off, not for readers, and is not what the site does.
 */
export function AboutView({ draft = false }: { draft?: boolean }) {
  if (draft) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link to="/about" className="text-sm text-teal-700 hover:underline">
          ← Methodology
        </Link>
        <div className="mt-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4">
          <h1 className="text-lg font-extrabold text-amber-900">
            Internal working draft — not the published methodology
          </h1>
          <p className="mt-1.5 text-sm leading-snug text-amber-800">
            This is the original design document that the scoring rubric was worked out in. It is
            addressed to the project's author, contains open questions that were later settled, and
            proposes options that were not taken. It is kept here unedited so the reasoning behind
            the rubric stays inspectable — but{' '}
            <Link to="/about" className="font-semibold underline underline-offset-2">
              the methodology page
            </Link>{' '}
            is what the site actually does.
          </p>
        </div>
        <article className="prose-vc mt-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{rubricMarkdown}</ReactMarkdown>
        </article>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Methodology</h1>
      <p className="mt-1 text-sm text-slate-500">
        {makersMeta.title} ({makersMeta.version}) — what we measure, how it is scored, and what
        happens when the evidence runs out.
      </p>

      {/* The four kinds of statement, up front */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">
          Four kinds of statement
        </h2>
        <StatementKinds />
      </div>

      {/* Quick reference */}
      <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <PolarityLegend />
        <div>
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            Scale (0–4 anchors)
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {Object.entries(makersMeta.scale).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="font-bold text-slate-700">{k}</dt>
                <dd className="text-slate-600">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <EvidenceLegend />
        <ConfidenceLegend />
      </div>

      {/* The two rules that follow from the evidence layer */}
      <div className="mt-4 space-y-2 rounded-xl border border-slate-300 bg-slate-50 p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
          Two rules we hold ourselves to
        </h2>
        <p className="text-sm leading-snug text-slate-700">
          <strong>Withholding.</strong> {evidenceMeta.display_rule}
        </p>
        <p className="text-sm leading-snug text-slate-700">
          <strong>Deciding.</strong> {evidenceMeta.eligibility_rule}
        </p>
      </div>

      {/* Coverage, generated from the dataset */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
          Evidence coverage today
        </h2>
        <p className="mb-3 mt-1 text-xs leading-snug text-slate-500">
          Generated from the dataset each time it is rebuilt, not written by hand.
        </p>
        <CoverageTable />
      </div>

      {/* Full methodology */}
      <article className="prose-vc mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{methodologyMarkdown}</ReactMarkdown>
      </article>

      <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-bold text-slate-700">Where the rubric came from</h2>
        <p className="mt-1 text-sm leading-snug text-slate-600">
          The five axes were worked out in an internal design document before any evidence was
          gathered. It is kept unedited, and marked as a working draft rather than as methodology.
        </p>
        <Link
          to="/about/working-draft"
          className="mt-2 inline-block text-sm font-semibold text-teal-700 hover:underline"
        >
          Read the original working draft →
        </Link>
      </div>
    </div>
  )
}
