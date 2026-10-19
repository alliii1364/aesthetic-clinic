import { useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { Check, Clock, CalendarDays, Repeat, Sun, AlertCircle, Plus, Star, ArrowRight, Search } from 'lucide-react'
import { useDB, staffName } from '@/store/store'
import { Button, Photo, Reveal, BeforeAfter, EASE, cn } from '@/ui/ui'
import { money } from '@/lib/format'
import { Container, Eyebrow, TreatmentCard, BookingBand, priceLabel } from './parts'

export function TreatmentsPage() {
  const db = useDB()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const cat = params.get('category') ?? 'All'
  const active = db.treatments.filter((t) => t.active)
  const cats = ['All', ...new Set(active.map((t) => t.category))]
  const list = active.filter((t) => (cat === 'All' || t.category === cat) && (!q || `${t.name} ${t.tagline} ${t.concerns.join(' ')}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <>
      <section className="pb-14 pt-16 md:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>Treatments</Eyebrow>
            <h1 className="max-w-4xl text-balance font-display text-[56px] leading-[1] tracking-tight text-ink md:text-[84px]">Treatments, thoughtfully curated.</h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-stone-600">From a monthly Hydrafacial to a full facial-balancing plan — every treatment is delivered by our medical team with natural results in mind.</p>
          </Reveal>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
            <LayoutGroup id="cats">
              <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:px-0">
                {cats.map((c) => (
                  <button key={c} onClick={() => setParams(c === 'All' ? {} : { category: c })} className={cn('relative whitespace-nowrap rounded-full px-4 py-2 text-[13px] transition-colors duration-300', cat === c ? 'text-ivory' : 'text-stone-600 hover:text-ink')}>
                    {cat === c && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.5, ease: EASE }} />}
                    <span className="relative">{c}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <label className="flex h-10 w-full items-center gap-2 rounded-full border border-stone-200 bg-white px-4 sm:w-72">
              <Search size={15} className="text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search treatments or concerns" className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400" />
            </label>
          </div>
        </Container>
      </section>
      <Container>
        <motion.div layout className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((t, i) => <TreatmentCard key={t.id} t={t} index={i} filterable />)}
          </AnimatePresence>
        </motion.div>
        {!list.length && <p className="py-24 text-center text-stone-500">No treatments match — try another concern, or <Link to="/book" className="underline">book a consultation</Link>.</p>}
      </Container>
      <section className="pt-28"><BookingBand /></section>
    </>
  )
}

export function TreatmentDetail() {
  const { slug } = useParams()
  const db = useDB()
  const t = db.treatments.find((x) => x.slug === slug)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  if (!t || !t.active) return <Navigate to="/treatments" replace />
  const practitioners = db.staff.filter((s) => t.practitionerIds.includes(s.id) && s.active)
  const reviews = db.testimonials.filter((r) => r.published && r.treatmentId === t.id)
  const photos = db.photos.filter((p) => p.permission === 'Marketing approved' && p.treatmentId === t.id)
  const before = photos.find((p) => p.stage === 'Baseline')
  const after = photos.find((p) => p.stage !== 'Baseline' && p.patientId === before?.patientId)
  const locs = db.locations.filter((l) => t.locationIds.includes(l.id) && l.active)
  const related = db.treatments.filter((x) => x.active && x.id !== t.id && x.concerns.some((c) => t.concerns.includes(c))).slice(0, 3)
  const faqs = [...t.faqs, { q: 'Who will perform my treatment?', a: `${practitioners.map((p) => p.name).join(' or ')} — all members of our licensed medical team.` }]
  const facts = [
    { icon: Clock, k: 'Treatment time', v: `${t.duration} minutes` },
    { icon: Sun, k: 'Downtime', v: t.downtime },
    { icon: Repeat, k: 'Recommended', v: t.sessions },
    { icon: CalendarDays, k: 'Results', v: t.results.split('.')[0] },
  ]

  return (
    <>
      <section className="pt-10 md:pt-16">
        <Container>
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Reveal>
                <Link to={`/treatments?category=${encodeURIComponent(t.category)}`} className="text-[12px] uppercase tracking-[0.18em] text-bronze-600 hover:text-bronze-700">{t.category}</Link>
                <h1 className="mt-4 font-display text-[64px] leading-[0.95] tracking-tight text-ink md:text-[96px]">{t.name}</h1>
                <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-stone-600">{t.tagline}</p>
                <div className="mt-8 flex flex-wrap items-center gap-6">
                  {t.onlineBookable ? <Link to={`/book?treatment=${t.slug}`}><Button size="lg">Book {t.name}</Button></Link> : <Link to="/book?treatment=skin-consultation"><Button size="lg">Book a consultation</Button></Link>}
                  <div>
                    <div className="font-display text-[28px] leading-none text-ink">{priceLabel(t)}</div>
                    {t.priceNote && <div className="mt-1 text-[12.5px] text-stone-500">{t.priceNote}</div>}
                  </div>
                </div>
              </Reveal>
            </div>
            <div className="lg:col-span-6">
              <Photo src={t.image} reveal className="aspect-[5/4] rounded-[28px]" />
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-stone-200/80 bg-stone-200/80 md:grid-cols-4">
            {facts.map((f, i) => (
              <Reveal key={f.k} delay={i * 0.05} className="h-full bg-ivory p-6">
                <f.icon size={18} strokeWidth={1.4} className="text-bronze-500" />
                <div className="mt-4 text-[12px] uppercase tracking-[0.12em] text-stone-400">{f.k}</div>
                <div className="mt-1 text-[15px] text-ink">{f.v}</div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-24">
        <Container className="grid gap-16 lg:grid-cols-12">
          <div className="space-y-16 lg:col-span-7">
            <Reveal>
              <h2 className="font-display text-[38px] text-ink">Overview</h2>
              <p className="mt-4 text-[16.5px] leading-[1.75] text-stone-600">{t.description}</p>
              <div className="mt-6 flex flex-wrap gap-2">{t.concerns.map((c) => <span key={c} className="rounded-full bg-cream px-3.5 py-1.5 text-[13px] text-stone-700">{c}</span>)}</div>
            </Reveal>
            <Reveal>
              <h2 className="font-display text-[38px] text-ink">Benefits</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">{t.benefits.map((b) => <li key={b} className="flex gap-3 text-[15px] text-stone-700"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sage-50 text-sage-500"><Check size={12} /></span>{b}</li>)}</ul>
            </Reveal>
            <Reveal>
              <h2 className="font-display text-[38px] text-ink">How it works</h2>
              <p className="mt-4 text-[16px] leading-[1.75] text-stone-600">{t.howItWorks}</p>
              <p className="mt-4 text-[16px] leading-[1.75] text-stone-600"><span className="text-ink">Expected results — </span>{t.results}</p>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              <Reveal className="rounded-3xl bg-cream p-7">
                <div className="text-[12px] uppercase tracking-[0.14em] text-bronze-600">Before your visit</div>
                <ul className="mt-4 space-y-3 text-[14.5px] text-stone-700">{t.preparation.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />{p}</li>)}</ul>
              </Reveal>
              <Reveal delay={0.06} className="rounded-3xl bg-cream p-7">
                <div className="text-[12px] uppercase tracking-[0.14em] text-bronze-600">Aftercare</div>
                <ul className="mt-4 space-y-3 text-[14.5px] text-stone-700">{t.aftercare.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />{p}</li>)}</ul>
              </Reveal>
            </div>
            {t.contraindications.length > 0 && (
              <Reveal className="flex gap-4 rounded-3xl border border-stone-200 p-7">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                  <div className="text-[14px] font-medium text-ink">This treatment may not be suitable if you have</div>
                  <p className="mt-1.5 text-[14px] text-stone-600">{t.contraindications.join(' · ')}. We’ll review your medical history at intake.</p>
                </div>
              </Reveal>
            )}
            {before && after && (
              <Reveal>
                <h2 className="mb-5 font-display text-[38px] text-ink">Before & after</h2>
                <BeforeAfter before={before.src} after={after.src} className="aspect-[4/3] rounded-[24px]" />
                <p className="mt-2 text-[11.5px] text-stone-400">Shared with written patient consent. Illustrative imagery in this demo.</p>
              </Reveal>
            )}
            <Reveal>
              <h2 className="font-display text-[38px] text-ink">Questions</h2>
              <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
                {faqs.map((f, i) => (
                  <div key={f.q}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] text-ink">
                      {f.q}<motion.span animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.4, ease: EASE }}><Plus size={18} className="text-stone-400" /></motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden text-[15px] leading-relaxed text-stone-600"><span className="block pb-5">{f.a}</span></motion.p>}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-28 space-y-6">
              <Reveal className="rounded-[28px] border border-stone-200 bg-white p-7 shadow-soft">
                <div className="text-[12px] uppercase tracking-[0.14em] text-stone-400">Pricing</div>
                <div className="mt-4 divide-y divide-stone-100">
                  {locs.map((l) => (
                    <div key={l.id} className="flex items-baseline justify-between py-3 text-[14.5px]">
                      <span className="text-stone-600">{l.name}</span>
                      <span className="font-display text-[24px] text-ink">{((t.locationPricing[l.id] ?? t.priceFrom) === 0 ? 'Complimentary' : money(t.locationPricing[l.id] ?? t.priceFrom))}</span>
                    </div>
                  ))}
                </div>
                {t.deposit > 0 && <p className="mt-3 text-[12.5px] text-stone-500">A {money(t.deposit)} deposit secures your booking and is credited to your treatment.</p>}
                <p className="mt-1 text-[12.5px] text-stone-500">Members save up to 15%. <Link to="/memberships" className="underline">See memberships</Link></p>
                {t.onlineBookable && <Link to={`/book?treatment=${t.slug}`}><Button className="mt-6 w-full" size="lg">Check availability</Button></Link>}
              </Reveal>
              <Reveal delay={0.08} className="rounded-[28px] bg-cream p-7">
                <div className="text-[12px] uppercase tracking-[0.14em] text-stone-400">Your practitioners</div>
                <div className="mt-4 space-y-4">
                  {practitioners.map((p) => (
                    <Link key={p.id} to={`/practitioners/${p.id}`} className="group flex items-center gap-4">
                      <Photo src={p.avatar} className="h-14 w-14 shrink-0 rounded-2xl" />
                      <div className="flex-1">
                        <div className="text-[15px] font-medium text-ink group-hover:underline">{p.name}</div>
                        <div className="text-[12.5px] text-stone-500">{p.title}</div>
                      </div>
                      <ArrowRight size={15} className="text-stone-400 transition-transform group-hover:translate-x-1" />
                    </Link>
                  ))}
                </div>
              </Reveal>
              {reviews[0] && (
                <Reveal delay={0.12} className="rounded-[28px] border border-stone-200 p-7">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={13} className="fill-bronze-500 text-bronze-500" />)}</div>
                  <p className="mt-3 font-display text-[21px] leading-snug text-ink">“{reviews[0].text}”</p>
                  <div className="mt-3 text-[12.5px] text-stone-500">{reviews[0].name} · treated by {staffName(db, t.practitionerIds[0])}</div>
                </Reveal>
              )}
            </div>
          </aside>
        </Container>
      </section>

      {related.length > 0 && (
        <section className="pb-12">
          <Container>
            <h2 className="mb-10 font-display text-[40px] text-ink">Often paired with</h2>
            <div className="grid gap-6 md:grid-cols-3">{related.map((r, i) => <TreatmentCard key={r.id} t={r} index={i} />)}</div>
          </Container>
        </section>
      )}
      <section className="pt-16"><BookingBand /></section>
    </>
  )
}
