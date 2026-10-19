// Domain model for Aurelia OS. Every tenant-owned record carries `tenantId`;
// all selectors scope by the active tenant (see store.ts `scoped`).

export type ID = string

export type Role =
  | 'owner' | 'admin' | 'manager' | 'doctor' | 'nurse' | 'injector'
  | 'aesthetician' | 'receptionist' | 'sales' | 'finance' | 'marketing'

export type Permission =
  | 'dashboard.view' | 'calendar.view' | 'calendar.manage' | 'calendar.own'
  | 'patients.view' | 'patients.manage' | 'clinical.view' | 'clinical.write'
  | 'leads.manage' | 'payments.collect' | 'payments.refund' | 'finance.view'
  | 'inventory.view' | 'inventory.manage' | 'purchasing.manage'
  | 'staff.view' | 'staff.manage' | 'marketing.manage' | 'cms.manage'
  | 'treatments.manage' | 'reports.view' | 'settings.manage' | 'audit.view'
  | 'packages.manage' | 'photos.approve' | 'locations.all' | 'forms.manage'

export type PlanTier = 'starter' | 'growth' | 'pro' | 'enterprise'

export interface Brand {
  primary: string
  accent: string
  logoText: string
  displayFont: string
  smsSender: string
  emailFrom: string
}

export interface Tenant {
  id: ID
  name: string
  slug: string
  domain: string
  plan: PlanTier
  brand: Brand
  createdAt: string
  timezone: string
  currency: string
  taxRate: number
  security: { mfaRequired: boolean; sessionTimeoutMin: number; passwordMinLength: number; retentionYears: number; ipAllowlist: boolean }
}

export interface Room { id: ID; name: string; kind: 'Treatment' | 'Laser' | 'Consult' | 'Procedure' }

export interface Location {
  id: ID
  tenantId: ID
  name: string
  address: string
  city: string
  phone: string
  email: string
  hours: { days: string; time: string }[]
  rooms: Room[]
  image: string
  active: boolean
  lat: number
  lng: number
}

export interface Certification { name: string; expires: string }

export interface Staff {
  id: ID
  tenantId: ID
  name: string
  role: Role
  title: string
  email: string
  phone: string
  locationIds: ID[]
  avatar: string
  bio: string
  specialties: string[]
  credentials: string
  yearsExperience: number
  bookable: boolean
  active: boolean
  startDate: string
  color: string
  commission: Partial<Record<TreatmentCategory | 'Retail' | 'Packages', number>>
  certifications: Certification[]
  workingDays: number[] // 0=Sun
  leaveDays: number
  rating: number
}

export type TreatmentCategory =
  | 'Injectables' | 'Skin Treatments' | 'Facial Rejuvenation' | 'Body Treatments'
  | 'Laser' | 'Hair Restoration' | 'Wellness' | 'Cosmetic Dermatology'

export type Concern =
  | 'Wrinkles' | 'Fine lines' | 'Acne' | 'Pigmentation' | 'Lips' | 'Jawline'
  | 'Skin texture' | 'Hair loss' | 'Body contouring' | 'Volume loss' | 'Dullness'

export interface FAQ { q: string; a: string }

export interface Treatment {
  id: ID
  tenantId: ID
  slug: string
  name: string
  category: TreatmentCategory
  tagline: string
  description: string
  priceFrom: number
  priceNote?: string
  locationPricing: Record<ID, number>
  duration: number
  deposit: number
  active: boolean
  onlineBookable: boolean
  featured: boolean
  concerns: Concern[]
  benefits: string[]
  howItWorks: string
  results: string
  downtime: string
  sessions: string
  preparation: string[]
  aftercare: string[]
  contraindications: string[]
  faqs: FAQ[]
  practitionerIds: ID[]
  locationIds: ID[]
  // Stock consumed per session, by SKU — resolved to the item at the appointment's location.
  consumables: { sku: string; qty: number }[]
  image: string
  consentFormId?: ID
  requiresIntake: boolean
  usesInjectionMap: boolean
  seo: { title: string; description: string }
}

