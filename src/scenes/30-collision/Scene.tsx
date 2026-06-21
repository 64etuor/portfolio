'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE 06 · 충돌 — LEXICAL COLLISION  (30-collision.html 이식)
   현업(warm) vs 개발(cold) 토큰 군단이 충돌·산란·원심 분리되며
   요구사항 왜곡을 시각화. 12s 루프.
   ════════════════════════════════════════════════════════════════ */

const LOOP = 12.0 // seconds, seamless loop

// ---------- message text ----------
const LINE1 = '서로 다른 언어를 사용하는 순간,'
const LINE2 = '요구사항은 왜곡되고 프로젝트는 멀어집니다.'

// ---------- token armies ----------
const KO = ['공정', '불량률', '금형', '양산', '치수', '납기', '현장', '설비', '타발', '검사', '로트', '수율']
const EN = ['deploy', 'schema', 'async', 'refactor', 'commit', 'build', 'endpoint', 'latency', 'cache', 'rollback', 'queue', 'nullable']

// ---------- color helpers ----------
const PHOS: [number, number, number] = [226, 226, 226]
const WARM: [number, number, number] = [217, 138, 61]
const COLD: [number, number, number] = [74, 179, 204]

function rgba(c: [number, number, number], a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
}
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

// ---------- easing ----------
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1)
const eIn = (t: number) => t * t * t
const eOut = (t: number) => 1 - Math.pow(1 - t, 3)
const eInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// ---------- phase timeline ----------
const PH = ['STAND-OFF', 'CHARGE', 'IMPACT', 'SCATTER', 'DRIFT APART', 'RESET']
function phaseIndex(p: number): number {
  if (p < 0.24) return 0
  if (p < 0.40) return 1
  if (p < 0.47) return 2
  if (p < 0.66) return 3
  if (p < 0.86) return 4
  return 5
}

interface SceneState {
  charge: number
  shatter: number
  shake: number
  flash: number
  l1: number
  gA: number
  aA: number
}

function compute(p: number): SceneState {
  let charge: number
  if (p < 0.24) charge = 0
  else if (p < 0.40) charge = eIn(seg(p, 0.24, 0.40))
  else if (p < 0.47) charge = 1
  else if (p < 0.66) charge = lerp(1, -0.35, eOut(seg(p, 0.47, 0.66)))
  else if (p < 0.86) charge = lerp(-0.35, -1.55, seg(p, 0.66, 0.86))
  else charge = lerp(-1.55, 0, eInOut(seg(p, 0.86, 1.0)))

  let shatter: number
  if (p < 0.40) shatter = 0
  else if (p < 0.47) shatter = eOut(seg(p, 0.40, 0.47)) * 0.55
  else if (p < 0.66) shatter = lerp(0.55, 0.82, seg(p, 0.47, 0.66))
  else if (p < 0.86) shatter = lerp(0.82, 1.0, seg(p, 0.66, 0.86))
  else shatter = lerp(1.0, 0, eInOut(seg(p, 0.86, 1.0)))

  const shake = p >= 0.40 && p < 0.54 ? Math.pow(1 - seg(p, 0.40, 0.54), 2) : 0
  const flash = p >= 0.40 && p < 0.52 ? Math.pow(1 - seg(p, 0.40, 0.52), 1.6) : 0

  const l1 = seg(p, 0.03, 0.11) * (1 - seg(p, 0.30, 0.40))

  let gA: number
  if (p < 0.47) gA = 1
  else if (p < 0.68) gA = lerp(1, 0, eOut(seg(p, 0.47, 0.68)))
  else if (p < 0.83) gA = 0
  else gA = lerp(0, 1, eInOut(seg(p, 0.83, 1.0)))

  let aA: number
  if (p < 0.47) aA = 1
  else if (p < 0.72) aA = lerp(1, 0, eOut(seg(p, 0.47, 0.72)))
  else if (p < 0.84) aA = 0
  else aA = lerp(0, 1, eInOut(seg(p, 0.84, 1.0)))

  return { charge, shatter, shake, flash, l1, gA, aA }
}

