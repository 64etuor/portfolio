'use client'

import { useEffect, useRef } from 'react'
import { prepare, layoutLines, resetPretextCache } from '@/lib/pretext'

/**
 * ResumeDragonHero — the résumé masthead.
 *
 * A faithful port of the pretext-playground ASCII dragon demo
 * (https://github.com/0xNyk/pretext-playground — MIT). The serpent is a
 * chain of monospace glyphs that follows the pointer (and auto-roams when
 * idle), with wings, spines, glowing eyes, and a press-and-hold fire breath
 * that scatters and burns the surrounding text. The text it disturbs is the
 * résumé's own name — laid out by our DOM-free pretext engine (`prepare()` →
 * `layoutLines()`), so every letter has a measured "home" it springs back to.
 *
 * The form and physics are the original demo's; only the palette is ours:
 * phosphor grey (#d7d7d7) on near-black, with a restrained teal (#5fb5c2)
 * accent in place of the original's fire-orange. `prefers-reduced-motion`
 * draws a single static frame (settled name + coiled dragon), no loop.
 */

const PHOS = '#d7d7d7'
const PHOS_HI = '#e6ebf0'
const DIM = '#8d8d8d'
const ACCENT = '#5fb5c2' // restrained teal — replaces the demo's fire-orange

// Original dragon scale glyphs — kept verbatim from the playground.
const DRAGON_CHARS = '◆◆◇▼█▓▓▒╬╬╬╬╬╬╬╬╬╬╫╫╫╪╪╪╧╧╤╤╥╥║║││┃┃╎╎╏╏::····..'.split('')
const EMBER_CHARS = ['·', '•', '∘', '˚']
const FIRE_CHARS = '*✦✧⁕❋✺◌•∘˚⋆·'.split('')
const RUNE_CHARS = '龍火竜鱗焔ᚱᚦᛏ'.split('')

type Block = { text: string; font: (px: number) => string; size: number; color: string; alpha: number; gap: number }

type Letter = {
  ch: string
  hx: number
  hy: number
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angVel: number
  charW: number
  baseAlpha: number
  color: string
  font: string
  burnTimer: number
  scaleMul: number
  gravity: number
}

