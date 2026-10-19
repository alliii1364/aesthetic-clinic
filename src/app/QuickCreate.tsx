import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, CalendarPlus, UserPlus, Target, ShoppingBag } from 'lucide-react'
import { useDB, useStore, useCan, useVisibleLocations, patientName } from '@/store/store'
import type { ID } from '@/lib/types'
import { Button, Field, Input, Modal, Select, Textarea, cn } from '@/ui/ui'
import { slotsFor } from '@/lib/availability'
import { addDays, fmtTime, money, startOfDay } from '@/lib/format'

export function QuickCreate() {
  const can = useCan()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState<'appt' | 'patient' | 'lead' | null>(null)
  const items = [
    { k: 'appt', l: 'New appointment', i: CalendarPlus, show: can('calendar.manage') },
    { k: 'patient', l: 'New patient', i: UserPlus, show: can('patients.manage') },
    { k: 'lead', l: 'New lead', i: Target, show: can('leads.manage') },
    { k: 'sale', l: 'New sale', i: ShoppingBag, show: can('payments.collect') },
  ].filter((x) => x.show)
  if (!items.length) return null
  return (
    <div className="relative">
      <Button size="sm" className="h-9" onClick={() => setOpen(!open)} icon={<Plus size={15} />}><span className="hidden sm:inline">New</span></Button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lift">
              {items.map((x) => (
                <button key={x.k} onClick={() => { setOpen(false); if (x.k === 'sale') nav('/app/pos'); else setModal(x.k as 'appt') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-stone-700 hover:bg-cream"><x.i size={16} strokeWidth={1.6} />{x.l}</button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <NewAppointmentModal open={modal === 'appt'} onClose={() => setModal(null)} />
      <NewPatientModal open={modal === 'patient'} onClose={() => setModal(null)} />
      <NewLeadModal open={modal === 'lead'} onClose={() => setModal(null)} />
    </div>
  )
}

export function NewPatientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: ID) => void }) {
  const create = useStore((s) => s.createPatient)
  const nav = useNavigate()
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', dob: '', source: 'Walk-in' })
  const ok = f.firstName && f.lastName && /\S+@\S+/.test(f.email) && f.phone.length > 6
  return (
    <Modal open={open} onClose={onClose} title="New patient" subtitle="Creates a CRM record and portal invitation." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ok} onClick={() => { const id = create({ ...f, dob: f.dob || '1990-01-01' }); if (id) { onClose(); setF({ firstName: '', lastName: '', email: '', phone: '', dob: '', source: 'Walk-in' }); onCreated ? onCreated(id) : nav(`/app/patients/${id}`) } }}>Create patient</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><Input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} autoFocus /></Field>
        <Field label="Last name"><Input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Mobile"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Date of birth"><Input type="date" value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value })} /></Field>
        <Field label="Source"><Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{['Walk-in', 'Referral', 'Instagram', 'Google search', 'Phone enquiry'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
      </div>
    </Modal>
  )
}

export function NewLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const addLead = useStore((s) => s.addLead)
  const [f, setF] = useState({ name: '', email: '', phone: '', interestId: 'tx_botox', source: 'Phone enquiry', notes: '' })
  return (
    <Modal open={open} onClose={onClose} title="New lead" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!f.name || !f.phone} onClick={() => { addLead(f); onClose(); useStore.getState().toast('Lead added', 'Nurture automation started.', 'success') }}>Add lead</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Interested in"><Select value={f.interestId} onChange={(e) => setF({ ...f, interestId: e.target.value })}>{db.treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
        <Field label="Source"><Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>{['Phone enquiry', 'Walk-in', 'Instagram', 'Referral', 'Event'].map((s) => <option key={s}>{s}</option>)}</Select></Field>
        <Field label="Notes" className="sm:col-span-2"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}

