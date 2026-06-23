import type { IoKey } from './data'

export type Mode = 'AUTO_PAUSED' | 'PLAY' | 'PAUSED' | 'FAULT'

export interface RuntimeState {
  selected: number
  running: number
  mode: Mode
  estop: boolean
  servo: boolean
  coord: string
  ovr: number
  keyMode: string
  soft: string
  cycle: number
  jntCur: number[]
  jntTgt: number[]
  jogOff: { x: number; y: number; z: number }
  weldFx: number
  weldDone: boolean
  autoPlay: boolean
  dwellLeft: number
  arrived: boolean
}

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

export interface Runtime {
  root: HTMLDivElement
  progScroll: HTMLDivElement
  detail: HTMLDivElement
  toastEl: HTMLDivElement
  harnessOv: HTMLDivElement
  state: RuntimeState
  iost: Record<IoKey, number>
  timers: number[]
  intervals: number[]
  toastT: number | null
  reTeachActive: boolean
  reTeachPct: number
  reTeachNext: number
  plcActStep: number
  bgEvIdx: number
  bgEvNext: number
  sparkParts: Spark[]
}

export interface Point {
  x: number
  y: number
}
