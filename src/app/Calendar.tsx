import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Filter, X } from 'lucide-react'
import { useDB, useStore, useCan, useMe, useVisibleLocations, patientName, treatmentName, staffName, roomName } from '@/store/store'
import type { Appointment, AppointmentStatus, ID } from '@/lib/types'
import { Button, Segmented, Select, STATUS_BAR, EASE, cn, PageHeader } from '@/ui/ui'
import { addDays, fmtTime, sameDay, startOfDay, startOfWeek } from '@/lib/format'
import { AppointmentDrawer } from './AppointmentDrawer'
import { NewAppointmentModal } from './QuickCreate'

const VIEWS = ['Day', 'Week', 'Month', 'Practitioner', 'Room', 'Location'] as const
type View = (typeof VIEWS)[number]
const START_H = 8
const END_H = 20
const HOUR = 64
const STATUSES: AppointmentStatus[] = ['Requested', 'Confirmed', 'Checked In', 'In Treatment', 'Completed', 'Cancelled', 'No Show']

interface Column { key: string; label: string; sub?: string; day: Date; practitionerId?: ID; roomId?: ID; locationId?: ID; avatar?: string; color?: string }

export default function CalendarPage() {
  const db = useDB()
  const me = useMe()
  const can = useCan()
  const visible = useVisibleLocations()
  const move = useStore((s) => s.moveAppointment)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<View>(() => (typeof window !== 'undefined' && window.innerWidth < 900 ? 'Day' : 'Practitioner'))
  const [date, setDate] = useState(() => startOfDay(params.get('date') ? new Date(params.get('date') + 'T00:00') : new Date()))
  const [selected, setSelected] = useState<ID | null>(params.get('appt'))
  const [showFilters, setShowFilters] = useState(false)
  const ownOnly = !can('calendar.manage') && can('calendar.own')
  const [f, setF] = useState({ practitioner: ownOnly ? me.id : '', service: '', room: '', status: '' })
  const [newAt, setNewAt] = useState<{ start: string; practitionerId?: ID; locationId?: ID } | null>(null)
  const [dragId, setDragId] = useState<ID | null>(null)
  const scrollRef = useScrollToNow()
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t) }, [])
  useEffect(() => { const a = params.get('appt'); if (a) setSelected(a) }, [params])

  const practitioners = db.staff.filter((s) => s.bookable && s.active && s.locationIds.some((l) => visible.includes(l)))
  const rooms = db.locations.filter((l) => visible.includes(l.id)).flatMap((l) => l.rooms.map((r) => ({ ...r, locationId: l.id, locationName: l.name })))

  const appts = useMemo(() => db.appointments.filter((a) => visible.includes(a.locationId)
    && (!f.practitioner || a.practitionerId === f.practitioner) && (!f.service || a.treatmentId === f.service)
    && (!f.room || a.roomId === f.room) && (!f.status || a.status === f.status)), [db.appointments, visible, f])

  const columns: Column[] = useMemo(() => {
    if (view === 'Week') return Array.from({ length: 7 }, (_, i) => { const d = addDays(startOfWeek(date), i); return { key: d.toISOString(), label: d.toLocaleDateString('en-US', { weekday: 'short' }), sub: String(d.getDate()), day: d } })
    if (view === 'Practitioner') return practitioners.filter((p) => !f.practitioner || p.id === f.practitioner).map((p) => ({ key: p.id, label: p.name, sub: p.title, day: date, practitionerId: p.id, avatar: p.avatar, color: p.color }))
    if (view === 'Room') return rooms.filter((r) => !f.room || r.id === f.room).map((r) => ({ key: r.id, label: r.name, sub: `${r.locationName} · ${r.kind}`, day: date, roomId: r.id, locationId: r.locationId }))
    if (view === 'Location') return db.locations.filter((l) => visible.includes(l.id)).map((l) => ({ key: l.id, label: l.name, sub: `${l.rooms.length} rooms`, day: date, locationId: l.id }))
    return [{ key: 'day', label: date.toLocaleDateString('en-US', { weekday: 'long' }), sub: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }), day: date }]
  }, [view, date, practitioners, rooms, db.locations, visible, f.practitioner, f.room])

  const inColumn = (a: Appointment, c: Column) => sameDay(a.start, c.day) && (!c.practitionerId || a.practitionerId === c.practitionerId) && (!c.roomId || a.roomId === c.roomId) && (!c.locationId || a.locationId === c.locationId)

  const step = (dir: number) => setDate((d) => (view === 'Month' ? new Date(d.getFullYear(), d.getMonth() + dir, 1) : addDays(d, dir * (view === 'Week' ? 7 : 1))))
  const title = view === 'Month' ? date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : view === 'Week' ? `${startOfWeek(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${addDays(startOfWeek(date), 6).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const onDrop = (e: React.DragEvent, c: Column) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/appt')
    const a = db.appointments.find((x) => x.id === id)
    setDragId(null)
    if (!a) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mins = Math.max(0, Math.round(((e.clientY - rect.top) / HOUR) * 60 / 15) * 15)
    const start = new Date(c.day); start.setHours(START_H, 0, 0, 0); start.setMinutes(start.getMinutes() + mins)
    if (start.toISOString() === a.start && (!c.practitionerId || c.practitionerId === a.practitionerId) && (!c.roomId || c.roomId === a.roomId)) return
    move(a.id, start.toISOString(), c.practitionerId, c.roomId)
  }
  const onEmptyClick = (e: React.MouseEvent, c: Column) => {
    if (!can('calendar.manage')) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const mins = Math.floor(((e.clientY - rect.top) / HOUR) * 60 / 30) * 30
    const start = new Date(c.day); start.setHours(START_H, 0, 0, 0); start.setMinutes(mins)
    setNewAt({ start: start.toISOString(), practitionerId: c.practitionerId, locationId: c.locationId ?? (c.practitionerId ? db.staff.find((s) => s.id === c.practitionerId)?.locationIds.find((l) => visible.includes(l)) : undefined) })
  }
  const activeFilters = Object.entries(f).filter(([k, v]) => v && !(ownOnly && k === 'practitioner'))
  const dayAppts = appts.filter((a) => sameDay(a.start, date) && a.status !== 'Cancelled')

  return (
    <div>
      <PageHeader title="Calendar" subtitle={`${dayAppts.length} appointments on ${date.toLocaleDateString('en-US', { weekday: 'long' })}${ownOnly ? ' · your schedule' : ''}`}
        actions={<><Segmented options={VIEWS} value={view} onChange={setView} id="cal-view" size="sm" /></>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white hover:border-stone-300" aria-label="Previous"><ChevronLeft size={16} /></button>
          <button onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white hover:border-stone-300" aria-label="Next"><ChevronRight size={16} /></button>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setDate(startOfDay())}>Today</Button>
        <AnimatePresence mode="wait"><motion.div key={title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }} className="ml-2 font-display text-[22px] text-ink">{title}</motion.div></AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          <AnimatePresence>
            {activeFilters.map(([k, v]) => (
              <motion.button key={k} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={() => setF({ ...f, [k]: '' })} className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] text-ivory">
                {k === 'practitioner' ? staffName(db, v) : k === 'service' ? treatmentName(db, v) : k === 'room' ? roomName(db, v) : v}<X size={12} />
              </motion.button>
            ))}
          </AnimatePresence>
          <Button size="sm" variant={showFilters ? 'primary' : 'secondary'} icon={<Filter size={14} />} onClick={() => setShowFilters(!showFilters)}>Filters</Button>
        </div>
      </div>
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
            <div className="mb-4 grid gap-3 rounded-2xl border border-stone-200/70 bg-white p-4 sm:grid-cols-4">
              <Select value={f.practitioner} disabled={ownOnly} onChange={(e) => setF({ ...f, practitioner: e.target.value })}><option value="">All practitioners</option>{practitioners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
              <Select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}><option value="">All services</option>{db.treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
              <Select value={f.room} onChange={(e) => setF({ ...f, room: e.target.value })}><option value="">All rooms</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.locationName}</option>)}</Select>
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'Month' ? (
        <MonthGrid date={date} appts={appts} onPick={(d) => { setDate(d); setView('Day') }} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <div style={{ minWidth: Math.max(columns.length * 170 + 64, 600) }}>
              <div className="sticky top-0 z-10 flex border-b border-stone-200/70 bg-white">
                <div className="w-16 shrink-0" />
                {columns.map((c) => (
                  <div key={c.key} className={cn('flex min-w-0 flex-1 items-center gap-2.5 border-l border-stone-100 px-3 py-3', view === 'Week' && sameDay(c.day, new Date()) && 'bg-cream/60')}>
                    {c.avatar && <img src={c.avatar.replace(/([?&])w=\d+/, '$1w=96')} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />}
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-ink">{c.label} {view === 'Week' && <span className={cn('ml-1 inline-grid h-6 w-6 place-items-center rounded-full text-[12px]', sameDay(c.day, new Date()) ? 'bg-ink text-ivory' : '')}>{c.sub}</span>}</div>
                      {view !== 'Week' && c.sub && <div className="truncate text-[11.5px] text-stone-400">{c.sub}</div>}
                    </div>
                    {view === 'Practitioner' && <span className="ml-auto text-[11px] text-stone-400">{appts.filter((a) => inColumn(a, c) && a.status !== 'Cancelled').length}</span>}
                  </div>
                ))}
              </div>
              <div className="relative flex max-h-[calc(100vh-290px)] overflow-y-auto" ref={scrollRef}>
                <div className="w-16 shrink-0">
                  {Array.from({ length: END_H - START_H }, (_, i) => <div key={i} style={{ height: HOUR }} className="relative pr-2 text-right text-[11px] text-stone-400"><span className="relative -top-2">{i === 0 ? '' : fmtTime(new Date(2020, 0, 1, START_H + i))}</span></div>)}
                </div>
                {columns.map((c) => {
                  const list = appts.filter((a) => inColumn(a, c))
                  const lanes = layoutLanes(list)
                  return (
                    <div key={c.key} className="relative min-w-0 flex-1 border-l border-stone-100" style={{ height: (END_H - START_H) * HOUR }}
                      onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, c)} onDoubleClick={(e) => e.target === e.currentTarget && onEmptyClick(e, c)} onClick={(e) => e.target === e.currentTarget && onEmptyClick(e, c)}>
                      {Array.from({ length: END_H - START_H }, (_, i) => <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-stone-100" style={{ top: i * HOUR }}><div className="absolute inset-x-0 top-1/2 border-t border-dashed border-stone-100/80" /></div>)}
                      {sameDay(c.day, now) && now.getHours() >= START_H && now.getHours() < END_H && (
                        <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-bronze-500" style={{ top: ((now.getHours() - START_H) * 60 + now.getMinutes()) / 60 * HOUR }}><span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-bronze-500" /></div>
                      )}
                      {list.map((a) => {
                        const s = new Date(a.start)
                        const top = ((s.getHours() - START_H) * 60 + s.getMinutes()) / 60 * HOUR
                        const h = Math.max(26, (a.duration / 60) * HOUR - 3)
                        const { lane, of } = lanes[a.id]
                        const p = db.patients.find((x) => x.id === a.patientId)
                        const muted = ['Cancelled', 'No Show'].includes(a.status)
                        return (
                          <motion.button key={a.id} layoutId={`ap-${a.id}`} layout transition={{ duration: 0.45, ease: EASE }}
                            draggable={can('calendar.manage') && !['Completed', 'Cancelled'].includes(a.status)}
                            onDragStartCapture={(e: React.DragEvent) => { e.dataTransfer.setData('text/appt', a.id); e.dataTransfer.effectAllowed = 'move'; setDragId(a.id) }}
                            onDragEndCapture={() => setDragId(null)}
                            onClick={() => setSelected(a.id)}
                            className={cn('group absolute overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left shadow-[0_1px_2px_rgba(30,28,26,0.06)] transition-[box-shadow,opacity] duration-300 hover:z-20 hover:shadow-lift', muted ? 'bg-stone-100/80 opacity-60' : 'bg-white hairline', dragId === a.id && 'opacity-40')}
                            style={{ top, height: h, left: `calc(${(lane / of) * 100}% + 3px)`, width: `calc(${100 / of}% - 6px)`, borderLeftColor: STATUS_BAR[a.status], background: muted ? undefined : `linear-gradient(90deg, ${STATUS_BAR[a.status]}0F, #fff 60%)` }}>
                            <div className={cn('truncate text-[12px] font-medium text-ink', muted && 'line-through')}>{p ? `${p.firstName} ${p.lastName}` : ''}</div>
                            {h > 34 && <div className="truncate text-[11px] text-stone-500">{treatmentName(db, a.treatmentId)}</div>}
                            {h > 52 && <div className="truncate text-[10.5px] text-stone-400">{fmtTime(a.start)} · {a.duration}m · {view === 'Room' ? staffName(db, a.practitionerId).split(' ').slice(-1)[0] : roomName(db, a.roomId)}</div>}
                            {h > 70 && <div className="mt-0.5 text-[10px] font-medium" style={{ color: STATUS_BAR[a.status] }}>{a.status}</div>}
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-stone-100 px-4 py-2.5 text-[11.5px] text-stone-500">
            {STATUSES.map((s) => <span key={s} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: STATUS_BAR[s] }} />{s}</span>)}
            <span className="ml-auto hidden md:inline">Drag to reschedule · click an empty slot to book</span>
          </div>
        </div>
      )}
      <AppointmentDrawer id={selected} onClose={() => { setSelected(null); if (params.get('appt')) setParams({}) }} />
      <NewAppointmentModal open={!!newAt} onClose={() => setNewAt(null)} start={newAt?.start} practitionerId={newAt?.practitionerId} locationId={newAt?.locationId} />
    </div>
  )
}

