/**
 * Development-only score/mix instrumentation (loaded via dynamic import from
 * useFilmSoundCues when NODE_ENV === 'development'; never shipped to a prod page).
 *
 * window.__scoreLog = {
 *   seconds: per ~1 s block { filmT, state, pos, rmsDb, peakDb (final output, post-limiter),
 *            musicRmsDb, musicPeakDb (music bus, scaled by MASTER → output-referred) },
 *   fine:    per ~85 ms audio block { filmT, sfxPeakDb, sfxRmsDb (dry voice bus), musPeakDb, musRmsDb
 *            (music bus), all × MASTER → output-referred } — per-event SFX vs music levels,
 *   drift:   every 250 ms { filmT, pos, drift } while the score is playing,
 *   events:  music.ts events { e, filmT, detail, wall },
 * }
 */
import type { SfxEngine } from './engine'
import type { FilmClockSource, FilmMusic, MusicEvent } from './music'

const MASTER = 0.7

interface Block {
  wall: number
  filmT: number
  state: string
  pos: number
  rmsDb: number
  peakDb: number
  musicRmsDb: number
  musicPeakDb: number
}
interface Fine {
  filmT: number
  sfxPeakDb: number
  sfxRmsDb: number
  musPeakDb: number
  musRmsDb: number
}
interface ScoreLog {
  seconds: Block[]
  fine: Fine[]
  drift: { wall: number; filmT: number; pos: number; drift: number }[]
  events: { wall: number; e: MusicEvent; filmT: number; detail: number }[]
}

const db = (x: number) => (x > 0 ? Math.round(200 * Math.log10(x)) / 10 : -120)

export function installScoreDevTools(sfx: SfxEngine, music: FilmMusic, clock: FilmClockSource): () => void {
  const w = window as unknown as { __scoreLog?: ScoreLog }
  const log: ScoreLog = { seconds: [], fine: [], drift: [], events: [] }
  w.__scoreLog = log
  music.onEvent = (e, filmT, detail) => log.events.push({ wall: performance.now(), e, filmT, detail })

  let taps: { out: ScriptProcessorNode; mus: ScriptProcessorNode; vox: ScriptProcessorNode } | null = null
  const blk = { mpeak: 0, msum: 0, mn: 0 }
  const acc = { n: 0, sum: 0, peak: 0, msum: 0, mpeak: 0, mn: 0 }

  const tryTap = () => {
    const t = sfx.devTaps()
    if (!t || taps) return
    const mk = (src: AudioNode, onBlock: (l: Float32Array, r: Float32Array) => void) => {
      const sp = t.ctx.createScriptProcessor(4096, 2, 2)
      sp.onaudioprocess = (ev) => onBlock(ev.inputBuffer.getChannelData(0), ev.inputBuffer.getChannelData(1))
      src.connect(sp)
      sp.connect(t.ctx.destination) // outputs silence; needed to keep it processing
      return sp
    }
    const out = mk(t.output, (l, r) => {
      for (let i = 0; i < l.length; i++) {
        const a = Math.abs(l[i]) > Math.abs(r[i]) ? Math.abs(l[i]) : Math.abs(r[i])
        if (a > acc.peak) acc.peak = a
        acc.sum += (l[i] * l[i] + r[i] * r[i]) / 2
      }
      acc.n += l.length
      if (acc.n >= t.ctx.sampleRate) {
        log.seconds.push({
          wall: performance.now(),
          filmT: Math.round(clock.nowMs()) / 1000,
          state: clock.state(),
          pos: Math.round(music.position * 1000) / 1000,
          rmsDb: db(Math.sqrt(acc.sum / acc.n)),
          peakDb: db(acc.peak),
          musicRmsDb: db(Math.sqrt(acc.msum / Math.max(1, acc.mn)) * MASTER),
          musicPeakDb: db(acc.mpeak * MASTER),
        })
        acc.n = acc.sum = acc.peak = acc.msum = acc.mpeak = acc.mn = 0
      }
    })
    const mus = mk(t.music, (l, r) => {
      for (let i = 0; i < l.length; i++) {
        const a = Math.abs(l[i]) > Math.abs(r[i]) ? Math.abs(l[i]) : Math.abs(r[i])
        if (a > acc.mpeak) acc.mpeak = a
        if (a > blk.mpeak) blk.mpeak = a
        acc.msum += (l[i] * l[i] + r[i] * r[i]) / 2
        blk.msum += (l[i] * l[i] + r[i] * r[i]) / 2
      }
      acc.mn += l.length
      blk.mn += l.length
    })
    const vox = mk(t.voices, (l, r) => {
      let peak = 0
      let sum = 0
      for (let i = 0; i < l.length; i++) {
        const a = Math.abs(l[i]) > Math.abs(r[i]) ? Math.abs(l[i]) : Math.abs(r[i])
        if (a > peak) peak = a
        sum += (l[i] * l[i] + r[i] * r[i]) / 2
      }
      log.fine.push({
        filmT: Math.round(clock.nowMs()) / 1000,
        sfxPeakDb: db(peak * MASTER),
        sfxRmsDb: db(Math.sqrt(sum / l.length) * MASTER),
        musPeakDb: db(blk.mpeak * MASTER),
        musRmsDb: db(Math.sqrt(blk.msum / Math.max(1, blk.mn)) * MASTER),
      })
      blk.mpeak = blk.msum = blk.mn = 0
    })
    taps = { out, mus, vox }
  }

  const iv = setInterval(() => {
    tryTap()
    if (music.playing) {
      const filmT = clock.nowMs() / 1000
      log.drift.push({ wall: performance.now(), filmT, pos: music.position, drift: Math.round((music.position - filmT) * 1000) / 1000 })
    }
  }, 250)

  return () => {
    clearInterval(iv)
    music.onEvent = null
    if (taps) {
      taps.out.disconnect()
      taps.mus.disconnect()
      taps.vox.disconnect()
    }
  }
}
