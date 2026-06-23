import { LAYERS } from './data'

export const G_MAX = 40
export const TOTAL_MOVES = LAYERS.reduce((sum, layer) => sum + layer.moves.length, 0)
export const FIL_HOT = '#ffd9a8'
