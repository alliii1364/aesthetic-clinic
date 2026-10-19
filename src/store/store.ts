import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { freeze } from 'immer'
import { idleStorage, hasSavedState } from './persistence'
import type {
  Appointment, AppointmentStatus, AuditEvent, CMS, DB, FormField, ID, InjectionPoint, InventoryItem, Invoice, InvoiceLine,
  Lead, LeadActivity, LeadStage, Patient, PaymentMethod, Permission, PhotoPermission, Photo, POStatus, PurchaseOrder,
  Role, Staff, Tenant, Treatment, Thread, Channel,
} from '@/lib/types'
import { buildSeed, TENANT_ID } from '@/data/seed'
import { ROLE_PERMISSIONS } from '@/lib/permissions'
import { uid, daysBetween, money } from '@/lib/format'

export interface Toast { id: ID; title: string; body?: string; tone: 'default' | 'success' | 'warning' | 'danger' }

export interface Session {
  tenantId: ID
  userId: ID
  locationId: ID | 'all'
  portalPatientId: ID
}

/** Result of the treatment-completion workflow, shown to staff so the chain is visible. */
export interface CompletionReport {
  sessionId: ID
  invoiceId: ID
  balance: number
  stock: { name: string; used: number; unit: string; remaining: number; low: boolean }[]
  commission: { staff: string; amount: number }[]
  automations: { name: string; steps: number }[]
  packageRedeemed?: string
  reviewRequested: boolean
}

export interface BookingInput {
  treatmentId: ID
  practitionerId: ID
  locationId: ID
  start: string
  patient: { firstName: string; lastName: string; email: string; phone: string; dob?: string }
  concerns?: string[]
  intake?: Record<string, string | boolean>
  notes?: string
  payDeposit: boolean
  source: Appointment['source']
  packageId?: ID
}

interface State {
  db: DB
  session: Session
  seededOn: string
  rolePermissions: Record<Role, Permission[]>
  toasts: Toast[]
  lastCompletion?: CompletionReport

  // session & ui
  switchUser: (userId: ID) => void
  setLocation: (id: ID | 'all') => void
  toast: (title: string, body?: string, tone?: Toast['tone']) => void
  dismissToast: (id: ID) => void
  can: (p: Permission) => boolean
  resetDemo: () => void

  // catalog & website
  updateTreatment: (id: ID, patch: Partial<Treatment>) => void
  createTreatment: (t: Partial<Treatment> & { name: string; category: Treatment['category'] }) => ID | undefined
  updateCMS: (patch: Partial<CMS>) => void
  setTestimonialPublished: (id: ID, published: boolean) => void
  updateTenant: (patch: Partial<Tenant>) => void
  setRolePermission: (role: Role, perm: Permission, on: boolean) => void

  // booking & calendar
  createBooking: (input: BookingInput) => ID
  createAppointment: (a: Omit<Appointment, 'id' | 'tenantId' | 'createdAt' | 'intake' | 'consent' | 'depositPaid' | 'internalNotes'> & { internalNotes?: string }) => ID | undefined
  moveAppointment: (id: ID, start: string, practitionerId?: ID, roomId?: ID) => void
  setAppointmentStatus: (id: ID, status: AppointmentStatus, reason?: string) => void
  updateAppointment: (id: ID, patch: Partial<Appointment>) => void
  completeAppointment: (id: ID, data: { points: InjectionPoint[]; notes: string; patientNotes: string; product: string; lot: string; expiry: string; dosage: string; complications: string; recommendations: string }) => CompletionReport | undefined

  // patient self-service (portal)
  patientReschedule: (id: ID, start: string) => void
  patientPay: (invoiceId: ID, amount: number) => void

  // payments & POS
  collectPayment: (invoiceId: ID, splits: { method: PaymentMethod; amount: number }[], tip?: number) => void
  refund: (invoiceId: ID, amount: number, reason: string) => void
  posCheckout: (input: { patientId?: ID; locationId: ID; staffId: ID; lines: Omit<InvoiceLine, 'id'>[]; discount: number; discountLabel?: string; tip: number; splits: { method: PaymentMethod; amount: number }[] }) => ID | undefined

  // patients & CRM
  createPatient: (p: Partial<Patient> & { firstName: string; lastName: string; email: string; phone: string }) => ID | undefined
  updatePatient: (id: ID, patch: Partial<Patient>, by?: 'patient' | 'staff') => void
  addPatientNote: (id: ID, text: string) => void
  logAccess: (patientId: ID, what: string) => void
  addLead: (l: Partial<Lead> & { name: string; email: string; phone: string; interestId: ID; source: string }) => ID
  moveLead: (id: ID, stage: LeadStage) => void
  addLeadActivity: (id: ID, kind: LeadActivity['kind'], text: string) => void
  convertLead: (id: ID) => ID | undefined
  updateLead: (id: ID, patch: Partial<Lead>) => void

  // packages & memberships
  sellPackage: (patientId: ID, templateId: ID) => void
  subscribeMembership: (patientId: ID, planId: ID) => void
  setMembershipStatus: (id: ID, status: 'Active' | 'Cancel Requested' | 'Cancelled' | 'Past Due') => void

  // clinical, media & forms
  addPhoto: (p: Omit<Photo, 'id' | 'tenantId' | 'takenAt'>) => void
  setPhotoPermission: (id: ID, permission: PhotoPermission) => void
  saveFormTemplate: (id: ID | null, data: { name: string; kind: 'Intake' | 'Consent' | 'Aftercare' | 'Privacy'; fields: FormField[] }) => void
  signForm: (templateId: ID, patientId: ID, answers: Record<string, string | boolean>, device: string, appointmentId?: ID) => void

  // inventory & purchasing
  adjustStock: (itemId: ID, delta: number, reason: string) => void
  createPO: (supplierId: ID, locationId: ID, lines: { itemId: ID; qty: number }[]) => ID | undefined
  setPOStatus: (id: ID, status: POStatus) => void
  receivePO: (id: ID, received: Record<ID, number>, lot: string, expiry: string) => void

  // staff
  updateStaff: (id: ID, patch: Partial<Staff>) => void
  payCommissions: (staffId: ID) => void

  // messaging, marketing, notifications
  sendMessage: (threadId: ID | null, patientId: ID, from: 'patient' | 'clinic', text: string, subject?: string, kind?: Thread['kind']) => ID
  markThreadRead: (threadId: ID, side: 'clinic' | 'patient') => void
  toggleAutomation: (id: ID) => void
  sendCampaign: (id: ID) => void
  createCampaign: (c: { name: string; channel: 'Email' | 'SMS'; segment: string; subject: string; audience: number }) => void
  submitReview: (requestId: ID, rating: number, comment?: string) => void
  markNotificationsRead: (audience: 'staff' | 'patient') => void
  toggleTask: (id: ID) => void
  addTask: (title: string, due: string, assigneeId: ID, patientId?: ID, leadId?: ID) => void
}

const iso = () => new Date().toISOString()
const round2 = (n: number) => Math.round(n * 100) / 100
const DEVICE = typeof navigator !== 'undefined' && /iPad|Tablet/.test(navigator.userAgent) ? 'iPad · Safari' : 'Desktop · Chrome'

// Shift every ISO date in the seed so the demo stays "live" whenever it is opened.
function rebase(value: unknown, deltaDays: number, key = ''): unknown {
  if (!deltaDays) return value
  if (typeof value === 'string') {
    if (key === 'dob' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    d.setDate(d.getDate() + deltaDays)
    return value.length === 10 ? d.toISOString().slice(0, 10) : d.toISOString()
  }
  if (Array.isArray(value)) return value.map((v) => rebase(v, deltaDays, key))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = rebase(v, deltaDays, k)
    return out
  }
  return value
}

const todayKey = () => new Date().toISOString().slice(0, 10)

// Immer skips frozen subtrees when finalising a draft; unfrozen ones are walked in full looking
// for nested drafts. Freshly seeded or rehydrated (JSON-parsed) state is unfrozen, so without
// this every update walked the whole ~2 MB tree (~300 ms per click). Freeze once, when idle.
const freezeWhenIdle = () => {
  const run = () => freeze(useStore.getState(), true)
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 0)
}

const STORAGE_KEY = 'aurelia-os-v1'
const HAD_SAVED_STATE = hasSavedState(STORAGE_KEY)
const EMPTY_DB: DB = {
  tenants: [], locations: [], staff: [], treatments: [], patients: [], appointments: [], leads: [], inventory: [], suppliers: [], purchaseOrders: [],
  invoices: [], payments: [], commissions: [], packageTemplates: [], patientPackages: [], membershipPlans: [], memberships: [], sessions: [], photos: [],
  formTemplates: [], formSubmissions: [], threads: [], notifications: [], audit: [], automations: [], scheduled: [], campaigns: [], reviewRequests: [],
  testimonials: [], tasks: [], cms: {}, counters: { invoice: 0, po: 0 },
}

