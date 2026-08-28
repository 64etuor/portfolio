'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { rgba, mix } from '../_host/color'
import type { RGB } from '../_host/color'
import { PALETTE_LIGHT_GRAY, PALETTE_DIM } from '../_host/palette'
import { ease, smoothstep as ramp, lerp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════
   SCENE 02 · 선언 — AX ERA  (33-ax-era.html 이식)
   메타포: 화면을 가로지르는 '지층(strata)'.
     · 하단 = 제조의 물성(회색 인광 격자: 설비·공정) — 기반.
     · 중앙 = 주인공 타이포(선언).
     · 상단 = 비어 있던 하늘.
   정적 선언 → 동적 전환. 제조 격자에서 데이터·지식이 입자로 솟아올라
   지평선(=새 시대의 문)을 넘어 상층에 푸른 '지식 지층(네트워크)'으로
   결정화된다. 'DX'는 가라앉고 'AX'가 점화.
   가짜 수치/난수 텔레메트리 없음 — 모든 모션은 의도된 시간함수.
   ════════════════════════════════════════════════════════════════ */

// ---- color helpers ----
const COLD: RGB = PALETTE_LIGHT_GRAY
const DIMC: RGB = PALETTE_DIM
const AZ: RGB = [78, 163, 240]
const AZH: RGB = [207, 232, 255]

// deterministic pseudo-scatter (no Math.random — seamless & repeatable)
// NOTE: uses i*12.9898 WITHOUT +1 — differs from fractHash, kept local
function hash(i: number): number {
  const sv = Math.sin(i * 12.9898) * 43758.5453
  return sv - Math.floor(sv)
}

// ---- geometry ----
const COLS = 11
const SUB_Y = [0.70, 0.795, 0.89]
const STR_Y = [0.235, 0.135]
const PCOUNT = 78

const CYCLE = 15.0

interface SubNode { x: number; y: number; c: number; r: number; ph: number }
interface StrNode { x: number; y: number; c: number; r: number; ph: number }
interface Mote {
  i: number
  x0: number; x1: number
  yA: number; yB: number
  sway: number; swf: number
  speed: number; phase: number
  glyph: number
}

interface SceneGeo {
  yHorizon: number
  subRows: SubNode[][]
  strRows: StrNode[][]
  parts: Mote[]
}

function build(W: number, H: number): SceneGeo {
  const yHorizon = H * 0.625
  const x0 = W * 0.115, x1 = W * 0.885

  const subRows: SubNode[][] = SUB_Y.map((fy, r) => {
    const spread = 1 + r * 0.055
    const cx = (x0 + x1) / 2, half = (x1 - x0) / 2 * spread
    const row: SubNode[] = []
    for (let c = 0; c < COLS; c++) {
      const f = c / (COLS - 1)
      row.push({ x: lerp(cx - half, cx + half, f), y: H * fy, c, r, ph: hash(r * 31 + c) * 6.28 })
    }
    return row
  })

  const strRows: StrNode[][] = STR_Y.map((fy, r) => {
    const row: StrNode[] = []
    for (let c = 0; c < COLS; c++) {
      const f = c / (COLS - 1)
      const bow = Math.sin(f * Math.PI) * H * (r === 0 ? 0.022 : 0.012)
      row.push({ x: lerp(x0, x1, f), y: H * fy - bow, c, r, ph: hash(100 + r * 17 + c) * 6.28 })
    }
    return row
  })

  const top = subRows[0], dst = strRows[0]
  const parts: Mote[] = []
  for (let i = 0; i < PCOUNT; i++) {
    const c = i % COLS
    const a = top[c], b = dst[c]
    parts.push({
      i,
      x0: a.x, x1: b.x,
      yA: H * 0.665, yB: b.y,
      sway: (hash(i) * 2 - 1) * W * 0.018,
      swf: 0.6 + hash(i * 3) * 0.9,
      speed: 0.052 + hash(i * 7) * 0.040,
      phase: hash(i * 11),
      glyph: i % 5,
    })
  }

  return { yHorizon, subRows, strRows, parts }
}

interface Scalars {
  seam: number
  wRev: number[]
  cross: number
  ax: number
  l2a: number
  l2b: number
  data: number
  time: number
}

function scalars(f: number, time: number): Scalars {
  return {
    seam: 1 - ramp(0.86, 0.975, f),
    wRev: [
      ramp(0.02, 0.10, f),
      ramp(0.06, 0.13, f),
      ramp(0.11, 0.19, f),
      ramp(0.17, 0.27, f),
      ramp(0.23, 0.31, f),
    ],
    cross: ramp(0.15, 0.27, f),
    ax: ramp(0.18, 0.36, f),
    l2a: ramp(0.36, 0.45, f),
    l2b: ramp(0.46, 0.60, f),
    data: ramp(0.47, 0.66, f),
    time,
  }
}

export default function Scene({ locale = 'ko', running = true, onReady }: SceneProps) {
  const english = locale === 'en'
  // overlay DOM refs — updated imperatively in draw
  const axRef = useRef<HTMLSpanElement | null>(null)
  const dxRef = useRef<HTMLSpanElement | null>(null)
  // l1w2Ref doubles as beyondRef (same element)
  const l1w0Ref = useRef<HTMLSpanElement | null>(null) // DX
  const l1w1Ref = useRef<HTMLSpanElement | null>(null) // 를
  const l1w2Ref = useRef<HTMLSpanElement | null>(null) // 넘어 (also carries --cross)
  const l1w3Ref = useRef<HTMLSpanElement | null>(null) // AX
  const l1w4Ref = useRef<HTMLSpanElement | null>(null) // 의 시대.
  const l2aRef = useRef<HTMLSpanElement | null>(null)
  const l2bRef = useRef<HTMLSpanElement | null>(null)
  const statusRef = useRef<HTMLSpanElement | null>(null)

  const lastStatusRef = useRef('')
  const geoRef = useRef<SceneGeo | null>(null)
  const lastSizeRef = useRef({ w: 0, h: 0 })

  useSceneReady(onReady)

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w, H = fr.h
    const t = fr.t
    const f = (t % CYCLE) / CYCLE
    const S = scalars(f, t)
    const seam = S.seam

    // rebuild geometry on first call or size change
    if (!geoRef.current || lastSizeRef.current.w !== W || lastSizeRef.current.h !== H) {
      geoRef.current = build(W, H)
      lastSizeRef.current = { w: W, h: H }
    }
    const geo = geoRef.current

    // ---- status (phase narration) ----
    let statusTxt = '', statusCol = ''
    if (f < 0.15)      { statusTxt = english ? 'Declaration — DX' : '선언 — DX';           statusCol = 'rgba(141,141,141,1)' }
    else if (f < 0.34) { statusTxt = english ? 'Transition — AX' : '전환 — AX로';          statusCol = 'rgba(78,163,240,1)' }
    else if (f < 0.62) { statusTxt = english ? 'Emergence — data · knowledge' : '부상 — 데이터·지식';   statusCol = 'rgba(78,163,240,1)' }
    else               { statusTxt = english ? 'A new era — AX' : '새 시대 — AX';          statusCol = 'rgba(141,141,141,1)' }

    if (statusRef.current && statusTxt !== lastStatusRef.current) {
      lastStatusRef.current = statusTxt
      statusRef.current.textContent = statusTxt
      statusRef.current.style.color = statusCol
      statusRef.current.style.textShadow = '0 0 12px ' + statusCol.replace('1)', '0.45)')
    }

    // ---- TYPOGRAPHY: word refs array parallel to l1words ----
    const l1wordRefs = [l1w0Ref, l1w1Ref, l1w2Ref, l1w3Ref, l1w4Ref]
    for (let i = 0; i < l1wordRefs.length; i++) {
      const el = l1wordRefs[i].current
      if (!el) continue
      const r = S.wRev[i]
      let op = r * seam
      let ty = (1 - r) * 14
      let sc = 1

      if (el === dxRef.current) {
        op *= (1 - 0.45 * S.ax)
        ty += S.ax * 5
        sc = 1 - 0.06 * S.ax
        el.style.color = rgba(mix([90, 90, 90], [42, 42, 42], S.ax), 1)
      }
      if (el === axRef.current) {
        ty -= S.ax * 4
        sc = 0.92 + 0.12 * S.ax
        el.style.textShadow =
          '0 0 ' + (10 + 30 * S.ax).toFixed(0) + 'px rgba(78,163,240,' + (0.25 + 0.45 * S.ax).toFixed(2) + '),' +
          '0 0 ' + (34 + 64 * S.ax).toFixed(0) + 'px rgba(78,163,240,' + (0.10 + 0.22 * S.ax).toFixed(2) + ')'
      }
      el.style.opacity = op.toFixed(3)
      el.style.transform = 'translateY(' + ty.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')'
      el.style.filter = 'blur(' + ((1 - r) * 5).toFixed(2) + 'px)'
    }

    if (l1w2Ref.current) {
      l1w2Ref.current.style.setProperty('--cross', S.cross.toFixed(3))
    }

    if (l2aRef.current) {
      l2aRef.current.style.opacity = (S.l2a * seam).toFixed(3)
      l2aRef.current.style.transform = 'translateY(' + ((1 - S.l2a) * 12).toFixed(1) + 'px)'
      l2aRef.current.style.filter = 'blur(' + ((1 - S.l2a) * 4).toFixed(2) + 'px)'
    }
    if (l2bRef.current) {
      l2bRef.current.style.opacity = (S.l2b * seam).toFixed(3)
      l2bRef.current.style.transform = 'translateY(' + ((1 - S.l2b) * 12).toFixed(1) + 'px)'
      l2bRef.current.style.filter = 'blur(' + ((1 - S.l2b) * 4).toFixed(2) + 'px)'
    }

    // ---- CANVAS ----
    g.clearRect(0, 0, W, H)
    drawSubstrate(g, geo, W, H, S)
    drawThreshold(g, geo, W, H, S)
    drawMotes(g, geo, S)
    drawStratum(g, geo, S)
    drawLabels(g, W, H, S)
  }, { running })

  return (
    <SceneHost
      className={s.root}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.04, z: 59, dur: '1.1s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.2) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 60,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 54%, rgba(0, 0, 0, 0.64) 100%)',
          z: 61,
        },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={`${s.sceneId} ${s.kr}`}>
        <b>SCENE 02</b> · {english ? 'DECLARATION' : '선언'} — AX ERA
      </div>

      <div className={s.kicker}>
        <span className={s.kickerDot} />
        <span ref={statusRef} className={`${s.status} ${s.kr}`}>{english ? 'Declaration — DX' : '선언 — DX'}</span>
      </div>

      <div className={s.hero}>
        <div className={`${s.l1} ${s.kr}`}>
          <span ref={l1w0Ref} className={`${s.w} ${s.dx}`}>DX</span>
          <span ref={l1w1Ref} className={`${s.w} ${s.muted}`}>{english ? ' → ' : '를'}</span>
          <span ref={l1w2Ref} className={`${s.w} ${s.beyond}`}>{english ? '' : '넘어'}</span>
          <span ref={l1w3Ref} className={`${s.w} ${s.ax}`}>AX</span>
          <span ref={l1w4Ref} className={`${s.w} ${s.muted}`}>{english ? ' era.' : '의 시대.'}</span>
        </div>
        <div className={`${s.l2} ${s.kr}`}>
          <span ref={l2aRef} className={s.ln}>{english ? 'Manufacturing advantage now begins with ' : '이제 제조업의 경쟁력은'}</span>
          <span ref={l2bRef} className={s.ln}>
            <span className={`${s.core} ${s.hot}`}>{english ? 'data' : '데이터'}</span>{english ? ' and ' : '와'}
            <span className={`${s.core} ${s.hot}`}>{english ? 'knowledge.' : '지식'}</span>{english ? '' : '에서 시작됩니다.'}
          </span>
        </div>
      </div>

      <div className={`${s.footer} ${s.kr}`}>
        <span>
          <b>{english ? 'Manufacturing · equipment · process' : '제조 · 설비 · 공정'}</b>{' '}
          <span className={s.footerAr}>↑ AX ↑</span>{' '}
          <b>{english ? 'Data · knowledge' : '데이터 · 지식'}</b>
        </span>
      </div>

    </SceneHost>
  )
}

