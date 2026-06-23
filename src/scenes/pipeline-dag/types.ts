// pipeline-dag — shared runtime types

export interface EdgeEl {
  a: string; b: string
  path: SVGPathElement; len: number; tok: SVGCircleElement
  phase: number; speed: number; targetSpeed: number; active: boolean
}

export interface SweepState {
  order: string[]; total: number; idx: number; accum: number
  phase: string; nodeRunDur: number; finishing: boolean; finishAccum: number
}
