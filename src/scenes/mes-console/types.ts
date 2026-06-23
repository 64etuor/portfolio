import type { FeedSeverity } from './data'

export type Point = [number, number]
export type SparkState = { data: number[]; range: readonly [number, number] }
export type Runtime = {
  gauges: Array<{ cur: number }>
  topSparks: SparkState[]
  kpiSparks: SparkState[]
  kpis: Array<{ live: number; nextTarget: number; nextAt: number; cycleDone: number }>
  lastSparkAt: number
  trendCycle: number
  trendData: Array<{ w: number; v: number }>
  seedIndex: number
  shuffledEvents: Array<{ sev: FeedSeverity; msg: string }>
  poolIndex: number
  nextLiveAt: number
  alarmTotal: number
  andonResetAt: number
  feedRemovals: Array<{ el: Element; removeAt: number }>
}
