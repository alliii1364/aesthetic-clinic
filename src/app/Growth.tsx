import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, MessageSquare, Bell, Smartphone, Zap, Plus, Send, Star, Users, Download, Bookmark, BookmarkCheck, ThumbsUp, ThumbsDown, Gift, Cake, RefreshCw } from 'lucide-react'
import { useDB, useStore, useVisibleLocations, patientName, treatmentName, staffName, locationName } from '@/store/store'
import type { Channel, DB, ID } from '@/lib/types'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Select, Stat, Table, TD, TH, TR, Tabs, Textarea, Toggle, EASE, cn } from '@/ui/ui'
import { BarChart, Donut, HBars, LineChart, CAT } from '@/ui/charts'
import { addDays, compact, fmtDate, fmtDateTime, money, pct, startOfDay, sum, daysBetween, groupBy } from '@/lib/format'
import { dailySeries, invoiceRevenue, lifetimeValue, mrr, rebookRate, revenue, revenueBy, scopedAppointments, scopedInvoices, type Range } from '@/lib/metrics'
import { exportCSV } from './AppointmentsList'

const CH_ICON: Record<Channel, typeof Mail> = { Email: Mail, SMS: MessageSquare, 'In-app': Bell, Push: Smartphone }

// ── Marketing ───────────────────────────────────────────────────────────────
export function MarketingPage() {
  const db = useDB()
  const [tab, setTab] = useState<'Automations' | 'Campaigns' | 'Segments' | 'Reviews' | 'Message queue'>(() => (new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('tab') as 'Reviews') || 'Automations')
  const sent = db.scheduled.filter((s) => s.status === 'Sent').length
  const camp = db.campaigns.filter((c) => c.status === 'Sent')
  const rated = db.reviewRequests.filter((r) => r.rating)
  return (
    <div>
      <PageHeader title="Marketing" subtitle="Automated care journeys, campaigns and reputation — measured in booked revenue." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active automations" value={db.automations.filter((a) => a.active).length} index={0} icon={<Zap size={15} />} />
        <Stat label="Messages sent (30d)" value={sent + sum(camp, (c) => c.audience)} format={(n) => compact(n)} index={1} />
        <Stat label="Campaign revenue" value={sum(camp, (c) => c.revenue)} format={(n) => money(n)} index={2} />
        <Stat label="Average rating" value={sum(rated, (r) => r.rating ?? 0) / Math.max(1, rated.length)} format={(n) => `${n.toFixed(2)} ★`} index={3} icon={<Star size={15} />} />
      </div>
      <Tabs tabs={['Automations', 'Campaigns', 'Segments', 'Reviews', 'Message queue'] as const} value={tab} onChange={setTab} id="mkt" className="mb-6" />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {tab === 'Automations' && <Automations />}
          {tab === 'Campaigns' && <Campaigns />}
          {tab === 'Segments' && <Segments />}
          {tab === 'Reviews' && <Reviews />}
          {tab === 'Message queue' && <Queue />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Automations() {
  const db = useDB()
  const toggle = useStore((s) => s.toggleAutomation)
  const icon = { 'Treatment completed': Zap, 'Patient inactive': RefreshCw, Birthday: Cake, 'Lead created': Users, 'Package expiring': Gift, 'Appointment booked': Bell }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {db.automations.map((a, i) => {
        const I = icon[a.trigger]
        return (
          <Card key={a.id} className={cn('p-6', !a.active && 'opacity-70')} initial={{ opacity: 0, y: 10 }} animate={{ opacity: a.active ? 1 : 0.7, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-bronze-600"><I size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-ink">{a.name}</div>
                <div className="text-[12.5px] text-stone-500">When: {a.trigger}{a.treatmentIds.length ? ` · ${a.treatmentIds.map((t) => treatmentName(db, t)).join(', ')}` : ''}{a.inactiveDays ? ` · after ${a.inactiveDays / 30} months` : ''}</div>
              </div>
              <Toggle checked={a.active} onChange={() => toggle(a.id)} label="Active" />
            </div>
            <div className="relative mt-5 space-y-0 pl-5">
              <div className="absolute bottom-3 left-[7px] top-3 w-px bg-stone-200" />
              {a.steps.map((s, k) => {
                const C = CH_ICON[s.channel]
                return (
                  <div key={k} className="relative flex items-center gap-3 py-1.5">
                    <span className="absolute -left-5 h-3.5 w-3.5 rounded-full border-2 border-white bg-bronze-500" />
                    <span className="w-20 shrink-0 text-[12px] font-medium text-stone-500">{s.offsetDays === 0 ? 'Day 0' : s.offsetDays < 0 ? `${-s.offsetDays} days before` : s.offsetDays >= 60 ? `Month ${Math.round(s.offsetDays / 30)}` : `Day ${s.offsetDays}`}</span>
                    <C size={13} className="text-stone-400" />
                    <span className="text-[13px] text-ink">{s.template}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex gap-6 border-t border-stone-100 pt-3 text-[12.5px]"><span className="text-stone-500">Enrolled <b className="font-medium text-ink">{a.enrolled}</b></span><span className="text-stone-500">Converted <b className="font-medium text-ink">{a.converted}</b></span><span className="text-stone-500">Rate <b className="font-medium text-sage-500">{pct(a.converted / Math.max(1, a.enrolled))}</b></span></div>
          </Card>
        )
      })}
    </div>
  )
}

function segmentsOf(db: DB) {
  const lastVisit = (pid: ID) => db.appointments.filter((a) => a.patientId === pid && a.status === 'Completed').sort((a, b) => b.start.localeCompare(a.start))[0]
  return [
    { name: 'All active patients', desc: 'Visited in the last 12 months', ids: db.patients.filter((p) => { const l = lastVisit(p.id); return l && daysBetween(l.start, new Date()) < 365 }).map((p) => p.id) },
    { name: 'Lapsed 6+ months', desc: 'Win-back candidates', ids: db.patients.filter((p) => { const l = lastVisit(p.id); return !l || daysBetween(l.start, new Date()) > 180 }).map((p) => p.id) },
    { name: 'Botox due for rebooking', desc: 'Last Botox 12–16 weeks ago', ids: db.patients.filter((p) => { const s = db.sessions.filter((x) => x.patientId === p.id && x.treatmentId === 'tx_botox').sort((a, b) => b.at.localeCompare(a.at))[0]; return s && daysBetween(s.at, new Date()) >= 84 && daysBetween(s.at, new Date()) <= 112 }).map((p) => p.id) },
    { name: 'Members', desc: 'Active membership', ids: db.memberships.filter((m) => m.status === 'Active').map((m) => m.patientId) },
    { name: 'High value (LTV > $2,000)', desc: 'VIP care & previews', ids: db.patients.filter((p) => lifetimeValue(db, p.id) > 2000).map((p) => p.id) },
    { name: 'Birthdays this month', desc: 'Birthday benefit', ids: db.patients.filter((p) => new Date(p.dob).getMonth() === new Date().getMonth()).map((p) => p.id) },
    { name: 'Marketing opt-in', desc: 'Consented to offers', ids: db.patients.filter((p) => p.notify.marketing).map((p) => p.id) },
  ]
}

function Segments() {
  const db = useDB()
  const segs = useMemo(() => segmentsOf(db), [db])
  const [open, setOpen] = useState<string | null>(null)
  const seg = segs.find((s) => s.name === open)
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {segs.map((s, i) => (
          <Card key={s.name} hover className="cursor-pointer p-5" onClick={() => setOpen(s.name)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex items-center justify-between"><Users size={16} className="text-stone-400" /><span className="font-display text-[30px]">{s.ids.length}</span></div>
            <div className="mt-2 text-[15px] font-medium text-ink">{s.name}</div><div className="text-[12.5px] text-stone-500">{s.desc}</div>
          </Card>
        ))}
      </div>
      <Modal open={!!seg} onClose={() => setOpen(null)} title={seg?.name} subtitle={`${seg?.ids.length} patients · updates live`} width={560}>
        <div className="max-h-[50vh] divide-y divide-stone-100 overflow-y-auto">{seg?.ids.map((id) => <Link key={id} to={`/app/patients/${id}`} className="flex justify-between py-2.5 text-[13.5px] hover:text-bronze-600"><span>{patientName(db, id)}</span><span className="text-stone-400">{money(lifetimeValue(db, id))}</span></Link>)}</div>
      </Modal>
    </>
  )
}

function Campaigns() {
  const db = useDB()
  const send = useStore((s) => s.sendCampaign)
  const create = useStore((s) => s.createCampaign)
  const segs = useMemo(() => segmentsOf(db), [db])
  const [creating, setCreating] = useState(false)
  const [f, setF] = useState({ name: '', channel: 'Email' as 'Email' | 'SMS', segment: segs[0].name, subject: '', body: '' })
  return (
    <>
      <div className="mb-4 flex justify-end"><Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>New campaign</Button></div>
      <Card>
        <Table>
          <thead><tr><TH>Campaign</TH><TH>Channel</TH><TH>Segment</TH><TH>Status</TH><TH className="text-right">Audience</TH><TH className="text-right">Opened</TH><TH className="text-right">Clicked</TH><TH className="text-right">Booked</TH><TH className="text-right">Revenue</TH><TH /></tr></thead>
          <tbody>{db.campaigns.map((c) => <TR key={c.id}><TD><div className="text-ink">{c.name}</div><div className="text-[12px] text-stone-400">{c.subject || '—'} · {fmtDate(c.scheduledAt, { month: 'short', day: 'numeric' })}</div></TD><TD>{c.channel}</TD><TD className="text-[12.5px]">{c.segment}</TD><TD><Badge tone={c.status === 'Sent' ? 'sage' : c.status === 'Scheduled' ? 'violet' : 'neutral'}>{c.status}</Badge></TD><TD className="text-right tabular-nums">{c.audience.toLocaleString()}</TD><TD className="text-right tabular-nums">{c.status === 'Sent' ? pct(c.opened / c.audience) : '—'}</TD><TD className="text-right tabular-nums">{c.status === 'Sent' ? pct(c.clicked / c.audience, 1) : '—'}</TD><TD className="text-right tabular-nums">{c.booked || '—'}</TD><TD className="text-right tabular-nums text-ink">{c.revenue ? money(c.revenue) : '—'}</TD><TD className="text-right">{c.status !== 'Sent' && <Button size="xs" variant="secondary" icon={<Send size={12} />} onClick={() => send(c.id)}>Send now</Button>}</TD></TR>)}</tbody>
        </Table>
      </Card>
      <Modal open={creating} onClose={() => setCreating(false)} width={640} title="New campaign" footer={<><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button disabled={!f.name} onClick={() => { create({ name: f.name, channel: f.channel, segment: f.segment, subject: f.subject, audience: segs.find((s) => s.name === f.segment)!.ids.length }); setCreating(false) }}>Save draft</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="E.g. Winter Glow Week" /></Field>
          <Field label="Channel"><Select value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as 'Email' })}><option>Email</option><option>SMS</option></Select></Field>
          <Field label="Audience"><Select value={f.segment} onChange={(e) => setF({ ...f, segment: e.target.value })}>{segs.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.ids.length})</option>)}</Select></Field>
          {f.channel === 'Email' && <Field label="Subject line" className="sm:col-span-2"><Input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>}
          <Field label="Message" className="sm:col-span-2" hint={f.channel === 'SMS' ? `${f.body.length}/160 · sent from ${db.tenants[0].brand.smsSender} · reply STOP to opt out` : `From ${db.tenants[0].brand.emailFrom}`}><Textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Hi {first_name}, …" /></Field>
        </div>
        <p className="mt-3 text-[12px] text-stone-400">Only patients with marketing consent receive promotional messages. Clinical details are never included.</p>
      </Modal>
    </>
  )
}

function Reviews() {
  const db = useDB()
  const publish = useStore((s) => s.setTestimonialPublished)
  const reqs = db.reviewRequests
  const responded = reqs.filter((r) => r.rating)
  const positive = responded.filter((r) => (r.rating ?? 0) >= 4)
  const issues = responded.filter((r) => (r.rating ?? 0) < 4)
  const dist = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: responded.filter((r) => r.rating === n).length }))
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="text-[13px] text-stone-500">Review flow</div>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="rounded-xl bg-cream px-4 py-3">After a completed appointment: <b className="font-medium">“How was your experience?”</b></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-sage-50 px-3 py-3 text-sage-700"><ThumbsUp size={14} className="mb-1" />4–5★ → Google review</div>
              <div className="rounded-xl bg-rose-50 px-3 py-3 text-rose-700"><ThumbsDown size={14} className="mb-1" />1–3★ → private feedback + manager task</div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-4 text-center">
            <div><div className="font-display text-[24px]">{reqs.length}</div><div className="text-[11.5px] text-stone-500">Sent</div></div>
            <div><div className="font-display text-[24px]">{pct(responded.length / Math.max(1, reqs.length))}</div><div className="text-[11.5px] text-stone-500">Response</div></div>
            <div><div className="font-display text-[24px]">{positive.length}</div><div className="text-[11.5px] text-stone-500">To Google</div></div>
          </div>
        </Card>
        <Card><CardHeader title="Rating distribution" /><div className="p-5"><HBars rows={dist} color={CAT[0]} /></div></Card>
        <Card>
          <CardHeader title="Feedback issues" subtitle={`${issues.length} private responses`} />
          <div className="max-h-[260px] space-y-2 overflow-y-auto px-4 pb-4 pt-3">
            {issues.map((r) => <div key={r.id} className="rounded-xl bg-white p-3 hairline"><div className="flex items-center justify-between text-[12.5px]"><span className="text-ink">{patientName(db, r.patientId)} · {r.rating}★</span><Badge tone={r.status === 'Resolved' ? 'sage' : 'amber'}>{r.status === 'Resolved' ? 'Resolved' : 'Open'}</Badge></div><p className="mt-1 text-[12.5px] text-stone-600">{r.comment || 'No comment'}</p></div>)}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Website testimonials" subtitle="Choose which reviews appear on your public site" />
        <div className="divide-y divide-stone-100 px-5 pb-3 pt-2">
          {db.testimonials.map((t) => <div key={t.id} className="flex items-center gap-4 py-3"><div className="min-w-0 flex-1"><div className="text-[13.5px] text-ink">“{t.text.slice(0, 120)}{t.text.length > 120 ? '…' : ''}”</div><div className="text-[12px] text-stone-500">{t.name} · {t.rating}★ · {treatmentName(db, t.treatmentId)} · {t.source}</div></div><Toggle checked={t.published} onChange={(v) => publish(t.id, v)} label="Published" /></div>)}
        </div>
      </Card>
    </div>
  )
}

