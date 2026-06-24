import { CHANNELS, EVENT_POOL, LUT_STOPS, type EventTone } from './data'
import { DOE_AT, LERP_SPEED, MAX_LINES, NCH, TOP, WELD_LEN } from './constants'
import type { Engine, ReadoutRefs } from './types'
import s from './scene.module.css'

function buildLut() {
  const arr = new Uint8Array(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255
    let a = LUT_STOPS[0]
    let b = LUT_STOPS[LUT_STOPS.length - 1]
    for (let j = 0; j < LUT_STOPS.length - 1; j++) {
      if (t >= LUT_STOPS[j][0] && t <= LUT_STOPS[j + 1][0]) {
        a = LUT_STOPS[j]
        b = LUT_STOPS[j + 1]
        break
      }
    }
    const span = b[0] - a[0] || 1
    const f = (t - a[0]) / span
    arr[i * 3] = a[1] + (b[1] - a[1]) * f
    arr[i * 3 + 1] = a[2] + (b[2] - a[2]) * f
    arr[i * 3 + 2] = a[3] + (b[3] - a[3]) * f
  }
  return arr
}

const LUT = buildLut()

export function lutRGB(v: number): [number, number, number] {
  v = v < 0 ? 0 : v > 1 ? 1 : v
  const i = (v * 255) | 0
  return [LUT[i * 3], LUT[i * 3 + 1], LUT[i * 3 + 2]]
}

function makeCanvas(alpha: boolean) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha })
  if (!ctx) throw new Error('2D canvas unavailable')
  return { canvas, ctx }
}

export function createEngine(): Engine {
  const history = makeCanvas(false)
  const buffer = makeCanvas(false)
  history.ctx.imageSmoothingEnabled = false
  buffer.ctx.imageSmoothingEnabled = false
  return {
    history: history.canvas,
    hctx: history.ctx,
    buffer: buffer.canvas,
    bctx: buffer.ctx,
    rowImg: null,
    w: 0,
    h: 0,
    dpr: 1,
    colW: 0,
    gap: 8,
    chX: [],
    sizeKey: '',
    scrollBudget: 0,
    weldPhase: 0,
    lastWeldPhase: 0,
    doeFired: false,
    doeRowY: -1,
    ampSmooth: 42,
    forceSmooth: 310,
    timeSmooth: 0.34,
    lastEvtMs: 0,
    evi: 0,
    lastMs: null,
  }
}

export function layout(engine: Engine, W: number, H: number, dpr: number) {
  engine.w = Math.max(320, Math.floor(W))
  engine.h = Math.max(240, Math.floor(H))
  engine.dpr = dpr
  engine.sizeKey = `${engine.w}:${engine.h}:${engine.dpr}`
  const dW = Math.max(1, Math.round(engine.w * engine.dpr))
  const dH = Math.max(1, Math.round(engine.h * engine.dpr))

  engine.history.width = dW
  engine.history.height = dH
  engine.buffer.width = dW
  engine.buffer.height = dH
  engine.hctx.setTransform(1, 0, 0, 1, 0, 0)
  engine.bctx.setTransform(1, 0, 0, 1, 0, 0)
  engine.hctx.imageSmoothingEnabled = false
  engine.bctx.imageSmoothingEnabled = false

  const [r, g, b] = lutRGB(0.04)
  engine.hctx.fillStyle = `rgb(${r},${g},${b})`
  engine.hctx.fillRect(0, 0, dW, dH)

  engine.gap = Math.round(10 * engine.dpr)
  const usable = dW - engine.gap * (NCH + 1)
  engine.colW = Math.max(1, Math.floor(usable / NCH))
  engine.chX = []
  for (let c = 0; c < NCH; c++) engine.chX.push(engine.gap + (engine.colW + engine.gap) * c)

  engine.rowImg = engine.hctx.createImageData(dW, 1)
}

export function noise(seed: number, t: number, speed: number) {
  return 0.5 + 0.5 * (
    0.55 * Math.sin(t * 0.0011 * speed + seed) +
    0.3 * Math.sin(t * 0.0027 * speed + seed * 1.7 + 1.3) +
    0.15 * Math.sin(t * 0.0061 * speed + seed * 2.3 + 2.1)
  )
}

function grain(seed: number, t: number) {
  const v = Math.sin(seed * 12.9898 + t * 0.0017) * 43758.5453
  return v - Math.floor(v)
}

