'use client'

import { useEffect, useRef, useState } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { CHANNELS, EVENT_POOL, LUT_STOPS, type EventTone } from './data'
import s from './scene.module.css'

const TOP = 24
const NCH = CHANNELS.length
const WELD_LEN = 6400
const DOE_AT = 0.58
const LERP_SPEED = 0.06
const ROW_MS = 22
const EVT_INTERVAL = 1400
const MAX_LINES = 18

interface Engine {
  history: HTMLCanvasElement
  hctx: CanvasRenderingContext2D
  buffer: HTMLCanvasElement
  bctx: CanvasRenderingContext2D
  rowImg: ImageData | null
  w: number
  h: number
  dpr: number
  colW: number
  gap: number
  chX: number[]
  sizeKey: string
  scrollBudget: number
  weldPhase: number
  lastWeldPhase: number
  doeFired: boolean
  doeRowY: number
  ampSmooth: number
  forceSmooth: number
  timeSmooth: number
  lastEvtMs: number
  evi: number
  lastMs: number | null
}

type ReadoutRefs = {
  gain: HTMLSpanElement | null
  amp: HTMLDivElement | null
  force: HTMLDivElement | null
  time: HTMLDivElement | null
  weld: HTMLDivElement | null
  ampStat: HTMLElement | null
  sweep: HTMLElement | null
}

const LUT = buildLut()

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

