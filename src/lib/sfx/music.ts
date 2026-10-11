import { FILM_SCORE, type FilmScore } from './score'

/**
 * FilmMusic — plays the film score file locked to the film's master clock.
 *
 *   <audio preload=none> → MediaElementAudioSourceNode → fade gain → engine music bus
 *
 * The bus sits behind the engine's pause gain / master / limiter, so the sound toggle,
 * M key, blocked-until-gesture and SFX ducking all apply to the music automatically.
 *
 * A 50 ms poll (no per-tick allocation) compares the element position with the clock:
 *   - playing & audible → play from filmT; drift > 120 ms → gentle ±3 % rate trim until
 *     < 30 ms; drift > 500 ms (rewind/seek, tab stall) → quick dip, seek, fade back in;
 *   - every (re)start/seek is aligned while muted: it seeks ahead by the learned seek latency,
 *     checks, refines (≤ 2×, to < 40 ms) and only then fades in;
 *   - paused → fade out (τ 40 ms, silent < 150 ms), then pause the element; resume re-seeks
 *     to the exact filmT;
 *   - ended → slower fade (τ 350 ms) under the iris-out;
 *   - muted / blocked / context suspended → element paused, picks up at filmT when audible.
 * The element is only created (and only starts loading) when /film attaches a clock;
 * detach() pauses it, drops the src and disconnects the node.
 */

export interface FilmClockSource {
  /** master clock position (ms) */
  nowMs(): number
  state(): 'playing' | 'paused' | 'ended'
}

export interface MusicHost {
  /** live context + bus, or null if there is no context yet */
  target(): { ctx: AudioContext; bus: AudioNode } | null
  /** user wants sound and the context is running */
  audible(): boolean
}

export type MusicEvent = 'play' | 'seek' | 'pause' | 'end' | 'rate' | 'error'

const TICK_MS = 50
const DRIFT_TRIM_S = 0.12
const DRIFT_OK_S = 0.03
const DRIFT_SEEK_S = 0.5
const MAX_RATE_DEV = 0.03
const FADE_IN_TAU = 0.06
const PAUSE_TAU = 0.04
const END_TAU = 0.35
const SEEK_DIP_MS = 60
const ALIGN_OK_S = 0.04
const ALIGN_TRIES = 2
const ALIGN_SETTLE_MS = 80
/** after a fade-in, drift > DRIFT_TRIM_S within this window re-seeks instead of trimming */
const SETTLE_WINDOW_MS = 2500

export class FilmMusic {
  private clock: FilmClockSource | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private el: HTMLAudioElement | null = null
  private node: MediaElementAudioSourceNode | null = null
  private fade: GainNode | null = null
  private nodeCtx: AudioContext | null = null
  /** a play()/seek is in flight — the poll waits for it */
  private busy = false
  /** the element is (or is about to be) audible */
  private live = false
  private trimming = false
  /** learned time (s) between setting currentTime and playback resuming there */
  private seekLag = 0.05
  /** performance.now() of the last fade-in after an alignment */
  private alignedAt = 0
  private stopTimer: ReturnType<typeof setTimeout> | null = null
  /** dev/QA hook */
  onEvent: ((e: MusicEvent, filmT: number, detail: number) => void) | null = null

  constructor(
    private host: MusicHost,
    private score: FilmScore = FILM_SCORE,
  ) {}

  /** Position the element reports (s), or −1 when there is none (dev/QA). */
  get position(): number {
    return this.el ? this.el.currentTime : -1
  }

  get playing(): boolean {
    return !!this.el && !this.el.paused && this.live
  }

  attach(clock: FilmClockSource): void {
    if (typeof window === 'undefined') return
    this.clock = clock
    if (!this.el) {
      const el = new Audio()
      el.preload = 'none'
      el.loop = false
      el.src = this.score.src
      el.preload = 'auto' // /film is mounted: start buffering now (never on other pages)
      el.addEventListener('error', this.onError)
      this.el = el
    }
    if (!this.timer) this.timer = setInterval(this.tick, TICK_MS)
    this.tick()
  }

  detach(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.clock = null
    this.clearStop()
    const el = this.el
    if (el) {
      el.pause()
      el.removeEventListener('error', this.onError)
      el.removeAttribute('src')
      el.load()
    }
    this.fade?.disconnect()
    this.node?.disconnect()
    this.el = null
    this.node = null
    this.fade = null
    this.nodeCtx = null
    this.live = false
    this.busy = false
    this.trimming = false
  }

  private onError = () => this.emit('error', this.el?.error?.code ?? 0)

  private emit(e: MusicEvent, detail = 0) {
    this.onEvent?.(e, this.clock ? this.clock.nowMs() / 1000 : -1, detail)
  }

  /** Route the element into the engine's music bus (once per element/context). */
  private ensureNode(ctx: AudioContext, bus: AudioNode): GainNode | null {
    if (!this.el) return null
    if (this.node && this.nodeCtx === ctx) return this.fade
    const node = ctx.createMediaElementSource(this.el)
    const fade = ctx.createGain()
    fade.gain.value = 0
    node.connect(fade).connect(bus)
    this.node = node
    this.fade = fade
    this.nodeCtx = ctx
    return fade
  }

