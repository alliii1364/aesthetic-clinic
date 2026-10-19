import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, Reorder } from 'framer-motion'
import { Camera, ZoomIn, ZoomOut, Plus, GripVertical, Trash2, Eye, FileSignature, Type, CheckSquare, CircleDot, List, PenLine, Calendar, ToggleLeft, Heading, AlignLeft, ShieldCheck, Stethoscope, AlertTriangle, ScanSearch } from 'lucide-react'
import { useDB, useStore, useCan, useMe, useVisibleLocations, patientName, treatmentName, staffName } from '@/store/store'
import type { FieldType, FormField, FormTemplate, ID, Photo as PhotoT, PhotoPermission } from '@/lib/types'
import { Avatar, Badge, BeforeAfter, Button, Card, CardHeader, Empty, Field, Input, Modal, PageHeader, Photo, Segmented, Select, StatusBadge, Table, TD, TH, TR, Tabs, Toggle, EASE } from '@/ui/ui'
import { fmtDate, fmtDateTime, fmtTime, relative, uid, startOfDay, addDays } from '@/lib/format'
import { FormRenderer, type Answers } from '@/shared/FormRenderer'
import { AppointmentDrawer } from './AppointmentDrawer'

// ── Clinical overview ───────────────────────────────────────────────────────
export function ClinicalPage() {
  const db = useDB()
  const me = useMe()
  const can = useCan()
  const locs = useVisibleLocations()
  const [open, setOpen] = useState<ID | null>(null)
  const [lot, setLot] = useState('')
  const mineOnly = me.bookable
  const today = db.appointments.filter((a) => locs.includes(a.locationId) && new Date(a.start) >= startOfDay() && new Date(a.start) < addDays(startOfDay(), 1) && a.status !== 'Cancelled' && (!mineOnly || a.practitionerId === me.id)).sort((a, b) => a.start.localeCompare(b.start))
  const toComplete = today.filter((a) => ['Checked In', 'In Treatment'].includes(a.status))
  const consents = db.appointments.filter((a) => locs.includes(a.locationId) && a.consent === 'Pending' && new Date(a.start) > new Date() && new Date(a.start) < addDays(new Date(), 7)).sort((a, b) => a.start.localeCompare(b.start))
  const recent = db.sessions.filter((s) => locs.includes(s.locationId) && (!mineOnly || s.practitionerId === me.id)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  const recall = useMemo(() => (lot.length > 2 ? db.sessions.filter((s) => s.lot.toLowerCase().includes(lot.toLowerCase())) : []), [lot, db.sessions])
  return (
    <div>
      <PageHeader title="Clinical" subtitle={mineOnly ? 'Your clinical day' : 'Clinical activity across your locations'} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today’s clinical queue" subtitle={`${toComplete.length} ready to chart · ${today.length} total`} />
          <div className="px-2 pb-3 pt-2">
            {today.map((a) => {
              const p = db.patients.find((x) => x.id === a.patientId)!
              return (
                <button key={a.id} onClick={() => setOpen(a.id)} className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left hover:bg-cream/60">
                  <span className="w-16 text-[12.5px] tabular-nums text-stone-500">{fmtTime(a.start)}</span>
                  <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={34} />
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2 text-[13.5px] text-ink">{p.firstName} {p.lastName}{(p.alerts.length > 0 || p.allergies.length > 0) && <AlertTriangle size={12} className="text-rose-500" />}</div><div className="text-[12px] text-stone-500">{treatmentName(db, a.treatmentId)} · consent {a.consent.toLowerCase()} · intake {a.intake.toLowerCase()}</div></div>
                  <StatusBadge status={a.status} />
                </button>
              )
            })}
            {!today.length && <Empty icon={<Stethoscope size={18} />} title="No clinical appointments today" />}
          </div>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Consents pending" subtitle="Next 7 days" />
            <div className="space-y-1 px-3 pb-3 pt-2">
              {consents.slice(0, 6).map((a) => <button key={a.id} onClick={() => setOpen(a.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-cream/60"><FileSignature size={15} className="text-amber-500" /><div className="min-w-0 flex-1"><div className="truncate text-[13px] text-ink">{patientName(db, a.patientId)}</div><div className="text-[11.5px] text-stone-500">{treatmentName(db, a.treatmentId)} · {fmtDate(a.start, { weekday: 'short', month: 'short', day: 'numeric' })}</div></div></button>)}
              {!consents.length && <p className="py-4 text-center text-[13px] text-stone-500">All consents signed.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-[15px] font-medium"><ScanSearch size={16} />Lot recall lookup</div>
            <p className="mt-1 text-[12.5px] text-stone-500">Trace every patient treated with a product batch.</p>
            <Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="e.g. BTX2400A" className="mt-3" />
            {lot.length > 2 && <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">{recall.slice(0, 20).map((s) => <Link key={s.id} to={`/app/patients/${s.patientId}?tab=Clinical`} className="flex justify-between rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-cream"><span className="text-ink">{patientName(db, s.patientId)}</span><span className="text-stone-500">{s.lot} · {fmtDate(s.at, { month: 'short', day: 'numeric' })}</span></Link>)}<div className="pt-1 text-[12px] text-stone-500">{recall.length} sessions found</div></div>}
          </Card>
        </div>
        <Card className="lg:col-span-3">
          <CardHeader title="Recently signed records" />
          <Table className="mt-2">
            <thead><tr><TH>Signed</TH><TH>Patient</TH><TH>Treatment</TH><TH>Dosage</TH><TH>Product · lot</TH><TH>Practitioner</TH></tr></thead>
            <tbody>{recent.map((s) => <TR key={s.id}><TD>{relative(s.at)}</TD><TD className="text-ink"><Link to={`/app/patients/${s.patientId}?tab=Clinical`} className="hover:underline">{patientName(db, s.patientId)}</Link></TD><TD>{treatmentName(db, s.treatmentId)} #{s.sessionNumber}</TD><TD>{s.dosage || '—'}</TD><TD className="text-[12.5px]">{s.product || '—'} {s.lot && <span className="text-stone-400">· {s.lot}</span>}</TD><TD>{staffName(db, s.practitionerId)}</TD></TR>)}</tbody>
          </Table>
        </Card>
      </div>
      {!can('clinical.write') && <p className="mt-4 text-[12.5px] text-stone-500">Read-only: your role can view but not sign clinical records.</p>}
      <AppointmentDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}

// ── Before & after ──────────────────────────────────────────────────────────
const PERM_TONE: Record<PhotoPermission, 'neutral' | 'violet' | 'sage'> = { 'Clinical only': 'neutral', Internal: 'violet', 'Marketing approved': 'sage' }

export function PhotoTimeline({ patientId }: { patientId: ID }) {
  const db = useDB()
  const can = useCan()
  const setPerm = useStore((s) => s.setPhotoPermission)
  const addPhoto = useStore((s) => s.addPhoto)
  const photos = db.photos.filter((p) => p.patientId === patientId).sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  const angles = ['All', ...new Set(photos.map((p) => p.angle))]
  const [angle, setAngle] = useState('All')
  const [mode, setMode] = useState<'Timeline' | 'Slider' | 'Side by side'>('Timeline')
  const [a, setA] = useState<ID | null>(null)
  const [b, setB] = useState<ID | null>(null)
  const [zoom, setZoom] = useState(1)
  const list = photos.filter((p) => angle === 'All' || p.angle === angle)
  useEffect(() => { setA(list[0]?.id ?? null); setB(list[list.length - 1]?.id ?? null) }, [angle, photos.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { useStore.getState().logAccess(patientId, 'Clinical photos') }, [patientId])
  const pa = photos.find((p) => p.id === a)
  const pb = photos.find((p) => p.id === b)
  const stages = ['Baseline', 'Session 1', 'Session 2', 'Session 3', 'Follow-up'] as const
  const consent = db.formSubmissions.filter((f) => f.patientId === patientId && f.templateId === 'form_photo').sort((x, y) => y.signedAt.localeCompare(x.signedAt))[0]
  if (!photos.length) return <Card><Empty icon={<Camera size={18} />} title="No photos yet" body="Capture photos from the treatment completion flow or here." action={can('clinical.write') && <Button size="sm" onClick={() => addPhoto({ patientId, treatmentId: db.sessions.find((s) => s.patientId === patientId)?.treatmentId ?? 'tx_botox', stage: 'Baseline', angle: 'Front', permission: 'Clinical only', src: db.patients.find((p) => p.id === patientId)?.avatar ?? db.photos[0].src })}>Capture baseline</Button>} /></Card>
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={angles} value={angle} onChange={setAngle} id={`ang-${patientId}`} size="sm" />
        <Segmented options={['Timeline', 'Slider', 'Side by side'] as const} value={mode} onChange={setMode} id={`pm-${patientId}`} size="sm" />
        <div className="ml-auto flex items-center gap-2 text-[12.5px] text-stone-500"><ShieldCheck size={14} />Photo consent: {consent ? <span className="text-ink">{String(consent.answers.p1)}</span> : <span className="text-amber-500">not on file</span>}</div>
      </div>
      {mode === 'Timeline' ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-5 gap-4">
            {stages.map((st) => (
              <div key={st}>
                <div className="mb-2 text-[11.5px] uppercase tracking-[0.12em] text-stone-400">{st}</div>
                <div className="space-y-3">
                  {list.filter((p) => p.stage === st).map((p) => <PhotoCard key={p.id} p={p} onPerm={can('photos.approve') ? (v) => setPerm(p.id, v) : undefined} />)}
                  {!list.some((p) => p.stage === st) && <div className="grid aspect-[3/4] place-items-center rounded-xl border border-dashed border-stone-200 text-[12px] text-stone-300">—</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <Field label="Compare from"><Select value={a ?? ''} onChange={(e) => setA(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.stage} · {p.angle} · {fmtDate(p.takenAt)}</option>)}</Select></Field>
            <Field label="Compare to"><Select value={b ?? ''} onChange={(e) => setB(e.target.value)}>{list.map((p) => <option key={p.id} value={p.id}>{p.stage} · {p.angle} · {fmtDate(p.takenAt)}</option>)}</Select></Field>
          </div>
          {pa && pb && (
            <>
              <div className="mb-3 flex items-center justify-between text-[12.5px] text-stone-500"><span>{Math.round((new Date(pb.takenAt).getTime() - new Date(pa.takenAt).getTime()) / 86400000)} days apart</span><div className="flex items-center gap-1"><button onClick={() => setZoom(Math.max(1, zoom - 0.25))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-cream" aria-label="Zoom out"><ZoomOut size={15} /></button><span className="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-cream" aria-label="Zoom in"><ZoomIn size={15} /></button></div></div>
              <div className="overflow-hidden rounded-2xl">
                <motion.div animate={{ scale: zoom }} transition={{ duration: 0.4, ease: EASE }} style={{ originX: 0.5, originY: 0.35 }}>
                  {mode === 'Slider' ? <BeforeAfter before={pa.src} after={pb.src} labels={[`${pa.stage} · ${fmtDate(pa.takenAt, { month: 'short', day: 'numeric' })}`, `${pb.stage} · ${fmtDate(pb.takenAt, { month: 'short', day: 'numeric' })}`]} className="aspect-[4/3]" /> : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative"><Photo src={pa.src} className="aspect-[3/4]" imgClassName="saturate-[0.7] contrast-[0.92] sepia-[0.12]" /><span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[11px]">{pa.stage}</span></div>
                      <div className="relative"><Photo src={pb.src} className="aspect-[3/4]" /><span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] text-white">{pb.stage}</span></div>
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

function PhotoCard({ p, onPerm, showPatient }: { p: PhotoT; onPerm?: (v: PhotoPermission) => void; showPatient?: boolean }) {
  const db = useDB()
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group overflow-hidden rounded-xl bg-white hairline">
      <div className="relative"><Photo src={p.src} className="aspect-[3/4]" zoom imgClassName={p.stage === 'Baseline' ? 'saturate-[0.7] contrast-[0.92] sepia-[0.12]' : ''} /><span className="absolute left-2 top-2"><Badge tone={PERM_TONE[p.permission]}>{p.permission}</Badge></span></div>
      <div className="p-2.5">
        {showPatient && <div className="truncate text-[12.5px] text-ink">{patientName(db, p.patientId)}</div>}
        <div className="text-[11.5px] text-stone-500">{p.angle} · {treatmentName(db, p.treatmentId)} · {fmtDate(p.takenAt, { month: 'short', day: 'numeric' })}</div>
        {onPerm && <select value={p.permission} onChange={(e) => onPerm(e.target.value as PhotoPermission)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11.5px] outline-none"><option>Clinical only</option><option>Internal</option><option>Marketing approved</option></select>}
      </div>
    </motion.div>
  )
}

export function PhotosAdmin() {
  const db = useDB()
  const can = useCan()
  const setPerm = useStore((s) => s.setPhotoPermission)
  const [perm, setPermFilter] = useState('All')
  const [patient, setPatient] = useState<ID | null>(null)
  const photos = db.photos.filter((p) => perm === 'All' || p.permission === perm).sort((a, b) => b.takenAt.localeCompare(a.takenAt))
  const patients = [...new Set(db.photos.map((p) => p.patientId))]
  return (
    <div>
      <PageHeader title="Before & After" subtitle="Encrypted clinical media with consent-aware publishing. Marketing-approved images flow to the website gallery." actions={<Link to="/results" target="_blank"><Button size="sm" variant="secondary" icon={<Eye size={14} />}>View public gallery</Button></Link>} />
      <div className="mb-5 grid grid-cols-3 gap-4">
        {(['Clinical only', 'Internal', 'Marketing approved'] as const).map((k, i) => <Card key={k} className="p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}><Badge tone={PERM_TONE[k]}>{k}</Badge><div className="mt-3 font-display text-[30px]">{db.photos.filter((p) => p.permission === k).length}</div></Card>)}
      </div>
      <Tabs tabs={['All', 'Clinical only', 'Internal', 'Marketing approved'] as const} value={perm as 'All'} onChange={setPermFilter} id="ph-perm" className="mb-5" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {photos.map((p) => <div key={p.id} onClick={() => setPatient(p.patientId)} className="cursor-pointer"><PhotoCard p={p} showPatient onPerm={can('photos.approve') ? (v) => setPerm(p.id, v) : undefined} /></div>)}
      </div>
      <Modal open={!!patient} onClose={() => setPatient(null)} width={980} title={patient ? patientName(db, patient) : ''} subtitle="Photo timeline">
        {patient && <PhotoTimeline patientId={patient} />}
      </Modal>
      <p className="mt-6 text-[12px] text-stone-400">{patients.length} patients with media · Marketing approval checks the patient’s latest photography consent before publishing.</p>
    </div>
  )
}

// ── Forms & consents builder ────────────────────────────────────────────────
const FIELD_TYPES: { t: FieldType; l: string; i: typeof Type }[] = [
  { t: 'section', l: 'Section header', i: Heading }, { t: 'text', l: 'Short text', i: Type }, { t: 'textarea', l: 'Long text', i: AlignLeft },
  { t: 'yesno', l: 'Yes / No', i: ToggleLeft }, { t: 'radio', l: 'Single choice', i: CircleDot }, { t: 'checkbox', l: 'Checkboxes', i: CheckSquare },
  { t: 'select', l: 'Dropdown', i: List }, { t: 'date', l: 'Date', i: Calendar }, { t: 'signature', l: 'Signature', i: PenLine },
]

export function FormsAdmin() {
  const db = useDB()
  const can = useCan()
  const save = useStore((s) => s.saveFormTemplate)
  const [view, setView] = useState<'Templates' | 'Signed'>('Templates')
  const [editing, setEditing] = useState<{ id: ID | null; name: string; kind: FormTemplate['kind']; fields: FormField[] } | null>(null)
  const [preview, setPreview] = useState<Answers>({})
  const startEdit = (f?: FormTemplate) => { setPreview({}); setEditing(f ? { id: f.id, name: f.name, kind: f.kind, fields: structuredClone(f.fields) } : { id: null, name: 'New consent form', kind: 'Consent', fields: [{ id: uid('f'), type: 'section', label: 'About your treatment', required: false }, { id: uid('f'), type: 'signature', label: 'Patient signature', required: true }] }) }
  const upd = (id: ID, patch: Partial<FormField>) => setEditing((e) => e && { ...e, fields: e.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) })
  const subs = [...db.formSubmissions].sort((a, b) => b.signedAt.localeCompare(a.signedAt)).slice(0, 80)
  return (
    <div>
      <PageHeader title="Forms & consents" subtitle="Versioned digital forms. Every signature records version, time, device and IP." actions={<><Segmented options={['Templates', 'Signed'] as const} value={view} onChange={setView} id="forms-v" size="sm" />{can('forms.manage') && <Button size="sm" icon={<Plus size={14} />} onClick={() => startEdit()}>New form</Button>}</>} />
      {view === 'Templates' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {db.formTemplates.map((f, i) => (
            <Card key={f.id} hover className="flex flex-col p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center justify-between"><Badge tone={f.kind === 'Consent' ? 'bronze' : f.kind === 'Intake' ? 'slate' : 'neutral'}>{f.kind}</Badge><span className="text-[12px] text-stone-400">v{f.version}</span></div>
              <div className="mt-3 font-display text-[22px] leading-tight text-ink">{f.name}</div>
              <div className="mt-1 text-[12.5px] text-stone-500">{f.fields.filter((x) => x.type !== 'section').length} fields · updated {relative(f.updatedAt)}</div>
              <div className="mt-1 text-[12.5px] text-stone-500">{db.formSubmissions.filter((s) => s.templateId === f.id).length} signed · used by {db.treatments.filter((t) => t.consentFormId === f.id).map((t) => t.name).join(', ') || (f.kind === 'Intake' ? 'all bookings' : '—')}</div>
              <div className="mt-auto pt-4">{can('forms.manage') ? <Button size="xs" variant="secondary" onClick={() => startEdit(f)}>Edit form</Button> : <Button size="xs" variant="ghost" onClick={() => startEdit(f)}>Preview</Button>}</div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <thead><tr><TH>Signed</TH><TH>Patient</TH><TH>Form</TH><TH>Version</TH><TH>Witness</TH><TH>Device · IP</TH><TH>PDF</TH></tr></thead>
            <tbody>{subs.map((s) => { const f = db.formTemplates.find((x) => x.id === s.templateId)!; return <TR key={s.id}><TD className="whitespace-nowrap">{fmtDateTime(s.signedAt)}</TD><TD className="text-ink"><Link to={`/app/patients/${s.patientId}?tab=Forms`} className="hover:underline">{patientName(db, s.patientId)}</Link></TD><TD>{f.name}</TD><TD>v{s.version}</TD><TD>{s.witnessId ? staffName(db, s.witnessId) : '—'}</TD><TD className="text-[12px] text-stone-500">{s.device} · {s.ip}</TD><TD><Badge tone={s.pdf === 'Generated' ? 'sage' : 'amber'}>{s.pdf}</Badge></TD></TR> })}</tbody>
          </Table>
        </Card>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} width={1100} title={editing?.id ? 'Edit form' : 'New form'} subtitle={editing?.id ? 'Saving publishes a new version — signed copies of earlier versions are preserved.' : undefined}
        footer={can('forms.manage') && editing && <><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { save(editing.id, { name: editing.name, kind: editing.kind, fields: editing.fields }); setEditing(null) }}>Publish {editing.id ? 'new version' : 'form'}</Button></>}>
        {editing && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3"><Field label="Form name" className="col-span-2"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field><Field label="Type"><Select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as FormTemplate['kind'] })}>{['Intake', 'Consent', 'Aftercare', 'Privacy'].map((k) => <option key={k}>{k}</option>)}</Select></Field></div>
              <Reorder.Group axis="y" values={editing.fields} onReorder={(fields) => setEditing({ ...editing, fields })} className="space-y-2">
                {editing.fields.map((f) => {
                  const T = FIELD_TYPES.find((x) => x.t === f.type)!
                  return (
                    <Reorder.Item key={f.id} value={f} className="rounded-xl border border-stone-200 bg-white p-3">
                      <div className="flex items-center gap-2">
                        <GripVertical size={15} className="cursor-grab text-stone-300" />
                        <T.i size={14} className="text-stone-400" />
                        <input value={f.label} onChange={(e) => upd(f.id, { label: e.target.value })} className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" />
                        {f.type !== 'section' && <label className="flex items-center gap-1.5 text-[11.5px] text-stone-500">Required<Toggle checked={f.required} onChange={(v) => upd(f.id, { required: v })} /></label>}
                        <button onClick={() => setEditing({ ...editing, fields: editing.fields.filter((x) => x.id !== f.id) })} className="text-stone-300 hover:text-rose-500" aria-label="Remove"><Trash2 size={14} /></button>
                      </div>
                      {['radio', 'checkbox', 'select'].includes(f.type) && <input value={(f.options ?? []).join(', ')} onChange={(e) => upd(f.id, { options: e.target.value.split(',').map((x) => x.trimStart()) })} placeholder="Options, comma separated" className="mt-2 w-full rounded-lg bg-cream px-3 py-1.5 text-[12.5px] outline-none" />}
                    </Reorder.Item>
                  )
                })}
              </Reorder.Group>
              <div className="flex flex-wrap gap-1.5">{FIELD_TYPES.map((x) => <button key={x.t} onClick={() => setEditing({ ...editing, fields: [...editing.fields, { id: uid('f'), type: x.t, label: x.l, required: x.t === 'signature', options: ['radio', 'checkbox', 'select'].includes(x.t) ? ['Option 1', 'Option 2'] : undefined }] })} className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[12px] text-stone-600 hover:border-stone-400"><x.i size={12} />{x.l}</button>)}</div>
            </div>
            <div className="rounded-2xl bg-cream/60 p-5">
              <div className="mb-4 flex items-center gap-2 text-[11.5px] uppercase tracking-[0.14em] text-stone-400"><Eye size={13} />Live preview · patient view</div>
              <div className="font-display text-[24px]">{editing.name}</div>
              <div className="mt-4"><FormRenderer form={{ id: 'preview', tenantId: '', name: editing.name, kind: editing.kind, version: 1, updatedAt: '', active: true, fields: editing.fields }} answers={preview} onChange={setPreview} /></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
