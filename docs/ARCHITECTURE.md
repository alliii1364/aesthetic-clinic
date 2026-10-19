# Aurelia OS — Architecture

This document describes how the product in this repository is structured and how it maps onto a production multi-tenant SaaS. The current build runs the full domain model and workflows in the browser (`src/store/store.ts`) so every flow is demonstrable end to end. The action layer is deliberately shaped like the server-side service layer described below.

## 1. Product surfaces

| Surface | Users | Notes |
|---|---|---|
| Clinic website | Prospective & existing patients | Rendered from the tenant's catalog, team, locations, CMS and approved media. Production: SSR/ISR per tenant domain, revalidated on publish. |
| Guided booking | Patients | Concern → recommendation → treatment → practitioner → location → date → time → details → intake → deposit → confirmation. Draft saved locally. |
| Patient portal (PWA) | Patients | Appointments, history, packages, membership, payments, documents/consents, photos, secure messaging, profile. |
| Clinic dashboard | Staff | Operations, CRM, clinical/EMR, POS, finance, inventory, purchasing, staff, marketing, reports, CMS, settings. |
| Platform admin | SaaS operator | Tenants, subscriptions, plans, feature flags, usage, support, logs, announcements. |

## 2. Domain model

Defined in `src/lib/types.ts`. Every tenant-owned entity carries `tenantId`. Key aggregates:

- **Organization**: `Tenant` (brand, plan, security policy) → `Location` → `Room`; `Staff` (role, locations, schedule, commission plan, certifications).
- **Catalog**: `Treatment` (location pricing, deposit, consumables by SKU, consent form, content, SEO), `PackageTemplate`, `MembershipPlan`.
- **Clients**: `Patient` (medical history, alerts, consents, notification prefs), `Lead` (pipeline stage, activity timeline).
- **Scheduling**: `Appointment` (status machine: Requested → Confirmed → Checked In → In Treatment → Completed | Cancelled | No Show).
- **Clinical**: `TreatmentSession` (product, lot, expiry, dosage, injection points, notes, patient-visible notes), `Photo` (stage, angle, permission), `FormTemplate` (versioned) and `FormSubmission` (version, signature, device, IP, PDF).
- **Revenue**: `Invoice`, `Payment` (Deposit | Payment | Refund; split tenders), `CommissionEntry`, `PatientPackage`, `Membership`.
- **Operations**: `InventoryItem` (base units, pack size, lots with expiry), `Supplier`, `PurchaseOrder` (partial receipt).
- **Engagement**: `Automation` → `ScheduledMessage`, `Campaign`, `ReviewRequest`, `Thread`/`Message`, `Notification`, `Task`.
- **Governance**: `AuditEvent` (user, action, module, entity, old → new, patient, location, IP, device, severity).

## 3. Connected workflows (service layer)

Each workflow is a single transactional command. In production these run server-side inside one database transaction and emit domain events to a queue.

| Command | Effects |
|---|---|
| `createBooking` | Find or create patient · appointment · intake submission (pregnancy → clinical alert) · invoice + deposit payment · lead → *Consultation Booked* · staff + patient notifications · audit |
| `completeAppointment` | Signed `TreatmentSession` · FIFO stock deduction by charted units/consumables (low-stock alert) · package redemption · invoice finalised with member discount · commission on net line value · enrol matching automations · aftercare thread · review request · audit (clinical, inventory, financial) |
| `collectPayment` / `posCheckout` | Split tenders, tips, retail tax · retail stock deduction · package/membership activation · commission · receipt · audit |
| `refund` | Refund payment · invoice status · proportional commission reversal · audit with reason |
| `receivePO` | Partial/complete receipt · pack → unit conversion · new lot with expiry · supplier balance · audit |
| `convertLead` | Patient record with attributed source/campaign · pipeline update · audit |
| `setPhotoPermission` | Consent check against latest photography consent before marketing approval · audit |
| `updateTreatment` | Per-field audit with old → new; website, booking and POS read the same record |