export interface Patient {
  id: ID
  tenantId: ID
  firstName: string
  lastName: string
  email: string
  phone: string
  dob: string
  avatar?: string
  since: string
  locationId: ID
  preferredPractitionerId?: ID
  source: string
  tags: string[]
  alerts: string[]
  allergies: string[]
  medications: string[]
  conditions: string[]
  pregnancy: 'Not pregnant' | 'Pregnant' | 'Breastfeeding' | 'Not applicable'
  address: string
  emergencyContact: { name: string; phone: string; relation: string }
  notify: { email: boolean; sms: boolean; push: boolean; marketing: boolean }
  notes: { id: ID; at: string; by: ID; text: string }[]
  treatmentPlan: { id: ID; title: string; status: 'Planned' | 'In progress' | 'Done'; target: string }[]
}

export type AppointmentStatus =
  | 'Requested' | 'Confirmed' | 'Checked In' | 'In Treatment' | 'Completed' | 'Cancelled' | 'No Show'

export interface Appointment {
  id: ID
  tenantId: ID
  patientId: ID
  treatmentId: ID
  practitionerId: ID
  locationId: ID
  roomId: ID
  start: string
  duration: number
  status: AppointmentStatus
  price: number
  deposit: number
  depositPaid: boolean
  notes: string
  internalNotes: string
  intake: 'Pending' | 'Complete' | 'Not required'
  consent: 'Pending' | 'Signed' | 'Not required'
  source: 'Online' | 'Phone' | 'Walk-in' | 'Lead' | 'Portal'
  invoiceId?: ID
  sessionId?: ID
  packageId?: ID
  createdAt: string
}

export type LeadStage =
  | 'New Lead' | 'Contacted' | 'Consultation Booked' | 'Consultation Completed'
  | 'Treatment Proposed' | 'Follow-up' | 'Converted' | 'Lost'

export interface LeadActivity { id: ID; at: string; kind: 'call' | 'sms' | 'email' | 'note' | 'stage' | 'appointment' | 'task' | 'system'; text: string; by?: ID }

export interface Lead {
  id: ID
  tenantId: ID
  name: string
  phone: string
  email: string
  interestId: ID
  value: number
  source: string
  campaign: string
  assigneeId: ID
  stage: LeadStage
  nextFollowUp: string
  notes: string
  lastContact: string
  createdAt: string
  locationId: ID
  activity: LeadActivity[]
  patientId?: ID
  lostReason?: string
}

export type InventoryCategory =
  | 'Injectables' | 'Fillers' | 'Skin Products' | 'Consumables' | 'Needles'
  | 'Syringes' | 'Retail' | 'Medical Supplies'

export interface Lot { lot: string; expiry: string; qty: number }

export interface InventoryItem {
  id: ID
  tenantId: ID
  name: string
  sku: string
  category: InventoryCategory
  supplierId: ID
  locationId: ID
  unit: string
  packSize: number // units per pack (e.g. 100 units per vial)
  stock: number // in base units
  reserved: number
  cost: number // per pack
  price: number // retail price per pack, or per-unit charge for injectables
  reorderLevel: number // in base units
  lots: Lot[]
  storage: string
  retail: boolean
}

export interface Supplier { id: ID; tenantId: ID; name: string; contact: string; email: string; phone: string; terms: string; balance: number }

export type POStatus = 'Draft' | 'Submitted' | 'Approved' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled'

export interface PurchaseOrder {
  id: ID
  tenantId: ID
  number: string
  supplierId: ID
  locationId: ID
  status: POStatus
  lines: { itemId: ID; qty: number; received: number; cost: number }[]
  createdAt: string
  expected: string
  createdBy: ID
  paid: boolean
}

export type PaymentMethod = 'Card' | 'Cash' | 'Gift Card' | 'Account Credit' | 'Membership Credit' | 'Package Credit'

export interface InvoiceLine { id: ID; kind: 'treatment' | 'product' | 'package' | 'membership' | 'deposit'; refId: ID; desc: string; qty: number; price: number; category?: string }

