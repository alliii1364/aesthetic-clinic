// Real-browser performance probe. Requires `npm run build` and a preview server:
//   npx vite preview --port 4319   then   node scripts/perf-browser.mjs [label]
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4319'
const label = process.argv[2] ?? 'run'
// GPU=1 uses the machine's real GPU (default headless rasterises in software via SwiftShader)
const browser = await chromium.launch({ args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--use-angle=d3d11'] : [] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const cdp = await page.context().newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }) // mid-range laptop

let imgBytes = 0
page.on('response', async (r) => { if (r.request().resourceType() === 'image') { const len = Number(r.headers()['content-length'] ?? 0); imgBytes += len } })

await page.addInitScript(() => {
  window.__long = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: 'longtask', buffered: true })
  window.__lcp = 0
  new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__lcp = e.startTime }).observe({ type: 'largest-contentful-paint', buffered: true })
})

async function scrollFps() {
  return page.evaluate(async () => {
    const frames = []
    let last = performance.now()
    let running = true
    const tick = (t) => { frames.push(t - last); last = t; if (running) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const max = document.documentElement.scrollHeight - innerHeight
    const steps = 120
    for (let i = 1; i <= steps; i++) { window.scrollTo(0, (max * i) / steps); await new Promise((r) => requestAnimationFrame(r)) }
    running = false
    const f = frames.slice(2)
    const avg = f.reduce((a, b) => a + b, 0) / f.length
    return { fps: Math.round(1000 / avg), jank: f.filter((x) => x > 50).length, worst: Math.round(Math.max(...f)) }
  })
}

const results = []
for (const [name, path] of [['home (first visit)', '/'], ['home (return visit)', '/'], ['treatments', '/treatments'], ['treatment detail', '/treatments/botox'], ['booking', '/book']]) {
  imgBytes = 0
  const t0 = Date.now()
  await page.goto(BASE + path, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const load = Date.now() - t0
  const { long, lcp } = await page.evaluate(() => ({ long: window.__long.reduce((a, b) => a + b, 0), lcp: window.__lcp }))
  const s = path === '/book' ? { fps: '-', jank: '-', worst: '-' } : await scrollFps()
  let interaction = '-'
  if (path === '/book') {
    const t = await page.evaluate(async () => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith('Wrinkles'))
      const s = performance.now(); btn.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - s)
    })
    interaction = `${t} ms to paint after click`
  }
  results.push({ page: name, 'load ms': load, 'LCP ms': Math.round(lcp), 'long tasks ms': Math.round(long), 'scroll fps': s.fps, 'janky frames': s.jank, 'worst frame ms': s.worst, 'images KB': Math.round(imgBytes / 1024), interaction })
}
console.log(`\n== ${label} (CPU 4x throttled) ==`)
console.table(results)
await browser.close()
