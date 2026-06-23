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
