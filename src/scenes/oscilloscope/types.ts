// ============================================================
// Oscilloscope scene — shared type definitions
// ============================================================

export interface Seg {
  t0: number
  t1: number
  a0: number
  a1: number
  kind: string
}

export interface State {
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

export interface SpotVar {
  idx: number
  peakBase: number
  forceJit: number
  expulsion: boolean
}

export interface Meas {
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

export interface TrendItem {
  kA: number
  exp: boolean
  n: number
}

import type { RefObject } from 'react'

/** Mutable display values smoothed toward measured targets each frame. */
export interface Disp {
  peak: number
  rms: number
  energy: number
  nug: number
}

export interface Channel {
  key: string
  on: boolean
}

/**
 * All refs owned by the Scene component and shared with runtime/draw modules.
 * Threaded explicitly so render + simulation helpers keep their original
 * closure semantics without living inside the component body.
 */
export interface OscRefs {
  // canvas refs
  liveRef: RefObject<HTMLCanvasElement | null>
  scopeRef: RefObject<HTMLCanvasElement | null>
  schedRef: RefObject<HTMLCanvasElement | null>
  trendRef: RefObject<HTMLCanvasElement | null>
  nugRef: RefObject<HTMLCanvasElement | null>
  // overlay DOM refs
  acqDotRef: RefObject<HTMLSpanElement | null>
  acqStateRef: RefObject<HTMLSpanElement | null>
  modePillRef: RefObject<HTMLSpanElement | null>
  spotNoRef: RefObject<HTMLSpanElement | null>
  clockRef: RefObject<HTMLSpanElement | null>
  schedStatRef: RefObject<HTMLSpanElement | null>
  trendStatRef: RefObject<HTMLSpanElement | null>
  nugStatRef: RefObject<HTMLSpanElement | null>
  scrLabelRef: RefObject<HTMLSpanElement | null>
  modeNoteRef: RefObject<HTMLDivElement | null>
  // measure cells
  mPeakRef: RefObject<HTMLSpanElement | null>
  mRmsRef: RefObject<HTMLSpanElement | null>
  mCycRef: RefObject<HTMLSpanElement | null>
  mMsRef: RefObject<HTMLSpanElement | null>
  mForceRef: RefObject<HTMLSpanElement | null>
  mEnergyRef: RefObject<HTMLSpanElement | null>
  mDutyRef: RefObject<HTMLSpanElement | null>
  mExpRef: RefObject<HTMLTableCellElement | null>
  mNugRef: RefObject<HTMLSpanElement | null>
  // control DOM refs
  chBtnRefs: RefObject<(HTMLButtonElement | null)[]>
  kTimeRef: RefObject<HTMLDivElement | null>
  kAmpRef: RefObject<HTMLDivElement | null>
  vTimeRef: RefObject<HTMLDivElement | null>
  vAmpRef: RefObject<HTMLDivElement | null>
  modeSegRefs: RefObject<(HTMLButtonElement | null)[]>
  edgeSegRefs: RefObject<(HTMLButtonElement | null)[]>
  heatRngRef: RefObject<HTMLInputElement | null>
  heatValRef: RefObject<HTMLSpanElement | null>
  forceRngRef: RefObject<HTMLInputElement | null>
  forceValRef: RefObject<HTMLSpanElement | null>
  trigLvlRef: RefObject<HTMLInputElement | null>
  trigValRef: RefObject<HTMLSpanElement | null>
  runBtnRef: RefObject<HTMLButtonElement | null>
  runSubRef: RefObject<HTMLSpanElement | null>
  // simulation state refs
  stateRef: RefObject<State>
  cycleStepsRef: RefObject<number[]>
  ampStepsRef: RefObject<number[]>
  cycleIdxRef: RefObject<number>
  ampIdxRef: RefObject<number>
  chRef: RefObject<Channel[]>
  spotRef: RefObject<number>
  curSpotRef: RefObject<SpotVar>
  measRef: RefObject<Meas | null>
  spotTRef: RefObject<number>
  revealRef: RefObject<number>
  expFiredRef: RefObject<boolean>
  liveFreezeRef: RefObject<number>
  histRef: RefObject<TrendItem[]>
  dispRef: RefObject<Disp>
  lastTRef: RefObject<number>
  seededRef: RefObject<boolean>
  singleWatchRef: RefObject<boolean>
  clockStrRef: RefObject<string>
  VRRef: RefObject<{ start: number; win: number }>
}

/** CSS-module class map (scene.module.css), threaded so modules avoid re-importing. */
export type SceneStyles = Record<string, string>
