import type { Frame } from '../_host/types'
import { FEATURES, TARGETS, SKILLS, XCHECKS, SYMS, SEED0 } from './data'
import type { FeatureDatum } from './data'
import { PART, BOOT_MS, CYCLE_HOLD_MS, CSS } from './constants'
import { layout, drawGround, drawPart, drawCloud, drawMeasuredMarks, drawGantry, dimLine, calloutFCF, drawCpk } from './draw'
import type { RuntimeState, RuntimeFeature, RuntimeTarget, SceneDomRefs } from './types'
import type s from './scene.module.css'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function text(el: Element | null | undefined, value: string | number) {
  if (el) el.textContent = String(value)
}

export function specStr(f: FeatureDatum) {
  if (f.type === 'size') return `${f.spec}${f.unit}`
  return `${f.sym} ${f.tol?.toFixed(3)}`
}

export function measStr(f: RuntimeFeature, dev?: number) {
  const d = dev === undefined ? f.dev : dev
  if (f.type === 'size') return `${((f.nom ?? 0) + d).toFixed(3)}${f.unit}`
  return `${d.toFixed(3)}${f.unit}`
}

export function waitingTag(styles: typeof s) {
  return `<span class="${styles.tag} ${styles.waitingTag}">대기</span>`
}

export function setTag(el: Element | null | undefined, styles: typeof s, kind: 'pass' | 'fail', label: string) {
  if (el) el.innerHTML = `<span class="${styles.tag} ${styles[kind]}">${label}</span>`
}

// ---------------------------------------------------------------------------
// State factory
// ---------------------------------------------------------------------------

export function createRuntimeState(): RuntimeState {
  const features: RuntimeFeature[] = FEATURES.map((feature) => ({ ...feature, _measured: false, _showOut: false, _markPulse: 0 }))
  const byKey = new Map(features.map((feature) => [feature.key, feature]))
  const targets = TARGETS.map(({ featureKey, ...target }) => {
    const f = byKey.get(featureKey)
    if (!f) throw new Error(`Missing feature for target: ${featureKey}`)
    const runtimeTarget: RuntimeTarget = { ...target, f }
    f._tg = runtimeTarget
    return runtimeTarget
  })

  return {
    seed: SEED0,
    ori: { x: 0, y: 0 },
    scl: 1,
    features,
    targets,
    cloud: [],
    probe: { px: 0, py: 0, pz: 80, tpx: 0, tpy: 0, tpz: 80, touch: 0 },
    timeline: [],
    tlIndex: 0,
    cycleStartSec: 0,
    nowMs: 0,
    passCount: 0,
    measuredFeatures: 0,
    cpkTarget: 0,
    cpkShown: 0,
    scanPts: 0,
    initialized: false,
    bootDone: false,
    bootDoneSec: 0,
    toastHideAtMs: 0,
    flashUntil: {},
    activeTarget: null,
  }
}

// ---------------------------------------------------------------------------
// Math / RNG
// ---------------------------------------------------------------------------

export function rnd(st: RuntimeState) {
  st.seed = (st.seed * 1103515245 + 12345) & 0x7fffffff
  return st.seed / 0x7fffffff
}

// ---------------------------------------------------------------------------
// DOM updaters
// ---------------------------------------------------------------------------

function setDRO(refs: SceneDomRefs, x: number, y: number, z: number) {
  const fmt = (v: number) => {
    const sign = v >= 0 ? '+' : '-'
    const abs = Math.abs(v).toFixed(3).padStart(7, '0')
    return sign + abs
  }
  text(refs.droX.current, fmt(x))
  text(refs.droY.current, fmt(y))
  text(refs.droZ.current, fmt(z))
}

function spawnTouchPoints(st: RuntimeState, refs: SceneDomRefs, tg: RuntimeTarget, n: number, col: string) {
  for (let k = 0; k < n; k++) {
    const a = rnd(st) * Math.PI * 2
    const rad = rnd(st) * 10 + 3
    st.cloud.push({ x: tg.x + Math.cos(a) * rad * 0.7, y: tg.y + Math.sin(a) * rad * 0.7, z: tg.z + rnd(st) * 3, col })
  }
  st.scanPts += n
  text(refs.ptCount.current, Math.min(st.scanPts, 248))
}

