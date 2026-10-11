'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { type RGB, rgba, mix } from '../_host/color'
import { clamp, smoothstep } from '../_host/math'
import { useSceneReady } from '../_host/useSceneReady'
import s from './scene.module.css'

const ACC: RGB = [82, 230, 207]
const ACCH: RGB = [199, 251, 241]
const WARM: RGB = [224, 163, 90]
const RINGS = 5
const LOOP = 13.0

interface Streak {
  ang: number
  seed: number
  speed: number
  wob: number
  warm: boolean
}

const smooth = smoothstep

function buildStreaks() {
  const streaks: Streak[] = []
  const N = 150
  for (let i = 0; i < N; i++) {
    streaks.push({
      ang: Math.random() * Math.PI * 2,
      seed: Math.random(),
      speed: 0.045 + Math.random() * 0.14,
      wob: Math.random() * Math.PI * 2,
      warm: Math.random() < 0.14,
    })
  }
  return streaks
}

export default function Scene({ running = true, onReady, locale = 'ko' }: SceneProps) {
  const heroRef = useRef<HTMLDivElement | null>(null)
  const l1Ref = useRef<HTMLDivElement | null>(null)
  const l2Ref = useRef<HTMLDivElement | null>(null)
  const statusRef = useRef<HTMLSpanElement | null>(null)
  const lastStatusRef = useRef('')
  const streaksRef = useRef<Streak[]>([])
  useSceneReady(onReady)

  const ref = useSceneCanvas((ctx: CanvasRenderingContext2D, f: Frame) => {
    if (streaksRef.current.length === 0) streaksRef.current = buildStreaks()

    const W = f.w
    const H = f.h
    const CX = W / 2
    const CY = H / 2
    const elapsed = f.t
    const c = elapsed % LOOP

    const fadeIn = smooth(0.0, 0.9, c)
    const fadeOut = 1 - smooth(11.7, 12.85, c)
    const master = fadeIn * fadeOut

    const rev1 = smooth(0.5, 1.9, c)
    const rev2 = smooth(3.4, 5.0, c)

    const open = smooth(8.7, 11.3, c) * (1 - smooth(12.3, 12.9, c))
    const diss = smooth(10.5, 12.2, c)
    const textScale = 1 + open * 0.17

    let status = '신호 정렬'
    if (c >= 8.7) status = '다음으로 →'
    else if (c >= 6.0) status = '결정'
    else if (c >= 3.2) status = '수렴'
    if (status !== lastStatusRef.current) {
      lastStatusRef.current = status
      if (statusRef.current) statusRef.current.textContent = status
    }

    if (heroRef.current) heroRef.current.style.opacity = master.toFixed(3)
    if (l1Ref.current) {
      l1Ref.current.style.opacity = (rev1 * (1 - diss * 0.96)).toFixed(3)
      l1Ref.current.style.transform = `translateY(${((1 - rev1) * 22).toFixed(1)}px) scale(${textScale.toFixed(3)})`
      l1Ref.current.style.filter = `blur(${((1 - rev1) * 9 + diss * 7).toFixed(2)}px)`
    }
    if (l2Ref.current) {
      l2Ref.current.style.opacity = (rev2 * (1 - diss * 0.96)).toFixed(3)
      l2Ref.current.style.transform = `translateY(${((1 - rev2) * 26).toFixed(1)}px) scale(${textScale.toFixed(3)})`
      l2Ref.current.style.filter = `blur(${((1 - rev2) * 11 + diss * 8).toFixed(2)}px)`
    }

    ctx.clearRect(0, 0, W, H)
    const maxR = Math.hypot(W, H) * 0.62
    const zoom = 1 + open * 0.42

    const coreR = Math.min(W, H) * (0.1 + open * 0.3)
    const gg = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR)
    gg.addColorStop(0, rgba(mix(ACCH, WARM, open * 0.6), 0.12 + open * 0.5))
    gg.addColorStop(0.45, rgba(ACC, 0.06 + open * 0.22))
    gg.addColorStop(1, rgba(ACC, 0))
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(CX, CY, coreR, 0, Math.PI * 2)
    ctx.fill()

    ctx.lineWidth = 1
    for (let k = 0; k < RINGS; k++) {
      const rp = (elapsed * 0.11 + k / RINGS) % 1
      const r = rp * rp * maxR * zoom
      const a = (1 - rp) * (0.05 + open * 0.16)
      if (a <= 0.004) continue
      ctx.strokeStyle = rgba(mix(ACC, ACCH, open * 0.5), a)
      ctx.beginPath()
      ctx.arc(CX, CY, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.lineCap = 'round'
    streaksRef.current.forEach((streak) => {
      const p = (elapsed * streak.speed + streak.seed) % 1
      const tail = (0.018 + open * 0.135) * (0.55 + streak.speed * 3.0)
      const pIn = p
      const pOut = clamp(p - tail, 0, 1)
      const eIn = pIn * pIn
      const eOut = pOut * pOut
      const wob = Math.sin(elapsed * 0.9 + streak.wob) * 0.018 * (1 - open * 0.6)
      const ang = streak.ang + wob
      const ca = Math.cos(ang)
      const sa = Math.sin(ang)
      const rIn = eIn * maxR * zoom
      const rOut = eOut * maxR * zoom
      const x1 = CX + ca * rIn
      const y1 = CY + sa * rIn
      const x2 = CX + ca * rOut
      const y2 = CY + sa * rOut

      const prof = Math.sin(pIn * Math.PI)
      const base = 0.1 + open * 0.85
      const a = base * prof
      if (a <= 0.01) return
      const col = streak.warm ? mix(ACC, WARM, 0.4 + open * 0.5) : mix(ACC, ACCH, 0.2 + open * 0.45)

      ctx.strokeStyle = rgba(col, a)
      ctx.lineWidth = 0.7 + eIn * 1.8 + open * 1.0
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x1, y1)
      ctx.stroke()

      if (open > 0.25 && prof > 0.4) {
        ctx.fillStyle = rgba(ACCH, a * open * 0.9)
        ctx.beginPath()
        ctx.arc(x1, y1, 0.8 + eIn * 2.2 * open, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    if (master < 0.999) {
      ctx.fillStyle = `rgba(2,2,2,${(1 - master).toFixed(3)})`
      ctx.fillRect(0, 0, W, H)
    }
  }, { running })

  return (
    <SceneHost
      className={s.stage}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.035, z: 59, dur: '1.1s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.2) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 60,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.66) 100%)',
          z: 61,
        },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={s.kicker}>
        <span>엔딩 · 수렴</span>
        <span className={s.sep}>/</span>
        <span className={s.dot} />
        <span ref={statusRef} className={`${s.status} ${s.kr}`}>
          신호 정렬
        </span>
        <span className={s.sep}>/</span>
        <span>THE MAKERS</span>
      </div>

      {/* 초기 opacity:0 — rAF 가 master(=0→상승)로 덮어쓰기 전 첫 페인트에 글자가
          전부 보였다가 등장 효과가 재생되는 FOUC 방지 (37-cross-domain 와 동일 패턴). */}
      <div className={s.hero} ref={heroRef} style={{ opacity: 0 }}>
        {locale === 'en' ? (
          <>
            <div className={`${s.l1} ${s.kr}`} ref={l1Ref}>
              The one who <span className={s.acc}>connects</span> manufacturing and <span className={s.mono}>IT</span>,
            </div>
            <div className={`${s.l2} ${s.kr}`} ref={l2Ref}>
              the one who builds <span className={s.acc}>the future</span>.
            </div>
          </>
        ) : (
          <>
            <div className={`${s.l1} ${s.kr}`} ref={l1Ref}>
              제조와 <span className={s.mono}>IT</span>를 <span className={s.acc}>잇는</span> 사람,
            </div>
            <div className={`${s.l2} ${s.kr}`} ref={l2Ref}>
              <span className={s.acc}>미래</span>를 만드는 사람.
            </div>
          </>
        )}
      </div>

      <div className={`${s.frame} ${s.tl}`}>FINALE</div>
      <div className={`${s.frame} ${s.tr}`}>CONVERGENCE</div>
      <div className={`${s.frame} ${s.bl}`}>제조 × IT</div>
      <div className={`${s.frame} ${s.br}`}>NEXT ↗</div>

      <div className={s.footer}>
        <span>
          <b>FIELD</b> ⟶ ⟵ <b>TECH</b>
        </span>
        <span className={s.sep}>·</span>
        <span className={s.go}>다음으로 ↗</span>
      </div>

    </SceneHost>
  )
}
