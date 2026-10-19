import type { DB, ID, Invoice } from './types'
import { addDays, startOfDay, sum } from './format'

export interface Range { from: Date; to: Date }
export const lastNDays = (n: number): Range => ({ from: addDays(startOfDay(), -(n - 1)), to: addDays(startOfDay(), 1) })
export const priorRange = (r: Range): Range => { const len = r.to.getTime() - r.from.getTime(); return { from: new Date(r.from.getTime() - len), to: r.from } }
const inRange = (iso: string, r: Range) => { const t = new Date(iso).getTime(); return t >= r.from.getTime() && t < r.to.getTime() }

export const scopedInvoices = (db: DB, locs: ID[], r?: Range) => db.invoices.filter((i) => locs.includes(i.locationId) && (!r || inRange(i.createdAt, r)))
export const scopedPayments = (db: DB, locs: ID[], r?: Range) => db.payments.filter((p) => locs.includes(p.locationId) && (!r || inRange(p.at, r)))
export const scopedAppointments = (db: DB, locs: ID[], r?: Range) => db.appointments.filter((a) => locs.includes(a.locationId) && (!r || inRange(a.start, r)))

/** Net revenue recognised on invoices (excludes refunded value). */
export const invoiceRevenue = (i: Invoice) => Math.max(0, i.total - i.tip - i.tax - i.refunded)
export const revenue = (db: DB, locs: ID[], r: Range) => sum(scopedInvoices(db, locs, r).filter((i) => i.status !== 'Draft'), invoiceRevenue)
export const collected = (db: DB, locs: ID[], r: Range) => sum(scopedPayments(db, locs, r), (p) => p.amount)

export function dailySeries(db: DB, locs: ID[], days: number, f: 'revenue' | 'appointments' | 'collected' = 'revenue') {
  const labels: string[] = []
  const values: number[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(startOfDay(), -i)
    const r = { from: d, to: addDays(d, 1) }
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    values.push(f === 'revenue' ? Math.round(revenue(db, locs, r)) : f === 'collected' ? Math.round(collected(db, locs, r)) : scopedAppointments(db, locs, r).filter((a) => !['Cancelled'].includes(a.status)).length)
  }
  return { labels, values }
}

export const revenueBy = (db: DB, locs: ID[], r: Range, key: (i: Invoice, line: Invoice['lines'][0]) => string) => {
  const out: Record<string, number> = {}
  scopedInvoices(db, locs, r).filter((i) => i.status !== 'Draft').forEach((i) => {
    const gross = i.lines.reduce((a, l) => a + l.price * l.qty, 0) || 1
    const net = invoiceRevenue(i)
    i.lines.forEach((l) => { const k = key(i, l); out[k] = (out[k] || 0) + (l.price * l.qty / gross) * net })
  })
  return Object.entries(out).map(([label, value]) => ({ label, value: Math.round(value) })).sort((a, b) => b.value - a.value)
}

export const mrr = (db: DB) => sum(db.memberships.filter((m) => m.status === 'Active' || m.status === 'Cancel Requested' || m.status === 'Past Due'), (m) => db.membershipPlans.find((p) => p.id === m.planId)?.price ?? 0)

export function occupancy(db: DB, locs: ID[], day: Date) {
  const r = { from: startOfDay(day), to: addDays(startOfDay(day), 1) }
  const appts = scopedAppointments(db, locs, r).filter((a) => !['Cancelled', 'No Show'].includes(a.status))
  const pracs = new Set(appts.map((a) => a.practitionerId)).size || 1
  const available = pracs * 9 * 60
  return Math.min(1, sum(appts, (a) => a.duration) / available)
}

export const delta = (cur: number, prev: number) => (prev ? (cur - prev) / prev : 0)

export function rebookRate(db: DB, locs: ID[], r: Range) {
  const completed = scopedAppointments(db, locs, r).filter((a) => a.status === 'Completed')
  if (!completed.length) return 0
  const rebooked = completed.filter((a) => db.appointments.some((b) => b.patientId === a.patientId && b.start > a.start && b.status !== 'Cancelled'))
  return rebooked.length / completed.length
}

export function lifetimeValue(db: DB, patientId: ID) {
  return sum(db.invoices.filter((i) => i.patientId === patientId), invoiceRevenue)
}
