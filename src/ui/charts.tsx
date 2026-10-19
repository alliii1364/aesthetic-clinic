import { useMemo, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { EASE, cn } from './ui'

// Validated categorical palette (light surface): bronze, blue, rose, violet — fixed order, never cycled.
export const CAT = ['#A8642A', '#2E7CC0', '#C2577A', '#6A4FA8'] as const
const GRID = '#ECE7DF'
const AXIS = '#8C847A'

const niceMax = (v: number) => {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

const useWidth = () => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(600)
  const ro = useMemo(() => (typeof ResizeObserver !== 'undefined' ? new ResizeObserver((e) => setW(e[0].contentRect.width)) : null), [])
  const setRef = (el: HTMLDivElement | null) => {
    if (ref.current && ro) ro.unobserve(ref.current)
    ref.current = el
    if (el && ro) { ro.observe(el); setW(el.getBoundingClientRect().width) }
  }
  return [setRef, w] as const
}

const Tooltip = ({ x, y, children, width }: { x: number; y: number; children: ReactNode; width: number }) => (
  <div className="pointer-events-none absolute z-10 rounded-xl border border-stone-200/80 bg-white/95 px-3 py-2 text-xs shadow-lift"
    style={{ left: Math.min(Math.max(x, 70), width - 70), top: y, transform: 'translate(-50%, calc(-100% - 10px))' }}>
    {children}
  </div>
)

export interface Series { name: string; values: number[]; color?: string; dashed?: boolean }

/** Area/line chart on one shared y-scale, with crosshair + tooltip. */
export function LineChart({ labels, series, height = 220, format = (n: number) => n.toLocaleString(), area = true }: { labels: string[]; series: Series[]; height?: number; format?: (n: number) => string; area?: boolean }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 48, r: 12, t: 12, b: 26 }
  const iw = Math.max(10, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0))
  const x = (i: number) => pad.l + (labels.length <= 1 ? iw / 2 : (i / (labels.length - 1)) * iw)
  const y = (v: number) => pad.t + ih - (v / max) * ih
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max)
  const every = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 70)))
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible"
        onMouseMove={(e) => { const r = (e.currentTarget as SVGElement).getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (labels.length - 1)); setHover(Math.max(0, Math.min(labels.length - 1, i))) }}
        onMouseLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.name).join(', ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeDasharray={t === 0 ? undefined : '2 4'} />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill={AXIS} className="tabular-nums">{format(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => i % every === 0 && <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10.5" fill={AXIS}>{l}</text>)}
        {series.map((s, si) => {
          const c = s.color ?? CAT[si]
          return (
            <g key={s.name}>
              {area && si === 0 && (
                <>
                  <defs>
                    <linearGradient id={`g-${s.name.replace(/\W/g, '')}`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity="0.16" />
                      <stop offset="100%" stopColor={c} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <motion.path key={`a${labels.length}${s.values.join()}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }}
                    d={`${path(s.values)} L${x(s.values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#g-${s.name.replace(/\W/g, '')})`} />
                </>
              )}
              <motion.path key={`l${labels.length}${s.values.join()}`} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease: EASE }}
                d={path(s.values)} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 4' : undefined} />
            </g>
          )
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="#B3AA9D" strokeDasharray="3 3" />
            {series.map((s, si) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color ?? CAT[si]} stroke="#fff" strokeWidth={2} />)}
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={Math.min(...series.map((s) => y(s.values[hover])))} width={width}>
          <div className="mb-1 font-medium text-ink">{labels[hover]}</div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-2 text-stone-600">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color ?? CAT[si] }} />
              <span>{s.name}</span>
              <span className="ml-auto pl-3 font-medium tabular-nums text-ink">{format(s.values[hover])}</span>
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  )
}

/** Vertical bars, rounded data-ends, 2px gaps, per-bar tooltip. */
export function BarChart({ labels, values, height = 200, format = (n: number) => n.toLocaleString(), color = CAT[0], highlight }: { labels: string[]; values: number[]; height?: number; format?: (n: number) => string; color?: string; highlight?: number }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { l: 44, r: 8, t: 10, b: 24 }
  const iw = Math.max(10, width - pad.l - pad.r)
  const ih = height - pad.t - pad.b
  const max = niceMax(Math.max(...values, 0))
  const bw = iw / Math.max(1, values.length)
  const barW = Math.max(3, Math.min(28, bw - 6))
  const every = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 44)))
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={width} height={height} role="img">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={pad.t + ih - t * ih} y2={pad.t + ih - t * ih} stroke={GRID} strokeDasharray={t ? '2 4' : undefined} />
            <text x={pad.l - 8} y={pad.t + ih - t * ih + 4} textAnchor="end" fontSize="10.5" fill={AXIS}>{format(t * max)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const h = (v / max) * ih
          const cx = pad.l + i * bw + bw / 2
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              <motion.path
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, ease: EASE, delay: i * 0.02 }} style={{ originY: 1, transformBox: 'fill-box' }}
                d={roundedTop(cx - barW / 2, pad.t + ih - h, barW, h, Math.min(4, barW / 2))}
                fill={color} opacity={hover === null ? (highlight === undefined || highlight === i ? 1 : 0.45) : hover === i ? 1 : 0.45}
              />
              {i % every === 0 && <text x={cx} y={height - 6} textAnchor="middle" fontSize="10.5" fill={AXIS}>{labels[i]}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={pad.l + hover * bw + bw / 2} y={pad.t + ih - (values[hover] / max) * ih} width={width}>
          <div className="font-medium text-ink">{labels[hover]}</div>
          <div className="tabular-nums text-stone-600">{format(values[hover])}</div>
        </Tooltip>
      )}
    </div>
  )
}

