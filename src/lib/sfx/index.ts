import { createEngine, type SfxEngine } from './engine'

export type { SfxName, DroneTone, SfxState, PlayOpts } from './engine'

/**
 * Singleton procedural SFX engine. Import-safe on the server (no window access
 * until a method runs on the client).
 *
 *   sfx.prime()                 – create/resume the AudioContext (or wait for a gesture)
 *   sfx.setEnabled(bool)        – user mute preference (persisted, fades master)
 *   sfx.enabled                 – current preference (default: on)
 *   sfx.play(name, opts?)       – one-shot
 *   sfx.drone(on, tone?)        – sub-bass bed
 *   sfx.cue(prevT, t, at, name) – fire once when a forward-running timeline crosses `at`
 */
export const sfx: SfxEngine = createEngine()

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  ;(window as unknown as { __sfx?: SfxEngine }).__sfx = sfx
}

export { BOOT_SEQUENCE, playSequence } from './sequences'