function channelRow(engine: Engine, c: number, t: number, binN: number) {
  const ch = CHANNELS[c]
  const out = new Float32Array(binN)
  const floor = 0.05

  if (ch.key === 'weld') {
    let hot
    if (engine.weldPhase < DOE_AT) {
      hot = 0.55 + 0.45 * (engine.weldPhase / DOE_AT)
    } else {
      const k = (engine.weldPhase - DOE_AT) / (1 - DOE_AT)
      hot = Math.max(0, 1 - k) * 0.9
    }
    const baseline = ch.base + ch.var * noise(c * 3.1, t, ch.speed)
    for (let i = 0; i < binN; i++) {
      const fr = i / (binN - 1)
      const lobe = Math.exp(-Math.pow((fr - 0.5) / 0.16, 2))
      const harm = 0.4 * Math.exp(-Math.pow((fr - 0.78) / 0.07, 2)) * hot
      let v = baseline * (0.5 + 0.5 * Math.sin(fr * 9 + t * 0.004)) * 0.6
      v += hot * lobe * 0.95 + harm
      v += floor + 0.04 * grain(c * 1000 + i, t)
      out[i] = v
    }
    return out
  }

  if (ch.spiky) {
    const base = ch.base * 0.55
    const burst = noise(c * 5.3, t, ch.speed)
    const fire = burst > 0.55
    const cx = 0.18 + 0.64 * ((Math.sin(t * 0.013) + 1) / 2)
    for (let i = 0; i < binN; i++) {
      const fr = i / (binN - 1)
      let v = base * (0.45 + 0.55 * ((Math.sin(fr * 22 + t * 0.02) + 1) / 2))
      if (fire) {
        v += ch.var * Math.exp(-Math.pow((fr - cx) / 0.06, 2)) * (0.7 + 0.4 * grain(c * 2000 + i, t))
      }
      if (grain(c * 3000 + i, t) > 0.985) v += 0.5 * grain(c * 4000 + i, t)
      v += floor + 0.04 * grain(c * 5000 + i, t)
      out[i] = v
    }
    return out
  }

  if (ch.tick) {
    let ph = (t * 0.0009 * ch.speed) % 1
    if (ph < 0) ph += 1
    const pulse = ph < 0.05 ? (1 - ph / 0.05) * 0.42 : 0
    const amb = 0.12 + 0.05 * noise(c * 2.7, t, ch.speed)
    for (let i = 0; i < binN; i++) {
      const fr = i / (binN - 1)
      let v = amb * (0.5 + 0.5 * Math.sin(fr * 5 + t * 0.002))
      v += pulse
      v += 0.3 * Math.exp(-Math.pow((fr - 0.33) / 0.02, 2))
      v += 0.26 * Math.exp(-Math.pow((fr - 0.66) / 0.02, 2))
      v += floor + 0.02 * grain(c * 6000 + i, t)
      out[i] = v
    }
    return out
  }

  const amb = ch.base + ch.var * noise(c * 1.9, t, ch.speed)
  for (let i = 0; i < binN; i++) {
    const fr = i / (binN - 1)
    let v = amb * (0.55 + 0.45 * Math.sin(fr * 13 + t * 0.006 + c))
    v += 0.25 * Math.sin(fr * 40 + t * 0.01) * amb
    v += 0.3 * Math.exp(-Math.pow((fr - 0.5) / 0.3, 2)) * amb
    v = Math.abs(v) * 0.9
    v += floor + 0.05 * grain(c * 7000 + i, t)
    out[i] = v
  }
  return out
}

function buildRow(engine: Engine, t: number) {
  const rowImg = engine.rowImg
  if (!rowImg) return null

  const dW = engine.history.width
  const d = rowImg.data
  const [fr, fg, fb] = lutRGB(0.05)
  for (let x = 0; x < dW; x++) {
    const o = x * 4
    d[o] = fr
    d[o + 1] = fg
    d[o + 2] = fb
    d[o + 3] = 255
  }

  for (let c = 0; c < NCH; c++) {
    const x0 = engine.chX[c]
    const cw = engine.colW
    const row = channelRow(engine, c, t, cw)
    for (let xi = 0; xi < cw; xi++) {
      let v = row[xi]
      v = v < 0 ? 0 : v > 1.2 ? 1.2 : v
      const gamma = Math.pow(v, 0.82)
      const [r, gr, b] = lutRGB(gamma)
      const o = (x0 + xi) * 4
      d[o] = r
      d[o + 1] = gr
      d[o + 2] = b
      d[o + 3] = 255
    }
  }

  return rowImg
}

function scrollAndWriteRow(engine: Engine, t: number) {
  const dW = engine.history.width
  const dH = engine.history.height
  const topDev = Math.round(TOP * engine.dpr)
  engine.bctx.drawImage(engine.history, 0, 0)
  engine.hctx.drawImage(engine.buffer, 0, topDev, dW, dH - topDev - 1, 0, topDev + 1, dW, dH - topDev - 1)
  const row = buildRow(engine, t)
  if (row) engine.hctx.putImageData(row, 0, topDev)
}

