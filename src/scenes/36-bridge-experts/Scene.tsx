'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { rgba, mix } from '../_host/color'
import type { RGB } from '../_host/color'
import { PALETTE_WARM, PALETTE_COLD_BLUE, PALETTE_TEAL, PALETTE_TEAL_HI } from '../_host/palette'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE 09 · 해결 — THE BRIDGE  (36-bridge-experts.html 이식)
   제조와 디지털의 양방향 이해를 하나의 교차점으로 수렴하는 ∞ 브리지로 표현한다.
   ════════════════════════════════════════════════════════════════ */

type Particle = { u: number; dir: 1 | -1; sz: number }
type Chevron = { base: number; dir: 1 | -1 }

const WARM: RGB = PALETTE_WARM
const COLD: RGB = PALETTE_COLD_BLUE
const CONV: RGB = PALETTE_TEAL
const CONVH: RGB = PALETTE_TEAL_HI
const WHITE: RGB = [255, 255, 255]

const CYCLE = 6.6
const YS_WIDE = 0.6
const YS_TALL = 0.66

const PARTICLES: Particle[] = Array.from({ length: 34 }, (_, i) => ({
  u: i / 34,
  dir: i % 2 === 0 ? 1 : -1,
  sz: 1.0 + (i % 4) * 0.45,
}))

const CHEVRONS: Chevron[] = Array.from({ length: 2 }, (_, d) =>
  Array.from({ length: 3 }, (_, k) => ({ base: k / 3, dir: d === 0 ? 1 : -1 }) as Chevron)
).flat()

const frac = (x: number) => x - Math.floor(x)

function lem(t: number, cx: number, cy: number, a: number, ys: number): [number, number] {
  const c = Math.cos(t)
  const sn = Math.sin(t)
  const den = 1 + sn * sn
  return [cx + (a * c) / den, cy + (a * ys * sn * c) / den]
}

function centerDist(t: number) {
  const d = Math.min(Math.abs(t - Math.PI / 2), Math.abs(t - (3 * Math.PI) / 2))
  return Math.min(1, d / (Math.PI / 2))
}

function colAt(x: number, cx: number, a: number): RGB {
  const f = Math.min(1, Math.abs(x - cx) / a)
  const ease = f * f
  return x < cx ? mix(CONV, WARM, ease) : mix(CONV, COLD, ease)
}

function drawRibbon(g: CanvasRenderingContext2D, time: number, beat: number, cx: number, cy: number, a: number, ys: number) {
  const steps = 260

  g.save()
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = rgba(CONV, 0.05 + 0.03 * beat)
  g.lineWidth = 14
  g.shadowColor = rgba(CONV, 0.5)
  g.shadowBlur = 22
  g.beginPath()
  for (let i = 0; i <= steps; i++) {
    const p = lem((i / steps) * Math.PI * 2, cx, cy, a, ys)
    if (i === 0) g.moveTo(p[0], p[1])
    else g.lineTo(p[0], p[1])
  }
  g.stroke()
  g.restore()

  const wf = frac(time / CYCLE)
  const waveAmp = 1 - wf
  g.save()
  g.lineCap = 'round'
  let prev = lem(0, cx, cy, a, ys)
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const p = lem(t, cx, cy, a, ys)
    const cd = centerDist(t)
    const base = colAt((prev[0] + p[0]) / 2, cx, a)
    const dw = Math.abs(cd - wf)
    const wave = Math.exp(-(dw * dw) * 90) * waveAmp
    const lit = 0.3 + 0.45 * wave + 0.1 * beat
    const col = mix(base, CONVH, 0.25 * wave)
    g.strokeStyle = rgba(col, lit)
    g.lineWidth = 1.6 + 1.6 * wave
    g.shadowColor = rgba(col, 0.6)
    g.shadowBlur = 6 + 10 * wave
    g.beginPath()
    g.moveTo(prev[0], prev[1])
    g.lineTo(p[0], p[1])
    g.stroke()
    prev = p
  }
  g.restore()
}

