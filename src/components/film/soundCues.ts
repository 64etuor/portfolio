import type { SfxName } from '@/lib/sfx'
import { ACTS } from './acts'

/**
 * soundCues — the film's declarative cue sheet.
 *
 * Every time is SHOT-LOCAL seconds: scenes read the same master clock
 * (SceneClock = filmT − shot.start), so `at` lines up 1:1 with the picture.
 * Beat times come from each scene's own timeline constants (noted per cue).
 *
 * The score (public/audio/film-score.mp3, lib/sfx/score.ts) now carries the flow, so the
 * sheet keeps only the accents that carry the message — the fussy ticks / beeps / counters /
 * typing / decorative scans were dropped and the rest sit ~3–6 dB lower than before.
 *
 * Restraint rules (checked in dev by useFilmSoundCues):
 *   - ≤ 6 cues per shot (in practice ≤ 4), accents only on the beats that carry the message;
 *   - nothing before CUT_GUARD_S — the first 250 ms belong to the cut/whoosh;
 *   - gains well under 1 (voices are pre-calibrated to −12 dBFS peak).
 * The picture-cut thump/whoosh and the iris-out impact live in FilmControls.
 */

type SceneFile = (typeof ACTS)[number]['scenes'][number]['file']

export interface Cue {
  /** shot-local seconds */
  at: number
  sfx: SfxName
  gain?: number
  pitch?: number
  pan?: number
  /** [count, interval s] — a short scheduled burst (e.g. typing) counted as one cue */
  repeat?: readonly [number, number]
}

export const CUT_GUARD_S = 0.25
export const MAX_CUES_PER_SHOT = 6

/**
 * Percussive accents that may snap to the score's 16th grid (≤ 60 ms, garage section only —
 * see quantizeToGrid). Lead-ins (riser, whoosh, scan) keep their authored time.
 */
export const QUANTIZE: ReadonlySet<SfxName> = new Set<SfxName>(['impact', 'crack', 'lock', 'seal', 'chime', 'pulse', 'glitch', 'reject', 'boot', 'cut', 'confirm'])

// Chime pitch ratios against its C6 root.
const G5 = 0.749
const A5 = 0.841

