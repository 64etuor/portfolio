import type { SoundEmission, SoundEvent } from '@/scenes/_host/sceneSound'
import type { PlayOpts, SfxName } from './engine'

/**
 * eventMap — scene sound EVENTS (meaning, src/scenes/_host/sceneSound.ts) → concrete sounds.
 *
 * One palette for the whole film: the same meaning is always the same sound family, so the
 * audience learns it ("that dull tone = something is wrong", "the chime = the result").
 *
 *   reveal      air      very soft airy swell
 *   type        keys     one soft keyboard texture for durationS (never per-character ticks)
 *   data        shimmer  granular data shimmer for durationS (pans x → toX)
 *   scan        sweep    gentle filtered sweep for durationS (pans x → toX)
 *   node        pop      soft muted pop, ±3 % random pitch (no rising sequences)
 *   link        tick     short soft glass tick
 *   lock        lock     soft two-note click
 *   payoff      chime    THE chime (tonal → tuned to the score by FILM_SCORE.tune), music dips first
 *   defect      dull     low dull muted tone (no harsh beep)
 *   block       thud + buzz   low thud + muted buzz
 *   approve     open     soft open tone (a fifth up)
 *   impact      impact   low impact
 *   rise        riser    short riser whose top lands durationS later
 *   transition  swish    swish
 *   resolve     warm     warm soft chord
 *
 * Etiquette (applied here, not in scenes):
 *   - picture cut guard: nothing but 'transition' in the CUT_GUARD_MS after a picture cut
 *   - payoff: announced (opts.inS ≥ 0.3) → the music dips and every other event is held until
 *     the hit (a 300–500 ms pre-silence); after any payoff, others are held PAYOFF_TAIL_MS
 *   - node: hits within NODE_CLUSTER_MS merge into one sound; ≤ NODE_PER_S per second
 *   - reveal: ≥ REVEAL_GAP_S apart (REVEAL_GAP_CLIMAX_S in the climax window)
 *   - continuous meanings (type / data / scan / rise): one at a time per meaning
 *   - global: ≤ ACCENTS_PER_S events per second (payoff exempt)
 */

export const CUT_GUARD_MS = 250
const PAYOFF_TAIL_MS = 350
const NODE_CLUSTER_MS = 120
const NODE_PER_S = 3
const REVEAL_GAP_S = 1.2
const REVEAL_GAP_CLIMAX_S = 0.6
/** film ms of the score's climax section (score.ts: track D, film 160.0 → 187.43) */
const CLIMAX_MS: readonly [number, number] = [160_000, 187_430]
const ACCENTS_PER_S = 4
const MAX_PAN = 0.6
const LOG_MAX = 60

interface Layer {
  sfx: SfxName
  gain: number
  pitch?: number
  /** random ± pitch fraction per hit */
  jitter?: number
}

export const PALETTE: Readonly<Record<SoundEvent, readonly Layer[]>> = {
  reveal: [{ sfx: 'air', gain: 0.6 }],
  type: [{ sfx: 'keys', gain: 0.6 }],
  data: [{ sfx: 'shimmer', gain: 0.75 }],
  scan: [{ sfx: 'sweep', gain: 0.65 }],
  node: [{ sfx: 'pop', gain: 0.15, pitch: 0.94, jitter: 0.03 }],
  link: [{ sfx: 'tick', gain: 0.13 }],
  lock: [{ sfx: 'lock', gain: 0.22 }],
  payoff: [{ sfx: 'chime', gain: 0.34 }],
  defect: [{ sfx: 'dull', gain: 0.85 }],
  block: [
    { sfx: 'thud', gain: 0.3 },
    { sfx: 'buzz', gain: 0.85 },
  ],
  approve: [{ sfx: 'open', gain: 0.75 }],
  impact: [{ sfx: 'impact', gain: 0.36 }],
  rise: [{ sfx: 'riser', gain: 0.2 }],
  transition: [{ sfx: 'swish', gain: 0.18 }],
  resolve: [{ sfx: 'warm', gain: 0.8 }],
}

