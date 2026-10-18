/**
 * Film SFX engine — Web Audio. Sample-based voices (one Pixabay sprite, decoded on /film
 * mount) with procedural fallbacks for every sound, so a failed load only changes timbre.
 *
 * Graph:
 *   voice → voiceBus ─┬──────────────→ pauseGain → master → limiter → destination
 *                     └→ reverb(send) ─┘     ↑
 *   film score (<audio> → MediaElementSource) → musicBus (ducked 2–3 dB under accents) ┘
 *
 * Level budget (linear, pre-master; MASTER = 0.7):
 *   - samples are normalized to −1 dBFS in the sprite; a voice's level is SAMPLE[name].gain × opts.gain,
 *     every base gain ≤ 0.4 → ≤ 0.25 at the output (≤ −12 dBFS per voice);
 *   - procedural recipes sum to ≤ 0.34 → ≤ 0.24 at the output;
 *   - the score file is mastered to ≈ −24…−21 dBFS RMS and enters at FILM_SCORE.level (music.ts);
 *   - a DynamicsCompressor ceiling (−10 dBFS, 20:1, makeup gain trimmed) keeps the sum ≤ −6 dBFS.
 *
 * Timing: `play(name, { delay })` schedules the sound's HIT (its perceptual peak — a whoosh's
 * crest, a riser's top) `delay` s from now; the voice starts `lead(name)` s earlier. Callers that
 * want the hit on a picture event schedule at least LEAD_MAX[name] ahead (useFilmSoundCues).
 * Voices whose hit is still ahead can be cancelled (pause / rewind) — see cancelPending().
 *
 * SSR-safe: nothing touches `window` until a method is called on the client.
 */

export type SfxName =
  | 'cut'
  | 'whoosh'
  | 'swish'
  | 'boot'
  | 'beep'
  | 'tick'
  | 'type'
  | 'data'
  | 'scan'
  | 'lock'
  | 'reject'
  | 'seal'
  | 'confirm'
  | 'pulse'
  | 'count'
  | 'pop'
  | 'impact'
  | 'thud'
  | 'riser'
  | 'glitch'
  | 'crack'
  | 'chime'
  | 'chime2'
  // scene-event palette (eventMap.ts) — procedural only
  | 'air'
  | 'keys'
  | 'shimmer'
  | 'sweep'
  | 'dull'
  | 'buzz'
  | 'open'
  | 'warm'

/** 'off' = muted by the user · 'on' = audible · 'blocked' = wants sound, waiting for a gesture */
export type SfxState = 'off' | 'on' | 'blocked'

export interface PlayOpts {
  /** level multiplier, clamped to [0, 1] (voices are pre-calibrated to the ceiling) */
  gain?: number
  /** frequency ratio (1 = as designed) */
  pitch?: number
  /** stereo position −1..1 */
  pan?: number
  /** seconds from now to the sound's HIT (scheduled on the audio clock) */
  delay?: number
  /** length (s) of a continuous voice (keys / shimmer / sweep) */
  dur?: number
  /** pan at the end of a continuous voice (glides from `pan`) */
  panTo?: number
  /** voice low-pass (Hz) — section colour (eventMap FLAVOR: darker problem acts, warm ending) */
  lp?: number
  /** a continuous texture (keys / shimmer / sweep): faded out on a picture cut (fadeTextures) */
  tex?: boolean
}

const MASTER = 0.7
/** limiter ceiling (dBFS, pre-makeup); voices sit ≥ 2 dB below it on their own */
const LIMIT_DB = -10
const MAX_VOICES = 14
const STORAGE_KEY = 'pf.sfx.enabled'
const MIN_GAP: Partial<Record<SfxName, number>> = { type: 0.025, tick: 0.03, count: 0.03, pop: 0.03, buzz: 0.01 }
const DEFAULT_GAP = 0.045
const SILENT = 0.0001
/** a drawn frame reaches the screen ≈ one 60 Hz frame after its rAF (filmT) */
const PICTURE_LAG_S = 0.016
const SPRITE_URL = '/audio/sfx/film-sfx.mp3'
const SPRITE_MAP_URL = '/audio/sfx/film-sfx.json'

/**
 * Music duck under the accents that carry the story: [depth (linear), hold (s), release τ (s)].
 * 0.71–0.84 = −3…−1.5 dB — the bed stays a bed; it just makes room for the hit.
 */
const DUCK: Partial<Record<SfxName, readonly [number, number, number]>> = {
  impact: [0.71, 0.3, 0.45],
  thud: [0.75, 0.2, 0.35],
  crack: [0.75, 0.15, 0.3],
  seal: [0.75, 0.15, 0.35],
  whoosh: [0.79, 0.2, 0.3],
  glitch: [0.79, 0.1, 0.25],
  chime: [0.79, 0.2, 0.4],
  riser: [0.84, 0.1, 0.3],
  confirm: [0.84, 0.15, 0.3],
  warm: [0.84, 0.3, 0.5],
}

/**
 * Sample voices: sprite key, base gain (≤ 0.4 → ≤ −12 dBFS out), reverb send, follows the
 * score's key (`tonal`), and `layer` = also play the procedural recipe underneath.
 * Names missing here (cut, boot, reject, pulse, crack, count→tick) stay procedural.
 */
