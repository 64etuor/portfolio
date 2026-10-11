import { useEffect, useRef } from 'react'
import { filmMusic, quantizeToGrid, sfx, type FilmClockSource, type PlayOpts, type SfxName } from '@/lib/sfx'
import { FILM_SCHEDULE } from './schedule'
import { CUT_GUARD_S, MAX_CUES_PER_SHOT, QUANTIZE, SOUND_CUES, type Cue } from './soundCues'

/**
 * Cues older than this (ms) when the clock reaches them are dropped, never played late.
 * Wide enough to survive a real frame stall (300–700ms measured on GPU) so key accents
 * still land; seeks/tab throttling jump much further and are still skipped (no burst).
 */
const LATE_WINDOW_MS = 600
/** Schedule cues this far ahead (ms) on the audio clock to absorb rAF/effect latency. */
const LOOKAHEAD_MS = 30

interface FlatCue {
  /** absolute film ms */
  abs: number
  shotIdx: number
  file: string
  at: number
  sfx: SfxName
  opts: PlayOpts
  repeat: readonly [number, number] | null
}

/** The whole film's cues flattened onto absolute film time, sorted. Built once. */
const FLAT: FlatCue[] = (() => {
  const out: FlatCue[] = []
  FILM_SCHEDULE.forEach((shot, shotIdx) => {
    const cues = (SOUND_CUES as Record<string, readonly Cue[] | undefined>)[shot.file] ?? []
    if (process.env.NODE_ENV === 'development' && cues.length > MAX_CUES_PER_SHOT) {
      console.warn(`[soundCues] ${shot.file}: ${cues.length} cues (max ${MAX_CUES_PER_SHOT})`)
    }
    for (const c of cues) {
      // The opening shot has no cut sound to protect; every other shot's first 250 ms is the cut's.
      const guarded = shotIdx > 0 && c.at < CUT_GUARD_S
      if (guarded || c.at * 1000 >= shot.duration) {
        if (process.env.NODE_ENV === 'development') console.warn(`[soundCues] ${shot.file}: cue at ${c.at}s dropped`)
        continue
      }
      const authored = shot.start + c.at * 1000
      // Percussive accents snap to the score's 16th grid when that moves them ≤ 60 ms
      // (lead-ins like riser/whoosh keep their authored timing — their peak is the sync point).
      const abs = QUANTIZE.has(c.sfx) ? quantizeToGrid(authored / 1000) * 1000 : authored
      out.push({
        abs,
        shotIdx,
        file: shot.file,
        at: c.at,
        sfx: c.sfx,
        opts: { gain: c.gain, pitch: c.pitch, pan: c.pan, delay: 0 },
        repeat: c.repeat ?? null,
      })
    }
  })
  return out.sort((a, b) => a.abs - b.abs)
})()

/** First index whose cue is strictly after `t` (ms). */
function firstAfter(t: number): number {
  let lo = 0
  let hi = FLAT.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (FLAT[mid].abs <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

interface SfxLogEntry {
  name: SfxName
  filmT: number
  abs: number
  shot: string
  at: number
  wall: number
}
type DevWindow = Window & {
  __sfxLog?: SfxLogEntry[]
  __sfxVoices?: { name: SfxName; wall: number }[]
  __sfxDropped?: SfxLogEntry[]
}

interface Args {
  filmT: number
  paused: boolean
  ended: boolean
  /** the master clock's render-free view — drives the score (music.ts) */
  clock: FilmClockSource
}

/**
 * useFilmSoundCues — plays the cue sheet (soundCues.ts) and the score off the film's master clock.
 *
 * Runs once per clock tick (the clock already re-renders Film every frame); the
 * evaluation walks a pre-sorted cue array with a cursor, so a tick allocates nothing.
 *   - a cue fires once, when filmT crosses its absolute time while playing;
 *   - paused: the clock stands still, so nothing can cross (audio is muted by FilmControls);
 *   - rewind (filmT goes backwards): the cursor re-arms from the new position;
 *   - any jump forward (tab throttling, seek): cues more than LATE_WINDOW_MS behind
 *     are skipped, so there is never a catch-up burst;
 *   - the score (FILM_SCORE file) is attached for the lifetime of the film and follows the
 *     clock on its own poll (play / pause / seek / end); detached on unmount.
 */
export function useFilmSoundCues({ filmT, paused, ended, clock }: Args): void {
  const prevRef = useRef(-1)
  const cursorRef = useRef(0)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const w = window as DevWindow
    w.__sfxLog = []
    w.__sfxVoices = []
    w.__sfxDropped = []
    sfx.onPlay = (name) => w.__sfxVoices?.push({ name, wall: performance.now() })
    let off: (() => void) | undefined
    let alive = true
    void import('@/lib/sfx/devtap').then((m) => {
      if (alive) off = m.installScoreDevTools(sfx, filmMusic, clock)
    })
    return () => {
      alive = false
      sfx.onPlay = null
      off?.()
    }
  }, [clock])

  // ── score ──
  useEffect(() => {
    filmMusic.attach(clock)
    return () => filmMusic.detach()
  }, [clock])

  useEffect(() => {
    if (ended || paused) return

    // ── cues ──
    const prev = prevRef.current
    prevRef.current = filmT
    let c = cursorRef.current
    if (filmT < prev) c = firstAfter(filmT) // rewound: re-arm everything after the new position
    const horizon = filmT + LOOKAHEAD_MS
    while (c < FLAT.length && FLAT[c].abs <= horizon) {
      const cue = FLAT[c]
      c++
      if (cue.abs < filmT - LATE_WINDOW_MS) {
        // stale (jumped past it, or a long frame stall) — drop, never burst
        if (process.env.NODE_ENV === 'development') {
          ;(window as DevWindow).__sfxDropped?.push({ name: cue.sfx, filmT, abs: cue.abs, shot: cue.file, at: cue.at, wall: performance.now() })
        }
        continue
      }
      const delay = Math.max(0, (cue.abs - filmT) / 1000)
      const o = cue.opts
      o.delay = delay
      sfx.play(cue.sfx, o)
      if (cue.repeat) {
        const [n, every] = cue.repeat
        for (let i = 1; i < n; i++) {
          o.delay = delay + i * every
          sfx.play(cue.sfx, o)
        }
      }
      if (process.env.NODE_ENV === 'development') {
        ;(window as DevWindow).__sfxLog?.push({
          name: cue.sfx,
          filmT,
          abs: cue.abs,
          shot: cue.file,
          at: cue.at,
          wall: performance.now(),
        })
      }
    }
    cursorRef.current = c
  }, [filmT, paused, ended])
}