function bumpCpk(st: RuntimeState) {
  st.cpkTarget = 0.6 + (st.passCount / 8) * 1.13
  if (st.cpkTarget > 1.73) st.cpkTarget = 1.73
}

function updatePassN(st: RuntimeState, refs: SceneDomRefs) {
  text(refs.passN.current, `${st.passCount}/8`)
}

function commitFeature(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, f: RuntimeFeature, kind: 'out' | 'pass') {
  const row = refs.rows.current[f.key]
  text(refs.meas.current[f.key], measStr(f))
  f._measured = true
  f._markPulse = 1
  st.measuredFeatures++
  if (kind === 'out') {
    row?.classList.add(styles.outRow)
    f._showOut = true
    setTag(refs.jud.current[f.key], styles, 'fail', 'FAIL')
  } else {
    row?.classList.add(styles.flash)
    st.flashUntil[f.key] = st.nowMs + 650
    setTag(refs.jud.current[f.key], styles, 'pass', 'PASS')
    st.passCount++
    bumpCpk(st)
  }
  updatePassN(st, refs)
}

function remeasureCyl(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, f: RuntimeFeature) {
  const row = refs.rows.current[f.key]
  row?.classList.remove(styles.outRow)
  row?.classList.add(styles.fixedRow, styles.flash)
  st.flashUntil[f.key] = st.nowMs + 650
  f._showOut = false
  f._markPulse = 1
  text(refs.meas.current[f.key], measStr(f, f.redev))
  setTag(refs.jud.current[f.key], styles, 'pass', 'PASS')
  st.passCount++
  bumpCpk(st)
  updatePassN(st, refs)
  text(refs.statText.current, '원통도 PASS — 측정 계속')
}

