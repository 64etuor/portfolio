import type { DroneTone, SfxName } from '@/lib/sfx'
import { ACTS } from './acts'

/**
 * soundCues — the film's declarative cue sheet.
 *
 * Every time is SHOT-LOCAL seconds: scenes read the same master clock
 * (SceneClock = filmT − shot.start), so `at` lines up 1:1 with the picture.
 * Beat times come from each scene's own timeline constants (noted per cue).
 *
 * Restraint rules (checked in dev by useFilmSoundCues):
 *   - ≤ 6 cues per shot, accents only on the beats that carry the message;
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

// Chime pitch ratios against its C6 root.
const G5 = 0.749
const A5 = 0.841

export const SOUND_CUES: Partial<Record<SceneFile, readonly Cue[]>> = {
  // Boot: power-on line → POST → memory count lands → SYSTEM READY.
  '05-bios-boot.html': [
    { at: 0.3, sfx: 'boot', gain: 0.8 }, // CRT line at full height (0.32)
    { at: 0.855, sfx: 'tick', gain: 0.35 }, // POST "CMOS" line
    { at: 1.91, sfx: 'count', gain: 0.45, pitch: 1.2 }, // memory counter hits 2048 MB
    { at: 3.76, sfx: 'lock', gain: 0.75 }, // SYSTEM READY + white flash
  ],
  // Era stream: two early photo cuts set the pulse, riser into the headline, last cut.
  '42-era-shift.html': [
    { at: 0.505, sfx: 'tick', gain: 0.3 }, // cut 1
    { at: 0.975, sfx: 'tick', gain: 0.3, pitch: 1.06 }, // cut 2
    { at: 4.37, sfx: 'riser', gain: 0.55 }, // → headline resolves 4.92–5.74
    { at: 4.95, sfx: 'pulse', gain: 0.5 },
    { at: 6.51, sfx: 'cut', gain: 0.4, pitch: 1.3 }, // last (33rd) photo cut — the stream stops
  ],
  // DX → AX: underline sweep, AX ignition, line 2, knowledge network pulses.
  '33-ax-era.html': [
    { at: 2.25, sfx: 'scan', gain: 0.45 }, // underline/horizon sweep 2.25–4.05
    { at: 2.7, sfx: 'pulse', gain: 0.6 }, // AX ignites
    { at: 5.4, sfx: 'chime', gain: 0.4 }, // "이제 제조업의 경쟁력은"
    { at: 6.9, sfx: 'tick', gain: 0.3 }, // "데이터와 지식에서 시작됩니다"
    { at: 8.66, sfx: 'beep', gain: 0.3 }, // network light pulses start
  ],
  // Gap: it opens, the caliper locks on, "but many fail", widest gap.
  '28-gap-reality.html': [
    { at: 1.3, sfx: 'scan', gain: 0.35, pitch: 0.6 }, // gap starts opening
    { at: 1.86, sfx: 'lock', gain: 0.45, pitch: 0.8 }, // caliper + GAP label
    { at: 3.9, sfx: 'pulse', gain: 0.5 }, // s2 "많은 기업이 실패…"
    { at: 8.06, sfx: 'reject', gain: 0.45 }, // widest gap
  ],
  // Lost in translation: translation head, garbling, decode → "소통의" answer.
  '29-lost-in-translation.html': [
    { at: 3.0, sfx: 'scan', gain: 0.4, pitch: 0.7 }, // TRANSLATING sweep 3–8
    { at: 4.5, sfx: 'glitch', gain: 0.3 }, // head garbles word 2
    { at: 6.5, sfx: 'glitch', gain: 0.35, pitch: 0.9 }, // word 4
    { at: 8.4, sfx: 'riser', gain: 0.5 }, // DECODING → answer
    { at: 8.95, sfx: 'chime', gain: 0.5 }, // "소통의" gold reveal
    { at: 12.5, sfx: 'confirm', gain: 0.35 }, // status COMMUNICATION
  ],
  // Perspectives: first field panel, rack focus FIELD→DEV, label switch, first dev panel.
  '41-perspectives.html': [
    { at: 2.64, sfx: 'beep', gain: 0.3, pitch: 0.9 }, // first field panel
    { at: 8.36, sfx: 'whoosh', gain: 0.45, pitch: 0.7 }, // rack focus 8.36–11.0
    { at: 9.68, sfx: 'lock', gain: 0.5 }, // "개발자 관점"
    { at: 11.88, sfx: 'beep', gain: 0.3, pitch: 1.2 }, // first dev panel
  ],
  // Collision: charge → IMPACT (4.8) → drift apart.
  '30-collision.html': [
    { at: 4.25, sfx: 'riser', gain: 0.6 }, // armies charge 2.88–4.8
    { at: 4.8, sfx: 'impact', gain: 0.7 },
    { at: 4.82, sfx: 'glitch', gain: 0.55 }, // glyphs shatter
    { at: 7.92, sfx: 'whoosh', gain: 0.3, pitch: 0.6 }, // DRIFT APART
  ],
  // Cost cascade: charge, rupture, three branches slam into their cost labels.
  '31-cost-cascade.html': [
    { at: 1.7, sfx: 'pulse', gain: 0.5 }, // origin charges red
    { at: 2.32, sfx: 'crack', gain: 0.9 }, // rupture
    { at: 3.08, sfx: 'crack', gain: 0.45, pitch: 1.25, pan: -0.4 }, // 일정 지연
    { at: 3.27, sfx: 'crack', gain: 0.4, pitch: 1.4, pan: 0.4 }, // 현장 불만족
    { at: 3.61, sfx: 'crack', gain: 0.45, pitch: 1.1, pan: 0.1 }, // 기능 미스매치
    { at: 7.22, sfx: 'scan', gain: 0.25, pitch: 0.55 }, // heal
  ],
  // Connector: filament reaches across → link (5.6) → secondary links.
  '32-the-connector.html': [
    { at: 2.6, sfx: 'scan', gain: 0.3, pitch: 0.8 }, // filament starts
    { at: 5.05, sfx: 'riser', gain: 0.5 },
    { at: 5.6, sfx: 'chime', gain: 0.6 }, // link connects
    { at: 6.38, sfx: 'tick', gain: 0.25 }, // secondary links
    { at: 6.67, sfx: 'tick', gain: 0.25, pitch: 1.12 },
  ],
  // ∞ bridge (canvas pulse; its text is CSS on mount time, so cue the canvas beats).
  '36-bridge-experts.html': [
    { at: 1.65, sfx: 'chime', gain: 0.45, pitch: G5 }, // node pulse peak
    { at: 1.65, sfx: 'pulse', gain: 0.4 },
    { at: 6.6, sfx: 'chime', gain: 0.35 }, // second brightness wave
  ],
  // Work Radar: rails, gate opens for the human decision, cost-cap kill, proposal, gate 2.
  'x-work-radar-rails.html': [
    { at: 0.9, sfx: 'tick', gain: 0.3 }, // decision rail lights
    { at: 3.2, sfx: 'lock', gain: 0.5 }, // gate 1 opens
    { at: 4.55, sfx: 'glitch', gain: 0.4 }, // job hits the cost cap
    { at: 4.57, sfx: 'reject', gain: 0.55 }, // kill
    { at: 5.25, sfx: 'beep', gain: 0.35 }, // becomes proposal-only
    { at: 6.45, sfx: 'lock', gain: 0.4, pitch: 1.12 }, // gate 2 opens
  ],
  // KIP: query typed, beam into the library, answer card, evidence locks, metrics land.
  'x-kip-evidence.html': [
    { at: 0.3, sfx: 'type', gain: 0.35, repeat: [8, 0.11] }, // typing 0.25–1.15
    { at: 1.6, sfx: 'scan', gain: 0.35 }, // beam 1.6–3.0
    { at: 4.2, sfx: 'beep', gain: 0.3 }, // answer card
    { at: 5.9, sfx: 'lock', gain: 0.45 }, // thread A locks its locator
    { at: 6.28, sfx: 'lock', gain: 0.35, pitch: 1.12 }, // thread B
    { at: 6.7, sfx: 'count', gain: 0.4, pitch: 1.3 }, // Recall@10 1.0000
  ],
  // Cross-domain: rings converge, gold lens, full intersection.
  '37-cross-domain.html': [
    { at: 1.2, sfx: 'scan', gain: 0.3, pitch: 0.6 }, // convergence begins
    { at: 1.97, sfx: 'beep', gain: 0.3, pitch: 1.12 }, // gold lens appears
    { at: 4.55, sfx: 'riser', gain: 0.45 },
    { at: 5.1, sfx: 'chime', gain: 0.55, pitch: A5 }, // full intersection
    { at: 5.1, sfx: 'pulse', gain: 0.4 },
  ],
  // Smart factory: scan sweep, ERP/barcode/tablet panels, counters land.
  'x-smart-factory.html': [
    { at: 0.8, sfx: 'scan', gain: 0.5 }, // sweep 0.8–3.4
    { at: 4.0, sfx: 'beep', gain: 0.35 }, // ERP
    { at: 4.6, sfx: 'beep', gain: 0.35, pitch: 1.12 }, // barcode
    { at: 5.2, sfx: 'beep', gain: 0.35, pitch: 1.26 }, // tablet
    { at: 6.35, sfx: 'count', gain: 0.4, pitch: 1.2 }, // barcode counts final
  ],
  // Excel → DB: sheets spiral in, validation sweep, dashboard, −451 min/day stamp.
  'x-excel-to-db.html': [
    { at: 1.5, sfx: 'whoosh', gain: 0.35, pitch: 0.8 }, // spiral 1.5–4.8
    { at: 4.15, sfx: 'scan', gain: 0.4, pitch: 1.2 }, // validation sweep
    { at: 5.0, sfx: 'beep', gain: 0.3 }, // dashboard
    { at: 7.0, sfx: 'seal', gain: 0.6 }, // dial/counter reaches 451
  ],
  // MES: missing-vendor flicker, in-house stamp, line powers on, backend, headline.
  'x-mes-line.html': [
    { at: 0.3, sfx: 'glitch', gain: 0.3 }, // ledger row flickers 0.25–1.85
    { at: 1.1, sfx: 'glitch', gain: 0.25, pitch: 1.2 },
    { at: 1.85, sfx: 'seal', gain: 0.6 }, // "build in-house" stamp
    { at: 2.05, sfx: 'boot', gain: 0.5, pitch: 0.85 }, // power-on / first station
    { at: 3.5, sfx: 'beep', gain: 0.3 }, // PostgreSQL core
    { at: 5.7, sfx: 'confirm', gain: 0.35 }, // "MES built in-house"
  ],
  // Ending: line 1, line 2, catchphrase whole, warp open.
  '38-ending-catchphrase.html': [
    { at: 0.6, sfx: 'chime', gain: 0.4, pitch: G5 }, // "제조와 IT를 잇는 사람,"
    { at: 3.45, sfx: 'chime', gain: 0.5 }, // "미래를 만드는 사람."
    { at: 5.0, sfx: 'confirm', gain: 0.35 }, // catchphrase settled
    { at: 8.7, sfx: 'whoosh', gain: 0.4, pitch: 0.55 }, // warp open 8.7–11.3
  ],
}

export interface ActDrone {
  tone: DroneTone
  /** act-local s (from the act's first frame) before which the bed stays silent */
  from?: number
  /** act-local s after which the bed fades out */
  until?: number
}

/** Drone bed per act id (acts.ts). Absent = silent. */
export const ACT_DRONE: Record<string, ActDrone> = {
  's0-boot': { tone: 'bed', from: 3.9 }, // silence → bed after SYSTEM READY
  's1-era': { tone: 'bed' },
  's1b-ax': { tone: 'bed' },
  's2-reality': { tone: 'tense' },
  's3-problem': { tone: 'tense' },
  's4-perspectives': { tone: 'tense' },
  's6-collision': { tone: 'tense' },
  's7-cost': { tone: 'tense' },
  's8-insight': { tone: 'bright' },
  's9-bridge': { tone: 'bright' },
  's10-crossdomain': { tone: 'bright' },
  ending: { tone: 'resolve', until: 10.5 }, // resolves, then fades as the text dissolves
}
