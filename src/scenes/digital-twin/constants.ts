/**
 * Digital Twin — static constants.
 * Pure data with no Three.js or React dependencies.
 * Extracted from Scene.tsx to reduce file size.
 */

/** Station ground positions as [x, z] pairs (Y is always 0 in the scene). */
export const STATION_POS_RAW: [number, number][] = [
  [-13, -6],
  [-4, 8],
  [10, 6],
  [14, -10],
]

/** Seconds between each new stream-log row appearing. */
export const STREAM_INTERVAL = 2.1

/** Maximum visible stream rows before the oldest fades out. */
export const MAX_STREAM_ROWS = 4

/** Seconds between automatic cross-domain sync-beat pulses. */
export const SYNC_BEAT_INTERVAL = 3.0
