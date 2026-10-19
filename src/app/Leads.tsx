import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Phone, MessageSquare, Mail, CalendarPlus, UserCheck, ListPlus, Search, Plus, Clock, XCircle, ArrowUpRight, StickyNote, Zap, CalendarCheck } from 'lucide-react'
import { useDB, useStore, useVisibleLocations, staffName, treatmentName, locationName } from '@/store/store'
import type { ID, Lead, LeadStage } from '@/lib/types'
import { Avatar, Badge, Button, Card, CardHeader, Drawer, Field, Input, KV, PageHeader, SectionLabel, Segmented, Select, Table, TD, TH, TR, Textarea, EASE, cn } from '@/ui/ui'
import { HBars, CAT } from '@/ui/charts'
import { fmtDateTime, money, pct, relative, addDays, compact } from '@/lib/format'
import { NewAppointmentModal, NewLeadModal } from './QuickCreate'

const STAGES: LeadStage[] = ['New Lead', 'Contacted', 'Consultation Booked', 'Consultation Completed', 'Treatment Proposed', 'Follow-up', 'Converted', 'Lost']
const STAGE_COLOR: Record<LeadStage, string> = { 'New Lead': '#8C847A', Contacted: '#2E7CC0', 'Consultation Booked': '#6A4FA8', 'Consultation Completed': '#6A4FA8', 'Treatment Proposed': '#A8642A', 'Follow-up': '#B7802A', Converted: '#4E7A61', Lost: '#B4524A' }