export function ResumeDragonHero({ nameEn, nameKr, title }: { nameEn: string; nameKr: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sans = (px: number) => `800 ${px}px 'Pretendard Variable', Pretendard, system-ui, sans-serif`
    const sansMed = (px: number) => `600 ${px}px 'Pretendard Variable', Pretendard, system-ui, sans-serif`
    const monoLabel = (px: number) => `500 ${px}px 'JetBrains Mono', ui-monospace, monospace`

    // ── Config (playground defaults, lightly tuned for a masthead) ──
    const CFG = {
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

    let W = 0
    let H = 0
    let raf = 0
    let time = 0
    let lastTime = performance.now()

    // Title box (the masthead .rz-hero-spacer), in canvas-local coordinates.
    let boxX = 0
    let boxY = 0
    let boxW = 0
    let boxH = 0

    // ── Pointer (followed globally; the canvas itself is pointer-events:none) ──
    const pointer = { x: 0, y: 0, active: false }
    let pointerIdleT = 99 // seconds since last move → auto-roam when large
    let rectLeft = 0
    let rectTop = 0
    let breathing = false
    // Autonomous fire: a brief breath every ~9–13s keeps the embers/particles
    // alive. It only visibly burns letters when the head happens to be near the
    // name; over body text the blast finds nothing, so it stays unobtrusive.
    let nextFireAt = 5
    let breathUntil = 0

    // ── Screen shake ──
    let shakeIntensity = 0
    let shakeX = 0
    let shakeY = 0
    const triggerShake = (i: number) => {
      if (!CFG.shake) return
      shakeIntensity = Math.max(shakeIntensity, Math.min(i, 6))
    }
    const updateShake = () => {
      if (shakeIntensity > 0.1) {
        shakeX = (Math.random() - 0.5) * shakeIntensity
        shakeY = (Math.random() - 0.5) * shakeIntensity
        shakeIntensity *= 0.85
      } else {
        shakeX = 0
        shakeY = 0
        shakeIntensity = 0
      }
    }

    // ── Dragon chain ──
    const SEG_SPACING = 10
    let chainN = CFG.segments
    let chX = new Float32Array(chainN)
    let chY = new Float32Array(chainN)
    let chPx = new Float32Array(chainN)
    let chPy = new Float32Array(chainN)

    const segScale = (i: number): number => {
      if (i < 3) return (2.5 - i * 0.15) * CFG.scale
      const t = (i - 3) / (chainN - 3)
      return (2.0 * (1 - t * t) + 0.2) * CFG.scale
    }

    function seedChain() {
      for (let i = 0; i < chainN; i++) {
        chX[i] = W * 0.6
        chY[i] = H * 0.5 + i * SEG_SPACING
        chPx[i] = chX[i]
        chPy[i] = chY[i]
      }
    }

    // ── Letters (the name, laid out by pretext) ──
    let letters: Letter[] = []

    function buildLetters() {
      letters = []
      // Size & place the name relative to the reserved title box (= the sheet's
      // content column), so it stays aligned with the body no matter how wide
      // the full-page canvas is.
      const big = Math.max(34, Math.min(88, boxW * 0.1))
      const kr = Math.max(20, big * 0.4)
      const ts = Math.max(11, Math.min(15, boxW * 0.018))
      const maxW = boxW

      const blocks: Block[] = [
        { text: nameEn.toUpperCase(), font: sans, size: big, color: PHOS_HI, alpha: 1, gap: big * 0.26 },
        { text: nameKr, font: sansMed, size: kr, color: PHOS, alpha: 0.92, gap: kr * 0.7 },
        { text: title, font: monoLabel, size: ts, color: DIM, alpha: 0.78, gap: 0 },
      ]

      // Vertical block: measure total height, then center within the box.
      let total = 0
      for (const b of blocks) {
        const { lines } = layoutLines(prepare(b.text, b.font(b.size)), maxW, b.size * 1.18)
        total += lines.length * b.size * 1.18 + b.gap
      }
      let cy = boxY + Math.max(0, (boxH - total) / 2)

      for (const b of blocks) {
        const prepared = prepare(b.text, b.font(b.size))
        const lh = b.size * 1.18
        const { lines } = layoutLines(prepared, maxW, lh)
        for (const line of lines) {
          for (const g of line.glyphs) {
            if (g.ch === ' ') continue
            const hx = boxX + g.x + g.w / 2
            const hy = cy + lh / 2
            letters.push({
              ch: g.ch,
              hx,
              hy,
              x: hx,
              y: hy,
              vx: 0,
              vy: 0,
              angle: 0,
              angVel: 0,
              charW: g.w,
              baseAlpha: b.alpha,
              color: b.color,
              font: b.font(b.size),
              burnTimer: 0,
              scaleMul: 1,
              gravity: 0,
            })
          }
          cy += lh
        }
        cy += b.gap
      }
    }

    // ── Embers + fire particles (pooled) ──
    const MAX_EMBERS = 50
    let emberCount = 0
    const emX = new Float32Array(MAX_EMBERS)
    const emY = new Float32Array(MAX_EMBERS)
    const emVx = new Float32Array(MAX_EMBERS)
    const emVy = new Float32Array(MAX_EMBERS)
    const emLife = new Float32Array(MAX_EMBERS)
    const emSize = new Float32Array(MAX_EMBERS)
    const emCh: string[] = new Array(MAX_EMBERS)

    function spawnEmber(x: number, y: number) {
      if (emberCount >= MAX_EMBERS) return
      const i = emberCount++
      const a = Math.random() * Math.PI * 2
      emX[i] = x
      emY[i] = y
      emVx[i] = Math.cos(a) * (1 + Math.random() * 3)
      emVy[i] = Math.sin(a) * (1 + Math.random() * 3) - 2
      emLife[i] = 0.3 + Math.random() * 0.6
      emSize[i] = 4 + Math.random() * 7
      emCh[i] = EMBER_CHARS[(Math.random() * EMBER_CHARS.length) | 0]
    }

    const MAX_PARTICLES = 120
    let particleCount = 0
    const pX = new Float32Array(MAX_PARTICLES)
    const pY = new Float32Array(MAX_PARTICLES)
    const pVx = new Float32Array(MAX_PARTICLES)
    const pVy = new Float32Array(MAX_PARTICLES)
    const pLife = new Float32Array(MAX_PARTICLES)
    const pMaxLife = new Float32Array(MAX_PARTICLES)
    const pSize = new Float32Array(MAX_PARTICLES)
    const pCh: string[] = new Array(MAX_PARTICLES)

    // ── Runes (faint drifting background glyphs) ──
    const RUNE_N = 7
    const runeX = new Float32Array(RUNE_N)
    const runeY = new Float32Array(RUNE_N)
    const runeSpd = new Float32Array(RUNE_N)
    const runePhase = new Float32Array(RUNE_N)
    const runeSz = new Float32Array(RUNE_N)
    const runeOp = new Float32Array(RUNE_N)
    const runeC: string[] = []
    function seedRunes() {
      for (let i = 0; i < RUNE_N; i++) {
        runeX[i] = Math.random() * W
        runeY[i] = Math.random() * H
        runeSpd[i] = 0.1 + Math.random() * 0.35
        runePhase[i] = Math.random() * Math.PI * 2
        runeSz[i] = 14 + Math.random() * 14
        runeOp[i] = 0.03 + Math.random() * 0.05
        runeC[i] = RUNE_CHARS[(Math.random() * RUNE_CHARS.length) | 0]
      }
    }

    // ── Sizing ──
    function build() {
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      W = rect.width
      H = rect.height
      rectLeft = rect.left
      rectTop = rect.top
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Locate the reserved title box (canvas-local). Fall back to a sensible
      // top-left band if the spacer isn't found.
      const root = canvas.parentElement
      const spacer = root?.querySelector('.rz-hero-spacer') as HTMLElement | null
      if (spacer) {
        const s = spacer.getBoundingClientRect()
        boxX = s.left - rect.left
        boxY = s.top - rect.top
        boxW = s.width
        boxH = s.height
      } else {
        boxX = Math.max(22, W * 0.055)
        boxY = H * 0.1
        boxW = Math.min(W - boxX * 2, 680)
        boxH = 320
      }

      if (pointer.active === false) {
        pointer.x = W * 0.5
        pointer.y = H * 0.42
      }
      if (chX.length < chainN) {
        chX = new Float32Array(chainN)
        chY = new Float32Array(chainN)
        chPx = new Float32Array(chainN)
        chPy = new Float32Array(chainN)
      }
      seedChain()
      seedRunes()
      buildLetters()
    }

    // ── Physics: dragon chain follows pointer / auto-roam ──
    function updateChain() {
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

    function interactLetters(dt: number) {
      const checkSegs = Math.min(Math.round(chainN * 0.4), chainN)
      const { damping, spring, push, burnGravity } = CFG
      for (const L of letters) {
        let vx = L.vx
        let vy = L.vy
        let av = L.angVel
        const x = L.x
        const y = L.y
        const cw = L.charW

        // Dragon body collision
        for (let si = 0; si < checkSegs; si++) {
          const sc = segScale(si)
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
          if (Math.random() < dt * 2) spawnEmber(x, y)
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

    function fireBlastAt(bx: number, by: number, dx: number, dy: number) {
      let hits = 0
      const rSq = CFG.fireRadius * CFG.fireRadius
      const ff = CFG.fireForce
      const fr = CFG.fireRadius
      for (const L of letters) {
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
        triggerShake(Math.min(hits * 0.4, 6))
        for (let i = 0; i < Math.min(hits, 4); i++) spawnEmber(bx, by)
      }
    }

    let fireAccum = 0
    let totalFireTime = 0
    function emitFire(dt: number) {
      if (!breathing) {
        totalFireTime = 0
        return
      }
      fireAccum += dt
      totalFireTime += dt
      const hx = chX[0]
      const hy = chY[0]
      const ni = Math.min(3, chainN - 1)
      const fdx = hx - chX[ni]
      const fdy = hy - chY[ni]
      const len = Math.sqrt(fdx * fdx + fdy * fdy) || 1
      const dx = fdx / len
      const dy = fdy / len
      const angle = Math.atan2(fdy, fdx)

      while (fireAccum > 0.025) {
        fireAccum -= 0.025
        if (particleCount >= MAX_PARTICLES) break
        for (let j = 0; j < 2; j++) {
          if (particleCount >= MAX_PARTICLES) break
          const i = particleCount++
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
      fireBlastAt(bx, by, dx, dy)
      triggerShake(Math.min(1 + totalFireTime * 0.2, 3))
    }

    function updateParticlesAndEmbers(dt: number) {
      for (let i = particleCount - 1; i >= 0; i--) {
        pX[i] += pVx[i]
        pY[i] += pVy[i]
        pVy[i] -= 0.25
        pVx[i] *= 0.97
        pLife[i] -= dt / pMaxLife[i]
        if (pLife[i] <= 0) {
          particleCount--
          pX[i] = pX[particleCount]
          pY[i] = pY[particleCount]
          pVx[i] = pVx[particleCount]
          pVy[i] = pVy[particleCount]
          pLife[i] = pLife[particleCount]
          pMaxLife[i] = pMaxLife[particleCount]
          pSize[i] = pSize[particleCount]
          pCh[i] = pCh[particleCount]
        }
      }
      for (let i = emberCount - 1; i >= 0; i--) {
        emX[i] += emVx[i]
        emY[i] += emVy[i]
        emVy[i] += 0.15
        emVx[i] *= 0.97
        emLife[i] -= dt
        if (emLife[i] <= 0) {
          emberCount--
          emX[i] = emX[emberCount]
          emY[i] = emY[emberCount]
          emVx[i] = emVx[emberCount]
          emVy[i] = emVy[emberCount]
          emLife[i] = emLife[emberCount]
          emSize[i] = emSize[emberCount]
          emCh[i] = emCh[emberCount]
        }
      }
    }

    // ── Teal-tinted fire ramp: white-hot → teal → dim grey ──
    function fireColor(t: number): string {
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

    // ── Draw ──
    function drawRunes() {
      ctx!.fillStyle = ACCENT
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      for (let i = 0; i < RUNE_N; i++) {
        runeY[i] -= runeSpd[i]
        if (runeY[i] < -30) {
          runeY[i] = H + 30
          runeX[i] = Math.random() * W
        }
        ctx!.globalAlpha = runeOp[i] * (0.5 + Math.sin(time * 0.4 + runePhase[i]) * 0.5)
        ctx!.font = `${runeSz[i]}px 'JetBrains Mono', monospace`
        ctx!.fillText(runeC[i], runeX[i] + Math.sin(time * 0.7 + runePhase[i]) * 12, runeY[i])
      }
      ctx!.globalAlpha = 1
    }

    function drawLetters() {
      let prevFont = ''
      for (const L of letters) {
        const burning = L.burnTimer > 0
        let alpha = L.baseAlpha
        let color = L.color
        if (burning) {
          color = fireColor(1 - Math.min(1, L.burnTimer))
          alpha = Math.min(1, alpha + 0.4)
        }
        if (L.font !== prevFont) {
          ctx!.font = L.font
          prevFont = L.font
        }
        ctx!.save()
        ctx!.translate(L.x, L.y)
        if (L.angle !== 0) ctx!.rotate(L.angle)
        if (L.scaleMul !== 1) ctx!.scale(L.scaleMul, L.scaleMul)
        ctx!.globalAlpha = alpha
        ctx!.fillStyle = color
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.shadowColor = burning ? 'rgba(95,181,194,0.6)' : 'rgba(215,215,215,0.35)'
        ctx!.shadowBlur = burning ? 12 : 6
        ctx!.fillText(L.ch, 0, 0)
        ctx!.restore()
      }
      ctx!.shadowBlur = 0
    }

    function drawParticles() {
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      for (let i = 0; i < emberCount; i++) {
        ctx!.globalAlpha = Math.min(1, emLife[i] * 2)
        ctx!.font = `${emSize[i]}px 'JetBrains Mono', monospace`
        ctx!.fillStyle = ACCENT
        ctx!.fillText(emCh[i], emX[i], emY[i])
      }
      for (let i = 0; i < particleCount; i++) {
        const t = 1 - pLife[i]
        const sz = pSize[i] * (0.4 + pLife[i] * 0.6)
        ctx!.globalAlpha = pLife[i] * 0.85
        ctx!.font = `${sz}px 'JetBrains Mono', monospace`
        ctx!.fillStyle = fireColor(t)
        ctx!.fillText(pCh[i], pX[i], pY[i])
      }
      ctx!.globalAlpha = 1
    }

    function drawDragon() {
      for (let i = chainN - 1; i >= 0; i--) {
        const sc = segScale(i)
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
          ctx!.globalAlpha = 0.06 * (breathing ? 2 : 1)
          ctx!.fillStyle = ACCENT
          ctx!.beginPath()
          ctx!.arc(chX[i], chY[i], size * 1.1, 0, Math.PI * 2)
          ctx!.fill()
        }

        // Spines
        if (CFG.spines && i >= 4 && i <= 30 && i % 3 === 0) {
          const sa = angle + Math.PI / 2
          ctx!.globalAlpha = 0.32
          ctx!.font = `${size * (0.6 + Math.sin(time * 3 + i) * 0.15)}px 'JetBrains Mono', monospace`
          ctx!.fillStyle = color
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText('▴', chX[i] + Math.cos(sa) * size * 0.35, chY[i] + Math.sin(sa) * size * 0.35)
        }

        // Wings
        if (CFG.wings && i >= 7 && i <= 16 && i % 2 === 0) {
          const wp = Math.sin(time * 3.5 + i * 0.4) * 0.5
          const ws = size * (1.8 - Math.abs(i - 11.5) * 0.12)
          const wd = size * 1.4
          const w1 = angle + Math.PI / 2 + wp
          const w2 = angle - Math.PI / 2 - wp
          ctx!.globalAlpha = 0.4
          ctx!.font = `${ws}px 'JetBrains Mono', monospace`
          ctx!.fillStyle = color
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText('≺', chX[i] + Math.cos(w1) * wd, chY[i] + Math.sin(w1) * wd)
          ctx!.fillText('≻', chX[i] + Math.cos(w2) * wd, chY[i] + Math.sin(w2) * wd)
        }

        ctx!.save()
        ctx!.translate(chX[i], chY[i])
        ctx!.rotate(angle)
        ctx!.globalAlpha = 1
        ctx!.font = `bold ${size}px 'JetBrains Mono', monospace`
        ctx!.fillStyle = color
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.fillText(DRAGON_CHARS[ci], 0, Math.sin(time * 5 + i * 0.35) * 1.5)
        if (breathing && i < 3) {
          ctx!.globalAlpha = 0.3
          ctx!.fillStyle = PHOS_HI
          ctx!.fillText(DRAGON_CHARS[ci], 0, Math.sin(time * 5 + i * 0.35) * 1.5)
        }
        ctx!.restore()
      }

      // Eyes
      const ha = Math.atan2((pointer.active ? pointer.y : chY[1]) - chY[0], (pointer.active ? pointer.x : chX[1]) - chX[0])
      const ex = chX[0] + Math.cos(ha + 0.5) * 10
      const ey = chY[0] + Math.sin(ha + 0.5) * 10
      ctx!.globalAlpha = breathing ? 0.25 : 0.12
      ctx!.fillStyle = ACCENT
      ctx!.beginPath()
      ctx!.arc(ex, ey, breathing ? 18 : 12, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.globalAlpha = 1
      ctx!.fillStyle = breathing ? PHOS_HI : ACCENT
      ctx!.font = `16px 'JetBrains Mono', monospace`
      ctx!.textAlign = 'center'
      ctx!.textBaseline = 'middle'
      ctx!.fillText(time % 5 > 4.7 ? '—' : breathing ? '◉' : '⊙', ex, ey)
      ctx!.globalAlpha = 1
    }

    function render() {
      ctx!.clearRect(0, 0, W, H)
      ctx!.save()
      ctx!.translate(shakeX, shakeY)
      drawRunes()
      drawLetters()
      drawDragon()
      drawParticles()
      ctx!.restore()
    }

    function frame(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      time += dt

      // Pointer goes idle after ~2.5s without movement → the dragon roams.
      pointerIdleT += dt
      if (pointerIdleT > 2.5) pointer.active = false

      // Schedule the next autonomous breath.
      if (time >= nextFireAt) {
        breathUntil = time + 0.9 + Math.random() * 0.5
        nextFireAt = time + 9 + Math.random() * 4
      }
      breathing = time < breathUntil

      updateShake()
      updateChain()
      interactLetters(dt)
      emitFire(dt)
      updateParticlesAndEmbers(dt)
      render()
      raf = requestAnimationFrame(frame)
    }

    // ── Reduced motion: a single static frame ──
    function staticFrame() {
      // Coil the chain into a settled S near the title, so the silhouette reads
      // without motion (and stays in the masthead, not the whole tall band).
      const cyc = boxY + boxH * 0.5
      const amp = Math.max(70, boxH * 0.4)
      for (let i = 0; i < chainN; i++) {
        const tt = i / chainN
        chX[i] = Math.min(W - 30, boxX + boxW * 0.82) - tt * boxW * 0.5
        chY[i] = cyc + Math.sin(tt * 6.2) * amp
      }
      ctx!.clearRect(0, 0, W, H)
      drawLetters()
      drawDragon()
    }

    // ── Pointer (global): the canvas can't receive events, so we read the
    // window pointer and convert via the cached canvas rect. The dragon leads
    // toward the cursor anywhere on the page, then auto-roams when idle. ──
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX - rectLeft
      pointer.y = e.clientY - rectTop
      pointer.active = true
      pointerIdleT = 0
    }
    const onScroll = () => {
      const r = canvas.getBoundingClientRect()
      rectLeft = r.left
      rectTop = r.top
    }

    let resizeRaf = 0
    const onResize = () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        build()
        if (reduced) staticFrame()
      })
    }

    build()
    if (reduced) {
      staticFrame()
    } else {
      raf = requestAnimationFrame(frame)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Re-measure once the webfont swaps in (cached glyph widths would be stale).
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        resetPretextCache()
        buildLetters()
        if (reduced) staticFrame()
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [nameEn, nameKr, title])

  return (
    <canvas
      ref={canvasRef}
      className="rz-hero-canvas"
      aria-hidden
      title="click & hold to breathe fire — move to lead the dragon"
    />
  )
}
