import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Crown, Download, FileText, Sparkles, Plus, ArrowLeft, Lock, ShieldCheck, Camera, PenLine, Receipt } from 'lucide-react'
import { useDB, useStore, staffName, locationName, treatmentName } from '@/store/store'
import type { ID } from '@/lib/types'
import { Avatar, Badge, BeforeAfter, Button, Card, Field, Input, Modal, Photo, Ring, Segmented, Toggle, EASE, cn } from '@/ui/ui'
import { fmtDate, money, relative, daysBetween } from '@/lib/format'
import { FaceChart } from '@/shared/FaceChart'
import { FormRenderer, isComplete, type Answers } from '@/shared/FormRenderer'
import { ChatView } from '@/shared/ChatView'
import { usePatient, useUpcoming } from './PortalRoutes'

const Title = ({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-4"><h1 className="font-display text-[40px] leading-none text-ink">{children}</h1>{action}</div>
)

// ── Treatment history timeline ───────────────────────────────────────────────
export function TreatmentHistory() {
  const db = useDB()
  const p = usePatient()
  const [open, setOpen] = useState<ID | null>(null)
  const sessions = db.sessions.filter((s) => s.patientId === p.id).sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="pb-10">
      <Title>Treatment history</Title>
      <div className="relative">
        <div className="absolute bottom-4 left-[19px] top-4 w-px bg-stone-200" />
        <div className="space-y-4">
          {sessions.map((s, i) => {
            const t = db.treatments.find((x) => x.id === s.treatmentId)!
            const inv = db.invoices.find((x) => x.appointmentId === s.appointmentId)
            const photos = db.photos.filter((ph) => ph.patientId === p.id && ph.treatmentId === s.treatmentId && Math.abs(daysBetween(ph.takenAt, s.at)) <= 1)
            const prev = sessions.slice(i + 1).find((x) => x.treatmentId === s.treatmentId)
            const isOpen = open === s.id
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.5, ease: EASE }} className="relative pl-12">
                <span className={cn('absolute left-3 top-6 grid h-4 w-4 place-items-center rounded-full border-2 border-ivory', i === 0 ? 'bg-bronze-500' : 'bg-stone-300')} />
                <Card className="overflow-hidden">
                  <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-4 p-5 text-left">
                    <Photo src={t.image} className="h-14 w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[15.5px] font-medium text-ink">{t.name}</span><Badge>Session {s.sessionNumber}</Badge></div>
                      <div className="mt-0.5 text-[13px] text-stone-500">{fmtDate(s.at)} · {staffName(db, s.practitionerId)} · {locationName(db, s.locationId)}</div>
                    </div>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={18} className="text-stone-400" /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
                        <div className="space-y-5 border-t border-stone-100 p-5">
                          {s.patientNotes && <div className="rounded-2xl bg-cream p-4"><div className="mb-1 text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Note from {staffName(db, s.practitionerId).split(' ')[0] === 'Dr.' ? staffName(db, s.practitionerId) : staffName(db, s.practitionerId).split(' ')[0]}</div><p className="text-[14px] leading-relaxed text-stone-700">{s.patientNotes}</p></div>}
                          <div className="grid gap-3 text-[13.5px] sm:grid-cols-3">
                            {s.product && <div><div className="text-stone-400">Products used</div><div className="text-ink">{s.product}</div></div>}
                            {s.dosage && <div><div className="text-stone-400">Dosage</div><div className="text-ink">{s.dosage}</div></div>}
                            <div><div className="text-stone-400">Recommended</div><div className="text-ink">{s.recommendations}</div></div>
                          </div>
                          {s.points.length > 0 && <FaceChart points={s.points} previous={prev?.points} unit={t.id === 'tx_lip' ? 'ml' : 'u'} compact />}
                          <div>
                            <div className="mb-2 text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Aftercare</div>
                            <ul className="space-y-1.5 text-[13.5px] text-stone-600">{t.aftercare.map((a) => <li key={a} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-sage-500" />{a}</li>)}</ul>
                          </div>
                          {photos.length > 0 && <div className="flex gap-2">{photos.slice(0, 4).map((ph) => <Photo key={ph.id} src={ph.src} className="h-20 w-16 rounded-lg" />)}</div>}
                          <div className="flex flex-wrap gap-2">
                            {inv && <Button size="sm" variant="secondary" icon={<Receipt size={14} />} onClick={() => useStore.getState().toast(`Invoice ${inv.number}`, `${money(inv.total, true)} · ${inv.status}. PDF downloaded.`)}>Invoice {inv.number}</Button>}
                            <Link to={`/book?treatment=${t.slug}&practitioner=${s.practitionerId}`}><Button size="sm">Book again</Button></Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Packages ────────────────────────────────────────────────────────────────
export function PackagesPage() {
  const db = useDB()
  const p = usePatient()
  const pkgs = db.patientPackages.filter((x) => x.patientId === p.id)
  return (
    <div className="pb-10">
      <Title>My packages</Title>
      <div className="space-y-5">
        {pkgs.map((pkg) => {
          const tpl = db.packageTemplates.find((t) => t.id === pkg.templateId)!
          const used = pkg.items.reduce((a, i) => a + i.used, 0)
          const total = pkg.items.reduce((a, i) => a + i.qty, 0)
          return (
            <Card key={pkg.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge tone={pkg.status === 'Active' ? 'sage' : 'neutral'} dot>{pkg.status}</Badge>
                  <div className="mt-2 font-display text-[32px] leading-tight text-ink">{tpl.name}</div>
                  <div className="text-[13px] text-stone-500">Purchased {fmtDate(pkg.purchasedAt)} · expires {fmtDate(pkg.expiresAt)} ({relative(pkg.expiresAt)})</div>
                </div>
                <Ring value={used / total} size={76} label={`${used}/${total}`} sub="used" />
              </div>
              <div className="mt-6 space-y-5">
                {pkg.items.map((it) => {
                  const t = db.treatments.find((x) => x.id === it.treatmentId)!
                  return (
                    <div key={it.treatmentId} className="flex flex-wrap items-center gap-4">
                      <div className="min-w-[180px] flex-1">
                        <div className="mb-2 flex justify-between text-[14px]"><span className="text-ink">{t.name}</span><span className="tabular-nums text-stone-500">{it.used} of {it.qty} used</span></div>
                        <div className="flex gap-1.5">{Array.from({ length: it.qty }).map((_, k) => <motion.span key={k} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: k * 0.08, duration: 0.6, ease: EASE }} style={{ originX: 0 }} className={cn('h-1.5 flex-1 rounded-full', k < it.used ? 'bg-bronze-500' : 'bg-stone-200')} />)}</div>
                      </div>
                      {it.used < it.qty && pkg.status === 'Active' && <Link to={`/book?treatment=${t.slug}`}><Button size="sm" variant="secondary">Book remaining</Button></Link>}
                    </div>
                  )
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-5">
                <Button size="sm" variant="ghost" onClick={() => useStore.getState().toast('Request sent', `The clinic will confirm your ${tpl.name} repurchase.`, 'success')}>Buy again</Button>
                <Button size="sm" variant="ghost" onClick={() => useStore.getState().toast('Upgrade requested', 'A coordinator will reach out with options.', 'success')}>Upgrade</Button>
              </div>
            </Card>
          )
        })}
        {!pkgs.length && <Card className="p-8 text-center"><div className="font-display text-[26px]">No packages yet</div><p className="mt-1 text-sm text-stone-500">Courses of treatment at a preferred rate.</p><Link to="/memberships#packages"><Button className="mt-4">Explore packages</Button></Link></Card>}
      </div>
    </div>
  )
}

// ── Membership ──────────────────────────────────────────────────────────────
export function MembershipPage() {
  const db = useDB()
  const p = usePatient()
  const subscribe = useStore((s) => s.subscribeMembership)
  const setStatus = useStore((s) => s.setMembershipStatus)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const plan = db.membershipPlans.find((x) => x.id === mem?.planId)
  const saved = db.invoices.filter((i) => i.patientId === p.id && i.discountLabel?.includes('member')).reduce((a, i) => a + i.discount, 0)
  return (
    <div className="pb-10">
      <Title>Membership</Title>
      {mem && plan ? (
        <>
          <motion.div initial={{ opacity: 0, y: 12, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: EASE }} className="grain relative overflow-hidden rounded-[28px] bg-ink p-8 text-ivory shadow-lift">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 bg-[radial-gradient(circle,rgba(168,100,42,0.32),transparent_68%)]" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 bg-[radial-gradient(circle,rgba(194,87,122,0.2),transparent_68%)]" />
            <div className="relative flex items-start justify-between">
              <div><div className="text-[11.5px] uppercase tracking-[0.2em] text-ivory/50">Aurelia</div><div className="mt-6 font-display text-[44px] leading-none">{plan.name}</div><div className="mt-2 text-[14px] text-ivory/60">Member since {fmtDate(mem.startedAt, { month: 'long', year: 'numeric' })}</div></div>
              <Crown className="text-bronze-300" size={22} />
            </div>
            <div className="relative mt-10 grid grid-cols-3 gap-4 text-[13px]">
              <div><div className="text-ivory/50">Monthly</div><div className="mt-1 text-[17px]">{money(plan.price)}</div></div>
              <div><div className="text-ivory/50">Renews</div><div className="mt-1 text-[17px]">{fmtDate(mem.renewsAt, { month: 'short', day: 'numeric' })}</div></div>
              <div><div className="text-ivory/50">Credits</div><div className="mt-1 text-[17px]">{mem.credits}</div></div>
            </div>
            {mem.status !== 'Active' && <div className="relative mt-6 rounded-xl bg-white/10 px-4 py-2.5 text-[13px]">{mem.status === 'Cancel Requested' ? 'Cancellation requested — your benefits continue until your renewal date.' : 'Your last payment didn’t go through. Please update your card.'}</div>}
          </motion.div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Card className="p-6">
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Your benefits</div>
              <ul className="mt-4 space-y-3 text-[14px]">{plan.benefits.map((b) => <li key={b} className="flex gap-3"><Sparkles size={15} className="mt-0.5 shrink-0 text-bronze-500" />{b}</li>)}</ul>
            </Card>
            <Card className="p-6">
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Available perks</div>
              <div className="mt-3 font-display text-[34px] text-ink">{money(saved)}</div>
              <div className="text-[13px] text-stone-500">saved with member pricing</div>
              {plan.monthlyCredit && <Link to={`/book?treatment=${db.treatments.find((t) => t.id === plan.monthlyCredit!.treatmentId)?.slug}`}><Button size="sm" className="mt-5">Use your {treatmentName(db, plan.monthlyCredit.treatmentId)} credit</Button></Link>}
              <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-[13.5px]"><span className="text-stone-500">Payment method</span><span className="text-ink">{mem.paymentMethod}</span></div>
            </Card>
          </div>
          <div className="mt-8 text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Change plan</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {db.membershipPlans.filter((x) => x.active).map((x) => (
              <div key={x.id} className={cn('rounded-2xl border p-5', x.id === plan.id ? 'border-ink bg-white' : 'border-stone-200 bg-white/60')}>
                <div className="flex items-center justify-between"><span className="font-display text-[22px]">{x.name}</span><span className="text-[14px]">{money(x.price)}/mo</span></div>
                <p className="mt-1 text-[12.5px] text-stone-500">{x.benefits.slice(0, 2).join(' · ')}</p>
                {x.id === plan.id ? <div className="mt-3 text-[12.5px] text-sage-500">Current plan</div> : <Button size="xs" variant="secondary" className="mt-3" onClick={() => subscribe(p.id, x.id)}>{x.price > plan.price ? 'Upgrade' : 'Switch'}</Button>}
              </div>
            ))}
          </div>
          {mem.status === 'Active' && <button onClick={() => setConfirmCancel(true)} className="mt-8 text-[13px] text-stone-500 underline underline-offset-4 hover:text-ink">Request cancellation</button>}
          <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Before you go" footer={<><Button variant="ghost" onClick={() => setConfirmCancel(false)}>Keep my membership</Button><Button variant="danger" onClick={() => { setStatus(mem.id, 'Cancel Requested'); setConfirmCancel(false); useStore.getState().toast('Cancellation requested', 'Benefits continue until your renewal date.') }}>Request cancellation</Button></>}>
            <p className="text-[14.5px] text-stone-600">You’ve saved {money(saved)} as a member. Would pausing for a month suit you better? If you still wish to cancel, the clinic will confirm and your benefits continue until {fmtDate(mem.renewsAt, { month: 'long', day: 'numeric' })}.</p>
          </Modal>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {db.membershipPlans.filter((x) => x.active).map((x, i) => (
            <Card key={x.id} className={cn('flex flex-col p-6', i === 1 && 'ring-2 ring-ink')}>
              <div className="font-display text-[28px]">{x.name}</div>
              <div className="text-[13px] text-stone-500">{x.tagline}</div>
              <div className="mt-4 font-display text-[40px]">{money(x.price)}<span className="font-sans text-sm text-stone-500">/mo</span></div>
              <ul className="mt-4 flex-1 space-y-2 text-[13.5px]">{x.benefits.map((b) => <li key={b} className="flex gap-2"><Check size={14} className="mt-0.5 text-sage-500" />{b}</li>)}</ul>
              <Button className="mt-5" onClick={() => subscribe(p.id, x.id)}>Join {x.name}</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Payments ────────────────────────────────────────────────────────────────
export function PaymentsPage() {
  const db = useDB()
  const p = usePatient()
  const pay = useStore((s) => s.patientPay)
  const [paying, setPaying] = useState<ID | null>(null)
  const invoices = db.invoices.filter((i) => i.patientId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const open = invoices.filter((i) => ['Open', 'Partial'].includes(i.status))
  const inv = db.invoices.find((i) => i.id === paying)
  return (
    <div className="pb-10">
      <Title>Payments</Title>
      {open.length > 0 && (
        <div className="mb-6 space-y-3">
          {open.map((i) => (
            <Card key={i.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex-1">
                <div className="text-[11.5px] uppercase tracking-[0.14em] text-bronze-600">Balance due</div>
                <div className="mt-1 font-display text-[30px] text-ink">{money(i.total - i.paid, true)}</div>
                <div className="text-[13px] text-stone-500">{i.lines.map((l) => l.desc).join(', ')} · {i.number}</div>
              </div>
              <Button onClick={() => setPaying(i.id)}>Pay now</Button>
            </Card>
          ))}
        </div>
      )}
      <Card>
        <div className="px-5 pb-2 pt-5 text-[11.5px] uppercase tracking-[0.14em] text-stone-400">History</div>
        <div className="divide-y divide-stone-100">
          {invoices.map((i) => (
            <div key={i.id} className="flex items-center gap-4 px-5 py-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-stone-500"><Receipt size={16} /></div>
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] text-ink">{i.lines.map((l) => l.desc).join(', ')}</div><div className="text-[12.5px] text-stone-500">{fmtDate(i.createdAt)} · {i.number}{i.discount ? ` · saved ${money(i.discount)}` : ''}</div></div>
              <div className="text-right"><div className="text-[14px] tabular-nums text-ink">{money(i.total, true)}</div><Badge tone={i.status === 'Paid' ? 'sage' : i.status === 'Refunded' ? 'neutral' : 'amber'}>{i.status}</Badge></div>
            </div>
          ))}
        </div>
      </Card>
      <Modal open={!!inv} onClose={() => setPaying(null)} title="Pay balance" width={440} footer={inv && <Button onClick={() => { pay(inv.id, inv.total - inv.paid); setPaying(null) }}>Pay {money(inv.total - inv.paid, true)}</Button>}>
        {inv && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-cream p-4 text-[14px]">
              {inv.lines.map((l) => <div key={l.id} className="flex justify-between py-1"><span>{l.desc}</span><span>{money(l.price * l.qty, true)}</span></div>)}
              {inv.discount > 0 && <div className="flex justify-between py-1 text-sage-700"><span>{inv.discountLabel}</span><span>−{money(inv.discount, true)}</span></div>}
              <div className="flex justify-between py-1 text-stone-500"><span>Already paid</span><span>−{money(inv.paid, true)}</span></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-[14px]"><span className="rounded bg-ink px-2 py-0.5 text-[11px] text-ivory">VISA</span>•••• 4242 <span className="ml-auto text-[12.5px] text-stone-500">Saved card</span></div>
            <p className="flex items-center gap-1.5 text-[12px] text-stone-500"><Lock size={12} />Payments are processed securely. Demo mode — no charge.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Documents & consents ────────────────────────────────────────────────────
export function DocumentsPage() {
  const db = useDB()
  const p = usePatient()
  const sign = useStore((s) => s.signForm)
  const upcoming = useUpcoming(p.id)
  const [signing, setSigning] = useState<ID | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const subs = db.formSubmissions.filter((f) => f.patientId === p.id).sort((a, b) => b.signedAt.localeCompare(a.signedAt))
  const pending = [...new Set(upcoming.filter((a) => a.consent === 'Pending').map((a) => db.treatments.find((t) => t.id === a.treatmentId)?.consentFormId).filter(Boolean) as ID[])]
  const form = db.formTemplates.find((f) => f.id === signing)
  return (
    <div className="pb-10">
      <Title>Documents</Title>
      {pending.length > 0 && (
        <div className="mb-6 space-y-3">
          {pending.map((fid) => {
            const f = db.formTemplates.find((x) => x.id === fid)!
            return (
              <Card key={fid} className="flex items-center gap-4 border-bronze-100 bg-bronze-50/60 p-5">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-bronze-600"><PenLine size={18} /></div>
                <div className="flex-1"><div className="text-[15px] font-medium text-ink">{f.name}</div><div className="text-[13px] text-stone-500">Required before your visit · about 2 minutes</div></div>
                <Button size="sm" onClick={() => { setAnswers({}); setSigning(fid) }}>Review & sign</Button>
              </Card>
            )
          })}
        </div>
      )}
      <Card>
        <div className="divide-y divide-stone-100">
          {subs.map((s) => {
            const f = db.formTemplates.find((x) => x.id === s.templateId)!
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-stone-500"><FileText size={16} /></div>
                <div className="min-w-0 flex-1"><div className="text-[14px] text-ink">{f.name} <span className="text-stone-400">v{s.version}</span></div><div className="text-[12.5px] text-stone-500">Signed {fmtDate(s.signedAt)} · {s.device}</div></div>
                <Badge tone="sage" dot>Signed</Badge>
                <button className="text-stone-400 hover:text-ink" aria-label="Download PDF" onClick={() => useStore.getState().toast('PDF downloaded', `${f.name} v${s.version}`)}><Download size={16} /></button>
              </div>
            )
          })}
        </div>
      </Card>
      <Modal open={!!form} onClose={() => setSigning(null)} title={form?.name} subtitle={form ? `Version ${form.version} · ${p.firstName} ${p.lastName}` : ''} width={600}
        footer={form && <Button disabled={!isComplete(form, answers)} onClick={() => { sign(form.id, p.id, answers, 'iPhone · Safari'); setSigning(null); useStore.getState().toast('Signed — thank you', 'A copy is saved to your documents.', 'success') }}>Sign & submit</Button>}>
        {form && <><FormRenderer form={form} answers={answers} onChange={setAnswers} /><p className="mt-6 flex items-center gap-1.5 text-[12px] text-stone-400"><ShieldCheck size={13} />Your signature, time, device and IP are recorded to create a legally binding record.</p></>}
      </Modal>
    </div>
  )
}

// ── Photos ──────────────────────────────────────────────────────────────────
export function PhotosPage() {
  const db = useDB()
  const p = usePatient()
  const photos = db.photos.filter((x) => x.patientId === p.id)
  const angles = [...new Set(photos.map((x) => x.angle))]
  const [angle, setAngle] = useState(angles[0] ?? 'Front')
  const list = photos.filter((x) => x.angle === angle).sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  return (
    <div className="pb-10">
      <Title>Your progress</Title>
      {photos.length ? (
        <>
          <Segmented options={angles} value={angle} onChange={setAngle} id="ph-angle" />
          {list.length >= 2 && <BeforeAfter before={list[0].src} after={list[list.length - 1].src} labels={[`${list[0].stage} · ${fmtDate(list[0].takenAt, { month: 'short', day: 'numeric' })}`, `${list[list.length - 1].stage} · ${fmtDate(list[list.length - 1].takenAt, { month: 'short', day: 'numeric' })}`]} className="mt-5 aspect-[4/3] rounded-[24px]" />}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {list.map((ph) => <div key={ph.id}><Photo src={ph.src} className="aspect-[3/4] rounded-xl" /><div className="mt-1.5 text-[12px] text-stone-500">{ph.stage} · {fmtDate(ph.takenAt, { month: 'short', day: 'numeric' })}</div></div>)}
          </div>
          <p className="mt-6 flex items-center gap-1.5 text-[12.5px] text-stone-500"><Lock size={13} />Your photos are private. They are never shared publicly without your written consent.</p>
        </>
      ) : <Card className="p-8 text-center"><Camera className="mx-auto text-stone-400" /><p className="mt-3 text-sm text-stone-500">Progress photos taken at your visits will appear here.</p></Card>}
    </div>
  )
}

// ── Messages ────────────────────────────────────────────────────────────────
export function MessagesPage() {
  const db = useDB()
  const p = usePatient()
  const loc = useLocation()
  const send = useStore((s) => s.sendMessage)
  const markRead = useStore((s) => s.markThreadRead)
  const state = loc.state as { open?: ID; compose?: string } | null
  const threads = db.threads.filter((t) => t.patientId === p.id)
  const [openId, setOpenId] = useState<ID | null>(state?.open ?? (typeof window === 'undefined' || window.innerWidth >= 768 ? threads[0]?.id ?? null : null))
  const [composing, setComposing] = useState(!!state?.compose)
  const [subject, setSubject] = useState(state?.compose ?? '')
  const [body, setBody] = useState('')
  const thread = threads.find((t) => t.id === openId)
  useEffect(() => { if (thread?.unreadPatient) markRead(thread.id, 'patient') }, [thread, markRead])
  return (
    <div className="pb-6">
      <Title action={<Button size="sm" icon={<Plus size={14} />} onClick={() => setComposing(true)}>New message</Button>}>Messages</Title>
      <Card className="flex h-[calc(100vh-230px)] min-h-[460px] overflow-hidden">
        <div className={cn('w-full shrink-0 overflow-y-auto border-r border-stone-200/70 md:w-[300px]', thread && 'hidden md:block')}>
          {threads.map((t) => {
            const last = t.messages[t.messages.length - 1]
            return (
              <button key={t.id} onClick={() => setOpenId(t.id)} className={cn('flex w-full gap-3 border-b border-stone-100 px-4 py-4 text-left transition-colors', openId === t.id ? 'bg-cream' : 'hover:bg-cream/50')}>
                <Avatar name={staffName(db, t.messages.find((m) => m.authorId)?.authorId ?? 'st_manager')} src={db.staff.find((s) => s.id === t.messages.find((m) => m.authorId)?.authorId)?.avatar} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><span className={cn('truncate text-[14px]', t.unreadPatient ? 'font-semibold text-ink' : 'text-ink')}>{t.subject}</span><span className="shrink-0 text-[11px] text-stone-400">{relative(last.at)}</span></div>
                  <p className="truncate text-[12.5px] text-stone-500">{last.text}</p>
                </div>
              </button>
            )
          })}
        </div>
        <div className={cn('min-w-0 flex-1', !thread && 'hidden md:block')}>
          {thread ? (
            <div className="flex h-full flex-col">
              <button onClick={() => setOpenId(null)} className="flex items-center gap-1.5 border-b border-stone-200/70 px-4 py-2.5 text-[13px] text-stone-500 md:hidden"><ArrowLeft size={14} />All messages</button>
              <div className="min-h-0 flex-1"><ChatView thread={thread} side="patient" onSend={(text) => send(thread.id, p.id, 'patient', text)} /></div>
            </div>
          ) : <div className="grid h-full place-items-center text-sm text-stone-400">Select a conversation</div>}
        </div>
      </Card>
      <Modal open={composing} onClose={() => setComposing(false)} title="Message the clinic" footer={<Button disabled={!subject || !body} onClick={() => { const id = send(null, p.id, 'patient', body, subject); setOpenId(id); setComposing(false); setBody(''); setSubject('') }}>Send</Button>}>
        <div className="space-y-4">
          <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E.g. Question about aftercare" /></Field>
          <Field label="Message"><textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[120px] w-full rounded-xl border border-stone-200 bg-white p-3.5 text-sm outline-none focus:border-stone-400" /></Field>
        </div>
      </Modal>
    </div>
  )
}

// ── Profile ─────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const db = useDB()
  const p = usePatient()
  const update = useStore((s) => s.updatePatient)
  const mem = db.memberships.find((m) => m.patientId === p.id && m.status !== 'Cancelled')
  const [f, setF] = useState({ phone: p.phone, email: p.email, address: p.address, ecName: p.emergencyContact.name, ecPhone: p.emergencyContact.phone, ecRel: p.emergencyContact.relation })
  const dirty = f.phone !== p.phone || f.email !== p.email || f.address !== p.address || f.ecName !== p.emergencyContact.name || f.ecPhone !== p.emergencyContact.phone || f.ecRel !== p.emergencyContact.relation
  return (
    <div className="pb-10">
      <Title>Profile</Title>
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar name={`${p.firstName} ${p.lastName}`} src={p.avatar} size={72} />
        <div className="flex-1">
          <div className="font-display text-[30px] leading-tight text-ink">{p.firstName} {p.lastName}</div>
          <div className="text-[13.5px] text-stone-500">Born {fmtDate(p.dob)} · patient since {fmtDate(p.since, { month: 'long', year: 'numeric' })}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {mem && <Badge tone="bronze">{db.membershipPlans.find((x) => x.id === mem.planId)?.name} member</Badge>}
            <Badge>{locationName(db, p.locationId)}</Badge>
            {p.preferredPractitionerId && <Badge>Prefers {staffName(db, p.preferredPractitionerId)}</Badge>}
          </div>
        </div>
      </Card>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card className="space-y-4 p-6">
          <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Contact details</div>
          <Field label="Mobile"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Address"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        </Card>
        <Card className="space-y-4 p-6">
          <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Emergency contact</div>
          <Field label="Name"><Input value={f.ecName} onChange={(e) => setF({ ...f, ecName: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><Input value={f.ecPhone} onChange={(e) => setF({ ...f, ecPhone: e.target.value })} /></Field>
            <Field label="Relationship"><Input value={f.ecRel} onChange={(e) => setF({ ...f, ecRel: e.target.value })} /></Field>
          </div>
        </Card>
      </div>
      <AnimatePresence>{dirty && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 flex justify-end"><Button onClick={() => update(p.id, { phone: f.phone, email: f.email, address: f.address, emergencyContact: { name: f.ecName, phone: f.ecPhone, relation: f.ecRel } }, 'patient')}>Save changes</Button></motion.div>}</AnimatePresence>
      <Card className="mt-5 p-6">
        <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Notifications</div>
        <div className="mt-3 divide-y divide-stone-100">
          {([['email', 'Email', 'Confirmations, receipts and reminders'], ['sms', 'Text messages', 'Appointment reminders and check-ins'], ['push', 'Push notifications', 'Messages from your practitioner'], ['marketing', 'Offers & news', 'Member events and seasonal treatments']] as const).map(([k, l, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3.5">
              <div><div className="text-[14px] text-ink">{l}</div><div className="text-[12.5px] text-stone-500">{d}</div></div>
              <Toggle checked={p.notify[k]} onChange={(v) => update(p.id, { notify: { ...p.notify, [k]: v } }, 'patient')} label={l} />
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-5 flex items-center gap-4 p-6">
        <ShieldCheck size={20} className="text-sage-500" />
        <div className="flex-1"><div className="text-[14px] text-ink">Security</div><div className="text-[12.5px] text-stone-500">Two-step verification is on · last sign-in today from iPhone</div></div>
        <Button size="sm" variant="secondary" onClick={() => useStore.getState().toast('Your data export is being prepared', 'We’ll email a secure link within 24 hours.')}>Download my data</Button>
      </Card>
    </div>
  )
}