function useScrollToNow() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) ref.current.scrollTop = Math.max(0, (new Date().getHours() - START_H - 1.5) * HOUR) }, [])
  return ref
}

function layoutLanes(list: Appointment[]) {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start))
  const out: Record<ID, { lane: number; of: number }> = {}
  let cluster: Appointment[] = []
  let clusterEnd = 0
  let laneEnds: number[] = []
  const flush = () => { const of = Math.max(1, laneEnds.length); cluster.forEach((a) => (out[a.id].of = of)); cluster = []; laneEnds = [] }
  sorted.forEach((a) => {
    const s = new Date(a.start).getTime()
    const e = s + a.duration * 60000
    if (cluster.length && s >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= s)
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e) } else laneEnds[lane] = e
    out[a.id] = { lane, of: 1 }
    cluster.push(a)
    clusterEnd = Math.max(clusterEnd, e)
  })
  flush()
  return out
}

function MonthGrid({ date, appts, onPick }: { date: Date; appts: Appointment[]; onPick: (d: Date) => void }) {
  const db = useDB()
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = startOfWeek(first)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white shadow-soft">
      <div className="grid grid-cols-7 border-b border-stone-100">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="px-3 py-2.5 text-[11.5px] uppercase tracking-wider text-stone-400">{d}</div>)}</div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = appts.filter((a) => sameDay(a.start, d) && a.status !== 'Cancelled')
          const out = d.getMonth() !== date.getMonth()
          return (
            <motion.button key={d.toISOString()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.006 }} onClick={() => onPick(d)} className={cn('min-h-[110px] border-b border-r border-stone-100 p-2 text-left transition-colors hover:bg-cream/50', out && 'bg-stone-50/50 text-stone-300')}>
              <div className={cn('mb-1 inline-grid h-6 w-6 place-items-center rounded-full text-[12px]', sameDay(d, new Date()) ? 'bg-ink text-ivory' : out ? 'text-stone-300' : 'text-ink')}>{d.getDate()}</div>
              {list.slice(0, 3).map((a) => <div key={a.id} className="mb-0.5 flex items-center gap-1.5 truncate text-[11px] text-stone-600"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_BAR[a.status] }} />{fmtTime(a.start)} {patientName(db, a.patientId).split(' ')[0]}</div>)}
              {list.length > 3 && <div className="text-[11px] text-stone-400">+{list.length - 3} more</div>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
