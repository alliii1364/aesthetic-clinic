// Server-renders every route to catch runtime render errors without a browser.
// Run: npx tsx --tsconfig tsconfig.json scripts/render.tsx
const mem: Record<string, string> = {}
const g = globalThis as any
g.localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] } }


async function main() {
  const React = await import('react')
  const { renderToString } = await import('react-dom/server')
  const { MemoryRouter, Routes, Route } = await import('react-router-dom')
  const SiteLayout = (await import('../src/site/SiteLayout')).default
  const Home = (await import('../src/site/Home')).default
  const T = await import('../src/site/Treatments')
  const P = await import('../src/site/Practitioners')
  const Pg = await import('../src/site/Pages')
  const Booking = (await import('../src/site/Booking')).default
  const Product = (await import('../src/site/ProductPage')).default
  const Portal = (await import('../src/portal/PortalRoutes')).default
  const AppR = (await import('../src/app/AppRoutes')).default
  const Platform = (await import('../src/platform/PlatformAdmin')).default
  const { useStore } = await import('../src/store/store')
  const h = React.createElement
  const { freeze } = await import('immer')
  freeze(useStore.getState(), true) // components must never mutate store state

  const tree = (path: string) => h(MemoryRouter, { initialEntries: [path] },
    h(Routes, null,
      h(Route, { element: h(SiteLayout) },
        h(Route, { index: true, element: h(Home) }),
        h(Route, { path: 'treatments', element: h(T.TreatmentsPage) }),
        h(Route, { path: 'treatments/:slug', element: h(T.TreatmentDetail) }),
        h(Route, { path: 'practitioners', element: h(P.PractitionersPage) }),
        h(Route, { path: 'practitioners/:id', element: h(P.PractitionerDetail) }),
        h(Route, { path: 'results', element: h(Pg.ResultsPage) }),
        h(Route, { path: 'about', element: h(Pg.AboutPage) }),
        h(Route, { path: 'locations', element: h(Pg.LocationsPage) }),
        h(Route, { path: 'memberships', element: h(Pg.MembershipsPage) }),
        h(Route, { path: 'reviews', element: h(Pg.ReviewsPage) }),
        h(Route, { path: 'journal', element: h(Pg.JournalPage) }),
        h(Route, { path: 'journal/:slug', element: h(Pg.PostPage) }),
        h(Route, { path: 'faq', element: h(Pg.FAQPage) }),
        h(Route, { path: 'contact', element: h(Pg.ContactPage) }),
      ),
      h(Route, { path: 'book', element: h(Booking) }),
      h(Route, { path: 'os', element: h(Product) }),
      h(Route, { path: 'portal/*', element: h(Portal) }),
      h(Route, { path: 'app/*', element: h(AppR) }),
      h(Route, { path: 'platform/*', element: h(Platform) }),
    ))

  const ptTabs = ['Overview', 'Appointments', 'Clinical', 'Photos', 'Forms', 'Payments', 'Packages', 'Membership', 'Messages', 'Notes', 'Activity']
  const routes = [
    '/', '/treatments', '/treatments?category=Injectables', '/treatments/botox', '/treatments/lip-filler', '/practitioners', '/practitioners/st_carter', '/results', '/about', '/locations', '/memberships', '/reviews', '/journal', '/journal/botox-first-time-guide', '/faq', '/contact',
    '/book', '/book?treatment=botox', '/os',
    '/portal', '/portal/appointments', '/portal/history', '/portal/packages', '/portal/membership', '/portal/payments', '/portal/documents', '/portal/photos', '/portal/messages', '/portal/profile', '/portal/more',
    '/app', '/app/calendar', '/app/calendar?appt=ap_emma_lips', '/app/appointments', '/app/patients', ...ptTabs.map((t) => `/app/patients/pt_emma?tab=${t}`),
    '/app/leads', '/app/leads?lead=ld_3', '/app/clinical', '/app/photos', '/app/forms', '/app/treatments', '/app/treatments?edit=tx_botox', '/app/packages', '/app/memberships', '/app/pos', '/app/payments', '/app/payments?invoice=inv_emma_open',
    '/app/inventory', '/app/inventory?item=inv_inj-btx-100_bh', '/app/purchasing', '/app/staff', '/app/staff?staff=st_mitchell', '/app/locations', '/app/marketing', '/app/reports', '/app/website',
    ...['Organization', 'Roles & permissions', 'Security', 'Audit log', 'Notifications', 'Integrations', 'Plan & billing', 'Data'].map((t) => `/app/settings?tab=${encodeURIComponent(t)}`),
    '/platform', '/platform/clinics', '/platform/subscriptions', '/platform/plans', '/platform/flags', '/platform/usage', '/platform/support', '/platform/logs', '/platform/announcements', '/platform/integrations', '/platform/settings',
  ]
  let fail = 0
  const origError = console.error
  for (const role of ['st_owner', 'st_reception', 'st_mitchell', 'st_marketing']) {
    useStore.getState().switchUser(role)
    for (const r of routes) {
      if (role !== 'st_owner' && !r.startsWith('/app')) continue
      const errs: string[] = []
      console.error = (...a: unknown[]) => { const m = String(a[0]); if (!/useLayoutEffect|Warning: (Each child|A component)|not wrapped in act/.test(m)) errs.push(m.slice(0, 200)) }
      try {
        const html = renderToString(tree(r))
        if (html.length < 200) throw new Error(`suspiciously small output (${html.length} chars)`)
        if (errs.length) { fail++; console.log(`WARN  [${role}] ${r} — ${errs[0]}`) }
      } catch (e) { fail++; console.log(`FAIL  [${role}] ${r} — ${(e as Error).message.split('\n')[0]}`) }
      console.error = origError
    }
  }
  console.log(fail ? `\n${fail} route renders had problems` : `\nAll ${routes.length} routes rendered for 4 roles`)
  process.exit(fail ? 1 : 0)
}
main()
