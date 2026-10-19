import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, CalendarDays, ListChecks, Users, Target, Sparkles, Stethoscope, Camera, Package, Crown, ShoppingBag,
  CreditCard, Boxes, Truck, UserCog, Megaphone, BarChart3, MapPin, Globe, Settings, PanelLeftClose, PanelLeft, Search,
  Bell, ChevronDown, Lock, FileSignature, ShieldCheck, Check, LogOut,
} from 'lucide-react'
import { useDB, useStore, useMe, useCan } from '@/store/store'
import type { Permission } from '@/lib/types'
import { ROLE_LABEL } from '@/lib/permissions'
import { Avatar, Kbd, EASE, cn, Empty, Badge } from '@/ui/ui'
import { relative } from '@/lib/format'
import { CommandPalette } from './CommandPalette'
import { QuickCreate } from './QuickCreate'
import Dashboard from './Dashboard'
import CalendarPage from './Calendar'
import { AppointmentsList } from './AppointmentsList'
import { PatientsPage, PatientProfile } from './Patients'
import LeadsPage from './Leads'
import { TreatmentsAdmin, PackagesAdmin, MembershipsAdmin } from './Catalog'
import { ClinicalPage, PhotosAdmin, FormsAdmin } from './Clinical'
import { POSPage, PaymentsPage } from './Commerce'
import { InventoryPage, PurchasingPage, StaffPage, LocationsPage } from './Operations'
import { MarketingPage, ReportsPage } from './Growth'
import { WebsiteCMS, SettingsPage } from './Admin'

interface NavItem { to: string; label: string; icon: typeof Users; perm: Permission | Permission[]; group: string }
const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', group: 'Overview' },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays, perm: 'calendar.view', group: 'Overview' },
  { to: '/app/appointments', label: 'Appointments', icon: ListChecks, perm: 'calendar.view', group: 'Overview' },
  { to: '/app/patients', label: 'Patients', icon: Users, perm: 'patients.view', group: 'Clients' },
  { to: '/app/leads', label: 'Leads', icon: Target, perm: 'leads.manage', group: 'Clients' },
  { to: '/app/clinical', label: 'Clinical', icon: Stethoscope, perm: 'clinical.view', group: 'Clinical' },
  { to: '/app/photos', label: 'Before & After', icon: Camera, perm: ['clinical.view', 'photos.approve'], group: 'Clinical' },
  { to: '/app/forms', label: 'Forms & Consents', icon: FileSignature, perm: ['forms.manage', 'clinical.view'], group: 'Clinical' },
  { to: '/app/treatments', label: 'Treatments', icon: Sparkles, perm: ['treatments.manage', 'cms.manage'], group: 'Catalog' },
  { to: '/app/packages', label: 'Packages', icon: Package, perm: 'packages.manage', group: 'Catalog' },
  { to: '/app/memberships', label: 'Memberships', icon: Crown, perm: 'packages.manage', group: 'Catalog' },
  { to: '/app/pos', label: 'POS', icon: ShoppingBag, perm: 'payments.collect', group: 'Revenue' },
  { to: '/app/payments', label: 'Payments & Finance', icon: CreditCard, perm: ['payments.collect', 'finance.view'], group: 'Revenue' },
  { to: '/app/inventory', label: 'Inventory', icon: Boxes, perm: 'inventory.view', group: 'Operations' },
  { to: '/app/purchasing', label: 'Purchasing', icon: Truck, perm: 'purchasing.manage', group: 'Operations' },
  { to: '/app/staff', label: 'Staff', icon: UserCog, perm: ['staff.view', 'staff.manage'], group: 'Operations' },
  { to: '/app/locations', label: 'Locations', icon: MapPin, perm: 'settings.manage', group: 'Operations' },
  { to: '/app/marketing', label: 'Marketing', icon: Megaphone, perm: 'marketing.manage', group: 'Growth' },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view', group: 'Growth' },
  { to: '/app/website', label: 'Website', icon: Globe, perm: 'cms.manage', group: 'Growth' },
  { to: '/app/settings', label: 'Settings', icon: Settings, perm: ['settings.manage', 'audit.view'], group: 'Admin' },
]