function lutRGB(v: number): [number, number, number] {
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

function createEngine(): Engine {
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

function layout(engine: Engine, W: number, H: number, dpr: number) {
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

function noise(seed: number, t: number, speed: number) {
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

function pushRow(engine: Engine, t: number) {
  scrollAndWriteRow(engine, t)
  if (engine.doeRowY >= 0) {
    engine.doeRowY += 1 / engine.dpr
    if (engine.doeRowY * engine.dpr > engine.history.height) engine.doeRowY = -1
  }
}

function prime(engine: Engine, nowMs: number, feed: HTMLDivElement | null) {
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

function drawStaticOverlay(g: CanvasRenderingContext2D, engine: Engine) {
  const W = engine.w
  const H = engine.h
  const sx = W / engine.history.width

  g.font = "9px 'Share Tech Mono', monospace"
  g.textBaseline = 'top'
  g.textAlign = 'left'

  for (let c = 0; c < NCH; c++) {
    const x = engine.chX[c] * sx
    const cw = engine.colW * sx
    g.strokeStyle = 'rgba(72,230,255,0.16)'
    g.lineWidth = 1
    g.strokeRect(x + 0.5, TOP + 0.5, cw - 1, H - TOP - 1)

    g.strokeStyle = 'rgba(72,230,255,0.07)'
    for (let gy = 1; gy < 6; gy++) {
      const yy = TOP + ((H - TOP) * gy) / 6
      g.beginPath()
      g.moveTo(x, yy)
      g.lineTo(x + cw, yy)
      g.stroke()
    }

    g.fillStyle = 'rgba(2,8,16,0.82)'
    g.fillRect(x, TOP, cw, 15)
    g.fillStyle = CHANNELS[c].color
    g.fillText(`${CHANNELS[c].id} ${CHANNELS[c].freq}`, x + 4, TOP + 3)
  }

  g.save()
  g.font = "10px 'IBM Plex Sans KR', sans-serif"
  for (let c = 0; c < NCH; c++) {
    const x = engine.chX[c] * sx
    const cw = engine.colW * sx
    g.save()
    g.translate(x + cw / 2, H - 8)
    g.fillStyle = CHANNELS[c].color
    g.globalAlpha = 0.9
    g.textAlign = 'center'
    g.fillText(CHANNELS[c].name, 0, -2)
    g.restore()
  }
  g.restore()
}

function drawDynamicOverlay(g: CanvasRenderingContext2D, engine: Engine) {
  drawStaticOverlay(g, engine)
  if (engine.doeRowY < 0) return

  const sx = engine.w / engine.history.width
  const cw = engine.colW * sx
  const x = engine.chX[3] * sx
  const y = engine.doeRowY

  g.save()
  g.strokeStyle = '#ffe27a'
  g.lineWidth = 1.5
  g.setLineDash([5, 3])
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + cw, y)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = 'rgba(8,16,4,0.88)'
  g.fillRect(x + 3, y + 2, 262, 13)
  g.fillStyle = '#ffe27a'
  g.font = "9px 'Share Tech Mono', monospace"
  g.textBaseline = 'top'
  g.textAlign = 'left'
  g.fillText('◆ DOE LOCK: 진폭×가압력×용착시간 최적점 · 불량율 로브 냉각', x + 6, y + 4)
  g.restore()
}

function drawVisible(g: CanvasRenderingContext2D, engine: Engine) {
  g.save()
  g.clearRect(0, 0, engine.w, engine.h)
  g.imageSmoothingEnabled = false
  g.drawImage(engine.history, 0, 0, engine.history.width, engine.history.height, 0, 0, engine.w, engine.h)
  drawDynamicOverlay(g, engine)
  g.restore()
}

function toneClass(tone: EventTone) {
  if (tone === 'ok') return s.ok
  if (tone === 'wn') return s.wn
  if (tone === 'er') return s.er
  return s.cy
}

function logEvent(engine: Engine, feed: HTMLDivElement | null, kind: 'doe' | 'evt') {
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

function drawLut(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  canvas.width = 260
  canvas.height = 14
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x++) {
    const [r, g, b] = lutRGB(x / (canvas.width - 1))
    for (let y = 0; y < canvas.height; y++) {
      const o = (y * canvas.width + x) * 4
      img.data[o] = r
      img.data[o + 1] = g
      img.data[o + 2] = b
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

function updateWeldReadout(el: HTMLDivElement | null, active: boolean) {
  if (!el) return
  if (active) {
    el.textContent = 'CLEARED'
    el.className = `${s.n} ${s.teal}`
  } else {
    el.textContent = 'HOT'
    el.className = `${s.n} ${s.hot}`
  }
}

function updateReadouts(engine: Engine, refs: ReadoutRefs, t: number, dt: number) {
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

export default function Scene({ running = true, onReady }: SceneProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const readyFired = useRef(false)
  const lutRef = useRef<HTMLCanvasElement | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const gainRef = useRef<HTMLSpanElement | null>(null)
  const ampRef = useRef<HTMLDivElement | null>(null)
  const forceRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef<HTMLDivElement | null>(null)
  const weldRef = useRef<HTMLDivElement | null>(null)
  const ampStatRef = useRef<HTMLElement | null>(null)
  const sweepRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  useEffect(() => {
    drawLut(lutRef.current)
  }, [])

  useEffect(() => {
    if (selected === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    if (fr.w <= 0 || fr.h <= 0) return

    if (!engineRef.current) engineRef.current = createEngine()
    const engine = engineRef.current
    const W = Math.max(320, Math.floor(fr.w))
    const H = Math.max(240, Math.floor(fr.h))
    const dpr = fr.dpr || 1
    const sizeKey = `${W}:${H}:${dpr}`
    const t = fr.t * 1000

    if (engine.sizeKey !== sizeKey) {
      layout(engine, W, H, dpr)
      prime(engine, t, feedRef.current)
      engine.lastMs = t
    }

    let dt = fr.dt * 1000
    if (engine.lastMs === null || t < engine.lastMs) dt = 0
    else dt = Math.min(t - engine.lastMs, 100)
    engine.lastMs = t

    engine.weldPhase = (t % WELD_LEN) / WELD_LEN
    if (engine.weldPhase < engine.lastWeldPhase) engine.doeFired = false
    engine.lastWeldPhase = engine.weldPhase
    if (engine.weldPhase >= DOE_AT && !engine.doeFired) {
      engine.doeFired = true
      engine.doeRowY = TOP + 1
      logEvent(engine, feedRef.current, 'doe')
    }
    if (engine.weldPhase < DOE_AT && engine.doeFired) engine.doeFired = false

    updateWeldReadout(weldRef.current, engine.weldPhase >= DOE_AT)

    engine.scrollBudget += dt / ROW_MS
    let pushed = 0
    while (engine.scrollBudget >= 1) {
      engine.scrollBudget -= 1
      pushRow(engine, t)
      pushed++
      if (pushed >= 4) {
        engine.scrollBudget = 0
        break
      }
    }

    updateReadouts(
      engine,
      {
        gain: gainRef.current,
        amp: ampRef.current,
        force: forceRef.current,
        time: timeRef.current,
        weld: weldRef.current,
        ampStat: ampStatRef.current,
        sweep: sweepRef.current,
      },
      t,
      dt
    )

    if (t - engine.lastEvtMs > EVT_INTERVAL) {
      engine.lastEvtMs = t
      logEvent(engine, feedRef.current, 'evt')
    }

    drawVisible(g, engine)
  }, { running })

  const selectedChannel = selected === null ? null : CHANNELS[selected]

  return (
    <SceneHost className={s.root} bg="#02060c">
      <div className={s.shell}>
        <div className={s.topbar}>
          <div className={s.tag}>
            <span className={s.k}>SYSTEM</span>
            <span className={s.v}>ULTRASONIC WELD DOE</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>공정</span>
            <span className={`${s.v} ${s.amb}`}>초음파 용착 조건 최적화</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>METHOD</span>
            <span className={s.v}>실험계획법 DOE</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>초음파 AMP</span>
            <span className={s.v} ref={gainRef}>— μm</span>
          </div>
          <div className={s.tag}>
            <span className={s.k}>RESPONSE</span>
            <span className={s.v}>불량율 반응면</span>
          </div>
          <div className={s.sys}>
            <span className={s.title}><b>ULTRASONIC DOE</b> SIGNAL PORTFOLIO</span>
            <span className={s.blink} />
            <span className={s.runState}>DOE RUN</span>
          </div>
        </div>

        <div className={s.left}>
          <div className={s.ident}>
            <i className={`${s.corner} ${s.tl}`} />
            <i className={`${s.corner} ${s.tr}`} />
            <i className={`${s.corner} ${s.bl}`} />
            <i className={`${s.corner} ${s.br}`} />
            <div className={s.name}>ULTRASONIC DOE</div>
            <div className={s.role}>초음파 용착 DOE · 조건 최적화와 표준화</div>
            <div className={s.sub}>AMPLITUDE · FORCE · TIME · DEFECT RESPONSE</div>
          </div>

          <div className={s.sectlabel}>DOE 공정 채널 · 인자 배열</div>
          <div className={s.chlist}>
            {CHANNELS.map((ch, index) => (
              <button className={s.chrow} key={ch.id} type="button" onClick={() => setSelected(index)}>
                <span className={s.dot} style={{ background: ch.color, color: ch.color }} />
                <div>
                  <div className={s.cn}>{ch.id} · {ch.short}</div>
                  <div className={s.cname}>{ch.name}</div>
                </div>
                <span className={s.freq}><b>{ch.freq}</b>{ch.hz}</span>
                <span className={s.open}>▸ INSPECT</span>
              </button>
            ))}
          </div>

          <div className={s.legend}>
            <div className={s.sectlabel}>에너지 밀도 LUT</div>
            <div className={s.colorbar}><canvas className={s.lutbar} ref={lutRef} /></div>
            <div className={s.barscale}><span>저</span><span>중저</span><span>중고</span><span>고</span></div>
          </div>
        </div>

        <div className={s.center}>
          <canvas ref={ref} className={s.waterfall} />
          <div className={s.ovlabel}>DOE RESPONSE SURFACE · <b>초음파 용착</b> · 진폭 × 가압력 × 용착시간 · t↓</div>
          <div className={s.nowline}><span>◀ CURRENT ROW</span></div>
          <div className={s.axisTime}>◀ DOE RUN 이력 ▶</div>
        </div>

        <div className={s.right}>
          <div className={s.sectlabel}>PROCESS READOUTS</div>
          <div className={s.readouts}>
            <div className={s.ro}><div className={s.l}>초음파 AMP</div><div className={s.n} ref={ampRef}>— μm</div></div>
            <div className={s.ro}><div className={s.l}>가압력 FORCE</div><div className={`${s.n} ${s.teal}`} ref={forceRef}>— N</div></div>
            <div className={s.ro}><div className={s.l}>용착시간 WELD</div><div className={s.n} ref={timeRef}>— s</div></div>
            <div className={s.ro}><div className={s.l}>불량율 DEFECT</div><div className={`${s.n} ${s.hot}`} ref={weldRef}>HOT</div></div>
            <div className={s.ro}><div className={s.l}>반응면 FIT</div><div className={`${s.n} ${s.teal}`}>RSM</div></div>
            <div className={s.ro}><div className={s.l}>표준화 STATUS</div><div className={`${s.n} ${s.teal}`}>LOCK</div></div>
          </div>
          <div className={s.evidence} aria-label="작은 증거 눈금">
            <span title="초음파 용착 DOE 전후 불량율 반응. 헤드라인이 아닌 검증 눈금으로만 표시">불량율 <b>15 → 0%대</b></span>
            <span title="재작업 공수 연 환산 근거. 상세 산식은 기술자료 근거 항목">재작업 <b>3,200만</b></span>
            <span title="폐기 비용 연 환산 근거. 단위 비용 기준의 보조 evidence">폐기 <b>3,600만</b></span>
          </div>

          <div className={s.sectlabel}>DOE EVENT LOG</div>
          <div className={s.feed} ref={feedRef} />
        </div>

        <div className={s.statusbar}>
          <div className={s.seg}>DOE 인자<b>진폭·가압력·용착시간</b></div>
          <div className={s.seg}>반응<b>불량율·붕괴량</b></div>
          <div className={s.seg}>초음파 AMP<b className={s.amb} ref={ampStatRef}>— μm</b></div>
          <div className={s.seg}>DOE 런 경과<b ref={sweepRef}>0.0 s</b></div>
          <div className={`${s.seg} ${s.right}`}>초음파 용착 DOE · 조건 최적화와 표준화 · 채널 클릭 시 상세 ▸</div>
        </div>
      </div>

      <div
        className={`${s.modal} ${selectedChannel ? s.on : ''}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null)
        }}
      >
        {selectedChannel && (
          <div className={s.card}>
            <span className={s.x} onClick={() => setSelected(null)}>✕</span>
            <div className={s.chId}>{selectedChannel.id} · {selectedChannel.freq} CHANNEL</div>
            <h2>{selectedChannel.name}</h2>
            <div className={s.band}>{selectedChannel.band}</div>
            <div className={s.desc} dangerouslySetInnerHTML={{ __html: selectedChannel.desc }} />
            <div className={s.grpL}>DOE 조건 / 수준</div>
            <div className={s.stack}>
              {selectedChannel.stack.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className={s.grpL}>반응(RESPONSE) / 결과</div>
            <div className={s.out}>
              {selectedChannel.out.map((item) => (
                <div className={s.o} key={`${item[0]}-${item[1]}`}>
                  <div className={s.ol}>{item[0]}</div>
                  <div className={`${s.ov} ${item[2] === 'hot' ? s.hot : ''}`}>{item[1]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SceneHost>
  )
}