function showToast(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, html: string, kind: 'warn' | 'pass') {
  const toast = refs.toast.current
  if (!toast) return
  if (refs.toastTx.current) refs.toastTx.current.innerHTML = html
  text(refs.toastIc.current, kind === 'pass' ? '✓' : '⚠')
  toast.className = `${styles.hud} ${styles.toast}${kind === 'pass' ? ` ${styles.pass}` : ''}`
  void toast.offsetWidth
  toast.classList.add(styles.show)
  st.toastHideAtMs = st.nowMs + (kind === 'pass' ? 4200 : 3800)
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

function genTimeline(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  st.timeline = []
  let t = 900
  st.timeline.push({ t: 200, fn: () => { st.probe.tpx = 10; st.probe.tpy = 10; st.probe.tpz = 90 } })
  SKILLS.forEach((_, i) => {
    st.timeline.push({
      t: 500 + i * 55,
      fn: () => {
        refs.chips.current[i]?.classList.add(styles.on)
        text(refs.eqCount.current, `${i + 1}/${SKILLS.length}`)
      },
    })
  })

  st.features.forEach((f) => {
    const tg = f._tg
    if (!tg) return
    st.timeline.push({ t, fn: () => { refs.rows.current[f.key]?.classList.add(styles.show) } })
    st.timeline.push({
      t: t + 120,
      fn: () => {
        st.activeTarget = tg
        text(refs.statText.current, `MOVE → ${f.feat}`)
        st.probe.tpx = tg.x
        st.probe.tpy = tg.y
        st.probe.tpz = tg.z + 34
      },
    })
    st.timeline.push({
      t: t + 780,
      fn: () => {
        st.probe.tpz = tg.z + 3
        text(refs.statText.current, `PROBING · ${f.feat}`)
      },
    })
    st.timeline.push({
      t: t + 1280,
      fn: () => {
        st.probe.touch = 1
        spawnTouchPoints(st, refs, tg, 26, f.special ? 'rgba(255,93,108,.8)' : 'rgba(111,180,255,.75)')
        commitFeature(st, refs, styles, f, f.special ? 'out' : 'pass')
      },
    })
    if (f.special) {
      st.timeline.push({
        t: t + 2300,
        fn: () => {
          showToast(st, refs, styles, '⌭ <b>원통도</b> 0.061mm — 공차 0.040mm <b>초과(OUT-OF-TOL)</b> · 이상점(버) 검출 → 재측정', 'warn')
          text(refs.statText.current, 'OUT OF TOL — 이상점 제거 재측정')
        },
      })
      st.timeline.push({ t: t + 3600, fn: () => { st.probe.tpx = tg.x; st.probe.tpy = tg.y; st.probe.tpz = tg.z + 3 } })
      st.timeline.push({
        t: t + 4100,
        fn: () => {
          st.probe.touch = 1
          st.cloud.forEach((p) => {
            if (Math.abs(p.x - tg.x) < 14 && Math.abs(p.y - tg.y) < 14) p.col = 'rgba(60,230,164,.85)'
          })
          spawnTouchPoints(st, refs, tg, 18, 'rgba(60,230,164,.85)')
          remeasureCyl(st, refs, styles, f)
          showToast(st, refs, styles, '✓ 이상점 제거 재측정 <b>0.024mm IN-TOL</b> — 원통도 합격 · PASS', 'pass')
        },
      })
      t += 4900
    } else {
      t += 2100
    }
  })

  st.timeline.push({
    t: t + 200,
    fn: () => {
      text(refs.statText.current, 'REPORT 자동발행')
      st.probe.tpx = PART.bx / 2
      st.probe.tpy = -10
      st.probe.tpz = 95
    },
  })
  st.timeline.push({
    t: t + 1200,
    fn: () => {
      refs.statLed.current?.classList.add(styles.done)
      text(refs.statText.current, 'INSPECTION COMPLETE')
      refs.verdict.current?.classList.add(styles.on)
      text(refs.cpkNote.current, '전 피처 규격 내 · 자동발행 완료')
    },
  })
  st.timeline.push({ t: t + 1700, fn: () => { refs.crossover.current?.classList.add(styles.on) } })
  refs.xrows.current.forEach((_, i) => {
    st.timeline.push({ t: t + 2000 + i * 180, fn: () => { refs.xrows.current[i]?.classList.add(styles.show) } })
  })

  const lastT = t + 2000 + XCHECKS.length * 180
  st.timeline.push({ t: lastT + CYCLE_HOLD_MS, fn: (frameSec) => { restartCycle(st, refs, styles, frameSec) } })
}

function restartCycle(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, frameSec: number) {
  st.features.forEach((f) => {
    const row = refs.rows.current[f.key]
    row?.classList.remove(styles.show, styles.flash, styles.outRow, styles.fixedRow)
    text(refs.meas.current[f.key], '— —')
    const jud = refs.jud.current[f.key]
    if (jud) jud.innerHTML = waitingTag(styles)
    f._measured = false
    f._showOut = false
    f._markPulse = 0
  })
  st.passCount = 0
  st.measuredFeatures = 0
  updatePassN(st, refs)

  st.cloud.length = 0
  st.scanPts = 0
  text(refs.ptCount.current, 0)
  st.seed = SEED0

  refs.chips.current.forEach((chip) => chip?.classList.remove(styles.on))
  text(refs.eqCount.current, `0/${SKILLS.length}`)

  st.cpkTarget = 0
  st.cpkShown = 0
  text(refs.cpkNote.current, '측정 대기…')
  refs.verdict.current?.classList.remove(styles.on)
  refs.crossover.current?.classList.remove(styles.on)
  refs.xrows.current.forEach((row) => row?.classList.remove(styles.show))

  refs.statLed.current?.classList.remove(styles.done)
  text(refs.statText.current, 'INSPECTING')
  const toast = refs.toast.current
  if (toast) toast.className = `${styles.hud} ${styles.toast}`
  st.toastHideAtMs = 0
  st.flashUntil = {}

  st.probe.tpx = 10
  st.probe.tpy = 10
  st.probe.tpz = 90

  genTimeline(st, refs, styles)
  st.tlIndex = 0
  st.cycleStartSec = frameSec
  st.nowMs = 0
}

function initializeRuntime(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  if (st.initialized) return
  genTimeline(st, refs, styles)
  drawCpk(refs, 0)
  st.initialized = true
}

function updateBoot(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, frameSec: number) {
  if (st.bootDone) {
    if (frameSec - st.bootDoneSec > 0.65 && refs.boot.current) refs.boot.current.style.display = 'none'
    return
  }
  const p = Math.min(st.nowMs / BOOT_MS, 1)
  if (refs.bootFill.current) refs.bootFill.current.style.width = `${(p * 100).toFixed(0)}%`
  if (p >= 1) {
    st.bootDone = true
    st.bootDoneSec = frameSec
    refs.boot.current?.classList.add(styles.hide)
  }
}

function updateTimedDom(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  Object.entries(st.flashUntil).forEach(([key, until]) => {
    if (st.nowMs >= until) {
      refs.rows.current[key]?.classList.remove(styles.flash)
      delete st.flashUntil[key]
    }
  })
  if (st.toastHideAtMs && st.nowMs >= st.toastHideAtMs) {
    refs.toast.current?.classList.remove(styles.show)
    st.toastHideAtMs = 0
  }
}

// ---------------------------------------------------------------------------
// Main per-frame entry point
// ---------------------------------------------------------------------------

export function drawScene(g: CanvasRenderingContext2D, fr: Frame, st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  initializeRuntime(st, refs, styles)
  const W = fr.w
  const H = fr.h
  layout(st, W, H)
  st.nowMs = Math.max(0, (fr.t - st.cycleStartSec) * 1000)
  updateBoot(st, refs, styles, fr.t)

  while (st.tlIndex < st.timeline.length && st.nowMs >= st.timeline[st.tlIndex].t) {
    st.timeline[st.tlIndex].fn(fr.t)
    st.tlIndex++
  }
  updateTimedDom(st, refs, styles)

  const ease = 0.12
  st.probe.px += (st.probe.tpx - st.probe.px) * ease
  st.probe.py += (st.probe.tpy - st.probe.py) * ease
  st.probe.pz += (st.probe.tpz - st.probe.pz) * ease
  st.probe.touch *= 0.92
  if (st.probe.touch < 0.01) st.probe.touch = 0
  st.features.forEach((f) => {
    if ((f._markPulse || 0) > 0) {
      f._markPulse = (f._markPulse || 0) - 0.02
      if (f._markPulse < 0) f._markPulse = 0
    }
  })
  st.cpkShown += (st.cpkTarget - st.cpkShown) * 0.08
  text(refs.cpkVal.current, st.cpkShown.toFixed(2))
  if (refs.cpkNum.current) {
    refs.cpkNum.current.style.color = st.cpkShown >= 1.33 ? CSS.pass : st.cpkShown >= 1 ? CSS.amber : CSS.fail
  }
  drawCpk(refs, st.cpkShown)

  setDRO(refs, st.probe.px, st.probe.py, st.probe.pz)
  text(refs.clock.current, `T+${(st.nowMs / 1000).toFixed(1)}s`)

  g.clearRect(0, 0, W, H)
  drawGround(g, st)
  drawPart(g, st)
  drawCloud(g, st)
  drawMeasuredMarks(g, st)

  st.targets.forEach((t) => {
    if (t.f._measured) {
      const sym = SYMS[t.f.key]
      calloutFCF(g, st, t, sym[0], sym[1], !t.f._showOut)
    }
  })

  dimLine(g, st, { x: 0, y: -8, z: PART.baseH }, { x: PART.bx, y: -8, z: PART.baseH }, '200.00', CSS.datum, 0)
  dimLine(g, st, { x: -8, y: 0, z: PART.baseH }, { x: -8, y: PART.by, z: PART.baseH }, '140.00', CSS.datum, 0)
  drawGantry(g, st)
}
