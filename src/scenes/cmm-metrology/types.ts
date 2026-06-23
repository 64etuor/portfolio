import type { FeatureDatum, TargetDatum } from './data'

export interface Point {
  x: number
  y: number
}

export interface RuntimeFeature extends FeatureDatum {
  _tg?: RuntimeTarget
  _measured?: boolean
  _showOut?: boolean
  _markPulse?: number
}

export interface RuntimeTarget extends Omit<TargetDatum, 'featureKey'> {
  f: RuntimeFeature
}

export interface CloudPoint {
  x: number
  y: number
  z: number
  col: string
}

export interface ProbeState {
  px: number
  py: number
  pz: number
  tpx: number
  tpy: number
  tpz: number
  touch: number
}

export interface TimelineEntry {
  t: number
  fn: (frameSec: number) => void
}

export interface RuntimeState {
  seed: number
  ori: Point
  scl: number
  features: RuntimeFeature[]
  targets: RuntimeTarget[]
  cloud: CloudPoint[]
  probe: ProbeState
  timeline: TimelineEntry[]
  tlIndex: number
  cycleStartSec: number
  nowMs: number
  passCount: number
  measuredFeatures: number
  cpkTarget: number
  cpkShown: number
  scanPts: number
  initialized: boolean
  bootDone: boolean
  bootDoneSec: number
  toastHideAtMs: number
  flashUntil: Record<string, number>
  activeTarget: RuntimeTarget | null
}

export type RefMap<T> = { current: Record<string, T | null> }
export type RefList<T> = { current: Array<T | null> }

export interface SceneDomRefs {
  rows: RefMap<HTMLDivElement>
  meas: RefMap<HTMLDivElement>
  jud: RefMap<HTMLDivElement>
  chips: RefList<HTMLSpanElement>
  xrows: RefList<HTMLDivElement>
  droX: { current: HTMLSpanElement | null }
  droY: { current: HTMLSpanElement | null }
  droZ: { current: HTMLSpanElement | null }
  ptCount: { current: HTMLElement | null }
  eqCount: { current: HTMLElement | null }
  clock: { current: HTMLElement | null }
  cpkGauge: { current: HTMLCanvasElement | null }
  cpkVal: { current: HTMLElement | null }
  cpkNote: { current: HTMLDivElement | null }
  cpkNum: { current: HTMLDivElement | null }
  passN: { current: HTMLElement | null }
  verdict: { current: HTMLDivElement | null }
  statLed: { current: HTMLSpanElement | null }
  statText: { current: HTMLElement | null }
  crossover: { current: HTMLDivElement | null }
  toast: { current: HTMLDivElement | null }
  toastIc: { current: HTMLElement | null }
  toastTx: { current: HTMLElement | null }
  boot: { current: HTMLDivElement | null }
  bootFill: { current: HTMLDivElement | null }
}
