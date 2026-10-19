import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AnimatePresence, animate, motion, useInView, type HTMLMotionProps } from 'framer-motion'
import clsx from 'clsx'
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { initials } from '@/lib/format'
import { useStore } from '@/store/store'
import type { AppointmentStatus } from '@/lib/types'

export const cn = clsx
export const EASE = [0.22, 1, 0.36, 1] as const

// ── Buttons ────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'bronze' | 'light'
type BtnSize = 'xs' | 'sm' | 'md' | 'lg'
const btnBase = 'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap rounded-full transition-[background,box-shadow,color,border-color] duration-300 ease-lux disabled:opacity-40 disabled:pointer-events-none select-none'
const btnVariant: Record<BtnVariant, string> = {
  primary: 'bg-ink text-ivory hover:bg-ink-soft shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_18px_-8px_rgba(30,28,26,0.5)]',
  secondary: 'bg-white text-ink border border-stone-200 hover:border-stone-300 hover:shadow-soft',
  ghost: 'text-stone-600 hover:text-ink hover:bg-stone-200/40',
  subtle: 'bg-cream text-ink hover:bg-sand',
  danger: 'bg-rose-50 text-rose-700 hover:bg-rose-500 hover:text-white',
  bronze: 'bg-bronze-500 text-white hover:bg-bronze-600',
  light: 'bg-white/95 text-ink hover:bg-white',
}
const btnSize: Record<BtnSize, string> = { xs: 'h-7 px-3 text-xs', sm: 'h-8 px-3.5 text-[13px]', md: 'h-10 px-5 text-sm', lg: 'h-12 px-7 text-[15px]' }

export const Button = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'> & { variant?: BtnVariant; size?: BtnSize; icon?: ReactNode }>(
  ({ variant = 'primary', size = 'md', icon, className, children, ...rest }, ref) => (
    <motion.button ref={ref} whileTap={{ scale: 0.975 }} className={cn(btnBase, btnVariant[variant], btnSize[size], className)} {...rest}>
      {icon}
      {children as ReactNode}
    </motion.button>
  ),
)
Button.displayName = 'Button'