interface SampleDef {
  key: string
  gain: number
  send?: number
  tonal?: boolean
  layer?: number
}
const SAMPLE: Partial<Record<SfxName, SampleDef>> = {
  tick: { key: 'tick', gain: 0.38, send: 0.06 },
  count: { key: 'tick', gain: 0.34, send: 0.04 },
  type: { key: 'type', gain: 0.36 },
  beep: { key: 'beep', gain: 0.3, send: 0.12, tonal: true },
  data: { key: 'data', gain: 0.3, send: 0.1, tonal: true },
  scan: { key: 'scan', gain: 0.32, send: 0.15, tonal: true },
  lock: { key: 'lock', gain: 0.32, send: 0.15, tonal: true },
  confirm: { key: 'confirm', gain: 0.3, send: 0.25, tonal: true },
  chime: { key: 'chime', gain: 0.36, send: 0.35, tonal: true },
  chime2: { key: 'chime2', gain: 0.36, send: 0.3, tonal: true },
  pop: { key: 'pop', gain: 0.38, send: 0.1, tonal: true },
  whoosh: { key: 'whoosh', gain: 0.38, send: 0.2 },
  swish: { key: 'swish', gain: 0.36, send: 0.12 },
  impact: { key: 'impact', gain: 0.4, send: 0.3 },
  thud: { key: 'thud', gain: 0.36, send: 0.15 },
  seal: { key: 'thud', gain: 0.3, send: 0.2, layer: 0.7 },
  glitch: { key: 'glitch', gain: 0.3, send: 0.05 },
  riser: { key: 'riser', gain: 0.3, send: 0.2 },
}

/** Procedural hit offsets (s from voice start to the perceptual peak). */
const SYNTH_LEAD: Partial<Record<SfxName, number>> = { whoosh: 0.32, swish: 0.16, riser: 0.55, thud: 0.004 }

/** Longest continuous texture (s) — long scans / data flows follow the whole visual (eventMap). */
export const MAX_TEXTURE_S = 8

/** Upper bound of lead() per sound — schedule at least this far ahead to land the hit on time. */
export const LEAD_MAX: Partial<Record<SfxName, number>> = { whoosh: 0.9, swish: 0.52, riser: 1.7, thud: 0.3, seal: 0.3, chime2: 0.15, glitch: 0.03 }

interface SpriteSound {
  start: number
  dur: number
  hit: number
}

type Ctor = typeof AudioContext

interface Pending {
  hit: number
  end: number
  out: GainNode
  sources: AudioScheduledSourceNode[]
  /** the voice's out level (hush ramps from it) */
  level: number
  tex: boolean
}

class SfxEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private pauseGain!: GainNode
  private voiceBus!: GainNode
  private reverbIn!: GainNode
  private musicBus!: GainNode
  private output!: GainNode
  private noiseBuf!: AudioBuffer
  private voices: Pending[] = []
  private lastPlayed = new Map<SfxName, number>()
  private pref: boolean | null = null
  private unlockArmed = false
  private suspendTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()
  private sprite: AudioBuffer | null = null
  private spriteMap: Record<string, SpriteSound> | null = null
  private spriteShift = 0
  private spriteLoad: Promise<boolean> | null = null
  private tune = 1
  /** dev/QA hook: called for every voice actually started (hit time on the audio clock) */
  onPlay: ((name: SfxName, hit: number, sampled: boolean) => void) | null = null

  // ── preference / state ────────────────────────────────────────────────────

  get enabled(): boolean {
    if (this.pref === null) {
      if (typeof window === 'undefined') return true
      try {
        this.pref = window.localStorage.getItem(STORAGE_KEY) !== '0'
      } catch {
        this.pref = true
      }
    }
    return this.pref
  }

  get state(): SfxState {
    if (!this.enabled) return 'off'
    return this.ctx?.state === 'running' ? 'on' : 'blocked'
  }

  /** AudioContext state (for tests/diagnostics). */
  get contextState(): AudioContextState | 'none' {
    return this.ctx ? this.ctx.state : 'none'
  }

  /** true once the sample sprite is decoded (false → procedural voices). */
  get samplesReady(): boolean {
    return !!this.sprite
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  getState = (): SfxState => this.state

  private emit() {
    this.listeners.forEach((fn) => fn())
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Create/resume the context if the page already has user activation (sticky
   * activation survives client-side navigation); otherwise arm a one-shot
   * gesture listener. Idempotent.
   */
  prime(): void {
    if (typeof window === 'undefined' || !this.enabled) return
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (!this.ctx && ua && !ua.hasBeenActive) {
      this.armUnlock()
      this.emit()
      return
    }
    this.wake()
  }

  /**
   * Fetch + decode the SFX sprite (once). Called on /film mount only; decoding uses an
   * OfflineAudioContext, so it needs no user gesture. Resolves false on failure (synth fallback).
   */
  loadSamples(url = SPRITE_URL, mapUrl = SPRITE_MAP_URL): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false)
    if (this.spriteLoad) return this.spriteLoad
    const OAC = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
    if (!OAC) return (this.spriteLoad = Promise.resolve(false))
    this.spriteLoad = Promise.all([fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status))), fetch(mapUrl).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))])
      .then(async ([bin, map]: [ArrayBuffer, { firstOnset: number; sounds: Record<string, SpriteSound> }]) => {
        const buf = await new OAC(1, 1, 44100).decodeAudioData(bin)
        // Decoders differ in how much encoder delay they trim: locate the first sound and shift.
        const d = buf.getChannelData(0)
        let i = 0
        while (i < d.length && Math.abs(d[i]) < 0.01) i++
        this.spriteShift = i / buf.sampleRate - map.firstOnset
        this.sprite = buf
        this.spriteMap = map.sounds
        return true
      })
      .catch(() => {
        this.spriteLoad = null // allow a retry on the next mount
        return false
      })
    return this.spriteLoad
  }

  /** Semitone offset applied to tonal sounds so they sit in the score's key. */
  setTune(semitones: number): void {
    this.tune = Math.pow(2, semitones / 12)
  }

  setEnabled(on: boolean): void {
    if (typeof window === 'undefined') return
    this.pref = on
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch {
      /* private mode — keep in memory */
    }
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer)
      this.suspendTimer = null
    }
    if (on) {
      this.wake()
    } else if (this.ctx) {
      const ctx = this.ctx
      this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
      // Stop burning CPU once the fade has settled.
      this.suspendTimer = setTimeout(() => {
        this.suspendTimer = null
        if (!this.enabled) void ctx.suspend().then(() => this.emit())
      }, 700)
    }
    this.emit()
  }

  /** Film pause: fade everything (incl. reverb tails) out / back in. */
  setPaused(paused: boolean): void {
    if (!this.ctx) return
    if (paused) this.cancelPending()
    this.pauseGain.gain.setTargetAtTime(paused ? 0 : 1, this.ctx.currentTime, paused ? 0.06 : 0.15)
  }

  /**
   * Drop every voice whose hit is still ahead (its lead-in may already be sounding) — used on
   * pause and rewind so nothing lands on the wrong picture. Ringing tails are left alone.
   */
  cancelPending(): void {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    this.voices = this.voices.filter((v) => {
      if (v.hit <= now + 0.005) return v.end > now
      v.out.gain.cancelScheduledValues(now)
      v.out.gain.setTargetAtTime(0, now, 0.02)
      for (const s of v.sources) {
        try {
          s.stop(now + 0.12)
        } catch {
          /* not started yet / already stopped */
        }
      }
      return false
    })
  }

  /**
   * Pull every voice already SOUNDING at audio time `t` down to `depth` × its level (τ 50 ms) —
   * a payoff's pre-silence: tails of earlier accents stop ringing into it. Voices whose hit is
   * still ahead (the payoff itself, its build-up) are untouched.
   */
  hush(t: number, depth: number): void {
    for (const v of this.voices) {
      if (v.hit > t + 0.005 || v.end <= t) continue
      v.out.gain.cancelScheduledValues(t)
      v.out.gain.setTargetAtTime(v.level * depth, t, 0.05)
    }
  }

  /** Picture cut: continuous textures still running fade out (τ 120 ms) instead of crossing the cut. */
  fadeTextures(t?: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const at = t ?? ctx.currentTime
    for (const v of this.voices) {
      // only the previous shot's textures (a new shot's first texture may already be scheduled)
      if (!v.tex || v.end <= at || v.hit > at - 0.05) continue
      v.out.gain.cancelScheduledValues(at)
      v.out.gain.setTargetAtTime(0, at, 0.12)
    }
  }

  /** Cut every pending/ringing one-shot (e.g. leaving the film). Music untouched (see music.ts). */
  stopAll(): void {
    const ctx = this.ctx
    if (!ctx) return
    const old = this.voiceBus
    old.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
    setTimeout(() => old.disconnect(), 400)
    this.voiceBus = ctx.createGain()
    this.voiceBus.connect(this.pauseGain)
    this.voiceBus.connect(this.reverbIn)
    this.voices = []
  }

  private wake() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    if (ctx.state !== 'running') {
      ctx.resume().then(
        () => {
          if (ctx.state !== 'running') this.armUnlock()
          this.afterRunning()
        },
        () => this.armUnlock(),
      )
      // resume() may stay pending forever without activation — arm the fallback now.
      this.armUnlock()
    } else {
      this.afterRunning()
    }
  }

  private afterRunning() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || !this.enabled) return this.emit()
    this.master.gain.cancelScheduledValues(ctx.currentTime)
    this.master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.15)
    this.emit()
  }

  private armUnlock() {
    if (this.unlockArmed || typeof window === 'undefined') return
    this.unlockArmed = true
    const events = ['pointerdown', 'keydown', 'touchend'] as const
    const onGesture = () => {
      events.forEach((e) => window.removeEventListener(e, onGesture, true))
      this.unlockArmed = false
      if (this.enabled) this.wake()
    }
    events.forEach((e) => window.addEventListener(e, onGesture, { capture: true, passive: true }))
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const AC: Ctor | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext
    if (!AC) return null
    const ctx = new AC({ latencyHint: 'interactive' })
    this.attachContext(ctx)
    ctx.onstatechange = () => {
      if (ctx.state !== 'running' && this.enabled && !this.suspendTimer) this.armUnlock()
      this.emit()
    }
    return ctx
  }

  /** Build the graph on `ctx` (also used by the offline preview render, .omc/score). */
  attachContext(ctx: BaseAudioContext): void {
    this.ctx = ctx as AudioContext

    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = LIMIT_DB
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.2
    // DynamicsCompressorNode applies automatic makeup gain (spec/Blink: (1/g(0 dBFS))^0.6,
    // g(0) = threshold·(1 − 1/ratio) dB). Trim it back off so it is a pure ceiling.
    const trim = ctx.createGain()
    trim.gain.value = Math.pow(10, (0.6 * LIMIT_DB * (1 - 1 / 20)) / 20)
    limiter.connect(trim).connect(ctx.destination)
    this.output = trim

    this.master = ctx.createGain()
    this.master.gain.value = 0 // faded in by afterRunning()
    this.master.connect(limiter)

    this.pauseGain = ctx.createGain()
    this.pauseGain.connect(this.master)

    // Procedural stereo room: decaying, progressively darkened noise.
    const conv = ctx.createConvolver()
    conv.buffer = this.makeImpulse(ctx, 1.8)
    const wet = ctx.createGain()
    wet.gain.value = 0.3
    this.reverbIn = ctx.createGain()
    this.reverbIn.connect(conv).connect(wet).connect(this.pauseGain)

    this.voiceBus = ctx.createGain()
    this.voiceBus.connect(this.pauseGain)

    this.musicBus = ctx.createGain()
    this.musicBus.connect(this.pauseGain)

    // One shared 2 s white-noise buffer; voices read it from random offsets.
    const len = ctx.sampleRate * 2
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noiseBuf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  }

  /** Offline preview only: master at its running level without a live context. */
  forceRunning(): void {
    if (this.ctx) this.master.gain.value = MASTER
  }

  private makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      let lp = 0
      for (let i = 0; i < len; i++) {
        const x = i / len
        // one-pole lowpass whose coefficient closes over time → tail gets darker
        const k = 0.55 - 0.45 * x
        lp += k * (Math.random() * 2 - 1 - lp)
        const pre = i < ctx.sampleRate * 0.012 ? 0 : 1 // 12 ms pre-delay
        d[i] = lp * pre * Math.pow(1 - x, 3.2)
      }
    }
    return buf
  }

  // ── one-shots ─────────────────────────────────────────────────────────────

  /**
   * How much later than its context time a sound is heard, minus the ~1 frame a picture takes to
   * reach the screen (s, 0…0.1). Subtract it from a delay to land the sound WITH the picture.
   */
  outputLag(): number {
    const c = this.ctx as (AudioContext & { outputLatency?: number }) | null
    if (!c || !('baseLatency' in c)) return 0
    const l = (c.baseLatency || 0) + (c.outputLatency || 0)
    return Math.max(0, Math.min(0.1, l - PICTURE_LAG_S))
  }

  /** Seconds from voice start to the hit for `name` with the current bank. */
  lead(name: SfxName): number {
    const s = SAMPLE[name]
    const m = s && this.sprite && this.spriteMap?.[s.key]
    return m ? m.hit : (SYNTH_LEAD[name] ?? 0)
  }

  /** `offline` = scheduling into an OfflineAudioContext before rendering (preview script). */
  play(name: SfxName, opts: PlayOpts = {}, offline = false): void {
    const ctx = this.ctx
    if (!ctx || (!offline && (ctx.state !== 'running' || !this.enabled))) return
    const now = ctx.currentTime
    const hit = now + 0.01 + Math.max(0, opts.delay ?? 0)

    // voice cap + per-name rate limit (on hit times)
    this.voices = this.voices.filter((v) => v.end > now)
    if (this.voices.filter((v) => v.hit - 0.05 <= hit && v.end > hit).length >= MAX_VOICES) return
    const last = this.lastPlayed.get(name)
    if (last !== undefined && Math.abs(hit - last) < (MIN_GAP[name] ?? DEFAULT_GAP)) return
    this.lastPlayed.set(name, hit)

    const level = Math.min(1, Math.max(0, opts.gain ?? 1))
    const s = SAMPLE[name]
    const m = s && this.sprite && this.spriteMap?.[s.key]
    let v: Voice
    let vLevel = level
    if (s && m && this.sprite) {
      const rate = (opts.pitch ?? 1) * (s.tonal ? this.tune : 1)
      v = new Voice(ctx, this.noiseBuf, this.voiceBus, this.reverbIn, level * s.gain, opts.pan ?? 0, now, opts.lp)
      v.reverb(s.send ?? 0).sample(this.sprite, m.start + this.spriteShift, m.dur, m.hit, hit, rate)
      vLevel = level * s.gain
      if (s.layer) {
        const lv = new Voice(ctx, this.noiseBuf, this.voiceBus, this.reverbIn, level * s.layer, opts.pan ?? 0, now, opts.lp)
        RECIPES[name](lv, hit, opts.pitch ?? 1, opts)
        this.voices.push({ hit, end: lv.finish(), out: lv.outNode, sources: lv.sources, level: level * s.layer, tex: false })
      }
    } else {
      const p = (opts.pitch ?? 1) * (TONAL_SYNTH.has(name) ? this.tune : 1)
      // a pan glide (panTo) is drawn inside the recipe, so the voice itself stays centred
      const glide = opts.panTo !== undefined
      v = new Voice(ctx, this.noiseBuf, this.voiceBus, this.reverbIn, level, glide ? 0 : (opts.pan ?? 0), now, opts.lp)
      RECIPES[name](v, Math.max(now + 0.005, hit - (SYNTH_LEAD[name] ?? 0)), p, opts)
    }
    this.voices.push({ hit, end: v.finish(), out: v.outNode, sources: v.sources, level: vLevel, tex: !!opts.tex })
    const duck = DUCK[name]
    if (duck) this.duck(hit, duck[0], duck[1], duck[2])
    this.onPlay?.(name, hit, !!m)
  }

  /**
   * Dip the music bus at audio time `t` to `depth`, hold, then recover with τ = `release`.
   * Events already running (an earlier duck's release) are kept, so overlapping ducks
   * glide from the current value instead of jumping.
   */
  duck(t: number, depth = 0.8, hold = 0.12, release = 0.3): void {
    if (!this.ctx) return
    const g = this.musicBus.gain
    g.cancelScheduledValues(t)
    g.setTargetAtTime(depth, t, 0.015)
    g.setTargetAtTime(1, t + hold, release)
  }

  /**
   * Fire `name` once when a scene timeline crosses `at` while running forward.
   * Skips loops/rewinds (prevT > t). Returns true when it fired.
   */
  cue(prevT: number, t: number, at: number, name: SfxName, opts?: PlayOpts): boolean {
    if (prevT > t || !(prevT < at && t >= at)) return false
    this.play(name, opts)
    return true
  }

  // ── music bus (film score) ───────────────────────────────────────────────

  /** Live context + the bus the score feeds (null until the context exists). */
  musicTarget(): { ctx: AudioContext; bus: AudioNode } | null {
    return this.ctx ? { ctx: this.ctx, bus: this.musicBus } : null
  }

  /** Dev/QA only: taps on the final (post-limiter) output, the music bus and the (dry) voice bus. */
  devTaps(): { ctx: AudioContext; output: AudioNode; music: AudioNode; voices: AudioNode } | null {
    return this.ctx ? { ctx: this.ctx, output: this.output, music: this.musicBus, voices: this.voiceBus } : null
  }
}

