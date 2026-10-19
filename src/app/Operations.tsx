import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, PackageX, CalendarClock, Boxes, DollarSign, Plus, Truck, CheckCircle2, Wand2, Award, FileText, MapPin, Clock, Phone, Users, DoorOpen, AlertTriangle } from 'lucide-react'
import { useDB, useStore, useCan, useVisibleLocations, staffName, locationName, treatmentName } from '@/store/store'
import type { ID, POStatus, Role, Staff } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/permissions'
import { Avatar, Badge, Button, Card, Drawer, Field, Input, KV, Modal, PageHeader, Photo, Progress, SectionLabel, Select, Stat, Table, TD, TH, TR, Tabs, EASE, cn } from '@/ui/ui'
import { fmtDate, fmtDateTime, money, relative, daysBetween, addDays, sum, startOfDay } from '@/lib/format'
import { revenue, scopedAppointments, lastNDays, scopedInvoices, invoiceRevenue } from '@/lib/metrics'

// ── Inventory ───────────────────────────────────────────────────────────────
export function InventoryPage() {
  const db = useDB()
  const can = useCan()
  const locs = useVisibleLocations()
  const [params, setParams] = useSearchParams()
  const [cat, setCat] = useState('All')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'expiring'>('all')
  const [open, setOpen] = useState<ID | null>(params.get('item'))
  useEffect(() => { const i = params.get('item'); if (i) setOpen(i) }, [params])
  // reserved = stock committed to confirmed appointments in the next 7 days
  const reserved = useMemo(() => {
    const out: Record<ID, number> = {}
    db.appointments.filter((a) => ['Confirmed', 'Checked In', 'Requested'].includes(a.status) && new Date(a.start) > new Date() && new Date(a.start) < addDays(new Date(), 7)).forEach((a) => {
      const t = db.treatments.find((x) => x.id === a.treatmentId)
      t?.consumables.forEach((c) => { const it = db.inventory.find((i) => i.sku === c.sku && i.locationId === a.locationId); if (it) out[it.id] = (out[it.id] || 0) + c.qty })
    })
    return out
  }, [db.appointments, db.treatments, db.inventory])
  const items = db.inventory.filter((i) => locs.includes(i.locationId))
  const expSoon = (i: (typeof items)[0]) => i.lots.some((l) => daysBetween(new Date(), l.expiry) <= 60)
  const list = items.filter((i) => (cat === 'All' || i.category === cat) && (!q || `${i.name} ${i.sku}`.toLowerCase().includes(q.toLowerCase())) && (filter === 'all' || (filter === 'low' ? i.stock <= i.reorderLevel : expSoon(i))))
  const value = sum(items, (i) => (i.stock / i.packSize) * i.cost)
  return (
    <div>
      <PageHeader title="Inventory" subtitle="Unit-level stock by location. Treatments deduct automatically from the earliest-expiring lot." actions={can('purchasing.manage') && <Link to="/app/purchasing?new=1"><Button size="sm" icon={<Truck size={14} />}>New purchase order</Button></Link>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Stock value (cost)" value={value} format={(n) => money(n)} index={0} icon={<DollarSign size={15} />} />
        <button onClick={() => setFilter(filter === 'low' ? 'all' : 'low')} className="text-left"><Stat label="Low stock" value={items.filter((i) => i.stock <= i.reorderLevel).length} hint="at or below reorder level" index={1} icon={<PackageX size={15} />} /></button>
        <button onClick={() => setFilter(filter === 'expiring' ? 'all' : 'expiring')} className="text-left"><Stat label="Expiring ≤ 60 days" value={items.filter(expSoon).length} index={2} icon={<CalendarClock size={15} />} /></button>
        <Stat label="SKUs tracked" value={items.length} index={3} icon={<Boxes size={15} />} />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
          <Tabs tabs={['All', ...new Set(db.inventory.map((i) => i.category))] as string[]} value={cat} onChange={setCat} id="inv-cat" className="border-0" />
          <label className="relative ml-auto w-full sm:w-60"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product or SKU" className="h-9 pl-9" /></label>
        </div>
        {filter !== 'all' && <div className="px-5 pt-3"><Badge tone="amber">{filter === 'low' ? 'Low stock only' : 'Expiring soon only'}</Badge> <button onClick={() => setFilter('all')} className="ml-1 text-[12px] text-stone-500 underline">clear</button></div>}
        <Table className="mt-2">
          <thead><tr><TH>Product</TH><TH>Location</TH><TH className="text-right">On hand</TH><TH className="text-right">Reserved</TH><TH className="text-right">Available</TH><TH className="text-right">Reorder at</TH><TH>Nearest expiry</TH><TH className="text-right">Cost</TH><TH className="text-right">Price</TH></tr></thead>
          <tbody>{list.map((i) => {
            const res = reserved[i.id] ?? 0
            const nearest = [...i.lots].sort((a, b) => a.expiry.localeCompare(b.expiry))[0]
            const low = i.stock <= i.reorderLevel
            return (
              <TR key={i.id} onClick={() => setOpen(i.id)}>
                <TD><div className="text-ink">{i.name}</div><div className="font-mono text-[11.5px] text-stone-400">{i.sku} · {i.category}</div></TD>
                <TD>{locationName(db, i.locationId)}</TD>
                <TD className="text-right"><span className={cn('tabular-nums', low ? 'font-medium text-amber-500' : 'text-ink')}>{i.stock.toLocaleString()}</span> <span className="text-[11.5px] text-stone-400">{i.unit}</span>{i.packSize > 1 && <div className="text-[11px] text-stone-400">{(i.stock / i.packSize).toFixed(1)} packs</div>}</TD>
                <TD className="text-right tabular-nums text-stone-500">{res || '—'}</TD>
                <TD className="text-right tabular-nums">{Math.max(0, i.stock - res).toLocaleString()}</TD>
                <TD className="text-right tabular-nums text-stone-500">{i.reorderLevel}</TD>
                <TD>{nearest ? <span className={cn('text-[12.5px]', daysBetween(new Date(), nearest.expiry) <= 60 ? 'text-rose-500' : 'text-stone-600')}>{fmtDate(nearest.expiry, { month: 'short', year: 'numeric' })}</span> : <span className="text-stone-300">—</span>}</TD>
                <TD className="text-right tabular-nums">{money(i.cost)}</TD>
                <TD className="text-right tabular-nums">{i.price ? (i.unit === 'units' ? `${money(i.price)}/u` : money(i.price)) : '—'}</TD>
              </TR>
            )
          })}</tbody>
        </Table>
      </Card>
      <ItemDrawer id={open} reserved={open ? reserved[open] ?? 0 : 0} onClose={() => { setOpen(null); if (params.get('item')) setParams({}) }} />
    </div>
  )
}

function ItemDrawer({ id, reserved, onClose }: { id: ID | null; reserved: number; onClose: () => void }) {
  const db = useDB()
  const can = useCan()
  const adjust = useStore((s) => s.adjustStock)
  const createPO = useStore((s) => s.createPO)
  const it = db.inventory.find((i) => i.id === id)
  const [qty, setQty] = useState(0)
  const [reason, setReason] = useState('Stock count correction')
  if (!it) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  const moves = db.audit.filter((e) => e.module === 'Inventory' && e.entity.startsWith(it.name) && e.locationId === it.locationId).slice(0, 12)
  const usedBy = db.treatments.filter((t) => t.consumables.some((c) => c.sku === it.sku))
  return (
    <Drawer open={!!it} onClose={onClose} width={540} title={it.name} subtitle={`${it.sku} · ${locationName(db, it.locationId)}`}>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-3 gap-3">
          {[['On hand', `${it.stock} ${it.unit}`], ['Reserved', `${reserved} ${it.unit}`], ['Available', `${Math.max(0, it.stock - reserved)} ${it.unit}`]].map(([k, v]) => <div key={k} className="rounded-2xl bg-white p-4 hairline"><div className="text-[12px] text-stone-500">{k}</div><div className="mt-1 font-display text-[22px]">{v}</div></div>)}
        </div>
        <div><div className="mb-1.5 flex justify-between text-[12px] text-stone-500"><span>Stock vs reorder level ({it.reorderLevel} {it.unit})</span><span>{it.stock <= it.reorderLevel ? 'Reorder now' : 'Healthy'}</span></div><Progress value={it.stock} max={Math.max(it.reorderLevel * 3, it.stock)} color={it.stock <= it.reorderLevel ? '#B7802A' : '#4E7A61'} /></div>
        {it.packSize > 1 && <div className="rounded-xl bg-cream px-4 py-3 text-[13px] text-stone-600">1 pack = {it.packSize} {it.unit}. Treatments deduct the exact units charted — e.g. a 12-unit forehead leaves {it.packSize - 12} units in an opened vial.</div>}
        <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
          <KV k="Supplier" v={db.suppliers.find((s) => s.id === it.supplierId)?.name} /><KV k="Category" v={it.category} /><KV k="Cost per pack" v={money(it.cost)} /><KV k="Selling price" v={it.price ? money(it.price) : 'Not sold separately'} /><KV k="Storage" v={it.storage} /><KV k="Used in" v={usedBy.map((t) => t.name).join(', ') || (it.retail ? 'Retail sale' : '—')} />
        </div>
        <div>
          <SectionLabel>Lots</SectionLabel>
          <div className="space-y-2">{[...it.lots].sort((a, b) => a.expiry.localeCompare(b.expiry)).map((l, i) => <div key={l.lot} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[13px] hairline"><div><span className="font-mono text-ink">{l.lot}</span>{i === 0 && <Badge tone="bronze" className="ml-2">Use first</Badge>}</div><div className="text-right"><div className="tabular-nums">{l.qty} {it.unit}</div><div className={cn('text-[11.5px]', daysBetween(new Date(), l.expiry) <= 60 ? 'text-rose-500' : 'text-stone-400')}>exp {fmtDate(l.expiry)} · {relative(l.expiry)}</div></div></div>)}{!it.lots.length && <p className="text-[13px] text-stone-500">Out of stock.</p>}</div>
        </div>
        {can('inventory.manage') && (
          <div className="rounded-2xl border border-stone-200/70 bg-white p-4">
            <SectionLabel>Adjust stock</SectionLabel>
            <div className="grid grid-cols-[110px_1fr_auto] gap-2"><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /><Select value={reason} onChange={(e) => setReason(e.target.value)}>{['Stock count correction', 'Damaged / wasted', 'Expired — disposed', 'Transfer in', 'Sample / training'].map((r) => <option key={r}>{r}</option>)}</Select><Button disabled={!qty} onClick={() => { adjust(it.id, qty, reason); setQty(0) }}>Apply</Button></div>
            <p className="mt-2 text-[11.5px] text-stone-400">Use negative numbers to remove stock. Every adjustment is audit-logged.</p>
          </div>
        )}
        {can('purchasing.manage') && <Button variant="secondary" icon={<Truck size={14} />} onClick={() => { createPO(it.supplierId, it.locationId, [{ itemId: it.id, qty: Math.max(1, Math.ceil((it.reorderLevel * 2 - it.stock) / it.packSize)) }]); onClose() }}>Draft reorder PO</Button>}
        <div><SectionLabel>Movement history</SectionLabel>{moves.map((m) => <div key={m.id} className="flex justify-between border-b border-stone-100 py-2 text-[12.5px]"><span className="text-stone-600">{m.action}{m.entity.includes('·') ? ` · ${m.entity.split('·').slice(1).join('·')}` : ''}</span><span className="text-stone-400">{m.oldValue} → {m.newValue} · {relative(m.at)}</span></div>)}{!moves.length && <p className="text-[13px] text-stone-500">No movements yet — complete a treatment to see auto-deduction here.</p>}</div>
      </div>
    </Drawer>
  )
}

// ── Purchasing ──────────────────────────────────────────────────────────────
const PO_TONE: Record<POStatus, 'neutral' | 'amber' | 'slate' | 'violet' | 'bronze' | 'sage' | 'rose'> = { Draft: 'neutral', Submitted: 'amber', Approved: 'slate', Ordered: 'violet', 'Partially Received': 'bronze', Received: 'sage', Cancelled: 'rose' }
const NEXT: Partial<Record<POStatus, POStatus>> = { Draft: 'Submitted', Submitted: 'Approved', Approved: 'Ordered' }

export function PurchasingPage() {
  const db = useDB()
  const locs = useVisibleLocations()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'Purchase orders' | 'Goods receipt' | 'Suppliers' | 'Supplier payments'>('Purchase orders')
  const [open, setOpen] = useState<ID | null>(null)
  const [creating, setCreating] = useState(params.get('new') === '1')
  const pos = db.purchaseOrders.filter((p) => locs.includes(p.locationId))
  const poTotal = (p: (typeof pos)[0]) => sum(p.lines, (l) => l.qty * l.cost)
  return (
    <div>
      <PageHeader title="Purchasing" subtitle="Suppliers, purchase orders and goods receipt — receiving updates inventory instantly." actions={<Button size="sm" icon={<Plus size={14} />} onClick={() => setCreating(true)}>New purchase order</Button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open orders" value={pos.filter((p) => !['Received', 'Cancelled'].includes(p.status)).length} index={0} />
        <Stat label="Awaiting delivery" value={pos.filter((p) => ['Ordered', 'Partially Received'].includes(p.status)).length} index={1} />
        <Stat label="Spend (30 days)" value={sum(pos.filter((p) => p.status !== 'Cancelled' && new Date(p.createdAt) > addDays(new Date(), -30)), poTotal)} format={(n) => money(n)} index={2} />
        <Stat label="Owed to suppliers" value={sum(db.suppliers, (s) => s.balance)} format={(n) => money(n)} index={3} />
      </div>
      <Tabs tabs={['Purchase orders', 'Goods receipt', 'Suppliers', 'Supplier payments'] as const} value={tab} onChange={setTab} id="pur" className="mb-5" />
      {(tab === 'Purchase orders' || tab === 'Goods receipt') && (
        <Card>
          <Table>
            <thead><tr><TH>PO</TH><TH>Supplier</TH><TH>Location</TH><TH>Created</TH><TH>Expected</TH><TH>Received</TH><TH>Status</TH><TH className="text-right">Total</TH></tr></thead>
            <tbody>{pos.filter((p) => tab === 'Purchase orders' || ['Ordered', 'Partially Received'].includes(p.status)).map((p) => {
              const q = sum(p.lines, (l) => l.qty)
              const r = sum(p.lines, (l) => l.received)
              return <TR key={p.id} onClick={() => setOpen(p.id)}><TD className="font-medium text-ink">{p.number}</TD><TD>{db.suppliers.find((s) => s.id === p.supplierId)?.name}</TD><TD>{locationName(db, p.locationId)}</TD><TD>{fmtDate(p.createdAt)}</TD><TD>{fmtDate(p.expected, { month: 'short', day: 'numeric' })}</TD><TD><div className="flex items-center gap-2"><Progress value={r} max={q} className="w-16" color="#4E7A61" /><span className="text-[12px] tabular-nums text-stone-500">{r}/{q}</span></div></TD><TD><Badge tone={PO_TONE[p.status]}>{p.status}</Badge></TD><TD className="text-right tabular-nums">{money(poTotal(p))}</TD></TR>
            })}</tbody>
          </Table>
        </Card>
      )}
      {tab === 'Suppliers' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {db.suppliers.map((s) => <Card key={s.id} className="p-5" hover><div className="font-display text-[22px] text-ink">{s.name}</div><div className="text-[13px] text-stone-500">{s.contact} · {s.terms}</div><div className="mt-3 divide-y divide-stone-100 text-[13px]"><KV k="Email" v={s.email} /><KV k="Phone" v={s.phone} /><KV k="Products" v={db.inventory.filter((i) => i.supplierId === s.id && i.locationId === 'loc_bh').length} /><KV k="Orders" v={db.purchaseOrders.filter((p) => p.supplierId === s.id).length} /><KV k="Balance owed" v={<span className={s.balance ? 'text-amber-500' : ''}>{money(s.balance, true)}</span>} /></div></Card>)}
        </div>
      )}
      {tab === 'Supplier payments' && (
        <Card>
          <Table>
            <thead><tr><TH>Supplier</TH><TH>Terms</TH><TH className="text-right">Balance</TH><TH>Purchase history</TH><TH /></tr></thead>
            <tbody>{db.suppliers.map((s) => <TR key={s.id}><TD className="text-ink">{s.name}</TD><TD>{s.terms}</TD><TD className="text-right tabular-nums">{money(s.balance, true)}</TD><TD className="text-[12.5px] text-stone-500">{db.purchaseOrders.filter((p) => p.supplierId === s.id && p.status === 'Received').map((p) => p.number).join(', ') || '—'}</TD><TD className="text-right">{s.balance > 0 && <Button size="xs" variant="secondary" onClick={() => { useStore.setState((st) => { st.db.suppliers.find((x) => x.id === s.id)!.balance = 0 }); useStore.getState().toast('Supplier payment recorded', `${money(s.balance, true)} to ${s.name}`, 'success') }}>Record payment</Button>}</TD></TR>)}</tbody>
          </Table>
        </Card>
      )}
      <PODrawer id={open} onClose={() => setOpen(null)} />
      <NewPOModal open={creating} onClose={() => { setCreating(false); if (params.get('new')) setParams({}) }} onCreated={setOpen} />
    </div>
  )
}

function PODrawer({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const setStatus = useStore((s) => s.setPOStatus)
  const receive = useStore((s) => s.receivePO)
  const po = db.purchaseOrders.find((p) => p.id === id)
  const [receiving, setReceiving] = useState(false)
  const [rec, setRec] = useState<Record<ID, number>>({})
  const [lot, setLot] = useState('')
  const [expiry, setExpiry] = useState(addDays(new Date(), 365).toISOString().slice(0, 10))
  useEffect(() => { if (po) { setRec(Object.fromEntries(po.lines.map((l) => [l.itemId, l.qty - l.received]))); setLot(`L${Math.floor(Math.random() * 90000 + 10000)}`); setReceiving(false) } }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!po) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  const steps: POStatus[] = ['Draft', 'Submitted', 'Approved', 'Ordered', 'Received']
  const idx = po.status === 'Partially Received' ? 3.5 : steps.indexOf(po.status)
  return (
    <Drawer open={!!po} onClose={onClose} width={560} title={po.number} subtitle={`${db.suppliers.find((s) => s.id === po.supplierId)?.name} → ${locationName(db, po.locationId)}`}>
      <div className="space-y-6 p-6">
        {po.status !== 'Cancelled' ? (
          <div className="flex items-center">{steps.map((s, i) => <div key={s} className="flex flex-1 items-center"><div className="flex flex-col items-center gap-1"><motion.span initial={false} animate={{ backgroundColor: i <= idx ? '#1E1C1A' : '#E4DED5' }} className="grid h-6 w-6 place-items-center rounded-full text-[10px] text-white">{i <= idx ? <CheckCircle2 size={13} /> : i + 1}</motion.span><span className="text-[10.5px] text-stone-500">{s}</span></div>{i < steps.length - 1 && <div className={cn('mx-1 mb-4 h-px flex-1', i < idx ? 'bg-ink' : 'bg-stone-200')} />}</div>)}</div>
        ) : <Badge tone="rose">Cancelled</Badge>}
        <Table>
          <thead><tr><TH>Item</TH><TH className="text-right">Ordered</TH><TH className="text-right">Received</TH><TH className="text-right">Cost</TH>{receiving && <TH className="text-right">Receive now</TH>}</tr></thead>
          <tbody>{po.lines.map((l) => { const it = db.inventory.find((i) => i.id === l.itemId)!; return <TR key={l.itemId}><TD className="text-ink">{it.name}<div className="text-[11.5px] text-stone-400">{it.packSize > 1 ? `pack of ${it.packSize} ${it.unit}` : it.unit}</div></TD><TD className="text-right tabular-nums">{l.qty}</TD><TD className="text-right tabular-nums">{l.received}</TD><TD className="text-right tabular-nums">{money(l.cost * l.qty)}</TD>{receiving && <TD className="text-right"><Input type="number" min={0} max={l.qty - l.received} value={rec[l.itemId] ?? 0} onChange={(e) => setRec({ ...rec, [l.itemId]: Number(e.target.value) })} className="ml-auto h-8 w-20 text-right" /></TD>}</TR> })}</tbody>
        </Table>
        <div className="flex justify-between text-[14px]"><span className="text-stone-500">Order total</span><span className="font-display text-[22px]">{money(sum(po.lines, (l) => l.qty * l.cost))}</span></div>
        {receiving && <div className="grid grid-cols-2 gap-3"><Field label="Lot / batch number"><Input value={lot} onChange={(e) => setLot(e.target.value)} /></Field><Field label="Expiry date"><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field></div>}
        <div className="flex flex-wrap gap-2">
          {NEXT[po.status] && <Button onClick={() => setStatus(po.id, NEXT[po.status]!)}>{po.status === 'Draft' ? 'Submit for approval' : po.status === 'Submitted' ? 'Approve' : 'Mark as ordered'}</Button>}
          {['Ordered', 'Partially Received'].includes(po.status) && (receiving ? <Button onClick={() => { receive(po.id, rec, lot, expiry); setReceiving(false) }}>Confirm goods receipt</Button> : <Button icon={<Truck size={14} />} onClick={() => setReceiving(true)}>Receive delivery</Button>)}
          {!['Received', 'Cancelled', 'Partially Received'].includes(po.status) && <Button variant="ghost" onClick={() => setStatus(po.id, 'Cancelled')}>Cancel PO</Button>}
        </div>
        <div className="text-[12px] text-stone-400">Created {fmtDateTime(po.createdAt)} by {staffName(db, po.createdBy)} · partial deliveries supported</div>
      </div>
    </Drawer>
  )
}

function NewPOModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: ID) => void }) {
  const db = useDB()
  const locs = useVisibleLocations()
  const create = useStore((s) => s.createPO)
  const [sup, setSup] = useState(db.suppliers[0].id)
  const [loc, setLoc] = useState(locs[0])
  const [lines, setLines] = useState<Record<ID, number>>({})
  const items = db.inventory.filter((i) => i.supplierId === sup && i.locationId === loc)
  const suggest = () => setLines(Object.fromEntries(items.filter((i) => i.stock <= i.reorderLevel).map((i) => [i.id, Math.max(1, Math.ceil((i.reorderLevel * 2 - i.stock) / i.packSize))])))
  const total = sum(Object.entries(lines), ([id, q]) => (db.inventory.find((i) => i.id === id)?.cost ?? 0) * q)
  return (
    <Modal open={open} onClose={onClose} width={640} title="New purchase order" footer={<><span className="mr-auto font-display text-[20px]">{money(total)}</span><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!Object.values(lines).some((q) => q > 0)} onClick={() => { const id = create(sup, loc, Object.entries(lines).filter(([, q]) => q > 0).map(([itemId, qty]) => ({ itemId, qty }))); setLines({}); onClose(); if (id) onCreated(id) }}>Create draft</Button></>}>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Field label="Supplier"><Select value={sup} onChange={(e) => { setSup(e.target.value); setLines({}) }}>{db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <Field label="Deliver to"><Select value={loc} onChange={(e) => { setLoc(e.target.value); setLines({}) }}>{db.locations.filter((l) => locs.includes(l.id)).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
      </div>
      <Button size="xs" variant="subtle" icon={<Wand2 size={12} />} onClick={suggest}>Suggest from low stock</Button>
      <div className="mt-3 divide-y divide-stone-100">
        {items.map((i) => <div key={i.id} className="flex items-center gap-3 py-2.5"><div className="min-w-0 flex-1"><div className="truncate text-[13.5px] text-ink">{i.name}</div><div className={cn('text-[12px]', i.stock <= i.reorderLevel ? 'text-amber-500' : 'text-stone-400')}>{i.stock} {i.unit} on hand · reorder at {i.reorderLevel} · {money(i.cost)}/pack</div></div><Input type="number" min={0} value={lines[i.id] ?? 0} onChange={(e) => setLines({ ...lines, [i.id]: Number(e.target.value) })} className="h-8 w-20 text-right" /><span className="w-10 text-[11.5px] text-stone-400">packs</span></div>)}
      </div>
    </Modal>
  )
}

// ── Staff ───────────────────────────────────────────────────────────────────
export function StaffPage() {
  const db = useDB()
  const locs = useVisibleLocations()
  const [params] = useSearchParams()
  const [open, setOpen] = useState<ID | null>(params.get('staff'))
  const team = db.staff.filter((s) => s.locationIds.some((l) => locs.includes(l)))
  const r = lastNDays(30)
  return (
    <div>
      <PageHeader title="Staff" subtitle={`${team.length} team members · roles, schedules, certifications and commission`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {team.map((s, i) => {
          const certWarn = s.certifications.some((c) => daysBetween(new Date(), c.expires) < 60)
          const rev = sum(scopedInvoices(db, locs, r).filter((x) => x.practitionerId === s.id), invoiceRevenue)
          return (
            <Card key={s.id} hover className="cursor-pointer p-5" onClick={() => setOpen(s.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-4"><Avatar name={s.name} src={s.avatar} size={52} /><div className="min-w-0 flex-1"><div className="truncate text-[15px] font-medium text-ink">{s.name}</div><div className="text-[12.5px] text-stone-500">{s.title}</div><div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="ink">{ROLE_LABEL[s.role]}</Badge>{s.locationIds.map((l) => <Badge key={l}>{locationName(db, l)}</Badge>)}</div></div></div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-[12px]">
                <div><div className="text-stone-400">30d revenue</div><div className="text-[14px] text-ink">{s.bookable ? money(rev) : '—'}</div></div>
                <div><div className="text-stone-400">Works</div><div className="text-[14px] text-ink">{s.workingDays.length} days</div></div>
                <div><div className="text-stone-400">Certs</div><div className={cn('text-[14px]', certWarn ? 'text-amber-500' : 'text-ink')}>{s.certifications.length ? (certWarn ? 'Renew soon' : 'Valid') : '—'}</div></div>
              </div>
            </Card>
          )
        })}
      </div>
      <StaffDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function StaffDrawer({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const can = useCan()
  const update = useStore((s) => s.updateStaff)
  const s = db.staff.find((x) => x.id === id)
  const [tab, setTab] = useState<'Profile' | 'Schedule' | 'Commission' | 'Compliance' | 'Performance'>('Profile')
  const [rates, setRates] = useState<Staff['commission']>({})
  useEffect(() => { if (s) setRates({ ...s.commission }); setTab('Profile') }, [id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!s) return <Drawer open={false} onClose={onClose}>{null}</Drawer>
  const r = lastNDays(30)
  const appts = db.appointments.filter((a) => a.practitionerId === s.id && new Date(a.start) >= r.from && new Date(a.start) < new Date())
  const comms = db.commissions.filter((c) => c.staffId === s.id)
  const editable = can('staff.manage')
  const CATS = ['Injectables', 'Skin Treatments', 'Facial Rejuvenation', 'Laser', 'Hair Restoration', 'Wellness', 'Cosmetic Dermatology', 'Retail', 'Packages'] as const
  return (
    <Drawer open={!!s} onClose={onClose} width={580} title={s.name} subtitle={`${s.title} · ${ROLE_LABEL[s.role]}`}>
      <div className="sticky top-0 z-10 bg-ivory px-6 pt-3"><Tabs tabs={['Profile', 'Schedule', 'Commission', 'Compliance', 'Performance'] as const} value={tab} onChange={setTab} id="st-tab" /></div>
      <div className="space-y-5 p-6">
        {tab === 'Profile' && (
          <>
            <div className="flex items-center gap-4"><Photo src={s.avatar} className="h-20 w-20 rounded-2xl" /><div className="text-[13.5px]"><div className="flex items-center gap-2"><Phone size={13} className="text-stone-400" />{s.phone}</div><div className="mt-1 text-stone-500">{s.email}</div></div></div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role"><Select disabled={!editable || s.role === 'owner'} value={s.role} onChange={(e) => update(s.id, { role: e.target.value as Role })}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="Title"><Input disabled={!editable} defaultValue={s.title} onBlur={(e) => e.target.value !== s.title && update(s.id, { title: e.target.value })} /></Field>
            </div>
            <div><SectionLabel>Locations</SectionLabel><div className="flex gap-2">{db.locations.map((l) => { const on = s.locationIds.includes(l.id); return <button key={l.id} disabled={!editable} onClick={() => update(s.id, { locationIds: on ? s.locationIds.filter((x) => x !== l.id) : [...s.locationIds, l.id] })} className={cn('rounded-full border px-3.5 py-1.5 text-[13px] transition', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white')}>{l.name}</button> })}</div></div>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4"><KV k="Employment start" v={fmtDate(s.startDate)} /><KV k="Experience" v={`${s.yearsExperience} years`} /><KV k="Credentials" v={s.credentials || '—'} /><KV k="Online booking" v={s.bookable ? 'Bookable' : 'Not bookable'} /><KV k="Leave taken" v={`${s.leaveDays} of 20 days`} /></div>
            {s.bio && <p className="text-[13.5px] leading-relaxed text-stone-600">{s.bio}</p>}
          </>
        )}
        {tab === 'Schedule' && (
          <>
            <SectionLabel>Working days</SectionLabel>
            <div className="flex gap-2">{DAYS.map((d, i) => { const on = s.workingDays.includes(i); return <button key={d} disabled={!editable} onClick={() => update(s.id, { workingDays: on ? s.workingDays.filter((x) => x !== i) : [...s.workingDays, i].sort() })} className={cn('h-11 flex-1 rounded-xl border text-[13px] transition', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white text-stone-500')}>{d}</button> })}</div>
            <div className="rounded-2xl bg-cream p-4 text-[13px] text-stone-600">Online availability is generated from working days, location hours and existing bookings — changes apply to the booking flow immediately.</div>
            <SectionLabel>Attendance · last 14 days</SectionLabel>
            <div className="grid grid-cols-7 gap-1.5">{Array.from({ length: 14 }, (_, i) => { const d = addDays(startOfDay(), i - 13); const works = s.workingDays.includes(d.getDay()); return <div key={i} title={d.toDateString()} className={cn('grid h-10 place-items-center rounded-lg text-[11px]', works ? 'bg-sage-50 text-sage-700' : 'bg-stone-100 text-stone-400')}>{d.getDate()}</div> })}</div>
          </>
        )}
        {tab === 'Commission' && (
          <>
            <p className="text-[13px] text-stone-500">Rates apply by category to the net (post-discount) value of each invoice line.</p>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
              {CATS.map((c) => <div key={c} className="flex items-center justify-between py-2.5"><span className="text-[13.5px]">{c}</span><div className="flex items-center gap-1.5"><Input disabled={!editable} type="number" value={Math.round((rates[c] ?? 0) * 100)} onChange={(e) => setRates({ ...rates, [c]: Number(e.target.value) / 100 })} className="h-8 w-20 text-right" /><span className="text-[12px] text-stone-400">%</span></div></div>)}
            </div>
            {editable && JSON.stringify(rates) !== JSON.stringify(s.commission) && <Button onClick={() => update(s.id, { commission: Object.fromEntries(Object.entries(rates).filter(([, v]) => v)) })}>Save commission plan</Button>}
            <div className="grid grid-cols-3 gap-3">{[['Earned (30d)', sum(comms.filter((c) => new Date(c.at) >= r.from), (c) => c.amount)], ['Pending', sum(comms.filter((c) => c.status === 'Pending'), (c) => c.amount)], ['Paid', sum(comms.filter((c) => c.status === 'Paid'), (c) => c.amount)]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-cream p-3"><div className="text-[11.5px] text-stone-500">{k}</div><div className="font-display text-[20px]">{money(v as number)}</div></div>)}</div>
          </>
        )}
        {tab === 'Compliance' && (
          <>
            <SectionLabel>Certifications</SectionLabel>
            {s.certifications.map((c) => { const d = daysBetween(new Date(), c.expires); return <div key={c.name} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 hairline"><Award size={16} className={d < 60 ? 'text-amber-500' : 'text-sage-500'} /><div className="flex-1 text-[13.5px]">{c.name}</div><span className={cn('text-[12.5px]', d < 60 ? 'text-amber-500' : 'text-stone-500')}>{d < 60 && <AlertTriangle size={12} className="mr-1 inline" />}expires {fmtDate(c.expires)}</span></div> })}
            {!s.certifications.length && <p className="text-[13px] text-stone-500">No certifications required for this role.</p>}
            <SectionLabel className="pt-2">Documents</SectionLabel>
            {['Employment contract', 'HIPAA training certificate', 'Malpractice insurance', 'Photo ID'].map((d, i) => <div key={d} className="flex items-center gap-3 border-b border-stone-100 py-2.5 text-[13.5px]"><FileText size={15} className="text-stone-400" />{d}<span className="ml-auto text-[12px] text-stone-400">uploaded {fmtDate(addDays(s.startDate, i * 3), { month: 'short', year: 'numeric' })}</span></div>)}
          </>
        )}
        {tab === 'Performance' && (
          <div className="grid grid-cols-2 gap-3">
            {[['Treatments (30d)', appts.filter((a) => a.status === 'Completed').length], ['No-shows', appts.filter((a) => a.status === 'No Show').length], ['Revenue (30d)', money(sum(db.invoices.filter((i) => i.practitionerId === s.id && new Date(i.createdAt) >= r.from), invoiceRevenue))], ['Patient rating', `${s.rating.toFixed(2)} ★`], ['Utilisation', `${Math.min(100, Math.round((sum(appts, (a) => a.duration) / Math.max(1, s.workingDays.length * 4.3 * 9 * 60)) * 100))}%`], ['Top treatment', treatmentName(db, Object.entries(appts.reduce<Record<string, number>>((a, x) => { a[x.treatmentId] = (a[x.treatmentId] || 0) + 1; return a }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '')]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-white p-4 hairline"><div className="text-[12px] text-stone-500">{k}</div><div className="mt-1 font-display text-[24px]">{v}</div></div>)}
          </div>
        )}
      </div>
    </Drawer>
  )
}

// ── Locations ───────────────────────────────────────────────────────────────
export function LocationsPage() {
  const db = useDB()
  const r = lastNDays(30)
  return (
    <div>
      <PageHeader title="Locations" subtitle={`${db.tenants[0].name} · ${db.locations.length} clinics. Owners see combined reporting; managers see only their clinic.`} actions={<Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => useStore.getState().toast('Add a location', 'Your Pro plan includes up to 5 locations.')}>Add location</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        {db.locations.map((l, i) => {
          const rev = revenue(db, [l.id], r)
          const appts = scopedAppointments(db, [l.id], r).filter((a) => a.status === 'Completed').length
          const staff = db.staff.filter((s) => s.locationIds.includes(l.id))
          return (
            <Card key={l.id} className="overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, ease: EASE }}>
              <Photo src={l.image} className="aspect-[16/7]" tone={i} />
              <div className="p-6">
                <div className="flex items-start justify-between"><div><div className="font-display text-[30px] text-ink">{l.name}</div><div className="flex items-center gap-1.5 text-[13px] text-stone-500"><MapPin size={13} />{l.address}, {l.city}</div></div><Badge tone={l.active ? 'sage' : 'neutral'} dot>{l.active ? 'Open' : 'Closed'}</Badge></div>
                <div className="mt-5 grid grid-cols-3 gap-3">{[['Revenue 30d', money(rev)], ['Treatments', appts], ['Team', staff.length]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-cream p-3"><div className="text-[11.5px] text-stone-500">{k}</div><div className="font-display text-[22px]">{v}</div></div>)}</div>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div><SectionLabel>Rooms</SectionLabel>{l.rooms.map((rm) => <div key={rm.id} className="flex items-center gap-2 py-1 text-[13px]"><DoorOpen size={13} className="text-stone-400" />{rm.name}<span className="text-stone-400">· {rm.kind}</span></div>)}</div>
                  <div><SectionLabel>Hours</SectionLabel>{l.hours.map((h) => <div key={h.days} className="flex items-center gap-2 py-1 text-[13px]"><Clock size={13} className="text-stone-400" />{h.days}<span className="ml-auto text-stone-500">{h.time}</span></div>)}</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[12.5px] text-stone-500"><Users size={13} />{staff.map((s) => s.name).join(', ')}</div>
                <div className="mt-2 text-[12.5px] text-stone-500">Treatments: {db.treatments.filter((t) => t.locationIds.includes(l.id) && t.active).length} · location pricing on {db.treatments.filter((t) => t.locationPricing[l.id]).length} · {db.inventory.filter((x) => x.locationId === l.id).length} stocked SKUs</div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
