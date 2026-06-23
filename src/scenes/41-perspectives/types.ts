export type Screen = { file: string; title: string; tag: string }
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
