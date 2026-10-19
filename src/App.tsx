import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from '@/ui/ui'
import { ExperienceSwitcher } from '@/shared/ExperienceSwitcher'

// Public website: layout + home are in the entry bundle; every other page is its own chunk.
import SiteLayout from '@/site/SiteLayout'
import Home from '@/site/Home'
// If a code-split chunk fails to load (network blip, or a tab left open across a redeploy whose old
// hashed files are gone), reload once to pick up the current build instead of crashing the app.
const RELOAD_KEY = 'aurelia-chunk-reload-at'
function recoverable<T>(load: () => Promise<T>): () => Promise<T> {
  return () => load().catch((err) => {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      window.location.reload()
      return new Promise<T>(() => {}) // keep Suspense pending while the page reloads
    }
    throw err
  })
}
const named = <M, K extends keyof M>(load: () => Promise<M>, key: K) => lazy(() => load().then((m) => ({ default: m[key] as unknown as React.ComponentType })))
const treatments = recoverable(() => import('@/site/Treatments'))
const practitioners = recoverable(() => import('@/site/Practitioners'))
const pages = recoverable(() => import('@/site/Pages'))
const TreatmentsPage = named(treatments, 'TreatmentsPage')
const TreatmentDetail = named(treatments, 'TreatmentDetail')
const PractitionersPage = named(practitioners, 'PractitionersPage')
const PractitionerDetail = named(practitioners, 'PractitionerDetail')
const ResultsPage = named(pages, 'ResultsPage')
const AboutPage = named(pages, 'AboutPage')
const LocationsPage = named(pages, 'LocationsPage')
const MembershipsPage = named(pages, 'MembershipsPage')
const ReviewsPage = named(pages, 'ReviewsPage')
const JournalPage = named(pages, 'JournalPage')
const PostPage = named(pages, 'PostPage')
const FAQPage = named(pages, 'FAQPage')
const ContactPage = named(pages, 'ContactPage')
const BookingFlow = lazy(recoverable(() => import('@/site/Booking')))

// Heavier experiences are split into their own chunks
const ProductPage = lazy(recoverable(() => import('@/site/ProductPage')))
const PortalRoutes = lazy(recoverable(() => import('@/portal/PortalRoutes')))
const AppRoutes = lazy(recoverable(() => import('@/app/AppRoutes')))
const PlatformAdmin = lazy(recoverable(() => import('@/platform/PlatformAdmin')))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return null
}

const Loading = () => (
  <div className="grid min-h-screen place-items-center bg-ivory">
    <div className="font-display text-2xl tracking-wide text-stone-400">Aurelia</div>
  </div>
)

// After first paint, quietly fetch the other website chunks so navigating feels instant.
function usePrefetchSite() {
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
    const run = () => { treatments(); practitioners(); pages(); import('@/site/Booking') }
    const t = setTimeout(() => (idle ? idle(run, { timeout: 4000 }) : run()), 2500)
    return () => clearTimeout(t)
  }, [])
}

export default function App() {
  usePrefetchSite()
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="treatments" element={<TreatmentsPage />} />
            <Route path="treatments/:slug" element={<TreatmentDetail />} />
            <Route path="practitioners" element={<PractitionersPage />} />
            <Route path="practitioners/:id" element={<PractitionerDetail />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="locations" element={<LocationsPage />} />
            <Route path="memberships" element={<MembershipsPage />} />
            <Route path="packages" element={<Navigate to="/memberships#packages" replace />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="journal/:slug" element={<PostPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="contact" element={<ContactPage />} />
          </Route>
          <Route path="book" element={<BookingFlow />} />
          <Route path="os" element={<ProductPage />} />
          <Route path="portal/*" element={<PortalRoutes />} />
          <Route path="app/*" element={<AppRoutes />} />
          <Route path="platform/*" element={<PlatformAdmin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <ExperienceSwitcher />
      <Toaster />
    </>
  )
}
