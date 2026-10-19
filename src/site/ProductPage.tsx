import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Globe, CalendarDays, Users, Stethoscope, Camera, CreditCard, Package, BarChart3, Megaphone, ShieldCheck, Building2, FileSignature, Lock, KeyRound, History, Database, Layers } from 'lucide-react'
import { Button, Reveal, SplitText, Photo, EASE, cn } from '@/ui/ui'
import { PLANS, PLAN_FEATURES, FEATURE_LABEL, type Feature } from '@/lib/permissions'
import { IMG } from '@/lib/images'
import { Container, Eyebrow } from './parts'

const MODULES = [
  { icon: Globe, t: 'Website & CMS', d: 'A beautiful clinic website, driven by your live catalog, pricing and team.' },
  { icon: CalendarDays, t: 'Booking & calendar', d: 'Guided online booking, deposits and a drag-and-drop schedule by room and practitioner.' },
  { icon: Users, t: 'Patient & lead CRM', d: 'A 360° patient profile and a sales pipeline designed for aesthetic consultations.' },
  { icon: Stethoscope, t: 'Clinical records', d: 'EMR notes, injection mapping, lot tracking and treatment plans.' },
  { icon: Camera, t: 'Before & after', d: 'Consent-aware photo timelines with compare, slider and marketing approval.' },
  { icon: FileSignature, t: 'Forms & consents', d: 'Versioned digital consents with signature, device and PDF audit trail.' },
  { icon: CreditCard, t: 'POS & payments', d: 'Split payments, tips, refunds, deposits and credits — from any appointment.' },
  { icon: Package, t: 'Inventory & purchasing', d: 'Unit-level stock, expiry alerts, purchase orders and partial receiving.' },
  { icon: Megaphone, t: 'Marketing automation', d: 'Treatment journeys, win-backs, reviews and campaigns that rebook patients.' },
  { icon: BarChart3, t: 'Finance & reporting', d: 'Revenue, commissions, retention and lead ROI across every location.' },
  { icon: Building2, t: 'Multi-location', d: 'Location-specific pricing, staff, rooms and stock with combined owner reporting.' },
  { icon: ShieldCheck, t: 'Permissions & audit', d: 'Granular role-based access and a complete, tamper-evident audit log.' },
]

