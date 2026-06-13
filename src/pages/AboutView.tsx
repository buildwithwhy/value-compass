import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { makersMeta, rubricMarkdown } from '../lib/data'
import { ConfidenceLegend } from '../components/ConfidenceBadge'
import { PolarityLegend } from '../components/PolarityLegend'

export function AboutView() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900">About / Methodology</h1>
      <p className="mt-1 text-sm text-slate-500">
        How the five axes are defined and scored. {makersMeta.title} ({makersMeta.version}).
      </p>

      {/* Quick reference: polarity, scale anchors, confidence */}
      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
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
        <ConfidenceLegend />
      </div>

      {/* Capital Lens — explain that it is separate from the scored axes */}
      <div className="mt-4 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-violet-800">
          🔍 The Capital Lens — your filter, not a sixth score
        </h2>
        <p className="mt-1.5 text-sm leading-snug text-violet-900">
          The five axes above measure <strong>conduct</strong>. <strong>Capital character</strong> —
          who the money comes from — is value-laden: “clean capital” depends on what you care about.
          So it is kept deliberately separate. Each maker carries a neutral, factual{' '}
          <code>capital_profile</code>; the Capital Lens lets you toggle which attributes (founder
          autocracy, sovereign/state capital, Big Tech &amp; competitor capital, circular vendor ties,
          backer reputation, index concentration) count as <em>your</em> concerns. A live “capital
          fit” shows how many of your concerns are present — labeled as your lens, never an objective
          rating. Backer reputation tags are stated as fact with sources, and remain a{' '}
          <strong>v1 first pass</strong> that needs dedicated research before any public launch.
        </p>
      </div>

      {/* Rendered rubric markdown */}
      <article className="prose-vc mt-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{rubricMarkdown}</ReactMarkdown>
      </article>
    </div>
  )
}
