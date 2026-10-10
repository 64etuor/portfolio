import type { PlayOpts, SfxName } from './engine'

/** [seconds from start, sound, opts?] */
export type SfxStep = readonly [number, SfxName, PlayOpts?]

/**
 * Boot act (05-bios-boot) — loosely follows the scene's own timeline:
 * power-on flash → logo typed line by line (60 ms) → POST lines (185 ms) with a
 * memory count → SYSTEM READY (~3.85 s).
 */
export const BOOT_SEQUENCE: readonly SfxStep[] = [
  [0, 'boot'],
  ...Array.from({ length: 6 }, (_, i) => [0.3 + i * 0.06, 'type', { gain: 0.6 }] as const),
  [0.95, 'beep', { gain: 0.7 }],
  ...Array.from({ length: 5 }, (_, i) => [1.15 + i * 0.185, 'tick', { gain: 0.6, pitch: 1 + i * 0.02 }] as const),
  ...Array.from({ length: 6 }, (_, i) => [2.1 + i * 0.09, 'count', { gain: 0.55, pitch: 1 + i * 0.04 }] as const),
  ...Array.from({ length: 4 }, (_, i) => [2.85 + i * 0.185, 'tick', { gain: 0.55 }] as const),
  [3.85, 'lock'],
]

/** Schedule a sequence on the audio clock via `play` (each step uses `delay`). */
export function playSequence(
  play: (name: SfxName, opts?: PlayOpts) => void,
  steps: readonly SfxStep[],
  offset = 0,
) {
  for (const [at, name, opts] of steps) play(name, { ...opts, delay: offset + at })
}
