import type { SfxName } from '@/lib/sfx'
import { ACTS } from './acts'

/**
 * soundCues — the film's declarative cue sheet, one entry per animation event.
 *
 * Every time is the SHOT-LOCAL second of the visual event the sound must land on (its HIT:
 * a whoosh's crest, a riser's top, a click's transient). Scenes read the same master clock
 * (SceneClock = filmT − shot.start), so `at` lines up 1:1 with the picture; the scheduler
 * starts lead-in sounds early (engine LEAD_MAX) so the hit lands on `at` (±40 ms target).
 * Event times come from each scene's own timeline constants (noted per cue; see the scene's
 * data.ts / runtime.ts / Scene.tsx). Nothing here depends on locale: where KO/EN differ
 * (29: the gold word), the cue follows the locale-independent beat (the gold base layer).
 *
 * Grammar (one palette, sprite public/audio/sfx/film-sfx.mp3 — see LICENSES.md):
 *   type/tick      text type-on, labels, log rows, small HUD steps   (rate-matched, quiet)
 *   count          counters rolling — a rising tick run ending in `confirm` on the landing
 *   pop            nodes / panels / blocks appearing                  (pitch steps per element)
 *   data / scan    continuous data motion (grouped into one texture) / scan sweeps
 *   swish / whoosh panel slides, small moves / camera moves, rack focus, warp
 *   riser          builds into a reveal (its top = `at`)
 *   glitch, crack, impact, thud    garble / rupture / collision / landings & payoff weight
 *   lock / reject / seal           gates, locks / kill, block / stamps
 *   chime / chime2 / confirm       resolutions (chimes follow the score's key — score.ts tune)
 * Loudness: calm acts (boot → cost) sit low; the 3D montage + cross-domain carry the bigger
 * accents (payoffs: 0%대, +24%, −451, kill, gate, Recall 1.0000), still under the −12 dBFS
 * voice ceiling. Picture cuts are generated from the schedule (CUT_CUES), not listed per shot.
 */

type SceneFile = (typeof ACTS)[number]['scenes'][number]['file']

export interface Cue {
  /** shot-local seconds of the hit — or a list of hits (one cue, e.g. a typing run) */
  at: number | readonly number[]
  sfx: SfxName
  gain?: number
  pitch?: number
  /** pitch multiplier applied per element of a list / repeat (rising counter etc.) */
  step?: number
  pan?: number
  /** [count, interval s] — a short evenly spaced burst counted as one cue */
  repeat?: readonly [number, number]
}

export const CUT_GUARD_S = 0.25
/** Cue entries per shot (a list/repeat counts once). */
export const MAX_CUES_PER_SHOT = 12

/**
 * 05-bios-boot runs on its own timer chain from mount (not the film clock — src/scenes is
 * read-only here). It mounts (lazily) with the film, so its t=0 trails filmT=0 — measured +0.25 s on
 * a cold dev load (.omc/score/v3/qa.mjs probes its READY line); production loads it faster.
 */
export const BOOT_OFFSET_S = 0.2

const b = (t: number) => +(t + BOOT_OFFSET_S).toFixed(3)