export const IconButton = ({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <button aria-label={label} title={label} className={cn('grid h-9 w-9 place-items-center rounded-full text-stone-500 transition-colors duration-300 hover:bg-stone-200/50 hover:text-ink', className)} {...rest}>
    {children}
  </button>
)

// ── Surfaces ───────────────────────────────────────────────────────────────
export const Card = ({ className, children, hover, ...rest }: HTMLMotionProps<'div'> & { hover?: boolean }) => (
  <motion.div
    className={cn('rounded-2xl border border-stone-200/70 bg-white shadow-soft', hover && 'transition-shadow duration-500 ease-lux hover:shadow-lift', className)}
    {...rest}
  >
    {children}
  </motion.div>
)

export const CardHeader = ({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) => (
  <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
    <div className="min-w-0">
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[13px] text-stone-500">{subtitle}</p>}
    </div>
    {action}
  </div>
)

export const PageHeader = ({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) => (
  <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div>
      {eyebrow && <div className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-bronze-600">{eyebrow}</div>}
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="font-display text-[34px] font-medium leading-none tracking-tight text-ink">
        {title}
      </motion.h1>
      {subtitle && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1, duration: 0.6 }} className="mt-2 text-sm text-stone-500">{subtitle}</motion.p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

// ── Badges ─────────────────────────────────────────────────────────────────
export type Tone = 'neutral' | 'bronze' | 'sage' | 'rose' | 'amber' | 'slate' | 'violet' | 'ink'
const toneCls: Record<Tone, string> = {
  neutral: 'bg-stone-200/50 text-stone-600', bronze: 'bg-bronze-50 text-bronze-700', sage: 'bg-sage-50 text-sage-700',
  rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-500', slate: 'bg-slate-50 text-slate-500', violet: 'bg-violet-50 text-violet-500', ink: 'bg-ink text-ivory',
}
export const Badge = ({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-medium', toneCls[tone], className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
    {children}
  </span>
)

export const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  Requested: 'amber', Confirmed: 'slate', 'Checked In': 'violet', 'In Treatment': 'bronze', Completed: 'sage', Cancelled: 'neutral', 'No Show': 'rose',
}
export const STATUS_BAR: Record<AppointmentStatus, string> = {
  Requested: '#B7802A', Confirmed: '#2E7CC0', 'Checked In': '#6A4FA8', 'In Treatment': '#A8642A', Completed: '#4E7A61', Cancelled: '#B3AA9D', 'No Show': '#B4524A',
}
export const StatusBadge = ({ status }: { status: AppointmentStatus }) => <Badge tone={STATUS_TONE[status]} dot>{status}</Badge>

// ── Media ──────────────────────────────────────────────────────────────────
export const Avatar = ({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) => {
  const [err, setErr] = useState(false)
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sand to-bronze-100 font-medium text-bronze-700 ring-2 ring-white', className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src && !err ? <img src={src.replace(/([?&])w=\d+/, `$1w=${Math.max(96, size * 2)}`)} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} className="h-full w-full object-cover" /> : initials(name)}
    </span>
  )
}

// Unsplash serves any width on request — build a srcset so the browser downloads and decodes
// an image sized for its slot instead of a 1600–2000px original for a 300px thumbnail.
const WIDTHS = [320, 480, 800, 1200, 1600, 2000]
function responsive(src: string) {
  if (!src.includes('images.unsplash.com')) return { src }
  const at = (w: number) => src.replace(/([?&])w=\d+/, `$1w=${w}`).replace(/([?&])q=\d+/, '$1q=72')
  return { src: at(800), srcSet: WIDTHS.map((w) => `${at(w)} ${w}w`).join(', ') }
}

/** Photography with a tasteful tonal fallback, an optional mask reveal and slow hover zoom. */
export const Photo = ({ src, alt = '', className, reveal, zoom, tone = 0, style, imgClassName, sizes = '(min-width: 1024px) 50vw, 100vw', priority }: { src: string; alt?: string; className?: string; reveal?: boolean; zoom?: boolean; tone?: number; style?: React.CSSProperties; imgClassName?: string; sizes?: string; priority?: boolean }) => {
  const [err, setErr] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const gradients = ['from-[#E9DED0] via-[#D9C4AE] to-[#B99878]', 'from-[#EDE6DD] via-[#D6CBBE] to-[#A99C8D]', 'from-[#F0E4DA] via-[#E2C6B4] to-[#C79E86]']
  const img = responsive(src)
  const common = {
    // "auto" lets lazy images pick a width from their rendered box (thumbnails stay tiny); browsers
    // without support skip it and use the fallback list. Not valid for eager images.
    ...img, sizes: img.srcSet ? (priority ? sizes : `auto, ${sizes}`) : undefined, alt, decoding: 'async' as const, loading: priority ? ('eager' as const) : ('lazy' as const),
    onError: () => setErr(true), onLoad: () => setLoaded(true),
    ...(priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {}), // lowercase: React 18 passes it through as an HTML attribute
  }
  return (
    // Only reveal photos need an in-view observer; plain ones skip it (fewer intersection checks per scroll frame).
    <div ref={reveal ? ref : undefined} className={cn('group relative overflow-hidden bg-gradient-to-br', gradients[tone % 3], className)} style={style}>
      {!err && (reveal ? (
        <motion.img
          {...common}
          initial={{ scale: 1.12, opacity: 0 }}
          animate={inView && loaded ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.6, ease: EASE }}
          className={cn('h-full w-full object-cover', zoom && 'transition-transform duration-[1400ms] ease-lux group-hover:scale-[1.04]', imgClassName)}
        />
      ) : (
        // Plain <img> + CSS fade: no animation engine per image.
        <img {...common} className={cn('h-full w-full object-cover transition-[opacity,transform] duration-700 ease-lux', loaded ? 'opacity-100' : 'opacity-0', zoom && 'duration-[1400ms] group-hover:scale-[1.04]', imgClassName)} />
      ))}
      {reveal && (
        <motion.div initial={{ scaleY: 1 }} animate={inView ? { scaleY: 0 } : {}} transition={{ duration: 1.1, ease: EASE, delay: 0.1 }} style={{ originY: 0 }} className="absolute inset-0 bg-ivory" />
      )}
      {err && <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_60%)]" />}
    </div>
  )
}

// ── Motion helpers ─────────────────────────────────────────────────────────
// One IntersectionObserver shared by every scroll reveal on the page (instead of one per element).
let revealObserver: IntersectionObserver | null = null
const revealCallbacks = new WeakMap<Element, () => void>()
export function observeOnce(el: Element, onEnter: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') { onEnter(); return () => {} }
  revealObserver ||= new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      revealCallbacks.get(e.target)?.()
      revealCallbacks.delete(e.target)
      revealObserver!.unobserve(e.target)
    }
  }, { rootMargin: '0px 0px -60px 0px' })
  revealCallbacks.set(el, onEnter)
  revealObserver.observe(el)
  return () => { revealCallbacks.delete(el); revealObserver?.unobserve(el) }
}

