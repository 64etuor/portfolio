/**
 * Shared math helpers for scene animation.
 *
 * CANONICAL ARGUMENT ORDER FOR clamp: clamp(v, min, max)
 *
 * ⚠ WAVE-2 MIGRATION NOTE — clamp argument-order split:
 *   The following scenes define clamp as (v, min, max) — MATCHES canonical:
 *     30-collision/Scene.tsx:42    clamp(v, a, b)
 *     31-cost-cascade/Scene.tsx:41 clamp(v, a, b)
 *     37-cross-domain/Scene.tsx:39 clamp(v, lo, hi)
 *     38-ending-catchphrase/Scene.tsx:25 clamp(v, a, b)
 *     29-lost-in-translation/Scene.tsx:68 clamp(v, a=0, b=1)  [default args]
 *     robot-pendant/Scene.tsx:80   clamp(v, a, b)
 *     mes-console/Scene.tsx:21     clamp(v, a, b)
 *
 *   The following scenes define clamp as (min, max, v) — INVERTED ORDER,
 *   call sites MUST swap arguments when migrating:
 *     28-gap-reality/Scene.tsx:24  clamp(a, b, v)
 *     41-perspectives/Scene.tsx:122 clamp(a, b, v)
 *     42-era-shift/Scene.tsx:71    clamp(a, b, v)
 *
 *   When migrating those scenes, change every call from:
 *     clamp(min, max, v)  →  clamp(v, min, max)
 */

/**
 * Clamp `v` to [min, max].
 * Canonical order: value first, bounds second — matches the majority of scenes.
 */
export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v

/**
 * Linear interpolation: a + (b - a) * t.
 * Unclamped — t outside [0,1] extrapolates.
 */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Smoothstep on the unit interval [0, 1].
 * Clamps the input before applying the cubic: t*t*(3 - 2*t).
 * Matches the `smooth`/`ease` helpers in 38-ending-catchphrase, 37-cross-domain,
 * 28-gap-reality, and 29-lost-in-translation.
 */
export const smooth01 = (x: number): number => {
  const t = x < 0 ? 0 : x > 1 ? 1 : x
  return t * t * (3 - 2 * t)
}

/**
 * Smoothstep remapped to an arbitrary [min, max] window.
 * Equivalent to smooth01((x - min) / (max - min)).
 * Matches the `smooth(a, b, x)` helper in 38-ending-catchphrase:27-29 and
 * the `ramp(a, b, x)` / `seg(p, a, b)` pattern in other scenes.
 */
export const smoothstep = (min: number, max: number, x: number): number =>
  smooth01((x - min) / (max - min))

/**
 * Cubic ease-in-out alias: identical to smooth01.
 * Named `ease` to match the scene alias used in 41-perspectives:124,
 * 33-ax-era:37, and 37-cross-domain (where smooth doubles as ease).
 */
export const ease = (x: number): number => smooth01(x)
