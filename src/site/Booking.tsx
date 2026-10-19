import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Clock, X, Lock, CalendarPlus, Sparkles, MapPin, ChevronLeft, ChevronRight, ShieldCheck, AlertTriangle, CreditCard } from 'lucide-react'
import { useDB, useStore, staffName, locationName } from '@/store/store'
import type { Concern, ID, Treatment } from '@/lib/types'
import { slotsFor } from '@/lib/availability'
import { addDays, fmtTime, money, startOfDay } from '@/lib/format'
import { Button, Photo, Input, Field, Textarea, EASE, cn } from '@/ui/ui'
import { Logo } from './SiteLayout'

const CONCERNS: (Concern | 'I’m not sure')[] = ['Wrinkles', 'Fine lines', 'Acne', 'Pigmentation', 'Lips', 'Jawline', 'Skin texture', 'Hair loss', 'Body contouring', 'I’m not sure']
type Step = 'concern' | 'treatment' | 'practitioner' | 'location' | 'date' | 'time' | 'details' | 'health' | 'payment' | 'done'
const LABEL: Record<Step, string> = { concern: 'Your goals', treatment: 'Treatment', practitioner: 'Practitioner', location: 'Location', date: 'Date', time: 'Time', details: 'Your details', health: 'Health', payment: 'Deposit', done: 'Confirmed' }
const DRAFT_KEY = 'aurelia-booking-draft'

interface Draft {
  concerns: string[]
  treatmentId?: ID
  practitionerId?: ID | 'any'
  locationId?: ID
  date?: string
  start?: string
  patient: { firstName: string; lastName: string; email: string; phone: string; dob: string }
  notes: string
  health: { pregnant?: boolean; meds: string; allergies: string; conditions: string[]; prior?: string }
}
const emptyDraft: Draft = { concerns: [], patient: { firstName: '', lastName: '', email: '', phone: '', dob: '' }, notes: '', health: { meds: '', allergies: '', conditions: [] } }

const readDraft = (): { draft: Draft; step: Step } | null => { try { const r = localStorage.getItem(DRAFT_KEY); return r ? JSON.parse(r) : null } catch { return null } }

