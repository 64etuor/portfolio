// Shared inline-style writer for the legacy (imperative, rAF-driven) scenes.

type StringStyleKey = {
  [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends string ? K : never
}[keyof CSSStyleDeclaration]

export type StylePatch = Partial<Record<StringStyleKey, string>>

/**
 * Apply several inline style properties in one call, skipping any property
 * whose current inline value already equals the new one. Reading `el.style`
 * is a CSSOM read (no layout), so this never forces a reflow; skipping no-op
 * writes avoids needless style invalidation on idle/settled frames.
 */
export function setStyles(el: HTMLElement, patch: StylePatch): void {
  const style = el.style as unknown as Record<string, string>
  for (const key in patch) {
    const value = patch[key as StringStyleKey]
    if (value !== undefined && style[key] !== value) style[key] = value
  }
}