function drawParticles(g: CanvasRenderingContext2D, time: number, cx: number, cy: number, a: number, ys: number) {
  const speed = 0.045
  g.save()
  PARTICLES.forEach((pt) => {
    const t = frac(pt.u + pt.dir * time * speed) * Math.PI * 2
    const p = lem(t, cx, cy, a, ys)
    const cd = centerDist(t)
    const near = 1 - cd
    const col = mix(colAt(p[0], cx, a), CONVH, near * 0.7)
    const r = pt.sz * (1 + 0.9 * near)
    const grad = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r * 6)
    grad.addColorStop(0, rgba(col, 0.4 * (0.4 + 0.6 * near)))
    grad.addColorStop(1, rgba(col, 0))
    g.fillStyle = grad
    g.beginPath()
    g.arc(p[0], p[1], r * 6, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = rgba(mix(col, WHITE, 0.3 * near), 0.55 + 0.4 * near)
    g.shadowColor = rgba(col, 0.9)
    g.shadowBlur = 10
    g.beginPath()
    g.arc(p[0], p[1], r, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
  })
  g.restore()
}

function drawChevrons(g: CanvasRenderingContext2D, time: number, cx: number, cy: number, a: number, ys: number) {
  const speed = 0.045
  g.save()
  CHEVRONS.forEach((cv) => {
    const t = frac(cv.base + cv.dir * time * speed) * Math.PI * 2
    const p = lem(t, cx, cy, a, ys)
    const cd = centerDist(t)
    const near = 1 - cd
    const dt = 0.02
    const pa = lem(t - dt, cx, cy, a, ys)
    const pb = lem(t + dt, cx, cy, a, ys)
    let ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0])
    if (cv.dir < 0) ang += Math.PI
    const col = mix(colAt(p[0], cx, a), CONVH, near * 0.6)
    const size = 9 + 5 * near
    const alpha = 0.18 + 0.42 * near
    g.save()
    g.translate(p[0], p[1])
    g.rotate(ang)
    g.strokeStyle = rgba(col, alpha)
    g.lineWidth = 2.2
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.shadowColor = rgba(col, 0.55)
    g.shadowBlur = 8
    g.beginPath()
    g.moveTo(-size * 0.5, -size * 0.7)
    g.lineTo(size * 0.55, 0)
    g.lineTo(-size * 0.5, size * 0.7)
    g.stroke()
    g.restore()
  })
  g.restore()
}

function drawNode(g: CanvasRenderingContext2D, time: number, beat: number, cx: number, cy: number, a: number) {
  const pulse = 0.5 + 0.5 * Math.sin((time * (Math.PI * 2)) / CYCLE)
  const r = 8 + 4 * pulse
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r * 9)
  grad.addColorStop(0, rgba(CONVH, 0.5))
  grad.addColorStop(0.4, rgba(CONV, 0.22))
  grad.addColorStop(1, rgba(CONV, 0))
  g.fillStyle = grad
  g.beginPath()
  g.arc(cx, cy, r * 9, 0, Math.PI * 2)
  g.fill()

  const rf = frac(time / CYCLE)
  const ringA = (1 - rf) * 0.5
  if (ringA > 0.01) {
    g.strokeStyle = rgba(CONV, ringA)
    g.lineWidth = 1.4
    g.shadowColor = rgba(CONV, 0.6)
    g.shadowBlur = 10
    g.beginPath()
    g.arc(cx, cy, r + rf * a * 0.5, 0, Math.PI * 2)
    g.stroke()
    g.shadowBlur = 0
  }

  g.strokeStyle = rgba(CONV, 0.3 + 0.25 * pulse)
  g.lineWidth = 1
  g.beginPath()
  g.arc(cx, cy, r + 6, 0, Math.PI * 2)
  g.stroke()

  g.fillStyle = rgba(mix(CONVH, WHITE, 0.35), 0.92)
  g.shadowColor = rgba(CONV, 1)
  g.shadowBlur = 22
  g.beginPath()
  g.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
  g.fill()
  g.shadowBlur = 0
}

