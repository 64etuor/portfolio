export interface Engine {
  history: HTMLCanvasElement
  hctx: CanvasRenderingContext2D
  buffer: HTMLCanvasElement
  bctx: CanvasRenderingContext2D
  rowImg: ImageData | null
  w: number
  h: number
  dpr: number
  colW: number
  gap: number
  chX: number[]
  sizeKey: string
  scrollBudget: number
  weldPhase: number
  lastWeldPhase: number
  doeFired: boolean
  doeRowY: number
  ampSmooth: number
  forceSmooth: number
  timeSmooth: number
  lastEvtMs: number
  evi: number
  lastMs: number | null
}

export type ReadoutRefs = {
  gain: HTMLSpanElement | null
  amp: HTMLDivElement | null
  force: HTMLDivElement | null
  time: HTMLDivElement | null
  weld: HTMLDivElement | null
  ampStat: HTMLElement | null
  sweep: HTMLElement | null
}
