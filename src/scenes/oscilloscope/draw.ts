// ============================================================
// Oscilloscope scene — pure helpers (math / geometry / canvas).
// All functions depend ONLY on their arguments + module constants;
// no closure over component refs or mutable scene state.
// ============================================================
import {
  cellH,
  cellW,
  DH,
  DIVX,
  DIVY,
  DW,
  COL,
  MONO,
  SCH,
  TOTAL,
  WELD,
  WELD_END,
  WELD_START,
  arcTex,
  envAmp,
  expulsionTerm,
  LcellH,
  LcellW,
  LDIVX,
  LDIVY,
  LVH,
  LVW,
  LWIN,
  NH,
  NW,
  SH,
  STREAM_SPEED,
  SW,
  TH,
  TREND_MAX,
  TW,
} from './constants'
import type { OscRefs } from './types'
import { curr, energyAt, nuggetGrowth, peakKA, streamCurr, streamPeak, viewRange } from './runtime'

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

// ============================================================
// CANVAS RENDERERS — one per scope canvas, driven once per frame.
// Each closes over the supplied OscRefs bundle (threaded explicitly).
// ============================================================

// ----- SCOPE (#scope) — per-spot acquisition -----
export function renderScope(r: OscRefs) {
  const cv = r.scopeRef.current
  if (!cv) return
  const sx = cv.getContext('2d')
  if (!sx) return
  const st = r.stateRef.current
  const VR = viewRange(r)
  r.VRRef.current = VR
  const cToX = (c: number) => ((c - VR.start) / VR.win) * SW
  const iToY = (i: number) => SH / 2 - (i / st.kaPerDiv) * cellH

  // ----- graticule -----
  sx.fillStyle = '#040404'
  sx.fillRect(0, 0, SW, SH)
  const g = sx.createRadialGradient(SW / 2, SH / 2, 40, SW / 2, SH / 2, SW * 0.7)
  g.addColorStop(0, 'rgba(60,46,8,.16)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  sx.fillStyle = g
  sx.fillRect(0, 0, SW, SH)
  const bands = [
    { c0: 0, c1: WELD_START, col: 'rgba(141,141,141,.05)' },
    { c0: WELD_START, c1: WELD_END, col: 'rgba(255,179,0,.045)' },
    { c0: WELD_END, c1: TOTAL(), col: 'rgba(141,141,141,.05)' },
  ]
  bands.forEach((b) => {
    const x0 = cToX(b.c0)
    const x1 = cToX(b.c1)
    sx.fillStyle = b.col
    sx.fillRect(x0, 0, x1 - x0, SH)
  })
  sx.strokeStyle = COL.gridminor
  sx.lineWidth = 1
  sx.beginPath()
  for (let i = 0; i <= DIVX * 5; i++) {
    const x = (i * cellW) / 5
    sx.moveTo(x, 0)
    sx.lineTo(x, SH)
  }
  for (let j = 0; j <= DIVY * 5; j++) {
    const y = (j * cellH) / 5
    sx.moveTo(0, y)
    sx.lineTo(SW, y)
  }
  sx.stroke()
  sx.strokeStyle = COL.grid
  sx.lineWidth = 1.2
  sx.beginPath()
  for (let i = 0; i <= DIVX; i++) {
    const x = i * cellW
    sx.moveTo(x, 0)
    sx.lineTo(x, SH)
  }
  for (let j = 0; j <= DIVY; j++) {
    const y = j * cellH
    sx.moveTo(0, y)
    sx.lineTo(SW, y)
  }
  sx.stroke()
  sx.strokeStyle = '#34403c'
  sx.lineWidth = 1.6
  sx.beginPath()
  sx.moveTo(0, SH / 2)
  sx.lineTo(SW, SH / 2)
  sx.stroke()
  sx.strokeStyle = '#2a3631'
  sx.lineWidth = 1.4
  sx.beginPath()
  for (let i = 0; i <= DIVX * 5; i++) {
    const x = (i * cellW) / 5
    sx.moveTo(x, SH / 2 - 5)
    sx.lineTo(x, SH / 2 + 5)
  }
  sx.stroke()

  // ----- trigger -----
  {
    const xs = cToX(WELD_START)
    sx.save()
    if (xs >= 0 && xs <= SW) {
      sx.strokeStyle = COL.amber
      sx.globalAlpha = 0.7
      sx.lineWidth = 1
      sx.setLineDash([6, 5])
      sx.beginPath()
      sx.moveTo(xs, 0)
      sx.lineTo(xs, SH)
      sx.stroke()
      sx.setLineDash([])
      sx.globalAlpha = 1
      sx.fillStyle = COL.amber
      sx.font = 'bold 11px ' + MONO
      sx.textAlign = 'left'
      sx.fillText('T ▸ WELD START', Math.min(xs + 5, SW - 90), 16)
      sx.beginPath()
      if (st.trigEdge === 'rise') {
        sx.moveTo(xs + 5, 30 + 5)
        sx.lineTo(xs + 5, 30 - 5)
        sx.lineTo(xs + 13, 30 - 5)
      } else {
        sx.moveTo(xs + 5, 30 - 5)
        sx.lineTo(xs + 5, 30 + 5)
        sx.lineTo(xs + 13, 30 + 5)
      }
      sx.strokeStyle = COL.amber
      sx.lineWidth = 1.6
      sx.stroke()
    }
    const yl = iToY(st.trigEdge === 'rise' ? st.trigKA : -st.trigKA)
    sx.strokeStyle = COL.amber
    sx.globalAlpha = 0.5
    sx.lineWidth = 1
    sx.setLineDash([3, 4])
    sx.beginPath()
    sx.moveTo(0, yl)
    sx.lineTo(SW, yl)
    sx.stroke()
    sx.setLineDash([])
    sx.fillStyle = COL.amber
    sx.globalAlpha = 1
    sx.beginPath()
    sx.moveTo(SW - 2, yl)
    sx.lineTo(SW - 12, yl - 6)
    sx.lineTo(SW - 12, yl + 6)
    sx.closePath()
    sx.fill()
    sx.restore()
  }

  // ----- energy -----
  if (r.chRef.current[3].on && r.measRef.current) {
    const tot = TOTAL()
    const revealC = r.revealRef.current * tot
    const baseY = SH - 40
    const hgt = SH * 0.66
    sx.save()
    sx.strokeStyle = COL.c4
    sx.globalAlpha = 0.6
    sx.lineWidth = 1.4
    sx.beginPath()
    let first = true
    for (let c = 0; c <= Math.min(revealC, tot); c += 0.12) {
      const x = cToX(c)
      if (x < 0 || x > SW) {
        first = true
        continue
      }
      const y = baseY - energyAt(r, c) * hgt
      if (first) {
        sx.moveTo(x, y)
        first = false
      } else sx.lineTo(x, y)
    }
    sx.stroke()
    const hx = cToX(Math.min(revealC, tot))
    if (hx > 0 && hx < SW) {
      const hy = baseY - energyAt(r, Math.min(revealC, tot)) * hgt
      sx.fillStyle = COL.c4
      sx.globalAlpha = 0.85
      sx.font = '9px ' + MONO
      sx.textAlign = 'right'
      sx.fillText('I²t', hx - 4, hy - 4)
    }
    sx.restore()
  }

  // ----- force -----
  if (r.chRef.current[1].on) {
    const tot = TOTAL()
    const fv = (c: number) => {
      if (c < SCH.squeeze) return c / SCH.squeeze
      if (c > tot - 1) return Math.max(0, tot - c)
      return 1
    }
    const baseY = SH - 40
    const hgt = cellH * 2.1
    sx.save()
    sx.strokeStyle = COL.c2
    sx.globalAlpha = 0.6
    sx.lineWidth = 1.6
    sx.setLineDash([1, 0])
    sx.beginPath()
    const revealC = r.revealRef.current * tot
    let first = true
    for (let c = 0; c <= Math.min(revealC, tot); c += 0.15) {
      const x = cToX(c)
      const y = baseY - fv(c) * hgt
      if (x < 0 || x > SW) {
        first = true
        continue
      }
      if (first) {
        sx.moveTo(x, y)
        first = false
      } else sx.lineTo(x, y)
    }
    sx.stroke()
    sx.globalAlpha = 0.8
    sx.fillStyle = COL.c2
    sx.font = '9px ' + MONO
    sx.textAlign = 'left'
    const lx = cToX(SCH.squeeze * 0.2)
    if (lx > 0 && lx < SW - 40) sx.fillText('FORCE ' + st.forceKN.toFixed(2) + 'kN', Math.max(6, lx), baseY - hgt - 6)
    sx.restore()
  }

  // ----- envelope -----
  if (r.chRef.current[2].on) {
    const tot = TOTAL()
    const pk = peakKA(r)
    const revealC = r.revealRef.current * tot
    sx.save()
    sx.strokeStyle = COL.c3
    sx.globalAlpha = 0.55
    sx.lineWidth = 1.3
    sx.setLineDash([5, 4])
    const bipolar = st.mode === 'AC'
    ;[1, -1].forEach((sign) => {
      if (sign < 0 && !bipolar) return
      sx.beginPath()
      let first = true
      for (let c = 0; c <= Math.min(revealC, tot); c += 0.1) {
        const x = cToX(c)
        if (x < 0 || x > SW) {
          first = true
          continue
        }
        const y = iToY(sign * envAmp(c) * pk)
        if (first) {
          sx.moveTo(x, y)
          first = false
        } else sx.lineTo(x, y)
      }
      sx.stroke()
    })
    sx.restore()
  }

  // ----- current -----
  if (r.chRef.current[0].on) {
    const tot = TOTAL()
    const pk = peakKA(r)
    const revealC = r.revealRef.current * tot
    const exp = r.curSpotRef.current.expulsion && r.expFiredRef.current
    const xp = r.curSpotRef.current.expulsion
    sx.save()
    sx.lineJoin = 'round'
    sx.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      sx.beginPath()
      sx.strokeStyle = COL.c1
      sx.globalAlpha = pass === 0 ? 0.18 : 0.96
      sx.lineWidth = pass === 0 ? 7 : 2.1
      sx.shadowColor = COL.c1
      sx.shadowBlur = pass === 0 ? 18 : 9
      let first = true
      for (let c = 0; c <= Math.min(revealC, tot); c += 0.03) {
        const x = cToX(c)
        if (x < 0) {
          first = true
          continue
        }
        if (x > SW) break
        const y = iToY(curr(r, c, pk, xp))
        if (first) {
          sx.moveTo(x, y)
          first = false
        } else sx.lineTo(x, y)
      }
      sx.stroke()
    }
    const hc = Math.min(revealC, tot)
    const hx = cToX(hc)
    const hy = iToY(curr(r, hc, pk, xp))
    if (hx >= 0 && hx <= SW) {
      sx.globalAlpha = 1
      sx.shadowBlur = 14
      sx.shadowColor = COL.c1
      sx.fillStyle = '#fff4d6'
      sx.beginPath()
      sx.arc(hx, hy, 2.8, 0, Math.PI * 2)
      sx.fill()
    }
    sx.restore()

    let pc = WELD_START
    let pv = 0
    const scanEnd = Math.min(revealC, WELD_END)
    for (let c = WELD_START; c <= scanEnd; c += 0.05) {
      const av = Math.abs(curr(r, c, pk, xp))
      if (av > pv) {
        pv = av
        pc = c
      }
    }
    if (pv > 0.01) {
      const mx = cToX(pc)
      const my = iToY(curr(r, pc, pk, xp))
      if (mx >= 0 && mx <= SW) {
        sx.save()
        sx.strokeStyle = COL.c1
        sx.globalAlpha = 0.35
        sx.setLineDash([2, 3])
        sx.lineWidth = 1
        sx.beginPath()
        sx.moveTo(mx, 0)
        sx.lineTo(mx, SH)
        sx.stroke()
        sx.setLineDash([])
        sx.globalAlpha = 1
        sx.fillStyle = '#fff4d6'
        sx.shadowColor = COL.c1
        sx.shadowBlur = 10
        sx.beginPath()
        sx.arc(mx, my, 3.4, 0, Math.PI * 2)
        sx.fill()
        sx.shadowBlur = 0
        const right = mx > SW - 96
        sx.fillStyle = COL.c1
        sx.font = 'bold 10px ' + MONO
        sx.textAlign = right ? 'right' : 'left'
        sx.fillText('I₂pk ' + pv.toFixed(2) + 'kA', right ? mx - 6 : mx + 6, Math.max(12, my - 9))
        sx.restore()
      }
    }

    if (exp) {
      const ec = SCH.squeeze + WELD.dur * 0.58
      const ex = cToX(ec)
      if (ex >= 0 && ex <= SW) {
        sx.save()
        const puls = 0.5 + 0.5 * Math.abs(Math.sin(st.t * 6))
        sx.strokeStyle = COL.red
        sx.globalAlpha = puls
        sx.lineWidth = 1.4
        sx.setLineDash([4, 3])
        sx.beginPath()
        sx.moveTo(ex, 0)
        sx.lineTo(ex, SH)
        sx.stroke()
        sx.setLineDash([])
        sx.shadowColor = COL.red
        sx.shadowBlur = 14
        sx.fillStyle = COL.red
        sx.globalAlpha = 1
        sx.beginPath()
        sx.arc(ex, iToY(0), 4, 0, Math.PI * 2)
        sx.fill()
        sx.restore()
      }
    }
  }

  // ----- sweep bar -----
  if (st.running && r.revealRef.current < 1) {
    const hx = cToX(r.revealRef.current * TOTAL())
    if (hx >= 0 && hx <= SW) {
      sx.save()
      const grad = sx.createLinearGradient(hx - 60, 0, hx, 0)
      grad.addColorStop(0, 'rgba(255,179,0,0)')
      grad.addColorStop(1, 'rgba(255,179,0,0.10)')
      sx.fillStyle = grad
      sx.fillRect(hx - 60, 0, 60, SH)
      sx.strokeStyle = 'rgba(255,220,150,.7)'
      sx.lineWidth = 1.4
      sx.shadowColor = COL.amber
      sx.shadowBlur = 10
      sx.beginPath()
      sx.moveTo(hx, 0)
      sx.lineTo(hx, SH)
      sx.stroke()
      sx.restore()
    }
  }

  // ----- phase labels -----
  {
    sx.save()
    sx.font = '10px ' + MONO
    sx.textAlign = 'center'
    const labels = [
      { c: (0 + WELD_START) / 2, t: 'SQUEEZE', col: COL.ink2 },
      { c: (WELD_START + WELD_END) / 2, t: 'WELD · 통전', col: COL.amber },
      { c: (WELD_END + TOTAL()) / 2, t: 'HOLD', col: COL.ink2 },
    ]
    labels.forEach((l) => {
      const x = cToX(l.c)
      if (x < -20 || x > SW + 20) return
      sx.fillStyle = l.col
      sx.globalAlpha = 0.8
      sx.fillText(l.t, x, SH - 30)
    })
    sx.restore()
  }

  // ----- expulsion banner -----
  if (r.curSpotRef.current.expulsion && r.expFiredRef.current) {
    sx.save()
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(st.t * 5))
    const bw = 320
    const bh = 46
    const bx = (SW - bw) / 2
    const by = SH * 0.14
    sx.globalAlpha = 0.9
    sx.fillStyle = 'rgba(22,4,4,.8)'
    roundRectS(sx, bx, by, bw, bh, 8)
    sx.fill()
    sx.globalAlpha = pulse
    sx.strokeStyle = COL.red
    sx.lineWidth = 2
    sx.shadowColor = COL.red
    sx.shadowBlur = 18
    roundRectS(sx, bx, by, bw, bh, 8)
    sx.stroke()
    sx.shadowBlur = 0
    sx.globalAlpha = 1
    sx.textAlign = 'center'
    sx.fillStyle = COL.red
    sx.font = 'bold 16px ' + MONO
    sx.fillText('⚠ EXPULSION · 스패터 검출', SW / 2, by + 20)
    sx.fillStyle = '#ffb3b3'
    sx.font = '10px ' + MONO
    sx.fillText('통전 중 용융금속 비산 — 해당 타점 플래그 / 전류 서지', SW / 2, by + 36)
    sx.textAlign = 'left'
    sx.restore()
  }

  // ----- HUD -----
  {
    sx.save()
    sx.font = '11px ' + MONO
    sx.fillStyle = 'rgba(4,4,4,.72)'
    sx.fillRect(0, SH - 22, SW, 22)
    sx.fillStyle = COL.amber
    sx.fillText(`${st.cyclePerDiv} cyc/div`, 10, SH - 7)
    sx.fillText(`${st.kaPerDiv} kA/div`, 110, SH - 7)
    sx.fillStyle = COL.ink2
    sx.fillText(`MODE ${st.mode}`, 210, SH - 7)
    sx.fillText(`HEAT ${(st.heat * 100) | 0}%`, 320, SH - 7)
    const acq = st.running ? (r.revealRef.current < 1 ? '● ACQUIRE' : '◌ DWELL') : '■ STOP'
    sx.fillStyle = st.running ? COL.amber : COL.red
    sx.fillText(acq, 430, SH - 7)
    sx.textAlign = 'right'
    sx.fillStyle = COL.amber
    if (r.measRef.current) sx.fillText(`I₂pk ${r.measRef.current.peak.toFixed(2)} kA`, SW - 10, 18)
    sx.textAlign = 'left'
    sx.restore()
  }
}

