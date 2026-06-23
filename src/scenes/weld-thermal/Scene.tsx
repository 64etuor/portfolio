'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { setText } from '../_host/dom-util'
import type { Frame, SceneProps } from '../_host/types'
import { LUT, PROGRAMS, type WeldProgram } from './data'
import s from './scene.module.css'
import {
  GRID_TARGET, AMB, TMAX_SCALE,
  STITCH_N, STITCH_DUTY,
  STRIKE_SECS, CRATER_SECS, RESET_SECS, TRAVEL_SPEEDUP,
  paramKeys,
  type ArcPhase, type ParamKey, type ParamTrack,
  type BeadSpot, type Spatter, type Plume,
  type ArcState, type Engine, type DomRefs,
} from './types'
import { pad, arcPt, roundedRectPoint, stitchOn } from './draw'

/* Nd:YAG LASER WELDER — weld-thermal.html 이식.
   하네스가 resize/DPR/rAF 를 소유하고, 이 컴포넌트는 원본 frame 본문과 HUD DOM만 유지한다. */

function createEngine(): Engine {
  return {
    sw: 0,
    sh: 0,
    gw: 0,
    gh: 0,
    heat: new Float32Array(0),
    heat2: new Float32Array(0),
    off: null,
    offCtx: null,
    img: null,
    thermalImg: null,
    thermalW: 0,
    thermalH: 0,
    mouseX: -1,
    mouseY: -1,
    mouseInside: false,
    activePass: 0,
    passNo: 1,
    arc: {
      gx: 0,
      gy: 0,
      power: 0,
      pulse: 0,
      phase: 'reset',
      t: 0,
      beadProgress: 0,
      beadMM: 0,
      runSecs: 5.0,
      arcSeconds: 0,
      pulseClock: 0,
      pulseGate: 0,
    },
    bead: [],
    spatter: [],
    plume: [],
    params: {
      pulseE: { disp: 18, base: 18 },
      peakKW: { disp: 4.5, base: 4.5 },
      prf: { disp: 15, base: 15 },
      pulseMs: { disp: 4.0, base: 4.0 },
      travel: { disp: 8.0, base: 8.0 },
      defocus: { disp: 0.0, base: 0.0 },
    },
    frame: 0,
    lastFps: 0,
    fpsCount: 0,
    initialized: false,
  }
}

function ensureSize(e: Engine, w: number, h: number) {
  if (e.sw === w && e.sh === h && e.offCtx && e.img) return

  e.sw = w
  e.sh = h
  e.gw = GRID_TARGET
  e.gh = Math.max(40, Math.round(GRID_TARGET * (h / Math.max(1, w))))
  e.heat = new Float32Array(e.gw * e.gh).fill(AMB)
  e.heat2 = new Float32Array(e.gw * e.gh).fill(AMB)

  e.off = document.createElement('canvas')
  e.off.width = e.gw
  e.off.height = e.gh
  e.offCtx = e.off.getContext('2d')
  e.img = e.offCtx?.createImageData(e.gw, e.gh) ?? null
}

function pathPoint(e: Engine, p: WeldProgram, u: number) {
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

function inject(e: Engine, cx: number, cy: number, radius: number, amount: number) {
  const r2 = radius * radius
  const x0 = Math.max(0, (cx - radius) | 0)
  const x1 = Math.min(e.gw - 1, (cx + radius) | 0)
  const y0 = Math.max(0, (cy - radius) | 0)
  const y1 = Math.min(e.gh - 1, (cy + radius) | 0)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const f = Math.exp(-d2 / (r2 * 0.4))
      const i = y * e.gw + x
      e.heat[i] = Math.min(TMAX_SCALE + 200, e.heat[i] + amount * f)
    }
  }
}

function setActive(e: Engine, index: number, refs: DomRefs) {
  e.activePass = index
  refs.passEls.forEach((el, j) => {
    el.classList.toggle(s.active, j === index)
  })
  if (refs.detailTxt) refs.detailTxt.innerHTML = PROGRAMS[index].desc
}

