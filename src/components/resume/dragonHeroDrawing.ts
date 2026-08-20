/**
 * dragonHeroDrawing — the canvas draw + per-frame physics for the résumé
 * dragon hero, extracted verbatim from ResumeDragonHero.
 *
 * These are the original demo's form and physics. Every function takes the
 * mutable simulation `state` (and the 2D context) by explicit parameter rather
 * than capturing a closure, so the orchestrator component stays thin while the
 * animation timing, rAF cadence, and canvas output remain byte-for-byte
 * identical to the in-line version.
 */

import type { Letter } from './dragonHeroTypes'
import {
  ACCENT,
  CFG,
  DRAGON_CHARS,
  EMBER_CHARS,
  FIRE_CHARS,
  PHOS_HI,
  RUNE_CHARS,
  SEG_SPACING,
  fireColor,
} from './dragonHeroPalette'

/**
 * All mutable simulation state for one running hero instance. The drawing /
 * physics helpers read and write these fields in place; the typed arrays are
 * shared by reference so threading the state object preserves the exact
 * behaviour of the original closure.
 */
export type DragonHeroState = {
  // Canvas dimensions (CSS px).
  W: number
  H: number
  // Animation clock (seconds).
  time: number

  // Pointer (followed globally; canvas is pointer-events:none).
  pointer: { x: number; y: number; active: boolean }
  breathing: boolean

  // Screen shake.
  shakeIntensity: number
  shakeX: number
  shakeY: number

  // Dragon chain.
  chainN: number
  chX: Float32Array
  chY: Float32Array
  chPx: Float32Array
  chPy: Float32Array

  // Letters (the name + body-copy echoes).
  letters: Letter[]

  // Embers.
  emberCount: number
  emX: Float32Array
  emY: Float32Array
  emVx: Float32Array
  emVy: Float32Array
  emLife: Float32Array
  emSize: Float32Array
  emCh: string[]

  // Fire particles.
  particleCount: number
  pX: Float32Array
  pY: Float32Array
  pVx: Float32Array
  pVy: Float32Array
  pLife: Float32Array
  pMaxLife: Float32Array
  pSize: Float32Array
  pCh: string[]

  // Fire emission accumulators.
  fireAccum: number
  totalFireTime: number

  // Runes (faint drifting background glyphs).
  runeX: Float32Array
  runeY: Float32Array
  runeSpd: Float32Array
  runePhase: Float32Array
  runeSz: Float32Array
  runeOp: Float32Array
  runeC: string[]
}

export function segScale(state: DragonHeroState, i: number): number {
  if (i < 3) return (2.5 - i * 0.15) * CFG.scale
  const t = (i - 3) / (state.chainN - 3)
  return (2.0 * (1 - t * t) + 0.2) * CFG.scale
}

export function seedChain(state: DragonHeroState): void {
  const { chainN, chX, chY, chPx, chPy, W, H } = state
  for (let i = 0; i < chainN; i++) {
    chX[i] = W * 0.6
    chY[i] = H * 0.5 + i * SEG_SPACING
    chPx[i] = chX[i]
    chPy[i] = chY[i]
  }
}

export function seedRunes(state: DragonHeroState): void {
  const { runeX, runeY, runeSpd, runePhase, runeSz, runeOp, runeC, W, H } = state
  for (let i = 0; i < state.runeX.length; i++) {
    runeX[i] = Math.random() * W
    runeY[i] = Math.random() * H
    runeSpd[i] = 0.1 + Math.random() * 0.35
    runePhase[i] = Math.random() * Math.PI * 2
    runeSz[i] = 14 + Math.random() * 14
    runeOp[i] = 0.03 + Math.random() * 0.05
    runeC[i] = RUNE_CHARS[(Math.random() * RUNE_CHARS.length) | 0]
  }
}

export function triggerShake(state: DragonHeroState, i: number): void {
  if (!CFG.shake) return
  state.shakeIntensity = Math.max(state.shakeIntensity, Math.min(i, 6))
}

export function updateShake(state: DragonHeroState): void {
  if (state.shakeIntensity > 0.1) {
    state.shakeX = (Math.random() - 0.5) * state.shakeIntensity
    state.shakeY = (Math.random() - 0.5) * state.shakeIntensity
    state.shakeIntensity *= 0.85
  } else {
    state.shakeX = 0
    state.shakeY = 0
    state.shakeIntensity = 0
  }
}

