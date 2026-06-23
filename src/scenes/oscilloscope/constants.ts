// ============================================================
// Oscilloscope scene — constants + deterministic weld schedule
// ============================================================
import type { Seg } from './types'

export const MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace'

export const COL = {
  c1: '#ffb300',
  c2: '#54d6ff',
  c3: '#ff8a1e',
  c4: '#7af0b0',
  amber: '#ffb300',
  amber2: '#ff8a1e',
  red: '#ff4d4d',
  ink: '#d7d7d7',
  ink2: '#8d8d8d',
  ink3: '#3a3a3a',
  grid: '#1f2a27',
  gridminor: '#131a18',
}

// ============================================================
// WELD SCHEDULE (deterministic) — cycles @ 60Hz, 1 cycle = 16.67 ms
// ============================================================
export const SCH = {
  squeeze: 6,
  up: 3,
  pulses: [{ w: 5, c: 2 }, { w: 5, c: 2 }, { w: 6, c: 0 }],
  down: 2,
  hold: 5,
}

function buildWeld() {
  const segs: Seg[] = []
  let t = 0
  segs.push({ t0: 0, t1: SCH.up, a0: 0, a1: 1, kind: 'up' })
  t = SCH.up
  SCH.pulses.forEach((p) => {
    segs.push({ t0: t, t1: t + p.w, a0: 1, a1: 1, kind: 'pulse' })
    t += p.w
    if (p.c > 0) {
      segs.push({ t0: t, t1: t + p.c, a0: 0, a1: 0, kind: 'cool' })
      t += p.c
    }
  })
  segs.push({ t0: t, t1: t + SCH.down, a0: 1, a1: 0, kind: 'down' })
  t += SCH.down
  return { segs, dur: t }
}

export const WELD = buildWeld()

export function TOTAL() {
  return SCH.squeeze + WELD.dur + SCH.hold
}

export const WELD_START = SCH.squeeze
export const WELD_END = SCH.squeeze + WELD.dur

// ----- scope geometry (per-spot acquisition canvas) -----
export const SW = 620
export const SH = 460
export const DIVX = 10
export const DIVY = 8
export const cellW = SW / DIVX
export const cellH = SH / DIVY

// ----- live oscilloscope geometry -----
export const LVW = 820
export const LVH = 460
export const LDIVX = 12
export const LDIVY = 8
export const LcellW = LVW / LDIVX
export const LcellH = LVH / LDIVY
export const STREAM_SPEED = 13

// ----- schedule timeline geometry -----
export const DW = 640
export const DH = 300

// ----- trend geometry -----
export const TW = 640
export const TH = 220
export const TREND_MAX = 28

// ----- nugget geometry -----
export const NW = 300
export const NH = 220

export function LWIN() {
  return TOTAL() * 1.25
}

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

export function spotVar(i: number) {
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
