// Decision OS — effect runtime helpers extracted from Scene.tsx.
// Provides a tracked timer/rAF registry plus the dt-aware wait/lerp loops and
// the pan/zoom handler factory. Behavior, timing, and dt clamps are identical
// to the originals; the only change is that loop helpers read the live
// `cancelled` flag through a getter so the registry can fully own teardown.

import { ZOOM_MIN, ZOOM_MAX } from './constants'
import type { SceneState } from './types'

/* ── Tracked timer/rAF registry ── */
// Owns every setTimeout/rAF spawned by the loops so cleanup can flush them all.
export class LoopRegistry {
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private rafs = new Set<number>()
  cancelled = false

  tset(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  rreq(fn: FrameRequestCallback) {
    const id = requestAnimationFrame((ts) => {
      this.rafs.delete(id)
      fn(ts)
    })
    this.rafs.add(id)
    return id
  }

  /* rAF-based wait: resolves after `ms` milliseconds, dt-aware, max 300ms dt clamp */
  waitRAF(ms: number) {
    return new Promise<void>((resolve) => {
      let elapsed = 0,
        last: number | null = null
      const frame = (ts: number) => {
        if (this.cancelled) return resolve()
        if (last === null) {
          last = ts
          this.rreq(frame)
          return
        }
        const dt = Math.min(ts - last, 300)
        elapsed += dt
        last = ts
        if (elapsed >= ms) resolve()
        else this.rreq(frame)
      }
      this.rreq(frame)
    })
  }

  /* lerp score display: smoothly animate a numeric text element from `from` to `to` over `ms` */
  lerpText(el: HTMLElement, from: number, to: number, ms: number, fmt?: (x: number) => string) {
    let start: number | null = null
    const frame = (ts: number) => {
      if (this.cancelled) return
      if (!start) start = ts
      const dt = Math.min(ts - start, ms)
      const t = Math.min(dt / ms, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease-in-out
      const val = from + (to - from) * ease
      el.textContent = fmt ? fmt(val) : val.toFixed(1)
      if (t < 1) this.rreq(frame)
    }
    this.rreq(frame)
  }

  /* flush all tracked timers + rAFs (cleanup) */
  flush() {
    this.timers.forEach((t) => clearTimeout(t))
    this.rafs.forEach((r) => cancelAnimationFrame(r))
  }
}

/* ── PAN / ZOOM ── */
// Returns mouse/wheel handlers bound to the canvas shell; they mutate the shared
// `state` (tx/ty/scale) and reposition #viewport in place, exactly as before.
export function createPanZoom(root: HTMLDivElement, shell: HTMLElement, state: SceneState) {
  let dragging = false,
    lastX = 0,
    lastY = 0

  const onMouseDown = (e: MouseEvent) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    shell.classList.add('grabbing')
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY
    state.tx += dx
    state.ty += dy
    lastX = e.clientX
    lastY = e.clientY
    const vp = root.querySelector('#viewport')
    if (vp) vp.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`)
  }
  const onMouseUp = () => {
    dragging = false
    shell.classList.remove('grabbing')
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = shell.getBoundingClientRect()
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const ns = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.scale * factor))
    state.tx = mx - (mx - state.tx) * (ns / state.scale)
    state.ty = my - (my - state.ty) * (ns / state.scale)
    state.scale = ns
    const vp = root.querySelector('#viewport')
    if (vp) vp.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`)
  }

  return { onMouseDown, onMouseMove, onMouseUp, onWheel }
}
