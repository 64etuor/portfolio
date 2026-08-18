'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { type RGB, rgba, mix } from '../_host/color'
import { PALETTE_LIGHT_GRAY, PALETTE_DIM } from '../_host/palette'
import { clamp, lerp, smooth01 } from '../_host/math'
import { mulberry32 } from '../_host/random'
import { useSceneReady } from '../_host/useSceneReady'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE 10 · 핵심 메시지 — CROSS-DOMAIN INTERSECTION
   메타포: 제조(좌)·IT(우) 두 영역이 정적으로 분리된 채 출발한다.
   가운데 강한 '경계(membrane)'가 둘을 가른다. 장면이 깨어나면 두 링이
   서로를 향해 수렴하며 경계가 녹고, 겹치는 자리에 vesica(교집합) 렌즈가
   금빛으로 점화된다. 지식 입자들이 렌즈를 통해 양방향으로 건너가며,
   '경계를 넘는 순간' 정확히 금빛(=경쟁력)으로 물든다. 교집합만이
   유일한 밝은 액센트. 절정에서 한참 작렬(hold) → 다시 벌어져 시작점으로
   복귀(seamless). 모든 모션은 의도된 시간함수 — 난수 텔레메트리·가짜수치 없음.
   ════════════════════════════════════════════════════════════════ */

/* ---- color arrays ---- */
const PHOS: RGB = PALETTE_LIGHT_GRAY
const DIM: RGB = PALETTE_DIM
const DEEP: [number, number, number] = [58, 58, 58]
const WARM: [number, number, number] = [214, 161, 90]
const COOL: [number, number, number] = [98, 176, 204]
const GOLD: [number, number, number] = [240, 200, 121]
const GOLDH: [number, number, number] = [255, 241, 207]

const smooth = smooth01

/* ---- domain vocabularies (generic — no names/numbers) ---- */
const TERMS_MFG = ['공정', '설비', '양산', '수율', '금형', '품질', '계측', '현장']
const TERMS_IT = ['데이터', '모델', '파이프라인', '배포', '추론', '스키마', '센서', '학습']

interface FieldDot {
  a: number
  rr: number
  ph: number
  sz: number
  sp: number
}
interface OrbitTerm {
  txt: string
  base: number
  ph: number
  rad: number
}
interface Particle {
  dir: number
  lane: number
  speed: number
  phase: number
  carrier: boolean
  label: string | null
  sz: number
}

/* ---- build field/term/particle arrays (seeded once, stable) ---- */
function build(): {
  mfgField: FieldDot[]
  itField: FieldDot[]
  mfgTerms: OrbitTerm[]
  itTerms: OrbitTerm[]
  particles: Particle[]
} {
  const rng = mulberry32(91017)

  const mfgField: FieldDot[] = []
  const itField: FieldDot[] = []
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2,
      rr = Math.sqrt(rng()) * 0.86
    mfgField.push({ a, rr, ph: rng() * Math.PI * 2, sz: 0.7 + rng() * 1.5, sp: 0.1 + rng() * 0.16 })
  }
  for (let i = 0; i < 16; i++) {
    const a = rng() * Math.PI * 2,
      rr = Math.sqrt(rng()) * 0.86
    itField.push({ a, rr, ph: rng() * Math.PI * 2, sz: 0.7 + rng() * 1.5, sp: 0.1 + rng() * 0.16 })
  }

  const mfgTerms: OrbitTerm[] = []
  const itTerms: OrbitTerm[] = []
  const pick = 5
  for (let i = 0; i < pick; i++) {
    const base = Math.PI + (i / (pick - 1) - 0.5) * 1.24
    mfgTerms.push({ txt: TERMS_MFG[i], base, ph: rng() * Math.PI * 2, rad: 0.8 + rng() * 0.06 })
  }
  for (let i = 0; i < pick; i++) {
    const base = 0 + (i / (pick - 1) - 0.5) * 1.24
    itTerms.push({ txt: TERMS_IT[i], base, ph: rng() * Math.PI * 2, rad: 0.8 + rng() * 0.06 })
  }

  const particles: Particle[] = []
  const NP = 40
  for (let i = 0; i < NP; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    const lane = rng() * 2 - 1
    const speed = 0.052 + rng() * 0.06
    const phase = rng()
    const carrier = i % 7 === 0
    let label: string | null = null
    if (carrier) {
      label =
        dir > 0 ? TERMS_MFG[(i * 3) % TERMS_MFG.length] : TERMS_IT[(i * 3) % TERMS_IT.length]
    }
    particles.push({ dir, lane, speed, phase, carrier, label, sz: 1.3 + rng() * 1.5 })
  }

  return { mfgField, itField, mfgTerms, itTerms, particles }
}