function retuneParams(e: Engine, p: WeldProgram, refs: DomRefs) {
  e.params.pulseE.base = p.pulseE
  e.params.peakKW.base = p.peakKW
  e.params.prf.base = p.prf
  e.params.pulseMs.base = p.pulseMs
  e.params.travel.base = p.travel
  e.params.defocus.base = p.defocus
  setText(refs.mtSpatter, p.spatter)
}

function beginPass(e: Engine, index: number, refs: DomRefs) {
  const p = PROGRAMS[index]
  e.activePass = index
  e.arc.runSecs = Math.max(3.2, Math.min(7.5, p.seamMM / (p.travel * TRAVEL_SPEEDUP)))
  const start = pathPoint(e, p, 0)
  e.arc.gx = start.x
  e.arc.gy = start.y
  e.arc.beadProgress = 0
  e.arc.beadMM = 0
  e.arc.arcSeconds = 0
  e.arc.pulseClock = 0
  e.arc.pulseGate = 0
  e.bead = []

  setActive(e, index, refs)
  setText(
    refs.modeTxt,
    p.regime === 'conduction' ? 'PULSED · COND' : p.regime === 'keyhole' ? 'PULSED · KEYHOLE' : p.regime === 'seam' ? 'PULSED · SEAM' : 'PULSED · DOE'
  )
  setText(refs.fiberTxt, 'Ø' + p.fiber + ' µm')
  setText(refs.gasTxt, p.gas)
  setText(refs.focal, p.focal)
  setText(refs.spotDia, 'Ø' + p.spotMM.toFixed(2))
  setText(refs.passNo, e.passNo)
  if (refs.modeChip) {
    refs.modeChip.textContent = p.regime === 'keyhole' ? 'KEYHOLE' : p.regime === 'conduction' ? 'CONDUCTION' : p.regime === 'seam' ? 'SEAM/OVERLAP' : 'DOE WINDOW'
    refs.modeChip.classList.toggle(s.keyhole, p.regime === 'keyhole')
  }
  retuneParams(e, p, refs)
}

function advancePass(e: Engine, refs: DomRefs) {
  const next = (e.activePass + 1) % PROGRAMS.length
  if (next === 0) e.passNo++
  beginPass(e, next, refs)
}

function depositSpot(e: Engine, now: number, p: WeldProgram, env: number) {
  const sx = (e.arc.gx / e.gw) * e.sw
  const sy = (e.arc.gy / e.gh) * e.sh
  const keyhole = p.regime === 'keyhole'
  const r = keyhole ? 4 : 7
  const amount = keyhole ? 360 * env : 150 * env
  inject(e, e.arc.gx, e.arc.gy, r, amount)
  if (keyhole) inject(e, e.arc.gx, e.arc.gy, 2, 520 * env)

  const spotR = (p.beadW / 2) / 6 * 0 + (keyhole ? 6.5 : 8.5) + Math.random() * 1.4
  e.bead.push({ x: sx, y: sy, r: spotR, born: now, heat: 1.0, keyhole })

  const rate = keyhole ? 0.45 : p.regime === 'seam' ? 0.25 : 0.12
  if (Math.random() < rate) {
    const n = 1 + (Math.random() < 0.25 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.2
      const spd = 50 + Math.random() * 70
      e.spatter.push({
        x: sx,
        y: sy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 25,
        life: 0.4 + Math.random() * 0.35,
        age: 0,
        r: 0.8 + Math.random() * 0.7,
      })
    }
  }

  if (keyhole && Math.random() < 0.6) {
    e.plume.push({ x: sx, y: sy - 2, r: 3 + Math.random() * 3, age: 0, life: 0.45 + Math.random() * 0.3 })
  }
}

