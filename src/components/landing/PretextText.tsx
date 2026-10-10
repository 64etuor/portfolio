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
  fontStyle?: string // e.g. 'italic' (prefixed onto the canvas font shorthand)
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
  fontStyle = '',
  style,
}: Props) {
  const stylePrefix = fontStyle ? `${fontStyle} ` : ''
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
    let curFont = `${stylePrefix}${fontWeight} ${fontPx}px ${fontFamily}`
    let ls = letterSpacing
    let glyphs: G[] = []
    let raf = 0
    const t0 = performance.now()
    const mouse = { x: -9999, y: -9999 }

    function build() {
      let px = fontPx
      curFont = `${stylePrefix}${fontWeight} ${px}px ${fontFamily}`
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
        curFont = `${stylePrefix}${fontWeight} ${px}px ${fontFamily}`
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

    // 루프는 글자가 (a) 등장/스프링 중이거나 (b) 커서가 위에 있을 때만 돈다.
    // 모두 제자리에 안착하고 커서가 떠나면 스스로 멈춰(raf=0) 홈 화면에서 4개의
    // 영구 60fps 캔버스 redraw 가 도는 것을 막는다. pointermove/resize 시 재개.
    function frame(now: number) {
      const t = now - t0
      ctx.clearRect(0, 0, W, H)
      ctx.font = curFont
      ctx.textBaseline = 'middle'
      let active = false // 이번 프레임에 아직 움직이거나 페이드 중인 글자가 있나
      const hovering = mouse.x > -9000
      for (const g of glyphs) {
        const age = t - g.born
        if (age < 0) {
          active = true // 아직 등장 전 → 계속 진행
          continue
        }
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
          // 속도/오차가 남아 있으면 아직 움직이는 중
          if (g.vx * g.vx + g.vy * g.vy > 0.01 || (g.hx - g.x) ** 2 + (g.hy - g.y) ** 2 > 0.25) active = true
        } else {
          g.x = g.hx
          g.y = g.hy
        }
        const alpha = Math.min(1, age / 460)
        if (alpha < 1) active = true // 아직 페이드인 중
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.fillText(g.ch, g.x, g.y)
      }
      ctx.globalAlpha = 1
      raf = active || hovering ? requestAnimationFrame(frame) : 0
    }
    const ensureRunning = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    resize()
    const onResizeRun = () => {
      resize()
      ensureRunning() // 리사이즈로 레이아웃이 바뀌면 다시 안착 애니메이션
    }
    window.addEventListener('resize', onResizeRun)
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
      ensureRunning() // 멈춰 있었다면 hover 상호작용을 위해 재개
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
        ensureRunning()
      })
    }
    ensureRunning()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResizeRun)
      canvas.removeEventListener('pointermove', onPointer)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [text, fontFamily, fontWeight, fontPx, color, width, height, delay, letterSpacing, stylePrefix])

  // Canvas pixels are invisible to assistive tech; the caller renders the same copy as
  // real (visually-hidden) text, so the canvas itself is decorative.
  return <canvas ref={ref} aria-hidden style={{ width, height, display: 'block', pointerEvents: 'auto', ...style }} />
}
