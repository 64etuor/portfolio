'use client'

/* ════════════════════════════════════════════════════════════════
   SCENE 07 · 비용 — COST CASCADE  (31-cost-cascade.html 이식)
   한 점(커뮤니케이션 오류) → 응력 균열이 격자를 타고 전파 →
   세 갈래 파단선이 [일정 지연·기능 미스매치·현장 불만족]에 박힘 →
   지나간 격자 노드 붕괴 → 균열 역재봉으로 한 점 리셋 → 무한 루프.
   ════════════════════════════════════════════════════════════════ */

import { useCallback, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { mulberry32 } from '../_host/random'
import { clamp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

/* ---- single source of truth: origin + 3 targets (fractional) ---- */
const ORIGIN_F = { x: 0.50, y: 0.305 }
const TARGETS_F = [
  { x: 0.180, y: 0.715, arrive: 0.74 }, // 일정 지연      (lands first)
  { x: 0.500, y: 0.835, arrive: 0.93 }, // 기능 미스매치  (lands last, deepest)
  { x: 0.820, y: 0.715, arrive: 0.83 }, // 현장 불만족    (lands middle)
]

/* ---- timeline (ms) ---- */
const PH = { idle: 1700, charge: 620, rupture: 2650, hold: 2250, heal: 1550 }
const TOTAL = PH.idle + PH.charge + PH.rupture + PH.hold + PH.heal

/* ---- easing ---- */
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

type Point = [number, number]
interface Branch {
  pts: Point[]
  cum: number[]
  total: number
  pStart: number
  pEnd: number
  trunk: boolean
  w: number
}
interface DamagedNode {
  x: number
  y: number
  failP: number
}
interface Spark {
  x: number
  y: number
  life: number
}
interface PhaseState {
  ph: string
  frac: number
  p: number
  intensity: number
  charge: number
}

function genPath(sx: number, sy: number, ex: number, ey: number, segs: number, wander: number, kink: number, rnd: () => number): Point[] {
  const dx = ex - sx, dy = ey - sy, len = Math.hypot(dx, dy) || 1
  const nx = -dy / len, ny = dx / len
  const pts: Point[] = []
  for (let i = 0; i <= segs; i++) {
    const f = i / segs
    const env = Math.sin(f * Math.PI)
    let j = (rnd() * 2 - 1) * wander * env
    j += (rnd() * 2 - 1) * kink
    pts.push([sx + dx * f + nx * j, sy + dy * f + ny * j])
  }
  return pts
}

function arcLen(pts: Point[]): { cum: number[]; total: number } {
  const cum = [0]; let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    cum.push(total)
  }
  return { cum, total }
}

function pointAt(pts: Point[], cum: number[], total: number, dist: number): Point {
  if (dist <= 0) return pts[0]
  if (dist >= total) return pts[pts.length - 1]
  let lo = 0, hi = cum.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < dist) lo = mid + 1; else hi = mid }
  const i = Math.max(1, lo); const seg = cum[i] - cum[i - 1] || 1; const f = (dist - cum[i - 1]) / seg
  return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]
}

function resolve(tl: number): PhaseState {
  let t = tl, ph: string, frac: number, p = 0, intensity = 0, charge = 0
  if (t < PH.idle) { ph = 'idle'; frac = t / PH.idle }
  else if ((t -= PH.idle) < PH.charge) { ph = 'charge'; frac = t / PH.charge; charge = frac; intensity = frac * 0.5 }
  else if ((t -= PH.charge) < PH.rupture) { ph = 'rupture'; frac = t / PH.rupture; p = easeOutQuart(frac); intensity = 1; charge = 1 }
  else if ((t -= PH.rupture) < PH.hold) { ph = 'hold'; frac = t / PH.hold; p = 1; intensity = 0.9 - 0.35 * frac; charge = 1 }
  else { t -= PH.hold; ph = 'heal'; frac = t / PH.heal; p = 1 - easeInOutQuad(frac); intensity = 0.4 * (1 - frac) }
  return { ph, frac, p, intensity, charge }
}