const FLOW = ['Lead captured', 'Consultation booked', 'Patient created', 'Treatment charted', 'Payment collected', 'Stock deducted', 'Commission recorded', 'Follow-up sent', 'Rebooked']

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-30 border-b border-stone-200/60 bg-ivory/[0.97]">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink font-display text-lg text-bronze-100">A</span><span className="text-[15px] font-medium tracking-tight">Aurelia OS</span></div>
          <nav className="hidden gap-7 text-[13.5px] text-stone-600 md:flex"><a href="#modules" className="hover:text-ink">Platform</a><a href="#flow" className="hover:text-ink">Workflows</a><a href="#security" className="hover:text-ink">Security</a><a href="#pricing" className="hover:text-ink">Pricing</a></nav>
          <div className="flex gap-2"><Link to="/app"><Button size="sm" variant="ghost">Sign in</Button></Link><Link to="/app"><Button size="sm">Open live demo</Button></Link></div>
        </Container>
      </header>

      <section className="relative overflow-hidden pb-20 pt-20 md:pt-28">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(168,100,42,0.12),transparent_65%)]" />
        <Container className="relative text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}><Eyebrow>For modern aesthetic clinics & medical spas</Eyebrow></motion.div>
          <h1 className="mx-auto max-w-5xl font-display text-[52px] leading-[0.98] tracking-[-0.02em] text-ink md:text-[96px]"><SplitText text="The operating system for modern aesthetic clinics." stagger={0.05} /></h1>
          <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.9, ease: EASE }} className="mx-auto mt-7 max-w-2xl text-[18px] leading-relaxed text-stone-600">Website, bookings, patients, treatments, payments and clinic operations — beautifully connected in one platform.</motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.9, ease: EASE }} className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/app"><Button size="lg">Explore the clinic dashboard <ArrowRight size={16} /></Button></Link>
            <Link to="/"><Button size="lg" variant="secondary">View a clinic website</Button></Link>
          </motion.div>
        </Container>
        <Container className="relative mt-20">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 1.2, ease: EASE }} className="grid gap-4 md:grid-cols-3">
            {[{ to: '/', l: 'Clinic website', img: IMG.hero, s: 'Patients discover & book' }, { to: '/app', l: 'Clinic dashboard', img: IMG.clinic, s: 'Teams run the clinic' }, { to: '/portal', l: 'Patient portal', img: IMG.skincare, s: 'Patients feel cared for' }].map((x, i) => (
              <Link key={x.l} to={x.to} className="group relative block overflow-hidden rounded-[24px]">
                <Photo src={x.img} zoom className="aspect-[4/3]" tone={i} />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <div className="absolute bottom-0 p-5 text-white"><div className="text-[12px] text-white/70">{x.s}</div><div className="font-display text-[28px]">{x.l}</div></div>
                <ArrowRight className="absolute right-5 top-5 text-white/80 transition-transform duration-500 group-hover:translate-x-1" size={18} />
              </Link>
            ))}
          </motion.div>
        </Container>
      </section>

      <section id="modules" className="py-24">
        <Container>
          <Reveal className="max-w-2xl"><Eyebrow>One platform</Eyebrow><h2 className="font-display text-[48px] leading-[1.02] text-ink md:text-[60px]">Everything a clinic runs on. Nothing it doesn’t need.</h2></Reveal>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[28px] border border-stone-200/80 bg-stone-200/80 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m, i) => (
              <Reveal key={m.t} delay={(i % 4) * 0.05} className="h-full bg-ivory p-7 transition-colors duration-500 hover:bg-white">
                <m.icon size={20} strokeWidth={1.4} className="text-bronze-500" />
                <div className="mt-5 text-[15.5px] font-medium text-ink">{m.t}</div>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-500">{m.d}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section id="flow" className="grain bg-ink py-24 text-ivory md:py-32">
        <Container>
          <Reveal className="max-w-2xl"><Eyebrow light>Connected by design</Eyebrow><h2 className="font-display text-[46px] leading-[1.02] md:text-[60px]">Every action moves the whole clinic forward.</h2><p className="mt-5 text-[16px] text-ivory/60">Complete a treatment and Aurelia OS signs the clinical record, deducts the exact units from the right lot, finalises the invoice, records commission and starts the follow-up journey — automatically.</p></Reveal>
          <div className="mt-16 flex flex-wrap items-center gap-3">
            {FLOW.map((f, i) => (
              <motion.div key={f} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.09, duration: 0.6, ease: EASE }} className="flex items-center gap-3">
                <span className={cn('rounded-full border px-4 py-2.5 text-[14px]', i === FLOW.length - 1 ? 'border-bronze-300 bg-bronze-500/20 text-bronze-100' : 'border-ivory/15 bg-ivory/5')}>{f}</span>
                {i < FLOW.length - 1 && <ArrowRight size={14} className="text-ivory/30" />}
              </motion.div>
            ))}
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[['Treatment created', 'Website page, booking option, pricing and practitioner assignment appear instantly.'], ['Price changed', 'Website, booking flow, POS and invoices update — with an audit entry for the change.'], ['Photo approved', 'Consent is checked before marketing-approved images reach the public gallery.']].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.08} className="rounded-[22px] border border-ivory/10 bg-ivory/[0.03] p-7"><div className="font-display text-[26px]">{t}</div><p className="mt-2 text-[14px] leading-relaxed text-ivory/60">{d}</p></Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section id="security" className="py-24">
        <Container className="grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-5"><Eyebrow>Security from day one</Eyebrow><h2 className="font-display text-[46px] leading-[1.02] text-ink">Built for clinical trust.</h2><p className="mt-5 text-[15.5px] leading-relaxed text-stone-600">Strict tenant isolation, encryption everywhere and role-based access designed around how clinics actually work. Sensitive clinical information is shown only to the people who need it.</p></Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {[[KeyRound, 'MFA & SSO', 'Enforced multi-factor auth; SAML SSO on Enterprise.'], [Lock, 'Encryption', 'AES-256 at rest, TLS 1.3 in transit, per-tenant keys.'], [Layers, 'Tenant isolation', 'Row-level security on every query, scoped by organization.'], [History, 'Audit log', 'Every clinical and financial change with old → new values.'], [FileSignature, 'Consent versioning', 'Signed versions preserved with device and IP metadata.'], [Database, 'Backups & retention', 'Point-in-time recovery; configurable retention policies.']].map(([I, t, d]) => {
              const Icon = I as typeof Lock
              return <Reveal key={t as string} className="rounded-2xl border border-stone-200 bg-white p-5"><Icon size={18} strokeWidth={1.5} className="text-bronze-500" /><div className="mt-3 text-[14.5px] font-medium text-ink">{t as string}</div><p className="mt-1 text-[13px] text-stone-500">{d as string}</p></Reveal>
            })}
          </div>
        </Container>
      </section>

      <section id="pricing" className="bg-cream py-24">
        <Container>
          <Reveal className="text-center"><Eyebrow>Pricing</Eyebrow><h2 className="font-display text-[48px] text-ink md:text-[60px]">Grows with your clinic.</h2></Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p, i) => (
              <Reveal key={p.tier} delay={i * 0.06}>
                <div className={cn('flex h-full flex-col rounded-[24px] p-7', p.tier === 'pro' ? 'bg-ink text-ivory shadow-lift' : 'border border-stone-200 bg-white')}>
                  <div className="flex items-center justify-between"><div className="font-display text-[30px]">{p.name}</div>{p.tier === 'pro' && <span className="rounded-full bg-bronze-500 px-2.5 py-0.5 text-[11px]">Popular</span>}</div>
                  <div className="mt-3">{p.price ? <><span className="font-display text-[44px]">${p.price.toLocaleString()}</span><span className={p.tier === 'pro' ? 'text-ivory/60' : 'text-stone-500'}> /mo</span></> : <span className="font-display text-[44px]">Custom</span>}</div>
                  <p className={cn('mt-2 text-[13.5px]', p.tier === 'pro' ? 'text-ivory/65' : 'text-stone-500')}>{p.blurb}</p>
                  <div className={cn('mt-1 text-[12px]', p.tier === 'pro' ? 'text-bronze-300' : 'text-bronze-600')}>{p.limits}</div>
                  <ul className="mt-6 flex-1 space-y-2.5 text-[13.5px]">
                    {(PLAN_FEATURES[p.tier] as Feature[]).filter((f) => i === 0 || !PLAN_FEATURES[PLANS[i - 1].tier].includes(f)).map((f) => <li key={f} className="flex gap-2.5"><Check size={15} className={cn('mt-0.5 shrink-0', p.tier === 'pro' ? 'text-bronze-300' : 'text-sage-500')} />{FEATURE_LABEL[f]}</li>)}
                    {i > 0 && <li className={cn('text-[12.5px]', p.tier === 'pro' ? 'text-ivory/50' : 'text-stone-400')}>Everything in {PLANS[i - 1].name}</li>}
                  </ul>
                  <Button variant={p.tier === 'pro' ? 'light' : 'secondary'} className="mt-7 w-full">{p.price ? 'Start 14-day trial' : 'Talk to sales'}</Button>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
      <footer className="py-10 text-center text-[12.5px] text-stone-400">© {new Date().getFullYear()} Aurelia OS · <Link to="/platform" className="hover:text-ink">Platform admin</Link></footer>
    </div>
  )
}
