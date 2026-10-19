import type {
  Appointment, AppointmentStatus, Automation, Campaign, CMS, CommissionEntry, DB, FormSubmission, FormTemplate,
  InjectionPoint, InventoryItem, Invoice, Lead, LeadStage, Location, Membership, MembershipPlan, Notification,
  PackageTemplate, Patient, PatientPackage, Payment, PaymentMethod, Photo, PurchaseOrder, ReviewRequest, ScheduledMessage,
  Staff, Supplier, Task, Tenant, Testimonial, Thread, Treatment, TreatmentSession, AuditEvent,
} from '@/lib/types'
import { IMG } from '@/lib/images'
import { FACE_SITES } from '@/lib/face'

// Deterministic RNG so every fresh install shows the same clinic.
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const TENANT_ID = 't_aurelia'
const T = TENANT_ID

export function buildSeed(): DB {
  const r = rng(20261018)
  const pick = <X,>(a: X[]) => a[Math.floor(r() * a.length)]
  const chance = (p: number) => r() < p
  const between = (a: number, b: number) => Math.floor(a + r() * (b - a + 1))

  const now = new Date()
  const today = new Date(now); today.setHours(0, 0, 0, 0)
  const day = (offset: number, h = 9, m = 0) => { const d = new Date(today); d.setDate(d.getDate() + offset); d.setHours(h, m, 0, 0); return d }
  const iso = (d: Date) => d.toISOString()
  const dateOnly = (d: Date) => iso(d).slice(0, 10)

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant: Tenant = {
    id: T, name: 'Aurelia Aesthetics', slug: 'aurelia', domain: 'aureliaaesthetics.com', plan: 'pro',
    createdAt: iso(day(-640)), timezone: 'America/Los_Angeles', currency: 'USD', taxRate: 0.095,
    brand: { primary: '#1E1C1A', accent: '#A8642A', logoText: 'Aurelia', displayFont: 'Cormorant Garamond', smsSender: 'AURELIA', emailFrom: 'care@aureliaaesthetics.com' },
    security: { mfaRequired: true, sessionTimeoutMin: 15, passwordMinLength: 12, retentionYears: 7, ipAllowlist: false },
  }

  // ── Locations ─────────────────────────────────────────────────────────────
  const locations: Location[] = [
    {
      id: 'loc_bh', tenantId: T, name: 'Beverly Hills', address: '9615 Brighton Way, Suite 300', city: 'Beverly Hills, CA 90210',
      phone: '(310) 555-0142', email: 'beverlyhills@aureliaaesthetics.com', image: IMG.beverly, active: true, lat: 34.068, lng: -118.401,
      hours: [{ days: 'Mon – Fri', time: '9:00 am – 7:00 pm' }, { days: 'Saturday', time: '9:00 am – 5:00 pm' }, { days: 'Sunday', time: 'Closed' }],
      rooms: [{ id: 'bh_r1', name: 'Suite Ivory', kind: 'Treatment' }, { id: 'bh_r2', name: 'Suite Linen', kind: 'Treatment' }, { id: 'bh_r3', name: 'Laser Room', kind: 'Laser' }, { id: 'bh_r4', name: 'Consult Lounge', kind: 'Consult' }],
    },
    {
      id: 'loc_sm', tenantId: T, name: 'Santa Monica', address: '1311 Montana Avenue', city: 'Santa Monica, CA 90403',
      phone: '(310) 555-0187', email: 'santamonica@aureliaaesthetics.com', image: IMG.santamonica, active: true, lat: 34.035, lng: -118.497,
      hours: [{ days: 'Tue – Sat', time: '10:00 am – 7:00 pm' }, { days: 'Monday', time: '10:00 am – 4:00 pm' }, { days: 'Sunday', time: 'Closed' }],
      rooms: [{ id: 'sm_r1', name: 'Suite Sage', kind: 'Treatment' }, { id: 'sm_r2', name: 'Suite Sand', kind: 'Treatment' }, { id: 'sm_r3', name: 'Procedure Room', kind: 'Procedure' }],
    },
  ]

  // ── Staff ─────────────────────────────────────────────────────────────────
  const baseStaff = { tenantId: T, active: true, leaveDays: 0, rating: 4.9 }
  const staff: Staff[] = [
    { ...baseStaff, id: 'st_owner', name: 'Victoria Hale', role: 'owner', title: 'Founder & Owner', email: 'victoria@aureliaaesthetics.com', phone: '(310) 555-0100', locationIds: ['loc_bh', 'loc_sm'], avatar: IMG.portrait2, bio: '', specialties: [], credentials: 'MBA', yearsExperience: 14, bookable: false, startDate: '2024-01-08', color: '#1E1C1A', commission: {}, certifications: [], workingDays: [1, 2, 3, 4, 5] },
    { ...baseStaff, id: 'st_carter', name: 'Dr. James Carter', role: 'doctor', title: 'Medical Director', email: 'jcarter@aureliaaesthetics.com', phone: '(310) 555-0111', locationIds: ['loc_bh', 'loc_sm'], avatar: IMG.docMale, bio: 'Board-certified dermatologist with fifteen years of experience in facial anatomy and regenerative aesthetics. Dr. Carter leads Aurelia’s clinical standards and trains every injector on the team.', specialties: ['Facial balancing', 'Laser resurfacing', 'PRP'], credentials: 'MD, FAAD', yearsExperience: 15, bookable: true, startDate: '2024-01-08', color: '#A8642A', commission: { Injectables: 0.12, Laser: 0.1, 'Hair Restoration': 0.1, Retail: 0.1, 'Cosmetic Dermatology': 0.1 }, certifications: [{ name: 'California Medical License', expires: dateOnly(day(410)) }, { name: 'Laser Safety Officer', expires: dateOnly(day(38)) }], workingDays: [1, 2, 3, 4, 5, 6], rating: 4.97 },
    { ...baseStaff, id: 'st_mitchell', name: 'Sarah Mitchell', role: 'injector', title: 'Lead Nurse Injector', email: 'smitchell@aureliaaesthetics.com', phone: '(310) 555-0123', locationIds: ['loc_bh'], avatar: IMG.docFemale, bio: 'Sarah is known for natural, beautifully balanced results. A registered nurse with advanced training in lip and jawline artistry, she believes the best work is the kind nobody can quite point to.', specialties: ['Lips', 'Neuromodulators', 'Jawline contouring'], credentials: 'RN, BSN, CANS', yearsExperience: 9, bookable: true, startDate: '2024-02-12', color: '#2E7CC0', commission: { Injectables: 0.15, Retail: 0.1, Packages: 0.05 }, certifications: [{ name: 'RN License', expires: dateOnly(day(220)) }, { name: 'Advanced Injector Certification', expires: dateOnly(day(510)) }], workingDays: [1, 2, 3, 4, 5, 6], rating: 4.98 },
    { ...baseStaff, id: 'st_stone', name: 'Rebecca Stone', role: 'aesthetician', title: 'Senior Medical Aesthetician', email: 'rstone@aureliaaesthetics.com', phone: '(310) 555-0134', locationIds: ['loc_sm', 'loc_bh'], avatar: IMG.docFemale2, bio: 'Rebecca designs skin programmes around long-term skin health — from HydraFacial and peels to collagen induction. Calm, precise and endlessly patient with first-timers.', specialties: ['HydraFacial', 'Chemical peels', 'Microneedling'], credentials: 'LE, CIDESCO', yearsExperience: 11, bookable: true, startDate: '2024-03-04', color: '#C2577A', commission: { 'Skin Treatments': 0.12, 'Facial Rejuvenation': 0.12, Wellness: 0.08, Retail: 0.12, Packages: 0.05 }, certifications: [{ name: 'Esthetician License', expires: dateOnly(day(300)) }], workingDays: [1, 2, 3, 4, 5, 6], rating: 4.95 },
    { ...baseStaff, id: 'st_manager', name: 'Laura Chen', role: 'manager', title: 'Clinic Manager', email: 'lchen@aureliaaesthetics.com', phone: '(310) 555-0145', locationIds: ['loc_bh'], avatar: IMG.portrait3, bio: '', specialties: [], credentials: '', yearsExperience: 8, bookable: false, startDate: '2024-01-15', color: '#6A4FA8', commission: { Packages: 0.03 }, certifications: [], workingDays: [1, 2, 3, 4, 5] },
    { ...baseStaff, id: 'st_reception', name: 'Daniel Park', role: 'receptionist', title: 'Patient Coordinator', email: 'dpark@aureliaaesthetics.com', phone: '(310) 555-0156', locationIds: ['loc_sm'], avatar: IMG.portrait1, bio: '', specialties: [], credentials: '', yearsExperience: 4, bookable: false, startDate: '2024-06-03', color: '#4E7A61', commission: {}, certifications: [], workingDays: [2, 3, 4, 5, 6] },
    { ...baseStaff, id: 'st_finance', name: 'Priya Nair', role: 'finance', title: 'Finance Lead', email: 'pnair@aureliaaesthetics.com', phone: '(310) 555-0167', locationIds: ['loc_bh', 'loc_sm'], avatar: IMG.portrait2, bio: '', specialties: [], credentials: 'CPA', yearsExperience: 10, bookable: false, startDate: '2024-04-01', color: '#B7802A', commission: {}, certifications: [], workingDays: [1, 2, 3, 4, 5] },
    { ...baseStaff, id: 'st_marketing', name: 'Natalie Brooks', role: 'marketing', title: 'Growth & Marketing', email: 'nbrooks@aureliaaesthetics.com', phone: '(310) 555-0178', locationIds: ['loc_bh', 'loc_sm'], avatar: IMG.portrait3, bio: '', specialties: [], credentials: '', yearsExperience: 6, bookable: false, startDate: '2024-05-20', color: '#2E7CC0', commission: {}, certifications: [], workingDays: [1, 2, 3, 4, 5] },
    { ...baseStaff, id: 'st_sales', name: 'Marcus Lee', role: 'sales', title: 'Aesthetic Consultant', email: 'mlee@aureliaaesthetics.com', phone: '(310) 555-0189', locationIds: ['loc_bh', 'loc_sm'], avatar: IMG.portrait1, bio: '', specialties: [], credentials: '', yearsExperience: 5, bookable: false, startDate: '2024-07-08', color: '#A8642A', commission: { Packages: 0.06 }, certifications: [], workingDays: [1, 2, 3, 4, 5, 6] },
  ]

  // ── Suppliers & inventory ─────────────────────────────────────────────────
  const suppliers: Supplier[] = [
    { id: 'sup_allergan', tenantId: T, name: 'Allergan Aesthetics', contact: 'Megan Ortiz', email: 'orders@allergan-rep.example', phone: '(800) 555-0110', terms: 'Net 30', balance: 4960 },
    { id: 'sup_galderma', tenantId: T, name: 'Galderma', contact: 'Ryan Hughes', email: 'accounts@galderma-rep.example', phone: '(800) 555-0120', terms: 'Net 30', balance: 0 },
    { id: 'sup_hydra', tenantId: T, name: 'HydraFacial Company', contact: 'Jenna Wu', email: 'supply@hydra-rep.example', phone: '(800) 555-0130', terms: 'Net 15', balance: 1180 },
    { id: 'sup_mckesson', tenantId: T, name: 'McKesson Medical-Surgical', contact: 'Support desk', email: 'orders@mckesson-rep.example', phone: '(800) 555-0140', terms: 'Net 30', balance: 312 },
    { id: 'sup_vitality', tenantId: T, name: 'Maison Vitale Laboratories', contact: 'Claire Dubois', email: 'wholesale@maisonvitale.example', phone: '(800) 555-0150', terms: 'Prepaid', balance: 0 },
  ]

  type InvSeed = Omit<InventoryItem, 'id' | 'tenantId' | 'locationId' | 'stock' | 'lots' | 'reserved'> & { bh: number; sm: number }
  const invSeed: InvSeed[] = [
    { name: 'Botox® 100U vial', sku: 'INJ-BTX-100', category: 'Injectables', supplierId: 'sup_allergan', unit: 'units', packSize: 100, cost: 620, price: 15, reorderLevel: 300, storage: 'Medical fridge A · 2–8°C', retail: false, bh: 640, sm: 180 },
    { name: 'Juvéderm® Voluma XC 1ml', sku: 'FIL-VOL-1', category: 'Fillers', supplierId: 'sup_allergan', unit: 'syringes', packSize: 1, cost: 340, price: 850, reorderLevel: 6, storage: 'Cabinet B2', retail: false, bh: 11, sm: 5 },
    { name: 'Restylane® Kysse 1ml', sku: 'FIL-KYS-1', category: 'Fillers', supplierId: 'sup_galderma', unit: 'syringes', packSize: 1, cost: 305, price: 750, reorderLevel: 6, storage: 'Cabinet B2', retail: false, bh: 4, sm: 7 },
    { name: 'HydraFacial Signature tip kit', sku: 'SKN-HYD-KIT', category: 'Skin Products', supplierId: 'sup_hydra', unit: 'kits', packSize: 1, cost: 42, price: 0, reorderLevel: 15, storage: 'Treatment store 1', retail: false, bh: 26, sm: 31 },
    { name: 'Medical-grade peel kit (TCA 20%)', sku: 'SKN-PEEL-20', category: 'Skin Products', supplierId: 'sup_mckesson', unit: 'kits', packSize: 1, cost: 58, price: 0, reorderLevel: 6, storage: 'Treatment store 1', retail: false, bh: 9, sm: 5 },
    { name: 'Microneedling cartridge 12-pin', sku: 'CON-MN-12', category: 'Consumables', supplierId: 'sup_mckesson', unit: 'pcs', packSize: 1, cost: 18, price: 0, reorderLevel: 20, storage: 'Treatment store 2', retail: false, bh: 44, sm: 36 },
    { name: 'PRP separation kit', sku: 'MED-PRP-KIT', category: 'Medical Supplies', supplierId: 'sup_mckesson', unit: 'kits', packSize: 1, cost: 95, price: 0, reorderLevel: 4, storage: 'Procedure store', retail: false, bh: 7, sm: 3 },
    { name: 'Topical anaesthetic 30g', sku: 'MED-NUMB-30', category: 'Medical Supplies', supplierId: 'sup_mckesson', unit: 'tubes', packSize: 1, cost: 22, price: 0, reorderLevel: 6, storage: 'Treatment store 2', retail: false, bh: 14, sm: 9 },
    { name: 'Hypodermic needle 30G ½"', sku: 'NDL-30G', category: 'Needles', supplierId: 'sup_mckesson', unit: 'pcs', packSize: 100, cost: 14, price: 0, reorderLevel: 200, storage: 'Sharps cabinet', retail: false, bh: 820, sm: 410 },
    { name: 'Luer-lock syringe 1ml', sku: 'SYR-1ML', category: 'Syringes', supplierId: 'sup_mckesson', unit: 'pcs', packSize: 100, cost: 19, price: 0, reorderLevel: 150, storage: 'Sharps cabinet', retail: false, bh: 560, sm: 120 },
    { name: 'Fractional laser tip', sku: 'CON-LZR-TIP', category: 'Consumables', supplierId: 'sup_mckesson', unit: 'pcs', packSize: 1, cost: 85, price: 0, reorderLevel: 4, storage: 'Laser room', retail: false, bh: 9, sm: 0 },
    { name: 'IV vitamin infusion set', sku: 'MED-IV-SET', category: 'Medical Supplies', supplierId: 'sup_mckesson', unit: 'sets', packSize: 1, cost: 48, price: 0, reorderLevel: 5, storage: 'Procedure store', retail: false, bh: 0, sm: 12 },
    { name: 'Aurelia Vitamin C Serum 30ml', sku: 'RTL-VITC-30', category: 'Retail', supplierId: 'sup_vitality', unit: 'pcs', packSize: 1, cost: 34, price: 95, reorderLevel: 8, storage: 'Front display', retail: true, bh: 22, sm: 14 },
    { name: 'Barrier Repair Cream 50ml', sku: 'RTL-BRC-50', category: 'Retail', supplierId: 'sup_vitality', unit: 'pcs', packSize: 1, cost: 26, price: 72, reorderLevel: 8, storage: 'Front display', retail: true, bh: 18, sm: 6 },
    { name: 'Mineral Sunscreen SPF 50', sku: 'RTL-SPF-50', category: 'Retail', supplierId: 'sup_vitality', unit: 'pcs', packSize: 1, cost: 16, price: 48, reorderLevel: 10, storage: 'Front display', retail: true, bh: 31, sm: 24 },
    { name: 'Hydrating B5 Gel 30ml', sku: 'RTL-B5-30', category: 'Retail', supplierId: 'sup_vitality', unit: 'pcs', packSize: 1, cost: 22, price: 64, reorderLevel: 8, storage: 'Front display', retail: true, bh: 12, sm: 9 },
    { name: 'Retinal Night Renewal 30ml', sku: 'RTL-RTN-30', category: 'Retail', supplierId: 'sup_vitality', unit: 'pcs', packSize: 1, cost: 38, price: 110, reorderLevel: 6, storage: 'Front display', retail: true, bh: 9, sm: 3 },
  ]
  const inventory: InventoryItem[] = []
  invSeed.forEach((s, i) => {
    const { bh, sm, ...rest } = s
    ;([['loc_bh', bh], ['loc_sm', sm]] as const).forEach(([loc, qty]) => {
      const expiringSoon = i === 1 || i === 4 || i === 13
      const lots = qty > 0
        ? [
            { lot: `${s.sku.split('-')[1]}${2400 + i * 7}A`, expiry: dateOnly(day(expiringSoon && loc === 'loc_bh' ? 24 : 160 + i * 9)), qty: Math.ceil(qty * 0.4) },
            { lot: `${s.sku.split('-')[1]}${2500 + i * 7}B`, expiry: dateOnly(day(320 + i * 11)), qty: qty - Math.ceil(qty * 0.4) },
          ].filter((l) => l.qty > 0)
        : []
      inventory.push({ ...rest, id: `inv_${s.sku.toLowerCase()}_${loc.slice(4)}`, tenantId: T, locationId: loc, stock: qty, reserved: 0, lots })
    })
  })

  // ── Treatments ────────────────────────────────────────────────────────────
  const tx = (t: Omit<Treatment, 'tenantId' | 'seo' | 'active' | 'onlineBookable' | 'featured' | 'locationPricing' | 'requiresIntake' | 'usesInjectionMap'> & Partial<Treatment>): Treatment => ({
    tenantId: T, active: true, onlineBookable: true, featured: false, requiresIntake: true, usesInjectionMap: false,
    locationPricing: {}, seo: { title: `${t.name} in Beverly Hills & Santa Monica | Aurelia Aesthetics`, description: t.tagline }, ...t,
  })
  const treatments: Treatment[] = [
    tx({
      id: 'tx_botox', slug: 'botox', name: 'Botox', category: 'Injectables', featured: true, usesInjectionMap: true, consentFormId: 'form_botox',
      tagline: 'Soften expression lines while keeping every bit of you.',
      description: 'A precise neuromodulator treatment that relaxes the muscles responsible for dynamic lines — forehead, frown lines and crow’s feet — for a rested, natural look.',
      priceFrom: 450, priceNote: 'From $15 per unit · most patients use 20–40 units', locationPricing: { loc_sm: 420 }, duration: 30, deposit: 50,
      concerns: ['Wrinkles', 'Fine lines', 'Jawline'],
      benefits: ['Smooths forehead lines, frown lines and crow’s feet', 'Prevents deeper creases forming', 'Results that look like you on a good day', 'Quick, comfortable, no downtime'],
      howItWorks: 'Tiny, precisely-mapped injections temporarily relax targeted muscles. Your practitioner charts every point and unit so future sessions can be refined with accuracy.',
      results: 'Visible from day 3–5, with full results at two weeks. Results typically last 3–4 months.', downtime: 'None — return to your day immediately', sessions: 'Every 3–4 months',
      preparation: ['Avoid alcohol 24 hours before', 'Pause fish oil and ibuprofen for 3 days if possible', 'Arrive with a clean face'],
      aftercare: ['Stay upright for 4 hours', 'No strenuous exercise for 24 hours', 'Avoid rubbing or massaging the area', 'Skip facials and saunas for 48 hours'],
      contraindications: ['Pregnancy or breastfeeding', 'Neuromuscular disorders', 'Active infection at the site', 'Known allergy to botulinum toxin'],
      faqs: [{ q: 'Will I still look like myself?', a: 'Yes. Our approach is conservative and charted — we aim for softened lines, never a frozen expression.' }, { q: 'Does it hurt?', a: 'Most patients describe a brief pinch. We use ultra-fine needles and can apply topical numbing.' }, { q: 'How long does it take?', a: 'About 30 minutes including consultation and mapping.' }],
      practitionerIds: ['st_carter', 'st_mitchell'], locationIds: ['loc_bh', 'loc_sm'],
      consumables: [{ sku: 'INJ-BTX-100', qty: 24 }, { sku: 'NDL-30G', qty: 4 }, { sku: 'SYR-1ML', qty: 1 }], image: IMG.facial,
    }),
    tx({
      id: 'tx_lip', slug: 'lip-filler', name: 'Lip Filler', category: 'Injectables', featured: true, usesInjectionMap: true, consentFormId: 'form_filler',
      tagline: 'Definition, hydration and balance — tailored to your proportions.',
      description: 'Hyaluronic acid filler to restore volume, refine the border and improve symmetry. We favour soft, proportionate results that move naturally.',
      priceFrom: 750, priceNote: 'Per 1ml syringe', duration: 45, deposit: 100, concerns: ['Lips', 'Volume loss'],
      benefits: ['Soft, natural volume', 'Defined lip border', 'Improved symmetry', 'Reversible hyaluronic acid'],
      howItWorks: 'After numbing, a fine cannula or needle places hyaluronic acid in measured micro-deposits, sculpting shape and hydration.',
      results: 'Immediate, settling over two weeks. Lasts 6–12 months.', downtime: '1–3 days of mild swelling', sessions: 'Single session, maintenance every 6–12 months',
      preparation: ['Avoid blood thinners for 5 days if medically safe', 'Book at least two weeks before an event', 'Tell us about any history of cold sores'],
      aftercare: ['Cold compress for swelling', 'Avoid hot drinks and straws for 24 hours', 'No lipstick for 12 hours', 'Sleep slightly elevated the first night'],
      contraindications: ['Pregnancy or breastfeeding', 'Active cold sores', 'Autoimmune flare', 'Hyaluronic acid allergy'],
      faqs: [{ q: 'Can it be dissolved?', a: 'Yes. Hyaluronic acid filler can be dissolved with hyaluronidase if ever needed.' }, { q: 'Will it look overdone?', a: 'We build gradually. Most first treatments use 0.5–1ml.' }],
      practitionerIds: ['st_mitchell', 'st_carter'], locationIds: ['loc_bh', 'loc_sm'],
      consumables: [{ sku: 'FIL-KYS-1', qty: 1 }, { sku: 'NDL-30G', qty: 2 }, { sku: 'MED-NUMB-30', qty: 1 }], image: IMG.lips,
    }),
    tx({
      id: 'tx_filler', slug: 'dermal-filler', name: 'Dermal Filler', category: 'Facial Rejuvenation', usesInjectionMap: true, consentFormId: 'form_filler',
      tagline: 'Restore structure to cheeks, jawline and chin.',
      description: 'Facial balancing with premium hyaluronic acid to rebuild lost volume, define the jawline and soften folds — planned around your facial architecture.',
      priceFrom: 850, priceNote: 'Per 1ml syringe', duration: 60, deposit: 100, concerns: ['Volume loss', 'Jawline', 'Wrinkles'],
      benefits: ['Lifted midface', 'Sculpted jawline and chin', 'Softened nasolabial folds', 'Long-lasting, natural structure'],
      howItWorks: 'We map your facial proportions, then place filler at deep structural points to lift and support — rather than simply filling lines.',
      results: 'Immediate, refining over 2 weeks. Lasts 12–18 months.', downtime: '1–3 days, possible bruising', sessions: 'Usually one session, top-up at 12 months',
      preparation: ['Avoid blood thinners for 5 days if medically safe', 'No dental work 2 weeks either side'],
      aftercare: ['Avoid pressure on treated areas', 'No exercise for 24 hours', 'Sleep on your back for 2 nights'],
      contraindications: ['Pregnancy or breastfeeding', 'Active skin infection', 'Recent dental procedures'],
      faqs: [{ q: 'How many syringes will I need?', a: 'It depends on goals — we will give you a clear plan and price at consultation.' }],
      practitionerIds: ['st_carter', 'st_mitchell'], locationIds: ['loc_bh', 'loc_sm'],
      consumables: [{ sku: 'FIL-VOL-1', qty: 2 }, { sku: 'NDL-30G', qty: 2 }, { sku: 'MED-NUMB-30', qty: 1 }], image: IMG.portrait1,
    }),
    tx({
      id: 'tx_hydra', slug: 'hydrafacial', name: 'Hydrafacial', category: 'Skin Treatments', featured: true, requiresIntake: false,
      tagline: 'Deep cleanse, gentle exfoliation and lasting hydration in one visit.',
      description: 'A multi-step facial that cleanses, extracts and infuses the skin with antioxidants and hyaluronic acid. Instantly brighter, with no downtime.',
      priceFrom: 180, locationPricing: { loc_sm: 175 }, duration: 45, deposit: 0, concerns: ['Dullness', 'Skin texture', 'Acne', 'Pigmentation'],
      benefits: ['Instant glow', 'Clearer pores', 'Deep hydration', 'Suitable for all skin types'],
      howItWorks: 'Vortex technology cleanses and exfoliates, painless suction clears pores, then a tailored serum infusion hydrates and protects.',
      results: 'Immediate radiance. Best maintained monthly.', downtime: 'None', sessions: 'Monthly for ongoing skin health',
      preparation: ['Avoid retinoids for 48 hours', 'No waxing of the face for 1 week'],
      aftercare: ['Apply SPF daily', 'Skip makeup for 6 hours', 'Avoid exfoliants for 48 hours'],
      contraindications: ['Active rash or sunburn', 'Recent isotretinoin use'],
      faqs: [{ q: 'Is it suitable before an event?', a: 'Perfect — it is our most popular pre-event treatment, with zero downtime.' }],
      practitionerIds: ['st_stone'], locationIds: ['loc_bh', 'loc_sm'], consumables: [{ sku: 'SKN-HYD-KIT', qty: 1 }], image: IMG.skincare,
    }),
    tx({
      id: 'tx_microneedling', slug: 'microneedling', name: 'Microneedling', category: 'Skin Treatments', consentFormId: 'form_microneedling',
      tagline: 'Stimulate collagen for smoother, firmer skin.',
      description: 'Collagen induction therapy that improves texture, acne scarring and fine lines by triggering the skin’s own repair process.',
      priceFrom: 395, duration: 60, deposit: 75, concerns: ['Skin texture', 'Acne', 'Fine lines', 'Pigmentation'],
      benefits: ['Refined texture and pores', 'Softened acne scars', 'Firmer, thicker skin', 'Brighter tone'],
      howItWorks: 'A sterile cartridge of fine needles creates controlled micro-channels, signalling the skin to produce new collagen and elastin.',
      results: 'Glow within a week; structural change builds over 3 months.', downtime: '24–48 hours of redness', sessions: '3 sessions, 4–6 weeks apart',
      preparation: ['Stop retinoids 5 days prior', 'Avoid sun exposure for 1 week'],
      aftercare: ['Gentle cleanser only for 48 hours', 'No makeup for 24 hours', 'Strict SPF for 2 weeks'],
      contraindications: ['Active acne breakout', 'Keloid scarring', 'Isotretinoin in last 6 months'],
      faqs: [{ q: 'How many sessions?', a: 'We recommend a series of three for the best collagen response.' }],
      practitionerIds: ['st_stone', 'st_carter'], locationIds: ['loc_bh', 'loc_sm'], consumables: [{ sku: 'CON-MN-12', qty: 1 }, { sku: 'MED-NUMB-30', qty: 1 }], image: IMG.serum,
    }),
    tx({
      id: 'tx_peel', slug: 'chemical-peel', name: 'Chemical Peel', category: 'Skin Treatments', requiresIntake: true,
      tagline: 'Resurface for clarity, tone and luminosity.',
      description: 'Medical-grade peels tailored to your skin type to address pigmentation, congestion and dullness.',
      priceFrom: 250, duration: 40, deposit: 0, concerns: ['Pigmentation', 'Acne', 'Dullness', 'Skin texture'],
      benefits: ['More even tone', 'Reduced congestion', 'Smoother texture', 'Luminous finish'],
      howItWorks: 'A carefully selected acid blend lifts damaged surface cells to reveal fresher skin beneath.',
      results: 'Visible after peeling completes (5–7 days).', downtime: '3–7 days of light peeling', sessions: 'Series of 2–4, monthly',
      preparation: ['Stop retinoids 5 days prior', 'No waxing for 1 week'],
      aftercare: ['Do not pick peeling skin', 'Bland moisturiser and SPF 50'],
      contraindications: ['Pregnancy', 'Active cold sores', 'Recent sunburn'], faqs: [],
      practitionerIds: ['st_stone'], locationIds: ['loc_bh', 'loc_sm'], consumables: [{ sku: 'SKN-PEEL-20', qty: 1 }], image: IMG.spa,
    }),
    tx({
      id: 'tx_laser', slug: 'laser-resurfacing', name: 'Laser Resurfacing', category: 'Laser', consentFormId: 'form_laser',
      tagline: 'Renew texture, tone and firmness with fractional laser.',
      description: 'Fractional laser treatment for sun damage, fine lines, scarring and uneven tone — performed by our medical team.',
      priceFrom: 1200, duration: 75, deposit: 200, concerns: ['Wrinkles', 'Pigmentation', 'Skin texture', 'Acne'],
      benefits: ['Significant textural improvement', 'Reduced sun damage', 'Tighter skin', 'Long-lasting results'],
      howItWorks: 'Microscopic laser columns treat a fraction of the skin at a time, triggering rapid healing and remodelling.',
      results: 'Visible from 2 weeks, improving for 6 months.', downtime: '5–7 days', sessions: '1–3 sessions',
      preparation: ['No tanning for 4 weeks', 'Antiviral prophylaxis if prescribed'],
      aftercare: ['Occlusive balm as directed', 'Strict sun avoidance for 4 weeks'],
      contraindications: ['Pregnancy', 'Darker skin types without test patch', 'Photosensitising medication'], faqs: [],
      practitionerIds: ['st_carter'], locationIds: ['loc_bh'], consumables: [{ sku: 'CON-LZR-TIP', qty: 1 }, { sku: 'MED-NUMB-30', qty: 1 }], image: IMG.laser,
    }),
    tx({
      id: 'tx_prp', slug: 'prp-hair-restoration', name: 'PRP Hair Restoration', category: 'Hair Restoration', consentFormId: 'form_botox',
      tagline: 'Your own growth factors, working to strengthen thinning hair.',
      description: 'Platelet-rich plasma drawn from your own blood is concentrated and delivered to the scalp to support follicle health and density.',
      priceFrom: 650, duration: 60, deposit: 100, concerns: ['Hair loss'],
      benefits: ['Thicker-looking hair', 'Reduced shedding', 'Natural, drug-free option'],
      howItWorks: 'A small blood draw is spun to isolate platelets, then micro-injected across thinning areas of the scalp.',
      results: 'Reduced shedding at 6–8 weeks; density gains by 4–6 months.', downtime: 'None to minimal', sessions: '3 sessions monthly, then every 6 months',
      preparation: ['Hydrate well', 'Wash hair the morning of treatment'], aftercare: ['No hair wash for 12 hours', 'Avoid hair dye for 72 hours'],
      contraindications: ['Blood disorders', 'Anticoagulants', 'Active scalp infection'], faqs: [],
      practitionerIds: ['st_carter'], locationIds: ['loc_bh', 'loc_sm'], consumables: [{ sku: 'MED-PRP-KIT', qty: 1 }], image: IMG.hair,
    }),
    tx({
      id: 'tx_iv', slug: 'iv-vitality-drip', name: 'IV Vitality Drip', category: 'Wellness', requiresIntake: true,
      tagline: 'Hydration and micronutrients, delivered calmly.',
      description: 'A physician-formulated infusion of vitamins, minerals and antioxidants to support energy and skin.',
      priceFrom: 225, duration: 45, deposit: 0, concerns: ['Dullness'], benefits: ['Rapid hydration', 'Glow-supporting antioxidants'],
      howItWorks: 'A nurse places a fine IV line and you relax while the infusion runs.', results: 'Most patients feel the effects same day.', downtime: 'None', sessions: 'As desired',
      preparation: ['Eat a light meal beforehand'], aftercare: ['Keep the site clean for a few hours'], contraindications: ['Kidney or heart conditions'], faqs: [],
      practitionerIds: ['st_stone'], locationIds: ['loc_sm'], consumables: [{ sku: 'MED-IV-SET', qty: 1 }], image: IMG.wellness,
    }),
    tx({
      id: 'tx_body', slug: 'body-contouring', name: 'Body Contouring', category: 'Body Treatments', onlineBookable: false,
      tagline: 'Non-surgical sculpting for stubborn areas.',
      description: 'Non-invasive contouring to reduce resistant fat and refine body shape — by consultation only.',
      priceFrom: 900, duration: 60, deposit: 100, concerns: ['Body contouring'], benefits: ['Non-surgical', 'Targeted, gradual results'],
      howItWorks: 'Controlled energy targets fat cells beneath the skin, which the body naturally clears over the following weeks.', results: 'Visible at 8–12 weeks.', downtime: 'None', sessions: '2–4 sessions',
      preparation: [], aftercare: ['Light massage of treated area'], contraindications: ['Pregnancy', 'Hernia at the site'], faqs: [],
      practitionerIds: ['st_carter'], locationIds: ['loc_bh'], consumables: [], image: IMG.body,
    }),
    tx({
      id: 'tx_consult', slug: 'skin-consultation', name: 'Aesthetic Consultation', category: 'Cosmetic Dermatology', requiresIntake: true,
      tagline: 'A considered plan, built around you.',
      description: 'A 30-minute consultation with skin analysis, goals discussion and a personalised treatment plan. Your $50 deposit is credited to your first treatment.',
      priceFrom: 0, priceNote: 'Complimentary · $50 deposit credited to treatment', duration: 30, deposit: 50, concerns: ['Wrinkles', 'Fine lines', 'Acne', 'Pigmentation', 'Lips', 'Jawline', 'Skin texture', 'Hair loss', 'Body contouring', 'Volume loss', 'Dullness'],
      benefits: ['Clinical skin analysis', 'Personalised plan and pricing', 'No pressure, ever'],
      howItWorks: 'We listen first, assess your skin and anatomy, then outline options with honest expectations.', results: 'A clear plan you can act on.', downtime: 'None', sessions: 'Once',
      preparation: ['Arrive with a clean face if possible'], aftercare: [], contraindications: [], faqs: [],
      practitionerIds: ['st_carter', 'st_mitchell', 'st_stone'], locationIds: ['loc_bh', 'loc_sm'], consumables: [], image: IMG.clinic,
    }),
  ]

  // ── Patients ──────────────────────────────────────────────────────────────
  const named: [string, string][] = [['Emma', 'Roberts'], ['Olivia', 'Smith'], ['Mia', 'Johnson'], ['Sophia', 'Williams'], ['Charlotte', 'Brown']]
  const firsts = ['Ava', 'Isabella', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Ella', 'Grace', 'Chloe', 'Victoria', 'Lily', 'Hannah', 'Zoe', 'Natalie', 'Leah', 'Audrey', 'Claire', 'Stella', 'Lucy', 'Madeline', 'Nora', 'Camila', 'Sienna', 'Julia', 'Ruby', 'Hazel', 'Ivy', 'Elena', 'Daniel', 'Michael', 'Ryan', 'Alexander', 'Nathan', 'Priya', 'Mei', 'Aaliyah', 'Gabriela', 'Noah', 'Layla', 'Serena', 'Jade', 'Valentina', 'Eliza', 'Margot', 'Tessa']
  const lasts = ['Anderson', 'Thompson', 'Garcia', 'Martinez', 'Davis', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Nguyen', 'Kim', 'Patel', 'Rossi', 'Laurent', 'Bennett', 'Hayes', 'Reed', 'Sullivan']
  const sources = ['Google search', 'Instagram', 'Referral', 'Google Ads', 'Walk-in', 'Meta Ads', 'Returning patient']
  const allNames: [string, string][] = [...named]
  while (allNames.length < 64) {
    const n: [string, string] = [pick(firsts), pick(lasts)]
    if (!allNames.some(([a, b]) => a === n[0] && b === n[1])) allNames.push(n)
  }
  const patients: Patient[] = allNames.map(([f, l], i) => {
    const loc = i % 3 === 2 ? 'loc_sm' : 'loc_bh'
    return {
      id: i === 0 ? 'pt_emma' : `pt_${f.toLowerCase()}_${l.toLowerCase()}`, tenantId: T, firstName: f, lastName: l,
      email: `${f.toLowerCase()}.${l.toLowerCase()}@${pick(['gmail.com', 'icloud.com', 'outlook.com', 'me.com'])}`,
      phone: `(${pick(['310', '424', '323', '818'])}) 555-${String(1000 + Math.floor(r() * 8999)).slice(0, 4)}`,
      dob: dateOnly(day(-365 * between(26, 58) - between(0, 360))),
      since: iso(day(-between(70, 620))), locationId: loc,
      preferredPractitionerId: pick(['st_carter', 'st_mitchell', 'st_stone']), source: pick(sources), tags: [],
      alerts: [], allergies: chance(0.2) ? [pick(['Penicillin', 'Lidocaine', 'Latex', 'Aspirin'])] : [], medications: chance(0.25) ? [pick(['Levothyroxine', 'Oral contraceptive', 'Spironolactone', 'Vitamin D'])] : [],
      conditions: [], pregnancy: 'Not pregnant', address: `${between(100, 2999)} ${pick(['Wilshire Blvd', 'Montana Ave', 'Ocean Park Blvd', 'Sunset Blvd', 'Rodeo Dr', 'San Vicente Blvd'])}, Los Angeles, CA`,
      emergencyContact: { name: `${pick(firsts)} ${l}`, phone: `(310) 555-${between(1000, 9999)}`, relation: pick(['Partner', 'Sister', 'Mother', 'Friend']) },
      notify: { email: true, sms: true, push: chance(0.5), marketing: chance(0.7) }, notes: [], treatmentPlan: [],
    }
  })
  const emma = patients[0]
  Object.assign(emma, {
    email: 'emma.roberts@icloud.com', phone: '(310) 555-2874', dob: '1991-04-12', since: iso(day(-540)), locationId: 'loc_bh',
    preferredPractitionerId: 'st_mitchell', source: 'Instagram', tags: ['VIP', 'Glow Club'], allergies: ['Lidocaine (mild)'],
    alerts: ['Mild lidocaine sensitivity — use plain topical numbing'], medications: ['Oral contraceptive'], avatar: IMG.portrait1,
    address: '412 N Camden Dr, Beverly Hills, CA 90210', emergencyContact: { name: 'Thomas Roberts', phone: '(310) 555-9921', relation: 'Partner' },
    notify: { email: true, sms: true, push: true, marketing: true },
    notes: [{ id: 'n1', at: iso(day(-40)), by: 'st_mitchell', text: 'Prefers subtle results. Happy with 12u forehead; consider 2u more on left brow next visit.' }],
    treatmentPlan: [{ id: 'tp1', title: 'Neuromodulator maintenance', status: 'In progress', target: 'Every 14 weeks' }, { id: 'tp2', title: 'Glow Package — HydraFacial & peel series', status: 'In progress', target: 'Complete by Dec' }, { id: 'tp3', title: 'Lip refresh 0.5ml', status: 'Planned', target: 'Spring' }],
  } satisfies Partial<Patient>)
  patients[1].alerts = ['History of cold sores — antiviral before lip treatments']; patients[1].conditions = ['HSV-1']
  patients[3].pregnancy = 'Breastfeeding'; patients[3].alerts = ['Breastfeeding — no neuromodulators or fillers']
  patients[4].tags = ['VIP']

  // ── Memberships & packages ────────────────────────────────────────────────
  const membershipPlans: MembershipPlan[] = [
    { id: 'mp_essential', tenantId: T, name: 'Essentials', price: 79, tagline: 'Skin maintenance, simplified.', benefits: ['1 express peel or facial monthly', '5% off all treatments', 'Members-only events'], monthlyCredit: { treatmentId: 'tx_peel', qty: 1 }, discountPct: 0.05, active: true },
    { id: 'mp_glow', tenantId: T, name: 'Glow Club', price: 149, tagline: 'Our most-loved membership.', benefits: ['1 Hydrafacial monthly', '10% off treatments', 'Priority booking', 'Birthday benefit', 'Exclusive member pricing'], monthlyCredit: { treatmentId: 'tx_hydra', qty: 1 }, discountPct: 0.1, active: true },
    { id: 'mp_signature', tenantId: T, name: 'Signature', price: 299, tagline: 'The complete Aurelia experience.', benefits: ['1 Hydrafacial monthly', '20 units Botox each quarter', '15% off treatments and skincare', 'Priority booking and concierge line', 'Complimentary annual skin analysis'], monthlyCredit: { treatmentId: 'tx_hydra', qty: 1 }, discountPct: 0.15, active: true },
  ]
  const memberships: Membership[] = []
  patients.forEach((p, i) => {
    if (i === 0 || (i > 4 && chance(0.42)) || i === 2) {
      const planId = i === 0 ? 'mp_glow' : pick(['mp_glow', 'mp_glow', 'mp_essential', 'mp_signature'])
      const status: Membership['status'] = i === 0 ? 'Active' : chance(0.07) ? 'Past Due' : chance(0.05) ? 'Cancel Requested' : 'Active'
      const started = day(-between(30, 400))
      const renew = new Date(today); renew.setDate(started.getDate()); if (renew <= today) renew.setMonth(renew.getMonth() + 1)
      memberships.push({ id: `mem_${p.id}`, tenantId: T, planId, patientId: p.id, startedAt: iso(started), renewsAt: iso(renew), status, credits: i === 0 ? 1 : between(0, 2), paymentMethod: `${pick(['Visa', 'Mastercard', 'Amex'])} •••• ${between(1000, 9999)}` })
    }
  })
  memberships.push({ id: 'mem_old1', tenantId: T, planId: 'mp_glow', patientId: patients[9].id, startedAt: iso(day(-300)), renewsAt: iso(day(-20)), status: 'Cancelled', credits: 0, paymentMethod: 'Visa •••• 4412', cancelledAt: iso(day(-20)) })
  memberships.find((m) => m.patientId === 'pt_emma')!.paymentMethod = 'Visa •••• 4242'

  const packageTemplates: PackageTemplate[] = [
    { id: 'pk_glow', tenantId: T, name: 'Glow Package', description: '3 Hydrafacials and 2 Chemical Peels for luminous, even skin.', price: 899, items: [{ treatmentId: 'tx_hydra', qty: 3 }, { treatmentId: 'tx_peel', qty: 2 }], expiryMonths: 6, transferable: false, active: true },
    { id: 'pk_renewal', tenantId: T, name: 'Collagen Renewal Series', description: 'A course of 3 microneedling sessions for texture and scarring.', price: 995, items: [{ treatmentId: 'tx_microneedling', qty: 3 }], expiryMonths: 9, transferable: false, active: true },
    { id: 'pk_smooth', tenantId: T, name: 'Smooth Year', description: 'Three Botox sessions across the year at a preferred rate.', price: 1250, items: [{ treatmentId: 'tx_botox', qty: 3 }], expiryMonths: 12, transferable: true, active: true },
    { id: 'pk_hair', tenantId: T, name: 'Hair Revival Programme', description: 'Three monthly PRP sessions plus a six-month maintenance session.', price: 1990, items: [{ treatmentId: 'tx_prp', qty: 4 }], expiryMonths: 12, transferable: false, active: true },
  ]
  const patientPackages: PatientPackage[] = [
    { id: 'pp_emma_glow', tenantId: T, templateId: 'pk_glow', patientId: 'pt_emma', purchasedAt: iso(day(-70)), expiresAt: iso(day(112)), items: [{ treatmentId: 'tx_hydra', qty: 3, used: 2 }, { treatmentId: 'tx_peel', qty: 2, used: 1 }], status: 'Active' },
  ]
  patients.slice(5, 22).forEach((p, i) => {
    if (i % 3 !== 0) return
    const tpl = pick(packageTemplates)
    const items = tpl.items.map((it) => ({ ...it, used: between(0, it.qty - 1) }))
    patientPackages.push({ id: `pp_${p.id}`, tenantId: T, templateId: tpl.id, patientId: p.id, purchasedAt: iso(day(-between(20, 150))), expiresAt: iso(day(between(9, 200))), items, status: 'Active' })
  })

  // ── Appointments, invoices, payments, commissions, sessions ───────────────
  const appointments: Appointment[] = []
  const invoices: Invoice[] = []
  const payments: Payment[] = []
  const commissions: CommissionEntry[] = []
  const sessions: TreatmentSession[] = []
  let invNo = 10420
  const treatmentById = Object.fromEntries(treatments.map((t) => [t.id, t]))
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]))
  const memberOf = (pid: string) => memberships.find((m) => m.patientId === pid && m.status !== 'Cancelled')
  const planOf = (m?: Membership) => membershipPlans.find((p) => p.id === m?.planId)

  // Which practitioner works where on which weekday (Carter alternates).
  const rota = (dow: number): { st: string; loc: string; rooms: string[] }[] => {
    if (dow === 0) return []
    const out = [{ st: 'st_mitchell', loc: 'loc_bh', rooms: ['bh_r1', 'bh_r4'] }, { st: 'st_stone', loc: dow === 3 ? 'loc_bh' : 'loc_sm', rooms: dow === 3 ? ['bh_r2'] : ['sm_r1', 'sm_r2'] }]
    out.push({ st: 'st_carter', loc: dow % 2 === 1 ? 'loc_bh' : 'loc_sm', rooms: dow % 2 === 1 ? ['bh_r3', 'bh_r2'] : ['sm_r3'] })
    return out
  }

  const nowMs = now.getTime()
  const sessionCount = new Map<string, number>() // patient|treatment → sessions so far (O(1) session numbering)
  // Mostly local patients, sometimes one from the other clinic. Pools are built once (this used to
  // re-filter every patient, with an RNG call each, for every one of ~1,000 appointments).
  const localPool = Object.fromEntries(locations.map((l) => [l.id, patients.filter((p) => p.locationId === l.id)]))
  const pickPatient = (loc: string) => pick(chance(0.25) ? patients : localPool[loc])

  for (let off = -84; off <= 16; off++) {
    const date = day(off)
    const dow = date.getDay()
    for (const slot of rota(dow)) {
      const s = staffById[slot.st]
      const options = treatments.filter((t) => t.practitionerIds.includes(s.id) && t.locationIds.includes(slot.loc) && t.active)
      let minute = 9 * 60 + (slot.loc === 'loc_sm' ? 60 : 0) + between(0, 1) * 30
      const count = off > 7 ? between(1, 3) : between(3, 5)
      for (let k = 0; k < count && minute < 17 * 60 + 30; k++) {
        const t = pick(options)
        const p = pickPatient(slot.loc)
        const start = day(off, Math.floor(minute / 60), minute % 60)
        const end = start.getTime() + t.duration * 60000
        const price = t.locationPricing[slot.loc] ?? t.priceFrom
        let status: AppointmentStatus
        if (end < nowMs) status = chance(0.035) ? 'No Show' : chance(0.05) ? 'Cancelled' : 'Completed'
        else if (start.getTime() <= nowMs) status = 'In Treatment'
        else if (off === 0) status = start.getTime() - nowMs < 3600000 ? 'Checked In' : 'Confirmed'
        else status = chance(off > 5 ? 0.3 : 0.12) ? 'Requested' : 'Confirmed'
        const a: Appointment = {
          id: `ap_${off + 100}_${slot.st.slice(3)}_${k}`, tenantId: T, patientId: p.id, treatmentId: t.id, practitionerId: s.id, locationId: slot.loc,
          roomId: pick(slot.rooms), start: iso(start), duration: t.duration, status, price, deposit: t.deposit, depositPaid: t.deposit > 0 && status !== 'Requested',
          notes: '', internalNotes: '', intake: !t.requiresIntake ? 'Not required' : status === 'Requested' ? 'Pending' : 'Complete',
          consent: !t.consentFormId ? 'Not required' : ['Completed', 'In Treatment', 'Checked In'].includes(status) ? 'Signed' : off > 2 ? 'Pending' : 'Signed',
          source: pick(['Online', 'Online', 'Phone', 'Portal', 'Walk-in']), createdAt: iso(day(off - between(2, 20))),
        }
        appointments.push(a)
        if (status === 'Completed') {
          const mem = memberOf(p.id)
          const plan = planOf(mem)
          const lines: Invoice['lines'] = [{ id: `l${invNo}a`, kind: 'treatment', refId: t.id, desc: t.name, qty: 1, price: price || 0, category: t.category }]
          if (chance(0.22)) {
            const prod = pick(invSeed.filter((x) => x.retail))
            lines.push({ id: `l${invNo}b`, kind: 'product', refId: prod.sku, desc: prod.name, qty: 1, price: prod.price, category: 'Retail' })
          }
          const sub = lines.reduce((x, l) => x + l.price * l.qty, 0)
          const discount = plan ? Math.round(sub * plan.discountPct) : 0
          const tax = Math.round(lines.filter((l) => l.kind === 'product').reduce((x, l) => x + l.price, 0) * tenant.taxRate * 100) / 100
          const tip = chance(0.15) ? pick([20, 25, 40]) : 0
          const total = sub - discount + tax + tip
          const inv: Invoice = { id: `inv_${invNo}`, tenantId: T, number: `INV-${invNo}`, patientId: p.id, appointmentId: a.id, practitionerId: s.id, locationId: slot.loc, lines, discount, discountLabel: plan ? `${plan.name} member ${Math.round(plan.discountPct * 100)}%` : undefined, tax, tip, total, paid: total, refunded: 0, status: 'Paid', createdAt: iso(new Date(end)) }
          invNo++
          invoices.push(inv)
          a.invoiceId = inv.id
          const method: PaymentMethod = chance(0.85) ? 'Card' : chance(0.5) ? 'Cash' : 'Gift Card'
          if (a.depositPaid && a.deposit) payments.push({ id: `pay_${inv.id}_d`, tenantId: T, invoiceId: inv.id, patientId: p.id, amount: a.deposit, method: 'Card', kind: 'Deposit', at: a.createdAt, locationId: slot.loc, by: 'system', reference: `ch_${Math.floor(r() * 1e8).toString(36)}` })
          payments.push({ id: `pay_${inv.id}`, tenantId: T, invoiceId: inv.id, patientId: p.id, amount: total - (a.depositPaid ? a.deposit : 0), method, kind: 'Payment', at: inv.createdAt, locationId: slot.loc, by: 'st_reception', reference: `ch_${Math.floor(r() * 1e8).toString(36)}` })
          lines.forEach((l) => {
            const rate = s.commission[(l.category as keyof Staff['commission']) ?? 'Retail'] ?? 0
            if (rate > 0) commissions.push({ id: `com_${l.id}`, tenantId: T, staffId: s.id, invoiceId: inv.id, category: l.category!, base: l.price, rate, amount: Math.round(l.price * rate * 100) / 100, status: off < -30 ? 'Paid' : 'Pending', at: inv.createdAt })
          })
          const pts: InjectionPoint[] = t.id === 'tx_botox'
            ? FACE_SITES.filter((f) => ['Forehead', 'Glabella', "Crow's feet"].includes(f.region)).map((f) => ({ id: f.id, region: f.region, x: f.x, y: f.y, units: f.region === "Crow's feet" ? 6 : 4 }))
            : t.id === 'tx_lip' ? FACE_SITES.filter((f) => f.region === 'Lips').map((f) => ({ id: f.id, region: f.region, x: f.x, y: f.y, units: 0.5 })) : []
          const sessionKey = `${p.id}|${t.id}`
          const prior = sessionCount.get(sessionKey) ?? 0
          sessionCount.set(sessionKey, prior + 1)
          const ses: TreatmentSession = {
            id: `ses_${a.id}`, tenantId: T, appointmentId: a.id, patientId: p.id, practitionerId: s.id, treatmentId: t.id, locationId: slot.loc, at: inv.createdAt,
            sessionNumber: prior + 1, product: t.id === 'tx_botox' ? 'Botox® 100U' : t.id === 'tx_lip' ? 'Restylane® Kysse' : t.id === 'tx_filler' ? 'Juvéderm® Voluma XC' : t.id === 'tx_hydra' ? 'HydraFacial Signature' : '',
            lot: t.consumables[0] ? `${t.consumables[0].sku.split('-')[1]}${2400 + between(1, 90)}A` : '', expiry: dateOnly(day(between(60, 400))),
            dosage: t.id === 'tx_botox' ? `${pts.reduce((x, q) => x + q.units, 0)} units` : t.id === 'tx_lip' ? '1.0 ml' : t.id === 'tx_filler' ? '2.0 ml' : '',
            areas: [...new Set(pts.map((q) => q.region))], points: pts,
            notes: t.id === 'tx_botox' ? 'Good muscle response from prior session. Symmetric brow position. No adverse events.' : 'Treatment tolerated well. Skin calm on completion.',
            patientNotes: t.id === 'tx_botox' ? 'Results will appear over 3–5 days. Let us know at your two-week check if anything feels uneven.' : 'Your skin may feel slightly warm tonight — keep things gentle and use SPF.',
            complications: 'None', recommendations: t.sessions, aftercare: t.aftercare.join(' · '), signedBy: s.id,
          }
          sessions.push(ses)
          a.sessionId = ses.id
        }
      }
    }
  }

  // Emma: hand-crafted history so the portal tells a coherent story.
  const emmaHistory: [number, string, string, string][] = [[-112, 'tx_botox', 'st_mitchell', 'bh_r1'], [-63, 'tx_hydra', 'st_stone', 'bh_r2'], [-35, 'tx_peel', 'st_stone', 'bh_r2'], [-21, 'tx_hydra', 'st_stone', 'bh_r2'], [-14, 'tx_botox', 'st_mitchell', 'bh_r1']]
  emmaHistory.forEach(([off, tid, sid, room], i) => {
    const t = treatmentById[tid]
    const start = day(off, 11, 0)
    const fromPackage = tid === 'tx_hydra' || tid === 'tx_peel'
    const a: Appointment = { id: `ap_emma_${i}`, tenantId: T, patientId: 'pt_emma', treatmentId: tid, practitionerId: sid, locationId: 'loc_bh', roomId: room, start: iso(start), duration: t.duration, status: 'Completed', price: fromPackage ? 0 : tid === 'tx_botox' ? 450 : t.priceFrom, deposit: t.deposit, depositPaid: t.deposit > 0, notes: '', internalNotes: '', intake: 'Complete', consent: t.consentFormId ? 'Signed' : 'Not required', source: 'Portal', createdAt: iso(day(off - 9)), packageId: fromPackage ? 'pp_emma_glow' : undefined }
    if (!fromPackage) {
      const total = 405
      const inv: Invoice = { id: `inv_${invNo}`, tenantId: T, number: `INV-${invNo}`, patientId: 'pt_emma', appointmentId: a.id, practitionerId: sid, locationId: 'loc_bh', lines: [{ id: `le${i}`, kind: 'treatment', refId: tid, desc: `${t.name} · 30 units`, qty: 1, price: 450, category: t.category }], discount: 45, discountLabel: 'Glow Club member 10%', tax: 0, tip: 0, total, paid: total, refunded: 0, status: 'Paid', createdAt: iso(addMin(start, 30)) }
      invNo++; invoices.push(inv); a.invoiceId = inv.id
      payments.push({ id: `pay_${inv.id}_d`, tenantId: T, invoiceId: inv.id, patientId: 'pt_emma', amount: 50, method: 'Card', kind: 'Deposit', at: a.createdAt, locationId: 'loc_bh', by: 'system', reference: 'ch_emma_dep' })
      payments.push({ id: `pay_${inv.id}`, tenantId: T, invoiceId: inv.id, patientId: 'pt_emma', amount: total - 50, method: 'Card', kind: 'Payment', at: inv.createdAt, locationId: 'loc_bh', by: 'st_manager', reference: 'ch_emma_bal' })
    }
    const pts: InjectionPoint[] = tid === 'tx_botox' ? FACE_SITES.filter((f) => ['Forehead', 'Glabella', "Crow's feet"].includes(f.region)).map((f) => ({ id: f.id, region: f.region, x: f.x, y: f.y, units: f.region === 'Forehead' ? 4 : f.region === 'Glabella' ? (i === 4 ? 4 : 3) : 5 })) : []
    const ses: TreatmentSession = { id: `ses_emma_${i}`, tenantId: T, appointmentId: a.id, patientId: 'pt_emma', practitionerId: sid, treatmentId: tid, locationId: 'loc_bh', at: iso(addMin(start, t.duration)), sessionNumber: emmaHistory.slice(0, i + 1).filter((h) => h[1] === tid).length, product: tid === 'tx_botox' ? 'Botox® 100U' : tid === 'tx_hydra' ? 'HydraFacial Signature + Britenol booster' : 'TCA 20% peel', lot: tid === 'tx_botox' ? 'BTX2400A' : 'HYD2421A', expiry: dateOnly(day(200)), dosage: tid === 'tx_botox' ? `${pts.reduce((x, q) => x + q.units, 0)} units` : '', areas: [...new Set(pts.map((q) => q.region))], points: pts, notes: tid === 'tx_botox' ? 'Forehead 12u, glabella, lateral canthal lines. Mild asymmetry left brow — consider +2u next session.' : 'Skin hydrated, mild congestion T-zone cleared. Tolerated well.', patientNotes: tid === 'tx_botox' ? 'Your forehead was treated with 12 units across three points. Results appear in 3–5 days — please message us at day 14 if anything feels uneven.' : 'Lovely session — keep up your Vitamin C serum in the mornings and SPF 50 daily.', complications: 'None', recommendations: tid === 'tx_botox' ? 'Rebook in 14 weeks' : 'Continue monthly', aftercare: t.aftercare.join(' · '), signedBy: sid }
    sessions.push(ses); a.sessionId = ses.id
    appointments.push(a)
  })
  function addMin(d: Date, m: number) { return new Date(d.getTime() + m * 60000) }
  // Emma's upcoming appointments
  appointments.push({ id: 'ap_emma_next', tenantId: T, patientId: 'pt_emma', treatmentId: 'tx_hydra', practitionerId: 'st_stone', locationId: 'loc_bh', roomId: 'bh_r2', start: iso(day(3, 14, 30)), duration: 45, status: 'Confirmed', price: 0, deposit: 0, depositPaid: false, notes: 'Glow Package — session 3 of 3', internalNotes: 'Use Britenol booster again', intake: 'Not required', consent: 'Not required', source: 'Portal', createdAt: iso(day(-5)), packageId: 'pp_emma_glow' })
  appointments.push({ id: 'ap_emma_lips', tenantId: T, patientId: 'pt_emma', treatmentId: 'tx_lip', practitionerId: 'st_mitchell', locationId: 'loc_bh', roomId: 'bh_r1', start: iso(day(12, 10, 0)), duration: 45, status: 'Confirmed', price: 750, deposit: 100, depositPaid: true, notes: 'Subtle refresh, 0.5ml', internalNotes: '', intake: 'Complete', consent: 'Pending', source: 'Portal', createdAt: iso(day(-2)) })
  appointments.push({ id: 'ap_emma_cx', tenantId: T, patientId: 'pt_emma', treatmentId: 'tx_microneedling', practitionerId: 'st_stone', locationId: 'loc_bh', roomId: 'bh_r2', start: iso(day(-48, 15, 0)), duration: 60, status: 'Cancelled', price: 395, deposit: 75, depositPaid: false, notes: 'Cancelled by patient — travelling', internalNotes: '', intake: 'Complete', consent: 'Pending', source: 'Portal', createdAt: iso(day(-60)) })
  // Outstanding balance for Emma's lip appointment deposit invoice
  invoices.push({ id: 'inv_emma_open', tenantId: T, number: `INV-${invNo++}`, patientId: 'pt_emma', appointmentId: 'ap_emma_lips', practitionerId: 'st_mitchell', locationId: 'loc_bh', lines: [{ id: 'leo', kind: 'treatment', refId: 'tx_lip', desc: 'Lip Filler · 0.5ml', qty: 1, price: 750, category: 'Injectables' }], discount: 75, discountLabel: 'Glow Club member 10%', tax: 0, tip: 0, total: 675, paid: 100, refunded: 0, status: 'Partial', createdAt: iso(day(-2)) })
  appointments.find((a) => a.id === 'ap_emma_lips')!.invoiceId = 'inv_emma_open'
  payments.push({ id: 'pay_emma_open_d', tenantId: T, invoiceId: 'inv_emma_open', patientId: 'pt_emma', amount: 100, method: 'Card', kind: 'Deposit', at: iso(day(-2)), locationId: 'loc_bh', by: 'system', reference: 'ch_emma_lipdep' })

  // Package & membership sales (revenue)
  patientPackages.forEach((pp) => {
    const tpl = packageTemplates.find((t) => t.id === pp.templateId)!
    const inv: Invoice = { id: `inv_${invNo}`, tenantId: T, number: `INV-${invNo}`, patientId: pp.patientId, locationId: 'loc_bh', practitionerId: 'st_sales', lines: [{ id: `lp${invNo}`, kind: 'package', refId: tpl.id, desc: tpl.name, qty: 1, price: tpl.price, category: 'Packages' }], discount: 0, tax: 0, tip: 0, total: tpl.price, paid: tpl.price, refunded: 0, status: 'Paid', createdAt: pp.purchasedAt }
    invNo++; invoices.push(inv); pp.invoiceId = inv.id
    payments.push({ id: `pay_${inv.id}`, tenantId: T, invoiceId: inv.id, patientId: pp.patientId, amount: tpl.price, method: 'Card', kind: 'Payment', at: pp.purchasedAt, locationId: 'loc_bh', by: 'st_sales', reference: `ch_pk${invNo}` })
    commissions.push({ id: `com_pk_${inv.id}`, tenantId: T, staffId: 'st_sales', invoiceId: inv.id, category: 'Packages', base: tpl.price, rate: 0.06, amount: Math.round(tpl.price * 6) / 100, status: 'Pending', at: pp.purchasedAt })
  })
  for (let m = 0; m < 3; m++) {
    memberships.filter((x) => x.status !== 'Cancelled').forEach((mem) => {
      const plan = membershipPlans.find((p) => p.id === mem.planId)!
      const at = new Date(mem.renewsAt); at.setMonth(at.getMonth() - 1 - m)
      if (at < new Date(mem.startedAt) || at > now) return
      const inv: Invoice = { id: `inv_${invNo}`, tenantId: T, number: `INV-${invNo}`, patientId: mem.patientId, locationId: 'loc_bh', lines: [{ id: `lm${invNo}`, kind: 'membership', refId: plan.id, desc: `${plan.name} membership`, qty: 1, price: plan.price, category: 'Membership' }], discount: 0, tax: 0, tip: 0, total: plan.price, paid: plan.price, refunded: 0, status: 'Paid', createdAt: iso(at) }
      invNo++; invoices.push(inv)
      payments.push({ id: `pay_${inv.id}`, tenantId: T, invoiceId: inv.id, patientId: mem.patientId, amount: plan.price, method: 'Card', kind: 'Payment', at: iso(at), locationId: 'loc_bh', by: 'system', reference: `sub_${invNo}` })
    })
  }
  // A refund for the finance report
  const refundInv = invoices.find((i) => i.lines[0]?.refId === 'tx_peel' && i.status === 'Paid')
  if (refundInv) {
    refundInv.refunded = refundInv.total; refundInv.status = 'Refunded'
    payments.push({ id: 'pay_refund_1', tenantId: T, invoiceId: refundInv.id, patientId: refundInv.patientId, amount: -refundInv.total, method: 'Card', kind: 'Refund', at: iso(addMin(new Date(refundInv.createdAt), 60 * 26)), locationId: refundInv.locationId, by: 'st_manager', reference: 're_8f2k1' })
  }

  // ── Leads ─────────────────────────────────────────────────────────────────
  const stages: LeadStage[] = ['New Lead', 'Contacted', 'Consultation Booked', 'Consultation Completed', 'Treatment Proposed', 'Follow-up', 'Converted', 'Lost']
  const leadNames = ['Ashley Morgan', 'Brooke Taylor', 'Kendall Price', 'Jasmine Reyes', 'Megan Foster', 'Paige Coleman', 'Rachel Hart', 'Lauren Ellis', 'Tiffany Ward', 'Vanessa Cruz', 'Alexis Bell', 'Danielle Ross', 'Samantha Gray', 'Nicole Hayes', 'Erin Powell', 'Courtney Long', 'Monica Diaz', 'Heather Kim', 'Jenna Fox', 'Allison Price', 'Kayla Brooks', 'Morgan Blake', 'Sabrina Lane', 'Whitney Cole', 'Hailey Moss', 'Bianca Rivera']
  const campaigns = ['Fall Glow — Meta', 'Botox Google Search', 'Lip Filler Reels', 'Referral programme', 'Website organic', 'Laser Season Launch']
  const leadSources = ['Instagram', 'Google Ads', 'Website form', 'Meta Ads', 'Referral', 'Phone enquiry', 'TikTok']
  const leads: Lead[] = leadNames.map((name, i) => {
    const stage = stages[i < 5 ? 0 : i < 9 ? 1 : i < 12 ? 2 : i < 14 ? 3 : i < 17 ? 4 : i < 20 ? 5 : i < 24 ? 6 : 7]
    const interest = pick(['tx_botox', 'tx_lip', 'tx_filler', 'tx_laser', 'tx_microneedling', 'tx_hydra', 'tx_prp'])
    const t = treatmentById[interest]
    const created = day(-between(1, 40), between(8, 19))
    const [first, last] = name.split(' ')
    return {
      id: `ld_${i}`, tenantId: T, name, phone: `(424) 555-${between(1000, 9999)}`, email: `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`,
      interestId: interest, value: Math.round((t.priceFrom || 300) * pick([1, 1.5, 2, 3])), source: pick(leadSources), campaign: pick(campaigns),
      assigneeId: pick(['st_sales', 'st_reception', 'st_manager']), stage, nextFollowUp: iso(day(between(-2, 6), between(9, 17))),
      notes: pick(['Interested in natural results, nervous about needles.', 'Wants pricing for full-face plan.', 'Wedding in 8 weeks — timing matters.', 'Asked about financing options.', 'Referred by existing patient.', 'Compared us with two other clinics.']),
      lastContact: iso(day(-between(0, 6))), createdAt: iso(created), locationId: chance(0.6) ? 'loc_bh' : 'loc_sm',
      activity: [
        { id: `la${i}a`, at: iso(created), kind: 'system', text: `Lead captured from ${pick(['website form', 'Instagram DM', 'Google Ads landing page'])}` },
        ...(i >= 5 ? [{ id: `la${i}b`, at: iso(addMin(created, 90)), kind: 'call' as const, text: 'Intro call — discussed goals and pricing', by: 'st_sales' }] : []),
        ...(i >= 9 ? [{ id: `la${i}c`, at: iso(addMin(created, 60 * 30)), kind: 'appointment' as const, text: 'Consultation booked', by: 'st_reception' }] : []),
      ],
      lostReason: stage === 'Lost' ? pick(['Price', 'Chose another clinic', 'Not ready']) : undefined,
    }
  })

  // ── Purchase orders ───────────────────────────────────────────────────────
  const po = (n: number, sup: string, loc: string, status: PurchaseOrder['status'], lines: [string, number, number][], off: number): PurchaseOrder => ({
    id: `po_${n}`, tenantId: T, number: `PO-${n}`, supplierId: sup, locationId: loc, status, createdAt: iso(day(off)), expected: iso(day(off + 6)), createdBy: 'st_manager', paid: status === 'Received',
    lines: lines.map(([sku, qty, received]) => { const it = inventory.find((x) => x.sku === sku && x.locationId === loc)!; return { itemId: it.id, qty, received, cost: it.cost } }),
  })
  const purchaseOrders: PurchaseOrder[] = [
    po(2041, 'sup_allergan', 'loc_sm', 'Ordered', [['INJ-BTX-100', 4, 0], ['FIL-VOL-1', 6, 0]], -3),
    po(2040, 'sup_galderma', 'loc_bh', 'Partially Received', [['FIL-KYS-1', 10, 4]], -6),
    po(2039, 'sup_hydra', 'loc_sm', 'Approved', [['SKN-HYD-KIT', 30, 0]], -1),
    po(2042, 'sup_mckesson', 'loc_bh', 'Draft', [['CON-LZR-TIP', 6, 0], ['MED-NUMB-30', 10, 0]], 0),
    po(2038, 'sup_vitality', 'loc_bh', 'Received', [['RTL-VITC-30', 24, 24], ['RTL-SPF-50', 36, 36]], -18),
    po(2037, 'sup_allergan', 'loc_bh', 'Received', [['INJ-BTX-100', 6, 6]], -26),
    po(2036, 'sup_mckesson', 'loc_sm', 'Cancelled', [['NDL-30G', 500, 0]], -30),
  ]

  // ── Photos ────────────────────────────────────────────────────────────────
  const photos: Photo[] = []
  const stagesP: Photo['stage'][] = ['Baseline', 'Session 1', 'Follow-up']
  ;(['Front', 'Left', 'Right'] as const).forEach((angle) => stagesP.forEach((stage, si) => photos.push({ id: `ph_emma_${angle}_${si}`, tenantId: T, patientId: 'pt_emma', treatmentId: 'tx_botox', stage, angle, takenAt: iso(day([-112, -14, -1][si])), permission: angle === 'Front' ? 'Internal' : 'Clinical only', src: IMG.portrait1 })))
  const galleryPatients = [patients[6], patients[11], patients[15], patients[20], patients[26], patients[31]]
  const galleryTx = ['tx_botox', 'tx_lip', 'tx_hydra', 'tx_microneedling', 'tx_filler', 'tx_laser']
  galleryPatients.forEach((p, i) => {
    const src = [IMG.portrait2, IMG.portrait3, IMG.portrait1][i % 3]
    ;(['Baseline', 'Follow-up'] as const).forEach((stage, si) => photos.push({ id: `ph_g${i}_${si}`, tenantId: T, patientId: p.id, treatmentId: galleryTx[i], stage, angle: 'Front', takenAt: iso(day(si ? -10 - i : -90 - i * 5)), permission: i < 5 ? 'Marketing approved' : 'Internal', src }))
  })

  // ── Forms ─────────────────────────────────────────────────────────────────
  const sig = { id: 'sig', type: 'signature' as const, label: 'Patient signature', required: true }
  const formTemplates: FormTemplate[] = [
    { id: 'form_intake', tenantId: T, name: 'Medical Intake', kind: 'Intake', version: 4, updatedAt: iso(day(-60)), active: true, fields: [
      { id: 's1', type: 'section', label: 'Your health', required: false },
      { id: 'f1', type: 'yesno', label: 'Are you currently pregnant or breastfeeding?', required: true },
      { id: 'f2', type: 'textarea', label: 'Current medications and supplements', required: false },
      { id: 'f3', type: 'textarea', label: 'Known allergies', required: false },
      { id: 'f4', type: 'checkbox', label: 'Conditions that apply', required: false, options: ['Autoimmune disease', 'Bleeding disorder', 'Cold sores', 'Keloid scarring', 'Diabetes', 'None of these'] },
      { id: 's2', type: 'section', label: 'Aesthetic history', required: false },
      { id: 'f5', type: 'radio', label: 'Have you had injectables before?', required: true, options: ['Never', 'Within the last 6 months', 'More than 6 months ago'] },
      { id: 'f6', type: 'date', label: 'Date of last treatment (if any)', required: false },
      { ...sig },
    ] },
    { id: 'form_botox', tenantId: T, name: 'Botox Consent', kind: 'Consent', version: 3, updatedAt: iso(day(-120)), active: true, fields: [
      { id: 'c0', type: 'section', label: 'Understanding your treatment', required: false },
      { id: 'c1', type: 'checkbox', label: 'I understand the expected results, duration and that results vary', required: true, options: ['I agree'] },
      { id: 'c2', type: 'checkbox', label: 'I understand possible side effects including bruising, headache and rare eyelid ptosis', required: true, options: ['I agree'] },
      { id: 'c3', type: 'yesno', label: 'I confirm I am not pregnant or breastfeeding', required: true },
      { ...sig },
    ] },
    { id: 'form_filler', tenantId: T, name: 'Dermal Filler Consent', kind: 'Consent', version: 2, updatedAt: iso(day(-200)), active: true, fields: [{ id: 'c1', type: 'checkbox', label: 'I understand the risks including swelling, bruising, and rare vascular occlusion', required: true, options: ['I agree'] }, { id: 'c2', type: 'yesno', label: 'Have you had filler dissolved before?', required: true }, { ...sig }] },
    { id: 'form_laser', tenantId: T, name: 'Laser Consent', kind: 'Consent', version: 2, updatedAt: iso(day(-150)), active: true, fields: [{ id: 'c1', type: 'select', label: 'Fitzpatrick skin type (practitioner)', required: true, options: ['I', 'II', 'III', 'IV', 'V', 'VI'] }, { id: 'c2', type: 'checkbox', label: 'I agree to avoid sun exposure for 4 weeks', required: true, options: ['I agree'] }, { ...sig }] },
    { id: 'form_microneedling', tenantId: T, name: 'Microneedling Consent', kind: 'Consent', version: 1, updatedAt: iso(day(-90)), active: true, fields: [{ id: 'c1', type: 'yesno', label: 'Isotretinoin in the past 6 months?', required: true }, { ...sig }] },
    { id: 'form_photo', tenantId: T, name: 'Photography Consent', kind: 'Consent', version: 2, updatedAt: iso(day(-300)), active: true, fields: [{ id: 'p1', type: 'radio', label: 'How may we use your photos?', required: true, options: ['Clinical records only', 'Internal training', 'Marketing (face may be shown)', 'Marketing (anonymised only)'] }, { ...sig }] },
    { id: 'form_aftercare', tenantId: T, name: 'Treatment Aftercare', kind: 'Aftercare', version: 1, updatedAt: iso(day(-30)), active: true, fields: [{ id: 'a1', type: 'checkbox', label: 'I have received and understood my aftercare instructions', required: true, options: ['Confirmed'] }] },
    { id: 'form_privacy', tenantId: T, name: 'Privacy & HIPAA Notice', kind: 'Privacy', version: 5, updatedAt: iso(day(-400)), active: true, fields: [{ id: 'h1', type: 'checkbox', label: 'I acknowledge receipt of the Notice of Privacy Practices', required: true, options: ['Acknowledged'] }, { ...sig }] },
  ]
  const formSubmissions: FormSubmission[] = []
  patients.slice(0, 30).forEach((p, i) => {
    formSubmissions.push({ id: `fs_in_${i}`, tenantId: T, templateId: 'form_intake', version: 4, patientId: p.id, signedAt: iso(day(-between(10, 200))), device: pick(['iPhone 15 · Safari', 'iPad · Clinic kiosk', 'MacBook · Chrome']), ip: `76.${between(10, 250)}.${between(1, 250)}.${between(1, 250)}`, pdf: 'Generated', answers: { f1: false, f5: 'Within the last 6 months', sig: p.firstName + ' ' + p.lastName } })
    if (i % 2 === 0) formSubmissions.push({ id: `fs_bx_${i}`, tenantId: T, templateId: 'form_botox', version: i < 6 ? 3 : 2, patientId: p.id, witnessId: 'st_mitchell', signedAt: iso(day(-between(5, 150))), device: 'iPad · Clinic kiosk', ip: '104.28.14.6', pdf: i === 4 ? 'Pending' : 'Generated', answers: { c1: true, c2: true, c3: true, sig: p.firstName + ' ' + p.lastName } })
  })
  formSubmissions.push({ id: 'fs_emma_photo', tenantId: T, templateId: 'form_photo', version: 2, patientId: 'pt_emma', signedAt: iso(day(-112)), device: 'iPhone 15 · Safari', ip: '76.88.21.4', pdf: 'Generated', answers: { p1: 'Internal training', sig: 'Emma Roberts' } })
  formSubmissions.push({ id: 'fs_emma_privacy', tenantId: T, templateId: 'form_privacy', version: 5, patientId: 'pt_emma', signedAt: iso(day(-540)), device: 'iPhone 13 · Safari', ip: '76.88.21.4', pdf: 'Generated', answers: { h1: true, sig: 'Emma Roberts' } })

  // ── Messaging ─────────────────────────────────────────────────────────────
  const threads: Thread[] = [
    { id: 'th_emma_1', tenantId: T, patientId: 'pt_emma', subject: 'Two-week Botox check-in', kind: 'Practitioner', unreadClinic: false, unreadPatient: true, messages: [
      { id: 'm1', from: 'clinic', authorId: 'st_mitchell', text: 'Hi Emma — it’s been two weeks since your Botox. How are you finding the results? Any unevenness around the left brow?', at: iso(day(0, 9, 12)) },
    ] },
    { id: 'th_emma_2', tenantId: T, patientId: 'pt_emma', subject: 'Lip filler — preparing for your visit', kind: 'Appointment', unreadClinic: false, unreadPatient: false, messages: [
      { id: 'm2', from: 'clinic', authorId: 'st_manager', text: 'Your lip refresh with Sarah is confirmed. Please avoid alcohol and blood-thinning supplements for 24–48 hours beforehand, and let us know if you’ve had a cold sore recently.', at: iso(day(-2, 15, 2)) },
      { id: 'm3', from: 'patient', text: 'Thank you! No cold sores. Should I still complete the consent form beforehand?', at: iso(day(-2, 16, 40)) },
      { id: 'm4', from: 'clinic', authorId: 'st_manager', text: 'Yes please — it’s in your Documents tab and takes about two minutes.', at: iso(day(-2, 17, 5)) },
    ] },
    { id: 'th_emma_3', tenantId: T, patientId: 'pt_emma', subject: 'Glow Club: November member evening', kind: 'Announcement', unreadClinic: false, unreadPatient: false, messages: [
      { id: 'm5', from: 'clinic', authorId: 'st_marketing', text: 'You’re invited to our members’ evening at Beverly Hills — skin consultations, new product previews and a glass of something sparkling. RSVP in the portal.', at: iso(day(-6, 10, 0)) },
    ] },
    { id: 'th_olivia', tenantId: T, patientId: patients[1].id, subject: 'Question about laser downtime', kind: 'General', unreadClinic: true, unreadPatient: false, messages: [
      { id: 'm6', from: 'patient', text: 'Hi! If I book laser resurfacing on a Thursday, will I be OK for a work event the following Wednesday?', at: iso(day(0, 8, 41)) },
    ] },
    { id: 'th_mia', tenantId: T, patientId: patients[2].id, subject: 'Aftercare — microneedling', kind: 'Aftercare', unreadClinic: true, unreadPatient: false, messages: [
      { id: 'm7', from: 'clinic', authorId: 'st_stone', text: 'Checking in after your microneedling — redness should be settling today.', at: iso(day(-1, 11, 0)) },
      { id: 'm8', from: 'patient', text: 'Much calmer this morning, thank you! Can I use my vitamin C yet?', at: iso(day(0, 7, 55)) },
    ] },
  ]

  // ── Marketing ─────────────────────────────────────────────────────────────
  const automations: Automation[] = [
    { id: 'au_botox', tenantId: T, name: 'Botox care journey', trigger: 'Treatment completed', treatmentIds: ['tx_botox'], active: true, enrolled: 214, converted: 131, steps: [
      { offsetDays: 0, channel: 'Email', template: 'Treatment confirmation & aftercare' }, { offsetDays: 2, channel: 'SMS', template: 'Day-2 check-in' }, { offsetDays: 14, channel: 'In-app', template: 'Two-week follow-up with practitioner' }, { offsetDays: 90, channel: 'SMS', template: 'Time to rebook — your results are fading' }] },
    { id: 'au_hydra', tenantId: T, name: 'Hydrafacial rebooking', trigger: 'Treatment completed', treatmentIds: ['tx_hydra'], active: true, enrolled: 388, converted: 246, steps: [{ offsetDays: 0, channel: 'Email', template: 'Thank you + skincare tips' }, { offsetDays: 30, channel: 'SMS', template: 'Rebook your monthly glow' }] },
    { id: 'au_filler', tenantId: T, name: 'Filler aftercare', trigger: 'Treatment completed', treatmentIds: ['tx_lip', 'tx_filler'], active: true, enrolled: 96, converted: 41, steps: [{ offsetDays: 0, channel: 'SMS', template: 'Swelling & aftercare guidance' }, { offsetDays: 3, channel: 'In-app', template: 'How are you feeling?' }, { offsetDays: 180, channel: 'Email', template: 'Refresh reminder' }] },
    { id: 'au_winback', tenantId: T, name: 'Win-back — inactive 6 months', trigger: 'Patient inactive', inactiveDays: 180, treatmentIds: [], active: true, enrolled: 142, converted: 23, steps: [{ offsetDays: 0, channel: 'Email', template: 'We miss you — 15% off a return visit' }, { offsetDays: 7, channel: 'SMS', template: 'Gentle reminder' }] },
    { id: 'au_birthday', tenantId: T, name: 'Birthday treat', trigger: 'Birthday', treatmentIds: [], active: true, enrolled: 77, converted: 29, steps: [{ offsetDays: -7, channel: 'Email', template: 'A birthday gift from Aurelia' }] },
    { id: 'au_lead', tenantId: T, name: 'New lead nurture', trigger: 'Lead created', treatmentIds: [], active: true, enrolled: 312, converted: 94, steps: [{ offsetDays: 0, channel: 'SMS', template: 'Thanks for your enquiry' }, { offsetDays: 1, channel: 'Email', template: 'Meet your practitioners' }, { offsetDays: 4, channel: 'SMS', template: 'Book your complimentary consultation' }] },
    { id: 'au_pkg', tenantId: T, name: 'Package expiry reminder', trigger: 'Package expiring', treatmentIds: [], active: false, enrolled: 18, converted: 11, steps: [{ offsetDays: -30, channel: 'Email', template: 'Your package sessions expire soon' }] },
  ]
  const scheduled: ScheduledMessage[] = []
  sessions.filter((s) => new Date(s.at) > day(-20)).slice(-40).forEach((s, i) => {
    const au = automations.find((a) => a.treatmentIds.includes(s.treatmentId))
    if (!au) return
    au.steps.forEach((st, j) => {
      const at = new Date(s.at); at.setDate(at.getDate() + st.offsetDays)
      scheduled.push({ id: `sm_${i}_${j}`, tenantId: T, automationId: au.id, patientId: s.patientId, channel: st.channel, sendAt: iso(at), template: st.template, status: at < now ? 'Sent' : 'Scheduled' })
    })
  })
  const campaignsList: Campaign[] = [
    { id: 'cp_1', tenantId: T, name: 'Fall Glow Edit', channel: 'Email', segment: 'All active patients', status: 'Sent', scheduledAt: iso(day(-12)), audience: 1840, opened: 1012, clicked: 286, booked: 41, revenue: 14820, subject: 'Your autumn skin reset starts here' },
    { id: 'cp_2', tenantId: T, name: 'Lip Filler Week', channel: 'SMS', segment: 'Interested in lips, no filler in 9 months', status: 'Sent', scheduledAt: iso(day(-25)), audience: 412, opened: 398, clicked: 77, booked: 19, revenue: 13650, subject: '' },
    { id: 'cp_3', tenantId: T, name: 'Holiday Gift Cards', channel: 'Email', segment: 'All patients + subscribers', status: 'Scheduled', scheduledAt: iso(day(9, 9)), audience: 2260, opened: 0, clicked: 0, booked: 0, revenue: 0, subject: 'The gift of confidence' },
    { id: 'cp_4', tenantId: T, name: 'Laser Season Launch', channel: 'Email', segment: 'Pigmentation & texture concerns', status: 'Draft', scheduledAt: iso(day(14)), audience: 640, opened: 0, clicked: 0, booked: 0, revenue: 0, subject: 'Laser season is here' },
    { id: 'cp_5', tenantId: T, name: 'Glow Club Upgrade', channel: 'Email', segment: 'Essentials members', status: 'Sent', scheduledAt: iso(day(-40)), audience: 168, opened: 121, clicked: 38, booked: 12, revenue: 2160, subject: 'More glow, every month' },
  ]
  const reviewRequests: ReviewRequest[] = appointments.filter((a) => a.status === 'Completed' && new Date(a.start) > day(-30)).slice(0, 60).map((a, i) => {
    const responded = chance(0.62)
    const rating = responded ? (chance(0.88) ? pick([5, 5, 5, 4]) : pick([2, 3])) : undefined
    return { id: `rr_${i}`, tenantId: T, patientId: a.patientId, appointmentId: a.id, sentAt: iso(addMin(new Date(a.start), a.duration + 120)), rating, comment: rating && rating < 4 ? pick(['Waited 20 minutes past my appointment time.', 'Result was lovely but the check-out felt rushed.', 'Parking was difficult to find.']) : undefined, routed: rating ? (rating >= 4 ? 'Google' : 'Internal feedback') : undefined, status: rating ? (rating < 4 && chance(0.5) ? 'Resolved' : 'Responded') : 'Sent' }
  })
  const testimonials: Testimonial[] = [
    { id: 'te1', tenantId: T, name: 'Jessica M.', rating: 5, text: 'Sarah has the most gentle hands and an incredible eye. My lips look like mine — just the best version. I’ve never felt so looked after in a clinic.', treatmentId: 'tx_lip', date: iso(day(-9)), source: 'Google', published: true },
    { id: 'te2', tenantId: T, name: 'Amanda K.', rating: 5, text: 'Dr. Carter explained every step of my laser plan with real honesty. Three weeks later my skin is clearer than it’s been in a decade.', treatmentId: 'tx_laser', date: iso(day(-21)), source: 'Google', published: true },
    { id: 'te3', tenantId: T, name: 'Rachel S.', rating: 5, text: 'The calmest, most beautiful clinic in LA. Rebecca’s Hydrafacials are the highlight of my month — and the portal makes rebooking effortless.', treatmentId: 'tx_hydra', date: iso(day(-30)), source: 'Aurelia', published: true },
    { id: 'te4', tenantId: T, name: 'Lauren P.', rating: 5, text: 'Subtle, natural Botox. Nobody can tell — they just say I look rested. Exactly what I wanted.', treatmentId: 'tx_botox', date: iso(day(-44)), source: 'Google', published: true },
    { id: 'te5', tenantId: T, name: 'Nina T.', rating: 5, text: 'After three microneedling sessions my acne scarring has softened beyond what I hoped for. The team checks in after every visit.', treatmentId: 'tx_microneedling', date: iso(day(-58)), source: 'Google', published: true },
    { id: 'te6', tenantId: T, name: 'Caroline B.', rating: 4, text: 'Lovely experience and great results. Booking online was quick and the reminders were really helpful.', treatmentId: 'tx_filler', date: iso(day(-66)), source: 'Aurelia', published: false },
  ]

  const tasks: Task[] = [
    { id: 'tk1', tenantId: T, title: 'Call Olivia Smith re: laser downtime question', due: iso(day(0, 12)), assigneeId: 'st_reception', done: false, patientId: patients[1].id, kind: 'Call' },
    { id: 'tk2', tenantId: T, title: 'Approve PO-2042 (McKesson)', due: iso(day(0, 17)), assigneeId: 'st_manager', done: false, kind: 'Admin' },
    { id: 'tk3', tenantId: T, title: 'Review Charlotte Brown consent PDF (pending)', due: iso(day(1, 10)), assigneeId: 'st_carter', done: false, patientId: patients[4].id, kind: 'Clinical' },
    { id: 'tk4', tenantId: T, title: 'Follow up Kendall Price — proposal for full-face plan', due: iso(day(0, 15)), assigneeId: 'st_sales', done: false, leadId: 'ld_2', kind: 'Follow-up' },
    { id: 'tk5', tenantId: T, title: 'Renew Laser Safety Officer certification', due: iso(day(30)), assigneeId: 'st_carter', done: false, kind: 'Admin' },
    { id: 'tk6', tenantId: T, title: 'Two-week check: Emma Roberts Botox', due: iso(day(0, 11)), assigneeId: 'st_mitchell', done: true, patientId: 'pt_emma', kind: 'Clinical' },
  ]

  const notifications: Notification[] = [
    { id: 'no1', tenantId: T, audience: 'staff', channel: 'In-app', kind: 'stock', title: 'Low stock · Restylane Kysse', body: 'Beverly Hills has 4 syringes left (reorder level 6).', at: iso(day(0, 8, 2)), read: false, href: '/app/inventory' },
    { id: 'no2', tenantId: T, audience: 'staff', channel: 'In-app', kind: 'booking', title: 'New online booking', body: 'Lip Filler with Sarah Mitchell, requested via website.', at: iso(day(0, 7, 41)), read: false, href: '/app/calendar' },
    { id: 'no3', tenantId: T, audience: 'staff', channel: 'In-app', kind: 'lead', title: '5 leads awaiting first contact', body: 'Average response time today: 14 minutes.', at: iso(day(0, 9, 0)), read: false, href: '/app/leads' },
    { id: 'no4', tenantId: T, audience: 'staff', channel: 'In-app', kind: 'membership', title: 'Membership payment failed', body: 'A Glow Club renewal was declined — retry scheduled in 3 days.', at: iso(day(-1, 6, 0)), read: true, href: '/app/memberships' },
    { id: 'no5', tenantId: T, audience: 'staff', channel: 'In-app', kind: 'expiry', title: 'Stock expiring in 24 days', body: 'Voluma XC lot VOL2407A at Beverly Hills.', at: iso(day(-1, 9, 0)), read: true, href: '/app/inventory' },
    { id: 'no6', tenantId: T, audience: 'patient', patientId: 'pt_emma', channel: 'Push', kind: 'reminder', title: 'Hydrafacial in 3 days', body: 'With Rebecca at Beverly Hills — Glow Package session 3 of 3.', at: iso(day(0, 8, 0)), read: false },
    { id: 'no7', tenantId: T, audience: 'patient', patientId: 'pt_emma', channel: 'Email', kind: 'form', title: 'Consent form pending', body: 'Please complete your Dermal Filler consent before your lip appointment.', at: iso(day(-1, 10, 0)), read: false },
  ]

  const auditSeed: [number, string, string, string, string, string, string?, string?, AuditEvent['severity']?][] = [
    [-1, 'st_manager', 'Updated treatment price', 'Treatments', 'Hydrafacial · Santa Monica', '', '$170', '$175', 'financial'],
    [-1, 'st_carter', 'Signed clinical record', 'Clinical', 'Session · Botox', 'pt_emma', undefined, undefined, 'clinical'],
    [-2, 'st_reception', 'Collected payment', 'Payments', 'INV-10611 · $405.00', '', undefined, undefined, 'financial'],
    [-2, 'st_marketing', 'Approved photo for marketing', 'Before & After', 'Lip Filler · Front', '', 'Internal', 'Marketing approved', 'clinical'],
    [-3, 'st_owner', 'Changed role permissions', 'Settings', 'Receptionist', '', 'payments.refund: on', 'payments.refund: off', 'security'],
    [-3, 'st_manager', 'Issued refund', 'Payments', 'Chemical Peel', '', undefined, undefined, 'financial'],
    [-4, 'st_owner', 'Signed in with MFA', 'Security', 'Session', '', undefined, undefined, 'security'],
    [-5, 'st_mitchell', 'Viewed clinical record', 'Clinical', 'Medical history', 'pt_emma', undefined, undefined, 'clinical'],
    [-6, 'st_manager', 'Received purchase order', 'Purchasing', 'PO-2040 · 4 of 10', '', 'Ordered', 'Partially Received', 'info'],
  ]
  const audit: AuditEvent[] = auditSeed.map(([off, userId, action, module, entity, patientId, oldValue, newValue, severity], i) => ({ id: `au_seed_${i}`, tenantId: T, at: iso(day(off, 9 + i, 12)), userId, action, module, entity, patientId: patientId || undefined, oldValue, newValue, locationId: 'loc_bh', ip: '104.28.14.6', device: 'MacBook Pro · Chrome', severity: severity ?? 'info' }))

  const cms: CMS = {
    announcement: { text: 'Now open in Santa Monica — complimentary consultations through November.', active: true },
    hero: { eyebrow: 'Beverly Hills · Santa Monica', headline: 'Confidence, refined.', sub: 'Advanced aesthetic treatments designed around you — by a medical team that believes the best results are the ones nobody notices.', primaryCta: 'Book Consultation', secondaryCta: 'Explore Treatments', image: IMG.hero },
    stats: [{ label: 'Treatments performed', value: 18400, suffix: '+' }, { label: 'Average rating', value: 4.9, suffix: '/5' }, { label: 'Years of combined expertise', value: 35, suffix: '' }, { label: 'Patients who return', value: 87, suffix: '%' }],
    faqs: [
      { category: 'Booking', q: 'Do I need a consultation first?', a: 'For injectables and laser, your first visit includes a consultation. For facials you can book directly.' },
      { category: 'Booking', q: 'Is a deposit required?', a: 'Some treatments require a small deposit to secure your time. It is always credited to your treatment.' },
      { category: 'Booking', q: 'What is your cancellation policy?', a: 'We ask for 48 hours’ notice. Deposits for late cancellations may be retained.' },
      { category: 'Treatments', q: 'Who performs treatments?', a: 'Every injectable and laser treatment is performed or supervised by our medical team, led by board-certified dermatologist Dr. James Carter.' },
      { category: 'Treatments', q: 'Will results look natural?', a: 'That is our signature. We plan conservatively and refine over time, charting every treatment.' },
      { category: 'Payments', q: 'Do you offer financing?', a: 'Yes — flexible monthly payments are available for treatments over $500 through our financing partners.' },
      { category: 'Payments', q: 'Can I use membership credits online?', a: 'Yes. Credits are applied automatically when you book through the patient portal.' },
      { category: 'Privacy', q: 'How is my medical information protected?', a: 'Your records are encrypted, access is restricted by role, and every access is logged. Photos are never used for marketing without your written consent.' },
    ],
    posts: [
      { id: 'po1', slug: 'botox-first-time-guide', title: 'Your first Botox appointment, explained', excerpt: 'What happens, how it feels and how to get the most natural result.', category: 'Injectables', date: iso(day(-8)), readMins: 6, image: IMG.facial, published: true, body: ['Most first-time patients arrive with the same question: will I still look like me? The answer, done well, is yes.', 'Your appointment begins with a conversation about what bothers you, followed by a careful look at how your face moves. We chart every injection point so future visits can be refined precisely.', 'Afterwards, stay upright for a few hours and skip the gym until tomorrow. Results begin to appear around day three and settle fully by day fourteen — which is exactly when we will check in with you.'] },
      { id: 'po2', slug: 'skin-barrier-autumn', title: 'Caring for your skin barrier as the seasons change', excerpt: 'Why autumn is the ideal time to repair, resurface and reset.', category: 'Skin health', date: iso(day(-19)), readMins: 5, image: IMG.skincare, published: true, body: ['Cooler, drier air challenges the skin barrier. Swap foaming cleansers for cream textures and introduce a ceramide-rich moisturiser.', 'Autumn is also the ideal window for resurfacing treatments like peels and laser, when sun exposure is lower.'] },
      { id: 'po3', slug: 'microneedling-vs-laser', title: 'Microneedling or laser? Choosing the right resurfacing', excerpt: 'Both build collagen. Here is how we decide which is right for you.', category: 'Treatments', date: iso(day(-33)), readMins: 7, image: IMG.serum, published: true, body: ['Microneedling uses controlled micro-injury to stimulate collagen with very little downtime. Fractional laser goes further, addressing pigmentation and deeper texture.', 'Skin type, downtime tolerance and goals all shape our recommendation.'] },
      { id: 'po4', slug: 'membership-guide', title: 'Is a skin membership worth it?', excerpt: 'The maths, the rituals and the results of consistent care.', category: 'Clinic', date: iso(day(-47)), readMins: 4, image: IMG.spa, published: true, body: ['Consistency beats intensity. A monthly ritual keeps results compounding — and members save on every treatment.'] },
    ],
    promotions: [{ id: 'pr1', title: 'Complimentary consultation', body: 'Through November at our new Santa Monica clinic.', active: true, ends: iso(day(40)) }, { id: 'pr2', title: 'Glow Club — first month $99', body: 'For new members who join this month.', active: false, ends: iso(day(12)) }],
    seo: { title: 'Aurelia Aesthetics — Medical Aesthetics in Beverly Hills & Santa Monica', description: 'Natural, physician-led aesthetic treatments: Botox, fillers, Hydrafacial, laser and skin health in Beverly Hills and Santa Monica.' },
    about: { headline: 'A quieter kind of beauty.', body: ['Aurelia was founded on a simple belief: aesthetic medicine should leave you looking rested, refreshed and unmistakably yourself.', 'Our medical team combines clinical rigour with an artist’s restraint. Every treatment is planned, charted and followed up — because care doesn’t end when you leave the room.'] },
    sections: { trust: true, featured: true, results: true, team: true, testimonials: true, memberships: true, journal: true },
  }

  return {
    tenants: [tenant], locations, staff, treatments, patients, appointments, leads, inventory, suppliers, purchaseOrders,
    invoices, payments, commissions, packageTemplates, patientPackages, membershipPlans, memberships, sessions, photos,
    formTemplates, formSubmissions, threads, notifications, audit, automations, scheduled, campaigns: campaignsList,
    reviewRequests, testimonials, tasks, cms: { [T]: cms }, counters: { invoice: invNo, po: 2043 },
  }
}
