import { getMaker, parentBucket } from '../lib/data'
import { DEEP_POCKET_BUCKETS, PARENT_COLORS, PARENT_LABELS } from '../lib/colors'
import type { Funder } from '../lib/types'
import { SectionTitle, Swatch } from './ui'

export function isDeepPocket(f: Funder): boolean {
  return DEEP_POCKET_BUCKETS.includes(parentBucket(f.parent_type))
}

/** Compact funder card used in the reverse-lookup funder picture. */
export function FunderCard({
  funder,
  ownsOutright,
  onOpen,
  highlightShared,
}: {
  funder: Funder
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
            onOpen ? 'hover:text-violet-700 hover:underline' : ''
          }`}
        >
          {funder.name}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {ownsOutright && (
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              owns outright
            </span>
          )}
          {deep && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
              deep-pocket
            </span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
        <Swatch color={PARENT_COLORS[bucket]} />
        {PARENT_LABELS[bucket]}
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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm leading-snug text-amber-900">
          <span className="font-bold">Why it matters: </span>
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
          <SectionTitle>Notable for (v1 — factual association, not a judgment)</SectionTitle>
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
          <p className="mt-1 text-[11px] italic text-slate-400">
            Stated as fact, neutral. The Capital Lens lets you decide what concerns you.
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
          <SectionTitle>
            Backs {backed.length} of the 18 makers{funder.owns_economically ? '' : ''}
          </SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {backed.map((id) => {
              const m = getMaker(id)
              const owns = (funder.owns_outright ?? []).includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={onOpenMaker ? () => onOpenMaker(id) : undefined}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    owns
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {m ? m.name : id}
                  {owns && ' (owns)'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {funder.owns_economically && funder.owns_economically.length > 0 && (
        <div>
          <SectionTitle>Owns economically (passive)</SectionTitle>
          <p className="text-sm leading-snug text-slate-700">
            {funder.owns_economically.join(', ')}
          </p>
          <p className="mt-1 text-xs italic text-slate-400">
            Passive index ownership — the deepest layer of public-market exposure.
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