// ── voice builder ───────────────────────────────────────────────────────────

class Voice {
  private out: GainNode
  private send: GainNode
  private end = 0
  private last: AudioScheduledSourceNode | null = null
  readonly sources: AudioScheduledSourceNode[] = []

  constructor(
    private ctx: BaseAudioContext,
    private noiseBuf: AudioBuffer,
    bus: AudioNode,
    reverb: AudioNode,
    level: number,
    pan: number,
    private now: number,
    lp?: number,
  ) {
    this.out = ctx.createGain()
    this.out.gain.value = level
    this.send = ctx.createGain()
    this.send.gain.value = 0
    let head: AudioNode = this.out
    if (lp) {
      const f = ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = lp
      f.Q.value = 0.5
      head.connect(f)
      head = f
    }
    if (pan) {
      const p = ctx.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      head.connect(p)
      head = p
    }
    head.connect(bus)
    head.connect(this.send)
    this.send.connect(reverb)
  }

  get outNode(): GainNode {
    return this.out
  }

  reverb(amount: number) {
    this.send.gain.value = amount
    return this
  }

  /**
   * Play sprite slice [start, start+dur) so that its hit (offset `hitOff` s into the slice at
   * rate 1) lands on audio time `hit`. A start in the past skips into the slice instead.
   */
  sample(buf: AudioBuffer, start: number, dur: number, hitOff: number, hit: number, rate: number) {
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    let t = hit - hitOff / rate
    let skip = 0
    const earliest = this.now + 0.005
    if (t < earliest) {
      skip = (earliest - t) * rate
      t = earliest
    }
    if (skip >= dur) return this
    const g = this.ctx.createGain()
    // 3 ms fades guard the slice edges (and a skipped-into start)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(1, t + 0.003)
    const len = (dur - skip) / rate
    g.gain.setValueAtTime(1, t + len - 0.004)
    g.gain.linearRampToValueAtTime(0, t + len)
    src.connect(g).connect(this.out)
    this.track(src, t, t + len + 0.01, Math.max(0, start + skip), dur - skip)
    return this
  }

