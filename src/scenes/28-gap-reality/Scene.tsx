'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { clamp, lerp, smooth01 as smooth } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE 03 · 현실 — THE DIVERGENCE  (28-gap-reality.html 이식 / 레퍼런스 포팅)
   기대선·성과선이 좌측 원점에서 포개진 채 출발해 우측으로 갈수록 성과선이
   처지며 void(격차)가 열린다. void 에 caliper 눈금이 돋아 격차를 '측정'한다.
   정적(좌·포개짐) → 동적(우·최대격차). CYCLE 루프로 봉합.
   가짜 수치/난수 텔레메트리 없음 — 모든 모션은 의도된 시간함수.
   ════════════════════════════════════════════════════════════════ */

const CYCLE = 13.0 // seconds, seamless period
const PHOS = '#d7d7d7',
  GAPC = '#5fb5c2',
  DIM = '#8d8d8d',
  DEEP = '#3a3a3a'
const N = 90 // 곡선 샘플 수

function rgba(hex: string, a: number) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const r = parseInt(h.slice(0, 2), 16),
    gg = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${gg},${b},${a})`
}

// 격차 개방량 0(포개짐)..1(최대)
function G(f: number) {
  if (f < 0.1) return 0
  if (f < 0.62) return smooth((f - 0.1) / 0.52)
  if (f < 0.82) {
    const b = (f - 0.62) / 0.2
    return 1 - 0.05 * (0.5 - 0.5 * Math.cos(b * Math.PI * 2))
  }
  return 1 - smooth((f - 0.82) / 0.18)
}
// 화면 밝기 배수 1..0.34..1 (루프 봉합 호흡)
function dip(f: number) {
  if (f < 0.8) return 1
  if (f < 0.9) return 1 - 0.64 * smooth((f - 0.8) / 0.1)
  return 0.36 + 0.64 * smooth((f - 0.9) / 0.1)
}

function geo(W: number, H: number) {
  return { Lx: W * 0.345, Rx: W * 0.935, yBot: H * 0.795, yTop: H * 0.305, maxGap: H * 0.255 }
}
type Q = ReturnType<typeof geo>
const expY = (tx: number, q: Q) => q.yBot + (q.yTop - q.yBot) * (0.3 * tx + 0.7 * smooth(tx))
const gapProf = (tx: number) => Math.pow(smooth(clamp((tx - 0.1) / 0.9, 0, 1)), 1.25)
const realY = (tx: number, q: Q, gv: number) => expY(tx, q) + q.maxGap * gapProf(tx) * gv

function drawDot(g: CanvasRenderingContext2D, x: number, y: number, color: string, pulse: number, dv: number) {
  const r = 4.2
  const hg = g.createRadialGradient(x, y, 0, x, y, r * 5.5)
  hg.addColorStop(0, rgba(color, (0.5 + 0.25 * pulse) * dv))
  hg.addColorStop(1, rgba(color, 0))
  g.fillStyle = hg
  g.beginPath()
  g.arc(x, y, r * 5.5, 0, 7)
  g.fill()
  g.fillStyle = rgba(color, dv)
  g.beginPath()
  g.arc(x, y, r, 0, 7)
  g.fill()
  g.fillStyle = rgba('#ffffff', 0.55 * dv)
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.3, r * 0.34, 0, 7)
  g.fill()
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const s1Ref = useRef<HTMLHeadingElement | null>(null)
  const s2Ref = useRef<HTMLHeadingElement | null>(null)
  const eyebrowRef = useRef<HTMLDivElement | null>(null)
  const legendRef = useRef<HTMLDivElement | null>(null)
  const tickScroll = useRef(0)
  const gridScroll = useRef(0)

  useSceneReady(onReady)

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w,
      H = fr.h
    const t = fr.t
    const f = (t % CYCLE) / CYCLE
    const gv = G(f)
    const dv = dip(f)
    const q = geo(W, H)

    tickScroll.current = (tickScroll.current + 0.0006) % 1
    gridScroll.current = (gridScroll.current + 0.18) % 64

    g.clearRect(0, 0, W, H)

    /* 1) 배경 그리드 */
    g.lineWidth = 1
    g.strokeStyle = rgba('#ffffff', 0.022 * dv)
    for (let gx = q.Lx - gridScroll.current; gx < q.Rx; gx += 64) {
      g.beginPath()
      g.moveTo(gx, q.yTop - H * 0.04)
      g.lineTo(gx, q.yBot + H * 0.02)
      g.stroke()
    }
    for (let gy = q.yTop; gy <= q.yBot + H * 0.02; gy += 64) {
      g.beginPath()
      g.moveTo(q.Lx, gy)
      g.lineTo(q.Rx, gy)
      g.stroke()
    }
    g.strokeStyle = rgba(DEEP, 0.85 * dv)
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(q.Lx, q.yBot)
    g.lineTo(q.Rx, q.yBot)
    g.stroke()

    /* precompute curve points */
    const ex: number[] = [],
      ey: number[] = [],
      rx: number[] = [],
      ry: number[] = []
    for (let i = 0; i <= N; i++) {
      const tx = i / N,
        X = lerp(q.Lx, q.Rx, tx)
      ex.push(X)
      ey.push(expY(tx, q))
      rx.push(X)
      ry.push(realY(tx, q, gv))
    }

    /* 2) VOID fill */
    if (gv > 0.001) {
      g.save()
      g.beginPath()
      g.moveTo(ex[0], ey[0])
      for (let i = 1; i <= N; i++) g.lineTo(ex[i], ey[i])
      for (let i = N; i >= 0; i--) g.lineTo(rx[i], ry[i])
      g.closePath()
      const grad = g.createLinearGradient(0, q.yTop, 0, q.yBot + q.maxGap)
      grad.addColorStop(0, rgba(GAPC, 0.04 * dv))
      grad.addColorStop(1, rgba(GAPC, 0.2 * dv))
      g.fillStyle = grad
      g.fill()

      /* 3) caliper drop-ticks */
      g.clip()
      const TK = 16
      for (let k = 0; k < TK; k++) {
        let tx = (k / TK + tickScroll.current) % 1
        tx = 0.12 + tx * 0.86
        const X = lerp(q.Lx, q.Rx, tx)
        const yT = expY(tx, q),
          yB = realY(tx, q, gv)
        const len = yB - yT
        if (len < 2) continue
        const edgeFade = smooth(clamp((tx - 0.12) / 0.12, 0, 1)) * smooth(clamp((1.0 - tx) / 0.1, 0, 1))
        const a = 0.34 * gapProf(tx) * edgeFade * dv
        g.strokeStyle = rgba(GAPC, a)
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(X, yT)
        g.lineTo(X, yB)
        g.stroke()
        g.strokeStyle = rgba(GAPC, a * 1.3)
        g.beginPath()
        g.moveTo(X - 3, yT)
        g.lineTo(X + 3, yT)
        g.stroke()
        g.beginPath()
        g.moveTo(X - 3, yB)
        g.lineTo(X + 3, yB)
        g.stroke()
      }
      g.restore()
    }

    /* 4) 기대선 */
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.shadowColor = rgba(PHOS, 0.5 * dv)
    g.shadowBlur = 12
    g.strokeStyle = rgba(PHOS, 0.95 * dv)
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(ex[0], ey[0])
    for (let i = 1; i <= N; i++) g.lineTo(ex[i], ey[i])
    g.stroke()
    g.shadowBlur = 0

    /* 5) 성과선 */
    const rgrad = g.createLinearGradient(q.Lx, 0, q.Rx, 0)
    rgrad.addColorStop(0, rgba(PHOS, 0.9 * dv))
    rgrad.addColorStop(0.45, rgba('#9ec9cf', 0.9 * dv))
    rgrad.addColorStop(1, rgba(GAPC, 0.95 * dv))
    g.shadowColor = rgba(GAPC, 0.45 * gv * dv)
    g.shadowBlur = 10
    g.strokeStyle = rgrad
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(rx[0], ry[0])
    for (let i = 1; i <= N; i++) g.lineTo(rx[i], ry[i])
    g.stroke()
    g.shadowBlur = 0

    /* 6) 우측 선단 + 캘리퍼 브래킷 */
    const pulse = 0.5 + 0.5 * Math.sin((t * 1000) / 420)
    const exDx = ex[N],
      exDy = ey[N]
    const rlDx = rx[N],
      rlDy = ry[N]

    if (gv > 0.02) {
      const bx = exDx + 26
      g.strokeStyle = rgba(GAPC, 0.55 * dv)
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(bx, exDy)
      g.lineTo(bx, rlDy)
      g.stroke()
      g.beginPath()
      g.moveTo(bx - 6, exDy)
      g.lineTo(bx + 6, exDy)
      g.stroke()
      g.beginPath()
      g.moveTo(bx - 6, rlDy)
      g.lineTo(bx + 6, rlDy)
      g.stroke()
      const my = (exDy + rlDy) / 2
      g.beginPath()
      g.moveTo(bx, my - 5)
      g.lineTo(bx, my + 5)
      g.stroke()
      g.font = "600 13px 'Pretendard Variable', 'Pretendard', sans-serif"
      g.fillStyle = rgba(GAPC, (0.5 + 0.4 * gv) * dv)
      g.textAlign = 'left'
      g.textBaseline = 'middle'
      g.fillText('격차', bx + 11, my - 8)
      g.font = "700 9px 'JetBrains Mono', monospace"
      g.fillStyle = rgba(GAPC, 0.42 * dv)
      g.fillText('GAP', bx + 11, my + 6)
    }

    drawDot(g, exDx, exDy, PHOS, pulse, dv)
    g.font = "600 17px 'Pretendard Variable', 'Pretendard', sans-serif"
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillStyle = rgba(PHOS, 0.95 * dv)
    g.fillText('기대', exDx + 14, exDy - 2)
    g.font = "700 9px 'JetBrains Mono', monospace"
    g.fillStyle = rgba(DIM, 0.8 * dv)
    g.fillText('EXPECTATION', exDx + 14, exDy + 13)

    drawDot(g, rlDx, rlDy, GAPC, pulse, dv)
    g.font = "700 17px 'Pretendard Variable', 'Pretendard', sans-serif"
    g.fillStyle = rgba(GAPC, 0.98 * dv)
    g.fillText('성과', rlDx + 14, rlDy + (rlDy > exDy ? 2 : -2))
    g.font = "700 9px 'JetBrains Mono', monospace"
    g.fillStyle = rgba(GAPC, 0.6 * dv)
    g.fillText('REALITY', rlDx + 14, rlDy + 17)

    /* 7) 하단 축 캡션 */
    g.font = "10px 'JetBrains Mono', monospace"
    g.fillStyle = rgba(DIM, 0.55 * dv)
    g.textAlign = 'right'
    g.textBaseline = 'alphabetic'
    g.fillText('투자 누적 · 시간  →', q.Rx, q.yBot + H * 0.052)
    g.textAlign = 'left'
    g.save()
    g.translate(q.Lx - 22, (q.yTop + q.yBot) / 2)
    g.rotate(-Math.PI / 2)
    g.fillStyle = rgba(DIM, 0.5 * dv)
    g.fillText('성과  ↑', 0, 0)
    g.restore()

    /* 8) 타이포/레전드 밝기·등장 동기화 */
    const s1op = smooth((f - 0.0) / 0.08) * (f < 0.86 ? 1 : lerp(1, 0.35, smooth((f - 0.86) / 0.14)))
    const s2op = smooth((f - 0.3) / 0.16) * (f < 0.8 ? 1 : 1 - smooth((f - 0.8) / 0.1))
    if (eyebrowRef.current) eyebrowRef.current.style.opacity = (0.9 * dv).toFixed(3)
    if (s1Ref.current) s1Ref.current.style.opacity = (s1op * dv).toFixed(3)
    if (s2Ref.current) {
      s2Ref.current.style.opacity = (clamp(s2op, 0, 1) * dv).toFixed(3)
      s2Ref.current.style.transform = `translateY(${lerp(14, 0, clamp(s2op, 0, 1))}px)`
    }
    if (legendRef.current) legendRef.current.style.opacity = (0.85 * dv).toFixed(3)
  }, { running })

  return (
    <SceneHost className={s.crt} bg="#050505">
      <canvas ref={ref} className={s.c} />

      <div className={s.type}>
        <div className={s.eyebrow} ref={eyebrowRef}>
          <b>SCENE 03</b> · 현실 — THE DIVERGENCE
        </div>
        <h1 className={`${s.s1} ${s.kr}`} ref={s1Ref}>
          많은 기업들이 <em>디지털 전환</em>에<br />투자합니다.
        </h1>
        <h2 className={`${s.s2} ${s.kr}`} ref={s2Ref}>
          하지만 <em>기대만큼의 <span className={s.void}>성과</span></em>를<br />내지 못하는 경우가 많습니다.
        </h2>
      </div>

      <div className={s.legend} ref={legendRef}>
        <div className={s.it}>
          <span className={`${s.dot} ${s.exp}`} />기대 <small>EXPECTATION</small>
        </div>
        <div className={s.it}>
          <span className={`${s.dot} ${s.real}`} />성과 <small>REALITY</small>
        </div>
        <div className={s.it}>
          <span className={s.bar} />격차 <small>GAP</small>
        </div>
      </div>

      <div className={s.shell} />
    </SceneHost>
  )
}