/* ===== canvas draw helpers ===== */

function drawSubstrate(
  ctx: CanvasRenderingContext2D,
  geo: SceneGeo,
  W: number,
  H: number,
  S: Scalars,
) {
  const { subRows } = geo
  const time = S.time, seam = S.seam
  const appear = S.wRev[0]
  if (appear <= 0.001) return
  const glow = (0.85 - 0.30 * S.ax) * seam * appear

  ctx.lineWidth = 1
  for (let r = 0; r < subRows.length; r++) {
    const row = subRows[r]
    for (let c = 0; c < row.length - 1; c++) {
      ctx.strokeStyle = rgba(DIMC, 0.07 * glow)
      ctx.beginPath(); ctx.moveTo(row[c].x, row[c].y); ctx.lineTo(row[c + 1].x, row[c + 1].y); ctx.stroke()
    }
    if (r < subRows.length - 1) {
      const nx = subRows[r + 1]
      for (let c = 0; c < row.length; c++) {
        ctx.strokeStyle = rgba(DIMC, 0.05 * glow)
        ctx.beginPath(); ctx.moveTo(row[c].x, row[c].y); ctx.lineTo(nx[c].x, nx[c].y); ctx.stroke()
      }
    }
  }

  for (let r = 0; r < subRows.length; r++) {
    const row = subRows[r]
    const depth = 1 - (r / subRows.length)
    row.forEach(n => {
      const b = 0.5 + 0.5 * Math.sin(time * 1.3 + n.ph)
      const sz = (2.2 + 0.9 * depth) + 0.5 * b
      const a = (0.18 + 0.30 * b) * glow * (0.7 + 0.3 * depth)
      ctx.fillStyle = rgba(COLD, a)
      ctx.fillRect(n.x - sz, n.y - sz, sz * 2, sz * 2)
      if (r === 0 && S.data > 0.05) {
        ctx.strokeStyle = rgba(AZ, 0.18 * S.data * (0.4 + 0.6 * b) * seam)
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(n.x, n.y - 7 - 5 * S.data); ctx.stroke()
      }
    })
  }
}