/** One-click booking from anywhere: calendar slot, patient profile or lead card. */
export function NewAppointmentModal({ open, onClose, patientId, leadId, start, practitionerId, locationId }: { open: boolean; onClose: () => void; patientId?: ID; leadId?: ID; start?: string; practitionerId?: ID; locationId?: ID }) {
  const db = useDB()
  const visible = useVisibleLocations()
  const createAppointment = useStore((s) => s.createAppointment)
  const convertLead = useStore((s) => s.convertLead)
  const moveLead = useStore((s) => s.moveLead)
  const addActivity = useStore((s) => s.addLeadActivity)
  const lead = db.leads.find((l) => l.id === leadId)
  const [q, setQ] = useState('')
  const [f, setF] = useState({ patientId: '', treatmentId: '', practitionerId: '', locationId: '', date: '', start: '', notes: '' })
  useEffect(() => {
    if (!open) return
    const loc = locationId ?? lead?.locationId ?? visible[0]
    const tx = lead ? 'tx_consult' : '' // leads start with a consultation
    setF({ patientId: patientId ?? lead?.patientId ?? '', treatmentId: tx, practitionerId: practitionerId ?? '', locationId: loc, date: start ? start.slice(0, 10) : startOfDay(addDays(new Date(), 1)).toISOString(), start: start ?? '', notes: lead ? `Consultation for ${db.treatments.find((t) => t.id === lead.interestId)?.name}` : '' })
    setQ('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const t = db.treatments.find((x) => x.id === f.treatmentId)
  const pracs = db.staff.filter((s) => s.bookable && s.locationIds.includes(f.locationId) && (!t || t.practitionerIds.includes(s.id)))
  const matches = useMemo(() => (q.length > 1 ? db.patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : []), [q, db.patients])
  const slots = t && f.practitionerId && f.date ? slotsFor(db, f.practitionerId, f.locationId, new Date(f.date), t.duration) : []
  const slotList = start && !slots.some((s) => s.toISOString() === start) ? [new Date(start), ...slots] : slots
  const ok = (f.patientId || lead) && t && f.practitionerId && f.start
  const save = () => {
    let pid = f.patientId
    if (!pid && lead) pid = convertLead(lead.id) ?? ''
    if (!pid || !t) return
    const loc = db.locations.find((l) => l.id === f.locationId)!
    const id = createAppointment({ patientId: pid, treatmentId: t.id, practitionerId: f.practitionerId, locationId: f.locationId, roomId: loc.rooms.find((r) => (t.category === 'Laser' ? r.kind === 'Laser' : r.kind !== 'Laser'))?.id ?? loc.rooms[0].id, start: f.start, duration: t.duration, status: 'Confirmed', price: t.locationPricing[f.locationId] ?? t.priceFrom, deposit: t.deposit, notes: f.notes, source: lead ? 'Lead' : 'Phone' })
    if (id && lead) { moveLead(lead.id, 'Consultation Booked'); addActivity(lead.id, 'appointment', `${t.name} booked for ${new Date(f.start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`) }
    if (id) onClose()
  }
  return (
    <Modal open={open} onClose={onClose} width={620} title="New appointment" subtitle={lead ? `From lead · ${lead.name}` : undefined} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ok} onClick={save}>Book appointment</Button></>}>
      <div className="space-y-4">
        {!lead && (
          <Field label="Patient">
            {f.patientId ? (
              <div className="flex h-10 items-center justify-between rounded-xl border border-stone-200 bg-white px-3.5 text-sm"><span>{patientName(db, f.patientId)}</span>{!patientId && <button className="text-[12px] text-stone-500 hover:text-ink" onClick={() => setF({ ...f, patientId: '' })}>Change</button>}</div>
            ) : (
              <div className="relative">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone…" autoFocus />
                {matches.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-xl border border-stone-200 bg-white p-1 shadow-lift">{matches.map((p) => <button key={p.id} onClick={() => setF({ ...f, patientId: p.id })} className="block w-full rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-cream">{p.firstName} {p.lastName} <span className="text-stone-400">· {p.phone}</span></button>)}</div>}
              </div>
            )}
          </Field>
        )}
        {lead && !lead.patientId && <div className="rounded-xl bg-cream px-4 py-3 text-[13px] text-stone-600">A patient record will be created for {lead.name} automatically, and the lead moves to “Consultation Booked”.</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Treatment"><Select value={f.treatmentId} onChange={(e) => setF({ ...f, treatmentId: e.target.value, practitionerId: '', start: start ?? '' })}><option value="">Choose…</option>{db.treatments.filter((x) => x.active && x.locationIds.includes(f.locationId)).map((x) => <option key={x.id} value={x.id}>{x.name} · {x.duration}m · {x.priceFrom ? money(x.locationPricing[f.locationId] ?? x.priceFrom) : 'Free'}</option>)}</Select></Field>
          <Field label="Location"><Select value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value, practitionerId: '', start: '' })}>{db.locations.filter((l) => visible.includes(l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
          <Field label="Practitioner"><Select value={f.practitionerId} onChange={(e) => setF({ ...f, practitionerId: e.target.value, start: start ?? '' })}><option value="">Choose…</option>{pracs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Date"><Input type="date" value={f.date.slice(0, 10)} onChange={(e) => setF({ ...f, date: new Date(e.target.value + 'T00:00').toISOString(), start: '' })} /></Field>
        </div>
        {t && f.practitionerId && (
          <div>
            <div className="mb-2 text-[12.5px] font-medium text-stone-600">Available times</div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slotList.map((s) => <button key={s.toISOString()} onClick={() => setF({ ...f, start: s.toISOString() })} className={cn('rounded-lg border py-2 text-[13px] transition', f.start === s.toISOString() ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white hover:border-stone-400')}>{fmtTime(s)}</button>)}
              {!slotList.length && <p className="col-span-full text-[13px] text-stone-500">No availability on this date.</p>}
            </div>
          </div>
        )}
        <Field label="Notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-[64px]" /></Field>
      </div>
    </Modal>
  )
}
