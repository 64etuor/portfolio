import { clamp } from '../_host/math'
import { PART, ISO_X, ISO_Y, FONT_MONO, CSS, COL } from './constants'
import type { Point, RuntimeState, RuntimeTarget, SceneDomRefs } from './types'

export function iso(st: RuntimeState, px: number, py: number, pz: number): Point {
  return {
    x: st.ori.x + (px * ISO_X.x + py * ISO_Y.x) * st.scl,
    y: st.ori.y + (px * ISO_X.y + py * ISO_Y.y) * st.scl - pz * st.scl,
  }
}

export function layout(st: RuntimeState, W: number, H: number) {
  const areaW = W - 392 - 36 - 226
  const cx = 36 + 226 + Math.max(areaW, 420) / 2 + 20
  const cy = H * 0.56
  const diag = (PART.bx + PART.by) * 0.5
  st.scl = Math.min(Math.max(areaW, 420) / (diag * 1.55), (H - 220) / (diag * 1.15))
  st.scl = Math.max(st.scl, 1.0)
  st.ori.x = 0
  st.ori.y = 0
  const c0 = iso(st, PART.bx / 2, PART.by / 2, 8)
  st.ori.x += cx - c0.x
  st.ori.y += cy - c0.y
}

function poly(g: CanvasRenderingContext2D, pts: Point[], fill: string, stroke: string, lw?: number) {
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.closePath()
  if (fill) {
    g.fillStyle = fill
    g.fill()
  }
  if (stroke) {
    g.lineWidth = lw || 1
    g.strokeStyle = stroke
    g.stroke()
  }
}

function box(
  g: CanvasRenderingContext2D,
  st: RuntimeState,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  topFill: string,
  sideR: string,
  sideL: string,
  stroke: string
) {
  const A = iso(st, x, y, z1)
  const B = iso(st, x + w, y, z1)
  const C = iso(st, x + w, y + d, z1)
  const D = iso(st, x, y + d, z1)
  const Ab = iso(st, x, y, z0)
  const Bb = iso(st, x + w, y, z0)
  const Cb = iso(st, x + w, y + d, z0)
  const Db = iso(st, x, y + d, z0)
  poly(g, [B, C, Cb, Bb], sideR, stroke, 1)
  poly(g, [D, A, Ab, Db], sideL, stroke, 1)
  poly(g, [A, B, Bb, Ab], sideL, stroke, 1)
  poly(g, [A, B, C, D], topFill, stroke, 1.1)
}

export function drawGround(g: CanvasRenderingContext2D, st: RuntimeState) {
  const grid = 18
  const n = 14
  g.lineWidth = 1
  for (let i = -2; i <= n; i++) {
    const a = iso(st, i * grid - 20, -20, 0)
    const b = iso(st, i * grid - 20, PART.by + 40, 0)
    g.strokeStyle = i % 4 === 0 ? '#13202f' : '#0d1622'
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }
  for (let j = -2; j <= n; j++) {
    const a = iso(st, -20, j * grid - 20, 0)
    const b = iso(st, PART.bx + 40, j * grid - 20, 0)
    g.strokeStyle = j % 4 === 0 ? '#13202f' : '#0d1622'
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }
}

function drawCylinder(g: CanvasRenderingContext2D, st: RuntimeState, x: number, y: number, z0: number, z1: number, t: RuntimeTarget) {
  const r = 14
  const measured = t.f._measured
  const isOut = t.f._showOut
  const top = iso(st, x, y, z1)
  const bot = iso(st, x, y, z0)
  const rx = (r * st.scl) / 4.2
  const ry = rx * 0.5
  g.beginPath()
  g.moveTo(top.x - rx, top.y)
  g.lineTo(bot.x - rx, bot.y)
  g.arc(bot.x, bot.y, rx, Math.PI, 0, true)
  g.lineTo(top.x + rx, top.y)
  g.arc(top.x, top.y, rx, 0, Math.PI, true)
  g.closePath()
  g.fillStyle = isOut ? 'rgba(255,93,108,.14)' : measured ? 'rgba(60,230,164,.12)' : '#13202f'
  g.fill()
  g.lineWidth = 1.1
  g.strokeStyle = isOut ? CSS.fail : measured ? CSS.pass : '#2a3e55'
  g.stroke()
  g.beginPath()
  g.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2)
  g.fillStyle = isOut ? '#241317' : measured ? '#16322a' : '#19293a'
  g.fill()
  g.strokeStyle = isOut ? CSS.fail : measured ? CSS.pass : '#3a5573'
  g.stroke()
}

