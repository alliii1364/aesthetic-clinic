import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, Building2, CreditCard, Layers, Flag, LifeBuoy, HardDrive, ScrollText, Megaphone, Plug, Settings, Search, LogIn, ShieldCheck, Send } from 'lucide-react'
import { useDB } from '@/store/store'
import { OTHER_TENANTS, PLATFORM_FLAGS, SUPPORT_TICKETS, SYSTEM_LOGS, type TenantSummary } from '@/data/platform'
import { PLANS, PLAN_FEATURES, FEATURE_LABEL, type Feature } from '@/lib/permissions'
import { Badge, Button, Card, CardHeader, Drawer, Input, KV, PageHeader, Progress, Select, Stat, Table, TD, TH, TR, Textarea, Toggle, EASE, cn } from '@/ui/ui'
import { Donut, HBars, LineChart, CAT } from '@/ui/charts'
import { compact, fmtDate, fmtDateTime, money, relative } from '@/lib/format'
import { mrr as tenantMrr } from '@/lib/metrics'

const NAV = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform/clinics', label: 'Clinics', icon: Building2 },
  { to: '/platform/subscriptions', label: 'Subscriptions & billing', icon: CreditCard },
  { to: '/platform/plans', label: 'Plans', icon: Layers },
  { to: '/platform/flags', label: 'Feature flags', icon: Flag },
  { to: '/platform/usage', label: 'Usage & storage', icon: HardDrive },
  { to: '/platform/support', label: 'Support', icon: LifeBuoy },
  { to: '/platform/logs', label: 'System logs', icon: ScrollText },
  { to: '/platform/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/platform/integrations', label: 'Integrations', icon: Plug },
  { to: '/platform/settings', label: 'Platform settings', icon: Settings },
]

function useTenants(): TenantSummary[] {
  const db = useDB()
  return useMemo(() => {
    const t = db.tenants[0]
    const aurelia: TenantSummary = {
      id: t.id, name: t.name, city: 'Los Angeles, CA', country: 'US', plan: t.plan, status: 'Active', locations: db.locations.length, staff: db.staff.length,
      patients: db.patients.length, mrr: PLANS.find((p) => p.tier === t.plan)!.price, storageGb: 18.4, smsMonth: 1284,
      bookingsMonth: db.appointments.filter((a) => new Date(a.start) > new Date(Date.now() - 30 * 86400000)).length, since: t.createdAt, lastActive: db.audit[0]?.at ?? t.createdAt, health: 94,
    }
    return [aurelia, ...OTHER_TENANTS]
  }, [db])
}

