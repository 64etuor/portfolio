'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { type RGB, rgba, mix } from '../_host/color'
import { PALETTE_WARM, PALETTE_DIM } from '../_host/palette'
import { clamp, lerp, ease } from '../_host/math'
import { fractHash } from '../_host/random'
import { useSceneReady } from '../_host/useSceneReady'
import s from './scene.module.css'

/* ════════════════════════════════════════════════════════════════════════
   SCENE · 관점 (PERSPECTIVES) — 현장과 시스템, 하나의 랙포커스.
   public/lab/41-perspectives.html 이식.
   ════════════════════════════════════════════════════════════════════════ */

type Screen = { file: string; title: string; tag: string }
type Token = {
  t: string
  side: 'F' | 'S'
  xf: number
  yf: number
  sz: number
  ph: number
  drift: number
}
type BucketItem = { o: Token; px: number; py: number; sharp: number }
type ProcNode = {
  root: HTMLDivElement | null
  scr: HTMLDivElement | null
  iframe: HTMLIFrameElement | null
}
type Gear = { x: number; y: number; r: number; teeth: number; ph: number; spd: number }
type CodeCol = { x: number; y: number; lines: string[]; lh: number }
type ArchBox = { label: string; x: number; y: number; w: number; h: number; cx: number; cy: number }
type LayoutState = {
  w: number
  h: number
  pw: number
  ph: number
  gears: Gear[]
  codeCols: CodeCol[]
  archBox: ArchBox[]
}

const WARM: RGB = PALETTE_WARM
const WARMB: RGB = [243, 193, 132]
const COLD: RGB = [110, 168, 255]
const COLDB: RGB = [207, 224, 255]
const COLDD: RGB = [35, 70, 127]
const DIM: RGB = PALETTE_DIM



const FIELD: Screen[] = [
  { file: 'sonar-waterfall.html', title: '초음파 용착', tag: 'ULTRASONIC' },
  { file: 'weld-thermal.html', title: 'Nd:YAG 레이저 용접', tag: 'Nd:YAG' },
  { file: 'oscilloscope.html', title: '스팟 용접 검사', tag: 'SPOT' },
  { file: 'gcode-printer.html', title: '적층제조', tag: 'AM' },
  { file: 'cmm-metrology.html', title: 'CMM 정밀 측정', tag: 'CMM' },
]
const DEV: Screen[] = [
  { file: 'pid-scheme.html', title: '시스템 토폴로지', tag: 'P&ID' },
  { file: 'db-architecture.html', title: 'DB 모델링', tag: 'SCHEMA' },
  { file: 'ide-coding.html', title: 'IDE 코딩', tag: 'EDITOR' },
  { file: 'agent-governance.html', title: '에이전트 거버넌스', tag: 'GOVERN' },
  { file: 'decision-os.html', title: 'Decision OS', tag: 'DECISION' },
]

const FIELDTOK = [
  '공정',
  '설비',
  '치수',
  '공차',
  '불량',
  '작업표준',
  '양산',
  '셋업',
  '수율',
  '가공',
  '조립',
  '검사',
  '치공구',
  '사이클타임',
  '설비보전',
  '라인밸런싱',
]
const SYSTOK = [
  'SELECT *',
  'JOIN … ON',
  'schema',
  'git commit',
  'PR #',
  'branch',
  'merge',
  'API',
  '{ json }',
  'endpoint',
  'migration',
  'deploy',
  'CI / CD',
  'PRIMARY KEY',
  'FK →',
  'git push',
]
const CODE_TOK = [
  'const system = compose(',
  '  pipeline, schema,',
  '  contract, resolver',
  ')',
  '',
  'function resolve(node){',
  '  return graph.walk(node)',
  '}',
  '',
  'class Service extends Core {}',
  '',
  'api ⟶ model ⟶ store',
]

const CYCLE = 22.0
const BLUR_MAX = 6
const BLUR_STEP = 0.5
const NB = Math.round(BLUR_MAX / BLUR_STEP) + 1

const hsh = fractHash
const labUrl = (file: string) => (file.startsWith('/') ? file : `/lab/${file}`)
const makeProcNodes = (count: number): ProcNode[] => Array.from({ length: count }, () => ({ root: null, scr: null, iframe: null }))

