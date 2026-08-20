'use client'

import { useEffect, useRef } from 'react'
import { prepare, layoutLines, resetPretextCache } from '@/lib/pretext'
import type { Block } from './dragonHeroTypes'
import {
  CFG,
  DIM,
  MAX_EMBERS,
  MAX_PARTICLES,
  PHOS,
  PHOS_HI,
  RUNE_N,
  monoLabel,
  sans,
  sansMed,
} from './dragonHeroPalette'
import {
  type DragonHeroState,
  drawDragon,
  drawLetters,
  emitFire,
  interactLetters,
  render,
  seedChain,
  seedRunes,
  updateChain,
  updateParticlesAndEmbers,
  updateShake,
} from './dragonHeroDrawing'

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
 *
 * This component is a thin orchestrator: it owns the canvas ref, the mutable
 * simulation `state`, DOM measurement/layout, the rAF loop, and pointer/resize
 * wiring. The per-frame physics and draw routines live in `dragonHeroDrawing`,
 * the colors/glyphs/config in `dragonHeroPalette`, and the shapes in
 * `dragonHeroTypes`.
 */
export function ResumeDragonHero({ nameEn, nameKr, title }: { nameEn: string; nameKr: string; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let lastTime = performance.now()

    // Title box (the masthead .rz-hero-spacer), in canvas-local coordinates.
    let boxX = 0
    let boxY = 0
    let boxW = 0
    let boxH = 0

    // ── Pointer (followed globally; the canvas itself is pointer-events:none) ──
    let pointerIdleT = 99 // seconds since last move → auto-roam when large
    let rectLeft = 0
    let rectTop = 0
    // Click-and-hold fire: true while the pointer is pressed (mouse/touch/pen),
    // wired on `window` because the canvas is pointer-events:none. The dragon
    // breathes fire for as long as the button is held, in addition to the
    // occasional autonomous breath.
    let held = false
    // Autonomous fire: a brief breath every ~9–13s keeps the embers/particles
    // alive. It only visibly burns letters when the head happens to be near the
    // name; over body text the blast finds nothing, so it stays unobtrusive.
    let nextFireAt = 5
    let breathUntil = 0

    // ── Mutable simulation state (shared by reference with the draw helpers) ──
    const chainN = CFG.segments
    const state: DragonHeroState = {
      W: 0,
      H: 0,
      time: 0,
      pointer: { x: 0, y: 0, active: false },
      breathing: false,
      shakeIntensity: 0,
      shakeX: 0,
      shakeY: 0,
      chainN,
      chX: new Float32Array(chainN),
      chY: new Float32Array(chainN),
      chPx: new Float32Array(chainN),
      chPy: new Float32Array(chainN),
      letters: [],
      emberCount: 0,
      emX: new Float32Array(MAX_EMBERS),
      emY: new Float32Array(MAX_EMBERS),
      emVx: new Float32Array(MAX_EMBERS),
      emVy: new Float32Array(MAX_EMBERS),
      emLife: new Float32Array(MAX_EMBERS),
      emSize: new Float32Array(MAX_EMBERS),
      emCh: new Array(MAX_EMBERS),
      particleCount: 0,
      pX: new Float32Array(MAX_PARTICLES),
      pY: new Float32Array(MAX_PARTICLES),
      pVx: new Float32Array(MAX_PARTICLES),
      pVy: new Float32Array(MAX_PARTICLES),
      pLife: new Float32Array(MAX_PARTICLES),
      pMaxLife: new Float32Array(MAX_PARTICLES),
      pSize: new Float32Array(MAX_PARTICLES),
      pCh: new Array(MAX_PARTICLES),
      fireAccum: 0,
      totalFireTime: 0,
      runeX: new Float32Array(RUNE_N),
      runeY: new Float32Array(RUNE_N),
      runeSpd: new Float32Array(RUNE_N),
      runePhase: new Float32Array(RUNE_N),
      runeSz: new Float32Array(RUNE_N),
      runeOp: new Float32Array(RUNE_N),
      runeC: [],
    }

    // ── Letters (the name, laid out by pretext) ──
    function buildLetters() {
      state.letters = []
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
            state.letters.push({
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

    // ── Sizing ──
    function build() {
      if (!canvas || !ctx) return
      // The playfield is the masthead only — the height CSS gives .rz-hero-canvas.
      // It used to be stretched down to the bottom of the cover letter so the
      // serpent could roam the body prose, but disturbing the résumé's actual
      // content made the page read as cluttered rather than alive. The dragon is
      // a masthead flourish; the document below it stays still.
      const rect = canvas.getBoundingClientRect()
      state.W = rect.width
      state.H = rect.height
      rectLeft = rect.left
      rectTop = rect.top
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(state.W * dpr)
      canvas.height = Math.round(state.H * dpr)
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
        boxX = Math.max(22, state.W * 0.055)
        boxY = state.H * 0.1
        boxW = Math.min(state.W - boxX * 2, 680)
        boxH = 320
      }

      if (state.pointer.active === false) {
        state.pointer.x = state.W * 0.5
        state.pointer.y = state.H * 0.42
      }
      if (state.chX.length < chainN) {
        state.chX = new Float32Array(chainN)
        state.chY = new Float32Array(chainN)
        state.chPx = new Float32Array(chainN)
        state.chPy = new Float32Array(chainN)
      }
      seedChain(state)
      seedRunes(state)
      buildLetters()
    }

    function frame(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      state.time += dt

      // Pointer goes idle after ~2.5s without movement → the dragon roams.
      pointerIdleT += dt
      if (pointerIdleT > 2.5) state.pointer.active = false

      // Schedule the next autonomous breath.
      if (state.time >= nextFireAt) {
        breathUntil = state.time + 0.9 + Math.random() * 0.5
        nextFireAt = state.time + 9 + Math.random() * 4
      }
      // Held pointer breathes fire immediately; autonomous breath still fires.
      state.breathing = held || state.time < breathUntil

      updateShake(state)
      updateChain(state)
      interactLetters(state, dt)
      emitFire(state, dt)
      updateParticlesAndEmbers(state, dt)
      render(ctx!, state)
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
        state.chX[i] = Math.min(state.W - 30, boxX + boxW * 0.82) - tt * boxW * 0.5
        state.chY[i] = cyc + Math.sin(tt * 6.2) * amp
      }
      ctx!.clearRect(0, 0, state.W, state.H)
      drawLetters(ctx!, state)
      drawDragon(ctx!, state)
    }

    // ── Pointer (global): the canvas can't receive events, so we read the
    // window pointer and convert via the cached canvas rect. The dragon leads
    // toward the cursor anywhere on the page, then auto-roams when idle. ──
    const onMove = (e: PointerEvent) => {
      state.pointer.x = e.clientX - rectLeft
      state.pointer.y = e.clientY - rectTop
      state.pointer.active = true
      pointerIdleT = 0
    }
    const onScroll = () => {
      const r = canvas.getBoundingClientRect()
      rectLeft = r.left
      rectTop = r.top
    }
    // Click & hold anywhere (that isn't an interactive control) → breathe fire,
    // aimed wherever the pointer is. The dragon leads to the press point first.
    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest('a, button, input, textarea, select, label, [role="button"]')
    const onDown = (e: PointerEvent) => {
      if (isInteractive(e.target)) return
      state.pointer.x = e.clientX - rectLeft
      state.pointer.y = e.clientY - rectTop
      state.pointer.active = true
      pointerIdleT = 0
      held = true
    }
    const onUp = () => {
      held = false
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
      window.addEventListener('pointerdown', onDown)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Re-measure once the webfont swaps in (cached glyph widths would be stale).
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        resetPretextCache()
        // Re-measure everything: glyph widths (name) and DOM Range rects (echoes)
        // both shift once Pretendard swaps in, and the cover letter reflows.
        build()
        if (reduced) staticFrame()
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
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
