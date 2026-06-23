/* weld-thermal — geometry helpers + canvas render functions */

import { LUT, PROGRAMS } from './data'
import type { WeldProgram } from './data'
import { STITCH_N, STITCH_DUTY, TMAX_SCALE } from './types'
import type { Engine, DomRefs } from './types'
import { setText } from '../_host/dom-util'

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

// ─── canvas render functions ─────────────────────────────────────────────────

export function renderField(e: Engine, ctx: CanvasRenderingContext2D) {
  if (!e.offCtx || !e.img) return
  const d = e.img.data
  for (let i = 0; i < e.gw * e.gh; i++) {
    const v = e.heat[i]
    let t = v / TMAX_SCALE
    if (t < 0) t = 0
    if (t > 1) t = 1
    t = Math.pow(t, 0.82)
    const idx = (t * 255) | 0
    const o = idx * 3
    const j = i * 4
    d[j] = LUT[o]
    d[j + 1] = LUT[o + 1]
    d[j + 2] = LUT[o + 2]
    d[j + 3] = 255
  }
  e.offCtx.putImageData(e.img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (e.off) ctx.drawImage(e.off, 0, 0, e.gw, e.gh, 0, 0, e.sw, e.sh)
}

function drawWelded(e: Engine, ctx: CanvasRenderingContext2D, p: WeldProgram, wf: number, width: number, color: string) {
  const n = Math.max(8, Math.round(wf * 220))
  const stitch = p.path === 'stitch'
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.beginPath()
  let pen = false
  for (let i = 0; i <= n; i++) {
    const u = (wf * i) / n
    const on = !stitch || stitchOn(u)
    const point = pathPointDraw(e, p, u)
    const x = (point.x / e.gw) * e.sw
    const y = (point.y / e.gh) * e.sh
    if (on) {
      if (!pen) {
        ctx.moveTo(x, y)
        pen = true
      } else {
        ctx.lineTo(x, y)
      }
    } else {
      pen = false
    }
  }
  ctx.stroke()
}

/** Local pathPoint for draw functions — mirrors runtime.pathPoint without cross-import. */
function pathPointDraw(e: Engine, p: WeldProgram, u: number) {
  const cx = e.gw * 0.50
  const cy = e.gh * 0.52
  const halfW = e.gw * 0.30
  switch (p.path) {
    case 'line':
      return { x: cx + (u * 2 - 1) * halfW, y: cy }
    case 'curve': {
      const x = cx + (u * 2 - 1) * halfW
      const y = cy + Math.sin(u * Math.PI * 3) * e.gh * 0.16
      return { x, y }
    }
    case 'stitch':
      return { x: cx + (u * 2 - 1) * halfW, y: cy }
    case 'contour': {
      const w = e.gw * 0.30
      const h = e.gh * 0.30
      const r = Math.min(w, h) * 0.34
      return roundedRectPoint(cx, cy, w, h, r, u)
    }
  }
}

export function renderPath(e: Engine, ctx: CanvasRenderingContext2D) {
  const p = PROGRAMS[e.activePass]
  const n = 200
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.setLineDash([5, 7])
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(150,225,255,0.16)'
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const point = pathPointDraw(e, p, i / n)
    const x = (point.x / e.gw) * e.sw
    const y = (point.y / e.gh) * e.sh
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.stroke()
  ctx.setLineDash([])

  const wf = e.arc.beadProgress
  if (wf > 0.002 && e.arc.power > 0.001) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    drawWelded(e, ctx, p, wf, 5.5, 'rgba(255,140,55,0.10)')
    drawWelded(e, ctx, p, wf, 1.8, 'rgba(255,206,140,0.50)')
  }
  ctx.restore()
}

export function renderBead(e: Engine, ctx: CanvasRenderingContext2D, now: number) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < e.bead.length; i++) {
    const b = e.bead[i]
    const age = (now - b.born) / 1000
    const h = Math.max(0, 1 - age / 3.2)
    b.heat = h
    const rr = b.r * (1 + 0.04 * Math.sin(now * 0.01 + i))
    const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr)
    if (h > 0.78) {
      grad.addColorStop(0, 'rgba(245,250,255,' + 0.55 * h + ')')
      grad.addColorStop(0.4, 'rgba(255,210,130,' + 0.5 * h + ')')
    } else {
      grad.addColorStop(0, 'rgba(255,180,90,' + 0.42 * h + ')')
      grad.addColorStop(0.4, 'rgba(210,90,34,' + 0.38 * h + ')')
    }
    grad.addColorStop(1, 'rgba(110,28,8,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(b.x, b.y, rr, 0, 7)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.restore()
}

function updatePlume(e: Engine, ctx: CanvasRenderingContext2D, dts: number) {
  for (let i = e.plume.length - 1; i >= 0; i--) {
    const particle = e.plume[i]
    particle.age += dts
    if (particle.age >= particle.life) {
      e.plume.splice(i, 1)
      continue
    }
    const a = 1 - particle.age / particle.life
    particle.y -= 40 * dts
    particle.r += 18 * dts
    const grad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.r)
    grad.addColorStop(0, 'rgba(200,230,255,' + 0.18 * a + ')')
    grad.addColorStop(1, 'rgba(140,180,220,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r, 0, 7)
    ctx.fill()
  }
}