const has = (can: (p: Permission) => boolean, p: Permission | Permission[]) => (Array.isArray(p) ? p.some(can) : can(p))

export function Guard({ perm, children }: { perm: Permission | Permission[]; children: ReactNode }) {
  const can = useCan()
  const me = useMe()
  if (has(can, perm)) return <>{children}</>
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Empty icon={<Lock size={20} />} title="You don’t have access to this area" body={`Your role (${ROLE_LABEL[me.role]}) doesn’t include this permission. Owners can change role access in Settings → Roles & permissions.`} action={<Link to="/app" className="text-sm underline">Back to dashboard</Link>} />
    </div>
  )
}

export default function AppRoutes() {
  const db = useDB()
  const me = useMe()
  const can = useCan()
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('aurelia-sidebar') === '1' } catch { return false } })
  const [cmd, setCmd] = useState(false)
  const [notif, setNotif] = useState(false)
  useEffect(() => { try { localStorage.setItem('aurelia-sidebar', collapsed ? '1' : '0') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((c) => !c) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const groups = [...new Set(NAV.map((n) => n.group))]
  const unread = db.notifications.filter((n) => n.audience === 'staff' && !n.read).length
  const tenant = db.tenants[0]

  return (
    <div className="flex min-h-screen bg-ivory">
      <motion.aside animate={{ width: collapsed ? 72 : 248 }} transition={{ duration: 0.45, ease: EASE }} className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-stone-200/70 bg-[#F6F3EE] md:flex">
        <div className={cn('flex h-16 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink font-display text-lg text-bronze-100">{tenant.brand.logoText[0]}</span>
          {!collapsed && <div className="min-w-0"><div className="truncate text-[14px] font-medium leading-tight">{tenant.name}</div><div className="text-[11px] text-stone-500">Aurelia OS · {tenant.plan[0].toUpperCase() + tenant.plan.slice(1)}</div></div>}
        </div>
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g) => {
            const items = NAV.filter((n) => n.group === g && has(can, n.perm))
            if (!items.length) return null
            return (
              <div key={g} className="mt-4">
                {!collapsed && <div className="mb-1 px-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400">{g}</div>}
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === '/app'} title={collapsed ? n.label : undefined}
                    className={({ isActive }) => cn('relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13.5px] transition-colors duration-200', collapsed && 'justify-center px-0', isActive ? 'text-ink' : 'text-stone-500 hover:text-ink')}>
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId="app-nav" className="absolute inset-0 rounded-lg bg-white shadow-soft" transition={{ duration: 0.35, ease: EASE }} />}
                        <n.icon size={17} strokeWidth={1.6} className="relative shrink-0" />
                        {!collapsed && <span className="relative truncate">{n.label}</span>}
                        {!collapsed && n.label === 'Leads' && <span className="relative ml-auto text-[11px] text-stone-400">{db.leads.filter((l) => l.stage === 'New Lead').length}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <button onClick={() => setCollapsed(!collapsed)} className={cn('mx-3 mb-3 flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] text-stone-500 hover:bg-white/70 hover:text-ink', collapsed && 'justify-center px-0')} aria-label="Toggle sidebar">
          {collapsed ? <PanelLeft size={17} /> : <><PanelLeftClose size={17} />Collapse</>}
        </button>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-stone-200/60 bg-ivory/[0.97] px-4 md:px-7">
          <MobileNav />
          <button onClick={() => setCmd(true)} className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-stone-200 bg-white px-3.5 text-[13px] text-stone-400 transition hover:border-stone-300 md:max-w-[420px]">
            <Search size={15} /><span className="truncate">Search patients, appointments, invoices…</span><span className="ml-auto hidden gap-1 sm:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <LocationSwitcher />
            <QuickCreate />
            <button onClick={() => setNotif(true)} className="relative grid h-9 w-9 place-items-center rounded-full text-stone-500 hover:bg-stone-200/40 hover:text-ink" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.6} />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-bronze-500 px-1 text-[9.5px] font-medium text-white ring-2 ring-ivory">{unread}</span>}
            </button>
            <UserMenu />
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-7 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={pathname.split('/').slice(0, 3).join('/') + (pathname.split('/')[3] ? '/d' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mx-auto max-w-[1440px]">
              <Routes>
                <Route index element={<Guard perm="dashboard.view"><Dashboard /></Guard>} />
                <Route path="calendar" element={<Guard perm="calendar.view"><CalendarPage /></Guard>} />
                <Route path="appointments" element={<Guard perm="calendar.view"><AppointmentsList /></Guard>} />
                <Route path="patients" element={<Guard perm="patients.view"><PatientsPage /></Guard>} />
                <Route path="patients/:id" element={<Guard perm="patients.view"><PatientProfile /></Guard>} />
                <Route path="leads" element={<Guard perm="leads.manage"><LeadsPage /></Guard>} />
                <Route path="clinical" element={<Guard perm="clinical.view"><ClinicalPage /></Guard>} />
                <Route path="photos" element={<Guard perm={['clinical.view', 'photos.approve']}><PhotosAdmin /></Guard>} />
                <Route path="forms" element={<Guard perm={['forms.manage', 'clinical.view']}><FormsAdmin /></Guard>} />
                <Route path="treatments" element={<Guard perm={['treatments.manage', 'cms.manage']}><TreatmentsAdmin /></Guard>} />
                <Route path="packages" element={<Guard perm="packages.manage"><PackagesAdmin /></Guard>} />
                <Route path="memberships" element={<Guard perm="packages.manage"><MembershipsAdmin /></Guard>} />
                <Route path="pos" element={<Guard perm="payments.collect"><POSPage /></Guard>} />
                <Route path="payments" element={<Guard perm={['payments.collect', 'finance.view']}><PaymentsPage /></Guard>} />
                <Route path="inventory" element={<Guard perm="inventory.view"><InventoryPage /></Guard>} />
                <Route path="purchasing" element={<Guard perm="purchasing.manage"><PurchasingPage /></Guard>} />
                <Route path="staff" element={<Guard perm={['staff.view', 'staff.manage']}><StaffPage /></Guard>} />
                <Route path="locations" element={<Guard perm="settings.manage"><LocationsPage /></Guard>} />
                <Route path="marketing" element={<Guard perm="marketing.manage"><MarketingPage /></Guard>} />
                <Route path="reports" element={<Guard perm="reports.view"><ReportsPage /></Guard>} />
                <Route path="website" element={<Guard perm="cms.manage"><WebsiteCMS /></Guard>} />
                <Route path="settings" element={<Guard perm={['settings.manage', 'audit.view']}><SettingsPage /></Guard>} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={cmd} onClose={() => setCmd(false)} nav={NAV.filter((n) => has(can, n.perm)).map(({ to, label, icon }) => ({ to, label, icon }))} />
      <NotificationCenter open={notif} onClose={() => setNotif(false)} />
      <SessionTimeout minutes={tenant.security.sessionTimeoutMin} me={me.name} />
    </div>
  )
}

function MobileNav() {
  const can = useCan()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return (
    <>
      <button className="grid h-9 w-9 place-items-center rounded-full md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><PanelLeft size={18} /></button>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
            <motion.nav initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.4, ease: EASE }} className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-[#F6F3EE] p-4">
              {NAV.filter((n) => has(can, n.perm)).map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/app'} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px]', isActive ? 'bg-white text-ink shadow-soft' : 'text-stone-600')}><n.icon size={17} strokeWidth={1.6} />{n.label}</NavLink>)}
            </motion.nav>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

function LocationSwitcher() {
  const db = useDB()
  const me = useMe()
  const loc = useStore((s) => s.session.locationId)
  const setLocation = useStore((s) => s.setLocation)
  const can = useCan()
  const [open, setOpen] = useState(false)
  const all = can('locations.all')
  const options = all ? db.locations : db.locations.filter((l) => me.locationIds.includes(l.id))
  const label = loc === 'all' ? 'All locations' : db.locations.find((l) => l.id === loc)?.name
  return (
    <div className="relative hidden sm:block">
      <button onClick={() => setOpen(!open)} className="flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-stone-600 hover:bg-stone-200/40 hover:text-ink"><MapPin size={15} />{label}<ChevronDown size={14} /></button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lift">
              {all && <Opt on={loc === 'all'} onClick={() => { setLocation('all'); setOpen(false) }}>All locations<span className="ml-auto text-[11px] text-stone-400">Combined</span></Opt>}
              {options.map((l) => <Opt key={l.id} on={loc === l.id} onClick={() => { setLocation(l.id); setOpen(false) }}>{l.name}</Opt>)}
              {!all && <div className="px-3 py-2 text-[11.5px] text-stone-400">Your role is limited to assigned locations.</div>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
const Opt = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors', on ? 'bg-cream text-ink' : 'text-stone-600 hover:bg-cream/60')}>{children}{on && <Check size={14} className="ml-2 text-ink" />}</button>
)

function UserMenu() {
  const db = useDB()
  const me = useMe()
  const switchUser = useStore((s) => s.switchUser)
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-stone-200/40"><Avatar name={me.name} src={me.avatar} size={30} /><span className="hidden text-left lg:block"><span className="block text-[12.5px] font-medium leading-tight">{me.name}</span><span className="block text-[11px] leading-tight text-stone-500">{ROLE_LABEL[me.role]}</span></span><ChevronDown size={14} className="hidden text-stone-400 lg:block" /></button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }} className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-lift">
              <div className="flex items-center gap-2 px-3 pb-2 pt-2.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-stone-400"><ShieldCheck size={12} />Demo · sign in as role</div>
              <div className="max-h-[52vh] overflow-y-auto">
                {db.staff.filter((s) => s.active).map((s) => (
                  <button key={s.id} onClick={() => { switchUser(s.id); setOpen(false); nav('/app') }} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors', s.id === me.id ? 'bg-cream' : 'hover:bg-cream/60')}>
                    <Avatar name={s.name} src={s.avatar} size={28} />
                    <div className="min-w-0 flex-1"><div className="truncate text-[13px] text-ink">{s.name}</div><div className="text-[11.5px] text-stone-500">{ROLE_LABEL[s.role]}</div></div>
                    {s.id === me.id && <Check size={14} />}
                  </button>
                ))}
              </div>
              <div className="mt-1 border-t border-stone-100 pt-1">
                <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-stone-600 hover:bg-cream/60"><LogOut size={14} />Sign out</Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const markRead = useStore((s) => s.markNotificationsRead)
  const nav = useNavigate()
  const list = db.notifications.filter((n) => n.audience === 'staff').slice(0, 30)
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }} className="absolute right-4 top-16 flex max-h-[75vh] w-[400px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4"><div className="text-[15px] font-medium">Notifications</div><button onClick={() => markRead('staff')} className="text-[12.5px] text-stone-500 hover:text-ink">Mark all read</button></div>
            <div className="overflow-y-auto">
              {list.map((n) => (
                <button key={n.id} onClick={() => { if (n.href) nav(n.href); onClose() }} className="flex w-full gap-3 border-b border-stone-100 px-5 py-3.5 text-left transition-colors hover:bg-cream/50">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-stone-200' : 'bg-bronze-500')} />
                  <div className="min-w-0 flex-1"><div className="text-[13.5px] text-ink">{n.title}</div><div className="text-[12.5px] text-stone-500">{n.body}</div><div className="mt-1 text-[11px] text-stone-400">{relative(n.at)}</div></div>
                  <Badge className="self-start">{n.kind}</Badge>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Idle session lock — a HIPAA-minded safeguard for shared front-desk machines. */
function SessionTimeout({ minutes, me }: { minutes: number; me: string }) {
  const [locked, setLocked] = useState(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reset = () => { clearTimeout(t); t = setTimeout(() => setLocked(true), minutes * 60000) }
    const evs = ['mousemove', 'keydown', 'pointerdown', 'scroll']
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, reset)) }
  }, [minutes])
  return (
    <AnimatePresence>
      {locked && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-ivory">
          <div className="text-center">
            <Lock className="mx-auto text-stone-400" />
            <div className="mt-4 font-display text-[34px] text-ink">Session locked</div>
            <p className="mt-1 text-[14px] text-stone-500">Locked after {minutes} minutes of inactivity to protect patient data.</p>
            <button onClick={() => setLocked(false)} className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm text-ivory">Continue as {me}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