function buildTokens() {
  const toks: Token[] = []
  FIELDTOK.forEach((t, i) => {
    const top = i % 2 === 0
    const xf = lerp(0.05, 0.45, hsh(i, 1))
    const yf = top ? lerp(0.11, 0.3, hsh(i, 2)) : lerp(0.7, 0.905, hsh(i, 3))
    toks.push({ t, side: 'F', xf, yf, sz: lerp(13, 21, hsh(i, 4)), ph: hsh(i, 5) * 6.283, drift: lerp(0.5, 1.4, hsh(i, 6)) })
  })
  SYSTOK.forEach((t, i) => {
    const top = i % 2 === 1
    const xf = lerp(0.55, 0.95, hsh(i, 7))
    const yf = top ? lerp(0.11, 0.3, hsh(i, 8)) : lerp(0.7, 0.905, hsh(i, 9))
    toks.push({ t, side: 'S', xf, yf, sz: lerp(12.5, 18.5, hsh(i, 10)), ph: hsh(i, 11) * 6.283, drift: lerp(0.5, 1.3, hsh(i, 12)) })
  })
  return toks
}

const TOKS = buildTokens()

function persp(f: number) {
  if (f < 0.1) return 0
  if (f < 0.38) return 0 // FIELD 홀드
  if (f < 0.5) return ease((f - 0.38) / 0.12) // → DEV 전환
  if (f < 0.9) return 1 // DEV 홀드(연장: 필름이 개발자 관점을 충분히 보여준 뒤 컷)
  return 1 - ease((f - 0.9) / 0.1) // → FIELD 복귀(루프 봉합, 마지막 0.1 구간)
}

function focalBreath(f: number, time: number) {
  const inPull = (f >= 0.38 && f < 0.5) || (f >= 0.78 && f < 0.9)
  const amp = inPull ? 0.012 : 0.055
  return Math.sin(time * 0.9) * amp + Math.sin(time * 0.37 + 1.3) * amp * 0.5
}

function panEnv(f: number, c: number) {
  const inW = 0.026
  const hold = 0.03
  const outW = 0.024
  const t = f - (c - inW)
  if (t < 0) return 0
  if (t < inW) return ease(t / inW)
  if (t < inW + hold) return 1
  if (t < inW + hold + outW) return 1 - ease((t - inW - hold) / outW)
  return 0
}
const fieldC = (i: number) => 0.12 + i * 0.052
const devC = (i: number) => 0.54 + i * 0.052

function buildLayout(w: number, h: number): LayoutState {
  const pw = Math.min(w * 0.19, 320)
  const ph = pw * 0.5625
  const gears = [
    { x: w * 0.42, y: h * 0.215, r: h * 0.12, teeth: 16, ph: 0.0, spd: 0.085 },
    { x: w * 0.3, y: h * 0.3, r: h * 0.072, teeth: 11, ph: 0.7, spd: -0.124 },
    { x: w * 0.34, y: h * 0.77, r: h * 0.1, teeth: 13, ph: 1.9, spd: -0.103 },
    { x: w * 0.47, y: h * 0.8, r: h * 0.058, teeth: 9, ph: 3.1, spd: 0.15 },
  ]
  const codeCols = [{ x: w * 0.62, y: h * 0.64, lines: CODE_TOK, lh: h * 0.038 }]
  const ax = w * 0.59
  const ay = h * 0.12
  const cw = w * 0.07
  const ch = h * 0.072
  const gx = w * 0.096
  const gy = h * 0.126
  const archBox = [
    { label: 'API', x: ax, y: ay },
    { label: 'SERVICE', x: ax + gx, y: ay },
    { label: 'MODEL', x: ax, y: ay + gy },
    { label: 'SCHEMA', x: ax + gx, y: ay + gy },
  ].map((m) => ({ ...m, w: cw, h: ch, cx: m.x + cw / 2, cy: m.y + ch / 2 }))
  return { w, h, pw, ph, gears, codeCols, archBox }
}

