import { Link, Navigate, useParams } from 'react-router-dom'
import { Star, MapPin, Award, ArrowRight } from 'lucide-react'
import { useDB, locationName } from '@/store/store'
import { Button, Photo, Reveal } from '@/ui/ui'
import { nextAvailable } from '@/lib/availability'
import { fmtTime } from '@/lib/format'
import { Container, Eyebrow, TreatmentCard, BookingBand } from './parts'

export function PractitionersPage() {
  const db = useDB()
  const team = db.staff.filter((s) => s.bookable && s.active)
  return (
    <>
      <section className="pb-16 pt-16 md:pt-24">
        <Container>
          <Reveal>
            <Eyebrow>Practitioners</Eyebrow>
            <h1 className="max-w-4xl text-balance font-display text-[56px] leading-[1] text-ink md:text-[84px]">Clinical expertise, an artist’s restraint.</h1>
            <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-stone-600">Our medical team brings together dermatology, nursing and advanced aesthetics — united by a commitment to natural, safe, beautifully planned results.</p>
          </Reveal>
        </Container>
      </section>
      <Container className="space-y-24">
        {team.map((p, i) => (
          <div key={p.id} className="grid items-center gap-10 md:grid-cols-12">
            <Reveal className={i % 2 ? 'md:order-2 md:col-span-5 md:col-start-8' : 'md:col-span-5'}>
              <Link to={`/practitioners/${p.id}`}><Photo src={p.avatar} reveal zoom className="aspect-[4/5] rounded-[28px]" tone={i} /></Link>
            </Reveal>
            <Reveal delay={0.1} className={i % 2 ? 'md:col-span-6' : 'md:col-span-6 md:col-start-7'}>
              <div className="text-[12px] uppercase tracking-[0.16em] text-bronze-600">{p.title}</div>
              <h2 className="mt-3 font-display text-[48px] leading-none text-ink md:text-[60px]">{p.name}</h2>
              <div className="mt-3 text-[14px] text-stone-500">{p.credentials} · {p.yearsExperience} years’ experience</div>
              <p className="mt-6 text-[16px] leading-[1.75] text-stone-600">{p.bio}</p>
              <div className="mt-6 flex flex-wrap gap-2">{p.specialties.map((s) => <span key={s} className="rounded-full border border-stone-200 px-3 py-1 text-[12.5px] text-stone-600">{s}</span>)}</div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={`/book?practitioner=${p.id}`}><Button>Book with {p.name.replace('Dr. ', 'Dr ').split(' ').slice(0, p.name.startsWith('Dr') ? 3 : 1).join(' ')}</Button></Link>
                <Link to={`/practitioners/${p.id}`}><Button variant="secondary">Full profile</Button></Link>
              </div>
            </Reveal>
          </div>
        ))}
      </Container>
      <section className="pt-28"><BookingBand /></section>
    </>
  )
}

export function PractitionerDetail() {
  const { id } = useParams()
  const db = useDB()
  const p = db.staff.find((s) => s.id === id && s.bookable)
  if (!p) return <Navigate to="/practitioners" replace />
  const treatments = db.treatments.filter((t) => t.active && t.practitionerIds.includes(p.id))
  const next = nextAvailable(db, [p.id], p.locationIds, 30, 14)
  const reviews = db.testimonials.filter((t) => t.published && treatments.some((x) => x.id === t.treatmentId)).slice(0, 2)
  return (
    <>
      <section className="pt-10 md:pt-16">
        <Container className="grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5"><Photo src={p.avatar} reveal className="aspect-[4/5] rounded-[28px]" /></Reveal>
          <div className="lg:col-span-6 lg:col-start-7">
            <Reveal>
              <Eyebrow>{p.title}</Eyebrow>
              <h1 className="font-display text-[60px] leading-[0.95] text-ink md:text-[84px]">{p.name}</h1>
              <div className="mt-5 flex flex-wrap items-center gap-5 text-[14px] text-stone-600">
                <span className="flex items-center gap-1.5"><Star size={14} className="fill-bronze-500 text-bronze-500" />{p.rating.toFixed(2)} patient rating</span>
                <span className="flex items-center gap-1.5"><Award size={14} />{p.credentials}</span>
                <span className="flex items-center gap-1.5"><MapPin size={14} />{p.locationIds.map((l) => locationName(db, l)).join(' · ')}</span>
              </div>
              <p className="mt-7 text-[17px] leading-[1.75] text-stone-600">{p.bio}</p>
              <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.14em] text-stone-400">Next available</div>
                    <div className="mt-1 text-[17px] text-ink">{next ? `${next.start.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${fmtTime(next.start)} · ${locationName(db, next.locationId)}` : 'Join the waitlist'}</div>
                  </div>
                  <Link to={`/book?practitioner=${p.id}`}><Button>Book now</Button></Link>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
      <section className="py-24">
        <Container>
          <h2 className="mb-10 font-display text-[40px] text-ink">Treatments with {p.name.split(' ')[p.name.startsWith('Dr') ? 2 : 0]}</h2>
          <div className="grid gap-6 md:grid-cols-3">{treatments.map((t, i) => <TreatmentCard key={t.id} t={t} index={i} />)}</div>
          {reviews.length > 0 && (
            <div className="mt-20 grid gap-6 md:grid-cols-2">
              {reviews.map((r) => (
                <Reveal key={r.id} className="rounded-3xl bg-cream p-8">
                  <p className="font-display text-[24px] leading-snug text-ink">“{r.text}”</p>
                  <div className="mt-4 text-[13px] text-stone-500">{r.name}</div>
                </Reveal>
              ))}
            </div>
          )}
          <Link to="/practitioners" className="mt-14 inline-flex items-center gap-2 text-sm text-stone-600 hover:text-ink">Meet the whole team <ArrowRight size={14} /></Link>
        </Container>
      </section>
    </>
  )
}
