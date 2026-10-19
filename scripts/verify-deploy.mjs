// Verifies a deployment in a real browser (passes Vercel's bot checkpoint, runs the app).
// Usage: node scripts/verify-deploy.mjs https://your-deployment.vercel.app
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'https://aesthetic-clinic-ivory.vercel.app'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })
// Give Vercel's security checkpoint (a JS challenge) time to clear on the first request.
await page.goto(BASE + '/', { timeout: 45000 }).catch(() => {})
await page.waitForFunction(() => document.title !== 'Vercel Security Checkpoint', null, { timeout: 120000 }).catch(() => console.log('checkpoint did not clear'))
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const checks = [
  ['/', 'Confidence'], ['/treatments/botox', 'Botox'], ['/book?treatment=botox', 'Who would you like to see'],
  ['/portal/appointments', 'Appointments'], ['/app/calendar', 'Calendar'], ['/app/patients/pt_emma', 'Emma'],
  ['/platform/clinics', 'Clinics'], ['/os', 'operating system'],
]
for (const [path, text] of checks) {
  const res = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 45000 })
  const ok = await page.getByText(text, { exact: false }).first().waitFor({ timeout: 20000 }).then(() => true, () => false)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${path.padEnd(26)} http ${res?.status()}  title="${await page.title()}"`)
}
console.log(errors.length ? `JS errors: ${errors.slice(0, 3).join(' | ')}` : 'No JS errors')
await browser.close()