Domain events (production): `appointment.booked`, `appointment.completed`, `payment.captured`, `stock.low`, `lead.created`, `consent.signed`, … consumed by notification, automation, analytics and webhook workers.

## 4. Production architecture

```
Clients (website SSR · portal PWA · dashboard SPA · platform admin)
        │ HTTPS (TLS 1.3), per-tenant custom domains via edge
API gateway ── auth (OIDC; MFA; SAML SSO on Enterprise) ── rate limiting
        │
Application services (TypeScript)
  booking · clinical · billing · inventory · crm · marketing · cms · reporting · platform
        │ commands in a DB transaction → outbox → event bus
PostgreSQL (row-level security by tenant_id) · Redis (sessions, availability cache)
Object storage (photos/documents, per-tenant KMS keys, signed URLs) · Queue workers
Integrations: Stripe Connect · Twilio · Postmark · Google Calendar/Business · QuickBooks/Xero
```

### Multi-tenancy & isolation
- Shared database, shared schema. Every table has `tenant_id NOT NULL`, with **Postgres row-level security** policies on `current_setting('app.tenant_id')`, set per request from the authenticated session. There is no unscoped query path.
- Per-tenant encryption keys (envelope encryption via KMS) for media and sensitive clinical fields.
- Tenant-level config: branding, domain, plan, feature flags, security policy, retention.
- Enterprise option: dedicated database or region for data-residency requirements.

### Authorization
- Role → permission matrix (`src/lib/permissions.ts`), editable per tenant; custom roles on Enterprise.
- Two layers: **permission** (can this role perform the action?) and **scope** (which locations, or own schedule only). Both are enforced in services, not only in the UI. The demo's `guard()` mirrors this and audit-logs denials.
- Plan gating via `PLAN_FEATURES` plus platform feature flags with percentage rollout.

### Security & compliance
- HIPAA: BAA, minimum-necessary access, access logging (record views are audited via `logAccess`), session idle lock (configurable), MFA enforcement, password policy with breached-password screening.
- Audit log: append-only table plus hash chaining for tamper evidence; exported to WORM storage.
- Consent versioning: submissions reference immutable template versions; PDFs are rendered server-side and hashed.
- Backups: continuous WAL archiving, point-in-time recovery, cross-region replicas, quarterly restore drills.
- Retention: configurable per tenant (default 7 years for clinical); legal-hold support; patient data export.
- Platform staff access to tenant data requires owner-granted, time-boxed, audited support sessions.

### Availability engine
Slots = practitioner working days ∩ location hours − existing bookings (across all locations) − room conflicts. One site per practitioner per day. Cached per practitioner/day in Redis and invalidated on appointment events. See `src/lib/availability.ts`.

### Reporting
Operational metrics (`src/lib/metrics.ts`) compute from invoices, payments and appointments. In production: nightly materialized aggregates per tenant/location/day plus real-time deltas from events. Accounting sync posts journal entries to QuickBooks/Xero instead of replacing them.

## 5. Plans

| | Starter | Growth | Pro | Enterprise |
|---|---|---|---|---|
| Locations | 1 | 1 | up to 5 | unlimited |
| Booking, CRM, website, payments | ✓ | ✓ | ✓ | ✓ |
| Memberships, packages, marketing, inventory | | ✓ | ✓ | ✓ |
| Multi-location, purchasing, automation, advanced reports, integrations | | | ✓ | ✓ |
| SSO, custom roles, custom workflows, dedicated support | | | | ✓ |

## 6. Roadmap (post-V1)
Server implementation of the service layer · Stripe Terminal for in-clinic card readers · e-prescribing integrations · deeper ERP (stock transfers between locations, landed cost) · payroll export · AI-assisted clinical note drafting (behind a feature flag) · native iOS app for practitioners.
