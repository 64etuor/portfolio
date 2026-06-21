/**
 * Shared palette — RGB constants confirmed byte-identical across ≥2 scenes.
 * Import the value you need and alias locally if the scene uses a different name.
 *
 * Confirmed duplicates (as of dedup audit D1-02):
 *   PALETTE_WARM       [217,138,61]   — 30-collision, 36-bridge-experts, 41-perspectives
 *   PALETTE_DIM        [141,141,141]  — 33-ax-era, 37-cross-domain, 41-perspectives
 *   PALETTE_COLD_BLUE  [74,179,204]   — 30-collision, 36-bridge-experts
 *   PALETTE_TEAL       [79,224,196]   — 32-the-connector, 36-bridge-experts
 *   PALETTE_TEAL_HI    [196,248,238]  — 32-the-connector, 36-bridge-experts
 *   PALETTE_LIGHT_GRAY [215,215,215]  — 33-ax-era, 37-cross-domain
 */

import type { RGB } from './color'

export const PALETTE_WARM: RGB = [217, 138, 61]
export const PALETTE_DIM: RGB = [141, 141, 141]
export const PALETTE_COLD_BLUE: RGB = [74, 179, 204]
export const PALETTE_TEAL: RGB = [79, 224, 196]
export const PALETTE_TEAL_HI: RGB = [196, 248, 238]
export const PALETTE_LIGHT_GRAY: RGB = [215, 215, 215]
