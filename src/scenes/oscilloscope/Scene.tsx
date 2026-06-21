'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   스팟 용접 2차 전류 모니터 · oscilloscope.html 이식 (레퍼런스 포팅)
   I₂ kA / 통전 사이클 · AC / MFDC · 5 캔버스(라이브 스코프 / 타점 스코프 /
   스케줄 / 트렌드 / 너깃) + 계측 DOM + 우측 컨트롤 랙.
   하네스는 1px 드라이버 캔버스로 프레임 클럭만 제공하고, 5 캔버스는
   고정 해상도로 imperative 렌더(원본 픽셀 좌표 그대로 유지).
   ════════════════════════════════════════════════════════════════ */

const MONO = '"JetBrains Mono","SF Mono",ui-monospace,monospace'
const COL = {
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
const SCH = { squeeze: 6, up: 3, pulses: [{ w: 5, c: 2 }, { w: 5, c: 2 }, { w: 6, c: 0 }], down: 2, hold: 5 }
interface Seg {
  t0: number
  t1: number
  a0: number
  a1: number
  kind: string
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
const WELD = buildWeld()
function TOTAL() {
  return SCH.squeeze + WELD.dur + SCH.hold
}
const WELD_START = SCH.squeeze
const WELD_END = SCH.squeeze + WELD.dur

function envAmp(c: number) {
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

interface State {
  running: boolean
  mode: 'AC' | 'MFDC'
  heat: number
  forceKN: number
  cyclePerDiv: number
  kaPerDiv: number
  trigEdge: 'rise' | 'fall'
  trigKA: number
  t: number
}
interface SpotVar {
  idx: number
  peakBase: number
  forceJit: number
  expulsion: boolean
}
interface Meas {
  rms: number
  peak: number
  kJ: number
  tWeld: number
  cum: Float32Array
  N: number
  tot: number
  nuggetMM: number
  expulsion: boolean
}
interface TrendItem {
  kA: number
  exp: boolean
  n: number
}

export default function Scene({ running = true, onReady }: SceneProps) {
  // ===== canvas refs (fixed-resolution, imperative) =====
  const liveRef = useRef<HTMLCanvasElement | null>(null)
  const scopeRef = useRef<HTMLCanvasElement | null>(null)
  const schedRef = useRef<HTMLCanvasElement | null>(null)
  const trendRef = useRef<HTMLCanvasElement | null>(null)
  const nugRef = useRef<HTMLCanvasElement | null>(null)

  // ===== overlay DOM refs =====
  const acqDotRef = useRef<HTMLSpanElement | null>(null)
  const acqStateRef = useRef<HTMLSpanElement | null>(null)
  const modePillRef = useRef<HTMLSpanElement | null>(null)
  const spotNoRef = useRef<HTMLSpanElement | null>(null)
  const clockRef = useRef<HTMLSpanElement | null>(null)
  const schedStatRef = useRef<HTMLSpanElement | null>(null)
  const trendStatRef = useRef<HTMLSpanElement | null>(null)
  const nugStatRef = useRef<HTMLSpanElement | null>(null)
  const scrLabelRef = useRef<HTMLSpanElement | null>(null)
  const modeNoteRef = useRef<HTMLDivElement | null>(null)
  // measure cells
  const mPeakRef = useRef<HTMLSpanElement | null>(null)
  const mRmsRef = useRef<HTMLSpanElement | null>(null)
  const mCycRef = useRef<HTMLSpanElement | null>(null)
  const mMsRef = useRef<HTMLSpanElement | null>(null)
  const mForceRef = useRef<HTMLSpanElement | null>(null)
  const mEnergyRef = useRef<HTMLSpanElement | null>(null)
  const mDutyRef = useRef<HTMLSpanElement | null>(null)
  const mExpRef = useRef<HTMLTableCellElement | null>(null)
  const mNugRef = useRef<HTMLSpanElement | null>(null)
  // control DOM refs
  const chBtnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const kTimeRef = useRef<HTMLDivElement | null>(null)
  const kAmpRef = useRef<HTMLDivElement | null>(null)
  const vTimeRef = useRef<HTMLDivElement | null>(null)
  const vAmpRef = useRef<HTMLDivElement | null>(null)
  const modeSegRefs = useRef<(HTMLButtonElement | null)[]>([])
  const edgeSegRefs = useRef<(HTMLButtonElement | null)[]>([])
  const heatRngRef = useRef<HTMLInputElement | null>(null)
  const heatValRef = useRef<HTMLSpanElement | null>(null)
  const forceRngRef = useRef<HTMLInputElement | null>(null)
  const forceValRef = useRef<HTMLSpanElement | null>(null)
  const trigLvlRef = useRef<HTMLInputElement | null>(null)
  const trigValRef = useRef<HTMLSpanElement | null>(null)
  const runBtnRef = useRef<HTMLButtonElement | null>(null)
  const runSubRef = useRef<HTMLSpanElement | null>(null)

  // ===== persistent simulation state (refs, mutated in draw) =====
  const stateRef = useRef<State>({
    running: true,
    mode: 'AC',
    heat: 0.72,
    forceKN: 2.4,
    cyclePerDiv: 4,
    kaPerDiv: 3,
    trigEdge: 'rise',
    trigKA: 1.8,
    t: 0,
  })
  const cycleStepsRef = useRef([2, 3, 4, 6, 10])
  const ampStepsRef = useRef([1, 2, 3, 5, 8])
  const cycleIdxRef = useRef(2)
  const ampIdxRef = useRef(2)
  const chRef = useRef([
    { key: 'cur', on: true },
    { key: 'force', on: true },
    { key: 'env', on: true },
    { key: 'energy', on: true },
  ])

  const spotRef = useRef(1)
  const curSpotRef = useRef<SpotVar>(spotVar(1))
  const measRef = useRef<Meas | null>(null)
  const spotTRef = useRef(0)
  const revealRef = useRef(0)
  const expFiredRef = useRef(false)
  const liveFreezeRef = useRef(0)
  const histRef = useRef<TrendItem[]>([])
  const dispRef = useRef({ peak: 0, rms: 0, energy: 0, nug: 0 })
  const lastTRef = useRef(0)
  const seededRef = useRef(false)
  const singleWatchRef = useRef(false)
  const clockStrRef = useRef('--:--:--')

  function spotVar(i: number): SpotVar {
    return {
      idx: i,
      peakBase: 9.55 + Math.sin(i * 1.27) * 0.32 + Math.cos(i * 0.63) * 0.16,
      forceJit: Math.sin(i * 0.9) * 0.04,
      expulsion: i % 7 === 5,
    }
  }

  useSceneReady(onReady)

  // ===== DOM control handlers (attached once on mount) =====
  useEffect(() => {
    const st = stateRef.current

    function syncMode() {
      modeSegRefs.current.forEach((b) => {
        if (b) b.setAttribute('aria-pressed', b.dataset.mode === st.mode ? 'true' : 'false')
      })
      if (modePillRef.current) {
        modePillRef.current.innerHTML = 'MODE <b style="color:#ffb300">' + st.mode + '</b>'
      }
      if (modeNoteRef.current) {
        modeNoteRef.current.innerHTML =
          st.mode === 'AC'
            ? '<b>AC</b> 60Hz 반주기 위상제어 — 통전각(α)이 HEAT를 결정, 극성 교번 정현 펄스열.'
            : '<b>MFDC</b> 중주파 인버터 DC — 상승 램프 후 평탄 DC 플래토, 리플 적고 단극성.'
      }
    }

    const cleanups: Array<() => void> = []

    // channel toggles
    chBtnRefs.current.forEach((btn, i) => {
      if (!btn) return
      const h = () => {
        chRef.current[i].on = !chRef.current[i].on
        btn.dataset.on = chRef.current[i].on ? '1' : '0'
      }
      btn.addEventListener('click', h)
      cleanups.push(() => btn.removeEventListener('click', h))
    })

    // knobs
    function setupKnob(
      el: HTMLDivElement | null,
      getIdx: () => number,
      setIdx: (i: number) => void,
      steps: number[],
      valEl: HTMLDivElement | null,
      fmt: (v: number) => string
    ) {
      if (!el) return
      let startY = 0
      let startIdx = 0
      let dragging = false
      const render = () => {
        const idx = getIdx()
        const rot = -135 + (idx / (steps.length - 1)) * 270
        el.style.setProperty('--rot', rot + 'deg')
        if (valEl) valEl.textContent = fmt(steps[idx])
      }
      const onMove = (e: MouseEvent | TouchEvent) => {
        if (!dragging) return
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY
        const dy = startY - y
        let idx = Math.round(startIdx + dy / 22)
        idx = Math.max(0, Math.min(steps.length - 1, idx))
        setIdx(idx)
        render()
      }
      const onUp = () => {
        dragging = false
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      const onDown = (e: MouseEvent) => {
        dragging = true
        startY = e.clientY
        startIdx = getIdx()
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
        e.preventDefault()
      }
      const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        let idx = getIdx() + (e.deltaY < 0 ? 1 : -1)
        idx = Math.max(0, Math.min(steps.length - 1, idx))
        setIdx(idx)
        render()
      }
      el.addEventListener('mousedown', onDown)
      el.addEventListener('wheel', onWheel, { passive: false })
      render()
      cleanups.push(() => {
        el.removeEventListener('mousedown', onDown)
        el.removeEventListener('wheel', onWheel)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      })
    }
    setupKnob(
      kTimeRef.current,
      () => cycleIdxRef.current,
      (i) => {
        cycleIdxRef.current = i
        st.cyclePerDiv = cycleStepsRef.current[i]
      },
      cycleStepsRef.current,
      vTimeRef.current,
      (v) => v + ' cyc'
    )
    setupKnob(
      kAmpRef.current,
      () => ampIdxRef.current,
      (i) => {
        ampIdxRef.current = i
        st.kaPerDiv = ampStepsRef.current[i]
      },
      ampStepsRef.current,
      vAmpRef.current,
      (v) => v + ' kA'
    )

    // mode toggle
    modeSegRefs.current.forEach((b) => {
      if (!b) return
      const h = () => {
        st.mode = (b.dataset.mode as 'AC' | 'MFDC') || 'AC'
        syncMode()
        refreshMeasure()
      }
      b.addEventListener('click', h)
      cleanups.push(() => b.removeEventListener('click', h))
    })
    syncMode()

    // heat / force sliders
    const heatRng = heatRngRef.current
    if (heatRng) {
      const h = (e: Event) => {
        const v = +(e.target as HTMLInputElement).value
        st.heat = v / 100
        if (heatValRef.current) heatValRef.current.textContent = v + '%'
        refreshMeasure()
      }
      heatRng.addEventListener('input', h)
      cleanups.push(() => heatRng.removeEventListener('input', h))
    }
    const forceRng = forceRngRef.current
    if (forceRng) {
      const h = (e: Event) => {
        const v = +(e.target as HTMLInputElement).value
        st.forceKN = v / 100
        if (forceValRef.current) forceValRef.current.textContent = st.forceKN.toFixed(1) + 'kN'
      }
      forceRng.addEventListener('input', h)
      cleanups.push(() => forceRng.removeEventListener('input', h))
    }

    // trigger edge
    edgeSegRefs.current.forEach((b) => {
      if (!b) return
      const h = () => {
        edgeSegRefs.current.forEach((x) => x?.setAttribute('aria-pressed', 'false'))
        b.setAttribute('aria-pressed', 'true')
        st.trigEdge = (b.dataset.edge as 'rise' | 'fall') || 'rise'
      }
      b.addEventListener('click', h)
      cleanups.push(() => b.removeEventListener('click', h))
    })
    const trigLvl = trigLvlRef.current
    if (trigLvl) {
      const h = (e: Event) => {
        const v = +(e.target as HTMLInputElement).value
        st.trigKA = v / 10
        if (trigValRef.current) trigValRef.current.textContent = st.trigKA.toFixed(1) + 'kA'
      }
      trigLvl.addEventListener('input', h)
      cleanups.push(() => trigLvl.removeEventListener('input', h))
    }

    // run/stop + single
    const runBtn = runBtnRef.current
    if (runBtn) {
      const h = () => {
        st.running = !st.running
        runBtn.dataset.state = st.running ? 'run' : 'stop'
        if (runSubRef.current) runSubRef.current.textContent = st.running ? '연속 취득' : '정지됨'
        if (acqDotRef.current) acqDotRef.current.className = s.dot + ' ' + (st.running ? s.run : s.stop)
        if (acqStateRef.current) acqStateRef.current.textContent = st.running ? 'ACQUIRE · WELD' : 'STOP · HOLD'
      }
      runBtn.addEventListener('click', h)
      cleanups.push(() => runBtn.removeEventListener('click', h))
    }

    // clock — driven by setInterval (not frame-bound)
    const tickClock = () => {
      const d = new Date()
      clockStrRef.current =
        String(d.getHours()).padStart(2, '0') +
        ':' +
        String(d.getMinutes()).padStart(2, '0') +
        ':' +
        String(d.getSeconds()).padStart(2, '0')
      if (clockRef.current) clockRef.current.textContent = clockStrRef.current
    }
    const clockIv = window.setInterval(tickClock, 1000)
    tickClock()
    cleanups.push(() => window.clearInterval(clockIv))

    return () => cleanups.forEach((c) => c())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // singleBtn handler must call into measure helpers — bind separately
  function singleShot() {
    const st = stateRef.current
    pushTrend()
    spotRef.current++
    curSpotRef.current = spotVar(spotRef.current)
    spotTRef.current = 0
    revealRef.current = 0
    expFiredRef.current = false
    refreshMeasure()
    if (!st.running) {
      st.running = true
      if (runBtnRef.current) runBtnRef.current.dataset.state = 'run'
      singleWatchRef.current = true
    }
  }

  // ============================================================
  // simulation helpers (closure over refs)
  // ============================================================
  function peakKA() {
    const st = stateRef.current
    const base = curSpotRef.current.peakBase
    if (st.mode === 'AC') return base * (0.78 + 0.22 * st.heat)
    return base * (0.7 + 0.34 * st.heat)
  }
  function expulsionTerm(c: number, exp: boolean) {
    if (!exp) return 0
    const center = SCH.squeeze + WELD.dur * 0.58
    const d = c - center
    if (Math.abs(d) > 1.1) return 0
    return Math.exp(-(d * d) / 0.06) * (d < 0 ? 1.0 : -0.7)
  }
  function arcTex(c: number) {
    return (
      0.06 * Math.sin(c * Math.PI * 2 * 5.3) +
      0.034 * Math.sin(c * Math.PI * 2 * 11.7) +
      0.02 * Math.sin(c * Math.PI * 2 * 23.1)
    )
  }
  function curr(c: number, pk: number, exp: boolean) {
    const st = stateRef.current
    const a = envAmp(c)
    if (a <= 0) return 0
    let v: number
    if (st.mode === 'AC') {
      const hc = Math.floor(c * 2)
      const pol = hc % 2 === 0 ? 1 : -1
      const ph = (c * 2 - hc) * Math.PI
      const amin = 0.12
      const amax = 2.45
      const alpha = amin + (1 - st.heat) * (amax - amin)
      const sn = ph >= alpha ? Math.sin(ph) : 0
      v = pol * sn * a * pk * (1 + arcTex(c))
    } else {
      const rip = 0.06 * Math.sin(c * 2 * Math.PI * 16) + 0.026 * Math.sin(c * 2 * Math.PI * 33)
      v = a * pk * (1 + rip + arcTex(c) * 0.5)
    }
    const ex = expulsionTerm(c, exp)
    if (ex) v += ex * a * pk * 0.55
    return v
  }
  function computeMeasure(): Meas {
    const st = stateRef.current
    const N = 720
    const tot = TOTAL()
    const pk = peakKA()
    let sumSq = 0
    let peak = 0
    let acc = 0
    const cum = new Float32Array(N + 1)
    for (let i = 0; i <= N; i++) {
      const c = (i / N) * tot
      const v = curr(c, pk, curSpotRef.current.expulsion)
      sumSq += v * v
      if (Math.abs(v) > peak) peak = Math.abs(v)
      acc += v * v
      cum[i] = acc
    }
    const rms = Math.sqrt(sumSq / (N + 1))
    const norm = acc > 0 ? acc : 1
    for (let i = 0; i <= N; i++) cum[i] /= norm
    const tWeld = WELD.dur * 0.0167
    const R = 95e-6
    const kJ = (rms * 1000 * (rms * 1000) * R * tWeld) / 1000
    const nug = 3.2 + (peak / 9.6) * 2.6 * (st.mode === 'MFDC' ? 1.05 : 1.0)
    return { rms, peak, kJ, tWeld, cum, N, tot, nuggetMM: nug, expulsion: curSpotRef.current.expulsion }
  }
  function refreshMeasure() {
    measRef.current = computeMeasure()
  }
  function energyAt(c: number) {
    const meas = measRef.current
    if (!meas) return 0
    const i = Math.max(0, Math.min(meas.N, Math.round((c / meas.tot) * meas.N)))
    return meas.cum[i]
  }

  const T_ACQ = 2.3
  const T_DWELL = 1.0
  function advanceSpotState(dt: number) {
    const st = stateRef.current
    if (!st.running) return
    spotTRef.current += dt
    if (spotTRef.current < T_ACQ) {
      revealRef.current = spotTRef.current / T_ACQ
    } else if (spotTRef.current < T_ACQ + T_DWELL) {
      revealRef.current = 1
    } else {
      pushTrend()
      spotRef.current++
      curSpotRef.current = spotVar(spotRef.current)
      spotTRef.current = 0
      revealRef.current = 0
      expFiredRef.current = false
      refreshMeasure()
    }
    const revealC = revealRef.current * TOTAL()
    if (curSpotRef.current.expulsion && revealC > SCH.squeeze + WELD.dur * 0.58) expFiredRef.current = true
  }

  const TREND_MAX = 28
  function pushTrend() {
    const meas = measRef.current
    if (meas) histRef.current.push({ kA: meas.peak, exp: curSpotRef.current.expulsion, n: spotRef.current })
    while (histRef.current.length > TREND_MAX) histRef.current.shift()
  }

  function nuggetGrowth() {
    const c = revealRef.current * TOTAL()
    if (c < SCH.squeeze) return 0
    if (c <= WELD_END) return Math.min(1, (c - SCH.squeeze) / WELD.dur)
    const hc = (c - WELD_END) / SCH.hold
    return Math.max(0.72, 1 - hc * 0.28)
  }

  function roundRectS(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }

  // ============================================================
  // DRAW — driven once per frame by the harness (driver canvas).
  // ============================================================
  const ref = useSceneCanvas((_g: CanvasRenderingContext2D, fr: Frame) => {
    const st = stateRef.current

    // first-frame init (seed history + initial measure once)
    if (!seededRef.current) {
      seededRef.current = true
      refreshMeasure()
      const m0 = measRef.current
      if (m0) dispRef.current = { peak: m0.peak, rms: m0.rms, energy: m0.kJ, nug: m0.nuggetMM }
      const savedSpot = spotRef.current
      const savedCur = curSpotRef.current
      for (let i = Math.max(1, savedSpot - 10); i < savedSpot; i++) {
        const cs = spotVar(i)
        curSpotRef.current = cs
        const m = computeMeasure()
        histRef.current.push({ kA: m.peak, exp: cs.expulsion, n: i })
      }
      curSpotRef.current = savedCur
      spotRef.current = savedSpot
      refreshMeasure()
    }

    // ----- time / dt from harness frame -----
    const dt = Math.min(fr.t - lastTRef.current, 0.05)
    lastTRef.current = fr.t
    if (st.running) st.t += Math.max(0, dt)
    advanceSpotState(Math.max(0, dt))

    // single-shot watcher: run one acquisition then stop
    if (singleWatchRef.current && revealRef.current >= 1) {
      singleWatchRef.current = false
      st.running = false
      if (runBtnRef.current) runBtnRef.current.dataset.state = 'stop'
      if (runSubRef.current) runSubRef.current.textContent = '정지됨'
      if (acqDotRef.current) acqDotRef.current.className = s.dot + ' ' + s.stop
      if (acqStateRef.current) acqStateRef.current.textContent = 'STOP · HOLD'
    }

    updateMeasureDOM(Math.max(0, dt))

    // status pill
    if (st.running) {
      const alarm = curSpotRef.current.expulsion && expFiredRef.current
      if (acqDotRef.current) acqDotRef.current.className = s.dot + ' ' + (alarm ? s.stop : s.run)
      if (acqStateRef.current)
        acqStateRef.current.textContent = alarm
          ? 'EXPULSION · 스패터'
          : revealRef.current < 1
            ? 'ACQUIRE · WELD'
            : 'DWELL · 계측'
    }
    if (spotNoRef.current) spotNoRef.current.textContent = '#' + String(spotRef.current).padStart(4, '0')

    renderLive()
    renderScope()
    renderSched()
    renderTrend()
    renderNug()
  }, { running })

  function updateMeasureDOM(dt: number) {
    const meas = measRef.current
    if (!meas) return
    const st = stateRef.current
    const disp = dispRef.current
    const lf = Math.min(dt * 3, 1)
    disp.peak += (meas.peak - disp.peak) * lf
    disp.rms += (meas.rms - disp.rms) * lf
    disp.energy += (meas.kJ - disp.energy) * lf
    disp.nug += (meas.nuggetMM * Math.max(0.4, nuggetGrowth()) - disp.nug) * lf
    if (mPeakRef.current) mPeakRef.current.textContent = disp.peak.toFixed(2)
    if (mRmsRef.current) mRmsRef.current.textContent = disp.rms.toFixed(2)
    if (mCycRef.current) mCycRef.current.textContent = String(WELD.dur)
    if (mMsRef.current) mMsRef.current.textContent = String((WELD.dur * 16.7) | 0)
    if (mForceRef.current) mForceRef.current.textContent = st.forceKN.toFixed(2)
    if (mEnergyRef.current) mEnergyRef.current.textContent = disp.energy.toFixed(2)
    if (mDutyRef.current) mDutyRef.current.textContent = String((st.heat * 100) | 0)
    if (mNugRef.current) mNugRef.current.textContent = disp.nug.toFixed(1)
    const alarm = curSpotRef.current.expulsion && expFiredRef.current
    if (mExpRef.current) {
      mExpRef.current.textContent = alarm ? 'DETECTED ⚠' : 'NONE'
      mExpRef.current.className = alarm ? `${s.num} ${s.alarm}` : s.num
    }
  }

  // ============================================================
  // SCOPE (#scope) — per-spot acquisition
  // ============================================================
  const SW = 620
  const SH = 460
  const DIVX = 10
  const DIVY = 8
  const cellW = SW / DIVX
  const cellH = SH / DIVY
  const VRRef = useRef({ start: 0, win: 0 })

  function viewRange() {
    const st = stateRef.current
    const tot = TOTAL()
    const win = Math.min(st.cyclePerDiv * DIVX, tot)
    let start = 0
    if (win < tot) {
      const revealC = revealRef.current * tot
      start = Math.max(0, Math.min(revealC - win * 0.82, tot - win))
    }
    return { start, win }
  }

  function renderScope() {
    const cv = scopeRef.current
    if (!cv) return
    const sx = cv.getContext('2d')
    if (!sx) return
    const st = stateRef.current
    const VR = viewRange()
    VRRef.current = VR
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
    if (chRef.current[3].on && measRef.current) {
      const tot = TOTAL()
      const revealC = revealRef.current * tot
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
        const y = baseY - energyAt(c) * hgt
        if (first) {
          sx.moveTo(x, y)
          first = false
        } else sx.lineTo(x, y)
      }
      sx.stroke()
      const hx = cToX(Math.min(revealC, tot))
      if (hx > 0 && hx < SW) {
        const hy = baseY - energyAt(Math.min(revealC, tot)) * hgt
        sx.fillStyle = COL.c4
        sx.globalAlpha = 0.85
        sx.font = '9px ' + MONO
        sx.textAlign = 'right'
        sx.fillText('I²t', hx - 4, hy - 4)
      }
      sx.restore()
    }

    // ----- force -----
    if (chRef.current[1].on) {
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
      const revealC = revealRef.current * tot
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
    if (chRef.current[2].on) {
      const tot = TOTAL()
      const pk = peakKA()
      const revealC = revealRef.current * tot
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
    if (chRef.current[0].on) {
      const tot = TOTAL()
      const pk = peakKA()
      const revealC = revealRef.current * tot
      const exp = curSpotRef.current.expulsion && expFiredRef.current
      const xp = curSpotRef.current.expulsion
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
          const y = iToY(curr(c, pk, xp))
          if (first) {
            sx.moveTo(x, y)
            first = false
          } else sx.lineTo(x, y)
        }
        sx.stroke()
      }
      const hc = Math.min(revealC, tot)
      const hx = cToX(hc)
      const hy = iToY(curr(hc, pk, xp))
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
        const av = Math.abs(curr(c, pk, xp))
        if (av > pv) {
          pv = av
          pc = c
        }
      }
      if (pv > 0.01) {
        const mx = cToX(pc)
        const my = iToY(curr(pc, pk, xp))
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
    if (st.running && revealRef.current < 1) {
      const hx = cToX(revealRef.current * TOTAL())
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
    if (curSpotRef.current.expulsion && expFiredRef.current) {
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
      const acq = st.running ? (revealRef.current < 1 ? '● ACQUIRE' : '◌ DWELL') : '■ STOP'
      sx.fillStyle = st.running ? COL.amber : COL.red
      sx.fillText(acq, 430, SH - 7)
      sx.textAlign = 'right'
      sx.fillStyle = COL.amber
      if (measRef.current) sx.fillText(`I₂pk ${measRef.current.peak.toFixed(2)} kA`, SW - 10, 18)
      sx.textAlign = 'left'
      sx.restore()
    }
  }

  // ============================================================
  // LIVE OSCILLOSCOPE (#scopeLive)
  // ============================================================
  const LVW = 820
  const LVH = 460
  const LDIVX = 12
  const LDIVY = 8
  const LcellW = LVW / LDIVX
  const LcellH = LVH / LDIVY
  const STREAM_SPEED = 13
  function LWIN() {
    return TOTAL() * 1.25
  }
  function streamPeak(idx: number) {
    const st = stateRef.current
    const base = 9.55 + Math.sin(idx * 1.27) * 0.32 + Math.cos(idx * 0.63) * 0.16
    return st.mode === 'AC' ? base * (0.78 + 0.22 * st.heat) : base * (0.7 + 0.34 * st.heat)
  }
  function streamCurr(c: number) {
    const tot = TOTAL()
    const idx = Math.floor(c / tot)
    const local = c - idx * tot
    return curr(local, streamPeak(idx), (((idx % 7) + 7) % 7) === 5)
  }
  function renderLive() {
    const cv = liveRef.current
    if (!cv) return
    const lv = cv.getContext('2d')
    if (!lv) return
    const st = stateRef.current
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
    const streamC = st.running ? st.t * STREAM_SPEED : liveFreezeRef.current
    if (st.running) liveFreezeRef.current = streamC
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

    if (chRef.current[2].on) {
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
          const y = iToY(sgn * envAmp(local) * streamPeak(idx))
          if (first) {
            lv.moveTo(x, y)
            first = false
          } else lv.lineTo(x, y)
        }
        lv.stroke()
      })
      lv.restore()
    }

    if (chRef.current[0].on) {
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
          const y = iToY(streamCurr(c0 + (x / LVW) * win))
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
        const y = iToY(streamCurr(c0 + (x / LVW) * win))
        if (f2) {
          lv.moveTo(x, y)
          f2 = false
        } else lv.lineTo(x, y)
      }
      lv.stroke()
      const hy = iToY(streamCurr(streamC))
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

  // ============================================================
  // WELD SCHEDULE TIMELINE (#sched)
  // ============================================================
  const DW = 640
  const DH = 300
  function segColor(kind: string) {
    if (kind === 'pulse') return COL.amber
    if (kind === 'up' || kind === 'down') return COL.amber2
    return '#3a3f3d'
  }
  function renderSched() {
    const cv = schedRef.current
    if (!cv) return
    const dx = cv.getContext('2d')
    if (!dx) return
    const st = stateRef.current
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

    const revealC = revealRef.current * tot
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
    const pk = peakKA()
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
      const v = curr(c, pk, curSpotRef.current.expulsion)
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

    if (schedStatRef.current) {
      schedStatRef.current.textContent = activeLab
      schedStatRef.current.style.color = activeLab.indexOf('WELD') >= 0 ? COL.amber : COL.ink2
    }
  }

  // ============================================================
  // SPOT TREND (#trend)
  // ============================================================
  const TW = 640
  const TH = 220
  function renderTrend() {
    const cv = trendRef.current
    if (!cv) return
    const tx = cv.getContext('2d')
    if (!tx) return
    const st = stateRef.current
    const meas = measRef.current
    const hist = histRef.current
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
    tx.fillText('← 최근 ' + TREND_MAX + ' 타점 → (현재 #' + spotRef.current + ')', padL + plotW / 2, TH - 6)
    if (trendStatRef.current) {
      trendStatRef.current.textContent = meas ? meas.peak.toFixed(2) + ' kA' : 'kA'
      trendStatRef.current.style.color =
        meas && curSpotRef.current.expulsion && expFiredRef.current ? COL.red : COL.amber
    }
  }

  // ============================================================
  // ELECTRODE / NUGGET (#nug)
  // ============================================================
  const NW = 300
  const NH = 220
  function renderNug() {
    const cv = nugRef.current
    if (!cv) return
    const nx = cv.getContext('2d')
    if (!nx) return
    const st = stateRef.current
    const meas = measRef.current
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
      const g = nuggetGrowth()
      if (g > 0) {
        nx.fillStyle = 'rgba(255,179,0,' + 0.15 * g + ')'
        nx.beginPath()
        nx.arc(cx, ty, 14, 0, Math.PI * 2)
        nx.fill()
      }
    }
    electrode(true)
    electrode(false)
    const exp = curSpotRef.current.expulsion && expFiredRef.current
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
    const g = nuggetGrowth()
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
    if (nugStatRef.current) {
      nugStatRef.current.textContent = exp ? 'SPATTER' : g > 0 ? 'NUGGET' : 'COOL'
      nugStatRef.current.style.color = exp ? COL.red : g > 0 ? COL.amber : COL.ink2
    }
  }

  return (
    <SceneHost className={s.root} bg="#050505">
      {/* frame-clock driver (not visible) */}
      <canvas ref={ref} className={s.driver} />

      <div className={s.scope}>
        <div className={s.case}>
          {/* BRAND BAR */}
          <div className={s.brandbar}>
            <div className={s.brand}>
              <div className={s.logo} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                  <path
                    d="M1 18 H6 L6 8 L11 8 L11 18 L15 18 L15 8 L20 8 L20 18 H25"
                    stroke="#ffb300"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h1>스팟 용접 2차 전류 모니터</h1>
                <div className={s.model}>
                  MODEL <b>WCM-2K</b> · SECONDARY I₂ · AC / MFDC · kA·CYCLE
                </div>
              </div>
            </div>
            <div className={s.topmeta}>
              <span className={s.pill}>
                <span className={`${s.dot} ${s.run}`} ref={acqDotRef} />
                <span ref={acqStateRef}>ACQUIRE · WELD</span>
              </span>
              <span className={s.pill} ref={modePillRef}>
                MODE <b style={{ color: '#ffb300' }}>AC</b>
              </span>
              <span className={`${s.pill} ${s.mono}`}>
                SPOT <span ref={spotNoRef} style={{ color: '#ffb300' }}>#0001</span>
              </span>
              <span className={`${s.pill} ${s.mono}`} ref={clockRef}>
                --:--:--
              </span>
            </div>
          </div>

          {/* MAIN LAYOUT */}
          <div className={s.layout}>
            {/* LEFT */}
            <div className={s.leftcol}>
              <div className={s.displays}>
                <div className={s.crtwrap}>
                  <span className={s.screenlabel}>
                    LIVE OSCILLOSCOPE · 실시간 스윕 — I₂(t) 연속 스트리밍 · 60Hz ROLL
                  </span>
                  <canvas ref={liveRef} width={820} height={460} />
                  <div className={s.scanlines} />
                  <div className={s.glassglare} />
                  <div className={s.vignette} />
                </div>
                <div className={s.crtwrap}>
                  <span className={s.screenlabel} ref={scrLabelRef}>
                    WELD CURRENT MONITOR · 타점 통전 — SQUEEZE ▸ WELD ▸ HOLD · TRIG @ WELD-START
                  </span>
                  <canvas ref={scopeRef} width={620} height={460} />
                  <div className={s.scanlines} />
                  <div className={s.glassglare} />
                  <div className={s.vignette} />
                </div>
              </div>

              <div className={s.subgrid}>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>WELD SCHEDULE · 통전 스케줄</span>
                    <span className={s.k} ref={schedStatRef}>
                      SQUEEZE…
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={schedRef} className={s.ctrlcanvas} width={640} height={300} />
                  </div>
                </div>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>MEASURE · 2차 전류 계측</span>
                    <span className={s.k}>spot</span>
                  </div>
                  <div style={{ padding: '8px 11px' }}>
                    <table className={s.meas}>
                      <tbody>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ffb300' }} />피크 전류 I₂pk
                          </td>
                          <td className={`${s.num} ${s.hi}`}>
                            <span ref={mPeakRef}>9.62</span> kA
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ffb300' }} />RMS 전류 I₂rms
                          </td>
                          <td className={s.num}>
                            <span ref={mRmsRef}>7.18</span> kA
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />통전 시간 WELD
                          </td>
                          <td className={s.num}>
                            <span ref={mCycRef}>25</span> cyc · <span ref={mMsRef}>417</span> ms
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#54d6ff' }} />전극력 FORCE
                          </td>
                          <td className={s.num}>
                            <span ref={mForceRef}>2.40</span> kN
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#7af0b0' }} />용접 에너지
                          </td>
                          <td className={s.num}>
                            <span ref={mEnergyRef}>1.86</span> kJ
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />통전각 / 듀티
                          </td>
                          <td className={s.num}>
                            <span ref={mDutyRef}>72</span>%
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#ff4d4d' }} />익스펄전 / 스패터
                          </td>
                          <td className={s.num} ref={mExpRef}>
                            NONE
                          </td>
                        </tr>
                        <tr>
                          <td className={s.lbl}>
                            <span className={s.swatch} style={{ color: '#8d8d8d' }} />너깃 추정 Ø
                          </td>
                          <td className={s.num}>
                            <span ref={mNugRef}>5.4</span> mm
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className={s.routineNote}>
                      <b>판정 흐름</b> 트리거=용접 개시(전극 통전), 한 타점마다 I₂ 파형 취득 → 피크·RMS·통전 cycle 계측 → 익스펄전 검출 시 해당 타점 플래그 → 다음 타점으로 진행.
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.bottom}>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>SPOT TREND · 타점별 피크 I₂pk</span>
                    <span className={s.k} ref={trendStatRef}>
                      kA
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={trendRef} className={s.trendcanvas} width={640} height={220} />
                  </div>
                </div>
                <div className={s.panel}>
                  <div className={s.hd}>
                    <span>ELECTRODE · 너깃 형성</span>
                    <span className={s.k} ref={nugStatRef}>
                      HEAT
                    </span>
                  </div>
                  <div style={{ padding: 8 }}>
                    <canvas ref={nugRef} className={s.nugcanvas} width={300} height={220} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT RACK */}
            <div className={s.rack}>
              <div className={s.group}>
                <h3>TRACE · 표시 채널</h3>
                {[
                  { color: '#ffb300', n: '1', co: 'I₂ 2차 전류', yr: 'secondary current · ', b: 'kA' },
                  { color: '#54d6ff', n: '2', co: '전극력 FORCE', yr: 'electrode force · ', b: 'kN' },
                  { color: '#ff8a1e', n: '3', co: '통전 엔벨로프', yr: 'heat envelope · ', b: 'upslope/pulse' },
                  { color: '#7af0b0', n: '4', co: '누적 열량 I²t', yr: 'cumulative heat · ', b: 'energy' },
                ].map((c, i) => (
                  <div className={s.chrow} key={i}>
                    <button
                      className={s.chbtn}
                      data-ch={i}
                      data-on="1"
                      style={{ color: c.color }}
                      ref={(el) => {
                        chBtnRefs.current[i] = el
                      }}
                    >
                      {c.n}
                    </button>
                    <div className={s.chmeta}>
                      <div className={s.co} style={{ color: c.color }}>
                        {c.co}
                      </div>
                      <div className={s.yr}>
                        {c.yr}
                        <b>{c.b}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={s.group}>
                <h3>SCALE · 스코프 스케일</h3>
                <div className={s.knobs}>
                  <div className={s.knob}>
                    <div className={s.dial} ref={kTimeRef} />
                    <div className={s.lab}>CYCLE / DIV</div>
                    <div className={s.val} ref={vTimeRef}>
                      4 cyc
                    </div>
                  </div>
                  <div className={s.knob}>
                    <div className={s.dial} ref={kAmpRef} />
                    <div className={s.lab}>kA / DIV</div>
                    <div className={s.val} ref={vAmpRef}>
                      3 kA
                    </div>
                  </div>
                </div>
              </div>

              <div className={s.group}>
                <h3>WELD · 통전 파라미터</h3>
                <div className={s.seg}>
                  <button
                    data-mode="AC"
                    aria-pressed="true"
                    ref={(el) => {
                      modeSegRefs.current[0] = el
                    }}
                  >
                    AC 반주기
                  </button>
                  <button
                    data-mode="MFDC"
                    aria-pressed="false"
                    ref={(el) => {
                      modeSegRefs.current[1] = el
                    }}
                  >
                    MFDC 인버터
                  </button>
                </div>
                <div className={s.slider}>
                  <label>HEAT %</label>
                  <input type="range" className={s.range} min={35} max={98} defaultValue={72} ref={heatRngRef} />
                  <span className={s.sv} ref={heatValRef}>
                    72%
                  </span>
                </div>
                <div className={s.slider}>
                  <label>FORCE kN</label>
                  <input type="range" className={s.range} min={120} max={420} defaultValue={240} ref={forceRngRef} />
                  <span className={s.sv} ref={forceValRef}>
                    2.4kN
                  </span>
                </div>
                <div className={s.modnote} ref={modeNoteRef}>
                  <b>AC</b> 60Hz 반주기 위상제어 — 통전각(α)이 HEAT를 결정, 극성 교번 정현 펄스열.
                </div>
              </div>

              <div className={s.group}>
                <h3>TRIGGER · 용접 개시</h3>
                <div className={s.seg}>
                  <button
                    data-edge="rise"
                    aria-pressed="true"
                    ref={(el) => {
                      edgeSegRefs.current[0] = el
                    }}
                  >
                    ▲ RISE
                  </button>
                  <button
                    data-edge="fall"
                    aria-pressed="false"
                    ref={(el) => {
                      edgeSegRefs.current[1] = el
                    }}
                  >
                    ▼ FALL
                  </button>
                </div>
                <div className={s.slider}>
                  <label>LEVEL kA</label>
                  <input type="range" className={s.range} min={0} max={90} defaultValue={18} ref={trigLvlRef} />
                  <span className={s.sv} ref={trigValRef}>
                    1.8kA
                  </span>
                </div>
              </div>

              <div className={s.group}>
                <h3>ACQUIRE · 취득 제어</h3>
                <div className={s.btns}>
                  <button className={`${s.ab} ${s.run}`} data-state="run" ref={runBtnRef}>
                    RUN / STOP
                    <small ref={runSubRef}>연속 취득</small>
                  </button>
                  <button className={s.ab} onClick={singleShot}>
                    SINGLE<small>다음 1타점 취득</small>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={s.hint}>
            <b>스팟 용접 전류 계측</b> = 용접 스케줄(SQUEEZE 가압 → WELD 통전 → HOLD 유지)에서 2차 전류 I₂가 결정적으로 파생된다 · AC는 통전각으로, MFDC는 DC 플래토로 열을 제어 · 노브 위/아래 드래그로 CYCLE·kA/DIV 변경 · 채널 1-4 토글 · 한 타점마다 새 파형이 그려지고 다음 타점으로 진행
          </div>

          <div className={s.footstrip}>
            <div className={s.skills}>
              <span className={`${s.chip} ${s.hi}`}>저항 스팟 용접</span>
              <span className={`${s.chip} ${s.hi}`}>2차 전류 I₂</span>
              <span className={`${s.chip} ${s.hi}`}>통전 cycle</span>
              <span className={s.chip}>AC 위상제어</span>
              <span className={s.chip}>MFDC 인버터</span>
              <span className={s.chip}>멀티 펄스</span>
              <span className={s.chip}>업/다운 슬로프</span>
              <span className={s.chip}>전극력 kN</span>
              <span className={s.chip}>피크/RMS</span>
              <span className={s.chip}>용접 에너지</span>
              <span className={`${s.chip} ${s.hi}`}>익스펄전 검출</span>
              <span className={s.chip}>스패터</span>
              <span className={s.chip}>너깃 형성</span>
              <span className={s.chip}>통전각 α</span>
              <span className={s.chip}>트리거</span>
              <span className={s.chip}>CRT 스코프</span>
              <span className={s.chip}>전류 모니터</span>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
