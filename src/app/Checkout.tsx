import { useEffect, useState } from 'react'
import { Plus, Trash2, CreditCard, Banknote, Gift, Wallet, Crown, Package } from 'lucide-react'
import { useDB, useStore, patientName } from '@/store/store'
import type { ID, PaymentMethod } from '@/lib/types'
import { Button, Modal, Input, cn } from '@/ui/ui'
import { money } from '@/lib/format'

export const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = { Card: CreditCard, Cash: Banknote, 'Gift Card': Gift, 'Account Credit': Wallet, 'Membership Credit': Crown, 'Package Credit': Package }
const METHODS: PaymentMethod[] = ['Card', 'Cash', 'Gift Card', 'Account Credit', 'Membership Credit']

/** Collect a balance against an invoice — tips, split tenders and credits. */
export function CheckoutModal({ invoiceId, onClose }: { invoiceId: ID | null; onClose: () => void }) {
  const db = useDB()
  const collect = useStore((s) => s.collectPayment)
  const inv = db.invoices.find((i) => i.id === invoiceId)
  const [tipPct, setTipPct] = useState(0)
  const [splits, setSplits] = useState<{ method: PaymentMethod; amount: number }[]>([])
  const balance = inv ? Math.round((inv.total - inv.paid) * 100) / 100 : 0
  const base = inv ? inv.lines.reduce((a, l) => a + l.price * l.qty, 0) - inv.discount : 0
  const tip = Math.round(base * tipPct) / 100
  const due = Math.round((balance + tip) * 100) / 100
  useEffect(() => { if (inv) { setTipPct(0); setSplits([{ method: 'Card', amount: Math.round((inv.total - inv.paid) * 100) / 100 }]) } }, [invoiceId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSplits((s) => (s.length === 1 ? [{ ...s[0], amount: due }] : s)) }, [due])
  const mem = inv && db.memberships.find((m) => m.patientId === inv.patientId && m.status === 'Active')
  const paidSum = Math.round(splits.reduce((a, s) => a + (s.amount || 0), 0) * 100) / 100
  const remaining = Math.round((due - paidSum) * 100) / 100
  if (!inv) return <Modal open={false} onClose={onClose}>{null}</Modal>
  return (
    <Modal open={!!inv} onClose={onClose} width={560} title="Collect payment" subtitle={`${inv.number} · ${patientName(db, inv.patientId)}`}
      footer={<><span className={cn('mr-auto text-[13px]', remaining === 0 ? 'text-sage-500' : 'text-amber-500')}>{remaining === 0 ? 'Fully allocated' : remaining > 0 ? `${money(remaining, true)} unallocated` : `${money(-remaining, true)} over`}</span><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={remaining !== 0 || due <= 0} onClick={() => { collect(inv.id, splits, tip); onClose() }}>Charge {money(due, true)}</Button></>}>
      <div className="space-y-5">
        <div className="rounded-2xl bg-cream p-4 text-[13.5px]">
          {inv.lines.map((l) => <div key={l.id} className="flex justify-between py-1"><span className="text-stone-700">{l.desc}{l.qty > 1 && ` × ${l.qty}`}</span><span className="tabular-nums">{money(l.price * l.qty, true)}</span></div>)}
          {inv.discount > 0 && <div className="flex justify-between py-1 text-sage-700"><span>{inv.discountLabel ?? 'Discount'}</span><span className="tabular-nums">−{money(inv.discount, true)}</span></div>}
          {inv.tax > 0 && <div className="flex justify-between py-1 text-stone-500"><span>Tax</span><span className="tabular-nums">{money(inv.tax, true)}</span></div>}
          {inv.paid > 0 && <div className="flex justify-between py-1 text-stone-500"><span>Paid (incl. deposit)</span><span className="tabular-nums">−{money(inv.paid, true)}</span></div>}
          {tip > 0 && <div className="flex justify-between py-1 text-stone-500"><span>Tip</span><span className="tabular-nums">{money(tip, true)}</span></div>}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 font-medium"><span>Due now</span><span className="font-display text-[22px] tabular-nums">{money(due, true)}</span></div>
        </div>
        <div>
          <div className="mb-2 text-[12.5px] font-medium text-stone-600">Tip</div>
          <div className="flex gap-2">{[0, 10, 15, 20].map((p) => <button key={p} onClick={() => setTipPct(p)} className={cn('flex-1 rounded-xl border py-2 text-[13px] transition', tipPct === p ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white hover:border-stone-300')}>{p ? `${p}%` : 'No tip'}</button>)}</div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-[12.5px] font-medium text-stone-600"><span>Payment methods</span>{mem && <span className="font-normal text-bronze-600">{mem.credits} membership credit{mem.credits === 1 ? '' : 's'} available</span>}</div>
          <div className="space-y-2">
            {splits.map((s, i) => {
              const Icon = METHOD_ICON[s.method]
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <select value={s.method} onChange={(e) => setSplits(splits.map((x, k) => (k === i ? { ...x, method: e.target.value as PaymentMethod } : x)))} className="h-10 w-full appearance-none rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none">
                      {METHODS.filter((m) => m !== 'Membership Credit' || (mem && mem.credits > 0)).map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <Input type="number" step="0.01" value={s.amount} onChange={(e) => setSplits(splits.map((x, k) => (k === i ? { ...x, amount: parseFloat(e.target.value) || 0 } : x)))} className="w-32 text-right tabular-nums" />
                  {splits.length > 1 && <button onClick={() => setSplits(splits.filter((_, k) => k !== i))} className="text-stone-400 hover:text-rose-500" aria-label="Remove"><Trash2 size={15} /></button>}
                </div>
              )
            })}
          </div>
          <button onClick={() => setSplits([...splits, { method: 'Cash', amount: Math.max(0, remaining) }])} className="mt-2 flex items-center gap-1.5 text-[12.5px] text-stone-500 hover:text-ink"><Plus size={13} />Split payment</button>
        </div>
      </div>
    </Modal>
  )
}
