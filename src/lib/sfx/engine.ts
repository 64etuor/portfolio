/**
 * Procedural SFX engine — Web Audio only (no files, no deps).
 *
 * Graph:
 *   voice → voiceBus ─┬──────────────→ pauseGain → master → limiter → destination
 *                     └→ reverb(send) ─┘     ↑
 *   film score (<audio> → MediaElementSource) → musicBus (ducked under heavy SFX) ┘
 *
 * Level budget (linear, pre-master; MASTER = 0.7):
 *   - each one-shot voice sums to ≤ 0.34 → ≤ 0.24 at output (≈ −12.4 dBFS)
 *   - the score file is mastered to ≈ −18.5 dBFS RMS (peak −2.5) and enters at MUSIC_LEVEL,
 *     so it sits ≈ −22 dBFS RMS at the output, under the SFX accents (see music.ts);
 *   - a DynamicsCompressor ceiling (−10 dBFS, 20:1, makeup gain trimmed) guards stacked voices.
 *
 * SSR-safe: nothing touches `window` until a method is called on the client.
 */

export type SfxName =
  | 'cut'
  | 'whoosh'
  | 'boot'
  | 'beep'
  | 'tick'
  | 'type'
  | 'scan'
  | 'lock'
  | 'reject'
  | 'seal'
  | 'confirm'
  | 'pulse'
  | 'count'
  | 'impact'
  | 'riser'
  | 'glitch'
  | 'crack'
  | 'chime'

/** 'off' = muted by the user · 'on' = audible · 'blocked' = wants sound, waiting for a gesture */
export type SfxState = 'off' | 'on' | 'blocked'

export interface PlayOpts {
  /** level multiplier, clamped to [0, 1] (voices are pre-calibrated to the ceiling) */
  gain?: number
  /** frequency ratio (1 = as designed) */
  pitch?: number
  /** stereo position −1..1 */
  pan?: number
  /** seconds from now (scheduled on the audio clock) */
  delay?: number
}

const MASTER = 0.7
/** limiter ceiling (dBFS, pre-makeup); voices sit ≥ 2 dB below it on their own */
const LIMIT_DB = -10
const MAX_VOICES = 12
const STORAGE_KEY = 'pf.sfx.enabled'
const MIN_GAP: Partial<Record<SfxName, number>> = { type: 0.025, tick: 0.03, count: 0.03 }
const DEFAULT_GAP = 0.045
const SILENT = 0.0001
/**
 * Sidechain-style music duck under the SFX that carry the story: [depth (linear), hold (s), release τ (s)].
 * 0.56–0.71 = −5…−3 dB — enough for the accent to read, short enough not to pump.
 */
const DUCK: Partial<Record<SfxName, readonly [number, number, number]>> = {
  cut: [0.71, 0.08, 0.25],
  whoosh: [0.71, 0.25, 0.3],
  impact: [0.56, 0.35, 0.5],
  crack: [0.6, 0.15, 0.35],
  glitch: [0.71, 0.1, 0.25],
  seal: [0.63, 0.15, 0.35],
  chime: [0.71, 0.2, 0.4],
}

type Ctor = typeof AudioContext

class SfxEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private pauseGain!: GainNode
  private voiceBus!: GainNode
  private reverbIn!: GainNode
  private musicBus!: GainNode
  private output!: GainNode
  private noiseBuf!: AudioBuffer
  private voices: [start: number, end: number][] = []
  private lastPlayed = new Map<SfxName, number>()
  private pref: boolean | null = null
  private unlockArmed = false
  private suspendTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()
  /** dev/QA hook: called for every voice actually started (after voice cap / rate limit) */
  onPlay: ((name: SfxName, when: number) => void) | null = null

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
    this.pauseGain.gain.setTargetAtTime(paused ? 0 : 1, this.ctx.currentTime, paused ? 0.06 : 0.15)
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
    this.ctx = ctx

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

    ctx.onstatechange = () => {
      if (ctx.state !== 'running' && this.enabled && !this.suspendTimer) this.armUnlock()
      this.emit()
    }
    return ctx
  }

  private makeImpulse(ctx: AudioContext, seconds: number): AudioBuffer {
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

  play(name: SfxName, opts: PlayOpts = {}): void {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running' || !this.enabled) return
    const now = ctx.currentTime
    const t = now + 0.01 + Math.max(0, opts.delay ?? 0)

    // voice cap + per-name rate limit
    // Cap voices sounding at the moment this one starts (scheduled ones included).
    this.voices = this.voices.filter(([, e]) => e > now)
    if (this.voices.filter(([s, e]) => s <= t && e > t).length >= MAX_VOICES) return
    const last = this.lastPlayed.get(name)
    if (last !== undefined && Math.abs(t - last) < (MIN_GAP[name] ?? DEFAULT_GAP)) return
    this.lastPlayed.set(name, t)

    const p = opts.pitch ?? 1
    const v = new Voice(ctx, this.noiseBuf, this.voiceBus, this.reverbIn, Math.min(1, Math.max(0, opts.gain ?? 1)), opts.pan ?? 0)
    RECIPES[name](v, t, p)
    this.voices.push([t, v.finish()])
    const duck = DUCK[name]
    if (duck) this.duck(t, duck[0], duck[1], duck[2])
    this.onPlay?.(name, t)
  }

  /**
   * Dip the music bus at audio time `t` to `depth`, hold, then recover with τ = `release`.
   * Events already running (an earlier duck's release) are kept, so overlapping ducks
   * glide from the current value instead of jumping.
   */
  duck(t: number, depth = 0.5, hold = 0.12, release = 0.3): void {
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

  /** Dev/QA only: taps on the final (post-limiter) output and on the music bus. */
  devTaps(): { ctx: AudioContext; output: AudioNode; music: AudioNode } | null {
    return this.ctx ? { ctx: this.ctx, output: this.output, music: this.musicBus } : null
  }
}

// ── voice builder ───────────────────────────────────────────────────────────

class Voice {
  private out: GainNode
  private send: GainNode
  private end = 0
  private last: AudioScheduledSourceNode | null = null

  constructor(
    private ctx: AudioContext,
    private noiseBuf: AudioBuffer,
    bus: AudioNode,
    reverb: AudioNode,
    level: number,
    pan: number,
  ) {
    this.out = ctx.createGain()
    this.out.gain.value = level
    this.send = ctx.createGain()
    this.send.gain.value = 0
    let head: AudioNode = this.out
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

  reverb(amount: number) {
    this.send.gain.value = amount
    return this
  }

  /** Attack/decay envelope on a fresh gain node feeding `dest` (default: voice out). */
  private env(t: number, peak: number, a: number, d: number, dest: AudioNode = this.out): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(peak, t + a)
    g.gain.exponentialRampToValueAtTime(SILENT, t + a + d)
    g.gain.setValueAtTime(0, t + a + d + 0.005)
    g.connect(dest)
    return g
  }

  private track(src: AudioScheduledSourceNode, start: number, stop: number) {
    src.start(start)
    src.stop(stop)
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
  }) {
    const osc = this.ctx.createOscillator()
    osc.type = o.type ?? 'sine'
    osc.detune.value = o.detune ?? 0
    osc.frequency.setValueAtTime(o.f0, o.t)
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(o.f1, o.t + (o.glide ?? o.a + o.d))
    const g = this.env(o.t, o.peak, o.a, o.d)
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
    panFrom?: number
    panTo?: number
  }) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = this.ctx.createBiquadFilter()
    f.type = o.filter
    f.Q.value = o.q ?? 0.8
    const dur = o.a + o.d
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
    const g = this.env(o.t, o.peak, o.a, o.d, dest)
    src.connect(f).connect(g)
    src.start(o.t, Math.random() * 1.2)
    src.stop(o.t + dur + 0.02)
    if (o.t + dur + 0.02 >= this.end) {
      this.end = o.t + dur + 0.02
      this.last = src
    }
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

// ── recipes ─────────────────────────────────────────────────────────────────
// Peaks are pre-master amplitudes; each recipe's Σpeak ≤ 0.34 (→ ≤ −12 dBFS out).

type Recipe = (v: Voice, t: number, p: number) => void

