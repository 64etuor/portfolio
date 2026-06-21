/**
 * Shared color helpers for scene canvas drawing.
 *
 * Canonical tuple type used across all scenes that deal with RGB color arrays.
 * `rgba` and `mix` match the exact implementation found in scenes such as
 * 30-collision, 37-cross-domain, 38-ending-catchphrase, and 41-perspectives.
 */

/** Immutable RGB triple in the range [0, 255]. */
export type RGB = readonly [number, number, number]

/**
 * Convert an RGB triple and alpha to a CSS `rgba(…)` string.
 * Each channel is integer-truncated via bitwise OR 0 — matching scene usage.
 *
 * @example rgba([217, 138, 61], 0.9) → "rgba(217,138,61,0.9)"
 */
export function rgba(c: RGB, a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
}

/**
 * Linear interpolation between two RGB triples.
 * Returns a mutable tuple (not `readonly`) so callers can pass it back into
 * canvas APIs that expect `[number, number, number]`.
 *
 * @param t  Blend factor in [0, 1] (unclamped — caller's responsibility).
 */
export function mix(a: RGB, b: RGB, t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}