export const SOUND_CUES: Partial<Record<SceneFile, readonly Cue[]>> = {
  // Boot — Scene.tsx timer chain: CRT line 0.315, logo lines 0.28+0.06k, POST lines 0.67+0.185k,
  // memory counter 1.225→1.907 (32 steps, slowing), [OK] lines 2.107+0.185k, 100 % 3.402, READY 3.762.
  '05-bios-boot.html': [
    // Boot stays near-silent (owner: the POST screen should be quiet): one low power-on hum
    // and a soft confirm on READY — no typing / ticks / counter / beeps.
    { at: b(0.3), sfx: 'boot', gain: 0.28 },
    { at: b(3.762), sfx: 'beep', gain: 0.14, pitch: 0.55 },
  ],
  // Era stream — 33 photo cuts at 6.56·(1−0.93^k)/(1−0.93^33): the first 14 tick like a shutter,
  // the accelerating rest becomes one data texture; headline resolves 4.92–5.74; last cut 6.51.
  '42-era-shift.html': [
    { at: [0.505, 0.975, 1.412, 1.819, 2.197, 2.548, 2.875, 3.179, 3.462, 3.725, 3.969, 4.197, 4.408], sfx: 'tick', gain: 0.09, pitch: 0.62 },
    { at: 4.6, sfx: 'data', gain: 0.28 },
    { at: 5.3, sfx: 'riser', gain: 0.24 },
    { at: 5.33, sfx: 'chime2', gain: 0.24 },
    { at: 6.51, sfx: 'thud', gain: 0.22 },
  ],
  // DX → AX — word fades (smoothstep): DX 10 % ≈ 0.53, 를 ≈ 1.1; horizon sweep 2.25–4.05;
  // AX ignites (visible 3.23, peak 4.05); status 5.10/9.30; lines 5.40, 6.90; data rise 7.13,
  // light pulses 8.67, network drawn 8.97.
  '33-ax-era.html': [
    { at: [0.53, 1.1], sfx: 'pop', gain: 0.16 },
    { at: 2.25, sfx: 'scan', gain: 0.2 },
    { at: 3.23, sfx: 'pulse', gain: 0.32 },
    { at: 3.3, sfx: 'whoosh', gain: 0.2, pitch: 1.1 },
    { at: 4.05, sfx: 'chime', gain: 0.28 },
    { at: [5.1, 5.4, 6.9, 9.3], sfx: 'tick', gain: 0.17 },
    { at: 7.13, sfx: 'data', gain: 0.18 },
    { at: 8.67, sfx: 'pop', gain: 0.16, repeat: [3, 0.12] },
    { at: 8.97, sfx: 'chime2', gain: 0.18 },
  ],
  // Gap — gap opens 1.30; caliper + GAP label 1.859; headline 2 rises (50 % 4.94); widest 8.06.
  '28-gap-reality.html': [
    { at: 1.45, sfx: 'swish', gain: 0.18, pitch: 0.8 },
    { at: 1.86, sfx: 'lock', gain: 0.28, pitch: 0.89 },
    { at: 4.2, sfx: 'tick', gain: 0.18 },
    { at: 8.06, sfx: 'thud', gain: 0.26 },
  ],
  // Lost in translation — words fade in 0.3k; 3.00 TRANSLATING + scan head 3–8; garble peaks
  // 3+(i+.5) (words 1–4 at 4.5/5.5/6.5/7.5); 8.00 hard stop / DECODING; layers peel 8.00+0.81k;
  // gold base layer from 8.0 (KO gold word 8.945); 12.50 COMMUNICATION.
  '29-lost-in-translation.html': [
    { at: [0.3, 0.6, 0.9, 1.2], sfx: 'pop', gain: 0.14 },
    { at: 3.0, sfx: 'scan', gain: 0.18 },
    { at: [4.5, 5.5, 6.5, 7.5], sfx: 'glitch', gain: 0.2 },
    { at: 8.0, sfx: 'tick', gain: 0.3, pitch: 0.8 },
    { at: [8.77, 9.58, 10.39, 11.2], sfx: 'swish', gain: 0.12 },
    { at: 8.95, sfx: 'chime', gain: 0.3 },
    { at: 12.5, sfx: 'confirm', gain: 0.24 },
  ],
  // Perspectives — left panels fade in 2.068+1.144k, rack focus 8.36–11.0 (centre 9.68),
  // label refocus ≈ 10.07, right panels 11.308+1.144k.
  '41-perspectives.html': [
    { at: [2.17, 3.31, 4.46, 5.6, 6.74], sfx: 'pop', gain: 0.18 },
    { at: 9.68, sfx: 'whoosh', gain: 0.22, pitch: 0.8 },
    { at: 10.07, sfx: 'tick', gain: 0.16 },
    { at: [11.41, 12.55, 13.7, 14.84, 15.98], sfx: 'pop', gain: 0.18, pitch: 1.122 },
  ],
  // Collision — 2.88 CHARGE (counter 000→100) → 4.80 IMPACT (flash, shake, glyphs shatter);
  // 5.64 SCATTER; 7.92 DRIFT APART.
  '30-collision.html': [
    { at: 2.9, sfx: 'data', gain: 0.16 },
    { at: 4.8, sfx: 'riser', gain: 0.28 },
    { at: 4.8, sfx: 'impact', gain: 0.55 },
    { at: 4.83, sfx: 'glitch', gain: 0.24 },
    { at: 5.9, sfx: 'swish', gain: 0.18 },
    { at: 8.3, sfx: 'whoosh', gain: 0.18, pitch: 0.6 },
  ],
  // Cost cascade — charge 1.70 → rupture 2.32; labels slam 3.078 / 3.268 / 3.607; heal 7.22.
  '31-cost-cascade.html': [
    { at: 2.32, sfx: 'riser', gain: 0.22 },
    { at: 2.32, sfx: 'crack', gain: 0.6 },
    { at: 2.33, sfx: 'thud', gain: 0.32 },
    { at: 3.078, sfx: 'thud', gain: 0.24, pitch: 1.2, pan: -0.4 },
    { at: 3.268, sfx: 'thud', gain: 0.22, pitch: 1.35, pan: 0.4 },
    { at: 3.607, sfx: 'thud', gain: 0.24, pitch: 1.1, pan: 0.1 },
    { at: 7.9, sfx: 'whoosh', gain: 0.14, pitch: 0.7 },
  ],
  // Connector — strike draws (steepest 1.50); status 2.60; filament reach 2.6→5.48 link flash;
  // beads launch 7.14+0.794k; dissolve 10.8.
  '32-the-connector.html': [
    { at: 1.5, sfx: 'swish', gain: 0.14 },
    { at: 2.6, sfx: 'tick', gain: 0.2 },
    { at: 5.48, sfx: 'riser', gain: 0.28 },
    { at: 5.48, sfx: 'chime', gain: 0.4 },
    { at: [7.14, 7.9, 8.71, 9.52, 10.29], sfx: 'pop', gain: 0.15 },
    { at: 11.2, sfx: 'swish', gain: 0.12, pitch: 0.7 },
  ],
  // ∞ bridge — node pulse peak 1.65 (text is CSS, settled before the cut); chevrons meet 1.85;
  // loop reset 6.60 (new ring pops, wave restarts).
  '36-bridge-experts.html': [
    { at: 1.65, sfx: 'pop', gain: 0.16 },
    { at: 1.85, sfx: 'tick', gain: 0.14 },
    { at: 6.6, sfx: 'pulse', gain: 0.22 },
  ],
  // Smart factory — scan sweep 0.80–3.40; paper logs vanish 1.07–2.87; tablets 2.353;
  // barcode labels 2.64–3.15; panels pop 4.00 / 4.60 / 5.20; ERP modules 4.50 / 4.85 / 5.55;
  // panel counters roll 4.90–6.35.
  'x-smart-factory.html': [
    { at: 0.8, sfx: 'scan', gain: 0.3 },
    { at: 1.07, sfx: 'data', gain: 0.2 },
    { at: 2.353, sfx: 'beep', gain: 0.22 },
    { at: [2.64, 2.72, 2.81, 2.91, 3.04, 3.11], sfx: 'tick', gain: 0.14 },
    { at: [4.0, 4.6, 5.2], sfx: 'pop', gain: 0.3 },
    { at: [4.5, 4.85, 5.55], sfx: 'tick', gain: 0.12, pitch: 0.9 },
    { at: 6.35, sfx: 'thud', gain: 0.22 },
  ],
  // Vision reverse — scan 0–2.8 (columns light 0.30 / 0.64 / 1.03 / 1.55); LOCK 2.80 (red, NG);
  // push-in 2.8–3.6; tower alarm 3.324+0.523k; 45/45 at 4.38; cell lifts → ejected 6.40.
  'x-vision-reverse.html': [
    { at: 0.27, sfx: 'scan', gain: 0.24 },
    { at: [0.3, 0.64, 1.03, 1.55], sfx: 'tick', gain: 0.18 },
    { at: 2.8, sfx: 'lock', gain: 0.36, pitch: 0.84 },
    { at: 2.82, sfx: 'thud', gain: 0.22 },
    { at: [3.324, 3.847, 4.371, 4.894], sfx: 'beep', gain: 0.12, pitch: 0.89 },
    { at: 3.2, sfx: 'swish', gain: 0.18 },
    { at: 4.38, sfx: 'tick', gain: 0.16, pitch: 0.7 },
    { at: 6.4, sfx: 'whoosh', gain: 0.2, pitch: 0.9 },
  ],
  // Weld DOE — 11 DOE runs pop at 0.9+0.135k (+0.26 s scale peak); horn lifts 1.3–2.4; surface
  // fits 2.5–4.5; counter 15 % → 1 % (4.75…5.77) → "0%대" 6.08 (payoff); window ring 6.25.
  'x-weld-doe.html': [
    { at: [1.16, 1.7, 2.24], sfx: 'tick', gain: 0.11, pitch: 0.75 },
    { at: 1.8, sfx: 'swish', gain: 0.14 },
    { at: 3.5, sfx: 'scan', gain: 0.16 },
    { at: 6.08, sfx: 'thud', gain: 0.3 },
  ],
  // Line balance — jig and 2nd lane track the C/T roll (Neck 1.6–2.9, FT 3.3–4.6).
  // Seat thuds land with −24% / −49%. Plane 4.7–5.5; +24% counts 5.41…6.27.
  'x-lob-balance.html': [
    { at: 1.2, sfx: 'swish', gain: 0.16 },
    { at: 2.8, sfx: 'thud', gain: 0.3 },
    { at: 3.35, sfx: 'swish', gain: 0.12, pitch: 1.08 },
    { at: 4.45, sfx: 'thud', gain: 0.28, pitch: 1.08 },
    { at: 5.0, sfx: 'whoosh', gain: 0.18, pitch: 0.85 },
    { at: 6.27, sfx: 'thud', gain: 0.26 },
  ],
  // Excel → DB — 360 sheets launch 1.5 (spiral), land 2.95–4.8 (densest 3.5–4.2); validation sweep
  // 4.15–5.26; panels unfold 5.0 / 5.22 / 5.44; dial 5.55 → 451 at 6.85 (−451 min/day payoff).
  'x-excel-to-db.html': [
    { at: 2.2, sfx: 'whoosh', gain: 0.26, pitch: 0.8 },
    { at: 3.3, sfx: 'data', gain: 0.22 },
    { at: 4.15, sfx: 'scan', gain: 0.2 },
    { at: [5.0, 5.22, 5.44], sfx: 'pop', gain: 0.16 },
    { at: 6.85, sfx: 'seal', gain: 0.28 },
  ],
  // S/N trace — defect pulse 0.35–1.0; fog 1.5–2.3, "?" box 1.7; trace-back hops 3.35 / 3.71 / 4.07 →
  // LOT found 4.43; forward wave 4.55 / 4.97 / 5.39 / 5.81; gate blocks 6.15; award 6.60.
  'x-sn-trace.html': [
    { at: 0.4, sfx: 'beep', gain: 0.2, pitch: 0.84 },
    { at: 0.42, sfx: 'pulse', gain: 0.26 },
    { at: 1.9, sfx: 'whoosh', gain: 0.14, pitch: 0.6 },
    { at: 1.7, sfx: 'tick', gain: 0.15 },
    { at: [3.35, 3.71, 4.07], sfx: 'pop', gain: 0.22 },
    { at: 4.43, sfx: 'lock', gain: 0.3 },
    { at: [4.55, 4.97, 5.39, 5.81], sfx: 'pop', gain: 0.15, pitch: 1.26 },
    { at: 6.15, sfx: 'reject', gain: 0.36 },
    { at: 6.16, sfx: 'thud', gain: 0.28 },
    { at: 6.6, sfx: 'chime', gain: 0.3 },
  ],
  // MES — "missing" flickers 0.25–1.85; stamp 1.85; power-on 1.95, stations light 2.05+0.15k;
  // stack chips 2.90…5.30; holograms unfold 4.5–5.4; headline 5.7.
  'x-mes-line.html': [
    { at: [0.3, 1.2], sfx: 'glitch', gain: 0.12 },
    { at: 1.85, sfx: 'seal', gain: 0.42 },
    { at: 1.95, sfx: 'boot', gain: 0.26, pitch: 0.85 },
    { at: [2.05, 2.2, 2.35, 2.5, 2.65, 2.8], sfx: 'tick', gain: 0.14 },
    { at: [2.9, 3.9, 4.9, 5.3], sfx: 'pop', gain: 0.12 },
    { at: 4.95, sfx: 'whoosh', gain: 0.16, pitch: 1.05 },
    { at: 5.8, sfx: 'thud', gain: 0.2 },
  ],
  // Cross-domain — membrane sparks 0.68 / 1.59 / 2.50 / 3.42; rings touch 1.98; tag 2.25;
  // convergence settles ≈ 4.95 (full intersection 5.10); lens bloom 8.32.
  '37-cross-domain.html': [
    { at: [0.68, 1.59, 2.5, 3.42], sfx: 'tick', gain: 0.1, pitch: 1.2 },
    { at: 1.98, sfx: 'pulse', gain: 0.3 },
    { at: 2.25, sfx: 'pop', gain: 0.2 },
    { at: 4.95, sfx: 'riser', gain: 0.3 },
    { at: 4.95, sfx: 'chime', gain: 0.44 },
    { at: 4.96, sfx: 'thud', gain: 0.3 },
    { at: 8.32, sfx: 'chime2', gain: 0.15 },
  ],
  // Work Radar — token D lifts 0.9; rails light; jobs lift 1.5 / 2.0; log rows 3.10 / 4.60 / 5.00 /
  // 6.80; gate 1 opens 3.20–3.50; cost-cap kill 4.55 (flash peak 4.57); gate 2 opens 6.45–6.75.
  'x-work-radar-rails.html': [
    { at: [0.9, 1.5, 2.0], sfx: 'pop', gain: 0.17 },
    { at: 1.2, sfx: 'swish', gain: 0.12 },
    { at: [3.1, 3.14, 3.18, 4.6, 4.64, 4.68, 5.0, 5.04, 5.08, 6.8, 6.84, 6.88], sfx: 'type', gain: 0.14 },
    { at: 3.35, sfx: 'lock', gain: 0.36 },
    { at: 4.55, sfx: 'glitch', gain: 0.24 },
    { at: 4.57, sfx: 'reject', gain: 0.38 },
    { at: 4.57, sfx: 'thud', gain: 0.3 },
    { at: 6.6, sfx: 'lock', gain: 0.32, pitch: 1.12 },
  ],
  // KIP — query typed 0.25–1.15 (8 audible keystrokes); beam 1.60–3.0; hits reach A/B/C 3.10 / 3.22 /
  // 3.34; tables pop 3.2–4.9; answer card 4.2; claims 4.65 / 4.87 / 5.09; threads lock 5.90 / 6.28 /
  // 6.66; Recall@10 rolls 5.80 → 1.0000 at 6.70.
  'x-kip-evidence.html': [
    { at: [0.291, 0.373, 0.536, 0.618, 0.782, 0.864, 1.027, 1.109], sfx: 'type', gain: 0.2 },
    { at: 2.0, sfx: 'whoosh', gain: 0.2, pitch: 1.1 },
    { at: [3.1, 3.22, 3.34], sfx: 'pop', gain: 0.2 },
    { at: 3.4, sfx: 'data', gain: 0.16 },
    { at: 4.6, sfx: 'swish', gain: 0.14 },
    { at: [4.65, 4.87, 5.09], sfx: 'tick', gain: 0.15 },
    { at: [5.9, 6.28, 6.66], sfx: 'lock', gain: 0.24 },
    { at: 6.7, sfx: 'tick', gain: 0.14, pitch: 0.8 },
  ],
  // Ending — line 1 reads ≈ 1.0–1.2 (0.50–1.90), status 3.20 / 6.00, line 2 reads ≈ 4.0–4.2
  // (3.40–5.00); warp opens 8.7–11.3 (half 10.0). The iris-out impact lives in FilmControls.
  '38-ending-catchphrase.html': [
    { at: 1.05, sfx: 'chime2', gain: 0.3 },
    { at: [3.2, 6.0], sfx: 'tick', gain: 0.12 },
    { at: 4.05, sfx: 'chime', gain: 0.36 },
    { at: 10.0, sfx: 'whoosh', gain: 0.3, pitch: 0.55 },
    { at: 11.3, sfx: 'riser', gain: 0.18 },
  ],
}

/**
 * Picture cuts (shot-local 0 of every shot after the first): a swish whose crest lands on the
 * cut + a soft low thump on act changes; montage cuts inside an act get a lighter thump only.
 */
export const CUT_CUES = {
  act: [
    { at: 0, sfx: 'swish', gain: 0.2 },
    { at: 0, sfx: 'cut', gain: 0.22 },
  ],
  scene: [{ at: 0, sfx: 'cut', gain: 0.14, pitch: 1.1 }],
} as const satisfies Record<string, readonly Cue[]>
