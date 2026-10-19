import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, ExternalLink, Globe, EyeOff, Crown, AlertCircle, TrendingDown, RefreshCw, Package as PackageIcon, Search } from 'lucide-react'
import { useDB, useStore, useCan, staffName, treatmentName, patientName } from '@/store/store'
import type { Concern, ID, Treatment, TreatmentCategory } from '@/lib/types'
import { Badge, Button, Card, CardHeader, Drawer, Field, Input, PageHeader, Photo, SectionLabel, Select, Stat, Table, TD, TH, TR, Tabs, Textarea, Toggle, cn } from '@/ui/ui'
import { Donut } from '@/ui/charts'
import { fmtDate, money, pct, relative, addDays } from '@/lib/format'
import { mrr } from '@/lib/metrics'

const CATS: TreatmentCategory[] = ['Injectables', 'Skin Treatments', 'Facial Rejuvenation', 'Body Treatments', 'Laser', 'Hair Restoration', 'Wellness', 'Cosmetic Dermatology']
const CONCERNS: Concern[] = ['Wrinkles', 'Fine lines', 'Acne', 'Pigmentation', 'Lips', 'Jawline', 'Skin texture', 'Hair loss', 'Body contouring', 'Volume loss', 'Dullness']

export function TreatmentsAdmin() {
  const db = useDB()
  const can = useCan()
  const create = useStore((s) => s.createTreatment)
  const update = useStore((s) => s.updateTreatment)
  const [params, setParams] = useSearchParams()
  const [edit, setEdit] = useState<ID | null>(params.get('edit'))
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  useEffect(() => { const e = params.get('edit'); if (e) setEdit(e) }, [params])
  const list = db.treatments.filter((t) => (cat === 'All' || t.category === cat) && (!q || t.name.toLowerCase().includes(q.toLowerCase())))
  const booked = (id: ID) => db.appointments.filter((a) => a.treatmentId === id && new Date(a.start) > addDays(new Date(), -30) && a.status === 'Completed').length
  return (
    <div>
      <PageHeader title="Treatments" subtitle="Your catalog powers the website, booking flow, POS and invoices — change it once, everywhere updates." actions={can('treatments.manage') && <Button size="sm" icon={<Plus size={14} />} onClick={() => { const id = create({ name: 'New treatment', category: 'Skin Treatments', active: false }); if (id) setEdit(id) }}>New treatment</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <Tabs tabs={['All', ...new Set(db.treatments.map((t) => t.category))] as string[]} value={cat} onChange={setCat} id="tx-cat" className="border-0" />
          <label className="relative ml-auto w-full sm:w-60"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 pl-9" /></label>
        </div>
        <Table className="mt-2">
          <thead><tr><TH>Treatment</TH><TH>Category</TH><TH className="text-right">Price from</TH><TH className="text-right">Duration</TH><TH>Practitioners</TH><TH className="text-right">Last 30d</TH><TH>Website</TH><TH>Booking</TH></tr></thead>
          <tbody>{list.map((t) => (
            <TR key={t.id} onClick={() => setEdit(t.id)}>
              <TD><div className="flex items-center gap-3"><Photo src={t.image} className="h-10 w-10 shrink-0 rounded-lg" /><div><div className="text-ink">{t.name}</div><div className="max-w-[240px] truncate text-[12px] text-stone-400">{t.tagline}</div></div></div></TD>
              <TD>{t.category}</TD>
              <TD className="text-right tabular-nums">{t.priceFrom ? money(t.priceFrom) : 'Free'}{Object.keys(t.locationPricing).length > 0 && <div className="text-[11px] text-stone-400">+ location pricing</div>}</TD>
              <TD className="text-right tabular-nums">{t.duration}m</TD>
              <TD className="text-[12.5px]">{t.practitionerIds.map((p) => staffName(db, p).split(' ').slice(-1)[0]).join(', ') || '—'}</TD>
              <TD className="text-right tabular-nums">{booked(t.id)}</TD>
              <TD onClick={(e) => e.stopPropagation()}><Toggle checked={t.active} onChange={(v) => update(t.id, { active: v })} label="Published" /></TD>
              <TD onClick={(e) => e.stopPropagation()}><Toggle checked={t.onlineBookable && t.active} onChange={(v) => update(t.id, { onlineBookable: v })} label="Online booking" /></TD>
            </TR>
          ))}</tbody>
        </Table>
      </Card>
      <TreatmentEditor id={edit} onClose={() => { setEdit(null); if (params.get('edit')) setParams({}) }} />
    </div>
  )
}

function TreatmentEditor({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const can = useCan()
  const update = useStore((s) => s.updateTreatment)
  const t = db.treatments.find((x) => x.id === id)
  const [d, setD] = useState<Treatment | null>(null)
  const [tab, setTab] = useState<'Details' | 'Pricing' | 'Content' | 'Clinical' | 'SEO'>('Details')
  useEffect(() => { setD(t ? structuredClone(t) : null); setTab('Details') }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!t || !d) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  const dirty = JSON.stringify(d) !== JSON.stringify(t)
  const list = (k: 'benefits' | 'aftercare' | 'preparation' | 'contraindications') => (
    <Field label={k[0].toUpperCase() + k.slice(1)} hint="One per line"><Textarea value={d[k].join('\n')} onChange={(e) => setD({ ...d, [k]: e.target.value.split('\n') })} onBlur={() => setD({ ...d, [k]: d[k].map((x) => x.trim()).filter(Boolean) })} /></Field>
  )
  return (
    <Drawer open={!!t} onClose={onClose} width={640} title={d.name} subtitle={<span className="flex items-center gap-2">{t.active ? <><Globe size={12} />Live at /treatments/{t.slug}</> : <><EyeOff size={12} />Hidden from website</>}</span>}
      actions={t.active && <Link to={`/treatments/${t.slug}`} target="_blank"><Button size="xs" variant="ghost" icon={<ExternalLink size={12} />}>View page</Button></Link>}>
      <div className="sticky top-0 z-10 bg-ivory px-6 pt-3"><Tabs tabs={['Details', 'Pricing', 'Content', 'Clinical', 'SEO'] as const} value={tab} onChange={setTab} id="tx-ed" /></div>
      <fieldset disabled={!can('treatments.manage')} className="space-y-5 p-6">
        {tab === 'Details' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" className="col-span-2"><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
              <Field label="Category"><Select value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as TreatmentCategory })}>{CATS.map((c) => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Duration (minutes)"><Input type="number" value={d.duration} onChange={(e) => setD({ ...d, duration: Number(e.target.value) })} /></Field>
            </div>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
              {([['active', 'Published on website', 'Shows the treatment page and listing'], ['onlineBookable', 'Online booking', 'Appears in the booking flow'], ['featured', 'Featured on homepage', 'Signature treatment carousel'], ['requiresIntake', 'Requires medical intake', 'Health questions during booking'], ['usesInjectionMap', 'Injection mapping', 'Face chart in clinical record']] as const).map(([k, l, h]) => (
                <div key={k} className="flex items-center justify-between py-3"><div><div className="text-[13.5px] text-ink">{l}</div><div className="text-[12px] text-stone-500">{h}</div></div><Toggle checked={d[k]} onChange={(v) => setD({ ...d, [k]: v })} label={l} /></div>
              ))}
            </div>
            <div>
              <SectionLabel>Practitioners</SectionLabel>
              <div className="flex flex-wrap gap-2">{db.staff.filter((s) => s.bookable).map((s) => { const on = d.practitionerIds.includes(s.id); return <button type="button" key={s.id} onClick={() => setD({ ...d, practitionerIds: on ? d.practitionerIds.filter((x) => x !== s.id) : [...d.practitionerIds, s.id] })} className={cn('rounded-full border px-3.5 py-1.5 text-[13px] transition', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white')}>{s.name}</button> })}</div>
            </div>
            <div>
              <SectionLabel>Locations</SectionLabel>
              <div className="flex flex-wrap gap-2">{db.locations.map((l) => { const on = d.locationIds.includes(l.id); return <button type="button" key={l.id} onClick={() => setD({ ...d, locationIds: on ? d.locationIds.filter((x) => x !== l.id) : [...d.locationIds, l.id] })} className={cn('rounded-full border px-3.5 py-1.5 text-[13px] transition', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white')}>{l.name}</button> })}</div>
            </div>
          </>
        )}
        {tab === 'Pricing' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Base price (from)"><Input type="number" value={d.priceFrom} onChange={(e) => setD({ ...d, priceFrom: Number(e.target.value) })} /></Field>
              <Field label="Booking deposit"><Input type="number" value={d.deposit} onChange={(e) => setD({ ...d, deposit: Number(e.target.value) })} /></Field>
              <Field label="Price note" className="col-span-2"><Input value={d.priceNote ?? ''} onChange={(e) => setD({ ...d, priceNote: e.target.value })} placeholder="E.g. From $15 per unit" /></Field>
            </div>
            <div>
              <SectionLabel>Location-specific pricing</SectionLabel>
              <div className="space-y-2">{db.locations.filter((l) => d.locationIds.includes(l.id)).map((l) => (
                <div key={l.id} className="flex items-center gap-3"><span className="w-36 text-[13.5px]">{l.name}</span><Input type="number" placeholder={`${d.priceFrom} (base)`} value={d.locationPricing[l.id] ?? ''} onChange={(e) => { const lp = { ...d.locationPricing }; if (e.target.value) lp[l.id] = Number(e.target.value); else delete lp[l.id]; setD({ ...d, locationPricing: lp }) }} /></div>
              ))}</div>
            </div>
            <div className="rounded-2xl bg-cream p-4 text-[13px] text-stone-600">Price changes apply instantly to the website, booking flow and new invoices, and are recorded in the audit log with the previous value.</div>
          </>
        )}
        {tab === 'Content' && (
          <>
            <Field label="Tagline"><Input value={d.tagline} onChange={(e) => setD({ ...d, tagline: e.target.value })} /></Field>
            <Field label="Overview"><Textarea value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} className="min-h-[110px]" /></Field>
            <Field label="How it works"><Textarea value={d.howItWorks} onChange={(e) => setD({ ...d, howItWorks: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expected results"><Input value={d.results} onChange={(e) => setD({ ...d, results: e.target.value })} /></Field>
              <Field label="Downtime"><Input value={d.downtime} onChange={(e) => setD({ ...d, downtime: e.target.value })} /></Field>
              <Field label="Recommended sessions" className="col-span-2"><Input value={d.sessions} onChange={(e) => setD({ ...d, sessions: e.target.value })} /></Field>
            </div>
            <div>
              <SectionLabel>Concerns treated (drives booking recommendations)</SectionLabel>
              <div className="flex flex-wrap gap-2">{CONCERNS.map((c) => { const on = d.concerns.includes(c); return <button type="button" key={c} onClick={() => setD({ ...d, concerns: on ? d.concerns.filter((x) => x !== c) : [...d.concerns, c] })} className={cn('rounded-full border px-3 py-1 text-[12.5px] transition', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white')}>{c}</button> })}</div>
            </div>
            {list('benefits')}
          </>
        )}
        {tab === 'Clinical' && (
          <>
            {list('preparation')}{list('aftercare')}{list('contraindications')}
            <Field label="Consent form"><Select value={d.consentFormId ?? ''} onChange={(e) => setD({ ...d, consentFormId: e.target.value || undefined })}><option value="">None required</option>{db.formTemplates.filter((f) => f.kind === 'Consent').map((f) => <option key={f.id} value={f.id}>{f.name} (v{f.version})</option>)}</Select></Field>
            <div>
              <SectionLabel>Stock consumed per session</SectionLabel>
              <div className="space-y-2">{d.consumables.map((c, i) => {
                const item = db.inventory.find((x) => x.sku === c.sku)
                return <div key={i} className="flex items-center gap-2"><Select value={c.sku} onChange={(e) => setD({ ...d, consumables: d.consumables.map((x, k) => (k === i ? { ...x, sku: e.target.value } : x)) })}>{[...new Map(db.inventory.map((x) => [x.sku, x])).values()].map((x) => <option key={x.sku} value={x.sku}>{x.name}</option>)}</Select><Input type="number" value={c.qty} className="w-24" onChange={(e) => setD({ ...d, consumables: d.consumables.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} /><span className="w-16 text-[12px] text-stone-500">{item?.unit}</span><button type="button" className="text-[12px] text-stone-400 hover:text-rose-500" onClick={() => setD({ ...d, consumables: d.consumables.filter((_, k) => k !== i) })}>Remove</button></div>
              })}</div>
              <button type="button" onClick={() => setD({ ...d, consumables: [...d.consumables, { sku: db.inventory[0].sku, qty: 1 }] })} className="mt-2 text-[12.5px] text-stone-500 hover:text-ink">+ Add item</button>
            </div>
          </>
        )}
        {tab === 'SEO' && (
          <>
            <Field label="Page title"><Input value={d.seo.title} onChange={(e) => setD({ ...d, seo: { ...d.seo, title: e.target.value } })} /></Field>
            <Field label="Meta description" hint={`${d.seo.description.length}/160`}><Textarea value={d.seo.description} onChange={(e) => setD({ ...d, seo: { ...d.seo, description: e.target.value } })} /></Field>
            <Field label="URL slug"><Input value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /></Field>
            <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="text-[12px] text-sage-700">{db.tenants[0].domain}/treatments/{d.slug}</div><div className="mt-0.5 text-[16px] text-[#1a0dab]">{d.seo.title}</div><div className="mt-0.5 text-[13px] text-stone-600">{d.seo.description || d.tagline}</div></div>
          </>
        )}
      </fieldset>
      {dirty && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-stone-200 bg-white/95 px-6 py-4">
          <span className="text-[13px] text-stone-500">Unsaved changes</span>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setD(structuredClone(t))}>Discard</Button><Button onClick={() => update(t.id, d)}>Save & publish</Button></div>
        </motion.div>
      )}
    </Drawer>
  )
}

export function PackagesAdmin() {
  const db = useDB()
  const sold = (id: ID) => db.patientPackages.filter((p) => p.templateId === id)
  const active = db.patientPackages.filter((p) => p.status === 'Active')
  const liability = active.reduce((a, p) => { const tpl = db.packageTemplates.find((t) => t.id === p.templateId)!; const total = p.items.reduce((x, i) => x + i.qty, 0); const left = p.items.reduce((x, i) => x + i.qty - i.used, 0); return a + (tpl.price * left) / total }, 0)
  const expiring = active.filter((p) => new Date(p.expiresAt) < addDays(new Date(), 30))
  return (
    <div>
      <PageHeader title="Packages" subtitle="Courses of treatment sold upfront, redeemed automatically at checkout." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active packages" value={active.length} index={0} icon={<PackageIcon size={15} />} />
        <Stat label="Package revenue (all time)" value={db.patientPackages.reduce((a, p) => a + (db.packageTemplates.find((t) => t.id === p.templateId)?.price ?? 0), 0)} format={(n) => money(n)} index={1} />
        <Stat label="Unredeemed balance" value={liability} format={(n) => money(n)} hint="deferred revenue" index={2} />
        <Stat label="Expiring in 30 days" value={expiring.length} hint="reminder automation" index={3} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {db.packageTemplates.map((t) => {
          const s = sold(t.id)
          const totalSessions = s.reduce((a, p) => a + p.items.reduce((x, i) => x + i.qty, 0), 0)
          const used = s.reduce((a, p) => a + p.items.reduce((x, i) => x + i.used, 0), 0)
          return (
            <Card key={t.id} className="p-6" hover>
              <div className="flex items-start justify-between"><div><div className="font-display text-[26px] text-ink">{t.name}</div><p className="text-[13px] text-stone-500">{t.description}</p></div><div className="text-right font-display text-[26px]">{money(t.price)}</div></div>
              <div className="mt-4 flex flex-wrap gap-2">{t.items.map((i) => <Badge key={i.treatmentId} tone="bronze">{i.qty} × {treatmentName(db, i.treatmentId)}</Badge>)}<Badge>{t.expiryMonths} months</Badge><Badge>{t.transferable ? 'Transferable' : 'Non-transferable'}</Badge></div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4 text-[13px]">
                <div><div className="text-stone-400">Sold</div><div className="text-[17px] text-ink">{s.length}</div></div>
                <div><div className="text-stone-400">Revenue</div><div className="text-[17px] text-ink">{money(s.length * t.price)}</div></div>
                <div><div className="text-stone-400">Redeemed</div><div className="text-[17px] text-ink">{pct(used / Math.max(1, totalSessions))}</div></div>
              </div>
            </Card>
          )
        })}
      </div>
      <Card className="mt-6">
        <CardHeader title="Package holders" />
        <Table className="mt-2">
          <thead><tr><TH>Patient</TH><TH>Package</TH><TH>Balance</TH><TH>Expires</TH><TH>Status</TH></tr></thead>
          <tbody>{db.patientPackages.map((p) => <TR key={p.id}><TD className="text-ink"><Link to={`/app/patients/${p.patientId}?tab=Packages`} className="hover:underline">{patientName(db, p.patientId)}</Link></TD><TD>{db.packageTemplates.find((t) => t.id === p.templateId)?.name}</TD><TD className="text-[12.5px]">{p.items.map((i) => `${treatmentName(db, i.treatmentId)} ${i.qty - i.used} left`).join(' · ')}</TD><TD className={new Date(p.expiresAt) < addDays(new Date(), 30) ? 'text-amber-500' : ''}>{fmtDate(p.expiresAt)}</TD><TD><Badge tone={p.status === 'Active' ? 'sage' : 'neutral'}>{p.status}</Badge></TD></TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

export function MembershipsAdmin() {
  const db = useDB()
  const setStatus = useStore((s) => s.setMembershipStatus)
  const [filter, setFilter] = useState('All')
  const active = db.memberships.filter((m) => m.status === 'Active')
  const cancelled30 = db.memberships.filter((m) => m.status === 'Cancelled' && m.cancelledAt && new Date(m.cancelledAt) > addDays(new Date(), -30)).length
  const churn = cancelled30 / Math.max(1, active.length + cancelled30)
  const renewals = db.memberships.filter((m) => m.status !== 'Cancelled' && new Date(m.renewsAt) < addDays(new Date(), 7))
  const list = db.memberships.filter((m) => filter === 'All' || m.status === filter)
  return (
    <div>
      <PageHeader title="Memberships" subtitle="Recurring revenue and loyalty, on autopilot." />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active members" value={active.length} index={0} icon={<Crown size={15} />} />
        <Stat label="MRR" value={mrr(db)} format={(n) => money(n)} index={1} hint={`${money(mrr(db) * 12)} ARR`} />
        <Stat label="Churn (30 days)" value={churn * 100} format={(n) => `${n.toFixed(1)}%`} index={2} icon={<TrendingDown size={15} />} />
        <Stat label="Renewing this week" value={renewals.length} index={3} icon={<RefreshCw size={15} />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Members by plan" />
          <div className="p-5"><Donut data={db.membershipPlans.map((p) => ({ label: p.name, value: db.memberships.filter((m) => m.planId === p.id && m.status !== 'Cancelled').length }))} center={<div><div className="font-display text-[26px]">{active.length}</div><div className="text-[11px] text-stone-500">active</div></div>} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Needs attention" subtitle="Failed payments & cancellation requests" />
          <div className="divide-y divide-stone-100 px-5 pb-3 pt-2">
            {db.memberships.filter((m) => m.status === 'Past Due' || m.status === 'Cancel Requested').map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <AlertCircle size={16} className={m.status === 'Past Due' ? 'text-rose-500' : 'text-amber-500'} />
                <div className="min-w-0 flex-1"><Link to={`/app/patients/${m.patientId}?tab=Membership`} className="text-[13.5px] text-ink hover:underline">{patientName(db, m.patientId)}</Link><div className="text-[12px] text-stone-500">{db.membershipPlans.find((p) => p.id === m.planId)?.name} · {m.status === 'Past Due' ? `card declined · ${m.paymentMethod}` : `requested · renews ${relative(m.renewsAt)}`}</div></div>
                {m.status === 'Past Due' ? <Button size="xs" variant="secondary" onClick={() => { setStatus(m.id, 'Active'); useStore.getState().toast('Payment retried', 'Charge succeeded — membership active.', 'success') }}>Retry payment</Button> : <><Button size="xs" variant="secondary" onClick={() => { setStatus(m.id, 'Active'); useStore.getState().toast('Retention offer accepted', 'Membership kept active.', 'success') }}>Offer retention</Button><Button size="xs" variant="ghost" onClick={() => setStatus(m.id, 'Cancelled')}>Confirm cancel</Button></>}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <div className="flex items-center gap-3 px-5 pt-4"><Tabs tabs={['All', 'Active', 'Past Due', 'Cancel Requested', 'Cancelled'] as const} value={filter as 'All'} onChange={setFilter} id="mem-f" className="border-0" /></div>
        <Table className="mt-2">
          <thead><tr><TH>Member</TH><TH>Plan</TH><TH>Since</TH><TH>Renews</TH><TH className="text-right">Credits</TH><TH>Payment</TH><TH>Status</TH></tr></thead>
          <tbody>{list.map((m) => <TR key={m.id}><TD className="text-ink"><Link to={`/app/patients/${m.patientId}?tab=Membership`} className="hover:underline">{patientName(db, m.patientId)}</Link></TD><TD>{db.membershipPlans.find((p) => p.id === m.planId)?.name}</TD><TD>{fmtDate(m.startedAt)}</TD><TD>{m.status === 'Cancelled' ? '—' : fmtDate(m.renewsAt, { month: 'short', day: 'numeric' })}</TD><TD className="text-right">{m.credits}</TD><TD className="text-[12.5px] text-stone-500">{m.paymentMethod}</TD><TD><Badge tone={m.status === 'Active' ? 'sage' : m.status === 'Cancelled' ? 'neutral' : m.status === 'Past Due' ? 'rose' : 'amber'}>{m.status}</Badge></TD></TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}