  private clearStop() {
    if (this.stopTimer) clearTimeout(this.stopTimer)
    this.stopTimer = null
  }

  private tick = () => {
    const el = this.el
    const clock = this.clock
    if (!el || !clock) return
    const t = this.host.target()
    const st = clock.state()
    const film = clock.nowMs() / 1000
    const want = !!t && this.host.audible() && st === 'playing' && film < this.score.duration - 0.05

    if (!want) {
      const end = st === 'ended' || film >= this.score.duration - 0.05
      if (this.live) this.stop(end ? END_TAU : PAUSE_TAU, end ? 'end' : 'pause')
      return
    }
    if (this.busy) return // a start/seek is aligning
    const fade = this.ensureNode(t.ctx, t.bus)
    if (!fade) return

    if (!this.live || el.paused) {
      this.start(film, fade, t.ctx)
      return
    }
    if (el.seeking) return

    const drift = el.currentTime - film // + = music ahead of picture
    const abs = drift < 0 ? -drift : drift
    // Large jump (rewind, stall), or a start that slipped while the decoder warmed up
    // (just faded in, so a quick re-seek is inaudible): seek. Otherwise trim gently.
    if (abs > DRIFT_SEEK_S || (abs > DRIFT_TRIM_S && performance.now() - this.alignedAt < SETTLE_WINDOW_MS)) {
      this.seek(fade, t.ctx)
    } else if (abs > DRIFT_TRIM_S || (this.trimming && abs > DRIFT_OK_S)) {
      const r = 1 - Math.max(-MAX_RATE_DEV, Math.min(MAX_RATE_DEV, drift * 0.25))
      if (!this.trimming || Math.abs(el.playbackRate - r) > 0.004) {
        el.playbackRate = r
        if (!this.trimming) this.emit('rate', drift)
      }
      this.trimming = true
    } else if (this.trimming) {
      el.playbackRate = 1
      this.trimming = false
    }
  }

  private start(film: number, fade: GainNode, ctx: AudioContext) {
    const el = this.el!
    this.clearStop()
    this.busy = true
    this.live = true
    this.trimming = false
    el.playbackRate = 1
    fade.gain.cancelScheduledValues(ctx.currentTime)
    fade.gain.setValueAtTime(0, ctx.currentTime)
    if (Math.abs(el.currentTime - film) > 1) el.currentTime = film // big jump: don't decode far away first
    el.play().then(
      () => this.align(el, fade, ctx, 'play', 0),
      () => {
        // No activation yet (or the file is missing): stay silent, retry on a later tick.
        this.busy = false
        this.live = false
      },
    )
  }

  /** Dip, jump to the clock, fade back in (rewind / large drift). */
  private seek(fade: GainNode, ctx: AudioContext) {
    const el = this.el!
    this.busy = true
    this.trimming = false
    el.playbackRate = 1
    fade.gain.cancelScheduledValues(ctx.currentTime)
    fade.gain.setTargetAtTime(0, ctx.currentTime, 0.015)
    setTimeout(() => this.align(el, fade, ctx, 'seek', 0), SEEK_DIP_MS)
  }

  /**
   * While muted: seek to where the clock WILL be once the seek has landed (learned
   * `seekLag`), check the result, refine up to ALIGN_TRIES times, then fade in.
   */
  private align(el: HTMLAudioElement, fade: GainNode, ctx: AudioContext, why: MusicEvent, tries: number) {
    if (this.el !== el || !this.clock || !this.live) {
      this.busy = false
      return
    }
    let settled = false
    const check = () => {
      if (settled) return
      settled = true
      el.removeEventListener('seeked', onSeeked)
      setTimeout(() => {
        if (this.el !== el || !this.clock || !this.live) {
          this.busy = false
          return
        }
        const d = el.currentTime - this.clock.nowMs() / 1000
        if (Math.abs(d) > ALIGN_OK_S && tries < ALIGN_TRIES) {
          this.seekLag = Math.max(0, Math.min(0.4, this.seekLag - d))
          this.align(el, fade, ctx, why, tries + 1)
          return
        }
        this.busy = false
        this.alignedAt = performance.now()
        fade.gain.cancelScheduledValues(ctx.currentTime)
        fade.gain.setTargetAtTime(this.score.level, ctx.currentTime, FADE_IN_TAU)
        this.emit(why, d)
      }, ALIGN_SETTLE_MS)
    }
    const onSeeked = () => check()
    el.addEventListener('seeked', onSeeked)
    setTimeout(check, 1000) // never wait forever for 'seeked'
    el.currentTime = Math.min(this.score.duration, this.clock.nowMs() / 1000 + this.seekLag)
  }

  private stop(tau: number, why: MusicEvent) {
    const el = this.el!
    this.live = false
    this.trimming = false
    const t = this.host.target()
    if (this.fade && t) {
      this.fade.gain.cancelScheduledValues(t.ctx.currentTime)
      this.fade.gain.setTargetAtTime(0, t.ctx.currentTime, tau)
    }
    this.emit(why)
    this.clearStop()
    // Let the fade settle (≈ 6τ), then actually pause the element.
    this.stopTimer = setTimeout(
      () => {
        this.stopTimer = null
        if (!this.live && this.el === el) el.pause()
      },
      Math.max(120, tau * 6000),
    )
  }
}