// ---------- glyph type ----------
interface Glyph {
  ch: string
  hx: number
  hy: number
  w: number
  side: 'warm' | 'cold'
  bx: number
  by: number
  rot: number
  sk: number
  scl: number
}

// ---------- token type ----------
interface Token {
  txt: string
  sign: number
  homeC: number
  targetC: number
  ox: number
  oy: number
  ko: boolean
  px: number | null
  jit: number
}

// ---------- debris (precomputed) ----------
interface Debris {
  ang: number
  sp: number
  sz: number
  tint: number
  vy: number
}
const DEBRIS: Debris[] = []
for (let i = 0; i < 90; i++) {
  const ang = Math.random() * Math.PI * 2
  DEBRIS.push({
    ang,
    sp: 0.25 + Math.random() * 0.95,
    sz: 1 + Math.random() * 2.6,
    tint: Math.random(),
    vy: (Math.random() - 0.5) * 0.4,
  })
}

export default function Scene({ running = true, onReady }: SceneProps) {
  // HUD DOM refs (mutated inside draw — no re-render)
  const phaseNameRef = useRef<HTMLSpanElement | null>(null)
  const dot0Ref = useRef<HTMLSpanElement | null>(null)
  const dot1Ref = useRef<HTMLSpanElement | null>(null)
  const dot2Ref = useRef<HTMLSpanElement | null>(null)
  const dot3Ref = useRef<HTMLSpanElement | null>(null)
  const dot4Ref = useRef<HTMLSpanElement | null>(null)
  const dot5Ref = useRef<HTMLSpanElement | null>(null)
  const hudContactRef = useRef<HTMLDivElement | null>(null)
  const hudDriftRef = useRef<HTMLDivElement | null>(null)

  // per-frame mutable state (not React state)
  const lastPhRef = useRef(-1)
  const glyphsRef = useRef<Glyph[]>([])
  const tokensRef = useRef<Token[]>([])
  const heroFontRef = useRef(64)
  const line1FontRef = useRef(26)
  const readyFired = useRef(false)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w
    const H = fr.h
    const now = fr.t * 1000 // ms equivalent for sin/cos phases
    const CX = W / 2
    const CY = H * 0.52

    const tt = fr.t % LOOP
    const p = tt / LOOP
    const S = compute(p)
    const ph = phaseIndex(p)

    // ---- lazy layout on first frame or when size changes ----
    // We re-layout whenever glyphs array is empty or heroFont doesn't match
    const needsLayout = glyphsRef.current.length === 0
    if (needsLayout) {
      // layoutHero
      const glyphs: Glyph[] = []
      const targetW = W * 0.80
      let fpx = Math.min(H * 0.12, W * 0.075)
      g.font = `800 ${fpx}px 'Pretendard Variable', sans-serif`
      let tw = 0
      for (const ch of LINE2) tw += g.measureText(ch).width
      if (tw > targetW) {
        fpx *= targetW / tw
        g.font = `800 ${fpx}px 'Pretendard Variable', sans-serif`
        tw = 0
        for (const ch of LINE2) tw += g.measureText(ch).width
      }
      heroFontRef.current = fpx
      line1FontRef.current = Math.max(15, fpx * 0.34)
      let x = CX - tw / 2
      const cx = CX
      for (const ch of LINE2) {
        const w = g.measureText(ch).width
        const hx = x + w / 2
        const hy = CY
        const sideSign = hx < cx ? -1 : 1
        const nd = Math.min(1, Math.abs(hx - cx) / (tw / 2))
        glyphs.push({
          ch,
          hx,
          hy,
          w,
          side: sideSign < 0 ? 'warm' : 'cold',
          bx: sideSign * (0.30 + 0.55 * nd) * W * 0.55 + (Math.random() - 0.5) * W * 0.06,
          by: (Math.random() - 0.5) * H * 0.46,
          rot: (Math.random() - 0.5) * 1.5,
          sk: (Math.random() - 0.5) * 0.85,
          scl: (Math.random() - 0.5) * 0.8,
        })
        x += w
      }
      glyphsRef.current = glyphs

      // layoutArmies
      const tokens: Token[] = []
      const colGap = W * 0.062
      const rowGap = H * 0.135
      const build = (arr: string[], sign: number) => {
        const homeC = CX + sign * W * 0.34
        const targetC = CX + sign * W * 0.055
        arr.forEach((txt, i) => {
          const col = i % 3
          const row = (i / 3) | 0
          const ox = sign * (2 - col) * colGap
          const oy = (row - 1.5) * rowGap + (col % 2 ? rowGap * 0.18 : 0)
          tokens.push({
            txt,
            sign,
            homeC,
            targetC,
            ox,
            oy,
            ko: sign < 0,
            px: null,
            jit: Math.random() * Math.PI * 2,
          })
        })
      }
      build(KO, -1)
      build(EN, +1)
      tokensRef.current = tokens
    }

    const heroFont = heroFontRef.current
    const line1Font = line1FontRef.current
    const glyphs = glyphsRef.current
    const tokens = tokensRef.current

    // ---- HUD updates (cheap, only on phase change) ----
    if (ph !== lastPhRef.current) {
      lastPhRef.current = ph
      if (phaseNameRef.current) phaseNameRef.current.textContent = PH[ph]
      const dotRefs = [dot0Ref, dot1Ref, dot2Ref, dot3Ref, dot4Ref, dot5Ref]
      dotRefs.forEach((dr, i) => {
        if (dr.current) {
          dr.current.className = i === ph ? `${s.dot} ${s.dotOn}` : s.dot
        }
      })
      if (hudContactRef.current) {
        hudContactRef.current.textContent =
          ph <= 1 ? 'STAND-OFF' : ph === 2 ? '>> IMPACT <<' : ph <= 4 ? 'DIVERGING' : 'RE-FORM'
      }
    }
    if (hudDriftRef.current) {
      hudDriftRef.current.textContent = String(Math.round(Math.abs(S.charge) * 100)).padStart(3, '0')
    }

    // ---- screen shake ----
    const shx = Math.sin(now * 0.09) * S.shake * W * 0.012
    const shy = Math.cos(now * 0.11) * S.shake * H * 0.012

    g.clearRect(0, 0, W, H)
    g.save()
    g.translate(shx, shy)

    // ---- drawField ----
    {
      const grad = g.createRadialGradient(CX, CY, 0, CX, CY, W * 0.5)
      const heat = 0.10 + S.flash * 0.35
      grad.addColorStop(0, `rgba(70,70,70,${heat})`)
      grad.addColorStop(0.5, `rgba(30,30,30,${heat * 0.4})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, W, H)

      g.save()
      g.strokeStyle = 'rgba(120,120,120,0.05)'
      g.lineWidth = 1
      for (let i = -6; i <= 6; i++) {
        const x = CX + i * W * 0.05
        g.beginPath()
        g.moveTo(x, H * 0.18)
        g.lineTo(x, H * 0.86)
        g.stroke()
      }
      g.restore()
    }

    // ---- drawArmies ----
    {
      const fpx = Math.max(13, Math.min(20, W * 0.013))
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      tokens.forEach((tk) => {
        const cx = lerp(tk.homeC, tk.targetC, S.charge)
        const jit = S.charge < 0.02 ? Math.sin(now * 0.004 + tk.jit) * 1.2 : 0
        const x = cx + tk.ox + jit
        const y = CY + tk.oy + (S.charge < 0.02 ? Math.cos(now * 0.005 + tk.jit) * 1.0 : 0)
        const col = tk.ko ? WARM : COLD
        const a = S.aA

        if (tk.px !== null) {
          const dx = x - tk.px
          if (Math.abs(dx) > 2.2) {
            const steps = 4
            for (let st = 1; st <= steps; st++) {
              const tx = x - dx * (st / steps) * 0.9
              g.globalAlpha = a * 0.10 * (1 - st / steps)
              g.fillStyle = rgba(col, 1)
              g.font =
                (tk.ko ? '600 ' : '400 ') +
                fpx +
                "px " +
                (tk.ko ? "'Pretendard Variable', sans-serif" : "'JetBrains Mono', monospace")
              g.fillText(tk.txt, tx, y)
            }
          }
        }
        tk.px = x

        g.globalAlpha = a
        g.font =
          (tk.ko ? '600 ' : '400 ') +
          fpx +
          "px " +
          (tk.ko ? "'Pretendard Variable', sans-serif" : "'JetBrains Mono', monospace")
        g.shadowColor = rgba(col, 0.5)
        g.shadowBlur = 8
        g.fillStyle = rgba(col, 0.9)
        g.fillText(tk.txt, x, y)
        g.shadowBlur = 0
      })
      g.globalAlpha = 1
    }

    // ---- drawShock ----
    if (p >= 0.40 && p <= 0.74) {
      const lr = seg(p, 0.40, 0.60)
      if (lr > 0 && lr < 1) {
        g.save()
        for (let k = 0; k < 2; k++) {
          const r = (lr + k * 0.12) * W * 0.55
          const a = (1 - lr) * (0.5 - k * 0.18)
          if (a <= 0) continue
          g.strokeStyle = `rgba(235,235,235,${a})`
          g.lineWidth = 2 - k
          g.beginPath()
          g.ellipse(CX, CY, r, r * 0.62, 0, 0, Math.PI * 2)
          g.stroke()
        }
        g.restore()
      }
      const dl = seg(p, 0.40, 0.74)
      g.save()
      DEBRIS.forEach((d) => {
        const r = dl * W * 0.42 * d.sp
        const x = CX + Math.cos(d.ang) * r
        const y = CY + Math.sin(d.ang) * r * 0.7 + dl * dl * H * 0.12 * d.vy
        const a = (1 - dl) * 0.85
        if (a <= 0) return
        const col = d.tint < 0.4 ? WARM : d.tint < 0.8 ? COLD : PHOS
        g.fillStyle = rgba(col, a)
        g.fillRect(x, y, d.sz, d.sz)
      })
      g.restore()
    }

    // ---- drawHero ----
    {
      if (S.l1 > 0.01) {
        g.save()
        g.globalAlpha = S.l1
        g.font = `600 ${line1Font}px 'Pretendard Variable', sans-serif`
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillStyle = rgba(PHOS, 0.92)
        g.shadowColor = 'rgba(226,226,226,0.25)'
        g.shadowBlur = 12
        g.fillText(LINE1, CX, CY - heroFont * 1.05)
        g.shadowBlur = 0
        g.restore()
      }

      g.font = `800 ${heroFont}px 'Pretendard Variable', sans-serif`
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      const sh = S.shatter
      glyphs.forEach((gl) => {
        if (gl.ch === ' ') return
        const px = gl.hx + gl.bx * sh
        const py = gl.hy + gl.by * sh
        const rot = gl.rot * sh
        const sk = gl.sk * sh
        const scl = 1 + gl.scl * sh
        const breathe = sh < 0.01 ? 0.85 + 0.15 * Math.sin(now * 0.0022 + gl.hx * 0.01) : 1
        const dispMag = Math.sqrt(gl.bx * gl.bx + gl.by * gl.by)
        const glyphFade = sh > 0 ? Math.max(0, 1 - (sh * dispMag) / (W * 0.34)) : 1
        const tint = mix(PHOS, gl.side === 'warm' ? WARM : COLD, Math.min(1, sh * 0.9))
        g.save()
        g.globalAlpha = S.gA * breathe * glyphFade
        g.translate(px, py)
        g.rotate(rot)
        g.transform(1, 0, sk, 1, 0, 0)
        g.scale(scl, scl)
        g.shadowColor = rgba(tint, 0.4)
        g.shadowBlur = heroFont * 0.10 * (1 + sh)
        g.fillStyle = rgba(tint, 1)
        g.fillText(gl.ch, 0, 0)
        g.restore()
      })
      g.shadowBlur = 0
    }

    // ---- drawSeam ----
    {
      g.save()
      if (S.charge < 0.98 && S.shatter < 0.02) {
        const tense = clamp(S.charge * 1.4 + 0.25, 0, 1)
        const pulse = 0.06 + 0.05 * Math.sin(now * 0.006)
        g.strokeStyle = `rgba(235,235,235,${pulse * tense})`
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(CX, H * 0.18)
        g.lineTo(CX, H * 0.86)
        g.stroke()
        const arcN = 3
        for (let k = 0; k < arcN; k++) {
          const fl = Math.sin(now * 0.013 + k * 2.1)
          if (fl < 0.55) continue
          const a = (fl - 0.55) * 0.5 * tense
          const y0 = H * (0.30 + k * 0.18)
          const y1 = y0 + H * 0.1
          g.strokeStyle = rgba(k % 2 ? WARM : COLD, a)
          g.lineWidth = 1.2
          g.beginPath()
          let yy = y0
          let xx = CX
          g.moveTo(xx, yy)
          for (let st = 0; st < 5; st++) {
            yy += (y1 - y0) / 5
            xx = CX + Math.sin(now * 0.05 + st + k) * 0.5 * W * 0.018
            g.lineTo(xx, yy)
          }
          g.stroke()
        }
      }
      if (S.flash > 0.01) {
        const f = S.flash
        const bw = W * 0.012 * f
        g.globalCompositeOperation = 'screen'
        g.fillStyle = rgba(WARM, f * 0.6)
        g.fillRect(CX - bw * 2.2, H * 0.16, bw, H * 0.7)
        g.fillStyle = rgba(COLD, f * 0.6)
        g.fillRect(CX + bw * 1.2, H * 0.16, bw, H * 0.7)
        g.fillStyle = rgba(PHOS, f * 0.85)
        g.fillRect(CX - bw * 0.6, H * 0.14, bw * 1.2, H * 0.74)
        g.globalCompositeOperation = 'source-over'
      }
      g.restore()
    }

    g.restore() // end translate(shx, shy)
  }, { running })

  return (
    <SceneHost className={s.root} bg="#050505">
      <canvas ref={ref} className={s.c} />
      <div className={s.flicker} />

      <div className={s.eyebrow}>
        <b>SCENE 06</b> · 충돌 — LEXICAL COLLISION
      </div>

      <div className={`${s.hud} ${s.hudTr}`}>
        <div className={s.hudK}>요구사항 무결성</div>
        <div className={s.hudV}>REQUIREMENT INTEGRITY</div>
      </div>
      <div className={`${s.hud} ${s.hudBl}`}>
        <div className={s.hudK}>CONTACT</div>
        <div className={s.hudV} ref={hudContactRef}>STAND-OFF</div>
      </div>
      <div className={`${s.hud} ${s.hudBr}`}>
        <div className={s.hudK}>DRIFT Δ</div>
        <div className={s.hudV} ref={hudDriftRef}>000</div>
      </div>

      <div className={`${s.side} ${s.sideL}`}>
        현업 · 제조
        <div className={s.sideEn}>FIELD / MANUFACTURING</div>
      </div>
      <div className={`${s.side} ${s.sideR}`}>
        개발 · 시스템
        <div className={s.sideEn}>DEV / SYSTEM</div>
      </div>

      <div className={s.phasebar}>
        <span className={s.dot} ref={dot0Ref} />
        <b ref={phaseNameRef}>STAND-OFF</b>
        <span className={s.dot} ref={dot1Ref} />
        <span className={s.dot} ref={dot2Ref} />
        <span className={s.dot} ref={dot3Ref} />
        <span className={s.dot} ref={dot4Ref} />
        <span className={s.dot} ref={dot5Ref} />
      </div>

      <div className={s.shell} />
    </SceneHost>
  )
}
