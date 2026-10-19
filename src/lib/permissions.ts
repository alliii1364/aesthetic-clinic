import type { Permission, PlanTier, Role } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner', admin: 'Admin', manager: 'Clinic Manager', doctor: 'Doctor', nurse: 'Nurse',
  injector: 'Injector', aesthetician: 'Aesthetician', receptionist: 'Receptionist',
  sales: 'Sales Consultant', finance: 'Finance', marketing: 'Marketing',
}

const ALL: Permission[] = [
  'dashboard.view', 'calendar.view', 'calendar.manage', 'calendar.own', 'patients.view', 'patients.manage',
  'clinical.view', 'clinical.write', 'leads.manage', 'payments.collect', 'payments.refund', 'finance.view',
  'inventory.view', 'inventory.manage', 'purchasing.manage', 'staff.view', 'staff.manage', 'marketing.manage',
  'cms.manage', 'treatments.manage', 'reports.view', 'settings.manage', 'audit.view', 'packages.manage',
  'photos.approve', 'locations.all', 'forms.manage',
]

const practitioner: Permission[] = ['dashboard.view', 'calendar.view', 'calendar.own', 'patients.view', 'clinical.view', 'clinical.write', 'inventory.view', 'payments.collect']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== 'payments.refund'),
  manager: ['dashboard.view', 'calendar.view', 'calendar.manage', 'patients.view', 'patients.manage', 'clinical.view', 'leads.manage',
    'payments.collect', 'payments.refund', 'inventory.view', 'inventory.manage', 'purchasing.manage', 'staff.view', 'staff.manage',
    'reports.view', 'packages.manage', 'photos.approve', 'forms.manage', 'treatments.manage', 'audit.view', 'finance.view'],
  doctor: [...practitioner, 'photos.approve', 'forms.manage'],
  nurse: practitioner,
  injector: practitioner,
  aesthetician: practitioner,
  receptionist: ['dashboard.view', 'calendar.view', 'calendar.manage', 'patients.view', 'patients.manage', 'payments.collect', 'leads.manage', 'packages.manage'],
  sales: ['dashboard.view', 'calendar.view', 'patients.view', 'leads.manage', 'packages.manage', 'payments.collect'],
  finance: ['dashboard.view', 'payments.collect', 'payments.refund', 'finance.view', 'reports.view', 'inventory.view', 'purchasing.manage', 'staff.view', 'locations.all'],
  marketing: ['dashboard.view', 'leads.manage', 'marketing.manage', 'cms.manage', 'reports.view', 'photos.approve', 'locations.all'],
}

export const PERMISSION_GROUPS: { group: string; items: { key: Permission; label: string }[] }[] = [
  { group: 'Scheduling', items: [{ key: 'calendar.view', label: 'View calendar' }, { key: 'calendar.manage', label: 'Manage all appointments' }, { key: 'calendar.own', label: 'Own schedule' }] },
  { group: 'Patients & clinical', items: [{ key: 'patients.view', label: 'View patients' }, { key: 'patients.manage', label: 'Create & edit patients' }, { key: 'clinical.view', label: 'View clinical records' }, { key: 'clinical.write', label: 'Write clinical notes' }, { key: 'photos.approve', label: 'Approve photos for marketing' }, { key: 'forms.manage', label: 'Forms & consents' }] },
  { group: 'Revenue', items: [{ key: 'payments.collect', label: 'Collect payments' }, { key: 'payments.refund', label: 'Issue refunds' }, { key: 'finance.view', label: 'Finance' }, { key: 'packages.manage', label: 'Packages & memberships' }] },
  { group: 'Operations', items: [{ key: 'inventory.view', label: 'View inventory' }, { key: 'inventory.manage', label: 'Adjust inventory' }, { key: 'purchasing.manage', label: 'Purchasing' }, { key: 'staff.manage', label: 'Manage staff' }, { key: 'treatments.manage', label: 'Treatment catalog' }] },
  { group: 'Growth', items: [{ key: 'leads.manage', label: 'Lead CRM' }, { key: 'marketing.manage', label: 'Campaigns & automation' }, { key: 'cms.manage', label: 'Website CMS' }, { key: 'reports.view', label: 'Reports' }] },
  { group: 'Administration', items: [{ key: 'settings.manage', label: 'Organization settings' }, { key: 'audit.view', label: 'Audit log' }, { key: 'locations.all', label: 'All locations' }] },
]

export type Feature =
  | 'booking' | 'crm' | 'website' | 'payments' | 'memberships' | 'packages' | 'marketing' | 'inventory'
  | 'multiLocation' | 'advancedReports' | 'purchasing' | 'automation' | 'integrations' | 'sso' | 'customRoles'

export const FEATURE_LABEL: Record<Feature, string> = {
  booking: 'Online booking', crm: 'Patient & lead CRM', website: 'Clinic website + CMS', payments: 'Payments & deposits',
  memberships: 'Memberships', packages: 'Treatment packages', marketing: 'Campaigns', inventory: 'Inventory',
  multiLocation: 'Multi-location', advancedReports: 'Advanced reporting', purchasing: 'Purchasing & suppliers',
  automation: 'Advanced automation', integrations: 'Custom integrations', sso: 'SSO / SAML', customRoles: 'Custom roles',
}

export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  starter: ['booking', 'crm', 'website', 'payments'],
  growth: ['booking', 'crm', 'website', 'payments', 'memberships', 'packages', 'marketing', 'inventory'],
  pro: ['booking', 'crm', 'website', 'payments', 'memberships', 'packages', 'marketing', 'inventory', 'multiLocation', 'advancedReports', 'purchasing', 'automation', 'integrations'],
  enterprise: ['booking', 'crm', 'website', 'payments', 'memberships', 'packages', 'marketing', 'inventory', 'multiLocation', 'advancedReports', 'purchasing', 'automation', 'integrations', 'sso', 'customRoles'],
}

export const PLANS: { tier: PlanTier; name: string; price: number; blurb: string; limits: string }[] = [
  { tier: 'starter', name: 'Starter', price: 249, blurb: 'Website, booking, CRM and payments for a single clinic.', limits: '1 location · 5 staff' },
  { tier: 'growth', name: 'Growth', price: 549, blurb: 'Memberships, packages, marketing and inventory for growing teams.', limits: '1 location · 20 staff' },
  { tier: 'pro', name: 'Pro', price: 1190, blurb: 'Multi-location operations, purchasing, automation and analytics.', limits: '5 locations · unlimited staff' },
  { tier: 'enterprise', name: 'Enterprise', price: 0, blurb: 'Custom workflows, SSO, advanced permissions and dedicated support.', limits: 'Unlimited' },
]