export default function PlatformAdmin() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen bg-[#F3F1ED]">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col bg-ink px-3 py-5 text-ivory md:flex">
        <div className="flex items-center gap-2.5 px-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-bronze-500 font-display text-lg">A</span><div><div className="text-[14px] font-medium">Aurelia OS</div><div className="text-[11px] text-ivory/50">Platform admin</div></div></div>
        <nav className="mt-8 flex-1 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] transition-colors', isActive ? 'text-ivory' : 'text-ivory/55 hover:text-ivory')}>
              {({ isActive }) => <>{isActive && <motion.span layoutId="plat-nav" className="absolute inset-0 rounded-lg bg-ivory/10" transition={{ duration: 0.35, ease: EASE }} />}<n.icon size={16} strokeWidth={1.6} className="relative" /><span className="relative">{n.label}</span></>}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 rounded-xl bg-ivory/5 px-3 py-2.5 text-[12px] text-ivory/60"><ShieldCheck size={14} className="text-bronze-300" />Platform staff · MFA + hardware key</div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mx-auto max-w-[1360px]">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="clinics" element={<Clinics />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="plans" element={<Plans />} />
              <Route path="flags" element={<Flags />} />
              <Route path="usage" element={<Usage />} />
              <Route path="support" element={<Support />} />
              <Route path="logs" element={<Logs />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="integrations" element={<PlatformIntegrations />} />
              <Route path="settings" element={<PlatformSettings />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

const STATUS_TONE = { Active: 'sage', Trial: 'violet', 'Past due': 'rose', Churned: 'neutral' } as const

function Overview() {
  const tenants = useTenants()
  const paying = tenants.filter((t) => t.mrr > 0)
  const mrr = paying.reduce((a, t) => a + t.mrr, 0)
  // illustrative 12-month MRR history ending at today's MRR
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (11 - i)); return d.toLocaleDateString('en-US', { month: 'short' }) })
  const hist = months.map((_, i) => Math.round(mrr * (0.42 + (i / 11) * 0.58) * (1 + Math.sin(i) * 0.015)))
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Aurelia OS" title="Platform overview" subtitle={`${tenants.length} clinic organizations · ${tenants.reduce((a, t) => a + t.locations, 0)} locations · ${compact(tenants.reduce((a, t) => a + t.patients, 0))} patients`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="MRR" value={mrr} format={(n) => money(n)} delta={0.084} hint="vs last month" index={0} />
        <Stat label="ARR" value={mrr * 12} format={(n) => money(n)} index={1} />
        <Stat label="Paying clinics" value={paying.length} hint={`${tenants.filter((t) => t.status === 'Trial').length} in trial`} index={2} />
        <Stat label="Logo churn (90d)" value={tenants.filter((t) => t.status === 'Churned').length / tenants.length * 100} format={(n) => `${n.toFixed(1)}%`} index={3} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader title="Monthly recurring revenue" subtitle="Last 12 months" /><div className="px-3 pb-4 pt-4"><LineChart labels={months} series={[{ name: 'MRR', values: hist }]} format={(n) => `$${compact(n)}`} /></div></Card>
        <Card><CardHeader title="Clinics by plan" /><div className="p-5"><Donut data={PLANS.map((p) => ({ label: p.name, value: tenants.filter((t) => t.plan === p.tier && t.status !== 'Churned').length }))} center={<div className="font-display text-[26px]">{tenants.length}</div>} /></div></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Clinics needing attention" />
          <div className="divide-y divide-stone-100 px-5 pb-3 pt-2">
            {tenants.filter((t) => t.health < 70).map((t) => <div key={t.id} className="flex items-center gap-4 py-3"><div className="flex-1"><div className="text-[14px] text-ink">{t.name}</div><div className="text-[12px] text-stone-500">{t.status === 'Past due' ? 'Payment failed · dunning step 2' : t.status === 'Trial' ? `Trial ends in ${14 - Math.round((Date.now() - new Date(t.since).getTime()) / 86400000)} days · low activation` : 'Churned'}</div></div><div className="w-28"><Progress value={t.health} max={100} color={t.health < 50 ? '#B4524A' : '#B7802A'} /></div><span className="w-8 text-right text-[12.5px] tabular-nums">{t.health}</span></div>)}
          </div>
        </Card>
        <Card><CardHeader title="Bookings processed (30d)" /><div className="p-5"><HBars rows={tenants.filter((t) => t.bookingsMonth).sort((a, b) => b.bookingsMonth - a.bookingsMonth).slice(0, 6).map((t) => ({ label: t.name, value: t.bookingsMonth }))} color={CAT[1]} /></div></Card>
      </div>
    </div>
  )
}

