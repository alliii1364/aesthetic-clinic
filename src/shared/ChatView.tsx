import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, Lock } from 'lucide-react'
import type { Thread } from '@/lib/types'
import { useDB, staffName } from '@/store/store'
import { Avatar, Badge, EASE, cn } from '@/ui/ui'
import { fmtTime, fmtDate, sameDay } from '@/lib/format'

/** Secure message thread, rendered from either side of the conversation. */
export function ChatView({ thread, side, onSend }: { thread: Thread; side: 'patient' | 'clinic'; onSend: (text: string) => void }) {
  const db = useDB()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread.messages.length])
  const patient = db.patients.find((p) => p.id === thread.patientId)
  const send = () => { if (!text.trim()) return; onSend(text.trim()); setText('') }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-stone-200/70 px-5 py-4">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-ink">{thread.subject}</div>
          <div className="text-[12px] text-stone-500">{side === 'clinic' ? `${patient?.firstName} ${patient?.lastName}` : 'Aurelia care team'}</div>
        </div>
        <Badge tone={thread.kind === 'Aftercare' ? 'sage' : thread.kind === 'Announcement' ? 'violet' : 'neutral'}>{thread.kind}</Badge>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {thread.messages.map((m, i) => {
          const mine = m.from === side
          const showDate = i === 0 || !sameDay(thread.messages[i - 1].at, m.at)
          const author = m.from === 'clinic' ? staffName(db, m.authorId ?? '') : `${patient?.firstName} ${patient?.lastName}`
          const avatar = m.from === 'clinic' ? db.staff.find((s) => s.id === m.authorId)?.avatar : patient?.avatar
          return (
            <div key={m.id}>
              {showDate && <div className="my-3 text-center text-[11px] uppercase tracking-[0.14em] text-stone-400">{fmtDate(m.at, { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className={cn('flex items-end gap-2.5', mine && 'flex-row-reverse')}>
                <Avatar name={author} src={avatar} size={28} />
                <div className={cn('max-w-[78%]', mine && 'text-right')}>
                  <div className={cn('inline-block whitespace-pre-line rounded-2xl px-4 py-2.5 text-left text-[14px] leading-relaxed', mine ? 'rounded-br-md bg-ink text-ivory' : 'rounded-bl-md bg-white text-ink shadow-soft')}>{m.text}</div>
                  <div className="mt-1 px-1 text-[11px] text-stone-400">{m.from === 'clinic' ? author.split(' ').slice(0, m.from === 'clinic' && author.startsWith('Dr') ? 3 : 1).join(' ') + ' · ' : ''}{fmtTime(m.at)}</div>
                </div>
              </motion.div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      {thread.kind !== 'Announcement' || side === 'clinic' ? (
        <div className="border-t border-stone-200/70 p-3">
          <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-white p-1.5 pl-4 focus-within:border-stone-400">
            <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder="Write a message…" className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[14px] outline-none placeholder:text-stone-400" />
            <AnimatePresence>
              <motion.button whileTap={{ scale: 0.9 }} onClick={send} disabled={!text.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-ivory transition disabled:opacity-30" aria-label="Send"><Send size={15} /></motion.button>
            </AnimatePresence>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 px-2 text-[11px] text-stone-400"><Lock size={10} />End-to-end encrypted · {side === 'patient' ? 'For urgent concerns please call the clinic' : 'Visible to the patient in their portal'}</div>
        </div>
      ) : <div className="border-t border-stone-200/70 p-4 text-center text-[12.5px] text-stone-400">Announcements are read-only</div>}
    </div>
  )
}
