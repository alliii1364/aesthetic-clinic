import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, UserPlus, AlertTriangle, CalendarPlus, MessageCircle, Phone, Mail, MapPin, Crown, Package, Sparkles, ShieldAlert, FileText, Download, Plus, Pencil, Lock, ChevronRight, Star } from 'lucide-react'
import { useDB, useStore, useCan, useVisibleLocations, staffName, locationName, treatmentName } from '@/store/store'
import type { ID, Patient } from '@/lib/types'
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, KV, Modal, PageHeader, Progress, SectionLabel, Select, StatusBadge, Table, TD, TH, TR, Tabs, Textarea, EASE, cn } from '@/ui/ui'
import { age, fmtDate, fmtDateTime, money, relative, addDays } from '@/lib/format'
import { lifetimeValue } from '@/lib/metrics'
import { FaceChart } from '@/shared/FaceChart'
import { ChatView } from '@/shared/ChatView'
import { NewAppointmentModal, NewPatientModal } from './QuickCreate'
import { AppointmentDrawer } from './AppointmentDrawer'
import { CheckoutModal } from './Checkout'
import { PhotoTimeline } from './Clinical'
import { exportCSV } from './AppointmentsList'

export function PatientsPage() {
  const db = useDB()
  const can = useCan()
  const locs = useVisibleLocations()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('All')
  const [creating, setCreating] = useState(false)
  const rows = useMemo(() => db.patients.filter((p) => locs.includes(p.locationId)).map((p) => {
    const appts = db.appointments.filter((a) => a.patientId === p.id)
    const last = appts.filter((a) => a.status === 'Completed').sort((a, b) => b.start.localeCompare(a.start))[0]
    const next = appts.filter((a) => new Date(a.start) > new Date() && !['Cancelled', 'No Show'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))[0]
    const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
    return { p, last, next, mem, ltv: lifetimeValue(db, p.id), visits: appts.filter((a) => a.status === 'Completed').length }
  }), [db, locs])
  const filtered = rows.filter(({ p, mem, last }) => {
    if (q && !`${p.firstName} ${p.lastName} ${p.email} ${p.phone}`.toLowerCase().includes(q.toLowerCase())) return false
    if (seg === 'Members') return !!mem
    if (seg === 'VIP') return p.tags.includes('VIP')
    if (seg === 'New') return new Date(p.since) > addDays(new Date(), -30)
    if (seg === 'Lapsed') return !last || new Date(last.start) < addDays(new Date(), -90)
    if (seg === 'Alerts') return p.alerts.length > 0
    return true
  }).sort((a, b) => b.ltv - a.ltv)
  return (
    <div>
      <PageHeader title="Patients" subtitle={`${rows.length} patients · ${rows.filter((r) => r.mem).length} members`} actions={<>
        <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportCSV('patients', [['Name', 'Email', 'Phone', 'Location', 'Lifetime value', 'Visits', 'Source'], ...filtered.map(({ p, ltv, visits }) => [`${p.firstName} ${p.lastName}`, p.email, p.phone, locationName(db, p.locationId), Math.round(ltv), visits, p.source])])}>Export</Button>
        {can('patients.manage') && <Button size="sm" icon={<UserPlus size={14} />} onClick={() => setCreating(true)}>New patient</Button>}
      </>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <Tabs tabs={['All', 'Members', 'VIP', 'New', 'Lapsed', 'Alerts'] as const} value={seg as 'All'} onChange={setSeg} id="pt-seg" className="border-0" />
          <label className="relative ml-auto w-full sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or phone" className="h-9 pl-9" /></label>
        </div>
        <Table className="mt-2">
          <thead><tr><TH>Patient</TH><TH>Membership</TH><TH>Last treatment</TH><TH>Next visit</TH><TH className="text-right">Visits</TH><TH className="text-right">Lifetime value</TH></tr></thead>
          <tbody>
            {filtered.map(({ p, last, next, mem, ltv, visits }) => (
              <TR key={p.id} onClick={() => nav(`/app/patients/${p.id}`)}>
                <TD><div className="flex items-center gap-3"><Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={34} /><div><div className="flex items-center gap-1.5 text-ink">{p.firstName} {p.lastName}{p.alerts.length > 0 && can('clinical.view') && <AlertTriangle size={12} className="text-rose-500" />}{p.tags.includes('VIP') && <Star size={11} className="fill-bronze-500 text-bronze-500" />}</div><div className="text-[12px] text-stone-400">{p.email}</div></div></div></TD>
                <TD>{mem ? <Badge tone={mem.status === 'Active' ? 'bronze' : 'amber'}>{db.membershipPlans.find((x) => x.id === mem.planId)?.name}{mem.status !== 'Active' && ` · ${mem.status}`}</Badge> : <span className="text-stone-300">—</span>}</TD>
                <TD>{last ? <><div className="text-ink">{treatmentName(db, last.treatmentId)}</div><div className="text-[12px] text-stone-400">{relative(last.start)}</div></> : <span className="text-stone-300">—</span>}</TD>
                <TD>{next ? <span className="text-ink">{fmtDate(next.start, { month: 'short', day: 'numeric' })}</span> : <span className="text-stone-300">—</span>}</TD>
                <TD className="text-right tabular-nums">{visits}</TD>
                <TD className="text-right tabular-nums text-ink">{money(ltv)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
      <NewPatientModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

const TABS = ['Overview', 'Appointments', 'Clinical', 'Photos', 'Forms', 'Payments', 'Packages', 'Membership', 'Messages', 'Notes', 'Activity'] as const
type Tab = (typeof TABS)[number]

export function PatientProfile() {
  const { id } = useParams()
  const db = useDB()
  const can = useCan()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'Overview'
  const setTab = (t: Tab) => setParams({ tab: t }, { replace: true })
  const [booking, setBooking] = useState(false)
  const p = db.patients.find((x) => x.id === id)
  if (!p) return <Empty title="Patient not found" action={<Link to="/app/patients">Back to patients</Link>} />
  const appts = db.appointments.filter((a) => a.patientId === p.id)
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const plan = db.membershipPlans.find((x) => x.id === mem?.planId)
  const ltv = lifetimeValue(db, p.id)
  const visible = TABS.filter((t) => (['Clinical', 'Photos'].includes(t) ? can('clinical.view') || (t === 'Photos' && can('photos.approve')) : t === 'Payments' ? can('payments.collect') || can('finance.view') : true))
  return (
    <div>
      <div className="mb-1 text-[13px] text-stone-500"><Link to="/app/patients" className="hover:text-ink">Patients</Link> <ChevronRight size={12} className="inline" /> {p.firstName} {p.lastName}</div>
      <Card className="mb-6 overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <div className="flex flex-wrap items-center gap-5 p-6">
          <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={72} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-[34px] leading-none text-ink">{p.firstName} {p.lastName}</h1>{p.tags.map((t) => <Badge key={t} tone={t === 'VIP' ? 'bronze' : 'neutral'}>{t}</Badge>)}</div>
            <div className="mt-1.5 text-[13.5px] text-stone-500">{age(p.dob)} years · patient since {fmtDate(p.since, { month: 'long', year: 'numeric' })} · {locationName(db, p.locationId)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('calendar.manage') && <Button size="sm" icon={<CalendarPlus size={14} />} onClick={() => setBooking(true)}>Book</Button>}
            <Button size="sm" variant="secondary" icon={<MessageCircle size={14} />} onClick={() => setTab('Messages')}>Message</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-stone-100 sm:grid-cols-5">
          {[['Lifetime value', money(ltv)], ['Appointments', appts.filter((a) => a.status === 'Completed').length], ['No-shows', appts.filter((a) => a.status === 'No Show').length], ['Membership', plan ? `${plan.name}${mem!.status !== 'Active' ? ` · ${mem!.status}` : ''}` : 'None'], ['Source', p.source]].map(([k, v], i) => (
            <div key={String(k)} className={cn('px-6 py-4', i > 0 && 'sm:border-l border-stone-100')}><div className="text-[11.5px] uppercase tracking-[0.1em] text-stone-400">{k}</div><div className="mt-1 truncate text-[15px] text-ink">{v}</div></div>
          ))}
        </div>
      </Card>
      <Tabs tabs={visible} value={tab} onChange={setTab} id="pt-tabs" className="mb-6" />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {tab === 'Overview' && <Overview p={p} onTab={setTab} />}
          {tab === 'Appointments' && <PatientAppointments p={p} />}
          {tab === 'Clinical' && <ClinicalTab p={p} />}
          {tab === 'Photos' && <PhotoTimeline patientId={p.id} />}
          {tab === 'Forms' && <FormsTab p={p} />}
          {tab === 'Payments' && <PaymentsTab p={p} />}
          {tab === 'Packages' && <PackagesTab p={p} />}
          {tab === 'Membership' && <MembershipTab p={p} />}
          {tab === 'Messages' && <MessagesTab p={p} />}
          {tab === 'Notes' && <NotesTab p={p} />}
          {tab === 'Activity' && <ActivityTab p={p} />}
        </motion.div>
      </AnimatePresence>
      <NewAppointmentModal open={booking} onClose={() => setBooking(false)} patientId={p.id} />
    </div>
  )
}

function Overview({ p, onTab }: { p: Patient; onTab: (t: Tab) => void }) {
  const db = useDB()
  const can = useCan()
  const sessions = db.sessions.filter((s) => s.patientId === p.id).sort((a, b) => b.at.localeCompare(a.at))
  const next = db.appointments.filter((a) => a.patientId === p.id && new Date(a.start) > new Date() && !['Cancelled', 'No Show'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))[0]
  const pkg = db.patientPackages.find((x) => x.patientId === p.id && x.status === 'Active')
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const last = sessions[0]
  const recIntervals: Record<string, number> = { tx_botox: 98, tx_hydra: 30, tx_peel: 30, tx_microneedling: 42, tx_lip: 180, tx_filler: 365, tx_prp: 30 }
  const rec = last && recIntervals[last.treatmentId] ? { t: treatmentName(db, last.treatmentId), due: addDays(last.at, recIntervals[last.treatmentId]) } : null
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {can('clinical.view') && (p.alerts.length > 0 || p.allergies.length > 0) && (
          <div className="flex gap-3 rounded-2xl border border-rose-500/20 bg-rose-50 p-5">
            <ShieldAlert size={18} className="mt-0.5 shrink-0 text-rose-500" />
            <div className="text-[13.5px] text-rose-700"><div className="font-medium">Medical alerts</div>{[...p.alerts, ...(p.allergies.length ? [`Allergies: ${p.allergies.join(', ')}`] : [])].map((x) => <div key={x}>{x}</div>)}</div>
          </div>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          <Card className="p-5">
            <SectionLabel>Next appointment</SectionLabel>
            {next ? <><div className="font-display text-[24px] text-ink">{treatmentName(db, next.treatmentId)}</div><div className="text-[13px] text-stone-500">{fmtDateTime(next.start)} · {staffName(db, next.practitionerId)}</div><div className="mt-2"><StatusBadge status={next.status} /></div></> : <p className="text-[13.5px] text-stone-500">None booked</p>}
          </Card>
          <Card className="p-5">
            <SectionLabel>Last treatment</SectionLabel>
            {last ? <><div className="font-display text-[24px] text-ink">{treatmentName(db, last.treatmentId)}</div><div className="text-[13px] text-stone-500">{fmtDate(last.at)} · {staffName(db, last.practitionerId)}{last.dosage && ` · ${last.dosage}`}</div></> : <p className="text-[13.5px] text-stone-500">No treatments yet</p>}
          </Card>
          <Card className="p-5">
            <SectionLabel>Recommended next</SectionLabel>
            {rec ? <><div className="font-display text-[24px] text-ink">{rec.t}</div><div className="text-[13px] text-stone-500">{rec.due < new Date() ? <span className="text-amber-500">Overdue since {fmtDate(rec.due, { month: 'short', day: 'numeric' })}</span> : `Due ${fmtDate(rec.due, { month: 'short', day: 'numeric' })}`}</div></> : <p className="text-[13.5px] text-stone-500">Consultation recommended</p>}
          </Card>
          <Card className="p-5">
            <SectionLabel>Active package</SectionLabel>
            {pkg ? (
              <button onClick={() => onTab('Packages')} className="w-full text-left">
                <div className="font-display text-[22px] text-ink">{db.packageTemplates.find((x) => x.id === pkg.templateId)?.name}</div>
                {pkg.items.map((it) => <div key={it.treatmentId} className="mt-2"><div className="flex justify-between text-[12.5px]"><span className="text-stone-600">{treatmentName(db, it.treatmentId)}</span><span>{it.used}/{it.qty}</span></div><Progress value={it.used} max={it.qty} className="mt-1" color="#A8642A" /></div>)}
              </button>
            ) : <p className="text-[13.5px] text-stone-500">None</p>}
          </Card>
        </div>
        {can('clinical.view') && p.treatmentPlan.length > 0 && (
          <Card>
            <CardHeader title="Treatment plan" />
            <div className="divide-y divide-stone-100 px-5 pb-3 pt-2">{p.treatmentPlan.map((tp) => <div key={tp.id} className="flex items-center justify-between py-3 text-[13.5px]"><div><div className="text-ink">{tp.title}</div><div className="text-[12px] text-stone-500">{tp.target}</div></div><Badge tone={tp.status === 'Done' ? 'sage' : tp.status === 'In progress' ? 'bronze' : 'neutral'}>{tp.status}</Badge></div>)}</div>
          </Card>
        )}
      </div>
      <div className="space-y-6">
        <Card className="p-5">
          <SectionLabel>Contact</SectionLabel>
          <div className="space-y-2.5 text-[13.5px]">
            <div className="flex items-center gap-2.5"><Phone size={14} className="text-stone-400" /><a href={`tel:${p.phone}`} className="text-ink hover:underline">{p.phone}</a></div>
            <div className="flex items-center gap-2.5"><Mail size={14} className="text-stone-400" /><span className="truncate text-ink">{p.email}</span></div>
            <div className="flex items-start gap-2.5"><MapPin size={14} className="mt-0.5 text-stone-400" /><span className="text-ink">{p.address || '—'}</span></div>
          </div>
          <div className="mt-4 divide-y divide-stone-100 border-t border-stone-100 pt-1">
            <KV k="Date of birth" v={fmtDate(p.dob)} />
            <KV k="Preferred practitioner" v={p.preferredPractitionerId ? staffName(db, p.preferredPractitionerId) : '—'} />
            <KV k="Emergency contact" v={p.emergencyContact.name ? `${p.emergencyContact.name} (${p.emergencyContact.relation})` : '—'} />
            <KV k="Acquisition" v={p.source} />
            <KV k="Marketing consent" v={p.notify.marketing ? 'Yes' : 'No'} />
          </div>
        </Card>
        {mem && (
          <div className="grain relative overflow-hidden rounded-2xl bg-ink p-5 text-ivory">
            <div className="flex items-center justify-between text-[11.5px] uppercase tracking-[0.12em] text-ivory/50">Membership<Crown size={14} className="text-bronze-300" /></div>
            <div className="mt-2 font-display text-[26px]">{db.membershipPlans.find((x) => x.id === mem.planId)?.name}</div>
            <div className="text-[12.5px] text-ivory/60">{mem.status} · {mem.credits} credits · renews {fmtDate(mem.renewsAt, { month: 'short', day: 'numeric' })}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function PatientAppointments({ p }: { p: Patient }) {
  const db = useDB()
  const [open, setOpen] = useState<ID | null>(null)
  const list = db.appointments.filter((a) => a.patientId === p.id).sort((a, b) => b.start.localeCompare(a.start))
  return (
    <Card>
      <Table>
        <thead><tr><TH>Date</TH><TH>Treatment</TH><TH>Practitioner</TH><TH>Location</TH><TH>Status</TH><TH className="text-right">Price</TH></tr></thead>
        <tbody>{list.map((a) => <TR key={a.id} onClick={() => setOpen(a.id)}><TD>{fmtDateTime(a.start)}</TD><TD className="text-ink">{treatmentName(db, a.treatmentId)}</TD><TD>{staffName(db, a.practitionerId)}</TD><TD>{locationName(db, a.locationId)}</TD><TD><StatusBadge status={a.status} /></TD><TD className="text-right tabular-nums">{a.packageId ? 'Package' : money(a.price)}</TD></TR>)}</tbody>
      </Table>
      <AppointmentDrawer id={open} onClose={() => setOpen(null)} />
    </Card>
  )
}

function ClinicalTab({ p }: { p: Patient }) {
  const db = useDB()
  const can = useCan()
  const update = useStore((s) => s.updatePatient)
  const logAccess = useStore((s) => s.logAccess)
  useEffect(() => { logAccess(p.id, 'Medical history & sessions') }, [p.id, logAccess])
  const [editing, setEditing] = useState(false)
  const [m, setM] = useState({ allergies: p.allergies.join(', '), medications: p.medications.join(', '), conditions: p.conditions.join(', '), alerts: p.alerts.join('\n'), pregnancy: p.pregnancy })
  const sessions = db.sessions.filter((s) => s.patientId === p.id).sort((a, b) => b.at.localeCompare(a.at))
  const [sel, setSel] = useState<ID | null>(sessions[0]?.id ?? null)
  const s = sessions.find((x) => x.id === sel)
  const prev = s && sessions.find((x) => x.treatmentId === s.treatmentId && x.at < s.at)
  const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean)
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between"><SectionLabel className="mb-0">Medical history</SectionLabel>{can('clinical.write') && <button onClick={() => setEditing(!editing)} className="text-stone-400 hover:text-ink" aria-label="Edit"><Pencil size={14} /></button>}</div>
        {editing ? (
          <div className="space-y-3">
            <Field label="Allergies"><Input value={m.allergies} onChange={(e) => setM({ ...m, allergies: e.target.value })} /></Field>
            <Field label="Medications"><Input value={m.medications} onChange={(e) => setM({ ...m, medications: e.target.value })} /></Field>
            <Field label="Relevant conditions"><Input value={m.conditions} onChange={(e) => setM({ ...m, conditions: e.target.value })} /></Field>
            <Field label="Pregnancy status"><Select value={m.pregnancy} onChange={(e) => setM({ ...m, pregnancy: e.target.value as Patient['pregnancy'] })}>{['Not pregnant', 'Pregnant', 'Breastfeeding', 'Not applicable'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Clinical alerts (one per line)"><Textarea value={m.alerts} onChange={(e) => setM({ ...m, alerts: e.target.value })} /></Field>
            <Button size="sm" onClick={() => { update(p.id, { allergies: split(m.allergies), medications: split(m.medications), conditions: split(m.conditions), pregnancy: m.pregnancy, alerts: m.alerts.split('\n').map((x) => x.trim()).filter(Boolean) }); setEditing(false) }}>Save & sign</Button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            <KV k="Allergies" v={p.allergies.join(', ') || 'None known'} />
            <KV k="Medications" v={p.medications.join(', ') || 'None'} />
            <KV k="Conditions" v={p.conditions.join(', ') || 'None'} />
            <KV k="Pregnancy" v={p.pregnancy} />
            <KV k="Contraindications" v={p.pregnancy === 'Pregnant' || p.pregnancy === 'Breastfeeding' ? <span className="text-rose-500">Neuromodulators, fillers, laser</span> : 'None flagged'} />
            {p.alerts.length > 0 && <div className="py-2"><div className="mb-1 text-[13px] text-stone-500">Alerts</div>{p.alerts.map((a) => <div key={a} className="text-[13px] text-rose-700">{a}</div>)}</div>}
          </div>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-[11.5px] text-stone-400"><Lock size={11} />Access to this record is logged</div>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Treatment sessions" subtitle={`${sessions.length} signed records`} />
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="max-h-[560px] overflow-y-auto border-r border-stone-100 p-2">
            {sessions.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={cn('w-full rounded-xl px-3 py-2.5 text-left transition-colors', sel === x.id ? 'bg-cream' : 'hover:bg-cream/50')}><div className="text-[13px] text-ink">{treatmentName(db, x.treatmentId)} <span className="text-stone-400">#{x.sessionNumber}</span></div><div className="text-[11.5px] text-stone-500">{fmtDate(x.at)}</div></button>)}
            {!sessions.length && <p className="p-4 text-[13px] text-stone-500">No sessions yet.</p>}
          </div>
          {s ? (
            <div className="space-y-5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="font-display text-[26px] text-ink">{treatmentName(db, s.treatmentId)} · session {s.sessionNumber}</div><div className="text-[13px] text-stone-500">{fmtDateTime(s.at)} · {staffName(db, s.practitionerId)} · {locationName(db, s.locationId)}</div></div><Badge tone="sage" dot>Signed by {staffName(db, s.signedBy).split(' ').slice(-1)[0]}</Badge></div>
              <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-4">
                {[['Product', s.product || '—'], ['Lot / batch', s.lot || '—'], ['Expiry', s.expiry ? fmtDate(s.expiry, { month: 'short', year: 'numeric' }) : '—'], ['Dosage', s.dosage || '—']].map(([k, v]) => <div key={k} className="py-1.5"><div className="text-[11.5px] text-stone-400">{k}</div><div className="text-[13.5px] text-ink">{v}</div></div>)}
              </div>
              {s.points.length > 0 && <div className="rounded-2xl bg-ivory p-4 hairline"><FaceChart points={s.points} previous={prev?.points} unit={s.treatmentId === 'tx_lip' ? 'ml' : 'u'} /></div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div><SectionLabel>Clinical notes</SectionLabel><p className="text-[13.5px] leading-relaxed text-stone-700">{s.notes}</p></div>
                <div><SectionLabel>Patient-visible note</SectionLabel><p className="text-[13.5px] leading-relaxed text-stone-700">{s.patientNotes || '—'}</p></div>
                <div><SectionLabel>Complications</SectionLabel><p className="text-[13.5px] text-stone-700">{s.complications}</p></div>
                <div><SectionLabel>Recommendations</SectionLabel><p className="text-[13.5px] text-stone-700">{s.recommendations}</p></div>
              </div>
            </div>
          ) : <div className="p-10" />}
        </div>
      </Card>
    </div>
  )
}

function FormsTab({ p }: { p: Patient }) {
  const db = useDB()
  const send = useStore((s) => s.sendMessage)
  const [tpl, setTpl] = useState('form_photo')
  const subs = db.formSubmissions.filter((f) => f.patientId === p.id).sort((a, b) => b.signedAt.localeCompare(a.signedAt))
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
        <div className="flex-1 text-[15px] font-medium">Signed forms & consents</div>
        <Select value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-9 w-56">{db.formTemplates.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>
        <Button size="sm" variant="secondary" onClick={() => { const f = db.formTemplates.find((x) => x.id === tpl)!; send(null, p.id, 'clinic', `Please complete your ${f.name} in the Documents tab of your portal before your next visit.`, `Form request · ${f.name}`, 'General'); useStore.getState().toast('Form sent', `${f.name} requested via portal & SMS.`, 'success') }}>Send to patient</Button>
      </div>
      <Table className="mt-3">
        <thead><tr><TH>Form</TH><TH>Version</TH><TH>Signed</TH><TH>Witness</TH><TH>Device · IP</TH><TH>PDF</TH></tr></thead>
        <tbody>{subs.map((s) => { const f = db.formTemplates.find((x) => x.id === s.templateId)!; return <TR key={s.id}><TD className="text-ink"><FileText size={13} className="mr-1.5 inline text-stone-400" />{f.name}</TD><TD>v{s.version}{s.version < f.version && <Badge tone="amber" className="ml-2">Outdated</Badge>}</TD><TD>{fmtDateTime(s.signedAt)}</TD><TD>{s.witnessId ? staffName(db, s.witnessId) : '—'}</TD><TD className="text-[12.5px] text-stone-500">{s.device} · {s.ip}</TD><TD><Badge tone={s.pdf === 'Generated' ? 'sage' : 'amber'}>{s.pdf}</Badge></TD></TR> })}</tbody>
      </Table>
    </Card>
  )
}

function PaymentsTab({ p }: { p: Patient }) {
  const db = useDB()
  const can = useCan()
  const refund = useStore((s) => s.refund)
  const [checkout, setCheckout] = useState<ID | null>(null)
  const [refunding, setRefunding] = useState<ID | null>(null)
  const [reason, setReason] = useState('Patient request')
  const invs = db.invoices.filter((i) => i.patientId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const ref = invs.find((i) => i.id === refunding)
  return (
    <Card>
      <Table>
        <thead><tr><TH>Invoice</TH><TH>Date</TH><TH>Items</TH><TH>Status</TH><TH className="text-right">Total</TH><TH className="text-right">Paid</TH><TH /></tr></thead>
        <tbody>{invs.map((i) => (
          <TR key={i.id}><TD className="text-ink">{i.number}</TD><TD>{fmtDate(i.createdAt)}</TD><TD className="max-w-[260px] truncate">{i.lines.map((l) => l.desc).join(', ')}</TD><TD><Badge tone={i.status === 'Paid' ? 'sage' : i.status === 'Refunded' ? 'neutral' : 'amber'}>{i.status}</Badge></TD><TD className="text-right tabular-nums">{money(i.total, true)}</TD><TD className="text-right tabular-nums">{money(i.paid - i.refunded, true)}</TD>
            <TD className="text-right">{i.total - i.paid > 0.005 && can('payments.collect') ? <Button size="xs" onClick={() => setCheckout(i.id)}>Collect</Button> : i.status === 'Paid' && can('payments.refund') ? <Button size="xs" variant="ghost" onClick={() => setRefunding(i.id)}>Refund</Button> : null}</TD></TR>
        ))}</tbody>
      </Table>
      <CheckoutModal invoiceId={checkout} onClose={() => setCheckout(null)} />
      <Modal open={!!ref} onClose={() => setRefunding(null)} title="Issue refund" subtitle={ref ? `${ref.number} · ${money(ref.paid - ref.refunded, true)} refundable` : ''} footer={ref && <Button variant="danger" onClick={() => { refund(ref.id, ref.paid - ref.refunded, reason); setRefunding(null) }}>Refund {money(ref.paid - ref.refunded, true)}</Button>}>
        <Field label="Reason (recorded in audit log)"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{['Patient request', 'Treatment not performed', 'Pricing error', 'Goodwill'].map((r) => <option key={r}>{r}</option>)}</Select></Field>
      </Modal>
    </Card>
  )
}

function PackagesTab({ p }: { p: Patient }) {
  const db = useDB()
  const can = useCan()
  const sell = useStore((s) => s.sellPackage)
  const [tpl, setTpl] = useState(db.packageTemplates[0].id)
  const pkgs = db.patientPackages.filter((x) => x.patientId === p.id)
  return (
    <div className="space-y-4">
      {can('packages.manage') && <Card className="flex flex-wrap items-center gap-3 p-4"><Package size={16} className="text-stone-400" /><span className="text-[13.5px]">Sell a package</span><Select value={tpl} onChange={(e) => setTpl(e.target.value)} className="h-9 w-64">{db.packageTemplates.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name} · {money(x.price)}</option>)}</Select><Button size="sm" onClick={() => sell(p.id, tpl)}>Charge card on file</Button></Card>}
      {pkgs.map((pk) => (
        <Card key={pk.id} className="p-5">
          <div className="flex items-center justify-between"><div><div className="font-display text-[24px]">{db.packageTemplates.find((x) => x.id === pk.templateId)?.name}</div><div className="text-[12.5px] text-stone-500">Purchased {fmtDate(pk.purchasedAt)} · expires {fmtDate(pk.expiresAt)}</div></div><Badge tone={pk.status === 'Active' ? 'sage' : 'neutral'}>{pk.status}</Badge></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{pk.items.map((it) => <div key={it.treatmentId}><div className="flex justify-between text-[13px]"><span>{treatmentName(db, it.treatmentId)}</span><span className="tabular-nums">{it.used} of {it.qty} redeemed</span></div><Progress value={it.used} max={it.qty} className="mt-1.5" color="#A8642A" /></div>)}</div>
        </Card>
      ))}
      {!pkgs.length && <Empty icon={<Package size={18} />} title="No packages" />}
    </div>
  )
}

function MembershipTab({ p }: { p: Patient }) {
  const db = useDB()
  const subscribe = useStore((s) => s.subscribeMembership)
  const setStatus = useStore((s) => s.setMembershipStatus)
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {db.membershipPlans.map((pl) => {
        const current = mem?.planId === pl.id
        return (
          <Card key={pl.id} className={cn('flex flex-col p-5', current && 'ring-2 ring-ink')}>
            <div className="flex items-center justify-between"><span className="font-display text-[24px]">{pl.name}</span><span className="text-[14px]">{money(pl.price)}/mo</span></div>
            <ul className="mt-3 flex-1 space-y-1.5 text-[13px] text-stone-600">{pl.benefits.map((b) => <li key={b} className="flex gap-2"><Sparkles size={12} className="mt-1 text-bronze-500" />{b}</li>)}</ul>
            {current ? (
              <div className="mt-4 space-y-2"><Badge tone={mem!.status === 'Active' ? 'sage' : 'amber'}>{mem!.status}</Badge><div className="text-[12.5px] text-stone-500">Since {fmtDate(mem!.startedAt)} · renews {fmtDate(mem!.renewsAt)} · {mem!.paymentMethod}</div><div className="flex gap-2">{mem!.status !== 'Active' && <Button size="xs" onClick={() => setStatus(mem!.id, 'Active')}>Reactivate</Button>}<Button size="xs" variant="danger" onClick={() => setStatus(mem!.id, 'Cancelled')}>Cancel membership</Button></div></div>
            ) : <Button size="sm" variant="secondary" className="mt-4" onClick={() => subscribe(p.id, pl.id)}>{mem ? 'Switch plan' : 'Enrol'}</Button>}
          </Card>
        )
      })}
    </div>
  )
}

function MessagesTab({ p }: { p: Patient }) {
  const db = useDB()
  const send = useStore((s) => s.sendMessage)
  const markRead = useStore((s) => s.markThreadRead)
  const threads = db.threads.filter((t) => t.patientId === p.id)
  const [sel, setSel] = useState<ID | null>(threads[0]?.id ?? null)
  const [composing, setComposing] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const t = threads.find((x) => x.id === sel)
  useEffect(() => { if (t?.unreadClinic) markRead(t.id, 'clinic') }, [t, markRead])
  return (
    <Card className="flex h-[560px] overflow-hidden">
      <div className="w-[260px] shrink-0 overflow-y-auto border-r border-stone-100">
        <div className="p-3"><Button size="sm" variant="secondary" className="w-full" icon={<Plus size={14} />} onClick={() => setComposing(true)}>New conversation</Button></div>
        {threads.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={cn('block w-full border-b border-stone-100 px-4 py-3 text-left', sel === x.id ? 'bg-cream' : 'hover:bg-cream/50')}><div className="flex items-center gap-2"><span className={cn('truncate text-[13px]', x.unreadClinic && 'font-semibold')}>{x.subject}</span>{x.unreadClinic && <span className="h-1.5 w-1.5 rounded-full bg-bronze-500" />}</div><div className="truncate text-[12px] text-stone-500">{x.messages[x.messages.length - 1].text}</div></button>)}
      </div>
      <div className="min-w-0 flex-1">{t ? <ChatView thread={t} side="clinic" onSend={(text) => send(t.id, p.id, 'clinic', text)} /> : <Empty title="No conversations" />}</div>
      <Modal open={composing} onClose={() => setComposing(false)} title={`Message ${p.firstName}`} footer={<Button disabled={!subject || !body} onClick={() => { const id = send(null, p.id, 'clinic', body, subject, 'Practitioner'); setSel(id); setComposing(false); setSubject(''); setBody('') }}>Send securely</Button>}>
        <div className="space-y-3"><Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field><Field label="Message"><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field></div>
      </Modal>
    </Card>
  )
}

function NotesTab({ p }: { p: Patient }) {
  const db = useDB()
  const add = useStore((s) => s.addPatientNote)
  const [text, setText] = useState('')
  return (
    <Card className="p-5">
      <div className="flex gap-2"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an internal note (staff only)…" className="min-h-[60px]" /><Button disabled={!text.trim()} onClick={() => { add(p.id, text.trim()); setText('') }}>Add</Button></div>
      <div className="mt-5 space-y-3">{p.notes.map((n) => <div key={n.id} className="rounded-xl bg-ivory p-4 hairline"><div className="text-[13.5px] text-stone-700">{n.text}</div><div className="mt-1.5 text-[11.5px] text-stone-400">{staffName(db, n.by)} · {relative(n.at)}</div></div>)}</div>
    </Card>
  )
}

function ActivityTab({ p }: { p: Patient }) {
  const db = useDB()
  const events = db.audit.filter((e) => e.patientId === p.id)
  return (
    <Card>
      <Table>
        <thead><tr><TH>When</TH><TH>User</TH><TH>Action</TH><TH>Detail</TH><TH>Change</TH></tr></thead>
        <tbody>{events.map((e) => <TR key={e.id}><TD className="whitespace-nowrap">{fmtDateTime(e.at)}</TD><TD>{staffName(db, e.userId)}</TD><TD className="text-ink">{e.action}</TD><TD>{e.entity}</TD><TD className="text-[12px] text-stone-500">{e.oldValue && <span className="line-through">{e.oldValue}</span>} {e.newValue && <>→ {e.newValue}</>}</TD></TR>)}</tbody>
      </Table>
      {!events.length && <p className="py-10 text-center text-sm text-stone-500">No activity yet.</p>}
    </Card>
  )
}
