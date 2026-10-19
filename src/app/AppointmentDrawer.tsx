import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, CheckCircle2, CreditCard, FileSignature, LogIn, MessageCircle, Play, Stethoscope, UserX, X, CalendarClock, Camera, Boxes, Receipt, Percent, Send, Star, Package, ArrowRight } from 'lucide-react'
import { useDB, useStore, useCan, staffName, locationName, roomName, treatmentName } from '@/store/store'
import type { ID, InjectionPoint } from '@/lib/types'
import { Avatar, Badge, Button, Drawer, Field, Input, KV, Modal, SectionLabel, Select, StatusBadge, Textarea, EASE, cn } from '@/ui/ui'
import { age, fmtDate, fmtDateTime, fmtTime, money, addMinutes } from '@/lib/format'
import { slotsFor } from '@/lib/availability'
import { FaceChart } from '@/shared/FaceChart'
import { FormRenderer, isComplete, type Answers } from '@/shared/FormRenderer'
import { CheckoutModal } from './Checkout'

export function AppointmentDrawer({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const can = useCan()
  const setStatus = useStore((s) => s.setAppointmentStatus)
  const update = useStore((s) => s.updateAppointment)
  const [mode, setMode] = useState<'view' | 'complete' | 'report' | 'reschedule'>('view')
  const [checkout, setCheckout] = useState<ID | null>(null)
  const [kiosk, setKiosk] = useState<ID | null>(null)
  const a = db.appointments.find((x) => x.id === id)
  useEffect(() => { setMode('view') }, [id])
  const p = db.patients.find((x) => x.id === a?.patientId)
  const t = db.treatments.find((x) => x.id === a?.treatmentId)
  const inv = db.invoices.find((x) => x.id === a?.invoiceId)
  const history = a ? db.sessions.filter((s) => s.patientId === a.patientId && s.appointmentId !== a.id).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 3) : []
  const [internal, setInternal] = useState('')
  useEffect(() => setInternal(a?.internalNotes ?? ''), [a?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mem = p && db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const showClinical = can('clinical.view')
  const balance = inv ? Math.max(0, Math.round((inv.total - inv.paid) * 100) / 100) : 0

  return (
    <>
      <Drawer open={!!a} onClose={onClose} width={560}
        title={a && p ? <Link to={`/app/patients/${p.id}`} className="hover:underline">{p.firstName} {p.lastName}</Link> : ''}
        subtitle={a && t ? `${t.name} · ${fmtDateTime(a.start)}–${fmtTime(addMinutes(a.start, a.duration))}` : ''}>
        {a && p && t && (
          <AnimatePresence mode="wait">
            {mode === 'view' && (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  {mem && <Badge tone="bronze">{db.membershipPlans.find((x) => x.id === mem.planId)?.name}</Badge>}
                  {a.packageId && <Badge tone="violet">Package session</Badge>}
                  {p.tags.map((tg) => <Badge key={tg}>{tg}</Badge>)}
                  <span className="ml-auto text-[12px] text-stone-400">via {a.source}</span>
                </div>

                {/* primary actions follow the real clinic flow */}
                <div className="flex flex-wrap gap-2">
                  {(a.status === 'Requested') && <Button size="sm" icon={<Check size={14} />} onClick={() => setStatus(a.id, 'Confirmed')}>Confirm</Button>}
                  {a.status === 'Confirmed' && <Button size="sm" icon={<LogIn size={14} />} onClick={() => setStatus(a.id, 'Checked In')}>Check in</Button>}
                  {a.status === 'Checked In' && <Button size="sm" icon={<Play size={14} />} onClick={() => setStatus(a.id, 'In Treatment')}>Start treatment</Button>}
                  {['Checked In', 'In Treatment', 'Confirmed'].includes(a.status) && can('clinical.write') && <Button size="sm" variant={a.status === 'In Treatment' ? 'primary' : 'secondary'} icon={<CheckCircle2 size={14} />} onClick={() => setMode('complete')}>Complete treatment</Button>}
                  {balance > 0 && can('payments.collect') && <Button size="sm" variant={a.status === 'Completed' ? 'primary' : 'secondary'} icon={<CreditCard size={14} />} onClick={() => setCheckout(inv!.id)}>Collect {money(balance, true)}</Button>}
                  {showClinical && <Link to={`/app/patients/${p.id}?tab=Clinical`}><Button size="sm" variant="secondary" icon={<Stethoscope size={14} />}>Clinical record</Button></Link>}
                  <Link to={`/app/patients/${p.id}?tab=Messages`}><Button size="sm" variant="ghost" icon={<MessageCircle size={14} />}>Message</Button></Link>
                  {!['Completed', 'Cancelled', 'No Show'].includes(a.status) && <Button size="sm" variant="ghost" icon={<CalendarClock size={14} />} onClick={() => setMode('reschedule')}>Reschedule</Button>}
                  {['Confirmed', 'Requested', 'Checked In'].includes(a.status) && new Date(a.start) < new Date() && <Button size="sm" variant="ghost" icon={<UserX size={14} />} onClick={() => setStatus(a.id, 'No Show')}>No-show</Button>}
                  {['Confirmed', 'Requested'].includes(a.status) && <Button size="sm" variant="ghost" icon={<X size={14} />} onClick={() => setStatus(a.id, 'Cancelled')}>Cancel</Button>}
                </div>

                {showClinical && (p.alerts.length > 0 || p.allergies.length > 0 || p.pregnancy !== 'Not pregnant') && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-50 p-4">
                    <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-rose-700"><AlertTriangle size={14} />Medical alerts</div>
                    <ul className="space-y-1 text-[13px] text-rose-700/90">
                      {p.alerts.map((x) => <li key={x}>{x}</li>)}
                      {p.allergies.length > 0 && <li>Allergies: {p.allergies.join(', ')}</li>}
                      {p.pregnancy !== 'Not pregnant' && p.pregnancy !== 'Not applicable' && <li>{p.pregnancy}</li>}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <StatusTile icon={<FileSignature size={15} />} label="Intake" value={a.intake} ok={a.intake !== 'Pending'} />
                  <StatusTile icon={<FileSignature size={15} />} label="Consent" value={a.consent} ok={a.consent !== 'Pending'} action={a.consent === 'Pending' && t.consentFormId ? () => setKiosk(t.consentFormId!) : undefined} />
                </div>

                <div>
                  <SectionLabel>Appointment</SectionLabel>
                  <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
                    <KV k="Practitioner" v={staffName(db, a.practitionerId)} />
                    <KV k="Location · room" v={`${locationName(db, a.locationId)} · ${roomName(db, a.roomId)}`} />
                    <KV k="Time" v={`${fmtTime(a.start)} – ${fmtTime(addMinutes(a.start, a.duration))} (${a.duration}m)`} />
                    <KV k="Price" v={a.packageId ? 'Package credit' : money(a.price)} />
                    <KV k="Deposit" v={a.deposit ? `${money(a.deposit)} · ${a.depositPaid ? 'paid' : 'not paid'}` : '—'} />
                    <KV k="Remaining balance" v={<span className={balance > 0 ? 'font-medium text-ink' : 'text-sage-500'}>{inv ? money(balance, true) : '—'}</span>} />
                  </div>
                </div>

                <div>
                  <SectionLabel>Patient</SectionLabel>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={44} />
                    <div className="flex-1 text-[13.5px]"><div className="text-ink">{p.phone} · {p.email}</div><div className="text-stone-500">{age(p.dob)} years · patient since {fmtDate(p.since, { month: 'short', year: 'numeric' })}</div></div>
                  </div>
                  {a.notes && <div className="mt-3 rounded-xl bg-cream px-4 py-3 text-[13px] text-stone-600">{a.notes}</div>}
                </div>

                {showClinical && history.length > 0 && (
                  <div>
                    <SectionLabel>Treatment history</SectionLabel>
                    <div className="space-y-2">
                      {history.map((s) => <div key={s.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[13px] hairline"><div><div className="text-ink">{treatmentName(db, s.treatmentId)} {s.dosage && <span className="text-stone-500">· {s.dosage}</span>}</div><div className="text-stone-500">{staffName(db, s.practitionerId)}</div></div><span className="text-stone-400">{fmtDate(s.at, { month: 'short', day: 'numeric' })}</span></div>)}
                    </div>
                  </div>
                )}

                <div>
                  <SectionLabel>Internal notes</SectionLabel>
                  <Textarea value={internal} onChange={(e) => setInternal(e.target.value)} onBlur={() => internal !== a.internalNotes && update(a.id, { internalNotes: internal })} placeholder="Visible to staff only" />
                </div>
              </motion.div>
            )}
            {mode === 'complete' && <CompleteTreatment key="complete" apptId={a.id} onCancel={() => setMode('view')} onDone={() => setMode('report')} />}
            {mode === 'report' && <CompletionReportView key="report" onCollect={() => { const r = useStore.getState().lastCompletion; if (r) setCheckout(r.invoiceId) }} onBack={() => setMode('view')} />}
            {mode === 'reschedule' && <RescheduleInline key="res" apptId={a.id} onDone={() => setMode('view')} />}
          </AnimatePresence>
        )}
      </Drawer>
      <CheckoutModal invoiceId={checkout} onClose={() => setCheckout(null)} />
      <KioskSign formId={kiosk} patientId={a?.patientId} apptId={a?.id} onClose={() => setKiosk(null)} />
    </>
  )
}

const StatusTile = ({ icon, label, value, ok, action }: { icon: React.ReactNode; label: string; value: string; ok: boolean; action?: () => void }) => (
  <div className={cn('rounded-2xl border p-3.5', ok ? 'border-stone-200/70 bg-white' : 'border-amber-500/25 bg-amber-50')}>
    <div className="flex items-center gap-2 text-[12px] text-stone-500">{icon}{label}</div>
    <div className={cn('mt-1 text-[14px] font-medium', ok ? 'text-sage-500' : 'text-amber-500')}>{value}</div>
    {action && <button onClick={action} className="mt-1 text-[12px] text-ink underline underline-offset-2">Sign on tablet</button>}
  </div>
)

function KioskSign({ formId, patientId, apptId, onClose }: { formId: ID | null; patientId?: ID; apptId?: ID; onClose: () => void }) {
  const db = useDB()
  const sign = useStore((s) => s.signForm)
  const [answers, setAnswers] = useState<Answers>({})
  const f = db.formTemplates.find((x) => x.id === formId)
  useEffect(() => setAnswers({}), [formId])
  return (
    <Modal open={!!f} onClose={onClose} width={600} title={f?.name} subtitle="Hand the tablet to the patient · kiosk mode" footer={f && patientId && <Button disabled={!isComplete(f, answers)} onClick={() => { sign(f.id, patientId, answers, 'iPad · Clinic kiosk', apptId); useStore.getState().toast('Consent signed', `${f.name} v${f.version} · PDF generated`, 'success'); onClose() }}>Patient signs & submits</Button>}>
      {f && <FormRenderer form={f} answers={answers} onChange={setAnswers} />}
    </Modal>
  )
}

function RescheduleInline({ apptId, onDone }: { apptId: ID; onDone: () => void }) {
  const db = useDB()
  const move = useStore((s) => s.moveAppointment)
  const a = db.appointments.find((x) => x.id === apptId)!
  const [date, setDate] = useState(a.start.slice(0, 10))
  const [prac, setPrac] = useState(a.practitionerId)
  const t = db.treatments.find((x) => x.id === a.treatmentId)!
  const others = { ...db, appointments: db.appointments.filter((x) => x.id !== a.id) }
  const slots = slotsFor(others, prac, a.locationId, new Date(date + 'T00:00'), a.duration)
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-5 p-6">
      <div className="font-display text-[24px]">Reschedule</div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Practitioner"><Select value={prac} onChange={(e) => setPrac(e.target.value)}>{db.staff.filter((s) => t.practitionerIds.includes(s.id) && s.locationIds.includes(a.locationId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {slots.map((s) => <button key={s.toISOString()} onClick={() => { move(a.id, s.toISOString(), prac); onDone() }} className="rounded-lg border border-stone-200 bg-white py-2 text-[13px] hover:border-ink">{fmtTime(s)}</button>)}
        {!slots.length && <p className="col-span-full text-[13px] text-stone-500">No availability — try another date.</p>}
      </div>
      <Button variant="ghost" onClick={onDone}>Back</Button>
    </motion.div>
  )
}

/** Clinical completion: chart, record product & lot, sign — then the platform runs the downstream chain. */
function CompleteTreatment({ apptId, onCancel, onDone }: { apptId: ID; onCancel: () => void; onDone: () => void }) {
  const db = useDB()
  const complete = useStore((s) => s.completeAppointment)
  const addPhoto = useStore((s) => s.addPhoto)
  const a = db.appointments.find((x) => x.id === apptId)!
  const t = db.treatments.find((x) => x.id === a.treatmentId)!
  const prev = db.sessions.filter((s) => s.patientId === a.patientId && s.treatmentId === t.id).sort((x, y) => y.at.localeCompare(x.at))[0]
  const primary = t.consumables[0] && db.inventory.find((i) => i.sku === t.consumables[0].sku && i.locationId === a.locationId)
  const [points, setPoints] = useState<InjectionPoint[]>(prev?.points ?? [])
  const [lot, setLot] = useState(primary?.lots[0]?.lot ?? '')
  const [f, setF] = useState({ notes: '', patientNotes: '', complications: 'None', recommendations: t.sessions })
  const [photoTaken, setPhotoTaken] = useState(false)
  const isLip = t.id === 'tx_lip' || t.id === 'tx_filler'
  const total = points.reduce((x, p) => x + p.units, 0)
  const lotObj = primary?.lots.find((l) => l.lot === lot)
  const submit = () => {
    const r = complete(a.id, { points, notes: f.notes || 'Treatment completed as planned.', patientNotes: f.patientNotes, product: primary?.name ?? t.name, lot, expiry: lotObj?.expiry ?? '', dosage: t.usesInjectionMap && total ? `${total} ${isLip ? 'ml' : 'units'}` : '', complications: f.complications, recommendations: f.recommendations })
    if (r) onDone()
  }
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.4, ease: EASE }} className="space-y-6 p-6">
      <div>
        <div className="font-display text-[26px] text-ink">Complete {t.name}</div>
        <p className="text-[13px] text-stone-500">Signing records the session, deducts stock, finalises the invoice and starts aftercare.</p>
      </div>
      {t.usesInjectionMap && (
        <div className="rounded-2xl border border-stone-200/70 bg-white p-4">
          <FaceChart points={points} onChange={setPoints} previous={prev?.points} unit={isLip ? 'ml' : 'u'} step={isLip ? 0.1 : 1} compact />
          {prev && <p className="mt-3 text-[12px] text-stone-500">Pre-filled from session {prev.sessionNumber} ({fmtDate(prev.at, { month: 'short', day: 'numeric' })}) · {prev.dosage}. Adjust as needed.</p>}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Product">
          <div className="flex h-10 items-center truncate rounded-xl border border-stone-200 bg-cream/50 px-3.5 text-[13px] text-stone-600">{primary?.name ?? '—'}</div>
        </Field>
        <Field label="Lot / batch">
          <Select value={lot} onChange={(e) => setLot(e.target.value)}>{primary?.lots.map((l) => <option key={l.lot} value={l.lot}>{l.lot} · exp {fmtDate(l.expiry, { month: 'short', year: '2-digit' })} · {l.qty} {primary.unit}</option>)}{!primary?.lots.length && <option value="">No lots in stock</option>}</Select>
        </Field>
      </div>
      {primary && <div className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-[12.5px] text-stone-600"><Boxes size={14} />Will deduct {t.usesInjectionMap && primary.unit === 'units' && total ? total : t.consumables[0].qty} {primary.unit} from {primary.name} ({primary.stock} in stock at {locationName(db, a.locationId)})</div>}
      <Field label="Clinical notes"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Procedure details, technique, patient response…" /></Field>
      <Field label="Note to patient (visible in portal)"><Textarea value={f.patientNotes} onChange={(e) => setF({ ...f, patientNotes: e.target.value })} placeholder="E.g. results will appear in 3–5 days…" className="min-h-[64px]" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Complications"><Input value={f.complications} onChange={(e) => setF({ ...f, complications: e.target.value })} /></Field>
        <Field label="Recommendation"><Input value={f.recommendations} onChange={(e) => setF({ ...f, recommendations: e.target.value })} /></Field>
      </div>
      <button onClick={() => { addPhoto({ patientId: a.patientId, treatmentId: t.id, stage: prev ? 'Follow-up' : 'Baseline', angle: 'Front', permission: 'Clinical only', src: db.patients.find((x) => x.id === a.patientId)?.avatar ?? db.photos[0].src }); setPhotoTaken(true) }} disabled={photoTaken}
        className={cn('flex w-full items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-[13.5px] transition', photoTaken ? 'border-sage-500/40 bg-sage-50 text-sage-700' : 'border-stone-300 text-stone-600 hover:border-stone-400')}>
        <Camera size={16} />{photoTaken ? 'Treatment photo captured · clinical only' : 'Add treatment photo'}
      </button>
      <div className="flex justify-end gap-2 border-t border-stone-100 pt-5">
        <Button variant="ghost" onClick={onCancel}>Back</Button>
        <Button onClick={submit} disabled={t.usesInjectionMap && total === 0} icon={<FileSignature size={15} />}>Sign & complete</Button>
      </div>
    </motion.div>
  )
}

function CompletionReportView({ onCollect, onBack }: { onCollect: () => void; onBack: () => void }) {
  const r = useStore((s) => s.lastCompletion)
  const db = useDB()
  if (!r) return null
  const inv = db.invoices.find((i) => i.id === r.invoiceId)
  const steps = [
    { icon: Stethoscope, t: 'Clinical record signed', d: 'Session, dosage, lot and map saved to the EMR' },
    ...(r.packageRedeemed ? [{ icon: Package, t: 'Package redeemed', d: r.packageRedeemed }] : []),
    ...r.stock.map((s) => ({ icon: Boxes, t: `Stock deducted · ${s.used} ${s.unit}`, d: `${s.name}: ${s.remaining} ${s.unit} remaining${s.low ? ' — below reorder level, alert sent' : ''}`, warn: s.low })),
    { icon: Receipt, t: `Invoice ${inv?.number} generated`, d: r.balance > 0 ? `Balance due ${money(r.balance, true)}` : 'Fully settled' },
    ...(r.commission.length ? r.commission.map((c) => ({ icon: Percent, t: `Commission recorded · ${money(c.amount, true)}`, d: `${c.staff} · pending payroll` })) : []),
    ...r.automations.map((au) => ({ icon: Send, t: `Automation started · ${au.name}`, d: `${au.steps} messages scheduled` })),
    { icon: Star, t: 'Review request queued', d: 'Positive → Google · negative → private feedback' },
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: EASE }} className="grid h-14 w-14 place-items-center rounded-full bg-sage-50 text-sage-500"><CheckCircle2 size={26} /></motion.div>
      <div className="mt-4 font-display text-[28px] text-ink">Treatment completed</div>
      <p className="text-[13.5px] text-stone-500">Here’s everything Aurelia OS just did for you.</p>
      <div className="relative mt-6 space-y-1">
        <div className="absolute bottom-4 left-[17px] top-4 w-px bg-stone-200" />
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, duration: 0.45, ease: EASE }} className="relative flex gap-4 py-2">
            <span className={cn('relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-white', (s as { warn?: boolean }).warn ? 'border-amber-500/40 text-amber-500' : 'border-stone-200 text-sage-500')}><s.icon size={15} /></span>
            <div className="pt-1"><div className="text-[13.5px] font-medium text-ink">{s.t}</div><div className="text-[12.5px] text-stone-500">{s.d}</div></div>
          </motion.div>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        {r.balance > 0 && <Button onClick={onCollect} icon={<CreditCard size={15} />}>Collect {money(r.balance, true)}</Button>}
        <Button variant="secondary" onClick={onBack}>Back to appointment <ArrowRight size={14} /></Button>
      </div>
    </motion.div>
  )
}