function drawLabels(g: CanvasRenderingContext2D, time: number, cx: number, cy: number, a: number, h: number) {
  const breath = 0.5 + 0.5 * Math.sin(time * 0.9)
  const lx = cx - a * 0.96
  const rx = cx + a * 0.96
  const ly = cy + h * 0.013
  const ry = cy + h * 0.013
  g.save()
  g.textAlign = 'center'
  g.font = "700 14px 'JetBrains Mono', monospace"
  g.fillStyle = rgba(WARM, 0.7 + 0.2 * breath)
  g.shadowColor = rgba(WARM, 0.4)
  g.shadowBlur = 10
  g.fillText('제조', lx, ly - 9)
  g.shadowBlur = 0
  g.font = "500 9px 'JetBrains Mono', monospace"
  g.fillStyle = rgba(WARM, 0.45)
  g.fillText('MANUFACTURING', lx, ly + 8)

  g.font = "700 14px 'JetBrains Mono', monospace"
  g.fillStyle = rgba(COLD, 0.7 + 0.2 * (1 - breath))
  g.shadowColor = rgba(COLD, 0.4)
  g.shadowBlur = 10
  g.fillText('디지털', rx, ry - 9)
  g.shadowBlur = 0
  g.font = "500 9px 'JetBrains Mono', monospace"
  g.fillStyle = rgba(COLD, 0.45)
  g.fillText('DIGITAL', rx, ry + 8)
  g.restore()
}

function drawAxis(g: CanvasRenderingContext2D, beat: number, cx: number, cy: number, a: number) {
  g.save()
  const grad = g.createLinearGradient(cx - a, 0, cx + a, 0)
  grad.addColorStop(0, rgba(WARM, 0))
  grad.addColorStop(0.5, rgba(CONV, 0.12 + 0.05 * beat))
  grad.addColorStop(1, rgba(COLD, 0))
  g.strokeStyle = grad
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(cx - a * 1.05, cy)
  g.lineTo(cx + a * 1.05, cy)
  g.stroke()
  g.restore()
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const timeOffset = useRef<number | null>(null)

  useSceneReady(onReady)

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, f: Frame) => {
    if (timeOffset.current === null) {
      timeOffset.current = parseFloat(new URLSearchParams(window.location.search).get('t') || '') || 0
    }

    const W = f.w
    const H = f.h
    const CX = W / 2
    const CY = H * 0.5
    const A = Math.min(W * 0.235, H * 0.42)
    const YS = H / W > 0.62 ? YS_TALL : YS_WIDE
    const time = f.t + timeOffset.current
    const beat = 0.5 + 0.5 * Math.sin((time * (Math.PI * 2)) / CYCLE)

    g.clearRect(0, 0, W, H)

    drawAxis(g, beat, CX, CY, A)
    drawRibbon(g, time, beat, CX, CY, A, YS)
    drawChevrons(g, time, CX, CY, A, YS)
    drawParticles(g, time, CX, CY, A, YS)
    drawNode(g, time, beat, CX, CY, A)
    drawLabels(g, time, CX, CY, A, H)
  }, { running })

  return (
    <SceneHost
      className={s.stage}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.04, z: 59, dur: '1.1s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.2) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 60,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.6) 100%)',
          z: 61,
        },
      }}
    >
      <canvas ref={ref} className={s.scene} />

      <div className={`${s.eyebrow} ${s.kr}`}>
        <b>SCENE 09</b> · 해결 — THE BRIDGE
      </div>
      <div className={`${s.frame} ${s.bl}`}>제조 ∞ 디지털</div>
      <div className={`${s.frame} ${s.br}`}>ONE MIND · 양손잡이</div>

      <div className={s.kicker}>
        <span className={s.dot} />
        <span className={`${s.cv} ${s.kr}`}>양방향으로 이해하는 한 사람</span>
      </div>

      <div className={s.hero}>
        <div className={`${s.line} ${s.kr} ${s.line1}`}>
          <span className={s.m}>제조</span>를 이해하는 <span className={s.d}>디지털</span>{' '}
          <span className={s.x}>전문가</span><span className={s.dot}>.</span>
        </div>
        <div className={`${s.line} ${s.kr} ${s.line2}`}>
          <span className={s.lead}>그리고</span> <span className={s.d}>디지털</span>을 이해하는{' '}
          <span className={s.m}>제조</span> <span className={s.x}>전문가</span><span className={s.dot}>.</span>
        </div>
      </div>
      <div className={s.seam}>⟷</div>

      <div className={s.footer}>
        <span className={s.w}>제조</span>
        <span className={s.arr}>⟷</span>
        <span className={s.c}>디지털</span>
        <span className={s.sep}>·</span>
        <span className={s.one}>ONE EXPERT · 한 사람</span>
      </div>

    </SceneHost>
  )
}
