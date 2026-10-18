import type { SoundEmission, SoundEvent } from '@/scenes/_host/sceneSound'
import { MAX_TEXTURE_S, type PlayOpts, type SfxName } from './engine'

/**
 * eventMap — scene sound EVENTS (meaning, src/scenes/_host/sceneSound.ts) → concrete sounds.
 *
 * One palette for the whole film: the same meaning is always the same sound FAMILY, so the
 * audience learns it ("that dull tone = something is wrong", "the chime = the result").
 *
 *   reveal      air      very soft airy swell
 *   type        keys     one soft keyboard texture for durationS (never per-character ticks)
 *   data        shimmer  granular data shimmer for durationS (pans x → toX; ≤ MAX_TEXTURE_S)
 *   scan        sweep    gentle filtered sweep for durationS (pans x → toX; ≤ MAX_TEXTURE_S)
 *   node        pop      soft muted pop on an E-minor pentatonic step
 *   link        tick     short soft glass tick
 *   lock        lock     soft two-note click
 *   payoff      chime    THE chime (tonal → tuned to the score by FILM_SCORE.tune), music dips first
 *   defect      dull     low dull muted tone (short, no harsh beep)
 *   block       thud + buzz   low thud + muted buzz (short)
 *   approve     open     soft open tone (a fifth up)
 *   impact      impact   low impact
 *   rise        riser    short riser whose top lands durationS later
 *   transition  swish    swish
 *   resolve     warm     warm soft chord
 *
 * Inside a family each meaning has a few VARIANTS (pitch step / layer). The variant is picked
 * deterministically from the event id's hash and never repeats the previous pick of the same
 * meaning, plus a small deterministic gain (±1 dB) / pitch (noise sounds only, ±2 %) spread —
 * so a montage of five payoffs or a run of pops never sounds like the same sample re-fired.
 *
 * Section colour + mix hierarchy (FLAVOR, keyed by the current shot's FILM_SCHEDULE act id):
 *   calm    boot → AX           quiet, sparse                         (−2.5 dB)
 *   dark    reality → cost      lower pops/ticks, low-passed           (−1.5 dB)
 *   bright  connector, bridge,  pops/ticks a fourth up, lighter air
 *           cross-domain
 *   crisp   3D montage + AI     full level, a glassy transient on pops/locks
 *   warm    ending              low-passed, lower variants
 * Payoffs are the loudest SFX of every section (calibrated to ≈ −19…−17 dBFS peak at the
 * output, under the score's per-shot peak, ≈ −13…−6 dBFS) — +1 dB in the score's climax;
 * defects / blocks sit ≈ 8 dB below them, transitions ≈ 12 dB below.
 *
 * Etiquette (applied here, not in scenes):
 *   - picture cut guard: in the CUT_GUARD_MS after a picture cut, events are DEFERRED to the
 *     guard's end (the cut sound breathes, a first beat isn't lost); 'transition' / 'payoff' pass
 *   - a picture cut fades out any continuous texture still running from the previous shot
 *   - payoff: announced (opts.inS ≥ 0.3) → the music dips, every voice still ringing is hushed
 *     and other events are held until the hit (a 300–500 ms pre-silence). Build events —
 *     opts.lead, or a 'link' / 'lock' / 'rise' — still play inside it, ducked (LEAD_DUCK);
 *     after any payoff, others are held PAYOFF_TAIL_MS
 *   - node: hits within NODE_CLUSTER_MS merge into one sound; ≤ NODE_PER_S per second
 *   - reveal: ≥ REVEAL_GAP_S apart (REVEAL_GAP_CLIMAX_S in the climax window)
 *   - continuous meanings (type / data / scan / rise): one at a time per meaning
 *   - global: ≤ ACCENTS_PER_S events per second (payoff exempt)
 */

