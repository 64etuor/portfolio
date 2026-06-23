export type AckPhase = 'active' | 'ramping' | 'cleared'
export type TrendId = 'trend' | 'trend2' | 'trendInv' | 'trendScm'

export interface ProcessState {
  invCost: number
  invCostSP: number
  turnRate: number
  whEff: number
  acked: boolean
}

export interface MimicState {
  pumpAngle1: number
  pumpAngle2: number
  convX: number
  tk1Cur: number
  tk2Cur: number
  weldWidthCur: number
  phase1: number
  phase2: number
}

export interface TrendSeriesState {
  color: string
  start: number
  buf: number[]
  cur: number
  acc: number
}

export type TrendRuntime = Record<TrendId, TrendSeriesState[]>
