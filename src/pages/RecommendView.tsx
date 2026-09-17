import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  alternatives,
  criteria,
  criterionIsAssessable,
  functionalRequirements,
  pilotCategory,
  pilotMeta,
  recommend,
  type AlternativeOutcome,
  type CriterionOutcome,
} from '../lib/recommend'
import { SectionTitle } from '../components/ui'

// ---------------------------------------------------------------------------
// Recommendation preview. One category, six researched alternatives.
//
// It shows what the evidence can and cannot support. There is no overall
// score, no ranking number, and an unconfirmed option is presented as a real
// third state rather than as a soft rejection.
// ---------------------------------------------------------------------------

const STATUS_TONE: Record<string, string> = {
  in_force: 'border-slate-300 bg-slate-100 text-slate-700',
  proposed: 'border-amber-300 bg-amber-50 text-amber-800',
  withdrawn: 'border-rose-300 bg-rose-50 text-rose-800',
}

function EvidenceRow({ row }: { row: CriterionOutcome }) {
  const a = row.assessment
  return (
    <li className="rounded-md border border-slate-200 bg-white p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">{row.criterion.label}</span>
        <span className="flex items-center gap-1.5">
          {row.weight === 'requirement' && (
            <span className="rounded-full border border-teal-300 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">
              requirement
            </span>
          )}
          {a && (
            <span
              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                STATUS_TONE[a.status] ?? STATUS_TONE.in_force
              }`}
            >
              {a.status.replace('_', ' ')}
            </span>
          )}
        </span>
      </div>
      {a ? (
        <>
          <p className="mt-1 text-xs leading-snug text-slate-700">{a.claim}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {a.claim_type.replace(/_/g, ' ')} · {a.source}
            {a.source_date && ` · ${a.source_date}`}
          </p>
          {a.scope && (
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
              <span className="font-semibold">Scope:</span> {a.scope}
            </p>
          )}
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            <span className="font-semibold">Uncertainty:</span> {a.uncertainty}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Automated and provisional — not human-reviewed.
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs leading-snug text-slate-500">
          No eligible finding either way. This counts neither for nor against.
        </p>
      )}
    </li>
  )
}

function OutcomeCard({ o }: { o: AlternativeOutcome }) {
  const border =
    o.bucket === 'confirmed_match'
      ? 'border-emerald-300'
      : o.bucket === 'excluded'
        ? 'border-rose-300'
        : 'border-slate-300'
  return (
    <div className={`rounded-xl border-2 bg-white p-4 ${border}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{o.alternative.product}</h3>
        <Link
          to={`/maker/${encodeURIComponent(o.alternative.provider_maker_id)}`}
          className="text-xs text-teal-700 hover:underline"
        >
          {o.alternative.provider_maker_id} ↗
        </Link>
      </div>
      <p className="mt-1 text-xs leading-snug text-slate-600">{o.alternative.identity_note}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        Identity: {o.alternative.identity_status.replace(/_/g, ' ')} · {o.alternative.identity_source}
      </p>

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
            Evidenced not to meet a requirement
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
            Meets your requirements
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
            Matches what you said matters
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
            Trade-off — evidenced not to match a preference
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
            Unresolved — what we would need to find out
          </p>
          <ul className="space-y-1.5">
            {o.unresolved.map((r) => (
              <EvidenceRow key={r.criterion.id} row={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RecommendView() {
  const [functional, setFunctional] = useState<string[]>(['fr_general_chat'])
  const [priorities, setPriorities] = useState<string[]>([])
  const [requirements, setRequirements] = useState<string[]>([])

  const result = useMemo(
    () => recommend({ functional, priorities, requirements }),
    [functional, priorities, requirements],
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
        {pilotCategory.definition} Six alternatives were researched on{' '}
        {pilotMeta.researched_on}. There is no overall score here: the preview tells you what the
        evidence supports, what it cannot answer, and what you would be deciding blind.
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
          Functional checks are light and we are honest about it: where a product's capability was
          taken from our older records rather than confirmed from the provider, it reads as unknown,
          not as a pass.
        </p>
      </section>

      {/* Step 2 — priorities */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <SectionTitle>2 · What matters to you</SectionTitle>
        <p className="mb-3 text-xs leading-snug text-slate-500">
          These are preferences. They explain and order — they never rule an option out. Tick
          <em> requirement</em> only if you want an option ruled out when the evidence shows it does
          not meet that criterion. That box is available only where the evidence can actually decide.
        </p>
        <ul className="space-y-2">
          {criteria.map((c) => {
            const on = priorities.includes(c.id)
            const assessable = criterionIsAssessable(c.id)
            return (
              <li
                key={c.id}
                className={`rounded-lg border p-3 ${on ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(priorities, setPriorities, c.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-semibold text-slate-800">{c.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-600">
                        {c.concept}
                      </span>
                      {c.distinct_from && (
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                          Not the same as: {c.distinct_from}
                        </span>
                      )}
                      {!c.supported && c.unsupported_note && (
                        <span className="mt-1 block rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-900">
                          {c.unsupported_note}
                        </span>
                      )}
                    </span>
                  </label>
                  {on && (
                    <label
                      className={`flex shrink-0 items-center gap-1.5 text-xs ${
                        assessable ? 'cursor-pointer text-slate-700' : 'cursor-not-allowed text-slate-400'
                      }`}
                      title={
                        assessable
                          ? 'Rule out options the evidence shows do not meet this.'
                          : 'Not available: no alternative has an eligible finding on this criterion, so it cannot decide anything.'
                      }
                    >
                      <input
                        type="checkbox"
                        disabled={!assessable}
                        checked={requirements.includes(c.id)}
                        onChange={() => toggle(requirements, setRequirements, c.id)}
                      />
                      requirement
                    </label>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Step 3 — results */}
      {started && (
        <section className="mt-6 space-y-6">
          {result.blindCriteria.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                We cannot assess {result.blindCriteria.length} of the things you picked
              </p>
              <p className="mt-1 text-xs leading-snug text-amber-800">
                {result.blindCriteria.map((c) => c.label).join(', ')} — no alternative has an
                eligible finding, so these cannot separate anyone. Leaving them ticked changes
                nothing; we show them so it is clear they are unanswered rather than silently
                ignored.
              </p>
            </div>
          )}

          <div>
            <SectionTitle>
              Confirmed matches ({result.confirmed.length})
            </SectionTitle>
            {result.noConfirmedMatch ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-5">
                <p className="text-sm font-semibold text-slate-800">
                  No confirmed match among the researched options
                </p>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600">
                  None of the six can be confirmed against everything you asked for. That is a
                  statement about our evidence, not about the products: it does not establish that
                  no product meets your needs, and it is not a promise that more research would
                  find one. The options below are still worth reading — each shows exactly which
                  requirement is unresolved.
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

          {result.potential.length > 0 && (
            <div>
              <SectionTitle>
                Potentially relevant, with unresolved requirements ({result.potential.length})
              </SectionTitle>
              <p className="mb-2 max-w-3xl text-xs leading-snug text-slate-500">
                Not shortlisted and not ruled out. Each is missing a finding we would need before
                saying either way.
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.potential.map((o) => (
                  <OutcomeCard key={o.alternative.id} o={o} />
                ))}
              </div>
            </div>
          )}

          {result.excluded.length > 0 && (
            <div>
              <SectionTitle>Ruled out on evidence ({result.excluded.length})</SectionTitle>
              <p className="mb-2 max-w-3xl text-xs leading-snug text-slate-500">
                Excluded because a finding shows they do not meet something you made a requirement —
                never because a finding is missing.
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {result.excluded.map((o) => (
                  <OutcomeCard key={o.alternative.id} o={o} />
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-500">
            This preview covers {alternatives.length} products in one category and does not assess
            capability. Every finding is automated and provisional. See the{' '}
            <Link to="/about" className="text-teal-700 underline underline-offset-2">
              methodology
            </Link>{' '}
            for how evidence qualifies to drive a decision.
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