export default function LeadsPage() {
  const db = useDB()
  const locs = useVisibleLocations()
  const move = useStore((s) => s.moveLead)
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'Pipeline' | 'List' | 'Reports'>('Pipeline')
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState('')
  const [open, setOpen] = useState<ID | null>(params.get('lead'))
  const [creating, setCreating] = useState(false)
  const [dragOver, setDragOver] = useState<LeadStage | null>(null)
  useEffect(() => { const l = params.get('lead'); if (l) setOpen(l) }, [params])
  const leads = useMemo(() => db.leads.filter((l) => locs.includes(l.locationId) && (!owner || l.assigneeId === owner) && (!q || `${l.name} ${l.email} ${l.phone} ${l.source}`.toLowerCase().includes(q.toLowerCase()))), [db.leads, locs, owner, q])
  const open$ = leads.filter((l) => !['Converted', 'Lost'].includes(l.stage))
  const converted = leads.filter((l) => l.stage === 'Converted').length
  const decided = converted + leads.filter((l) => l.stage === 'Lost').length
  const owners = [...new Set(db.leads.map((l) => l.assigneeId))]

  return (
    <div>
      <PageHeader title="Leads" subtitle="From first enquiry to loyal patient." actions={<><Segmented options={['Pipeline', 'List', 'Reports'] as const} value={view} onChange={setView} id="lead-view" size="sm" /><Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>New lead</Button></>} />
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Open pipeline', money(open$.reduce((a, l) => a + l.value, 0)), `${open$.length} active leads`], ['Conversion rate', pct(converted / Math.max(1, decided)), `${converted} converted · ${decided - converted} lost`], ['New this week', String(leads.filter((l) => new Date(l.createdAt) > addDays(new Date(), -7)).length), 'captured from all sources'], ['Follow-ups overdue', String(open$.filter((l) => new Date(l.nextFollowUp) < new Date()).length), 'need contact today']].map(([k, v, s], i) => (
          <Card key={k} className="p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className="text-[12.5px] text-stone-500">{k}</div><div className="mt-2 font-display text-[30px] leading-none text-ink">{v}</div><div className="mt-2 text-[12px] text-stone-400">{s}</div>
          </Card>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads" className="h-9 pl-9" /></label>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-9 w-48"><option value="">All team members</option>{owners.map((o) => <option key={o} value={o}>{staffName(db, o)}</option>)}</Select>
      </div>

      <AnimatePresence mode="wait">
        {view === 'Pipeline' && (
          <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
            <div className="flex gap-3" style={{ minWidth: STAGES.length * 268 }}>
              {STAGES.map((stage) => {
                const list = leads.filter((l) => l.stage === stage)
                return (
                  <div key={stage} onDragOver={(e) => { e.preventDefault(); setDragOver(stage) }} onDragLeave={() => setDragOver(null)} onDrop={(e) => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData('text/lead'); if (id) move(id, stage) }}
                    className={cn('flex w-[260px] shrink-0 flex-col rounded-2xl p-2 transition-colors duration-300', dragOver === stage ? 'bg-bronze-50' : 'bg-stone-200/30')}>
                    <div className="flex items-center gap-2 px-2 pb-2.5 pt-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLOR[stage] }} />
                      <span className="text-[13px] font-medium text-ink">{stage}</span>
                      <span className="text-[12px] text-stone-400">{list.length}</span>
                      <span className="ml-auto text-[11.5px] tabular-nums text-stone-400">${compact(list.reduce((a, l) => a + l.value, 0))}</span>
                    </div>
                    <div className="flex min-h-[120px] flex-col gap-2">
                      <AnimatePresence>
                        {list.map((l) => (
                          <motion.div key={l.id} layout layoutId={l.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35, ease: EASE }}>
                            <div draggable onDragStart={(e) => e.dataTransfer.setData('text/lead', l.id)} onClick={() => setOpen(l.id)}
                              className="cursor-grab rounded-xl border border-stone-200/70 bg-white p-3 shadow-[0_1px_2px_rgba(30,28,26,0.04)] transition-shadow hover:shadow-lift active:cursor-grabbing">
                              <div className="flex items-start justify-between gap-2"><div className="text-[13.5px] font-medium text-ink">{l.name}</div><span className="text-[12.5px] tabular-nums text-stone-600">{money(l.value)}</span></div>
                              <div className="mt-0.5 text-[12px] text-stone-500">{treatmentName(db, l.interestId)}</div>
                              <div className="mt-2.5 flex items-center gap-2">
                                <Badge>{l.source}</Badge>
                                <span className={cn('ml-auto flex items-center gap-1 text-[11px]', new Date(l.nextFollowUp) < new Date() && !['Converted', 'Lost'].includes(l.stage) ? 'text-rose-500' : 'text-stone-400')}><Clock size={10} />{relative(l.nextFollowUp)}</span>
                                <Avatar name={staffName(db, l.assigneeId)} src={db.staff.find((s) => s.id === l.assigneeId)?.avatar} size={20} />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
        {view === 'List' && (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <Table>
                <thead><tr><TH>Lead</TH><TH>Interest</TH><TH>Stage</TH><TH>Source · campaign</TH><TH>Owner</TH><TH>Next follow-up</TH><TH>Last contact</TH><TH className="text-right">Value</TH></tr></thead>
                <tbody>{leads.map((l) => (
                  <TR key={l.id} onClick={() => setOpen(l.id)}>
                    <TD><div className="text-ink">{l.name}</div><div className="text-[12px] text-stone-400">{l.phone}</div></TD>
                    <TD>{treatmentName(db, l.interestId)}</TD>
                    <TD><span className="flex items-center gap-1.5 text-[12.5px]"><span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLOR[l.stage] }} />{l.stage}</span></TD>
                    <TD><div>{l.source}</div><div className="text-[12px] text-stone-400">{l.campaign}</div></TD>
                    <TD>{staffName(db, l.assigneeId)}</TD>
                    <TD className={new Date(l.nextFollowUp) < new Date() && !['Converted', 'Lost'].includes(l.stage) ? 'text-rose-500' : ''}>{relative(l.nextFollowUp)}</TD>
                    <TD>{relative(l.lastContact)}</TD>
                    <TD className="text-right tabular-nums">{money(l.value)}</TD>
                  </TR>
                ))}</tbody>
              </Table>
            </Card>
          </motion.div>
        )}
        {view === 'Reports' && <motion.div key="rep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><LeadReports leads={leads} /></motion.div>}
      </AnimatePresence>
      <LeadDrawer id={open} onClose={() => { setOpen(null); if (params.get('lead')) setParams({}) }} />
      <NewLeadModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function LeadReports({ leads }: { leads: Lead[] }) {
  const db = useDB()
  const sources = [...new Set(leads.map((l) => l.source))]
  const rows = sources.map((s) => {
    const ls = leads.filter((l) => l.source === s)
    const conv = ls.filter((l) => l.stage === 'Converted')
    const spend = { 'Google Ads': 1800, 'Meta Ads': 1400, Instagram: 600, TikTok: 500 }[s] ?? 0
    const revenue = conv.reduce((a, l) => a + l.value, 0)
    return { s, n: ls.length, conv: conv.length, rate: conv.length / Math.max(1, ls.length), revenue, spend, roi: spend ? (revenue - spend) / spend : null }
  }).sort((a, b) => b.n - a.n)
  const byStage = STAGES.map((s) => ({ label: s, value: leads.filter((l) => l.stage === s).length }))
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="Lead source ROI" subtitle="Conversion and return by acquisition channel" />
        <Table className="mt-2">
          <thead><tr><TH>Source</TH><TH className="text-right">Leads</TH><TH className="text-right">Converted</TH><TH className="text-right">Rate</TH><TH className="text-right">Revenue</TH><TH className="text-right">Spend</TH><TH className="text-right">ROI</TH></tr></thead>
          <tbody>{rows.map((r) => <TR key={r.s}><TD className="text-ink">{r.s}</TD><TD className="text-right tabular-nums">{r.n}</TD><TD className="text-right tabular-nums">{r.conv}</TD><TD className="text-right tabular-nums">{pct(r.rate)}</TD><TD className="text-right tabular-nums">{money(r.revenue)}</TD><TD className="text-right tabular-nums text-stone-500">{r.spend ? money(r.spend) : '—'}</TD><TD className={cn('text-right tabular-nums', r.roi !== null && r.roi < 0 ? 'text-rose-500' : 'text-sage-500')}>{r.roi === null ? 'Organic' : pct(r.roi)}</TD></TR>)}</tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Leads by stage" />
        <div className="p-5"><HBars rows={byStage} color={CAT[3]} /></div>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader title="By team member" />
        <Table className="mt-2">
          <thead><tr><TH>Owner</TH><TH className="text-right">Open</TH><TH className="text-right">Converted</TH><TH className="text-right">Pipeline value</TH></tr></thead>
          <tbody>{[...new Set(leads.map((l) => l.assigneeId))].map((o) => { const ls = leads.filter((l) => l.assigneeId === o); return <TR key={o}><TD className="text-ink">{staffName(db, o)}</TD><TD className="text-right">{ls.filter((l) => !['Converted', 'Lost'].includes(l.stage)).length}</TD><TD className="text-right">{ls.filter((l) => l.stage === 'Converted').length}</TD><TD className="text-right tabular-nums">{money(ls.filter((l) => !['Converted', 'Lost'].includes(l.stage)).reduce((a, l) => a + l.value, 0))}</TD></TR> })}</tbody>
        </Table>
      </Card>
    </div>
  )
}

const ACT_ICON = { call: Phone, sms: MessageSquare, email: Mail, note: StickyNote, stage: ArrowUpRight, appointment: CalendarCheck, task: ListPlus, system: Zap }

function LeadDrawer({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const act = useStore((s) => s.addLeadActivity)
  const move = useStore((s) => s.moveLead)
  const convert = useStore((s) => s.convertLead)
  const update = useStore((s) => s.updateLead)
  const addTask = useStore((s) => s.addTask)
  const l = db.leads.find((x) => x.id === id)
  const [note, setNote] = useState('')
  const [booking, setBooking] = useState(false)
  const [task, setTask] = useState('')
  if (!l) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  return (
    <>
      <Drawer open={!!l} onClose={onClose} width={540} title={l.name} subtitle={`${treatmentName(db, l.interestId)} · ${money(l.value)} estimated`}>
        <div className="space-y-6 p-6">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Phone size={14} />} onClick={() => act(l.id, 'call', 'Outbound call — discussed treatment options')}>Call</Button>
            <Button size="sm" variant="secondary" icon={<MessageSquare size={14} />} onClick={() => act(l.id, 'sms', 'SMS sent: consultation availability this week')}>SMS</Button>
            <Button size="sm" variant="secondary" icon={<Mail size={14} />} onClick={() => act(l.id, 'email', 'Email sent: pricing & practitioner profiles')}>Email</Button>
            <Button size="sm" icon={<CalendarPlus size={14} />} onClick={() => setBooking(true)}>Book consultation</Button>
            {l.patientId ? <Link to={`/app/patients/${l.patientId}`}><Button size="sm" variant="ghost" icon={<UserCheck size={14} />}>Open patient</Button></Link> : <Button size="sm" variant="ghost" icon={<UserCheck size={14} />} onClick={() => convert(l.id)}>Convert to patient</Button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage"><Select value={l.stage} onChange={(e) => move(l.id, e.target.value as LeadStage)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Owner"><Select value={l.assigneeId} onChange={(e) => update(l.id, { assigneeId: e.target.value })}>{db.staff.filter((s) => ['sales', 'receptionist', 'manager', 'owner'].includes(s.role)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
            <Field label="Next follow-up"><Input type="datetime-local" value={l.nextFollowUp.slice(0, 16)} onChange={(e) => update(l.id, { nextFollowUp: new Date(e.target.value).toISOString() })} /></Field>
            <Field label="Estimated value"><Input type="number" value={l.value} onChange={(e) => update(l.id, { value: Number(e.target.value) })} /></Field>
          </div>
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
            <KV k="Phone" v={l.phone} /><KV k="Email" v={l.email} /><KV k="Source" v={l.source} /><KV k="Campaign" v={l.campaign} /><KV k="Location" v={locationName(db, l.locationId)} /><KV k="Created" v={fmtDateTime(l.createdAt)} /><KV k="Last contact" v={relative(l.lastContact)} />
          </div>
          {l.notes && <div className="rounded-xl bg-cream px-4 py-3 text-[13.5px] text-stone-600">{l.notes}</div>}
          <div className="flex gap-2"><Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task, e.g. Send before & after gallery" /><Button size="md" variant="secondary" disabled={!task} onClick={() => { addTask(task, addDays(new Date(), 1).toISOString(), l.assigneeId, l.patientId, l.id); setTask('') }}>Add task</Button></div>
          <div>
            <SectionLabel>Activity</SectionLabel>
            <div className="mb-4 flex gap-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log a note…" className="min-h-[44px]" /><Button variant="secondary" disabled={!note} onClick={() => { act(l.id, 'note', note); setNote('') }}>Log</Button></div>
            <div className="relative space-y-1">
              <div className="absolute bottom-3 left-[15px] top-3 w-px bg-stone-200" />
              {l.activity.map((a) => { const I = ACT_ICON[a.kind]; return (
                <motion.div key={a.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="relative flex gap-3 py-2">
                  <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-stone-200 bg-white text-stone-500"><I size={13} /></span>
                  <div className="pt-1"><div className="text-[13px] text-ink">{a.text}</div><div className="text-[11.5px] text-stone-400">{a.by ? `${staffName(db, a.by)} · ` : ''}{relative(a.at)}</div></div>
                </motion.div>
              ) })}
            </div>
          </div>
          {l.stage !== 'Lost' && l.stage !== 'Converted' && <button onClick={() => { update(l.id, { lostReason: 'Not ready' }); move(l.id, 'Lost') }} className="flex items-center gap-1.5 text-[12.5px] text-stone-400 hover:text-rose-500"><XCircle size={13} />Mark as lost</button>}
        </div>
      </Drawer>
      <NewAppointmentModal open={booking} onClose={() => setBooking(false)} leadId={l.id} />
    </>
  )
}