export const CUT_GUARD_MS = 250
const PAYOFF_TAIL_MS = 350
/** level of a build event that lands inside a payoff's pre-silence */
const LEAD_DUCK = 0.5
/** voices still ringing when a payoff is announced are pulled down to this */
const HUSH_DEPTH = 0.3
const NODE_CLUSTER_MS = 120
const NODE_PER_S = 3
const REVEAL_GAP_S = 1.2
const REVEAL_GAP_CLIMAX_S = 0.6
/** film ms of the score's climax section (score.ts: track D, film 160.0 → 187.43) */
const CLIMAX_MS: readonly [number, number] = [160_000, 187_430]
const CLIMAX_PAYOFF = 1.12
const ACCENTS_PER_S = 4
const MAX_PAN = 0.6
const LOG_MAX = 60

/**
 * How a layer follows the section colour: 'tonal' = pitched sample/recipe, shifted by in-key
 * intervals only (FLAVOR.tonal); 'noise' = noise-based, shifted freely (FLAVOR.noise + spread);
 * 'fixed' = never re-pitched (chords, bells, the dull/buzz pair).
 */
type Kind = 'tonal' | 'noise' | 'fixed'

interface Layer {
  sfx: SfxName
  gain: number
  pitch?: number
  kind?: Kind
}
type Variant = readonly Layer[]

// E-minor pentatonic steps (the sprite is in C and `tune` shifts it to E): E G A B D
const G = 1.189
const A = 1.335
const D_LOW = 0.891
const B_LOW = 0.749

export const PALETTE: Readonly<Record<SoundEvent, readonly Variant[]>> = {
  reveal: [[{ sfx: 'air', gain: 0.6, kind: 'noise' }], [{ sfx: 'air', gain: 0.62, pitch: 0.84, kind: 'noise' }], [{ sfx: 'air', gain: 0.56, pitch: 1.19, kind: 'noise' }]],
  type: [[{ sfx: 'keys', gain: 0.7, kind: 'noise' }]],
  data: [[{ sfx: 'shimmer', gain: 0.9, kind: 'fixed' }]],
  scan: [[{ sfx: 'sweep', gain: 0.8, kind: 'noise' }], [{ sfx: 'sweep', gain: 0.8, pitch: 0.9, kind: 'noise' }]],
  node: [
    [{ sfx: 'pop', gain: 0.2, kind: 'tonal' }],
    [{ sfx: 'pop', gain: 0.19, pitch: G, kind: 'tonal' }],
    [{ sfx: 'pop', gain: 0.21, pitch: D_LOW, kind: 'tonal' }],
    [{ sfx: 'pop', gain: 0.18, pitch: A, kind: 'tonal' }],
  ],
  link: [[{ sfx: 'tick', gain: 0.13, kind: 'noise' }], [{ sfx: 'tick', gain: 0.13, pitch: 1.12, kind: 'noise' }], [{ sfx: 'tick', gain: 0.14, pitch: 0.9, kind: 'noise' }]],
  lock: [[{ sfx: 'lock', gain: 0.22, kind: 'tonal' }], [{ sfx: 'lock', gain: 0.22, pitch: D_LOW, kind: 'tonal' }]],
  payoff: [
    [{ sfx: 'chime', gain: 0.6, kind: 'fixed' }],
    // the same bell a fourth lower, with a soft arpeggio bloom (the darker / warmer payoff)
    [
      { sfx: 'chime2', gain: 0.62, kind: 'fixed' },
      { sfx: 'confirm', gain: 0.18, kind: 'fixed' },
    ],
    // the bell with a little low weight under it
    [
      { sfx: 'chime', gain: 0.56, kind: 'fixed' },
      { sfx: 'thud', gain: 0.14, pitch: 1.2, kind: 'fixed' },
    ],
  ],
  defect: [[{ sfx: 'dull', gain: 0.45, kind: 'fixed' }], [{ sfx: 'dull', gain: 0.45, pitch: 0.94, kind: 'fixed' }]],
  block: [
    [
      { sfx: 'thud', gain: 0.22, kind: 'fixed' },
      { sfx: 'buzz', gain: 0.6, kind: 'fixed' },
    ],
    [
      { sfx: 'thud', gain: 0.22, pitch: 0.9, kind: 'fixed' },
      { sfx: 'buzz', gain: 0.6, pitch: 0.94, kind: 'fixed' },
    ],
  ],
  approve: [[{ sfx: 'open', gain: 0.7, kind: 'tonal' }], [{ sfx: 'open', gain: 0.66, pitch: A, kind: 'tonal' }]],
  impact: [
    [{ sfx: 'impact', gain: 0.3, kind: 'noise' }],
    [
      { sfx: 'impact', gain: 0.27, pitch: 0.92, kind: 'noise' },
      { sfx: 'crack', gain: 0.16, kind: 'noise' },
    ],
  ],
  rise: [[{ sfx: 'riser', gain: 0.2, kind: 'noise' }]],
  transition: [[{ sfx: 'swish', gain: 0.13, kind: 'noise' }], [{ sfx: 'swish', gain: 0.13, pitch: 0.85, kind: 'noise' }], [{ sfx: 'swish', gain: 0.12, pitch: 1.15, kind: 'noise' }]],
  resolve: [[{ sfx: 'warm', gain: 0.7, kind: 'fixed' }]],
}

