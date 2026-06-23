export interface Node {
  dom: string
  label: string
  color: string
  vbx: number; vby: number
  sbx: number; sby: number
  bx: number;  by: number
  phase: number; spd: number
  rad: number
  x: number; y: number
  lit: number
  vx: number; vy: number
  appear: number
  sat: boolean
  appearAt: number
}

export interface Link {
  a: number; b: number
  cross: boolean
  lp: number
  emph: number
  emphTarget: number
}

export interface Token { html: string; plain: string }

export type TimerId = ReturnType<typeof setTimeout>
export type IntervalId = ReturnType<typeof setInterval>
