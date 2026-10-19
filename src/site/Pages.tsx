import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { Star, MapPin, Phone, Mail, Clock, Plus, Check, ArrowRight, Sparkles, Send } from 'lucide-react'
import { useDB, useStore, cmsOf, treatmentName } from '@/store/store'
import { Button, Photo, Reveal, BeforeAfter, Input, Textarea, Select, Field, EASE, cn } from '@/ui/ui'
import { fmtDate, money } from '@/lib/format'
import { Container, Eyebrow, BookingBand } from './parts'

const Hero = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
  <section className="pb-14 pt-16 md:pt-24">
    <Container>
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="max-w-4xl text-balance font-display text-[54px] leading-[1] tracking-tight text-ink md:text-[80px]">{title}</h1>
        {sub && <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-stone-600">{sub}</p>}
      </Reveal>
    </Container>
  </section>
)

// ── Before & After gallery (only marketing-approved media) ──────────────────
export function ResultsPage() {
  const db = useDB()
  const approved = db.photos.filter((p) => p.permission === 'Marketing approved')
  const byPatient = Object.values(approved.reduce<Record<string, typeof approved>>((a, p) => { (a[`${p.patientId}-${p.treatmentId}`] ||= []).push(p); return a }, {})).filter((x) => x.length >= 2)
  const txIds = [...new Set(byPatient.map((g) => g[0].treatmentId))]
  const [filter, setFilter] = useState('All')
  const list = byPatient.filter((g) => filter === 'All' || g[0].treatmentId === filter)
  return (
    <>
      <Hero eyebrow="Before & After" title="Results that still look like you." sub="Every image is shared with written consent and approved by our medical team. Drag to compare." />
      <Container>
        <LayoutGroup id="res">
          <div className="no-scrollbar mb-10 flex gap-1.5 overflow-x-auto">
            {['All', ...txIds].map((id) => (
              <button key={id} onClick={() => setFilter(id)} className={cn('relative whitespace-nowrap rounded-full px-4 py-2 text-[13px]', filter === id ? 'text-ivory' : 'text-stone-600 hover:text-ink')}>
                {filter === id && <motion.span layoutId="res-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.5, ease: EASE }} />}
                <span className="relative">{id === 'All' ? 'All results' : treatmentName(db, id)}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
        <motion.div layout className="grid gap-8 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {list.map((g) => {
              const before = g.find((p) => p.stage === 'Baseline') ?? g[0]
              const after = g.find((p) => p.stage !== 'Baseline') ?? g[1]
              const t = db.treatments.find((x) => x.id === before.treatmentId)!
              return (
                <motion.div layout key={before.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.6, ease: EASE }}>
                  <BeforeAfter before={before.src} after={after.src} className="aspect-[4/3] rounded-[24px]" />
                  <div className="mt-4 flex items-baseline justify-between">
                    <Link to={`/treatments/${t.slug}`} className="font-display text-[26px] text-ink hover:underline">{t.name}</Link>
                    <span className="text-[13px] text-stone-500">{Math.round((new Date(after.takenAt).getTime() - new Date(before.takenAt).getTime()) / 86400000)} days between photos</span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
        <p className="mt-10 text-[12px] text-stone-400">Illustrative imagery in this demo. Individual results vary; all treatments carry risks discussed at consultation.</p>
      </Container>
      <section className="pt-24"><BookingBand /></section>
    </>
  )
}

export function AboutPage() {
  const db = useDB()
  const cms = cmsOf(db)
  return (
    <>
      <Hero eyebrow="About Aurelia" title={cms.about.headline} />
      <Container className="grid gap-14 lg:grid-cols-12">
        <Reveal className="lg:col-span-7"><Photo src={db.locations[0].image} reveal className="aspect-[4/3] rounded-[28px]" /></Reveal>
        <div className="space-y-6 lg:col-span-5">
          {cms.about.body.map((p, i) => <Reveal key={i} delay={i * 0.08}><p className="text-[17px] leading-[1.8] text-stone-600">{p}</p></Reveal>)}
          <Reveal delay={0.2} className="grid grid-cols-2 gap-6 border-t border-stone-200 pt-8">
            {cms.stats.slice(0, 4).map((s) => <div key={s.label}><div className="font-display text-[40px] text-ink">{s.value.toLocaleString()}{s.suffix}</div><div className="text-[13px] text-stone-500">{s.label}</div></div>)}
          </Reveal>
        </div>
      </Container>
      <section className="py-24">
        <Container className="grid gap-6 md:grid-cols-3">
          {[['Clinical first', 'Every treatment is planned and supervised by our medical director. We decline treatments that aren’t right for you.'], ['Charted precisely', 'Units, products, lot numbers and injection points are recorded every visit, so your care is consistent and traceable.'], ['Cared for after', 'Automatic check-ins, aftercare and a direct line to your practitioner through the patient portal.']].map(([t, b], i) => (
            <Reveal key={t} delay={i * 0.08} className="rounded-[24px] bg-cream p-8">
              <div className="font-display text-[30px] text-ink">{t}</div>
              <p className="mt-3 text-[15px] leading-relaxed text-stone-600">{b}</p>
            </Reveal>
          ))}
        </Container>
      </section>
      <BookingBand />
    </>
  )
}

export function LocationsPage() {
  const db = useDB()
  return (
    <>
      <Hero eyebrow="Locations" title="Find your calm." sub="Two clinics, one standard of care. Your records, memberships and packages work at both." />
      <Container className="space-y-20">
        {db.locations.filter((l) => l.active).map((l, i) => {
          const tx = db.treatments.filter((t) => t.active && t.locationIds.includes(l.id))
          const team = db.staff.filter((s) => s.bookable && s.locationIds.includes(l.id))
          return (
            <div key={l.id} className="grid items-start gap-10 lg:grid-cols-12">
              <Reveal className={cn('lg:col-span-7', i % 2 && 'lg:order-2 lg:col-start-6')}><Photo src={l.image} reveal className="aspect-[16/11] rounded-[28px]" tone={i + 1} /></Reveal>
              <Reveal delay={0.1} className={cn('lg:col-span-5', i % 2 ? 'lg:col-start-1 lg:row-start-1' : '')}>
                <h2 className="font-display text-[54px] leading-none text-ink">{l.name}</h2>
                <div className="mt-6 space-y-3 text-[15px] text-stone-600">
                  <div className="flex gap-3"><MapPin size={17} className="mt-0.5 shrink-0 text-bronze-500" />{l.address}, {l.city}</div>
                  <div className="flex gap-3"><Phone size={17} className="shrink-0 text-bronze-500" />{l.phone}</div>
                  <div className="flex gap-3"><Mail size={17} className="shrink-0 text-bronze-500" />{l.email}</div>
                </div>
                <div className="mt-6 rounded-2xl bg-cream p-5">
                  {l.hours.map((h) => <div key={h.days} className="flex justify-between py-1 text-[14px]"><span className="text-stone-500">{h.days}</span><span className="text-ink">{h.time}</span></div>)}
                </div>
                <div className="mt-6 text-[13px] text-stone-500">Treatments here: {tx.map((t) => t.name).join(', ')}</div>
                <div className="mt-2 text-[13px] text-stone-500">Practitioners: {team.map((s) => s.name).join(', ')}</div>
                <div className="mt-7 flex gap-3">
                  <Link to={`/book?location=${l.id}`}><Button>Book at {l.name}</Button></Link>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(l.address + ' ' + l.city)}`} target="_blank" rel="noreferrer"><Button variant="secondary">Directions</Button></a>
                </div>
              </Reveal>
            </div>
          )
        })}
      </Container>
    </>
  )
}

export function MembershipsPage() {
  const db = useDB()
  return (
    <>
      <Hero eyebrow="Memberships & packages" title="Care that compounds." sub="Memberships keep your monthly ritual effortless. Packages give you a full course at a better rate. Both are managed in your patient portal." />
      <Container>
        <div className="grid gap-5 md:grid-cols-3">
          {db.membershipPlans.filter((m) => m.active).map((m, i) => (
            <Reveal key={m.id} delay={i * 0.08}>
              <div className={cn('relative flex h-full flex-col rounded-[28px] p-9', i === 1 ? 'grain bg-ink text-ivory shadow-lift' : 'border border-stone-200 bg-white')}>
                {i === 1 && <span className="absolute right-6 top-6 rounded-full bg-bronze-500 px-3 py-1 text-[11px] font-medium text-white">Most loved</span>}
                <div className="font-display text-[36px]">{m.name}</div>
                <div className={cn('mt-1 text-[14px]', i === 1 ? 'text-ivory/60' : 'text-stone-500')}>{m.tagline}</div>
                <div className="mt-7 flex items-baseline gap-1"><span className="font-display text-[56px] leading-none">{money(m.price)}</span><span className={i === 1 ? 'text-ivory/60' : 'text-stone-500'}>/month</span></div>
                <ul className="mt-8 flex-1 space-y-3.5 text-[14.5px]">{m.benefits.map((b) => <li key={b} className="flex gap-3"><Check size={16} className={cn('mt-0.5 shrink-0', i === 1 ? 'text-bronze-300' : 'text-sage-500')} />{b}</li>)}</ul>
                <Link to="/portal/membership"><Button variant={i === 1 ? 'light' : 'primary'} size="lg" className="mt-9 w-full">Join {m.name}</Button></Link>
                <div className={cn('mt-3 text-center text-[12px]', i === 1 ? 'text-ivory/50' : 'text-stone-400')}>Cancel anytime after 3 months</div>
              </div>
            </Reveal>
          ))}
        </div>
        <div id="packages" className="scroll-mt-28 pt-28">
          <Reveal>
            <Eyebrow>Treatment packages</Eyebrow>
            <h2 className="font-display text-[48px] leading-none text-ink">A full course, beautifully priced.</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {db.packageTemplates.filter((p) => p.active).map((p, i) => {
              const value = p.items.reduce((a, it) => a + (db.treatments.find((t) => t.id === it.treatmentId)?.priceFrom ?? 0) * it.qty, 0)
              return (
                <Reveal key={p.id} delay={(i % 2) * 0.08}>
                  <div className="flex h-full flex-col rounded-[24px] bg-cream p-8 transition-shadow duration-500 hover:shadow-lift">
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-display text-[30px] text-ink">{p.name}</div>
                      <div className="text-right"><div className="font-display text-[32px] leading-none text-ink">{money(p.price)}</div>{value > p.price && <div className="mt-1 text-[12.5px] text-sage-500">Save {money(value - p.price)}</div>}</div>
                    </div>
                    <p className="mt-2 text-[14.5px] text-stone-600">{p.description}</p>
                    <ul className="mt-5 flex-1 space-y-2 text-[14px]">{p.items.map((it) => <li key={it.treatmentId} className="flex items-center gap-2.5 text-stone-700"><Sparkles size={13} className="text-bronze-500" />{it.qty} × {treatmentName(db, it.treatmentId)}</li>)}</ul>
                    <div className="mt-6 flex items-center justify-between text-[12.5px] text-stone-500">
                      <span>Valid {p.expiryMonths} months · {p.transferable ? 'Transferable' : 'Non-transferable'}</span>
                      <Link to="/contact" className="flex items-center gap-1 font-medium text-ink">Enquire <ArrowRight size={13} /></Link>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </Container>
      <section className="pt-24"><BookingBand /></section>
    </>
  )
}

export function ReviewsPage() {
  const db = useDB()
  const list = db.testimonials.filter((t) => t.published)
  const rated = db.reviewRequests.filter((r) => r.rating)
  const avg = rated.reduce((a, r) => a + (r.rating ?? 0), 0) / Math.max(1, rated.length)
  return (
    <>
      <Hero eyebrow="Reviews" title="In our patients’ words." />
      <Container>
        <Reveal className="mb-14 flex flex-wrap items-center gap-8 rounded-[28px] bg-cream p-8">
          <div className="font-display text-[72px] leading-none text-ink">{Math.max(4.8, avg).toFixed(1)}</div>
          <div>
            <div className="flex gap-1">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={18} className="fill-bronze-500 text-bronze-500" />)}</div>
            <div className="mt-2 text-[14px] text-stone-600">Average across {(rated.length * 14).toLocaleString()}+ verified reviews on Google and Aurelia</div>
          </div>
        </Reveal>
        <div className="columns-1 gap-6 md:columns-2 lg:columns-3">
          {list.map((t, i) => (
            <Reveal key={t.id} delay={(i % 3) * 0.06} className="mb-6 break-inside-avoid rounded-[24px] border border-stone-200 bg-white p-7">
              <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={13} className={k < t.rating ? 'fill-bronze-500 text-bronze-500' : 'text-stone-300'} />)}</div>
              <p className="mt-4 font-display text-[22px] leading-snug text-ink">“{t.text}”</p>
              <div className="mt-5 flex items-center justify-between text-[12.5px] text-stone-500"><span>{t.name} · {treatmentName(db, t.treatmentId)}</span><span>{t.source}</span></div>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  )
}

export function JournalPage() {
  const db = useDB()
  const posts = cmsOf(db).posts.filter((p) => p.published)
  const [lead, ...rest] = posts
  return (
    <>
      <Hero eyebrow="Journal" title="Education, not hype." sub="Evidence-led guidance from our medical team." />
      <Container>
        {lead && (
          <Reveal>
            <Link to={`/journal/${lead.slug}`} className="group grid items-center gap-10 md:grid-cols-2">
              <Photo src={lead.image} zoom className="aspect-[4/3] rounded-[28px]" />
              <div>
                <div className="text-[12px] uppercase tracking-[0.16em] text-bronze-600">{lead.category} · {lead.readMins} min read</div>
                <h2 className="mt-3 font-display text-[44px] leading-[1.05] text-ink group-hover:text-stone-600">{lead.title}</h2>
                <p className="mt-4 text-[16px] text-stone-600">{lead.excerpt}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm text-ink">Read article <ArrowRight size={14} /></span>
              </div>
            </Link>
          </Reveal>
        )}
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          {rest.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <Link to={`/journal/${p.slug}`} className="group block">
                <Photo src={p.image} zoom className="aspect-[4/3] rounded-[20px]" tone={i} />
                <div className="mt-4 text-[12px] uppercase tracking-[0.14em] text-bronze-600">{p.category}</div>
                <div className="mt-2 font-display text-[26px] leading-tight text-ink">{p.title}</div>
                <div className="mt-2 text-[13px] text-stone-500">{fmtDate(p.date)}</div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </>
  )
}

export function PostPage() {
  const { slug } = useParams()
  const db = useDB()
  const p = cmsOf(db).posts.find((x) => x.slug === slug && x.published)
  if (!p) return <Navigate to="/journal" replace />
  return (
    <article className="pt-16 md:pt-24">
      <Container className="max-w-3xl">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.16em] text-bronze-600">{p.category} · {p.readMins} min read · {fmtDate(p.date)}</div>
          <h1 className="mt-4 font-display text-[50px] leading-[1.02] text-ink md:text-[68px]">{p.title}</h1>
          <p className="mt-5 text-[19px] text-stone-600">{p.excerpt}</p>
        </Reveal>
      </Container>
      <Container className="my-14 max-w-5xl"><Photo src={p.image} reveal className="aspect-[16/9] rounded-[28px]" /></Container>
      <Container className="max-w-2xl space-y-6">
        {p.body.map((para, i) => <Reveal key={i}><p className="text-[18px] leading-[1.85] text-stone-700">{para}</p></Reveal>)}
        <div className="!mt-14 rounded-[24px] bg-cream p-8">
          <div className="font-display text-[26px] text-ink">Have a question about your skin?</div>
          <p className="mt-2 text-[15px] text-stone-600">Book a complimentary consultation with our medical team.</p>
          <Link to="/book"><Button className="mt-5">Book Consultation</Button></Link>
        </div>
      </Container>
    </article>
  )
}

export function FAQPage() {
  const db = useDB()
  const faqs = cmsOf(db).faqs
  const cats = [...new Set(faqs.map((f) => f.category))]
  const [open, setOpen] = useState<string | null>(faqs[0]?.q ?? null)
  return (
    <>
      <Hero eyebrow="FAQs" title="Good questions." />
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="text-[15px] leading-relaxed text-stone-600">Can’t find what you need? Our patient coordinators reply within the hour during clinic hours.</p>
          <Link to="/contact"><Button variant="secondary" className="mt-6">Contact us</Button></Link>
        </div>
        <div className="space-y-12 lg:col-span-8">
          {cats.map((c) => (
            <div key={c}>
              <div className="mb-2 text-[12px] uppercase tracking-[0.16em] text-bronze-600">{c}</div>
              <div className="divide-y divide-stone-200 border-y border-stone-200">
                {faqs.filter((f) => f.category === c).map((f) => (
                  <div key={f.q}>
                    <button onClick={() => setOpen(open === f.q ? null : f.q)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[17px] text-ink">
                      {f.q}<motion.span animate={{ rotate: open === f.q ? 45 : 0 }} transition={{ duration: 0.4, ease: EASE }}><Plus size={18} className="text-stone-400" /></motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open === f.q && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden text-[15.5px] leading-relaxed text-stone-600"><span className="block pb-5">{f.a}</span></motion.p>}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  )
}

export function ContactPage() {
  const db = useDB()
  const addLead = useStore((s) => s.addLead)
  const [sent, setSent] = useState(false)
  const [f, setF] = useState({ name: '', email: '', phone: '', interestId: 'tx_consult', message: '' })
  const valid = f.name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email) && f.phone.length >= 7
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    addLead({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), interestId: f.interestId, source: 'Website form', notes: f.message })
    setSent(true)
  }
  return (
    <>
      <Hero eyebrow="Contact" title="We’d love to hear from you." />
      <Container className="grid gap-14 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-5">
          {db.locations.filter((l) => l.active).map((l) => (
            <div key={l.id} className="rounded-[24px] bg-cream p-7">
              <div className="font-display text-[28px] text-ink">{l.name}</div>
              <div className="mt-3 space-y-2 text-[14.5px] text-stone-600">
                <div className="flex gap-3"><MapPin size={16} className="mt-0.5 text-bronze-500" />{l.address}, {l.city}</div>
                <div className="flex gap-3"><Phone size={16} className="text-bronze-500" />{l.phone}</div>
                <div className="flex gap-3"><Clock size={16} className="text-bronze-500" />{l.hours[0].days}, {l.hours[0].time}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div key="ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-stone-200 bg-white p-10 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage-50 text-sage-500"><Check /></div>
                <div className="mt-5 font-display text-[34px] text-ink">Thank you, {f.name.split(' ')[0]}.</div>
                <p className="mt-2 text-[15px] text-stone-600">A patient coordinator will reach out shortly. We’ve also sent you a text with a link to book online.</p>
                <Link to="/book"><Button className="mt-7">Book online now</Button></Link>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} className="space-y-5 rounded-[28px] border border-stone-200 bg-white p-8 shadow-soft">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Jane Doe" required /></Field>
                  <Field label="Phone"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="(310) 555-0100" required /></Field>
                </div>
                <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="jane@example.com" required /></Field>
                <Field label="I’m interested in">
                  <Select value={f.interestId} onChange={(e) => setF({ ...f, interestId: e.target.value })}>
                    {db.treatments.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                </Field>
                <Field label="Message (optional)"><Textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Tell us a little about what you’re hoping to achieve." /></Field>
                <p className="text-[12px] text-stone-400">Please don’t include sensitive medical details here — we’ll collect those securely at intake.</p>
                <Button type="submit" size="lg" disabled={!valid} icon={<Send size={15} />}>Send enquiry</Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </>
  )
}
