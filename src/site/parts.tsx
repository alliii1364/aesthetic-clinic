import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Treatment } from '@/lib/types'
import { money } from '@/lib/format'
import { Photo, Reveal, EASE, cn, Button } from '@/ui/ui'

export const Container = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('mx-auto max-w-[1320px] px-5 md:px-8', className)}>{children}</div>
)

export const Eyebrow = ({ children, light }: { children: ReactNode; light?: boolean }) => (
  <div className={cn('mb-4 flex items-center gap-3 text-[11.5px] font-medium uppercase tracking-[0.2em]', light ? 'text-ivory/60' : 'text-bronze-600')}>
    <span className={cn('h-px w-8', light ? 'bg-ivory/40' : 'bg-bronze-300')} />{children}
  </div>
)

export const SectionHeading = ({ eyebrow, title, sub, action, center }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; action?: ReactNode; center?: boolean }) => (
  <div className={cn('mb-12 flex flex-wrap items-end justify-between gap-6', center && 'flex-col items-center text-center')}>
    <Reveal className={cn('max-w-2xl', center && 'mx-auto')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="text-balance font-display text-[40px] font-normal leading-[1.05] tracking-tight text-ink md:text-[54px]">{title}</h2>
      {sub && <p className="mt-5 max-w-xl text-[15.5px] leading-relaxed text-stone-600">{sub}</p>}
    </Reveal>
    {action && <Reveal delay={0.1}>{action}</Reveal>}
  </div>
)

export const priceLabel = (t: Treatment, loc?: string) => {
  const p = (loc && t.locationPricing[loc]) || t.priceFrom
  return p === 0 ? 'Complimentary' : `From ${money(p)}`
}

// `filterable` enables layout animation (cards gliding into place when a filter changes). It is opt-in:
// layout projection measures the DOM and scroll offsets on every update, which is wasted work elsewhere.
export function TreatmentCard({ t, index = 0, tall, filterable }: { t: Treatment; index?: number; tall?: boolean; filterable?: boolean }) {
  const body = <TreatmentCardBody t={t} index={index} tall={tall} />
  if (!filterable) return <Reveal as="article" delay={(index % 3) * 0.08} className="group">{body}</Reveal>
  return (
    <motion.article layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.8, ease: EASE, delay: (index % 3) * 0.08 }} className="group">
      {body}
    </motion.article>
  )
}

function TreatmentCardBody({ t, index, tall }: { t: Treatment; index: number; tall?: boolean }) {
  return (
    <>
      <Link to={`/treatments/${t.slug}`} className="block">
        <div className={cn('relative overflow-hidden rounded-[22px]', tall ? 'aspect-[3/4]' : 'aspect-[4/5]')}>
          <Photo src={t.image} zoom className="absolute inset-0" tone={index} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-medium tracking-wide text-ink">{t.category}</span>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <div className="flex items-center gap-3 text-[12px] text-white/80">
              <span className="flex items-center gap-1"><Clock size={12} />{t.duration} min</span>
              <span className="h-1 w-1 rounded-full bg-white/50" />
              <span>{priceLabel(t)}</span>
            </div>
            <div className="mt-1.5 font-display text-[30px] leading-tight">{t.name}</div>
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-lux group-hover:grid-rows-[1fr]">
              <p className="overflow-hidden text-[13.5px] leading-relaxed text-white/85"><span className="block pt-2">{t.tagline}</span></p>
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-4 flex items-center justify-between">
        <p className="line-clamp-1 pr-4 text-[13.5px] text-stone-500">{t.downtime === 'None' ? 'No downtime' : t.downtime}</p>
        {t.onlineBookable ? (
          <Link to={`/book?treatment=${t.slug}`} className="group/b flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-ink">Book <ArrowRight size={14} className="transition-transform duration-500 ease-lux group-hover/b:translate-x-1" /></Link>
        ) : <span className="shrink-0 text-[12.5px] text-stone-400">By consultation</span>}
      </div>
    </>
  )
}

export function BookingBand() {
  return (
    <Container>
      <Reveal>
        <div className="grain relative overflow-hidden rounded-[32px] bg-ink px-8 py-16 text-center md:px-16 md:py-24">
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 bg-[radial-gradient(circle,rgba(168,100,42,0.32),transparent_68%)]" />
          <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 bg-[radial-gradient(circle,rgba(194,87,122,0.2),transparent_68%)]" />
          <Eyebrow light>Begin with a conversation</Eyebrow>
          <h2 className="mx-auto max-w-3xl text-balance font-display text-[44px] leading-[1.05] text-ivory md:text-[64px]">Your plan, considered from the very first visit.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] text-ivory/65">Complimentary consultations with our medical team. Book online in under two minutes.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/book"><Button variant="light" size="lg">Book Consultation</Button></Link>
            <Link to="/treatments"><Button size="lg" className="border border-ivory/20 bg-transparent hover:bg-ivory/10">Explore Treatments</Button></Link>
          </div>
        </div>
      </Reveal>
    </Container>
  )
}
