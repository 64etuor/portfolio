/**
 * Shared deterministic random helpers for scene canvas drawing.
 *
 * Both functions are extracted byte-faithfully from existing scenes so that
 * Wave-2 migration is a pure import swap with no behavioural change.
 */

/**
 * Mulberry32 seeded PRNG — returns a factory that produces a new float in
 * [0, 1) on each call.  Stateful: advances the internal seed on every call.
 *
 * Extracted verbatim from:
 *   31-cost-cascade/Scene.tsx:25-32
 *   37-cross-domain/Scene.tsx:47-55
 *
 * @param seed  Any 32-bit integer seed.
 * @returns     A zero-argument function that yields successive pseudo-random
 *              floats in [0, 1).
 *
 * @example
 *   const rng = mulberry32(91017)
 *   const x = rng() // deterministic float
 */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Sine-fract hash — deterministic pseudo-random float in [0, 1) from an
 * integer index and an optional salt.
 *
 * Uses the classic 12.9898 / 43758.5453 constants.
 *
 * Formula: `fract(sin((x + 1) * 12.9898 + salt * 78.233) * 43758.5453)`
 *
 * This matches:
 *   41-perspectives/Scene.tsx:130-132  named `hsh(i, salt)` — two args,
 *     formula `sin((i+1)*12.9898 + salt*78.233) * 43758.5453`
 *
 * ⚠ WAVE-2 NOTE — 33-ax-era uses a DIFFERENT one-arg formula:
 *     `hash(i)` = `sin(i * 12.9898) * 43758.5453`  (no `+1`, no salt)
 *   That scene must keep its own local `hash` unless the call sites are
 *   updated to compensate for the `+1` offset.  Do NOT blindly replace it.
 *
 * ⚠ sonar-waterfall uses yet another variant (`grain(seed, t)`):
 *     `sin(seed * 12.9898 + t * 0.0017) * 43758.5453`
 *   That is a time-varying noise function, not a static hash, and should
 *   remain local to that scene.
 *
 * @param x     Primary integer input (index, seed, …).
 * @param salt  Secondary mixing value (default 0).
 * @returns     Float in [0, 1).
 *
 * @example
 *   fractHash(i, 1)  // matches hsh(i, 1) from 41-perspectives
 */
export function fractHash(x: number, salt = 0): number {
  const v = Math.sin((x + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}
