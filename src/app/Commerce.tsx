import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Minus, Plus, X, User, Trash2, CheckCircle2, Mail, Printer, Crown, Download, Link2, Receipt, Percent } from 'lucide-react'
import { useDB, useStore, useCan, useMe, useVisibleLocations, patientName, staffName, treatmentName, locationName } from '@/store/store'
import type { ID, InvoiceLine, PaymentMethod } from '@/lib/types'
import { Badge, Button, Card, CardHeader, Drawer, Input, KV, Modal, PageHeader, Photo, Segmented, Stat, Table, TD, TH, TR, Tabs, EASE, cn } from '@/ui/ui'
import { BarChart, Donut, HBars, LineChart, CAT } from '@/ui/charts'
import { compact, fmtDate, fmtDateTime, money, pct, startOfDay, addDays, sum } from '@/lib/format'
import { collected, dailySeries, invoiceRevenue, lastNDays, priorRange, revenue, revenueBy, scopedInvoices, scopedPayments, delta, type Range } from '@/lib/metrics'
import { METHOD_ICON } from './Checkout'
import { exportCSV } from './AppointmentsList'

type CartLine = Omit<InvoiceLine, 'id'> & { key: string }

export function POSPage() {
  const db = useDB()
  const me = useMe()
  const locs = useVisibleLocations()
  const checkout = useStore((s) => s.posCheckout)
  const loc = locs[0]
  const [tab, setTab] = useState<'Treatments' | 'Retail' | 'Packages' | 'Memberships'>('Treatments')
  const [q, setQ] = useState('')
  const [patientId, setPatientId] = useState<ID | ''>('pt_emma')
  const [pq, setPq] = useState('')
  const [staffId, setStaffId] = useState(db.staff.find((s) => s.bookable && s.locationIds.includes(loc))?.id ?? me.id)
  const tx = (id: ID) => db.treatments.find((t) => t.id === id)!
  const [cart, setCart] = useState<CartLine[]>(() => [
    { key: 'tx_botox', kind: 'treatment', refId: 'tx_botox', desc: 'Botox', qty: 1, price: 450, category: 'Injectables' },
    { key: 'tx_hydra', kind: 'treatment', refId: 'tx_hydra', desc: 'Hydrafacial', qty: 1, price: 180, category: 'Skin Treatments' },
    { key: 'RTL-VITC-30', kind: 'product', refId: 'RTL-VITC-30', desc: 'Skin Serum · Vitamin C 30ml', qty: 1, price: 95, category: 'Retail' },
  ])
  const [discount, setDiscount] = useState<{ type: 'auto' | 'pct' | 'amt' | 'none'; value: number }>({ type: 'amt', value: 50 })
  const [tipPct, setTipPct] = useState(0)
  const [splits, setSplits] = useState<{ method: PaymentMethod; amount: number }[]>([{ method: 'Card', amount: 0 }])
  const [done, setDone] = useState<ID | null>(null)
  const mem = db.memberships.find((m) => m.patientId === patientId && m.status === 'Active')
  const plan = db.membershipPlans.find((p) => p.id === mem?.planId)
  const subtotal = sum(cart, (l) => l.price * l.qty)
  const disc = discount.type === 'auto' && plan ? Math.round(sum(cart.filter((l) => l.kind === 'treatment'), (l) => l.price * l.qty) * plan.discountPct) : discount.type === 'pct' ? Math.round(subtotal * discount.value) / 100 : discount.type === 'amt' ? discount.value : 0
  const discLabel = discount.type === 'auto' && plan ? `${plan.name} member ${Math.round(plan.discountPct * 100)}%` : discount.type === 'amt' && plan ? 'Membership discount' : discount.type !== 'none' && disc ? 'Discount' : undefined
  const tax = Math.round(sum(cart.filter((l) => l.kind === 'product'), (l) => l.price * l.qty) * db.tenants[0].taxRate * 100) / 100
  const tip = Math.round((subtotal - disc) * tipPct) / 100
  const total = Math.max(0, Math.round((subtotal - disc + tax + tip) * 100) / 100)
  useEffect(() => { setSplits((s) => (s.length === 1 ? [{ ...s[0], amount: total }] : s)) }, [total])
  const allocated = Math.round(sum(splits, (s) => s.amount) * 100) / 100
  const add = (l: CartLine) => setCart((c) => (c.some((x) => x.key === l.key) ? c.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)) : [...c, l]))
  const items = useMemo(() => {
    const m = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase())
    if (tab === 'Treatments') return db.treatments.filter((t) => t.active && t.locationIds.includes(loc) && m(t.name)).map((t) => ({ key: t.id, title: t.name, sub: `${t.duration} min`, price: t.locationPricing[loc] ?? t.priceFrom, img: t.image, line: { key: t.id, kind: 'treatment' as const, refId: t.id, desc: t.name, qty: 1, price: t.locationPricing[loc] ?? t.priceFrom, category: t.category } }))
    if (tab === 'Retail') return db.inventory.filter((i) => i.retail && i.locationId === loc && m(i.name)).map((i) => ({ key: i.sku, title: i.name, sub: `${i.stock} in stock`, price: i.price, low: i.stock <= i.reorderLevel, line: { key: i.sku, kind: 'product' as const, refId: i.sku, desc: i.name, qty: 1, price: i.price, category: 'Retail' } }))
    if (tab === 'Packages') return db.packageTemplates.filter((p) => p.active && m(p.name)).map((p) => ({ key: p.id, title: p.name, sub: p.items.map((i) => `${i.qty}× ${tx(i.treatmentId).name}`).join(', '), price: p.price, line: { key: p.id, kind: 'package' as const, refId: p.id, desc: p.name, qty: 1, price: p.price, category: 'Packages' } }))
    return db.membershipPlans.filter((p) => p.active && m(p.name)).map((p) => ({ key: p.id, title: `${p.name} membership`, sub: 'First month', price: p.price, line: { key: p.id, kind: 'membership' as const, refId: p.id, desc: `${p.name} membership`, qty: 1, price: p.price, category: 'Membership' } }))
  }, [tab, q, db, loc]) // eslint-disable-line react-hooks/exhaustive-deps
  const matches = pq.length > 1 ? db.patients.filter((p) => `${p.firstName} ${p.lastName} ${p.phone}`.toLowerCase().includes(pq.toLowerCase())).slice(0, 5) : []
  const charge = () => {
    const id = checkout({ patientId: patientId || undefined, locationId: loc, staffId, lines: cart.map(({ key: _k, ...l }) => l), discount: disc, discountLabel: discLabel, tip, splits })
    if (id) setDone(id)
  }
  const reset = () => { setCart([]); setDone(null); setDiscount({ type: 'none', value: 0 }); setTipPct(0); setSplits([{ method: 'Card', amount: 0 }]) }
  const inv = db.invoices.find((i) => i.id === done)

  return (
    <div>
      <PageHeader title="Point of sale" subtitle={`${locationName(db, loc)} · treatments, retail, packages and memberships`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented options={['Treatments', 'Retail', 'Packages', 'Memberships'] as const} value={tab} onChange={setTab} id="pos-tab" size="sm" />
            <label className="relative ml-auto w-full sm:w-64"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 pl-9" /></label>
          </div>
          <motion.div layout className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {items.map((it, i) => (
                <motion.button layout key={it.key} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.015 }} whileTap={{ scale: 0.97 }} onClick={() => add(it.line)}
                  className="group overflow-hidden rounded-2xl border border-stone-200/70 bg-white text-left shadow-soft transition-shadow hover:shadow-lift">
                  {'img' in it && it.img ? <Photo src={it.img} className="aspect-[16/9]" zoom /> : <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-cream to-sand font-display text-[28px] text-bronze-600/60">{it.title[0]}</div>}
                  <div className="p-3"><div className="truncate text-[13.5px] font-medium text-ink">{it.title}</div><div className="flex items-center justify-between"><span className={cn('truncate text-[11.5px]', 'low' in it && it.low ? 'text-amber-500' : 'text-stone-500')}>{it.sub}</span><span className="text-[13px] tabular-nums text-ink">{it.price ? money(it.price) : 'Free'}</span></div></div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        <Card className="flex flex-col self-start xl:sticky xl:top-24">
          <div className="border-b border-stone-100 p-4">
            {patientId ? (
              <div className="flex items-center gap-3"><User size={16} className="text-stone-400" /><div className="flex-1"><div className="text-[14px] text-ink">{patientName(db, patientId)}</div>{plan && <div className="flex items-center gap-1 text-[12px] text-bronze-600"><Crown size={11} />{plan.name} · {mem!.credits} credits</div>}</div><button onClick={() => setPatientId('')} className="text-[12px] text-stone-500 hover:text-ink">Change</button></div>
            ) : (
              <div className="relative"><Input value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Find patient, or continue as walk-in" className="h-9" />{matches.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-xl border border-stone-200 bg-white p-1 shadow-lift">{matches.map((p) => <button key={p.id} onClick={() => { setPatientId(p.id); setPq('') }} className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-cream">{p.firstName} {p.lastName}</button>)}</div>}</div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[12px] text-stone-500"><span>Sold by</span><select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] outline-none">{db.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="ml-auto">commission auto-calculated</span></div>
          </div>
          <div className="max-h-[300px] flex-1 overflow-y-auto px-4 py-2">
            <AnimatePresence initial={false}>
              {cart.map((l) => (
                <motion.div key={l.key} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-stone-100 py-3">
                    <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] text-ink">{l.desc}</div><div className="text-[11.5px] text-stone-400">{l.kind === 'product' ? 'Retail · taxable' : l.kind}</div></div>
                    <div className="flex items-center gap-1"><button onClick={() => setCart(cart.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))} className="grid h-6 w-6 place-items-center rounded-full bg-cream" aria-label="Decrease"><Minus size={11} /></button><span className="w-6 text-center text-[13px] tabular-nums">{l.qty}</span><button onClick={() => setCart(cart.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))} className="grid h-6 w-6 place-items-center rounded-full bg-cream" aria-label="Increase"><Plus size={11} /></button></div>
                    <div className="w-16 text-right text-[13.5px] tabular-nums">{money(l.price * l.qty)}</div>
                    <button onClick={() => setCart(cart.filter((x) => x.key !== l.key))} className="text-stone-300 hover:text-rose-500" aria-label="Remove"><X size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!cart.length && <p className="py-10 text-center text-[13px] text-stone-400">Tap items to add them</p>}
          </div>
          <div className="space-y-3 border-t border-stone-100 p-4">
            <div className="flex flex-wrap gap-1.5">
              {plan && <button onClick={() => setDiscount({ type: 'auto', value: 0 })} className={cn('rounded-full border px-2.5 py-1 text-[11.5px]', discount.type === 'auto' ? 'border-ink bg-ink text-ivory' : 'border-stone-200')}>Member {Math.round(plan.discountPct * 100)}%</button>}
              {[10, 15].map((v) => <button key={v} onClick={() => setDiscount({ type: 'pct', value: v })} className={cn('rounded-full border px-2.5 py-1 text-[11.5px]', discount.type === 'pct' && discount.value === v ? 'border-ink bg-ink text-ivory' : 'border-stone-200')}>{v}% off</button>)}
              <button onClick={() => setDiscount({ type: 'amt', value: 50 })} className={cn('rounded-full border px-2.5 py-1 text-[11.5px]', discount.type === 'amt' ? 'border-ink bg-ink text-ivory' : 'border-stone-200')}>$50 off</button>
              <button onClick={() => setDiscount({ type: 'none', value: 0 })} className="rounded-full px-2 py-1 text-[11.5px] text-stone-400 hover:text-ink">Clear</button>
            </div>
            <div className="space-y-1.5 text-[13.5px]">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span className="tabular-nums">{money(subtotal, true)}</span></div>
              {disc > 0 && <div className="flex justify-between text-sage-700"><span>{discLabel}</span><span className="tabular-nums">−{money(disc, true)}</span></div>}
              {tax > 0 && <div className="flex justify-between text-stone-500"><span>Sales tax ({(db.tenants[0].taxRate * 100).toFixed(1)}% on retail)</span><span className="tabular-nums">{money(tax, true)}</span></div>}
              <div className="flex items-center justify-between text-stone-500"><span>Tip</span><div className="flex gap-1">{[0, 10, 15, 20].map((p) => <button key={p} onClick={() => setTipPct(p)} className={cn('rounded-md px-2 py-0.5 text-[11.5px]', tipPct === p ? 'bg-ink text-ivory' : 'bg-cream')}>{p ? `${p}%` : '—'}</button>)}</div></div>
              <div className="flex items-baseline justify-between border-t border-stone-100 pt-2"><span className="font-medium">Total</span><span className="font-display text-[30px] tabular-nums">{money(total, true)}</span></div>
            </div>
            <div className="space-y-2">
              {splits.map((s, i) => {
                const I = METHOD_ICON[s.method]
                return <div key={i} className="flex items-center gap-2"><div className="relative flex-1"><I size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><select value={s.method} onChange={(e) => setSplits(splits.map((x, k) => (k === i ? { ...x, method: e.target.value as PaymentMethod } : x)))} className="h-9 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-8 text-[13px] outline-none">{(['Card', 'Cash', 'Gift Card', 'Account Credit', 'Membership Credit', 'Package Credit'] as PaymentMethod[]).map((m) => <option key={m}>{m}</option>)}</select></div><Input type="number" step="0.01" value={s.amount} onChange={(e) => setSplits(splits.map((x, k) => (k === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))} className="h-9 w-28 text-right tabular-nums" />{splits.length > 1 && <button onClick={() => setSplits(splits.filter((_, k) => k !== i))} className="text-stone-300 hover:text-rose-500" aria-label="Remove"><Trash2 size={14} /></button>}</div>
              })}
              <button onClick={() => setSplits([...splits, { method: 'Cash', amount: Math.max(0, Math.round((total - allocated) * 100) / 100) }])} className="text-[12px] text-stone-500 hover:text-ink">+ Split payment</button>
            </div>
            <Button size="lg" className="w-full" disabled={!cart.length || Math.abs(allocated - total) > 0.005} onClick={charge}>{Math.abs(allocated - total) > 0.005 ? `Allocate ${money(total - allocated, true)}` : `Charge ${money(total, true)}`}</Button>
          </div>
        </Card>
      </div>
      <Modal open={!!inv} onClose={reset} width={420}>
        {inv && (
          <div className="py-4 text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: EASE }} className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage-50 text-sage-500"><CheckCircle2 size={30} /></motion.div>
            <div className="mt-4 font-display text-[30px]">{money(inv.total, true)} received</div>
            <div className="text-[13px] text-stone-500">{inv.number} · {patientName(db, inv.patientId)}</div>
            <div className="mx-auto mt-5 max-w-xs space-y-1 rounded-2xl bg-cream p-4 text-left text-[12.5px]">
              {inv.lines.map((l) => <div key={l.id} className="flex justify-between"><span>{l.desc}{l.qty > 1 && ` ×${l.qty}`}</span><span>{money(l.price * l.qty, true)}</span></div>)}
              {inv.discount > 0 && <div className="flex justify-between text-sage-700"><span>{inv.discountLabel}</span><span>−{money(inv.discount, true)}</span></div>}
              {inv.tax > 0 && <div className="flex justify-between text-stone-500"><span>Tax</span><span>{money(inv.tax, true)}</span></div>}
              {inv.tip > 0 && <div className="flex justify-between text-stone-500"><span>Tip</span><span>{money(inv.tip, true)}</span></div>}
            </div>
            <p className="mt-4 text-[12px] text-stone-500">Stock updated · commission recorded for {staffName(db, inv.practitionerId ?? '')}{inv.lines.some((l) => l.kind === 'package' || l.kind === 'membership') ? ' · package/membership activated' : ''}</p>
            <div className="mt-5 flex justify-center gap-2"><Button variant="secondary" size="sm" icon={<Mail size={14} />} onClick={() => useStore.getState().toast('Receipt emailed')}>Email</Button><Button variant="secondary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>Print</Button><Button size="sm" onClick={reset}>New sale</Button></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Payments & finance ──────────────────────────────────────────────────────
export function PaymentsPage() {
  const can = useCan()
  const [params, setParams] = useSearchParams()
  const tabs = can('finance.view') ? (['Overview', 'Transactions', 'Invoices', 'Commissions', 'Daily close'] as const) : (['Transactions', 'Invoices', 'Daily close'] as const)
  const [tab, setTab] = useState<string>(params.get('invoice') ? 'Invoices' : tabs[0])
  const [range, setRange] = useState<'Today' | '7 days' | '30 days' | '90 days'>('30 days')
  const r: Range = range === 'Today' ? lastNDays(1) : range === '7 days' ? lastNDays(7) : range === '30 days' ? lastNDays(30) : lastNDays(90)
  return (
    <div>
      <PageHeader title={can('finance.view') ? 'Payments & finance' : 'Payments'} subtitle="Operational finance — export to QuickBooks or Xero for full accounting." actions={<Segmented options={['Today', '7 days', '30 days', '90 days'] as const} value={range} onChange={setRange} id="fin-r" size="sm" />} />
      <Tabs tabs={tabs as unknown as string[]} value={tab} onChange={setTab} id="fin-tabs" className="mb-6" />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {tab === 'Overview' && <FinanceOverview r={r} />}
          {tab === 'Transactions' && <Transactions r={r} />}
          {tab === 'Invoices' && <Invoices openId={params.get('invoice')} onClear={() => setParams({})} />}
          {tab === 'Commissions' && <Commissions r={r} />}
          {tab === 'Daily close' && <DailyClose />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function FinanceOverview({ r }: { r: Range }) {
  const db = useDB()
  const locs = useVisibleLocations()
  const prev = priorRange(r)
  const invs = scopedInvoices(db, locs, r)
  const pays = scopedPayments(db, locs, r)
  const rev = revenue(db, locs, r)
  const col = collected(db, locs, r)
  const outstanding = sum(db.invoices.filter((i) => locs.includes(i.locationId) && ['Open', 'Partial'].includes(i.status)), (i) => i.total - i.paid)
  const refunds = -sum(pays.filter((p) => p.kind === 'Refund'), (p) => p.amount)
  const deposits = sum(pays.filter((p) => p.kind === 'Deposit'), (p) => p.amount)
  const memRev = sum(invs.flatMap((i) => i.lines.filter((l) => l.kind === 'membership')), (l) => l.price)
  const retailRev = sum(invs.flatMap((i) => i.lines.filter((l) => l.kind === 'product')), (l) => l.price * l.qty)
  const commission = sum(db.commissions.filter((c) => new Date(c.at) >= r.from && new Date(c.at) < r.to), (c) => c.amount)
  // COGS: consumables per completed treatment + retail cost
  const cogs = sum(invs.flatMap((i) => i.lines), (l) => {
    if (l.kind === 'product') { const it = db.inventory.find((x) => x.sku === l.refId); return (it?.cost ?? 0) * l.qty }
    if (l.kind === 'treatment') { const t = db.treatments.find((x) => x.id === l.refId); return sum(t?.consumables ?? [], (c) => { const it = db.inventory.find((x) => x.sku === c.sku); return it ? (it.cost / it.packSize) * c.qty : 0 }) }
    return 0
  })
  const days = Math.max(1, Math.round((r.to.getTime() - r.from.getTime()) / 86400000))
  const expenses = Math.round(days * 1450) // rent, payroll base, utilities (configured fixed costs)
  const gross = rev - cogs
  const net = gross - commission - expenses
  const series = dailySeries(db, locs, Math.min(days, 90))
  const methods = Object.entries(pays.filter((p) => p.kind !== 'Refund').reduce<Record<string, number>>((a, p) => { a[p.method] = (a[p.method] || 0) + p.amount; return a }, {})).map(([label, value]) => ({ label, value: Math.round(value) }))
  const byPrac = revenueBy(db, locs, r, (i) => staffName(db, i.practitionerId ?? '')).filter((x) => x.label !== '—').slice(0, 6)
  const byLoc = revenueBy(db, locs, r, (i) => locationName(db, i.locationId))
  const byType = revenueBy(db, locs, r, (i) => { const p = db.patients.find((x) => x.id === i.patientId); return p && new Date(p.since) > addDays(new Date(i.createdAt), -30) ? 'New patients' : 'Returning patients' })
  const discounts = sum(invs, (i) => i.discount)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Revenue" value={rev} format={(n) => money(n)} delta={delta(rev, revenue(db, locs, prev))} index={0} />
        <Stat label="Collected" value={col} format={(n) => money(n)} index={1} />
        <Stat label="Outstanding" value={outstanding} format={(n) => money(n)} index={2} />
        <Stat label="Refunds" value={refunds} format={(n) => money(n)} index={3} />
        <Stat label="Deposits held" value={deposits} format={(n) => money(n)} index={4} />
        <Stat label="Expenses" value={expenses} format={(n) => money(n)} hint="fixed costs" index={5} />
        <Stat label="COGS" value={cogs} format={(n) => money(n)} hint={pct(cogs / Math.max(1, rev))} index={6} />
        <Stat label="Practitioner commission" value={commission} format={(n) => money(n)} index={7} />
        <Stat label="Membership revenue" value={memRev} format={(n) => money(n)} index={8} />
        <Stat label="Retail revenue" value={retailRev} format={(n) => money(n)} index={9} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Daily revenue" />
          <div className="px-3 pb-4 pt-4"><LineChart labels={series.labels} series={[{ name: 'Revenue', values: series.values }]} format={(n) => `$${compact(n)}`} /></div>
        </Card>
        <Card>
          <CardHeader title="Operational P&L" subtitle="Management view — not a statutory statement" />
          <div className="divide-y divide-stone-100 px-5 pb-4 pt-2 text-[13.5px]">
            <KV k="Revenue" v={money(rev)} />
            <KV k="Cost of goods" v={`−${money(cogs)}`} />
            <KV k={<span className="font-medium text-ink">Gross profit</span>} v={<span className="font-medium">{money(gross)} <span className="text-stone-400">({pct(gross / Math.max(1, rev))})</span></span>} />
            <KV k="Commission" v={`−${money(commission)}`} />
            <KV k="Operating expenses" v={`−${money(expenses)}`} />
            <KV k="Discounts given" v={<span className="text-stone-500">{money(discounts)}</span>} />
            <KV k={<span className="font-medium text-ink">Operating profit</span>} v={<span className={cn('font-display text-[22px]', net < 0 ? 'text-rose-500' : 'text-ink')}>{money(net)}</span>} />
          </div>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card><CardHeader title="Payment methods" /><div className="p-5"><Donut data={methods} format={(n) => money(n)} center={<div className="font-display text-[20px]">{money(col)}</div>} /></div></Card>
        <Card><CardHeader title="By practitioner" /><div className="p-5"><HBars rows={byPrac} format={(n) => money(n)} color={CAT[1]} /></div></Card>
        <Card><CardHeader title="By location & patient type" /><div className="space-y-6 p-5"><HBars rows={byLoc} format={(n) => money(n)} /><HBars rows={byType} format={(n) => money(n)} color={CAT[2]} /></div></Card>
      </div>
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Link2 size={18} className="text-stone-400" />
        <div className="flex-1"><div className="text-[14px] text-ink">Accounting integrations</div><div className="text-[12.5px] text-stone-500">Sync invoices, payments, refunds and payouts as journal entries — revenue mapped by category and location.</div></div>
        <Button size="sm" variant="secondary" onClick={() => useStore.getState().toast('QuickBooks Online', 'Integration available on the Pro plan roadmap — export CSV in the meantime.')}>Connect QuickBooks</Button>
        <Button size="sm" variant="secondary" onClick={() => useStore.getState().toast('Xero', 'Integration available on the Pro plan roadmap — export CSV in the meantime.')}>Connect Xero</Button>
      </Card>
    </div>
  )
}

function Transactions({ r }: { r: Range }) {
  const db = useDB()
  const locs = useVisibleLocations()
  const [kind, setKind] = useState('All')
  const list = scopedPayments(db, locs, r).filter((p) => kind === 'All' || p.kind === kind).sort((a, b) => b.at.localeCompare(a.at))
  return (
    <Card>
      <div className="flex items-center gap-3 px-5 pt-4"><Tabs tabs={['All', 'Payment', 'Deposit', 'Refund'] as const} value={kind as 'All'} onChange={setKind} id="tx-k" className="border-0" /><Button size="xs" variant="ghost" className="ml-auto" icon={<Download size={12} />} onClick={() => exportCSV('transactions', [['Date', 'Patient', 'Kind', 'Method', 'Amount', 'Reference', 'Location', 'Taken by'], ...list.map((p) => [fmtDateTime(p.at), patientName(db, p.patientId), p.kind, p.method, p.amount, p.reference, locationName(db, p.locationId), staffName(db, p.by)])])}>Export CSV</Button></div>
      <Table className="mt-2">
        <thead><tr><TH>Date</TH><TH>Patient</TH><TH>Type</TH><TH>Method</TH><TH>Reference</TH><TH>Location</TH><TH>Taken by</TH><TH className="text-right">Amount</TH></tr></thead>
        <tbody>{list.slice(0, 200).map((p) => { const I = METHOD_ICON[p.method]; return <TR key={p.id}><TD className="whitespace-nowrap">{fmtDateTime(p.at)}</TD><TD className="text-ink">{patientName(db, p.patientId)}</TD><TD><Badge tone={p.kind === 'Refund' ? 'rose' : p.kind === 'Deposit' ? 'violet' : 'neutral'}>{p.kind}</Badge></TD><TD><span className="flex items-center gap-1.5"><I size={13} className="text-stone-400" />{p.method}</span></TD><TD className="font-mono text-[12px] text-stone-500">{p.reference}</TD><TD>{locationName(db, p.locationId)}</TD><TD>{staffName(db, p.by)}</TD><TD className={cn('text-right tabular-nums', p.amount < 0 ? 'text-rose-500' : 'text-ink')}>{money(p.amount, true)}</TD></TR> })}</tbody>
      </Table>
    </Card>
  )
}

function Invoices({ openId, onClear }: { openId: string | null; onClear: () => void }) {
  const db = useDB()
  const can = useCan()
  const locs = useVisibleLocations()
  const refund = useStore((s) => s.refund)
  const [status, setStatus] = useState('Outstanding')
  const [open, setOpen] = useState<ID | null>(openId)
  const list = db.invoices.filter((i) => locs.includes(i.locationId) && (status === 'All' || (status === 'Outstanding' ? ['Open', 'Partial'].includes(i.status) : i.status === status))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200)
  const inv = db.invoices.find((i) => i.id === open)
  const pays = db.payments.filter((p) => p.invoiceId === open)
  return (
    <Card>
      <div className="px-5 pt-4"><Tabs tabs={['Outstanding', 'Paid', 'Refunded', 'All'] as const} value={status as 'All'} onChange={setStatus} id="inv-s" className="border-0" /></div>
      <Table className="mt-2">
        <thead><tr><TH>Invoice</TH><TH>Date</TH><TH>Patient</TH><TH>Items</TH><TH>Status</TH><TH className="text-right">Total</TH><TH className="text-right">Balance</TH></tr></thead>
        <tbody>{list.map((i) => <TR key={i.id} onClick={() => setOpen(i.id)}><TD className="text-ink">{i.number}</TD><TD>{fmtDate(i.createdAt)}</TD><TD>{patientName(db, i.patientId)}</TD><TD className="max-w-[260px] truncate">{i.lines.map((l) => l.desc).join(', ')}</TD><TD><Badge tone={i.status === 'Paid' ? 'sage' : i.status === 'Refunded' ? 'neutral' : 'amber'}>{i.status}</Badge></TD><TD className="text-right tabular-nums">{money(i.total, true)}</TD><TD className="text-right tabular-nums">{money(Math.max(0, i.total - i.paid), true)}</TD></TR>)}</tbody>
      </Table>
      <Drawer open={!!inv} onClose={() => { setOpen(null); onClear() }} width={480} title={inv?.number} subtitle={inv ? `${patientName(db, inv.patientId)} · ${fmtDateTime(inv.createdAt)}` : ''}>
        {inv && (
          <div className="space-y-5 p-6">
            <Badge tone={inv.status === 'Paid' ? 'sage' : inv.status === 'Refunded' ? 'neutral' : 'amber'}>{inv.status}</Badge>
            <div className="rounded-2xl bg-white p-4 text-[13.5px] hairline">
              {inv.lines.map((l) => <div key={l.id} className="flex justify-between py-1"><span>{l.desc}{l.qty > 1 && ` × ${l.qty}`}</span><span className="tabular-nums">{money(l.price * l.qty, true)}</span></div>)}
              {inv.discount > 0 && <div className="flex justify-between py-1 text-sage-700"><span>{inv.discountLabel}</span><span>−{money(inv.discount, true)}</span></div>}
              {inv.tax > 0 && <div className="flex justify-between py-1 text-stone-500"><span>Tax</span><span>{money(inv.tax, true)}</span></div>}
              {inv.tip > 0 && <div className="flex justify-between py-1 text-stone-500"><span>Tip</span><span>{money(inv.tip, true)}</span></div>}
              <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 font-medium"><span>Total</span><span>{money(inv.total, true)}</span></div>
            </div>
            <div><div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-stone-400">Payments</div>{pays.map((p) => <div key={p.id} className="flex justify-between py-1.5 text-[13px]"><span>{p.kind} · {p.method} · {fmtDate(p.at, { month: 'short', day: 'numeric' })}</span><span className={p.amount < 0 ? 'text-rose-500' : ''}>{money(p.amount, true)}</span></div>)}</div>
            <div className="divide-y divide-stone-100 text-[13px]"><KV k="Practitioner" v={staffName(db, inv.practitionerId ?? '')} /><KV k="Location" v={locationName(db, inv.locationId)} />{inv.appointmentId && <KV k="Appointment" v={treatmentName(db, db.appointments.find((a) => a.id === inv.appointmentId)?.treatmentId ?? '')} />}<KV k="Commission" v={money(sum(db.commissions.filter((c) => c.invoiceId === inv.id), (c) => c.amount), true)} /></div>
            <div className="flex gap-2"><Button size="sm" variant="secondary" icon={<Receipt size={14} />} onClick={() => useStore.getState().toast('Invoice PDF downloaded', inv.number)}>PDF</Button>{can('payments.refund') && inv.paid - inv.refunded > 0 && <Button size="sm" variant="danger" onClick={() => refund(inv.id, inv.paid - inv.refunded, 'Manager refund')}>Refund {money(inv.paid - inv.refunded, true)}</Button>}</div>
          </div>
        )}
      </Drawer>
    </Card>
  )
}

function Commissions({ r }: { r: Range }) {
  const db = useDB()
  const pay = useStore((s) => s.payCommissions)
  const staff = db.staff.filter((s) => Object.keys(s.commission).length)
  const rows = staff.map((s) => {
    const cs = db.commissions.filter((c) => c.staffId === s.id)
    const inR = cs.filter((c) => new Date(c.at) >= r.from && new Date(c.at) < r.to)
    return { s, sales: sum(inR, (c) => c.base), earned: sum(inR, (c) => c.amount), pending: sum(cs.filter((c) => c.status === 'Pending'), (c) => c.amount), paid: sum(cs.filter((c) => c.status === 'Paid'), (c) => c.amount) }
  })
  const cats = [...new Set(staff.flatMap((s) => Object.keys(s.commission)))]
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Commission summary" subtitle="Calculated automatically on every invoice, net of discounts and refunds" />
        <Table className="mt-2">
          <thead><tr><TH>Team member</TH><TH className="text-right">Sales</TH><TH className="text-right">Earned</TH><TH className="text-right">Pending</TH><TH className="text-right">Paid (all time)</TH><TH /></tr></thead>
          <tbody>{rows.map(({ s, sales, earned, pending, paid }) => <TR key={s.id}><TD className="text-ink">{s.name}<div className="text-[12px] text-stone-400">{s.title}</div></TD><TD className="text-right tabular-nums">{money(sales)}</TD><TD className="text-right tabular-nums text-ink">{money(earned, true)}</TD><TD className="text-right tabular-nums text-amber-500">{money(pending, true)}</TD><TD className="text-right tabular-nums">{money(paid, true)}</TD><TD className="text-right">{pending > 0 && <Button size="xs" variant="secondary" onClick={() => pay(s.id)}>Mark paid</Button>}</TD></TR>)}</tbody>
        </Table>
      </Card>
      <Card>
        <CardHeader title="Commission rules" subtitle="By practitioner and category — edit in Staff" action={<Link to="/app/staff" className="text-[12.5px] text-stone-500 hover:text-ink">Edit rules</Link>} />
        <Table className="mt-2">
          <thead><tr><TH>Team member</TH>{cats.map((c) => <TH key={c} className="text-right">{c}</TH>)}</tr></thead>
          <tbody>{staff.map((s) => <TR key={s.id}><TD className="text-ink">{s.name}</TD>{cats.map((c) => <TD key={c} className="text-right tabular-nums">{s.commission[c as keyof typeof s.commission] ? <span className="inline-flex items-center gap-0.5">{Math.round((s.commission[c as keyof typeof s.commission] ?? 0) * 100)}<Percent size={10} /></span> : <span className="text-stone-300">—</span>}</TD>)}</TR>)}</tbody>
        </Table>
      </Card>
    </div>
  )
}

function DailyClose() {
  const db = useDB()
  const locs = useVisibleLocations()
  const [day, setDay] = useState(startOfDay().toISOString().slice(0, 10))
  const r = { from: new Date(day + 'T00:00'), to: addDays(new Date(day + 'T00:00'), 1) }
  const pays = scopedPayments(db, locs, r)
  const byMethod = Object.entries(pays.reduce<Record<string, number>>((a, p) => { a[p.method] = (a[p.method] || 0) + p.amount; return a }, {}))
  const invs = scopedInvoices(db, locs, r)
  const appts = db.appointments.filter((a) => locs.includes(a.locationId) && new Date(a.start) >= r.from && new Date(a.start) < r.to)
  const week = Array.from({ length: 7 }, (_, i) => addDays(r.from, i - 6))
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between"><div className="font-display text-[24px]">End-of-day summary</div><Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-9 w-44" /></div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[['Revenue', money(sum(invs, invoiceRevenue))], ['Collected', money(sum(pays, (p) => p.amount), true)], ['Invoices', invs.length], ['Appointments', `${appts.filter((a) => a.status === 'Completed').length}/${appts.filter((a) => a.status !== 'Cancelled').length}`]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-cream p-4"><div className="text-[12px] text-stone-500">{k}</div><div className="mt-1 font-display text-[24px]">{v}</div></div>)}
        </div>
        <div className="mt-5 divide-y divide-stone-100">{byMethod.map(([m, v]) => { const I = METHOD_ICON[m as PaymentMethod]; return <div key={m} className="flex items-center justify-between py-3 text-[14px]"><span className="flex items-center gap-2"><I size={15} className="text-stone-400" />{m}</span><span className="tabular-nums">{money(v, true)}</span></div> })}</div>
        <Button className="mt-5" variant="secondary" onClick={() => useStore.getState().toast('Day closed', 'Cash drawer reconciled and summary emailed to finance.', 'success')}>Close day & reconcile drawer</Button>
      </Card>
      <Card><CardHeader title="Last 7 days" /><div className="px-3 pb-4 pt-4"><BarChart labels={week.map((d) => d.toLocaleDateString('en-US', { weekday: 'short' }))} values={week.map((d) => Math.round(revenue(db, locs, { from: d, to: addDays(d, 1) })))} format={(n) => `$${compact(n)}`} highlight={6} /></div></Card>
    </div>
  )
}