export function drawPart(g: CanvasRenderingContext2D, st: RuntimeState) {
  box(g, st, 0, 0, PART.bx, PART.by, 0, PART.baseH, COL.top, COL.sideR, COL.sideL, COL.edge)
  const A = iso(st, 0, 0, PART.baseH)
  const B = iso(st, PART.bx, 0, PART.baseH)
  const C = iso(st, PART.bx, PART.by, PART.baseH)
  g.lineWidth = 1.4
  g.strokeStyle = COL.edgeHi
  g.beginPath()
  g.moveTo(A.x, A.y)
  g.lineTo(B.x, B.y)
  g.lineTo(C.x, C.y)
  g.stroke()

  st.targets.forEach((t) => {
    const x = t.x
    const y = t.y
    if (t.type === 'pad' || t.type === 'edge' || t.type === 'slot') {
      const w = t.type === 'slot' ? 34 : 26
      const d = t.type === 'slot' ? 16 : 26
      const measured = t.f._measured
      const top = measured ? '#1d3a30' : COL.topLight
      box(g, st, x - w / 2, y - d / 2, w, d, PART.baseH, t.z, top, '#101a26', '#0c141d', '#2a3e55')
    }
    if (t.type === 'bore') {
      box(g, st, x - 15, y - 15, 30, 30, PART.baseH, t.z, '#1b2a3b', '#101a26', '#0c141d', '#2a3e55')
      const c = iso(st, x, y, t.z)
      const measured = t.f._measured
      g.beginPath()
      g.ellipse(c.x, c.y, (9 * st.scl) / 4.2, ((9 * st.scl) / 4.2) * 0.5, 0, 0, Math.PI * 2)
      g.fillStyle = '#070b10'
      g.fill()
      g.lineWidth = 1.3
      g.strokeStyle = measured ? CSS.pass : CSS.datum
      g.stroke()
    }
    if (t.type === 'cyl') {
      drawCylinder(g, st, x, y, PART.baseH, t.z, t)
    }
  })
}

function arrow(g: CanvasRenderingContext2D, from: Point, to: Point, color: string) {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  g.save()
  g.fillStyle = color
  g.beginPath()
  g.moveTo(from.x, from.y)
  g.lineTo(from.x + Math.cos(ang + 0.4) * 7, from.y + Math.sin(ang + 0.4) * 7)
  g.lineTo(from.x + Math.cos(ang - 0.4) * 7, from.y + Math.sin(ang - 0.4) * 7)
  g.closePath()
  g.fill()
  g.restore()
}

export function dimLine(
  g: CanvasRenderingContext2D,
  st: RuntimeState,
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number },
  label: string,
  color: string,
  offset: number
) {
  const a = iso(st, p1.x, p1.y, p1.z)
  const b = iso(st, p2.x, p2.y, p2.z)
  g.save()
  g.strokeStyle = color
  g.lineWidth = 1
  g.setLineDash([])
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(b.x, b.y)
  g.stroke()
  arrow(g, a, b, color)
  arrow(g, b, a, color)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 - (offset || 0)
  g.font = `700 9.5px ${FONT_MONO}`
  const tw = g.measureText(label).width + 10
  g.fillStyle = 'rgba(7,11,16,.9)'
  g.fillRect(mx - tw / 2, my - 8, tw, 15)
  g.strokeStyle = color
  g.lineWidth = 1
  g.strokeRect(mx - tw / 2, my - 8, tw, 15)
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(label, mx, my)
  g.restore()
}