export type Section = 'calm' | 'dark' | 'bright' | 'crisp' | 'warm'

interface Flavor {
  /** SFX level of the section (payoffs excepted) — the hierarchy */
  gain: number
  /** payoff level of the section */
  payoff: number
  /** in-key pitch ratio for 'tonal' layers */
  tonal: number
  /** pitch ratio for 'noise' layers */
  noise: number
  /** voice low-pass (Hz) */
  lp?: number
  /** a glassy tick transient under pops / locks (montage: crisp, technical) */
  glass?: boolean
  /** variant indices this section draws from, per meaning (default: all) */
  prefer?: Partial<Record<SoundEvent, readonly number[]>>
}

export const FLAVOR: Readonly<Record<Section, Flavor>> = {
  calm: { gain: 0.75, payoff: 0.88, tonal: 1, noise: 1, lp: 6500 },
  dark: { gain: 0.84, payoff: 0.92, tonal: B_LOW, noise: 0.84, lp: 2600, prefer: { payoff: [1], transition: [1], reveal: [0, 1], scan: [1] } },
  bright: { gain: 0.92, payoff: 1, tonal: A, noise: 1.1, prefer: { payoff: [0, 2], reveal: [0, 2], transition: [0, 2] } },
  crisp: { gain: 1, payoff: 1, tonal: 1, noise: 1.05, glass: true },
  warm: { gain: 0.85, payoff: 0.95, tonal: B_LOW, noise: 0.8, lp: 3200, prefer: { payoff: [1], reveal: [1], transition: [1] } },
}

/** FILM_SCHEDULE act id → section colour */
export const SECTION_OF_ACT: Readonly<Record<string, Section>> = {
  's0-boot': 'calm',
  's1-era': 'calm',
  's1b-ax': 'calm',
  's2-reality': 'dark',
  's3-problem': 'dark',
  's4-perspectives': 'dark',
  's6-collision': 'dark',
  's7-cost': 'dark',
  's8-insight': 'bright',
  's9-bridge': 'crisp',
  's10-crossdomain': 'crisp',
  ending: 'warm',
}
/** narrative shots opening a montage act keep the connector's brighter colour */
const SECTION_OF_FILE: Readonly<Record<string, Section>> = {
  '36-bridge-experts.html': 'bright',
  '37-cross-domain.html': 'bright',
}