// ----- LIVE OSCILLOSCOPE (#scopeLive) -----
export function renderLive(r: OscRefs) {
  const cv = r.liveRef.current
  if (!cv) return
  const lv = cv.getContext('2d')
  if (!lv) return
  const st = r.stateRef.current
  lv.fillStyle = '#040404'
  lv.fillRect(0, 0, LVW, LVH)
  const g = lv.createRadialGradient(LVW / 2, LVH / 2, 40, LVW / 2, LVH / 2, LVW * 0.7)
  g.addColorStop(0, 'rgba(60,46,8,.14)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  lv.fillStyle = g
  lv.fillRect(0, 0, LVW, LVH)
  lv.strokeStyle = COL.gridminor
  lv.lineWidth = 1
  lv.beginPath()
  for (let i = 0; i <= LDIVX * 4; i++) {
    const x = (i * LcellW) / 4
    lv.moveTo(x, 0)
    lv.lineTo(x, LVH)
  }
  for (let j = 0; j <= LDIVY * 4; j++) {
    const y = (j * LcellH) / 4
    lv.moveTo(0, y)
    lv.lineTo(LVW, y)
  }
  lv.stroke()
  lv.strokeStyle = COL.grid
  lv.lineWidth = 1.1
  lv.beginPath()
  for (let i = 0; i <= LDIVX; i++) {
    const x = i * LcellW
    lv.moveTo(x, 0)
    lv.lineTo(x, LVH)
  }
  for (let j = 0; j <= LDIVY; j++) {
    const y = j * LcellH
    lv.moveTo(0, y)
    lv.lineTo(LVW, y)
  }
  lv.stroke()
  lv.strokeStyle = '#34403c'
  lv.lineWidth = 1.4
  lv.beginPath()
  lv.moveTo(0, LVH / 2)
  lv.lineTo(LVW, LVH / 2)
  lv.stroke()

  const win = LWIN()
  const maxKA = st.kaPerDiv * 4
  const tot = TOTAL()
  const streamC = st.running ? st.t * STREAM_SPEED : r.liveFreezeRef.current
  if (st.running) r.liveFreezeRef.current = streamC
  const c0 = streamC - win
  const cToX = (c: number) => ((c - c0) / win) * LVW
  const iToY = (i: number) => LVH / 2 - (i / maxKA) * (LVH / 2 * 0.92)

  const firstIdx = Math.floor(c0 / tot)
  const lastIdx = Math.ceil(streamC / tot)
  for (let idx = firstIdx; idx <= lastIdx; idx++) {
    const x = cToX(idx * tot + WELD_START)
    if (x < -2 || x > LVW) continue
    const isExp = (((idx % 7) + 7) % 7) === 5
    lv.strokeStyle = isExp ? 'rgba(255,77,77,.4)' : 'rgba(255,179,0,.32)'
    lv.lineWidth = 1
    lv.setLineDash([4, 5])
    lv.beginPath()
    lv.moveTo(x, 0)
    lv.lineTo(x, LVH)
    lv.stroke()
    lv.setLineDash([])
    lv.fillStyle = isExp ? 'rgba(255,77,77,.8)' : 'rgba(255,179,0,.7)'
    lv.font = '9px ' + MONO
    lv.textAlign = 'left'
    if (idx >= 0) lv.fillText('T·#' + String(idx + 1).padStart(4, '0'), x + 3, 12)
  }

  if (r.chRef.current[2].on) {
    lv.save()
    lv.strokeStyle = COL.c3
    lv.globalAlpha = 0.4
    lv.lineWidth = 1.2
    lv.setLineDash([5, 4])
    ;[1, -1].forEach((sgn) => {
      if (sgn < 0 && st.mode !== 'AC') return
      lv.beginPath()
      let first = true
      for (let x = 0; x <= LVW; x += 3) {
        const c = c0 + (x / LVW) * win
        const idx = Math.floor(c / tot)
        const local = c - idx * tot
        const y = iToY(sgn * envAmp(local) * streamPeak(r, idx))
        if (first) {
          lv.moveTo(x, y)
          first = false
        } else lv.lineTo(x, y)
      }
      lv.stroke()
    })
    lv.restore()
  }

  if (r.chRef.current[0].on) {
    lv.save()
    lv.lineJoin = 'round'
    lv.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      lv.beginPath()
      lv.strokeStyle = COL.c1
      lv.lineWidth = pass === 0 ? 6 : 2
      lv.shadowColor = COL.c1
      lv.shadowBlur = pass === 0 ? 16 : 8
      lv.globalAlpha = pass === 0 ? 0.15 : 0.95
      let first = true
      for (let x = 0; x <= LVW; x += 1.5) {
        const y = iToY(streamCurr(r, c0 + (x / LVW) * win))
        if (first) {
          lv.moveTo(x, y)
          first = false
        } else lv.lineTo(x, y)
      }
      lv.stroke()
    }
    lv.beginPath()
    lv.strokeStyle = '#fff0cf'
    lv.lineWidth = 1.4
    lv.shadowColor = COL.c1
    lv.shadowBlur = 10
    lv.globalAlpha = 1
    let f2 = true
    for (let x = Math.floor(LVW * 0.78); x <= LVW; x += 1.2) {
      const y = iToY(streamCurr(r, c0 + (x / LVW) * win))
      if (f2) {
        lv.moveTo(x, y)
        f2 = false
      } else lv.lineTo(x, y)
    }
    lv.stroke()
    const hy = iToY(streamCurr(r, streamC))
    lv.shadowBlur = 14
    lv.fillStyle = '#fff4d6'
    lv.beginPath()
    lv.arc(LVW - 2, hy, 3, 0, Math.PI * 2)
    lv.fill()
    lv.restore()
  }

  lv.fillStyle = 'rgba(4,4,4,.7)'
  lv.fillRect(0, LVH - 20, LVW, 20)
  lv.fillStyle = COL.c1
  lv.font = '10px ' + MONO
  lv.textAlign = 'left'
  lv.fillText((st.running ? '● ROLL' : '■ HOLD') + ' · ' + STREAM_SPEED + ' cyc/s · ' + st.mode, 8, LVH - 6)
  lv.textAlign = 'right'
  lv.fillStyle = COL.ink2
  lv.fillText('I₂(t) LIVE · ' + st.kaPerDiv + ' kA/div', LVW - 8, LVH - 6)
  lv.textAlign = 'left'
}