export default function BookingFlow() {
  const db = useDB()
  const createBooking = useStore((s) => s.createBooking)
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [saved] = useState(readDraft)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [step, setStep] = useState<Step>('concern')
  const [resumeOffer, setResumeOffer] = useState(!!saved && saved.step !== 'done' && saved.step !== 'concern')
  const [bookingId, setBookingId] = useState<ID | null>(null)
  const [dir, setDir] = useState(1)

  // Prefill from deep links: /book?treatment=botox&practitioner=st_carter&location=loc_sm
  useEffect(() => {
    const slug = params.get('treatment')
    const t = db.treatments.find((x) => x.slug === slug && x.active && x.onlineBookable)
    const pr = params.get('practitioner')
    const loc = params.get('location')
    if (t || pr || loc) {
      setResumeOffer(false)
      setDraft((d) => ({ ...d, treatmentId: t?.id, practitionerId: pr ?? undefined, locationId: loc ?? undefined }))
      if (t) setStep('practitioner')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'done') { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } return }
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step })) } catch { /* ignore */ }
  }, [draft, step])

  const t = db.treatments.find((x) => x.id === draft.treatmentId)
  const bookable = db.treatments.filter((x) => x.active && x.onlineBookable)
  const practitioners = t ? db.staff.filter((s) => t.practitionerIds.includes(s.id) && s.active && s.bookable && (!draft.locationId || s.locationIds.includes(draft.locationId))) : []
  const pIds = draft.practitionerId && draft.practitionerId !== 'any' ? [draft.practitionerId] : practitioners.map((p) => p.id)
  const locations = t ? db.locations.filter((l) => l.active && t.locationIds.includes(l.id) && pIds.some((p) => db.staff.find((s) => s.id === p)?.locationIds.includes(l.id))) : []

  const steps: Step[] = useMemo(() => {
    const s: Step[] = ['concern', 'treatment', 'practitioner']
    if (locations.length > 1 || !draft.locationId) s.push('location')
    s.push('date', 'time', 'details')
    if (!t || t.requiresIntake) s.push('health')
    if (!t || t.deposit > 0) s.push('payment')
    s.push('done')
    return s
  }, [t, locations.length, draft.locationId])
  const idx = steps.indexOf(step)
  const go = (s: Step) => { setDir(steps.indexOf(s) >= idx ? 1 : -1); setStep(s); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const next = () => go(steps[Math.min(idx + 1, steps.length - 1)])
  const back = () => (idx > 0 ? go(steps[idx - 1]) : nav(-1))

  // auto-select single location
  useEffect(() => { if (t && locations.length === 1 && draft.locationId !== locations[0].id) setDraft((d) => ({ ...d, locationId: locations[0].id })) }, [t, locations, draft.locationId])

  const recommended = useMemo(() => {
    if (!draft.concerns.length || draft.concerns.includes('I’m not sure')) return bookable.filter((x) => x.id === 'tx_consult')
    return bookable.map((x) => ({ x, score: x.concerns.filter((c) => draft.concerns.includes(c)).length - (x.id === 'tx_consult' ? 0.5 : 0) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).map((r) => r.x).slice(0, 3)
  }, [draft.concerns, bookable])

  const confirm = (payDeposit: boolean) => {
    if (!t || !draft.start || !draft.locationId) return
    let practitionerId = draft.practitionerId
    if (!practitionerId || practitionerId === 'any') {
      practitionerId = pIds.find((p) => slotsFor(db, p, draft.locationId!, new Date(draft.start!), t.duration).some((s) => s.toISOString() === draft.start)) ?? pIds[0]
    }
    const h = draft.health
    const id = createBooking({
      treatmentId: t.id, practitionerId, locationId: draft.locationId, start: draft.start, patient: draft.patient, concerns: draft.concerns.filter((c) => c !== 'I’m not sure'), notes: draft.notes, payDeposit, source: 'Online',
      intake: t.requiresIntake ? { f1: !!h.pregnant, f2: h.meds, f3: h.allergies, f4: h.conditions.join(', '), f5: h.prior ?? 'Never', sig: `${draft.patient.firstName} ${draft.patient.lastName}` } : undefined,
    })
    setDraft((d) => ({ ...d, practitionerId }))
    setBookingId(id)
    go('done')
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-ivory/[0.97]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          {step !== 'done' ? <button onClick={back} className="flex items-center gap-2 text-[13px] text-stone-600 hover:text-ink"><ArrowLeft size={16} />Back</button> : <span />}
          <Logo className="text-[22px]" />
          <Link to="/" className="flex items-center gap-1.5 text-[13px] text-stone-600 hover:text-ink">{step === 'done' ? 'Close' : 'Save & exit'}<X size={15} /></Link>
        </div>
        {step !== 'done' && (
          <div className="mx-auto max-w-6xl px-5 pb-3">
            <div className="flex items-center justify-between text-[11.5px] text-stone-500">
              <span>Step {idx + 1} of {steps.length - 1} · <span className="text-ink">{LABEL[step]}</span></span>
              <span className="hidden sm:inline">Progress saves automatically</span>
            </div>
            <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-stone-200/80">
              <motion.div className="h-full rounded-full bg-ink" animate={{ width: `${((idx + 1) / (steps.length - 1)) * 100}%` }} transition={{ duration: 0.7, ease: EASE }} />
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-12 lg:py-14">
        <div className={cn(step === 'done' ? 'lg:col-span-12' : 'lg:col-span-8')}>
          <AnimatePresence>
            {resumeOffer && saved && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bronze-100 bg-bronze-50 px-5 py-4">
                <div className="text-[14px] text-bronze-700">Welcome back — you left off at <b className="font-medium">{LABEL[saved.step]}</b>.</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setResumeOffer(false); try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }}>Start over</Button>
                  <Button size="sm" onClick={() => { setDraft(saved.draft); setStep(saved.step); setResumeOffer(false) }}>Resume</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -16 }} transition={{ duration: 0.45, ease: EASE }}>
              {step === 'concern' && (
                <StepShell title="What would you like help with?" sub="Choose as many as you like — we’ll recommend the right treatments.">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {CONCERNS.map((c) => {
                      const on = draft.concerns.includes(c)
                      return (
                        <motion.button key={c} whileTap={{ scale: 0.97 }} onClick={() => setDraft((d) => ({ ...d, concerns: c === 'I’m not sure' ? (on ? [] : [c]) : on ? d.concerns.filter((x) => x !== c) : [...d.concerns.filter((x) => x !== 'I’m not sure'), c] }))}
                          className={cn('relative flex h-[76px] items-center justify-between rounded-2xl border px-5 text-left text-[15px] transition-all duration-300', on ? 'border-ink bg-ink text-ivory shadow-lift' : 'border-stone-200 bg-white text-ink hover:border-stone-300 hover:shadow-soft')}>
                          {c}
                          <span className={cn('grid h-5 w-5 place-items-center rounded-full border transition', on ? 'border-ivory bg-ivory text-ink' : 'border-stone-300')}>{on && <Check size={12} />}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                  <Footer><Button size="lg" disabled={!draft.concerns.length} onClick={next}>See recommendations</Button></Footer>
                </StepShell>
              )}

              {step === 'treatment' && (
                <StepShell title={draft.concerns.includes('I’m not sure') ? 'Let’s start with a conversation.' : 'Recommended for you'} sub={draft.concerns.length && !draft.concerns.includes('I’m not sure') ? `Based on: ${draft.concerns.join(', ')}` : 'A complimentary consultation is the perfect first step.'}>
                  <div className="space-y-3">
                    {recommended.map((x, i) => <TreatmentOption key={x.id} t={x} selected={draft.treatmentId === x.id} badge={i === 0 ? 'Best match' : 'Recommended'} onSelect={() => { setDraft((d) => ({ ...d, treatmentId: x.id, practitionerId: undefined, start: undefined, date: undefined })); setTimeout(next, 180) }} />)}
                  </div>
                  <div className="mb-3 mt-10 text-[12px] uppercase tracking-[0.14em] text-stone-400">All treatments</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {bookable.filter((x) => !recommended.includes(x)).map((x) => (
                      <button key={x.id} onClick={() => { setDraft((d) => ({ ...d, treatmentId: x.id, practitionerId: undefined, start: undefined, date: undefined })); setTimeout(next, 150) }} className={cn('flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[14px] transition', draft.treatmentId === x.id ? 'border-ink bg-white' : 'border-stone-200 bg-white/60 hover:bg-white')}>
                        <span className="text-ink">{x.name}</span><span className="text-stone-500">{x.priceFrom ? `from ${money(x.priceFrom)}` : 'Free'}</span>
                      </button>
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 'practitioner' && t && (
                <StepShell title="Who would you like to see?" sub={`Practitioners offering ${t.name}`}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionCard selected={draft.practitionerId === 'any'} onClick={() => { setDraft((d) => ({ ...d, practitionerId: 'any', start: undefined })); setTimeout(next, 180) }}>
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cream text-bronze-500"><Sparkles size={20} /></div>
                      <div><div className="text-[15px] font-medium text-ink">First available</div><div className="text-[13px] text-stone-500">Most availability</div></div>
                    </OptionCard>
                    {practitioners.map((p) => (
                      <OptionCard key={p.id} selected={draft.practitionerId === p.id} onClick={() => { setDraft((d) => ({ ...d, practitionerId: p.id, start: undefined, locationId: p.locationIds.includes(d.locationId ?? '') ? d.locationId : undefined })); setTimeout(next, 180) }}>
                        <Photo src={p.avatar} className="h-14 w-14 shrink-0 rounded-2xl" />
                        <div><div className="text-[15px] font-medium text-ink">{p.name}</div><div className="text-[13px] text-stone-500">{p.title}</div><div className="mt-0.5 text-[12px] text-stone-400">{p.locationIds.map((l) => locationName(db, l)).join(' · ')}</div></div>
                      </OptionCard>
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 'location' && t && (
                <StepShell title="Which clinic suits you?">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {locations.map((l, i) => (
                      <button key={l.id} onClick={() => { setDraft((d) => ({ ...d, locationId: l.id, start: undefined })); setTimeout(next, 180) }} className={cn('group overflow-hidden rounded-3xl border bg-white text-left transition-all duration-300', draft.locationId === l.id ? 'border-ink shadow-lift' : 'border-stone-200 hover:shadow-soft')}>
                        <Photo src={l.image} zoom className="aspect-[16/9]" tone={i} />
                        <div className="p-5">
                          <div className="flex items-center justify-between"><div className="font-display text-[26px] text-ink">{l.name}</div><span className="text-[15px] text-ink">{money(t.locationPricing[l.id] ?? t.priceFrom)}</span></div>
                          <div className="mt-1 flex items-center gap-1.5 text-[13px] text-stone-500"><MapPin size={13} />{l.address}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 'date' && t && draft.locationId && (
                <DateStep t={t} locationId={draft.locationId} pIds={pIds} value={draft.date} onPick={(d) => { setDraft((x) => ({ ...x, date: d, start: undefined })); setTimeout(next, 160) }} />
              )}

              {step === 'time' && t && draft.locationId && draft.date && (
                <StepShell title={new Date(draft.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} sub={`${t.name} · ${t.duration} min · ${locationName(db, draft.locationId)}`}>
                  <TimeGrid db={db} t={t} locationId={draft.locationId} pIds={pIds} date={draft.date} value={draft.start} onPick={(s) => { setDraft((x) => ({ ...x, start: s })); setTimeout(next, 180) }} />
                  <button onClick={() => go('date')} className="mt-6 text-[13px] text-stone-500 underline underline-offset-4 hover:text-ink">Choose another date</button>
                </StepShell>
              )}

              {step === 'details' && (
                <StepShell title="A little about you" sub="Existing patients — use the email on your account and we’ll link your booking automatically.">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name"><Input value={draft.patient.firstName} onChange={(e) => setDraft((d) => ({ ...d, patient: { ...d.patient, firstName: e.target.value } }))} autoComplete="given-name" /></Field>
                    <Field label="Last name"><Input value={draft.patient.lastName} onChange={(e) => setDraft((d) => ({ ...d, patient: { ...d.patient, lastName: e.target.value } }))} autoComplete="family-name" /></Field>
                    <Field label="Email"><Input type="email" value={draft.patient.email} onChange={(e) => setDraft((d) => ({ ...d, patient: { ...d.patient, email: e.target.value } }))} autoComplete="email" /></Field>
                    <Field label="Mobile"><Input type="tel" value={draft.patient.phone} onChange={(e) => setDraft((d) => ({ ...d, patient: { ...d.patient, phone: e.target.value } }))} autoComplete="tel" /></Field>
                    <Field label="Date of birth"><Input type="date" value={draft.patient.dob} onChange={(e) => setDraft((d) => ({ ...d, patient: { ...d.patient, dob: e.target.value } }))} /></Field>
                    <Field label="Anything we should know? (optional)" className="sm:col-span-2"><Textarea value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="E.g. an upcoming event, or a preference for a quieter time." /></Field>
                  </div>
                  <button onClick={() => setDraft((d) => ({ ...d, patient: { firstName: 'Emma', lastName: 'Roberts', email: 'emma.roberts@icloud.com', phone: '(310) 555-2874', dob: '1991-04-12' } }))} className="mt-4 text-[12.5px] text-stone-500 underline underline-offset-4 hover:text-ink">Demo: fill as existing patient Emma Roberts</button>
                  <Footer><Button size="lg" disabled={!draft.patient.firstName || !draft.patient.lastName || !/\S+@\S+\.\S+/.test(draft.patient.email) || draft.patient.phone.length < 7} onClick={() => (steps[idx + 1] === 'done' ? confirm(false) : next())}>{steps[idx + 1] === 'done' ? 'Confirm booking' : 'Continue'}</Button></Footer>
                </StepShell>
              )}

              {step === 'health' && t && (
                <StepShell title="A few health questions" sub="Kept confidential and reviewed only by your clinical team.">
                  <div className="space-y-7">
                    <YesNo label="Are you currently pregnant or breastfeeding?" value={draft.health.pregnant} onChange={(v) => setDraft((d) => ({ ...d, health: { ...d.health, pregnant: v } }))} />
                    {draft.health.pregnant && t.contraindications.some((c) => /pregnan/i.test(c)) && (
                      <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-[13.5px] text-stone-700"><AlertTriangle size={17} className="shrink-0 text-amber-500" />{t.name} isn’t recommended during pregnancy or breastfeeding. You can still book — your practitioner will discuss safe alternatives, or switch to a consultation.</div>
                    )}
                    <div>
                      <div className="mb-3 text-[14.5px] text-ink">Have you had injectables before?</div>
                      <div className="flex flex-wrap gap-2">{['Never', 'Within the last 6 months', 'More than 6 months ago'].map((o) => <Chip key={o} on={draft.health.prior === o} onClick={() => setDraft((d) => ({ ...d, health: { ...d.health, prior: o } }))}>{o}</Chip>)}</div>
                    </div>
                    <div>
                      <div className="mb-3 text-[14.5px] text-ink">Do any of these apply?</div>
                      <div className="flex flex-wrap gap-2">{['Autoimmune disease', 'Bleeding disorder', 'Cold sores', 'Keloid scarring', 'Diabetes', 'None of these'].map((o) => { const on = draft.health.conditions.includes(o); return <Chip key={o} on={on} onClick={() => setDraft((d) => ({ ...d, health: { ...d.health, conditions: o === 'None of these' ? (on ? [] : [o]) : on ? d.health.conditions.filter((x) => x !== o) : [...d.health.conditions.filter((x) => x !== 'None of these'), o] } }))}>{o}</Chip> })}</div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Current medications"><Input value={draft.health.meds} onChange={(e) => setDraft((d) => ({ ...d, health: { ...d.health, meds: e.target.value } }))} placeholder="None" /></Field>
                      <Field label="Allergies"><Input value={draft.health.allergies} onChange={(e) => setDraft((d) => ({ ...d, health: { ...d.health, allergies: e.target.value } }))} placeholder="None" /></Field>
                    </div>
                    <p className="flex items-center gap-2 text-[12.5px] text-stone-500"><ShieldCheck size={14} />Encrypted and stored in your clinical record — never shared.</p>
                  </div>
                  <Footer><Button size="lg" disabled={draft.health.pregnant === undefined || !draft.health.prior || !draft.health.conditions.length} onClick={() => (t.deposit > 0 ? next() : confirm(false))}>{t.deposit > 0 ? 'Continue to deposit' : 'Confirm booking'}</Button></Footer>
                </StepShell>
              )}

              {step === 'payment' && t && <PaymentStep amount={t.deposit} onPay={() => confirm(true)} />}

              {step === 'done' && t && draft.start && <Confirmation t={t} draft={draft} bookingId={bookingId} />}
            </motion.div>
          </AnimatePresence>

        </div>

        {step !== 'done' && (
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-32 rounded-3xl border border-stone-200 bg-white p-6 shadow-soft">
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-stone-400">Your booking</div>
              {t ? (
                <>
                  <Photo src={t.image} className="mt-4 aspect-[16/9] rounded-2xl" />
                  <div className="mt-4 font-display text-[26px] text-ink">{t.name}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[13px] text-stone-500"><Clock size={13} />{t.duration} min</div>
                  <div className="mt-5 space-y-2.5 border-t border-stone-100 pt-4 text-[13.5px]">
                    <Row k="Practitioner" v={draft.practitionerId ? (draft.practitionerId === 'any' ? 'First available' : staffName(db, draft.practitionerId)) : '—'} />
                    <Row k="Location" v={draft.locationId ? locationName(db, draft.locationId) : '—'} />
                    <Row k="Date" v={draft.date ? new Date(draft.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'} />
                    <Row k="Time" v={draft.start ? fmtTime(draft.start) : '—'} />
                  </div>
                  <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-[13.5px]">
                    <Row k="Treatment" v={(t.locationPricing[draft.locationId ?? ''] ?? t.priceFrom) ? money(t.locationPricing[draft.locationId ?? ''] ?? t.priceFrom) : 'Complimentary'} />
                    {t.deposit > 0 && <Row k="Deposit today" v={<b className="font-medium">{money(t.deposit)}</b>} />}
                  </div>
                </>
              ) : <p className="mt-4 text-[14px] text-stone-500">Choose your goals to see personalised recommendations.</p>}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

const StepShell = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <div>
    <h1 className="font-display text-[40px] leading-[1.05] text-ink md:text-[52px]">{title}</h1>
    {sub && <p className="mt-3 text-[15px] text-stone-500">{sub}</p>}
    <div className="mt-9">{children}</div>
  </div>
)
const Footer = ({ children }: { children: React.ReactNode }) => <div className="mt-10 flex justify-end">{children}</div>
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-3"><span className="text-stone-500">{k}</span><span className="text-right text-ink">{v}</span></div>
const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn('rounded-full border px-4 py-2 text-[13.5px] transition-all duration-300', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white text-ink hover:border-stone-300')}>{children}</button>
)
const YesNo = ({ label, value, onChange }: { label: string; value?: boolean; onChange: (v: boolean) => void }) => (
  <div>
    <div className="mb-3 text-[14.5px] text-ink">{label}</div>
    <div className="flex gap-2"><Chip on={value === false} onClick={() => onChange(false)}>No</Chip><Chip on={value === true} onClick={() => onChange(true)}>Yes</Chip></div>
  </div>
)
const OptionCard = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <motion.button whileTap={{ scale: 0.985 }} onClick={onClick} className={cn('flex items-center gap-4 rounded-2xl border bg-white p-4 text-left transition-all duration-300', selected ? 'border-ink shadow-lift' : 'border-stone-200 hover:border-stone-300 hover:shadow-soft')}>{children}</motion.button>
)

function TreatmentOption({ t, selected, badge, onSelect }: { t: Treatment; selected: boolean; badge: string; onSelect: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.99 }} onClick={onSelect} className={cn('flex w-full items-center gap-5 rounded-3xl border bg-white p-3 pr-6 text-left transition-all duration-300', selected ? 'border-ink shadow-lift' : 'border-stone-200 hover:shadow-soft')}>
      <Photo src={t.image} className="h-24 w-24 shrink-0 rounded-2xl sm:h-28 sm:w-32" />
      <div className="min-w-0 flex-1">
        <span className="rounded-full bg-bronze-50 px-2.5 py-0.5 text-[11px] font-medium text-bronze-700">{badge}</span>
        <div className="mt-1.5 font-display text-[24px] leading-tight text-ink">{t.name}</div>
        <p className="mt-0.5 line-clamp-2 text-[13.5px] text-stone-500">{t.tagline}</p>
        <div className="mt-1.5 flex gap-3 text-[12.5px] text-stone-500"><span>{t.duration} min</span><span>{t.priceFrom ? `from ${money(t.priceFrom)}` : 'Complimentary'}</span><span>{t.downtime === 'None' ? 'No downtime' : t.downtime}</span></div>
      </div>
    </motion.button>
  )
}

function DateStep({ t, locationId, pIds, value, onPick }: { t: Treatment; locationId: ID; pIds: ID[]; value?: string; onPick: (iso: string) => void }) {
  const db = useDB()
  const [offset, setOffset] = useState(0)
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), offset + i)), [offset])
  const counts = useMemo(() => days.map((d) => new Set(pIds.flatMap((p) => slotsFor(db, p, locationId, d, t.duration).map((s) => s.getTime()))).size), [days, db.appointments, pIds.join(), locationId, t.duration]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <StepShell title="Choose a date" sub="Days with the most availability are highlighted.">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[14px] text-ink">{days[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div className="flex gap-1">
          <button disabled={offset === 0} onClick={() => setOffset(offset - 14)} className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 disabled:opacity-30" aria-label="Previous two weeks"><ChevronLeft size={16} /></button>
          <button disabled={offset >= 42} onClick={() => setOffset(offset + 14)} className="grid h-9 w-9 place-items-center rounded-full border border-stone-200 disabled:opacity-30" aria-label="Next two weeks"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((d, i) => {
          const n = counts[i]
          const on = value && startOfDay(value).getTime() === d.getTime()
          return (
            <motion.button key={d.toISOString()} whileTap={{ scale: 0.96 }} disabled={!n} onClick={() => onPick(d.toISOString())}
              className={cn('flex flex-col items-center rounded-2xl border py-3.5 transition-all duration-300 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:opacity-35', on ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-soft')}>
              <span className={cn('text-[11px] uppercase tracking-wider', on ? 'text-ivory/70' : 'text-stone-500')}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="mt-1 font-display text-[26px] leading-none">{d.getDate()}</span>
              <span className={cn('mt-1.5 text-[10.5px]', on ? 'text-ivory/70' : n > 6 ? 'text-sage-500' : 'text-stone-400')}>{n ? `${n} times` : 'Full'}</span>
            </motion.button>
          )
        })}
      </div>
    </StepShell>
  )
}

function TimeGrid({ db, t, locationId, pIds, date, value, onPick }: { db: ReturnType<typeof useDB>; t: Treatment; locationId: ID; pIds: ID[]; date: string; value?: string; onPick: (iso: string) => void }) {
  const all = [...new Map(pIds.flatMap((p) => slotsFor(db, p, locationId, new Date(date), t.duration)).map((s) => [s.getTime(), s])).values()].sort((a, b) => a.getTime() - b.getTime())
  const groups = [['Morning', all.filter((s) => s.getHours() < 12)], ['Afternoon', all.filter((s) => s.getHours() >= 12 && s.getHours() < 17)], ['Evening', all.filter((s) => s.getHours() >= 17)]] as const
  if (!all.length) return <p className="text-stone-500">No times left on this day.</p>
  return (
    <div className="space-y-7">
      {groups.filter(([, l]) => l.length).map(([label, list]) => (
        <div key={label}>
          <div className="mb-3 text-[12px] uppercase tracking-[0.14em] text-stone-400">{label}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {list.map((s, i) => (
              <motion.button key={s.toISOString()} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.025, duration: 0.35 }} whileTap={{ scale: 0.96 }} onClick={() => onPick(s.toISOString())}
                className={cn('rounded-xl border py-3 text-[14px] transition-all duration-300', value === s.toISOString() ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white text-ink hover:border-stone-400')}>{fmtTime(s)}</motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentStep({ amount, onPay }: { amount: number; onPay: () => void }) {
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', exp: '12/28', cvc: '123', name: '' })
  const [paying, setPaying] = useState(false)
  const pay = () => { setPaying(true); setTimeout(onPay, 1100) }
  return (
    <StepShell title="Secure your appointment" sub={`A ${money(amount)} deposit holds your time and is credited in full to your treatment.`}>
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2 text-[14px] text-ink"><CreditCard size={16} />Card details</div><div className="flex items-center gap-1.5 text-[12px] text-stone-500"><Lock size={12} />Encrypted · PCI-compliant</div></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Card number" className="sm:col-span-2"><Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} inputMode="numeric" /></Field>
          <Field label="Expiry"><Input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
          <Field label="CVC"><Input value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} /></Field>
        </div>
        <p className="mt-4 text-[12.5px] text-stone-500">Free cancellation up to 48 hours before. Demo mode — no real charge is made.</p>
      </div>
      <Footer><Button size="lg" onClick={pay} disabled={paying || card.number.replace(/\s/g, '').length < 15}>{paying ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} className="h-4 w-4 rounded-full border-2 border-ivory/30 border-t-ivory" />Processing</> : <>Pay {money(amount)} deposit</>}</Button></Footer>
    </StepShell>
  )
}

function Confirmation({ t, draft, bookingId }: { t: Treatment; draft: Draft; bookingId: ID | null }) {
  const db = useDB()
  const appt = db.appointments.find((a) => a.id === bookingId)
  const start = new Date(draft.start!)
  const ics = () => {
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = new Date(start.getTime() + t.duration * 60000)
    const loc = db.locations.find((l) => l.id === draft.locationId)!
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${t.name} · Aurelia Aesthetics`, `LOCATION:${loc.address}, ${loc.city}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' })); a.download = 'aurelia-appointment.ics'; a.click()
  }
  return (
    <div className="mx-auto max-w-2xl text-center">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.7, ease: EASE }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sage-50">
        <motion.svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4E7A61" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }} /></motion.svg>
      </motion.div>
      <h1 className="mt-7 font-display text-[48px] leading-none text-ink md:text-[60px]">You’re booked, {draft.patient.firstName}.</h1>
      <p className="mt-4 text-[16px] text-stone-600">{appt?.status === 'Requested' ? 'Your request has been received — we’ll confirm shortly.' : 'A confirmation is on its way to'} {draft.patient.email}.</p>
      <div className="mt-10 rounded-[28px] border border-stone-200 bg-white p-7 text-left shadow-soft">
        <div className="flex items-center gap-5">
          <Photo src={t.image} className="h-20 w-20 shrink-0 rounded-2xl" />
          <div>
            <div className="font-display text-[28px] leading-tight text-ink">{t.name}</div>
            <div className="text-[14px] text-stone-500">{start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · {fmtTime(start)}</div>
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-stone-100 pt-5 text-[14px] sm:grid-cols-3">
          <div><div className="text-stone-400">With</div><div className="text-ink">{staffName(db, appt?.practitionerId ?? (draft.practitionerId as ID))}</div></div>
          <div><div className="text-stone-400">Where</div><div className="text-ink">{locationName(db, draft.locationId!)}</div></div>
          <div><div className="text-stone-400">Paid today</div><div className="text-ink">{appt?.depositPaid ? money(appt.deposit) : '—'}</div></div>
        </div>
        {t.consentFormId && <div className="mt-5 rounded-2xl bg-cream px-4 py-3 text-[13.5px] text-stone-600">One more thing — please sign your consent form in the patient portal before your visit.</div>}
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" icon={<CalendarPlus size={16} />} onClick={ics}>Add to calendar</Button>
        <Link to="/portal"><Button>Open patient portal</Button></Link>
      </div>
      <p className="mt-8 text-[12.5px] text-stone-400">This booking now appears live in the clinic dashboard calendar, CRM and audit log.</p>
    </div>
  )
}
