import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  alternatives,
  criteria,
  criterionCoverage,
  criterionGroup,
  findingLabel,
  functionalRequirements,
  baselineCapabilityIds,
  makerInDirectory,
  pilotCategory,
  pilotMeta,
  recommend,
  summarisePreferences,
  verifiedCapabilities,
  type AlternativeOutcome,
  type CriterionOutcome,
  type PilotAlternative,
} from '../lib/recommend'
import { SectionTitle } from '../components/ui'

// ---------------------------------------------------------------------------
// Recommendation preview. One category, a researched set of alternatives.
//
// It shows what the evidence can and cannot support. There is no overall
// score, no ranking number, and an unconfirmed option is presented as a real
// third state rather than as a soft rejection.
// ---------------------------------------------------------------------------

/**
 * A finding, never the wish.
 *
 * The preference the visitor expressed is a quiet lead-in; the heading is what
 * the evidence actually says. Earlier this showed the desired condition in bold
 * above a finding that contradicted it — so a card could appear to assert that
 * founders hold less than half the votes while the text underneath said 52.7%.
 */
function EvidenceRow({ row, showAsk = true }: { row: CriterionOutcome; showAsk?: boolean }) {
  const a = row.assessment
  const label = findingLabel(row.verdict)
  const tone =
    row.verdict === 'meets'
      ? 'border-l-emerald-500 bg-emerald-50/40'
      : row.verdict === 'fails'
        ? 'border-l-rose-500 bg-rose-50/40'
        : 'border-l-slate-300 bg-slate-50'
  const labelTone =
    row.verdict === 'meets'
      ? 'text-emerald-800'
      : row.verdict === 'fails'
        ? 'text-rose-800'
        : 'text-slate-500'

  return (
    <li className={`rounded-md border border-slate-200 border-l-4 p-2.5 ${tone}`}>
      {showAsk && (
        <p className="text-[11px] leading-snug text-slate-500">
          {/* Labels are written as whole sentences ("You could run the model
              yourself"), so quote rather than fold into one of ours. */}
          You asked for: &ldquo;{row.criterion.label}&rdquo;
          {row.weight === 'requirement' && (
            <span className="ml-1.5 rounded-full border border-teal-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-800">
              required
            </span>
          )}
        </p>
      )}
      <p className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${labelTone}`}>
        {label}
        {/* A status badge only where it means something. An unknown finding
            must never carry "in force", which reads as confirmation. */}
        {a && row.verdict !== 'unconfirmed' && a.status !== 'in_force' && (
          <span className="ml-1.5 rounded-full border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-800">
            {a.status}
          </span>
        )}
        {a && row.verdict === 'unconfirmed' && a.status === 'proposed' && (
          <span className="ml-1.5 rounded-full border border-amber-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-amber-800">
            proposed change, not in force
          </span>
        )}
      </p>
      {a ? (
        <>
          <p className="mt-1 text-sm leading-snug text-slate-800">{a.claim}</p>
          <details className="mt-1.5">
            <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
              Source, scope and date
            </summary>
            <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-500">
              <p>
                {a.claim_type.replace(/_/g, ' ')} · {a.source}
                {a.source_date && ` · ${a.source_date}`}
              </p>
              {a.scope && (
                <p>
                  <span className="font-semibold">Scope:</span> {a.scope}
                </p>
              )}
              <p>
                <span className="font-semibold">Uncertainty:</span> {a.uncertainty}
              </p>
              <p className="text-slate-400">Automated and provisional — not human-reviewed.</p>
            </div>
          </details>
        </>
      ) : (
        <p className="mt-1 text-sm leading-snug text-slate-600">
          We have no finding either way for this option.
        </p>
      )}
    </li>
  )
}

/**
 * Enough to tell two products apart before reading any finding: who runs it,
 * whose model answers you, what we verified it can do, and what stops you
 * getting at it. None of this is a quality comparison — see the note rendered
 * under the tags.
 */
function ProductFacts({ alt }: { alt: PilotAlternative }) {
  // Tags every option shares are the category's price of entry, not a way to
  // tell two products apart. They are stated once for the page instead.
  const caps = verifiedCapabilities(alt).filter((c) => !baselineCapabilityIds.has(c.id))
  const modelKnown =
    alt.model_provider.maker_id !== 'unknown' && alt.model_release.status !== 'unknown'
  return (
    <div className="mt-0.5 space-y-1.5">
      <p className="text-xs text-slate-500">
        Operated by {alt.product_provider.maker_id}
        {alt.uses_third_party_models && (
          <>
            {' · '}
            <span className="font-medium text-slate-600">
              answers come from other companies&rsquo; models
            </span>
          </>
        )}
      </p>

      {caps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {caps.map((c) => (
            <span
              key={c.id}
              title={c.secondhand ? 'Verified from secondary sources' : 'Verified from the provider'}
              className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {c.label}
              {c.secondhand && <span className="text-slate-400"> *</span>}
            </span>
          ))}
        </div>
      )}

      {alt.access_notes && alt.access_notes.length > 0 && (
        <ul className="space-y-0.5">
          {alt.access_notes.map((n) => (
            <li key={n.label} className="text-[11px] leading-snug text-amber-800">
              {n.label}
            </li>
          ))}
        </ul>
      )}

      {modelKnown && (
        <p className="text-[11px] leading-snug text-slate-500">
          Model: {alt.model_release.name}
        </p>
      )}
    </div>
  )
}

function OutcomeCard({ o }: { o: AlternativeOutcome }) {
  // Neutral by default. A green card made alignment, contradiction and unknown
  // look alike; colour now lives on the finding, where it means something.
  const border = o.bucket === 'excluded' ? 'border-rose-200' : 'border-slate-200'
  return (
    <div className={`rounded-xl border bg-white p-4 ${border}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{o.alternative.product}</h3>
        {/* Only link where a maker page actually exists. Three operators here
            are not in the directory, and a dead link would imply otherwise. */}
        {makerInDirectory(o.alternative.product_provider.maker_id) ? (
          <Link
            to={`/maker/${encodeURIComponent(o.alternative.product_provider.maker_id)}`}
            className="text-xs text-teal-700 hover:underline"
          >
            {o.alternative.product_provider.maker_id} ↗
          </Link>
        ) : (
          <span className="text-xs text-slate-400">
            {o.alternative.product_provider.maker_id} · no maker page yet
          </span>
        )}
      </div>
      <ProductFacts alt={o.alternative} />

      {o.functionalGaps.length > 0 && (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-900">
          <span className="font-semibold">Not confirmed to do what you need:</span>{' '}
          {o.functionalGaps.map((g) => g.label.toLowerCase()).join(', ')}. This is a gap in our
          research, not a finding that it lacks them.
        </p>
      )}

      {o.failed.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-rose-700">
            Why this is ruled out
          </p>
          <ul className="space-y-1.5">
            {o.failed.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      {o.met.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
            Meets what you required
          </p>
          <ul className="space-y-1.5">
            {o.met.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      {o.supportingPriorities.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            Reasons to consider it
          </p>
          <ul className="space-y-1.5">
            {o.supportingPriorities.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      {o.tradeoffs.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-700">
            Trade-off
          </p>
          <ul className="space-y-1.5">
            {o.tradeoffs.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      {o.unresolved.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
            {o.unresolved.some((r) => r.weight === 'requirement')
              ? 'We could not check something you required'
              : 'What we could not check'}
          </p>
          <ul className="space-y-1.5">
            {o.unresolved.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}

      {/* Identity detail sits behind a disclosure: it matters, but it is not
          the reason anyone would consider this option. */}
      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
          What this product is, and how we identified it
        </summary>
        <p className="mt-1 text-xs leading-snug text-slate-600">{o.alternative.identity_note}</p>
        <dl className="mt-2 grid grid-cols-1 gap-1 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] sm:grid-cols-3">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">Operated by</dt>
            <dd className="text-slate-700">{o.alternative.product_provider.maker_id}</dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">Model provider</dt>
            <dd
              className={
                o.alternative.model_provider.maker_id === 'unknown'
                  ? 'text-slate-400'
                  : 'text-slate-700'
              }
            >
              {o.alternative.model_provider.maker_id === 'unknown'
                ? 'not established'
                : o.alternative.model_provider.maker_id}
            </dd>
          </div>
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-400">Model release</dt>
            <dd
              className={
                o.alternative.model_release.status === 'unknown'
                  ? 'text-slate-400'
                  : 'text-slate-700'
              }
            >
              {o.alternative.model_release.name}
            </dd>
          </div>
        </dl>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">
          Operator: {o.alternative.product_provider.status.replace(/_/g, ' ')} ·{' '}
          {o.alternative.product_provider.source}
        </p>
        {o.alternative.product_provider.retrieval_note && (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            Retrieval note: {o.alternative.product_provider.retrieval_note}
          </p>
        )}
      </details>
    </div>
  )
}

/** One selectable preference. Coverage is shown before the visitor chooses, so
 *  an empty answer afterwards is never a surprise. */
function CriterionRow({
  c,
  priorities,
  requirements,
  onTogglePriority,
  onToggleRequirement,
}: {
  c: (typeof criteria)[number]
  priorities: string[]
  requirements: string[]
  onTogglePriority: () => void
  onToggleRequirement: () => void
}) {
  const on = priorities.includes(c.id)
  const cov = criterionCoverage(c.id)

  if (c.informational) {
    return (
      <li className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-700">{c.label}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-600">{c.plain ?? c.concept}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Information only — we have findings for {cov.decided} of {cov.total}, but no single
          answer is better, so there is nothing here to prefer. See each maker's page.
        </p>
      </li>
    )
  }

  return (
    <li className={`rounded-lg border p-3 ${on ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
          <input type="checkbox" checked={on} onChange={onTogglePriority} className="mt-1" />
          <span className="min-w-0">
            <span className="text-sm font-semibold text-slate-800">{c.label}</span>
            <span className="mt-0.5 block text-xs leading-snug text-slate-600">
              {c.plain ?? c.concept}
            </span>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                cov.decided === 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cov.decided === 0
                ? 'nothing documented yet'
                : `documented for ${cov.decided} of ${cov.total}`}
            </span>
          </span>
        </label>
        {on && (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={requirements.includes(c.id)}
              onChange={onToggleRequirement}
            />
            must have
          </label>
        )}
      </div>
      {(c.does_not_establish || c.distinct_from) && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
            What this does and does not show
          </summary>
          <div className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-500">
            <p>{c.concept}</p>
            {c.distinct_from && (
              <p>
                <span className="font-semibold">Not the same as:</span> {c.distinct_from}
              </p>
            )}
            {c.does_not_establish && (
              <p>
                <span className="font-semibold">Does not establish:</span> {c.does_not_establish}
              </p>
            )}
          </div>
        </details>
      )}
    </li>
  )
}

/**
 * What the selected preferences actually turned up. Counts and names, never a
 * winner: direction is offered only where one option holds the only documented
 * finding in favour, and it is stated as one attribute rather than a verdict.
 */
function ResultSummary({
  summaries,
}: {
  summaries: ReturnType<typeof summarisePreferences>
}) {
  if (summaries.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">What we found</h2>
      <ul className="mt-2 space-y-3">
        {summaries.map((sm) => (
          <li key={sm.criterion.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
            <p className="text-sm font-semibold text-slate-800">{sm.criterion.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {sm.aligned.length > 0 && (
                <>
                  <strong className="text-emerald-800">{sm.aligned.length} documented</strong> in
                  favour — {sm.aligned.map((a) => a.product).join(', ')}.{' '}
                </>
              )}
              {sm.conflicting.length > 0 && (
                <>
                  <strong className="text-rose-800">{sm.conflicting.length} documented</strong>{' '}
                  against — {sm.conflicting.map((a) => a.product).join(', ')}.{' '}
                </>
              )}
              {sm.unresolved.length > 0 && (
                <>
                  <strong className="text-slate-700">{sm.unresolved.length}</strong> we could not
                  establish — {sm.unresolved.map((a) => a.product).join(', ')}.
                </>
              )}
            </p>
            {sm.soleAligned && (
              <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs leading-snug text-emerald-900">
                If this is what matters most to you, <strong>{sm.soleAligned.product}</strong> is
                the only option here with a documented finding in its favour. That is one
                documented attribute, not an overall assessment of the product.
              </p>
            )}
            {sm.aligned.length === 0 && sm.conflicting.length === 0 && (
              <p className="mt-1.5 text-xs leading-snug text-slate-500">
                Nothing is documented either way, so this cannot separate the options. It is a gap
                in our research, not a mark against any of them.
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
        Every option stays listed below, whatever we found.{' '}
        <Link to="/about" className="text-teal-700 underline underline-offset-2">
          How we decide what counts as evidence
        </Link>
      </p>
    </div>
  )
}

export function RecommendView() {
  const [functional, setFunctional] = useState<string[]>(['fr_general_chat'])
  const [priorities, setPriorities] = useState<string[]>([])
  const [requirements, setRequirements] = useState<string[]>([])

  const input = useMemo(
    () => ({ functional, priorities, requirements }),
    [functional, priorities, requirements],
  )
  const result = useMemo(() => recommend(input), [input])
  const summaries = useMemo(() => summarisePreferences(result, input), [result, input])

  const core = criteria.filter((c) => criterionGroup(c) === 'core')
  const more = criteria.filter((c) => criterionGroup(c) === 'more')
  // A selection inside the collapsed group must never be hidden from the user.
  const moreHasSelection = more.some(
    (c) => priorities.includes(c.id) || requirements.includes(c.id),
  )

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const started = priorities.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">Recommendation preview</h1>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-800">
          one category · researched pilot
        </span>
      </div>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        {pilotCategory.definition} {alternatives.length} alternatives were researched, most
        recently on {pilotMeta.researched_on}. There is no overall score here and nothing has
        been tested for quality: the preview tells you what the evidence supports, what it cannot
        answer, and what you would be deciding blind.
      </p>

      {/* Step 1 — function */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle>1 · What you need it to do</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {functionalRequirements.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => toggle(functional, setFunctional, f.id)}
              aria-pressed={functional.includes(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                functional.includes(f.id)
                  ? 'border-teal-400 bg-teal-100 text-teal-800'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-500">
          Where we have not confirmed a capability with the provider, we say so rather than assume
          it.
        </p>
      </section>

      {/* Step 2 — priorities */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle>2 · What matters to you</SectionTitle>
        <p className="mb-3 text-xs leading-snug text-slate-500">
          Tick what you care about. Add <strong>must have</strong> to rule out options we have
          evidence against.
        </p>
        <ul className="space-y-2">
          {core.map((c) => (
            <CriterionRow
              key={c.id}
              c={c}
              priorities={priorities}
              requirements={requirements}
              onTogglePriority={() => toggle(priorities, setPriorities, c.id)}
              onToggleRequirement={() => toggle(requirements, setRequirements, c.id)}
            />
          ))}
        </ul>

        <details className="mt-3" open={moreHasSelection}>
          <summary className="cursor-pointer text-sm font-semibold text-teal-700 hover:underline">
            More priorities ({more.length}) — thinner evidence, or no direction to prefer
          </summary>
          <ul className="mt-2 space-y-2">
            {more.map((c) => (
              <CriterionRow
                key={c.id}
                c={c}
                priorities={priorities}
                requirements={requirements}
                onTogglePriority={() => toggle(priorities, setPriorities, c.id)}
                onToggleRequirement={() => toggle(requirements, setRequirements, c.id)}
              />
            ))}
          </ul>
        </details>
      </section>

      {/* Step 3 — results */}
      {started && (
        <section className="mt-6 space-y-6">
          <ResultSummary summaries={summaries} />

          {result.unassessableRequirements.length > 0 && (
            <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                We have no evidence on{' '}
                {result.unassessableRequirements.length === 1
                  ? 'one of your must-haves'
                  : `${result.unassessableRequirements.length} of your must-haves`}
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900">
                {result.unassessableRequirements.map((c) => (
                  <li key={c.id}>{c.label}</li>
                ))}
              </ul>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-amber-800">
                We have kept{' '}
                {result.unassessableRequirements.length === 1 ? 'it' : 'them'} as must-haves, so
                nothing is shown as meeting{' '}
                {result.unassessableRequirements.length === 1 ? 'it' : 'them'}.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRequirements(
                      requirements.filter(
                        (id) => !result.unassessableRequirements.some((c) => c.id === id),
                      ),
                    )
                  }
                  className="rounded-md border border-amber-400 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Keep it, but not as a must-have
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ids = result.unassessableRequirements.map((c) => c.id)
                    setRequirements(requirements.filter((id) => !ids.includes(id)))
                    setPriorities(priorities.filter((id) => !ids.includes(id)))
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Remove it
                </button>
              </div>
            </div>
          )}

          <div>
            <SectionTitle>
              {result.hasRequirements
                ? `Meets your confirmed requirements (${result.confirmed.length})`
                : `Options to consider (${result.confirmed.length})`}
            </SectionTitle>
            <p className="mb-2 max-w-3xl text-xs leading-snug text-slate-500">
              {result.hasRequirements ? (
                <>
                  These meet everything you marked must-have. That is a starting point, not a
                  recommendation — the reasons and trade-offs on each card are what to judge.
                </>
              ) : (
                <>
                  All {alternatives.length} options, with what we found for and against each on
                  what you picked.
                </>
              )}
            </p>
            {result.noConfirmedMatch ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">
                  No confirmed match among the researched options
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                  No option here can be confirmed against everything you asked for. That reflects
                  what we have researched, not a judgement on the products. Each option below shows
                  what is missing.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.confirmed.map((o) => (
                  <OutcomeCard key={o.alternative.id} o={o} />
                ))}
              </div>
            )}
          </div>

          {result.notConfirmed.length > 0 && (
            <div>
              <SectionTitle>
                Requirement not confirmed ({result.notConfirmed.length})
              </SectionTitle>
              <p className="mb-2 max-w-3xl text-xs leading-snug text-slate-500">
                We could not check something you marked must-have. Not ruled out, not confirmed —
                each card says what is missing.
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.notConfirmed.map((o) => (
                  <OutcomeCard key={o.alternative.id} o={o} />
                ))}
              </div>
            </div>
          )}

          {result.excluded.length > 0 && (
            <div>
              <SectionTitle>Ruled out on evidence ({result.excluded.length})</SectionTitle>
              <p className="mb-2 max-w-3xl text-xs leading-snug text-slate-500">
                We have evidence these do not meet something you marked must-have.
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.excluded.map((o) => (
                  <OutcomeCard key={o.alternative.id} o={o} />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-500">
            {alternatives.length} products in one category. All of them are verified to work as a
            general-purpose assistant in a browser without a developer account, so cards show only
            the capabilities that differ. Tags say a product does something, never how well —
            nothing here has been tested or compared for quality — and a tag we have not verified
            is simply absent rather than denied. An asterisk marks one confirmed only from
            secondary sources.{' '}
            <Link to="/about" className="text-teal-700 underline underline-offset-2">
              How this works
            </Link>
          </p>
        </section>
      )}

      {!started && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Pick at least one thing that matters to you to see what the evidence supports.
        </p>
      )}
    </div>
  )
}
