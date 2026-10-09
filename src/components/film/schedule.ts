import { ACTS } from './acts'

/**
 * FILM_SCHEDULE — the flat, frozen shot list derived from ACTS, with absolute
 * millisecond offsets from the start of the film. Pure data, computed once at
 * module scope: identical in every locale, every render, every session.
 *
 * This is the single source of truth for "what should be showing right now" —
 * the master clock (useFilmClock) walks filmT across these boundaries. Locale
 * never appears here; it only ever changes the TEXT a scene renders, never the
 * schedule that drives which scene is on screen or for how long.
 */
export interface ScheduledShot {
  /** index into ACTS */
  actIdx: number
  /** index into ACTS[actIdx].scenes */
  sceneIdx: number
  actId: string
  file: string
  /** absolute ms from film start */
  start: number
  /** absolute ms from film start */
  end: number
  duration: number
}

function buildSchedule(): ScheduledShot[] {
  const out: ScheduledShot[] = []
  let t = 0
  ACTS.forEach((act, actIdx) => {
    act.scenes.forEach((shot, sceneIdx) => {
      out.push({ actIdx, sceneIdx, actId: act.id, file: shot.file, start: t, end: t + shot.ms, duration: shot.ms })
      t += shot.ms
    })
  })
  return out
}

export const FILM_SCHEDULE: ScheduledShot[] = buildSchedule()
export const FILM_TOTAL_MS: number = FILM_SCHEDULE.length ? FILM_SCHEDULE[FILM_SCHEDULE.length - 1].end : 0

/** The shot index whose [start, end) window contains filmT (clamped to the last shot). */
export function shotIndexAt(filmT: number): number {
  if (filmT <= 0) return 0
  for (let i = FILM_SCHEDULE.length - 1; i >= 0; i--) {
    if (filmT >= FILM_SCHEDULE[i].start) return i
  }
  return 0
}

/** The shot index of a given act's first scene — used by rewind. */
export function firstShotOfAct(actIdx: number): number {
  const idx = FILM_SCHEDULE.findIndex((s) => s.actIdx === actIdx)
  return idx < 0 ? 0 : idx
}
