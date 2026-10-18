import { useEffect, useRef } from 'react'
import { FILM_SCORE, filmMusic, LEAD_MAX, sfx, type FilmClockSource, type PlayOpts, type SfxName } from '@/lib/sfx'
import { FILM_SCHEDULE } from './schedule'

/**
 * Hits older than this (ms) when the clock reaches them are dropped, never played late.
 * Wide enough to survive a real frame stall (300–700ms measured on GPU) so key accents
 * still land; seeks/tab throttling jump much further and are still skipped (no burst).
 */
const LATE_WINDOW_MS = 600
/**
 * Hand each hit to the audio clock this far ahead (ms) of its lead-in. The hit is then timed by the
 * audio clock, so a frame stall shorter than this can't make it late; pause / rewind cancel what is
 * still pending (sfx.cancelPending), so a long horizon never plays on the wrong picture.
 */
const LOOKAHEAD_MS = 1500
/** engine.play() adds 10 ms of scheduling headroom; take it back so the hit lands on time. */
const ENGINE_HEADROOM_S = 0.01

interface FlatHit {
  /** absolute film ms of the hit (the picture cut) */
  abs: number
  /** film ms at which to hand it to the engine (abs − lead − lookahead) */
  trig: number
  id: number
  shotIdx: number
  file: string
  at: number
  sfx: SfxName
  opts: PlayOpts
}

const MAX_LEAD_MS = Math.max(...Object.values(LEAD_MAX).map((s) => (s ?? 0) * 1000))

/**
 * Picture-cut sounds — the only hand-timed cues left (every scene emits its own sound events:
 * useFilmSceneSound → eventMap). Shot-local 0 of every shot after the first: on an act change a
 * swish whose crest lands on the cut + a soft low thump; montage cuts inside an act get a lighter
 * thump only. Subtle by design (the scene's first beat is the accent), and never the same twice
 * in a row: the pitch steps through CUT_PITCH by shot index.
 */
interface CutCue {
  sfx: SfxName
  gain: number
  pitch?: number
}
const CUT_CUES = {
  act: [
    { sfx: 'swish', gain: 0.16 },
    { sfx: 'cut', gain: 0.18 },
  ],
  scene: [{ sfx: 'cut', gain: 0.12, pitch: 1.1 }],
} as const satisfies Record<string, readonly CutCue[]>
const CUT_PITCH = [1, 0.92, 1.08, 0.96] as const

/** The whole film's cut hits on absolute film time, sorted by trigger time. Built once. */
const FLAT: FlatHit[] = (() => {
  const out: FlatHit[] = []
  let id = 0
  FILM_SCHEDULE.forEach((shot, shotIdx) => {
    if (shotIdx === 0) return // the opening shot has no cut
    const cut = shot.actIdx !== FILM_SCHEDULE[shotIdx - 1].actIdx ? CUT_CUES.act : CUT_CUES.scene
    const step = CUT_PITCH[shotIdx % CUT_PITCH.length]
    for (const c of cut) {
      const pitch = ('pitch' in c ? c.pitch : 1) * step
      out.push({
        abs: shot.start,
        trig: shot.start - (LEAD_MAX[c.sfx] ?? 0) * 1000 - LOOKAHEAD_MS,
        id: id++,
        shotIdx,
        file: shot.file,
        at: 0,
        sfx: c.sfx,
        opts: { gain: c.gain, pitch, delay: 0 },
      })
    }
  })
  return out.sort((a, b) => a.trig - b.trig || a.abs - b.abs)
})()