/**
 * Fade-up on scroll. Runs as a CSS transition toggled by a class (see `.reveal` in index.css):
 * the compositor animates it, so dozens of reveals cost no JavaScript per frame and no React renders.
 */
export const Reveal = ({ children, delay = 0, y = 24, className, as: Tag = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'article' | 'section' }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => (ref.current ? observeOnce(ref.current, () => ref.current?.classList.add('is-in')) : undefined), [])
  return (
    <Tag ref={ref} className={cn('reveal', className)} style={{ '--reveal-y': `${y}px`, transitionDelay: delay ? `${delay}s` : undefined } as React.CSSProperties}>
      {children}
    </Tag>
  )
}

export const SplitText = ({ text, className, delay = 0, stagger = 0.06 }: { text: string; className?: string; delay?: number; stagger?: number }) => (
  <span className={className} aria-label={text}>
    {text.split(' ').map((w, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
        <motion.span className="inline-block" initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: delay + i * stagger }}>
          {w}{i < text.split(' ').length - 1 ? ' ' : ''}
        </motion.span>
      </span>
    ))}
  </span>
)

export const CountUp = ({ value, format = (n: number) => Math.round(n).toLocaleString(), duration = 1.4, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) => {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const prev = useRef(0)
  useEffect(() => {
    if (!inView || !ref.current) return
    const ctrl = animate(prev.current, value, { duration, ease: EASE, onUpdate: (v) => { if (ref.current) ref.current.textContent = format(v) } })
    prev.current = value
    return () => ctrl.stop()
  }, [inView, value]) // eslint-disable-line react-hooks/exhaustive-deps
  // The invisible final value reserves the width; the ticking number is absolutely positioned, so
  // per-frame text changes re-lay out only that box instead of its whole ancestor chain.
  return (
    <span className={cn('relative inline-block tabular-nums', className)} style={{ contain: 'layout' }}>
      <span className="invisible" aria-hidden>{format(value)}</span>
      <span ref={ref} className="absolute inset-0 whitespace-nowrap" aria-label={format(value)}>{format(0)}</span>
    </span>
  )
}

// ── Overlays ───────────────────────────────────────────────────────────────
export const Drawer = ({ open, onClose, children, width = 520, title, subtitle, actions }: { open: boolean; onClose: () => void; children: ReactNode; width?: number; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 bg-ink/30" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.55, ease: EASE }}
            className="absolute right-0 top-0 flex h-full max-w-full flex-col bg-ivory shadow-drawer" style={{ width }}
            role="dialog" aria-modal
          >
            {(title || actions) && (
              <div className="flex items-start justify-between gap-3 border-b border-stone-200/70 px-6 py-5">
                <div className="min-w-0">
                  <div className="font-display text-2xl font-medium leading-tight text-ink">{title}</div>
                  {subtitle && <div className="mt-1 text-[13px] text-stone-500">{subtitle}</div>}
                </div>
                <div className="flex items-center gap-1">{actions}<IconButton label="Close" onClick={onClose}><X size={18} /></IconButton></div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

export const Modal = ({ open, onClose, children, title, subtitle, width = 520, footer }: { open: boolean; onClose: () => void; children: ReactNode; title?: ReactNode; subtitle?: ReactNode; width?: number; footer?: ReactNode }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-ink/30" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} transition={{ duration: 0.45, ease: EASE }}
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl bg-ivory shadow-lift" style={{ maxWidth: width }} role="dialog" aria-modal
          >
            {title && (
              <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6">
                <div>
                  <div className="font-display text-2xl font-medium text-ink">{title}</div>
                  {subtitle && <div className="mt-1 text-[13px] text-stone-500">{subtitle}</div>}
                </div>
                <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
              </div>
            )}
            <div className="overflow-y-auto px-6 py-4">{children}</div>
            {footer && <div className="flex items-center justify-end gap-2 border-t border-stone-200/70 bg-white/50 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const Toaster = () => {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  const icon = { default: <Info size={16} className="text-stone-500" />, success: <CheckCircle2 size={16} className="text-sage-500" />, warning: <AlertTriangle size={16} className="text-amber-500" />, danger: <XCircle size={16} className="text-rose-500" /> }
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.4, ease: EASE }}
            className="pointer-events-auto flex gap-3 rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-lift" role="status">
            <div className="mt-0.5">{icon[t.tone]}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink">{t.title}</div>
              {t.body && <div className="mt-0.5 text-[13px] leading-snug text-stone-500">{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-stone-400 hover:text-ink" aria-label="Dismiss"><X size={14} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

// ── Navigation primitives ──────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange, className, id = 'tabs', counts }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; className?: string; id?: string; counts?: Partial<Record<T, number>> }) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-stone-200/80', className)} role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} onClick={() => onChange(t)} className={cn('relative whitespace-nowrap px-3 pb-3 pt-1 text-[13.5px] transition-colors duration-300', value === t ? 'text-ink' : 'text-stone-500 hover:text-ink')}>
          {t}
          {counts?.[t] !== undefined && <span className="ml-1.5 rounded-full bg-stone-200/60 px-1.5 text-[11px] text-stone-600">{counts[t]}</span>}
          {value === t && <motion.span layoutId={`${id}-underline`} className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-ink" transition={{ duration: 0.45, ease: EASE }} />}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, id = 'seg', size = 'md' }: { options: readonly T[]; value: T; onChange: (v: T) => void; id?: string; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-full bg-stone-200/50 p-1">
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cn('relative rounded-full font-medium transition-colors duration-300', size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-[13px]', value === o ? 'text-ink' : 'text-stone-500 hover:text-ink')}>
          {value === o && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-full bg-white shadow-soft" transition={{ duration: 0.4, ease: EASE }} />}
          <span className="relative">{o}</span>
        </button>
      ))}
    </div>
  )
}

// ── Form controls ──────────────────────────────────────────────────────────
const fieldCls = 'w-full rounded-xl border border-stone-200 bg-white px-3.5 text-sm text-ink placeholder:text-stone-400 outline-none transition-[border-color,box-shadow] duration-300 focus:border-stone-400 focus:ring-4 focus:ring-stone-200/60'
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cn(fieldCls, 'h-10', className)} {...p} />)
Input.displayName = 'Input'
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(fieldCls, 'min-h-[88px] py-2.5 leading-relaxed', className)} {...p} />
export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn(fieldCls, 'h-10 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%238C847A%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[right_12px_center] bg-no-repeat pr-9', className)} {...p}>{children}</select>
)
export const Field = ({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) => (
  <label className={cn('block', className)}>
    <span className="mb-1.5 block text-[12.5px] font-medium text-stone-600">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
  </label>
)
export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-ink' : 'bg-stone-300')}>
    <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 34 }} className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow', checked ? 'right-1' : 'left-1')} />
  </button>
)