// ----- WELD SCHEDULE TIMELINE (#sched) -----
export function renderSched(r: OscRefs) {
  const cv = r.schedRef.current
  if (!cv) return
  const dx = cv.getContext('2d')
  if (!dx) return
  const st = r.stateRef.current
  dx.clearRect(0, 0, DW, DH)
  dx.fillStyle = '#070707'
  dx.fillRect(0, 0, DW, DH)
  const tot = TOTAL()
  const padX = 14
  const trackW = DW - padX * 2
  const trackY = 42
  const trackH = 30
  const cToTx = (c: number) => padX + (c / tot) * trackW

  const blocks: { c0: number; c1: number; kind: string; lab: string }[] = [
    { c0: 0, c1: SCH.squeeze, kind: 'squeeze', lab: 'SQ' },
  ]
  WELD.segs.forEach((seg) =>
    blocks.push({
      c0: seg.t0 + SCH.squeeze,
      c1: seg.t1 + SCH.squeeze,
      kind: seg.kind,
      lab: seg.kind === 'pulse' ? 'WELD' : seg.kind === 'cool' ? 'COOL' : seg.kind === 'up' ? 'UP' : 'DN',
    })
  )
  blocks.push({ c0: WELD_END, c1: tot, kind: 'hold', lab: 'HOLD' })

  const revealC = r.revealRef.current * tot
  let activeLab = 'SQUEEZE'
  blocks.forEach((b) => {
    const x0 = cToTx(b.c0)
    const x1 = cToTx(b.c1)
    const w = Math.max(1, x1 - x0)
    const isActive = revealC >= b.c0 && revealC < b.c1
    dx.fillStyle =
      b.kind === 'squeeze' || b.kind === 'hold' ? '#1a1f1d' : b.kind === 'cool' ? '#23130a' : 'rgba(255,179,0,.18)'
    dx.fillRect(x0, trackY, w, trackH)
    if (revealC > b.c0) {
      const fillX1 = Math.min(x1, cToTx(revealC))
      const c = segColor(b.kind)
      dx.fillStyle = b.kind === 'squeeze' || b.kind === 'hold' || b.kind === 'cool' ? '#2a302d' : c
      dx.globalAlpha = b.kind === 'pulse' || b.kind === 'up' || b.kind === 'down' ? 0.9 : 0.6
      dx.fillRect(x0, trackY, Math.max(0, fillX1 - x0), trackH)
      dx.globalAlpha = 1
    }
    dx.strokeStyle = '#0a0a0a'
    dx.lineWidth = 1
    dx.strokeRect(x0, trackY, w, trackH)
    if (isActive) {
      dx.strokeStyle = COL.amber
      dx.lineWidth = 2
      dx.shadowColor = COL.amber
      dx.shadowBlur = 10
      dx.strokeRect(x0, trackY, w, trackH)
      dx.shadowBlur = 0
      activeLab = (
        { squeeze: 'SQUEEZE · 가압', up: 'UPSLOPE', pulse: 'WELD · 통전', cool: 'COOL · 펄스간', down: 'DOWNSLOPE', hold: 'HOLD · 유지' } as Record<string, string>
      )[b.kind]
    }
    const cyc = b.c1 - b.c0
    if (w > 26) {
      dx.fillStyle = COL.ink2
      dx.font = '8px ' + MONO
      dx.textAlign = 'center'
      dx.fillText(cyc + 'c', (x0 + x1) / 2, trackY + trackH + 12)
    }
  })

  const px = cToTx(revealC)
  dx.strokeStyle = '#fff4d6'
  dx.lineWidth = 1.4
  dx.shadowColor = COL.amber
  dx.shadowBlur = 8
  dx.beginPath()
  dx.moveTo(px, trackY - 8)
  dx.lineTo(px, trackY + trackH + 8)
  dx.stroke()
  dx.shadowBlur = 0

  dx.fillStyle = COL.ink2
  dx.font = '9px ' + MONO
  dx.textAlign = 'left'
  dx.fillText('1 cycle = 16.7 ms · 60Hz · ' + (st.mode === 'AC' ? 'AC 반주기 위상제어' : 'MFDC DC 플래토'), padX, 20)
  dx.textAlign = 'right'
  dx.fillStyle = COL.amber
  dx.fillText('Σ ' + tot + ' cyc / ' + ((tot * 16.7) | 0) + ' ms', DW - padX, 20)

  const py0 = DH - 16
  const ph = DH - trackY - trackH - 56
  const top = py0 - ph
  dx.strokeStyle = '#13352a'
  dx.lineWidth = 1
  dx.beginPath()
  dx.moveTo(padX, top + ph / 2)
  dx.lineTo(DW - padX, top + ph / 2)
  dx.stroke()
  const pk = peakKA(r)
  const maxKA = st.kaPerDiv * 4
  dx.beginPath()
  dx.strokeStyle = COL.amber
  dx.lineWidth = 1.4
  dx.globalAlpha = 0.85
  dx.shadowColor = COL.amber
  dx.shadowBlur = 6
  let first = true
  for (let i = 0; i <= trackW; i += 1) {
    const c = (i / trackW) * tot
    const v = curr(r, c, pk, r.curSpotRef.current.expulsion)
    const y = top + ph / 2 - (v / maxKA) * (ph / 2)
    const x = padX + i
    if (c > revealC) {
      if (!first) {
        dx.stroke()
        first = true
      }
      continue
    }
    if (first) {
      dx.moveTo(x, y)
      first = false
    } else dx.lineTo(x, y)
  }
  dx.stroke()
  dx.shadowBlur = 0
  dx.globalAlpha = 1
  dx.fillStyle = COL.ink2
  dx.font = '8px ' + MONO
  dx.textAlign = 'left'
  dx.fillText('I₂(t) preview', padX, top - 2)

  if (r.schedStatRef.current) {
    r.schedStatRef.current.textContent = activeLab
    r.schedStatRef.current.style.color = activeLab.indexOf('WELD') >= 0 ? COL.amber : COL.ink2
  }
}

