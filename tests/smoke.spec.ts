import { test, expect, type Page } from '@playwright/test';

/**
 * Functional smoke test for the portfolio.
 *
 * Visits the key routes and asserts each one loads with an OK response,
 * renders a body, sets a non-empty <title>, and produces no uncaught
 * page errors. Intentionally NOT a visual-snapshot test so it stays
 * stable across environments.
 */

const routes = ['/', '/resume', '/scenes', '/s/gantt-cpm'] as const;

/** Collect uncaught runtime errors raised on the page during a visit. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

for (const route of routes) {
  test(`route ${route} loads without runtime errors`, async ({ page }) => {
    const pageErrors = trackPageErrors(page);

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    // Server responded successfully.
    expect(response, `no response for ${route}`).not.toBeNull();
    expect(response!.ok(), `bad status ${response!.status()} for ${route}`).toBeTruthy();

    // A real document rendered with a non-empty title.
    //
    // Asserted on the page root, not <body>: the landing is `position: fixed` so nothing
    // contributes to body's layout box, body measures 1280x0, and Playwright reports it
    // hidden — the route was failing this check while rendering perfectly. #main is the
    // layout's content wrapper, so its first child is the page's own root element.
    await expect(page.locator('#main > *').first()).toBeVisible();
    await expect(page).toHaveTitle(/.+/);

    // No uncaught runtime errors fired while loading.
    expect(pageErrors, `uncaught page errors on ${route}: ${pageErrors.join(' | ')}`).toEqual([]);
  });
}