const CONTINUOUS: ReadonlySet<SoundEvent> = new Set<SoundEvent>(['type', 'data', 'scan', 'rise'])
const TEXTURE: ReadonlySet<SoundEvent> = new Set<SoundEvent>(['type', 'data', 'scan'])
/** build events: allowed (ducked) inside a payoff's pre-silence */
const BUILD: ReadonlySet<SoundEvent> = new Set<SoundEvent>(['link', 'lock', 'rise'])
const GLASS: ReadonlySet<SoundEvent> = new Set<SoundEvent>(['node', 'lock'])
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
  durationS: number | null
  lead: boolean
  section: Section
  /** variant index played (−1: none) */
  variant: number
  status: SfxEventStatus
  /** why it was not played — or how it was shaped ('deferred …', 'lead (ducked)') */
  reason: string
  sounds: SfxName[]
}

export interface MapperHost {
  play(name: SfxName, opts: PlayOpts): void
  /** dip the music bus at audio time t */
  duck(t: number, depth: number, hold: number, release: number): void
  /** pull voices already sounding at audio time t down to depth × their level */
  hush?(t: number, depth: number): void
  /** fade continuous textures still running (picture cut) */
  fadeTextures?(): void
  /** audio-clock now (s), null without a context */
  audioNow(): number | null
  /** output latency to subtract from scheduled hits (s) */
  outputLag(): number
  /** audible right now (enabled + context running) */
  audible(): boolean
  /** film master clock (ms) */
  filmNowMs(): number
  /** FILM_SCHEDULE act id of a scene file (section colour) */
  actOf?(scene: string): string | undefined
  /** wall clock for the cut guard (ms; default performance.now) */
  wallNowMs?(): number
  /** dev / QA mirror of every log entry */
  onLog?: (e: SfxEventLog) => void
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const panOf = (x: number | undefined) => (x === undefined ? 0 : (clamp01(x) - 0.5) * 2 * MAX_PAN)

/** FNV-1a → [0, 1) — deterministic per id */
function hash01(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 4294967296
}

type Verdict = [SfxEventStatus, string] | { defer: number } | { lead: true } | null

export class SoundEventMapper {
  private n = 0
  private log: SfxEventLog[] = []
  private listeners = new Set<() => void>()
  /** wall ms of the last picture cut */
  private lastCutWall = -Infinity
  /** film ms until which non-payoff events are held */
  private holdUntil = -Infinity
  /** film ms of the pending payoff's hit (its pre-silence ends there) */
  private payoffHit = -Infinity
  private lastFilm = -Infinity
  private lastPlayed = new Map<SoundEvent, number>()
  /** film ms a continuous meaning's texture ends */
  private busyUntil = new Map<SoundEvent, number>()
  private nodeHits: number[] = []
  private accents: number[] = []
  /** last variant played per meaning (never the same twice in a row) */
  private lastVariant = new Map<SoundEvent, number>()

  constructor(private host: MapperHost) {}

  private wall(): number {
    return this.host.wallNowMs?.() ?? performance.now()
  }

  /** A picture cut just happened (buffer cutId bumped). */
  markCut(): void {
    this.lastCutWall = this.wall()
    // the previous shot's textures stop at the cut
    this.host.fadeTextures?.()
    this.busyUntil.clear()
  }