// ── Data display ───────────────────────────────────────────────────────────
export const Progress = ({ value, max = 1, className, color = '#1E1C1A' }: { value: number; max?: number; className?: string; color?: string }) => (
  <div className={cn('h-1.5 overflow-hidden rounded-full bg-stone-200/70', className)}>
    {/* translateX inside the clipped track (compositor) rather than animating width (layout every frame) */}
    <motion.div initial={{ x: '-100%' }} whileInView={{ x: `${Math.min(100, (value / max) * 100) - 100}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} className="h-full w-full rounded-full" style={{ background: color }} />
  </div>
)

export const Ring = ({ value, size = 64, stroke = 6, color = '#A8642A', label, sub }: { value: number; size?: number; stroke?: number; color?: string; label?: ReactNode; sub?: ReactNode }) => {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E4DED5" strokeWidth={stroke} fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - Math.min(1, value)) }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }} />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="text-sm font-medium tabular-nums text-ink">{label}</div>
        {sub && <div className="text-[10px] text-stone-500">{sub}</div>}
      </div>
    </div>
  )
}

export const Stat = ({ label, value, format, delta, icon, hint, index = 0 }: { label: string; value: number; format?: (n: number) => string; delta?: number; icon?: ReactNode; hint?: string; index?: number }) => (
  <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: index * 0.05 }} hover className="p-5">
    <div className="flex items-center justify-between text-[12.5px] text-stone-500">
      <span>{label}</span>
      <span className="text-stone-400">{icon}</span>
    </div>
    <div className="mt-3 font-display text-[32px] font-medium leading-none text-ink"><CountUp value={value} format={format} /></div>
    <div className="mt-2.5 flex items-center gap-2 text-xs">
      {delta !== undefined && <span className={cn('font-medium', delta >= 0 ? 'text-sage-500' : 'text-rose-500')}>{delta >= 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(0)}%</span>}
      {hint && <span className="text-stone-400">{hint}</span>}
    </div>
  </Card>
)

export const Empty = ({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
    {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cream text-stone-500">{icon}</div>}
    <div className="font-display text-xl text-ink">{title}</div>
    {body && <p className="mt-1 max-w-sm text-sm text-stone-500">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="rounded-md border border-stone-200 bg-white px-1.5 py-0.5 font-sans text-[10.5px] text-stone-500 shadow-[0_1px_0_#E4DED5]">{children}</kbd>

export const Table = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('overflow-x-auto', className)}><table className="w-full text-left text-[13.5px]">{children}</table></div>
)
export const TH = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cn('whitespace-nowrap border-b border-stone-200/80 px-4 py-3 text-[11.5px] font-medium uppercase tracking-[0.08em] text-stone-400', className)}>{children}</th>
export const TD = ({ children, className, ...rest }: { children?: ReactNode; className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('border-b border-stone-200/50 px-4 py-3.5 text-stone-700', className)} {...rest}>{children}</td>
export const TR = ({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) => (
  <tr onClick={onClick} className={cn('transition-colors duration-200', onClick && 'cursor-pointer hover:bg-cream/60', className)}>{children}</tr>
)

export const KV = ({ k, v, className }: { k: ReactNode; v: ReactNode; className?: string }) => (
  <div className={cn('flex items-baseline justify-between gap-4 py-2 text-[13.5px]', className)}>
    <span className="text-stone-500">{k}</span>
    <span className="text-right text-ink">{v}</span>
  </div>
)

export const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn('mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400', className)}>{children}</div>

// ── Before/after comparison slider ─────────────────────────────────────────
export const BeforeAfter = ({ before, after, className, labels = ['Before', 'After'], illustrative = true }: { before: string; after: string; className?: string; labels?: [string, string]; illustrative?: boolean }) => {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const move = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)))
  }
  return (
    <div ref={ref} className={cn('relative select-none overflow-hidden', className)}
      onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); move(e.clientX) }}
      onPointerMove={(e) => drag.current && move(e.clientX)} onPointerUp={() => { drag.current = false }}
      style={{ touchAction: 'pan-y', cursor: 'ew-resize' }}>
      <Photo src={after} className="absolute inset-0" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Photo src={before} className="absolute inset-0" imgClassName={illustrative ? 'saturate-[0.7] contrast-[0.92] brightness-[0.96] sepia-[0.12]' : ''} />
      </div>
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/95 shadow" />
        <div className="absolute top-1/2 -ml-5 -mt-5 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow-lift">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m9 6-6 6 6 6M15 6l6 6-6 6" /></svg>
        </div>
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-ink">{labels[0]}</span>
      <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-2.5 py-1 text-[11px] font-medium text-white">{labels[1]}</span>
    </div>
  )
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-xl bg-stone-200/60', className)} />
