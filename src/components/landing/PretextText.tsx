'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { prepare, layoutLines, resetPretextCache } from '@/lib/pretext'

type Props = {
  text: string
  fontFamily: string
  fontWeight: number
  fontPx: number
  color: string
  width: number
  height: number
  delay?: number // ms before the letters start assembling
  letterSpacing?: number // extra px between glyphs (at fontPx scale)
  style?: CSSProperties
}

type G = { ch: string; hx: number; hy: number; x: number; y: number; vx: number; vy: number; born: number }

/**
 * A line of text rendered on <canvas> with the pretext "letter physics":
 * pretext measures each glyph once and computes its home x; the letters then
 * spring + fade into place from a scattered start, optionally after `delay`.
 * Auto-fits the font size down if the text is wider than the canvas.
 */
export function PretextText({
  text,
  fontFamily,
  fontWeight,
  fontPx,
  color,
  width,
  height,
  delay = 0,
  letterSpacing = 0,
  style,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = ref.current
    if (!canvasEl) return
    const ctxEl = canvasEl.getContext('2d')
    if (!ctxEl) return
    // non-null aliases so the nested closures pass strict tsc
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = ctxEl

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    let baseY = 0
    let curFont = `${fontWeight} ${fontPx}px ${fontFamily}`
    let ls = letterSpacing
    let glyphs: G[] = []
    let raf = 0
    const t0 = performance.now()
    const mouse = { x: -9999, y: -9999 }

    function build() {
      let px = fontPx
      curFont = `${fontWeight} ${px}px ${fontFamily}`
      let layout = layoutLines(prepare(text, curFont), 99999, 1)
      let line = layout.lines[0]
      let count = line ? line.glyphs.length : 0
      ls = letterSpacing
      let tw = layout.width + Math.max(0, count - 1) * ls
      const avail = W - 6
      if (tw > avail && tw > 0) {
        const s = avail / tw
        px = px * s
        ls = letterSpacing * s
        curFont = `${fontWeight} ${px}px ${fontFamily}`
        layout = layoutLines(prepare(text, curFont), 99999, 1)
        line = layout.lines[0]
        count = line ? line.glyphs.length : 0
        tw = layout.width + Math.max(0, count - 1) * ls
      }
      const ox = W / 2 - tw / 2
      baseY = H / 2
      glyphs = []
      let k = 0
      for (const g of line ? line.glyphs : []) {
        const hx = ox + g.x + k * ls
        if (g.ch !== ' ') {
          const ang = k * 2.39996
          glyphs.push({
            ch: g.ch,
            hx,
            hy: baseY,
            x: reduced ? hx : hx + Math.cos(ang) * (W * 0.12),
            y: reduced ? baseY : baseY + Math.sin(ang) * (H * 0.38),
            vx: 0,
            vy: 0,
            born: delay + k * 24,
          })
        }
        k++
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect()
      W = r.width
      H = r.height
      canvas.width = Math.round(W * DPR)
      canvas.height = Math.round(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
      build()
    }

    function frame(now: number) {
      const t = now - t0
      ctx.clearRect(0, 0, W, H)
      ctx.font = curFont
      ctx.textBaseline = 'middle'
      for (const g of glyphs) {
        const age = t - g.born
        if (age < 0) continue
        if (!reduced) {
          g.vx += (g.hx - g.x) * 0.014
          g.vy += (g.hy - g.y) * 0.014
          // hover: letters are pushed away from the cursor, then spring back
          const dx = g.x - mouse.x
          const dy = g.y - mouse.y
          const d2 = dx * dx + dy * dy
          const R = 54
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1
            const f = (1 - d / R) * 2.6
            g.vx += (dx / d) * f
            g.vy += (dy / d) * f
          }
          g.vx *= 0.8
          g.vy *= 0.8
          g.x += g.vx
          g.y += g.vy
        } else {
          g.x = g.hx
          g.y = g.hy
        }
        ctx.globalAlpha = Math.min(1, age / 460)
        ctx.fillStyle = color
        ctx.fillText(g.ch, g.x, g.y)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    const onLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
    }
    canvas.addEventListener('pointermove', onPointer)
    canvas.addEventListener('pointerleave', onLeave)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        resetPretextCache()
        build()
      })
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [text, fontFamily, fontWeight, fontPx, color, width, height, delay, letterSpacing])

  return <canvas ref={ref} aria-label={text} style={{ width, height, display: 'block', pointerEvents: 'auto', ...style }} />
}
