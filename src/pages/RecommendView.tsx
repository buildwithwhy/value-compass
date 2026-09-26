import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  criteria,
  alternativesIn,
  categories,
  criterionById,
  criterionCoverage,
  functionalIn,
  motivationCriteria,
  motivationsIn,
  DEFAULT_CATEGORY,
  answerLabel,
  planAvailability,
  baselineCapabilityIds,
  makerInDirectory,
  motivationBlurb,
  motivationCoverage,
  motivations,
  recommend,
  buildGuidance,
  verifiedCapabilities,
  type AlternativeOutcome,
  type CriterionOutcome,
  type Guidance,
  type Motivation,
  type PilotAlternative,
  type PilotPlan,
  type PreferenceSummary,
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
function EvidenceRow({
  row,
  showAsk = true,
  plan,
}: {
  row: CriterionOutcome
  showAsk?: boolean
  plan?: string
}) {
  const a = row.assessment
  const label = answerLabel(row.alternativeId, row.criterion.id, row.verdict)
  const avail = planAvailability(row.alternativeId, row.criterion.id)
  const perPlan = plan ? a?.by_plan?.[plan] : undefined

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
        : 'text-slate-600'

  // The answer someone can act on. Authored per finding where the nuance
  // matters; otherwise the recorded claim, which is already a plain statement.
  const answer = perPlan?.claim ?? a?.plain ?? a?.claim
  const condition = a?.condition

  return (
    <li className={`rounded-md border border-slate-200 border-l-4 p-2.5 ${tone}`}>
      {showAsk && (
        <p className="text-[11px] leading-snug text-slate-500">
          {row.criterion.label}
          {row.weight === 'requirement' && (
            <span className="ml-1.5 rounded-full border border-teal-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-teal-800">
              must have
            </span>
          )}
        </p>
      )}
      <p className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${labelTone}`}>{label}</p>

      {answer && <p className="mt-1 text-sm leading-snug text-slate-800">{answer}</p>}

      {/* A qualification that changes the decision stays in the open. */}
      {condition && (
        <p className="mt-1 text-xs leading-snug text-amber-800">{condition}</p>
      )}

      {/* What you could do about it, where a plan would answer the question. */}
      {avail && avail.qualifying.length > 0 && !perPlan && (
        <p className="mt-1 text-xs leading-snug text-slate-600">
          Available on{' '}
          <strong>{avail.qualifying.map((p) => p.label).join(' and ')}</strong>
          {avail.other.length > 0 && <> — not confirmed on {avail.other.map((p) => p.label).join(', ')}</>}.
        </p>
      )}

      {a && (
        <details className="mt-1.5">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
            Evidence
          </summary>
          <div className="mt-1 space-y-1 text-[11px] leading-snug text-slate-500">
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
            {a.scope && (
              <p>
                <span className="font-semibold">Scope:</span> {a.scope}
              </p>
            )}
            <p>
              <span className="font-semibold">Uncertainty:</span> {a.uncertainty}
            </p>
            <p className="text-slate-400">Automated research, not human-reviewed.</p>
          </div>
        </details>
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

/**
 * Who gets paid, who owns it, what it runs on — and the specific things we
 * could not establish.
 *
 * Shown only when the visitor has chosen something from the ownership
 * question, because otherwise it is noise. Every unknown here names what is
 * missing rather than shrugging, and none of it asserts a money flow we have
 * not documented: an investor stake is not a payment, and a supplier
 * relationship is not a price.
 */
function RelationshipSummary({ alt }: { alt: PilotAlternative }) {
  const r = alt.relationships
  if (!r) return null
  return (
    <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">
        Who gets paid, and what this runs on
      </summary>
      <div className="mt-1.5 space-y-1.5 text-[11px] leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-700">Money goes to:</span> {r.pays}
          {r.free_tier && <span className="text-slate-500"> {r.free_tier}</span>}
        </p>
        {r.owners?.length > 0 && (
          <p>
            <span className="font-semibold text-slate-700">Ownership and control:</span>{' '}
            {r.owners.join('. ')}.
          </p>
        )}
        {r.suppliers?.length > 0 && (
          <p>
            <span className="font-semibold text-slate-700">Runs on:</span> {r.suppliers.join('. ')}.
          </p>
        )}
        {r.unknowns?.length > 0 && (
          <p className="text-slate-500">
            <span className="font-semibold">We have not established:</span>{' '}
            {r.unknowns.join('; ')}.
          </p>
        )}
      </div>
    </details>
  )
}

/**
 * What a visitor sees before choosing anything: the products that exist, what
 * each one is, and one thing we actually know. No ordering claim, no default
 * preferences, no winner — the point is that you can find out what is covered
 * without filling in a form first.
 */
function DiscoveryCard({ alt }: { alt: PilotAlternative }) {
  const r = alt.relationships
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-base font-bold text-slate-900">{alt.product}</h3>
        <span className="text-xs text-slate-500">
          by {alt.product_provider.maker_id}
          {makerInDirectory(alt.product_provider.maker_id) && (
            <>
              {' · '}
              <Link
                to={`/maker/${encodeURIComponent(alt.product_provider.maker_id)}`}
                className="text-teal-700 hover:underline"
              >
                who they are
              </Link>
            </>
          )}
          {alt.official_url && (
            <>
              {' · '}
              <a
                href={alt.official_url}
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 hover:underline"
              >
                site ↗
              </a>
            </>
          )}
        </span>
      </div>
      {alt.discovery && (
        <p className="mt-1 text-sm leading-snug text-slate-700">{alt.discovery}</p>
      )}
      {alt.discovery_fact && (
        <p className="mt-1.5 text-xs leading-snug text-slate-600">{alt.discovery_fact}</p>
      )}
      {/* Ownership and money are part of the point, so they are reachable
          here rather than only after choosing an ownership requirement that
          comes back unknown for everything. */}
      {r && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
            Who is behind this?
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
      )}
    </div>
  )
}


/** The provider's own plan names. Never equated across companies. */
function PlanPicker({
  alt,
  value,
  onChange,
}: {
  alt: PilotAlternative
  value: string | undefined
  onChange: (plan: string | undefined) => void
}) {
  const plans = alt.plans ?? []
  if (plans.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-slate-500">Plan to compare:</span>
      {[{ id: '', label: 'Not sure' } as PilotPlan, ...plans].map((p) => {
        const active = (value ?? '') === p.id
        return (
          <button
            key={p.id || 'unsure'}
            type="button"
            onClick={() => onChange(p.id || undefined)}
            aria-pressed={active}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              active
                ? 'border-teal-400 bg-teal-100 text-teal-800'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        )
      })}
      {!value && (
        <span className="text-[11px] text-slate-400">
          pick one to see what it would give you
        </span>
      )}
    </div>
  )
}

function OutcomeCard({
  o,
  showRelationships,
  plan,
  onPlan,
}: {
  o: AlternativeOutcome
  showRelationships: boolean
  plan?: string
  onPlan?: (p: string | undefined) => void
}) {
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
      {onPlan && <PlanPicker alt={o.alternative} value={plan} onChange={onPlan} />}
      {showRelationships && <RelationshipSummary alt={o.alternative} />}

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
              <EvidenceRow key={r.criterion.id} row={r} plan={plan} />
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
              <EvidenceRow key={r.criterion.id} row={r} plan={plan} />
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
              <EvidenceRow key={r.criterion.id} row={r} plan={plan} />
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
              <EvidenceRow key={r.criterion.id} row={r} plan={plan} />
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
              <EvidenceRow key={r.criterion.id} row={r} plan={plan} />
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
  category,
  priorities,
  requirements,
  onTogglePriority,
  onToggleRequirement,
}: {
  c: (typeof criteria)[number]
  category: string
  priorities: string[]
  requirements: string[]
  onTogglePriority: () => void
  onToggleRequirement: () => void
}) {
  const on = priorities.includes(c.id)
  const cov = criterionCoverage(c.id, category)

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
                cov.decided === 0 && cov.conditional === 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {/* An answer that depends on a plan is evidence, and labelling it
                  "nothing" made a researched question look unresearched. */}
              {cov.decided === 0 && cov.conditional === 0
                ? 'not researched yet'
                : cov.decided === 0
                  ? `answered for ${cov.conditional} of ${cov.total}, depending on plan`
                  : cov.conditional > 0
                    ? `answered for ${cov.decided} of ${cov.total}, plus ${cov.conditional} depending on plan`
                    : `answered for ${cov.decided} of ${cov.total}`}
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

/** "A", "A and B", "A, B and C" — criterion labels and product names are both
 *  read as prose here, so a bare comma-join reads as a typo. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Labels are whole sentences, so quote them rather than fold them into ours. */
const quoted = (labels: string[]) => joinNames(labels.map((l) => `\u201C${l}\u201D`))

/** One criterion, and who is documented where. */
function SeparationRow({ sm }: { sm: PreferenceSummary }) {
  const nothing = sm.aligned.length === 0 && sm.conflicting.length === 0
  return (
    <li className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
      <p className="text-sm font-semibold text-slate-800">{sm.criterion.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        {sm.aligned.length > 0 && (
          <>
            <strong className="text-emerald-800">{sm.aligned.length} yes</strong> —{' '}
            {sm.aligned.map((a) => a.product).join(', ')}.{' '}
          </>
        )}
        {sm.conflicting.length > 0 && (
          <>
            <strong className="text-rose-800">{sm.conflicting.length} no</strong> —{' '}
            {sm.conflicting.map((a) => a.product).join(', ')}.{' '}
          </>
        )}
        {sm.unresolved.length > 0 && (
          <>
            <strong className="text-slate-700">{sm.unresolved.length}</strong> not confirmed —{' '}
            {sm.unresolved.map((a) => a.product).join(', ')}.
          </>
        )}
      </p>
      {sm.separates && (
        <p className="mt-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs leading-snug text-emerald-900">
          This one separates them: <strong>{joinNames(sm.aligned.map((a) => a.product))}</strong>{' '}
          do; <strong>{joinNames(sm.conflicting.map((a) => a.product))}</strong> don’t.
        </p>
      )}
      {sm.planRoutes.length > 0 && (
        <p className="mt-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs leading-relaxed text-slate-700">
          <span className="font-semibold">On some plans, yes.</span>{' '}
          {sm.planRoutes.map((r, i) => (
            <span key={r.alternative.id}>
              {i > 0 && '; '}
              <strong>{r.alternative.product}</strong> on{' '}
              {r.plans.map((p) => p.label).join(' or ')}
            </span>
          ))}
          . Pick a plan on a card below to see it applied.
        </p>
      )}
      {nothing && sm.planRoutes.length === 0 && (
        <p className="mt-1.5 text-xs leading-snug text-slate-500">
          {sm.unresolvedKinds.includes('conflicting')
            ? 'The published policies give conflicting answers, so we have not picked one.'
            : sm.unresolvedKinds.includes('conditional')
              ? 'The answer depends on your plan, where your account is, or a policy date that has not arrived yet.'
              : 'We haven’t confirmed this for any of them yet.'}
        </p>
      )}
    </li>
  )
}

/**
 * The guidance, stated rather than implied by position.
 *
 * It names what is worth considering and on what evidence, raises documented
 * conflicts next to the options that carry them, and where two options are
 * documented on exactly the same criteria it says plainly that an unknown does
 * not make one of them better.
 */
function ResultSummary({ guidance, hasRequirements }: { guidance: Guidance; hasRequirements: boolean }) {
  const g = guidance
  if (g.separations.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">What we found</h2>

      <ul className="mt-2 space-y-3">
        {g.separations.map((sm) => (
          <SeparationRow key={sm.criterion.id} sm={sm} />
        ))}
      </ul>

      {g.cannotDistinguish ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            We can’t answer this one yet
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            We haven’t confirmed this for any of them, so there is nothing here to act on. That
            is about our research, not about the products.
            {g.suggestion && (
              <>
                {' '}
                Something we <em>can</em> answer: <strong>{g.suggestion.label}</strong>.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {g.considered.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                What fits, and why
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {g.considered.map((n) => (
                  <li key={n.alternative.id} className="text-xs leading-relaxed text-slate-700">
                    <strong className="text-slate-900">{n.alternative.product}</strong> — meets{' '}
                    {quoted(n.alignsOn.map((c) => c.label))}.
                    {n.conflictsOn.length > 0 && (
                      <span className="text-rose-800">
                        {' '}
                        Doesn’t meet {quoted(n.conflictsOn.map((c) => c.label))} — a real
                        trade-off, not a disqualification.
                      </span>
                    )}
                    {n.unknownOn.length > 0 && (
                      <span className="text-slate-500">
                        {' '}
                        Not confirmed on {quoted(n.unknownOn.map((c) => c.label))}.
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {(g.unaligned.conflicted.length > 0 ||
                g.unaligned.unresolved.length > 0 ||
                g.unaligned.mixed.length > 0) && (
                <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                  {/* Why an option is not in the list above, generated from what
                      the visitor actually picked. A documented conflict and an
                      unresearched question are different answers and are not
                      collapsed into one. */}
                  {g.unaligned.conflicted.length > 0 && (
                    <p className="text-[11px] leading-snug text-slate-500">
                      <strong className="text-rose-800">Documented against</strong> on what you
                      picked — {joinNames(g.unaligned.conflicted.map((n) => n.alternative.product))}
                      .{' '}
                      {hasRequirements
                        ? 'Where you made that a must-have, they are ruled out below.'
                        : 'These are preferences, so they stay available; the conflict is on each card.'}
                    </p>
                  )}
                  {g.unaligned.mixed.length > 0 && (
                    <p className="text-[11px] leading-snug text-slate-500">
                      <strong className="text-slate-700">Part documented against, part
                      unresolved</strong> —{' '}
                      {joinNames(g.unaligned.mixed.map((n) => n.alternative.product))}. Each card
                      says which is which.
                    </p>
                  )}
                  {g.unaligned.unresolved.length > 0 && (
                    <p className="text-[11px] leading-snug text-slate-500">
                      <strong className="text-slate-700">Not confirmed</strong> on what you picked
                      — {joinNames(g.unaligned.unresolved.map((n) => n.alternative.product))}.{' '}
                      {(() => {
                        const kinds = new Set(
                          g.unaligned.unresolved.flatMap((n) => n.unknownKinds),
                        )
                        if (kinds.size === 1 && kinds.has('unresearched'))
                          return 'We haven’t confirmed this for them yet.'
                        if (kinds.size === 1 && kinds.has('conditional'))
                          return 'It depends on the plan, the region, or a policy date. Each card says which.'
                        if (kinds.size === 1 && kinds.has('conflicting'))
                          return 'The published policies give conflicting answers.'
                        return 'Each card says whether that is a plan, a date, or something we haven’t established.'
                      })()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {g.matchedGroups
            .filter((grp) => grp.differences.length > 0)
            .map((grp) => (
              <div
                key={grp.members.map((m) => m.alternative.id).join('|')}
                className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Too close to call
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  {grp.members.length === 2 ? 'Both ' : `All ${grp.members.length} of `}
                  <strong>{joinNames(grp.members.map((m) => m.alternative.product))}</strong> have
                  documented support for {grp.alignsOn.length} of your priorities:{' '}
                  {quoted(grp.alignsOn.map((c) => c.label))}.
                </p>
                {grp.differences.map((d) => (
                  <p key={d.criterion.id} className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    <strong>{joinNames(d.conflicting.map((a) => a.product))}</strong>{' '}
                    {d.conflicting.length === 1 ? 'has' : 'have'} a documented conflict concerning{' '}
                    {quoted([d.criterion.label])}. We have not assessed{' '}
                    <strong>{joinNames(d.unknown.map((a) => a.product))}</strong> on that question,
                    so we cannot establish whether{' '}
                    {d.unknown.length === 1 ? 'it is a better alternative' : 'they are better'} on
                    this point.
                  </p>
                ))}
                {g.nextQuestion && (
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                    Next question worth investigating: {quoted([g.nextQuestion.label])} for{' '}
                    {joinNames(
                      grp.differences.flatMap((d) => d.unknown.map((a) => a.product)),
                    ) || 'the options above'}.
                  </p>
                )}
              </div>
            ))}

          {g.openQuestions.length > 0 && (
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500">
              Still open, and could change this: {quoted(g.openQuestions.map((c) => c.label))} —
              no option has a finding either way.
            </p>
          )}
        </>
      )}

      <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-snug text-slate-500">
        Every option stays listed below, whatever we found.{' '}
        <Link to="/about" className="text-teal-700 underline underline-offset-2">
          How we decide what counts as evidence
        </Link>
      </p>
    </div>
  )
}


/**
 * A starting question, opened to reveal what we can actually assess under it.
 *
 * Opening one selects nothing. The user still ticks individual criteria, and
 * the limits are shown before the criteria rather than after, because the gap
 * between the broad question and the narrow evidence is where this page could
 * most easily mislead.
 */
function MotivationSection({
  m,
  category,
  priorities,
  requirements,
  onTogglePriority,
  onToggleRequirement,
}: {
  m: Motivation
  category: string
  priorities: string[]
  requirements: string[]
  onTogglePriority: (id: string) => void
  onToggleRequirement: (id: string) => void
}) {
  const cs = motivationCriteria(m, category)
  const lead = cs.filter((c) => !c.nested)
  const nested = cs.filter((c) => c.nested)
  const chosen = cs.filter((c) => priorities.includes(c.id) || requirements.includes(c.id))
  const nestedChosen = nested.some((c) => priorities.includes(c.id) || requirements.includes(c.id))
  const cov = motivationCoverage(m, category)
  // "5 of 5 questions with evidence" read as full coverage. It means five
  // questions have SOME evidence, which is a different and weaker claim.
  const coverageText =
    cov.documented === 0
      ? 'No evidence yet'
      : cov.documented === cov.total
        ? `Some evidence for all ${cov.total} question${cov.total === 1 ? '' : 's'}`
        : `Some evidence for ${cov.documented} of ${cov.total} questions`

  return (
    // Open when the user already has something selected inside, so reorganising
    // the page can never hide a choice they made.
    <details className="rounded-lg border border-slate-200 bg-slate-50/60" open={chosen.length > 0}>
      <summary className="cursor-pointer list-none px-3 py-2.5">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm font-semibold text-slate-900">{m.question}</span>
          <span className="text-[11px] text-slate-500">
            {chosen.length > 0 && (
              <span className="mr-2 rounded-full border border-teal-300 bg-teal-50 px-1.5 py-0.5 font-semibold text-teal-800">
                {chosen.length} selected
              </span>
            )}
            {coverageText}
          </span>
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {motivationBlurb(m, category)}
        </span>
      </summary>

      <div className="border-t border-slate-200 px-3 py-2.5">
        {/* Choices first. The caveats are real and stay one click away, but a
            section that opens with four warnings reads as a disclaimer, not an
            offer. A limitation that changes what a finding MEANS stays pinned
            to that finding instead. */}
        {m.groups ? (
          <div className="space-y-3">
            {m.groups.map((g) => (
              <div key={g.heading}>
                <p className="text-xs font-bold text-slate-800">{g.heading}</p>
                {g.blurb && (
                  <p className="mb-1.5 text-[11px] leading-snug text-slate-500">{g.blurb}</p>
                )}
                <ul className="space-y-2">
                  {g.criterionIds
                    .map((id) => criterionById.get(id)!)
                    .filter((c) => c && !c.nested && (c.categories ?? []).includes(category))
                    .map((c) => (
                      <CriterionRow
                        key={c.id}
                        c={c}
                        category={category}
                        priorities={priorities}
                        requirements={requirements}
                        onTogglePriority={() => onTogglePriority(c.id)}
                        onToggleRequirement={() => onToggleRequirement(c.id)}
                      />
                    ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {lead.map((c) => (
              <CriterionRow
                key={c.id}
                c={c}
                category={category}
                priorities={priorities}
                requirements={requirements}
                onTogglePriority={() => onTogglePriority(c.id)}
                onToggleRequirement={() => onToggleRequirement(c.id)}
              />
            ))}
          </ul>
        )}

        {/* Supporting evidence. Selectable and fully capable of excluding when
            made a must-have — just not what the question leads with. */}
        <details className="mt-2.5">
          <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-700">
            What these findings do and do not show
          </summary>
          <ul className="mt-1 space-y-0.5">
            {m.limits.map((l) => (
              <li key={l} className="text-[11px] leading-snug text-slate-500">
                — {l}
              </li>
            ))}
          </ul>
          {m.gap && (
            <p className="mt-1.5 text-[11px] leading-snug text-amber-800">
              <span className="font-semibold">Where the evidence runs out.</span> {m.gap}
            </p>
          )}
        </details>

        {nested.length > 0 && (
          <details className="mt-2" open={nestedChosen}>
            <summary className="cursor-pointer text-xs font-semibold text-teal-700 hover:underline">
              Supporting evidence ({nested.length}) — narrower questions underneath this one
            </summary>
            <ul className="mt-2 space-y-2">
              {nested.map((c) => (
                <CriterionRow
                  key={c.id}
                  c={c}
                  category={category}
                  priorities={priorities}
                  requirements={requirements}
                  onTogglePriority={() => onTogglePriority(c.id)}
                  onToggleRequirement={() => onToggleRequirement(c.id)}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  )
}

type Picks = {
  functional: string[]
  priorities: string[]
  requirements: string[]
  plans: Record<string, string>
}

const emptyPicks = (): Picks => ({
  // Nothing preselected: a filter the visitor did not choose is not theirs.
  functional: [],
  priorities: [],
  requirements: [],
  plans: {},
})

export function RecommendView() {
  const { category: slug } = useParams()
  const navigate = useNavigate()
  const category =
    categories.find((c) => c.id === slug)?.id ?? DEFAULT_CATEGORY
  const categoryDef = categories.find((c) => c.id === category)!

  // Selections are kept per category. A requirement set for assistants must
  // never quietly filter app builders, so the two never share an object.
  const [byCategory, setByCategory] = useState<Record<string, Picks>>(() => ({
    [category]: emptyPicks(),
  }))
  const picks = byCategory[category] ?? emptyPicks()
  const { functional, priorities, requirements, plans } = picks
  const update = (patch: Partial<Picks>) =>
    setByCategory((prev) => ({ ...prev, [category]: { ...picks, ...patch } }))
  const setFunctional = (v: string[]) => update({ functional: v })
  const setPriorities = (v: string[]) => update({ priorities: v })
  const setRequirements = (v: string[]) => update({ requirements: v })
  const setPlan = (altId: string, plan: string | undefined) => {
    const next = { ...plans }
    if (plan) next[altId] = plan
    else delete next[altId]
    update({ plans: next })
  }

  const input = useMemo(
    () => ({ category, functional, priorities, requirements, plans }),
    [category, functional, priorities, requirements, plans],
  )
  const result = useMemo(() => recommend(input), [input])
  const guidance = useMemo(() => buildGuidance(result, input), [result, input])

  // The relationship block answers the ownership question, so it appears when
  // the visitor has actually asked it.
  const ownershipIds = new Set(motivations.find((m) => m.id === 'm_power')?.criterionIds ?? [])
  const showRelationships = [...priorities, ...requirements].some((id) => ownershipIds.has(id))

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const started = priorities.length > 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
        Find AI tools that fit your values
      </h1>
      <p className="mt-1 max-w-3xl text-sm leading-snug text-slate-600">
        Choose a type of tool, then see how the options match what matters to you.{' '}
        <span className="hidden sm:inline">
          This compares documented policies and relationships, not tested product quality.{' '}
        </span>
        <Link to="/about" className="whitespace-nowrap text-teal-700 underline underline-offset-2">
          How this works
        </Link>
      </p>

      {/* Category first, so the products are findable before any question. */}
      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Type of tool">
        {categories.map((c) => {
          const active = c.id === category
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => navigate(c.id === DEFAULT_CATEGORY ? '/recommend' : `/recommend/${c.id}`)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
                active
                  ? 'border-teal-400 bg-teal-100 text-teal-900'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
              <span className="ml-1.5 font-normal text-slate-500">
                {alternativesIn(c.id).length}
              </span>
            </button>
          )
        })}
        <Link
          to="/browse"
          className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Browse all makers →
        </Link>
      </div>

      <p className="mt-2 max-w-3xl text-xs leading-snug text-slate-500">
        {categoryDef.definition}
        {categoryDef.scope_note && (
          <>
            {' '}
            <span
              title={categoryDef.scope_note}
              className="cursor-help underline decoration-dotted underline-offset-2"
            >
              What counts
            </span>
          </>
        )}
      </p>

      {!started && (
        <section className="mt-6">
          <SectionTitle>
            {alternativesIn(category).length} options
          </SectionTitle>
          <p className="mb-3 max-w-3xl text-xs leading-snug text-slate-500">
            Alphabetical, no ranking. Pick what matters to you below to compare them.
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {alternativesIn(category).map((a) => (
              <DiscoveryCard key={a.id} alt={a} />
            ))}
          </div>
        </section>
      )}

      {/* Step 1 — function */}
      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Narrow by what it needs to do
        </summary>
        <div className="mt-3">
        <div className="flex flex-wrap gap-2">
          {functionalIn(category).map((f) => (
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
        </div>
      </details>

      {/* Step 2 — priorities */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle>What matters to you</SectionTitle>
        <p className="mb-3 text-xs leading-snug text-slate-500">
          Start from a question you care about, then tick the specific things we can actually
          check. Add <strong>must have</strong> to rule out options we have evidence against.
          Opening a question selects nothing on its own.
        </p>
        <div className="space-y-2">
          {motivationsIn(category).map((m) => (
            <MotivationSection
              key={m.id}
              m={m}
              category={category}
              priorities={priorities}
              requirements={requirements}
              onTogglePriority={(id) => toggle(priorities, setPriorities, id)}
              onToggleRequirement={(id) => toggle(requirements, setRequirements, id)}
            />
          ))}
        </div>
      </section>

      {/* Step 3 — results */}
      {started && (
        <section className="mt-6 space-y-6">
          <ResultSummary guidance={guidance} hasRequirements={result.hasRequirements} />

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
                  All {alternativesIn(category).length} options, with what we found for and against each on
                  what you picked.
                </>
              )}
            </p>
            <p className="mb-2 text-[11px] text-slate-400">Alphabetical within each group.</p>
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
                  <OutcomeCard
                    key={o.alternative.id}
                    o={o}
                    showRelationships={showRelationships}
                    plan={plans[o.alternative.id]}
                    onPlan={(p) => setPlan(o.alternative.id, p)}
                  />
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
                  <OutcomeCard
                    key={o.alternative.id}
                    o={o}
                    showRelationships={showRelationships}
                    plan={plans[o.alternative.id]}
                    onPlan={(p) => setPlan(o.alternative.id, p)}
                  />
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
                  <OutcomeCard
                    key={o.alternative.id}
                    o={o}
                    showRelationships={showRelationships}
                    plan={plans[o.alternative.id]}
                    onPlan={(p) => setPlan(o.alternative.id, p)}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-500">
            {alternativesIn(category).length} products in this category, researched most recently
            on {categoryDef.researched_on}. Cards show only the capabilities that differ from what
            every option here already does. Tags say a product does something, never how well —
            nothing here has been tested or compared for quality — and a tag we have not verified
            is simply absent rather than denied. An asterisk marks one confirmed only from
            secondary sources.{' '}
            <Link to="/about" className="text-teal-700 underline underline-offset-2">
              How this works
            </Link>
          </p>
        </section>
      )}

    </div>
  )
}
