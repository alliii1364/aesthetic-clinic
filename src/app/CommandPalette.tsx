import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, User, CalendarDays, Target, Stethoscope, Receipt, Sparkles, Boxes, CreditCard, CornerDownLeft, type LucideIcon } from 'lucide-react'
import { useDB, useCan, patientName, treatmentName, staffName } from '@/store/store'
import { fmtDateTime, money } from '@/lib/format'
import { EASE, Kbd, cn } from '@/ui/ui'

interface Result { id: string; group: string; label: string; sub: string; to: string; icon: LucideIcon }

export function CommandPalette({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: { to: string; label: string; icon: LucideIcon }[] }) {
  const db = useDB()
  const can = useCan()
  const go = useNavigate()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 30) } }, [open])

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase()
    if (!s) return nav.slice(0, 8).map((n) => ({ id: n.to, group: 'Go to', label: n.label, sub: '', to: n.to, icon: n.icon }))
    const m = (t: string) => t.toLowerCase().includes(s)
    const out: Result[] = []
    if (can('patients.view')) db.patients.filter((p) => m(`${p.firstName} ${p.lastName} ${p.email} ${p.phone}`)).slice(0, 5).forEach((p) => out.push({ id: p.id, group: 'Patients', label: `${p.firstName} ${p.lastName}`, sub: `${p.email} · ${p.phone}`, to: `/app/patients/${p.id}`, icon: User }))
    if (can('calendar.view')) db.appointments.filter((a) => new Date(a.start) > new Date(Date.now() - 7 * 86400000) && m(`${patientName(db, a.patientId)} ${treatmentName(db, a.treatmentId)}`)).slice(0, 5).forEach((a) => out.push({ id: a.id, group: 'Appointments', label: `${patientName(db, a.patientId)} · ${treatmentName(db, a.treatmentId)}`, sub: `${fmtDateTime(a.start)} · ${a.status}`, to: `/app/calendar?appt=${a.id}&date=${a.start.slice(0, 10)}`, icon: CalendarDays }))
    if (can('leads.manage')) db.leads.filter((l) => m(`${l.name} ${l.email} ${l.phone}`)).slice(0, 4).forEach((l) => out.push({ id: l.id, group: 'Leads', label: l.name, sub: `${l.stage} · ${treatmentName(db, l.interestId)}`, to: `/app/leads?lead=${l.id}`, icon: Target }))
    db.staff.filter((x) => x.bookable && m(x.name)).forEach((x) => out.push({ id: x.id, group: 'Practitioners', label: x.name, sub: x.title, to: `/app/staff?staff=${x.id}`, icon: Stethoscope }))
    if (can('payments.collect') || can('finance.view')) db.invoices.filter((i) => m(`${i.number} ${patientName(db, i.patientId)}`)).slice(0, 4).forEach((i) => out.push({ id: i.id, group: 'Invoices', label: `${i.number} · ${patientName(db, i.patientId)}`, sub: `${money(i.total, true)} · ${i.status}`, to: `/app/payments?invoice=${i.id}`, icon: Receipt }))
    db.treatments.filter((t) => m(`${t.name} ${t.category}`)).slice(0, 4).forEach((t) => out.push({ id: t.id, group: 'Treatments', label: t.name, sub: `${t.category} · from ${money(t.priceFrom)}`, to: `/app/treatments?edit=${t.id}`, icon: Sparkles }))
    if (can('inventory.view')) db.inventory.filter((i) => m(`${i.name} ${i.sku}`)).slice(0, 4).forEach((i) => out.push({ id: i.id, group: 'Inventory', label: i.name, sub: `${i.sku} · ${i.stock} ${i.unit} · ${i.locationId === 'loc_bh' ? 'Beverly Hills' : 'Santa Monica'}`, to: `/app/inventory?item=${i.id}`, icon: Boxes }))
    if (can('finance.view')) db.payments.filter((p) => m(`${p.reference} ${patientName(db, p.patientId)}`)).slice(0, 3).forEach((p) => out.push({ id: p.id, group: 'Transactions', label: `${p.kind} · ${money(p.amount, true)}`, sub: `${patientName(db, p.patientId)} · ${p.method} · ${p.reference} · by ${staffName(db, p.by)}`, to: `/app/payments?invoice=${p.invoiceId}`, icon: CreditCard }))
    nav.filter((n) => m(n.label)).forEach((n) => out.push({ id: n.to, group: 'Go to', label: n.label, sub: '', to: n.to, icon: n.icon }))
    return out
  }, [q, db, can, nav])

  const choose = (r?: Result) => { if (!r) return; go(r.to); onClose() }
  const groups = [...new Set(results.map((r) => r.group))]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/30" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.3, ease: EASE }}
            className="relative w-full max-w-[620px] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lift" role="dialog" aria-label="Search">
            <div className="flex items-center gap-3 border-b border-stone-100 px-5">
              <Search size={18} className="text-stone-400" />
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} placeholder="Search everything…"
                onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) } if (e.key === 'Enter') choose(results[sel]); if (e.key === 'Escape') onClose() }}
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-400" />
              <Kbd>esc</Kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {groups.map((g) => (
                <div key={g} className="mb-1">
                  <div className="px-3 pb-1 pt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">{g}</div>
                  {results.filter((r) => r.group === g).map((r) => {
                    const i = results.indexOf(r)
                    return (
                      <button key={r.group + r.id} onMouseEnter={() => setSel(i)} onClick={() => choose(r)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', sel === i ? 'bg-cream' : '')}>
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ivory text-stone-500 hairline"><r.icon size={15} /></span>
                        <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] text-ink">{r.label}</div>{r.sub && <div className="truncate text-[12px] text-stone-500">{r.sub}</div>}</div>
                        {sel === i && <CornerDownLeft size={14} className="text-stone-400" />}
                      </button>
                    )
                  })}
                </div>
              ))}
              {!results.length && <div className="py-12 text-center text-[14px] text-stone-500">No results for “{q}”</div>}
            </div>
            <div className="flex items-center gap-4 border-t border-stone-100 bg-ivory/60 px-5 py-2.5 text-[11.5px] text-stone-400"><span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span><span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span><span className="ml-auto">Results respect your role permissions</span></div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