  /** Attack / (hold) / decay envelope on a fresh gain node feeding `dest` (default: voice out). */
  private env(t: number, peak: number, a: number, d: number, dest: AudioNode = this.out, hold = 0): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    if (hold > 0) g.gain.setValueAtTime(peak, t + a + hold)
    g.gain.exponentialRampToValueAtTime(SILENT, t + a + hold + d)
    g.gain.setValueAtTime(0, t + a + hold + d + 0.005)
    g.connect(dest)
    return g
  }

  private track(src: AudioScheduledSourceNode, start: number, stop: number, offset?: number, dur?: number) {
    if (offset !== undefined && src instanceof AudioBufferSourceNode) src.start(start, offset, dur)
    else src.start(start)
    src.stop(stop)
    this.sources.push(src)
    if (stop >= this.end) {
      this.end = stop
      this.last = src
    }
  }

  /** Oscillator with optional exponential pitch glide f0→f1 over `glide` s. */
  tone(o: {
    t: number
    f0: number
    f1?: number
    glide?: number
    type?: OscillatorType
    peak: number
    a: number
    d: number
    detune?: number
    lowpass?: number
    /** bit-crush: quantise the waveform to a few levels (lo-fi digital grit) */
    crush?: boolean
    /** per-partial stereo position −1..1 (grains of a panned texture) */
    pan?: number
  }) {
    const osc = this.ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.detune.value = o.detune ?? 0
    osc.frequency.setValueAtTime(o.f0, o.t)
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1, o.t + (o.glide ?? o.a + o.d))
    let dest: AudioNode = this.out
    if (o.pan !== undefined) {
      const pn = this.ctx.createStereoPanner()
      pn.pan.value = Math.max(-1, Math.min(1, o.pan))
      pn.connect(this.out)
      dest = pn
    }
    const g = this.env(o.t, o.peak, o.a, o.d, dest)
    let src: AudioNode = osc
    if (o.crush) {
      const ws = this.ctx.createWaveShaper()
      ws.curve = crushCurve()
      src = src.connect(ws)
    }
    if (o.lowpass) {
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = o.lowpass
      src.connect(f).connect(g)
    } else {
      src.connect(g)
    }
    this.track(osc, o.t, o.t + o.a + o.d + 0.02)
    return this
  }

  /** Filtered noise burst; optional filter sweep through f0→fMid→f1 and pan sweep. */
  noise(o: {
    t: number
    filter: BiquadFilterType
    f0: number
    fMid?: number
    f1?: number
    q?: number
    peak: number
    a: number
    d: number
    /** sustain at peak (s) between attack and decay — long textures */
    hold?: number
    panFrom?: number
    panTo?: number
  }) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = this.ctx.createBiquadFilter()
    f.type = o.filter
    f.Q.value = o.q ?? 0.8
    const hold = o.hold ?? 0
    const dur = o.a + hold + o.d
    // the shared noise buffer is 2 s long (read from a random offset): loop it so a long voice isn't cut short
    if (dur > 0.7) src.loop = true
    f.frequency.setValueAtTime(o.f0, o.t)
    if (o.fMid !== undefined) f.frequency.exponentialRampToValueAtTime(o.fMid, o.t + o.a)
    if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(o.f1, o.t + dur)
    let dest: AudioNode = this.out
    if (o.panFrom !== undefined) {
      const p = this.ctx.createStereoPanner()
      p.pan.setValueAtTime(o.panFrom, o.t)
      p.pan.linearRampToValueAtTime(o.panTo ?? 0, o.t + dur)
      p.connect(this.out)
      dest = p
    }
    const g = this.env(o.t, o.peak, o.a, o.d, dest, hold)
    src.connect(f).connect(g)
    this.track(src, o.t, o.t + dur + 0.02, Math.random() * 1.2)
    return this
  }

  /** Returns the voice's end time; tears the voice down when its last source ends. */
  finish(): number {
    const out = this.out
    const send = this.send
    if (this.last) {
      this.last.onended = () => {
        out.disconnect()
        send.disconnect()
      }
    } else {
      out.disconnect()
      send.disconnect()
    }
    return this.end
  }
}

/** 5-level staircase transfer curve, built once and shared by every crushed voice. */
let CRUSH: Float32Array<ArrayBuffer> | null = null
function crushCurve(): Float32Array<ArrayBuffer> {
  if (CRUSH) return CRUSH
  const n = 1024
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) c[i] = Math.round(((i / (n - 1)) * 2 - 1) * 2) / 2
  CRUSH = c
  return c
}

// ── recipes (procedural fallbacks; also the only voice for cut/boot/reject/pulse/crack) ────
// Peaks are pre-master amplitudes; each recipe's Σpeak ≤ 0.34 (→ ≤ −12 dBFS out).

