/**
 * Film score — the background music bed for /film, as data.
 *
 * The score is ONE pre-edited audio file whose timeline IS the film timeline:
 * file position (s) === filmT (s). Playback (music.ts) just keeps the element's
 * currentTime locked to the master clock, so pause / rewind / resume are seeks.
 *
 * Active edit (baked into the file — re-render with .omc/score/cands/reflected.json +
 * .omc/score/v3/edit.mjs if the film is re-cut): "Reflected Light" (SergePavkinMusic), one track,
 * phrase-aligned (13.713 s phrases = 4 × 3.428 s units, phrase grid 0.043 + 13.713k in the track),
 * every splice on a phrase downbeat (20 ms lead-in, 0.35 s equal-power tail):
 *   film −4.56 → 36.58  track A-section phrases 0–2 (soft intro; enters 0 → 2.5 s fade-in)
 *   film 36.58 → 64.01  track break phrases (109.75 →) — still calm, new colour under the problem acts
 *   film 64.01 → 105.15 track A phrases 1–3 again (13.756 →), the third leads naturally into …
 *   film 105.15 → 160.0 track B main section (54.896 →): the lift under connector→bridge, then the
 *                       3D career montage, gently building
 *   film 160.0 → 187.43 track D climax (137.18 →): peaks under cross-domain + the AI inserts
 *   film 187.43 → 198   track E outro (192.03 →), fade-out 193.5 → 198 under the iris-out
 * Mix (file, dBFS RMS by section): −23 boot/era (6 kHz low-pass, opening to 11 kHz by 52 s),
 * −22.6 problem acts, −21.8 lift, −22.2 → −21.6 montage → climax; peak −2 dBFS. Through
 * FILM_SCORE.level 1.0 and the engine master (0.7) that measures ≈ −26.5 (0–111 s), −26 (montage),
 * −24.8 (climax) dBFS RMS at the output (dev tap, .omc/score/v3/qa-analyze.mjs).
 * The track centres on E minor; SFX chimes/beeps are tuned to C/G in the sprite and shifted
 * by `tune` (+4 → E/B) so they sit in the key.
 * Alternates with full previews in .omc/score/candidate-{1,3}.mp3 (recipes in .omc/score/cands/):
 *   1 "Light Atmosphere Garage" (soundoffreedom), tune 0 · 3 "Cinematic Ambient Background Music"
 *   (DayNigthMorning), tune 0. To switch, copy cands/<name>.mp3 here, set `tune`, update LICENSES.md.
 * Licenses and sources: public/audio/LICENSES.md.
 */

export interface FilmScore {
  /** same-origin URL (MediaElementSource needs same-origin or CORS) */
  src: string
  /** file length (s) — equals FILM_TOTAL_MS / 1000 */
  duration: number
  /** linear level into the music bus (pre-master) */
  level: number
  /** semitones applied to tonal SFX so they sit in the score's key (sprite is tuned to C/G) */
  tune: number
}

export const FILM_SCORE: FilmScore = {
  src: '/audio/film-score.mp3',
  duration: 198,
  level: 1.0,
  tune: 4,
}
