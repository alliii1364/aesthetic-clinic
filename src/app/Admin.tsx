import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Monitor, Plus, Trash2, Lock, ShieldCheck, Database, Download, RotateCcw, Check, Search, Globe, Image as ImageIcon, Mail, MessageSquare, Bell, Smartphone as Phone, CreditCard, CalendarDays, Link2, Sparkles } from 'lucide-react'
import { useDB, useStore, useCan, staffName, patientName, locationName, cmsOf } from '@/store/store'
import type { CMS, Permission, Role } from '@/lib/types'
import { PERMISSION_GROUPS, ROLE_LABEL, PLAN_FEATURES, PLANS, FEATURE_LABEL, type Feature } from '@/lib/permissions'
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, Photo, SectionLabel, Segmented, Select, Table, TD, TH, TR, Tabs, Textarea, Toggle, EASE, cn } from '@/ui/ui'
import { fmtDateTime, money, uid, relative } from '@/lib/format'
import { exportCSV } from './AppointmentsList'

// ── Website CMS ─────────────────────────────────────────────────────────────
const CMS_TABS = ['Homepage', 'Pricing', 'Practitioners', 'Galleries', 'Reviews', 'FAQs', 'Journal', 'Promotions', 'SEO'] as const

export function WebsiteCMS() {
  const db = useDB()
  const updateCMS = useStore((s) => s.updateCMS)
  const updateTreatment = useStore((s) => s.updateTreatment)
  const updateStaff = useStore((s) => s.updateStaff)
  const setTestimonial = useStore((s) => s.setTestimonialPublished)
  const live = cmsOf(db)
  const [draft, setDraft] = useState<CMS>(() => structuredClone(live))
  const [tab, setTab] = useState<(typeof CMS_TABS)[number]>('Homepage')
  const [device, setDevice] = useState<'Desktop' | 'Mobile'>('Desktop')
  const [frameKey, setFrameKey] = useState(0)
  const dirty = JSON.stringify(draft) !== JSON.stringify(live)
  const publish = () => { updateCMS(draft); setTimeout(() => setFrameKey((k) => k + 1), 120) }
  const set = <K extends keyof CMS>(k: K, v: CMS[K]) => setDraft((d) => ({ ...d, [k]: v }))
  return (
    <div>
      <PageHeader title="Website" subtitle={<span className="flex items-center gap-1.5"><Globe size={13} />{db.tenants[0].domain} · treatments, pricing, team, gallery and reviews sync automatically</span>}
        actions={<><Link to="/" target="_blank"><Button size="sm" variant="secondary" icon={<ExternalLink size={14} />}>Open site</Button></Link><Button size="sm" disabled={!dirty} onClick={publish}>{dirty ? 'Publish changes' : 'Published'}</Button></>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="min-w-0">
          <Tabs tabs={CMS_TABS} value={tab} onChange={setTab} id="cms" className="mb-5" />
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="space-y-5">
              {tab === 'Homepage' && (
                <>
                  <Card className="space-y-4 p-5">
                    <div className="flex items-center justify-between"><SectionLabel className="mb-0">Announcement bar</SectionLabel><Toggle checked={draft.announcement.active} onChange={(v) => set('announcement', { ...draft.announcement, active: v })} /></div>
                    <Input value={draft.announcement.text} onChange={(e) => set('announcement', { ...draft.announcement, text: e.target.value })} />
                  </Card>
                  <Card className="space-y-4 p-5">
                    <SectionLabel className="mb-0">Hero</SectionLabel>
                    <Field label="Eyebrow"><Input value={draft.hero.eyebrow} onChange={(e) => set('hero', { ...draft.hero, eyebrow: e.target.value })} /></Field>
                    <Field label="Headline"><Input value={draft.hero.headline} onChange={(e) => set('hero', { ...draft.hero, headline: e.target.value })} className="font-display text-[20px]" /></Field>
                    <Field label="Supporting text"><Textarea value={draft.hero.sub} onChange={(e) => set('hero', { ...draft.hero, sub: e.target.value })} /></Field>
                    <div className="grid grid-cols-2 gap-3"><Field label="Primary button"><Input value={draft.hero.primaryCta} onChange={(e) => set('hero', { ...draft.hero, primaryCta: e.target.value })} /></Field><Field label="Secondary button"><Input value={draft.hero.secondaryCta} onChange={(e) => set('hero', { ...draft.hero, secondaryCta: e.target.value })} /></Field></div>
                    <Field label="Hero image URL"><Input value={draft.hero.image} onChange={(e) => set('hero', { ...draft.hero, image: e.target.value })} /></Field>
                  </Card>
                  <Card className="p-5">
                    <SectionLabel>Sections</SectionLabel>
                    <div className="divide-y divide-stone-100">{(Object.keys(draft.sections) as (keyof CMS['sections'])[]).map((k) => <div key={k} className="flex items-center justify-between py-2.5 text-[13.5px] capitalize">{k === 'trust' ? 'Trust indicators' : k === 'featured' ? 'Featured treatments' : k === 'results' ? 'Before & after' : k === 'team' ? 'Practitioners' : k}<Toggle checked={draft.sections[k]} onChange={(v) => set('sections', { ...draft.sections, [k]: v })} /></div>)}</div>
                  </Card>
                  <Card className="p-5">
                    <SectionLabel>Clinic statistics</SectionLabel>
                    <div className="space-y-2">{draft.stats.map((s, i) => <div key={i} className="grid grid-cols-[1fr_90px_60px] gap-2"><Input value={s.label} onChange={(e) => set('stats', draft.stats.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} /><Input type="number" value={s.value} onChange={(e) => set('stats', draft.stats.map((x, k) => (k === i ? { ...x, value: Number(e.target.value) } : x)))} /><Input value={s.suffix} onChange={(e) => set('stats', draft.stats.map((x, k) => (k === i ? { ...x, suffix: e.target.value } : x)))} /></div>)}</div>
                  </Card>
                </>
              )}
              {tab === 'Pricing' && (
                <Card>
                  <CardHeader title="Live pricing" subtitle="Changes publish instantly to the website, booking flow and POS" />
                  <Table className="mt-2">
                    <thead><tr><TH>Treatment</TH><TH className="text-right">Base</TH>{db.locations.map((l) => <TH key={l.id} className="text-right">{l.name}</TH>)}<TH>Online</TH></tr></thead>
                    <tbody>{db.treatments.map((t) => <TR key={t.id}><TD className="text-ink">{t.name}</TD><TD className="text-right"><input type="number" defaultValue={t.priceFrom} onBlur={(e) => Number(e.target.value) !== t.priceFrom && updateTreatment(t.id, { priceFrom: Number(e.target.value) })} className="w-20 rounded-lg border border-stone-200 px-2 py-1 text-right text-[13px] outline-none focus:border-stone-400" /></TD>{db.locations.map((l) => <TD key={l.id} className="text-right">{t.locationIds.includes(l.id) ? <input type="number" placeholder="base" defaultValue={t.locationPricing[l.id] ?? ''} onBlur={(e) => { const v = e.target.value; const lp = { ...t.locationPricing }; if (v) lp[l.id] = Number(v); else delete lp[l.id]; if (JSON.stringify(lp) !== JSON.stringify(t.locationPricing)) updateTreatment(t.id, { locationPricing: lp }) }} className="w-20 rounded-lg border border-stone-200 px-2 py-1 text-right text-[13px] outline-none focus:border-stone-400" /> : <span className="text-stone-300">n/a</span>}</TD>)}<TD><Toggle checked={t.onlineBookable && t.active} onChange={(v) => updateTreatment(t.id, { onlineBookable: v })} /></TD></TR>)}</tbody>
                  </Table>
                </Card>
              )}
              {tab === 'Practitioners' && db.staff.filter((s) => s.bookable).map((s) => (
                <Card key={s.id} className="flex gap-4 p-5"><Photo src={s.avatar} className="h-20 w-16 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><div className="flex items-center justify-between"><div className="text-[14.5px] font-medium">{s.name}</div><label className="flex items-center gap-2 text-[12px] text-stone-500">Shown on website<Toggle checked={s.active} onChange={(v) => updateStaff(s.id, { active: v })} /></label></div><Textarea defaultValue={s.bio} onBlur={(e) => e.target.value !== s.bio && updateStaff(s.id, { bio: e.target.value })} className="min-h-[72px] text-[13px]" /></div></Card>
              ))}
              {tab === 'Galleries' && (
                <Card className="p-5">
                  <p className="mb-4 text-[13px] text-stone-500">Only photos with “Marketing approved” permission (and valid photography consent) appear on the public Before & After gallery.</p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">{db.photos.filter((p) => p.permission === 'Marketing approved').map((p) => <div key={p.id}><Photo src={p.src} className="aspect-[3/4] rounded-xl" /><div className="mt-1 text-[11.5px] text-stone-500">{p.stage}</div></div>)}</div>
                  <Link to="/app/photos" className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-ink"><ImageIcon size={14} />Manage media permissions</Link>
                </Card>
              )}
              {tab === 'Reviews' && <Card><div className="divide-y divide-stone-100 px-5 py-2">{db.testimonials.map((t) => <div key={t.id} className="flex items-center gap-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px]">“{t.text}”</div><div className="text-[12px] text-stone-500">{t.name} · {t.rating}★ · {t.source}</div></div><Toggle checked={t.published} onChange={(v) => setTestimonial(t.id, v)} /></div>)}</div></Card>}
              {tab === 'FAQs' && (
                <>
                  {draft.faqs.map((f, i) => <Card key={i} className="space-y-2 p-4"><div className="flex gap-2"><Select value={f.category} onChange={(e) => set('faqs', draft.faqs.map((x, k) => (k === i ? { ...x, category: e.target.value } : x)))} className="h-9 w-36">{['Booking', 'Treatments', 'Payments', 'Privacy'].map((c) => <option key={c}>{c}</option>)}</Select><Input value={f.q} onChange={(e) => set('faqs', draft.faqs.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} className="h-9" /><button onClick={() => set('faqs', draft.faqs.filter((_, k) => k !== i))} className="text-stone-300 hover:text-rose-500" aria-label="Remove"><Trash2 size={15} /></button></div><Textarea value={f.a} onChange={(e) => set('faqs', draft.faqs.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} className="min-h-[60px]" /></Card>)}
                  <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('faqs', [...draft.faqs, { category: 'Treatments', q: 'New question', a: '' }])}>Add FAQ</Button>
                </>
              )}
              {tab === 'Journal' && draft.posts.map((p, i) => (
                <Card key={p.id} className="flex gap-4 p-4"><Photo src={p.image} className="h-20 w-24 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Input value={p.title} onChange={(e) => set('posts', draft.posts.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} className="h-9" /><Input value={p.excerpt} onChange={(e) => set('posts', draft.posts.map((x, k) => (k === i ? { ...x, excerpt: e.target.value } : x)))} className="h-9 text-[13px]" /></div><div className="flex flex-col items-end gap-1 text-[11.5px] text-stone-500">Published<Toggle checked={p.published} onChange={(v) => set('posts', draft.posts.map((x, k) => (k === i ? { ...x, published: v } : x)))} /></div></Card>
              ))}
              {tab === 'Promotions' && (
                <>
                  {draft.promotions.map((p, i) => <Card key={p.id} className="flex items-center gap-4 p-4"><div className="min-w-0 flex-1 space-y-2"><Input value={p.title} onChange={(e) => set('promotions', draft.promotions.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} className="h-9" /><Input value={p.body} onChange={(e) => set('promotions', draft.promotions.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} className="h-9 text-[13px]" /></div><Toggle checked={p.active} onChange={(v) => set('promotions', draft.promotions.map((x, k) => (k === i ? { ...x, active: v } : x)))} /></Card>)}
                  <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => set('promotions', [...draft.promotions, { id: uid('pr'), title: 'New promotion', body: '', active: false, ends: new Date().toISOString() }])}>Add promotion</Button>
                </>
              )}
              {tab === 'SEO' && (
                <Card className="space-y-4 p-5">
                  <Field label="Site title"><Input value={draft.seo.title} onChange={(e) => set('seo', { ...draft.seo, title: e.target.value })} /></Field>
                  <Field label="Meta description" hint={`${draft.seo.description.length}/160`}><Textarea value={draft.seo.description} onChange={(e) => set('seo', { ...draft.seo, description: e.target.value })} /></Field>
                  <div className="rounded-2xl border border-stone-200 bg-white p-4"><div className="text-[12px] text-sage-700">{db.tenants[0].domain}</div><div className="text-[17px] text-[#1a0dab]">{draft.seo.title}</div><div className="text-[13px] text-stone-600">{draft.seo.description}</div></div>
                  <p className="text-[12.5px] text-stone-500">Each treatment page has its own title, description and slug — edit them in Treatments → SEO. A sitemap and structured data (MedicalClinic, LocalBusiness) are generated automatically.</p>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <div className="mb-3 flex items-center justify-between"><span className="text-[12.5px] text-stone-500">Live preview {dirty && <Badge tone="amber" className="ml-1">Unpublished changes</Badge>}</span><Segmented options={['Desktop', 'Mobile'] as const} value={device} onChange={setDevice} id="cms-dev" size="sm" /></div>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lift">
            <div className="flex items-center gap-1.5 border-b border-stone-100 bg-cream/60 px-3 py-2"><span className="h-2.5 w-2.5 rounded-full bg-stone-300" /><span className="h-2.5 w-2.5 rounded-full bg-stone-300" /><span className="h-2.5 w-2.5 rounded-full bg-stone-300" /><span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-0.5 text-[11px] text-stone-500">{db.tenants[0].domain}</span>{device === 'Desktop' ? <Monitor size={13} className="text-stone-400" /> : <Phone size={13} className="text-stone-400" />}</div>
            <div className={cn('mx-auto bg-ivory transition-all duration-500', device === 'Mobile' ? 'w-[390px] max-w-full' : 'w-full')}>
              <div className="relative h-[640px] overflow-hidden">
                <iframe key={frameKey} src="/" title="Website preview" className="absolute left-0 top-0 origin-top-left border-0" style={device === 'Desktop' ? { width: '200%', height: '200%', transform: 'scale(0.5)' } : { width: '100%', height: '100%' }} />
              </div>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-stone-400">Preview refreshes after you publish.</p>
        </div>
      </div>
    </div>
  )
}

// ── Settings ────────────────────────────────────────────────────────────────
const SETTINGS_TABS = ['Organization', 'Roles & permissions', 'Security', 'Audit log', 'Notifications', 'Integrations', 'Plan & billing', 'Data'] as const

export function SettingsPage() {
  const can = useCan()
  const [params, setParams] = useSearchParams()
  const tabs = SETTINGS_TABS.filter((t) => (t === 'Audit log' ? can('audit.view') : can('settings.manage')))
  const tab = (params.get('tab') as (typeof SETTINGS_TABS)[number]) && tabs.includes(params.get('tab') as never) ? (params.get('tab') as (typeof SETTINGS_TABS)[number]) : tabs[0]
  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization, access, security and compliance." />
      <Tabs tabs={tabs} value={tab} onChange={(t) => setParams({ tab: t })} id="set" className="mb-6" />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          {tab === 'Organization' && <Organization />}
          {tab === 'Roles & permissions' && <RolesMatrix />}
          {tab === 'Security' && <Security />}
          {tab === 'Audit log' && <AuditLog />}
          {tab === 'Notifications' && <NotificationSettings />}
          {tab === 'Integrations' && <Integrations />}
          {tab === 'Plan & billing' && <PlanBilling />}
          {tab === 'Data' && <DataSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Organization() {
  const db = useDB()
  const update = useStore((s) => s.updateTenant)
  const t = db.tenants[0]
  const [f, setF] = useState({ name: t.name, domain: t.domain, ...t.brand })
  const dirty = f.name !== t.name || f.domain !== t.domain || JSON.stringify({ primary: f.primary, accent: f.accent, logoText: f.logoText, displayFont: f.displayFont, smsSender: f.smsSender, emailFrom: f.emailFrom }) !== JSON.stringify(t.brand)
  const ACCENTS = ['#A8642A', '#8A6B4E', '#4E7A61', '#6A4FA8', '#2E7CC0', '#B4524A']
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4 p-6">
        <SectionLabel className="mb-0">Brand</SectionLabel>
        <div className="grid grid-cols-2 gap-3"><Field label="Clinic name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Logo wordmark"><Input value={f.logoText} onChange={(e) => setF({ ...f, logoText: e.target.value })} /></Field></div>
        <Field label="Accent colour" hint="Curated palette keeps every clinic’s site feeling premium and accessible."><div className="flex gap-2">{ACCENTS.map((c) => <button key={c} onClick={() => setF({ ...f, accent: c })} className={cn('h-9 w-9 rounded-full ring-offset-2 transition', f.accent === c && 'ring-2 ring-ink')} style={{ background: c }} aria-label={c} />)}</div></Field>
        <Field label="Display typeface"><Select value={f.displayFont} onChange={(e) => setF({ ...f, displayFont: e.target.value })}>{['Cormorant Garamond', 'Playfair Display', 'Fraunces', 'Inter'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
        <Field label="Custom domain"><Input value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Email sender"><Input value={f.emailFrom} onChange={(e) => setF({ ...f, emailFrom: e.target.value })} /></Field><Field label="SMS sender ID"><Input value={f.smsSender} maxLength={11} onChange={(e) => setF({ ...f, smsSender: e.target.value.toUpperCase() })} /></Field></div>
        {dirty && <Button onClick={() => { const { name, domain, ...brand } = f; update({ name, domain, brand }) }}>Save branding</Button>}
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-stone-100 px-6 py-4 text-[12.5px] text-stone-500">Brand preview · invoice, email & website</div>
        <div className="space-y-5 p-6">
          <div className="rounded-2xl bg-ivory p-6 hairline"><div style={{ fontFamily: f.displayFont }} className="text-[30px] text-ink">{f.logoText}</div><div className="mt-4 text-[13px] text-stone-500">Hi Emma, your Hydrafacial is confirmed for Thursday at 2:30 pm.</div><span className="mt-4 inline-block rounded-full px-4 py-2 text-[12.5px] text-white" style={{ background: f.accent }}>Manage appointment</span></div>
          <div className="rounded-2xl bg-white p-5 hairline"><div className="flex justify-between"><span style={{ fontFamily: f.displayFont }} className="text-[20px]">{f.name}</span><span className="text-[12px] text-stone-400">INV-10642</span></div><div className="mt-3 flex justify-between border-t border-stone-100 pt-3 text-[13px]"><span>Botox · 24 units</span><span>$360.00</span></div><div className="mt-1 text-[11.5px] text-stone-400">{f.domain} · {f.emailFrom}</div></div>
          <div className="rounded-2xl bg-stone-100 p-4 text-[12.5px]"><b>{f.smsSender}</b>: Reminder — your appointment is tomorrow at 2:30 pm. Reply C to confirm.</div>
        </div>
      </Card>
    </div>
  )
}

function RolesMatrix() {
  const perms = useStore((s) => s.rolePermissions)
  const setPerm = useStore((s) => s.setRolePermission)
  const roles = Object.keys(ROLE_LABEL) as Role[]
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4"><div><div className="text-[15px] font-medium">Role-based access control</div><div className="text-[12.5px] text-stone-500">Every important action is permission-checked server-side and changes are audit-logged. Try “sign in as” a role from the user menu.</div></div><Badge tone="violet">Custom roles on Enterprise</Badge></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-[12.5px]">
          <thead className="sticky top-0 bg-white"><tr><th className="w-56 border-b border-stone-100 px-4 py-3 text-left font-medium text-stone-400">Permission</th>{roles.map((r) => <th key={r} className="border-b border-stone-100 px-2 py-3 text-center font-medium text-stone-600">{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>
            {PERMISSION_GROUPS.map((g) => [
              <tr key={g.group}><td colSpan={roles.length + 1} className="bg-cream/50 px-4 py-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">{g.group}</td></tr>,
              ...g.items.map((it) => (
                <tr key={it.key} className="hover:bg-cream/30">
                  <td className="border-b border-stone-100 px-4 py-2.5 text-stone-700">{it.label}</td>
                  {roles.map((r) => { const on = perms[r].includes(it.key as Permission); return <td key={r} className="border-b border-stone-100 text-center"><button disabled={r === 'owner'} onClick={() => setPerm(r, it.key as Permission, !on)} className={cn('mx-auto grid h-6 w-6 place-items-center rounded-md transition', on ? 'bg-ink text-ivory' : 'border border-stone-200 bg-white text-transparent hover:border-stone-400', r === 'owner' && 'opacity-60')} aria-label={`${ROLE_LABEL[r]} ${it.label}`}><Check size={13} /></button></td> })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function Security() {
  const db = useDB()
  const update = useStore((s) => s.updateTenant)
  const sec = db.tenants[0].security
  const plan = db.tenants[0].plan
  const s = (patch: Partial<typeof sec>) => update({ security: { ...sec, ...patch } })
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <SectionLabel>Authentication & sessions</SectionLabel>
        <div className="divide-y divide-stone-100">
          <Row t="Require multi-factor authentication" d="TOTP or passkey for every staff sign-in"><Toggle checked={sec.mfaRequired} onChange={(v) => s({ mfaRequired: v })} /></Row>
          <Row t="Idle session timeout" d="Locks shared front-desk screens automatically"><Select value={sec.sessionTimeoutMin} onChange={(e) => s({ sessionTimeoutMin: Number(e.target.value) })} className="h-9 w-32">{[5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}</Select></Row>
          <Row t="Minimum password length" d="Plus breached-password screening"><Select value={sec.passwordMinLength} onChange={(e) => s({ passwordMinLength: Number(e.target.value) })} className="h-9 w-32">{[10, 12, 14, 16].map((m) => <option key={m} value={m}>{m} characters</option>)}</Select></Row>
          <Row t="IP allowlist" d="Restrict dashboard access to clinic networks"><Toggle checked={sec.ipAllowlist} onChange={(v) => s({ ipAllowlist: v })} /></Row>
          <Row t="Single sign-on (SAML / OIDC)" d="Okta, Azure AD, Google Workspace">{plan === 'enterprise' ? <Toggle checked={false} onChange={() => {}} /> : <Badge tone="violet"><Lock size={10} />Enterprise</Badge>}</Row>
        </div>
      </Card>
      <Card className="p-6">
        <SectionLabel>Data protection</SectionLabel>
        <div className="divide-y divide-stone-100">
          <Row t="Record retention" d="Clinical records kept per state medical-record law"><Select value={sec.retentionYears} onChange={(e) => s({ retentionYears: Number(e.target.value) })} className="h-9 w-32">{[7, 10, 15].map((y) => <option key={y} value={y}>{y} years</option>)}</Select></Row>
          <Row t="Encryption" d="AES-256 at rest with per-tenant keys · TLS 1.3 in transit"><Badge tone="sage" dot>Active</Badge></Row>
          <Row t="Secure file access" d="Photos & documents served via short-lived signed URLs"><Badge tone="sage" dot>Active</Badge></Row>
          <Row t="Backups" d="Continuous, point-in-time recovery (35 days) · cross-region"><Badge tone="sage" dot>Last: {relative(new Date(Date.now() - 14 * 60000))}</Badge></Row>
          <Row t="Tenant isolation" d="Row-level security on every query, scoped by organization"><Badge tone="sage" dot>Enforced</Badge></Row>
          <Row t="Business Associate Agreement" d="HIPAA BAA signed with Aurelia OS"><Badge tone="sage" dot>Signed</Badge></Row>
        </div>
      </Card>
      <Card className="p-6 lg:col-span-2">
        <SectionLabel>Active sessions</SectionLabel>
        {[['Victoria Hale', 'MacBook Pro · Chrome · Beverly Hills', 'now'], ['Daniel Park', 'iPad · Clinic kiosk · Santa Monica', '6m ago'], ['Sarah Mitchell', 'iPad Pro · Safari · Beverly Hills', '22m ago']].map(([u, d, t]) => <div key={u} className="flex items-center gap-3 border-b border-stone-100 py-3 text-[13.5px] last:border-0"><ShieldCheck size={15} className="text-sage-500" /><span className="text-ink">{u}</span><span className="text-stone-500">{d}</span><span className="ml-auto text-[12px] text-stone-400">{t}</span><Button size="xs" variant="ghost">Revoke</Button></div>)}
      </Card>
    </div>
  )
}
const Row = ({ t, d, children }: { t: string; d: string; children: React.ReactNode }) => <div className="flex items-center justify-between gap-4 py-3.5"><div><div className="text-[13.5px] text-ink">{t}</div><div className="text-[12px] text-stone-500">{d}</div></div>{children}</div>

function AuditLog() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState('')
  const [sev, setSev] = useState('')
  const modules = [...new Set(db.audit.map((e) => e.module))]
  const list = useMemo(() => db.audit.filter((e) => (!mod || e.module === mod) && (!sev || e.severity === sev) && (!q || `${e.action} ${e.entity} ${staffName(db, e.userId)} ${e.patientId ? patientName(db, e.patientId) : ''}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 300), [db, q, mod, sev])
  const tone = { info: 'neutral', clinical: 'sage', financial: 'bronze', security: 'violet' } as const
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
        <label className="relative w-full sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, action, patient…" className="h-9 pl-9" /></label>
        <Select value={mod} onChange={(e) => setMod(e.target.value)} className="h-9 w-40"><option value="">All modules</option>{modules.map((m) => <option key={m}>{m}</option>)}</Select>
        <Select value={sev} onChange={(e) => setSev(e.target.value)} className="h-9 w-36"><option value="">All types</option>{['info', 'clinical', 'financial', 'security'].map((m) => <option key={m}>{m}</option>)}</Select>
        <Button size="sm" variant="ghost" className="ml-auto" icon={<Download size={14} />} onClick={() => exportCSV('audit-log', [['Timestamp', 'User', 'Action', 'Module', 'Entity', 'Old', 'New', 'Patient', 'Location', 'IP', 'Device'], ...list.map((e) => [e.at, staffName(db, e.userId), e.action, e.module, e.entity, e.oldValue ?? '', e.newValue ?? '', e.patientId ? patientName(db, e.patientId) : '', e.locationId ? locationName(db, e.locationId) : '', e.ip, e.device])])}>Export</Button>
      </div>
      <Table className="mt-2">
        <thead><tr><TH>Timestamp</TH><TH>User</TH><TH>Action</TH><TH>Module</TH><TH>Record</TH><TH>Old → new</TH><TH>Patient</TH><TH>Device · IP</TH></tr></thead>
        <tbody>{list.map((e) => <TR key={e.id}><TD className="whitespace-nowrap text-[12.5px]">{fmtDateTime(e.at)}</TD><TD className="text-ink">{staffName(db, e.userId)}</TD><TD>{e.action}</TD><TD><Badge tone={tone[e.severity]}>{e.module}</Badge></TD><TD className="max-w-[220px] truncate text-[12.5px]">{e.entity}</TD><TD className="max-w-[220px] text-[12px]">{e.oldValue && <span className="text-stone-400 line-through">{e.oldValue}</span>}{e.newValue && <span className="text-ink"> {e.newValue}</span>}</TD><TD className="text-[12.5px]">{e.patientId ? patientName(db, e.patientId) : '—'}</TD><TD className="whitespace-nowrap text-[11.5px] text-stone-400">{e.device} · {e.ip}</TD></TR>)}</tbody>
      </Table>
      <div className="px-5 py-3 text-[12px] text-stone-400">Append-only and tamper-evident. Retained for {db.tenants[0].security.retentionYears} years.</div>
    </Card>
  )
}

function NotificationSettings() {
  const events = ['Appointment confirmation', 'Appointment reminder', 'Reschedule', 'Cancellation', 'Deposit receipt', 'Package expiry', 'Membership renewal', 'Treatment reminder', 'Form pending', 'Review request', 'Lead follow-up', 'Stock warning']
  const channels = [{ k: 'Email', i: Mail }, { k: 'SMS', i: MessageSquare }, { k: 'In-app', i: Bell }, { k: 'Push', i: Phone }]
  const [m, setM] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('aurelia-notif') ?? '{}') } catch { return {} } })
  const def = (e: string, c: string) => (e === 'Stock warning' || e === 'Lead follow-up' ? c === 'In-app' || c === 'Email' : c !== 'In-app' || ['Form pending', 'Review request'].includes(e))
  const get = (e: string, c: string) => m[`${e}|${c}`] ?? def(e, c)
  useEffect(() => { try { localStorage.setItem('aurelia-notif', JSON.stringify(m)) } catch { /* ignore */ } }, [m])
  return (
    <Card>
      <CardHeader title="Notification rules" subtitle="Which channels each event uses. Patients can opt out of non-essential channels in their portal." />
      <Table className="mt-2">
        <thead><tr><TH>Event</TH>{channels.map((c) => <TH key={c.k} className="text-center"><span className="inline-flex items-center gap-1.5"><c.i size={12} />{c.k}</span></TH>)}</tr></thead>
        <tbody>{events.map((e) => <TR key={e}><TD className="text-ink">{e}</TD>{channels.map((c) => <TD key={c.k} className="text-center"><div className="flex justify-center"><Toggle checked={get(e, c.k)} onChange={(v) => setM({ ...m, [`${e}|${c.k}`]: v })} /></div></TD>)}</TR>)}</tbody>
      </Table>
    </Card>
  )
}

function Integrations() {
  const list = [
    { n: 'Stripe', d: 'Card payments, deposits, saved cards & subscriptions', i: CreditCard, s: 'Connected' },
    { n: 'Google Calendar', d: 'Two-way sync of practitioner schedules', i: CalendarDays, s: 'Connected' },
    { n: 'Twilio', d: 'SMS reminders & two-way messaging', i: MessageSquare, s: 'Connected' },
    { n: 'Postmark', d: 'Transactional email delivery', i: Mail, s: 'Connected' },
    { n: 'QuickBooks Online', d: 'Journal entries for revenue, refunds & payouts', i: Link2, s: 'Available' },
    { n: 'Xero', d: 'Accounting sync', i: Link2, s: 'Available' },
    { n: 'Google Business Profile', d: 'Review requests & rating sync', i: Sparkles, s: 'Connected' },
    { n: 'Meta Lead Ads', d: 'Leads flow straight into the CRM pipeline', i: Sparkles, s: 'Available' },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {list.map((x) => <Card key={x.n} hover className="flex flex-col p-5"><x.i size={18} className="text-bronze-500" /><div className="mt-3 text-[14.5px] font-medium">{x.n}</div><p className="mt-1 flex-1 text-[12.5px] text-stone-500">{x.d}</p><div className="mt-4">{x.s === 'Connected' ? <Badge tone="sage" dot>Connected</Badge> : <Button size="xs" variant="secondary" onClick={() => useStore.getState().toast(`${x.n}`, 'OAuth connection flow would open here.')}>Connect</Button>}</div></Card>)}
    </div>
  )
}

function PlanBilling() {
  const db = useDB()
  const t = db.tenants[0]
  const plan = PLANS.find((p) => p.tier === t.plan)!
  const all = Object.keys(FEATURE_LABEL) as Feature[]
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6">
        <div className="text-[12.5px] text-stone-500">Current plan</div>
        <div className="mt-1 font-display text-[40px]">{plan.name}</div>
        <div className="text-[14px] text-stone-600">{money(plan.price)}/month · {plan.limits}</div>
        <div className="mt-5 space-y-3 text-[13px]">
          {[['Locations', `${db.locations.length} of 5`, db.locations.length / 5], ['Staff seats', `${db.staff.length} of unlimited`, 0.2], ['Patients', db.patients.length.toLocaleString(), 0.1], ['Media storage', '18.4 GB of 250 GB', 0.074], ['SMS this month', '1,284 of 5,000', 0.26]].map(([k, v, p]) => <div key={k as string}><div className="flex justify-between"><span className="text-stone-500">{k}</span><span>{v}</span></div><div className="mt-1 h-1 rounded-full bg-stone-100"><div className="h-full rounded-full bg-ink" style={{ width: `${(p as number) * 100}%` }} /></div></div>)}
        </div>
        <div className="mt-5 text-[12.5px] text-stone-500">Next invoice {money(plan.price)} on the 1st · Visa •••• 0019</div>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader title="Feature access" subtitle="Feature flags are evaluated per tenant by plan" />
        <Table className="mt-2">
          <thead><tr><TH>Feature</TH>{PLANS.map((p) => <TH key={p.tier} className={cn('text-center', p.tier === t.plan && 'text-ink')}>{p.name}</TH>)}</tr></thead>
          <tbody>{all.map((f) => <TR key={f}><TD className="text-ink">{FEATURE_LABEL[f]}</TD>{PLANS.map((p) => <TD key={p.tier} className={cn('text-center', p.tier === t.plan && 'bg-cream/50')}>{PLAN_FEATURES[p.tier].includes(f) ? <Check size={14} className="mx-auto text-sage-500" /> : <span className="text-stone-300">—</span>}</TD>)}</TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

function DataSettings() {
  const db = useDB()
  const reset = useStore((s) => s.resetDemo)
  const [confirm, setConfirm] = useState(false)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <Database size={18} className="text-bronze-500" />
        <div className="mt-3 text-[15px] font-medium">Export your data</div>
        <p className="mt-1 text-[13px] text-stone-500">Your clinic owns its data. Export patients, appointments, invoices and clinical records at any time.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportCSV('patients', [['First', 'Last', 'Email', 'Phone', 'DOB', 'Since'], ...db.patients.map((p) => [p.firstName, p.lastName, p.email, p.phone, p.dob, p.since])])}>Patients CSV</Button>
          <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportCSV('invoices', [['Number', 'Date', 'Patient', 'Total', 'Paid', 'Status'], ...db.invoices.map((i) => [i.number, i.createdAt, patientName(db, i.patientId), i.total, i.paid, i.status])])}>Invoices CSV</Button>
        </div>
      </Card>
      <Card className="p-6">
        <RotateCcw size={18} className="text-bronze-500" />
        <div className="mt-3 text-[15px] font-medium">Reset demo workspace</div>
        <p className="mt-1 text-[13px] text-stone-500">Restore Aurelia Aesthetics to its original sample data. Bookings, sales and edits made during this demo will be cleared.</p>
        {confirm ? <div className="mt-4 flex gap-2"><Button size="sm" variant="danger" onClick={() => { reset(); setConfirm(false) }}>Yes, reset everything</Button><Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div> : <Button size="sm" variant="secondary" className="mt-4" onClick={() => setConfirm(true)}>Reset demo data</Button>}
      </Card>
    </div>
  )
}
