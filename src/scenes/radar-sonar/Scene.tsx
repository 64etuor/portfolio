'use client'

import { useEffect, useRef, useCallback } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import { pad3, initContacts, type Contact, type Ping, type FakeRow } from './helpers'
import {
  drawGrid,
  drawSweep,
  drawPings,
  drawContacts,
  drawCursor,
  drawCenter,
} from './draw'
import { createRuntime, type Runtime } from './runtime'
import { RadarView } from './view'
import type {
  ScopeGeom,
  MouseState,
  ActiveFilters,
  SceneRefs,
  SceneState,
} from './types'

/* ════════════════════════════════════════════════════════════════
   Work Radar — radar-sonar.html 이식
   PPI 소나 스코프 + 신호 탐지 관제 콕핏 (thin orchestrator)
   draw.ts / runtime.ts / view.tsx / types.ts 로 분해
   ════════════════════════════════════════════════════════════════ */

export default function Scene({ running = true, onReady }: SceneProps) {
  // --- DOM refs for HUD / overlay elements ---
  const hudBearingRef = useRef<HTMLSpanElement>(null)
  const hudRangeRef = useRef<HTMLSpanElement>(null)
  const hudContactsRef = useRef<HTMLSpanElement>(null)
  const hudVerifiedRef = useRef<HTMLSpanElement>(null)
  const hudPhaseRef = useRef<HTMLSpanElement>(null)
  const hudPhaseTagRef = useRef<HTMLDivElement>(null)
  const curBrgRef = useRef<HTMLSpanElement>(null)
  const curRngRef = useRef<HTMLSpanElement>(null)
  const liveDetRef = useRef<HTMLSpanElement>(null)
  const livePriRef = useRef<HTMLSpanElement>(null)
  const liveResRef = useRef<HTMLSpanElement>(null)
  const lockStateRef = useRef<HTMLSpanElement>(null)
  const lockIdRef = useRef<HTMLSpanElement>(null)
  const lockVerdictRef = useRef<HTMLSpanElement>(null)
  const trackBodyRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const dcTrkRef = useRef<HTMLDivElement>(null)
  const dcIdRef = useRef<HTMLDivElement>(null)
  const dcSubRef = useRef<HTMLDivElement>(null)
  const dcBrgRef = useRef<HTMLDivElement>(null)
  const dcRngRef = useRef<HTMLDivElement>(null)
  const dcClassRef = useRef<HTMLDivElement>(null)
  const dcConfRef = useRef<HTMLDivElement>(null)
  const dcVerdictRef = useRef<HTMLDivElement>(null)
  const dcDescRef = useRef<HTMLDivElement>(null)
  const dcAchRef = useRef<HTMLDivElement>(null)
  const dcTagsRef = useRef<HTMLDivElement>(null)

  // --- legend filter rows ---
  const legendSignalRef = useRef<HTMLDivElement>(null)
  const legendSurfaceRef = useRef<HTMLDivElement>(null)
  const legendAgentRef = useRef<HTMLDivElement>(null)
  const legendGateRef = useRef<HTMLDivElement>(null)
  const cntSignalRef = useRef<HTMLSpanElement>(null)
  const cntSurfaceRef = useRef<HTMLSpanElement>(null)
  const cntAgentRef = useRef<HTMLSpanElement>(null)
  const cntGateRef = useRef<HTMLSpanElement>(null)

  // --- ladder lad refs (4 phases) ---
  const ladRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // --- mutable scene state in refs ---
  const contacts = useRef<Contact[]>(initContacts())
  const sweepAngle = useRef(-Math.PI / 2)
  const prevSweep = useRef(-Math.PI / 2)
  const lockPhaseTime = useRef(0)
  const acqHold = useRef(0)
  const lastReann = useRef(0)
  const maxPhase = useRef(0)
  const selected = useRef<Contact | null>(null)
  const hoverContact = useRef<Contact | null>(null)
  const mouse = useRef<MouseState>({ x: -9999, y: -9999, inScope: false })
  const pings = useRef<Ping[]>([])
  const activeFilters = useRef<ActiveFilters>({ signal: true, surface: true, agent: true, gate: true })
  const fakeRowsRef = useRef<FakeRow[]>([])
  const fakeIdxRef = useRef(0)

  // canvas interaction needs current W/H/CX/CY/R derived from f.w/f.h each frame
  const scopeGeom = useRef<ScopeGeom>({ W: 0, H: 0, CX: 0, CY: 0, R: 0 })

  useSceneReady(onReady)

  // --- bundle refs + mutable state for draw/runtime modules ---
  const refs = useRef<SceneRefs>({
    hudBearingRef, hudRangeRef, hudContactsRef, hudVerifiedRef, hudPhaseRef, hudPhaseTagRef,
    curBrgRef, curRngRef, liveDetRef, livePriRef, liveResRef,
    lockStateRef, lockIdRef, lockVerdictRef, trackBodyRef, tickerRef, clockRef, detailRef,
    dcTrkRef, dcIdRef, dcSubRef, dcBrgRef, dcRngRef, dcClassRef, dcConfRef, dcVerdictRef, dcDescRef, dcAchRef, dcTagsRef,
    legendSignalRef, legendSurfaceRef, legendAgentRef, legendGateRef,
    cntSignalRef, cntSurfaceRef, cntAgentRef, cntGateRef, ladRefs,
  }).current

  const state = useRef<SceneState>({
    contacts, sweepAngle, prevSweep, lockPhaseTime, acqHold, lastReann, maxPhase,
    selected, hoverContact, mouse, pings, activeFilters, fakeRowsRef, fakeIdxRef, scopeGeom,
  }).current

  // --- single stable runtime engine (state/refs are stable ref bundles) ---
  const rt = useRef<Runtime | null>(null)
  if (rt.current === null) rt.current = createRuntime(refs, state, s)
  const runtime = rt.current

  // --- Main draw callback ---
  const ref = useSceneCanvas(
    (g: CanvasRenderingContext2D, fr: Frame) => {
      const W = fr.w, H = fr.h
      const CX = W / 2, CY = H / 2
      const R = Math.min(W, H) * 0.46

      // store for mouse hit-test
      scopeGeom.current = { W, H, CX, CY, R }

      const dt = Math.min(fr.dt, 0.05)

      runtime.updateDetection(dt)

      // reset cycle when all detected
      if (contacts.current.every((c) => c._detected)) {
        acqHold.current += dt
        if (acqHold.current > 2.2) {
          runtime.resetAcquisition()
          acqHold.current = 0
        }
      } else {
        acqHold.current = 0
      }

      // drift + glow decay
      contacts.current.forEach((c) => {
        if (c._glow > 0) c._glow = Math.max(0, c._glow - dt / 3.8)
        if (c._detected) {
          c._driftT += c._driftSpeed * dt
          c._a = c._baseA + Math.sin(c._driftT) * c._driftAmp
          c.ring = c._baseRing + Math.sin(c._driftT * 0.7 + 1.3) * c._driftRingAmp
        }
      })

      // sweep bearing readout
      let brgDeg = ((sweepAngle.current * 180 / Math.PI) + 90) % 360
      if (brgDeg < 0) brgDeg += 360
      if (hudBearingRef.current) hudBearingRef.current.textContent = pad3(brgDeg) + '°'

      g.clearRect(0, 0, W, H)

      // background radial glow
      const bg = g.createRadialGradient(CX, CY, 0, CX, CY, R * 1.15)
      bg.addColorStop(0, 'rgba(20,70,45,0.35)')
      bg.addColorStop(0.6, 'rgba(8,40,26,0.18)')
      bg.addColorStop(1, 'rgba(2,10,6,0)')
      g.fillStyle = bg
      g.beginPath(); g.arc(CX, CY, R * 1.15, 0, Math.PI * 2); g.fill()

      drawGrid(g, CX, CY, R)
      drawPings(g, CX, CY, R, dt, state)
      drawSweep(g, CX, CY, R, state)
      drawContacts(g, CX, CY, R, state)
      drawCursor(g, CX, CY, R, state, curBrgRef, curRngRef)
      drawCenter(g, CX, CY)
    },
    { running },
  )

  // --- Canvas mouse events ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      // forward to useSceneCanvas ref
      ;(ref as unknown as React.RefCallback<HTMLCanvasElement>)(node)
      canvasRef.current = node
    },
    [ref],
  )

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    function onMouseMove(e: MouseEvent) {
      const r = cv!.getBoundingClientRect()
      mouse.current.x = e.clientX - r.left
      mouse.current.y = e.clientY - r.top
      mouse.current.inScope = true
      const c = runtime.getContactAt(mouse.current.x, mouse.current.y)
      hoverContact.current = c
      cv!.style.cursor = c ? 'pointer' : 'crosshair'
    }
    function onMouseLeave() {
      mouse.current.inScope = false
      hoverContact.current = null
    }
    function onCanvasClick(e: MouseEvent) {
      const r = cv!.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const c = runtime.getContactAt(mx, my)
      if (c) runtime.selectContact(c)
    }

    cv.addEventListener('mousemove', onMouseMove)
    cv.addEventListener('mouseleave', onMouseLeave)
    cv.addEventListener('click', onCanvasClick)
    return () => {
      cv.removeEventListener('mousemove', onMouseMove)
      cv.removeEventListener('mouseleave', onMouseLeave)
      cv.removeEventListener('click', onCanvasClick)
    }
  }, [runtime])

  // --- Live table / HUD noise intervals ---
  useEffect(() => {
    if (!running) return
    runtime.clockTick()
    const t1 = setInterval(runtime.liveTableTick, 420)
    const t2 = setInterval(runtime.hudNoiseTick, 1100)
    const t3 = setInterval(runtime.clockTick, 1000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
      clearInterval(t3)
    }
  }, [running, runtime])

  // --- Keyboard / global event for modal close ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') runtime.closeDetail()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [runtime])

  // --- Boot: escalate S0 + HUD init ---
  useEffect(() => {
    runtime.escalatePhase(0)
    runtime.updateHUD()
  }, [runtime])

  // --- Legend filter toggle handlers ---
  const handleFilterToggle = useCallback(
    (type: 'signal' | 'surface' | 'agent' | 'gate', rowRef: React.RefObject<HTMLDivElement | null>) => {
      return () => {
        activeFilters.current[type] = !activeFilters.current[type]
        rowRef.current?.classList.toggle(s.legendRowOff, !activeFilters.current[type])
      }
    },
    [],
  )

  const onPing = useCallback(() => {
    pings.current.push({ r: 6, life: 1.4 })
    runtime.escalatePhase(1)
    runtime.setTicker('ACTIVE PING (S1) -- Today Timeline 서피스 신호 재조사 · drag 배치 큐 갱신 중')
  }, [runtime])

  const onCloseDetail = useCallback(() => runtime.closeDetail(), [runtime])

  const onDetailBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === detailRef.current) runtime.closeDetail()
    },
    [runtime],
  )

  return (
    <SceneHost className={s.root} bg="#020705">
      <RadarView
        refs={refs}
        setCanvasRef={setCanvasRef}
        onFilterToggle={handleFilterToggle}
        onPing={onPing}
        onCloseDetail={onCloseDetail}
        onDetailBackdropClick={onDetailBackdropClick}
      />
    </SceneHost>
  )
}