function layoutSide(nodes: ProcNode[], side: -1 | 1, w: number, h: number, pw: number, ph: number) {
  const left = side < 0 ? w * 0.045 : w - w * 0.045 - pw
  nodes.forEach((p, i) => {
    if (!p.root || !p.scr || !p.iframe) return
    p.root.style.left = `${left}px`
    p.root.style.top = `${h * 0.115 + i * h * 0.158}px`
    p.root.style.width = `${pw}px`
    p.scr.style.width = `${pw}px`
    p.scr.style.height = `${ph}px`
    p.iframe.style.transform = `scale(${(pw / 1280).toFixed(4)})`
  })
}

function syncLayout(fieldNodes: ProcNode[], devNodes: ProcNode[], layoutRef: React.MutableRefObject<LayoutState>, w: number, h: number) {
  const prev = layoutRef.current
  if (prev.w === w && prev.h === h) return prev
  const next = buildLayout(w, h)
  layoutSide(fieldNodes, -1, w, h, next.pw, next.ph)
  layoutSide(devNodes, 1, w, h, next.pw, next.ph)
  layoutRef.current = next
  return next
}

function ensureSrc(p: ProcNode, file: string) {
  if (!p.root || !p.iframe || p.root.dataset.loaded) return
  p.root.dataset.loaded = '1'
  p.iframe.src = labUrl(file)
}

function unloadSrc(p: ProcNode) {
  if (!p.root || !p.iframe || !p.root.dataset.loaded) return
  delete p.root.dataset.loaded
  p.iframe.src = 'about:blank'
}

function syncSide(nodes: ProcNode[], set: Screen[], cOf: (i: number) => number, gate: number, f: number) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const c = cOf(i)
    const nowV = panEnv(f, c)
    const env = nowV * gate
    const soon = panEnv(f + 0.055, c)
    if (nowV > 0.001 || soon > 0.001) ensureSrc(node, set[i].file)
    else unloadSrc(node)
    if (node.root) node.root.style.opacity = env.toFixed(3)
  }
}