export function spawnEmber(state: DragonHeroState, x: number, y: number): void {
  if (state.emberCount >= state.emX.length) return
  const i = state.emberCount++
  const a = Math.random() * Math.PI * 2
  state.emX[i] = x
  state.emY[i] = y
  state.emVx[i] = Math.cos(a) * (1 + Math.random() * 3)
  state.emVy[i] = Math.sin(a) * (1 + Math.random() * 3) - 2
  state.emLife[i] = 0.3 + Math.random() * 0.6
  state.emSize[i] = 4 + Math.random() * 7
  state.emCh[i] = EMBER_CHARS[(Math.random() * EMBER_CHARS.length) | 0]
}

// ── Physics: dragon chain follows pointer / auto-roam ──
export function updateChain(state: DragonHeroState): void {
  const { chainN, chX, chY, chPx, chPy, pointer, W, H, time } = state
  for (let i = 0; i < chainN; i++) {
    chPx[i] = chX[i]
    chPy[i] = chY[i]
  }
  let tx: number
  let ty: number
  if (pointer.active) {
    tx = pointer.x
    ty = pointer.y
  } else {
    // Idle Lissajous wander so the serpent stays alive without a pointer.
    tx = W * 0.5 + Math.cos(time * 0.5) * W * 0.3
    ty = H * 0.5 + Math.sin(time * 0.9) * H * 0.3
  }
  chX[0] += (tx - chX[0]) * CFG.speed
  chY[0] += (ty - chY[0]) * CFG.speed
  for (let i = 1; i < chainN; i++) {
    const dx = chX[i] - chX[i - 1]
    const dy = chY[i] - chY[i - 1]
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > SEG_SPACING) {
      const r = SEG_SPACING / d
      chX[i] = chX[i - 1] + dx * r
      chY[i] = chY[i - 1] + dy * r
    }
  }
}

export function interactLetters(state: DragonHeroState, dt: number): void {
  const { chainN, chX, chY, chPx, chPy, letters } = state
  const checkSegs = Math.min(Math.round(chainN * 0.4), chainN)
  const { damping, spring, push, burnGravity } = CFG

  // Broad-phase: a padded bounding box of the colliding head segments. A
  // settled letter outside it feels no dragon and is already home, so it
  // can be skipped entirely — this keeps the (now thousands-strong) echo
  // field cheap, only simulating letters near the serpent or still in motion.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let si = 0; si < checkSegs; si++) {
    if (chX[si] < minX) minX = chX[si]
    if (chX[si] > maxX) maxX = chX[si]
    if (chY[si] < minY) minY = chY[si]
    if (chY[si] > maxY) maxY = chY[si]
  }
  const pad = 48
  minX -= pad
  minY -= pad
  maxX += pad
  maxY += pad

  for (const L of letters) {
    const hdx0 = L.x - L.hx
    const hdy0 = L.y - L.hy
    const settled = hdx0 * hdx0 + hdy0 * hdy0 < 0.4 && L.vx * L.vx + L.vy * L.vy < 0.02 && L.burnTimer <= 0
    if (settled && (L.x < minX || L.x > maxX || L.y < minY || L.y > maxY)) continue

    let vx = L.vx
    let vy = L.vy
    let av = L.angVel
    const x = L.x
    const y = L.y
    const cw = L.charW

    // Dragon body collision
    for (let si = 0; si < checkSegs; si++) {
      const sc = segScale(state, si)
      const rad = 14 * sc * 0.45
      const dx = x - chX[si]
      const dy = y - chY[si]
      const dSq = dx * dx + dy * dy
      const minD = rad + cw * 0.4 + 4
      if (dSq < minD * minD && dSq > 0.01) {
        const d = Math.sqrt(dSq)
        const f = push * ((minD - d) / minD) * sc
        const nx = dx / d
        const ny = dy / d
        vx += nx * f + (chX[si] - chPx[si]) * 0.4
        vy += ny * f + (chY[si] - chPy[si]) * 0.4
        av += (nx * 0.3 - ny * 0.2) * f * 0.12
      }
    }

    // Wake (every 5th segment)
    for (let si = 5; si < chainN; si += 5) {
      const dx = x - chX[si]
      const dy = y - chY[si]
      const dSq = dx * dx + dy * dy
      if (dSq < 1600 && dSq > 100) {
        const w = (1 - Math.sqrt(dSq) / 40) * 0.12
        vx += (chX[si] - chPx[si]) * w
        vy += (chY[si] - chPy[si]) * w
      }
    }

    // Burn
    if (L.burnTimer > 0) {
      L.burnTimer -= dt
      L.scaleMul = 1 + L.burnTimer * 0.4
      L.gravity = burnGravity
      if (Math.random() < dt * 2) spawnEmber(state, x, y)
      if (L.burnTimer <= 0) {
        L.burnTimer = 0
        L.scaleMul = 1
        L.gravity = 0
      }
    }

    // Spring home
    const hdx = L.hx - x
    const hdy = L.hy - y
    const hd = Math.sqrt(hdx * hdx + hdy * hdy)
    if (hd > 0.5) {
      const sf = spring * (1 + hd * 0.001)
      vx += hdx * sf
      vy += hdy * sf
      av -= L.angle * 0.05
    } else {
      L.angle *= 0.9
    }

    vy += L.gravity
    L.vx = vx * damping
    L.vy = vy * damping
    L.angVel = av * 0.91
    L.x = x + L.vx
    L.y = y + L.vy
    L.angle += L.angVel
  }
}

