// Regenerates the static panel posters for scene 41-perspectives:
//   public/lab/posters/<page>.<ko|en>.jpg   (640×360, i.e. the 1280×720 iframe at ½ scale)
//
// The scene keeps at most ONE live lab iframe (the focused panel); every other
// panel — including both sides of each crossfade — shows this poster. Each lab
// page is framed exactly like the scene frames it (1280×720 same-origin iframe
// inside a mounted scene, so the shared iframe localizer projects it to EN) and
// captured SETTLE ms after `load`, roughly the moment the old preloaded panels
// were on screen.
//
// Needs a running app (any `next dev` / `next start`):
//   node src/scenes/41-perspectives/make-posters.mjs [--base=http://localhost:3000] [--settle-ms=1800] [--app-settle-ms=7000]
// Re-run whenever a panel page in constants.ts (FIELD / DEV) changes.

import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../../..')
const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const BASE = String(args.get('base') ?? 'http://localhost:3000')
const SETTLE = Number(args.get('settle-ms') ?? 1800)
const APP_SETTLE = Number(args.get('app-settle-ms') ?? 7000)
const OUT = path.join(root, 'public/lab/posters')

// Single source of truth: the `file:` entries of FIELD / DEV in constants.ts.
const constants = await readFile(path.join(here, 'constants.ts'), 'utf8')
const FILES = [...constants.matchAll(/file:\s*'([^']+\.html)'/g)].map((m) => m[1])
if (!FILES.length) throw new Error('no panel files found in constants.ts')

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
for (const locale of ['ko', 'en']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 0.5 })
  await ctx.addInitScript((loc) => window.localStorage.setItem('pf-locale', loc), locale)
  const page = await ctx.newPage()
  // Park the host scene past its panel windows (f > .86) so it loads nothing itself.
  await page.goto(`${BASE}/s/perspectives?t=19.5`, { waitUntil: 'load' })
  await page.waitForSelector('canvas')
  await page.addStyleTag({ content: 'html, body, body * { visibility: hidden !important } #poster-cap { visibility: visible !important }' })
  for (const file of FILES) {
    // Mount the capture frame inside the scene subtree (the localized root), let the
    // localizer's MutationObserver attach to it, then navigate it.
    await page.evaluate(() => {
      document.getElementById('poster-cap')?.remove()
      const fr = document.createElement('iframe')
      fr.id = 'poster-cap'
      fr.setAttribute('scrolling', 'no')
      fr.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:720px;border:0;background:#070707;z-index:2147483647'
      document.querySelector('canvas').parentElement.appendChild(fr)
    })
    await page.waitForTimeout(50)
    await page.evaluate((src) => new Promise((resolve) => {
      const fr = document.getElementById('poster-cap')
      fr.addEventListener('load', () => resolve(), { once: true })
      fr.src = src
    }), file.startsWith('/') ? file : `/lab/${file}`)
    // Full app pages (x-* redirects to /s/<slug>: three.js) boot much slower than the
    // static lab HTML — give them longer to reach their hero frame. Hide the dev-only
    // Next.js indicator so dev-server captures match production.
    const app = await page.evaluate(() => {
      const doc = document.getElementById('poster-cap').contentDocument
      const isApp = !!doc?.querySelector('script[src*="/_next/"]')
      if (isApp) {
        const st = doc.createElement('style')
        st.textContent = 'nextjs-portal { display: none !important }'
        doc.head.appendChild(st)
      }
      return isApp
    })
    await page.waitForTimeout(app ? APP_SETTLE : SETTLE)
    const out = path.join(OUT, `${file.replace(/\.html$/, '')}.${locale}.jpg`)
    await page.screenshot({ path: out, type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1280, height: 720 } })
    console.log(`${locale} ${file} → ${path.relative(root, out)}`)
  }
  await ctx.close()
}
await browser.close()