  /** Pause / rewind: forget holds and rate windows (pending voices are cancelled by the engine). */
  reset(): void {
    this.holdUntil = -Infinity
    this.payoffHit = -Infinity
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

  sectionOf(scene: string): Section {
    return SECTION_OF_FILE[scene] ?? SECTION_OF_ACT[this.host.actOf?.(scene) ?? ''] ?? 'crisp'
  }

  handle(e: SoundEmission): SfxEventLog {
    const now = this.host.filmNowMs()
    if (now < this.lastFilm - 50) this.reset() // the film was rewound
    this.lastFilm = now
    const { ev, opts } = e
    let intensity = clamp01(opts.intensity ?? 1)
    const inS = Math.max(0, opts.inS ?? 0)
    const durationS = opts.durationS === undefined ? undefined : Math.min(MAX_TEXTURE_S, Math.max(0, opts.durationS))
    const section = this.sectionOf(e.scene)
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
      durationS: durationS ?? null,
      lead: !!opts.lead,
      section,
      variant: -1,
      status: 'played',
      reason: '',
      sounds: [],
    }
    const verdict = this.gate(ev, now, inS, !!opts.lead)
    let delayS = inS
    if (Array.isArray(verdict)) {
      entry.status = verdict[0]
      entry.reason = verdict[1]
      this.push(entry)
      return entry
    }
    if (verdict && 'defer' in verdict) {
      delayS = Math.max(delayS, verdict.defer)
      entry.reason = `deferred ${Math.round(verdict.defer * 1000)} ms (cut guard)`
    } else if (verdict && 'lead' in verdict) {
      intensity *= LEAD_DUCK
      entry.reason = 'payoff build (ducked)'
    }
    this.commit(ev, now, delayS, durationS)
    if (!this.host.audible()) {
      entry.status = 'off'
      entry.reason = 'sound off / blocked'
    } else if (intensity > 0) {
      const r = this.render(ev, entry.id, section, now, intensity, delayS, opts.x, opts.toX, durationS)
      entry.sounds = r.sounds
      entry.variant = r.variant
    }
    this.push(entry)
    return entry
  }

  /** null = allowed; [status, reason] = dropped; defer / lead = allowed, shaped. Pure check. */
  private gate(ev: SoundEvent, now: number, inS: number, lead: boolean): Verdict {
    const sinceCut = this.wall() - this.lastCutWall
    const defer = ev !== 'transition' && ev !== 'payoff' && sinceCut < CUT_GUARD_MS ? (CUT_GUARD_MS - sinceCut) / 1000 : 0
    const at = now + defer * 1000
    let shaped: Verdict = defer > 0 ? { defer } : null
    if (ev !== 'payoff' && at < this.holdUntil) {
      // inside a payoff's pre-silence the build still sounds (ducked); everything else waits
      if (at < this.payoffHit - 15 && (lead || BUILD.has(ev))) shaped = { lead: true }
      else return ['held', at < this.payoffHit ? 'payoff pre-silence' : 'payoff tail']
    }
    if (ev === 'node') {
      const last = this.lastPlayed.get('node')
      if (last !== undefined && at - last < NODE_CLUSTER_MS) return ['merged', 'node cluster']
      if (this.nodeHits.filter((t) => at - t < 1000).length >= NODE_PER_S) return ['limited', `node ≤ ${NODE_PER_S}/s`]
    }
    if (ev === 'reveal') {
      const last = this.lastPlayed.get('reveal')
      const climax = now >= CLIMAX_MS[0] && now < CLIMAX_MS[1]
      const gap = (climax ? REVEAL_GAP_CLIMAX_S : REVEAL_GAP_S) * 1000
      if (last !== undefined && at - last < gap) return ['limited', `reveal ≥ ${gap / 1000}s apart`]
    }
    if (CONTINUOUS.has(ev) && at + inS * 1000 < (this.busyUntil.get(ev) ?? -Infinity)) return ['limited', `${ev} texture already running`]
    if (ev !== 'payoff' && this.accents.filter((t) => now - t < 1000).length >= ACCENTS_PER_S) return ['limited', `≤ ${ACCENTS_PER_S} accents/s`]
    return shaped
  }

  private commit(ev: SoundEvent, now: number, delayS: number, durationS: number | undefined) {
    const hitMs = now + delayS * 1000
    this.lastPlayed.set(ev, hitMs)
    this.accents = this.accents.filter((t) => now - t < 1000)
    if (ev !== 'payoff') this.accents.push(now)
    if (ev === 'node') this.nodeHits = [...this.nodeHits.filter((t) => now - t < 1000), hitMs]
    if (CONTINUOUS.has(ev)) this.busyUntil.set(ev, hitMs + (durationS ?? DEFAULT_DUR[ev] ?? 0.5) * 1000 * (ev === 'rise' ? 0 : 0.85))
    if (ev === 'payoff') {
      this.holdUntil = Math.max(this.holdUntil, hitMs + PAYOFF_TAIL_MS)
      this.payoffHit = hitMs
    }
  }

