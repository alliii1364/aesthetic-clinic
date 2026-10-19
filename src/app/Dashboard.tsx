import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DollarSign, CalendarCheck, UserPlus, Target, Receipt, UserX, Gauge, Crown, AlertTriangle, ArrowRight, Clock, CheckCircle2, Circle, PackageX, CalendarClock } from 'lucide-react'
import { useDB, useStore, useMe, useCan, useVisibleLocations, patientName, treatmentName, staffName } from '@/store/store'
import { Avatar, Badge, Card, CardHeader, Stat, StatusBadge, STATUS_BAR, Segmented, EASE, cn } from '@/ui/ui'
import { LineChart, BarChart, HBars, Legend, CAT } from '@/ui/charts'
import { ROLE_LABEL } from '@/lib/permissions'
import { addDays, compact, fmtTime, money, pct, relative, sameDay, startOfDay, daysBetween } from '@/lib/format'
import { dailySeries, delta, lastNDays, mrr, occupancy, priorRange, revenue, revenueBy, scopedAppointments, scopedInvoices, invoiceRevenue, rebookRate } from '@/lib/metrics'
import { AppointmentDrawer } from './AppointmentDrawer'

export default function Dashboard() {
  const db = useDB()
  const me = useMe()
  const can = useCan()
  const locs = useVisibleLocations()
  const toggleTask = useStore((s) => s.toggleTask)
  const [open, setOpen] = useState<string | null>(null)
  const [range, setRange] = useState<'7D' | '30D' | '90D'>('30D')
  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90
  const ownOnly = !can('calendar.manage') && can('calendar.own')
  const showMoney = can('finance.view') || can('reports.view')

  const today = lastNDays(1)
  const yesterday = priorRange(today)
  const r = lastNDays(days)
  const prev = priorRange(r)
  const todays = scopedAppointments(db, locs, today).filter((a) => a.status !== 'Cancelled' && (!ownOnly || a.practitionerId === me.id)).sort((a, b) => a.start.localeCompare(b.start))
  const revToday = revenue(db, locs, today)
  const revYesterday = revenue(db, locs, yesterday)
  const month = lastNDays(30)
  const newPatients = db.patients.filter((p) => locs.includes(p.locationId) && new Date(p.since) >= month.from).length
  const newPatientsPrev = db.patients.filter((p) => locs.includes(p.locationId) && new Date(p.since) >= priorRange(month).from && new Date(p.since) < month.from).length
  const pendingLeads = db.leads.filter((l) => locs.includes(l.locationId) && ['New Lead', 'Contacted'].includes(l.stage)).length
  const tx = scopedInvoices(db, locs, r).filter((i) => i.lines.some((l) => l.kind === 'treatment') && i.total > 0)
  const avgTicket = tx.length ? tx.reduce((a, i) => a + invoiceRevenue(i), 0) / tx.length : 0
  const txPrev = scopedInvoices(db, locs, prev).filter((i) => i.lines.some((l) => l.kind === 'treatment') && i.total > 0)
  const avgPrev = txPrev.length ? txPrev.reduce((a, i) => a + invoiceRevenue(i), 0) / txPrev.length : 0
  const week = lastNDays(7)
  const noShows = scopedAppointments(db, locs, week).filter((a) => a.status === 'No Show').length
  const occ = occupancy(db, locs, new Date())

  const revSeries = useMemo(() => dailySeries(db, locs, days), [db, locs, days])
  const prevSeries = useMemo(() => {
    const out: number[] = []
    for (let i = days * 2 - 1; i >= days; i--) { const d = addDays(startOfDay(), -i); out.push(Math.round(revenue(db, locs, { from: d, to: addDays(d, 1) }))) }
    return out
  }, [db, locs, days])
  const apptSeries = useMemo(() => dailySeries(db, locs, 14, 'appointments'), [db, locs])
  const byTreatment = useMemo(() => revenueBy(db, locs, r, (_, l) => (l.kind === 'treatment' ? treatmentName(db, l.refId) : l.kind === 'product' ? 'Retail' : l.kind === 'package' ? 'Packages' : 'Memberships')).slice(0, 6), [db, locs, r.from.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps

  const stages = ['New Lead', 'Contacted', 'Consultation Booked', 'Consultation Completed', 'Treatment Proposed', 'Converted'] as const
  const leads = db.leads.filter((l) => locs.includes(l.locationId))
  const rank: Record<string, number> = { 'New Lead': 0, Contacted: 1, Lost: 1, 'Consultation Booked': 2, 'Consultation Completed': 3, 'Treatment Proposed': 4, 'Follow-up': 4, Converted: 5 }
  const funnel = stages.map((s, i) => ({ s, n: leads.filter((l) => rank[l.stage] >= i).length }))

  const perf = db.staff.filter((s) => s.bookable && s.locationIds.some((l) => locs.includes(l))).map((s) => {
    const inv = scopedInvoices(db, locs, r).filter((i) => i.practitionerId === s.id)
    const rev = inv.reduce((a, i) => a + invoiceRevenue(i), 0)
    const ap = scopedAppointments(db, locs, r).filter((a) => a.practitionerId === s.id && a.status === 'Completed')
    const rebooked = ap.filter((a) => db.appointments.some((b) => b.patientId === a.patientId && b.start > a.start && b.status !== 'Cancelled')).length
    return { s, rev, count: ap.length, avg: ap.length ? rev / ap.length : 0, rebook: ap.length ? rebooked / ap.length : 0 }
  }).sort((a, b) => b.rev - a.rev)

  const lowStock = db.inventory.filter((i) => locs.includes(i.locationId) && i.stock <= i.reorderLevel)
  const expiring = db.inventory.flatMap((i) => i.lots.filter((l) => daysBetween(new Date(), l.expiry) <= 45 && locs.includes(i.locationId)).map((l) => ({ i, l })))
  const tasks = db.tasks.filter((t) => !ownOnly || t.assigneeId === me.id).slice(0, 6)
  const followUps = db.leads.filter((l) => locs.includes(l.locationId) && !['Converted', 'Lost'].includes(l.stage) && new Date(l.nextFollowUp) <= addDays(startOfDay(), 1)).slice(0, 5)
  const activity = db.audit.filter((e) => !e.locationId || locs.includes(e.locationId)).slice(0, 8)
  const hour = new Date().getHours()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-stone-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {ROLE_LABEL[me.role]}</div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mt-1 font-display text-[36px] leading-tight text-ink">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {me.name.replace('Dr. ', 'Dr ').split(' ')[me.name.startsWith('Dr') ? 1 : 0]}.</motion.h1>
          <p className="mt-1 text-[14px] text-stone-500">{todays.length} appointments today · {todays.filter((a) => a.status === 'Checked In').length} checked in · {todays.filter((a) => a.consent === 'Pending' && !['Completed'].includes(a.status)).length} consents pending</p>
        </div>
        {showMoney && <Segmented options={['7D', '30D', '90D'] as const} value={range} onChange={setRange} id="dash-range" size="sm" />}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {showMoney && <Stat index={0} label="Today’s revenue" value={revToday} format={(n) => money(n)} delta={delta(revToday, revYesterday)} hint="vs yesterday" icon={<DollarSign size={15} />} />}
        <Stat index={1} label="Today’s appointments" value={todays.length} delta={undefined} hint={`${todays.filter((a) => a.status === 'Completed').length} completed`} icon={<CalendarCheck size={15} />} />
        <Stat index={2} label="New patients" value={newPatients} delta={delta(newPatients, newPatientsPrev)} hint="last 30 days" icon={<UserPlus size={15} />} />
        <Stat index={3} label="Pending leads" value={pendingLeads} hint="awaiting contact" icon={<Target size={15} />} />
        {showMoney && <Stat index={4} label="Average ticket" value={avgTicket} format={(n) => money(n)} delta={delta(avgTicket, avgPrev)} hint={`last ${days} days`} icon={<Receipt size={15} />} />}
        <Stat index={5} label="No-shows" value={noShows} hint="this week" icon={<UserX size={15} />} />
        <Stat index={6} label="Occupancy" value={occ * 100} format={(n) => `${Math.round(n)}%`} hint="today, booked chair time" icon={<Gauge size={15} />} />
        {showMoney && <Stat index={7} label="Membership MRR" value={mrr(db)} format={(n) => money(n)} hint={`${db.memberships.filter((m) => m.status === 'Active').length} active members`} icon={<Crown size={15} />} />}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Today’s schedule" subtitle={ownOnly ? 'Your appointments' : 'All practitioners'} action={<Link to="/app/calendar" className="flex items-center gap-1 text-[12.5px] text-stone-500 hover:text-ink">Open calendar <ArrowRight size={13} /></Link>} />
          <div className="max-h-[380px] overflow-y-auto px-2 pb-3 pt-3">
            {todays.map((a, i) => {
              const p = db.patients.find((x) => x.id === a.patientId)
              const isNow = new Date(a.start) <= new Date() && new Date(new Date(a.start).getTime() + a.duration * 60000) > new Date()
              return (
                <motion.button key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.4 }} onClick={() => setOpen(a.id)} className={cn('flex w-full items-center gap-4 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-cream/60', isNow && 'bg-bronze-50/50')}>
                  <div className="w-16 shrink-0 text-[12.5px] tabular-nums text-stone-500">{fmtTime(a.start)}</div>
                  <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: STATUS_BAR[a.status] }} />
                  <Avatar name={p ? `${p.firstName} ${p.lastName}` : '?'} src={p?.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] text-ink">{p?.firstName} {p?.lastName} {p?.alerts.length ? <AlertTriangle size={12} className="mb-0.5 inline text-rose-500" /> : null}</div>
                    <div className="truncate text-[12px] text-stone-500">{treatmentName(db, a.treatmentId)} · {staffName(db, a.practitionerId)}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </motion.button>
              )
            })}
            {!todays.length && <p className="py-10 text-center text-sm text-stone-500">No appointments today.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Pending tasks" subtitle={`${tasks.filter((t) => !t.done).length} open`} />
          <div className="space-y-1 px-3 pb-4 pt-3">
            {tasks.map((t) => (
              <button key={t.id} onClick={() => toggleTask(t.id)} className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-cream/60">
                {t.done ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-sage-500" /> : <Circle size={17} className="mt-0.5 shrink-0 text-stone-300" />}
                <div className="min-w-0"><div className={cn('text-[13px]', t.done ? 'text-stone-400 line-through' : 'text-ink')}>{t.title}</div><div className="text-[11.5px] text-stone-400">{staffName(db, t.assigneeId)} · {sameDay(t.due, new Date()) ? `today ${fmtTime(t.due)}` : relative(t.due)}</div></div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {showMoney && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader title="Revenue trend" subtitle={`${money(revSeries.values.reduce((a, b) => a + b, 0))} in the last ${days} days · ${pct(delta(revSeries.values.reduce((a, b) => a + b, 0), prevSeries.reduce((a, b) => a + b, 0)))} vs prior`} action={<Legend items={[{ label: 'This period', color: CAT[0] }, { label: 'Prior period', color: '#B3AA9D', dashed: true }]} />} />
            <div className="px-3 pb-4 pt-4"><LineChart labels={revSeries.labels} series={[{ name: 'Revenue', values: revSeries.values }, { name: 'Prior period', values: prevSeries, color: '#B3AA9D', dashed: true }]} format={(n) => `$${compact(n)}`} height={240} /></div>
          </Card>
          <Card>
            <CardHeader title="Revenue by treatment" subtitle={`Last ${days} days`} />
            <div className="px-5 pb-5 pt-5"><HBars rows={byTreatment.map((x) => ({ label: x.label, value: x.value }))} format={(n) => money(n)} /></div>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Appointments" subtitle="Last 14 days" />
          <div className="px-3 pb-4 pt-4"><BarChart labels={apptSeries.labels} values={apptSeries.values} color={CAT[1]} highlight={13} height={210} /></div>
        </Card>
        <Card>
          <CardHeader title="Lead conversion" subtitle={`${pct(leads.filter((l) => l.stage === 'Converted').length / Math.max(1, leads.length))} converted · ${leads.length} leads`} action={<Link to="/app/leads" className="text-[12.5px] text-stone-500 hover:text-ink">Pipeline</Link>} />
          <div className="space-y-2.5 px-5 pb-5 pt-5">
            {funnel.map((f, i) => (
              <div key={f.s} className="flex items-center gap-3">
                <div className="w-[132px] shrink-0 truncate text-[12.5px] text-stone-600">{f.s}</div>
                <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-stone-100">
                  <motion.div initial={{ x: '-100%' }} animate={{ x: `${(f.n / Math.max(1, funnel[0].n)) * 100 - 100}%` }} transition={{ duration: 1, ease: EASE, delay: i * 0.08 }} className="h-full w-full rounded-md" style={{ background: CAT[3], opacity: 1 - i * 0.12 }} />
                </div>
                <div className="w-8 text-right text-[12.5px] tabular-nums text-ink">{f.n}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Inventory warnings" subtitle={`${lowStock.length} low · ${expiring.length} expiring`} action={<Link to="/app/inventory" className="text-[12.5px] text-stone-500 hover:text-ink">Inventory</Link>} />
          <div className="space-y-1 px-3 pb-4 pt-3">
            {lowStock.slice(0, 4).map((i) => (
              <Link key={i.id} to={`/app/inventory?item=${i.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream/60">
                <PackageX size={16} className="shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] text-ink">{i.name}</div><div className="text-[11.5px] text-stone-500">{db.locations.find((l) => l.id === i.locationId)?.name} · {i.stock} {i.unit} left</div></div>
                <Badge tone="amber">Reorder</Badge>
              </Link>
            ))}
            {expiring.slice(0, 3).map(({ i, l }) => (
              <Link key={i.id + l.lot} to={`/app/inventory?item=${i.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream/60">
                <CalendarClock size={16} className="shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] text-ink">{i.name}</div><div className="text-[11.5px] text-stone-500">Lot {l.lot} · {l.qty} {i.unit} · expires {relative(l.expiry)}</div></div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {showMoney && (
          <Card className="xl:col-span-2">
            <CardHeader title="Practitioner performance" subtitle={`Last ${days} days · rebooking rate ${pct(rebookRate(db, locs, r))}`} />
            <div className="overflow-x-auto px-2 pb-3 pt-2">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-[11px] uppercase tracking-[0.08em] text-stone-400"><th className="px-3 py-2 font-medium">Practitioner</th><th className="px-3 py-2 text-right font-medium">Revenue</th><th className="px-3 py-2 text-right font-medium">Treatments</th><th className="px-3 py-2 text-right font-medium">Avg ticket</th><th className="px-3 py-2 font-medium">Rebook</th></tr></thead>
                <tbody>
                  {perf.map(({ s, rev, count, avg, rebook }) => (
                    <tr key={s.id} className="border-t border-stone-100">
                      <td className="px-3 py-3"><div className="flex items-center gap-2.5"><Avatar name={s.name} src={s.avatar} size={28} /><div><div className="text-ink">{s.name}</div><div className="text-[11.5px] text-stone-500">{s.title}</div></div></div></td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink">{money(rev)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{count}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(avg)}</td>
                      <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-stone-100"><motion.div initial={{ x: '-100%' }} animate={{ x: `${rebook * 100 - 100}%` }} transition={{ duration: 1, ease: EASE }} className="h-full w-full rounded-full" style={{ background: CAT[0] }} /></div><span className="tabular-nums text-stone-600">{pct(rebook)}</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <Card className={showMoney ? '' : 'xl:col-span-2'}>
          <CardHeader title="Follow-ups due" subtitle="Leads to contact today" />
          <div className="space-y-1 px-3 pb-4 pt-3">
            {followUps.map((l) => (
              <Link key={l.id} to={`/app/leads?lead=${l.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream/60">
                <Avatar name={l.name} size={30} />
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] text-ink">{l.name}</div><div className="truncate text-[11.5px] text-stone-500">{treatmentName(db, l.interestId)} · {l.stage}</div></div>
                <span className={cn('flex items-center gap-1 text-[11.5px]', new Date(l.nextFollowUp) < new Date() ? 'text-rose-500' : 'text-stone-500')}><Clock size={11} />{relative(l.nextFollowUp)}</span>
              </Link>
            ))}
            {!followUps.length && <p className="py-6 text-center text-[13px] text-stone-500">All caught up.</p>}
          </div>
        </Card>
        <Card className={showMoney ? 'xl:col-span-3' : ''}>
          <CardHeader title="Latest activity" subtitle="From the audit log" action={can('audit.view') ? <Link to="/app/settings?tab=Audit log" className="text-[12.5px] text-stone-500 hover:text-ink">Audit log</Link> : undefined} />
          <div className={cn('grid gap-x-6 px-5 pb-4 pt-3', showMoney && 'md:grid-cols-2')}>
            {activity.map((e) => (
              <div key={e.id} className="flex items-start gap-3 border-b border-stone-100 py-2.5 last:border-0">
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', e.severity === 'clinical' ? 'bg-sage-500' : e.severity === 'financial' ? 'bg-bronze-500' : e.severity === 'security' ? 'bg-violet-500' : 'bg-stone-300')} />
                <div className="min-w-0 flex-1 text-[13px]"><span className="text-ink">{staffName(db, e.userId)}</span> <span className="text-stone-500">{e.action.toLowerCase()}</span> <span className="text-ink">{e.entity}</span>{e.patientId && <span className="text-stone-500"> · {patientName(db, e.patientId)}</span>}</div>
                <span className="shrink-0 text-[11.5px] text-stone-400">{relative(e.at)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <AppointmentDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
