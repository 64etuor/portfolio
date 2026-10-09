'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { rgba, mix } from '../_host/color'
import type { RGB } from '../_host/color'
import { PALETTE_TEAL, PALETTE_TEAL_HI } from '../_host/palette'
import { ease, smoothstep as ramp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

const CYCLE = 14.0
const T_REACH0 = 2.6
const T_REACH1 = 5.6
const T_WARM0 = 5.6
const T_WARM1 = 7.4
const T_HOLD1 = 10.8
const T_DIS1 = 13.3

type Color = RGB
type Point = [number, number]
type NodePoint = { x: number; y: number; i: number; ph: number }

const COLD: Color = [150, 150, 150]
const TEAL: Color = PALETTE_TEAL
const TEALH: Color = PALETTE_TEAL_HI

function makeNode(x: number, y: number, i: number): NodePoint {
  return { x, y, i, ph: i * 0.74 + (i % 2 ? 0.9 : 0) }
}

function buildShores(W: number, H: number) {
  const leftNodes: NodePoint[] = []
  const rightNodes: NodePoint[] = []
  const n = 8
  const cy = H * 0.705
  const span = H * 0.4
  const LX = W * 0.13
  const RX = W * 0.87
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    const yy = cy - span / 2 + f * span
    const bulge = Math.sin(f * Math.PI) * (W * 0.04)
    leftNodes.push(makeNode(LX + bulge, yy, i))
    rightNodes.push(makeNode(RX - bulge, yy, i))
  }
  return { leftNodes, rightNodes, anchorI: Math.floor(n / 2) }
}

function B(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  const uu = u * u
  const uuu = uu * u
  const tt = t * t
  const ttt = tt * t
  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
  ]
}

