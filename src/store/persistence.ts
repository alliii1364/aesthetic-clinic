import type { PersistStorage, StorageValue } from 'zustand/middleware'

/**
 * localStorage adapter that never serialises on the interaction path.
 * zustand's default JSON storage stringifies the whole (~2 MB) database synchronously on
 * every set() — a toast or a keystroke would cost a quarter second. Here writes are coalesced
 * and performed when the browser is idle, and flushed when the tab is hidden or closed.
 */
export function idleStorage<S>(delay = 800): PersistStorage<S> {
  let pending: { name: string; value: StorageValue<S> } | null = null
  let last: StorageValue<S> | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const hasWindow = typeof window !== 'undefined'
  const idle = (cb: () => void) => (hasWindow && 'requestIdleCallback' in window ? (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 0))

  const flush = () => {
    if (!pending) return
    const { name, value } = pending
    pending = null
    try { localStorage.setItem(name, JSON.stringify(value)) } catch { /* quota or private mode — keep running in memory */ }
  }
  if (hasWindow) {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
  }

  return {
    getItem: (name) => {
      try { const raw = localStorage.getItem(name); last = raw ? (JSON.parse(raw) as StorageValue<S>) : null; return last } catch { return null }
    },
    setItem: (name, value) => {
      // UI-only updates (toasts etc.) leave every persisted slice referentially identical — skip them.
      const state = value.state as Record<string, unknown>
      const prev = (pending?.value ?? last)?.state as Record<string, unknown> | undefined
      if (prev && Object.keys(state).every((k) => state[k] === prev[k])) return
      last = value
      pending = { name, value }
      clearTimeout(timer)
      timer = setTimeout(() => idle(flush), delay)
    },
    removeItem: (name) => { pending = null; try { localStorage.removeItem(name) } catch { /* ignore */ } },
  }
}

/** True when a saved workspace exists, so the (expensive) seed can be skipped on return visits. */
export const hasSavedState = (name: string) => { try { return typeof localStorage !== 'undefined' && !!localStorage.getItem(name) } catch { return false } }