export default function Scene({ running = true, onReady }: SceneProps) {
  /* ---- overlay DOM refs ---- */
  const headlineRef = useRef<HTMLHeadingElement | null>(null)
  const sublineRef = useRef<HTMLParagraphElement | null>(null)
  const origintagRef = useRef<HTMLDivElement | null>(null)
  const labelRefs = [
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
    useRef<HTMLDivElement | null>(null),
  ]

  useSceneReady(onReady)

  /* ---- mutable scene state (preserved across frames, reset on regen) ---- */
  const sceneState = useRef({
    seed: 1337,
    branches: [] as Branch[],
    damaged: [] as DamagedNode[],
    lattice: null as HTMLCanvasElement | null,
    sparks: [] as Spark[],
    arrived: [false, false, false],
    prevPhase: '',
    loopStartT: 0,        // f.t (seconds) at which the current loop began
    initialized: false,
    // lattice geometry
    nodesX: 0,
    NSX: 0,
    NSY: 0,
    // cached W/H for regen
    lastW: 0,
    lastH: 0,
  })

  /* ---- build static lattice offscreen canvas ---- */
  const buildLattice = useCallback((W: number, H: number, DPR: number) => {
    const sc = sceneState.current
    const step = Math.max(22, Math.min(34, W / 56))
    sc.NSX = Math.ceil(W / step) + 1
    sc.NSY = Math.ceil(H / step) + 1
    sc.nodesX = step

    const lat = document.createElement('canvas')
    lat.width = Math.round(W * DPR)
    lat.height = Math.round(H * DPR)
    const lx = lat.getContext('2d')!
    lx.setTransform(DPR, 0, 0, DPR, 0, 0)

    // faint structural grid lines (coarse)
    lx.strokeStyle = 'rgba(215,215,215,0.030)'; lx.lineWidth = 1
    for (let i = 0; i < sc.NSX; i += 3) {
      const x = i * step + 0.5
      lx.beginPath(); lx.moveTo(x, 0); lx.lineTo(x, H); lx.stroke()
    }
    for (let j = 0; j < sc.NSY; j += 3) {
      const y = j * step + 0.5
      lx.beginPath(); lx.moveTo(0, y); lx.lineTo(W, y); lx.stroke()
    }
    // intact nodes (dim phosphor dots)
    lx.fillStyle = 'rgba(140,140,140,0.20)'
    for (let j = 0; j < sc.NSY; j++) {
      for (let i = 0; i < sc.NSX; i++) {
        const x = i * step, y = j * step
        lx.fillRect(x - 0.6, y - 0.6, 1.4, 1.4)
      }
    }
    sc.lattice = lat
  }, [])

  /* ---- build damage node precompute ---- */
  const buildDamage = useCallback((branches: Branch[], W: number) => {
    const sc = sceneState.current
    const step = sc.nodesX
    const cols = sc.NSX, rows = sc.NSY
    const grid = new Float32Array(cols * rows).fill(Infinity)
    const touch = (cx: number, cy: number, p: number) => {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return
      const idx = cy * cols + cx; if (p < grid[idx]) grid[idx] = p
    }
    branches.forEach(b => {
      const span = b.pEnd - b.pStart
      const stepLen = 7
      for (let d = 0; d <= b.total; d += stepLen) {
        const pt = pointAt(b.pts, b.cum, b.total, d)
        const p = b.pStart + (b.total ? d / b.total : 0) * span
        const cx = Math.round(pt[0] / step), cy = Math.round(pt[1] / step)
        touch(cx, cy, p)
        touch(cx + 1, cy, p + 0.006); touch(cx - 1, cy, p + 0.006)
        touch(cx, cy + 1, p + 0.006); touch(cx, cy - 1, p + 0.006)
        if (b.trunk) { touch(cx + 1, cy + 1, p + 0.012); touch(cx - 1, cy - 1, p + 0.012) }
      }
    })
    sc.damaged = []
    for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
      const fp = grid[cy * cols + cx]
      if (fp !== Infinity) sc.damaged.push({ x: cx * step, y: cy * step, failP: fp })
    }
    void W // suppress unused warning
  }, [])

  /* ---- regen branches for current seed/size ---- */
  const regen = useCallback((W: number, H: number) => {
    const sc = sceneState.current
    sc.seed = (sc.seed * 1103515245 + 12345) & 0x7fffffff
    const rnd = mulberry32(sc.seed)

    const origin = { x: ORIGIN_F.x * W, y: ORIGIN_F.y * H }
    const targets = TARGETS_F.map(t => ({ x: t.x * W, y: t.y * H, arrive: t.arrive }))

    sc.branches = []
    targets.forEach((tg, ti) => {
      const dist = Math.hypot(tg.x - origin.x, tg.y - origin.y)
      const segs = Math.max(14, Math.round(dist / 26))
      const wander = dist * 0.085
      const pts = genPath(origin.x, origin.y, tg.x, tg.y, segs, wander, 2.4, rnd)
      const { cum, total } = arcLen(pts)
      const pStart = 0.015 * ti
      const pEnd = tg.arrive
      sc.branches.push({ pts, cum, total, pStart, pEnd, trunk: true, w: 2.1 })

      const forks = 3 + Math.floor(rnd() * 3)
      for (let k = 0; k < forks; k++) {
        const ff = 0.25 + rnd() * 0.6
        const fp = pointAt(pts, cum, total, ff * total)
        const fp2 = pointAt(pts, cum, total, Math.min(total, ff * total + 8))
        const ang = Math.atan2(fp2[1] - fp[1], fp2[0] - fp[0])
        const side = rnd() < 0.5 ? -1 : 1
        const off = (0.55 + rnd() * 0.7) * side
        const blen = dist * (0.10 + rnd() * 0.16)
        const ex = fp[0] + Math.cos(ang + off) * blen
        const ey = fp[1] + Math.sin(ang + off) * blen
        const bsegs = Math.max(5, Math.round(blen / 22))
        const bpts = genPath(fp[0], fp[1], ex, ey, bsegs, blen * 0.16, 1.8, rnd)
        const ba = arcLen(bpts)
        const pAtFork = pStart + ff * (pEnd - pStart)
        sc.branches.push({
          pts: bpts, cum: ba.cum, total: ba.total,
          pStart: pAtFork, pEnd: Math.min(1, pAtFork + 0.13),
          trunk: false, w: 1.0,
        })
      }
    })

    buildDamage(sc.branches, W)
    sc.arrived = [false, false, false]
    sc.sparks = []
  }, [buildDamage])

  /* ---- origin node draw ---- */
  const drawOrigin = useCallback((
    g: CanvasRenderingContext2D,
    ph: string, frac: number, nowMs: number, charge: number, p: number,
    ox: number, oy: number,
  ) => {
    const breathe = 0.5 + 0.5 * Math.sin(nowMs * 0.0026)
    let core: string, glow: string, size: number, ring = 0
    if (ph === 'idle') {
      core = `rgba(215,215,215,${0.45 + 0.4 * breathe})`
      glow = `rgba(140,140,140,${0.15 + 0.15 * breathe})`
      size = 3.2 + breathe * 0.8
    } else if (ph === 'charge') {
      const mix = charge
      core = `rgba(${215 + 24 * mix},${215 - 130 * mix},${215 - 157 * mix},${0.7 + 0.3 * mix})`
      glow = `rgba(194,85,58,${0.2 + 0.5 * mix})`
      size = 3.2 + mix * 3.2; ring = mix
    } else if (ph === 'heal') {
      core = `rgba(${239 - 24 * frac},${85 + 130 * frac},${58 + 157 * frac},0.9)`
      glow = `rgba(194,85,58,${0.4 * (1 - frac)})`
      size = 4 - frac * 0.8
    } else {
      core = 'rgba(255,236,228,0.95)'
      glow = 'rgba(194,85,58,0.6)'
      size = 4.4 + (ph === 'rupture' ? (1 - frac) * 2 : 0)
    }
    g.save()
    g.shadowBlur = 14 + ring * 16; g.shadowColor = glow
    g.fillStyle = core
    g.translate(ox, oy); g.rotate(Math.PI / 4)
    g.fillRect(-size, -size, size * 2, size * 2)
    g.restore()

    if (ring > 0.01) {
      g.strokeStyle = `rgba(194,85,58,${0.5 * ring})`; g.lineWidth = 1
      g.beginPath(); g.arc(ox, oy, 10 + ring * 8, 0, 6.283); g.stroke()
    }
  }, [])

  /* ---- sync overlay DOM (class toggles, position) ---- */
  const syncOverlay = useCallback((st: PhaseState, W: number, H: number) => {
    const sc = sceneState.current
    const { ph, p } = st

    // position fixed elements by fractional coords (matches resize() in original)
    if (origintagRef.current) {
      origintagRef.current.style.left = (ORIGIN_F.x * 100) + '%'
      origintagRef.current.style.top = (ORIGIN_F.y * 100 - 7.5) + '%'
    }
    labelRefs.forEach((ref, i) => {
      if (ref.current) {
        ref.current.style.left = (TARGETS_F[i].x * 100) + '%'
        ref.current.style.top = (TARGETS_F[i].y * 100) + '%'
      }
    })
    void W; void H // suppress unused

    // origin caption — idle/charge only
    const showOrigin = ph === 'idle' || ph === 'charge'
    if (origintagRef.current) {
      origintagRef.current.classList.toggle(s.show, showOrigin)
    }

    // headline — show through rupture/hold
    const showHead = (ph === 'rupture' && st.frac > 0.12) || ph === 'hold'
    if (headlineRef.current) {
      headlineRef.current.classList.toggle(s.show, showHead)
    }

    // subline — after all branches landed
    if (sublineRef.current) {
      sublineRef.current.classList.toggle(s.show, ph === 'hold' && st.frac > 0.18)
    }

    // terminal labels — slam when their trunk reaches target
    const targets = TARGETS_F.map(t => ({ arrive: t.arrive }))
    if (ph === 'rupture' || ph === 'hold') {
      targets.forEach((tg, i) => {
        if (!sc.arrived[i] && p >= tg.arrive) {
          sc.arrived[i] = true
          const el = labelRefs[i].current
          if (el) {
            el.classList.remove(s['out'])
            void el.offsetWidth // reflow → restart slam
            el.classList.add(s['in'])
          }
        }
      })
    }

    // heal — retract everything
    if (ph === 'heal' && sc.prevPhase !== 'heal') {
      labelRefs.forEach(ref => {
        if (ref.current) { ref.current.classList.remove(s['in']); ref.current.classList.add(s['out']) }
      })
    }
    // wrap reset (idle after heal)
    if (ph === 'idle' && sc.prevPhase === 'heal') {
      labelRefs.forEach(ref => {
        if (ref.current) { ref.current.classList.remove(s['in'], s['out']) }
      })
      sc.arrived = [false, false, false]
    }
    sc.prevPhase = ph
  }, [labelRefs])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w, H = fr.h
    const sc = sceneState.current

    // init / resize
    if (!sc.initialized || sc.lastW !== W || sc.lastH !== H) {
      buildLattice(W, H, fr.dpr)
      regen(W, H)
      sc.lastW = W; sc.lastH = H
      sc.initialized = true
      sc.loopStartT = fr.t
    }

    // timeline in ms (matching original tl = now - loopStart)
    let tl = (fr.t - sc.loopStartT) * 1000
    if (tl >= TOTAL) {
      sc.loopStartT = fr.t
      tl = 0
      regen(W, H)
    }

    const st = resolve(tl)
    const { ph, frac, p, intensity, charge } = st
    const nowMs = fr.t * 1000  // for deterministic sin tremor (matches original `now`)

    // tremor
    let tx = 0, ty = 0
    if (ph === 'rupture') {
      const m = (1 - frac) * 6.5 + 1.5
      tx = Math.sin(nowMs * 0.045) * m * 0.5 + Math.sin(nowMs * 0.11) * m * 0.3
      ty = Math.cos(nowMs * 0.052) * m * 0.5 + Math.sin(nowMs * 0.09) * m * 0.25
    } else if (ph === 'charge') {
      const m = charge * 1.8
      tx = Math.sin(nowMs * 0.08) * m; ty = Math.cos(nowMs * 0.07) * m
    }

    g.clearRect(0, 0, W, H)
    g.save()
    g.translate(tx, ty)

    // 1) static lattice
    if (sc.lattice) {
      g.globalAlpha = 0.55 + 0.25 * Math.sin(nowMs * 0.0012) + intensity * 0.15
      g.drawImage(sc.lattice, 0, 0, W, H)
      g.globalAlpha = 1
    }

    // 2) collapsing nodes
    for (let i = 0; i < sc.damaged.length; i++) {
      const n = sc.damaged[i]
      if (p < n.failP) continue
      const age = p - n.failP
      if (age < 0.05) {
        const a = 1 - age / 0.05
        g.fillStyle = `rgba(239,185,165,${0.85 * a})`
        const sz = 2.2 + 4 * a
        g.fillRect(n.x - sz / 2, n.y - sz / 2, sz, sz)
      } else {
        g.fillStyle = 'rgba(5,5,5,0.92)'
        g.fillRect(n.x - 2.2, n.y - 2.2, 4.4, 4.4)
        g.fillStyle = 'rgba(194,85,58,0.18)'
        g.fillRect(n.x - 0.7, n.y - 0.7, 1.4, 1.4)
      }
    }

    // 3) crack fracture lines
    if (p > 0.0005) {
      g.lineCap = 'round'; g.lineJoin = 'round'
      g.shadowColor = 'rgba(194,85,58,0.9)'
      for (let pass = 0; pass < 2; pass++) {
        for (let bi = 0; bi < sc.branches.length; bi++) {
          const b = sc.branches[bi]
          const span = b.pEnd - b.pStart
          const f = clamp((p - b.pStart) / span, 0, 1)
          if (f <= 0) continue
          const reveal = f * b.total
          g.beginPath()
          g.moveTo(b.pts[0][0], b.pts[0][1])
          let last: Point = b.pts[0]
          for (let i = 1; i < b.pts.length; i++) {
            if (b.cum[i] <= reveal) { g.lineTo(b.pts[i][0], b.pts[i][1]); last = b.pts[i] }
            else {
              const tip = pointAt(b.pts, b.cum, b.total, reveal)
              g.lineTo(tip[0], tip[1]); last = tip; break
            }
          }
          if (pass === 0) {
            g.strokeStyle = b.trunk ? 'rgba(194,85,58,0.30)' : 'rgba(194,85,58,0.18)'
            g.lineWidth = b.trunk ? 7 : 4
            g.shadowBlur = b.trunk ? 16 : 9
          } else {
            g.strokeStyle = b.trunk ? 'rgba(239,221,214,0.95)' : 'rgba(215,200,194,0.7)'
            g.lineWidth = b.w
            g.shadowBlur = b.trunk ? 8 : 4
          }
          g.stroke()

          // leading tip glow + spark emission
          if (pass === 1 && f < 1 && b.trunk && ph === 'rupture') {
            g.shadowBlur = 18; g.fillStyle = 'rgba(255,236,228,0.95)'
            g.beginPath(); g.arc(last[0], last[1], 3.1, 0, 6.283); g.fill()
            if (nowMs % 2 < 1) sc.sparks.push({ x: last[0], y: last[1], life: 1 })
          }
        }
      }
      g.shadowBlur = 0
    }

    // 4) spark phosphor trail
    for (let i = sc.sparks.length - 1; i >= 0; i--) {
      const sp = sc.sparks[i]; sp.life -= 0.045
      if (sp.life <= 0) { sc.sparks.splice(i, 1); continue }
      g.fillStyle = `rgba(239,185,165,${sp.life * 0.6})`
      const sz = sp.life * 2.2
      g.fillRect(sp.x - sz / 2, sp.y - sz / 2, sz, sz)
    }

    // 5) origin node
    const ox = ORIGIN_F.x * W, oy = ORIGIN_F.y * H
    drawOrigin(g, ph, frac, nowMs, charge, p, ox, oy)

    // 6) shockwave rings at rupture onset
    if (ph === 'rupture' && frac < 0.4) {
      const rf = frac / 0.4
      for (let r = 0; r < 2; r++) {
        const rr = rf * Math.max(W, H) * 0.5 * (0.6 + r * 0.5)
        const a = (1 - rf) * 0.4 * (1 - r * 0.4)
        g.strokeStyle = `rgba(194,85,58,${a})`
        g.lineWidth = 1.4; g.beginPath()
        g.arc(ox, oy, rr, 0, 6.283); g.stroke()
      }
    }

    g.restore()

    // DOM overlay sync
    syncOverlay(st, W, H)
  }, { running })

  return (
    <SceneHost className={s.root} bg="#050505">
      <canvas ref={ref} className={s.c} />

      {/* chrome */}
      <div className={`${s.eyebrow} ${s.kr}`}><b>SCENE 07</b> · 비용 — COST CASCADE</div>
      <div className={`${s.frame} ${s.frameTr}`}>FRACTURE&nbsp;PROPAGATION</div>
      <div className={`${s.frame} ${s.frameBl}`}>ORIGIN&nbsp;→&nbsp;3&nbsp;BRANCH</div>
      <div className={`${s.frame} ${s.frameBr}`}>∞&nbsp;SEAMLESS&nbsp;LOOP</div>

      {/* typography overlay */}
      <h1 ref={headlineRef} className={`${s.ov} ${s.headline} ${s.kr}`}>
        커뮤니케이션 오류는 곧 <em>비용</em>이 됩니다.
      </h1>

      <div ref={origintagRef} className={`${s.ov} ${s.origintag} ${s.kr}`}>
        <span className={s.origintagT}>ORIGIN</span>
        결함점 · 커뮤니케이션 오류<span className={s.blink}> ▮</span>
      </div>

      {/* three terminal labels */}
      <div ref={labelRefs[0]} className={`${s.clabel} ${s.kr}`}>
        <span className={s.clabelBig}>일정 지연</span>
        <span className={s.clabelTag}>Schedule&nbsp;Slip</span>
        <span className={s.ticks}><i /><i /><i /><i /></span>
      </div>
      <div ref={labelRefs[1]} className={`${s.clabel} ${s.kr}`}>
        <span className={s.clabelBig}>기능 미스매치</span>
        <span className={s.clabelTag}>Spec&nbsp;Mismatch</span>
        <span className={s.ticks}><i /><i /><i /><i /></span>
      </div>
      <div ref={labelRefs[2]} className={`${s.clabel} ${s.kr}`}>
        <span className={s.clabelBig}>현장 불만족</span>
        <span className={s.clabelTag}>Site&nbsp;Dissatisfaction</span>
        <span className={s.ticks}><i /><i /><i /><i /></span>
      </div>

      <p ref={sublineRef} className={`${s.ov} ${s.subline} ${s.kr}`}>
        한 점의 어긋남이<span className={s.sublineArr}>→</span><b>세 갈래의 비용</b>으로 이어집니다.
      </p>

      <div className={s.shell} />
    </SceneHost>
  )
}
