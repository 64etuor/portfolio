import type { Point } from './data'

export type Pos = { x: number; y: number; z: number }
export type Deposit = { a: Pos; b: Pos; z: number; layer: number; infill?: boolean }
export type Cam = { cx: number; cy: number; scale: number; tiltY: number }

export interface SimState {
  layer: number
  moveIdx: number
  prevPos: Pos | null
  segT: number
  nozzle: Pos
  eTotal: number
  gline: number
  temp: number
  bed: number
  running: boolean
  done: boolean
  totalMoves: number
  doneAt: number | null
}

export interface DefectAnim {
  t: number
  fixing: boolean
  fixed: boolean
  fixStart: number
}

export interface FixtureAnnotation {
  p: Point
  text: string
  dx: number
  dy: number
}
