import { backersFor } from '../lib/data'
import { TIER_COLORS, TIER_LABELS } from '../lib/colors'
import { makerCoverage } from '../lib/evidence'
import type { Maker } from '../lib/types'
import { AxisDetail } from './AxisDetail'
import { ConfidenceLegend } from './ConfidenceBadge'
import { EvidenceLegend } from './EvidenceBadge'
import { FunderCard, isDeepPocket } from './FunderCard'
import { PolarityLegend } from './PolarityLegend'
import { Chip, SectionTitle, Tag } from './ui'
import { ValueRadar } from './ValueRadar'
import { CapitalLensPanel } from './CapitalLensPanel'
import { BackerReputation, CapitalFitBadge, CapitalProfileCard } from './CapitalProfile'

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
  const cov = makerCoverage(maker)

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

      {/* Radar */}
      <div>
        <SectionTitle>Value Compass</SectionTitle>
        <PolarityLegend className="mb-2" />
        {cov.total - cov.notEstablished < 3 && (
          <p className="mb-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs leading-snug text-slate-600">
            Only {cov.total - cov.notEstablished} of {cov.total} axes have a score to show for{' '}
            {maker.name}, so there is no meaningful shape here. What is known is in the axis list
            below; the rest is simply not published.
          </p>
        )}
        <ValueRadar series={[{ maker, color: TIER_COLORS[maker.tier] }]} height={300} />
        <div className="mt-1 space-y-1.5">
          <EvidenceLegend />
          <ConfidenceLegend />
        </div>
      </div>

      {/* Axis breakdown */}
      <div>
        <SectionTitle>Axis-by-axis</SectionTitle>
        <p className="mb-2 text-xs leading-snug text-slate-500">
          Of the {cov.total} axis assessments for {maker.name},{' '}
          <span className="font-semibold text-slate-700">{cov.sourced}</span> carry a source about{' '}
          {maker.name}, <span className="font-semibold text-slate-700">{cov.unsourced}</span> have no
          source attached yet,{' '}
          <span className="font-semibold text-slate-700">{cov.contextual}</span> reason from context,
          and <span className="font-semibold text-slate-700">{cov.notEstablished}</span> rest only on
          what has not been published — so no score is shown for those.
        </p>
        <AxisDetail maker={maker} />
      </div>

      {/* Funder picture */}
      <div>
        <SectionTitle>
          Funder picture — who holds a stake in {maker.name} ({backers.length})
        </SectionTitle>
        {sortedBackers.length > 0 ? (
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
        ) : (
          <p className="text-sm italic text-slate-400">
            No funder node in the dataset backs this maker (boutique/single-maker backers are
            edge-only and not modeled as nodes).
          </p>
        )}
      </div>

      {/* Capital character — deliberately separate from the conduct radar.
          Factual profile (neutral) + the user-configurable Capital Lens. */}
      {maker.capital_profile && (
        <div className="rounded-xl border-2 border-dashed border-teal-200 bg-teal-50/30 p-4">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-teal-800">
              Capital character
            </h3>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-700">
              your priorities · not a 6th score
            </span>
          </div>
          <p className="mb-3 text-xs leading-snug text-teal-700">
            Where the money comes from, kept separate from the five scored axes above. The facts are
            the same for everyone; which of them count as concerns is yours to set.
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CapitalLensPanel compact />
            <CapitalFitBadge maker={maker} onOpenFunder={onOpenFunder} />
          </div>
          <div className="mt-3">
            <SectionTitle>Factual capital profile</SectionTitle>
            <CapitalProfileCard maker={maker} />
          </div>
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
