'use client'

import { createContext, useContext } from 'react'

/**
 * SceneClock — the contract a master clock (currently only the film) hands down
 * to a scene's canvas/three harness so the scene's `t` always reflects the ACTUAL
 * wall-clock position in the shot, never a locally-accumulated "time since this
 * component happened to mount" counter.
 *
 * Why this exists: a scene used to own its own clock (elapsed since mount/running).
 * If the surrounding film was slow to reveal a scene (locale-dependent DOM/canvas
 * text work, GC, whatever), the reveal landed late but the scene's internal clock
 * still started counting from 0 at that late moment — so the audience saw the
 * scene's intro loop again from the top, i.e. a visible "repeat", even though the
 * film clock itself had already moved on. Driving `t` from the film's single
 * master clock makes a late reveal show the CORRECT instant, never t=0.
 *
 * `now()` returns null when there is no master clock in scope (standalone /s/<slug>
 * pages, the /scenes gallery, previews) — callers fall back to self-driven timing.
 */
export interface SceneClock {
  /** Shot-local elapsed seconds, clamped to [0, shot duration]. */
  now(): number | null
}

export const SceneClockContext = createContext<SceneClock | null>(null)

export function useSceneClock(): SceneClock | null {
  return useContext(SceneClockContext)
}
