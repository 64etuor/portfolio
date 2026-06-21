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
  setArmed: (v: boolean) => void
  effectiveMs: number
  onFilmEnd: () => void
}

interface FilmClock {
  progress: number
  /** bumps on each scene cut → replays the transition overlay */
  txId: number
  /** pause-accounting carry; rewind/skip reset it to 0 before re-indexing. */
  carriedRef: React.MutableRefObject<number>
}

/**
 * useFilmClock — the rAF progress clock that drives scene advancement.
 *
 * The per-scene clock starts only when the scene is VISIBLE (armed). It runs for
 * `effectiveMs`, calling setProgress each frame, and on completion advances to the
 * next scene (or ends the film). `advancedRef` guards advance() to at most once per
 * scene; `carriedRef` accounts for paused time. On a fresh scene the guard resets
 * and the cut transition (txId) fires (skipping the very first scene).
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
    setArmed,
    effectiveMs,
    onFilmEnd,
  } = args

  const [progress, setProgress] = useState(0)
  const [txId, setTxId] = useState(0) // bumps on each cut → replays the transition overlay

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
  // Shared per-scene guard: advance() fires at most once per scene, even if two
  // rAF loops briefly coexist (React StrictMode double-invokes effects in dev).
  // Reset to false whenever the scene changes (see the reset effect below).
  const advancedRef = useRef(false)
  useEffect(() => {
    if (reduced || ended || !ready || !armed) return

    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      carriedRef.current += performance.now() - startRef.current
      return
    }

    startRef.current = performance.now()
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

  // On a fresh scene: reset the clock guard, and fire the cinematic cut transition.
  // (Skip the very first scene so the overlay doesn't flash on initial load; the
  // ref-compare also makes it immune to React StrictMode's double-invoke in dev.)
  const prevSceneRef = useRef('')
  useEffect(() => {
    const key = `${actIdx}-${sceneIdx}`
    if (prevSceneRef.current && prevSceneRef.current !== key) setTxId((n) => n + 1)
    prevSceneRef.current = key
    carriedRef.current = 0
    advancedRef.current = false
    setProgress(0)
    setArmed(false)
  }, [actIdx, sceneIdx, setArmed])

  return { progress, txId, carriedRef }
}
