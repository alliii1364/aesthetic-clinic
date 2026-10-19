import type { PlanTier } from '@/lib/types'

// Platform-level view of all tenants. Only Aurelia has a full demo workspace;
// the other organizations exist here as summary rows (their data is isolated).
export interface TenantSummary {
  id: string
  name: string
  city: string
  country: string
  plan: PlanTier
  status: 'Active' | 'Trial' | 'Past due' | 'Churned'
  locations: number
  staff: number
  patients: number
  mrr: number
  storageGb: number
  smsMonth: number
  bookingsMonth: number
  since: string
  lastActive: string
  health: number
}

const d = (days: number) => new Date(Date.now() - days * 86400000).toISOString()

export const OTHER_TENANTS: TenantSummary[] = [
  { id: 't_lumiere', name: 'Lumière Skin Studio', city: 'Miami, FL', country: 'US', plan: 'growth', status: 'Active', locations: 1, staff: 11, patients: 2140, mrr: 549, storageGb: 6.2, smsMonth: 1940, bookingsMonth: 612, since: d(410), lastActive: d(0.02), health: 92 },
  { id: 't_halo', name: 'Halo Medical Aesthetics', city: 'Austin, TX', country: 'US', plan: 'pro', status: 'Active', locations: 3, staff: 34, patients: 7820, mrr: 1190, storageGb: 41.5, smsMonth: 8120, bookingsMonth: 2210, since: d(520), lastActive: d(0.01), health: 96 },
  { id: 't_verve', name: 'Verve MedSpa Group', city: 'Scottsdale, AZ', country: 'US', plan: 'enterprise', status: 'Active', locations: 9, staff: 118, patients: 26400, mrr: 6400, storageGb: 212, smsMonth: 31000, bookingsMonth: 8340, since: d(300), lastActive: d(0.005), health: 88 },
  { id: 't_maison', name: 'Maison Belle Clinic', city: 'London', country: 'UK', plan: 'pro', status: 'Active', locations: 2, staff: 19, patients: 4310, mrr: 1190, storageGb: 18.9, smsMonth: 3120, bookingsMonth: 1180, since: d(190), lastActive: d(0.1), health: 81 },
  { id: 't_sol', name: 'Sol Aesthetics', city: 'San Diego, CA', country: 'US', plan: 'starter', status: 'Trial', locations: 1, staff: 4, patients: 210, mrr: 0, storageGb: 0.4, smsMonth: 120, bookingsMonth: 64, since: d(9), lastActive: d(0.3), health: 64 },
  { id: 't_petal', name: 'Petal & Pearl Skin', city: 'Toronto, ON', country: 'CA', plan: 'growth', status: 'Past due', locations: 1, staff: 8, patients: 1290, mrr: 549, storageGb: 3.1, smsMonth: 610, bookingsMonth: 280, since: d(240), lastActive: d(2), health: 47 },
  { id: 't_aura', name: 'Aura Dermal Bar', city: 'Dubai', country: 'AE', plan: 'pro', status: 'Active', locations: 4, staff: 41, patients: 9850, mrr: 1190, storageGb: 55.2, smsMonth: 9400, bookingsMonth: 2960, since: d(150), lastActive: d(0.04), health: 90 },
  { id: 't_nova', name: 'Nova Laser & Skin', city: 'Chicago, IL', country: 'US', plan: 'starter', status: 'Churned', locations: 1, staff: 3, patients: 380, mrr: 0, storageGb: 0.9, smsMonth: 0, bookingsMonth: 0, since: d(380), lastActive: d(64), health: 0 },
]

export const PLATFORM_FLAGS = [
  { key: 'ai_treatment_notes', name: 'AI-assisted clinical note drafting', rollout: 15, plans: ['pro', 'enterprise'] },
  { key: 'new_calendar_engine', name: 'Resource-aware calendar v2', rollout: 100, plans: ['starter', 'growth', 'pro', 'enterprise'] },
  { key: 'financing_checkout', name: 'Patient financing at checkout', rollout: 40, plans: ['growth', 'pro', 'enterprise'] },
  { key: 'whatsapp_channel', name: 'WhatsApp messaging channel', rollout: 0, plans: ['enterprise'] },
  { key: 'gift_cards_v2', name: 'Digital gift cards', rollout: 70, plans: ['growth', 'pro', 'enterprise'] },
  { key: 'multi_currency', name: 'Multi-currency pricing', rollout: 25, plans: ['enterprise'] },
]

export const SUPPORT_TICKETS = [
  { id: 'SUP-2291', tenant: 'Petal & Pearl Skin', subject: 'Card on file declined for subscription', priority: 'High', status: 'Open', at: d(0.2) },
  { id: 'SUP-2290', tenant: 'Halo Medical Aesthetics', subject: 'Add new location — Round Rock', priority: 'Normal', status: 'In progress', at: d(0.6) },
  { id: 'SUP-2288', tenant: 'Maison Belle Clinic', subject: 'GBP currency on invoices', priority: 'Normal', status: 'Waiting on customer', at: d(1.4) },
  { id: 'SUP-2285', tenant: 'Sol Aesthetics', subject: 'Onboarding call — import from spreadsheet', priority: 'Low', status: 'Scheduled', at: d(2) },
  { id: 'SUP-2281', tenant: 'Verve MedSpa Group', subject: 'SSO group mapping for injectors', priority: 'High', status: 'Resolved', at: d(3) },
]

export const SYSTEM_LOGS = [
  { at: d(0.003), level: 'info', service: 'api', msg: 'Deploy v4.18.2 completed · 0 errors · p95 182ms' },
  { at: d(0.02), level: 'warn', service: 'sms', msg: 'Carrier latency elevated (AT&T) · retries succeeding' },
  { at: d(0.05), level: 'info', service: 'billing', msg: 'Nightly subscription run: 1,284 charges, 7 failed (dunning scheduled)' },
  { at: d(0.12), level: 'info', service: 'backup', msg: 'Point-in-time snapshot verified · all regions' },
  { at: d(0.3), level: 'error', service: 'webhooks', msg: 'Tenant t_petal: Stripe webhook signature mismatch (rotated key) — alerted' },
  { at: d(0.8), level: 'info', service: 'security', msg: 'Quarterly access review completed for platform staff' },
]
