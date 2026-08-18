import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTS } from './acts'

// The scene that plays after (actIdx, sceneIdx), or null at the end of the film.
function nextIndex(actIdx: number, sceneIdx: number): [number, number] | null {
  const a = ACTS[actIdx]
  if (sceneIdx + 1 < a.scenes.length) return [actIdx, sceneIdx + 1]
  if (actIdx + 1 < ACTS.length) return [actIdx + 1, 0]
  return null
}

interface FilmClockArgs {
  actIdx: number
  sceneIdx: number
  setActIdx: (updater: number | ((i: number) => number)) => void
  setSceneIdx: (updater: number | ((i: number) => number)) => void
  paused: boolean
  reduced: boolean
  ended: boolean
  ready: boolean
  armed: boolean
  effectiveMs: number
  onFilmEnd: () => void
}

interface FilmClock {
  progress: number
  /** pause-accounting carry; rewind/skip reset it to 0 before re-indexing. */
  carriedRef: React.MutableRefObject<number>
}

/**
 * useFilmClock — the rAF progress clock that drives scene advancement.
 *
 * The per-scene clock starts only when the scene is VISIBLE (armed). It runs for
 * `effectiveMs`, calling setProgress each frame, and on completion advances to the
 * next scene (or ends the film). `advancedRef` guards advance() to at most once per
 * scene; `carriedRef` accounts for paused time and `tickingRef` marks whether
 * `startRef` currently holds a live start stamp, so paused time is banked exactly
 * once per pause (and never banked for a scene whose clock never started).
 */
export function useFilmClock(args: FilmClockArgs): FilmClock {
  const {
    actIdx,
    sceneIdx,
    setActIdx,
    setSceneIdx,
    paused,
    reduced,
    ended,
    ready,
    armed,
    effectiveMs,
    onFilmEnd,
  } = args

  const [progress, setProgress] = useState(0)

  const advance = useCallback(() => {
    const n = nextIndex(actIdx, sceneIdx)
    if (!n) {
      onFilmEnd()
      return
    }
    setActIdx(n[0])
    setSceneIdx(n[1])
  }, [actIdx, sceneIdx, onFilmEnd, setActIdx, setSceneIdx])

  // Clock — starts only when the current scene is VISIBLE, runs for currentMs.
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const carriedRef = useRef(0)
  // True while startRef holds a live start stamp for the CURRENT scene. Without it,
  // a pause that lands before this scene's clock ever started would bank the time
  // since the PREVIOUS scene's start — a multi-second carry that ends the incoming
  // scene the instant playback resumes. It also stops a re-run of this effect while
  // already paused from banking the same interval twice.
  const tickingRef = useRef(false)
  // Shared per-scene guard: advance() fires at most once per scene, even if two
  // rAF loops briefly coexist (React StrictMode double-invokes effects in dev).
  // Reset to false whenever the scene changes (see the reset effect below).
  const advancedRef = useRef(false)
  useEffect(() => {
    if (reduced || ended || !ready || !armed) return

    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (tickingRef.current) {
        tickingRef.current = false
        carriedRef.current += performance.now() - startRef.current
      }
      return
    }

    startRef.current = performance.now()
    tickingRef.current = true
    let alive = true
    const tick = () => {
      if (!alive) return
      const elapsed = carriedRef.current + (performance.now() - startRef.current)
      const p = Math.min(1, elapsed / effectiveMs)
      setProgress(p)
      if (p >= 1) {
        if (!advancedRef.current) {
          advancedRef.current = true
          carriedRef.current = 0
          tickingRef.current = false
          advance()
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [actIdx, sceneIdx, paused, reduced, ended, ready, armed, effectiveMs, advance])

  // On a fresh scene: reset the clock guard and the pause accounting. (The cut
  // overlay is driven by the picture cut in useSceneBuffer, not by this index
  // change — the two are seconds apart while the incoming scene loads.)
  useEffect(() => {
    carriedRef.current = 0
    tickingRef.current = false
    advancedRef.current = false
    setProgress(0)
  }, [actIdx, sceneIdx])

  return { progress, carriedRef }
}
