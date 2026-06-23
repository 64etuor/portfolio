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

/** Per-station domain accent colors (hex ints) — rings, flow lines, particles. */
export const LAYER_RING_COLORS = [0xff7a8a, 0x6fb4ff, 0xc9a3ff, 0x46e6b0]

/** Station index pairs that get a connecting flow line + particle. */
export const FLOW_PAIRS: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 3],
  [1, 3],
]

/** WIP signal-node colors (hex ints), cycled across the 10 traveling nodes. */
export const WIP_COLORS = [0xff7a8a, 0x6fb4ff, 0xc9a3ff, 0x46e6b0, 0xffb454]

/** Cross-domain sync-pulse label frames shown on the AI fusion row. */
export const PULSE_FRAMES = ['LINK', 'SYNC', 'TWIN', 'OK']

/** Hub-station torus ring colors (hex ints). */
export const HUB_RING_COLORS = [0xff7a8a, 0x6fb4ff, 0xc9a3ff]

/** Map of station.layer → short HUD tag. */
export const LAYER_TAG: Record<string, string> = { mfg: 'MFG', dev: 'DEV', ai: 'AI', hub: 'HUB' }

/** Initial/base KPI values for the live-lerp strip; `null` = static cell. */
export const KPI_BASE: (number | null)[] = [null, 92.4, null, null, null, 1.8, null, null, null, null]
