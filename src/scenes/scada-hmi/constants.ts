import { SCM_AREAS } from './data'
import type { TrendId } from './types'

export const NBUF = 180
export const SAMPLE_INTERVAL = 333

export const TREND_CONFIG: Record<TrendId, Array<{ color: string; start: number }>> = {
  trend: [
    { color: '#ff3b3b', start: 40 },
    { color: '#39d6ff', start: 62 },
  ],
  trend2: [
    { color: '#21d07a', start: 62 },
    { color: '#39d6ff', start: 72 },
  ],
  trendInv: [
    { color: '#21d07a', start: 62 },
    { color: '#39d6ff', start: 50 },
  ],
  trendScm: [
    { color: '#21d07a', start: 62 },
    { color: '#39d6ff', start: 70 },
  ],
}

export const SCM_AREA_MAX = Math.max(...SCM_AREAS.map((p) => p.cnt))
