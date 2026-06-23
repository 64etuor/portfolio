import { GAUGES, KPIS, LIVE_POOL, SEED_EVENTS } from './data'
import { SPARK_RANGES } from './constants'
import { generateTrendData, rnd } from './draw'
import type { Runtime, SparkState } from './types'

export function shuffleEvents() {
  const copy = LIVE_POOL.slice()
  copy.sort(() => Math.random() - 0.5)
  return copy
}

export function createSpark(range: readonly [number, number]): SparkState {
  return { range, data: Array.from({ length: 44 }, () => rnd(range[0], range[1])) }
}

export function createRuntime(): Runtime {
  return {
    gauges: GAUGES.map((g) => ({ cur: g.target })),
    topSparks: SPARK_RANGES.map(createSpark),
    kpiSparks: KPIS.map((k) => createSpark(k.sparkRange)),
    kpis: KPIS.map((k) => ({ live: k.value, nextTarget: k.value, nextAt: rnd(1800, 3200), cycleDone: -1 })),
    lastSparkAt: 0,
    trendCycle: -1,
    trendData: generateTrendData(),
    seedIndex: 0,
    shuffledEvents: shuffleEvents(),
    poolIndex: 0,
    nextLiveAt: SEED_EVENTS.length * 300 + 800 + rnd(1500, 2800),
    alarmTotal: 0,
    andonResetAt: 0,
    feedRemovals: [],
  }
}
