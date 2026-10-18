'use client'

import { useCallback, useLayoutEffect, useRef } from 'react'
import { useSceneClock } from './sceneClock'

/**
 * Scene-driven sound events.
 *
 * Scenes never pick concrete sounds. They announce WHAT happened on screen, in a small
 * semantic vocabulary, at the moment it happens; the film maps meaning → sound
 * (src/lib/sfx/eventMap.ts), so the same meaning sounds the same across the whole film
 * and a re-timed scene stays in sync by construction.
 *
 * Routing: a module-level sink (null by default → standalone /s pages and galleries are
 * silent). The film installs it and hands each slot a SceneClock whose `emit` is set only
 * for the VISIBLE, RUNNING slot — a staged (hidden) or paused scene cannot make a sound.
 *
 *   React / canvas scenes:  const sound = useSceneSound()
 *   three.js scenes:         ctx.sound (ThreeContext)
 *   deterministic timelines: soundAt(state, t, at, ev, opts) — fires once per crossing
 */

export type SoundEvent =
  /** text / panel appears */
  | 'reveal'
  /** a type-on run (give durationS) */
  | 'type'
  /** data flow / stream starts (give durationS) */
  | 'data'
  /** a sweep / scan (durationS; x → toX pans it) */
  | 'scan'
  /** an element pops in */
  | 'node'
  /** a line / thread connects */
  | 'link'
  /** focus / target acquired */
  | 'lock'
  /** the headline metric lands — the important moment */
  | 'payoff'
  /** error / defect / reject detected */
  | 'defect'
  /** a gate denies / kill */
  | 'block'
  /** a gate opens / pass */
  | 'approve'
  /** collision / crack */
  | 'impact'
  /** build-up before a payoff (durationS = time until its top) */
  | 'rise'
  /** camera move / big reposition */
  | 'transition'
  /** ending / calm resolution */
  | 'resolve'

export const SOUND_EVENTS: readonly SoundEvent[] = ['reveal', 'type', 'data', 'scan', 'node', 'link', 'lock', 'payoff', 'defect', 'block', 'approve', 'impact', 'rise', 'transition', 'resolve']

export interface SoundOpts {
  /** horizontal screen position 0 (left) .. 1 (right) — drives the pan. Default 0.5. */
  x?: number
  /** pan glides from x to toX over durationS (scan / data). */
  toX?: number
  /** 0..1, scales the gain. Default 1 (= the meaning's calibrated level). */
  intensity?: number
  /** seconds — for continuous meanings (type / data / scan / rise). */
  durationS?: number
  /** stable id per event (e.g. 'sn.award') — labels the debug overlay. */
  id?: string
  /**
   * Part of the build into the next 'payoff' (the last thread / lock right before the hit): it
   * still plays — ducked — inside the payoff's pre-silence instead of being held. 'link', 'lock'
   * and 'rise' count as build events without it.
   */
  lead?: boolean
  /**
   * The event lands this many seconds from now (scheduled on the audio clock). soundAt sets it
   * for 'payoff' so the mapper can clear a short pre-silence before the hit. Rarely set by hand.
   */
  inS?: number
}

/** A scene's emitter. A no-op whenever the scene is not the visible, running film slot. */
export type SceneSound = (ev: SoundEvent, opts?: SoundOpts) => void

/** What the sink receives. */
export interface SoundEmission {
  ev: SoundEvent
  opts: SoundOpts
  /** scene file (e.g. 'x-sn-trace.html') */
  scene: string
  /** shot-local seconds at emission (null outside a film clock) */
  sceneT: number | null
}

export type SoundSink = (e: SoundEmission) => void

let sink: SoundSink | null = null

/** Install (film mount) / remove (unmount: pass null) the global sink. */
export function setSoundSink(next: SoundSink | null): void {
  sink = next
}

/** Low-level: deliver an event to the sink (no-op when no sink is installed). */
export function emitSound(ev: SoundEvent, opts: SoundOpts = {}, scene = '?', sceneT: number | null = null): void {
  sink?.({ ev, opts, scene, sceneT })
}

export const NO_SOUND: SceneSound = () => {}

/**
 * React / canvas scenes: a STABLE emitter routed through the slot's SceneClock. Safe to call
 * from timers, rAF draw callbacks and effects — it re-reads the current clock on every call,
 * so it is silent while the slot is hidden/paused and outside the film.
 */
export function useSceneSound(): SceneSound {
  const clock = useSceneClock()
  const ref = useRef(clock)
  useLayoutEffect(() => {
    ref.current = clock
  }, [clock])
  return useCallback<SceneSound>((ev, opts) => ref.current?.emit?.(ev, opts), [])
}

// ── deterministic timelines ──────────────────────────────────────────────────

/** Seconds before a 'payoff' that soundAt announces it (the mapper's pre-silence). */
export const PAYOFF_PRE_S = 0.4
/** A forward step larger than this (s) is a seek / late reveal, not playback — nothing fires. */
const MAX_STEP_S = 0.75

export interface SoundAtState {
  readonly sound: SceneSound
  /** t of the previous distinct frame */
  prev: number
  /** t of the current frame */
  cur: number
  /** `at` keys already fired inside the current [prev, cur] window (same-t re-renders) */
  fired: Set<number>
  /** payoffs announced (pre-roll) whose hit has not been crossed yet */
  pending: Set<number>
}

/** One per scene instance (create it in setup / a ref). */
export function createSoundTimeline(sound: SceneSound): SoundAtState {
  return { sound, prev: NaN, cur: NaN, fired: new Set(), pending: new Set() }
}

function advance(s: SoundAtState, t: number) {
  if (t === s.cur) return
  if (t < s.cur) s.pending.clear() // rewind / loop: re-arm
  s.prev = s.cur
  s.cur = t
  s.fired.clear()
}

function crossed(s: SoundAtState, at: number): boolean {
  const { prev, cur } = s
  return prev < at && at <= cur && cur - prev <= MAX_STEP_S
}

/**
 * Fire `ev` once when the scene's own time `t` crosses `at` while playing forward.
 *   - re-arms when t goes backwards (rewind / loop: pass the loop-local time)
 *   - repeated frames with the same t (static / dt = 0 frames) never fire
 *   - a jump > 0.75 s (seek, late reveal) skips instead of bursting
 *   - 'payoff' is announced PAYOFF_PRE_S early with opts.inS, so its hit is scheduled exactly
 *     on `at` and the mapper can hold everything else just before it
 * `opts` may be a function — it is only evaluated when the event fires (screen projections etc.).
 * Returns true when it fired.
 */
export function soundAt(s: SoundAtState, t: number, at: number, ev: SoundEvent, opts?: SoundOpts | (() => SoundOpts)): boolean {
  advance(s, t)
  if (s.fired.has(at)) return false
  const get = () => (typeof opts === 'function' ? opts() : (opts ?? {}))
  if (ev === 'payoff') {
    const pre = at - PAYOFF_PRE_S
    if (crossed(s, pre) && at > s.cur) {
      s.fired.add(at)
      s.pending.add(at)
      s.sound(ev, { ...get(), inS: at - s.cur })
      return true
    }
    if (crossed(s, at)) {
      s.fired.add(at)
      if (s.pending.delete(at)) return false
      s.sound(ev, get())
      return true
    }
    return false
  }
  if (!crossed(s, at)) return false
  s.fired.add(at)
  s.sound(ev, get())
  return true
}
