import { Link } from 'react-router-dom'
import type { Advice, AdviceOption, PilotCriterion } from '../lib/recommend'
import { makerInDirectory } from '../lib/recommend'
import { findingsForInterest, interestById } from '../lib/companyFacts'

// ---------------------------------------------------------------------------
// The recommendation.
//
// One section leads: what to look at, why, what it costs you, what to do next.
// Everything else is arranged beneath it by how much it asks of the reader —
// a stated compromise, then an open question, then the rest of the catalogue.
//
// Labels for uncertainty are neutral on purpose. "Needs checking" is a
// statement about our research; "weaker" would be a statement about the
// product, and we have no evidence for that.
// ---------------------------------------------------------------------------

function productLink(o: AdviceOption) {
  const id = o.alternative.product_provider.maker_id
  return makerInDirectory(id) ? (
    <Link
      to={`/maker/${encodeURIComponent(id)}`}
      className="text-xs text-teal-700 underline underline-offset-2"
    >
      Who is behind it
    </Link>
  ) : null
}

/** "both preferences" not "2/2 criteria". */
function critList(cs: PilotCriterion[]): string {
  const names = cs.map((c) => c.short ?? c.label.toLowerCase())
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function OptionRow({
  o,
  tone,
  interests,
}: {
  o: AdviceOption
  tone: 'lead' | 'compromise' | 'unconfirmed' | 'plain'
  interests: string[]
}) {
  const border =
    tone === 'lead'
      ? 'border-teal-300 bg-teal-50/40'
      : tone === 'compromise'
        ? 'border-amber-200 bg-white'
        : 'border-slate-200 bg-white'

  return (
    <div className={`rounded-xl border p-3.5 ${border}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-bold text-slate-900">
          {o.alternative.product}
          {o.chosenPlan && (
            <span className="ml-1.5 text-xs font-medium text-slate-500">
              on {o.chosenPlan.label}
            </span>
          )}
        </h4>
        {productLink(o)}
      </div>

      {o.meetsOn.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-teal-900">
          Yes to {critList(o.meetsOn)}.
        </p>
      )}
      {o.failsOn.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          No to {critList(o.failsOn)}.
        </p>
      )}
      {o.unknownOn.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          We haven’t confirmed {critList(o.unknownOn)}.
        </p>
      )}

      {/* A plan the visitor has NOT picked is an option open to them, not an
          unknown about the product. Naming the plan is the whole point. */}
      {o.planRoutes.map((r) => (
        <p key={r.criterion.id} className="mt-1 text-xs leading-relaxed text-slate-600">
          You could get {r.criterion.short ?? r.criterion.label.toLowerCase()} on{' '}
          {r.qualifying.map((p) => p.label).join(' or ')}
          {r.failing.length > 0 && <> — not on {r.failing.map((p) => p.label).join(' or ')}</>}.
        </p>
      ))}

      {o.functionalGaps.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          We haven’t confirmed it {o.functionalGaps.map((g) => g.label.toLowerCase()).join(' or ')}.
        </p>
      )}

      {/* A selected interest must reach the decision, not sit on a profile
          page the visitor has no reason to open. */}
      {interests.map((iid) => {
        const found = findingsForInterest(iid, o.alternative.product_provider.maker_id)
        const interest = interestById.get(iid)
        if (!interest) return null
        return (
          <div key={iid} className="mt-2 border-t border-slate-200/70 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {interest.label}
            </p>
            {found.length === 0 ? (
              <p className="mt-0.5 text-xs leading-snug text-slate-500">
                Nothing recorded. That means we have not looked, not that there is nothing to
                find.
              </p>
            ) : (
              <ul className="mt-0.5 space-y-1">
                {found.map((f) => (
                  <li key={f.fact.slice(0, 40)} className="text-xs leading-snug text-slate-700">
                    {f.headline && <span className="font-semibold">{f.headline}. </span>}
                    {f.status && (
                      <span className="text-slate-500">[{f.status.replace(/_/g, ' ')}] </span>
                    )}
                    {f.fact}
                    {f.limitation && (
                      <span className="block text-[11px] text-slate-500">{f.limitation}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function AdvicePanel({
  advice,
  interests,
  onCompare,
}: {
  advice: Advice
  interests: string[]
  onCompare: (ids: string[]) => void
}) {
  const a = advice
  if (a.kind === 'nothing_selected') return null

  // A next action, always. With a single lead option there is nothing to
  // compare it against unless we bring the nearest alternatives along — and
  // "how does this sit against the others" is the question a reader has left.
  const compareSet = [
    ...a.lead,
    ...(a.lead.length === 1 ? [...a.needConfirmation, ...a.compromises] : []),
  ].slice(0, 4)
  const compareLabel =
    a.lead.length === 1 && compareSet.length > 1
      ? `Compare ${a.lead[0].alternative.product} with the closest alternatives →`
      : 'Compare these side by side →'

  return (
    <div className="space-y-4">
      {/* ---- Lead ---- */}
      <section
        className={`rounded-xl border-2 p-4 ${
          a.lead.length > 0 ? 'border-teal-300 bg-teal-50/50' : 'border-slate-300 bg-white'
        }`}
      >
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {a.lead.length > 0 ? 'What to look at first' : 'Where this leaves you'}
        </h2>
        <p className="mt-1 text-base font-semibold leading-snug text-slate-900">{a.headline}</p>

        {a.lead.length > 0 && (
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
            {a.lead.length === 1 ? 'It has' : 'They each have'} a published finding for{' '}
            {critList(a.evaluable)}.
          </p>
        )}

        {a.conditions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {a.conditions.map((c) => (
              <li key={c} className="text-xs leading-snug text-amber-800">
                {c}
              </li>
            ))}
          </ul>
        )}

        {a.scopeNote && (
          <p className="mt-2 text-xs leading-snug text-slate-600">{a.scopeNote}</p>
        )}

        {a.interestScope && (
          <p className="mt-2 text-xs leading-snug text-slate-600">{a.interestScope}</p>
        )}

        {/* Prominence rests on positive evidence about these options. It is
            not a claim that anything else is worse. */}
        {a.lead.length > 0 && a.needConfirmation.length > 0 && (
          <p className="mt-2 text-xs leading-snug text-slate-500">
            We haven’t confirmed this for {a.needConfirmation.length} other option
            {a.needConfirmation.length === 1 ? '' : 's'}. That is about our research, not about
            those products.
          </p>
        )}

        {a.tradeoff && (
          <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
            <p className="text-xs font-semibold text-slate-800">
              One question would change this answer
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Does {a.tradeoff.criterion.short ?? a.tradeoff.criterion.label.toLowerCase()} matter
              more to you than the rest?{' '}
              {a.tradeoff.supporting.map((x) => x.product).join(', ')} meet it;{' '}
              {a.tradeoff.costing.map((x) => x.product).join(', ')} do not.
            </p>
          </div>
        )}

        {compareSet.length > 1 && (
          <button
            type="button"
            onClick={() => onCompare(compareSet.map((o) => o.alternative.id))}
            className="mt-3 rounded-full bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
          >
            {compareLabel}
          </button>
        )}
      </section>

      {/* ---- Lead detail ---- */}
      {a.lead.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {a.lead.map((o) => (
            <OptionRow key={o.alternative.id} o={o} tone="lead" interests={interests} />
          ))}
        </div>
      )}

      {/* ---- Known compromises ---- */}
      {a.compromises.length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            These fall short on something you picked
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            Still worth considering — the compromise is named so you can weigh it.
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {a.compromises.map((o) => (
              <OptionRow key={o.alternative.id} o={o} tone="compromise" interests={interests} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Might fit, needs confirming ---- */}
      {a.needConfirmation.length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            These might fit — we haven’t confirmed it
          </h3>
          <p className="mb-2 text-xs text-slate-500">
            Nothing here counts against them. We have not published a finding either way.
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {a.needConfirmation.map((o) => (
              <OptionRow key={o.alternative.id} o={o} tone="unconfirmed" interests={interests} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Ruled out by a must-have ---- */}
      {a.ruledOut.length > 0 && (
        <details className="rounded-xl border border-rose-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-rose-900">
            {a.ruledOut.length} ruled out by a must-have
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {a.ruledOut.map((o) => (
              <OptionRow key={o.alternative.id} o={o} tone="compromise" interests={interests} />
            ))}
          </div>
        </details>
      )}

      {/* ---- Everything else ---- */}
      {a.rest.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            The other {a.rest.length} option{a.rest.length === 1 ? '' : 's'} in this group
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {a.rest.map((o) => (
              <OptionRow key={o.alternative.id} o={o} tone="plain" interests={interests} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export { OptionRow, critList }