export const useStore = create<State>()(
  persist(
    immer((set, get) => {
      // ── helpers (operate on immer drafts) ─────────────────────────────────
      const me = () => get().db.staff.find((s) => s.id === get().session.userId)
      const can = (p: Permission) => {
        const u = me()
        return !!u && get().rolePermissions[u.role]?.includes(p)
      }
      const toast = (title: string, body?: string, tone: Toast['tone'] = 'default') => {
        const id = uid('t')
        set((s) => { s.toasts.push({ id, title, body, tone }) })
        setTimeout(() => get().dismissToast(id), 4200)
      }
      const audit = (db: DB, e: Omit<AuditEvent, 'id' | 'tenantId' | 'at' | 'userId' | 'ip' | 'device'> & { userId?: ID }) => {
        db.audit.unshift({ id: uid('au'), tenantId: TENANT_ID, at: iso(), userId: e.userId ?? get().session.userId, ip: '104.28.14.6', device: DEVICE, ...e })
      }
      const guard = (p: Permission | Permission[], action: string): boolean => {
        const ps = Array.isArray(p) ? p : [p]
        if (ps.some(can)) return true
        toast('Permission required', `Your role can’t ${action}. Ask an owner or manager.`, 'warning')
        set((s) => audit(s.db, { action: `Permission denied: ${action}`, module: 'Security', entity: ps.join(', '), severity: 'security' }))
        return false
      }
      const notify = (db: DB, n: { audience: 'staff' | 'patient'; patientId?: ID; channel: Channel; kind: string; title: string; body: string; href?: string }) => {
        db.notifications.unshift({ id: uid('no'), tenantId: TENANT_ID, at: iso(), read: false, ...n })
      }
      const nextInvoiceNo = (db: DB) => `INV-${db.counters.invoice++}`
      const recalc = (inv: Invoice) => {
        const sub = inv.lines.reduce((a, l) => a + l.price * l.qty, 0)
        inv.total = round2(Math.max(0, sub - inv.discount) + inv.tax + inv.tip)
        const net = inv.paid - inv.refunded
        inv.status = inv.refunded > 0 && inv.refunded >= inv.paid ? 'Refunded' : net >= inv.total - 0.005 ? 'Paid' : net > 0 ? 'Partial' : 'Open'
      }
      // FIFO deduction across lots (earliest expiry first)
      const deduct = (db: DB, item: InventoryItem, qty: number) => {
        item.stock = Math.max(0, item.stock - qty)
        let left = qty
        item.lots.sort((a, b) => a.expiry.localeCompare(b.expiry))
        for (const lot of item.lots) {
          const take = Math.min(lot.qty, left)
          lot.qty -= take
          left -= take
          if (left <= 0) break
        }
        item.lots = item.lots.filter((l) => l.qty > 0)
        if (item.stock <= item.reorderLevel) {
          notify(db, { audience: 'staff', channel: 'In-app', kind: 'stock', title: `Low stock · ${item.name}`, body: `${db.locations.find((l) => l.id === item.locationId)?.name}: ${item.stock} ${item.unit} left (reorder at ${item.reorderLevel}).`, href: '/app/inventory' })
        }
      }
      const memberDiscount = (db: DB, patientId: ID) => {
        const m = db.memberships.find((x) => x.patientId === patientId && (x.status === 'Active' || x.status === 'Cancel Requested'))
        const plan = db.membershipPlans.find((p) => p.id === m?.planId)
        return plan ? { pct: plan.discountPct, label: `${plan.name} member ${Math.round(plan.discountPct * 100)}%` } : null
      }
      const commissionFor = (db: DB, inv: Invoice, staffId?: ID) => {
        const s = db.staff.find((x) => x.id === staffId)
        if (!s) return []
        const out: { staff: string; amount: number }[] = []
        const ratio = inv.lines.reduce((a, l) => a + l.price * l.qty, 0) || 1
        inv.lines.forEach((l) => {
          const key = (l.kind === 'product' ? 'Retail' : l.kind === 'package' ? 'Packages' : l.category) as keyof Staff['commission']
          const rate = s.commission[key] ?? 0
          if (!rate || l.price <= 0) return
          // commission is calculated on the net (post-discount) line value
          const base = round2(l.price * l.qty * (1 - inv.discount / ratio))
          const amount = round2(base * rate)
          db.commissions.push({ id: uid('com'), tenantId: TENANT_ID, staffId: s.id, invoiceId: inv.id, category: String(key), base, rate, amount, status: 'Pending', at: iso() })
          out.push({ staff: s.name, amount })
        })
        return out
      }
      const findOrCreatePatient = (db: DB, p: BookingInput['patient'], locationId: ID, source: string) => {
        const existing = db.patients.find((x) => x.email.toLowerCase() === p.email.toLowerCase())
        if (existing) return existing
        const np: Patient = {
          id: uid('pt'), tenantId: TENANT_ID, firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, dob: p.dob || '1990-01-01',
          since: iso(), locationId, source, tags: ['New'], alerts: [], allergies: [], medications: [], conditions: [], pregnancy: 'Not pregnant', address: '',
          emergencyContact: { name: '', phone: '', relation: '' }, notify: { email: true, sms: true, push: false, marketing: false }, notes: [], treatmentPlan: [],
        }
        db.patients.push(np)
        return np
      }

      return {
        // Seeding takes ~0.4s; only do it when there is no saved workspace to hydrate from.
        db: HAD_SAVED_STATE ? EMPTY_DB : buildSeed(),
        session: { tenantId: TENANT_ID, userId: 'st_owner', locationId: 'all', portalPatientId: 'pt_emma' },
        seededOn: todayKey(),
        rolePermissions: ROLE_PERMISSIONS,
        toasts: [],
        lastCompletion: undefined,

        // ── session ───────────────────────────────────────────────────────
        switchUser: (userId) => {
          set((s) => {
            const u = s.db.staff.find((x) => x.id === userId)!
            s.session.userId = userId
            const all = s.rolePermissions[u.role].includes('locations.all')
            s.session.locationId = all ? 'all' : u.locationIds[0]
            audit(s.db, { userId, action: 'Signed in', module: 'Security', entity: `${u.name} · MFA verified`, severity: 'security' })
          })
        },
        setLocation: (id) => set((s) => { s.session.locationId = id }),
        toast,
        dismissToast: (id) => set((s) => { s.toasts = s.toasts.filter((t) => t.id !== id) }),
        can,
        resetDemo: () => {
          set((s) => { s.db = buildSeed(); s.seededOn = todayKey(); s.rolePermissions = ROLE_PERMISSIONS; s.lastCompletion = undefined })
          toast('Demo data restored', 'Aurelia Aesthetics has been reset to its original state.', 'success')
        },

        // ── catalog & website ─────────────────────────────────────────────
        updateTreatment: (id, patch) => {
          if (!guard('treatments.manage', 'edit treatments')) return
          set((s) => {
            const t = s.db.treatments.find((x) => x.id === id)!
            const changes = Object.keys(patch).filter((k) => JSON.stringify((t as never)[k]) !== JSON.stringify((patch as never)[k]))
            if (!changes.length) return
            const fmt = (k: string, v: unknown) => (k === 'priceFrom' ? money(v as number) : typeof v === 'object' ? JSON.stringify(v) : String(v))
            changes.forEach((k) => audit(s.db, { action: `Updated treatment ${k}`, module: 'Treatments', entity: t.name, oldValue: fmt(k, (t as never)[k]), newValue: fmt(k, (patch as never)[k]), severity: k.toLowerCase().includes('price') ? 'financial' : 'info' }))
            Object.assign(t, patch)
          })
          toast('Treatment saved', 'Website, booking flow and pricing updated instantly.', 'success')
        },
        createTreatment: (t) => {
          if (!guard('treatments.manage', 'create treatments')) return
          const id = uid('tx')
          set((s) => {
            const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            s.db.treatments.push({
              id, tenantId: TENANT_ID, slug, tagline: '', description: '', priceFrom: 0, locationPricing: {}, duration: 30, deposit: 0, active: true, onlineBookable: true, featured: false,
              concerns: [], benefits: [], howItWorks: '', results: '', downtime: 'None', sessions: '1', preparation: [], aftercare: [], contraindications: [], faqs: [],
              practitionerIds: [], locationIds: s.db.locations.map((l) => l.id), consumables: [], image: s.db.treatments[0].image, requiresIntake: true, usesInjectionMap: false,
              seo: { title: `${t.name} | Aurelia Aesthetics`, description: '' }, ...t,
            })
            audit(s.db, { action: 'Created treatment', module: 'Treatments', entity: t.name, severity: 'info' })
          })
          toast('Treatment created', 'A website page and booking option were generated automatically.', 'success')
          return id
        },
        updateCMS: (patch) => {
          if (!guard('cms.manage', 'edit the website')) return
          set((s) => {
            Object.assign(s.db.cms[TENANT_ID], patch)
            audit(s.db, { action: 'Published website changes', module: 'Website', entity: Object.keys(patch).join(', '), severity: 'info' })
          })
          toast('Published', 'Your website has been updated.', 'success')
        },
        setTestimonialPublished: (id, published) => {
          if (!guard('cms.manage', 'publish reviews')) return
          set((s) => { const t = s.db.testimonials.find((x) => x.id === id)!; t.published = published; audit(s.db, { action: published ? 'Published review' : 'Unpublished review', module: 'Website', entity: t.name, severity: 'info' }) })
        },
        updateTenant: (patch) => {
          if (!guard('settings.manage', 'change organization settings')) return
          set((s) => {
            const t = s.db.tenants[0]
            audit(s.db, { action: 'Updated organization settings', module: 'Settings', entity: Object.keys(patch).join(', '), oldValue: JSON.stringify(Object.fromEntries(Object.keys(patch).map((k) => [k, (t as never)[k]]))), newValue: JSON.stringify(patch), severity: 'security' })
            Object.assign(t, patch)
          })
          toast('Settings saved', undefined, 'success')
        },
        setRolePermission: (role, perm, on) => {
          if (!guard('settings.manage', 'change permissions')) return
          if (role === 'owner') return toast('Owner permissions are fixed', undefined, 'warning')
          set((s) => {
            const list = s.rolePermissions[role]
            s.rolePermissions[role] = on ? [...new Set([...list, perm])] : list.filter((p) => p !== perm)
            audit(s.db, { action: 'Changed role permissions', module: 'Settings', entity: role, oldValue: `${perm}: ${on ? 'off' : 'on'}`, newValue: `${perm}: ${on ? 'on' : 'off'}`, severity: 'security' })
          })
        },

        // ── booking & calendar ────────────────────────────────────────────
        createBooking: (input) => {
          const id = uid('ap')
          set((s) => {
            const db = s.db
            const t = db.treatments.find((x) => x.id === input.treatmentId)!
            const loc = db.locations.find((l) => l.id === input.locationId)!
            const p = findOrCreatePatient(db, input.patient, input.locationId, input.source === 'Online' ? 'Website booking' : input.source)
            const price = t.locationPricing[input.locationId] ?? t.priceFrom
            const room = loc.rooms.find((r) => (t.category === 'Laser' ? r.kind === 'Laser' : r.kind === 'Treatment')) ?? loc.rooms[0]
            const appt: Appointment = {
              id, tenantId: TENANT_ID, patientId: p.id, treatmentId: t.id, practitionerId: input.practitionerId, locationId: input.locationId, roomId: room.id,
              start: input.start, duration: t.duration, status: input.payDeposit || !t.deposit ? 'Confirmed' : 'Requested', price, deposit: t.deposit,
              depositPaid: input.payDeposit && t.deposit > 0, notes: [input.concerns?.length ? `Concerns: ${input.concerns.join(', ')}` : '', input.notes ?? ''].filter(Boolean).join(' · '),
              internalNotes: '', intake: !t.requiresIntake ? 'Not required' : input.intake ? 'Complete' : 'Pending', consent: t.consentFormId ? 'Pending' : 'Not required',
              source: input.source, createdAt: iso(), packageId: input.packageId,
            }
            db.appointments.push(appt)
            if (input.intake) {
              db.formSubmissions.push({ id: uid('fs'), tenantId: TENANT_ID, templateId: 'form_intake', version: db.formTemplates.find((f) => f.id === 'form_intake')!.version, patientId: p.id, appointmentId: id, signedAt: iso(), device: DEVICE, ip: '76.88.21.4', pdf: 'Generated', answers: input.intake })
              const pregnant = input.intake.f1 === true || input.intake.f1 === 'Yes'
              if (pregnant) { p.pregnancy = 'Pregnant'; if (!p.alerts.includes('Pregnancy reported at intake')) p.alerts.push('Pregnancy reported at intake') }
            }
            if (appt.depositPaid || (price > 0 && !input.packageId)) {
              const disc = memberDiscount(db, p.id)
              const inv: Invoice = { id: uid('inv'), tenantId: TENANT_ID, number: nextInvoiceNo(db), patientId: p.id, appointmentId: id, practitionerId: input.practitionerId, locationId: input.locationId, lines: [{ id: uid('l'), kind: 'treatment', refId: t.id, desc: t.name, qty: 1, price, category: t.category }], discount: disc ? round2(price * disc.pct) : 0, discountLabel: disc?.label, tax: 0, tip: 0, total: 0, paid: 0, refunded: 0, status: 'Open', createdAt: iso() }
              if (appt.depositPaid) {
                inv.paid = t.deposit
                db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId: inv.id, patientId: p.id, amount: t.deposit, method: 'Card', kind: 'Deposit', at: iso(), locationId: input.locationId, by: 'system', reference: `ch_${uid('').slice(-8)}` })
              }
              recalc(inv)
              db.invoices.push(inv)
              appt.invoiceId = inv.id
            }
            // Lead pipeline: an enquiry that books moves forward automatically
            const lead = db.leads.find((l) => l.email.toLowerCase() === p.email.toLowerCase() && !['Converted', 'Lost'].includes(l.stage))
            if (lead) {
              lead.stage = 'Consultation Booked'; lead.patientId = p.id
              lead.activity.unshift({ id: uid('la'), at: iso(), kind: 'appointment', text: `Booked ${t.name} online for ${new Date(input.start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` })
            }
            const practitioner = db.staff.find((x) => x.id === input.practitionerId)!
            notify(db, { audience: 'staff', channel: 'In-app', kind: 'booking', title: `New ${input.source.toLowerCase()} booking`, body: `${p.firstName} ${p.lastName} · ${t.name} with ${practitioner.name}`, href: '/app/calendar' })
            notify(db, { audience: 'patient', patientId: p.id, channel: 'Email', kind: 'confirmation', title: `Booking ${appt.status === 'Confirmed' ? 'confirmed' : 'requested'} · ${t.name}`, body: `${new Date(input.start).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })} at ${loc.name}.` })
            if (t.consentFormId) notify(db, { audience: 'patient', patientId: p.id, channel: 'Email', kind: 'form', title: 'Consent form pending', body: `Please complete your ${db.formTemplates.find((f) => f.id === t.consentFormId)?.name} before your visit.` })
            audit(db, { userId: 'system', action: 'Booking created', module: 'Booking', entity: `${t.name} · ${input.source}`, patientId: p.id, locationId: input.locationId, newValue: appt.depositPaid ? `Deposit ${money(t.deposit)} paid` : undefined, severity: appt.depositPaid ? 'financial' : 'info' })
          })
          return id
        },
        createAppointment: (a) => {
          if (!guard(['calendar.manage', 'calendar.own'], 'create appointments')) return
          const id = uid('ap')
          set((s) => {
            const t = s.db.treatments.find((x) => x.id === a.treatmentId)!
            s.db.appointments.push({ ...a, internalNotes: a.internalNotes ?? '', id, tenantId: TENANT_ID, createdAt: iso(), depositPaid: false, intake: t.requiresIntake ? 'Pending' : 'Not required', consent: t.consentFormId ? 'Pending' : 'Not required' })
            const p = s.db.patients.find((x) => x.id === a.patientId)!
            notify(s.db, { audience: 'patient', patientId: p.id, channel: 'SMS', kind: 'confirmation', title: `Appointment booked · ${t.name}`, body: new Date(a.start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) })
            audit(s.db, { action: 'Created appointment', module: 'Calendar', entity: t.name, patientId: p.id, locationId: a.locationId, severity: 'info' })
          })
          toast('Appointment booked', 'Confirmation sent to the patient by SMS.', 'success')
          return id
        },
        moveAppointment: (id, start, practitionerId, roomId) => {
          if (!guard('calendar.manage', 'reschedule appointments')) return
          set((s) => {
            const a = s.db.appointments.find((x) => x.id === id)!
            const old = `${new Date(a.start).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}${practitionerId && practitionerId !== a.practitionerId ? ` · ${a.practitionerId}` : ''}`
            a.start = start
            if (practitionerId) a.practitionerId = practitionerId
            if (roomId) a.roomId = roomId
            const t = s.db.treatments.find((x) => x.id === a.treatmentId)!
            notify(s.db, { audience: 'patient', patientId: a.patientId, channel: 'SMS', kind: 'reschedule', title: `Appointment moved · ${t.name}`, body: `Now ${new Date(start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` })
            audit(s.db, { action: 'Rescheduled appointment', module: 'Calendar', entity: t.name, oldValue: old, newValue: new Date(start).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }), patientId: a.patientId, locationId: a.locationId, severity: 'info' })
          })
          toast('Appointment rescheduled', 'The patient has been notified by SMS.')
        },
        setAppointmentStatus: (id, status, reason) => {
          const a0 = get().db.appointments.find((x) => x.id === id)
          if (!a0) return
          const isOwn = a0.practitionerId === get().session.userId
          if (!can('calendar.manage') && !(isOwn && can('calendar.own')) && !(status === 'Cancelled' && reason === 'patient')) {
            guard('calendar.manage', 'change appointment status'); return
          }
          set((s) => {
            const a = s.db.appointments.find((x) => x.id === id)!
            const old = a.status
            a.status = status
            const t = s.db.treatments.find((x) => x.id === a.treatmentId)!
            if (status === 'Cancelled') {
              notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'cancel', title: 'Appointment cancelled', body: `${t.name} · ${new Date(a.start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}${reason === 'patient' ? ' (by patient)' : ''}`, href: '/app/calendar' })
              const inv = s.db.invoices.find((i) => i.id === a.invoiceId)
              if (inv && inv.paid === 0) inv.status = 'Refunded'
            }
            if (status === 'No Show') notify(s.db, { audience: 'patient', patientId: a.patientId, channel: 'SMS', kind: 'noshow', title: 'We missed you today', body: 'Reply to rebook — we’d love to see you.' })
            audit(s.db, { userId: reason === 'patient' ? 'patient' : undefined, action: `Appointment ${status.toLowerCase()}`, module: 'Calendar', entity: t.name, oldValue: old, newValue: status, patientId: a.patientId, locationId: a.locationId, severity: 'info' })
          })
          if (reason !== 'patient') toast(`Marked ${status.toLowerCase()}`)
        },
        updateAppointment: (id, patch) => set((s) => {
          const a = s.db.appointments.find((x) => x.id === id)!
          Object.assign(a, patch)
          audit(s.db, { action: 'Updated appointment', module: 'Calendar', entity: Object.keys(patch).join(', '), patientId: a.patientId, severity: 'info' })
        }),

        /**
         * Treatment completed → clinical record → stock deducted → invoice finalised →
         * commission recorded → package redeemed → follow-up automation → review request.
         */
        completeAppointment: (id, data) => {
          const a0 = get().db.appointments.find((x) => x.id === id)
          if (!a0 || !guard('clinical.write', 'complete treatments')) return
          let report: CompletionReport | undefined
          set((s) => {
            const db = s.db
            const a = db.appointments.find((x) => x.id === id)!
            const t = db.treatments.find((x) => x.id === a.treatmentId)!
            const p = db.patients.find((x) => x.id === a.patientId)!
            const pr = db.staff.find((x) => x.id === a.practitionerId)!
            a.status = 'Completed'
            // 1. clinical record
            const sessionId = uid('ses')
            const prior = db.sessions.filter((x) => x.patientId === p.id && x.treatmentId === t.id).length
            const totalUnits = data.points.reduce((x, q) => x + q.units, 0)
            db.sessions.push({ id: sessionId, tenantId: TENANT_ID, appointmentId: id, patientId: p.id, practitionerId: pr.id, treatmentId: t.id, locationId: a.locationId, at: iso(), sessionNumber: prior + 1, product: data.product, lot: data.lot, expiry: data.expiry, dosage: data.dosage, areas: [...new Set(data.points.map((q) => q.region))], points: data.points, notes: data.notes, patientNotes: data.patientNotes, complications: data.complications || 'None', recommendations: data.recommendations, aftercare: t.aftercare.join(' · '), signedBy: get().session.userId })
            a.sessionId = sessionId
            // 2. stock deduction (injectables use charted units, others use treatment consumables)
            const stock: CompletionReport['stock'] = []
            t.consumables.forEach((c) => {
              const item = db.inventory.find((i) => i.sku === c.sku && i.locationId === a.locationId)
              if (!item) return
              const qty = t.usesInjectionMap && item.unit === 'units' && totalUnits > 0 ? totalUnits : c.qty
              deduct(db, item, qty)
              stock.push({ name: item.name, used: qty, unit: item.unit, remaining: item.stock, low: item.stock <= item.reorderLevel })
            })
            // 3. package redemption
            let packageRedeemed: string | undefined
            const pkg = db.patientPackages.find((pp) => pp.id === a.packageId) ?? db.patientPackages.find((pp) => pp.patientId === p.id && pp.status === 'Active' && pp.items.some((i) => i.treatmentId === t.id && i.used < i.qty) && a.price === 0)
            if (pkg) {
              const it = pkg.items.find((i) => i.treatmentId === t.id && i.used < i.qty)
              if (it) {
                it.used++
                const tpl = db.packageTemplates.find((x) => x.id === pkg.templateId)!
                packageRedeemed = `${tpl.name} · ${t.name} ${it.used} of ${it.qty}`
                if (pkg.items.every((i) => i.used >= i.qty)) pkg.status = 'Completed'
                a.price = 0
              }
            }
            // 4. invoice
            let inv = db.invoices.find((i) => i.id === a.invoiceId)
            // neuromodulators bill per charted unit at the stock item's per-unit price
            const unitItem = t.consumables.map((c) => db.inventory.find((i) => i.sku === c.sku && i.locationId === a.locationId)).find((i) => i?.unit === 'units')
            const unitPrice = t.usesInjectionMap && unitItem && totalUnits > 0 ? totalUnits * unitItem.price : a.price
            if (!inv) {
              const disc = memberDiscount(db, p.id)
              inv = { id: uid('inv'), tenantId: TENANT_ID, number: nextInvoiceNo(db), patientId: p.id, appointmentId: id, practitionerId: pr.id, locationId: a.locationId, lines: [], discount: 0, discountLabel: disc?.label, tax: 0, tip: 0, total: 0, paid: 0, refunded: 0, status: 'Open', createdAt: iso() }
              db.invoices.push(inv)
              a.invoiceId = inv.id
            }
            const disc = memberDiscount(db, p.id)
            inv.lines = [{ id: uid('l'), kind: 'treatment', refId: t.id, desc: packageRedeemed ? `${t.name} · package credit` : t.usesInjectionMap && totalUnits ? `${t.name} · ${totalUnits} units` : t.name, qty: 1, price: packageRedeemed ? 0 : unitPrice, category: t.category }]
            inv.discount = !packageRedeemed && disc ? round2(unitPrice * disc.pct) : 0
            inv.discountLabel = disc?.label
            recalc(inv)
            // 5. commission
            const commission = packageRedeemed ? [] : commissionFor(db, inv, pr.id)
            // 6. follow-up automations
            const autos = db.automations.filter((au) => au.active && au.trigger === 'Treatment completed' && au.treatmentIds.includes(t.id))
            autos.forEach((au) => {
              au.enrolled++
              au.steps.forEach((st) => {
                const at = new Date(); at.setDate(at.getDate() + st.offsetDays)
                db.scheduled.push({ id: uid('sm'), tenantId: TENANT_ID, automationId: au.id, patientId: p.id, channel: st.channel, sendAt: at.toISOString(), template: st.template, status: st.offsetDays === 0 ? 'Sent' : 'Scheduled' })
              })
            })
            // 7. aftercare message & review request
            const thread: Thread = { id: uid('th'), tenantId: TENANT_ID, patientId: p.id, subject: `Aftercare · ${t.name}`, kind: 'Aftercare', unreadClinic: false, unreadPatient: true, messages: [{ id: uid('m'), from: 'clinic', authorId: pr.id, text: `${data.patientNotes || 'Thank you for visiting today.'}\n\nAftercare: ${t.aftercare.join('; ')}.`, at: iso() }] }
            db.threads.unshift(thread)
            db.reviewRequests.unshift({ id: uid('rr'), tenantId: TENANT_ID, patientId: p.id, appointmentId: id, sentAt: iso(), status: 'Sent' })
            notify(db, { audience: 'patient', patientId: p.id, channel: 'Push', kind: 'review', title: 'How was your experience?', body: `Tell us about your ${t.name} with ${pr.name.split(' ')[0] === 'Dr.' ? pr.name : pr.name.split(' ')[0]}.` })
            audit(db, { action: 'Completed treatment & signed record', module: 'Clinical', entity: `${t.name}${data.dosage ? ` · ${data.dosage}` : ''}${data.lot ? ` · lot ${data.lot}` : ''}`, patientId: p.id, locationId: a.locationId, severity: 'clinical' })
            stock.forEach((st) => audit(db, { action: 'Stock deducted', module: 'Inventory', entity: st.name, oldValue: `${st.remaining + st.used} ${st.unit}`, newValue: `${st.remaining} ${st.unit}`, locationId: a.locationId, severity: 'info' }))
            audit(db, { action: 'Invoice generated', module: 'Payments', entity: `${inv.number} · ${money(inv.total, true)}`, patientId: p.id, locationId: a.locationId, severity: 'financial' })
            report = { sessionId, invoiceId: inv.id, balance: round2(inv.total - inv.paid), stock, commission, automations: autos.map((au) => ({ name: au.name, steps: au.steps.length })), packageRedeemed, reviewRequested: true }
            s.lastCompletion = report
          })
          return report
        },

        // ── patient self-service ──────────────────────────────────────────
        patientReschedule: (id, start) => {
          set((s) => {
            const a = s.db.appointments.find((x) => x.id === id)!
            const t = s.db.treatments.find((x) => x.id === a.treatmentId)!
            const old = a.start
            a.start = start
            notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'reschedule', title: 'Patient rescheduled', body: `${t.name} moved to ${new Date(start).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`, href: '/app/calendar' })
            audit(s.db, { userId: 'patient', action: 'Rescheduled via portal', module: 'Calendar', entity: t.name, oldValue: new Date(old).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }), newValue: new Date(start).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }), patientId: a.patientId, locationId: a.locationId, severity: 'info' })
          })
          toast('Appointment rescheduled', 'We’ve sent an updated confirmation.', 'success')
        },
        patientPay: (invoiceId, amount) => {
          set((s) => {
            const inv = s.db.invoices.find((i) => i.id === invoiceId)!
            s.db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId, patientId: inv.patientId, amount: round2(amount), method: 'Card', kind: 'Payment', at: iso(), locationId: inv.locationId, by: 'patient', reference: `ch_${uid('').slice(-8)}` })
            inv.paid = round2(inv.paid + amount)
            recalc(inv)
            audit(s.db, { userId: 'patient', action: 'Paid balance via portal', module: 'Payments', entity: `${inv.number} · ${money(amount, true)}`, patientId: inv.patientId, locationId: inv.locationId, severity: 'financial' })
            notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'payment', title: 'Online payment received', body: `${inv.number} · ${money(amount, true)}`, href: '/app/payments' })
          })
          toast('Payment received', 'Thank you — your receipt is in Payments.', 'success')
        },

        // ── payments & POS ────────────────────────────────────────────────
        collectPayment: (invoiceId, splits, tip = 0) => {
          if (!guard('payments.collect', 'collect payments')) return
          set((s) => {
            const inv = s.db.invoices.find((i) => i.id === invoiceId)!
            inv.tip = round2(inv.tip + tip)
            splits.filter((x) => x.amount > 0).forEach((sp) => {
              s.db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId, patientId: inv.patientId, amount: round2(sp.amount), method: sp.method, kind: 'Payment', at: iso(), locationId: inv.locationId, by: get().session.userId, reference: `ch_${uid('').slice(-8)}` })
              inv.paid = round2(inv.paid + sp.amount)
              if (sp.method === 'Membership Credit') {
                const m = s.db.memberships.find((x) => x.patientId === inv.patientId && x.status === 'Active')
                if (m && m.credits > 0) m.credits--
              }
            })
            recalc(inv)
            audit(s.db, { action: 'Collected payment', module: 'Payments', entity: `${inv.number} · ${splits.map((x) => `${x.method} ${money(x.amount, true)}`).join(' + ')}${tip ? ` · tip ${money(tip)}` : ''}`, patientId: inv.patientId, locationId: inv.locationId, severity: 'financial' })
            notify(s.db, { audience: 'patient', patientId: inv.patientId, channel: 'Email', kind: 'receipt', title: `Receipt · ${inv.number}`, body: `Thank you — ${money(splits.reduce((x, y) => x + y.amount, 0), true)} received.` })
          })
          toast('Payment collected', 'Receipt emailed to the patient.', 'success')
        },
        refund: (invoiceId, amount, reason) => {
          if (!guard('payments.refund', 'issue refunds')) return
          set((s) => {
            const inv = s.db.invoices.find((i) => i.id === invoiceId)!
            inv.refunded = round2(inv.refunded + amount)
            recalc(inv)
            if (inv.refunded >= inv.paid) inv.status = 'Refunded'
            s.db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId, patientId: inv.patientId, amount: -amount, method: 'Card', kind: 'Refund', at: iso(), locationId: inv.locationId, by: get().session.userId, reference: `re_${uid('').slice(-6)}` })
            // reverse commission proportionally
            s.db.commissions.filter((c) => c.invoiceId === invoiceId && c.status === 'Pending').forEach((c) => { c.amount = round2(c.amount * (1 - amount / Math.max(inv.total, 1))) })
            audit(s.db, { action: 'Issued refund', module: 'Payments', entity: `${inv.number} · ${reason}`, oldValue: money(inv.paid - inv.refunded + amount, true), newValue: money(inv.paid - inv.refunded, true), patientId: inv.patientId, locationId: inv.locationId, severity: 'financial' })
          })
          toast('Refund issued', `${money(amount, true)} returned to the original card.`, 'success')
        },
        posCheckout: (input) => {
          if (!guard('payments.collect', 'use the point of sale')) return
          const id = uid('inv')
          set((s) => {
            const db = s.db
            const lines = input.lines.map((l) => ({ ...l, id: uid('l') }))
            const tax = round2(lines.filter((l) => l.kind === 'product').reduce((a, l) => a + l.price * l.qty, 0) * db.tenants[0].taxRate)
            const inv: Invoice = { id, tenantId: TENANT_ID, number: nextInvoiceNo(db), patientId: input.patientId ?? 'walk-in', practitionerId: input.staffId, locationId: input.locationId, lines, discount: input.discount, discountLabel: input.discountLabel, tax, tip: input.tip, total: 0, paid: 0, refunded: 0, status: 'Open', createdAt: iso() }
            recalc(inv)
            input.splits.filter((x) => x.amount > 0).forEach((sp) => {
              db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId: id, patientId: inv.patientId, amount: round2(sp.amount), method: sp.method, kind: 'Payment', at: iso(), locationId: input.locationId, by: get().session.userId, reference: `ch_${uid('').slice(-8)}` })
              inv.paid = round2(inv.paid + sp.amount)
            })
            recalc(inv)
            db.invoices.push(inv)
            // retail stock leaves the shelf
            lines.filter((l) => l.kind === 'product').forEach((l) => {
              const item = db.inventory.find((i) => i.sku === l.refId && i.locationId === input.locationId)
              if (item) { deduct(db, item, l.qty); audit(db, { action: 'Stock sold', module: 'Inventory', entity: item.name, oldValue: String(item.stock + l.qty), newValue: String(item.stock), locationId: input.locationId, severity: 'info' }) }
            })
            // packages & memberships sold at the till are activated
            if (input.patientId) {
              lines.filter((l) => l.kind === 'package').forEach((l) => {
                const tpl = db.packageTemplates.find((x) => x.id === l.refId)!
                const exp = new Date(); exp.setMonth(exp.getMonth() + tpl.expiryMonths)
                db.patientPackages.push({ id: uid('pp'), tenantId: TENANT_ID, templateId: tpl.id, patientId: input.patientId!, purchasedAt: iso(), expiresAt: exp.toISOString(), items: tpl.items.map((i) => ({ ...i, used: 0 })), status: 'Active', invoiceId: id })
              })
              lines.filter((l) => l.kind === 'membership').forEach((l) => {
                const renew = new Date(); renew.setMonth(renew.getMonth() + 1)
                db.memberships.push({ id: uid('mem'), tenantId: TENANT_ID, planId: l.refId, patientId: input.patientId!, startedAt: iso(), renewsAt: renew.toISOString(), status: 'Active', credits: 1, paymentMethod: 'Card on file' })
              })
            }
            commissionFor(db, inv, input.staffId)
            audit(db, { action: 'POS sale', module: 'POS', entity: `${inv.number} · ${money(inv.total, true)} · ${input.splits.map((x) => x.method).join(' + ')}`, patientId: input.patientId, locationId: input.locationId, severity: 'financial' })
          })
          toast('Sale complete', 'Receipt sent · stock and commissions updated.', 'success')
          return id
        },

        // ── patients & CRM ────────────────────────────────────────────────
        createPatient: (p) => {
          if (!guard('patients.manage', 'create patients')) return
          const id = uid('pt')
          set((s) => {
            s.db.patients.push({ id, tenantId: TENANT_ID, dob: '1990-01-01', since: iso(), locationId: s.session.locationId === 'all' ? 'loc_bh' : s.session.locationId, source: 'Walk-in', tags: ['New'], alerts: [], allergies: [], medications: [], conditions: [], pregnancy: 'Not pregnant', address: '', emergencyContact: { name: '', phone: '', relation: '' }, notify: { email: true, sms: true, push: false, marketing: false }, notes: [], treatmentPlan: [], ...p })
            audit(s.db, { action: 'Created patient', module: 'Patients', entity: `${p.firstName} ${p.lastName}`, patientId: id, severity: 'info' })
          })
          toast('Patient created', `${p.firstName} ${p.lastName} added to your CRM.`, 'success')
          return id
        },
        updatePatient: (id, patch, by = 'staff') => {
          if (by === 'staff' && !guard(Object.keys(patch).some((k) => ['allergies', 'medications', 'conditions', 'pregnancy', 'alerts'].includes(k)) ? 'clinical.write' : 'patients.manage', 'edit patient records')) return
          set((s) => {
            const p = s.db.patients.find((x) => x.id === id)!
            const clinical = Object.keys(patch).some((k) => ['allergies', 'medications', 'conditions', 'pregnancy', 'alerts'].includes(k))
            audit(s.db, { userId: by === 'patient' ? 'patient' : undefined, action: by === 'patient' ? 'Patient updated profile' : clinical ? 'Updated medical history' : 'Updated patient', module: clinical ? 'Clinical' : 'Patients', entity: Object.keys(patch).join(', '), oldValue: JSON.stringify(Object.fromEntries(Object.keys(patch).map((k) => [k, (p as never)[k]]))).slice(0, 120), newValue: JSON.stringify(patch).slice(0, 120), patientId: id, severity: clinical ? 'clinical' : 'info' })
            Object.assign(p, patch)
          })
          toast('Saved', undefined, 'success')
        },
        addPatientNote: (id, text) => {
          if (!guard(['patients.manage', 'clinical.write'], 'add notes')) return
          set((s) => {
            s.db.patients.find((x) => x.id === id)!.notes.unshift({ id: uid('n'), at: iso(), by: get().session.userId, text })
            audit(s.db, { action: 'Added internal note', module: 'Patients', entity: text.slice(0, 60), patientId: id, severity: 'info' })
          })
        },
        logAccess: (patientId, what) => set((s) => {
          // de-duplicate: one view event per user/patient/area per 10 minutes
          const recent = s.db.audit.find((e) => e.userId === get().session.userId && e.patientId === patientId && e.entity === what && Date.now() - new Date(e.at).getTime() < 600000)
          if (!recent) audit(s.db, { action: 'Viewed clinical record', module: 'Clinical', entity: what, patientId, severity: 'clinical' })
        }),
        addLead: (l) => {
          const id = uid('ld')
          set((s) => {
            const assignee = s.db.staff.find((x) => x.role === 'sales')?.id ?? 'st_manager'
            const t = s.db.treatments.find((x) => x.id === l.interestId)
            s.db.leads.unshift({ id, tenantId: TENANT_ID, value: Math.max(t?.priceFrom ?? 300, 300), campaign: 'Website organic', assigneeId: assignee, stage: 'New Lead', nextFollowUp: new Date(Date.now() + 3600000).toISOString(), notes: '', lastContact: iso(), createdAt: iso(), locationId: 'loc_bh', activity: [{ id: uid('la'), at: iso(), kind: 'system', text: `Lead captured from ${l.source}` }], ...l })
            const au = s.db.automations.find((a) => a.trigger === 'Lead created' && a.active)
            if (au) { au.enrolled++; s.db.leads[0].activity.unshift({ id: uid('la'), at: iso(), kind: 'sms', text: `Automation “${au.name}” sent: ${au.steps[0].template}` }) }
            notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'lead', title: 'New lead', body: `${l.name} · interested in ${t?.name ?? 'a treatment'}`, href: '/app/leads' })
            audit(s.db, { userId: 'system', action: 'Lead created', module: 'Leads', entity: `${l.name} · ${l.source}`, severity: 'info' })
          })
          return id
        },
        moveLead: (id, stage) => {
          if (!guard('leads.manage', 'manage leads')) return
          set((s) => {
            const l = s.db.leads.find((x) => x.id === id)!
            if (l.stage === stage) return
            l.activity.unshift({ id: uid('la'), at: iso(), kind: 'stage', text: `Moved from ${l.stage} to ${stage}`, by: get().session.userId })
            audit(s.db, { action: 'Moved lead', module: 'Leads', entity: l.name, oldValue: l.stage, newValue: stage, severity: 'info' })
            l.stage = stage
            l.lastContact = iso()
          })
        },
        addLeadActivity: (id, kind, text) => {
          if (!guard('leads.manage', 'manage leads')) return
          set((s) => {
            const l = s.db.leads.find((x) => x.id === id)!
            l.activity.unshift({ id: uid('la'), at: iso(), kind, text, by: get().session.userId })
            l.lastContact = iso()
            if (l.stage === 'New Lead' && ['call', 'sms', 'email'].includes(kind)) { l.stage = 'Contacted'; l.activity.unshift({ id: uid('la'), at: iso(), kind: 'stage', text: 'Moved to Contacted automatically' }) }
          })
        },
        convertLead: (id) => {
          if (!guard('leads.manage', 'convert leads')) return
          let pid: ID | undefined
          set((s) => {
            const l = s.db.leads.find((x) => x.id === id)!
            if (l.patientId) { pid = l.patientId; return }
            const [firstName, ...rest] = l.name.split(' ')
            const p = findOrCreatePatient(s.db, { firstName, lastName: rest.join(' '), email: l.email, phone: l.phone }, l.locationId, l.source)
            p.source = `${l.source} · ${l.campaign}`
            l.patientId = p.id
            pid = p.id
            l.activity.unshift({ id: uid('la'), at: iso(), kind: 'system', text: 'Converted to patient record', by: get().session.userId })
            if (!['Consultation Booked', 'Consultation Completed', 'Treatment Proposed'].includes(l.stage)) { l.stage = 'Converted' }
            audit(s.db, { action: 'Converted lead to patient', module: 'Leads', entity: l.name, patientId: p.id, severity: 'info' })
          })
          toast('Lead converted', 'A patient record was created with full history.', 'success')
          return pid
        },
        updateLead: (id, patch) => set((s) => { Object.assign(s.db.leads.find((x) => x.id === id)!, patch) }),

        // ── packages & memberships ────────────────────────────────────────
        sellPackage: (patientId, templateId) => {
          if (!guard('packages.manage', 'sell packages')) return
          const tpl = get().db.packageTemplates.find((x) => x.id === templateId)!
          get().posCheckout({ patientId, locationId: get().session.locationId === 'all' ? 'loc_bh' : (get().session.locationId as ID), staffId: get().session.userId, lines: [{ kind: 'package', refId: tpl.id, desc: tpl.name, qty: 1, price: tpl.price, category: 'Packages' }], discount: 0, tip: 0, splits: [{ method: 'Card', amount: tpl.price }] })
        },
        subscribeMembership: (patientId, planId) => {
          const plan = get().db.membershipPlans.find((x) => x.id === planId)!
          const existing = get().db.memberships.find((m) => m.patientId === patientId && m.status !== 'Cancelled')
          if (existing) {
            set((s) => {
              const m = s.db.memberships.find((x) => x.id === existing.id)!
              audit(s.db, { userId: get().session.userId, action: 'Changed membership plan', module: 'Memberships', entity: plan.name, oldValue: m.planId, newValue: planId, patientId, severity: 'financial' })
              m.planId = planId; m.status = 'Active'
            })
            toast('Membership updated', `Now on ${plan.name}. Pro-rated on next renewal.`, 'success')
            return
          }
          set((s) => {
            const renew = new Date(); renew.setMonth(renew.getMonth() + 1)
            s.db.memberships.push({ id: uid('mem'), tenantId: TENANT_ID, planId, patientId, startedAt: iso(), renewsAt: renew.toISOString(), status: 'Active', credits: plan.monthlyCredit?.qty ?? 0, paymentMethod: 'Card on file' })
            const inv: Invoice = { id: uid('inv'), tenantId: TENANT_ID, number: nextInvoiceNo(s.db), patientId, locationId: 'loc_bh', lines: [{ id: uid('l'), kind: 'membership', refId: plan.id, desc: `${plan.name} membership`, qty: 1, price: plan.price, category: 'Membership' }], discount: 0, tax: 0, tip: 0, total: plan.price, paid: plan.price, refunded: 0, status: 'Paid', createdAt: iso() }
            s.db.invoices.push(inv)
            s.db.payments.push({ id: uid('pay'), tenantId: TENANT_ID, invoiceId: inv.id, patientId, amount: plan.price, method: 'Card', kind: 'Payment', at: iso(), locationId: 'loc_bh', by: 'system', reference: `sub_${uid('').slice(-6)}` })
            audit(s.db, { action: 'Membership started', module: 'Memberships', entity: plan.name, patientId, severity: 'financial' })
          })
          toast('Welcome to ' + plan.name, 'First month charged · credits available now.', 'success')
        },
        setMembershipStatus: (id, status) => set((s) => {
          const m = s.db.memberships.find((x) => x.id === id)!
          audit(s.db, { action: 'Membership status changed', module: 'Memberships', entity: s.db.membershipPlans.find((p) => p.id === m.planId)!.name, oldValue: m.status, newValue: status, patientId: m.patientId, severity: 'financial' })
          m.status = status
          if (status === 'Cancelled') m.cancelledAt = iso()
          if (status === 'Cancel Requested') notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'membership', title: 'Membership cancellation requested', body: 'A patient requested to cancel — retention offer suggested.', href: '/app/memberships' })
        }),

        // ── clinical, media & forms ───────────────────────────────────────
        addPhoto: (p) => {
          if (!guard('clinical.write', 'capture clinical photos')) return
          set((s) => {
            s.db.photos.push({ ...p, id: uid('ph'), tenantId: TENANT_ID, takenAt: iso() })
            audit(s.db, { action: 'Captured clinical photo', module: 'Before & After', entity: `${p.stage} · ${p.angle}`, patientId: p.patientId, severity: 'clinical' })
          })
          toast('Photo saved', 'Stored encrypted · permission: clinical only.', 'success')
        },
        setPhotoPermission: (id, permission) => {
          if (!guard('photos.approve', 'change photo permissions')) return
          const db = get().db
          const ph = db.photos.find((x) => x.id === id)!
          if (permission === 'Marketing approved') {
            const consent = db.formSubmissions.filter((f) => f.patientId === ph.patientId && f.templateId === 'form_photo').sort((a, b) => b.signedAt.localeCompare(a.signedAt))[0]
            const ok = !consent || String(consent.answers.p1 ?? '').startsWith('Marketing')
            if (consent && !ok) {
              toast('Photography consent does not allow marketing', `Patient consented to “${consent.answers.p1}”. Request updated consent first.`, 'danger')
              return
            }
          }
          set((s) => {
            const x = s.db.photos.find((q) => q.id === id)!
            audit(s.db, { action: 'Changed photo permission', module: 'Before & After', entity: `${x.stage} · ${x.angle}`, oldValue: x.permission, newValue: permission, patientId: x.patientId, severity: 'clinical' })
            x.permission = permission
          })
          toast(permission === 'Marketing approved' ? 'Approved for marketing' : 'Permission updated', permission === 'Marketing approved' ? 'Now eligible for the website gallery.' : undefined, 'success')
        },
        saveFormTemplate: (id, data) => {
          if (!guard('forms.manage', 'edit forms')) return
          set((s) => {
            if (id) {
              const f = s.db.formTemplates.find((x) => x.id === id)!
              audit(s.db, { action: 'Published new form version', module: 'Forms', entity: f.name, oldValue: `v${f.version}`, newValue: `v${f.version + 1}`, severity: 'clinical' })
              Object.assign(f, data, { version: f.version + 1, updatedAt: iso() })
            } else {
              s.db.formTemplates.push({ id: uid('form'), tenantId: TENANT_ID, version: 1, updatedAt: iso(), active: true, ...data })
              audit(s.db, { action: 'Created form', module: 'Forms', entity: data.name, severity: 'clinical' })
            }
          })
          toast('Form published', 'Previously signed versions are preserved.', 'success')
        },
        signForm: (templateId, patientId, answers, device, appointmentId) => set((s) => {
          const f = s.db.formTemplates.find((x) => x.id === templateId)!
          s.db.formSubmissions.push({ id: uid('fs'), tenantId: TENANT_ID, templateId, version: f.version, patientId, appointmentId, signedAt: iso(), device, ip: '76.88.21.4', pdf: 'Generated', answers })
          s.db.appointments.filter((a) => a.patientId === patientId && new Date(a.start) > new Date(Date.now() - 86400000)).forEach((a) => {
            const t = s.db.treatments.find((x) => x.id === a.treatmentId)!
            if (f.kind === 'Consent' && t.consentFormId === templateId) a.consent = 'Signed'
            if (f.kind === 'Intake') a.intake = 'Complete'
          })
          audit(s.db, { userId: 'patient', action: 'Signed form', module: 'Forms', entity: `${f.name} v${f.version}`, patientId, newValue: device, severity: 'clinical' })
        }),

        // ── inventory & purchasing ────────────────────────────────────────
        adjustStock: (itemId, delta, reason) => {
          if (!guard('inventory.manage', 'adjust stock')) return
          set((s) => {
            const it = s.db.inventory.find((x) => x.id === itemId)!
            const old = it.stock
            if (delta < 0) deduct(s.db, it, -delta)
            else { it.stock += delta; if (it.lots[0]) it.lots[it.lots.length - 1].qty += delta }
            audit(s.db, { action: 'Adjusted stock', module: 'Inventory', entity: `${it.name} · ${reason}`, oldValue: `${old} ${it.unit}`, newValue: `${it.stock} ${it.unit}`, locationId: it.locationId, severity: 'info' })
          })
          toast('Stock adjusted')
        },
        createPO: (supplierId, locationId, lines) => {
          if (!guard('purchasing.manage', 'create purchase orders')) return
          const id = uid('po')
          set((s) => {
            const number = `PO-${s.db.counters.po++}`
            s.db.purchaseOrders.unshift({ id, tenantId: TENANT_ID, number, supplierId, locationId, status: 'Draft', createdAt: iso(), expected: new Date(Date.now() + 6 * 86400000).toISOString(), createdBy: get().session.userId, paid: false, lines: lines.map((l) => ({ ...l, received: 0, cost: s.db.inventory.find((i) => i.id === l.itemId)!.cost })) })
            audit(s.db, { action: 'Created purchase order', module: 'Purchasing', entity: number, severity: 'financial' })
          })
          toast('Purchase order drafted')
          return id
        },
        setPOStatus: (id, status) => {
          if (!guard('purchasing.manage', 'update purchase orders')) return
          if (status === 'Approved' && !can('inventory.manage') && !can('finance.view')) { guard('finance.view', 'approve purchase orders'); return }
          set((s) => {
            const po = s.db.purchaseOrders.find((x) => x.id === id)!
            audit(s.db, { action: 'Purchase order status', module: 'Purchasing', entity: po.number, oldValue: po.status, newValue: status, severity: 'financial' })
            po.status = status
          })
        },
        receivePO: (id, received, lot, expiry) => {
          if (!guard(['purchasing.manage', 'inventory.manage'], 'receive stock')) return
          set((s) => {
            const po: PurchaseOrder = s.db.purchaseOrders.find((x) => x.id === id)!
            po.lines.forEach((l) => {
              const qty = Math.min(received[l.itemId] ?? 0, l.qty - l.received)
              if (qty <= 0) return
              l.received += qty
              const it = s.db.inventory.find((i) => i.id === l.itemId)!
              const units = qty * it.packSize
              it.stock += units
              it.lots.push({ lot, expiry, qty: units })
              audit(s.db, { action: 'Goods received', module: 'Inventory', entity: `${it.name} · lot ${lot}`, oldValue: `${it.stock - units} ${it.unit}`, newValue: `${it.stock} ${it.unit}`, locationId: po.locationId, severity: 'info' })
            })
            const old = po.status
            po.status = po.lines.every((l) => l.received >= l.qty) ? 'Received' : 'Partially Received'
            const sup = s.db.suppliers.find((x) => x.id === po.supplierId)!
            sup.balance = round2(sup.balance + po.lines.reduce((a, l) => a + (received[l.itemId] ?? 0) * l.cost, 0))
            audit(s.db, { action: 'Received purchase order', module: 'Purchasing', entity: po.number, oldValue: old, newValue: po.status, locationId: po.locationId, severity: 'financial' })
          })
          toast('Stock received', 'Inventory levels and lots updated.', 'success')
        },

        // ── staff ─────────────────────────────────────────────────────────
        updateStaff: (id, patch) => {
          if (!guard('staff.manage', 'edit staff')) return
          set((s) => {
            const st = s.db.staff.find((x) => x.id === id)!
            audit(s.db, { action: 'Updated staff profile', module: 'Staff', entity: `${st.name} · ${Object.keys(patch).join(', ')}`, oldValue: JSON.stringify(Object.fromEntries(Object.keys(patch).map((k) => [k, (st as never)[k]]))).slice(0, 140), newValue: JSON.stringify(patch).slice(0, 140), severity: 'commission' in patch ? 'financial' : 'info' })
            Object.assign(st, patch)
          })
          toast('Staff profile saved', undefined, 'success')
        },
        payCommissions: (staffId) => {
          if (!guard('finance.view', 'pay commissions')) return
          set((s) => {
            const pending = s.db.commissions.filter((c) => c.staffId === staffId && c.status === 'Pending')
            pending.forEach((c) => { c.status = 'Paid' })
            audit(s.db, { action: 'Marked commission paid', module: 'Finance', entity: `${s.db.staff.find((x) => x.id === staffId)!.name} · ${money(pending.reduce((a, c) => a + c.amount, 0), true)}`, severity: 'financial' })
          })
          toast('Commission marked as paid', 'Exported to payroll queue.', 'success')
        },

        // ── messaging, marketing, notifications ───────────────────────────
        sendMessage: (threadId, patientId, from, text, subject, kind = 'General') => {
          const id = threadId ?? uid('th')
          set((s) => {
            let th = s.db.threads.find((t) => t.id === id)
            if (!th) { th = { id, tenantId: TENANT_ID, patientId, subject: subject ?? 'New message', kind, messages: [], unreadClinic: false, unreadPatient: false }; s.db.threads.unshift(th) }
            th.messages.push({ id: uid('m'), from, authorId: from === 'clinic' ? get().session.userId : undefined, text, at: iso() })
            if (from === 'patient') { th.unreadClinic = true; notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'message', title: 'New patient message', body: text.slice(0, 80), href: `/app/patients/${patientId}?tab=Messages` }) }
            else { th.unreadPatient = true; notify(s.db, { audience: 'patient', patientId, channel: 'Push', kind: 'message', title: 'New message from Aurelia', body: text.slice(0, 80) }) }
            // keep the thread at the top
            s.db.threads = [th, ...s.db.threads.filter((t) => t.id !== id)]
          })
          return id
        },
        markThreadRead: (threadId, side) => set((s) => {
          const t = s.db.threads.find((x) => x.id === threadId)
          if (t) { if (side === 'clinic') t.unreadClinic = false; else t.unreadPatient = false }
        }),
        toggleAutomation: (id) => {
          if (!guard('marketing.manage', 'manage automations')) return
          set((s) => { const a = s.db.automations.find((x) => x.id === id)!; a.active = !a.active; audit(s.db, { action: a.active ? 'Activated automation' : 'Paused automation', module: 'Marketing', entity: a.name, severity: 'info' }) })
        },
        sendCampaign: (id) => {
          if (!guard('marketing.manage', 'send campaigns')) return
          set((s) => { const c = s.db.campaigns.find((x) => x.id === id)!; c.status = 'Sent'; c.scheduledAt = iso(); audit(s.db, { action: 'Sent campaign', module: 'Marketing', entity: `${c.name} · ${c.audience} recipients`, severity: 'info' }) })
          toast('Campaign sent', 'Delivery and engagement will appear here as it lands.', 'success')
        },
        createCampaign: (c) => {
          if (!guard('marketing.manage', 'create campaigns')) return
          set((s) => { s.db.campaigns.unshift({ id: uid('cp'), tenantId: TENANT_ID, status: 'Draft', scheduledAt: iso(), opened: 0, clicked: 0, booked: 0, revenue: 0, ...c }); audit(s.db, { action: 'Created campaign', module: 'Marketing', entity: c.name, severity: 'info' }) })
          toast('Campaign saved as draft')
        },
        submitReview: (requestId, rating, comment) => set((s) => {
          const r = s.db.reviewRequests.find((x) => x.id === requestId)!
          r.rating = rating; r.comment = comment; r.status = 'Responded'; r.routed = rating >= 4 ? 'Google' : 'Internal feedback'
          if (rating < 4) {
            notify(s.db, { audience: 'staff', channel: 'In-app', kind: 'feedback', title: `${rating}★ private feedback received`, body: comment || 'No comment left — consider a personal call.', href: '/app/marketing?tab=Reviews' })
            s.db.tasks.unshift({ id: uid('tk'), tenantId: TENANT_ID, title: `Call patient about ${rating}★ feedback`, due: new Date(Date.now() + 86400000).toISOString(), assigneeId: 'st_manager', done: false, patientId: r.patientId, kind: 'Follow-up' })
          }
        }),
        markNotificationsRead: (audience) => set((s) => { s.db.notifications.forEach((n) => { if (n.audience === audience) n.read = true }) }),
        toggleTask: (id) => set((s) => { const t = s.db.tasks.find((x) => x.id === id)!; t.done = !t.done }),
        addTask: (title, due, assigneeId, patientId, leadId) => set((s) => {
          s.db.tasks.unshift({ id: uid('tk'), tenantId: TENANT_ID, title, due, assigneeId, done: false, patientId, leadId, kind: 'Follow-up' })
          if (leadId) s.db.leads.find((l) => l.id === leadId)?.activity.unshift({ id: uid('la'), at: iso(), kind: 'task', text: `Task: ${title}`, by: get().session.userId })
        }),
      }
    }),
    {
      name: STORAGE_KEY,
      storage: idleStorage<Partial<State>>(),
      partialize: (s) => ({ db: s.db, session: s.session, seededOn: s.seededOn, rolePermissions: s.rolePermissions }),
      // Saved data unreadable or missing → fall back to a fresh seed.
      // Runs synchronously inside create(), before `useStore` is assigned — defer to the next task.
      onRehydrateStorage: () => (state) => {
        setTimeout(() => {
          if (!state?.db.tenants.length) useStore.setState({ db: buildSeed(), seededOn: todayKey() })
          // First visit: persist the freshly built seed once (idle), so reloads parse saved JSON
          // (~30 ms) instead of regenerating the workspace (~100–400 ms). Browsing alone never
          // triggers a state change, so without this nothing would ever be saved.
          else if (!HAD_SAVED_STATE) useStore.setState({ seededOn: todayKey() })
          freezeWhenIdle()
        }, 0)
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined
        if (!p?.db?.tenants?.length) return { ...current, db: current.db.tenants.length ? current.db : buildSeed() }
        const delta = p.seededOn ? daysBetween(p.seededOn, todayKey()) : 0
        return { ...current, ...p, db: delta ? (rebase(p.db, delta) as DB) : p.db, seededOn: todayKey() }
      },
    },
  ),
)

