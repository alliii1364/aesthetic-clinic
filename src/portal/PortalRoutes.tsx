import { useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, CalendarDays, Sparkles, MessageCircle, User, Package, Crown, CreditCard, FileText, History, Camera, Bell, ChevronRight, MapPin, Clock, CalendarPlus, X, Star, ArrowRight, LogOut, Grid2x2 } from 'lucide-react'
import { useDB, useStore, staffName, locationName, treatmentName } from '@/store/store'
import type { Appointment, ID } from '@/lib/types'
import { Avatar, Badge, Button, Card, Modal, Photo, Progress, Segmented, StatusBadge, EASE, cn } from '@/ui/ui'
import { addDays, fmtDate, fmtDay, fmtTime, money, relative, startOfDay } from '@/lib/format'
import { slotsFor } from '@/lib/availability'
import { TreatmentHistory, PackagesPage, MembershipPage, PaymentsPage, DocumentsPage, PhotosPage, MessagesPage, ProfilePage } from './PortalPages'

export const usePatient = () => {
  const db = useDB()
  const id = useStore((s) => s.session.portalPatientId)
  return db.patients.find((p) => p.id === id)!
}

const NAV = [
  { to: '/portal', label: 'Home', icon: Home, end: true },
  { to: '/portal/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/portal/history', label: 'Treatment history', icon: History },
  { to: '/portal/packages', label: 'My packages', icon: Package },
  { to: '/portal/membership', label: 'Membership', icon: Crown },
  { to: '/portal/payments', label: 'Payments', icon: CreditCard },
  { to: '/portal/documents', label: 'Documents', icon: FileText },
  { to: '/portal/photos', label: 'Photos', icon: Camera },
  { to: '/portal/messages', label: 'Messages', icon: MessageCircle },
  { to: '/portal/profile', label: 'Profile', icon: User },
]
const MOBILE = [NAV[0], NAV[1], { to: '/portal/history', label: 'Treatments', icon: Sparkles }, NAV[8], { to: '/portal/more', label: 'More', icon: Grid2x2 }]