  /** deterministic variant: hash of the id within the section's allowed set, never the previous pick */
  private pick(ev: SoundEvent, id: string, section: Section): number {
    const all = PALETTE[ev].length
    const allowed = FLAVOR[section].prefer?.[ev]?.filter((i) => i < all) ?? Array.from({ length: all }, (_, i) => i)
    let k = Math.floor(hash01(`${ev}:${id}`) * allowed.length)
    const last = this.lastVariant.get(ev)
    if (allowed.length > 1 && allowed[k] === last) k = (k + 1) % allowed.length
    const v = allowed[k]
    this.lastVariant.set(ev, v)
    return v
  }

  private render(
    ev: SoundEvent,
    id: string,
    section: Section,
    now: number,
    intensity: number,
    delayS: number,
    x: number | undefined,
    toX: number | undefined,
    durationS: number | undefined,
  ): { sounds: SfxName[]; variant: number } {
    const fl = FLAVOR[section]
    const pan = panOf(x)
    const panTo = toX === undefined ? undefined : panOf(toX)
    const dur = durationS ?? DEFAULT_DUR[ev]
    const lag = this.host.outputLag()
    // live events are already on the picture; an announced / deferred one lands delayS from now
    let delay = delayS > 0 ? Math.max(0, delayS - 0.01 - lag) : 0
    if (ev === 'rise') delay = Math.max(0, delayS + (durationS ?? 0.6) - 0.01 - lag) // the riser's TOP lands at the payoff
    const audioNow = this.host.audioNow()
    if (ev === 'payoff' && audioNow !== null && delayS >= 0.3) {
      // pre-silence: dip the bed and hush tails still ringing (other SFX are already held)
      this.host.duck(audioNow, 0.5, delayS + 0.1, 0.5)
      this.host.hush?.(audioNow, HUSH_DEPTH)
    }
    const variant = this.pick(ev, id, section)
    // ±1 dB level spread for every sound; ±2 % pitch spread for noise sounds only (tonal stays in key)
    const hg = hash01(`g:${id}`)
    const hp = hash01(`p:${id}`)
    const spreadGain = 1 + (hg - 0.5) * 0.24
    const spreadPitch = 1 + (hp - 0.5) * 0.04
    const climax = ev === 'payoff' && now >= CLIMAX_MS[0] && now < CLIMAX_MS[1] ? CLIMAX_PAYOFF : 1
    const level = (ev === 'payoff' ? fl.payoff * climax : fl.gain) * intensity * spreadGain
    const layers: Layer[] = [...PALETTE[ev][variant]]
    if (fl.glass && GLASS.has(ev)) layers.push({ sfx: 'tick', gain: 0.06, pitch: 1.25, kind: 'fixed' })
    const out: SfxName[] = []
    for (const l of layers) {
      const kind = l.kind ?? 'fixed'
      const pitch = (l.pitch ?? 1) * (kind === 'tonal' ? fl.tonal : kind === 'noise' ? fl.noise * spreadPitch : 1)
      this.host.play(l.sfx, { gain: l.gain * level, pitch, pan, panTo, delay, dur, lp: fl.lp, tex: TEXTURE.has(ev) })
      out.push(l.sfx)
    }
    if (ev === 'payoff' && audioNow !== null) {
      // re-assert the dip from the hit (the chime's own duck is shallower)
      this.host.duck(audioNow + 0.01 + delay, 0.6, 0.45, 0.6)
    }
    return { sounds: out, variant }
  }

  private push(e: SfxEventLog) {
    const next = this.log.length >= LOG_MAX ? this.log.slice(1) : this.log.slice()
    next.push(e)
    this.log = next
    this.host.onLog?.(e)
    this.listeners.forEach((fn) => fn())
  }
}
