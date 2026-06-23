import { LEDGER } from './data'

export const NS = 'http://www.w3.org/2000/svg'
export const BOOT = 1700
export const STEP = 720
export const END_HOLD = 1400
export const ROW_SCAN = 500
export const LAND_SHORT = 1200
export const WALK_CYCLE = LEDGER.length * STEP + END_HOLD + 1100

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
export const easeIO = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
