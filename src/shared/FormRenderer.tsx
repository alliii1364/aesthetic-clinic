import { useEffect, useRef, useState } from 'react'
import type { FormTemplate } from '@/lib/types'
import { Input, Textarea, Select, cn } from '@/ui/ui'
import { RotateCcw } from 'lucide-react'

export type Answers = Record<string, string | boolean>

export function SignaturePad({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [signed, setSigned] = useState(!!value)
  useEffect(() => {
    const c = ref.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E1C1A'
  }, [])
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  return (
    <div>
      <div className="relative rounded-2xl border border-dashed border-stone-300 bg-white">
        <canvas ref={ref} className="h-32 w-full touch-none" aria-label="Signature area"
          onPointerDown={(e) => { drawing.current = true; const ctx = ref.current!.getContext('2d')!; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y) }}
          onPointerMove={(e) => { if (!drawing.current) return; const ctx = ref.current!.getContext('2d')!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke() }}
          onPointerUp={() => { drawing.current = false; setSigned(true); onChange(ref.current!.toDataURL('image/png').slice(0, 64)) }} />
        {!signed && <span className="pointer-events-none absolute inset-0 grid place-items-center text-[13px] text-stone-400">Sign here with your finger or mouse</span>}
        <span className="pointer-events-none absolute bottom-3 left-4 right-4 border-b border-stone-200" />
      </div>
      {signed && <button type="button" onClick={() => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setSigned(false); onChange('') }} className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-ink"><RotateCcw size={12} />Clear signature</button>}
    </div>
  )
}

export const isComplete = (form: FormTemplate, a: Answers) =>
  form.fields.filter((f) => f.required && f.type !== 'section').every((f) => (f.type === 'yesno' ? typeof a[f.id] === 'boolean' : !!a[f.id]))

export function FormRenderer({ form, answers, onChange, disabled }: { form: FormTemplate; answers: Answers; onChange: (a: Answers) => void; disabled?: boolean }) {
  const set = (id: string, v: string | boolean) => onChange({ ...answers, [id]: v })
  return (
    <div className="space-y-6">
      {form.fields.map((f) => {
        if (f.type === 'section') return <div key={f.id} className="border-b border-stone-200 pb-2 pt-2 font-display text-[22px] text-ink">{f.label}</div>
        const label = <div className="mb-2 text-[14px] text-ink">{f.label}{f.required && <span className="ml-1 text-bronze-500">*</span>}</div>
        return (
          <fieldset key={f.id} disabled={disabled}>
            {label}
            {f.type === 'text' && <Input value={String(answers[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} />}
            {f.type === 'textarea' && <Textarea value={String(answers[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} />}
            {f.type === 'date' && <Input type="date" value={String(answers[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)} />}
            {f.type === 'select' && <Select value={String(answers[f.id] ?? '')} onChange={(e) => set(f.id, e.target.value)}><option value="">Select…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</Select>}
            {f.type === 'yesno' && (
              <div className="flex gap-2">{[['No', false], ['Yes', true]].map(([l, v]) => <button type="button" key={String(l)} onClick={() => set(f.id, v as boolean)} className={cn('rounded-full border px-5 py-2 text-[13.5px] transition', answers[f.id] === v ? 'border-ink bg-ink text-ivory' : 'border-stone-200 bg-white hover:border-stone-300')}>{l as string}</button>)}</div>
            )}
            {f.type === 'radio' && (
              <div className="space-y-2">{f.options?.map((o) => (
                <label key={o} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px] transition', answers[f.id] === o ? 'border-ink bg-white' : 'border-stone-200 bg-white/60 hover:bg-white')}>
                  <span className={cn('grid h-4 w-4 place-items-center rounded-full border', answers[f.id] === o ? 'border-ink' : 'border-stone-300')}>{answers[f.id] === o && <span className="h-2 w-2 rounded-full bg-ink" />}</span>
                  <input type="radio" className="sr-only" checked={answers[f.id] === o} onChange={() => set(f.id, o)} />{o}
                </label>
              ))}</div>
            )}
            {f.type === 'checkbox' && (
              <div className="space-y-2">{f.options?.map((o) => {
                const list = String(answers[f.id] ?? '').split('|').filter(Boolean)
                const on = list.includes(o) || (f.options!.length === 1 && answers[f.id] === true)
                return (
                  <label key={o} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[14px] transition', on ? 'border-ink bg-white' : 'border-stone-200 bg-white/60 hover:bg-white')}>
                    <span className={cn('grid h-4 w-4 place-items-center rounded border', on ? 'border-ink bg-ink text-ivory' : 'border-stone-300')}>{on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l5 5L20 7" /></svg>}</span>
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => set(f.id, f.options!.length === 1 ? !on : (on ? list.filter((x) => x !== o) : [...list, o]).join('|'))} />{o}
                  </label>
                )
              })}</div>
            )}
            {f.type === 'signature' && <SignaturePad value={String(answers[f.id] ?? '')} onChange={(v) => set(f.id, v)} />}
            {f.help && <p className="mt-1.5 text-[12px] text-stone-400">{f.help}</p>}
          </fieldset>
        )
      })}
    </div>
  )
}
