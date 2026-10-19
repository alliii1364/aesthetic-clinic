import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Globe, LayoutGrid, Smartphone, Building2, Sparkles, X, Layers } from 'lucide-react'
import { cn, EASE } from '@/ui/ui'

const EXPERIENCES = [
  { to: '/os', label: 'Aurelia OS', sub: 'Product & pricing', icon: Sparkles, match: (p: string) => p.startsWith('/os') },
  { to: '/', label: 'Clinic website', sub: 'Public site + booking', icon: Globe, match: (p: string) => !/^\/(os|portal|app|platform)/.test(p) },
  { to: '/portal', label: 'Patient portal', sub: 'Signed in as Emma', icon: Smartphone, match: (p: string) => p.startsWith('/portal') },
  { to: '/app', label: 'Clinic dashboard', sub: 'Operations & CRM', icon: LayoutGrid, match: (p: string) => p.startsWith('/app') },
  { to: '/platform', label: 'Platform admin', sub: 'SaaS super admin', icon: Building2, match: (p: string) => p.startsWith('/platform') },
]

/** Floating switcher that moves between the connected experiences of the product. */
export function ExperienceSwitcher() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const current = EXPERIENCES.find((e) => e.match(pathname)) ?? EXPERIENCES[1]
  return (
    <div className={cn('fixed left-4 z-[70]', pathname.startsWith('/portal') ? 'bottom-24 md:bottom-4' : 'bottom-4')}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.35, ease: EASE }}
            className="mb-2 w-64 rounded-2xl border border-stone-200/80 bg-white/95 p-1.5 shadow-lift">
            <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">One connected platform</div>
            {EXPERIENCES.map((e) => (
              <Link key={e.to} to={e.to} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors', current === e ? 'bg-cream' : 'hover:bg-cream/60')}>
                <e.icon size={16} className="text-stone-500" strokeWidth={1.6} />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-ink">{e.label}</div>
                  <div className="text-[11.5px] text-stone-500">{e.sub}</div>
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/95 py-2 pl-3 pr-4 text-[12.5px] font-medium text-ink shadow-lift transition hover:bg-white" aria-expanded={open}>
        {open ? <X size={14} /> : <Layers size={14} />}
        <span className="hidden sm:inline">{current.label}</span>
      </button>
    </div>
  )
}