export function fireBlastAt(
  state: DragonHeroState,
  bx: number,
  by: number,
  dx: number,
  dy: number,
): void {
  let hits = 0
  const rSq = CFG.fireRadius * CFG.fireRadius
  const ff = CFG.fireForce
  const fr = CFG.fireRadius
  for (const L of state.letters) {
    const ldx = L.x - bx
    const ldy = L.y - by
    const dSq = ldx * ldx + ldy * ldy
    if (dSq < rSq && dSq > 0.01) {
      const d = Math.sqrt(dSq)
      const f = ff * (1 - d / fr) ** 2
      L.vx += (ldx / d * 0.4 + dx * 0.6) * f
      L.vy += (ldy / d * 0.4 + dy * 0.6) * f - f * 0.2
      L.angVel += (Math.random() - 0.5) * f * 0.3
      L.burnTimer = Math.max(L.burnTimer, 0.5 + Math.random() * 1.2)
      hits++
    }
  }
  if (hits > 3) {
    triggerShake(state, Math.min(hits * 0.4, 6))
    for (let i = 0; i < Math.min(hits, 4); i++) spawnEmber(state, bx, by)
  }
}

export function emitFire(state: DragonHeroState, dt: number): void {
  if (!state.breathing) {
    state.totalFireTime = 0
    return
  }
  const { chX, chY, chainN, pX, pY, pVx, pVy, pLife, pMaxLife, pSize, pCh } = state
  state.fireAccum += dt
  state.totalFireTime += dt
  const hx = chX[0]
  const hy = chY[0]
  const ni = Math.min(3, chainN - 1)
  const fdx = hx - chX[ni]
  const fdy = hy - chY[ni]
  const len = Math.sqrt(fdx * fdx + fdy * fdy) || 1
  const dx = fdx / len
  const dy = fdy / len
  const angle = Math.atan2(fdy, fdx)

  while (state.fireAccum > 0.025) {
    state.fireAccum -= 0.025
    if (state.particleCount >= pX.length) break
    for (let j = 0; j < 2; j++) {
      if (state.particleCount >= pX.length) break
      const i = state.particleCount++
      const sp = Math.random() - 0.5
      const spd = 5 + Math.random() * 7
      pX[i] = hx + dx * 15
      pY[i] = hy + dy * 15
      pVx[i] = Math.cos(angle + sp) * spd
      pVy[i] = Math.sin(angle + sp) * spd - Math.random()
      pLife[i] = 1
      pMaxLife[i] = 0.3 + Math.random() * 0.4
      pSize[i] = 6 + Math.random() * 12
      pCh[i] = FIRE_CHARS[(Math.random() * FIRE_CHARS.length) | 0]
    }
  }

  const bx = hx + dx * 50
  const by = hy + dy * 50
  fireBlastAt(state, bx, by, dx, dy)
  triggerShake(state, Math.min(1 + state.totalFireTime * 0.2, 3))
}

