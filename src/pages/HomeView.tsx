import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { makers } from '../lib/data'
import { TIER_COLORS } from '../lib/colors'
import { alternativesIn, categories, DEFAULT_CATEGORY } from '../lib/recommend'

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

      {/* What you can find out — real findings from the research, each
          labelled with its scope. Nothing here is invented for display. */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">What you can find out</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Examples from what we have researched, with the limits that come with them.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              What happens to your work
            </p>
            <p className="mt-1.5 text-sm leading-snug text-slate-800">
              On Lovable, Business and Enterprise keep your content out of model training by
              default. On Free and Pro it is used unless you turn it off.
            </p>
            <Link
              to="/recommend/app_builder"
              className="mt-2 inline-block text-xs text-teal-700 underline underline-offset-2"
            >
              Compare app builders
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Who owns and controls it
            </p>
            <p className="mt-1.5 text-sm leading-snug text-slate-800">
              Anthropic’s Long-Term Benefit Trust has appointed a majority of the board since
              April 2026 — and holds stock carrying no economic rights.
            </p>
            <Link
              to="/maker/Anthropic"
              className="mt-2 inline-block text-xs text-teal-700 underline underline-offset-2"
            >
              Read the profile
            </Link>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              How people have been treated
            </p>
            <p className="mt-1.5 text-sm leading-snug text-slate-800">
              OpenAI paid Sama about $12.50 an hour per worker to label violent content in Kenya.
              TIME reported the labellers earned roughly $1.32 to $2; Sama disputes the figures.
            </p>
            <Link
              to="/maker/OpenAI"
              className="mt-2 inline-block text-xs text-teal-700 underline underline-offset-2"
            >
              Read the profile
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-900">How to read what we publish</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Every finding names its source and the scope it covers. Where the answer depends on your
          plan, your region or a policy that has not started yet, we say which — and where we have
          not researched something, we say that rather than treat it as a mark against a product.
          We compare documented policies and relationships, not how well a tool works.{' '}
          <Link to="/about" className="text-teal-700 underline underline-offset-2">
            How we decide what counts
          </Link>
        </p>
      </section>

    </div>
  )
}
