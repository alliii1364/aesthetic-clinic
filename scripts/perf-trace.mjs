// Breaks scroll time down by rendering-pipeline phase (style, layout, paint, raster, scripts...).
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4319'
const path = process.argv[2] ?? '/'
const browser = await chromium.launch({ args: process.env.GPU ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--use-angle=d3d11'] : [] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const cdp = await page.context().newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
await page.goto(BASE + path, { waitUntil: 'load' })
await page.waitForTimeout(2500)
const events = []
cdp.on('Tracing.dataCollected', (e) => events.push(...e.value))
await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.invalidationTracking', transferMode: 'ReportEvents' })
await page.evaluate(async () => {
  const max = document.documentElement.scrollHeight - innerHeight
  for (let i = 1; i <= 100; i++) { scrollTo(0, (max * i) / 100); await new Promise((r) => requestAnimationFrame(r)) }
})
const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r))
await cdp.send('Tracing.end')
await done
const main = events.find((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain')
const tid = main?.tid
const sums = {}
let layoutRoots = {}
for (const e of events) {
  if (e.ph !== 'X' || !e.dur || (tid && e.tid !== tid)) continue
  if (['UpdateLayoutTree', 'Layout', 'Paint', 'PrePaint', 'Layerize', 'Commit', 'FunctionCall', 'EvaluateScript', 'HitTest', 'ParseHTML', 'UpdateLayer', 'ScrollLayer', 'IntersectionObserverController::computeIntersections', 'RasterTask', 'Decode Image', 'ImageDecodeTask', 'TimerFire', 'FireAnimationFrame'].includes(e.name)) {
    sums[e.name] = (sums[e.name] ?? 0) + e.dur / 1000
  }
  if (e.name === 'Layout' && e.args?.beginData) { const n = e.args.beginData.dirtyObjects ?? 0; layoutRoots.count = (layoutRoots.count ?? 0) + 1; layoutRoots.dirty = (layoutRoots.dirty ?? 0) + n }
  if (e.name === 'UpdateLayoutTree' && e.args?.elementCount) { layoutRoots.styled = (layoutRoots.styled ?? 0) + e.args.elementCount }
}
// Why was layout / style invalidated, and on which elements?
const why = {}
for (const e of events) {
  if (e.name !== 'LayoutInvalidationTracking' && e.name !== 'StyleRecalcInvalidationTracking') continue
  const d = e.args?.data ?? {}
  const k = `${e.name.startsWith('Layout') ? 'LAYOUT' : 'style '} | ${d.reason ?? '?'} | ${d.nodeName ?? '?'}`
  why[k] = (why[k] ?? 0) + 1
}
console.table(Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => ({ invalidation: k, count: n })))
console.table(Object.entries(sums).sort((a, b) => b[1] - a[1]).map(([phase, ms]) => ({ phase, ms: Math.round(ms) })))
console.log('layouts:', layoutRoots.count, 'dirty objects total:', layoutRoots.dirty, '| elements restyled total:', layoutRoots.styled, '| DOM nodes:', await page.evaluate(() => document.getElementsByTagName('*').length))
await browser.close()