function arcUpdate(e: Engine, now: number, dtFrames: number, refs: DomRefs) {
  const p = PROGRAMS[e.activePass]
  const dts = dtFrames / 60
  e.arc.t += dts

  const period = 1 / Math.max(1, p.prf)
  const onWin = Math.min(period * 0.85, p.pulseMs / 1000)
  let pulseFired = false
  if (e.arc.phase === 'strike' || e.arc.phase === 'run' || e.arc.phase === 'crater') {
    e.arc.pulseClock += dts
    if (e.arc.pulseClock >= period) {
      e.arc.pulseClock -= period
      e.arc.pulseGate = onWin
      pulseFired = true
    }
    if (e.arc.pulseGate > 0) {
      e.arc.pulseGate -= dts
      const fOn = 1 - Math.max(0, e.arc.pulseGate) / onWin
      e.arc.pulse = Math.sin(Math.min(Math.PI, fOn * Math.PI))
    } else {
      e.arc.pulse *= 0.55
      if (e.arc.pulse < 0.02) e.arc.pulse = 0
    }
  } else {
    e.arc.pulse = 0
  }

  const canDeposit = p.path !== 'stitch' || stitchOn(e.arc.beadProgress)

  if (e.arc.phase === 'reset') {
    e.arc.power = 0
    const start = pathPoint(e, p, 0)
    e.arc.gx = start.x
    e.arc.gy = start.y
    if (e.arc.t >= RESET_SECS) {
      e.arc.phase = 'strike'
      e.arc.t = 0
    }
  } else if (e.arc.phase === 'strike') {
    const f = Math.min(1, e.arc.t / STRIKE_SECS)
    e.arc.power = 0.40 + 0.60 * f
    const start = pathPoint(e, p, 0)
    e.arc.gx = start.x
    e.arc.gy = start.y
    if (pulseFired) depositSpot(e, now, p, e.arc.power)
    if (e.arc.t >= STRIKE_SECS) {
      e.arc.phase = 'run'
      e.arc.t = 0
    }
  } else if (e.arc.phase === 'run') {
    e.arc.arcSeconds += dts
    e.arc.beadProgress = Math.min(1, e.arc.t / e.arc.runSecs)
    const pt = pathPoint(e, p, e.arc.beadProgress)
    e.arc.gx = pt.x
    e.arc.gy = pt.y
    e.arc.power = 0.94 + 0.05 * Math.sin(now * 0.02)
    if (pulseFired && canDeposit) depositSpot(e, now, p, e.arc.power)
    e.arc.beadMM = Math.round(e.arc.beadProgress * p.seamMM)
    if (e.arc.t >= e.arc.runSecs) {
      e.arc.phase = 'crater'
      e.arc.t = 0
    }
  } else if (e.arc.phase === 'crater') {
    const f = Math.min(1, e.arc.t / CRATER_SECS)
    const end = pathPoint(e, p, 1)
    e.arc.gx = end.x
    e.arc.gy = end.y
    e.arc.power = 1.0 - f * 0.85
    if (pulseFired) depositSpot(e, now, p, e.arc.power)
    if (e.arc.t >= CRATER_SECS) {
      e.arc.phase = 'reset'
      e.arc.t = 0
      e.arc.power = 0
      e.arc.pulse = 0
      advancePass(e, refs)
      return
    }
  }

  if (e.mouseInside) {
    const mgx = (e.mouseX / e.sw) * e.gw
    const mgy = (e.mouseY / e.sh) * e.gh
    inject(e, mgx, mgy, 7, 90 * Math.max(0.25, e.arc.pulse))
  }
}

function simulate(e: Engine, dtFrames: number) {
  const k = Math.min(0.18, 0.135 * dtFrames)
  const cool = Math.min(0.013, 0.0090 * dtFrames)
  for (let y = 0; y < e.gh; y++) {
    const yu = (y > 0 ? y - 1 : 0) * e.gw
    const yd = (y < e.gh - 1 ? y + 1 : e.gh - 1) * e.gw
    const yc = y * e.gw
    for (let x = 0; x < e.gw; x++) {
      const xl = x > 0 ? x - 1 : 0
      const xr = x < e.gw - 1 ? x + 1 : e.gw - 1
      const c = e.heat[yc + x]
      const lap = e.heat[yc + xl] + e.heat[yc + xr] + e.heat[yu + x] + e.heat[yd + x] - 4 * c
      let v = c + k * lap
      v = v + (AMB - v) * cool
      e.heat2[yc + x] = v
    }
  }
  const tmp = e.heat
  e.heat = e.heat2
  e.heat2 = tmp
}

