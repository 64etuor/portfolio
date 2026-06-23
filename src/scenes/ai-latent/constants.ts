import { POINTS, SATELLITES } from './data'

export const BASE_COUNT = POINTS.length
export const ALL_POINTS = [...POINTS, ...SATELLITES] as const