export function calloutFCF(
  g: CanvasRenderingContext2D,
  st: RuntimeState,
  t: RuntimeTarget,
  sym: string,
  frame: string,
  judged: boolean
) {
  const a = iso(st, t.x, t.y, t.z)
  const lx = a.x + 38
  const ly = a.y - 46
  g.save()
  g.strokeStyle = judged ? CSS.pass : CSS.fail
  g.lineWidth = 1
  g.setLineDash([3, 3])
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(lx, ly)
  g.stroke()
  g.setLineDash([])
  g.beginPath()
  g.arc(a.x, a.y, 2.4, 0, Math.PI * 2)
  g.fillStyle = judged ? CSS.pass : CSS.fail
  g.fill()
  g.font = `700 10px ${FONT_MONO}`
  const tw = g.measureText(frame).width
  const bx = lx
  const by = ly - 9
  const bh = 18
  const symW = 16
  g.fillStyle = 'rgba(8,12,18,.94)'
  g.fillRect(bx, by, symW + tw + 8, bh)
  g.strokeStyle = judged ? CSS.passDim : 'rgba(255,93,108,.5)'
  g.lineWidth = 1
  g.strokeRect(bx, by, symW + tw + 8, bh)
  g.beginPath()
  g.moveTo(bx + symW, by)
  g.lineTo(bx + symW, by + bh)
  g.stroke()
  g.fillStyle = CSS.datum
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `12px ${FONT_MONO}`
  g.fillText(sym, bx + symW / 2, by + bh / 2 + 0.5)
  g.font = `700 10px ${FONT_MONO}`
  g.fillStyle = judged ? CSS.pass : CSS.fail
  g.textAlign = 'left'
  g.fillText(frame, bx + symW + 4, by + bh / 2 + 0.5)
  g.restore()
}

export function drawGantry(g: CanvasRenderingContext2D, st: RuntimeState) {
  const { px, py, pz } = st.probe
  const topZ = 96
  const c1 = iso(st, px, -22, topZ)
  const c1b = iso(st, px, -22, 0)
  const c2 = iso(st, px, PART.by + 22, topZ)
  const c2b = iso(st, px, PART.by + 22, 0)
  g.strokeStyle = '#2a3a4f'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(c1.x, c1.y)
  g.lineTo(c1b.x, c1b.y)
  g.stroke()
  g.beginPath()
  g.moveTo(c2.x, c2.y)
  g.lineTo(c2b.x, c2b.y)
  g.stroke()
  g.strokeStyle = '#33455d'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(c1.x, c1.y)
  g.lineTo(c2.x, c2.y)
  g.stroke()
  g.strokeStyle = '#46618a'
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(c1.x, c1.y - 3)
  g.lineTo(c2.x, c2.y - 3)
  g.stroke()
  const car = iso(st, px, py, topZ)
  g.fillStyle = '#2f4258'
  g.fillRect(car.x - 9, car.y - 7, 18, 12)
  g.strokeStyle = '#5a7da6'
  g.lineWidth = 1
  g.strokeRect(car.x - 9, car.y - 7, 18, 12)
  const tip = iso(st, px, py, pz)
  g.strokeStyle = '#7a93b3'
  g.lineWidth = 3.2
  g.beginPath()
  g.moveTo(car.x, car.y)
  g.lineTo(tip.x, tip.y + 6)
  g.stroke()
  g.strokeStyle = '#9fb6d4'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(tip.x, tip.y + 6)
  g.lineTo(tip.x, tip.y)
  g.stroke()
  if (st.probe.touch > 0) {
    const r = 4 + st.probe.touch * 16
    g.beginPath()
    g.arc(tip.x, tip.y, r, 0, Math.PI * 2)
    g.strokeStyle = `rgba(255,211,77,${st.probe.touch})`
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.arc(tip.x, tip.y, r * 0.55, 0, Math.PI * 2)
    g.strokeStyle = `rgba(60,230,164,${st.probe.touch * 0.8})`
    g.lineWidth = 1.4
    g.stroke()
  }
  g.beginPath()
  g.arc(tip.x, tip.y, 3.4, 0, Math.PI * 2)
  const grd = g.createRadialGradient(tip.x - 1, tip.y - 1, 0, tip.x, tip.y, 4)
  grd.addColorStop(0, '#ffe9a0')
  grd.addColorStop(1, '#ffb84d')
  g.fillStyle = grd
  g.fill()
  g.strokeStyle = '#fff2c8'
  g.lineWidth = 0.8
  g.stroke()
  const drop = iso(st, px, py, 0)
  g.strokeStyle = 'rgba(255,211,77,.25)'
  g.lineWidth = 1
  g.setLineDash([2, 4])
  g.beginPath()
  g.moveTo(tip.x, tip.y)
  g.lineTo(drop.x, drop.y)
  g.stroke()
  g.setLineDash([])
  g.strokeStyle = 'rgba(255,211,77,.4)'
  g.beginPath()
  g.moveTo(drop.x - 5, drop.y)
  g.lineTo(drop.x + 5, drop.y)
  g.moveTo(drop.x, drop.y - 3)
  g.lineTo(drop.x, drop.y + 3)
  g.stroke()
}

