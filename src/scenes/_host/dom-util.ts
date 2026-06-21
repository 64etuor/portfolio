/**
 * Shared imperative DOM helpers used across scene overlays.
 *
 * All functions are extracted byte-faithfully from existing scenes.
 * Wave-2 migration replaces local copies with these imports.
 */

/**
 * Conditional class-name joiner — filters falsy values and joins with a space.
 * Extracted verbatim from gcode-printer/Scene.tsx:55-57.
 *
 * @example
 *   cx(s.chip, isHot && s.hot, null)  // → "chip hot" or "chip"
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Set an element's `textContent` only when the value has changed.
 *
 * Two variants exist in the codebase — this implementation unifies them:
 *
 *   scada-hmi/Scene.tsx:100-102  guarded with `node.textContent !== text`
 *     `setText(node: Element | null | undefined, text: string)`
 *
 *   weld-thermal/Scene.tsx:195-197  unguarded, accepts string | number
 *     `setText(el: HTMLElement | null, value: string | number)`
 *
 * The canonical form accepts `string | number` (covers both callers) and
 * applies the inequality guard (avoids needless DOM writes).
 * `null | undefined` input is silently ignored.
 *
 * @param el     Target element, or null/undefined (no-op).
 * @param value  New text value; numbers are coerced via String().
 */
export function setText(
  el: Element | null | undefined,
  value: string | number,
): void {
  if (!el) return
  const s = String(value)
  if (el.textContent !== s) el.textContent = s
}

/**
 * Scroll `el` into view within the nearest scrollable ancestor.
 *
 * Walks up the DOM until it finds an ancestor with `overflow-y: auto | scroll`
 * whose scrollHeight exceeds its clientHeight, then adjusts `scrollTop` so
 * that `el` is fully visible within that container.  Stops after the first
 * scrollable ancestor is handled.
 *
 * Extracted from (both are identical in behaviour):
 *   gcode-printer/Scene.tsx:103-117   `scrollLocal(el: HTMLElement | null)`
 *   robot-pendant/Scene.tsx:142-156   `scrollLocal(el: Element | null)`
 *     (robot-pendant uses `window.getComputedStyle`; gcode-printer uses the
 *     bare `getComputedStyle` global — both resolve to the same function)
 *
 * @param el  Element to make visible, or null/undefined (no-op).
 */
export function scrollIntoNearestScrollable(
  el: Element | null | undefined,
): void {
  if (!el) return
  let p = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
      const er = el.getBoundingClientRect()
      const pr = p.getBoundingClientRect()
      if (er.top < pr.top) p.scrollTop -= pr.top - er.top
      else if (er.bottom > pr.bottom) p.scrollTop += er.bottom - pr.bottom
      return
    }
    p = p.parentElement
  }
}