export function updateParticlesAndEmbers(state: DragonHeroState, dt: number): void {
  const { pX, pY, pVx, pVy, pLife, pMaxLife, pSize, pCh } = state
  for (let i = state.particleCount - 1; i >= 0; i--) {
    pX[i] += pVx[i]
    pY[i] += pVy[i]
    pVy[i] -= 0.25
    pVx[i] *= 0.97
    pLife[i] -= dt / pMaxLife[i]
    if (pLife[i] <= 0) {
      state.particleCount--
      pX[i] = pX[state.particleCount]
      pY[i] = pY[state.particleCount]
      pVx[i] = pVx[state.particleCount]
      pVy[i] = pVy[state.particleCount]
      pLife[i] = pLife[state.particleCount]
      pMaxLife[i] = pMaxLife[state.particleCount]
      pSize[i] = pSize[state.particleCount]
      pCh[i] = pCh[state.particleCount]
    }
  }
  const { emX, emY, emVx, emVy, emLife, emSize, emCh } = state
  for (let i = state.emberCount - 1; i >= 0; i--) {
    emX[i] += emVx[i]
    emY[i] += emVy[i]
    emVy[i] += 0.15
    emVx[i] *= 0.97
    emLife[i] -= dt
    if (emLife[i] <= 0) {
      state.emberCount--
      emX[i] = emX[state.emberCount]
      emY[i] = emY[state.emberCount]
      emVx[i] = emVx[state.emberCount]
      emVy[i] = emVy[state.emberCount]
      emLife[i] = emLife[state.emberCount]
      emSize[i] = emSize[state.emberCount]
      emCh[i] = emCh[state.emberCount]
    }
  }
}

// ── Draw ──
export function drawRunes(ctx: CanvasRenderingContext2D, state: DragonHeroState): void {
  const { runeX, runeY, runeSpd, runePhase, runeSz, runeOp, runeC, W, H, time } = state
  ctx.fillStyle = ACCENT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < runeX.length; i++) {
    runeY[i] -= runeSpd[i]
    if (runeY[i] < -30) {
      runeY[i] = H + 30
      runeX[i] = Math.random() * W
    }
    ctx.globalAlpha = runeOp[i] * (0.5 + Math.sin(time * 0.4 + runePhase[i]) * 0.5)
    ctx.font = `${runeSz[i]}px 'JetBrains Mono', monospace`
    ctx.fillText(runeC[i], runeX[i] + Math.sin(time * 0.7 + runePhase[i]) * 12, runeY[i])
  }
  ctx.globalAlpha = 1
}

export function drawLetters(ctx: CanvasRenderingContext2D, state: DragonHeroState): void {
  let prevFont = ''
  for (const L of state.letters) {
    const burning = L.burnTimer > 0
    let alpha = L.baseAlpha
    let color = L.color
    if (burning) {
      color = fireColor(1 - Math.min(1, L.burnTimer))
      alpha = Math.min(1, alpha + 0.4)
    }
    if (L.font !== prevFont) {
      ctx.font = L.font
      prevFont = L.font
    }
    ctx.save()
    ctx.translate(L.x, L.y)
    if (L.angle !== 0) ctx.rotate(L.angle)
    if (L.scaleMul !== 1) ctx.scale(L.scaleMul, L.scaleMul)
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = burning ? 'rgba(95,181,194,0.6)' : 'rgba(215,215,215,0.35)'
    ctx.shadowBlur = burning ? 12 : 6
    ctx.fillText(L.ch, 0, 0)
    ctx.restore()
  }
  ctx.shadowBlur = 0
}

export function drawParticles(ctx: CanvasRenderingContext2D, state: DragonHeroState): void {
  const { emX, emY, emLife, emSize, emCh, pX, pY, pLife, pSize, pCh } = state
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let i = 0; i < state.emberCount; i++) {
    ctx.globalAlpha = Math.min(1, emLife[i] * 2)
    ctx.font = `${emSize[i]}px 'JetBrains Mono', monospace`
    ctx.fillStyle = ACCENT
    ctx.fillText(emCh[i], emX[i], emY[i])
  }
  for (let i = 0; i < state.particleCount; i++) {
    const t = 1 - pLife[i]
    const sz = pSize[i] * (0.4 + pLife[i] * 0.6)
    ctx.globalAlpha = pLife[i] * 0.85
    ctx.font = `${sz}px 'JetBrains Mono', monospace`
    ctx.fillStyle = fireColor(t)
    ctx.fillText(pCh[i], pX[i], pY[i])
  }
  ctx.globalAlpha = 1
}