export function pushRow(engine: Engine, t: number) {
  scrollAndWriteRow(engine, t)
  if (engine.doeRowY >= 0) {
    engine.doeRowY += 1 / engine.dpr
    if (engine.doeRowY * engine.dpr > engine.history.height) engine.doeRowY = -1
  }
}

export function prime(engine: Engine, nowMs: number, feed: HTMLDivElement | null) {
  engine.doeRowY = -1
  engine.scrollBudget = 0
  const topDev = Math.round(TOP * engine.dpr)
  const fillRows = engine.history.height - topDev + 4
  let pt = -22 * fillRows
  for (let k = 0; k < fillRows; k++) {
    pt += 22
    let sim = ((nowMs + pt) % WELD_LEN) / WELD_LEN
    if (sim < 0) sim += 1
    engine.weldPhase = sim
    scrollAndWriteRow(engine, pt)
  }
  for (let i = 0; i < 8; i++) logEvent(engine, feed, 'evt')
}


function toneClass(tone: EventTone) {
  if (tone === 'ok') return s.ok
  if (tone === 'wn') return s.wn
  if (tone === 'er') return s.er
  return s.cy
}

export function logEvent(engine: Engine, feed: HTMLDivElement | null, kind: 'doe' | 'evt') {
  if (!feed) return

  let cls: EventTone
  let tag: string
  let msg: string
  if (kind === 'doe') {
    cls = 'ok'
    tag = 'R'
    msg = '◆ DOE LOCK · 진폭×가압력×용착시간 최적점 확정 · 표준화 완료'
  } else {
    const event = EVENT_POOL[engine.evi % EVENT_POOL.length]
    engine.evi++
    cls = event[0]
    tag = event[1]
    msg = event[2]
  }

  const runIdx = String((engine.evi * 3) % 96).padStart(2, '0')
  const tstr = kind === 'doe' ? 'DOE LOCK' : `RUN+${runIdx}m`
  const ln = document.createElement('div')
  ln.className = s.ln
  ln.style.transition = 'opacity 1.2s'
  ln.style.opacity = '1'

  const time = document.createElement('span')
  time.className = s.t
  time.textContent = tstr

  const code = document.createElement('span')
  code.className = toneClass(cls)
  code.textContent = `[${tag}]`

  ln.append(time, document.createTextNode(' '), code, document.createTextNode(` ${msg}`))
  feed.insertBefore(ln, feed.firstChild)

  const kids = Array.from(feed.children) as HTMLElement[]
  for (let i = 0; i < kids.length; i++) {
    const age = i / (MAX_LINES - 1)
    kids[i].style.opacity = Math.max(0, 1 - age * 1.1).toFixed(2)
  }
  while (feed.childNodes.length > MAX_LINES) feed.removeChild(feed.lastChild as ChildNode)
}


export function updateWeldReadout(el: HTMLDivElement | null, active: boolean) {
  if (!el) return
  if (active) {
    el.textContent = 'CLEARED'
    el.className = `${s.n} ${s.teal}`
  } else {
    el.textContent = 'HOT'
    el.className = `${s.n} ${s.hot}`
  }
}

export function updateReadouts(engine: Engine, refs: ReadoutRefs, t: number, dt: number) {
  const ampTarget = 25 + 30 * noise(3, t, 0.18)
  const forceTarget = 240 + 120 * noise(7.4, t, 0.2)
  const timeTarget = 0.22 + 0.26 * noise(9.1, t, 0.25)
  const lf = 1 - Math.pow(1 - LERP_SPEED, dt / 16.67)
  engine.ampSmooth += (ampTarget - engine.ampSmooth) * lf
  engine.forceSmooth += (forceTarget - engine.forceSmooth) * lf
  engine.timeSmooth += (timeTarget - engine.timeSmooth) * lf

  const ampVal = Math.round(engine.ampSmooth)
  if (refs.gain) refs.gain.textContent = `${ampVal} μm`
  if (refs.amp) refs.amp.textContent = `${ampVal} μm`
  if (refs.force) refs.force.textContent = `${Math.round(engine.forceSmooth)} N`
  if (refs.time) refs.time.textContent = `${engine.timeSmooth.toFixed(2)} s`
  if (refs.ampStat) refs.ampStat.textContent = `${ampVal} μm`
  if (refs.sweep) refs.sweep.textContent = `${((t / 1000) % 600).toFixed(1)} s`
}