const CONTINUOUS: ReadonlySet<SoundEvent> = new Set<SoundEvent>(['type', 'data', 'scan', 'rise'])
const DEFAULT_DUR: Partial<Record<SoundEvent, number>> = { type: 0.8, data: 1, scan: 0.8, rise: 0.6 }

export type SfxEventStatus = 'played' | 'off' | 'cut' | 'held' | 'merged' | 'limited'

export interface SfxEventLog {
  n: number
  /** film ms when the event arrived */
  filmT: number
  scene: string
  sceneT: number | null
  ev: SoundEvent
  id: string
  x: number | null
  toX: number | null
  intensity: number
  /** seconds until the hit (announced payoff) */
  inS: number
  status: SfxEventStatus
  reason: string
  sounds: SfxName[]
}

export interface MapperHost {
  play(name: SfxName, opts: PlayOpts): void
  /** dip the music bus at audio time t */
  duck(t: number, depth: number, hold: number, release: number): void
  /** audio-clock now (s), null without a context */
  audioNow(): number | null
  /** output latency to subtract from scheduled hits (s) */
  outputLag(): number
  /** audible right now (enabled + context running) */
  audible(): boolean
  /** film master clock (ms) */
  filmNowMs(): number
  /** dev / QA mirror of every log entry */
  onLog?: (e: SfxEventLog) => void
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const panOf = (x: number | undefined) => (x === undefined ? 0 : (clamp01(x) - 0.5) * 2 * MAX_PAN)

export class SoundEventMapper {
  private n = 0
  private log: SfxEventLog[] = []
  private listeners = new Set<() => void>()
  /** wall ms (performance.now) of the last picture cut */
  private lastCutWall = -Infinity
  /** film ms until which non-payoff events are held */
  private holdUntil = -Infinity
  private lastFilm = -Infinity
  private lastPlayed = new Map<SoundEvent, number>()
  /** film ms a continuous meaning's texture ends */
  private busyUntil = new Map<SoundEvent, number>()
  private nodeHits: number[] = []
  private accents: number[] = []

  constructor(private host: MapperHost) {}

  /** A picture cut just happened (buffer cutId bumped). */
  markCut(): void {
    this.lastCutWall = performance.now()
  }

