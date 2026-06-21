'use client'

import { useEffect, useRef, useState } from 'react'
import { prepare, resetPretextCache } from '@/lib/pretext'

/**
 * PretextHeading — a section heading (`// EXPERIENCE`) drawn on a tiny canvas
 * whose glyphs are positioned by the pretext engine's measured widths
 * (`prepare()`), then animated: a one-time "assembly" when the heading scrolls
 * into view (each glyph springs from a small scatter to its measured home) and
 * a gentle cursor-following ripple on hover.
 *
 * Progressive enhancement: the server renders the real `// LABEL` text, so the
 * heading is correct with no JS and fully accessible. Once mounted (and motion
 * is allowed), the text is moved off-screen for assistive tech and the canvas
 * takes over the visual. `prefers-reduced-motion` keeps the plain text.
 */

const MARK = '//'
const DIM = '#8d8d8d'
const ACCENT = '#5fb5c2'

type Glyph = { ch: string; x: number; w: number; accent: boolean }

export function PretextHeading({ label, id }: { label: string; id?: string }) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [enhanced, setEnhanced] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return
    const c = canvas.getContext('2d')
    if (!c) return
    // Reveal the canvas (and clip the text) BEFORE measuring, so the canvas has
    // a real box; setEnhanced keeps the class on subsequent React renders.
    h2Ref.current?.classList.add('rz-h2--canvas')
    setEnhanced(true)

    const text = `${MARK} ${label}`
    // font/letter-spacing mirror the .rz-h2 rule (12px JetBrains Mono, 0.34em).
    const FS = 12
    const FONT = `600 ${FS}px 'JetBrains Mono', ui-monospace, monospace`
    const TRACK = FS * 0.34
    const BASE_Y = 13

    let glyphs: Glyph[] = []
    let cssW = 0
    let cssH = 0
    let raf = 0
    let assemble = 0 // 0 → 1 entrance progress
    let assembling = false
    let hoverX = -1
    let hoverT = 0 // decays after the pointer leaves

    function layout() {
      if (!canvas || !c) return
      const rect = canvas.getBoundingClientRect()
      cssW = rect.width
      cssH = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)

      const prepared = prepare(text, FONT)
      glyphs = []
      let x = 0
      let idx = 0
      for (const u of prepared.units) {
        for (const g of u.glyphs) {
          if (g.ch !== ' ') glyphs.push({ ch: g.ch, x, w: g.w, accent: idx < MARK.length })
          x += g.w + TRACK
          idx++
        }
      }
    }

    function draw() {
      if (!c) return
      c.clearRect(0, 0, cssW, cssH)
      c.font = FONT
      c.textBaseline = 'alphabetic'
      c.textAlign = 'left'
      const e = easeOut(assemble)
      const n = glyphs.length
      for (let i = 0; i < n; i++) {
        const g = glyphs[i]
        // Staggered entrance: each glyph reaches home a little after the last.
        const start = (i / n) * 0.55
        const gp = clamp((e - start) / 0.45, 0, 1)
        const ge = easeOut(gp)
        const dy = (1 - ge) * 9
        let alpha = ge
        let y = BASE_Y + dy
        // Hover ripple — a soft bump that follows the cursor.
        if (hoverT > 0) {
          const d = Math.abs(g.x + g.w / 2 - hoverX)
          const bump = Math.max(0, 1 - d / 46) * hoverT
          y -= bump * 5
          alpha = Math.min(1, alpha + bump * 0.001)
        }
        c.globalAlpha = Math.max(0, Math.min(1, alpha))
        c.fillStyle = g.accent ? ACCENT : DIM
        c.shadowColor = g.accent ? 'rgba(95,181,194,0.5)' : 'transparent'
        c.shadowBlur = g.accent ? 6 : 0
        c.fillText(g.ch, g.x, y)
      }
      c.globalAlpha = 1
      c.shadowBlur = 0
    }

    function tick() {
      let busy = false
      if (assembling && assemble < 1) {
        assemble = Math.min(1, assemble + 0.035)
        busy = true
      }
      if (hoverT > 0 && hoverX < 0) {
        hoverT = Math.max(0, hoverT - 0.06)
      }
      if (hoverT > 0) busy = true
      draw()
      if (busy) {
        raf = requestAnimationFrame(tick)
      } else {
        raf = 0
      }
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    layout()
    draw()

    // Entrance on scroll-in (once).
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            assembling = true
            kick()
            io.disconnect()
          }
        }
      },
      { threshold: 0.4 },
    )
    io.observe(canvas)

    const onMove = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      hoverX = ev.clientX - r.left
      hoverT = 1
      kick()
    }
    const onLeave = () => {
      hoverX = -1
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    let resizeRaf = 0
    const onResize = () => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        layout()
        draw()
      })
    }
    window.addEventListener('resize', onResize)

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        resetPretextCache()
        layout()
        draw()
      })
    }

    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [label])

  return (
    <h2 ref={h2Ref} id={id} className={`rz-h2${enhanced ? ' rz-h2--canvas' : ''}`}>
      <span className="rz-h2-mark">{MARK}</span> <span className="rz-h2-text">{label}</span>
      <canvas ref={canvasRef} className="rz-h2-canvas" aria-hidden />
    </h2>
  )
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t)
}
