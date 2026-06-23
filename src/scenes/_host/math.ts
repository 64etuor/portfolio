/**
 * Shared math helpers for scene animation.
 *
 * CANONICAL ARGUMENT ORDER FOR clamp: clamp(v, min, max) — value first, bounds second.
 * 모든 씬이 이 헬퍼를 import 해 정규 순서로 통일된 상태다(과거 (min,max,v) 역순 정의는 마이그레이션 완료).
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
