import { test, expect } from '@playwright/test'

test('Korean locale preserves intentional English brand and navigation copy', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible()
  // Hero copy is painted on aria-hidden canvases; the accessible name lives in the sr-only <h1>.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('YANGHA PARK')
})

test('language choice persists and updates shared gallery content', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('i18n-test-initialized')) return
    localStorage.removeItem('pf-locale')
    sessionStorage.setItem('i18n-test-initialized', 'true')
  })
  await page.goto('/scenes', { waitUntil: 'domcontentloaded' })
  // The switcher is server-rendered; wait for the provider's client effect so
  // this test exercises an attached React handler rather than inert HTML.
  await page.waitForFunction(() => localStorage.getItem('pf-locale') === 'ko')

  await expect(page.getByRole('heading', { name: 'Scenes · 필름 서사' })).toBeVisible()
  const englishButton = page.getByRole('button', { name: '영어' })
  await expect(englishButton).toHaveCSS('min-width', '46px')
  await expect(englishButton).toHaveCSS('min-height', '42px')
  await englishButton.click()

  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page).toHaveTitle('Scenes · Film Narrative — Lab')
  await expect(page.getByRole('heading', { name: 'Scenes · Film Narrative' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open full screen ↗' }).first()).toBeVisible()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'Scenes · Film Narrative' })).toBeVisible()
})

test('English locale renders résumé and project source data in English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pf-locale', 'en'))

  await page.goto('/resume', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByText('Operations PM · Process Engineering · Data and AI Systems Builder')).toBeVisible()
  await expect(page.getByText('View all project details →')).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/[가-힣]/)

  await page.goto('/projects', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Work I planned and built' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'New Product Line Setup — In-house MES' })).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/[가-힣]/)

  const projectUrls = await page.locator('.pj-card').evaluateAll((cards) => cards.map((card) => (card as HTMLAnchorElement).href))
  expect(projectUrls).toHaveLength(12)
  for (const url of projectUrls) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    expect(await page.locator('main').innerText()).not.toMatch(/[가-힣]/)
  }
})

test('film Home control returns to the landing immediately', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pf-locale', 'en'))
  await page.goto('/film', { waitUntil: 'domcontentloaded' })

  await page.getByRole('button', { name: 'HOME →' }).click()
  await page.waitForURL((url) => url.pathname === '/')
})

test('English locale localizes standalone scene chrome and DOM captions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pf-locale', 'en'))
  await page.goto('/s/ax-era', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('#scene-title')).toHaveText('SCENE 02 · Declaration — AX ERA')
  await expect(page.getByRole('link', { name: 'Open in new tab ↗' })).toBeVisible()
  expect(await page.locator('#main').innerText()).not.toMatch(/[가-힣]/)
})
const HANGUL = /[가-힣]/

test('project screenshots stay in English mode with English captions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('pf-locale', 'en'))
  await page.goto('/projects/process-data', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Screens' })).toBeVisible()
  await expect(page.getByText('Power BI — KPIs', { exact: true })).toBeVisible()
  const alts = await page.locator('main img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('alt') ?? ''))
  expect(alts.join(' ')).not.toMatch(HANGUL)
})

test('switching language live updates projects and the career gantt without reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('i18n-live')) return
    // Start from no preference so the wait below observes the provider's own write
    // (i.e. React has hydrated and the switcher handlers are attached).
    localStorage.removeItem('pf-locale')
    sessionStorage.setItem('i18n-live', '1')
  })
  await page.goto('/projects/kip', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => localStorage.getItem('pf-locale') === 'ko')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('출처까지')
  await page.getByRole('button', { name: /^EN/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Evidence-first')
  expect(await page.locator('main').innerText()).not.toMatch(HANGUL)

  await page.goto('/s/gantt-cpm', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Career Timeline & Project Impact Board')).toBeVisible()
  await expect(page).toHaveTitle('Career Timeline — Experience + Projects · Scene')
  await expect.poll(async () => (await page.locator('#main svg').first().textContent()) ?? '').toContain('SolarEdge')
  await page.getByRole('button', { name: /^KO/ }).click()
  await expect(page.getByText('커리어 타임라인 & 프로젝트 임팩트 보드')).toBeVisible()
  await expect.poll(async () => (await page.locator('#main svg').first().textContent()) ?? '').toContain('솔라엣지')
})

test('film staged (pre-mounted) scene renders in English', async ({ page }) => {
  // /film has no language switcher of its own; the choice made elsewhere is restored.
  await page.addInitScript(() => localStorage.setItem('pf-locale', 'en'))
  await page.goto('/film', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // The hidden buffer slot pre-mounts the next shot; wait until both slots hold a scene.
  await expect(page.locator('[data-film-slot-file$=".html"]')).toHaveCount(2, { timeout: 30_000 })
  await expect
    .poll(async () => page.locator('[data-film-slot-file]').evaluateAll((slots) => slots.map((s) => s.textContent ?? '').join(' ')), { timeout: 10_000 })
    .not.toMatch(HANGUL)
})
