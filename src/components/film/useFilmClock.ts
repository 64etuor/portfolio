import { useCallback, useEffect, useRef, useState } from 'react'
import { FILM_SCHEDULE, FILM_TOTAL_MS, shotIndexAt } from './schedule'

interface FilmClockArgs {
  paused: boolean
  reduced: boolean
  ended: boolean
  ready: boolean
  onFilmEnd: () => void
}

interface FilmClock {
  /** index into FILM_SCHEDULE for whatever shot should be showing right now. */
  shotIdx: number
  /** ms since film start. */
  filmT: number
  /** ms since the current shot's own start, clamped to [0, duration]. */
  shotT: number
  /** 0..1 progress within the current shot (for the top bar). */
  progress: number
  /** Jump the clock directly to a shot's start (rewind). */
  rewindToShot: (idx: number) => void
}

/**
 * useFilmClock — the film's single master clock.
 *
 * This is the ONLY source of truth for which shot should be on screen: it walks a
 * real wall-clock offset (performance.now(), carried across pauses) across the
 * FROZEN FILM_SCHEDULE boundaries computed from acts.ts. It never waits on a
 * scene's onReady to decide the shot has changed — readiness only gates whether a
 * slot is actually REVEALED (see useSceneBuffer), not whether time has moved on.
 * That split is what stops a locale-dependent paint delay from turning into a
 * visible scene repeat: the clock keeps moving regardless, and the scene the
 * audience eventually sees always reflects the correct instant (via SceneClock),
 * not a restart from zero.
 */
export function useFilmClock(args: FilmClockArgs): FilmClock {
  const { paused, reduced, ended, ready, onFilmEnd } = args

  const [shotIdx, setShotIdx] = useState(0)
  const [filmT, setFilmT] = useState(0)

  const rafRef = useRef<number | null>(null)
  // wall-clock stamp at which the CURRENT run segment started ticking.
  const startRef = useRef(0)
  // ms of film-time banked before this run segment (pause carry / rewind offset).
  const carriedRef = useRef(0)
  const endedFiredRef = useRef(false)

  const rewindToShot = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, FILM_SCHEDULE.length - 1))
    const shot = FILM_SCHEDULE[clamped]
    carriedRef.current = shot.start
    startRef.current = performance.now()
    endedFiredRef.current = false
    setShotIdx(clamped)
    setFilmT(shot.start)
  }, [])

  useEffect(() => {
    if (reduced || ended || !ready) return

    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      carriedRef.current += performance.now() - startRef.current
      return
    }

    startRef.current = performance.now()
    let alive = true
    const tick = () => {
      if (!alive) return
      const t = carriedRef.current + (performance.now() - startRef.current)
      if (t >= FILM_TOTAL_MS) {
        setFilmT(FILM_TOTAL_MS)
        setShotIdx(FILM_SCHEDULE.length - 1)
        if (!endedFiredRef.current) {
          endedFiredRef.current = true
          onFilmEnd()
        }
        return
      }
      setFilmT(t)
      const idx = shotIndexAt(t)
      setShotIdx((prev) => (prev === idx ? prev : idx))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // re-running this effect on every filmT tick would reset startRef mid-flight;
    // it only needs to (re)arm on pause/ready/reduced/ended transitions.
  }, [paused, reduced, ended, ready, onFilmEnd])

  const shot = FILM_SCHEDULE[shotIdx]
  const shotT = Math.max(0, Math.min(filmT - shot.start, shot.duration))
  const progress = shot.duration > 0 ? shotT / shot.duration : 0

  return { shotIdx, filmT, shotT, progress, rewindToShot }
}
