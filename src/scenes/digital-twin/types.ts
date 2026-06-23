/**
 * Digital Twin — shared runtime types.
 * Three.js has no bundled types for the CDN/AnyMod usage here, so the 3D
 * objects are intentionally `any`. These aliases keep the Scene readable.
 */

// CDN/locally-imported Three.js module type — runtime only, tsc treats as any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyMod = any

/** Minimal Three.js context exposed from initThree to outer-scope handlers. */
export interface ThreeCtx {
  THREE: AnyMod
  controls: AnyMod
  camera: AnyMod
}

/** Camera tween descriptor — plain object, no Three.js types needed. */
export interface CamTween {
  fromT: AnyMod
  toT: AnyMod
  fromP: AnyMod
  toP: AnyMod
  t: number
}

/** Flow-line entry tracked for the cross-domain pulse boost. */
export interface FlowLineRef {
  mat: AnyMod
  pulseBoost: boolean
}
