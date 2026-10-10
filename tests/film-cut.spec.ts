import { test, expect } from '@playwright/test';

/**
 * Film scene-cut regression test — runs in both locales.
 *
 * The film double-buffers scenes across two slots and loads each scene on-cut (no
 * prefetch). The invariant: a slot may only be revealed once its scene has PAINTED.
 * A regression here is invisible to a type checker and easy to reintroduce — a
 * hold-only reveal cross-fades to an empty slot, so the picture goes dark, the cut
 * flash plays against nothing, and the per-scene clock starts before the scene
 * exists (which drifts each scene past the loop boundary its duration was tuned to).
 *
 * Also asserts no scene file repeats across the cuts observed in this window — the
 * regression this exists for: EN's heavier per-frame text localization used to delay
 * a reveal past the scene's internal loop boundary, so the audience saw the same
 * scene play twice before the (late) cut. `data-film-slot-file` (Film.tsx) exposes
 * which scene is in which slot without poking at React internals.
 */
for (const locale of ['ko', 'en'] as const) {
  test(`scene cuts reveal an already-painted slot, in sync with the cut flash (${locale})`, async ({ page }) => {
    test.setTimeout(60_000);

    await page.addInitScript((loc) => {
      window.localStorage.setItem('pf-locale', loc);
    }, locale);

    await page.goto('/film', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="region"]');

    await page.evaluate(() => {
      const region = document.querySelector('[role="region"]')!;
      const slotWrap = region.querySelector(':scope > div')!;
      const cuts: { incomingHasDom: boolean; flashPresent: boolean; file: string | null }[] = [];
      (window as unknown as { __cuts: typeof cuts }).__cuts = cuts;

      let prevVisible: number | null = null;
      setInterval(() => {
        const slots = Array.from(slotWrap.children);
        // The revealed slot is the one the film raises above the other.
        const vi = slots.findIndex((el) => getComputedStyle(el).zIndex === '2');
        if (prevVisible !== null && vi !== prevVisible) {
          cuts.push({
            incomingHasDom: !!slots[vi]?.querySelector('div,canvas'),
            flashPresent: !!region.querySelector(':scope > .film-tx'),
            file: slots[vi]?.getAttribute('data-film-slot-file') ?? null,
          });
        }
        prevVisible = vi;
      }, 16);
    });

    // The opening beat runs 6.2s; wait past the first cut plus its load gap.
    await page.waitForFunction(
      () => (window as unknown as { __cuts: unknown[] }).__cuts.length > 0,
      undefined,
      { timeout: 30_000 },
    );

    const cuts = await page.evaluate(
      () =>
        (
          window as unknown as {
            __cuts: { incomingHasDom: boolean; flashPresent: boolean; file: string | null }[];
          }
        ).__cuts,
    );

    expect(cuts.length).toBeGreaterThan(0);
    const seen = new Set<string>();
    for (const cut of cuts) {
      expect(cut.incomingHasDom, 'cut revealed a slot whose scene had not painted yet').toBe(true);
      expect(cut.flashPresent, 'cut flash was not on screen when the picture changed').toBe(true);
      if (cut.file) {
        expect(seen.has(cut.file), `scene repeated: ${cut.file} was already shown in this window`).toBe(false);
        seen.add(cut.file);
      }
    }
  });
}
