import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { AXIS_KEYS, AXIS_LABELS, AXIS_SHORT, numericScore } from '../lib/data'
import { CONFIDENCE_STYLE } from '../lib/colors'
import type { AxisKey, Confidence, Maker } from '../lib/types'
import { makersMeta } from '../lib/data'

export interface RadarSeries {
  maker: Maker
  color: string
}

interface RadarRow {
  axis: string
  axisKey: AxisKey
  [seriesKey: string]: string | number | null
}

// Custom vertex dot whose style encodes confidence (A solid, B mid, C hollow).
function makeDot(maker: Maker, color: string) {
  return (props: any) => {
    const { cx, cy, payload } = props
    if (cx == null || cy == null || !payload) return <g />
    const axisKey = payload.axisKey as AxisKey
    const axis = maker.axes[axisKey]
    if (!axis || numericScore(axis.score) == null) return <g /> // n/a → no dot (gap)
    const conf = axis.confidence as Confidence
    const style = CONFIDENCE_STYLE[conf]
    const r = 4
    if (style.hollow) {
      return <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={color} strokeWidth={2} strokeDasharray="2 1.5" />
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={conf === 'B' ? 0.6 : 1}
        stroke={color}
        strokeWidth={1.5}
      />
    )
  }
}

function CustomTooltip({ active, payload, scale }: any) {
  if (!active || !payload || !payload.length) return null
  const row = payload[0]?.payload as RadarRow | undefined
  if (!row) return null
  const axisKey = row.axisKey
  return (
    <div className="max-w-xs rounded-md border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-slate-800">{AXIS_LABELS[axisKey]}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value ?? 'n/a'}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-slate-100 pt-1.5 text-[11px] leading-snug text-slate-500">
        {Object.entries(scale).map(([k, v]) => (
          <div key={k}>
            <span className="font-semibold text-slate-600">{k}</span> — {v as string}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Value Compass radar. Higher = better (a larger polygon = a better-scoring
 * actor). Renders one polygon per series; n/a scores become gaps (never 0).
 */
export function ValueRadar({
  series,
  height = 320,
}: {
  series: RadarSeries[]
  height?: number
}) {
  const data: RadarRow[] = AXIS_KEYS.map((key) => {
    const row: RadarRow = { axis: AXIS_SHORT[key], axisKey: key }
    for (const s of series) {
      const v = numericScore(s.maker.axes[key]?.score)
      row[s.maker.id] = v // null for n/a → gap
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#475569' }} />
        <PolarRadiusAxis
          domain={[0, 4]}
          tickCount={5}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
        />
        {series.map((s) => (
          <Radar
            key={s.maker.id}
            name={s.maker.name}
            dataKey={s.maker.id}
            stroke={s.color}
            strokeWidth={2}
            fill={s.color}
            fillOpacity={series.length > 1 ? 0.12 : 0.25}
            connectNulls={false}
            dot={makeDot(s.maker, s.color)}
            isAnimationActive={false}
          />
        ))}
        <Tooltip content={<CustomTooltip scale={makersMeta.scale} />} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
