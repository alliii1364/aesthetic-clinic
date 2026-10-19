import { useMemo, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { useDB, useCan, useMe, useVisibleLocations, patientName, treatmentName, staffName, locationName } from '@/store/store'
import type { AppointmentStatus } from '@/lib/types'
import { Button, Card, PageHeader, StatusBadge, Table, TD, TH, TR, Tabs, Input } from '@/ui/ui'
import { fmtDate, fmtTime, money, startOfDay, addDays } from '@/lib/format'
import { AppointmentDrawer } from './AppointmentDrawer'

const TABS = ['Upcoming', 'Today', 'Requested', 'Completed', 'Cancelled', 'No Show'] as const

export function exportCSV(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${name}.csv`; a.click()
}

export function AppointmentsList() {
  const db = useDB()
  const can = useCan()
  const me = useMe()
  const locs = useVisibleLocations()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Upcoming')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const ownOnly = !can('calendar.manage') && can('calendar.own')
  const list = useMemo(() => {
    const now = Date.now()
    return db.appointments.filter((a) => locs.includes(a.locationId) && (!ownOnly || a.practitionerId === me.id)).filter((a) => {
      const t = new Date(a.start).getTime()
      if (tab === 'Upcoming') return t > now && !['Cancelled', 'No Show', 'Completed'].includes(a.status)
      if (tab === 'Today') return t >= startOfDay().getTime() && t < addDays(startOfDay(), 1).getTime()
      return a.status === (tab as AppointmentStatus)
    }).filter((a) => !q || `${patientName(db, a.patientId)} ${treatmentName(db, a.treatmentId)}`.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (tab === 'Upcoming' || tab === 'Today' || tab === 'Requested' ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start))).slice(0, 150)
  }, [db, locs, tab, q, ownOnly, me.id])
  return (
    <div>
      <PageHeader title="Appointments" subtitle="Every booking across your permitted locations." actions={<Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => exportCSV('appointments', [['Date', 'Time', 'Patient', 'Treatment', 'Practitioner', 'Location', 'Status', 'Price'], ...list.map((a) => [fmtDate(a.start), fmtTime(a.start), patientName(db, a.patientId), treatmentName(db, a.treatmentId), staffName(db, a.practitionerId), locationName(db, a.locationId), a.status, a.price])])}>Export</Button>} />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <Tabs tabs={TABS} value={tab} onChange={setTab} id="appt-list" className="border-0" />
          <label className="relative w-full sm:w-64"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 pl-9" /></label>
        </div>
        <Table className="mt-2">
          <thead><tr><TH>Date</TH><TH>Patient</TH><TH>Treatment</TH><TH>Practitioner</TH><TH>Location</TH><TH>Status</TH><TH className="text-right">Price</TH></tr></thead>
          <tbody>
            {list.map((a) => (
              <TR key={a.id} onClick={() => setOpen(a.id)}>
                <TD className="whitespace-nowrap"><div className="text-ink">{fmtDate(a.start, { weekday: 'short', month: 'short', day: 'numeric' })}</div><div className="text-[12px] text-stone-400">{fmtTime(a.start)} · {a.duration}m</div></TD>
                <TD className="text-ink">{patientName(db, a.patientId)}</TD>
                <TD>{treatmentName(db, a.treatmentId)}</TD>
                <TD>{staffName(db, a.practitionerId)}</TD>
                <TD>{locationName(db, a.locationId)}</TD>
                <TD><StatusBadge status={a.status} /></TD>
                <TD className="text-right tabular-nums">{a.packageId ? 'Package' : money(a.price)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
        {!list.length && <p className="py-14 text-center text-sm text-stone-500">Nothing here.</p>}
      </Card>
      <AppointmentDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
