// Times the JS-side costs that run in the browser: seed generation, persistence, rehydrate, availability.
const mem: Record<string, string> = {}
;(globalThis as any).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] } }

async function main() {
  const t = (label: string, f: () => unknown, n = 1) => { const s = performance.now(); for (let i = 0; i < n; i++) f(); console.log(`${label.padEnd(44)} ${((performance.now() - s) / n).toFixed(1)} ms`) }
  const { buildSeed } = await import('../src/data/seed')
  t('buildSeed()', () => buildSeed(), 3)
  const { useStore } = await import('../src/store/store')
  const db = useStore.getState().db
  t('JSON.stringify(db) — runs on EVERY store set', () => JSON.stringify(db), 5)
  console.log(`persisted payload: ${(JSON.stringify(db).length / 1e6).toFixed(2)} MB`)
  const { freeze } = await import('immer')
  t('one-time idle deep freeze', () => freeze(useStore.getState(), true), 1)
  t('store set (toast)', () => useStore.getState().toast('x'), 5)
  t('store set (domain action: add note)', () => useStore.getState().addPatientNote('pt_emma', 'x'), 5)
  const raw = JSON.stringify({ state: { db } })
  t('JSON.parse(persisted) on return visit', () => JSON.parse(raw), 5)
  const { slotsFor, nextAvailable } = await import('../src/lib/availability')
  t('nextAvailable (home hero card)', () => nextAvailable(db, ['st_carter', 'st_mitchell', 'st_stone'], ['loc_bh', 'loc_sm'], 30, 7), 5)
  t('slotsFor x 14 days x 3 pracs (booking date step)', () => { for (let d = 0; d < 14; d++) for (const p of ['st_carter', 'st_mitchell', 'st_stone']) slotsFor(db, p, 'loc_bh', new Date(Date.now() + d * 864e5), 30) }, 5)
  process.exit(0)
}
main()
