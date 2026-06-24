/**
 * Visual regression snapshot tests for the portfolio.
 *
 * BASELINE GENERATION
 * -------------------
 * Snapshots are NOT committed until you generate them locally (or in CI) with:
 *   npx playwright test tests/visual.spec.ts --update-snapshots
 *
 * After the first run the PNG files land in tests/__snapshots__/ (chromium).
 * Commit them. Future runs diff against those baselines; the test fails when
 * the pixel difference exceeds maxDiffPixelRatio (0.02 = 2 %).
 *
 * DETERMINISM STRATEGY
 * --------------------
 * These scenes run continuous rAF animations and show live clocks/counters.
 * We use three layers of defence:
 *   1. `page.emulateMedia({ reducedMotion: 'reduce' })` — signals the app to
 *      honour prefers-reduced-motion (most CSS animations stop).
 *   2. An injected <style> that hard-pauses every animation and strips every
 *      transition so residual rAF loops have no CSS side-effects.
 *   3. `animations: 'disabled'` in toHaveScreenshot, which tells the
 *      Playwright screenshot engine to snapshot a frozen paint.
 *   4. `maxDiffPixelRatio: 0.02` — 2 % tolerance absorbs any remaining
 *      sub-pixel jitter from live counters or canvas clocks.
 *   5. `mask` on known volatile regions (clock / uptime widgets) where we can
 *      locate them by data-testid or selector; falls back to the ratio above.
 *
 * VIEWPORT
 * --------
 * All snapshots use the project default (Desktop Chrome 1280×720).
 * `fullPage: false` captures only the viewport to keep baselines stable.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

/** Freeze CSS animations and disable transitions in the page. */
async function freezeAnimations(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        transition: none !important;
      }
    `,
  });
}

/**
 * Navigate to a route, wait for it to settle, then freeze animations.
 * Uses 'networkidle' + an extra tick so rAF-driven initial renders land.
 */
async function navigateAndFreeze(page: Page, route: string): Promise<void> {
  await freezeAnimations(page);
  await page.goto(route, { waitUntil: 'networkidle' });
  // One additional paint cycle so the first rAF frame resolves.
  await page.waitForTimeout(300);
  // Re-inject the freeze style after navigation in case Next.js wiped the head.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        transition: none !important;
      }
    `,
  });
}

/** Common snapshot options applied to every assertion. */
const SNAP_OPTS = {
  fullPage: false,
  maxDiffPixelRatio: 0.02,
  animations: 'disabled',
} as const;

/**
 * Selectors for volatile regions that contain live clocks or counters.
 * These are masked so pixel differences there never fail the test.
 */
const CLOCK_SELECTORS = [
  '[data-testid="clock"]',
  '[data-testid="live-clock"]',
  '[data-testid="uptime"]',
  '[data-testid="timestamp"]',
  // Generic catch-all for any element labelled as a clock/timer
  '[aria-label*="clock" i]',
  '[aria-label*="time" i]',
  '[class*="clock"]',
  '[class*="Clock"]',
  '[class*="timer"]',
  '[class*="Timer"]',
  '[class*="uptime"]',
  '[class*="Uptime"]',
];

/** Locate any volatile elements present on the current page for masking. */
async function getVolatileMasks(page: Page) {
  const masks = [];
  for (const sel of CLOCK_SELECTORS) {
    const locator = page.locator(sel);
    if ((await locator.count()) > 0) {
      masks.push(locator);
    }
  }
  return masks;
}

// ---------------------------------------------------------------------------
// Top-level page routes
// ---------------------------------------------------------------------------

test.describe('top-level routes', () => {
  test('/ — landing page', async ({ page }) => {
    await navigateAndFreeze(page, '/');
    const mask = await getVolatileMasks(page);
    await expect(page).toHaveScreenshot('landing.png', { ...SNAP_OPTS, mask });
  });

  test('/resume — résumé page', async ({ page }) => {
    await navigateAndFreeze(page, '/resume');
    const mask = await getVolatileMasks(page);
    await expect(page).toHaveScreenshot('resume.png', { ...SNAP_OPTS, mask });
  });

  test('/scenes — scene catalogue', async ({ page }) => {
    await navigateAndFreeze(page, '/scenes');
    const mask = await getVolatileMasks(page);
    await expect(page).toHaveScreenshot('scenes.png', { ...SNAP_OPTS, mask });
  });
});

// ---------------------------------------------------------------------------
// Instrument / scene routes — heavily refactored, highest regression risk
// ---------------------------------------------------------------------------

test.describe('instrument and scene routes', () => {
  /** Shared per-scene helper to keep each test body identical. */
  async function sceneSnapshot(page: Page, route: string, name: string) {
    await navigateAndFreeze(page, route);
    // If the scene exposes a ready signal, wait for it.
    const readyEl = page.locator('[data-scene-ready]');
    if ((await readyEl.count()) > 0) {
      await readyEl.waitFor({ state: 'visible', timeout: 8_000 });
    }
    const mask = await getVolatileMasks(page);
    await expect(page).toHaveScreenshot(name, { ...SNAP_OPTS, mask });
  }

  test('/s/oscilloscope', async ({ page }) => {
    await sceneSnapshot(page, '/s/oscilloscope', 'scene-oscilloscope.png');
  });

  test('/s/robot-pendant', async ({ page }) => {
    await sceneSnapshot(page, '/s/robot-pendant', 'scene-robot-pendant.png');
  });

  test('/s/db-architecture', async ({ page }) => {
    await sceneSnapshot(page, '/s/db-architecture', 'scene-db-architecture.png');
  });

  test('/s/agent-governance', async ({ page }) => {
    await sceneSnapshot(page, '/s/agent-governance', 'scene-agent-governance.png');
  });

  test('/s/cmm-metrology', async ({ page }) => {
    await sceneSnapshot(page, '/s/cmm-metrology', 'scene-cmm-metrology.png');
  });

  test('/s/decision-os', async ({ page }) => {
    await sceneSnapshot(page, '/s/decision-os', 'scene-decision-os.png');
  });

  test('/s/pid-scheme', async ({ page }) => {
    await sceneSnapshot(page, '/s/pid-scheme', 'scene-pid-scheme.png');
  });

  test('/s/weld-thermal', async ({ page }) => {
    await sceneSnapshot(page, '/s/weld-thermal', 'scene-weld-thermal.png');
  });

  test('/s/radar-sonar', async ({ page }) => {
    await sceneSnapshot(page, '/s/radar-sonar', 'scene-radar-sonar.png');
  });

  test('/s/gantt-cpm', async ({ page }) => {
    await sceneSnapshot(page, '/s/gantt-cpm', 'scene-gantt-cpm.png');
  });
});
