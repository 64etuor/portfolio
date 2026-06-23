/**
 * dragonHeroPalette — colors, glyph sets, fonts, and config defaults for the
 * résumé dragon hero. Values are kept verbatim from the original component:
 * phosphor grey on near-black with a restrained teal accent in place of the
 * playground's fire-orange.
 */

import type { DragonConfig } from './dragonHeroTypes'

export const PHOS = '#d7d7d7'
export const PHOS_HI = '#e6ebf0'
export const DIM = '#8d8d8d'
export const ACCENT = '#5fb5c2' // restrained teal — replaces the demo's fire-orange

// Original dragon scale glyphs — kept verbatim from the playground.
export const DRAGON_CHARS =
  '◆◆◇▼█▓▓▒╬╬╬╬╬╬╬╬╬╬╫╫╫╪╪╪╧╧╤╤╥╥║║││┃┃╎╎╏╏::····..'.split('')
export const EMBER_CHARS = ['·', '•', '∘', '˚']
export const FIRE_CHARS = '*✦✧⁕❋✺◌•∘˚⋆·'.split('')
export const RUNE_CHARS = '龍火竜鱗焔ᚱᚦᛏ'.split('')

// ── Fonts ──
export const sans = (px: number) =>
  `800 ${px}px 'Pretendard Variable', Pretendard, system-ui, sans-serif`
export const sansMed = (px: number) =>
  `600 ${px}px 'Pretendard Variable', Pretendard, system-ui, sans-serif`
export const monoLabel = (px: number) =>
  `500 ${px}px 'JetBrains Mono', ui-monospace, monospace`

// ── Config (playground defaults, lightly tuned for a masthead) ──
export const CFG: DragonConfig = {
  segments: 46,
  speed: 0.18,
  scale: 0.85,
  wings: true,
  spines: true,
  push: 6,
  spring: 0.015,
  damping: 0.93,
  burnGravity: 0.5,
  fireRadius: 110,
  fireForce: 22,
  shake: true,
}

/** Spacing between dragon chain segments. */
export const SEG_SPACING = 10

export const MAX_EMBERS = 50
export const MAX_PARTICLES = 120
export const RUNE_N = 7

// ── Teal-tinted fire ramp: white-hot → teal → dim grey ──
export function fireColor(t: number): string {
  if (t < 0.2) {
    const g = (235 + t * 100) | 0
    return `rgb(255,255,${Math.min(255, g)})`
  }
  if (t < 0.55) {
    const f = (t - 0.2) / 0.35
    const r = (255 - f * 160) | 0
    const g = (255 - f * 74) | 0
    const b = (235 - f * 41) | 0
    return `rgb(${r},${g},${b})`
  }
  const f = (t - 0.55) / 0.45
  const r = (95 - f * 35) | 0
  const g = (181 - f * 100) | 0
  const b = (194 - f * 110) | 0
  return `rgb(${r},${g},${b})`
}