// ----- SPOT TREND (#trend) -----
export function renderTrend(r: OscRefs) {
  const cv = r.trendRef.current
  if (!cv) return
  const tx = cv.getContext('2d')
  if (!tx) return
  const st = r.stateRef.current
  const meas = r.measRef.current
  const hist = r.histRef.current
  tx.clearRect(0, 0, TW, TH)
  tx.fillStyle = '#070707'
  tx.fillRect(0, 0, TW, TH)
  const padL = 34
  const padB = 22
  const padT = 14
  const plotW = TW - padL - 10
  const plotH = TH - padB - padT
  const maxKA = st.kaPerDiv * 4
  tx.strokeStyle = '#13352a'
  tx.lineWidth = 1
  tx.beginPath()
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i) / 4
    tx.moveTo(padL, y)
    tx.lineTo(padL + plotW, y)
  }
  tx.stroke()
  tx.fillStyle = COL.ink2
  tx.font = '8px ' + MONO
  tx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const y = padT + (plotH * i) / 4
    tx.fillText(((maxKA * (4 - i)) / 4).toFixed(0), padL - 4, y + 3)
  }
  const specHi = 10.4
  const specLo = 8.4
  const yHi = padT + plotH * (1 - specHi / maxKA)
  const yLo = padT + plotH * (1 - specLo / maxKA)
  tx.fillStyle = 'rgba(255,179,0,.06)'
  tx.fillRect(padL, yHi, plotW, yLo - yHi)
  tx.strokeStyle = 'rgba(255,179,0,.4)'
  tx.setLineDash([4, 3])
  tx.lineWidth = 1
  tx.beginPath()
  tx.moveTo(padL, yHi)
  tx.lineTo(padL + plotW, yHi)
  tx.moveTo(padL, yLo)
  tx.lineTo(padL + plotW, yLo)
  tx.stroke()
  tx.setLineDash([])
  tx.fillStyle = COL.amber
  tx.globalAlpha = 0.7
  tx.textAlign = 'left'
  tx.fillText('USL', padL + 2, yHi - 3)
  tx.fillText('LSL', padL + 2, yLo + 9)
  tx.globalAlpha = 1
  const n = hist.length
  const bw = plotW / TREND_MAX
  for (let i = 0; i < n; i++) {
    const h = hist[i]
    const x = padL + i * bw + 2
    const w = bw - 4
    const bh = (h.kA / maxKA) * plotH
    const y = padT + plotH - bh
    const isLast = i === n - 1
    tx.fillStyle = h.exp ? COL.red : isLast ? COL.amber : '#7a6320'
    tx.shadowColor = h.exp ? COL.red : COL.amber
    tx.shadowBlur = isLast || h.exp ? 8 : 0
    tx.fillRect(x, y, w, bh)
    tx.shadowBlur = 0
    if (h.exp) {
      tx.fillStyle = COL.red
      tx.beginPath()
      tx.arc(x + w / 2, y - 5, 2.2, 0, Math.PI * 2)
      tx.fill()
    }
  }
  tx.fillStyle = COL.ink2
  tx.font = '8px ' + MONO
  tx.textAlign = 'center'
  tx.fillText('← 최근 ' + TREND_MAX + ' 타점 → (현재 #' + r.spotRef.current + ')', padL + plotW / 2, TH - 6)
  if (r.trendStatRef.current) {
    r.trendStatRef.current.textContent = meas ? meas.peak.toFixed(2) + ' kA' : 'kA'
    r.trendStatRef.current.style.color =
      meas && r.curSpotRef.current.expulsion && r.expFiredRef.current ? COL.red : COL.amber
  }
}

