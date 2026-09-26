import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { makers, makersMeta } from '../lib/data'
import { coverageFor, evidenceSummary } from '../lib/evidence'
import { TIER_COLORS } from '../lib/colors'
import { StatementKinds } from '../components/EvidenceBadge'
import { alternativesIn, categories, DEFAULT_CATEGORY } from '../lib/recommend'

const FRESHNESS = (makersMeta as unknown as { last_freshness_review?: string })
  .last_freshness_review

/** Quick jump to a maker — the shortest path from "I use this tool" to its page. */
function MakerFinder() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return makers
      .filter((m) =>
        `${m.name} ${m.category ?? ''} ${m.products_models.join(' ')}`.toLowerCase().includes(query),
      )
      .slice(0, 6)
  }, [q])

  return (
    <div>
      <label htmlFor="home-find" className="text-sm font-semibold text-slate-700">
        Find an AI tool or the company behind it
      </label>
      <input
        id="home-find"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) navigate(`/maker/${encodeURIComponent(matches[0].id)}`)
        }}
        placeholder="Claude, ChatGPT, Cursor, Canva…"
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500"
      />
      {q.trim() && (
        <ul className="mt-2 space-y-1">
          {matches.length === 0 ? (
            <li className="text-sm text-slate-500">
              Nothing matching “{q.trim()}” in the current set of {makers.length} makers.{' '}
              <Link to="/browse" className="text-teal-700 underline underline-offset-2">
                Browse them all
              </Link>
              .
            </li>
          ) : (
            matches.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/maker/${encodeURIComponent(m.id)}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: TIER_COLORS[m.tier] }}
                  />
                  <span className="font-medium text-slate-800">{m.name}</span>
                  <span className="truncate text-xs text-slate-500">
                    {m.category ?? m.products_models[0]}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function RouteCard({
  to,
  title,
  body,
  cta,
}: {
  to: string
  title: string
  body: string
  cta: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <h3 className="font-bold text-slate-900 group-hover:text-teal-700">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-snug text-slate-600">{body}</p>
      <span className="mt-3 text-sm font-semibold text-teal-700">{cta} →</span>
    </Link>
  )
}

export function HomeView() {
  const cov = useMemo(() => coverageFor(), [])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      {/* Introduction */}
      <section className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          Find AI tools that fit your values.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
          Pick a kind of tool, say what matters to you, and see what the evidence actually
          supports — who owns each product, what happens to your data and work, and what you
          would have to do about it.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to="/recommend"
            className="rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Find an AI tool
          </Link>
          <Link
            to="/compare"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Compare tools
          </Link>
          <Link
            to="/browse"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Explore companies
          </Link>
        </div>
      </section>

      {/* The categories, so the journey starts on the homepage itself. */}
      <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <RouteCard
            key={c.id}
            to={c.id === DEFAULT_CATEGORY ? '/recommend' : `/recommend/${c.id}`}
            title={c.label}
            body={`${alternativesIn(c.id).length} researched, most recently on ${c.researched_on}. ${c.definition}`}
            cta="See the options"
          />
        ))}
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <MakerFinder />
      </section>

      <section className="mt-4 rounded-xl border border-teal-200 bg-teal-50/60 p-4 sm:p-5">
        <h2 className="text-lg font-bold text-teal-900">Already using something?</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-700">
          Put your current tool alongside the alternatives and see what actually changes on the
          questions you care about. Choosing something else is not the same as moving to it — the
          comparison says which moves are documented and which are not.
        </p>
        <Link
          to="/compare"
          className="mt-3 inline-block rounded-md bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Considering a switch?
        </Link>
      </section>

      {/* What you are reading */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">What you are reading</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          A site like this is only useful if you can tell a fact from an opinion from a gap. Every
          claim here is one of four things, and it is always labelled.
        </p>
        <StatementKinds className="mt-4" />
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          The one we care about most is the third.{' '}
          <strong className="text-slate-800">
            “We looked and it is bad” and “nobody will say” are different findings.
          </strong>{' '}
          Where a company simply has not published something, we show no score rather than a low one
          — undisclosed is not evidence of bad practice.{' '}
          <Link to="/about" className="text-teal-700 underline underline-offset-2">
            Read the full methodology
          </Link>
          .
        </p>
      </section>

      {/* Honest coverage */}
      <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          How complete this is today
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { n: cov.sourced, label: 'carry a source about the maker', tone: 'text-emerald-700' },
            { n: cov.unsourced, label: 'have no source attached yet', tone: 'text-slate-700' },
            { n: cov.contextual, label: 'reason from context', tone: 'text-amber-700' },
            { n: cov.notEstablished, label: 'show no score — not established in our research', tone: 'text-slate-500' },
          ].map((s) => (
            <div key={s.label}>
              <dt className={`text-2xl font-extrabold ${s.tone}`}>{s.n}</dt>
              <dd className="mt-0.5 text-xs leading-snug text-slate-600">{s.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
          Out of {cov.total} axis assessments across {makers.length} makers. These counts are
          generated from the dataset, not asserted — and they are not where we want them yet. Gaps
          are shown on the pages they affect rather than summarised away.{' '}
          {evidenceSummary.funders_with_unverified_associations} of{' '}
          {evidenceSummary.funders_with_associations} funders with recorded associations carry no
          source for them, and are marked unverified.
          {FRESHNESS && (
            <>
              {' '}
              Last freshness review: {FRESHNESS.split(':')[0]}.
            </>
          )}
        </p>
      </section>

      <p className="mt-8 text-sm text-slate-500">
        Value Compass is an independent public-interest project. It does not rank products by
        quality, and it does not tell you what to use.
      </p>
    </div>
  )
}
