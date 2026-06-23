/**
 * dragonHeroTypes — shared interfaces for the résumé dragon hero.
 *
 * Extracted verbatim from ResumeDragonHero so the drawing/physics helpers and
 * the thin orchestrator component agree on shapes. Behaviour is unchanged.
 */

export type Block = {
  text: string
  font: (px: number) => string
  size: number
  color: string
  alpha: number
  gap: number
}

export type Letter = {
  ch: string
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angVel: number
  charW: number
  baseAlpha: number
  color: string
  font: string
  burnTimer: number
  scaleMul: number
  gravity: number
  isEcho: boolean
  // For body-copy echoes: the live DOM <span> for this glyph. While the letter
  // is displaced we hide the span (opacity:0) and paint the canvas echo in its
  // place, so the glyph "moves" instead of doubling. `hidden` tracks the span's
  // current state so we only write to the DOM on a transition.
  span: HTMLElement | null
  hidden: boolean
}

/** Config (playground defaults, lightly tuned for a masthead). */
export type DragonConfig = {
  segments: number
  speed: number
  scale: number
  wings: boolean
  spines: boolean
  push: number
  spring: number
  damping: number
  burnGravity: number
  fireRadius: number
  fireForce: number
  shake: boolean
}
