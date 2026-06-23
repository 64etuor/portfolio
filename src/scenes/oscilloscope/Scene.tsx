'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import { renderLive, renderNug, renderSched, renderScope, renderTrend } from './draw'
import {
  advanceSpotState,
  seedOnce,
  setupControls,
  singleShot,
  updateMeasureDOM,
} from './runtime'
import { spotVar } from './draw'
import type { Channel, Disp, Meas, OscRefs, SpotVar, State, TrendItem } from './types'

/* ════════════════════════════════════════════════════════════════
   스팟 용접 2차 전류 모니터 · oscilloscope.html 이식 (레퍼런스 포팅)
   I₂ kA / 통전 사이클 · AC / MFDC · 5 캔버스(라이브 스코프 / 타점 스코프 /
   스케줄 / 트렌드 / 너깃) + 계측 DOM + 우측 컨트롤 랙.
   하네스는 1px 드라이버 캔버스로 프레임 클럭만 제공하고, 5 캔버스는
   고정 해상도로 imperative 렌더(원본 픽셀 좌표 그대로 유지).
   · 상수/스케줄 → constants.ts, 순수 헬퍼 + 캔버스 렌더 → draw.ts,
     시뮬레이션 엔진 + 컨트롤 배선 → runtime.ts, 정적 JSX → view.tsx.
   이 파일은 refs + hooks + rAF 콜백 배선만 담당하는 thin orchestrator.
   ════════════════════════════════════════════════════════════════ */

import { SceneView } from './view'

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

  // ===== persistent simulation state (refs, mutated in draw/runtime) =====
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
  const cycleStepsRef = useRef<number[]>([2, 3, 4, 6, 10])
  const ampStepsRef = useRef<number[]>([1, 2, 3, 5, 8])
  const cycleIdxRef = useRef(2)
  const ampIdxRef = useRef(2)
  const chRef = useRef<Channel[]>([
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
  const dispRef = useRef<Disp>({ peak: 0, rms: 0, energy: 0, nug: 0 })
  const lastTRef = useRef(0)
  const seededRef = useRef(false)
  const singleWatchRef = useRef(false)
  const clockStrRef = useRef('--:--:--')
  const VRRef = useRef({ start: 0, win: 0 })

  // ===== ref bundle threaded to runtime + draw modules =====
  const refsRef = useRef<OscRefs | null>(null)
  if (!refsRef.current) {
    refsRef.current = {
      liveRef, scopeRef, schedRef, trendRef, nugRef,
      acqDotRef, acqStateRef, modePillRef, spotNoRef, clockRef,
      schedStatRef, trendStatRef, nugStatRef, scrLabelRef, modeNoteRef,
      mPeakRef, mRmsRef, mCycRef, mMsRef, mForceRef, mEnergyRef, mDutyRef, mExpRef, mNugRef,
      chBtnRefs, kTimeRef, kAmpRef, vTimeRef, vAmpRef, modeSegRefs, edgeSegRefs,
      heatRngRef, heatValRef, forceRngRef, forceValRef, trigLvlRef, trigValRef, runBtnRef, runSubRef,
      stateRef, cycleStepsRef, ampStepsRef, cycleIdxRef, ampIdxRef, chRef,
      spotRef, curSpotRef, measRef, spotTRef, revealRef, expFiredRef, liveFreezeRef,
      histRef, dispRef, lastTRef, seededRef, singleWatchRef, clockStrRef, VRRef,
    }
  }
  const r = refsRef.current

  useSceneReady(onReady)

  // ===== DOM control handlers (attached once on mount) =====
  useEffect(() => setupControls(r, s), [r])

  // ============================================================
  // DRAW — driven once per frame by the harness (driver canvas).
  // ============================================================
  const ref = useSceneCanvas((_g: CanvasRenderingContext2D, fr: Frame) => {
    const st = r.stateRef.current

    // first-frame init (seed history + initial measure once)
    seedOnce(r)

    // ----- time / dt from harness frame -----
    const dt = Math.min(fr.t - r.lastTRef.current, 0.05)
    r.lastTRef.current = fr.t
    if (st.running) st.t += Math.max(0, dt)
    advanceSpotState(r, Math.max(0, dt))

    // single-shot watcher: run one acquisition then stop
    if (r.singleWatchRef.current && r.revealRef.current >= 1) {
      r.singleWatchRef.current = false
      st.running = false
      if (r.runBtnRef.current) r.runBtnRef.current.dataset.state = 'stop'
      if (r.runSubRef.current) r.runSubRef.current.textContent = '정지됨'
      if (r.acqDotRef.current) r.acqDotRef.current.className = s.dot + ' ' + s.stop
      if (r.acqStateRef.current) r.acqStateRef.current.textContent = 'STOP · HOLD'
    }

    updateMeasureDOM(r, s, Math.max(0, dt))

    // status pill
    if (st.running) {
      const alarm = r.curSpotRef.current.expulsion && r.expFiredRef.current
      if (r.acqDotRef.current) r.acqDotRef.current.className = s.dot + ' ' + (alarm ? s.stop : s.run)
      if (r.acqStateRef.current)
        r.acqStateRef.current.textContent = alarm
          ? 'EXPULSION · 스패터'
          : r.revealRef.current < 1
            ? 'ACQUIRE · WELD'
            : 'DWELL · 계측'
    }
    if (r.spotNoRef.current) r.spotNoRef.current.textContent = '#' + String(r.spotRef.current).padStart(4, '0')

    renderLive(r)
    renderScope(r)
    renderSched(r)
    renderTrend(r)
    renderNug(r)
  }, { running })

  return <SceneView driverRef={ref} refs={r} s={s} onSingle={() => singleShot(r)} />
}
