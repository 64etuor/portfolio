/* weld-thermal — engine/state: createEngine, simulate, arc, HUD, params */

import { setText } from '../_host/dom-util'
import { PROGRAMS } from './data'
import type { WeldProgram } from './data'
import {
  GRID_TARGET, AMB, TMAX_SCALE,
  STRIKE_SECS, CRATER_SECS, RESET_SECS, TRAVEL_SPEEDUP,
  paramKeys,
  type Engine, type DomRefs,
} from './types'
import { pad, roundedRectPoint, stitchOn } from './draw'
import s from './scene.module.css'

// ─── engine factory ──────────────────────────────────────────────────────────

export function createEngine(): Engine {
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

// ─── size / grid ─────────────────────────────────────────────────────────────

export function ensureSize(e: Engine, w: number, h: number) {
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

// ─── path geometry ───────────────────────────────────────────────────────────

export function pathPoint(e: Engine, p: WeldProgram, u: number) {
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

// ─── heat injection ──────────────────────────────────────────────────────────

export function inject(e: Engine, cx: number, cy: number, radius: number, amount: number) {
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

// ─── pass management ─────────────────────────────────────────────────────────

export function setActive(e: Engine, index: number, refs: DomRefs) {
  e.activePass = index
  refs.passEls.forEach((el, j) => {
    el.classList.toggle(s.active, j === index)
  })
  if (refs.detailTxt) refs.detailTxt.innerHTML = PROGRAMS[index].desc
}

export function retuneParams(e: Engine, p: WeldProgram, refs: DomRefs) {
  e.params.pulseE.base = p.pulseE
  e.params.peakKW.base = p.peakKW
  e.params.prf.base = p.prf
  e.params.pulseMs.base = p.pulseMs
  e.params.travel.base = p.travel
  e.params.defocus.base = p.defocus
  setText(refs.mtSpatter, p.spatter)
}

export function beginPass(e: Engine, index: number, refs: DomRefs) {
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

export function advancePass(e: Engine, refs: DomRefs) {
  const next = (e.activePass + 1) % PROGRAMS.length
  if (next === 0) e.passNo++
  beginPass(e, next, refs)
}

// ─── deposit / particles ─────────────────────────────────────────────────────

export function depositSpot(e: Engine, now: number, p: WeldProgram, env: number) {
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

// ─── arc state machine ───────────────────────────────────────────────────────

export function arcUpdate(e: Engine, now: number, dtFrames: number, refs: DomRefs) {
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

// ─── thermal diffusion ───────────────────────────────────────────────────────

export function simulate(e: Engine, dtFrames: number) {
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

// ─── bootstrap ───────────────────────────────────────────────────────────────

export function bootstrap(e: Engine, refs: DomRefs) {
  beginPass(e, e.activePass, refs)
  e.arc.phase = 'reset'
  e.arc.t = 0
  for (let i = 0; i < 6; i++) simulate(e, 1)
  e.initialized = true
}

// ─── HUD helpers ─────────────────────────────────────────────────────────────

export function phaseLabel(e: Engine): [string, number] {
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

export function updateHUD(e: Engine, refs: DomRefs) {
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

export function updateParams(e: Engine, dtFrames: number, refs: DomRefs) {
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
