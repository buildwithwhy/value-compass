import { Link } from 'react-router-dom'
import { backersFor } from '../lib/data'
import { factsByTheme, factsFor, gapsFor, productsFor, THEMES } from '../lib/companyFacts'
import { TIER_COLORS, TIER_LABELS } from '../lib/colors'
import type { Maker } from '../lib/types'
import { FunderCard, isDeepPocket } from './FunderCard'
import { Chip, SectionTitle, Tag } from './ui'
import { BackerReputation, CapitalProfileCard } from './CapitalProfile'

export function MakerDetail({
  maker,
  onOpenFunder,
}: {
  maker: Maker
  onOpenFunder?: (name: string) => void
}) {
  const backers = backersFor(maker.id)
  // Deep-pocket strategics first.
  const sortedBackers = [...backers].sort(
    (a, b) => Number(isDeepPocket(b.funder)) - Number(isDeepPocket(a.funder)),
  )

  const facts = factsFor(maker.id)
  const byTheme = factsByTheme(maker.id)
  const gaps = gapsFor(maker.id)
  const products = productsFor(maker.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: TIER_COLORS[maker.tier] }}
          />
          <h2 className="text-2xl font-extrabold text-slate-900">{maker.name}</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {TIER_LABELS[maker.tier]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {maker.category && <Tag label="category" value={maker.category} tone="sky" />}
          <Tag label="jurisdiction" value={maker.jurisdiction} />
          <Tag label="ownership" value={maker.vc_independent} tone="amber" />
        </div>
        {maker.products_models.length > 0 && (
          <div className="mt-3">
            <SectionTitle>Products / models</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {maker.products_models.map((p) => (
                <Chip key={p}>{p}</Chip>
              ))}
            </div>
          </div>
        )}
        {maker.stated_values && (
          <p className="mt-3 text-sm leading-snug text-slate-700">
            <span className="font-semibold text-slate-500">Stated values: </span>
            {maker.stated_values}
          </p>
        )}
      </div>

      {/* Switching is a comparison with the current product named. */}
      {products.length > 0 && (
      <Link
        to={`/compare?category=${products[0].category}&from=${products[0].id}&products=${products[0].id}`}
        className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2.5 hover:bg-teal-50"
      >
        <span className="text-sm leading-snug text-teal-900">
          <span className="font-semibold">
            Considering a switch away from {products[0].product}?
          </span>{' '}
          <span className="text-teal-700">
            Compare it with the alternatives on the questions you care about. Choosing another
            tool is not the same as moving to it.
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-teal-700">
          →
        </span>
      </Link>
      )}

      {/* Tension hook — open question, not a verdict */}
      {maker.tension_hook && (
        <div className="rounded-lg border-l-4 border-violet-400 bg-violet-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-700">
            ValueCompass assessment — worth probing
          </p>
          <p className="mt-1 text-sm leading-snug text-violet-900">{maker.tension_hook}</p>
          <p className="mt-1 text-xs text-violet-600">
            An open question we think is worth asking — not a finding, and not a verdict.
          </p>
        </div>
      )}

      {/* What we know, by the question it answers.

          The radar and the axis-by-axis list were both driven by 0-4 scores
          the rubric never defined a way to combine. The facts underneath them
          are sound and are shown directly instead. */}
      <div>
        <SectionTitle>What we know</SectionTitle>
        {facts.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-xs leading-snug text-slate-600">
            We haven’t researched {maker.name} yet. What we hold on its funding and ownership is
            below.
          </p>
        ) : (
          <div className="space-y-3">
            {(['money', 'conduct', 'data'] as const).map((t) =>
              byTheme[t].length === 0 ? null : (
                <div key={t}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {THEMES[t].label}
                  </p>
                  <p className="text-[11px] text-slate-500">{THEMES[t].question}</p>
                  <ul className="mt-1.5 space-y-2">
                    {byTheme[t].map((f) => (
                      <li
                        key={f.topic + f.fact.slice(0, 24)}
                        className="rounded-md border border-slate-200 bg-white p-2.5"
                      >
                        {f.headline && (
                          <p className="text-sm font-semibold leading-snug text-slate-900">
                            {f.headline}
                          </p>
                        )}
                        <p className={`text-sm leading-snug text-slate-800 ${f.headline ? 'mt-1' : ''}`}>
                          {f.fact}
                        </p>
                        {f.matters && (
                          <p className="mt-1 text-[11px] leading-snug text-slate-600">
                            Why it might matter: {f.matters}
                          </p>
                        )}
                        {(f.limitation ?? f.scope) && (
                          <p className="mt-1 text-[11px] leading-snug text-amber-800">
                            {f.limitation ?? f.scope}
                          </p>
                        )}
                        {(f.date || f.period || f.sources.length > 0) && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {[
                              f.period ?? f.date,
                              f.measured ? 'published measurement' : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            {f.sources.length > 0 && (
                              <>
                                {(f.period ?? f.date ?? f.measured) && ' · '}
                                {f.sources.slice(0, 2).map((u, i) => (
                                  <span key={u}>
                                    {i > 0 && ' · '}
                                    <a
                                      href={u}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-teal-700 underline underline-offset-2"
                                    >
                                      source
                                    </a>
                                  </span>
                                ))}
                              </>
                            )}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
        {gaps.length > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-slate-500">
            Not researched yet: {gaps.join('; ')}. An absence here is a gap in our work, not a
            clean record.
          </p>
        )}
        {products.length > 0 && (
          <p className="mt-2 text-xs text-slate-700">
            Compare its products:{' '}
            {products.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <Link
                  to={`/compare?category=${p.category}&products=${p.id}`}
                  className="text-teal-700 underline underline-offset-2"
                >
                  {p.product}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>

      {/* The ownership graph only plots investors that back more than one
          company. Where it has no node for this maker, the Lead backers list
          below is the answer — heading the section "Investors we can trace (0)"
          stated the graph's scope as though it were a gap in what we know. */}
      {sortedBackers.length > 0 && (
        <div>
          <SectionTitle>Investors we can trace ({backers.length})</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sortedBackers.map(({ funder, ownsOutright }) => (
              <FunderCard
                key={funder.name}
                funder={funder}
                makerId={maker.id}
                ownsOutright={ownsOutright}
                onOpen={onOpenFunder}
              />
            ))}
          </div>
        </div>
      )}

      {/* Where the money comes from. The toggle-driven "capital lens" that
          used to sit here reported match counts and phrases like
          'recorded as "no", unsupported' — research bookkeeping, not
          something a reader can use. The facts it was built on are shown
          plainly instead. */}
      {maker.capital_profile && (
        <div>
          <SectionTitle>Where the money comes from</SectionTitle>
          <CapitalProfileCard maker={maker} />
          <div className="mt-3">
            <BackerReputation maker={maker} onOpenFunder={onOpenFunder} />
          </div>
        </div>
      )}

      {/* Own founders / lead_backers / structure */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {maker.founders.length > 0 && (
          <div>
            <SectionTitle>Founders</SectionTitle>
            <ul className="list-inside list-disc text-sm text-slate-700">
              {maker.founders.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {maker.lead_backers.length > 0 && (
          <div>
            <SectionTitle>Lead backers</SectionTitle>
            <ul className="list-inside list-disc text-sm text-slate-700">
              {maker.lead_backers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        {maker.structure && (
          <div>
            <SectionTitle>Structure</SectionTitle>
            <p className="text-sm text-slate-700">{maker.structure}</p>
          </div>
        )}
      </div>
    </div>
  )
}
