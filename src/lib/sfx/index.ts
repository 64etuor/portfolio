import { createEngine, type SfxEngine } from './engine'
import { FilmMusic } from './music'

export type { SfxName, SfxState, PlayOpts } from './engine'
export type { FilmClockSource, MusicEvent } from './music'
export { FILM_SCORE, quantizeToGrid } from './score'

/**
 * Singleton procedural SFX engine. Import-safe on the server (no window access
 * until a method runs on the client).
 *
 *   sfx.prime()                 – create/resume the AudioContext (or wait for a gesture)
 *   sfx.setEnabled(bool)        – user mute preference (persisted, fades master — music included)
 *   sfx.enabled                 – current preference (default: on)
 *   sfx.play(name, opts?)       – one-shot (heavy ones duck the music bus)
 *   sfx.cue(prevT, t, at, name) – fire once when a forward-running timeline crosses `at`
 */
export const sfx: SfxEngine = createEngine()

/**
 * Film score player (music.ts): `filmMusic.attach(clock)` on /film mount, `detach()` on leave.
 * Plays through the engine's music bus, so it follows the same toggle/blocked/pause state.
 */
export const filmMusic = new FilmMusic({
  target: () => sfx.musicTarget(),
  audible: () => sfx.state === 'on',
})

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  const w = window as unknown as { __sfx?: SfxEngine; __filmMusic?: FilmMusic }
  w.__sfx = sfx
  w.__filmMusic = filmMusic
}

export { BOOT_SEQUENCE, playSequence } from './sequences'