function nodeBrightness(n: NodePoint, time: number, sideOff: number, sync: number) {
  const asyncB = 0.5 + 0.5 * Math.sin(time * 1.55 + n.ph + sideOff)
  const syncB = 0.5 + 0.5 * Math.sin(time * 2.15)
  return asyncB * (1 - sync) + syncB * sync
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  arr: NodePoint[],
  anchorI: number,
  time: number,
  sideOff: number,
  warm: number,
  sync: number
) {
  arr.forEach((n) => {
    const b = nodeBrightness(n, time, sideOff, sync)
    const isAnchor = n.i === anchorI
    const col = mix(COLD, TEAL, warm)
    const baseR = (isAnchor ? 3.6 : 2.4) + (n.i % 3) * 0.3
    const r = baseR * (1 + 0.32 * b + 0.55 * warm)
    const a = 0.22 + 0.5 * b + 0.22 * warm

    if (warm > 0.05 || b > 0.7) {
      const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5.5)
      gr.addColorStop(0, rgba(mix(COLD, TEALH, warm), 0.34 * (0.4 + 0.6 * b) * (0.3 + 0.7 * warm)))
      gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(n.x, n.y, r * 5.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.fillStyle = rgba(col, a)
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fill()

    if (isAnchor) {
      ctx.beginPath()
      ctx.strokeStyle = rgba(mix(COLD, TEAL, warm), 0.35 + 0.4 * warm)
      ctx.lineWidth = 1
      ctx.arc(n.x, n.y, r + 4 + 2 * b, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.fillStyle = rgba(mix([255, 255, 255], TEALH, warm), 0.25 + 0.45 * b)
    ctx.arc(n.x - r * 0.28, n.y - r * 0.28, r * 0.34, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawShoreLinks(
  ctx: CanvasRenderingContext2D,
  arr: NodePoint[],
  time: number,
  sideOff: number,
  warm: number,
  sync: number
) {
  ctx.lineWidth = 1
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i]
    const b = arr[i + 1]
    const br = (nodeBrightness(a, time, sideOff, sync) + nodeBrightness(b, time, sideOff, sync)) * 0.5
    const col = mix(COLD, TEAL, warm)
    ctx.strokeStyle = rgba(col, 0.06 + 0.1 * br + 0.1 * warm)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function drawFilament(
  ctx: CanvasRenderingContext2D,
  p0: Point,
  cp1: Point,
  cp2: Point,
  p3: Point,
  reach: number,
  reaching: boolean,
  warm: number,
  time: number
) {
  const N = 64
  const lim = Math.floor(N * reach)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const col = mix(TEAL, TEALH, 0.3 + 0.4 * warm)
  ctx.strokeStyle = rgba(TEAL, 0.1 + 0.18 * warm)
  ctx.lineWidth = 7 + 5 * warm
  ctx.shadowColor = rgba(TEAL, 0.6)
  ctx.shadowBlur = 16 + 10 * warm
  ctx.beginPath()
  for (let i = 0; i <= lim; i++) {
    const pt = B(p0, cp1, cp2, p3, i / N)
    if (i === 0) ctx.moveTo(pt[0], pt[1])
    else ctx.lineTo(pt[0], pt[1])
  }
  ctx.stroke()
  ctx.shadowBlur = 8 + 6 * warm
  ctx.strokeStyle = rgba(col, 0.55 + 0.4 * warm)
  ctx.lineWidth = 1.5 + 0.8 * warm
  ctx.beginPath()
  let headPt = p0
  for (let i = 0; i <= lim; i++) {
    const pt = B(p0, cp1, cp2, p3, i / N)
    if (i === 0) ctx.moveTo(pt[0], pt[1])
    else ctx.lineTo(pt[0], pt[1])
    headPt = pt
  }
  ctx.stroke()
  ctx.restore()

  if (reaching && reach < 0.995) {
    const exact = B(p0, cp1, cp2, p3, reach)
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = rgba(TEALH, 0.95)
    ctx.shadowColor = rgba(TEAL, 1)
    ctx.shadowBlur = 20
    ctx.arc(exact[0], exact[1], 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = rgba(TEAL, 0.4)
    ctx.lineWidth = 1
    for (let s = -1; s <= 1; s++) {
      const ang = Math.atan2(exact[1] - headPt[1], exact[0] - headPt[0]) + s * 0.5
      ctx.beginPath()
      ctx.moveTo(exact[0], exact[1])
      ctx.lineTo(exact[0] + Math.cos(ang) * (10 + 6 * Math.sin(time * 9 + s)), exact[1] + Math.sin(ang) * (10 + 6 * Math.sin(time * 9 + s)))
      ctx.stroke()
    }
    ctx.restore()
  }
}

function drawSecondary(
  ctx: CanvasRenderingContext2D,
  leftNodes: NodePoint[],
  rightNodes: NodePoint[],
  H: number,
  time: number,
  warm: number
) {
  const pairs = [
    [2, 3],
    [5, 4],
    [3, 6],
  ]
  ctx.save()
  ctx.lineWidth = 1
  pairs.forEach((pr, idx) => {
    const a = leftNodes[pr[0]]
    const b = rightNodes[pr[1]]
    if (!a || !b) return
    const grow = ease(ramp(0.4 + idx * 0.12, 0.9, warm))
    if (grow <= 0.01) return
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 + H * 0.07 * (idx % 2 ? 1 : -1)
    const steps = 40
    const lim = Math.floor(steps * grow)
    ctx.strokeStyle = rgba(TEAL, 0.05 + 0.1 * warm)
    ctx.beginPath()
    for (let i = 0; i <= lim; i++) {
      const t = i / steps
      const u = 1 - t
      const x = u * u * a.x + 2 * u * t * mx + t * t * b.x
      const y = u * u * a.y + 2 * u * t * my + t * t * b.y
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  })
  ctx.restore()
}

function drawChasm(ctx: CanvasRenderingContext2D, W: number, H: number, time: number, warm: number) {
  const cx = W / 2
  const y0 = H * 0.5
  const y1 = H * 0.92
  const a = 0.42 * (1 - warm)
  if (a < 0.01) return
  ctx.save()
  ctx.strokeStyle = rgba([20, 20, 20], 1)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(cx, y0)
  const segs = 14
  for (let i = 1; i <= segs; i++) {
    const f = i / segs
    const yy = y0 + (y1 - y0) * f
    const jag = (Math.sin(i * 2.3 + time * 0.6) * 0.5 + Math.sin(i * 5.1) * 0.5) * W * 0.012 * (1 - warm)
    ctx.lineTo(cx + jag, yy)
  }
  ctx.strokeStyle = rgba([90, 90, 90], a * 0.5 + 0.05 * Math.sin(time * 3))
  ctx.lineWidth = 1.4
  ctx.shadowColor = 'rgba(0,0,0,0.9)'
  ctx.shadowBlur = 6
  ctx.stroke()
  ctx.restore()
}

function drawLabels(ctx: CanvasRenderingContext2D, leftNodes: NodePoint[], rightNodes: NodePoint[], warm: number) {
  const col = mix([120, 120, 120], TEAL, warm)
  ctx.save()
  ctx.font = "600 13px var(--mono), monospace"
  ctx.textAlign = 'center'
  const lTop = leftNodes[0]
  const rTop = rightNodes[0]
  ctx.fillStyle = rgba(col, 0.55 + 0.3 * warm)
  ctx.font = "700 15px 'JetBrains Mono', 'Pretendard Variable', monospace"
  ctx.fillText('현장', lTop.x, lTop.y - 26)
  ctx.fillText('기술', rTop.x, rTop.y - 26)
  ctx.font = "500 9.5px 'JetBrains Mono', 'Pretendard Variable', monospace"
  ctx.fillStyle = rgba(col, 0.4 + 0.25 * warm)
  ctx.fillText('FIELD · 공정·설비·사람', lTop.x, lTop.y - 12)
  ctx.fillText('TECH · 데이터·AI·시스템', rTop.x, rTop.y - 12)
  ctx.restore()
}

export default function Scene({ running = true, locale = 'ko', onReady }: SceneProps) {
  const english = locale === 'en'
  const line1Ref = useRef<HTMLDivElement | null>(null)
  const line1negRef = useRef<HTMLSpanElement | null>(null)
  const line2Ref = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<HTMLSpanElement | null>(null)
  const lastStatus = useRef('')

  useSceneReady(onReady)

  const ref = useSceneCanvas((ctx: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w
    const H = fr.h
    const elapsed = fr.t
    const tt = elapsed % CYCLE
    const time = elapsed
    const { leftNodes, rightNodes, anchorI } = buildShores(W, H)

    const reach = Math.max(0, ramp(T_REACH0, T_REACH1, tt) - ramp(T_HOLD1, T_DIS1, tt))
    const warm = Math.max(0, ramp(T_WARM0, T_WARM1, tt) - ramp(T_HOLD1, T_DIS1, tt))
    const sync = warm
    const reaching = tt > T_REACH0 && tt < T_REACH1
    let flash = 0
    if (tt > T_REACH1 - 0.12 && tt < T_REACH1 + 0.75) {
      flash = Math.max(0, 1 - (tt - (T_REACH1 - 0.12)) / 0.87)
      flash *= flash
    }

    const setStatus = (txt: string, col: string) => {
      if (txt === lastStatus.current) return
      lastStatus.current = txt
      if (!statusRef.current) return
      statusRef.current.textContent = txt
      statusRef.current.style.color = col
      statusRef.current.style.textShadow = `0 0 12px ${col.replace('1)', '0.45)')}`
    }

    if (tt < T_REACH0) setStatus('현장 ↔ 기술 · 단절', 'rgba(141,141,141,1)')
    else if (tt < T_REACH1) setStatus('연결선 전개 중', 'rgba(79,224,196,1)')
    else if (tt < T_HOLD1) setStatus('연결 — 동기화', 'rgba(79,224,196,1)')
    else setStatus('연결 유지 · 잔광', 'rgba(141,141,141,1)')

    if (line1Ref.current) line1Ref.current.style.opacity = (0.92 - 0.55 * warm).toFixed(3)
    if (line1negRef.current) line1negRef.current.style.setProperty('--strike', (ease(ramp(0.6, 2.4, tt)) * (1 - warm)).toFixed(3))
    if (line2Ref.current) {
      line2Ref.current.style.opacity = warm.toFixed(3)
      line2Ref.current.style.transform = `translateY(${(14 * (1 - warm)).toFixed(1)}px)`
    }

    ctx.clearRect(0, 0, W, H)

    const lA = leftNodes[anchorI]
    const rA = rightNodes[anchorI]

    drawChasm(ctx, W, H, time, warm)
    drawShoreLinks(ctx, leftNodes, time, 0, warm, sync)
    drawShoreLinks(ctx, rightNodes, time, Math.PI, warm, sync)

    const mx = (lA.x + rA.x) / 2
    const dip = H * 0.12
    const wob = (reaching ? 1 - reach : 0) * Math.sin(time * 6.2) * H * 0.03
    const p0: Point = [lA.x, lA.y]
    const p3: Point = [rA.x, rA.y]
    const cp1: Point = [lA.x + (mx - lA.x) * 0.42, lA.y + dip * 0.55 + wob]
    const cp2: Point = [rA.x - (rA.x - mx) * 0.42, rA.y + dip * 0.55 - wob]

    if (reach > 0.001) drawFilament(ctx, p0, cp1, cp2, p3, reach, reaching, warm, time)

    if (flash > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(rA.x, rA.y, 8 + (1 - flash) * 46, 0, Math.PI * 2)
      ctx.strokeStyle = rgba(TEALH, 0.75 * flash)
      ctx.lineWidth = 2.0 * flash + 0.4
      ctx.shadowColor = rgba(TEAL, 0.8)
      ctx.shadowBlur = 18 * flash
      ctx.stroke()
      ctx.restore()
    }

    if (warm > 0.55 && reach > 0.98) {
      for (let k = 0; k < 3; k++) {
        const pp = (time * 0.42 + k * 0.34) % 1
        const pt = B(p0, cp1, cp2, p3, pp)
        const fade = Math.sin(pp * Math.PI)
        const a = 0.85 * warm * fade
        const r = 3.4 * fade + 1.2
        ctx.beginPath()
        ctx.fillStyle = rgba(TEALH, a)
        ctx.shadowColor = rgba(TEAL, 0.9)
        ctx.shadowBlur = 14
        ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    if (warm > 0.35) {
      drawSecondary(ctx, leftNodes, rightNodes, H, time, warm)
    }

    drawNodes(ctx, leftNodes, anchorI, time, 0, warm, sync)
    drawNodes(ctx, rightNodes, anchorI, time, Math.PI, warm, sync)
    drawLabels(ctx, leftNodes, rightNodes, warm)
  }, { running })

  return (
    <SceneHost
      className={s.root}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.04, z: 59, dur: '1.1s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.22) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 60,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 52%, rgba(0, 0, 0, 0.62) 100%)',
          z: 61,
        },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={`${s.sceneId} ${s.kr}`}>
        <b>SCENE 08</b> · {english ? 'CONNECTION' : '연결'} — THE CONNECTOR
      </div>

      <div className={s.kicker}>
        <span className={s.dot} />
        <span ref={statusRef} className={s.status}>
          현장 ↔ 기술 · 단절
        </span>
      </div>

      <div className={s.hero}>
        <div className={`${s.line1} ${s.kr}`} ref={line1Ref}>
          {english ? <>The key to successful DX and AX is <span className={s.neg} ref={line1negRef}>not technology.</span></> : <>성공적인 DX·AX의 핵심은 기술이 <span className={s.neg} ref={line1negRef}>아닙니다.</span></>}
        </div>
        <div className={`${s.line2} ${s.kr}`} ref={line2Ref}>
          {english ? <>It is the person who <span className={s.acc}>connects</span> <span className={s.acc}>the field and technology.</span></> : <>현장과 기술을 <span className={s.acc}>연결</span>하는 <span className={s.acc}>사람</span>입니다.</>}
        </div>
      </div>

      <div className={s.footer}>
        <span>
          <b>FIELD</b> ⟶ ⟵ <b>TECH</b>
        </span>
      </div>

    </SceneHost>
  )
}
