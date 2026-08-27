import { test, expect } from '@playwright/test'

test('Korean locale preserves intentional English brand and navigation copy', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('link', { name: 'Portfolio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Projects' })).toBeVisible()
  await expect(page.locator('canvas[aria-label="PORTFOLIO"]')).toBeVisible()
  await expect(page.locator('canvas[aria-label="Designing an awesome future"]')).toBeVisible()
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
