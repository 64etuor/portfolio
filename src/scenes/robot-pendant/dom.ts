import { HOME, INITIAL_IOST, WAYPOINTS } from './data'
import type { Runtime } from './types'

export function byRef<T extends HTMLElement = HTMLElement>(rt: Runtime, name: string) {
  return rt.root.querySelector<T>(`[data-ref="${name}"]`)
}

export function needRef<T extends HTMLElement = HTMLElement>(root: HTMLDivElement, name: string) {
  const el = root.querySelector<T>(`[data-ref="${name}"]`)
  if (!el) throw new Error(`robot-pendant missing data-ref="${name}"`)
  return el
}

export function all<T extends Element = HTMLElement>(rt: Runtime, selector: string) {
  return Array.from(rt.root.querySelectorAll<T>(selector))
}

export function setText(rt: Runtime, name: string, value: string) {
  const el = byRef(rt, name)
  if (el) el.textContent = value
}

export function addListener<K extends keyof HTMLElementEventMap>(
  cleanups: Array<() => void>,
  target: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void
) {
  target.addEventListener(type, handler as EventListener)
  cleanups.push(() => target.removeEventListener(type, handler as EventListener))
}

export function createRuntime(root: HTMLDivElement): Runtime {
  return {
    root,
    progScroll: needRef<HTMLDivElement>(root, 'progScroll'),
    detail: needRef<HTMLDivElement>(root, 'detail'),
    toastEl: needRef<HTMLDivElement>(root, 'toast'),
    harnessOv: needRef<HTMLDivElement>(root, 'harnessOv'),
    state: {
      selected: 0,
      running: 0,
      mode: 'AUTO_PAUSED',
      estop: false,
      servo: true,
      coord: 'WORLD',
      ovr: 100,
      keyMode: 'T1',
      soft: 'SELECT',
      cycle: 124,
      jntCur: [...HOME],
      jntTgt: [...WAYPOINTS[0].pose],
      jogOff: { x: 0, y: 0, z: 0 },
      weldFx: 0,
      weldDone: false,
      autoPlay: false,
      dwellLeft: 0,
      arrived: false,
    },
    iost: { ...INITIAL_IOST },
    timers: [],
    intervals: [],
    toastT: null,
    reTeachActive: false,
    reTeachPct: 0,
    reTeachNext: 0,
    plcActStep: 0,
    bgEvIdx: 0,
    bgEvNext: 1800,
    sparkParts: [],
  }
}