  /** Pause / rewind: forget holds and rate windows (pending voices are cancelled by the engine). */
  reset(): void {
    this.holdUntil = -Infinity
    this.lastPlayed.clear()
    this.busyUntil.clear()
    this.nodeHits = []
    this.accents = []
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  /** Immutable snapshot (newest last) — for useSyncExternalStore. */
  getLog = (): readonly SfxEventLog[] => this.log

  handle(e: SoundEmission): SfxEventLog {
    const now = this.host.filmNowMs()
    if (now < this.lastFilm - 50) this.reset() // the film was rewound
    this.lastFilm = now
    const { ev, opts } = e
    const intensity = clamp01(opts.intensity ?? 1)
    const inS = Math.max(0, opts.inS ?? 0)
    const entry: SfxEventLog = {
      n: ++this.n,
      filmT: now,
      scene: e.scene,
      sceneT: e.sceneT,
      ev,
      id: opts.id ?? '',
      x: opts.x ?? null,
      toX: opts.toX ?? null,
      intensity,
      inS,
      status: 'played',
      reason: '',
      sounds: [],
    }
    const verdict = this.gate(ev, now, inS)
    if (verdict) {
      entry.status = verdict[0]
      entry.reason = verdict[1]
    } else {
      this.commit(ev, now, inS, opts.durationS)
      if (!this.host.audible()) {
        entry.status = 'off'
        entry.reason = 'sound off / blocked'
      } else if (intensity > 0) {
        entry.sounds = this.render(ev, intensity, inS, opts.x, opts.toX, opts.durationS)
      }
    }
    this.push(entry)
    return entry
  }

  /** null = allowed; otherwise [status, reason]. Pure check, no state change. */
  private gate(ev: SoundEvent, now: number, inS: number): [SfxEventStatus, string] | null {
    if (ev !== 'transition' && performance.now() - this.lastCutWall < CUT_GUARD_MS) return ['cut', `< ${CUT_GUARD_MS} ms after cut`]
    if (ev !== 'payoff' && now < this.holdUntil) return ['held', 'payoff pre-silence']
    if (ev === 'node') {
      const last = this.lastPlayed.get('node')
      if (last !== undefined && now - last < NODE_CLUSTER_MS) return ['merged', 'node cluster']
      if (this.nodeHits.filter((t) => now - t < 1000).length >= NODE_PER_S) return ['limited', `node ≤ ${NODE_PER_S}/s`]
    }
    if (ev === 'reveal') {
      const last = this.lastPlayed.get('reveal')
      const climax = now >= CLIMAX_MS[0] && now < CLIMAX_MS[1]
      const gap = (climax ? REVEAL_GAP_CLIMAX_S : REVEAL_GAP_S) * 1000
      if (last !== undefined && now - last < gap) return ['limited', `reveal ≥ ${gap / 1000}s apart`]
    }
    if (CONTINUOUS.has(ev) && now + inS * 1000 < (this.busyUntil.get(ev) ?? -Infinity)) return ['limited', `${ev} texture already running`]
    if (ev !== 'payoff' && this.accents.filter((t) => now - t < 1000).length >= ACCENTS_PER_S) return ['limited', `≤ ${ACCENTS_PER_S} accents/s`]
    return null
  }

  private commit(ev: SoundEvent, now: number, inS: number, durationS: number | undefined) {
    const hitMs = now + inS * 1000
    this.lastPlayed.set(ev, hitMs)
    this.accents = this.accents.filter((t) => now - t < 1000)
    if (ev !== 'payoff') this.accents.push(now)
    if (ev === 'node') this.nodeHits = [...this.nodeHits.filter((t) => now - t < 1000), now]
    if (CONTINUOUS.has(ev)) this.busyUntil.set(ev, hitMs + (durationS ?? DEFAULT_DUR[ev] ?? 0.5) * 1000 * (ev === 'rise' ? 0 : 0.85))
    if (ev === 'payoff') this.holdUntil = Math.max(this.holdUntil, hitMs + PAYOFF_TAIL_MS)
  }

  private render(ev: SoundEvent, intensity: number, inS: number, x: number | undefined, toX: number | undefined, durationS: number | undefined): SfxName[] {
    const pan = panOf(x)
    const panTo = toX === undefined ? undefined : panOf(toX)
    const dur = durationS ?? DEFAULT_DUR[ev]
    const lag = this.host.outputLag()
    // live events are already on the picture; an announced one lands inS from now
    let delay = inS > 0 ? Math.max(0, inS - 0.01 - lag) : 0
    if (ev === 'rise') delay = Math.max(0, (durationS ?? 0.6) - 0.01 - lag) // the riser's TOP lands at the payoff
    const audioNow = this.host.audioNow()
    // payoff pre-silence: dip the bed as soon as it is announced (other SFX are already held)
    if (ev === 'payoff' && audioNow !== null && inS >= 0.3) this.host.duck(audioNow, 0.5, inS + 0.1, 0.5)
    const out: SfxName[] = []
    for (const l of PALETTE[ev]) {
      const jitter = l.jitter ? 1 + (Math.random() * 2 - 1) * l.jitter : 1
      this.host.play(l.sfx, { gain: l.gain * intensity, pitch: (l.pitch ?? 1) * jitter, pan, panTo, delay, dur })
      out.push(l.sfx)
    }
    if (ev === 'payoff' && audioNow !== null) {
      // re-assert the dip from the hit (the chime's own duck is shallower)
      this.host.duck(audioNow + 0.01 + delay, 0.6, 0.45, 0.6)
    }
    return out
  }

  private push(e: SfxEventLog) {
    const next = this.log.length >= LOG_MAX ? this.log.slice(1) : this.log.slice()
    next.push(e)
    this.log = next
    this.host.onLog?.(e)
    this.listeners.forEach((fn) => fn())
  }
}