/** First index whose trigger time is strictly after `t` (ms). */
function firstTrigAfter(t: number): number {
  let lo = 0
  let hi = FLAT.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (FLAT[mid].trig <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

interface SfxLogEntry {
  id: number
  name: SfxName
  /** intended hit (film ms) */
  abs: number
  /** film ms when handed to the engine */
  filmT: number
  /** film ms the hit is scheduled at (filmT + delay + headroom) */
  hit: number
  shot: string
  at: number
  wall: number
}
type DevWindow = Window & {
  __sfxLog?: SfxLogEntry[]
  __sfxVoices?: { name: SfxName; hit: number; ctxNow: number; sampled: boolean; wall: number }[]
  __sfxDropped?: SfxLogEntry[]
  __sfxFlat?: { abs: number; sfx: SfxName; shot: string; at: number; id: number }[]
  __filmClock?: FilmClockSource
}

interface Args {
  filmT: number
  paused: boolean
  ended: boolean
  /** the master clock's render-free view — drives the score (music.ts) and hit timing */
  clock: FilmClockSource
}

/**
 * useFilmSoundCues — plays the picture-cut sounds (CUT_CUES) and the score off the film's master clock.
 *
 * Runs once per clock tick (the clock already re-renders Film every frame); the evaluation walks
 * a pre-sorted hit array with a cursor, so a tick allocates nothing.
 *   - a hit is handed to the engine once, LEAD_MAX + LOOKAHEAD before it is due, with the delay
 *     measured on the live clock (clock.nowMs()), so lead-in sounds crest on the picture event;
 *   - paused: the engine cancels hits still ahead (sfx.setPaused) and the cursor re-arms on resume;
 *   - rewind (filmT goes backwards): pending hits are cancelled, the cursor re-arms from there;
 *   - any jump forward (tab throttling, seek): hits more than LATE_WINDOW_MS behind are skipped,
 *     so there is never a catch-up burst;
 *   - the SFX sprite loads (and the score attaches) for the lifetime of the film only.
 */
export function useFilmSoundCues({ filmT, paused, ended, clock }: Args): void {
  const prevRef = useRef(-1)
  const cursorRef = useRef(0)
  /** after a pause/rewind: re-arm from the clock, skip (don't late-play) hits already due */
  const rearmRef = useRef(true)

  useEffect(() => {
    sfx.setTune(FILM_SCORE.tune)
    void sfx.loadSamples()
  }, [])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const w = window as DevWindow
    w.__sfxLog = []
    w.__sfxVoices = []
    w.__sfxDropped = []
    w.__filmClock = clock
    w.__sfxFlat = FLAT.map((f) => ({ abs: f.abs, sfx: f.sfx, shot: f.file, at: f.at, id: f.id }))
    sfx.onPlay = (name, hit, sampled) => w.__sfxVoices?.push({ name, hit, ctxNow: sfx.musicTarget()?.ctx.currentTime ?? 0, sampled, wall: performance.now() })
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
    if (paused) rearmRef.current = true
  }, [paused])

  useEffect(() => {
    if (ended || paused) return

    const prev = prevRef.current
    prevRef.current = filmT
    if (filmT < prev) {
      // rewound: drop lead-ins scheduled for the old timeline, re-arm after the new position
      sfx.cancelPending()
      rearmRef.current = true
    }
    const now = clock.nowMs()
    const lag = sfx.outputLag()
    let c = cursorRef.current
    const rearm = rearmRef.current
    if (rearm) {
      c = firstTrigAfter(now - MAX_LEAD_MS - LOOKAHEAD_MS - LATE_WINDOW_MS)
      rearmRef.current = false
    }
    while (c < FLAT.length && FLAT[c].trig <= now) {
      const h = FLAT[c]
      c++
      if (h.abs < now - (rearm ? 0 : LATE_WINDOW_MS)) {
        // stale (jumped past it, or a long frame stall) — drop, never burst
        if (process.env.NODE_ENV === 'development' && !rearm) {
          ;(window as DevWindow).__sfxDropped?.push({ id: h.id, name: h.sfx, abs: h.abs, filmT: now, hit: -1, shot: h.file, at: h.at, wall: performance.now() })
        }
        continue
      }
      // hit lands at abs on the audio clock, pulled forward by the output latency the picture doesn't have
      const delay = Math.max(0, (h.abs - now) / 1000 - ENGINE_HEADROOM_S - lag)
      h.opts.delay = delay
      sfx.play(h.sfx, h.opts)
      if (process.env.NODE_ENV === 'development') {
        ;(window as DevWindow).__sfxLog?.push({ id: h.id, name: h.sfx, abs: h.abs, filmT: now, hit: now + (delay + ENGINE_HEADROOM_S + lag) * 1000, shot: h.file, at: h.at, wall: performance.now() })
      }
    }
    cursorRef.current = c
  }, [filmT, paused, ended, clock])
}
