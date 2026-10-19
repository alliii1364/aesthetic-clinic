import type { Appointment, DB, ID } from './types'
import { addDays, startOfDay } from './format'

const HOURS: Record<string, [number, number]> = { loc_bh: [9, 19], loc_sm: [10, 19] }

// Index active appointments by practitioner + local day. Rebuilt only when the appointments
// array changes (Immer keeps the same reference otherwise), so lookups are O(1).
const indexCache = new WeakMap<Appointment[], Map<string, Appointment[]>>()
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
function bookingsFor(appts: Appointment[], practitionerId: ID, day: Date) {
  let idx = indexCache.get(appts)
  if (!idx) {
    idx = new Map()
    for (const a of appts) {
      if (a.status === 'Cancelled') continue
      const k = `${a.practitionerId}|${dayKey(new Date(a.start))}`
      const list = idx.get(k)
      if (list) list.push(a); else idx.set(k, [a])
    }
    indexCache.set(appts, idx)
  }
  return idx.get(`${practitionerId}|${dayKey(day)}`) ?? []
}

/** Open slots for a practitioner at a location on a given day, avoiding their existing bookings anywhere. */
export function slotsFor(db: DB, practitionerId: ID, locationId: ID, day: Date, duration: number): Date[] {
  const s = db.staff.find((x) => x.id === practitionerId)
  if (!s || !s.locationIds.includes(locationId)) return []
  if (!s.workingDays.includes(day.getDay())) return []
  const loc = db.locations.find((l) => l.id === locationId)
  if (!loc?.active) return []
  const booked = bookingsFor(db.appointments, practitionerId, day)
  // a practitioner works at one site per day
  if (booked.some((a) => a.locationId !== locationId)) return []
  const ranges = booked.map((a) => { const st = new Date(a.start).getTime(); return [st, st + a.duration * 60000] as const })
  const [open, close] = HOURS[locationId] ?? [9, 18]
  const out: Date[] = []
  const earliest = Date.now() + 2 * 3600000
  const base = startOfDay(day).getTime()
  for (let m = open * 60; m + duration <= close * 60; m += 30) {
    const start = new Date(base).setMinutes(m) // setMinutes keeps DST-transition days correct
    const end = start + duration * 60000
    if (start < earliest) continue
    if (!ranges.some(([as, ae]) => start < ae && end > as)) out.push(new Date(start))
  }
  return out
}

export function nextAvailable(db: DB, practitionerIds: ID[], locationIds: ID[], duration: number, days = 21) {
  for (let i = 0; i < days; i++) {
    const day = addDays(startOfDay(), i)
    for (const p of practitionerIds) for (const l of locationIds) {
      const s = slotsFor(db, p, l, day, duration)
      if (s.length) return { practitionerId: p, locationId: l, start: s[0] }
    }
  }
  return null
}