function drawTokens(g: CanvasRenderingContext2D, w: number, h: number, time: number, focalX: number, buckets: BucketItem[][]) {
  const depth = w * 0.165
  for (let b = 0; b < NB; b++) buckets[b].length = 0
  for (const o of TOKS) {
    const px = o.xf * w + Math.cos(time * 0.42 * o.drift + o.ph) * 3.0
    const py = o.yf * h + Math.sin(time * 0.55 * o.drift + o.ph) * 4.2
    let blur = (Math.abs(px - focalX) / depth - 1) * 4.0
    blur = blur < 0 ? 0 : blur > BLUR_MAX ? BLUR_MAX : blur
    const sharp = 1 - blur / 9
    const bi = Math.round(blur / BLUR_STEP)
    buckets[bi].push({ o, px, py, sharp })
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (let bi = 0; bi < NB; bi++) {
    const bucket = buckets[bi]
    if (!bucket.length) continue
    const bv = bi * BLUR_STEP
    g.save()
    g.filter = bv > 0.15 ? `blur(${bv.toFixed(2)}px)` : 'none'
    const heavy = bv > 1.5
    for (const e of bucket) {
      const o = e.o
      const sharp = e.sharp
      const a = lerp(0.09, 0.86, sharp) * 0.92
      if (a < 0.045) continue
      const col = o.side === 'F' ? mix([150, 150, 150], WARMB, sharp) : mix([86, 98, 112], COLD, sharp)
      g.font = o.side === 'F' ? `600 ${o.sz.toFixed(1)}px 'Pretendard',sans-serif` : `500 ${o.sz.toFixed(1)}px 'JetBrains Mono',monospace`
      if (sharp > 0.5 && !heavy) {
        g.shadowColor = rgba(col, 0.5 * sharp)
        g.shadowBlur = 10 * sharp
      } else {
        g.shadowBlur = 0
      }
      g.fillStyle = rgba(col, a)
      g.fillText(o.t, e.px, e.py)
    }
    g.restore()
  }
  g.filter = 'none'
}

function drawGears(g: CanvasRenderingContext2D, time: number, vis: number, gears: Gear[]) {
  if (vis < 0.02) return
  const recede = 1 - vis
  const blur = Math.min(recede * 5.0, 5.0)
  const vm = 0.3 + 0.7 * vis
  const heavyBlur = blur > 1.5
  g.save()
  g.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none'
  for (const ge of gears) {
    const r = ge.r * lerp(0.9, 1, vis)
    const a = (0.05 + 0.05 * Math.sin(time * 0.4 + ge.ph)) * vm
    g.save()
    g.translate(ge.x, ge.y)
    g.rotate(time * ge.spd + ge.ph)
    g.strokeStyle = rgba(WARM, 0.3 * vm)
    g.lineWidth = lerp(2.4, 1.0, recede)
    if (!heavyBlur) {
      g.shadowColor = rgba(WARM, 0.3 * vm)
      g.shadowBlur = 14 * vm
    }
    g.beginPath()
    const ro = r
    const ri = r * 0.8
    for (let i = 0; i < ge.teeth * 2; i++) {
      const ang = (i / (ge.teeth * 2)) * Math.PI * 2
      const rr = i % 2 === 0 ? ro : ri
      const px = Math.cos(ang) * rr
      const py = Math.sin(ang) * rr
      if (i === 0) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.closePath()
    g.stroke()
    g.shadowBlur = 0
    g.strokeStyle = rgba(WARM, 0.22 * vm)
    g.lineWidth = 1
    g.beginPath()
    g.arc(0, 0, r * 0.62, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    g.arc(0, 0, r * 0.2, 0, Math.PI * 2)
    g.stroke()
    for (let sp = 0; sp < 4; sp++) {
      const ang = (sp / 4) * Math.PI * 2
      g.beginPath()
      g.moveTo(Math.cos(ang) * r * 0.2, Math.sin(ang) * r * 0.2)
      g.lineTo(Math.cos(ang) * r * 0.62, Math.sin(ang) * r * 0.62)
      g.stroke()
    }
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, r)
    rg.addColorStop(0, rgba(WARM, a * 0.9))
    rg.addColorStop(1, rgba(WARM, 0))
    g.fillStyle = rg
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  g.restore()
  g.filter = 'none'
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function drawSystem(g: CanvasRenderingContext2D, w: number, h: number, time: number, vis: number, codeCols: CodeCol[], archBox: ArchBox[]) {
  if (vis < 0.02) return
  const blur = Math.min((1 - vis) * 5.0, 5.0)
  const vm = 0.26 + 0.74 * vis
  const heavyBlur = blur > 1.5
  if (vis > 0.05) {
    g.save()
    g.strokeStyle = rgba(COLD, 0.03 * vis)
    g.lineWidth = 1
    const step = 52
    const gx0 = w * 0.46
    const gx1 = w * 0.97
    for (let x = gx0; x < gx1; x += step) {
      g.beginPath()
      g.moveTo(x, h * 0.12)
      g.lineTo(x, h * 0.9)
      g.stroke()
    }
    for (let y = h * 0.14; y < h * 0.9; y += step) {
      g.beginPath()
      g.moveTo(gx0, y)
      g.lineTo(gx1, y)
      g.stroke()
    }
    g.restore()
  }
  g.save()
  g.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.strokeStyle = rgba(COLD, 0.26 * vm)
  g.lineWidth = 1.3
  const link = (a: ArchBox, b: ArchBox, horizontal: boolean) => {
    const k = horizontal ? [b.cx, a.cy] : [a.cx, b.cy]
    g.beginPath()
    g.moveTo(a.cx, a.cy)
    g.lineTo(k[0], k[1])
    g.lineTo(b.cx, b.cy)
    g.stroke()
  }
  if (archBox.length) {
    link(archBox[0], archBox[1], true)
    link(archBox[0], archBox[2], false)
    link(archBox[3], archBox[1], false)
    link(archBox[2], archBox[3], true)
    const a = archBox[0]
    const b = archBox[1]
    const cphase = (time % 5.0) / 5.0
    const px = lerp(a.cx, b.cx, cphase)
    g.fillStyle = rgba(COLDB, 0.85 * vm)
    if (!heavyBlur) {
      g.shadowColor = rgba(COLD, 1)
      g.shadowBlur = 12 * vm
    }
    g.beginPath()
    g.arc(px, a.cy, 2.4, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
  }
  for (const m of archBox) {
    g.strokeStyle = rgba(COLD, 0.55 * vm)
    g.lineWidth = 1.4
    if (!heavyBlur) {
      g.shadowColor = rgba(COLD, 0.4 * vm)
      g.shadowBlur = 12 * vm
    }
    roundRect(g, m.x, m.y, m.w, m.h, 6)
    g.stroke()
    g.shadowBlur = 0
    g.fillStyle = rgba(COLDD, 0.14 * vm)
    roundRect(g, m.x, m.y, m.w, m.h, 6)
    g.fill()
    g.font = `700 ${Math.max(10, Math.min(14, w * 0.0084))}px 'JetBrains Mono',monospace`
    g.fillStyle = rgba(COLDB, 0.85 * vm)
    g.fillText(m.label, m.cx, m.cy)
  }
  g.textAlign = 'start'
  g.textBaseline = 'alphabetic'
  const fs = Math.max(10, Math.min(15, w * 0.009))
  g.font = `500 ${fs}px 'JetBrains Mono', monospace`
  for (const col of codeCols) {
    const drift = (time * 0.6) % (col.lh * 2)
    for (let li = 0; li < col.lines.length; li++) {
      const y = col.y + li * col.lh - drift
      if (y < h * 0.1 || y > h * 0.92) continue
      const isKw = /^(const|function|class|return)/.test(col.lines[li].trim())
      const c = isKw ? COLD : DIM
      g.fillStyle = rgba(c, (isKw ? 0.55 : 0.34) * vm)
      if (isKw && !heavyBlur) {
        g.shadowColor = rgba(COLD, 0.5 * vm)
        g.shadowBlur = 8 * vm
      } else {
        g.shadowBlur = 0
      }
      g.fillText(col.lines[li], col.x, y)
    }
  }
  g.shadowBlur = 0
  g.restore()
  g.filter = 'none'
}

function drawSeam(g: CanvasRenderingContext2D, w: number, h: number, time: number, sf: number) {
  const fx = lerp(w * 0.49, w * 0.51, sf) + Math.sin(time * 0.5) * w * 0.006
  const band = w * 0.055
  const col = mix(WARM, COLD, sf)
  const gr = g.createLinearGradient(fx - band, 0, fx + band, 0)
  gr.addColorStop(0, rgba(col, 0))
  gr.addColorStop(0.5, rgba(col, 0.028))
  gr.addColorStop(1, rgba(col, 0))
  g.fillStyle = gr
  g.fillRect(fx - band, 0, band * 2, h)
  g.strokeStyle = rgba(col, 0.07)
  g.lineWidth = 1
  g.setLineDash([2, 7])
  g.beginPath()
  g.moveTo(fx, h * 0.15)
  g.lineTo(fx, h * 0.85)
  g.stroke()
  g.setLineDash([])
}

function setFilterQ(el: HTMLElement, b: number, state: WeakMap<HTMLElement, { fb: number; ty: number }>) {
  let st = state.get(el)
  if (!st) {
    st = { fb: -99, ty: -99 }
    state.set(el, st)
  }
  if (Math.abs(b - st.fb) >= 0.25 || (b <= 0.04) !== (st.fb <= 0.04)) {
    el.style.filter = b > 0.04 ? `blur(${b.toFixed(2)}px)` : 'none'
    st.fb = b
  }
}

function applyHero(
  el: HTMLElement | null,
  vis: number,
  dimEls: Array<HTMLElement | null>,
  extraBlur: number,
  opaMul: number,
  state: WeakMap<HTMLElement, { fb: number; ty: number }>,
) {
  if (!el) return
  const appear = ease(vis) * opaMul
  el.style.opacity = appear.toFixed(3)
  const b = (1 - vis) * 4.0 + extraBlur
  setFilterQ(el, b, state)
  let st = state.get(el)
  if (!st) {
    st = { fb: -99, ty: -99 }
    state.set(el, st)
  }
  const ty = lerp(18, 0, appear)
  if (Math.abs(ty - st.ty) >= 0.5) {
    el.style.transform = `translateY(-50%) translateY(${ty.toFixed(1)}px) translateZ(0)`
    st.ty = ty
  }
  el.style.setProperty('--rev', appear.toFixed(3))
  const db = lerp(1.4, 4.6, 1 - vis) + extraBlur
  for (const d of dimEls) {
    if (d) setFilterQ(d, db, state)
  }
}

function setLabel(el: HTMLSpanElement | null, p: number, col: RGB, state: { lab: string; labA: number }) {
  if (!el) return
  const dist = Math.abs(p - 0.5) * 2
  const focus = ease(clamp((dist - 0.18) / 0.82, 0, 1))
  const txt = p < 0.5 ? '실무자 관점 · FIELD EXPERT' : '개발자 관점 · DEVELOPER'
  if (txt !== state.lab && focus < 0.22) {
    state.lab = txt
    el.textContent = txt
  } else if (state.lab === '') {
    state.lab = txt
    el.textContent = txt
  }
  const a = 0.32 + 0.68 * focus
  if (state.labA < 0 || Math.abs(a - state.labA) >= 0.02) {
    el.style.opacity = a.toFixed(3)
    el.style.filter = focus < 0.96 ? `blur(${((1 - focus) * 2.6).toFixed(2)}px)` : 'none'
    state.labA = a
  }
  el.style.color = rgba(col, 1)
  el.style.textShadow = `0 0 12px ${rgba(col, 0.45)}`
}

function ProcPanel({
  item,
  refs,
  index,
}: {
  item: Screen
  refs: React.MutableRefObject<ProcNode[]>
  index: number
}) {
  return (
    <div
      className={s.proc}
      ref={(el) => {
        refs.current[index].root = el
      }}
    >
      <div className={s.cap}>
        <span className={s.dot} />
        <b>{item.title}</b>
        <span className={s.tg}>{item.tag}</span>
      </div>
      <div
        className={s.scr}
        ref={(el) => {
          refs.current[index].scr = el
        }}
      >
        <iframe
          scrolling="no"
          title={item.title}
          ref={(el) => {
            refs.current[index].iframe = el
          }}
        />
      </div>
    </div>
  )
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const fieldHeroRef = useRef<HTMLDivElement | null>(null)
  const devHeroRef = useRef<HTMLDivElement | null>(null)
  const fieldDimRefs = useRef<Array<HTMLSpanElement | null>>([])
  const devDimRefs = useRef<Array<HTMLSpanElement | null>>([])
  const fieldProcRefs = useRef<ProcNode[]>(makeProcNodes(FIELD.length))
  const devProcRefs = useRef<ProcNode[]>(makeProcNodes(DEV.length))
  const vlabelRef = useRef<HTMLSpanElement | null>(null)
  const puckRef = useRef<HTMLSpanElement | null>(null)
  const layoutRef = useRef<LayoutState>({ w: -1, h: -1, pw: 300, ph: 169, gears: [], codeCols: [], archBox: [] })
  const bucketsRef = useRef<BucketItem[][]>(Array.from({ length: NB }, () => []))
  const heroStateRef = useRef(new WeakMap<HTMLElement, { fb: number; ty: number }>())
  const labelStateRef = useRef({ lab: '', labA: -1 })
  const offsetRef = useRef<number | null>(null)

  useSceneReady(onReady)

  const getOffset = () => {
    if (offsetRef.current === null) {
      offsetRef.current = typeof window === 'undefined' ? 0 : parseFloat(new URLSearchParams(window.location.search).get('t') || '') || 0
    }
    return offsetRef.current
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w
    const H = fr.h
    const time = fr.t + getOffset()
    const f = (time % CYCLE) / CYCLE
    const p = persp(f)
    const sf = ease(p)
    const fieldVis = 1 - sf
    const devVis = sf
    const layout = syncLayout(fieldProcRefs.current, devProcRefs.current, layoutRef, W, H)

    const breath = focalBreath(f, time)
    const focalX = lerp(W * 0.3, W * 0.7, clamp(sf + breath, 0, 1))

    g.clearRect(0, 0, W, H)
    drawGears(g, time, fieldVis, layout.gears)
    drawSystem(g, W, H, time, devVis, layout.codeCols, layout.archBox)
    drawTokens(g, W, H, time, focalX, bucketsRef.current)
    drawSeam(g, W, H, time, sf)

    const intro = ease(f / 0.06)
    applyHero(fieldHeroRef.current, fieldVis, fieldDimRefs.current, (1 - intro) * 3.2, intro, heroStateRef.current)
    applyHero(devHeroRef.current, devVis, devDimRefs.current, 0, 1, heroStateRef.current)

    syncSide(fieldProcRefs.current, FIELD, fieldC, fieldVis, f)
    syncSide(devProcRefs.current, DEV, devC, devVis, f)

    const puck = puckRef.current
    const pc = mix(WARM, COLD, sf)
    if (puck) {
      puck.style.left = `${(sf * 100).toFixed(2)}%`
      puck.style.background = rgba(mix(WARMB, COLDB, sf), 1)
      puck.style.boxShadow = `0 0 14px ${rgba(pc, 0.7)}`
    }
    setLabel(vlabelRef.current, p, pc, labelStateRef.current)
  }, { running })

  return (
    <SceneHost
      className={s.stage}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.045, z: 69, dur: '1.12s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.2) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 70,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse 140% 124% at 50% 50%, rgba(0, 0, 0, 0) 56%, rgba(0, 0, 0, 0.62) 100%)',
          z: 71,
        },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={s.kicker}>
        <span className={s.kr}>SCENE 05 · 관점 — PERSPECTIVES</span>
        <span className={s.sep}>/</span>
        <span className={s.rec} />
        <span className={s.vlabel} ref={vlabelRef}>
          실무자 관점 · FIELD EXPERT
        </span>
      </div>

      <div className={`${s.hero} ${s.fieldHero}`} ref={fieldHeroRef}>
        <h1 className={`${s.l1} ${s.kr}`}>
          현업은 <em>업무</em>를 가장 잘 압니다.
        </h1>
        <h2 className={`${s.l2} ${s.kr}`}>
          하지만{' '}
          <span
            className={s.dim}
            ref={(el) => {
              fieldDimRefs.current[0] = el
            }}
          >
            시스템 언어
          </span>
          와{' '}
          <span
            className={s.dim}
            ref={(el) => {
              fieldDimRefs.current[1] = el
            }}
          >
            개발 프로세스
          </span>
          는 <span className={s.strange}>낯설게</span> 느껴집니다.
        </h2>
      </div>

      <div className={`${s.hero} ${s.devHero}`} ref={devHeroRef}>
        <h1 className={`${s.l1} ${s.kr}`}>
          개발자는 <em>기술</em>을 가장 잘 압니다.
        </h1>
        <h2 className={`${s.l2} ${s.kr}`}>
          하지만 제조{' '}
          <span
            className={s.dim}
            ref={(el) => {
              devDimRefs.current[0] = el
            }}
          >
            현장
          </span>
          의 복잡한 업무와{' '}
          <span
            className={s.dim}
            ref={(el) => {
              devDimRefs.current[1] = el
            }}
          >
            경험
          </span>
          은 <span className={s.strange}>알기 어렵습니다.</span>
        </h2>
      </div>

      <div className={`${s.procs} ${s.fieldProcs}`}>
        {FIELD.map((item, index) => (
          <ProcPanel item={item} refs={fieldProcRefs} index={index} key={item.file} />
        ))}
      </div>
      <div className={`${s.procs} ${s.devProcs}`}>
        {DEV.map((item, index) => (
          <ProcPanel item={item} refs={devProcRefs} index={index} key={item.file} />
        ))}
      </div>

      <div className={s.rail}>
        <div className={s.ends}>
          <span className={s.lf}>
            현장<small>FIELD · 제조 / 공정</small>
          </span>
          <span className={s.rt}>
            시스템<small>SYSTEM · 코드 / 아키텍처</small>
          </span>
        </div>
        <div className={s.track}>
          <span className={s.tick} style={{ left: '0%' }} />
          <span className={s.tick} style={{ left: '50%' }} />
          <span className={s.tick} style={{ left: '100%' }} />
          <span className={s.puck} ref={puckRef} />
        </div>
      </div>

      <div className={`${s.footer} ${s.kr}`}>
        두 관점은 서로를 <b>완전히</b> 알지 못합니다 — 그래서 <b>잇는 사람</b>이 필요합니다
      </div>

    </SceneHost>
  )
}