function renderField(e: Engine, ctx: CanvasRenderingContext2D) {
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
    const point = pathPoint(e, p, u)
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

function renderPath(e: Engine, ctx: CanvasRenderingContext2D) {
  const p = PROGRAMS[e.activePass]
  const n = 200
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.setLineDash([5, 7])
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(150,225,255,0.16)'
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const point = pathPoint(e, p, i / n)
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

function renderBead(e: Engine, ctx: CanvasRenderingContext2D, now: number) {
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

function renderArc(e: Engine, ctx: CanvasRenderingContext2D, now: number, dts: number) {
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

function renderThermal(e: Engine, refs: DomRefs) {
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

function phaseLabel(e: Engine): [string, number] {
  switch (e.arc.phase) {
    case 'reset':
      return ['RE-INDEX', 0.0]
    case 'strike':
      return ['SHUTTER OPEN', Math.min(1, e.arc.t / STRIKE_SECS) * 0.18]
    case 'run':
      return ['EMIT · TRAIN', 0.18 + e.arc.beadProgress * 0.72]
    case 'crater':
      return ['POWER TAPER', 0.90 + Math.min(1, e.arc.t / CRATER_SECS) * 0.10]
  }
}

function updateHUD(e: Engine, refs: DomRefs) {
  setText(refs.frame, pad(e.frame, 6))
  const d = new Date()
  setText(refs.clock, pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2) + '.' + pad((d.getMilliseconds() / 10) | 0, 2))

  const sx = (e.arc.gx / e.gw) * e.sw
  const sy = (e.arc.gy / e.gh) * e.sh
  if (refs.cross) {
    refs.cross.style.left = sx + 'px'
    refs.cross.style.top = sy + 'px'
  }

  const gi = Math.max(0, Math.min(e.gw * e.gh - 1, Math.round(e.arc.gy) * e.gw + Math.round(e.arc.gx)))
  const mi = Math.max(0, Math.min(e.gw * e.gh - 1, Math.round((e.mouseY / e.sh) * e.gh) * e.gw + Math.round((e.mouseX / e.sw) * e.gw)))
  const spotT = e.mouseInside ? e.heat[mi] : e.heat[gi]
  setText(refs.spotTemp, Math.round(spotT) + 'C')
  setText(refs.spotName, e.mouseInside ? 'BEAM' : e.arc.phase === 'run' ? (PROGRAMS[e.activePass].regime === 'keyhole' ? 'KEYHOLE' : 'MELT POOL') : e.arc.phase === 'crater' ? 'CRATER' : 'FOCUS')
  if (e.mouseInside && refs.cross) {
    refs.cross.style.left = e.mouseX + 'px'
    refs.cross.style.top = e.mouseY + 'px'
  }

  setText(refs.laserOn, e.arc.phase === 'reset' ? 'SHUTTER CLOSED' : 'LASER ON')
  const [label, frac] = phaseLabel(e)
  setText(refs.arcPhase, label)
  if (refs.arcBar) refs.arcBar.style.width = (frac * 100).toFixed(0) + '%'
}

function updateParams(e: Engine, dtFrames: number, refs: DomRefs) {
  const lerpK = 1 - Math.pow(0.04, dtFrames / 60)
  const live = e.arc.phase === 'run' || e.arc.phase === 'strike' || e.arc.phase === 'crater'
  for (const key of paramKeys) {
    const track = e.params[key]
    const target = key === 'peakKW' ? (live ? track.base : 0) : track.base
    track.disp += (target - track.disp) * lerpK
  }
  const p = PROGRAMS[e.activePass]

  setText(refs.gPe, e.params.pulseE.disp.toFixed(1))
  setText(refs.gPk, e.params.peakKW.disp.toFixed(1))
  const avgW = live ? Math.round(e.params.pulseE.disp * e.params.prf.disp) : 0
  setText(refs.gAvg, avgW)
  const duty = (e.params.pulseMs.disp * e.params.prf.disp) / 1000 * 100
  setText(refs.duty, duty.toFixed(0) + '%')

  setText(refs.mtPrf, Math.round(e.params.prf.disp) + ' Hz')
  setText(refs.mtPw, e.params.pulseMs.disp.toFixed(1) + ' ms')
  setText(refs.mtTravel, e.params.travel.disp.toFixed(1) + ' mm/s')
  const dfc = e.params.defocus.disp
  setText(refs.mtDefocus, (dfc >= 0 ? '+' : '') + dfc.toFixed(1) + ' mm')

  const spotMM = p.spotMM
  const areaCM2 = Math.PI * Math.pow(spotMM / 2 / 10, 2)
  const pdens = (e.params.peakKW.disp * 1000) / Math.max(1e-6, areaCM2)
  const pdStr = live ? pdens.toExponential(1).replace('e+', 'e') : '0'
  setText(refs.pdens, pdStr + ' W/cm²')

  const pulseLift = 0.86 + 0.14 * e.arc.pulse
  const penet = live ? p.penet * pulseLift : 0
  const beadW = live ? p.beadW * (0.95 + 0.05 * e.arc.pulse) : 0
  setText(refs.penet, penet.toFixed(2) + ' mm')
  setText(refs.beadw, beadW.toFixed(2) + ' mm')
  setText(refs.aspect, (penet / Math.max(0.01, beadW)).toFixed(1) + ' : 1')

  const pitch = e.params.travel.disp / Math.max(1, e.params.prf.disp)
  const overlap = Math.max(0, Math.min(99, (1 - pitch / p.spotMM) * 100))
  setText(refs.mtPitch, live ? pitch.toFixed(2) + 'mm · ' + overlap.toFixed(0) + '%' : '—')
  setText(refs.mtBead, e.arc.beadMM + ' mm')
  setText(refs.arcTime, e.arc.arcSeconds.toFixed(1) + 's')
}

function bootstrap(e: Engine, refs: DomRefs) {
  beginPass(e, e.activePass, refs)
  e.arc.phase = 'reset'
  e.arc.t = 0
  for (let i = 0; i < 6; i++) simulate(e, 1)
  e.initialized = true
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const engineRef = useRef<Engine>(createEngine())

  const modeTxtRef = useRef<HTMLSpanElement | null>(null)
  const fiberTxtRef = useRef<HTMLSpanElement | null>(null)
  const gasTxtRef = useRef<HTMLSpanElement | null>(null)
  const focalRef = useRef<HTMLSpanElement | null>(null)
  const spotDiaRef = useRef<HTMLSpanElement | null>(null)
  const passNoRef = useRef<HTMLSpanElement | null>(null)
  const modeChipRef = useRef<HTMLSpanElement | null>(null)
  const mtSpatterRef = useRef<HTMLSpanElement | null>(null)
  const gPeRef = useRef<HTMLSpanElement | null>(null)
  const gPkRef = useRef<HTMLSpanElement | null>(null)
  const gAvgRef = useRef<HTMLSpanElement | null>(null)
  const dutyRef = useRef<HTMLSpanElement | null>(null)
  const pdensRef = useRef<HTMLSpanElement | null>(null)
  const penetRef = useRef<HTMLSpanElement | null>(null)
  const beadwRef = useRef<HTMLSpanElement | null>(null)
  const aspectRef = useRef<HTMLSpanElement | null>(null)
  const mtPrfRef = useRef<HTMLSpanElement | null>(null)
  const mtPwRef = useRef<HTMLSpanElement | null>(null)
  const mtTravelRef = useRef<HTMLSpanElement | null>(null)
  const mtDefocusRef = useRef<HTMLSpanElement | null>(null)
  const mtPitchRef = useRef<HTMLSpanElement | null>(null)
  const mtBeadRef = useRef<HTMLSpanElement | null>(null)
  const arcTimeRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef<HTMLSpanElement | null>(null)
  const fpsRef = useRef<HTMLSpanElement | null>(null)
  const clockRef = useRef<HTMLElement | null>(null)
  const crossRef = useRef<HTMLDivElement | null>(null)
  const spotTempRef = useRef<HTMLSpanElement | null>(null)
  const spotNameRef = useRef<HTMLSpanElement | null>(null)
  const laserOnRef = useRef<HTMLSpanElement | null>(null)
  const arcPhaseRef = useRef<HTMLSpanElement | null>(null)
  const arcBarRef = useRef<HTMLElement | null>(null)
  const thPeakRef = useRef<HTMLElement | null>(null)
  const thHazRef = useRef<HTMLElement | null>(null)
  const thermCvRef = useRef<HTMLCanvasElement | null>(null)
  const detailTxtRef = useRef<HTMLDivElement | null>(null)
  const passRefs = useRef<HTMLDivElement[]>([])

  const domRefs = (): DomRefs => ({
    modeTxt: modeTxtRef.current,
    fiberTxt: fiberTxtRef.current,
    gasTxt: gasTxtRef.current,
    focal: focalRef.current,
    spotDia: spotDiaRef.current,
    passNo: passNoRef.current,
    modeChip: modeChipRef.current,
    mtSpatter: mtSpatterRef.current,
    gPe: gPeRef.current,
    gPk: gPkRef.current,
    gAvg: gAvgRef.current,
    duty: dutyRef.current,
    pdens: pdensRef.current,
    penet: penetRef.current,
    beadw: beadwRef.current,
    aspect: aspectRef.current,
    mtPrf: mtPrfRef.current,
    mtPw: mtPwRef.current,
    mtTravel: mtTravelRef.current,
    mtDefocus: mtDefocusRef.current,
    mtPitch: mtPitchRef.current,
    mtBead: mtBeadRef.current,
    arcTime: arcTimeRef.current,
    frame: frameRef.current,
    fps: fpsRef.current,
    clock: clockRef.current,
    cross: crossRef.current,
    spotTemp: spotTempRef.current,
    spotName: spotNameRef.current,
    laserOn: laserOnRef.current,
    arcPhase: arcPhaseRef.current,
    arcBar: arcBarRef.current,
    thPeak: thPeakRef.current,
    thHaz: thHazRef.current,
    thermCv: thermCvRef.current,
    detailTxt: detailTxtRef.current,
    passEls: passRefs.current,
  })

  useSceneReady(onReady)

  useEffect(() => {
    const engine = engineRef.current
    const onMove = (event: PointerEvent) => {
      engine.mouseX = event.clientX
      engine.mouseY = event.clientY
      engine.mouseInside = true
    }
    const onLeave = () => {
      engine.mouseInside = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const jumpTo = (index: number) => {
    const engine = engineRef.current
    const refs = domRefs()
    if (engine.gw > 0 && engine.gh > 0) beginPass(engine, index, refs)
    else engine.activePass = index
    engine.arc.phase = 'reset'
    engine.arc.t = 0
  }

  const nudgeProgram = () => {
    const engine = engineRef.current
    if (engine.gw > 0 && engine.gh > 0) advancePass(engine, domRefs())
    engine.arc.phase = 'reset'
    engine.arc.t = 0
  }

  const ref = useSceneCanvas((ctx: CanvasRenderingContext2D, fr: Frame) => {
    const engine = engineRef.current
    const refs = domRefs()
    ensureSize(engine, fr.w, fr.h)
    if (!engine.initialized) bootstrap(engine, refs)

    const now = fr.t * 1000
    const dtFrames = fr.dt * 60
    const dts = dtFrames / 60
    engine.frame++

    arcUpdate(engine, now, dtFrames, refs)
    simulate(engine, dtFrames)

    renderField(engine, ctx)
    renderPath(engine, ctx)
    renderBead(engine, ctx, now)
    renderArc(engine, ctx, now, dts)
    renderThermal(engine, refs)
    updateHUD(engine, refs)
    updateParams(engine, dtFrames, refs)

    engine.fpsCount++
    if (now - engine.lastFps > 500) {
      setText(refs.fps, Math.round((engine.fpsCount * 1000) / (now - engine.lastFps)))
      engine.fpsCount = 0
      engine.lastFps = now
    }
  }, { running })

  return (
    <SceneHost className={`${s.stage} ${s.nosel}`} bg="#000">
      <canvas ref={ref} className={s.c} />
      <div className={s.vig} />
      <div className={s.grain} />

      <div className={`${s.bracket} ${s.bTl}`} />
      <div className={`${s.bracket} ${s.bTr}`} />
      <div className={`${s.bracket} ${s.bBl}`} />
      <div className={`${s.bracket} ${s.bBr}`} />

      <div className={`${s.hud} ${s.tl}`}>
        <div className={s.l4}>
          <span className={s.gd} />
          <span className={s.em}>&#9888;</span> CLASS 4 · <span ref={laserOnRef}>LASER ON</span> · IPL INTERLOCK
        </div>
        <div className={s.rec} style={{ marginTop: 8 }}>
          <span className={s.dot} />
          LASER . LIVE
        </div>
        <div className={s.row}>
          <span className={s.k}>SOURCE</span>
          <b>Nd:YAG 1064nm</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>MODE</span>
          <b ref={modeTxtRef}>PULSED</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>FIBER</span>
          <b ref={fiberTxtRef}>Ø400 µm</b>
        </div>
        <div className={s.row}>
          <span className={s.k}>GAS</span>
          <b ref={gasTxtRef}>Ar 15 L/min</b>
        </div>
      </div>

      <div className={`${s.hud} ${s.tr}`}>
        <div className={s.big}>LASER WELDER . LW-300 Nd:YAG</div>
        <div>
          <span className={s.lbl}>FOCAL</span> <b ref={focalRef}>f160</b> &nbsp; <span className={s.lbl}>SPOT</span> <b ref={spotDiaRef}>Ø0.40</b>
        </div>
        <div>
          <span className={s.lbl}>FPS</span> <b ref={fpsRef}>60</b> &nbsp; <span className={s.lbl}>FRAME</span> <b ref={frameRef}>000000</b>
        </div>
        <div>
          <span className={s.lbl}>EMIT</span> <b ref={arcTimeRef}>0.0s</b> &nbsp; <span className={s.lbl}>SEAM</span> <b ref={passNoRef}>1</b>
        </div>
      </div>

      <div className={s.meters}>
        <div className={`${s.gauge} ${s.pe}`}>
          <div className={s.lab}>PULSE E</div>
          <div className={s.val}>
            <span ref={gPeRef}>18.0</span>
            <span className={s.u}>J</span>
          </div>
        </div>
        <div className={`${s.gauge} ${s.pk}`}>
          <div className={s.lab}>PEAK PWR</div>
          <div className={s.val}>
            <span ref={gPkRef}>4.5</span>
            <span className={s.u}>kW</span>
          </div>
        </div>
        <div className={`${s.gauge} ${s.avg}`}>
          <div className={s.lab}>AVG PWR</div>
          <div className={s.val}>
            <span ref={gAvgRef}>270</span>
            <span className={s.u}>W</span>
          </div>
        </div>
      </div>

      <div className={s.arcstate}>
        <span className={s.lbl}>PULSE</span> <span className={s.ph} ref={arcPhaseRef}>SHUTTER</span>
        <span className={s.bar}><i ref={arcBarRef} /></span>
        <span className={s.modechip} ref={modeChipRef}>CONDUCTION</span>
      </div>

      <div className={`${s.hud} ${s.stats}`}>
        <div>
          POWER DENSITY <span className={`${s.v} ${s.vmax}`} ref={pdensRef}>1.6e6 W/cm²</span>
        </div>
        <div>
          PENETRATION <span className={s.v} ref={penetRef}>0.8 mm</span> &nbsp; <span className={s.lbl}>W</span> <span className={s.v} ref={beadwRef}>0.9 mm</span>
        </div>
        <div>
          ASPECT <span className={`${s.v} ${s.vmin}`} ref={aspectRef}>0.9 : 1</span> &nbsp; <span className={s.lbl}>DUTY</span> <span className={s.v} ref={dutyRef}>6%</span>
        </div>
      </div>

      <div className={`${s.hud} ${s.br}`}>
        <div>
          <b ref={clockRef}>--:--:--.--</b>
        </div>
        <div>
          <span className={s.lbl}>CELL</span> <b>LASER WELD / Nd:YAG · 정밀 접합</b>
        </div>
        <div>
          <span className={s.lbl}>CTRL</span> <b>CNC-AUTO</b> &nbsp; <span className={s.lbl}>UNIT</span> <b>LWPS-07</b>
        </div>
      </div>

      <div className={s.crosshair} ref={crossRef}>
        <div className={s.h} />
        <div className={s.vLine} />
        <div className={s.ring} />
        <div className={s.spotlbl}>
          <span className={s.t} ref={spotTempRef}>1620C</span>
          <br />
          <span className={s.lbl} ref={spotNameRef}>MELT POOL</span>
        </div>
      </div>

      <div className={s.doe}>
        <div className={s.doebtn} onClick={nudgeProgram}>
          &#9654; <span className={s.blink}>SEQ</span> 전도형 → 키홀 → 심·중첩 → DOE 프로그램 순환
        </div>
        <div className={s.doestate} />
      </div>

      <div className={s.thermbox}>
        <div className={s.cap}>THERMAL · MELT/HAZ MONITOR</div>
        <canvas className={s.thermcv} ref={thermCvRef} width={188} height={112} />
        <div className={s.rd}>
          T<sub>peak</sub> <b ref={thPeakRef}>1620C</b> &nbsp; HAZ <b ref={thHazRef}>OK</b>
        </div>
      </div>

      <div className={s.identity}>
        <div className={s.ey}>Nd:YAG PULSED LASER WELDER · 1064nm</div>
        <h1>
          LW-300<span className={s.sub}>Nd:YAG 1064nm 펄스 발진 · 전도형 / 키홀 / 심 · 패턴 용접</span>
        </h1>
        <div className={s.tags}>
          <span>1064nm · 펄스 발진</span>
          <span>전도형 ↔ 키홀 전이</span>
          <span>펄스에너지·PRF·피크출력</span>
          <span>심 용접 · 점 중첩(overlap)</span>
          <span>패턴 경로 드로잉</span>
          <span>디포커스·스폿 제어</span>
        </div>
      </div>

      <div className={s.metrics}>
        <div className={s.m}><span className={s.lab}>반복률 PRF &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtPrfRef}>15 Hz</span></div>
        <div className={s.m}><span className={s.lab}>펄스 폭 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtPwRef}>4.0 ms</span></div>
        <div className={s.m}><span className={s.lab}>용접 속도 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtTravelRef}>8.0 mm/s</span></div>
        <div className={s.m}><span className={s.lab}>디포커스 &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtDefocusRef}>0.0 mm</span></div>
        <div className={s.m}><span className={s.lab}>점 피치·중첩 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtPitchRef}>—</span></div>
        <div className={s.m}><span className={s.lab}>심 진행 &nbsp;</span><span className={`${s.num} ${s.up}`} ref={mtBeadRef}>0 mm</span></div>
        <div className={s.m}><span className={s.lab}>스패터 &nbsp;</span><span className={`${s.num} ${s.dn}`} ref={mtSpatterRef}>LOW</span></div>
      </div>

      <div className={s.detail}>
        <div className={s.desc} ref={detailTxtRef} dangerouslySetInnerHTML={{ __html: PROGRAMS[0].desc }} />
      </div>

      <div className={s.passes}>
        {PROGRAMS.map((program, i) => (
          <div
            className={`${s.pass} ${i === 0 ? s.active : ''}`}
            key={program.yr}
            ref={(el) => {
              if (el) passRefs.current[i] = el
            }}
            onClick={() => jumpTo(i)}
          >
            <div className={s.yr}>{program.yr}</div>
            <div className={s.co}>{program.co}</div>
            <div className={s.ro}>{program.ro}</div>
            <div className={s.node} />
          </div>
        ))}
      </div>

      <div className={s.contact} />
    </SceneHost>
  )
}