function updateSpatter(e: Engine, ctx: CanvasRenderingContext2D, dts: number) {
  for (let i = e.spatter.length - 1; i >= 0; i--) {
    const particle = e.spatter[i]
    particle.age += dts
    if (particle.age >= particle.life) {
      e.spatter.splice(i, 1)
      continue
    }
    particle.vy += 220 * dts
    particle.x += particle.vx * dts
    particle.y += particle.vy * dts
    const a = 1 - particle.age / particle.life
    ctx.fillStyle = 'rgba(255,' + ((170 + 60 * a) | 0) + ',90,' + 0.7 * a + ')'
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.r * (0.6 + 0.4 * a), 0, 7)
    ctx.fill()
  }
}

export function renderArc(e: Engine, ctx: CanvasRenderingContext2D, now: number, dts: number) {
  const p = PROGRAMS[e.activePass]
  const sx = (e.arc.gx / e.gw) * e.sw
  const sy = (e.arc.gy / e.gh) * e.sh
  const emitting = e.arc.power > 0.001

  if (emitting) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const intensity = Math.max(0.05, e.arc.pulse) * e.arc.power
    const headY = sy - 220
    const topHalf = p.regime === 'keyhole' ? 5 : 8
    const grad = ctx.createLinearGradient(sx, headY, sx, sy)
    grad.addColorStop(0, 'rgba(120,225,255,0)')
    grad.addColorStop(0.55, 'rgba(150,230,255,' + 0.10 * intensity + ')')
    grad.addColorStop(1, 'rgba(210,245,255,' + 0.42 * intensity + ')')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(sx - topHalf, headY)
    ctx.lineTo(sx + topHalf, headY)
    ctx.lineTo(sx + 1.5, sy)
    ctx.lineTo(sx - 1.5, sy)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  if (e.arc.pulse > 0.02) {
    const intensity = e.arc.pulse * Math.min(1.1, e.arc.power)
    const keyhole = p.regime === 'keyhole'
    const radius = (keyhole ? 30 : 40) * (0.7 + 0.5 * intensity)
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius)
    grad.addColorStop(0, 'rgba(225,248,255,' + 0.95 * intensity + ')')
    grad.addColorStop(0.14, 'rgba(170,235,255,' + 0.80 * intensity + ')')
    grad.addColorStop(0.44, 'rgba(255,170,70,' + 0.30 * intensity + ')')
    grad.addColorStop(1, 'rgba(255,90,18,0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(sx, sy, radius, 0, 7)
    ctx.fill()

    ctx.fillStyle = 'rgba(235,250,255,' + 0.9 * intensity + ')'
    ctx.beginPath()
    ctx.arc(sx, sy, (keyhole ? 2.4 : 3.4) * (0.7 + 0.6 * intensity), 0, 7)
    ctx.fill()

    if (keyhole) {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(60,18,6,' + 0.5 * intensity + ')'
      ctx.beginPath()
      ctx.ellipse(sx, sy, 2.2 * intensity + 0.6, 4.0 * intensity + 1.0, 0, 0, 7)
      ctx.fill()
      ctx.globalCompositeOperation = 'lighter'
      ctx.strokeStyle = 'rgba(255,200,120,' + 0.6 * intensity + ')'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(sx, sy, 2.4 * intensity + 0.8, 4.2 * intensity + 1.2, 0, 0, 7)
      ctx.stroke()
    }
  }

  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = 'rgba(18,22,26,0.92)'
  ctx.beginPath()
  ctx.moveTo(sx - 14, sy - 150)
  ctx.lineTo(sx + 14, sy - 150)
  ctx.lineTo(sx + 5, sy - 18)
  ctx.lineTo(sx - 5, sy - 18)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,140,150,0.5)'
  ctx.lineWidth = 1.0
  ctx.beginPath()
  ctx.moveTo(sx - 14, sy - 150)
  ctx.lineTo(sx - 5, sy - 18)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(sx + 14, sy - 150)
  ctx.lineTo(sx + 5, sy - 18)
  ctx.stroke()
  ctx.fillStyle = 'rgba(40,48,54,0.95)'
  ctx.fillRect(sx - 6, sy - 18, 12, 6)

  ctx.globalCompositeOperation = 'lighter'
  updatePlume(e, ctx, dts)
  updateSpatter(e, ctx, dts)
  ctx.globalCompositeOperation = 'source-over'
}

export function renderThermal(e: Engine, refs: DomRefs) {
  const cv = refs.thermCv
  const ctx = cv?.getContext('2d')
  if (!cv || !ctx || e.gw === 0 || e.gh === 0) return

  const tw = cv.width
  const th = cv.height
  if (!e.thermalImg || e.thermalW !== tw || e.thermalH !== th) {
    e.thermalImg = ctx.createImageData(tw, th)
    e.thermalW = tw
    e.thermalH = th
  }

  const d = e.thermalImg.data
  let peak = 0
  for (let yy = 0; yy < th; yy++) {
    const gy = ((yy / th) * e.gh) | 0
    for (let xx = 0; xx < tw; xx++) {
      const gx = ((xx / tw) * e.gw) | 0
      const v = e.heat[gy * e.gw + gx]
      if (v > peak) peak = v
      let t = v / TMAX_SCALE
      if (t < 0) t = 0
      if (t > 1) t = 1
      t = Math.pow(t, 0.8)
      const idx = (t * 255) | 0
      const o = idx * 3
      const j = (yy * tw + xx) * 4
      d[j] = LUT[o]
      d[j + 1] = LUT[o + 1]
      d[j + 2] = LUT[o + 2]
      d[j + 3] = 255
    }
  }
  ctx.putImageData(e.thermalImg, 0, 0)
  setText(refs.thPeak, Math.round(peak) + 'C')
  setText(refs.thHaz, peak > 2100 ? 'WATCH' : 'OK')
}
