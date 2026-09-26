import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  alternativeById,
  alternativesIn,
  answerLabel,
  assessmentFor,
  categories,
  comparisonLines,
  criteriaIn,
  criterionById,
  DEFAULT_CATEGORY,
  makerInDirectory,
  planAvailability,
  recommend,
  buildGuidance,
  type PilotAlternative,
  type PilotCriterion,
} from '../lib/recommend'
import { SectionTitle } from '../components/ui'

// ---------------------------------------------------------------------------
// Compare.
//
// Built on the recommendation engine, deliberately: the same findings, the
// same plan resolution, the same date and region rules. A second comparison
// dataset would drift from Recommend within a release, and the two pages
// would start disagreeing about the same product.
//
// What changed: this page used to draw radar shapes from five 0-4 axis
// scores. The rubric gives no rule for combining sub-indicators into those
// scores, so the shapes asserted differences the evidence could not support.
// ---------------------------------------------------------------------------

const MAX = 4

/**
 * Questions to open with when the visitor has not chosen any. Editorial, and
 * labelled as ours — not silently presented as their preferences, and never
 * treated as requirements.
 */
const EDITORIAL: Record<string, string[]> = {
  everyday_assistant: ['c_training_default', 'c_content_export', 'c_nonprofit_control'],
  app_builder: ['c_code_export', 'c_external_hosting', 'c_work_training_default'],
}