function Queue() {
  const db = useDB()
  const list = [...db.scheduled].sort((a, b) => b.sendAt.localeCompare(a.sendAt)).slice(0, 120)
  return (
    <Card>
      <Table>
        <thead><tr><TH>Send at</TH><TH>Patient</TH><TH>Journey</TH><TH>Message</TH><TH>Channel</TH><TH>Status</TH></tr></thead>
        <tbody>{list.map((m) => { const C = CH_ICON[m.channel]; return <TR key={m.id}><TD className="whitespace-nowrap">{fmtDateTime(m.sendAt)}</TD><TD className="text-ink">{patientName(db, m.patientId)}</TD><TD className="text-[12.5px]">{db.automations.find((a) => a.id === m.automationId)?.name}</TD><TD>{m.template}</TD><TD><span className="flex items-center gap-1.5"><C size={13} className="text-stone-400" />{m.channel}</span></TD><TD><Badge tone={m.status === 'Sent' ? 'sage' : m.status === 'Scheduled' ? 'violet' : 'neutral'}>{m.status}</Badge></TD></TR> })}</tbody>
      </Table>
    </Card>
  )
}

// ── Reports ─────────────────────────────────────────────────────────────────
interface ReportOut { kpis: [string, string][]; chart?: { labels: string[]; values: number[]; money?: boolean; kind?: 'bar' | 'line' }; bars?: { label: string; value: number }[]; barsMoney?: boolean; table: { cols: string[]; rows: (string | number)[][] } }
interface Ctx { db: DB; locs: ID[]; r: Range; prac: string }

