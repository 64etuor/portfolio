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
