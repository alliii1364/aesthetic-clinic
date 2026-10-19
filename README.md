# Aurelia OS

**The operating system for modern aesthetic clinics.**
Website, bookings, patients, treatments, payments and clinic operations — beautifully connected in one platform.

This repository contains the complete product experience, running against a single connected domain store with realistic sample data for **Aurelia Aesthetics** (Beverly Hills & Santa Monica).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check + production build
npm test             # type-check + workflow smoke test + render test (86 routes × 4 roles)
```

Use the floating switcher (bottom-left) to move between the five experiences:

| Route | Experience |
|---|---|
| `/os` | Aurelia OS product page & pricing tiers (SaaS marketing) |
| `/` | Clinic website — treatments, practitioners, results, memberships, journal, guided booking (`/book`) |
| `/portal` | Patient portal (mobile-first PWA), signed in as Emma Roberts |
| `/app` | Clinic operating dashboard — signed in as the owner; use the user menu to **sign in as any role** |
| `/platform` | SaaS super-admin for the platform operator |

Data persists in `localStorage`. Dates re-base automatically so the demo is always "today". Reset anytime: **Settings → Data → Reset demo data**.

## Try the connected workflows

1. **Website → booking → CRM.** Book Botox at `/book` (use "fill as Emma" or a new email). The appointment, deposit payment, invoice, staff notification and audit entry appear instantly in `/app`. If the email matches an open lead, the lead moves to *Consultation Booked*.
2. **Treatment completed → everything else.** In `/app/calendar`, open a checked-in appointment → *Complete treatment*. Chart units on the face map, choose the lot, sign. The drawer then shows the chain it just ran: clinical record → exact units deducted from the earliest-expiring lot → invoice → practitioner commission → follow-up automation → aftercare message → review request. Collect the balance from the same screen.
3. **Catalog → website.** Change a price or disable online booking in `/app/treatments` or `/app/website → Pricing`. The website and booking flow update immediately, and the change is audit-logged with old → new values.
4. **Lead → patient → consultation.** In `/app/leads`, drag cards between stages, open a lead, then *Book consultation*. One click creates the patient record, books the appointment and advances the pipeline.
5. **Photo consent.** Marketing approval of a photo checks the patient's latest photography consent. Emma consented to internal use only, so approval is blocked. Approved images flow to the public `/results` gallery.
6. **RBAC.** Sign in as *Daniel Park (Receptionist)* or *Sarah Mitchell (Injector)*. The sidebar, data scope, search results and actions all change. Denied actions are blocked and written to the audit log. Owners can edit the role matrix in **Settings → Roles & permissions**.

## Performance

Measured with headless Chromium at 4× CPU throttle (`npm run perf:browser` against `vite preview --port 4319`; set `GPU=1` to use the real GPU).

| | Before | After |
|---|---|---|
| Any store update (click, toast) | ~240–340 ms | ~1 ms |
| Home, first visit — load / LCP | 9.6 s / 18 s | 2.7 s / 5–6 s |
| Treatments scroll | 13 fps, 883 ms worst frame | 39–41 fps, 250–380 ms |
| Image bytes, home | ~1.7 MB | ~0.45 MB |

Rules that keep it fast:
- **Persistence** is debounced and runs in idle time (`src/store/persistence.ts`); UI-only updates never write.
- **State is deep-frozen once after load.** Immer skips frozen subtrees, so updates stay O(changed), not O(2 MB). Never mutate store data outside actions.
- **Scroll effects run on the compositor:** CSS reveals with one shared IntersectionObserver (`<Reveal>`), CSS scroll-driven hero parallax, and transform-based bars. Avoid `backdrop-filter`, animated `filter`/`clip-path`/`width`, and framer `layout` unless an element really re-flows.
- **Images** use `srcset` + `sizes="auto"` via `<Photo>`; only the hero is `priority`.
- **Fonts:** only the faces in use are requested, and they're preloaded after load. Lazily arriving faces relayout the whole page.

## Code map

```
src/
  lib/          types (domain model), permissions + plan gating, metrics, availability, face-chart sites
  data/         deterministic seed (Aurelia tenant) + platform-level tenant summaries
  store/        Zustand + Immer store — every workflow action, permission guard and audit write
  ui/           design system (buttons, cards, drawers, modals, tabs, count-up stats) + SVG charts
  shared/       face chart, form renderer + signature pad, secure chat
  site/         public website, guided booking flow, Aurelia OS product page
  portal/       patient portal
  app/          clinic dashboard (calendar, CRM, clinical, POS, finance, inventory, marketing, reports, CMS, settings)
  platform/     SaaS super-admin
scripts/        smoke.ts (workflow assertions), render.tsx (server-renders all routes per role)
docs/           ARCHITECTURE.md — production backend, multi-tenancy, security
```

The store's action layer (`src/store/store.ts`) is written as the service layer a backend would expose. See `docs/ARCHITECTURE.md` for how it maps onto a production API.
