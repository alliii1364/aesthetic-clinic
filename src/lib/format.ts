export const money = (n: number, cents = false) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(n)

export const compact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`

const d = (v: string | Date) => (typeof v === 'string' ? new Date(v) : v)

export const fmtDate = (v: string | Date, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  d(v).toLocaleDateString('en-US', opts)
export const fmtShort = (v: string | Date) => d(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
export const fmtDay = (v: string | Date) => d(v).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
export const fmtTime = (v: string | Date) => d(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const fmtDateTime = (v: string | Date) => `${fmtShort(v)}, ${fmtTime(v)}`

export const startOfDay = (v: string | Date = new Date()) => { const x = new Date(d(v)); x.setHours(0, 0, 0, 0); return x }
export const addDays = (v: string | Date, n: number) => { const x = new Date(d(v)); x.setDate(x.getDate() + n); return x }
export const addMinutes = (v: string | Date, n: number) => new Date(d(v).getTime() + n * 60000)
export const sameDay = (a: string | Date, b: string | Date) => startOfDay(a).getTime() === startOfDay(b).getTime()
export const startOfWeek = (v: string | Date) => { const x = startOfDay(v); const day = (x.getDay() + 6) % 7; return addDays(x, -day) }
export const daysBetween = (a: string | Date, b: string | Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000)

export const relative = (v: string | Date) => {
  const diff = (Date.now() - d(v).getTime()) / 1000
  const future = diff < 0
  const s = Math.abs(diff)
  if (s < 60) return 'just now'
  const [unit, val] = s < 3600 ? ['m', Math.floor(s / 60)] : s < 86400 ? ['h', Math.floor(s / 3600)] : ['d', Math.floor(s / 86400)]
  return future ? `in ${val}${unit}` : `${val}${unit} ago`
}

export const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000))
export const initials = (name: string) => name.replace(/^Dr\.?\s+/, '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

let counter = 0
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)
export const groupBy = <T,>(arr: T[], f: (x: T) => string) =>
  arr.reduce<Record<string, T[]>>((acc, x) => { (acc[f(x)] ||= []).push(x); return acc }, {})