export function drawDragon(ctx: CanvasRenderingContext2D, state: DragonHeroState): void {
  const { chainN, chX, chY, pointer, time, breathing } = state
  for (let i = chainN - 1; i >= 0; i--) {
    const sc = segScale(state, i)
    const ci = Math.min(i, DRAGON_CHARS.length - 1)
    const size = 14 * sc
    const t = i / chainN
    const p = Math.sin(time * 3 + i * 0.3) * 0.12
    let color: string
    if (i < 3) {
      // Head — bright teal with a faint pulse.
      color = `rgb(${(120 + p * 40) | 0},${(200 + p * 30) | 0},${(210 + p * 20) | 0})`
    } else {
      // Body — phosphor grey fading toward the tail, hint of teal.
      const w = Math.sin(time * 2 - i * 0.15) * 0.15
      const r = (215 * (1 - t * 0.55) + p * 18) | 0
      const g = (218 * (1 - t * 0.5) + w * 24) | 0
      const b = (222 * (1 - t * 0.42) + w * 40) | 0
      color = `rgba(${r},${g},${b},${1 - t * 0.5})`
    }
    let angle =
      i === 0
        ? Math.atan2((pointer.active ? pointer.y : chY[0]) - chY[0], (pointer.active ? pointer.x : chX[0]) - chX[0])
        : Math.atan2(chY[i - 1] - chY[i], chX[i - 1] - chX[i])
    if (i === 0 && !pointer.active) angle = Math.atan2(chY[0] - chY[1], chX[0] - chX[1])

    // Head glow (teal).
    if (i < 4) {
      ctx.globalAlpha = 0.06 * (breathing ? 2 : 1)
      ctx.fillStyle = ACCENT
      ctx.beginPath()
      ctx.arc(chX[i], chY[i], size * 1.1, 0, Math.PI * 2)
      ctx.fill()
    }

    // Spines
    if (CFG.spines && i >= 4 && i <= 30 && i % 3 === 0) {
      const sa = angle + Math.PI / 2
      ctx.globalAlpha = 0.32
      ctx.font = `${size * (0.6 + Math.sin(time * 3 + i) * 0.15)}px 'JetBrains Mono', monospace`
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('▴', chX[i] + Math.cos(sa) * size * 0.35, chY[i] + Math.sin(sa) * size * 0.35)
    }

    // Wings
    if (CFG.wings && i >= 7 && i <= 16 && i % 2 === 0) {
      const wp = Math.sin(time * 3.5 + i * 0.4) * 0.5
      const ws = size * (1.8 - Math.abs(i - 11.5) * 0.12)
      const wd = size * 1.4
      const w1 = angle + Math.PI / 2 + wp
      const w2 = angle - Math.PI / 2 - wp
      ctx.globalAlpha = 0.4
      ctx.font = `${ws}px 'JetBrains Mono', monospace`
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('≺', chX[i] + Math.cos(w1) * wd, chY[i] + Math.sin(w1) * wd)
      ctx.fillText('≻', chX[i] + Math.cos(w2) * wd, chY[i] + Math.sin(w2) * wd)
    }

    ctx.save()
    ctx.translate(chX[i], chY[i])
    ctx.rotate(angle)
    ctx.globalAlpha = 1
    ctx.font = `bold ${size}px 'JetBrains Mono', monospace`
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(DRAGON_CHARS[ci], 0, Math.sin(time * 5 + i * 0.35) * 1.5)
    if (breathing && i < 3) {
      ctx.globalAlpha = 0.3
      ctx.fillStyle = PHOS_HI
      ctx.fillText(DRAGON_CHARS[ci], 0, Math.sin(time * 5 + i * 0.35) * 1.5)
    }
    ctx.restore()
  }

  // Eyes
  const ha = Math.atan2((pointer.active ? pointer.y : chY[1]) - chY[0], (pointer.active ? pointer.x : chX[1]) - chX[0])
  const ex = chX[0] + Math.cos(ha + 0.5) * 10
  const ey = chY[0] + Math.sin(ha + 0.5) * 10
  ctx.globalAlpha = breathing ? 0.25 : 0.12
  ctx.fillStyle = ACCENT
  ctx.beginPath()
  ctx.arc(ex, ey, breathing ? 18 : 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = breathing ? PHOS_HI : ACCENT
  ctx.font = `16px 'JetBrains Mono', monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(time % 5 > 4.7 ? '—' : breathing ? '◉' : '⊙', ex, ey)
  ctx.globalAlpha = 1
}

export function render(ctx: CanvasRenderingContext2D, state: DragonHeroState): void {
  ctx.clearRect(0, 0, state.W, state.H)
  ctx.save()
  ctx.translate(state.shakeX, state.shakeY)
  drawRunes(ctx, state)
  drawLetters(ctx, state)
  drawDragon(ctx, state)
  drawParticles(ctx, state)
  ctx.restore()
}
