// ============================================================
// Oscilloscope scene — runtime: simulation engine + DOM control wiring.
// Functions close over an OscRefs bundle (threaded explicitly) instead of
// the component body, preserving the original ref-mutation semantics.
// ============================================================
import { SCH, TOTAL, WELD, WELD_END } from './constants'
import { arcTex, envAmp, expulsionTerm, spotVar } from './draw'
import type { Meas, OscRefs, SceneStyles } from './types'

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

// ----- spot-state timing -----
const T_ACQ = 2.3
const T_DWELL = 1.0

// ============================================================
// simulation helpers — read/mutate refs from the supplied bundle
// ============================================================
export function peakKA(r: OscRefs) {
  const st = r.stateRef.current
  const base = r.curSpotRef.current.peakBase
  if (st.mode === 'AC') return base * (0.78 + 0.22 * st.heat)
  return base * (0.7 + 0.34 * st.heat)
}

export function curr(r: OscRefs, c: number, pk: number, exp: boolean) {
  const st = r.stateRef.current
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

export function computeMeasure(r: OscRefs): Meas {
  const st = r.stateRef.current
  const N = 720
  const tot = TOTAL()
  const pk = peakKA(r)
  let sumSq = 0
  let peak = 0
  let acc = 0
  const cum = new Float32Array(N + 1)
  for (let i = 0; i <= N; i++) {
    const c = (i / N) * tot
    const v = curr(r, c, pk, r.curSpotRef.current.expulsion)
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
  return { rms, peak, kJ, tWeld, cum, N, tot, nuggetMM: nug, expulsion: r.curSpotRef.current.expulsion }
}

export function refreshMeasure(r: OscRefs) {
  r.measRef.current = computeMeasure(r)
}

export function energyAt(r: OscRefs, c: number) {
  const meas = r.measRef.current
  if (!meas) return 0
  const i = Math.max(0, Math.min(meas.N, Math.round((c / meas.tot) * meas.N)))
  return meas.cum[i]
}

export function pushTrend(r: OscRefs) {
  const meas = r.measRef.current
  if (meas) r.histRef.current.push({ kA: meas.peak, exp: r.curSpotRef.current.expulsion, n: r.spotRef.current })
  while (r.histRef.current.length > TREND_MAX) r.histRef.current.shift()
}

export function advanceSpotState(r: OscRefs, dt: number) {
  const st = r.stateRef.current
  if (!st.running) return
  r.spotTRef.current += dt
  if (r.spotTRef.current < T_ACQ) {
    r.revealRef.current = r.spotTRef.current / T_ACQ
  } else if (r.spotTRef.current < T_ACQ + T_DWELL) {
    r.revealRef.current = 1
  } else {
    pushTrend(r)
    r.spotRef.current++
    r.curSpotRef.current = spotVar(r.spotRef.current)
    r.spotTRef.current = 0
    r.revealRef.current = 0
    r.expFiredRef.current = false
    refreshMeasure(r)
  }
  const revealC = r.revealRef.current * TOTAL()
  if (r.curSpotRef.current.expulsion && revealC > SCH.squeeze + WELD.dur * 0.58) r.expFiredRef.current = true
}

export function nuggetGrowth(r: OscRefs) {
  const c = r.revealRef.current * TOTAL()
  if (c < SCH.squeeze) return 0
  if (c <= WELD_END) return Math.min(1, (c - SCH.squeeze) / WELD.dur)
  const hc = (c - WELD_END) / SCH.hold
  return Math.max(0.72, 1 - hc * 0.28)
}

export function viewRange(r: OscRefs) {
  const st = r.stateRef.current
  const tot = TOTAL()
  const win = Math.min(st.cyclePerDiv * DIVX, tot)
  let start = 0
  if (win < tot) {
    const revealC = r.revealRef.current * tot
    start = Math.max(0, Math.min(revealC - win * 0.82, tot - win))
  }
  return { start, win }
}

export function LWIN() {
  return TOTAL() * 1.25
}

export function streamPeak(r: OscRefs, idx: number) {
  const st = r.stateRef.current
  const base = 9.55 + Math.sin(idx * 1.27) * 0.32 + Math.cos(idx * 0.63) * 0.16
  return st.mode === 'AC' ? base * (0.78 + 0.22 * st.heat) : base * (0.7 + 0.34 * st.heat)
}

export function streamCurr(r: OscRefs, c: number) {
  const tot = TOTAL()
  const idx = Math.floor(c / tot)
  const local = c - idx * tot
  return curr(r, local, streamPeak(r, idx), (((idx % 7) + 7) % 7) === 5)
}

// ============================================================
// SINGLE-shot acquisition (button handler bound in the component)
// ============================================================
export function singleShot(r: OscRefs) {
  const st = r.stateRef.current
  pushTrend(r)
  r.spotRef.current++
  r.curSpotRef.current = spotVar(r.spotRef.current)
  r.spotTRef.current = 0
  r.revealRef.current = 0
  r.expFiredRef.current = false
  refreshMeasure(r)
  if (!st.running) {
    st.running = true
    if (r.runBtnRef.current) r.runBtnRef.current.dataset.state = 'run'
    r.singleWatchRef.current = true
  }
}

// ============================================================
// per-frame measure → DOM sync
// ============================================================
export function updateMeasureDOM(r: OscRefs, s: SceneStyles, dt: number) {
  const meas = r.measRef.current
  if (!meas) return
  const st = r.stateRef.current
  const disp = r.dispRef.current
  const lf = Math.min(dt * 3, 1)
  disp.peak += (meas.peak - disp.peak) * lf
  disp.rms += (meas.rms - disp.rms) * lf
  disp.energy += (meas.kJ - disp.energy) * lf
  disp.nug += (meas.nuggetMM * Math.max(0.4, nuggetGrowth(r)) - disp.nug) * lf
  if (r.mPeakRef.current) r.mPeakRef.current.textContent = disp.peak.toFixed(2)
  if (r.mRmsRef.current) r.mRmsRef.current.textContent = disp.rms.toFixed(2)
  if (r.mCycRef.current) r.mCycRef.current.textContent = String(WELD.dur)
  if (r.mMsRef.current) r.mMsRef.current.textContent = String((WELD.dur * 16.7) | 0)
  if (r.mForceRef.current) r.mForceRef.current.textContent = st.forceKN.toFixed(2)
  if (r.mEnergyRef.current) r.mEnergyRef.current.textContent = disp.energy.toFixed(2)
  if (r.mDutyRef.current) r.mDutyRef.current.textContent = String((st.heat * 100) | 0)
  if (r.mNugRef.current) r.mNugRef.current.textContent = disp.nug.toFixed(1)
  const alarm = r.curSpotRef.current.expulsion && r.expFiredRef.current
  if (r.mExpRef.current) {
    r.mExpRef.current.textContent = alarm ? 'DETECTED ⚠' : 'NONE'
    r.mExpRef.current.className = alarm ? `${s.num} ${s.alarm}` : s.num
  }
}

// ============================================================
// first-frame seed (history + initial measure once)
// ============================================================
export function seedOnce(r: OscRefs) {
  if (r.seededRef.current) return
  r.seededRef.current = true
  refreshMeasure(r)
  const m0 = r.measRef.current
  if (m0) r.dispRef.current = { peak: m0.peak, rms: m0.rms, energy: m0.kJ, nug: m0.nuggetMM }
  const savedSpot = r.spotRef.current
  const savedCur = r.curSpotRef.current
  for (let i = Math.max(1, savedSpot - 10); i < savedSpot; i++) {
    const cs = spotVar(i)
    r.curSpotRef.current = cs
    const m = computeMeasure(r)
    r.histRef.current.push({ kA: m.peak, exp: cs.expulsion, n: i })
  }
  r.curSpotRef.current = savedCur
  r.spotRef.current = savedSpot
  refreshMeasure(r)
}

// ============================================================
// DOM control handlers (attached once on mount) — returns cleanup.
// ============================================================
export function setupControls(r: OscRefs, s: SceneStyles): () => void {
  const st = r.stateRef.current

  function syncMode() {
    r.modeSegRefs.current.forEach((b) => {
      if (b) b.setAttribute('aria-pressed', b.dataset.mode === st.mode ? 'true' : 'false')
    })
    if (r.modePillRef.current) {
      r.modePillRef.current.innerHTML = 'MODE <b style="color:#ffb300">' + st.mode + '</b>'
    }
    if (r.modeNoteRef.current) {
      r.modeNoteRef.current.innerHTML =
        st.mode === 'AC'
          ? '<b>AC</b> 60Hz 반주기 위상제어 — 통전각(α)이 HEAT를 결정, 극성 교번 정현 펄스열.'
          : '<b>MFDC</b> 중주파 인버터 DC — 상승 램프 후 평탄 DC 플래토, 리플 적고 단극성.'
    }
  }

  const cleanups: Array<() => void> = []

  // channel toggles
  r.chBtnRefs.current.forEach((btn, i) => {
    if (!btn) return
    const h = () => {
      r.chRef.current[i].on = !r.chRef.current[i].on
      btn.dataset.on = r.chRef.current[i].on ? '1' : '0'
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
    r.kTimeRef.current,
    () => r.cycleIdxRef.current,
    (i) => {
      r.cycleIdxRef.current = i
      st.cyclePerDiv = r.cycleStepsRef.current[i]
    },
    r.cycleStepsRef.current,
    r.vTimeRef.current,
    (v) => v + ' cyc'
  )
  setupKnob(
    r.kAmpRef.current,
    () => r.ampIdxRef.current,
    (i) => {
      r.ampIdxRef.current = i
      st.kaPerDiv = r.ampStepsRef.current[i]
    },
    r.ampStepsRef.current,
    r.vAmpRef.current,
    (v) => v + ' kA'
  )

  // mode toggle
  r.modeSegRefs.current.forEach((b) => {
    if (!b) return
    const h = () => {
      st.mode = (b.dataset.mode as 'AC' | 'MFDC') || 'AC'
      syncMode()
      refreshMeasure(r)
    }
    b.addEventListener('click', h)
    cleanups.push(() => b.removeEventListener('click', h))
  })
  syncMode()

  // heat / force sliders
  const heatRng = r.heatRngRef.current
  if (heatRng) {
    const h = (e: Event) => {
      const v = +(e.target as HTMLInputElement).value
      st.heat = v / 100
      if (r.heatValRef.current) r.heatValRef.current.textContent = v + '%'
      refreshMeasure(r)
    }
    heatRng.addEventListener('input', h)
    cleanups.push(() => heatRng.removeEventListener('input', h))
  }
  const forceRng = r.forceRngRef.current
  if (forceRng) {
    const h = (e: Event) => {
      const v = +(e.target as HTMLInputElement).value
      st.forceKN = v / 100
      if (r.forceValRef.current) r.forceValRef.current.textContent = st.forceKN.toFixed(1) + 'kN'
    }
    forceRng.addEventListener('input', h)
    cleanups.push(() => forceRng.removeEventListener('input', h))
  }

  // trigger edge
  r.edgeSegRefs.current.forEach((b) => {
    if (!b) return
    const h = () => {
      r.edgeSegRefs.current.forEach((x) => x?.setAttribute('aria-pressed', 'false'))
      b.setAttribute('aria-pressed', 'true')
      st.trigEdge = (b.dataset.edge as 'rise' | 'fall') || 'rise'
    }
    b.addEventListener('click', h)
    cleanups.push(() => b.removeEventListener('click', h))
  })
  const trigLvl = r.trigLvlRef.current
  if (trigLvl) {
    const h = (e: Event) => {
      const v = +(e.target as HTMLInputElement).value
      st.trigKA = v / 10
      if (r.trigValRef.current) r.trigValRef.current.textContent = st.trigKA.toFixed(1) + 'kA'
    }
    trigLvl.addEventListener('input', h)
    cleanups.push(() => trigLvl.removeEventListener('input', h))
  }

  // run/stop
  const runBtn = r.runBtnRef.current
  if (runBtn) {
    const h = () => {
      st.running = !st.running
      runBtn.dataset.state = st.running ? 'run' : 'stop'
      if (r.runSubRef.current) r.runSubRef.current.textContent = st.running ? '연속 취득' : '정지됨'
      if (r.acqDotRef.current) r.acqDotRef.current.className = s.dot + ' ' + (st.running ? s.run : s.stop)
      if (r.acqStateRef.current) r.acqStateRef.current.textContent = st.running ? 'ACQUIRE · WELD' : 'STOP · HOLD'
    }
    runBtn.addEventListener('click', h)
    cleanups.push(() => runBtn.removeEventListener('click', h))
  }

  // clock — driven by setInterval (not frame-bound)
  const tickClock = () => {
    const d = new Date()
    r.clockStrRef.current =
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0')
    if (r.clockRef.current) r.clockRef.current.textContent = r.clockStrRef.current
  }
  const clockIv = window.setInterval(tickClock, 1000)
  tickClock()
  cleanups.push(() => window.clearInterval(clockIv))

  return () => cleanups.forEach((c) => c())
}