function Clinics() {
  const tenants = useTenants()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const list = tenants.filter((t) => !q || `${t.name} ${t.city}`.toLowerCase().includes(q.toLowerCase()))
  const t = tenants.find((x) => x.id === open)
  return (
    <div>
      <PageHeader title="Clinics" subtitle="Every tenant is fully isolated — data, branding, settings and billing." actions={<label className="relative w-64"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clinics" className="h-9 pl-9" /></label>} />
      <Card>
        <Table>
          <thead><tr><TH>Clinic</TH><TH>Plan</TH><TH>Status</TH><TH className="text-right">Locations</TH><TH className="text-right">Staff</TH><TH className="text-right">Patients</TH><TH className="text-right">MRR</TH><TH className="text-right">Storage</TH><TH>Last activity</TH></tr></thead>
          <tbody>{list.map((x) => <TR key={x.id} onClick={() => setOpen(x.id)}><TD><div className="text-ink">{x.name}</div><div className="text-[12px] text-stone-400">{x.city}</div></TD><TD><Badge tone="ink">{PLANS.find((p) => p.tier === x.plan)!.name}</Badge></TD><TD><Badge tone={STATUS_TONE[x.status]} dot>{x.status}</Badge></TD><TD className="text-right">{x.locations}</TD><TD className="text-right">{x.staff}</TD><TD className="text-right tabular-nums">{x.patients.toLocaleString()}</TD><TD className="text-right tabular-nums">{money(x.mrr)}</TD><TD className="text-right tabular-nums">{x.storageGb} GB</TD><TD>{relative(x.lastActive)}</TD></TR>)}</tbody>
        </Table>
      </Card>
      <Drawer open={!!t} onClose={() => setOpen(null)} width={540} title={t?.name} subtitle={t ? `${t.city} · tenant ${t.id}` : ''}>
        {t && (
          <div className="space-y-6 p-6">
            <div className="flex gap-2"><Badge tone="ink">{PLANS.find((p) => p.tier === t.plan)!.name}</Badge><Badge tone={STATUS_TONE[t.status]} dot>{t.status}</Badge></div>
            <div className="grid grid-cols-3 gap-3">{[['Locations', t.locations], ['Staff', t.staff], ['Patients', t.patients.toLocaleString()], ['MRR', money(t.mrr)], ['Bookings/mo', t.bookingsMonth.toLocaleString()], ['Health', `${t.health}/100`]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-white p-3 hairline"><div className="text-[11.5px] text-stone-500">{k}</div><div className="font-display text-[20px]">{v}</div></div>)}</div>
            <div className="divide-y divide-stone-100 rounded-2xl bg-white px-4 hairline"><KV k="Subscription" v={`${PLANS.find((p) => p.tier === t.plan)!.name} · monthly`} /><KV k="Payment status" v={t.status === 'Past due' ? <span className="text-rose-500">Failed — retry in 2 days</span> : 'Current'} /><KV k="Storage" v={`${t.storageGb} GB`} /><KV k="SMS this month" v={t.smsMonth.toLocaleString()} /><KV k="Customer since" v={fmtDate(t.since)} /><KV k="Last activity" v={relative(t.lastActive)} /></div>
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">Plan features</div>
              <div className="flex flex-wrap gap-1.5">{(Object.keys(FEATURE_LABEL) as Feature[]).map((f) => <Badge key={f} tone={PLAN_FEATURES[t.plan].includes(f) ? 'sage' : 'neutral'}>{FEATURE_LABEL[f]}</Badge>)}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.id === 't_aurelia' ? <Link to="/app"><Button icon={<LogIn size={14} />}>Open workspace (support mode)</Button></Link> : <Button icon={<LogIn size={14} />} variant="secondary" onClick={() => alert('Support access requires the clinic owner to grant time-limited consent. Request sent.')}>Request support access</Button>}
              <Button variant="ghost">Change plan</Button>
            </div>
            <p className="text-[12px] text-stone-400">Platform staff cannot view clinical records without owner-granted, time-boxed, audited support access.</p>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function Subscriptions() {
  const tenants = useTenants()
  const db = useDB()
  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions & billing" subtitle="Platform revenue from clinic subscriptions (separate from each clinic’s own patient revenue)." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Platform MRR" value={tenants.reduce((a, t) => a + t.mrr, 0)} format={(n) => money(n)} index={0} />
        <Stat label="Past due" value={tenants.filter((t) => t.status === 'Past due').reduce((a, t) => a + t.mrr, 0)} format={(n) => money(n)} index={1} />
        <Stat label="ARPA" value={tenants.reduce((a, t) => a + t.mrr, 0) / Math.max(1, tenants.filter((t) => t.mrr).length)} format={(n) => money(n)} index={2} />
        <Stat label="Payments volume (Aurelia, 30d)" value={db.payments.filter((p) => new Date(p.at) > new Date(Date.now() - 30 * 86400000)).reduce((a, p) => a + p.amount, 0)} format={(n) => `$${compact(n)}`} hint={`member MRR ${money(tenantMrr(db))}`} index={3} />
      </div>
      <Card>
        <Table>
          <thead><tr><TH>Clinic</TH><TH>Plan</TH><TH>Billing</TH><TH>Next invoice</TH><TH>Status</TH><TH className="text-right">Amount</TH></tr></thead>
          <tbody>{tenants.map((t) => <TR key={t.id}><TD className="text-ink">{t.name}</TD><TD>{PLANS.find((p) => p.tier === t.plan)!.name}</TD><TD>Monthly · card</TD><TD>{t.status === 'Churned' ? '—' : fmtDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1))}</TD><TD><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></TD><TD className="text-right tabular-nums">{money(t.mrr)}</TD></TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

function Plans() {
  const all = Object.keys(FEATURE_LABEL) as Feature[]
  return (
    <div>
      <PageHeader title="Plans" subtitle="Tiers, pricing and the features each one unlocks." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => <Card key={p.tier} className="p-6"><div className="font-display text-[30px]">{p.name}</div><div className="mt-1 text-[22px]">{p.price ? `${money(p.price)}/mo` : 'Custom'}</div><p className="mt-2 text-[13px] text-stone-500">{p.blurb}</p><div className="mt-2 text-[12px] text-bronze-600">{p.limits}</div><div className="mt-4 space-y-1.5">{all.map((f) => <div key={f} className={cn('text-[12.5px]', PLAN_FEATURES[p.tier].includes(f) ? 'text-ink' : 'text-stone-300 line-through')}>{FEATURE_LABEL[f]}</div>)}</div></Card>)}
      </div>
    </div>
  )
}

function Flags() {
  const [flags, setFlags] = useState(PLATFORM_FLAGS)
  return (
    <div>
      <PageHeader title="Feature flags" subtitle="Progressive rollout by plan and percentage — evaluated per tenant at request time." />
      <Card>
        <Table>
          <thead><tr><TH>Flag</TH><TH>Key</TH><TH>Eligible plans</TH><TH>Rollout</TH><TH>Enabled</TH></tr></thead>
          <tbody>{flags.map((f, i) => <TR key={f.key}><TD className="text-ink">{f.name}</TD><TD className="font-mono text-[12px] text-stone-500">{f.key}</TD><TD>{f.plans.map((p) => <Badge key={p} className="mr-1">{p}</Badge>)}</TD><TD><div className="flex items-center gap-3"><input type="range" min={0} max={100} value={f.rollout} onChange={(e) => setFlags(flags.map((x, k) => (k === i ? { ...x, rollout: Number(e.target.value) } : x)))} className="w-32 accent-[#1E1C1A]" /><span className="w-10 text-[12.5px] tabular-nums">{f.rollout}%</span></div></TD><TD><Toggle checked={f.rollout > 0} onChange={(v) => setFlags(flags.map((x, k) => (k === i ? { ...x, rollout: v ? 10 : 0 } : x)))} /></TD></TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

function Usage() {
  const tenants = useTenants()
  const total = tenants.reduce((a, t) => a + t.storageGb, 0)
  return (
    <div className="space-y-6">
      <PageHeader title="Usage & storage" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Media storage" value={total} format={(n) => `${n.toFixed(0)} GB`} index={0} />
        <Stat label="SMS this month" value={tenants.reduce((a, t) => a + t.smsMonth, 0)} format={(n) => compact(n)} index={1} />
        <Stat label="Bookings this month" value={tenants.reduce((a, t) => a + t.bookingsMonth, 0)} format={(n) => compact(n)} index={2} />
        <Stat label="API p95 latency" value={182} format={(n) => `${Math.round(n)} ms`} index={3} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Storage by clinic" /><div className="p-5"><HBars rows={tenants.map((t) => ({ label: t.name, value: t.storageGb }))} format={(n) => `${n} GB`} /></div></Card>
        <Card><CardHeader title="SMS by clinic" /><div className="p-5"><HBars rows={tenants.map((t) => ({ label: t.name, value: t.smsMonth }))} color={CAT[2]} /></div></Card>
      </div>
    </div>
  )
}

function Support() {
  return (
    <div>
      <PageHeader title="Support" subtitle="Tickets from clinic owners and teams." />
      <Card>
        <Table>
          <thead><tr><TH>Ticket</TH><TH>Clinic</TH><TH>Subject</TH><TH>Priority</TH><TH>Status</TH><TH>Opened</TH></tr></thead>
          <tbody>{SUPPORT_TICKETS.map((t) => <TR key={t.id}><TD className="font-mono text-[12.5px]">{t.id}</TD><TD className="text-ink">{t.tenant}</TD><TD>{t.subject}</TD><TD><Badge tone={t.priority === 'High' ? 'rose' : t.priority === 'Normal' ? 'amber' : 'neutral'}>{t.priority}</Badge></TD><TD>{t.status}</TD><TD>{relative(t.at)}</TD></TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

function Logs() {
  return (
    <div>
      <PageHeader title="System logs" subtitle="Platform services — tenant data is never written to system logs." />
      <Card className="overflow-hidden">
        <div className="divide-y divide-stone-100 font-mono text-[12.5px]">
          {SYSTEM_LOGS.map((l, i) => <div key={i} className="flex gap-4 px-5 py-3"><span className="w-40 shrink-0 text-stone-400">{fmtDateTime(l.at)}</span><span className={cn('w-14 shrink-0 uppercase', l.level === 'error' ? 'text-rose-500' : l.level === 'warn' ? 'text-amber-500' : 'text-sage-500')}>{l.level}</span><span className="w-20 shrink-0 text-stone-500">{l.service}</span><span className="text-ink">{l.msg}</span></div>)}
        </div>
      </Card>
    </div>
  )
}

function Announcements() {
  const [sent, setSent] = useState<string[]>(['Scheduled maintenance: Sunday 2–3am PT (no downtime expected)'])
  const [text, setText] = useState('')
  const [audience, setAudience] = useState('All clinics')
  return (
    <div>
      <PageHeader title="Announcements" subtitle="In-app banners and email to clinic owners." />
      <Card className="space-y-3 p-6">
        <Select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-56">{['All clinics', 'Starter', 'Growth', 'Pro', 'Enterprise', 'Owners only'].map((a) => <option key={a}>{a}</option>)}</Select>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="New: patient financing at checkout is rolling out to Growth and Pro…" />
        <Button icon={<Send size={14} />} disabled={!text} onClick={() => { setSent([`${text} — ${audience}`, ...sent]); setText('') }}>Publish announcement</Button>
      </Card>
      <div className="mt-6 space-y-2">{sent.map((s, i) => <Card key={i} className="flex items-center gap-3 p-4 text-[13.5px]"><Megaphone size={15} className="text-bronze-500" />{s}<span className="ml-auto text-[12px] text-stone-400">{i === 0 && sent.length > 1 ? 'just now' : 'last week'}</span></Card>)}</div>
    </div>
  )
}

function PlatformIntegrations() {
  const list = [['Stripe Connect', 'Payments for all clinics · 99.99% (30d)', 'Operational'], ['Twilio', 'SMS · 1 carrier degraded', 'Degraded'], ['Postmark', 'Email · 99.98%', 'Operational'], ['Google APIs', 'Calendar & Business Profile', 'Operational'], ['AWS KMS', 'Per-tenant key management', 'Operational'], ['QuickBooks / Xero', 'Accounting connectors (beta)', 'Beta']]
  return (
    <div>
      <PageHeader title="Integrations" subtitle="Provider health across the platform." />
      <div className="grid gap-4 md:grid-cols-3">{list.map(([n, d, s]) => <Card key={n} className="p-5"><div className="flex items-center justify-between"><div className="text-[14.5px] font-medium">{n}</div><Badge tone={s === 'Operational' ? 'sage' : s === 'Degraded' ? 'amber' : 'violet'} dot>{s}</Badge></div><p className="mt-1 text-[12.5px] text-stone-500">{d}</p></Card>)}</div>
    </div>
  )
}

function PlatformSettings() {
  return (
    <div>
      <PageHeader title="Platform settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-1 p-6">
          {[['Data residency', 'US (us-west-2) · EU (eu-west-1) · ME (me-central-1)'], ['Tenant isolation', 'Postgres row-level security + per-tenant encryption keys'], ['Default retention', '7 years clinical · 2 years marketing'], ['Platform staff access', 'Just-in-time, owner-approved, fully audited'], ['Compliance', 'HIPAA (BAA), SOC 2 Type II, GDPR, UK GDPR']].map(([k, v]) => <KV key={k} k={k} v={v} />)}
        </Card>
        <Card className="p-6"><div className="text-[14.5px] font-medium">Signup & trials</div><div className="mt-3 divide-y divide-stone-100">{[['Self-serve signup', true], ['14-day trial', true], ['Require card for trial', false], ['Auto-provision demo data', true]].map(([k, v]) => <div key={k as string} className="flex items-center justify-between py-3 text-[13.5px]">{k}<Toggle checked={v as boolean} onChange={() => {}} /></div>)}</div></Card>
      </div>
    </div>
  )
}