export default function PortalRoutes() {
  const db = useDB()
  const p = usePatient()
  const { pathname } = useLocation()
  const unread = db.threads.filter((t) => t.patientId === p.id && t.unreadPatient).length
  const notes = db.notifications.filter((n) => n.audience === 'patient' && n.patientId === p.id && !n.read).length
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ivory md:flex">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-stone-200/70 bg-cream/40 px-4 py-6 md:flex">
        <Link to="/" className="px-3 font-display text-[24px] text-ink">Aurelia</Link>
        <div className="px-3 text-[11px] uppercase tracking-[0.18em] text-stone-400">Patient portal</div>
        <nav className="mt-8 flex-1 space-y-0.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors', isActive ? 'text-ink' : 'text-stone-500 hover:text-ink')}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="portal-nav" className="absolute inset-0 rounded-xl bg-white shadow-soft" transition={{ duration: 0.4, ease: EASE }} />}
                  <n.icon size={17} strokeWidth={1.6} className="relative" />
                  <span className="relative">{n.label}</span>
                  {n.label === 'Messages' && unread > 0 && <span className="relative ml-auto rounded-full bg-bronze-500 px-1.5 text-[10.5px] text-white">{unread}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
          <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={36} />
          <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{p.firstName} {p.lastName}</div><div className="truncate text-[11.5px] text-stone-500">{p.email}</div></div>
          <Link to="/" aria-label="Sign out" className="text-stone-400 hover:text-ink"><LogOut size={15} /></Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-10">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-ivory/[0.97] px-5 md:px-10">
          <Link to="/" className="font-display text-[22px] md:hidden">Aurelia</Link>
          <div className="hidden text-[13px] text-stone-500 md:block">{fmtDay(new Date())}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setNotifOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-stone-200/40" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.6} />
              {notes > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-bronze-500 ring-2 ring-ivory" />}
            </button>
            <Link to="/portal/profile" className="md:hidden"><Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={34} /></Link>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.main key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mx-auto max-w-[920px] px-5 pt-2 md:px-10">
            <Routes>
              <Route index element={<PortalHome />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="history" element={<TreatmentHistory />} />
              <Route path="packages" element={<PackagesPage />} />
              <Route path="membership" element={<MembershipPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="photos" element={<PhotosPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="more" element={<MorePage />} />
            </Routes>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/70 bg-ivory/[0.97] pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/portal'} className={({ isActive }) => cn('relative flex flex-col items-center gap-1 py-2.5 text-[10.5px]', isActive ? 'text-ink' : 'text-stone-400')}>
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-dot" className="absolute top-0 h-0.5 w-8 rounded-full bg-ink" />}
                  <n.icon size={20} strokeWidth={isActive ? 1.9 : 1.5} />
                  {n.label}
                  {n.label === 'Messages' && unread > 0 && <span className="absolute right-[calc(50%-18px)] top-2 h-2 w-2 rounded-full bg-bronze-500" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  )
}

function NotificationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const p = usePatient()
  const markRead = useStore((s) => s.markNotificationsRead)
  const list = db.notifications.filter((n) => n.audience === 'patient' && n.patientId === p.id).slice(0, 12)
  return (
    <Modal open={open} onClose={() => { markRead('patient'); onClose() }} title="Notifications" width={460}>
      <div className="divide-y divide-stone-100">
        {list.map((n) => (
          <div key={n.id} className="flex gap-3 py-3.5">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-stone-200' : 'bg-bronze-500')} />
            <div className="min-w-0 flex-1"><div className="text-[14px] text-ink">{n.title}</div><div className="text-[13px] text-stone-500">{n.body}</div><div className="mt-1 text-[11.5px] text-stone-400">{n.channel} · {relative(n.at)}</div></div>
          </div>
        ))}
        {!list.length && <p className="py-8 text-center text-sm text-stone-500">You’re all caught up.</p>}
      </div>
    </Modal>
  )
}

const REBOOK_DAYS: Record<string, number> = { tx_botox: 98, tx_hydra: 30, tx_peel: 30, tx_microneedling: 42, tx_lip: 180, tx_filler: 365, tx_prp: 30, tx_laser: 120, tx_iv: 30 }

export function useUpcoming(patientId: ID) {
  const db = useDB()
  return db.appointments.filter((a) => a.patientId === patientId && new Date(a.start).getTime() > Date.now() - 3600000 && !['Cancelled', 'Completed', 'No Show'].includes(a.status)).sort((a, b) => a.start.localeCompare(b.start))
}

function PortalHome() {
  const db = useDB()
  const p = usePatient()
  const nav = useNavigate()
  const upcoming = useUpcoming(p.id)
  const next = upcoming[0]
  const sessions = db.sessions.filter((s) => s.patientId === p.id).sort((a, b) => b.at.localeCompare(a.at))
  const recent = sessions[0]
  const pkg = db.patientPackages.find((x) => x.patientId === p.id && x.status === 'Active')
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const plan = db.membershipPlans.find((x) => x.id === mem?.planId)
  const outstanding = db.invoices.filter((i) => i.patientId === p.id && ['Open', 'Partial'].includes(i.status))
  const owed = outstanding.reduce((a, i) => a + i.total - i.paid, 0)
  const threads = db.threads.filter((t) => t.patientId === p.id).slice(0, 2)
  const review = db.reviewRequests.find((r) => r.patientId === p.id && r.status === 'Sent')
  const pendingConsent = upcoming.find((a) => a.consent === 'Pending')
  const recommendation = useMemo(() => {
    const due = Object.entries(REBOOK_DAYS).map(([tid, days]) => {
      const last = sessions.find((s) => s.treatmentId === tid)
      if (!last) return null
      const date = addDays(last.at, days)
      if (upcoming.some((a) => a.treatmentId === tid)) return null
      return { tid, date, last }
    }).filter(Boolean) as { tid: string; date: Date; last: (typeof sessions)[0] }[]
    return due.sort((a, b) => a.date.getTime() - b.date.getTime())[0]
  }, [sessions, upcoming])
  const hour = new Date().getHours()

  return (
    <div className="space-y-5 pb-10">
      <div className="pb-2 pt-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="font-display text-[40px] leading-tight text-ink md:text-[48px]">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {p.firstName}.</motion.div>
        <p className="mt-1 text-[15px] text-stone-500">{next ? `Your next visit is ${relative(next.start).replace('in ', 'in ')}.` : 'It’s lovely to see you.'}</p>
      </div>

      {(pendingConsent || review) && (
        <div className="space-y-3">
          {pendingConsent && (
            <Link to="/portal/documents" className="flex items-center gap-4 rounded-2xl border border-bronze-100 bg-bronze-50 p-4">
              <FileText size={18} className="shrink-0 text-bronze-600" />
              <div className="flex-1 text-[14px] text-bronze-700">Please sign your consent form before your {treatmentName(db, pendingConsent.treatmentId)} on {fmtDate(pendingConsent.start, { month: 'short', day: 'numeric' })}.</div>
              <ChevronRight size={16} className="text-bronze-600" />
            </Link>
          )}
          {review && <ReviewPrompt requestId={review.id} />}
        </div>
      )}

      {next ? (
        <Card className="overflow-hidden" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}>
          <div className="grid md:grid-cols-[1fr_260px]">
            <div className="p-6">
              <div className="flex items-center justify-between"><span className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Upcoming appointment</span><StatusBadge status={next.status} /></div>
              <div className="mt-3 font-display text-[34px] leading-tight text-ink">{treatmentName(db, next.treatmentId)}</div>
              <div className="mt-3 grid gap-2 text-[14px] text-stone-600 sm:grid-cols-2">
                <span className="flex items-center gap-2"><CalendarDays size={15} className="text-stone-400" />{fmtDay(next.start)}</span>
                <span className="flex items-center gap-2"><Clock size={15} className="text-stone-400" />{fmtTime(next.start)} · {next.duration} min</span>
                <span className="flex items-center gap-2"><User size={15} className="text-stone-400" />{staffName(db, next.practitionerId)}</span>
                <span className="flex items-center gap-2"><MapPin size={15} className="text-stone-400" />{locationName(db, next.locationId)}</span>
              </div>
              {next.notes && <div className="mt-4 rounded-xl bg-cream px-3.5 py-2.5 text-[13px] text-stone-600">{next.notes}</div>}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => nav('/portal/appointments', { state: { open: next.id } })}>Manage</Button>
                <Button size="sm" variant="secondary" icon={<CalendarPlus size={14} />} onClick={() => downloadIcs(db, next)}>Add to calendar</Button>
              </div>
            </div>
            <Photo src={db.treatments.find((t) => t.id === next.treatmentId)!.image} className="hidden h-full min-h-[200px] md:block" />
          </div>
        </Card>
      ) : (
        <Card className="p-6"><div className="font-display text-[26px]">No upcoming appointments</div><Link to="/book"><Button className="mt-4">Book a treatment</Button></Link></Card>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {recommendation && (
          <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease: EASE }}>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Recommended next</div>
            <div className="mt-2 font-display text-[28px] text-ink">{treatmentName(db, recommendation.tid)}</div>
            <p className="mt-1 text-[13.5px] text-stone-500">{recommendation.date < new Date() ? 'Now due' : `Ideal from ${fmtDate(recommendation.date, { month: 'long', day: 'numeric' })}`} · last treated {fmtDate(recommendation.last.at, { month: 'short', day: 'numeric' })} by {staffName(db, recommendation.last.practitionerId).split(' ')[0] === 'Dr.' ? staffName(db, recommendation.last.practitionerId) : staffName(db, recommendation.last.practitionerId).split(' ')[0]}</p>
            <Link to={`/book?treatment=${db.treatments.find((t) => t.id === recommendation.tid)?.slug}&practitioner=${recommendation.last.practitionerId}`}><Button size="sm" variant="secondary" className="mt-4">Book now <ArrowRight size={14} /></Button></Link>
          </Card>
        )}
        {pkg && (() => {
          const tpl = db.packageTemplates.find((x) => x.id === pkg.templateId)!
          return (
            <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: EASE }}>
              <div className="flex items-center justify-between"><span className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Active package</span><Link to="/portal/packages" className="text-[12.5px] text-stone-500 hover:text-ink">View</Link></div>
              <div className="mt-2 font-display text-[28px] text-ink">{tpl.name}</div>
              <div className="mt-4 space-y-3">
                {pkg.items.map((it) => (
                  <div key={it.treatmentId}>
                    <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-stone-600">{treatmentName(db, it.treatmentId)}</span><span className="tabular-nums text-ink">{it.used} of {it.qty} used</span></div>
                    <Progress value={it.used} max={it.qty} color="#A8642A" />
                  </div>
                ))}
              </div>
            </Card>
          )
        })()}
        {mem && plan && (
          <Link to="/portal/membership">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease: EASE }} className="grain relative h-full overflow-hidden rounded-2xl bg-ink p-6 text-ivory transition-shadow hover:shadow-lift">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 bg-[radial-gradient(circle,rgba(168,100,42,0.32),transparent_68%)]" />
              <div className="flex items-center justify-between"><span className="text-[11.5px] uppercase tracking-[0.14em] text-ivory/50">Membership</span><Crown size={16} className="text-bronze-300" /></div>
              <div className="mt-2 font-display text-[30px]">{plan.name}</div>
              <div className="mt-1 text-[13px] text-ivory/60">{mem.credits} credit{mem.credits === 1 ? '' : 's'} available · renews {fmtDate(mem.renewsAt, { month: 'short', day: 'numeric' })}</div>
              <div className="mt-5 text-[12.5px] text-bronze-100">{Math.round(plan.discountPct * 100)}% off every treatment</div>
            </motion.div>
          </Link>
        )}
        {recent && (
          <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7, ease: EASE }}>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Recent treatment</div>
            <div className="mt-2 font-display text-[26px] text-ink">{treatmentName(db, recent.treatmentId)}</div>
            <div className="text-[13px] text-stone-500">{fmtDate(recent.at)} · {staffName(db, recent.practitionerId)}</div>
            {recent.patientNotes && <p className="mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-stone-600">“{recent.patientNotes}”</p>}
            <Link to="/portal/history" className="mt-3 inline-flex items-center gap-1 text-[13px] text-ink">Aftercare & history <ChevronRight size={14} /></Link>
          </Card>
        )}
        {owed > 0 && (
          <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease: EASE }}>
            <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Outstanding balance</div>
            <div className="mt-2 font-display text-[36px] text-ink">{money(owed, true)}</div>
            <div className="text-[13px] text-stone-500">{outstanding.length} invoice{outstanding.length > 1 ? 's' : ''} · due at your visit</div>
            <Link to="/portal/payments"><Button size="sm" className="mt-4">Pay now</Button></Link>
          </Card>
        )}
        <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: EASE }}>
          <div className="flex items-center justify-between"><span className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Messages from the clinic</span><Link to="/portal/messages" className="text-[12.5px] text-stone-500 hover:text-ink">All</Link></div>
          <div className="mt-3 divide-y divide-stone-100">
            {threads.map((t) => {
              const last = t.messages[t.messages.length - 1]
              return (
                <Link key={t.id} to="/portal/messages" state={{ open: t.id }} className="flex gap-3 py-3">
                  <Avatar name={last.authorId ? staffName(db, last.authorId) : 'You'} src={db.staff.find((s) => s.id === last.authorId)?.avatar} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="truncate text-[13.5px] font-medium text-ink">{t.subject}</span>{t.unreadPatient && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bronze-500" />}</div>
                    <p className="truncate text-[13px] text-stone-500">{last.text}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ReviewPrompt({ requestId }: { requestId: ID }) {
  const db = useDB()
  const submit = useStore((s) => s.submitReview)
  const r = db.reviewRequests.find((x) => x.id === requestId)!
  const a = db.appointments.find((x) => x.id === r.appointmentId)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [done, setDone] = useState<null | 'google' | 'internal'>(null)
  return (
    <Card className="p-5">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[14px] text-stone-600">
            {done === 'google' ? <>Thank you! Would you share it publicly? <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" className="ml-1 font-medium text-ink underline underline-offset-4">Leave a Google review</a></> : 'Thank you for telling us — the clinic manager will personally reach out within a day.'}
          </motion.div>
        ) : (
          <motion.div key="ask" exit={{ opacity: 0 }}>
            <div className="text-[14.5px] text-ink">How was your experience{a ? ` — ${treatmentName(db, a.treatmentId)} with ${staffName(db, a.practitionerId).replace('Dr. ', 'Dr ').split(' ').slice(0, 2).join(' ')}` : ''}?</div>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => <motion.button key={n} whileTap={{ scale: 0.85 }} onClick={() => setRating(n)} aria-label={`${n} stars`}><Star size={26} strokeWidth={1.4} className={n <= rating ? 'fill-bronze-500 text-bronze-500' : 'text-stone-300'} /></motion.button>)}
            </div>
            {rating > 0 && rating < 4 && <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What could we have done better? This goes privately to the clinic manager." className="mt-3 w-full rounded-xl border border-stone-200 p-3 text-[13.5px] outline-none focus:border-stone-400" />}
            {rating > 0 && <Button size="sm" className="mt-3" onClick={() => { submit(requestId, rating, comment); setDone(rating >= 4 ? 'google' : 'internal') }}>Submit</Button>}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export function downloadIcs(db: ReturnType<typeof useDB>, a: Appointment) {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const s = new Date(a.start)
  const loc = db.locations.find((l) => l.id === a.locationId)!
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${f(s)}`, `DTEND:${f(new Date(s.getTime() + a.duration * 60000))}`, `SUMMARY:${treatmentName(db, a.treatmentId)} · Aurelia`, `LOCATION:${loc.address}, ${loc.city}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
  const el = document.createElement('a'); el.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); el.download = 'aurelia.ics'; el.click()
}

function AppointmentsPage() {
  const db = useDB()
  const p = usePatient()
  const loc = useLocation()
  const [tab, setTab] = useState<'Upcoming' | 'Completed' | 'Cancelled'>('Upcoming')
  const [open, setOpen] = useState<ID | null>((loc.state as { open?: ID } | null)?.open ?? null)
  const mine = db.appointments.filter((a) => a.patientId === p.id)
  const list = (tab === 'Upcoming' ? mine.filter((a) => new Date(a.start).getTime() > Date.now() - 3600000 && !['Cancelled', 'Completed', 'No Show'].includes(a.status)) : tab === 'Completed' ? mine.filter((a) => a.status === 'Completed') : mine.filter((a) => ['Cancelled', 'No Show'].includes(a.status))).sort((a, b) => (tab === 'Upcoming' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)))
  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-4">
        <h1 className="font-display text-[40px] leading-none text-ink">Appointments</h1>
        <Link to="/book"><Button size="sm">Book new</Button></Link>
      </div>
      <Segmented options={['Upcoming', 'Completed', 'Cancelled'] as const} value={tab} onChange={setTab} id="appt-tabs" />
      <div className="mt-5 space-y-3">
        <AnimatePresence mode="popLayout">
          {list.map((a, i) => (
            <motion.button layout key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03, duration: 0.4, ease: EASE }} onClick={() => setOpen(a.id)}
              className="flex w-full items-center gap-4 rounded-2xl border border-stone-200/70 bg-white p-4 text-left shadow-soft transition-shadow hover:shadow-lift">
              <div className="w-14 shrink-0 rounded-xl bg-cream py-2 text-center">
                <div className="text-[10.5px] uppercase tracking-wider text-stone-500">{new Date(a.start).toLocaleDateString('en-US', { month: 'short' })}</div>
                <div className="font-display text-[24px] leading-none text-ink">{new Date(a.start).getDate()}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-ink">{treatmentName(db, a.treatmentId)}</div>
                <div className="truncate text-[13px] text-stone-500">{fmtTime(a.start)} · {staffName(db, a.practitionerId)} · {locationName(db, a.locationId)}</div>
              </div>
              <StatusBadge status={a.status} />
            </motion.button>
          ))}
        </AnimatePresence>
        {!list.length && <p className="py-16 text-center text-[14px] text-stone-500">No {tab.toLowerCase()} appointments.</p>}
      </div>
      <AppointmentSheet id={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function AppointmentSheet({ id, onClose }: { id: ID | null; onClose: () => void }) {
  const db = useDB()
  const nav = useNavigate()
  const cancel = useStore((s) => s.setAppointmentStatus)
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel'>('view')
  const a = db.appointments.find((x) => x.id === id)
  const t = db.treatments.find((x) => x.id === a?.treatmentId)
  const inv = db.invoices.find((i) => i.id === a?.invoiceId)
  const close = () => { setMode('view'); onClose() }
  const isUpcoming = a && new Date(a.start) > new Date() && !['Cancelled', 'Completed', 'No Show'].includes(a.status)
  const lateCancel = a && new Date(a.start).getTime() - Date.now() < 48 * 3600000
  return (
    <Modal open={!!a} onClose={close} width={540} title={t?.name} subtitle={a ? `${fmtDay(a.start)} · ${fmtTime(a.start)}` : ''}>
      {a && t && mode === 'view' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between"><StatusBadge status={a.status} />{a.packageId && <Badge tone="bronze">Package session</Badge>}</div>
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 bg-white px-4">
            {[['Practitioner', staffName(db, a.practitionerId)], ['Location', `${locationName(db, a.locationId)} · ${db.locations.find((l) => l.id === a.locationId)?.address}`], ['Duration', `${a.duration} minutes`], ['Price', a.price ? money(a.price) : a.packageId ? 'Included in package' : 'Complimentary'], ['Deposit', a.deposit ? `${money(a.deposit)} ${a.depositPaid ? '· paid' : '· due'}` : '—'], ['Balance', inv ? money(Math.max(0, inv.total - inv.paid), true) : '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-3 text-[14px]"><span className="text-stone-500">{k}</span><span className="text-right text-ink">{v}</span></div>
            ))}
          </div>
          {a.notes && <div className="rounded-xl bg-cream px-4 py-3 text-[13.5px] text-stone-600">{a.notes}</div>}
          {isUpcoming && (
            <div>
              <div className="mb-2 text-[12px] uppercase tracking-[0.14em] text-stone-400">Before your visit</div>
              <ul className="space-y-1.5 text-[13.5px] text-stone-600">{t.preparation.map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1 w-1 rounded-full bg-stone-400" />{x}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {isUpcoming && <Button size="sm" onClick={() => setMode('reschedule')}>Reschedule</Button>}
            {isUpcoming && <Button size="sm" variant="secondary" icon={<CalendarPlus size={14} />} onClick={() => downloadIcs(db, a)}>Add to calendar</Button>}
            {inv && inv.total - inv.paid > 0 && <Button size="sm" variant="secondary" onClick={() => nav('/portal/payments')}>Pay balance</Button>}
            <Button size="sm" variant="ghost" onClick={() => nav('/portal/messages', { state: { compose: `Question about my ${t.name} on ${fmtDate(a.start, { month: 'short', day: 'numeric' })}` } })}>Contact clinic</Button>
            {isUpcoming && <Button size="sm" variant="danger" onClick={() => setMode('cancel')}>Cancel</Button>}
          </div>
        </div>
      )}
      {a && t && mode === 'reschedule' && <Reschedule a={a} onDone={close} onBack={() => setMode('view')} />}
      {a && t && mode === 'cancel' && (
        <div>
          <p className="text-[14.5px] text-stone-600">{lateCancel && a.depositPaid ? `This is within 48 hours of your appointment, so your ${money(a.deposit)} deposit may be retained under our cancellation policy.` : 'You can cancel free of charge. Any deposit will be refunded to your card.'}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMode('view')}>Keep appointment</Button>
            <Button variant="danger" onClick={() => { cancel(a.id, 'Cancelled', 'patient'); useStore.getState().toast('Appointment cancelled', 'We’ve let the clinic know.'); close() }}>Cancel appointment</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Reschedule({ a, onDone, onBack }: { a: Appointment; onDone: () => void; onBack: () => void }) {
  const db = useDB()
  const resched = useStore((s) => s.patientReschedule)
  const [day, setDay] = useState(startOfDay(a.start) < startOfDay() ? startOfDay() : startOfDay(addDays(new Date(), 1)))
  const [pick, setPick] = useState<string | null>(null)
  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i + 1))
  const slots = slotsFor({ ...db, appointments: db.appointments.filter((x) => x.id !== a.id) }, a.practitionerId, a.locationId, day, a.duration)
  return (
    <div>
      <div className="mb-3 text-[13px] text-stone-500">Same practitioner and clinic — choose a new time.</div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const n = slotsFor(db, a.practitionerId, a.locationId, d, a.duration).length
          const on = d.getTime() === day.getTime()
          return (
            <button key={d.toISOString()} disabled={!n} onClick={() => { setDay(d); setPick(null) }} className={cn('flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition disabled:opacity-30', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white')}>
              <span className="text-[10.5px] uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="font-display text-[22px] leading-none">{d.getDate()}</span>
            </button>
          )
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((s) => <button key={s.toISOString()} onClick={() => setPick(s.toISOString())} className={cn('rounded-xl border py-2.5 text-[13.5px] transition', pick === s.toISOString() ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white hover:border-stone-400')}>{fmtTime(s)}</button>)}
        {!slots.length && <p className="col-span-full py-4 text-[13.5px] text-stone-500">No times on this day.</p>}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button disabled={!pick} onClick={() => { resched(a.id, pick!); onDone() }}>Confirm new time</Button>
      </div>
    </div>
  )
}

function MorePage() {
  return (
    <div className="pb-10 pt-4">
      <h1 className="mb-6 font-display text-[40px] text-ink">More</h1>
      <div className="grid grid-cols-2 gap-3">
        {NAV.slice(2).map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-col gap-3 rounded-2xl border border-stone-200/70 bg-white p-4 shadow-soft">
            <n.icon size={20} strokeWidth={1.5} className="text-bronze-500" />
            <span className="text-[14px] text-ink">{n.label}</span>
          </Link>
        ))}
      </div>
      <Link to="/" className="mt-6 flex items-center gap-2 text-[14px] text-stone-500"><X size={15} />Sign out</Link>
    </div>
  )
}