function ProductPicker({
  category,
  selected,
  onToggle,
}: {
  category: string
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {alternativesIn(category).map((a) => {
        const on = selected.includes(a.id)
        const full = !on && selected.length >= MAX
        return (
          <button
            key={a.id}
            type="button"
            disabled={full}
            onClick={() => onToggle(a.id)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              on
                ? 'border-teal-400 bg-teal-100 text-teal-900'
                : full
                  ? 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {a.product}
          </button>
        )
      })}
    </div>
  )
}

function PlanRow({
  alt,
  plan,
  onPlan,
}: {
  alt: PilotAlternative
  plan?: string
  onPlan: (p: string | undefined) => void
}) {
  if (!alt.plans?.length) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[{ id: '', label: 'Not sure' }, ...alt.plans].map((p) => {
        const on = (plan ?? '') === p.id
        return (
          <button
            key={p.id || 'unsure'}
            type="button"
            onClick={() => onPlan(p.id || undefined)}
            aria-pressed={on}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              on
                ? 'border-teal-400 bg-teal-100 text-teal-800'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

/** One question across the selected products. */
function QuestionRow({
  criterion,
  products,
  plans,
}: {
  criterion: PilotCriterion
  products: PilotAlternative[]
  plans: Record<string, string>
}) {
  return (
    <div className="border-t border-slate-100 py-3 first:border-0 first:pt-0">
      <p className="text-sm font-semibold text-slate-800">{criterion.label}</p>
      <div
        className="mt-2 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}
      >
        {products.map((p) => {
          const a = assessmentFor(p.id, criterion.id)
          const plan = plans[p.id]
          const perPlan = plan ? a?.by_plan?.[plan] : undefined
          const verdict = perPlan?.verdict ?? a?.verdict ?? 'unconfirmed'
          const label = answerLabel(p.id, criterion.id, verdict)
          const avail = planAvailability(p.id, criterion.id)
          const tone =
            verdict === 'meets'
              ? 'border-emerald-300 bg-emerald-50/50'
              : verdict === 'fails'
                ? 'border-rose-300 bg-rose-50/50'
                : 'border-slate-200 bg-slate-50'
          const labelTone =
            verdict === 'meets'
              ? 'text-emerald-800'
              : verdict === 'fails'
                ? 'text-rose-800'
                : 'text-slate-600'
          return (
            <div key={p.id} className={`rounded-md border p-2 ${tone}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide ${labelTone}`}>
                {label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-slate-700">
                {perPlan?.claim ?? a?.plain ?? a?.claim ?? 'Not confirmed.'}
              </p>
              {a?.condition && !perPlan && (
                <p className="mt-1 text-[11px] leading-snug text-amber-800">{a.condition}</p>
              )}
              {avail && !perPlan && avail.qualifying.length > 0 && (
                <p className="mt-1 text-[11px] leading-snug text-slate-600">
                  Yes on {avail.qualifying.map((x) => x.label).join(' or ')}
                  {avail.failing.length > 0 &&
                    `; no on ${avail.failing.map((x) => x.label).join(' or ')}`}
                  .
                </p>
              )}
              {a && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] text-slate-500 hover:text-slate-700">
                    Evidence
                  </summary>
                  <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-500">
                    <p className="text-slate-600">{a.claim}</p>
                    <p>
                      {a.source_url ? (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 underline underline-offset-2"
                        >
                          {a.source}
                        </a>
                      ) : (
                        a.source
                      )}
                      {a.source_date && ` · ${a.source_date}`}
                    </p>
                    {a.scope && <p>Scope: {a.scope}</p>}
                  </div>
                </details>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BehindIt({ alt }: { alt: PilotAlternative }) {
  const r = alt.relationships
  if (!r) return null
  return (
    <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2">
      <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
        Who is behind {alt.product}
      </summary>
      <div className="mt-1 space-y-1 text-[11px] leading-snug text-slate-600">
        <p>
          <span className="font-semibold">You pay:</span> {r.pays}
        </p>
        {r.owners?.length > 0 && (
          <p>
            <span className="font-semibold">Backers:</span> {r.owners.join('. ')}.
          </p>
        )}
        {r.suppliers?.length > 0 && (
          <p>
            <span className="font-semibold">Runs on:</span> {r.suppliers.join('. ')}.
          </p>
        )}
        {r.unknowns?.length > 0 && (
          <p className="text-slate-500">
            <span className="font-semibold">Not established:</span> {r.unknowns.join('; ')}.
          </p>
        )}
      </div>
    </details>
  )
}

export function CompareView() {
  const [params, setParams] = useSearchParams()

  const category =
    categories.find((c) => c.id === params.get('category'))?.id ?? DEFAULT_CATEGORY
  const fromParam = params.get('from') ?? undefined
  const picked = (params.get('products') ?? '')
    .split(',')
    .filter((id) => alternativeById.get(id)?.category === category)
  const chosenQuestions = (params.get('q') ?? '').split(',').filter(Boolean)

  const [plans, setPlans] = useState<Record<string, string>>({})

  const selected = picked.length > 0 ? picked.slice(0, MAX) : []
  const products = selected.map((id) => alternativeById.get(id)!).filter(Boolean)

  const usingEditorial = chosenQuestions.length === 0
  const questionIds = usingEditorial
    ? (EDITORIAL[category] ?? []).filter((id) => criterionById.get(id))
    : chosenQuestions
  const questions = questionIds
    .map((id) => criterionById.get(id))
    .filter((c): c is PilotCriterion => !!c && (c.categories ?? []).includes(category))

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const toggleProduct = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id].slice(0, MAX)
    setParam('products', next.join(','))
  }

  // Same engine as Recommend, so the two pages cannot disagree.
  const input = useMemo(
    () => ({
      category,
      functional: [] as string[],
      priorities: questions.map((q) => q.id),
      requirements: [] as string[],
      plans,
    }),
    [category, questions, plans],
  )
  const guidance = useMemo(() => buildGuidance(recommend(input), input), [input])

  // Comparison lines, narrowed to the products actually on screen.
  const lines = useMemo(() => {
    const scoped = guidance.separations.map((s) => ({
      ...s,
      aligned: s.aligned.filter((a) => selected.includes(a.id)),
      conflicting: s.conflicting.filter((a) => selected.includes(a.id)),
      unresolved: s.unresolved.filter((a) => selected.includes(a.id)),
      planRoutes: s.planRoutes.filter((r) => selected.includes(r.alternative.id)),
    }))
    return comparisonLines(scoped, products.length)
  }, [guidance, selected, products.length])

  const current = fromParam ? alternativeById.get(fromParam) : undefined

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Compare tools</h1>
      <p className="mt-1 max-w-3xl text-sm leading-snug text-slate-600">
        Pick two to four products and see how they answer the same questions.{' '}
        <Link to="/recommend" className="text-teal-700 underline underline-offset-2">
          Or start from what matters to you
        </Link>
      </p>

      {current && (
        <p className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          Comparing against <strong>{current.product}</strong>, the tool you use now. Choosing an
          alternative is not the same as moving to it — where a move is documented, the answers
          below say what carries over.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set('category', c.id)
              next.delete('products')
              setParams(next, { replace: true })
            }}
            aria-pressed={c.id === category}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              c.id === category
                ? 'border-teal-400 bg-teal-100 text-teal-900'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle>Choose up to {MAX}</SectionTitle>
        <ProductPicker category={category} selected={selected} onToggle={toggleProduct} />
      </section>

      {products.length < 2 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          Pick at least two products to compare.
        </p>
      ) : (
        <>
          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionTitle>How they compare</SectionTitle>
              {usingEditorial && (
                <span className="text-[11px] text-slate-500">
                  Our starting questions —{' '}
                  <Link to="/recommend" className="text-teal-700 hover:underline">
                    choose your own
                  </Link>
                </span>
              )}
            </div>
            <ul className="mt-1 space-y-1">
              {lines.map((l) => (
                <li key={l.criterion.id} className="text-sm leading-relaxed text-slate-700">
                  {l.line}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div
              className="grid gap-2 border-b border-slate-200 pb-3"
              style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}
            >
              {products.map((p) => (
                <div key={p.id}>
                  <p className="text-sm font-bold text-slate-900">
                    {p.product}
                    {current?.id === p.id && (
                      <span className="ml-1.5 rounded-full border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-800">
                        you use this
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {makerInDirectory(p.product_provider.maker_id) ? (
                      <Link
                        to={`/maker/${encodeURIComponent(p.product_provider.maker_id)}`}
                        className="text-teal-700 hover:underline"
                      >
                        {p.product_provider.maker_id}
                      </Link>
                    ) : (
                      p.product_provider.maker_id
                    )}
                  </p>
                  <PlanRow
                    alt={p}
                    plan={plans[p.id]}
                    onPlan={(v) =>
                      setPlans((prev) => {
                        const next = { ...prev }
                        if (v) next[p.id] = v
                        else delete next[p.id]
                        return next
                      })
                    }
                  />
                  <BehindIt alt={p} />
                </div>
              ))}
            </div>

            <div className="mt-3">
              {questions.map((q) => (
                <QuestionRow key={q.id} criterion={q} products={products} plans={plans} />
              ))}
            </div>
          </section>

          <p className="mt-3 text-xs leading-snug text-slate-500">
            Same findings and plan rules as{' '}
            <Link to="/recommend" className="text-teal-700 underline underline-offset-2">
              Find an AI tool
            </Link>
            . Questions with no answer here are ones we have not established — they are not marks
            against a product.{' '}
            {criteriaIn(category).length > questions.length && (
              <>
                <Link to="/recommend" className="text-teal-700 underline underline-offset-2">
                  Pick different questions
                </Link>
                .
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