function drawThreshold(
  ctx: CanvasRenderingContext2D,
  geo: SceneGeo,
  W: number,
  H: number,
  S: Scalars,
) {
  const time = S.time, seam = S.seam
  const open = S.ax
  const y = geo.yHorizon, x0 = W * 0.10, x1 = W * 0.90

  const baseA = 0.18 * seam * S.wRev[0]
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  g.addColorStop(0, rgba(DIMC, 0)); g.addColorStop(0.5, rgba(DIMC, baseA)); g.addColorStop(1, rgba(DIMC, 0))
  ctx.strokeStyle = g; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()

  if (open > 0.01) {
    const puls = 0.85 + 0.15 * Math.sin(time * 2.0)
    const ga = ctx.createLinearGradient(x0, 0, x1, 0)
    ga.addColorStop(0, rgba(AZ, 0)); ga.addColorStop(0.5, rgba(AZ, 0.55 * open * puls * seam)); ga.addColorStop(1, rgba(AZ, 0))
    ctx.save()
    ctx.shadowColor = rgba(AZ, 0.6 * open); ctx.shadowBlur = 18 * open
    ctx.strokeStyle = ga; ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
    ctx.restore()

    const gg = ctx.createLinearGradient(0, y, 0, y - H * 0.20)
    gg.addColorStop(0, rgba(AZ, 0.10 * open * seam)); gg.addColorStop(1, rgba(AZ, 0))
    ctx.fillStyle = gg; ctx.fillRect(x0, y - H * 0.20, x1 - x0, H * 0.20)
  }

  const surge = S.cross * (1 - S.cross) * 4
  if (surge > 0.02) {
    const px = lerp(x0, x1, S.cross)
    const gw = ctx.createRadialGradient(px, y, 0, px, y, W * 0.16)
    gw.addColorStop(0, rgba(AZH, 0.5 * surge * seam)); gw.addColorStop(1, rgba(AZ, 0))
    ctx.save(); ctx.shadowColor = rgba(AZ, 0.8 * surge); ctx.shadowBlur = 24
    ctx.fillStyle = gw; ctx.beginPath(); ctx.arc(px, y, W * 0.16, 0, 6.2832); ctx.fill()
    ctx.restore()
  }
}