// ── Derived helpers ─────────────────────────────────────────────────────────
export const useDB = () => useStore((s) => s.db)
export const useMe = () => useStore((s) => s.db.staff.find((x) => x.id === s.session.userId)!)
export const useCan = () => {
  const role = useMe().role
  const perms = useStore((s) => s.rolePermissions[role])
  return (p: Permission) => perms.includes(p)
}
/** Locations the signed-in user may see, honouring the location switcher. */
export const useVisibleLocations = (): ID[] => {
  const me = useMe()
  const loc = useStore((s) => s.session.locationId)
  const allowedAll = useStore((s) => s.rolePermissions[me.role].includes('locations.all'))
  const all = useStore((s) => s.db.locations.map((l) => l.id).join(','))
  const allowed = allowedAll ? all.split(',') : me.locationIds
  if (loc === 'all') return allowed
  return allowed.includes(loc) ? [loc] : allowed
}
export const patientName = (db: DB, id: ID) => { const p = db.patients.find((x) => x.id === id); return p ? `${p.firstName} ${p.lastName}` : id === 'walk-in' ? 'Walk-in customer' : 'Unknown' }
export const staffName = (db: DB, id: ID) => (id === 'system' ? 'System' : id === 'patient' ? 'Patient (portal)' : db.staff.find((x) => x.id === id)?.name ?? '—')
export const treatmentName = (db: DB, id: ID) => db.treatments.find((x) => x.id === id)?.name ?? '—'
export const locationName = (db: DB, id: ID) => db.locations.find((x) => x.id === id)?.name ?? '—'
export const roomName = (db: DB, id: ID) => db.locations.flatMap((l) => l.rooms).find((r) => r.id === id)?.name ?? '—'
export const cmsOf = (db: DB) => db.cms[TENANT_ID]
export const priceAt = (t: Treatment, locId?: ID) => (locId && t.locationPricing[locId]) || t.priceFrom