export interface Invoice {
  id: ID
  tenantId: ID
  number: string
  patientId: ID
  appointmentId?: ID
  practitionerId?: ID
  locationId: ID
  lines: InvoiceLine[]
  discount: number
  discountLabel?: string
  tax: number
  tip: number
  total: number
  paid: number
  refunded: number
  status: 'Draft' | 'Open' | 'Partial' | 'Paid' | 'Refunded'
  createdAt: string
}

export interface Payment {
  id: ID
  tenantId: ID
  invoiceId: ID
  patientId: ID
  amount: number
  method: PaymentMethod
  kind: 'Deposit' | 'Payment' | 'Refund'
  at: string
  locationId: ID
  by: ID
  reference: string
}

export interface CommissionEntry { id: ID; tenantId: ID; staffId: ID; invoiceId: ID; category: string; base: number; rate: number; amount: number; status: 'Pending' | 'Paid'; at: string }

export interface PackageTemplate {
  id: ID
  tenantId: ID
  name: string
  description: string
  price: number
  items: { treatmentId: ID; qty: number }[]
  expiryMonths: number
  transferable: boolean
  active: boolean
}

export interface PatientPackage {
  id: ID
  tenantId: ID
  templateId: ID
  patientId: ID
  purchasedAt: string
  expiresAt: string
  items: { treatmentId: ID; qty: number; used: number }[]
  status: 'Active' | 'Completed' | 'Expired' | 'Refunded'
  invoiceId?: ID
}

export interface MembershipPlan {
  id: ID
  tenantId: ID
  name: string
  price: number
  tagline: string
  benefits: string[]
  monthlyCredit?: { treatmentId: ID; qty: number }
  discountPct: number
  active: boolean
}

export interface Membership {
  id: ID
  tenantId: ID
  planId: ID
  patientId: ID
  startedAt: string
  renewsAt: string
  status: 'Active' | 'Past Due' | 'Cancel Requested' | 'Cancelled'
  credits: number
  paymentMethod: string
  cancelledAt?: string
}

export interface InjectionPoint { id: ID; region: string; x: number; y: number; units: number }

export interface TreatmentSession {
  id: ID
  tenantId: ID
  appointmentId?: ID
  patientId: ID
  practitionerId: ID
  treatmentId: ID
  locationId: ID
  at: string
  sessionNumber: number
  product: string
  lot: string
  expiry: string
  dosage: string
  areas: string[]
  points: InjectionPoint[]
  notes: string
  patientNotes: string
  complications: string
  recommendations: string
  aftercare: string
  signedBy: ID
}

export type PhotoPermission = 'Clinical only' | 'Internal' | 'Marketing approved'
export type PhotoAngle = 'Front' | 'Left' | 'Right' | 'Close-up'

export interface Photo {
  id: ID
  tenantId: ID
  patientId: ID
  treatmentId: ID
  stage: 'Baseline' | 'Session 1' | 'Session 2' | 'Session 3' | 'Follow-up'
  angle: PhotoAngle
  takenAt: string
  permission: PhotoPermission
  src: string
  sessionId?: ID
}

export type FieldType = 'text' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'signature' | 'date' | 'yesno' | 'section'

export interface FormField { id: ID; type: FieldType; label: string; required: boolean; options?: string[]; help?: string }

export interface FormTemplate {
  id: ID
  tenantId: ID
  name: string
  kind: 'Intake' | 'Consent' | 'Aftercare' | 'Privacy'
  version: number
  fields: FormField[]
  updatedAt: string
  active: boolean
}

export interface FormSubmission {
  id: ID
  tenantId: ID
  templateId: ID
  version: number
  patientId: ID
  appointmentId?: ID
  signedAt: string
  witnessId?: ID
  device: string
  ip: string
  pdf: 'Generated' | 'Pending'
  answers: Record<string, string | boolean>
}

export interface Message { id: ID; from: 'patient' | 'clinic'; authorId?: ID; text: string; at: string }

export interface Thread {
  id: ID
  tenantId: ID
  patientId: ID
  subject: string
  kind: 'Announcement' | 'Appointment' | 'Practitioner' | 'Aftercare' | 'General'
  messages: Message[]
  unreadClinic: boolean
  unreadPatient: boolean
}

export type Channel = 'Email' | 'SMS' | 'In-app' | 'Push'

