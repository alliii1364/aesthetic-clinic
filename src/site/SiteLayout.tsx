import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ArrowUpRight, Instagram, Phone } from 'lucide-react'
import { useDB, cmsOf } from '@/store/store'
import { Button, cn, EASE } from '@/ui/ui'

const NAV = [
  { to: '/treatments', label: 'Treatments' },
  { to: '/results', label: 'Results' },
  { to: '/practitioners', label: 'Practitioners' },
  { to: '/memberships', label: 'Memberships' },
  { to: '/locations', label: 'Locations' },
  { to: '/journal', label: 'Journal' },
]

export const Logo = ({ light, className }: { light?: boolean; className?: string }) => {
  const db = useDB()
  return (
    <Link to="/" className={cn('font-display text-[26px] font-medium tracking-[0.02em]', light ? 'text-white' : 'text-ink', className)}>
      {db.tenants[0].brand.logoText}
      <span className="ml-1.5 align-middle font-sans text-[10px] font-medium uppercase tracking-[0.3em] opacity-60">Aesthetics</span>
    </Link>
  )
}

export default function SiteLayout() {
  const db = useDB()
  const cms = cmsOf(db)
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  const overHero = pathname === '/' && !scrolled

  // A sentinel + IntersectionObserver instead of a scroll listener: no work per scroll event and
  // no forced synchronous layout from reading scrollY mid-animation.
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setScrolled(!e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => setMenu(false), [pathname])

  return (
    <div className="relative min-h-screen bg-ivory">
      <div ref={sentinel} aria-hidden className="pointer-events-none absolute left-0 top-0 h-10 w-px" />
      {cms.announcement.active && (
        <div className="relative z-40 bg-ink px-4 py-2 text-center text-[12.5px] tracking-wide text-ivory/90">
          {cms.announcement.text} <Link to="/book" className="ml-1 underline decoration-ivory/40 underline-offset-4 hover:decoration-ivory">Book now</Link>
        </div>
      )}
      <header className={cn('sticky top-0 z-30 transition-[background,box-shadow,backdrop-filter] duration-700 ease-lux', overHero ? 'bg-transparent' : 'bg-ivory/[0.97] shadow-[0_1px_0_rgba(30,28,26,0.06)]')}>
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 md:px-8">
          <Logo />
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => cn('group relative text-[13.5px] tracking-wide transition-colors duration-300', isActive ? 'text-ink' : 'text-stone-600 hover:text-ink')}>
                {({ isActive }) => (
                  <>
                    {n.label}
                    <span className={cn('absolute -bottom-1.5 left-0 h-px bg-ink transition-all duration-500 ease-lux', isActive ? 'w-full' : 'w-0 group-hover:w-full')} />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/portal" className="hidden text-[13.5px] text-stone-600 transition-colors hover:text-ink md:block">Patient login</Link>
            <Link to="/book" className="hidden sm:block"><Button size="sm" className="ml-3 h-10 px-5">Book Consultation</Button></Link>
            <button className="grid h-10 w-10 place-items-center rounded-full lg:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu size={20} /></button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-ivory px-6 py-5 lg:hidden">
            <div className="flex items-center justify-between"><Logo /><button onClick={() => setMenu(false)} className="grid h-10 w-10 place-items-center" aria-label="Close menu"><X size={22} /></button></div>
            <nav className="mt-12 space-y-1">
              {[...NAV, { to: '/about', label: 'About' }, { to: '/faq', label: 'FAQs' }, { to: '/contact', label: 'Contact' }, { to: '/portal', label: 'Patient login' }].map((n, i) => (
                <motion.div key={n.to} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.6, ease: EASE }}>
                  <Link to={n.to} className="block py-2 font-display text-[34px] text-ink">{n.label}</Link>
                </motion.div>
              ))}
            </nav>
            <Link to="/book" className="absolute inset-x-6 bottom-8"><Button size="lg" className="w-full">Book Consultation</Button></Link>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.main key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5, ease: EASE }} className={pathname === '/' ? '-mt-[72px]' : ''}>
          <Suspense fallback={<div className="min-h-[80vh]" />}><Outlet /></Suspense>
        </motion.main>
      </AnimatePresence>

      <Footer />
    </div>
  )
}

function Footer() {
  const db = useDB()
  const cats = [...new Set(db.treatments.filter((t) => t.active).map((t) => t.category))].slice(0, 6)
  return (
    <footer className="grain mt-24 bg-ink text-ivory/80">
      <div className="mx-auto max-w-[1320px] px-5 pb-10 pt-20 md:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo light />
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-ivory/60">Physician-led aesthetic medicine in Beverly Hills and Santa Monica. Natural results, considered care.</p>
            <Link to="/book" className="mt-7 inline-flex items-center gap-2 border-b border-ivory/30 pb-1 text-sm text-ivory transition-colors hover:border-ivory">Book a consultation <ArrowUpRight size={14} /></Link>
          </div>
          <div className="md:col-span-2">
            <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-ivory/40">Treatments</div>
            <ul className="space-y-2.5 text-[13.5px]">{cats.map((c) => <li key={c}><Link to={`/treatments?category=${encodeURIComponent(c)}`} className="hover:text-ivory">{c}</Link></li>)}</ul>
          </div>
          <div className="md:col-span-2">
            <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-ivory/40">Clinic</div>
            <ul className="space-y-2.5 text-[13.5px]">
              {[['/about', 'About'], ['/practitioners', 'Practitioners'], ['/results', 'Before & After'], ['/reviews', 'Reviews'], ['/memberships', 'Memberships'], ['/faq', 'FAQs'], ['/contact', 'Contact']].map(([to, l]) => <li key={to}><Link to={to} className="hover:text-ivory">{l}</Link></li>)}
            </ul>
          </div>
          {db.locations.filter((l) => l.active).map((l) => (
            <div key={l.id} className="md:col-span-2">
              <div className="mb-4 text-[11px] uppercase tracking-[0.18em] text-ivory/40">{l.name}</div>
              <p className="text-[13.5px] leading-relaxed">{l.address}<br />{l.city}</p>
              <a href={`tel:${l.phone}`} className="mt-3 flex items-center gap-2 text-[13.5px] hover:text-ivory"><Phone size={13} />{l.phone}</a>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-ivory/10 pt-6 text-[12px] text-ivory/40">
          <span>© {new Date().getFullYear()} {db.tenants[0].name}. Medical treatments are performed by licensed professionals. Individual results vary.</span>
          <div className="flex items-center gap-5"><Link to="/faq" className="hover:text-ivory">Privacy</Link><Link to="/faq" className="hover:text-ivory">Terms</Link><Instagram size={15} /><span className="text-ivory/30">Powered by Aurelia OS</span></div>
        </div>
      </div>
    </footer>
  )
}