export const SOUND_CUES: Partial<Record<SceneFile, readonly Cue[]>> = {
  // Boot: power-on line → SYSTEM READY (the POST ticks / memory count are gone — too busy).
  '05-bios-boot.html': [
    { at: 0.3, sfx: 'boot', gain: 0.7 }, // CRT line at full height (0.32)
    { at: 3.76, sfx: 'lock', gain: 0.6 }, // SYSTEM READY + white flash
  ],
  // Era stream: riser into the headline, the stream stops.
  '42-era-shift.html': [
    { at: 4.37, sfx: 'riser', gain: 0.4 }, // → headline resolves 4.92–5.74
    { at: 4.95, sfx: 'pulse', gain: 0.4 },
    { at: 6.51, sfx: 'cut', gain: 0.3, pitch: 1.3 }, // last (33rd) photo cut — the stream stops
  ],
  // DX → AX: AX ignition, line 2.
  '33-ax-era.html': [
    { at: 2.7, sfx: 'pulse', gain: 0.5 }, // AX ignites
    { at: 5.4, sfx: 'chime', gain: 0.3 }, // "이제 제조업의 경쟁력은"
  ],
  // Gap: the caliper locks on, widest gap.
  '28-gap-reality.html': [
    { at: 1.86, sfx: 'lock', gain: 0.35, pitch: 0.8 }, // caliper + GAP label
    { at: 8.06, sfx: 'reject', gain: 0.35 }, // widest gap
  ],
  // Lost in translation: garbling, decode → "소통의" answer.
  '29-lost-in-translation.html': [
    { at: 4.5, sfx: 'glitch', gain: 0.22 }, // head garbles word 2
    { at: 6.5, sfx: 'glitch', gain: 0.25, pitch: 0.9 }, // word 4
    { at: 8.4, sfx: 'riser', gain: 0.35 }, // DECODING → answer
    { at: 8.95, sfx: 'chime', gain: 0.4 }, // "소통의" gold reveal
  ],
  // Perspectives: rack focus FIELD→DEV, label switch.
  '41-perspectives.html': [
    { at: 8.36, sfx: 'whoosh', gain: 0.35, pitch: 0.7 }, // rack focus 8.36–11.0
    { at: 9.68, sfx: 'lock', gain: 0.4 }, // "개발자 관점"
  ],
  // Collision: charge → IMPACT (4.8) → drift apart.
  '30-collision.html': [
    { at: 4.25, sfx: 'riser', gain: 0.45 }, // armies charge 2.88–4.8
    { at: 4.8, sfx: 'impact', gain: 0.7 },
    { at: 4.82, sfx: 'glitch', gain: 0.4 }, // glyphs shatter
    { at: 7.92, sfx: 'whoosh', gain: 0.25, pitch: 0.6 }, // DRIFT APART
  ],
  // Cost cascade: rupture, three branches slam into their cost labels.
  '31-cost-cascade.html': [
    { at: 2.32, sfx: 'crack', gain: 0.8 }, // rupture
    { at: 3.08, sfx: 'crack', gain: 0.3, pitch: 1.25, pan: -0.4 }, // 일정 지연
    { at: 3.27, sfx: 'crack', gain: 0.28, pitch: 1.4, pan: 0.4 }, // 현장 불만족
    { at: 3.61, sfx: 'crack', gain: 0.3, pitch: 1.1, pan: 0.1 }, // 기능 미스매치
  ],
  // Connector: filament reaches across → link (5.6).
  '32-the-connector.html': [
    { at: 5.05, sfx: 'riser', gain: 0.35 },
    { at: 5.6, sfx: 'chime', gain: 0.5 }, // link connects
  ],
  // ∞ bridge (canvas pulse; its text is CSS on mount time, so cue the canvas beat).
  '36-bridge-experts.html': [
    { at: 1.65, sfx: 'chime', gain: 0.35, pitch: G5 }, // node pulse peak
  ],
  // Work Radar: gate opens for the human decision, cost-cap kill, gate 2.
  'x-work-radar-rails.html': [
    { at: 3.2, sfx: 'lock', gain: 0.4 }, // gate 1 opens
    { at: 4.55, sfx: 'glitch', gain: 0.3 }, // job hits the cost cap
    { at: 4.57, sfx: 'reject', gain: 0.4 }, // kill
    { at: 6.45, sfx: 'lock', gain: 0.3, pitch: 1.12 }, // gate 2 opens
  ],
  // KIP: evidence threads lock their locators (typing / beam / answer blips dropped).
  'x-kip-evidence.html': [
    { at: 5.9, sfx: 'lock', gain: 0.35 }, // thread A locks its locator
    { at: 6.28, sfx: 'lock', gain: 0.25, pitch: 1.12 }, // thread B
  ],
  // Cross-domain: gold lens builds → full intersection.
  '37-cross-domain.html': [
    { at: 4.55, sfx: 'riser', gain: 0.35 },
    { at: 5.1, sfx: 'chime', gain: 0.45, pitch: A5 }, // full intersection
  ],
  // Smart factory: the scan sweep only (panel beeps / counter dropped).
  'x-smart-factory.html': [
    { at: 0.8, sfx: 'scan', gain: 0.3 }, // sweep 0.8–3.4
  ],
  // Excel → DB: sheets spiral in, −451 min/day stamp.
  'x-excel-to-db.html': [
    { at: 1.5, sfx: 'whoosh', gain: 0.3, pitch: 0.8 }, // spiral 1.5–4.8
    { at: 7.0, sfx: 'seal', gain: 0.5 }, // dial/counter reaches 451
  ],
  // MES: missing-vendor flicker, in-house stamp, line powers on.
  'x-mes-line.html': [
    { at: 0.3, sfx: 'glitch', gain: 0.2 }, // ledger row flickers 0.25–1.85
    { at: 1.85, sfx: 'seal', gain: 0.5 }, // "build in-house" stamp
    { at: 2.05, sfx: 'boot', gain: 0.35, pitch: 0.85 }, // power-on / first station
  ],
  // Ending: line 1, line 2, catchphrase whole, warp open (under the score's fade-out).
  '38-ending-catchphrase.html': [
    { at: 0.6, sfx: 'chime', gain: 0.35, pitch: G5 }, // "제조와 IT를 잇는 사람,"
    { at: 3.45, sfx: 'chime', gain: 0.4 }, // "미래를 만드는 사람."
    { at: 5.0, sfx: 'confirm', gain: 0.3 }, // catchphrase settled
    { at: 8.7, sfx: 'whoosh', gain: 0.3, pitch: 0.55 }, // warp open 8.7–11.3
  ],
}
