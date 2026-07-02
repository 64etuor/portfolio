// Render /resume in PRINT media → public/resume.pdf (Playwright/Chromium).
//   npm run gen:resume:pdf   (needs the app running: `npm run dev` or `npm start`)
//
// Why a static PDF: window.print() is a no-op in embedded WebKit (WKWebView,
// e.g. the cmux browser), so the résumé "Print" action opens this PDF instead —
// which prints/saves reliably in every browser. Regenerate whenever the résumé
// content changes (after `npm run gen:resume`).

import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const URL = process.env.RESUME_URL || 'http://localhost:3000/resume'
const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '../public/resume.pdf')

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.emulateMedia({ media: 'print' })
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
  })
  console.log(`✓ resume.pdf 생성: ${out}`)
} finally {
  await browser.close()
}
