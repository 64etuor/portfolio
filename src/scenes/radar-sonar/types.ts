// Work Radar — radar-sonar 씬 공유 타입 (클로저 상태를 명시적 params 로 전달)

import type { RefObject, MutableRefObject } from 'react'
import type { Contact, Ping, FakeRow } from './helpers'

/* ────────────────────────────────────────────────────
   Canvas scope geometry (frame 마다 갱신)
   ──────────────────────────────────────────────────── */
export interface ScopeGeom {
  W: number
  H: number
  CX: number
  CY: number
  R: number
}

export interface MouseState {
  x: number
  y: number
  inScope: boolean
}

export type ActiveFilters = {
  signal: boolean
  surface: boolean
  agent: boolean
  gate: boolean
}

/* ────────────────────────────────────────────────────
   Mutable scene state — draw / runtime 가 공유하는 ref 묶음
   (Scene.tsx 가 useRef 로 생성해 그대로 주입)
   ──────────────────────────────────────────────────── */
export interface SceneState {
  contacts: MutableRefObject<Contact[]>
  sweepAngle: MutableRefObject<number>
  prevSweep: MutableRefObject<number>
  lockPhaseTime: MutableRefObject<number>
  acqHold: MutableRefObject<number>
  lastReann: MutableRefObject<number>
  maxPhase: MutableRefObject<number>
  selected: MutableRefObject<Contact | null>
  hoverContact: MutableRefObject<Contact | null>
  mouse: MutableRefObject<MouseState>
  pings: MutableRefObject<Ping[]>
  activeFilters: MutableRefObject<ActiveFilters>
  fakeRowsRef: MutableRefObject<FakeRow[]>
  fakeIdxRef: MutableRefObject<number>
  scopeGeom: MutableRefObject<ScopeGeom>
}

/* ────────────────────────────────────────────────────
   HUD / overlay / table DOM refs
   ──────────────────────────────────────────────────── */
export interface SceneRefs {
  hudBearingRef: RefObject<HTMLSpanElement | null>
  hudRangeRef: RefObject<HTMLSpanElement | null>
  hudContactsRef: RefObject<HTMLSpanElement | null>
  hudVerifiedRef: RefObject<HTMLSpanElement | null>
  hudPhaseRef: RefObject<HTMLSpanElement | null>
  hudPhaseTagRef: RefObject<HTMLDivElement | null>
  curBrgRef: RefObject<HTMLSpanElement | null>
  curRngRef: RefObject<HTMLSpanElement | null>
  liveDetRef: RefObject<HTMLSpanElement | null>
  livePriRef: RefObject<HTMLSpanElement | null>
  liveResRef: RefObject<HTMLSpanElement | null>
  lockStateRef: RefObject<HTMLSpanElement | null>
  lockIdRef: RefObject<HTMLSpanElement | null>
  lockVerdictRef: RefObject<HTMLSpanElement | null>
  trackBodyRef: RefObject<HTMLDivElement | null>
  tickerRef: RefObject<HTMLSpanElement | null>
  clockRef: RefObject<HTMLSpanElement | null>
  detailRef: RefObject<HTMLDivElement | null>
  dcTrkRef: RefObject<HTMLDivElement | null>
  dcIdRef: RefObject<HTMLDivElement | null>
  dcSubRef: RefObject<HTMLDivElement | null>
  dcBrgRef: RefObject<HTMLDivElement | null>
  dcRngRef: RefObject<HTMLDivElement | null>
  dcClassRef: RefObject<HTMLDivElement | null>
  dcConfRef: RefObject<HTMLDivElement | null>
  dcVerdictRef: RefObject<HTMLDivElement | null>
  dcDescRef: RefObject<HTMLDivElement | null>
  dcAchRef: RefObject<HTMLDivElement | null>
  dcTagsRef: RefObject<HTMLDivElement | null>
  legendSignalRef: RefObject<HTMLDivElement | null>
  legendSurfaceRef: RefObject<HTMLDivElement | null>
  legendAgentRef: RefObject<HTMLDivElement | null>
  legendGateRef: RefObject<HTMLDivElement | null>
  cntSignalRef: RefObject<HTMLSpanElement | null>
  cntSurfaceRef: RefObject<HTMLSpanElement | null>
  cntAgentRef: RefObject<HTMLSpanElement | null>
  cntGateRef: RefObject<HTMLSpanElement | null>
  ladRefs: MutableRefObject<(HTMLDivElement | null)[]>
}
