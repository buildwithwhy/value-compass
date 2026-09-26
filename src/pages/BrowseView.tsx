import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import makersRaw from '../data/makers.json'
import {
  companiesWithSomethingToSay,
  factsByTheme,
  factsFor,
  gapsFor,
  productsFor,
  THEMES,
  type FactTheme,
} from '../lib/companyFacts'
import { SectionTitle } from '../components/ui'

// ---------------------------------------------------------------------------
// Explore companies.
//
// Replaces the score matrix. The five 0-4 axis scores are still in the data
// and still drive nothing: the rubric never defined how sub-indicators
// combine, so "3/4 versus 2/4" asserted a comparison the evidence could not
// carry. What is left is what was always underneath — sourced facts, with
// their scope and date, grouped by the question a reader is actually asking.
// ---------------------------------------------------------------------------

interface MakerRow {
  id: string
  name: string
  tier: string
  jurisdiction: string
  products_models: string[]
  lead_backers: string[]
  structure: string
}

const makers = (makersRaw as { makers: MakerRow[] }).makers

const THEME_ORDER: FactTheme[] = ['money', 'conduct', 'data']

function CompanyCard({ id }: { id: string }) {
  const m = makers.find((x) => x.id === id)!
  const byTheme = factsByTheme(id)
  const products = productsFor(id)
  const gaps = gapsFor(id)

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-bold text-slate-900">
          <Link to={`/maker/${encodeURIComponent(id)}`} className="hover:underline">
            {m.name}
          </Link>
        </h3>
        <span className="text-[11px] text-slate-500">{m.jurisdiction}</span>
      </div>

      <p className="mt-0.5 text-xs text-slate-600">
        Makes {m.products_models.slice(0, 3).join(', ')}
        {m.products_models.length > 3 && ` and more`}.
      </p>

      {products.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-700">
          On ValueCompass:{' '}
          {products.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ', '}
              <Link
                to={`/recommend/${p.category}`}
                className="text-teal-700 underline underline-offset-2"
              >
                {p.product}
              </Link>
            </span>
          ))}
        </p>
      )}

      {THEME_ORDER.map((t) =>
        byTheme[t].length === 0 ? null : (
          <div key={t} className="mt-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {THEMES[t].label}
            </p>
            <ul className="mt-1 space-y-1.5">
              {byTheme[t].map((f) => (
                <li key={f.topic + f.fact.slice(0, 20)} className="text-xs leading-relaxed text-slate-700">
                  {f.fact}
                  {f.scope && (
                    <span className="block text-[11px] leading-snug text-slate-500">{f.scope}</span>
                  )}
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {f.date && <>{f.date} · </>}
                    {f.sources.slice(0, 2).map((s, i) => (
                      <span key={s}>
                        {i > 0 && ' · '}
                        <a
                          href={s}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 underline underline-offset-2"
                        >
                          source
                        </a>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ),
      )}

      {gaps.length > 0 && (
        <p className="mt-2.5 text-[11px] leading-snug text-slate-500">
          Not researched yet: {gaps.join('; ')}.
        </p>
      )}
    </article>
  )
}

export function BrowseView() {
  const [q, setQ] = useState('')
  const [theme, setTheme] = useState<FactTheme | 'all'>('all')
  const [withProducts, setWithProducts] = useState(false)

  const ids = useMemo(() => {
    const term = q.trim().toLowerCase()
    return companiesWithSomethingToSay()
      .filter((id) => {
        const m = makers.find((x) => x.id === id)
        if (!m) return false
        if (withProducts && productsFor(id).length === 0) return false
        if (theme !== 'all' && factsByTheme(id)[theme].length === 0) return false
        if (!term) return true
        return (
          m.name.toLowerCase().includes(term) ||
          m.products_models.join(' ').toLowerCase().includes(term) ||
          m.lead_backers.join(' ').toLowerCase().includes(term) ||
          factsFor(id).some((f) => f.fact.toLowerCase().includes(term))
        )
      })
      .sort((a, b) => a.localeCompare(b))
  }, [q, theme, withProducts])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Explore companies</h1>
      <p className="mt-1 max-w-3xl text-sm leading-snug text-slate-600">
        Who operates the tools, who funds them, and what is on record about how they behave.
        Search by company, product, backer or a fact.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, products, backers…"
          className="w-full max-w-sm rounded-full border border-slate-300 px-3.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setWithProducts((v) => !v)}
          aria-pressed={withProducts}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            withProducts
              ? 'border-teal-400 bg-teal-100 text-teal-800'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Has a product we compare
        </button>
        {(['all', ...THEME_ORDER] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTheme(t)}
            aria-pressed={theme === t}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              theme === t
                ? 'border-teal-400 bg-teal-100 text-teal-800'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t === 'all' ? 'All topics' : THEMES[t].label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {ids.length} of {makers.length} companies
        {theme !== 'all' && <> with something recorded on {THEMES[theme].label.toLowerCase()}</>}.
      </p>

      <section className="mt-3">
        <SectionTitle>Companies</SectionTitle>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {ids.map((id) => (
            <CompanyCard key={id} id={id} />
          ))}
        </div>
        {ids.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nothing matches that. Try a company, a product or a backer.
          </p>
        )}
      </section>

      <p className="mt-4 text-xs leading-snug text-slate-500">
        We no longer publish the 0–4 axis scores. They were never combinable — the rubric defines
        sub-indicators but no rule for turning them into one number — so a chart comparing them
        asserted more than the evidence supports. The underlying findings are here, with their
        scope and sources.{' '}
        <Link to="/about" className="text-teal-700 underline underline-offset-2">
          How we decide what counts
        </Link>
      </p>
    </div>
  )
}