export interface Notification {
  id: ID
  tenantId: ID
  audience: 'staff' | 'patient'
  patientId?: ID
  channel: Channel
  kind: string
  title: string
  body: string
  at: string
  read: boolean
  href?: string
}

export interface AuditEvent {
  id: ID
  tenantId: ID
  at: string
  userId: ID
  action: string
  module: string
  entity: string
  oldValue?: string
  newValue?: string
  patientId?: ID
  locationId?: ID
  ip: string
  device: string
  severity: 'info' | 'clinical' | 'financial' | 'security'
}

export interface AutomationStep { offsetDays: number; channel: Channel; template: string }

export interface Automation {
  id: ID
  tenantId: ID
  name: string
  trigger: 'Treatment completed' | 'Patient inactive' | 'Birthday' | 'Lead created' | 'Package expiring' | 'Appointment booked'
  treatmentIds: ID[]
  inactiveDays?: number
  steps: AutomationStep[]
  active: boolean
  enrolled: number
  converted: number
}

export interface ScheduledMessage { id: ID; tenantId: ID; automationId: ID; patientId: ID; channel: Channel; sendAt: string; template: string; status: 'Scheduled' | 'Sent' | 'Cancelled' }

export interface Campaign {
  id: ID
  tenantId: ID
  name: string
  channel: 'Email' | 'SMS'
  segment: string
  status: 'Draft' | 'Scheduled' | 'Sent'
  scheduledAt: string
  audience: number
  opened: number
  clicked: number
  booked: number
  revenue: number
  subject: string
}

export interface ReviewRequest {
  id: ID
  tenantId: ID
  patientId: ID
  appointmentId: ID
  sentAt: string
  rating?: number
  comment?: string
  routed?: 'Google' | 'Internal feedback'
  status: 'Sent' | 'Responded' | 'Resolved'
}

export interface Testimonial { id: ID; tenantId: ID; name: string; rating: number; text: string; treatmentId: ID; date: string; source: 'Google' | 'Aurelia'; published: boolean }

export interface Task { id: ID; tenantId: ID; title: string; due: string; assigneeId: ID; done: boolean; patientId?: ID; leadId?: ID; kind: 'Follow-up' | 'Call' | 'Admin' | 'Clinical' }

export interface Post { id: ID; slug: string; title: string; excerpt: string; body: string[]; category: string; date: string; readMins: number; image: string; published: boolean }

export interface Promotion { id: ID; title: string; body: string; active: boolean; ends: string }

export interface CMS {
  announcement: { text: string; active: boolean }
  hero: { eyebrow: string; headline: string; sub: string; primaryCta: string; secondaryCta: string; image: string }
  stats: { label: string; value: number; suffix: string }[]
  faqs: (FAQ & { category: string })[]
  posts: Post[]
  promotions: Promotion[]
  seo: { title: string; description: string }
  about: { headline: string; body: string[] }
  sections: { trust: boolean; featured: boolean; results: boolean; team: boolean; testimonials: boolean; memberships: boolean; journal: boolean }
}

export interface DB {
  tenants: Tenant[]
  locations: Location[]
  staff: Staff[]
  treatments: Treatment[]
  patients: Patient[]
  appointments: Appointment[]
  leads: Lead[]
  inventory: InventoryItem[]
  suppliers: Supplier[]
  purchaseOrders: PurchaseOrder[]
  invoices: Invoice[]
  payments: Payment[]
  commissions: CommissionEntry[]
  packageTemplates: PackageTemplate[]
  patientPackages: PatientPackage[]
  membershipPlans: MembershipPlan[]
  memberships: Membership[]
  sessions: TreatmentSession[]
  photos: Photo[]
  formTemplates: FormTemplate[]
  formSubmissions: FormSubmission[]
  threads: Thread[]
  notifications: Notification[]
  audit: AuditEvent[]
  automations: Automation[]
  scheduled: ScheduledMessage[]
  campaigns: Campaign[]
  reviewRequests: ReviewRequest[]
  testimonials: Testimonial[]
  tasks: Task[]
  cms: Record<ID, CMS>
  counters: { invoice: number; po: number }
}
