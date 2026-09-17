import { getMaker, parentBucket } from '../lib/data'
import { DEEP_POCKET_BUCKETS, PARENT_COLORS, PARENT_LABELS } from '../lib/colors'
import {
  associationsAreUnverified,
  relationshipFor,
  relationshipStatusLabels,
  relationshipTypeLabels,
} from '../lib/evidence'
import type { Funder, Relationship } from '../lib/types'
import { SectionTitle, Swatch } from './ui'

export function isDeepPocket(f: Funder): boolean {
  return DEEP_POCKET_BUCKETS.includes(parentBucket(f.parent_type))
}

const TYPE_SHORT: Record<Relationship['type'], string> = {
  outright_ownership: 'Owns outright',
  controlling_stake: 'Controlling stake',
  equity_investment: 'Equity stake',
  funding_commitment: 'Funding commitment',
  commercial_dependency: 'Investor & supplier',
  passive_economic: 'Passive index holding',
  unspecified: 'Stake type not recorded',
}

const STATUS_TONE: Record<Relationship['status'], string> = {
  completed: 'border-slate-300 bg-slate-100 text-slate-700',
  announced: 'border-amber-300 bg-amber-50 text-amber-800',
  pending: 'border-amber-300 bg-amber-50 text-amber-800',
  contingent: 'border-amber-300 bg-amber-50 text-amber-800',
  unspecified: 'border-dashed border-slate-300 bg-white text-slate-500',
}

/**
 * What a funder→maker line actually is. Without this, an announced commitment,
 * a supplier who also invested and outright ownership all read the same.
 */