const REPORTS: Record<string, (c: Ctx) => ReportOut> = {
  Bookings: ({ db, locs, r, prac }) => {
    const a = scopedAppointments(db, locs, r).filter((x) => !prac || x.practitionerId === prac)
    const s = dailySeries(db, locs, Math.min(90, daysBetween(r.from, r.to)), 'appointments')
    const bySrc = groupBy(a, (x) => x.source)
    return { kpis: [['Bookings', String(a.length)], ['Online share', pct(a.filter((x) => x.source === 'Online' || x.source === 'Portal').length / Math.max(1, a.length))], ['Completed', String(a.filter((x) => x.status === 'Completed').length)]], chart: { ...s, kind: 'bar' }, table: { cols: ['Source', 'Bookings', 'Share'], rows: Object.entries(bySrc).map(([k, v]) => [k, v.length, pct(v.length / a.length)]) } }
  },
  Revenue: ({ db, locs, r }) => {
    const s = dailySeries(db, locs, Math.min(90, daysBetween(r.from, r.to)))
    const by = revenueBy(db, locs, r, (_, l) => l.category ?? l.kind)
    return { kpis: [['Revenue', money(revenue(db, locs, r))], ['Invoices', String(scopedInvoices(db, locs, r).length)], ['Avg / day', money(revenue(db, locs, r) / Math.max(1, daysBetween(r.from, r.to)))]], chart: { ...s, money: true, kind: 'line' }, table: { cols: ['Category', 'Revenue'], rows: by.map((x) => [x.label, money(x.value)]) } }
  },
  Patients: ({ db, locs, r }) => {
    const np = db.patients.filter((p) => locs.includes(p.locationId) && new Date(p.since) >= r.from)
    const bySrc = groupBy(np, (p) => p.source)
    return { kpis: [['New patients', String(np.length)], ['Total patients', String(db.patients.filter((p) => locs.includes(p.locationId)).length)], ['Members', String(db.memberships.filter((m) => m.status === 'Active').length)]], bars: Object.entries(bySrc).map(([label, v]) => ({ label, value: v.length })), table: { cols: ['Patient', 'Source', 'Since'], rows: np.map((p) => [`${p.firstName} ${p.lastName}`, p.source, fmtDate(p.since)]) } }
  },
  Leads: ({ db, locs, r }) => {
    const l = db.leads.filter((x) => locs.includes(x.locationId) && new Date(x.createdAt) >= r.from)
    return { kpis: [['Leads', String(l.length)], ['Converted', String(l.filter((x) => x.stage === 'Converted').length)], ['Pipeline', money(sum(l.filter((x) => !['Converted', 'Lost'].includes(x.stage)), (x) => x.value))]], bars: Object.entries(groupBy(l, (x) => x.stage)).map(([label, v]) => ({ label, value: v.length })), table: { cols: ['Lead', 'Stage', 'Source', 'Value'], rows: l.map((x) => [x.name, x.stage, x.source, money(x.value)]) } }
  },
  Practitioners: ({ db, locs, r }) => {
    const rows = db.staff.filter((s) => s.bookable).map((s) => { const inv = scopedInvoices(db, locs, r).filter((i) => i.practitionerId === s.id); const a = scopedAppointments(db, locs, r).filter((x) => x.practitionerId === s.id); return [s.name, money(sum(inv, invoiceRevenue)), a.filter((x) => x.status === 'Completed').length, a.filter((x) => x.status === 'No Show').length, money(sum(db.commissions.filter((c) => c.staffId === s.id && new Date(c.at) >= r.from), (c) => c.amount))] as (string | number)[] })
    return { kpis: [['Practitioners', String(rows.length)], ['Rebooking rate', pct(rebookRate(db, locs, r))], ['Treatments', String(sum(rows, (x) => Number(x[2])))]], bars: revenueBy(db, locs, r, (i) => staffName(db, i.practitionerId ?? '')).filter((x) => x.label !== '—'), barsMoney: true, table: { cols: ['Practitioner', 'Revenue', 'Treatments', 'No-shows', 'Commission'], rows } }
  },
  Treatments: ({ db, locs, r }) => {
    const by = revenueBy(db, locs, r, (_, l) => (l.kind === 'treatment' ? treatmentName(db, l.refId) : 'Other')).filter((x) => x.label !== 'Other')
    const counts = groupBy(scopedAppointments(db, locs, r).filter((a) => a.status === 'Completed'), (a) => treatmentName(db, a.treatmentId))
    return { kpis: [['Treatments performed', String(sum(Object.values(counts), (v) => v.length))], ['Top treatment', by[0]?.label ?? '—'], ['Distinct services', String(Object.keys(counts).length)]], bars: by, barsMoney: true, table: { cols: ['Treatment', 'Count', 'Revenue'], rows: by.map((x) => [x.label, counts[x.label]?.length ?? 0, money(x.value)]) } }
  },
  Locations: ({ db, locs, r }) => ({ kpis: locs.map((l) => [locationName(db, l), money(revenue(db, [l], r))] as [string, string]), bars: locs.map((l) => ({ label: locationName(db, l), value: Math.round(revenue(db, [l], r)) })), barsMoney: true, table: { cols: ['Location', 'Revenue', 'Appointments', 'No-shows'], rows: locs.map((l) => { const a = scopedAppointments(db, [l], r); return [locationName(db, l), money(revenue(db, [l], r)), a.length, a.filter((x) => x.status === 'No Show').length] }) } }),
  Memberships: ({ db }) => ({ kpis: [['MRR', money(mrr(db))], ['Active', String(db.memberships.filter((m) => m.status === 'Active').length)], ['Past due', String(db.memberships.filter((m) => m.status === 'Past Due').length)]], bars: db.membershipPlans.map((p) => ({ label: p.name, value: db.memberships.filter((m) => m.planId === p.id && m.status !== 'Cancelled').length })), table: { cols: ['Member', 'Plan', 'Status', 'Renews'], rows: db.memberships.map((m) => [patientName(db, m.patientId), db.membershipPlans.find((p) => p.id === m.planId)!.name, m.status, fmtDate(m.renewsAt)]) } }),
  Packages: ({ db }) => ({ kpis: [['Active', String(db.patientPackages.filter((p) => p.status === 'Active').length)], ['Sold', String(db.patientPackages.length)], ['Templates', String(db.packageTemplates.length)]], bars: db.packageTemplates.map((t) => ({ label: t.name, value: db.patientPackages.filter((p) => p.templateId === t.id).length })), table: { cols: ['Patient', 'Package', 'Remaining', 'Expires'], rows: db.patientPackages.map((p) => [patientName(db, p.patientId), db.packageTemplates.find((t) => t.id === p.templateId)!.name, sum(p.items, (i) => i.qty - i.used), fmtDate(p.expiresAt)]) } }),
  Inventory: ({ db, locs }) => { const it = db.inventory.filter((i) => locs.includes(i.locationId)); return { kpis: [['Stock value', money(sum(it, (i) => (i.stock / i.packSize) * i.cost))], ['Low stock', String(it.filter((i) => i.stock <= i.reorderLevel).length)], ['SKUs', String(it.length)]], bars: Object.entries(groupBy(it, (i) => i.category)).map(([label, v]) => ({ label, value: Math.round(sum(v, (i) => (i.stock / i.packSize) * i.cost)) })), barsMoney: true, table: { cols: ['Item', 'Location', 'Stock', 'Reorder'], rows: it.map((i) => [i.name, locationName(db, i.locationId), `${i.stock} ${i.unit}`, i.reorderLevel]) } } },
  Marketing: ({ db }) => ({ kpis: [['Campaign revenue', money(sum(db.campaigns, (c) => c.revenue))], ['Bookings from campaigns', String(sum(db.campaigns, (c) => c.booked))], ['Automation conversions', String(sum(db.automations, (a) => a.converted))]], bars: db.automations.map((a) => ({ label: a.name, value: a.converted })), table: { cols: ['Campaign', 'Audience', 'Booked', 'Revenue'], rows: db.campaigns.map((c) => [c.name, c.audience, c.booked, money(c.revenue)]) } }),
  'No-shows': ({ db, locs, r }) => { const a = scopedAppointments(db, locs, r); const ns = a.filter((x) => x.status === 'No Show'); return { kpis: [['No-shows', String(ns.length)], ['Rate', pct(ns.length / Math.max(1, a.length), 1)], ['Lost revenue', money(sum(ns, (x) => x.price))]], bars: Object.entries(groupBy(ns, (x) => treatmentName(db, x.treatmentId))).map(([label, v]) => ({ label, value: v.length })), table: { cols: ['Date', 'Patient', 'Treatment', 'Deposit held'], rows: ns.map((x) => [fmtDate(x.start), patientName(db, x.patientId), treatmentName(db, x.treatmentId), x.depositPaid ? money(x.deposit) : '—']) } } },
  Cancellations: ({ db, locs, r }) => { const a = scopedAppointments(db, locs, r); const c = a.filter((x) => x.status === 'Cancelled'); return { kpis: [['Cancellations', String(c.length)], ['Rate', pct(c.length / Math.max(1, a.length), 1)], ['Value', money(sum(c, (x) => x.price))]], bars: Object.entries(groupBy(c, (x) => staffName(db, x.practitionerId))).map(([label, v]) => ({ label, value: v.length })), table: { cols: ['Date', 'Patient', 'Treatment'], rows: c.map((x) => [fmtDate(x.start), patientName(db, x.patientId), treatmentName(db, x.treatmentId)]) } } },
  Retention: ({ db, locs }) => { const ps = db.patients.filter((p) => locs.includes(p.locationId)); const ret = ps.filter((p) => db.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').length > 1); return { kpis: [['Returning patients', pct(ret.length / Math.max(1, ps.length))], ['Avg visits', (sum(ps, (p) => db.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').length) / Math.max(1, ps.length)).toFixed(1)], ['Members', String(db.memberships.filter((m) => m.status === 'Active').length)]], bars: [1, 2, 3, 4, 5].map((n) => ({ label: n === 5 ? '5+ visits' : `${n} visit${n > 1 ? 's' : ''}`, value: ps.filter((p) => { const c = db.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').length; return n === 5 ? c >= 5 : c === n }).length })), table: { cols: ['Patient', 'Visits'], rows: ps.map((p) => [`${p.firstName} ${p.lastName}`, db.appointments.filter((a) => a.patientId === p.id && a.status === 'Completed').length]) } } },
  'Lifetime value': ({ db, locs }) => { const rows = db.patients.filter((p) => locs.includes(p.locationId)).map((p) => ({ p, v: lifetimeValue(db, p.id) })).sort((a, b) => b.v - a.v); return { kpis: [['Average LTV', money(sum(rows, (x) => x.v) / Math.max(1, rows.length))], ['Top 10% share', pct(sum(rows.slice(0, Math.ceil(rows.length / 10)), (x) => x.v) / Math.max(1, sum(rows, (x) => x.v)))], ['Patients', String(rows.length)]], bars: rows.slice(0, 8).map((x) => ({ label: `${x.p.firstName} ${x.p.lastName}`, value: Math.round(x.v) })), barsMoney: true, table: { cols: ['Patient', 'Lifetime value', 'Source'], rows: rows.map((x) => [`${x.p.firstName} ${x.p.lastName}`, money(x.v), x.p.source]) } } },
  Rebooking: ({ db, locs, r }) => ({ kpis: [['Rebooking rate', pct(rebookRate(db, locs, r))], ['Botox due now', String(segmentsOf(db)[2].ids.length)], ['Automations active', String(db.automations.filter((a) => a.active).length)]], bars: db.staff.filter((s) => s.bookable).map((s) => { const done = scopedAppointments(db, locs, r).filter((a) => a.practitionerId === s.id && a.status === 'Completed'); return { label: s.name, value: Math.round((done.filter((a) => db.appointments.some((b) => b.patientId === a.patientId && b.start > a.start && b.status !== 'Cancelled')).length / Math.max(1, done.length)) * 100) } }), table: { cols: ['Practitioner', 'Rebook %'], rows: [] } }),
  'Conversion rate': ({ db, locs }) => { const l = db.leads.filter((x) => locs.includes(x.locationId)); return { kpis: [['Lead → patient', pct(l.filter((x) => x.stage === 'Converted').length / Math.max(1, l.length))], ['Consult → treatment', pct(l.filter((x) => x.stage === 'Converted').length / Math.max(1, l.filter((x) => ['Consultation Completed', 'Treatment Proposed', 'Follow-up', 'Converted'].includes(x.stage)).length))], ['Leads', String(l.length)]], bars: Object.entries(groupBy(l, (x) => treatmentName(db, x.interestId))).map(([label, v]) => ({ label, value: Math.round((v.filter((x) => x.stage === 'Converted').length / v.length) * 100) })), table: { cols: ['Interest', 'Leads', 'Converted'], rows: Object.entries(groupBy(l, (x) => treatmentName(db, x.interestId))).map(([k, v]) => [k, v.length, v.filter((x) => x.stage === 'Converted').length]) } } },
  'Lead source ROI': ({ db, locs }) => { const l = db.leads.filter((x) => locs.includes(x.locationId)); const spend: Record<string, number> = { 'Google Ads': 1800, 'Meta Ads': 1400, Instagram: 600, TikTok: 500 }; const rows = Object.entries(groupBy(l, (x) => x.source)).map(([k, v]) => { const rev = sum(v.filter((x) => x.stage === 'Converted'), (x) => x.value); return [k, v.length, money(rev), spend[k] ? money(spend[k]) : 'Organic', spend[k] ? pct((rev - spend[k]) / spend[k]) : '—'] }); return { kpis: [['Paid spend', money(sum(Object.values(spend), (x) => x))], ['Attributed revenue', money(sum(l.filter((x) => x.stage === 'Converted'), (x) => x.value))], ['Sources', String(rows.length)]], bars: Object.entries(groupBy(l, (x) => x.source)).map(([label, v]) => ({ label, value: v.length })), table: { cols: ['Source', 'Leads', 'Revenue', 'Spend', 'ROI'], rows } } },
}

export function ReportsPage() {
  const db = useDB()
  const visible = useVisibleLocations()
  const [name, setName] = useState('Revenue')
  const [days, setDays] = useState('30')
  const [loc, setLoc] = useState('')
  const [prac, setPrac] = useState('')
  const [saved, setSaved] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('aurelia-saved-reports') ?? '["Revenue","Rebooking"]') } catch { return ['Revenue'] } })
  const locs = loc ? [loc] : visible
  const r: Range = { from: addDays(startOfDay(), -(Number(days) - 1)), to: addDays(startOfDay(), 1) }
  const out = useMemo(() => REPORTS[name]({ db, locs, r, prac }), [db, name, days, loc, prac, visible.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggleSave = () => { const n = saved.includes(name) ? saved.filter((x) => x !== name) : [...saved, name]; setSaved(n); try { localStorage.setItem('aurelia-saved-reports', JSON.stringify(n)) } catch { /* ignore */ } }
  return (
    <div>
      <PageHeader title="Reports" subtitle="Every number traceable to its source record." actions={<><Button size="sm" variant="secondary" icon={saved.includes(name) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} onClick={toggleSave}>{saved.includes(name) ? 'Saved' : 'Save report'}</Button><Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportCSV(`${name.toLowerCase().replace(/\s/g, '-')}-report`, [out.table.cols, ...out.table.rows])}>Export CSV</Button></>} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-5">
          {saved.length > 0 && <div><div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">Saved</div>{saved.map((s) => <button key={s} onClick={() => setName(s)} className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px]', name === s ? 'bg-white text-ink shadow-soft' : 'text-stone-600 hover:text-ink')}><BookmarkCheck size={12} className="text-bronze-500" />{s}</button>)}</div>}
          <div><div className="mb-2 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">All reports</div>{Object.keys(REPORTS).map((k) => <button key={k} onClick={() => setName(k)} className={cn('relative block w-full rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors', name === k ? 'text-ink' : 'text-stone-600 hover:text-ink')}>{name === k && <motion.span layoutId="rep-nav" className="absolute inset-0 rounded-lg bg-white shadow-soft" />}<span className="relative">{k}</span></button>)}</div>
        </div>
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Select value={days} onChange={(e) => setDays(e.target.value)} className="h-9 w-40">{[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['60', 'Last 60 days'], ['84', 'Last 12 weeks']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            <Select value={loc} onChange={(e) => setLoc(e.target.value)} className="h-9 w-44"><option value="">All permitted locations</option>{visible.map((l) => <option key={l} value={l}>{locationName(db, l)}</option>)}</Select>
            <Select value={prac} onChange={(e) => setPrac(e.target.value)} className="h-9 w-48"><option value="">All practitioners</option>{db.staff.filter((s) => s.bookable).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={name + days + loc + prac} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">{out.kpis.map(([k, v]) => <Card key={k} className="p-5"><div className="text-[12.5px] text-stone-500">{k}</div><div className="mt-2 truncate font-display text-[30px] leading-none text-ink">{v}</div></Card>)}</div>
              {out.chart && <Card><CardHeader title={name} subtitle="Daily" /><div className="px-3 pb-4 pt-4">{out.chart.kind === 'line' ? <LineChart labels={out.chart.labels} series={[{ name, values: out.chart.values }]} format={out.chart.money ? (n) => `$${compact(n)}` : undefined} /> : <BarChart labels={out.chart.labels} values={out.chart.values} color={CAT[1]} />}</div></Card>}
              {out.bars && out.bars.length > 0 && <Card><CardHeader title="Breakdown" /><div className="p-5">{out.bars.length <= 4 && !out.barsMoney ? <Donut data={out.bars} /> : <HBars rows={out.bars.slice(0, 10)} format={out.barsMoney ? (n) => money(n) : undefined} />}</div></Card>}
              {out.table.rows.length > 0 && <Card><Table><thead><tr>{out.table.cols.map((c) => <TH key={c}>{c}</TH>)}</tr></thead><tbody>{out.table.rows.slice(0, 60).map((row, i) => <TR key={i}>{row.map((c, k) => <TD key={k} className={k === 0 ? 'text-ink' : 'tabular-nums'}>{c}</TD>)}</TR>)}</tbody></Table></Card>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
