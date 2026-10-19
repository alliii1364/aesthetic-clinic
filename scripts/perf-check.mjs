// 1) Is headless rendering GPU-accelerated?  2) Which image widths does each page actually request?
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4319'
const gpuArgs = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy', '--use-angle=d3d11']
for (const [label, args] of [['default headless', []], ['GPU flags', gpuArgs]]) {
  const b = await chromium.launch({ args })
  const p = await b.newPage()
  await p.goto(BASE + '/')
  const renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl' })
  console.log(`${label}: ${renderer}`)
  await b.close()
}
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
for (const path of ['/', '/treatments/botox']) {
  const widths = []
  const h = (r) => { const u = r.url(); if (u.includes('images.unsplash.com')) widths.push(Number(new URL(u).searchParams.get('w'))) }
  p.on('request', h)
  await p.goto(BASE + path, { waitUntil: 'load' })
  await p.evaluate(async () => { const max = document.documentElement.scrollHeight; for (let y = 0; y < max; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)) } })
  await p.waitForTimeout(1500)
  p.off('request', h)
  const counts = widths.reduce((a, w) => ({ ...a, [w]: (a[w] ?? 0) + 1 }), {})
  console.log(`${path}: ${widths.length} image requests by width →`, counts)
}
await b.close()
