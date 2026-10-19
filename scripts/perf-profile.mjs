// CPU-profiles a home-page scroll and prints the hottest functions by self time.
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4320'
const path = process.argv[2] ?? '/'
const mode = process.argv[3] ?? 'scroll' // 'scroll' | 'load'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const cdp = await page.context().newCDPSession(page)
await page.goto(BASE + path, { waitUntil: 'load' })
await page.waitForTimeout(2500)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')
if (mode === 'load') {
  await page.reload({ waitUntil: 'load' }) // return visit: saved workspace present
  await page.waitForTimeout(3000)
} else {
  await page.evaluate(async () => {
    const max = document.documentElement.scrollHeight - innerHeight
    for (let i = 1; i <= 100; i++) { scrollTo(0, (max * i) / 100); await new Promise((r) => requestAnimationFrame(r)) }
    await new Promise((r) => setTimeout(r, 1500))
  })
}
const { profile } = await cdp.send('Profiler.stop')
const byId = new Map(profile.nodes.map((n) => [n.id, n]))
const self = new Map()
const dt = profile.timeDeltas
profile.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const key = `${f.functionName || '(anon)'}  ${(f.url.split('/').pop() || f.url).split('?')[0]}:${f.lineNumber + 1}`; self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0)) })
const total = [...self.values()].reduce((a, b) => a + b, 0)
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([fn, us]) => ({ fn, ms: Math.round(us / 1000), pct: `${((us / total) * 100).toFixed(1)}%` }))
console.log(`total sampled: ${Math.round(total / 1000)} ms`)
// Optional: show call stacks for a hot function, e.g. TRACE="get scrollLeft"
if (process.env.TRACE) {
  const parent = new Map(); profile.nodes.forEach((n) => (n.children ?? []).forEach((c) => parent.set(c, n.id)))
  const stacks = new Map()
  profile.nodes.filter((n) => n.callFrame.functionName === process.env.TRACE).forEach((n) => {
    const chain = []; let p = parent.get(n.id)
    while (p && chain.length < 8) { const f = byId.get(p).callFrame; chain.push(`${f.functionName || '(anon)'}@${(f.url.split('/').pop() || '').split('?')[0]}:${f.lineNumber + 1}`); p = parent.get(p) }
    const k = chain.join(' <- '); stacks.set(k, (stacks.get(k) ?? 0) + (n.hitCount ?? 0))
  })
  ;[...stacks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([k, v]) => console.log(`${v} hits: ${k}`))
}
console.table(rows)
await browser.close()