// ----- ELECTRODE / NUGGET (#nug) -----
export function renderNug(r: OscRefs) {
  const cv = r.nugRef.current
  if (!cv) return
  const nx = cv.getContext('2d')
  if (!nx) return
  const st = r.stateRef.current
  const meas = r.measRef.current
  nx.clearRect(0, 0, NW, NH)
  nx.fillStyle = '#070707'
  nx.fillRect(0, 0, NW, NH)
  const cx = NW / 2
  const cy = NH / 2
  const sheetH = 14
  const gap = 2
  const sheetW = 150
  nx.fillStyle = '#1a1e20'
  nx.fillRect(cx - sheetW / 2, cy - gap / 2 - sheetH, sheetW, sheetH)
  nx.fillRect(cx - sheetW / 2, cy + gap / 2, sheetW, sheetH)
  nx.strokeStyle = '#2a2f31'
  nx.lineWidth = 1
  nx.strokeRect(cx - sheetW / 2, cy - gap / 2 - sheetH, sheetW, sheetH)
  nx.strokeRect(cx - sheetW / 2, cy + gap / 2, sheetW, sheetH)
  const electrode = (top: boolean) => {
    const dir = top ? -1 : 1
    const ty = top ? cy - gap / 2 - sheetH : cy + gap / 2 + sheetH
    nx.fillStyle = '#33393c'
    nx.beginPath()
    nx.moveTo(cx - 22, ty + dir * 60)
    nx.lineTo(cx + 22, ty + dir * 60)
    nx.lineTo(cx + 12, ty)
    nx.lineTo(cx - 12, ty)
    nx.closePath()
    nx.fill()
    nx.strokeStyle = '#454c50'
    nx.lineWidth = 1
    nx.stroke()
    const g = nuggetGrowth(r)
    if (g > 0) {
      nx.fillStyle = 'rgba(255,179,0,' + 0.15 * g + ')'
      nx.beginPath()
      nx.arc(cx, ty, 14, 0, Math.PI * 2)
      nx.fill()
    }
  }
  electrode(true)
  electrode(false)
  const exp = r.curSpotRef.current.expulsion && r.expFiredRef.current
  nx.strokeStyle = COL.ink2
  nx.fillStyle = COL.ink2
  nx.lineWidth = 1.4
  nx.globalAlpha = 0.7
  ;[
    [cx, 18, 1],
    [cx, NH - 18, -1],
  ].forEach((a) => {
    nx.beginPath()
    nx.moveTo(a[0], a[1])
    nx.lineTo(a[0], a[1] + a[2] * 22)
    nx.stroke()
    nx.beginPath()
    nx.moveTo(a[0] - 4, a[1] + a[2] * 22 - a[2] * 6)
    nx.lineTo(a[0], a[1] + a[2] * 22)
    nx.lineTo(a[0] + 4, a[1] + a[2] * 22 - a[2] * 6)
    nx.fill()
  })
  nx.globalAlpha = 1
  const g = nuggetGrowth(r)
  if (g > 0) {
    const rw = 8 + g * (meas ? meas.nuggetMM : 6) * 3.2
    const rh = (sheetH + gap) * 0.7 * g + 4
    const grad = nx.createRadialGradient(cx, cy, 1, cx, cy, rw)
    grad.addColorStop(0, '#fff2c8')
    grad.addColorStop(0.4, COL.amber)
    grad.addColorStop(1, 'rgba(255,138,30,0.05)')
    nx.fillStyle = grad
    nx.shadowColor = COL.amber
    nx.shadowBlur = 18 * g
    nx.beginPath()
    nx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2)
    nx.fill()
    nx.shadowBlur = 0
  }
  if (exp) {
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + st.t * 2
      const d = 20 + ((st.t * 40 + i * 13) % 30)
      const px = cx + Math.cos(ang) * d
      const py = cy + Math.sin(ang) * d * 0.5
      nx.fillStyle = COL.red
      nx.globalAlpha = Math.max(0, 1 - d / 50)
      nx.beginPath()
      nx.arc(px, py, 1.8, 0, Math.PI * 2)
      nx.fill()
    }
    nx.globalAlpha = 1
  }
  nx.fillStyle = COL.ink2
  nx.font = '8px ' + MONO
  nx.textAlign = 'left'
  nx.fillText('ELECTRODE +', cx - sheetW / 2 - 4, 14)
  nx.fillText('ELECTRODE −', cx - sheetW / 2 - 4, NH - 6)
  nx.textAlign = 'right'
  nx.fillStyle = g > 0 ? COL.amber : COL.ink2
  nx.fillText('Ø ' + (meas ? (meas.nuggetMM * g).toFixed(1) : '0.0') + ' mm', NW - 6, cy + 3)
  if (r.nugStatRef.current) {
    r.nugStatRef.current.textContent = exp ? 'SPATTER' : g > 0 ? 'NUGGET' : 'COOL'
    r.nugStatRef.current.style.color = exp ? COL.red : g > 0 ? COL.amber : COL.ink2
  }
}
