/* weld-thermal — pure geometry and formatting helpers (no engine state) */

import { STITCH_N, STITCH_DUTY } from './types'

/** Zero-pad a number or string to the given length. */
export function pad(value: number | string, length: number): string {
  let n = String(value)
  while (n.length < length) n = '0' + n
  return n
}

/** Point on a quarter-arc starting at angle a0, parameterised 0→1. */
export function arcPt(ox: number, oy: number, r: number, a0: number, f: number) {
  const a = a0 + (Math.PI / 2) * f
  return { x: ox + Math.cos(a) * r, y: oy + Math.sin(a) * r }
}

/** Point on a rounded-rectangle perimeter, parameterised u 0→1. */
export function roundedRectPoint(
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
  u: number,
) {
  const hw = w / 2
  const hh = h / 2
  const sLine = Math.max(0.0001, w - 2 * r)
  const vLine = Math.max(0.0001, h - 2 * r)
  const cArc = (Math.PI / 2) * r
  const seg = [sLine, cArc, vLine, cArc, sLine, cArc, vLine, cArc]
  let total = 0
  for (const length of seg) total += length
  let d = u * total
  let i = 0
  while (i < seg.length && d > seg[i]) {
    d -= seg[i]
    i++
  }
  const f = d / seg[Math.min(i, seg.length - 1)]
  switch (i) {
    case 0:
      return { x: cx - hw + r + sLine * f, y: cy - hh }
    case 1:
      return arcPt(cx + hw - r, cy - hh + r, r, -Math.PI / 2, f)
    case 2:
      return { x: cx + hw, y: cy - hh + r + vLine * f }
    case 3:
      return arcPt(cx + hw - r, cy + hh - r, r, 0, f)
    case 4:
      return { x: cx + hw - r - sLine * f, y: cy + hh }
    case 5:
      return arcPt(cx - hw + r, cy + hh - r, r, Math.PI / 2, f)
    case 6:
      return { x: cx - hw, y: cy + hh - r - vLine * f }
    default:
      return arcPt(cx - hw + r, cy - hh + r, r, Math.PI, f)
  }
}

/** Returns true when the stitch pattern is "on" at normalised position u. */
export function stitchOn(u: number): boolean {
  if (u <= 0 || u >= 1) return true
  const ph = (u * STITCH_N) % 1
  return ph < STITCH_DUTY
}