function drawMotes(
  ctx: CanvasRenderingContext2D,
  geo: SceneGeo,
  S: Scalars,
) {
  const time = S.time, seam = S.seam, data = S.data
  if (data <= 0.01) return
  ctx.save()
  for (const p of geo.parts) {
    const prog = (time * p.speed + p.phase) % 1
    const e = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2
    const x = lerp(p.x0, p.x1, e) + Math.sin(time * p.swf + p.i) * p.sway * (1 - prog)
    const y = lerp(p.yA, p.yB, e)
    const edge = ease(prog / 0.08) * ease((1 - prog) / 0.10)
    const col = mix(DIMC, AZH, ease((prog - 0.15) / 0.7))
    const liveliness = 0.30 + 0.70 * data
    const a = edge * liveliness * (0.45 + 0.35 * Math.sin(time * 3 + p.i)) * seam
    if (a <= 0.01) continue
    const r = 1.0 + 1.8 * prog + (p.glyph === 0 ? 0.6 : 0)
    if (prog > 0.25) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 5)
      gr.addColorStop(0, rgba(col, 0.5 * a)); gr.addColorStop(1, rgba(col, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 5, 0, 6.2832); ctx.fill()
    }
    ctx.fillStyle = rgba(col, Math.min(1, a * 1.5))
    if (p.glyph === 1) {
      ctx.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6)
    } else {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill()
    }
    if (p.glyph === 2 && prog > 0.3) {
      ctx.strokeStyle = rgba(col, 0.4 * a); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6 + 4 * prog); ctx.stroke()
    }
  }
  ctx.restore()
}