const RECIPES: Record<SfxName, Recipe> = {
  // Soft low thump: sine dropping 120→42 Hz + a dull felt-like click.
  cut: (v, t, p) => {
    v.reverb(0.12)
      .tone({ t, f0: 120 * p, f1: 42 * p, glide: 0.14, peak: 0.26, a: 0.004, d: 0.32 })
      .noise({ t, filter: 'lowpass', f0: 1400 * p, f1: 300, peak: 0.06, a: 0.002, d: 0.06 })
  },
  // Airy whoosh: band-passed noise sweeping 280→2200→500 Hz, panning L→R.
  whoosh: (v, t, p) => {
    v.reverb(0.35).noise({
      t,
      filter: 'bandpass',
      f0: 280 * p,
      fMid: 2200 * p,
      f1: 500 * p,
      q: 0.9,
      peak: 0.22,
      a: 0.32,
      d: 0.42,
      panFrom: -0.5,
      panTo: 0.5,
    })
  },
  // Power-on: sub thump + a glassy two-partial rising chirp.
  boot: (v, t, p) => {
    v.reverb(0.25)
      .tone({ t, f0: 90 * p, f1: 48 * p, glide: 0.2, peak: 0.18, a: 0.006, d: 0.4 })
      .tone({ t: t + 0.03, f0: 520 * p, f1: 1040 * p, glide: 0.09, peak: 0.07, a: 0.01, d: 0.22 })
      .tone({ t: t + 0.03, f0: 1560 * p, f1: 3120 * p, glide: 0.09, peak: 0.025, a: 0.01, d: 0.12 })
  },
  // HUD beep: pure 1.32 kHz sine with a quiet octave, 90 ms.
  beep: (v, t, p) => {
    v.reverb(0.15)
      .tone({ t, f0: 1320 * p, peak: 0.08, a: 0.004, d: 0.09 })
      .tone({ t, f0: 2640 * p, peak: 0.015, a: 0.004, d: 0.05 })
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
  // Scanner sweep: soft triangle gliding 400→1800 Hz under a lowpass + hiss.
  scan: (v, t, p) => {
    v.reverb(0.2)
      .tone({ t, type: 'triangle', f0: 400 * p, f1: 1800 * p, glide: 0.5, peak: 0.05, a: 0.08, d: 0.45, lowpass: 2400 })
      .noise({ t, filter: 'highpass', f0: 3000, f1: 6000, peak: 0.025, a: 0.2, d: 0.3 })
  },
  // Target lock: two quick rising sines (880→1320 Hz) on a tiny thump.
  lock: (v, t, p) => {
    v.reverb(0.18)
      .tone({ t, f0: 880 * p, peak: 0.07, a: 0.003, d: 0.07 })
      .tone({ t: t + 0.07, f0: 1320 * p, peak: 0.08, a: 0.003, d: 0.14 })
      .tone({ t, f0: 70 * p, f1: 45 * p, peak: 0.12, a: 0.004, d: 0.16 })
  },
  // Soft denial: two descending low-passed triangles (330→247 Hz).
  reject: (v, t, p) => {
    v.reverb(0.12)
      .tone({ t, type: 'triangle', f0: 330 * p, peak: 0.1, a: 0.006, d: 0.12, lowpass: 1200 })
      .tone({ t: t + 0.12, type: 'triangle', f0: 247 * p, peak: 0.1, a: 0.006, d: 0.22, lowpass: 1000 })
  },
  // Seal/stamp: low thump + a long bell (1.76 k with inharmonic 2.76× partial).
  seal: (v, t, p) => {
    v.reverb(0.3)
      .tone({ t, f0: 100 * p, f1: 40 * p, glide: 0.15, peak: 0.2, a: 0.004, d: 0.3 })
      .tone({ t: t + 0.01, f0: 1760 * p, peak: 0.06, a: 0.003, d: 0.9 })
      .tone({ t: t + 0.01, f0: 1760 * 2.76 * p, peak: 0.015, a: 0.002, d: 0.4 })
  },
  // Confirm: gentle C-E-G-C sine arpeggio, 70 ms apart, bloomed in reverb.
  confirm: (v, t, p) => {
    v.reverb(0.4)
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      v.tone({ t: t + i * 0.07, f0: f * p, peak: 0.06, a: 0.006, d: 0.6 - i * 0.08 }),
    )
  },
  // Heartbeat pulse: 58 Hz sine with a soft 25 ms attack.
  pulse: (v, t, p) => {
    v.tone({ t, f0: 62 * p, f1: 52 * p, peak: 0.24, a: 0.025, d: 0.38 })
  },
  // Counter blip: 1 kHz square-ish (low-passed) 35 ms.
  count: (v, t, p) => {
    v.tone({ t, type: 'square', f0: 1000 * p, peak: 0.05, a: 0.002, d: 0.035, lowpass: 2500 })
  },
  // Impact: deep 90→32 Hz drop + low-passed noise body, long reverb bloom.
  impact: (v, t, p) => {
    v.reverb(0.45)
      .tone({ t, f0: 90 * p, f1: 32 * p, glide: 0.6, peak: 0.24, a: 0.005, d: 1.3 })
      .noise({ t, filter: 'lowpass', f0: 2200, f1: 180, peak: 0.09, a: 0.004, d: 0.6 })
  },
  // Riser: band-passed noise swelling 350 Hz→3.2 kHz over 0.55 s + a faint rising sine.
  // Cue it 0.55 s BEFORE the reveal it leads into (its peak lands at t + 0.55).
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
}

export function createEngine() {
  return new SfxEngine()
}
export type { SfxEngine }
