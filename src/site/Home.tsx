import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Star, ShieldCheck, Award, Stethoscope, Sparkles, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useDB, cmsOf, staffName, treatmentName, locationName } from '@/store/store'
import { Button, Photo, Reveal, SplitText, CountUp, BeforeAfter, EASE, cn } from '@/ui/ui'
import { nextAvailable } from '@/lib/availability'
import { fmtTime, money } from '@/lib/format'
import { Container, Eyebrow, SectionHeading, TreatmentCard, BookingBand } from './parts'

export default function Home() {
  const db = useDB()
  const cms = cmsOf(db)

  const active = db.treatments.filter((t) => t.active)
  const featured = active.filter((t) => t.featured).slice(0, 3)
  const practitioners = useMemo(() => db.staff.filter((s) => s.bookable && s.active), [db.staff])
  const next = useMemo(() => nextAvailable(db, practitioners.map((p) => p.id), db.locations.map((l) => l.id), 30, 7), [db.appointments, practitioners, db.locations]) // eslint-disable-line react-hooks/exhaustive-deps
  const cats = Object.entries(active.reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + 1; return a }, {}))
  const results = db.photos.filter((p) => p.permission === 'Marketing approved')
  const resultPairs = Object.values(results.reduce<Record<string, typeof results>>((a, p) => { (a[p.patientId] ||= []).push(p); return a }, {})).filter((x) => x.length >= 2)
  const reviews = db.testimonials.filter((t) => t.published)
  const S = cms.sections

  return (
    <>
      {/* HERO */}
      {/* Parallax runs as a CSS scroll-driven animation (compositor only, zero JS per frame) — see .hero-parallax-* in index.css */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#EFE8DE]">
        <div className="hero-parallax-img absolute inset-y-0 right-0 w-full md:w-[58%]">
          {/* Mask reveal via a transform-only curtain (compositor) instead of animating clip-path (repaints every frame). */}
          <div className="relative h-full w-full overflow-hidden">
            <motion.div initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: EASE }} className="h-full w-full">
              <Photo src={cms.hero.image} className="h-full w-full" sizes="(min-width: 768px) 58vw, 100vw" priority />
            </motion.div>
            <motion.div initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 1.6, ease: EASE, delay: 0.15 }} style={{ originX: 0 }} className="absolute inset-0 bg-[#EFE8DE]" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#EFE8DE] via-[#EFE8DE]/40 to-transparent md:via-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#EFE8DE]/80 via-transparent to-transparent md:hidden" />
        </div>
        <div className="hero-parallax-text relative">
          <Container className="flex min-h-[100svh] flex-col justify-center pb-24 pt-36">
            <div className="max-w-[640px]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 1 }}><Eyebrow>{cms.hero.eyebrow}</Eyebrow></motion.div>
              <h1 className="font-display text-[64px] font-normal leading-[0.95] tracking-[-0.02em] text-ink sm:text-[88px] lg:text-[112px]">
                <SplitText text={cms.hero.headline} delay={0.35} stagger={0.09} />
              </h1>
              <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 1, ease: EASE }} className="mt-7 max-w-md text-[17px] leading-relaxed text-stone-600">{cms.hero.sub}</motion.p>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 1, ease: EASE }} className="mt-10 flex flex-wrap gap-3">
                <Link to="/book"><Button size="lg">{cms.hero.primaryCta}</Button></Link>
                <Link to="/treatments"><Button size="lg" variant="light" className="border border-stone-200/60">{cms.hero.secondaryCta}</Button></Link>
              </motion.div>
            </div>
          </Container>
        </div>
        {/* floating booking element */}
        {next && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 1, ease: EASE }} className="absolute bottom-8 right-5 z-10 hidden md:right-10 md:block">
            <Link to={`/book?practitioner=${next.practitionerId}`} className="group flex items-center gap-4 rounded-2xl border border-white/60 bg-white/95 p-3 pr-5 shadow-lift transition-all duration-500 hover:bg-white/95">
              <Photo src={db.staff.find((s) => s.id === next.practitionerId)!.avatar} className="h-12 w-12 rounded-xl" />
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-stone-500">Next available</div>
                <div className="text-[14px] font-medium text-ink">{next.start.toDateString() === new Date().toDateString() ? 'Today' : next.start.toLocaleDateString('en-US', { weekday: 'long' })}, {fmtTime(next.start)}</div>
                <div className="text-[12.5px] text-stone-500">{staffName(db, next.practitionerId)} · {locationName(db, next.locationId)}</div>
              </div>
              <ArrowUpRight size={16} className="ml-2 text-stone-400 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </motion.div>
        )}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-stone-500 lg:flex">
          Scroll<span className="scroll-cue block h-8 w-px bg-stone-400" />
        </motion.div>
      </section>

      {/* TRUST */}
      {S.trust && (
        <section className="border-b border-stone-200/70 bg-ivory">
          <Container className="grid grid-cols-2 gap-y-6 py-9 md:grid-cols-4">
            {[[Stethoscope, 'Physician-led', 'Board-certified medical director'], [Star, '4.9 rating', `${db.reviewRequests.filter((r) => r.rating).length * 14}+ verified reviews`], [ShieldCheck, 'FDA-approved', 'Genuine, traceable products'], [Award, 'Natural results', 'Charted, conservative, refined']].map(([Icon, t, s], i) => {
              const I = Icon as typeof Star
              return (
                <Reveal key={i} delay={i * 0.06} className="flex items-center gap-4 md:justify-center">
                  <I size={20} strokeWidth={1.4} className="text-bronze-500" />
                  <div><div className="text-[14px] font-medium text-ink">{t as string}</div><div className="text-[12.5px] text-stone-500">{s as string}</div></div>
                </Reveal>
              )
            })}
          </Container>
        </section>
      )}

      {/* FEATURED */}
      {S.featured && (
        <section className="py-24 md:py-32">
          <Container>
            <SectionHeading eyebrow="Signature treatments" title={<>Precise care,<br /><em className="text-stone-500">beautifully</em> understated.</>} sub="Every treatment begins with listening. We plan around your anatomy, your lifestyle and the result you want to see in the mirror."
              action={<Link to="/treatments" className="group flex items-center gap-2 border-b border-ink/20 pb-1 text-sm text-ink hover:border-ink">View all treatments <ArrowRight size={14} className="transition-transform duration-500 group-hover:translate-x-1" /></Link>} />
            <div className="grid gap-x-6 gap-y-12 md:grid-cols-3">
              {featured.map((t, i) => <TreatmentCard key={t.id} t={t} index={i} tall={i === 1} />)}
            </div>
          </Container>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="bg-cream py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Reveal>
                <Eyebrow>Find your treatment</Eyebrow>
                <h2 className="font-display text-[44px] leading-[1.05] text-ink">What would you like help with?</h2>
                <p className="mt-5 text-[15px] leading-relaxed text-stone-600">Tell us your concern and our guided booking will recommend the right treatment — or book a consultation and we’ll plan together.</p>
                <Link to="/book"><Button className="mt-8" variant="secondary">Start guided booking <ArrowRight size={15} /></Button></Link>
              </Reveal>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-stone-200/70 sm:grid-cols-2 lg:col-span-8">
              {cats.map(([c, n], i) => (
                <Reveal key={c} delay={(i % 2) * 0.06}>
                  <Link to={`/treatments?category=${encodeURIComponent(c)}`} className="group flex h-full items-center justify-between bg-cream px-7 py-7 transition-colors duration-500 hover:bg-ivory">
                    <div>
                      <div className="font-display text-[26px] text-ink">{c}</div>
                      <div className="mt-1 text-[12.5px] text-stone-500">{n} treatment{n > 1 ? 's' : ''}</div>
                    </div>
                    <span className="grid h-10 w-10 place-items-center rounded-full border border-stone-300 text-stone-500 transition-all duration-500 ease-lux group-hover:border-ink group-hover:bg-ink group-hover:text-ivory"><ArrowRight size={15} /></span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* RESULTS */}
      {S.results && resultPairs.length > 0 && <ResultsSection pairs={resultPairs} />}

      {/* STATS */}
      <section className="py-20">
        <Container className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {cms.stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="border-l border-stone-300/70 pl-6">
              <div className="font-display text-[54px] leading-none text-ink"><CountUp value={s.value} format={(n) => (s.value % 1 ? n.toFixed(1) : Math.round(n).toLocaleString())} duration={2} />{s.suffix}</div>
              <div className="mt-3 text-[13px] text-stone-500">{s.label}</div>
            </Reveal>
          ))}
        </Container>
      </section>

      {/* PRACTITIONERS */}
      {S.team && (
        <section className="py-24">
          <Container>
            <SectionHeading eyebrow="Our medical team" title="Hands you can trust." sub="Every practitioner is licensed, continually trained and deeply invested in natural outcomes." action={<Link to="/practitioners" className="flex items-center gap-2 border-b border-ink/20 pb-1 text-sm hover:border-ink">Meet the team <ArrowRight size={14} /></Link>} />
            <div className="grid gap-6 md:grid-cols-3">
              {practitioners.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08}>
                  <Link to={`/practitioners/${p.id}`} className="group block">
                    <div className="aspect-[4/5] overflow-hidden rounded-[22px]"><Photo src={p.avatar} zoom className="h-full w-full" tone={i} /></div>
                    <div className="mt-5 flex items-start justify-between">
                      <div>
                        <div className="font-display text-[28px] leading-tight text-ink">{p.name}</div>
                        <div className="mt-1 text-[13px] text-stone-500">{p.title} · {p.credentials}</div>
                      </div>
                      <span className="mt-2 flex items-center gap-1 text-[13px] text-stone-600"><Star size={13} className="fill-bronze-500 text-bronze-500" />{p.rating.toFixed(2)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">{p.specialties.map((s) => <span key={s} className="rounded-full border border-stone-200 px-2.5 py-0.5 text-[11.5px] text-stone-600">{s}</span>)}</div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* TESTIMONIALS */}
      {S.testimonials && reviews.length > 0 && <Testimonials />}

      {/* MEMBERSHIPS */}
      {S.memberships && (
        <section className="py-24">
          <Container>
            <SectionHeading center eyebrow="Memberships" title="Consistency, rewarded." sub="Monthly rituals that keep your skin at its best — with member pricing on every treatment." />
            <div className="grid gap-5 md:grid-cols-3">
              {db.membershipPlans.filter((m) => m.active).map((m, i) => (
                <Reveal key={m.id} delay={i * 0.08}>
                  <div className={cn('flex h-full flex-col rounded-[24px] p-8 transition-shadow duration-500 hover:shadow-lift', i === 1 ? 'bg-ink text-ivory' : 'border border-stone-200 bg-white')}>
                    <div className={cn('text-[12px] uppercase tracking-[0.16em]', i === 1 ? 'text-bronze-300' : 'text-bronze-600')}>{m.tagline}</div>
                    <div className="mt-3 font-display text-[34px]">{m.name}</div>
                    <div className="mt-2 flex items-baseline gap-1"><span className="font-display text-[48px] leading-none">{money(m.price)}</span><span className={i === 1 ? 'text-ivory/60' : 'text-stone-500'}>/ month</span></div>
                    <ul className="mt-7 flex-1 space-y-3 text-[14px]">{m.benefits.map((b) => <li key={b} className="flex gap-3"><Sparkles size={14} className={cn('mt-0.5 shrink-0', i === 1 ? 'text-bronze-300' : 'text-bronze-500')} />{b}</li>)}</ul>
                    <Link to="/memberships"><Button variant={i === 1 ? 'light' : 'secondary'} className="mt-8 w-full">Explore {m.name}</Button></Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* LOCATIONS */}
      <section className="py-24">
        <Container>
          <SectionHeading eyebrow="Visit us" title="Two calm spaces in Los Angeles." />
          <div className="grid gap-6 md:grid-cols-2">
            {db.locations.filter((l) => l.active).map((l, i) => (
              <Reveal key={l.id} delay={i * 0.1}>
                <Link to="/locations" className="group block">
                  <div className="aspect-[16/10] overflow-hidden rounded-[24px]"><Photo src={l.image} zoom reveal className="h-full w-full" tone={i + 1} /></div>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <div className="font-display text-[32px] text-ink">{l.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-stone-500"><MapPin size={13} />{l.address}, {l.city}</div>
                    </div>
                    <span className="text-[13px] text-stone-500">{l.hours[0].days} · {l.hours[0].time}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* JOURNAL */}
      {S.journal && (
        <section className="py-24">
          <Container>
            <SectionHeading eyebrow="Journal" title="Education, not hype." action={<Link to="/journal" className="flex items-center gap-2 border-b border-ink/20 pb-1 text-sm hover:border-ink">All articles <ArrowRight size={14} /></Link>} />
            <div className="grid gap-8 md:grid-cols-3">
              {cms.posts.filter((p) => p.published).slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 0.08}>
                  <Link to={`/journal/${p.slug}`} className="group block">
                    <div className="aspect-[4/3] overflow-hidden rounded-[20px]"><Photo src={p.image} zoom className="h-full w-full" tone={i} /></div>
                    <div className="mt-5 text-[12px] uppercase tracking-[0.14em] text-bronze-600">{p.category} · {p.readMins} min read</div>
                    <div className="mt-2 font-display text-[26px] leading-tight text-ink transition-colors group-hover:text-stone-600">{p.title}</div>
                    <p className="mt-2 text-[14px] text-stone-500">{p.excerpt}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="pt-8"><BookingBand /></section>
    </>
  )
}

function ResultsSection({ pairs }: { pairs: ReturnType<typeof useDB>['photos'][] }) {
  const db = useDB()
  const [i, setI] = useState(0)
  const pair = pairs[i]
  const before = pair.find((p) => p.stage === 'Baseline') ?? pair[0]
  const after = pair.find((p) => p.stage !== 'Baseline') ?? pair[1]
  const t = db.treatments.find((x) => x.id === before.treatmentId)
  return (
    <section className="grain bg-ink py-24 text-ivory md:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow light>Real results</Eyebrow>
              <h2 className="font-display text-[46px] leading-[1.05] md:text-[58px]">Subtle change.<br /><em className="text-ivory/60">Remarkable</em> difference.</h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ivory/65">Published only with written patient consent. Drag the slider to compare.</p>
            </Reveal>
            <div className="mt-10 flex items-center gap-6">
              <AnimatePresence mode="wait">
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }}>
                  <div className="font-display text-[28px]">{t?.name}</div>
                  <div className="text-[13px] text-ivory/50">{t?.sessions} · {staffName(db, db.sessions.find((s) => s.patientId === before.patientId)?.practitionerId ?? 'st_carter')}</div>
                </motion.div>
              </AnimatePresence>
              <div className="ml-auto flex gap-2">
                <button onClick={() => setI((i - 1 + pairs.length) % pairs.length)} className="grid h-11 w-11 place-items-center rounded-full border border-ivory/20 transition hover:bg-ivory/10" aria-label="Previous"><ChevronLeft size={18} /></button>
                <button onClick={() => setI((i + 1) % pairs.length)} className="grid h-11 w-11 place-items-center rounded-full border border-ivory/20 transition hover:bg-ivory/10" aria-label="Next"><ChevronRight size={18} /></button>
              </div>
            </div>
            <Link to="/results" className="mt-8 inline-flex items-center gap-2 border-b border-ivory/30 pb-1 text-sm hover:border-ivory">View the gallery <ArrowRight size={14} /></Link>
          </div>
          <Reveal delay={0.1} className="lg:col-span-7">
            <BeforeAfter key={i} before={before.src} after={after.src} className="aspect-[4/3] rounded-[24px]" labels={['Before', `After · ${treatmentName(db, before.treatmentId)}`]} />
            <p className="mt-3 text-right text-[11.5px] text-ivory/40">Illustrative imagery in this demo. Individual results vary.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

function Testimonials() {
  const db = useDB()
  const list = db.testimonials.filter((t) => t.published)
  const [i, setI] = useState(0)
  const t = list[i % list.length]
  return (
    <section className="bg-cream py-24 md:py-32">
      <Container className="text-center">
        <Eyebrow>Kind words</Eyebrow>
        <div className="mx-auto flex justify-center gap-1">{Array.from({ length: 5 }).map((_, k) => <Star key={k} size={16} className={k < t.rating ? 'fill-bronze-500 text-bronze-500' : 'text-stone-300'} />)}</div>
        <div className="relative mx-auto mt-8 min-h-[220px] max-w-4xl md:min-h-[180px]">
          <AnimatePresence mode="wait">
            <motion.blockquote key={t.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.7, ease: EASE }}>
              <p className="text-balance font-display text-[28px] leading-[1.3] text-ink md:text-[38px]">“{t.text}”</p>
              <footer className="mt-7 text-[13.5px] text-stone-500">{t.name} · {treatmentName(db, t.treatmentId)} · via {t.source}</footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
        <div className="mt-8 flex justify-center gap-2">
          {list.map((x, k) => <button key={x.id} onClick={() => setI(k)} aria-label={`Review ${k + 1}`} className={cn('h-1.5 rounded-full transition-all duration-500', k === i % list.length ? 'w-8 bg-ink' : 'w-1.5 bg-stone-300 hover:bg-stone-400')} />)}
        </div>
        <Link to="/reviews" className="mt-10 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-ink">Read all reviews <ArrowRight size={14} /></Link>
      </Container>
    </section>
  )
}
