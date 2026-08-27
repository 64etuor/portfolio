import { test, expect } from '@playwright/test'

test('language choice persists and updates shared gallery content', async ({ page }) => {
  await page.goto('/scenes', { waitUntil: 'domcontentloaded' })

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