export function drawCloud(g: CanvasRenderingContext2D, st: RuntimeState) {
  st.cloud.forEach((p) => {
    const point = iso(st, p.x, p.y, p.z)
    g.beginPath()
    g.arc(point.x, point.y, 1.1, 0, Math.PI * 2)
    g.fillStyle = p.col
    g.fill()
  })
}

export function drawMeasuredMarks(g: CanvasRenderingContext2D, st: RuntimeState) {
  st.targets.forEach((t) => {
    if (!t.f._measured) return
    const a = iso(st, t.x, t.y, t.z)
    const col = t.f._showOut ? CSS.fail : CSS.pass
    const pr = 6 + (1 - (t.f._markPulse || 0)) * 10
    if ((t.f._markPulse || 0) > 0) {
      g.beginPath()
      g.arc(a.x, a.y, pr, 0, Math.PI * 2)
      g.strokeStyle = `rgba(${t.f._showOut ? '255,93,108' : '60,230,164'},${t.f._markPulse})`
      g.lineWidth = 1.4
      g.stroke()
    }
    g.beginPath()
    g.arc(a.x, a.y, 3, 0, Math.PI * 2)
    g.fillStyle = col
    g.fill()
  })
}

export function drawCpk(refs: SceneDomRefs, val: number) {
  const gctx = refs.cpkGauge.current?.getContext('2d')
  if (!gctx) return
  const w = 176
  const h = 100
  gctx.clearRect(0, 0, w, h)
  const cx = w / 2
  const cy = h - 8
  const R = 72
  gctx.lineWidth = 10
  gctx.lineCap = 'round'
  gctx.strokeStyle = '#16202e'
  gctx.beginPath()
  gctx.arc(cx, cy, R, Math.PI, 0)
  gctx.stroke()
  const t = clamp(val / 2, 0, 1)
  const ang = Math.PI + t * Math.PI
  const col = val >= 1.33 ? CSS.pass : val >= 1 ? CSS.amber : CSS.fail
  const g2 = gctx.createLinearGradient(0, 0, w, 0)
  g2.addColorStop(0, CSS.datum)
  g2.addColorStop(1, col)
  gctx.strokeStyle = g2
  gctx.beginPath()
  gctx.arc(cx, cy, R, Math.PI, ang)
  gctx.stroke()
  const tt = Math.PI + (1.33 / 2) * Math.PI
  gctx.strokeStyle = '#94a4bd'
  gctx.lineWidth = 2
  gctx.beginPath()
  gctx.moveTo(cx + Math.cos(tt) * (R - 9), cy + Math.sin(tt) * (R - 9))
  gctx.lineTo(cx + Math.cos(tt) * (R + 7), cy + Math.sin(tt) * (R + 7))
  gctx.stroke()
  gctx.strokeStyle = col
  gctx.lineWidth = 3
  gctx.beginPath()
  gctx.moveTo(cx, cy)
  gctx.lineTo(cx + Math.cos(ang) * (R - 14), cy + Math.sin(ang) * (R - 14))
  gctx.stroke()
  gctx.beginPath()
  gctx.arc(cx, cy, 4, 0, Math.PI * 2)
  gctx.fillStyle = col
  gctx.fill()
}