/* stable scene data — built once at module level (seeded PRNG → deterministic) */
const SCENE_DATA = build()

/* ════════ TIMELINE ════════ */
const CYCLE = 15.0 // seconds, seamless period

function conv(f: number): number {
  if (f < 0.08) return 0
  if (f < 0.34) return smooth((f - 0.08) / 0.26)
  if (f < 0.84) return 1
  return 1 - smooth((f - 0.84) / 0.16)
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const l1Ref = useRef<HTMLHeadingElement | null>(null)
  const l2Ref = useRef<HTMLHeadingElement | null>(null)

  useSceneReady(onReady)

  const ref = useSceneCanvas(
    (g: CanvasRenderingContext2D, fr: Frame) => {
      const W = fr.w,
        H = fr.h
      const t = fr.t
      const f = (t % CYCLE) / CYCLE
      const cv01 = conv(f)

      const { mfgField, itField, mfgTerms, itTerms, particles } = SCENE_DATA

      const MIN = Math.min(W, H)
      const CX = W / 2
      const CY = H * 0.445
      const R = MIN * 0.235

      const ringD = lerp(R * 1.06, R * 0.48, cv01)
      const LCX = CX - ringD
      const RCX = CX + ringD
      const HY = ringD < R ? Math.sqrt(R * R - ringD * ringD) : 0

      const bloom = 0.5 + 0.5 * Math.sin(t * 1.7)
      const goldPulse = 0.6 + 0.4 * Math.sin(t * 1.6)

      g.clearRect(0, 0, W, H)

      /* ---- lens bounds helpers (inline, per-frame) ---- */
      function lensBounds(y: number): [number, number] | null {
        if (HY <= 0) return null
        const dy = y - CY
        if (Math.abs(dy) >= HY) return null
        const ss = Math.sqrt(R * R - dy * dy)
        const xl = RCX - ss
        const xr = LCX + ss
        if (xr <= xl) return null
        return [xl, xr]
      }
      function inLens(x: number, y: number): boolean {
        const b = lensBounds(y)
        return b !== null && x >= b[0] && x <= b[1]
      }

      /* ---- domain constellation fields ---- */
      const drawFields = () => {
        const draw = (arr: FieldDot[], cx: number, tint: [number, number, number]) => {
          for (const p of arr) {
            const a = p.a + Math.sin(t * p.sp + p.ph) * 0.05
            const rr = p.rr * R * 0.92
            const x = cx + Math.cos(a) * rr,
              y = CY + Math.sin(a) * rr
            const tw = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.3 + p.ph))
            const col = mix(DIM, tint, 0.35)
            g.fillStyle = rgba(col, (0.1 + 0.22 * tw) * (0.55 + 0.45 * cv01))
            g.beginPath()
            g.arc(x, y, p.sz, 0, 6.283)
            g.fill()
          }
        }
        draw(mfgField, LCX, WARM)
        draw(itField, RCX, COOL)
      }

      /* ---- two domain rings ---- */
      const drawRings = () => {
        g.lineJoin = 'round'
        g.lineCap = 'round'
        const ring = (cx: number, tint: [number, number, number]) => {
          const col = mix(PHOS, tint, 0.22)
          g.strokeStyle = rgba(col, 0.1 + 0.06 * cv01)
          g.lineWidth = 6
          g.shadowColor = rgba(tint, 0.5)
          g.shadowBlur = 14
          g.beginPath()
          g.arc(cx, CY, R, 0, 6.283)
          g.stroke()
          g.shadowBlur = 6
          g.strokeStyle = rgba(col, 0.4 + 0.3 * cv01)
          g.lineWidth = 1.6
          g.beginPath()
          g.arc(cx, CY, R, 0, 6.283)
          g.stroke()
          g.shadowBlur = 0
        }
        ring(LCX, WARM)
        ring(RCX, COOL)
      }

      /* ---- orbit term labels on outer lobes ---- */
      const drawOrbitTerms = () => {
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        const fpx = Math.max(11, Math.min(15, MIN * 0.0135))
        const draw = (arr: OrbitTerm[], cx: number, tint: [number, number, number]) => {
          g.font = "600 " + fpx + "px 'Pretendard Variable', 'Pretendard', sans-serif"
          for (const tt of arr) {
            const ang = tt.base + Math.sin(t * 0.22 + tt.ph) * 0.05
            const rr = R * tt.rad
            const x = cx + Math.cos(ang) * rr,
              y = CY + Math.sin(ang) * rr
            const tw = 0.5 + 0.5 * Math.sin(t * 0.9 + tt.ph)
            const col = mix(DIM, tint, 0.45)
            g.fillStyle = rgba(col, 0.22 + 0.28 * tw)
            g.fillText(tt.txt, x, y)
          }
        }
        draw(mfgTerms, LCX, WARM)
        draw(itTerms, RCX, COOL)
      }

      /* ---- boundary membrane ---- */
      const drawBoundary = () => {
        const a = 1 - cv01
        if (a < 0.02) return
        const yTop = CY - R * 1.04,
          yBot = CY + R * 1.04
        g.save()
        g.strokeStyle = rgba(DEEP, 0.85 * a)
        g.lineWidth = 1.2
        const segs = 26
        g.beginPath()
        for (let i = 0; i <= segs; i++) {
          const fy = i / segs,
            y = lerp(yTop, yBot, fy)
          const jag = Math.sin(i * 1.7 + t * 0.8) * MIN * 0.004 * a
          if (i === 0) g.moveTo(CX + jag, y); else g.lineTo(CX + jag, y)
        }
        g.stroke()
        if (a > 0.35) {
          for (let k = 0; k < 3; k++) {
            const fl = Math.sin(t * 2.3 + k * 2.1)
            if (fl < 0.6) continue
            const av = (fl - 0.6) * 0.6 * a
            const y0 = lerp(yTop, yBot, 0.22 + k * 0.26)
            g.strokeStyle = rgba(k % 2 ? WARM : COOL, av)
            g.lineWidth = 1.1
            g.beginPath()
            let yy = y0,
              xx = CX
            g.moveTo(xx, yy)
            for (let ss = 0; ss < 5; ss++) {
              yy += R * 0.06
              xx = CX + Math.sin(t * 3 + ss + k) * MIN * 0.006
              g.lineTo(xx, yy)
            }
            g.stroke()
          }
        }
        g.restore()
      }

      /* ---- vesica lens fill + edge glow ---- */
      const drawLens = () => {
        if (HY <= 0 || cv01 < 0.02) return
        const steps = 44
        const pts: [number, number][] = []
        for (let i = 0; i <= steps; i++) {
          const y = CY - HY + (2 * HY) * (i / steps)
          const b = lensBounds(y)
          if (!b) continue
          pts.push([b[0], y])
        }
        for (let i = steps; i >= 0; i--) {
          const y = CY - HY + (2 * HY) * (i / steps)
          const b = lensBounds(y)
          if (!b) continue
          pts.push([b[1], y])
        }
        if (pts.length < 3) return

        g.save()
        g.beginPath()
        g.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
        g.closePath()

        const grad = g.createLinearGradient(0, CY - HY, 0, CY + HY)
        const k = cv01 * (0.78 + 0.22 * bloom)
        grad.addColorStop(0, rgba(GOLD, 0.05 * k))
        grad.addColorStop(0.5, rgba(GOLD, 0.2 * k))
        grad.addColorStop(1, rgba(GOLD, 0.05 * k))
        g.fillStyle = grad
        g.fill()

        g.strokeStyle = rgba(GOLDH, (0.3 + 0.3 * bloom) * cv01)
        g.lineWidth = 1.6
        g.shadowColor = rgba(GOLD, 0.8)
        g.shadowBlur = 18 * cv01
        g.stroke()
        g.restore()
      }

      /* ---- crossing knowledge particles ---- */
      const drawParticles = () => {
        if (cv01 < 0.04) return
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        const tfpx = Math.max(11, Math.min(15, MIN * 0.013))
        for (const p of particles) {
          const frac = ((t * p.speed + p.phase) % 1 + 1) % 1
          const xL = LCX - R * 0.42,
            xR = RCX + R * 0.42
          const x = p.dir > 0 ? lerp(xL, xR, frac) : lerp(xR, xL, frac)
          const ss = 1 - Math.abs(2 * frac - 1)
          const spread = lerp(R * 0.52, HY > 0 ? HY * 0.82 : R * 0.4, smooth(ss))
          const y = CY + p.lane * spread

          const ends = clamp(Math.min(frac / 0.1, (1 - frac) / 0.1), 0, 1)
          const central = clamp(1 - Math.abs(x - CX) / (R * 0.62), 0, 1)
          const lensFlag = inLens(x, y) ? 1 : 0
          const gold = Math.max(central * 0.85, lensFlag)
          const base: [number, number, number] =
            p.dir > 0 ? mix(PHOS, WARM, 0.45) : mix(PHOS, COOL, 0.45)
          const col = mix(base, GOLDH, gold)
          const a = (0.55 + 0.4 * gold) * ends * cv01

          if (gold > 0.15) {
            const gr = g.createRadialGradient(x, y, 0, x, y, p.sz * 6 + 6 * gold)
            gr.addColorStop(0, rgba(GOLD, 0.42 * gold * ends * cv01))
            gr.addColorStop(1, rgba(GOLD, 0))
            g.fillStyle = gr
            g.beginPath()
            g.arc(x, y, p.sz * 6 + 6 * gold, 0, 6.283)
            g.fill()
          }
          const tx = x - p.dir * 8
          g.strokeStyle = rgba(col, a * 0.35)
          g.lineWidth = p.sz * 0.9
          g.beginPath()
          g.moveTo(tx, y)
          g.lineTo(x, y)
          g.stroke()
          g.fillStyle = rgba(col, a)
          g.beginPath()
          g.arc(x, y, p.sz, 0, 6.283)
          g.fill()

          if (p.carrier && p.label && central > 0.3) {
            g.font = "700 " + tfpx + "px 'Pretendard Variable', 'Pretendard', sans-serif"
            g.fillStyle = rgba(GOLDH, 0.85 * central * cv01)
            g.shadowColor = rgba(GOLD, 0.7)
            g.shadowBlur = 10 * central
            g.fillText(p.label, x, y - p.sz - 9)
            g.shadowBlur = 0
          }
        }
      }

      /* ---- central bloom at the heart of the lens ---- */
      const drawCenterBloom = () => {
        if (HY <= 0 || cv01 < 0.05) return
        const rad = HY * 0.95
        const gr = g.createRadialGradient(CX, CY, 0, CX, CY, rad)
        const k = cv01 * (0.42 + 0.28 * bloom)
        gr.addColorStop(0, rgba(GOLDH, 0.3 * k))
        gr.addColorStop(0.35, rgba(GOLD, 0.16 * k))
        gr.addColorStop(1, rgba(GOLD, 0))
        g.save()
        g.globalCompositeOperation = 'screen'
        g.fillStyle = gr
        g.beginPath()
        g.arc(CX, CY, rad, 0, 6.283)
        g.fill()
        g.restore()
      }

      /* ---- labels: domains + intersection ---- */
      const drawLabels = () => {
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        const bigpx = Math.max(20, Math.min(40, MIN * 0.036))
        const tagpx = Math.max(9, Math.min(12, MIN * 0.011))
        const lx = LCX - R * 0.6,
          rx = RCX + R * 0.6

        g.font = "800 " + bigpx + "px 'Pretendard Variable', 'Pretendard', sans-serif"
        g.fillStyle = rgba(mix(PHOS, WARM, 0.4), 0.92)
        g.shadowColor = rgba(WARM, 0.35)
        g.shadowBlur = 12
        g.fillText('제조', lx, CY - bigpx * 0.18)
        g.fillStyle = rgba(mix(PHOS, COOL, 0.4), 0.92)
        g.shadowColor = rgba(COOL, 0.35)
        g.shadowBlur = 12
        g.fillText('IT', rx, CY - bigpx * 0.18)
        g.shadowBlur = 0

        g.font = "700 " + tagpx + "px 'JetBrains Mono', monospace"
        g.fillStyle = rgba(mix(DIM, WARM, 0.4), 0.7)
        g.fillText('MANUFACTURING', lx, CY + bigpx * 0.55)
        g.fillStyle = rgba(mix(DIM, COOL, 0.4), 0.7)
        g.fillText('DIGITAL', rx, CY + bigpx * 0.55)

        if (HY > 0 && cv01 > 0.18) {
          const a = smooth((cv01 - 0.18) / 0.4)
          const yTag = CY - HY - tagpx * 2.1
          g.font =
            "800 " + Math.max(14, Math.min(22, MIN * 0.02)) + "px 'Pretendard Variable', 'Pretendard', sans-serif"
          g.fillStyle = rgba(GOLDH, (0.5 + 0.45 * goldPulse) * a)
          g.shadowColor = rgba(GOLD, 0.8)
          g.shadowBlur = 16 * a
          g.fillText('교집합', CX, yTag)
          g.shadowBlur = 0
          g.font = "700 " + tagpx + "px 'JetBrains Mono', monospace"
          g.fillStyle = rgba(GOLD, 0.6 * a)
          g.fillText('INTERSECTION', CX, yTag + tagpx * 1.9)
        }
      }

      /* ---- draw order ---- */
      drawFields()
      drawRings()
      drawOrbitTerms()
      drawBoundary()
      drawLens()
      drawParticles()
      drawCenterBloom()
      drawLabels()

      /* ---- DOM hero text sync ---- */
      const o1 = smooth((f - 0.12) / 0.12) * (1 - smooth((f - 0.88) / 0.12))
      const o2 = smooth((f - 0.34) / 0.12) * (1 - smooth((f - 0.9) / 0.1))
      if (l1Ref.current) {
        l1Ref.current.style.opacity = o1.toFixed(3)
        l1Ref.current.style.transform = `translateX(-50%) translateY(${lerp(10, 0, smooth((f - 0.12) / 0.14)).toFixed(1)}px)`
      }
      if (l2Ref.current) {
        l2Ref.current.style.opacity = o2.toFixed(3)
        l2Ref.current.style.transform = `translateX(-50%) translateY(${lerp(16, 0, smooth((f - 0.34) / 0.14)).toFixed(1)}px)`
      }
    },
    { running }
  )

  return (
    <SceneHost className={s.root} bg="#050505">
      <canvas ref={ref} className={s.c} />
      <div className={`${s.flicker}`} />

      {/* corner chrome */}
      <div className={`${s.frame} ${s.frameTr}`} />
      <div className={`${s.frame} ${s.frameBl}`}>
        제조&nbsp;<b>⟡</b>&nbsp;IT
      </div>
      <div className={`${s.frame} ${s.frameBr}`}>∞&nbsp;SEAMLESS&nbsp;LOOP</div>

      {/* eyebrow */}
      <div className={`${s.eyebrow} ${s.kr}`}>
        <b>SCENE 10</b> · 핵심 — CROSS-DOMAIN
      </div>

      {/* hero typography — 인라인 opacity:0 로 CSS 모듈 로드 전 FOUC 플래시 방지(draw 가 매 프레임 덮어씀) */}
      <h1 ref={l1Ref} className={`${s.l1} ${s.kr}`} style={{ opacity: 0 }}>
        크로스 도메인 지식이 <em>경쟁력</em>이 되는 시대.
      </h1>
      <h2 ref={l2Ref} className={`${s.l2} ${s.kr}`} style={{ opacity: 0 }}>
        제조와 IT의 <em>경계</em>를 이해하는 사람이 <em>변화</em>를 만듭니다.
      </h2>

      <div className={s.shell} />
    </SceneHost>
  )
}
