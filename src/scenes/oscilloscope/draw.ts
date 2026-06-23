// ============================================================
// Oscilloscope scene — pure helpers (math / geometry / canvas).
// All functions depend ONLY on their arguments + module constants;
// no closure over component refs or mutable scene state.
// ============================================================
import { COL, SCH, WELD } from './constants'
import type { SpotVar } from './types'

export function envAmp(c: number) {
  const lc = c - SCH.squeeze
  if (lc < 0 || lc > WELD.dur) return 0
  for (const seg of WELD.segs) {
    if (lc >= seg.t0 && lc <= seg.t1) {
      const f = (lc - seg.t0) / ((seg.t1 - seg.t0) || 1)
      return seg.a0 + (seg.a1 - seg.a0) * f
    }
  }
  return 0
}

export function spotVar(i: number): SpotVar {
  return {
    idx: i,
    peakBase: 9.55 + Math.sin(i * 1.27) * 0.32 + Math.cos(i * 0.63) * 0.16,
    forceJit: Math.sin(i * 0.9) * 0.04,
    expulsion: i % 7 === 5,
  }
}

export function expulsionTerm(c: number, exp: boolean) {
  if (!exp) return 0
  const center = SCH.squeeze + WELD.dur * 0.58
  const d = c - center
  if (Math.abs(d) > 1.1) return 0
  return Math.exp(-(d * d) / 0.06) * (d < 0 ? 1.0 : -0.7)
}

export function arcTex(c: number) {
  return (
    0.06 * Math.sin(c * Math.PI * 2 * 5.3) +
    0.034 * Math.sin(c * Math.PI * 2 * 11.7) +
    0.02 * Math.sin(c * Math.PI * 2 * 23.1)
  )
}

export function roundRectS(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export function segColor(kind: string) {
  if (kind === 'pulse') return COL.amber
  if (kind === 'up' || kind === 'down') return COL.amber2
  return '#3a3f3d'
}
