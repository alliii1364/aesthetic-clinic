// Headless smoke test of the connected clinic workflows.
// Run: npx tsx --tsconfig tsconfig.json scripts/smoke.ts
const mem: Record<string, string> = {}
;(globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] } }

async function main() {
  const { useStore } = await import('../src/store/store')
  const { slotsFor } = await import('../src/lib/availability')
  const { addDays, startOfDay } = await import('../src/lib/format')
  const s = () => useStore.getState()
  // Production deep-freezes state after load; any action that mutates outside Immer must throw here.
  const { freeze } = await import('immer')
  freeze(useStore.getState(), true)
  let failures = 0
  const check = (name: string, ok: boolean, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failures++ }

  const db0 = s().db
  check('seed generated', db0.patients.length >= 60 && db0.appointments.length > 300, `${db0.patients.length} patients, ${db0.appointments.length} appointments, ${db0.invoices.length} invoices`)
  check('persisted size reasonable', JSON.stringify(db0).length < 4_000_000, `${(JSON.stringify(db0).length / 1e6).toFixed(2)} MB`)

  // 1. Price change flows to catalog + audit
  s().updateTreatment('tx_botox', { priceFrom: 475 })
  check('price change saved', s().db.treatments.find((t) => t.id === 'tx_botox')!.priceFrom === 475)
  check('price change audited', s().db.audit[0].oldValue === '$450' && s().db.audit[0].newValue === '$475')

  // 2. Online booking: lead → patient → appointment + deposit invoice
  const lead = s().db.leads.find((l) => l.stage === 'New Lead')!
  let slot: Date | undefined
  for (let i = 1; i < 15 && !slot; i++) slot = slotsFor(s().db, 'st_mitchell', 'loc_bh', addDays(startOfDay(), i), 30)[0]
  check('availability found', !!slot)
  const apId = s().createBooking({ treatmentId: 'tx_botox', practitionerId: 'st_mitchell', locationId: 'loc_bh', start: slot!.toISOString(), patient: { firstName: lead.name.split(' ')[0], lastName: lead.name.split(' ')[1], email: lead.email, phone: lead.phone }, payDeposit: true, source: 'Online', intake: { f1: false, sig: 'x' } })
  const ap = s().db.appointments.find((a) => a.id === apId)!
  const inv = s().db.invoices.find((i) => i.id === ap.invoiceId)!
  check('booking created + confirmed', ap.status === 'Confirmed' && ap.depositPaid)
  check('deposit invoice', inv.paid === 50 && inv.status === 'Partial', `${inv.number} paid ${inv.paid}/${inv.total}`)
  check('lead advanced to Consultation Booked', s().db.leads.find((l) => l.id === lead.id)!.stage === 'Consultation Booked')
  check('double booking prevented', !slotsFor(s().db, 'st_mitchell', 'loc_bh', slot!, 30).some((x) => x.getTime() === slot!.getTime()))

  // 3. Complete treatment → stock, invoice, commission, automation, review
  const botoxBefore = s().db.inventory.find((i) => i.sku === 'INJ-BTX-100' && i.locationId === 'loc_bh')!.stock
  const scheduledBefore = s().db.scheduled.length
  const comBefore = s().db.commissions.length
  s().setAppointmentStatus(apId, 'Checked In')
  const pts = [{ id: 'fh-l', region: 'Forehead', x: 72, y: 60, units: 4 }, { id: 'fh-c', region: 'Forehead', x: 100, y: 56, units: 4 }, { id: 'fh-r', region: 'Forehead', x: 128, y: 60, units: 4 }]
  const rep = s().completeAppointment(apId, { points: pts, notes: 'ok', patientNotes: 'see you', product: 'Botox', lot: 'BTX2400A', expiry: '2027-01-01', dosage: '12 units', complications: 'None', recommendations: '14 weeks' })!
  const botoxAfter = s().db.inventory.find((i) => i.sku === 'INJ-BTX-100' && i.locationId === 'loc_bh')!.stock
  check('stock deducted by charted units', botoxBefore - botoxAfter === 12, `${botoxBefore} → ${botoxAfter}`)
  const inv2 = s().db.invoices.find((i) => i.id === rep.invoiceId)!
  check('invoice finalised from units', inv2.lines[0].price === 180 && inv2.total === 180, `total ${inv2.total}, balance ${rep.balance}`)
  check('commission recorded', s().db.commissions.length > comBefore && rep.commission[0]?.amount === 27, JSON.stringify(rep.commission))
  check('follow-up automation scheduled', s().db.scheduled.length - scheduledBefore === 4)
  check('review request + aftercare thread', s().db.reviewRequests[0].appointmentId === apId && s().db.threads[0].kind === 'Aftercare')

  // 4. Collect balance
  s().collectPayment(rep.invoiceId, [{ method: 'Card', amount: rep.balance }])
  check('invoice paid', s().db.invoices.find((i) => i.id === rep.invoiceId)!.status === 'Paid')

  // 5. Package redemption
  s().completeAppointment('ap_emma_next', { points: [], notes: '', patientNotes: '', product: '', lot: '', expiry: '', dosage: '', complications: '', recommendations: '' })
  const pkg = s().db.patientPackages.find((p) => p.id === 'pp_emma_glow')!
  check('package redeemed', pkg.items[0].used === 3, `hydra ${pkg.items[0].used}/${pkg.items[0].qty}`)

  // 6. POS
  const serumBefore = s().db.inventory.find((i) => i.sku === 'RTL-VITC-30' && i.locationId === 'loc_bh')!.stock
  const posId = s().posCheckout({ patientId: 'pt_emma', locationId: 'loc_bh', staffId: 'st_stone', lines: [{ kind: 'product', refId: 'RTL-VITC-30', desc: 'Serum', qty: 1, price: 95, category: 'Retail' }, { kind: 'package', refId: 'pk_renewal', desc: 'Renewal', qty: 1, price: 995, category: 'Packages' }], discount: 50, tip: 0, splits: [{ method: 'Card', amount: 1049.03 }] })!
  const pos = s().db.invoices.find((i) => i.id === posId)!
  check('POS tax on retail only', pos.tax === 9.03 && pos.total === 1049.03 && pos.status === 'Paid', `total ${pos.total} ${pos.status}`)
  check('POS retail stock', s().db.inventory.find((i) => i.sku === 'RTL-VITC-30' && i.locationId === 'loc_bh')!.stock === serumBefore - 1)
  check('POS package activated', s().db.patientPackages.some((p) => p.invoiceId === posId))

  // 7. Purchasing partial receipt
  const po = s().db.purchaseOrders.find((p) => p.number === 'PO-2041')!
  const before = s().db.inventory.find((i) => i.id === po.lines[0].itemId)!.stock
  s().receivePO(po.id, { [po.lines[0].itemId]: 2 }, 'LOTX1', '2027-06-01')
  check('partial receipt', s().db.purchaseOrders.find((p) => p.id === po.id)!.status === 'Partially Received')
  check('received vials → units', s().db.inventory.find((i) => i.id === po.lines[0].itemId)!.stock - before === 200)

  // 8. Lead convert
  const l2 = s().db.leads.find((l) => l.stage === 'Contacted')!
  const pid = s().convertLead(l2.id)
  check('lead converted to patient', !!pid && s().db.patients.some((p) => p.id === pid))

  // 9. RBAC
  s().switchUser('st_reception')
  const refundsBefore = s().db.payments.filter((p) => p.kind === 'Refund').length
  s().refund(rep.invoiceId, 10, 'test')
  check('receptionist refund blocked', s().db.payments.filter((p) => p.kind === 'Refund').length === refundsBefore)
  check('denial audited', s().db.audit[0].action.startsWith('Permission denied'))
  s().switchUser('st_owner')

  // 10. Photo consent gate (Emma consented to internal use only)
  const ph = s().db.photos.find((p) => p.patientId === 'pt_emma')!
  s().setPhotoPermission(ph.id, 'Marketing approved')
  check('marketing approval blocked by consent', s().db.photos.find((p) => p.id === ph.id)!.permission !== 'Marketing approved')

  // 11. Persistence is deferred off the interaction path; it must land shortly after activity stops.
  check('no synchronous write during actions', mem['aurelia-os-v1'] === undefined)
  await new Promise((r) => setTimeout(r, 1500))
  check('debounced write lands', typeof mem['aurelia-os-v1'] === 'string', `${((mem['aurelia-os-v1']?.length ?? 0) / 1e6).toFixed(2)} MB`)
  // 12. Date rebase on rehydrate
  const persisted = JSON.parse(mem['aurelia-os-v1'])
  persisted.state.seededOn = addDays(new Date(), -3).toISOString().slice(0, 10)
  mem['aurelia-os-v1'] = JSON.stringify(persisted)
  const firstStart = persisted.state.db.appointments[0].start
  await useStore.persist.rehydrate()
  const shifted = (new Date(s().db.appointments[0].start).getTime() - new Date(firstStart).getTime()) / 86400000
  check('rehydrate rebases dates', Math.round(shifted) === 3, `${shifted.toFixed(2)} days`)

  console.log(failures ? `\n${failures} FAILED` : '\nAll workflow checks passed')
  process.exit(failures ? 1 : 0)
}
main()
