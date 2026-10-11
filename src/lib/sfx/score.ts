/**
 * Film score — the background music bed for /film, as data.
 *
 * The score is ONE pre-edited audio file whose timeline IS the film timeline:
 * file position (s) === filmT (s). Playback (music.ts) just keeps the element's
 * currentTime locked to the master clock, so pause / rewind / resume are seeks.
 *
 * The edit (baked into the file — re-render with the recipe below if the film is re-cut):
 *   0.00 – 82.5 s  "Tension Documentary" (AtlasAudio) from 0 s, −2.5 dB;
 *                  fades out from 80.0 s (τ 0.55 s) under the collision → cost turn.
 *   81.54 – 172.5 s "Light Atmosphere Garage" (soundoffreedom) from track 87.126 s
 *                  (breakdown downbeat, bar 32 @ 130.35 BPM) — lands on the cost cut
 *                  (81.7 s) and builds through connector/bridge at +6 dB (−10 dB base);
 *                  its drop (track 116.586 s) lands exactly on the Work Radar cut
 *                  (111.0 s) = the evidence inserts; fades out 164.0 → 172.5 s (iris-out).
 *   Both tracks share a D-minor / F-major centre, so the hand-over doesn't clash.
 *   Loudness: ≈ −18.5 dBFS RMS in full sections, breakdown −25…−20, peak −2.5 dBFS.
 * Licenses and sources: public/audio/LICENSES.md.
 */

export interface FilmScore {
  /** same-origin URL (MediaElementSource needs same-origin or CORS) */
  src: string
  /** file length (s) — equals FILM_TOTAL_MS / 1000 */
  duration: number
  /** linear level into the music bus (pre-master) */
  level: number
  /**
   * Beat grid used to quantize SFX accents (film s). Only where the music has a
   * steady pulse: the garage section. Outside [from, to) accents stay as authored.
   */
  grid: { from: number; to: number; bpm: number; downbeat: number }
}

export const FILM_SCORE: FilmScore = {
  src: '/audio/film-score.mp3',
  duration: 172.5,
  level: 1.12,
  grid: { from: 81.54, to: 164, bpm: 130.35, downbeat: 81.54 },
}

/** Max distance (s) an SFX accent may move to land on the 16th grid. */
export const QUANTIZE_WINDOW_S = 0.06

/**
 * Snap a film time (s) to the nearest 16th of the score's grid when that is within
 * QUANTIZE_WINDOW_S; otherwise (or outside the grid) return it unchanged.
 */
export function quantizeToGrid(t: number, score: FilmScore = FILM_SCORE): number {
  const g = score.grid
  if (t < g.from || t >= g.to) return t
  const step = 60 / g.bpm / 4
  const q = g.downbeat + Math.round((t - g.downbeat) / step) * step
  return Math.abs(q - t) <= QUANTIZE_WINDOW_S ? q : t
}
