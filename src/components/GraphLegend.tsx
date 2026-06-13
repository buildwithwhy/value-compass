import {
  PARENT_COLORS,
  PARENT_LABELS,
  TIER_COLORS,
  TIER_LABELS,
} from '../lib/colors'
import { allParentBuckets } from '../lib/data'
import type { Tier } from '../lib/types'
import { Swatch } from './ui'

export function GraphLegend() {
  const buckets = allParentBuckets()
  return (
    <div className="space-y-2 text-xs">
      <div>
        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">Makers (by tier)</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(TIER_COLORS) as Tier[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-slate-600">
              <Swatch color={TIER_COLORS[t]} />
              {TIER_LABELS[t]}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">
          Funders (by parent type)
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {buckets.map((b) => (
            <span key={b} className="inline-flex items-center gap-1.5 text-slate-600">
              <Swatch color={PARENT_COLORS[b]} />
              {PARENT_LABELS[b]}
            </span>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1 font-bold uppercase tracking-wider text-slate-500">Edges & marks</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line x1="0" y1="4" x2="22" y2="4" stroke="#94a3b8" strokeWidth="1.5" />
            </svg>
            backs
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="22"
                y2="4"
                stroke="#334155"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
            </svg>
            owns outright
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="22"
                y2="4"
                stroke="#a8a29e"
                strokeWidth="1"
                strokeDasharray="1 3"
              />
            </svg>
            owns economically (passive)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="22"
                y2="4"
                stroke="#db2777"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            </svg>
            same entity
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" aria-hidden>
              <circle cx="7" cy="7" r="5" fill="#cbd5e1" stroke="#db2777" strokeWidth="2" />
            </svg>
            dual-role ring
          </span>
        </div>
      </div>
    </div>
  )
}