type Recipe = (v: Voice, t: number, p: number, o: PlayOpts) => void

const TONAL_SYNTH: ReadonlySet<SfxName> = new Set<SfxName>(['beep', 'lock', 'confirm', 'chime', 'chime2', 'pop', 'air', 'shimmer', 'open', 'warm'])

/** Deterministic-enough jitter for textures (no allocation, no Math.random bias concerns). */
const jit = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const clampDur = (d: number | undefined, lo: number, hi: number, def: number) => Math.max(lo, Math.min(hi, d ?? def))

const RECIPES: Record<SfxName, Recipe> = {
  // Soft low thump: sine dropping 120→42 Hz + a dull felt-like click.
  cut: (v, t, p) => {
    v.reverb(0.12)
      .tone({ t, f0: 120 * p, f1: 42 * p, glide: 0.14, peak: 0.26, a: 0.004, d: 0.32 })
      .noise({ t, filter: 'lowpass', f0: 1400 * p, f1: 300, peak: 0.06, a: 0.002, d: 0.06 })
  },
  // Airy whoosh: band-passed noise sweeping 280→2200→500 Hz, panning L→R.
  whoosh: (v, t, p) => {
    v.reverb(0.35).noise({ t, filter: 'bandpass', f0: 280 * p, fMid: 2200 * p, f1: 500 * p, q: 0.9, peak: 0.22, a: 0.32, d: 0.42, panFrom: -0.5, panTo: 0.5 })
  },
  // Short swish: a quicker, darker whoosh.
  swish: (v, t, p) => {
    v.reverb(0.2).noise({ t, filter: 'bandpass', f0: 400 * p, fMid: 1800 * p, f1: 600 * p, q: 1, peak: 0.18, a: 0.16, d: 0.24, panFrom: 0.3, panTo: -0.3 })
  },
  // Power-on: sub thump + a glassy two-partial rising chirp.
  boot: (v, t, p) => {
    v.reverb(0.25)
      .tone({ t, f0: 90 * p, f1: 48 * p, glide: 0.2, peak: 0.18, a: 0.006, d: 0.4 })
      .tone({ t: t + 0.03, f0: 520 * p, f1: 1040 * p, glide: 0.09, peak: 0.07, a: 0.01, d: 0.22 })
      .tone({ t: t + 0.03, f0: 1560 * p, f1: 3120 * p, glide: 0.09, peak: 0.025, a: 0.01, d: 0.12 })
  },
  // HUD beep: pure C6 sine with a quiet octave, 90 ms.
  beep: (v, t, p) => {
    v.reverb(0.15)
      .tone({ t, f0: 1046.5 * p, peak: 0.08, a: 0.004, d: 0.09 })
      .tone({ t, f0: 2093 * p, peak: 0.015, a: 0.004, d: 0.05 })
  },
  // Glassy tick: inharmonic sine pair (3.2 k / 5.1 k), 30 ms ping.
  tick: (v, t, p) => {
    v.reverb(0.1)
      .tone({ t, f0: 3200 * p, peak: 0.05, a: 0.001, d: 0.035 })
      .tone({ t, f0: 5120 * p, peak: 0.02, a: 0.001, d: 0.02 })
  },
  // Keystroke: 10 ms band-passed noise click around 3.5–5 kHz (randomised).
  type: (v, t, p) => {
    v.noise({ t, filter: 'bandpass', f0: (3500 + Math.random() * 1500) * p, q: 2.5, peak: 0.15, a: 0.001, d: 0.012 })
  },
  // Data rain: a short run of soft, randomly pitched blips (one textured event).
  data: (v, t, p) => {
    v.reverb(0.1)
    for (let i = 0; i < 9; i++) v.tone({ t: t + i * 0.07, f0: (1300 + ((i * 7) % 5) * 260) * p, peak: 0.028, a: 0.002, d: 0.04, lowpass: 4000 })
  },
  // Scanner sweep: soft triangle gliding 400→1800 Hz under a lowpass + hiss.
  scan: (v, t, p) => {
    v.reverb(0.2)
      .tone({ t, type: 'triangle', f0: 400 * p, f1: 1800 * p, glide: 0.5, peak: 0.05, a: 0.08, d: 0.45, lowpass: 2400 })
      .noise({ t, filter: 'highpass', f0: 3000, f1: 6000, peak: 0.025, a: 0.2, d: 0.3 })
  },
  // Target lock: two quick rising sines (G5→C6) on a tiny thump.
  lock: (v, t, p) => {
    v.reverb(0.18)
      .tone({ t, f0: 784 * p, peak: 0.07, a: 0.003, d: 0.07 })
      .tone({ t: t + 0.07, f0: 1046.5 * p, peak: 0.08, a: 0.003, d: 0.14 })
      .tone({ t, f0: 70, f1: 45, peak: 0.12, a: 0.004, d: 0.16 })
  },
  // Soft denial: two descending low-passed triangles (330→247 Hz).
  reject: (v, t, p) => {
    v.reverb(0.12)
      .tone({ t, type: 'triangle', f0: 330 * p, peak: 0.1, a: 0.006, d: 0.12, lowpass: 1200 })
      .tone({ t: t + 0.12, type: 'triangle', f0: 247 * p, peak: 0.1, a: 0.006, d: 0.22, lowpass: 1000 })
  },
  // Seal/stamp: low thump + a long bell (C6 with an inharmonic 2.76× partial).
  seal: (v, t, p) => {
    v.reverb(0.3)
      .tone({ t, f0: 100 * p, f1: 40 * p, glide: 0.15, peak: 0.2, a: 0.004, d: 0.3 })
      .tone({ t: t + 0.01, f0: 1046.5 * p, peak: 0.06, a: 0.003, d: 0.9 })
      .tone({ t: t + 0.01, f0: 1046.5 * 2.76 * p, peak: 0.015, a: 0.002, d: 0.4 })
  },
  // Confirm: gentle C–G–C sine arpeggio, 70 ms apart, bloomed in reverb.
  confirm: (v, t, p) => {
    v.reverb(0.4)
    ;[523.25, 783.99, 1046.5].forEach((f, i) => v.tone({ t: t + i * 0.07, f0: f * p, peak: 0.07, a: 0.006, d: 0.6 - i * 0.1 }))
  },
  // Heartbeat pulse: 58 Hz sine with a soft 25 ms attack.
  pulse: (v, t, p) => {
    v.tone({ t, f0: 62 * p, f1: 52 * p, peak: 0.24, a: 0.025, d: 0.38 })
  },
  // Counter blip: 1 kHz square-ish (low-passed) 35 ms.
  count: (v, t, p) => {
    v.tone({ t, type: 'square', f0: 1000 * p, peak: 0.05, a: 0.002, d: 0.035, lowpass: 2500 })
  },
  // Pop: a round sine blip dropping an octave in 60 ms.
  pop: (v, t, p) => {
    v.reverb(0.1).tone({ t, f0: 1046.5 * p, f1: 523.25 * p, glide: 0.06, peak: 0.12, a: 0.003, d: 0.09 })
  },
  // Impact: deep 90→32 Hz drop + low-passed noise body, long reverb bloom.
  impact: (v, t, p) => {
    v.reverb(0.45)
      .tone({ t, f0: 90 * p, f1: 32 * p, glide: 0.6, peak: 0.24, a: 0.005, d: 1.3 })
      .noise({ t, filter: 'lowpass', f0: 2200, f1: 180, peak: 0.09, a: 0.004, d: 0.6 })
  },
  // Thud: short, soft low knock.
  thud: (v, t, p) => {
    v.reverb(0.15)
      .tone({ t, f0: 80 * p, f1: 40 * p, glide: 0.18, peak: 0.24, a: 0.004, d: 0.4 })
      .noise({ t, filter: 'lowpass', f0: 900, f1: 200, peak: 0.05, a: 0.003, d: 0.12 })
  },
  // Riser: band-passed noise swelling 350 Hz→3.2 kHz over 0.55 s + a faint rising sine (peak at +0.55).
  riser: (v, t, p) => {
    v.reverb(0.3)
      .noise({ t, filter: 'bandpass', f0: 350 * p, fMid: 3200 * p, f1: 2400 * p, q: 1.4, peak: 0.11, a: 0.55, d: 0.14 })
      .tone({ t, f0: 220 * p, f1: 440 * p, glide: 0.55, peak: 0.025, a: 0.5, d: 0.12, lowpass: 1200 })
  },
  // Glitch: three bit-crushed square blips jumping pitch + a hard digital click.
  glitch: (v, t, p) => {
    v.reverb(0.08)
      .noise({ t, filter: 'highpass', f0: 2500, peak: 0.08, a: 0.001, d: 0.02 })
      .tone({ t, type: 'square', f0: 740 * p, peak: 0.05, a: 0.001, d: 0.03, lowpass: 3800, crush: true })
      .tone({ t: t + 0.035, type: 'square', f0: 1480 * p, f1: 370 * p, glide: 0.03, peak: 0.045, a: 0.001, d: 0.035, lowpass: 3800, crush: true })
      .tone({ t: t + 0.08, type: 'square', f0: 220 * p, peak: 0.05, a: 0.001, d: 0.05, lowpass: 2200, crush: true })
  },
  // Crack: sharp high transient + a darkening band-passed noise tail + a short low knock.
  crack: (v, t, p) => {
    v.reverb(0.25)
      .noise({ t, filter: 'highpass', f0: 3000 * p, peak: 0.13, a: 0.001, d: 0.03 })
      .noise({ t: t + 0.004, filter: 'bandpass', f0: 2600 * p, f1: 500 * p, q: 1.1, peak: 0.06, a: 0.003, d: 0.38 })
      .tone({ t, f0: 150 * p, f1: 60 * p, glide: 0.12, peak: 0.1, a: 0.002, d: 0.2 })
  },
  // Chime: soft bell (C6 + octave/twelfth partials + a low C5 body), long room tail.
  chime: (v, t, p) => {
    v.reverb(0.5)
      .tone({ t, f0: 1046.5 * p, peak: 0.05, a: 0.005, d: 1.7 })
      .tone({ t, f0: 1046.5 * 2.0 * p, peak: 0.016, a: 0.004, d: 0.9, detune: 4 })
      .tone({ t, f0: 1046.5 * 3.01 * p, peak: 0.007, a: 0.003, d: 0.45 })
      .tone({ t, f0: 523.25 * p, peak: 0.02, a: 0.01, d: 1.2 })
  },
  // Chime 2: the same bell a fourth lower (G5).
  chime2: (v, t, p, o) => RECIPES.chime(v, t, 0.749 * p, o),

  // ── scene-event palette (eventMap.ts). Pitches are written in C and shifted by `tune`. ──

  // reveal — very soft airy swell: band-passed noise breathing in over 0.22 s + a faint G6 shimmer.
  air: (v, t, p, o) => {
    const glide = o.panTo !== undefined ? { panFrom: o.pan ?? 0, panTo: o.panTo } : {}
    v.reverb(0.45)
      // the band follows the pitch (√ — a gentle shift): eventMap's darker / brighter variants
      .noise({ t, filter: 'bandpass', f0: 1800 * Math.sqrt(p), fMid: 3600 * Math.sqrt(p), f1: 2600 * Math.sqrt(p), q: 0.7, peak: 0.07, a: 0.22, d: 0.5, ...glide })
      .tone({ t: t + 0.05, f0: 1568 * p, peak: 0.012, a: 0.18, d: 0.45 })
  },
  // type — ONE soft keyboard texture for `dur`: muffled band-passed clicks at an uneven 45–110 ms
  // cadence, fading in/out at the run's edges (no per-character events).
  keys: (v, t, p, o) => {
    const dur = clampDur(o.dur, 0.2, 5, 0.8)
    let x = 0
    for (let i = 0; x < dur && i < 90; i++) {
      const edge = Math.min(1, x / 0.12, (dur - x) / 0.15)
      v.noise({ t: t + x, filter: 'bandpass', f0: (1800 + jit(i, 1) * 900) * p, q: 1.6, peak: 0.07 * (0.55 + 0.45 * jit(i, 2)) * Math.max(0.25, edge), a: 0.001, d: 0.018 })
      x += 0.045 + jit(i, 3) * 0.065
    }
  },
  // data — granular shimmer for `dur`: tiny sine grains on a pentatonic set (C D E G A, 2 octaves),
  // ~30 grains/s under a swell envelope, panned along x → toX. Long flows (> 2.5 s, up to
  // MAX_TEXTURE_S) get a natural shape instead: slow attack, sustained bed, gentle tail, sparser grains.
  shimmer: (v, t, p, o) => {
    const dur = clampDur(o.dur, 0.3, MAX_TEXTURE_S, 1)
    const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637]
    const long = dur > 2.5
    const n = long ? Math.min(200, Math.round(dur * 22)) : Math.min(110, Math.round(dur * 30))
    const atk = Math.min(0.9, dur * 0.25)
    const rel = Math.min(1.6, dur * 0.3)
    const ss = (k: number) => k * k * (3 - 2 * k)
    const shape = (u: number) => {
      if (!long) return Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.03))
      const x = u * dur
      return 0.85 * (x < atk ? ss(x / atk) : x > dur - rel ? ss(Math.max(0, (dur - x) / rel)) : 1)
    }
    const from = o.pan ?? 0
    const to = o.panTo ?? from
    const glide = o.panTo !== undefined
    v.reverb(0.3)
    for (let i = 0; i < n; i++) {
      const u = i / n
      const env = shape(u)
      // with a glide each grain sits on the x → toX line (the voice itself is centred)
      const pan = glide ? from + (to - from) * u + (jit(i, 7) - 0.5) * 0.15 : undefined
      v.tone({ t: t + u * dur + jit(i, 4) * 0.02, f0: PENTA[Math.floor(jit(i, 5) * PENTA.length)] * p, peak: 0.028 * env + 0.006, a: 0.004, d: 0.05 + jit(i, 6) * 0.05, lowpass: 5000, pan })
    }
  },
  // scan — gentle filtered sweep across `dur`: low-Q band-pass noise 500 → 2600 Hz with a
  // soft triangle glide underneath; pans x → toX.
  sweep: (v, t, p, o) => {
    const dur = clampDur(o.dur, 0.3, MAX_TEXTURE_S, 0.8)
    // with panTo the voice is centred and the sweep carries the glide; otherwise the voice pans
    const glide = o.panTo !== undefined ? { panFrom: o.pan ?? 0, panTo: o.panTo } : {}
    if (dur > 2.5) {
      // long scan (follows the whole visual): slow attack, a sustained band that keeps opening, gentle tail
      const a = Math.min(1.2, dur * 0.28)
      const d = Math.min(1.6, dur * 0.3)
      v.reverb(0.35)
        .noise({ t, filter: 'bandpass', f0: 450 * p, fMid: 900 * p, f1: 2200 * p, q: 0.8, peak: 0.16, a, hold: dur - a - d, d, ...glide })
        .tone({ t, type: 'triangle', f0: 247 * p, f1: 494 * p, glide: dur, peak: 0.035, a, d: dur - a, lowpass: 1200 })
      return
    }
    v.reverb(0.3)
      .noise({ t, filter: 'bandpass', f0: 500 * p, fMid: 1400 * p, f1: 2600 * p, q: 0.9, peak: 0.1, a: dur * 0.55, d: dur * 0.45, ...glide })
      .tone({ t, type: 'triangle', f0: 330 * p, f1: 660 * p, glide: dur, peak: 0.02, a: dur * 0.5, d: dur * 0.5, lowpass: 1400 })
  },
  // defect — low, dull, muted tone (no beep): two slightly detuned triangles at D3, low-passed.
  dull: (v, t, p) => {
    v.reverb(0.2)
      .tone({ t, type: 'triangle', f0: 146.8 * p, f1: 138.6 * p, glide: 0.3, peak: 0.12, a: 0.012, d: 0.32, lowpass: 600 })
      .tone({ t, type: 'triangle', f0: 147.6 * p, f1: 139.3 * p, glide: 0.3, peak: 0.07, a: 0.018, d: 0.26, lowpass: 480 })
      .tone({ t, f0: 73.4 * p, peak: 0.06, a: 0.015, d: 0.24 })
  },
  // block (layer) — muted buzz: a low square at 92 Hz through a dark low-pass, 0.22 s.
  buzz: (v, t, p) => {
    v.reverb(0.08).tone({ t: t + 0.01, type: 'square', f0: 92 * p, peak: 0.05, a: 0.008, d: 0.16, lowpass: 400 })
  },
  // approve — soft open tone: C5 → G5 (a fifth up, tuned by `tune`) with a slow bloom.
  open: (v, t, p) => {
    v.reverb(0.45)
      .tone({ t, f0: 523.25 * p, peak: 0.05, a: 0.03, d: 0.7 })
      .tone({ t: t + 0.09, f0: 783.99 * p, peak: 0.05, a: 0.04, d: 0.9 })
      .tone({ t: t + 0.09, f0: 1567.98 * p, peak: 0.008, a: 0.05, d: 0.5 })
  },
  // resolve — warm soft chord: C3 G3 C4 D4 (an open sus2 → E B E F# after `tune`, in the score's
  // E minor), low-passed triangles with a slow 0.3 s attack and a long tail.
  warm: (v, t, p) => {
    v.reverb(0.55)
    ;[130.81, 196, 261.63, 293.66].forEach((f, i) => v.tone({ t: t + i * 0.025, type: 'triangle', f0: f * p, peak: [0.07, 0.05, 0.04, 0.025][i], a: 0.3, d: 2.2 - i * 0.2, lowpass: 1600 }))
  },
}

export function createEngine() {
  return new SfxEngine()
}
export type { SfxEngine }