function drawStratum(
  ctx: CanvasRenderingContext2D,
  geo: SceneGeo,
  S: Scalars,
) {
  const { strRows } = geo
  const time = S.time, seam = S.seam, data = S.data
  if (data < 0.02) return
  const form = ease((data - 0.05) / 0.7)

  ctx.save()
  ctx.lineCap = 'round'
  for (let r = 0; r < strRows.length; r++) {
    const row = strRows[r]
    for (let c = 0; c < row.length - 1; c++) {
      const grow = ease(form - c * 0.012)
      if (grow <= 0.01) continue
      const a = row[c], b = row[c + 1]
      const bx = lerp(a.x, b.x, grow), by = lerp(a.y, b.y, grow)
      const shim = 0.6 + 0.4 * Math.sin(time * 1.8 + a.ph)
      ctx.strokeStyle = rgba(AZ, (0.10 + 0.16 * shim) * data * seam)
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bx, by); ctx.stroke()
    }
  }
  if (strRows.length > 1) {
    const a = strRows[0], b = strRows[1]
    for (let c = 0; c < COLS; c += 2) {
      const shim = 0.5 + 0.5 * Math.sin(time * 1.4 + c)
      ctx.strokeStyle = rgba(AZ, 0.07 * form * data * shim * seam)
      ctx.beginPath(); ctx.moveTo(a[c].x, a[c].y); ctx.lineTo(b[c].x, b[c].y); ctx.stroke()
    }
  }
  ctx.restore()

  for (let r = 0; r < strRows.length; r++) {
    const row = strRows[r]
    row.forEach(n => {
      const b = 0.5 + 0.5 * Math.sin(time * 2.0 + n.ph)
      const r0 = (r === 0 ? 2.6 : 1.9) + 0.9 * b
      const rr = r0 * (0.7 + 0.6 * data)
      const a = (0.30 + 0.45 * b) * data * seam
      const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rr * 6)
      gr.addColorStop(0, rgba(AZH, 0.40 * a)); gr.addColorStop(1, rgba(AZ, 0))
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(n.x, n.y, rr * 6, 0, 6.2832); ctx.fill()
      ctx.fillStyle = rgba(mix(AZ, AZH, 0.4 + 0.4 * b), Math.min(1, a * 1.6))
      ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, 6.2832); ctx.fill()
    })
  }

  if (data > 0.6) {
    const row = strRows[0]
    for (let k = 0; k < 3; k++) {
      const pp = (time * 0.16 + k * 0.34) % 1
      const seg = pp * (COLS - 1)
      const c = Math.floor(seg), tv = seg - c
      if (c >= COLS - 1) continue
      const x = lerp(row[c].x, row[c + 1].x, tv), y = lerp(row[c].y, row[c + 1].y, tv)
      const fade = Math.sin(pp * Math.PI)
      ctx.fillStyle = rgba(AZH, 0.85 * data * fade * seam)
      ctx.shadowColor = rgba(AZ, 0.9); ctx.shadowBlur = 12
      ctx.beginPath(); ctx.arc(x, y, 2.4 * fade + 1, 0, 6.2832); ctx.fill()
      ctx.shadowBlur = 0
    }
  }
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  S: Scalars,
) {
  const seam = S.seam
  ctx.save()
  ctx.textAlign = 'left'

  const subA = (0.45 - 0.15 * S.ax) * seam * S.wRev[0]
  ctx.font = "700 13px 'JetBrains Mono', monospace"
  ctx.fillStyle = rgba(DIMC, subA)
  ctx.fillText('MANUFACTURING SUBSTRATE', W * 0.115, H * 0.955)
  ctx.font = "600 11px 'JetBrains Mono', monospace"
  ctx.fillStyle = rgba([90, 90, 90], subA)
  ctx.fillText('제조 · 설비 · 공정 — 물성(기반)', W * 0.115, H * 0.974)

  const strA = 0.75 * S.data * seam
  ctx.font = "700 13px 'JetBrains Mono', monospace"
  ctx.fillStyle = rgba(AZ, strA)
  ctx.fillText('KNOWLEDGE STRATUM', W * 0.115, H * 0.066)
  ctx.font = "600 11px 'JetBrains Mono', monospace"
  ctx.fillStyle = rgba(mix([90, 90, 90], AZ, S.data), strA * 0.85)
  ctx.fillText('데이터 · 지식 — 경쟁력(상층)', W * 0.115, H * 0.086)

  ctx.restore()
}
