export type Screen = {
  file: string
  title: string
  tag: string
  /** poster only — never mounted live (see constants.ts) */
  still?: true
}
export type Token = {
  t: string
  side: 'F' | 'S'
  xf: number
  yf: number
  sz: number
  ph: number
  drift: number
}
export type BucketItem = { o: Token; px: number; py: number; sharp: number }
export type ProcNode = {
  root: HTMLDivElement | null
  scr: HTMLDivElement | null
  iframe: HTMLIFrameElement | null
  /** this panel owns the scene's single live iframe */
  live: boolean
  /** the live page has painted and is faded in over the poster */
  shown: boolean
  /** pending settle / fade-out timeout (0 = none) */
  timer: number
}
export type Gear = { x: number; y: number; r: number; teeth: number; ph: number; spd: number }
export type CodeCol = { x: number; y: number; lines: string[]; lh: number }
export type ArchBox = { label: string; x: number; y: number; w: number; h: number; cx: number; cy: number }
export type LayoutState = {
  w: number
  h: number
  pw: number
  ph: number
  gears: Gear[]
  codeCols: CodeCol[]
  archBox: ArchBox[]
}