const roundedTop = (x: number, y: number, w: number, h: number, r: number) => {
  if (h <= 0) return ''
  const rr = Math.min(r, h)
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

/** Ranked horizontal bars — labels and values in text ink, bar carries magnitude. */
export function HBars({ rows, format = (n: number) => n.toLocaleString(), color = CAT[0] }: { rows: { label: ReactNode; value: number; sub?: ReactNode }[]; format?: (n: number) => string; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-3.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-stone-700">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">{format(r.value)}{r.sub && <span className="ml-1.5 text-stone-400">{r.sub}</span>}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/60">
            <motion.div initial={{ x: '-100%' }} whileInView={{ x: `${(r.value / max) * 100 - 100}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE, delay: i * 0.05 }} className="h-full w-full rounded-full" style={{ background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Donut for part-to-whole with ≤4 slices + "Other"; legend always present. */
export function Donut({ data, size = 150, format = (n: number) => n.toLocaleString(), center }: { data: { label: string; value: number }[]; size?: number; format?: (n: number) => string; center?: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null)
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const slices = sorted.length > 4 ? [...sorted.slice(0, 3), { label: 'Other', value: sorted.slice(3).reduce((a, d) => a + d.value, 0) }] : sorted
  const total = slices.reduce((a, d) => a + d.value, 0) || 1
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  let acc = 0
  const color = (i: number, label: string) => (label === 'Other' ? '#B3AA9D' : CAT[i])
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {slices.map((d, i) => {
            const len = (d.value / total) * c
            const gap = slices.length > 1 ? 2 : 0
            const el = (
              <motion.circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color(i, d.label)} strokeWidth={hover === i ? 16 : 13}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-acc}
                initial={{ opacity: 0 }} animate={{ opacity: hover === null || hover === i ? 1 : 0.4 }} transition={{ duration: 0.6, delay: i * 0.08 }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transition: 'stroke-width .3s' }} />
            )
            acc += len
            return el
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          {hover !== null ? (
            <div><div className="text-sm font-medium tabular-nums text-ink">{format(slices[hover].value)}</div><div className="text-[11px] text-stone-500">{Math.round((slices[hover].value / total) * 100)}%</div></div>
          ) : center}
        </div>
      </div>
      <div className="min-w-[140px] flex-1 space-y-2">
        {slices.map((d, i) => (
          <div key={d.label} className={cn('flex items-center gap-2.5 text-[13px] transition-opacity', hover !== null && hover !== i && 'opacity-50')} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color(i, d.label) }} />
            <span className="text-stone-700">{d.label}</span>
            <span className="ml-auto tabular-nums text-ink">{format(d.value)}</span>
            <span className="w-9 text-right tabular-nums text-stone-400">{Math.round((d.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ values, width = 96, height = 28, color = CAT[0] }: { values: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * width},${height - 2 - ((v - min) / (max - min || 1)) * (height - 4)}`).join(' ')
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const Legend = ({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) => (
  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
    {items.map((i) => (
      <span key={i.label} className="flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color }} />
        {i.label}
      </span>
    ))}
  </div>
)
