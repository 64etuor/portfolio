/* weld-thermal — shared constants, types, and static config */

// ─── grid / thermal constants ─────────────────────────────────────────────────
export const GRID_TARGET = 200
export const AMB = 24
export const TMAX_SCALE = 2400

// ─── arc-phase timing constants ───────────────────────────────────────────────
export const STITCH_N = 7
export const STITCH_DUTY = 0.58
export const STRIKE_SECS = 0.55
export const CRATER_SECS = 0.9
export const RESET_SECS = 0.45
export const TRAVEL_SPEEDUP = 4.2

// ─── types ────────────────────────────────────────────────────────────────────
export type ArcPhase = 'reset' | 'strike' | 'run' | 'crater'
export type ParamKey = 'pulseE' | 'peakKW' | 'prf' | 'pulseMs' | 'travel' | 'defocus'

export interface ParamTrack {
  disp: number
  base: number
}

export interface BeadSpot {
  x: number
  y: number
  r: number
  born: number
  heat: number
  keyhole: boolean
}

export interface Spatter {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  age: number
  r: number
}

export interface Plume {
  x: number
  y: number
  r: number
  age: number
  life: number
}

export interface ArcState {
  gx: number
  gy: number
  power: number
  pulse: number
  phase: ArcPhase
  t: number
  beadProgress: number
  beadMM: number
  runSecs: number
  arcSeconds: number
  pulseClock: number
  pulseGate: number
}

export interface Engine {
  sw: number
  sh: number
  gw: number
  gh: number
  heat: Float32Array
  heat2: Float32Array
  off: HTMLCanvasElement | null
  offCtx: CanvasRenderingContext2D | null
  img: ImageData | null
  thermalImg: ImageData | null
  thermalW: number
  thermalH: number
  mouseX: number
  mouseY: number
  mouseInside: boolean
  activePass: number
  passNo: number
  arc: ArcState
  bead: BeadSpot[]
  spatter: Spatter[]
  plume: Plume[]
  params: Record<ParamKey, ParamTrack>
  frame: number
  lastFps: number
  fpsCount: number
  initialized: boolean
}

export interface DomRefs {
  modeTxt: HTMLElement | null
  fiberTxt: HTMLElement | null
  gasTxt: HTMLElement | null
  focal: HTMLElement | null
  spotDia: HTMLElement | null
  passNo: HTMLElement | null
  modeChip: HTMLElement | null
  mtSpatter: HTMLElement | null
  gPe: HTMLElement | null
  gPk: HTMLElement | null
  gAvg: HTMLElement | null
  duty: HTMLElement | null
  pdens: HTMLElement | null
  penet: HTMLElement | null
  beadw: HTMLElement | null
  aspect: HTMLElement | null
  mtPrf: HTMLElement | null
  mtPw: HTMLElement | null
  mtTravel: HTMLElement | null
  mtDefocus: HTMLElement | null
  mtPitch: HTMLElement | null
  mtBead: HTMLElement | null
  arcTime: HTMLElement | null
  frame: HTMLElement | null
  fps: HTMLElement | null
  clock: HTMLElement | null
  cross: HTMLElement | null
  spotTemp: HTMLElement | null
  spotName: HTMLElement | null
  laserOn: HTMLElement | null
  arcPhase: HTMLElement | null
  arcBar: HTMLElement | null
  thPeak: HTMLElement | null
  thHaz: HTMLElement | null
  thermCv: HTMLCanvasElement | null
  detailTxt: HTMLElement | null
  passEls: HTMLDivElement[]
}

export const paramKeys: ParamKey[] = ['pulseE', 'peakKW', 'prf', 'pulseMs', 'travel', 'defocus']
