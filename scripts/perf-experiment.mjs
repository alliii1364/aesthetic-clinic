// Isolates which visual effects cost scroll performance by disabling them one at a time.
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4319'
const variants = {
  'as built': '',
  'no backdrop-filter': '*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  'no grain overlay': '.grain::after{display:none!important}',
  'no blur filters': '[class*="blur-"]{filter:none!important}',
  'no images': 'img{display:none!important}',
  'no animations': '*{animation:none!important;transition:none!important}',
  'all of the above': '*{backdrop-filter:none!important;animation:none!important;transition:none!important}.grain::after{display:none!important}[class*="blur-"]{filter:none!important}img{display:none!important}',
}
// GPU=1 uses the machine's real GPU (default headless rasterises in software via SwiftShader)
const browser = await chromium.launch({ args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--use-angle=d3d11'] : [] })
const rows = []
for (const [name, css] of Object.entries(variants)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto(BASE + '/', { waitUntil: 'load' })
  if (css) await page.addStyleTag({ content: css })
  await page.waitForTimeout(2500)
  const r = await page.evaluate(async () => {
    const frames = []; let last = performance.now(); let run = true
    const tick = (t) => { frames.push(t - last); last = t; if (run) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
    const max = document.documentElement.scrollHeight - innerHeight
    for (let i = 1; i <= 100; i++) { scrollTo(0, (max * i) / 100); await new Promise((r) => requestAnimationFrame(r)) }
    run = false
    const f = frames.slice(2); const avg = f.reduce((a, b) => a + b, 0) / f.length
    return { fps: Math.round(1000 / avg), worst: Math.round(Math.max(...f)) }
  })
  rows.push({ variant: name, ...r })
  await page.close()
}
console.table(rows)
await browser.close()