export function RelationshipChips({
  funderName,
  makerId,
  ownsOutright,
}: {
  funderName: string
  makerId?: string
  ownsOutright?: boolean
}) {
  const rel = makerId ? relationshipFor(funderName, makerId) : undefined
  if (!rel) {
    if (ownsOutright) {
      return (
        <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
          owns outright
        </span>
      )
    }
    return (
      <span
        title="This dataset records that the funder backs this maker, but not what kind of stake it is."
        className="inline-flex items-center rounded border border-dashed border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
      >
        stake type not recorded
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        title={relationshipTypeLabels[rel.type]}
        className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
      >
        {TYPE_SHORT[rel.type]}
      </span>
      {rel.status !== 'completed' && (
        <span
          title={relationshipStatusLabels[rel.status]}
          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONE[rel.status]}`}
        >
          {rel.status}
        </span>
      )}
      {rel.voting === 'none_stated' && (
        <span
          title="The record states this holding carries no votes and no board seat."
          className="inline-flex items-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"
        >
          no votes
        </span>
      )}
      {rel.as_of && (
        <span className="text-[10px] text-slate-400">as of {rel.as_of}</span>
      )}
    </span>
  )
}

/** The quoted record behind a relationship, shown under the chips. */
export function RelationshipQuote({
  funderName,
  makerId,
}: {
  funderName: string
  makerId?: string
}) {
  const rel = makerId ? relationshipFor(funderName, makerId) : undefined
  if (!rel?.quote) return null
  return (
    <p className="mt-1 text-[11px] leading-snug text-slate-500">
      “{rel.quote}” <span className="text-slate-400">— {rel.quoted_from}</span>
    </p>
  )
}

/** Compact funder card used in the reverse-lookup funder picture. */
export function FunderCard({
  funder,
  makerId,
  ownsOutright,
  onOpen,
  highlightShared,
}: {
  funder: Funder
  makerId?: string
  ownsOutright?: boolean
  onOpen?: (name: string) => void
  highlightShared?: boolean
}) {
  const bucket = parentBucket(funder.parent_type)
  const deep = isDeepPocket(funder)
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlightShared ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen ? () => onOpen(funder.name) : undefined}
          className={`text-left font-semibold text-slate-800 ${
            onOpen ? 'hover:text-teal-700 hover:underline' : ''
          }`}
        >
          {funder.name}
        </button>
        {deep && (
          <span
            title="ValueCompass tag: a hyperscaler, sovereign fund or index manager — backers with balance sheets large enough to shape terms."
            className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700"
          >
            deep-pocket
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Swatch color={PARENT_COLORS[bucket]} />
        {PARENT_LABELS[bucket]}
      </div>
      <div className="mt-1.5">
        <RelationshipChips funderName={funder.name} makerId={makerId} ownsOutright={ownsOutright} />
        <RelationshipQuote funderName={funder.name} makerId={makerId} />
      </div>
      {funder.key_people && funder.key_people.length > 0 && (
        <p className="mt-1.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-500">People: </span>
          {funder.key_people.join(', ')}
        </p>
      )}
      {funder.also_funds && (
        <p className="mt-1 text-xs leading-snug text-slate-500">
          <span className="font-semibold">Also funds: </span>
          {funder.also_funds}
        </p>
      )}
    </div>
  )
}

/** Full funder detail — key_people, also_funds, rolled_up_vehicles, flag,
 *  and the makers it backs. Funders are context, never value-scored. */
export function FunderDetail({
  funder,
  onOpenMaker,
}: {
  funder: Funder
  onOpenMaker?: (id: string) => void
}) {
  const bucket = parentBucket(funder.parent_type)
  const backed = [
    ...(funder.makers_backed ?? []),
    ...(funder.owns_outright ?? []),
  ].filter((id, i, arr) => arr.indexOf(id) === i)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-sm">
          <Swatch color={PARENT_COLORS[bucket]} />
          <span className="font-medium text-slate-600">{PARENT_LABELS[bucket]}</span>
          {isDeepPocket(funder) && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
              deep-pocket strategic
            </span>
          )}
        </div>
        <p className="mt-1 text-xs italic text-slate-400">
          Funder node — context, not scored on the value axes.
        </p>
      </div>

      {funder.flag && (
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm leading-snug text-violet-900">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
            ValueCompass assessment — our reading, not a sourced fact
          </p>
          {funder.flag}
        </div>
      )}

      {funder.key_people && funder.key_people.length > 0 && (
        <div>
          <SectionTitle>Key people</SectionTitle>
          <p className="text-sm text-slate-700">{funder.key_people.join(', ')}</p>
        </div>
      )}

      {funder.also_funds && (
        <div>
          <SectionTitle>Also funds</SectionTitle>
          <p className="text-sm leading-snug text-slate-700">{funder.also_funds}</p>
        </div>
      )}

      {funder.notable_for && funder.notable_for.length > 0 && (
        <div>
          <SectionTitle>
            Notable for
            <span
              className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal ${
                associationsAreUnverified(funder)
                  ? 'border-dashed border-slate-400 bg-white text-slate-500'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
              }`}
            >
              {associationsAreUnverified(funder) ? 'Unverified' : 'Sourced'}
            </span>
          </SectionTitle>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-slate-700">
            {funder.notable_for.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          {funder.reputation_sources && funder.reputation_sources.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {funder.reputation_sources.map((s, i) => {
                let host = s
                try {
                  host = new URL(s).hostname.replace(/^www\./, '')
                } catch {
                  /* keep raw */
                }
                return (
                  <a
                    key={i}
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800"
                  >
                    {host} ↗
                  </a>
                )
              })}
            </div>
          )}
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {associationsAreUnverified(funder)
              ? 'No source on record for these associations. Treat them as leads for research, not as established fact.'
              : 'Recorded without a good-or-bad reading. Whether any of it concerns you is your call.'}
          </p>
        </div>
      )}

      {funder.rolled_up_vehicles && funder.rolled_up_vehicles.length > 0 && (
        <div>
          <SectionTitle>Rolled-up vehicles</SectionTitle>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {funder.rolled_up_vehicles.map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>
      )}

      {backed.length > 0 && (
        <div>
          <SectionTitle>Holds a stake in {backed.length} of the 18 makers</SectionTitle>
          <ul className="space-y-1.5">
            {backed.map((id) => {
              const m = getMaker(id)
              const owns = (funder.owns_outright ?? []).includes(id)
              return (
                <li key={id} className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenMaker ? () => onOpenMaker(id) : undefined}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {m ? m.name : id}
                  </button>
                  <RelationshipChips funderName={funder.name} makerId={id} ownsOutright={owns} />
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs leading-snug text-slate-500">
            A stake is not control, and it does not mean a share of what you pay for these products
            goes to this funder. Where this dataset does not record what kind of stake it is, the
            entry says so.
          </p>
        </div>
      )}

      {funder.owns_economically && funder.owns_economically.length > 0 && (
        <div>
          <SectionTitle>Owns economically (passive)</SectionTitle>
          <p className="text-sm leading-snug text-slate-700">
            {funder.owns_economically.join(', ')}
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-500">
            Index-fund ownership of these public companies. It is economic exposure exercised
            through routine governance votes — not a stake in any private maker, and not a claim on
            what you pay for their products.
          </p>
        </div>
      )}

      {funder.also_backs_outside_18 && funder.also_backs_outside_18.length > 0 && (
        <div>
          <SectionTitle>Also backs (outside the 18)</SectionTitle>
          <p className="text-sm leading-snug text-slate-600">
            {funder.also_backs_outside_18.join(', ')}
          </p>
        </div>
      )}

      {funder.portfolio_sources && funder.portfolio_sources.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {funder.portfolio_sources.map((s, i) => {
            let host = s
            try {
              host = new URL(s).hostname.replace(/^www\./, '')
            } catch {
              /* keep raw */
            }
            return (
              <a
                key={i}
                href={s}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800"
              >
                {host} ↗
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
