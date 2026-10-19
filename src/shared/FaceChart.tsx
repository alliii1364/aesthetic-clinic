import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { InjectionPoint } from '@/lib/types'
import { FACE_SITES } from '@/lib/face'
import { cn, EASE } from '@/ui/ui'

/**
 * Anatomical face chart. Practitioners tap a site to add units; previous-session points
 * render as hollow rings so dosing can be refined visit to visit.
 */
export function FaceChart({ points, onChange, previous, unit = 'u', step = 1, className, compact }: {
  points: InjectionPoint[]
  onChange?: (p: InjectionPoint[]) => void
  previous?: InjectionPoint[]
  unit?: string
  step?: number
  className?: string
  compact?: boolean
}) {
  const [active, setActive] = useState<string | null>(null)
  const editable = !!onChange
  const get = (id: string) => points.find((p) => p.id === id)
  const setUnits = (id: string, units: number) => {
    if (!onChange) return
    const site = FACE_SITES.find((s) => s.id === id)!
    const rest = points.filter((p) => p.id !== id)
    onChange(units > 0 ? [...rest, { id, region: site.region, x: site.x, y: site.y, units: Math.round(units * 10) / 10 }] : rest)
  }
  const total = points.reduce((a, p) => a + p.units, 0)
  const regions = Object.entries(points.reduce<Record<string, number>>((a, p) => { a[p.region] = (a[p.region] || 0) + p.units; return a }, {}))
  const activeSite = FACE_SITES.find((s) => s.id === active)

  return (
    <div className={cn('flex flex-col gap-6', !compact && 'md:flex-row', className)}>
      <div className="relative mx-auto w-full max-w-[340px] shrink-0">
        <svg viewBox="0 0 200 260" className="w-full" role="img" aria-label="Face treatment chart">
          <defs>
            <radialGradient id="skin" cx="50%" cy="40%" r="65%"><stop offset="0%" stopColor="#FBF6F0" /><stop offset="100%" stopColor="#F1E6DA" /></radialGradient>
          </defs>
          {/* head */}
          <path d="M100 18 C 52 18 34 58 36 104 C 37 140 44 170 60 198 C 72 220 86 240 100 242 C 114 240 128 220 140 198 C 156 170 163 140 164 104 C 166 58 148 18 100 18 Z" fill="url(#skin)" stroke="#D3CBBF" strokeWidth="1.2" />
          {/* ears */}
          <path d="M37 100 C 26 98 24 122 32 134 C 35 138 39 138 40 134" fill="none" stroke="#D3CBBF" strokeWidth="1.2" />
          <path d="M163 100 C 174 98 176 122 168 134 C 165 138 161 138 160 134" fill="none" stroke="#D3CBBF" strokeWidth="1.2" />
          {/* hairline */}
          <path d="M44 74 C 60 40 140 40 156 74" fill="none" stroke="#E4DED5" strokeWidth="1" strokeDasharray="2 3" />
          {/* brows */}
          <path d="M60 92 C 70 85 82 85 92 89" fill="none" stroke="#B3AA9D" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M108 89 C 118 85 130 85 140 92" fill="none" stroke="#B3AA9D" strokeWidth="1.6" strokeLinecap="round" />
          {/* eyes */}
          <path d="M64 106 C 70 100 82 100 88 106 C 82 110 70 110 64 106 Z" fill="none" stroke="#B3AA9D" strokeWidth="1.2" />
          <path d="M112 106 C 118 100 130 100 136 106 C 130 110 118 110 112 106 Z" fill="none" stroke="#B3AA9D" strokeWidth="1.2" />
          {/* nose */}
          <path d="M100 108 C 99 124 95 138 92 146 C 96 150 104 150 108 146 C 105 138 101 124 100 108" fill="none" stroke="#C9BFB3" strokeWidth="1.1" />
          {/* lips */}
          <path d="M84 188 C 92 182 97 184 100 186 C 103 184 108 182 116 188 C 108 194 92 194 84 188 Z" fill="#EAD3C6" stroke="#C9A99A" strokeWidth="1" />
          <path d="M84 188 C 92 200 108 200 116 188" fill="none" stroke="#C9A99A" strokeWidth="1" />
          {/* nasolabial guides */}
          <path d="M88 152 C 82 162 80 172 82 180" fill="none" stroke="#E4DED5" strokeWidth="1" />
          <path d="M112 152 C 118 162 120 172 118 180" fill="none" stroke="#E4DED5" strokeWidth="1" />

          {previous?.map((p) => <circle key={`prev-${p.id}`} cx={p.x} cy={p.y} r={7} fill="none" stroke="#A8642A" strokeOpacity="0.35" strokeDasharray="2 2" />)}

          {FACE_SITES.map((s) => {
            const p = get(s.id)
            if (!editable && !p) return null
            const on = active === s.id
            return (
              <g key={s.id} onClick={() => editable && (setActive(s.id), !p && setUnits(s.id, s.defaultUnits || step))} className={editable ? 'cursor-pointer' : ''}>
                <circle cx={s.x} cy={s.y} r={11} fill="transparent" />
                {p ? (
                  <motion.g initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 22 }} style={{ originX: `${s.x}px`, originY: `${s.y}px` }}>
                    <circle cx={s.x} cy={s.y} r={on ? 8.5 : 7} fill="#A8642A" stroke="#fff" strokeWidth={1.5} />
                    <text x={s.x} y={s.y + 2.6} textAnchor="middle" fontSize="6.6" fontWeight="600" fill="#fff" className="pointer-events-none select-none">{p.units}</text>
                  </motion.g>
                ) : (
                  <circle cx={s.x} cy={s.y} r={3.2} fill="#fff" stroke="#B3AA9D" strokeWidth={1} className="transition-all hover:stroke-ink" />
                )}
              </g>
            )
          })}
        </svg>
        <AnimatePresence>
          {editable && activeSite && (
            <motion.div key={activeSite.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.25, ease: EASE }}
              className="absolute left-1/2 top-full z-10 mt-2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-stone-200 bg-white px-2 py-1.5 shadow-lift">
              <span className="pl-2 text-[12px] text-stone-600">{activeSite.label}</span>
              <button className="grid h-7 w-7 place-items-center rounded-full bg-cream hover:bg-sand" onClick={() => setUnits(activeSite.id, (get(activeSite.id)?.units ?? 0) - step)} aria-label="Decrease"><Minus size={13} /></button>
              <span className="w-10 text-center text-[13px] font-medium tabular-nums">{get(activeSite.id)?.units ?? 0}{unit}</span>
              <button className="grid h-7 w-7 place-items-center rounded-full bg-cream hover:bg-sand" onClick={() => setUnits(activeSite.id, (get(activeSite.id)?.units ?? 0) + step)} aria-label="Increase"><Plus size={13} /></button>
              <button className="grid h-7 w-7 place-items-center rounded-full text-stone-400 hover:text-rose-500" onClick={() => { setUnits(activeSite.id, 0); setActive(null) }} aria-label="Remove"><Trash2 size={13} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-[180px] flex-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Treatment map</div>
        <div className="mt-2 font-display text-[40px] leading-none text-ink">{Math.round(total * 10) / 10}<span className="ml-1 font-sans text-sm text-stone-500">{unit === 'u' ? 'units total' : `${unit} total`}</span></div>
        <div className="mt-4 divide-y divide-stone-100">
          {regions.length ? regions.map(([r, u]) => (
            <div key={r} className="py-2 text-[13px]">
              <div className="flex justify-between"><span className="text-stone-600">{r}</span><span className="tabular-nums text-ink">{Math.round(u * 10) / 10}{unit}</span></div>
              <div className="mt-0.5 text-[11.5px] text-stone-400">{points.filter((p) => p.region === r).map((p) => `${FACE_SITES.find((s) => s.id === p.id)?.label.split('· ')[1] ?? p.id}: ${p.units}`).join(' · ')}</div>
            </div>
          )) : <p className="py-3 text-[13px] text-stone-500">{editable ? 'Tap a point on the face to chart units.' : 'No points recorded.'}</p>}
        </div>
        {previous && previous.length > 0 && <div className="mt-3 flex items-center gap-2 text-[11.5px] text-stone-500"><span className="h-3 w-3 rounded-full border border-dashed border-bronze-500/60" />Previous session · {previous.reduce((a, p) => a + p.units, 0)}{unit}</div>}
      </div>
    </div>
  )
}
