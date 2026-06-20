'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { FEATURES, SEED0, SKILLS, SYMS, TARGETS, XCHECKS } from './data'
import type { FeatureDatum, TargetDatum } from './data'
import s from './scene.module.css'

/* ============================================================
   CMM 정밀 측정 — Canvas 2.5D 아이소메트릭 검사 스테이션
   public/lab/cmm-metrology.html 포팅. 하네스가 DPR/resize/rAF 를 소유하고,
   원본 tick(ts) 본문만 useSceneCanvas draw 콜백 안으로 옮긴다.
   ============================================================ */

const ROOT_BG =
  'radial-gradient(1200px 700px at 30% -10%, #0d1622 0%, transparent 60%), radial-gradient(900px 600px at 95% 110%, #0c141f 0%, transparent 55%), #070b10'

const PART = { bx: 200, by: 140, baseH: 14 }
const ISO_X = { x: 0.866, y: 0.5 }
const ISO_Y = { x: -0.866, y: 0.5 }
const CYCLE_HOLD_MS = 4200
const BOOT_MS = 820
const FONT_MONO = '"JetBrains Mono","SF Mono",ui-monospace,"Roboto Mono",Menlo,Consolas,monospace'

const CSS = {
  pass: '#3ce6a4',
  passDim: '#1c6e52',
  fail: '#ff5d6c',
  amber: '#ffb84d',
  datum: '#6fb4ff',
  probe: '#ffd34d',
}

const COL = {
  top: '#16202e',
  topHi: '#1b2a3b',
  topLight: '#1c2a3b',
  sideR: '#0f1722',
  sideL: '#0c121b',
  edge: '#27384e',
  edgeHi: '#3a5573',
}

interface Point {
  x: number
  y: number
}

interface RuntimeFeature extends FeatureDatum {
  _tg?: RuntimeTarget
  _measured?: boolean
  _showOut?: boolean
  _markPulse?: number
}

interface RuntimeTarget extends Omit<TargetDatum, 'featureKey'> {
  f: RuntimeFeature
}

interface CloudPoint {
  x: number
  y: number
  z: number
  col: string
}

interface ProbeState {
  px: number
  py: number
  pz: number
  tpx: number
  tpy: number
  tpz: number
  touch: number
}

interface TimelineEntry {
  t: number
  fn: (frameSec: number) => void
}

interface RuntimeState {
  seed: number
  ori: Point
  scl: number
  features: RuntimeFeature[]
  targets: RuntimeTarget[]
  cloud: CloudPoint[]
  probe: ProbeState
  timeline: TimelineEntry[]
  tlIndex: number
  cycleStartSec: number
  nowMs: number
  passCount: number
  measuredFeatures: number
  cpkTarget: number
  cpkShown: number
  scanPts: number
  initialized: boolean
  bootDone: boolean
  bootDoneSec: number
  toastHideAtMs: number
  flashUntil: Record<string, number>
  activeTarget: RuntimeTarget | null
}

type RefMap<T> = { current: Record<string, T | null> }
type RefList<T> = { current: Array<T | null> }

interface SceneDomRefs {
  rows: RefMap<HTMLDivElement>
  meas: RefMap<HTMLDivElement>
  jud: RefMap<HTMLDivElement>
  chips: RefList<HTMLSpanElement>
  xrows: RefList<HTMLDivElement>
  droX: { current: HTMLSpanElement | null }
  droY: { current: HTMLSpanElement | null }
  droZ: { current: HTMLSpanElement | null }
  ptCount: { current: HTMLElement | null }
  eqCount: { current: HTMLElement | null }
  clock: { current: HTMLElement | null }
  cpkGauge: { current: HTMLCanvasElement | null }
  cpkVal: { current: HTMLElement | null }
  cpkNote: { current: HTMLElement | null }
  cpkNum: { current: HTMLElement | null }
  passN: { current: HTMLElement | null }
  verdict: { current: HTMLDivElement | null }
  statLed: { current: HTMLSpanElement | null }
  statText: { current: HTMLElement | null }
  crossover: { current: HTMLDivElement | null }
  toast: { current: HTMLDivElement | null }
  toastIc: { current: HTMLElement | null }
  toastTx: { current: HTMLElement | null }
  boot: { current: HTMLDivElement | null }
  bootFill: { current: HTMLDivElement | null }
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const text = (el: Element | null | undefined, value: string | number) => {
  if (el) el.textContent = String(value)
}

function specStr(f: FeatureDatum) {
  if (f.type === 'size') return `${f.spec}${f.unit}`
  return `${f.sym} ${f.tol?.toFixed(3)}`
}

function measStr(f: RuntimeFeature, dev?: number) {
  const d = dev === undefined ? f.dev : dev
  if (f.type === 'size') return `${((f.nom ?? 0) + d).toFixed(3)}${f.unit}`
  return `${d.toFixed(3)}${f.unit}`
}

function waitingTag(styles: typeof s) {
  return `<span class="${styles.tag} ${styles.waitingTag}">대기</span>`
}

function setTag(el: Element | null | undefined, styles: typeof s, kind: 'pass' | 'fail', label: string) {
  if (el) el.innerHTML = `<span class="${styles.tag} ${styles[kind]}">${label}</span>`
}

function createRuntimeState(): RuntimeState {
  const features: RuntimeFeature[] = FEATURES.map((feature) => ({ ...feature, _measured: false, _showOut: false, _markPulse: 0 }))
  const byKey = new Map(features.map((feature) => [feature.key, feature]))
  const targets = TARGETS.map(({ featureKey, ...target }) => {
    const f = byKey.get(featureKey)
    if (!f) throw new Error(`Missing feature for target: ${featureKey}`)
    const runtimeTarget: RuntimeTarget = { ...target, f }
    f._tg = runtimeTarget
    return runtimeTarget
  })

  return {
    seed: SEED0,
    ori: { x: 0, y: 0 },
    scl: 1,
    features,
    targets,
    cloud: [],
    probe: { px: 0, py: 0, pz: 80, tpx: 0, tpy: 0, tpz: 80, touch: 0 },
    timeline: [],
    tlIndex: 0,
    cycleStartSec: 0,
    nowMs: 0,
    passCount: 0,
    measuredFeatures: 0,
    cpkTarget: 0,
    cpkShown: 0,
    scanPts: 0,
    initialized: false,
    bootDone: false,
    bootDoneSec: 0,
    toastHideAtMs: 0,
    flashUntil: {},
    activeTarget: null,
  }
}

function rnd(st: RuntimeState) {
  st.seed = (st.seed * 1103515245 + 12345) & 0x7fffffff
  return st.seed / 0x7fffffff
}

function iso(st: RuntimeState, px: number, py: number, pz: number): Point {
  return {
    x: st.ori.x + (px * ISO_X.x + py * ISO_Y.x) * st.scl,
    y: st.ori.y + (px * ISO_X.y + py * ISO_Y.y) * st.scl - pz * st.scl,
  }
}

function layout(st: RuntimeState, W: number, H: number) {
  const areaW = W - 392 - 36 - 226
  const cx = 36 + 226 + Math.max(areaW, 420) / 2 + 20
  const cy = H * 0.56
  const diag = (PART.bx + PART.by) * 0.5
  st.scl = Math.min(Math.max(areaW, 420) / (diag * 1.55), (H - 220) / (diag * 1.15))
  st.scl = Math.max(st.scl, 1.0)
  st.ori.x = 0
  st.ori.y = 0
  const c0 = iso(st, PART.bx / 2, PART.by / 2, 8)
  st.ori.x += cx - c0.x
  st.ori.y += cy - c0.y
}

function poly(g: CanvasRenderingContext2D, pts: Point[], fill: string, stroke: string, lw?: number) {
  g.beginPath()
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.closePath()
  if (fill) {
    g.fillStyle = fill
    g.fill()
  }
  if (stroke) {
    g.lineWidth = lw || 1
    g.strokeStyle = stroke
    g.stroke()
  }
}

function box(
  g: CanvasRenderingContext2D,
  st: RuntimeState,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  topFill: string,
  sideR: string,
  sideL: string,
  stroke: string
) {
  const A = iso(st, x, y, z1)
  const B = iso(st, x + w, y, z1)
  const C = iso(st, x + w, y + d, z1)
  const D = iso(st, x, y + d, z1)
  const Ab = iso(st, x, y, z0)
  const Bb = iso(st, x + w, y, z0)
  const Cb = iso(st, x + w, y + d, z0)
  const Db = iso(st, x, y + d, z0)
  poly(g, [B, C, Cb, Bb], sideR, stroke, 1)
  poly(g, [D, A, Ab, Db], sideL, stroke, 1)
  poly(g, [A, B, Bb, Ab], sideL, stroke, 1)
  poly(g, [A, B, C, D], topFill, stroke, 1.1)
}

function drawGround(g: CanvasRenderingContext2D, st: RuntimeState) {
  const grid = 18
  const n = 14
  g.lineWidth = 1
  for (let i = -2; i <= n; i++) {
    const a = iso(st, i * grid - 20, -20, 0)
    const b = iso(st, i * grid - 20, PART.by + 40, 0)
    g.strokeStyle = i % 4 === 0 ? '#13202f' : '#0d1622'
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }
  for (let j = -2; j <= n; j++) {
    const a = iso(st, -20, j * grid - 20, 0)
    const b = iso(st, PART.bx + 40, j * grid - 20, 0)
    g.strokeStyle = j % 4 === 0 ? '#13202f' : '#0d1622'
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }
}

function drawCylinder(g: CanvasRenderingContext2D, st: RuntimeState, x: number, y: number, z0: number, z1: number, t: RuntimeTarget) {
  const r = 14
  const measured = t.f._measured
  const isOut = t.f._showOut
  const top = iso(st, x, y, z1)
  const bot = iso(st, x, y, z0)
  const rx = (r * st.scl) / 4.2
  const ry = rx * 0.5
  g.beginPath()
  g.moveTo(top.x - rx, top.y)
  g.lineTo(bot.x - rx, bot.y)
  g.arc(bot.x, bot.y, rx, Math.PI, 0, true)
  g.lineTo(top.x + rx, top.y)
  g.arc(top.x, top.y, rx, 0, Math.PI, true)
  g.closePath()
  g.fillStyle = isOut ? 'rgba(255,93,108,.14)' : measured ? 'rgba(60,230,164,.12)' : '#13202f'
  g.fill()
  g.lineWidth = 1.1
  g.strokeStyle = isOut ? CSS.fail : measured ? CSS.pass : '#2a3e55'
  g.stroke()
  g.beginPath()
  g.ellipse(top.x, top.y, rx, ry, 0, 0, Math.PI * 2)
  g.fillStyle = isOut ? '#241317' : measured ? '#16322a' : '#19293a'
  g.fill()
  g.strokeStyle = isOut ? CSS.fail : measured ? CSS.pass : '#3a5573'
  g.stroke()
}

function drawPart(g: CanvasRenderingContext2D, st: RuntimeState) {
  box(g, st, 0, 0, PART.bx, PART.by, 0, PART.baseH, COL.top, COL.sideR, COL.sideL, COL.edge)
  const A = iso(st, 0, 0, PART.baseH)
  const B = iso(st, PART.bx, 0, PART.baseH)
  const C = iso(st, PART.bx, PART.by, PART.baseH)
  g.lineWidth = 1.4
  g.strokeStyle = COL.edgeHi
  g.beginPath()
  g.moveTo(A.x, A.y)
  g.lineTo(B.x, B.y)
  g.lineTo(C.x, C.y)
  g.stroke()

  st.targets.forEach((t) => {
    const x = t.x
    const y = t.y
    if (t.type === 'pad' || t.type === 'edge' || t.type === 'slot') {
      const w = t.type === 'slot' ? 34 : 26
      const d = t.type === 'slot' ? 16 : 26
      const measured = t.f._measured
      const top = measured ? '#1d3a30' : COL.topLight
      box(g, st, x - w / 2, y - d / 2, w, d, PART.baseH, t.z, top, '#101a26', '#0c141d', '#2a3e55')
    }
    if (t.type === 'bore') {
      box(g, st, x - 15, y - 15, 30, 30, PART.baseH, t.z, '#1b2a3b', '#101a26', '#0c141d', '#2a3e55')
      const c = iso(st, x, y, t.z)
      const measured = t.f._measured
      g.beginPath()
      g.ellipse(c.x, c.y, (9 * st.scl) / 4.2, ((9 * st.scl) / 4.2) * 0.5, 0, 0, Math.PI * 2)
      g.fillStyle = '#070b10'
      g.fill()
      g.lineWidth = 1.3
      g.strokeStyle = measured ? CSS.pass : CSS.datum
      g.stroke()
    }
    if (t.type === 'cyl') {
      drawCylinder(g, st, x, y, PART.baseH, t.z, t)
    }
  })
}

function arrow(g: CanvasRenderingContext2D, from: Point, to: Point, color: string) {
  const ang = Math.atan2(to.y - from.y, to.x - from.x)
  g.save()
  g.fillStyle = color
  g.beginPath()
  g.moveTo(from.x, from.y)
  g.lineTo(from.x + Math.cos(ang + 0.4) * 7, from.y + Math.sin(ang + 0.4) * 7)
  g.lineTo(from.x + Math.cos(ang - 0.4) * 7, from.y + Math.sin(ang - 0.4) * 7)
  g.closePath()
  g.fill()
  g.restore()
}

function dimLine(g: CanvasRenderingContext2D, st: RuntimeState, p1: { x: number; y: number; z: number }, p2: { x: number; y: number; z: number }, label: string, color: string, offset: number) {
  const a = iso(st, p1.x, p1.y, p1.z)
  const b = iso(st, p2.x, p2.y, p2.z)
  g.save()
  g.strokeStyle = color
  g.lineWidth = 1
  g.setLineDash([])
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(b.x, b.y)
  g.stroke()
  arrow(g, a, b, color)
  arrow(g, b, a, color)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 - (offset || 0)
  g.font = `700 9.5px ${FONT_MONO}`
  const tw = g.measureText(label).width + 10
  g.fillStyle = 'rgba(7,11,16,.9)'
  g.fillRect(mx - tw / 2, my - 8, tw, 15)
  g.strokeStyle = color
  g.lineWidth = 1
  g.strokeRect(mx - tw / 2, my - 8, tw, 15)
  g.fillStyle = color
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(label, mx, my)
  g.restore()
}

function calloutFCF(g: CanvasRenderingContext2D, st: RuntimeState, t: RuntimeTarget, sym: string, frame: string, judged: boolean) {
  const a = iso(st, t.x, t.y, t.z)
  const lx = a.x + 38
  const ly = a.y - 46
  g.save()
  g.strokeStyle = judged ? CSS.pass : CSS.fail
  g.lineWidth = 1
  g.setLineDash([3, 3])
  g.beginPath()
  g.moveTo(a.x, a.y)
  g.lineTo(lx, ly)
  g.stroke()
  g.setLineDash([])
  g.beginPath()
  g.arc(a.x, a.y, 2.4, 0, Math.PI * 2)
  g.fillStyle = judged ? CSS.pass : CSS.fail
  g.fill()
  g.font = `700 10px ${FONT_MONO}`
  const tw = g.measureText(frame).width
  const bx = lx
  const by = ly - 9
  const bh = 18
  const symW = 16
  g.fillStyle = 'rgba(8,12,18,.94)'
  g.fillRect(bx, by, symW + tw + 8, bh)
  g.strokeStyle = judged ? CSS.passDim : 'rgba(255,93,108,.5)'
  g.lineWidth = 1
  g.strokeRect(bx, by, symW + tw + 8, bh)
  g.beginPath()
  g.moveTo(bx + symW, by)
  g.lineTo(bx + symW, by + bh)
  g.stroke()
  g.fillStyle = CSS.datum
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `12px ${FONT_MONO}`
  g.fillText(sym, bx + symW / 2, by + bh / 2 + 0.5)
  g.font = `700 10px ${FONT_MONO}`
  g.fillStyle = judged ? CSS.pass : CSS.fail
  g.textAlign = 'left'
  g.fillText(frame, bx + symW + 4, by + bh / 2 + 0.5)
  g.restore()
}

function drawGantry(g: CanvasRenderingContext2D, st: RuntimeState) {
  const { px, py, pz } = st.probe
  const topZ = 96
  const c1 = iso(st, px, -22, topZ)
  const c1b = iso(st, px, -22, 0)
  const c2 = iso(st, px, PART.by + 22, topZ)
  const c2b = iso(st, px, PART.by + 22, 0)
  g.strokeStyle = '#2a3a4f'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(c1.x, c1.y)
  g.lineTo(c1b.x, c1b.y)
  g.stroke()
  g.beginPath()
  g.moveTo(c2.x, c2.y)
  g.lineTo(c2b.x, c2b.y)
  g.stroke()
  g.strokeStyle = '#33455d'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(c1.x, c1.y)
  g.lineTo(c2.x, c2.y)
  g.stroke()
  g.strokeStyle = '#46618a'
  g.lineWidth = 1.4
  g.beginPath()
  g.moveTo(c1.x, c1.y - 3)
  g.lineTo(c2.x, c2.y - 3)
  g.stroke()
  const car = iso(st, px, py, topZ)
  g.fillStyle = '#2f4258'
  g.fillRect(car.x - 9, car.y - 7, 18, 12)
  g.strokeStyle = '#5a7da6'
  g.lineWidth = 1
  g.strokeRect(car.x - 9, car.y - 7, 18, 12)
  const tip = iso(st, px, py, pz)
  g.strokeStyle = '#7a93b3'
  g.lineWidth = 3.2
  g.beginPath()
  g.moveTo(car.x, car.y)
  g.lineTo(tip.x, tip.y + 6)
  g.stroke()
  g.strokeStyle = '#9fb6d4'
  g.lineWidth = 1.6
  g.beginPath()
  g.moveTo(tip.x, tip.y + 6)
  g.lineTo(tip.x, tip.y)
  g.stroke()
  if (st.probe.touch > 0) {
    const r = 4 + st.probe.touch * 16
    g.beginPath()
    g.arc(tip.x, tip.y, r, 0, Math.PI * 2)
    g.strokeStyle = `rgba(255,211,77,${st.probe.touch})`
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.arc(tip.x, tip.y, r * 0.55, 0, Math.PI * 2)
    g.strokeStyle = `rgba(60,230,164,${st.probe.touch * 0.8})`
    g.lineWidth = 1.4
    g.stroke()
  }
  g.beginPath()
  g.arc(tip.x, tip.y, 3.4, 0, Math.PI * 2)
  const grd = g.createRadialGradient(tip.x - 1, tip.y - 1, 0, tip.x, tip.y, 4)
  grd.addColorStop(0, '#ffe9a0')
  grd.addColorStop(1, '#ffb84d')
  g.fillStyle = grd
  g.fill()
  g.strokeStyle = '#fff2c8'
  g.lineWidth = 0.8
  g.stroke()
  const drop = iso(st, px, py, 0)
  g.strokeStyle = 'rgba(255,211,77,.25)'
  g.lineWidth = 1
  g.setLineDash([2, 4])
  g.beginPath()
  g.moveTo(tip.x, tip.y)
  g.lineTo(drop.x, drop.y)
  g.stroke()
  g.setLineDash([])
  g.strokeStyle = 'rgba(255,211,77,.4)'
  g.beginPath()
  g.moveTo(drop.x - 5, drop.y)
  g.lineTo(drop.x + 5, drop.y)
  g.moveTo(drop.x, drop.y - 3)
  g.lineTo(drop.x, drop.y + 3)
  g.stroke()
}

function drawCloud(g: CanvasRenderingContext2D, st: RuntimeState) {
  st.cloud.forEach((p) => {
    const point = iso(st, p.x, p.y, p.z)
    g.beginPath()
    g.arc(point.x, point.y, 1.1, 0, Math.PI * 2)
    g.fillStyle = p.col
    g.fill()
  })
}

function drawMeasuredMarks(g: CanvasRenderingContext2D, st: RuntimeState) {
  st.targets.forEach((t) => {
    if (!t.f._measured) return
    const a = iso(st, t.x, t.y, t.z)
    const col = t.f._showOut ? CSS.fail : CSS.pass
    const pr = 6 + (1 - (t.f._markPulse || 0)) * 10
    if ((t.f._markPulse || 0) > 0) {
      g.beginPath()
      g.arc(a.x, a.y, pr, 0, Math.PI * 2)
      g.strokeStyle = `rgba(${t.f._showOut ? '255,93,108' : '60,230,164'},${t.f._markPulse})`
      g.lineWidth = 1.4
      g.stroke()
    }
    g.beginPath()
    g.arc(a.x, a.y, 3, 0, Math.PI * 2)
    g.fillStyle = col
    g.fill()
  })
}

function drawCpk(refs: SceneDomRefs, val: number) {
  const gctx = refs.cpkGauge.current?.getContext('2d')
  if (!gctx) return
  const w = 176
  const h = 100
  gctx.clearRect(0, 0, w, h)
  const cx = w / 2
  const cy = h - 8
  const R = 72
  gctx.lineWidth = 10
  gctx.lineCap = 'round'
  gctx.strokeStyle = '#16202e'
  gctx.beginPath()
  gctx.arc(cx, cy, R, Math.PI, 0)
  gctx.stroke()
  const t = clamp01(val / 2)
  const ang = Math.PI + t * Math.PI
  const col = val >= 1.33 ? CSS.pass : val >= 1 ? CSS.amber : CSS.fail
  const g2 = gctx.createLinearGradient(0, 0, w, 0)
  g2.addColorStop(0, CSS.datum)
  g2.addColorStop(1, col)
  gctx.strokeStyle = g2
  gctx.beginPath()
  gctx.arc(cx, cy, R, Math.PI, ang)
  gctx.stroke()
  const tt = Math.PI + (1.33 / 2) * Math.PI
  gctx.strokeStyle = '#94a4bd'
  gctx.lineWidth = 2
  gctx.beginPath()
  gctx.moveTo(cx + Math.cos(tt) * (R - 9), cy + Math.sin(tt) * (R - 9))
  gctx.lineTo(cx + Math.cos(tt) * (R + 7), cy + Math.sin(tt) * (R + 7))
  gctx.stroke()
  gctx.strokeStyle = col
  gctx.lineWidth = 3
  gctx.beginPath()
  gctx.moveTo(cx, cy)
  gctx.lineTo(cx + Math.cos(ang) * (R - 14), cy + Math.sin(ang) * (R - 14))
  gctx.stroke()
  gctx.beginPath()
  gctx.arc(cx, cy, 4, 0, Math.PI * 2)
  gctx.fillStyle = col
  gctx.fill()
}

function setDRO(refs: SceneDomRefs, x: number, y: number, z: number) {
  const fmt = (v: number) => {
    const sign = v >= 0 ? '+' : '-'
    const abs = Math.abs(v).toFixed(3).padStart(7, '0')
    return sign + abs
  }
  text(refs.droX.current, fmt(x))
  text(refs.droY.current, fmt(y))
  text(refs.droZ.current, fmt(z))
}

function spawnTouchPoints(st: RuntimeState, refs: SceneDomRefs, tg: RuntimeTarget, n: number, col: string) {
  for (let k = 0; k < n; k++) {
    const a = rnd(st) * Math.PI * 2
    const rad = rnd(st) * 10 + 3
    st.cloud.push({ x: tg.x + Math.cos(a) * rad * 0.7, y: tg.y + Math.sin(a) * rad * 0.7, z: tg.z + rnd(st) * 3, col })
  }
  st.scanPts += n
  text(refs.ptCount.current, Math.min(st.scanPts, 248))
}

function bumpCpk(st: RuntimeState) {
  st.cpkTarget = 0.6 + (st.passCount / 8) * 1.13
  if (st.cpkTarget > 1.73) st.cpkTarget = 1.73
}

function updatePassN(st: RuntimeState, refs: SceneDomRefs) {
  text(refs.passN.current, `${st.passCount}/8`)
}

function commitFeature(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, f: RuntimeFeature, kind: 'out' | 'pass') {
  const row = refs.rows.current[f.key]
  text(refs.meas.current[f.key], measStr(f))
  f._measured = true
  f._markPulse = 1
  st.measuredFeatures++
  if (kind === 'out') {
    row?.classList.add(styles.outRow)
    f._showOut = true
    setTag(refs.jud.current[f.key], styles, 'fail', 'FAIL')
  } else {
    row?.classList.add(styles.flash)
    st.flashUntil[f.key] = st.nowMs + 650
    setTag(refs.jud.current[f.key], styles, 'pass', 'PASS')
    st.passCount++
    bumpCpk(st)
  }
  updatePassN(st, refs)
}

function remeasureCyl(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, f: RuntimeFeature) {
  const row = refs.rows.current[f.key]
  row?.classList.remove(styles.outRow)
  row?.classList.add(styles.fixedRow, styles.flash)
  st.flashUntil[f.key] = st.nowMs + 650
  f._showOut = false
  f._markPulse = 1
  text(refs.meas.current[f.key], measStr(f, f.redev))
  setTag(refs.jud.current[f.key], styles, 'pass', 'PASS')
  st.passCount++
  bumpCpk(st)
  updatePassN(st, refs)
  text(refs.statText.current, '원통도 PASS — 측정 계속')
}

function showToast(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, html: string, kind: 'warn' | 'pass') {
  const toast = refs.toast.current
  if (!toast) return
  if (refs.toastTx.current) refs.toastTx.current.innerHTML = html
  text(refs.toastIc.current, kind === 'pass' ? '✓' : '⚠')
  toast.className = `${styles.hud} ${styles.toast}${kind === 'pass' ? ` ${styles.pass}` : ''}`
  void toast.offsetWidth
  toast.classList.add(styles.show)
  st.toastHideAtMs = st.nowMs + (kind === 'pass' ? 4200 : 3800)
}

function genTimeline(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  st.timeline = []
  let t = 900
  st.timeline.push({ t: 200, fn: () => { st.probe.tpx = 10; st.probe.tpy = 10; st.probe.tpz = 90 } })
  SKILLS.forEach((_, i) => {
    st.timeline.push({
      t: 500 + i * 55,
      fn: () => {
        refs.chips.current[i]?.classList.add(styles.on)
        text(refs.eqCount.current, `${i + 1}/${SKILLS.length}`)
      },
    })
  })

  st.features.forEach((f) => {
    const tg = f._tg
    if (!tg) return
    st.timeline.push({ t, fn: () => { refs.rows.current[f.key]?.classList.add(styles.show) } })
    st.timeline.push({
      t: t + 120,
      fn: () => {
        st.activeTarget = tg
        text(refs.statText.current, `MOVE → ${f.feat}`)
        st.probe.tpx = tg.x
        st.probe.tpy = tg.y
        st.probe.tpz = tg.z + 34
      },
    })
    st.timeline.push({
      t: t + 780,
      fn: () => {
        st.probe.tpz = tg.z + 3
        text(refs.statText.current, `PROBING · ${f.feat}`)
      },
    })
    st.timeline.push({
      t: t + 1280,
      fn: () => {
        st.probe.touch = 1
        spawnTouchPoints(st, refs, tg, 26, f.special ? 'rgba(255,93,108,.8)' : 'rgba(111,180,255,.75)')
        commitFeature(st, refs, styles, f, f.special ? 'out' : 'pass')
      },
    })
    if (f.special) {
      st.timeline.push({
        t: t + 2300,
        fn: () => {
          showToast(st, refs, styles, '⌭ <b>원통도</b> 0.061mm — 공차 0.040mm <b>초과(OUT-OF-TOL)</b> · 이상점(버) 검출 → 재측정', 'warn')
          text(refs.statText.current, 'OUT OF TOL — 이상점 제거 재측정')
        },
      })
      st.timeline.push({ t: t + 3600, fn: () => { st.probe.tpx = tg.x; st.probe.tpy = tg.y; st.probe.tpz = tg.z + 3 } })
      st.timeline.push({
        t: t + 4100,
        fn: () => {
          st.probe.touch = 1
          st.cloud.forEach((p) => {
            if (Math.abs(p.x - tg.x) < 14 && Math.abs(p.y - tg.y) < 14) p.col = 'rgba(60,230,164,.85)'
          })
          spawnTouchPoints(st, refs, tg, 18, 'rgba(60,230,164,.85)')
          remeasureCyl(st, refs, styles, f)
          showToast(st, refs, styles, '✓ 이상점 제거 재측정 <b>0.024mm IN-TOL</b> — 원통도 합격 · PASS', 'pass')
        },
      })
      t += 4900
    } else {
      t += 2100
    }
  })

  st.timeline.push({
    t: t + 200,
    fn: () => {
      text(refs.statText.current, 'REPORT 자동발행')
      st.probe.tpx = PART.bx / 2
      st.probe.tpy = -10
      st.probe.tpz = 95
    },
  })
  st.timeline.push({
    t: t + 1200,
    fn: () => {
      refs.statLed.current?.classList.add(styles.done)
      text(refs.statText.current, 'INSPECTION COMPLETE')
      refs.verdict.current?.classList.add(styles.on)
      text(refs.cpkNote.current, '전 피처 규격 내 · 자동발행 완료')
    },
  })
  st.timeline.push({ t: t + 1700, fn: () => { refs.crossover.current?.classList.add(styles.on) } })
  refs.xrows.current.forEach((_, i) => {
    st.timeline.push({ t: t + 2000 + i * 180, fn: () => { refs.xrows.current[i]?.classList.add(styles.show) } })
  })

  const lastT = t + 2000 + XCHECKS.length * 180
  st.timeline.push({ t: lastT + CYCLE_HOLD_MS, fn: (frameSec) => { restartCycle(st, refs, styles, frameSec) } })
}

function restartCycle(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, frameSec: number) {
  st.features.forEach((f) => {
    const row = refs.rows.current[f.key]
    row?.classList.remove(styles.show, styles.flash, styles.outRow, styles.fixedRow)
    text(refs.meas.current[f.key], '— —')
    const jud = refs.jud.current[f.key]
    if (jud) jud.innerHTML = waitingTag(styles)
    f._measured = false
    f._showOut = false
    f._markPulse = 0
  })
  st.passCount = 0
  st.measuredFeatures = 0
  updatePassN(st, refs)

  st.cloud.length = 0
  st.scanPts = 0
  text(refs.ptCount.current, 0)
  st.seed = SEED0

  refs.chips.current.forEach((chip) => chip?.classList.remove(styles.on))
  text(refs.eqCount.current, `0/${SKILLS.length}`)

  st.cpkTarget = 0
  st.cpkShown = 0
  text(refs.cpkNote.current, '측정 대기…')
  refs.verdict.current?.classList.remove(styles.on)
  refs.crossover.current?.classList.remove(styles.on)
  refs.xrows.current.forEach((row) => row?.classList.remove(styles.show))

  refs.statLed.current?.classList.remove(styles.done)
  text(refs.statText.current, 'INSPECTING')
  const toast = refs.toast.current
  if (toast) toast.className = `${styles.hud} ${styles.toast}`
  st.toastHideAtMs = 0
  st.flashUntil = {}

  st.probe.tpx = 10
  st.probe.tpy = 10
  st.probe.tpz = 90

  genTimeline(st, refs, styles)
  st.tlIndex = 0
  st.cycleStartSec = frameSec
  st.nowMs = 0
}

function initializeRuntime(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  if (st.initialized) return
  genTimeline(st, refs, styles)
  drawCpk(refs, 0)
  st.initialized = true
}

function updateBoot(st: RuntimeState, refs: SceneDomRefs, styles: typeof s, frameSec: number) {
  if (st.bootDone) {
    if (frameSec - st.bootDoneSec > 0.65 && refs.boot.current) refs.boot.current.style.display = 'none'
    return
  }
  const p = Math.min(st.nowMs / BOOT_MS, 1)
  if (refs.bootFill.current) refs.bootFill.current.style.width = `${(p * 100).toFixed(0)}%`
  if (p >= 1) {
    st.bootDone = true
    st.bootDoneSec = frameSec
    refs.boot.current?.classList.add(styles.hide)
  }
}

function updateTimedDom(st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  Object.entries(st.flashUntil).forEach(([key, until]) => {
    if (st.nowMs >= until) {
      refs.rows.current[key]?.classList.remove(styles.flash)
      delete st.flashUntil[key]
    }
  })
  if (st.toastHideAtMs && st.nowMs >= st.toastHideAtMs) {
    refs.toast.current?.classList.remove(styles.show)
    st.toastHideAtMs = 0
  }
}

function drawScene(g: CanvasRenderingContext2D, fr: Frame, st: RuntimeState, refs: SceneDomRefs, styles: typeof s) {
  initializeRuntime(st, refs, styles)
  const W = fr.w
  const H = fr.h
  layout(st, W, H)
  st.nowMs = Math.max(0, (fr.t - st.cycleStartSec) * 1000)
  updateBoot(st, refs, styles, fr.t)

  while (st.tlIndex < st.timeline.length && st.nowMs >= st.timeline[st.tlIndex].t) {
    st.timeline[st.tlIndex].fn(fr.t)
    st.tlIndex++
  }
  updateTimedDom(st, refs, styles)

  const ease = 0.12
  st.probe.px += (st.probe.tpx - st.probe.px) * ease
  st.probe.py += (st.probe.tpy - st.probe.py) * ease
  st.probe.pz += (st.probe.tpz - st.probe.pz) * ease
  st.probe.touch *= 0.92
  if (st.probe.touch < 0.01) st.probe.touch = 0
  st.features.forEach((f) => {
    if ((f._markPulse || 0) > 0) {
      f._markPulse = (f._markPulse || 0) - 0.02
      if (f._markPulse < 0) f._markPulse = 0
    }
  })
  st.cpkShown += (st.cpkTarget - st.cpkShown) * 0.08
  text(refs.cpkVal.current, st.cpkShown.toFixed(2))
  if (refs.cpkNum.current) {
    refs.cpkNum.current.style.color = st.cpkShown >= 1.33 ? CSS.pass : st.cpkShown >= 1 ? CSS.amber : CSS.fail
  }
  drawCpk(refs, st.cpkShown)

  setDRO(refs, st.probe.px, st.probe.py, st.probe.pz)
  text(refs.clock.current, `T+${(st.nowMs / 1000).toFixed(1)}s`)

  g.clearRect(0, 0, W, H)
  drawGround(g, st)
  drawPart(g, st)
  drawCloud(g, st)
  drawMeasuredMarks(g, st)

  st.targets.forEach((t) => {
    if (t.f._measured) {
      const sym = SYMS[t.f.key]
      calloutFCF(g, st, t, sym[0], sym[1], !t.f._showOut)
    }
  })

  dimLine(g, st, { x: 0, y: -8, z: PART.baseH }, { x: PART.bx, y: -8, z: PART.baseH }, '200.00', CSS.datum, 0)
  dimLine(g, st, { x: -8, y: 0, z: PART.baseH }, { x: -8, y: PART.by, z: PART.baseH }, '140.00', CSS.datum, 0)
  drawGantry(g, st)
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const readyFired = useRef(false)
  const runtimeRef = useRef<RuntimeState | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createRuntimeState()

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const measRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const judRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([])
  const xrowRefs = useRef<Array<HTMLDivElement | null>>([])
  const droXRef = useRef<HTMLSpanElement | null>(null)
  const droYRef = useRef<HTMLSpanElement | null>(null)
  const droZRef = useRef<HTMLSpanElement | null>(null)
  const ptCountRef = useRef<HTMLElement | null>(null)
  const eqCountRef = useRef<HTMLElement | null>(null)
  const clockRef = useRef<HTMLElement | null>(null)
  const cpkGaugeRef = useRef<HTMLCanvasElement | null>(null)
  const cpkValRef = useRef<HTMLElement | null>(null)
  const cpkNoteRef = useRef<HTMLDivElement | null>(null)
  const cpkNumRef = useRef<HTMLDivElement | null>(null)
  const passNRef = useRef<HTMLElement | null>(null)
  const verdictRef = useRef<HTMLDivElement | null>(null)
  const statLedRef = useRef<HTMLSpanElement | null>(null)
  const statTextRef = useRef<HTMLElement | null>(null)
  const crossoverRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)
  const toastIcRef = useRef<HTMLElement | null>(null)
  const toastTxRef = useRef<HTMLElement | null>(null)
  const bootRef = useRef<HTMLDivElement | null>(null)
  const bootFillRef = useRef<HTMLDivElement | null>(null)

  const refs: SceneDomRefs = {
    rows: rowRefs,
    meas: measRefs,
    jud: judRefs,
    chips: chipRefs,
    xrows: xrowRefs,
    droX: droXRef,
    droY: droYRef,
    droZ: droZRef,
    ptCount: ptCountRef,
    eqCount: eqCountRef,
    clock: clockRef,
    cpkGauge: cpkGaugeRef,
    cpkVal: cpkValRef,
    cpkNote: cpkNoteRef,
    cpkNum: cpkNumRef,
    passN: passNRef,
    verdict: verdictRef,
    statLed: statLedRef,
    statText: statTextRef,
    crossover: crossoverRef,
    toast: toastRef,
    toastIc: toastIcRef,
    toastTx: toastTxRef,
    boot: bootRef,
    bootFill: bootFillRef,
  }

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    drawScene(g, fr, runtimeRef.current!, refs, s)
  }, { running })

  return (
    <SceneHost className={s.root} bg={ROOT_BG}>
      <div className={s.app}>
        <canvas ref={ref} className={s.stage} />

        <div className={`${s.hud} ${s.topbar}`}>
          <div className={s.brand}>
            <span className={s.nm}>CMM 좌표측정</span>
            <span className={s.en}>COORDINATE METROLOGY</span>
          </div>
          <div className={s.sep} />
          <span className={s.role}>3D 좌표측정 · GD&amp;T 검증 · 검사성적서 자동발행</span>
          <div className={s.machine}>
            <span>BRIDGE CMM · 스캐닝 프로브 <b>Ø2.0mm RUBY</b></span>
            <span className={`${s.sep} ${s.shortSep}`} />
            <span className={s.statled} ref={statLedRef}>
              <span className={s.dot} />
              <span ref={statTextRef}>INSPECTING</span>
            </span>
          </div>
        </div>

        <div className={`${s.hud} ${s.dro}`}>
          <div className={s.droAxis}><span className={s.ax}>X</span><span className={s.val} ref={droXRef}>+000.000</span><span className={s.un}>mm</span></div>
          <div className={s.droAxis}><span className={s.ax}>Y</span><span className={s.val} ref={droYRef}>+000.000</span><span className={s.un}>mm</span></div>
          <div className={s.droAxis}><span className={s.ax}>Z</span><span className={s.val} ref={droZRef}>+000.000</span><span className={s.un}>mm</span></div>
          <div className={s.droMeta}>
            <span>측정점 <b ref={ptCountRef}>0</b> / 248</span>
            <span>FEED <b>180</b> mm/min</span>
            <span>PROBE <b>SCAN</b></span>
            <span ref={clockRef}>T+00.0s</span>
          </div>
        </div>

        <div className={`${s.hud} ${s.legend}`}>
          <div className={s.lgH}>GD&amp;T 기하공차</div>
          <div className={s.lgRow}><div className={s.lgSym}>⏥</div><div className={s.lgTx}><b>평면도</b> Flatness 0.02</div></div>
          <div className={s.lgRow}><div className={s.lgSym}>⌖</div><div className={s.lgTx}><b>위치도</b> Position Ø0.05 Ⓜ</div></div>
          <div className={s.lgRow}><div className={s.lgSym}>⌭</div><div className={s.lgTx}><b>원통도</b> Cylindricity 0.04</div></div>
          <div className={s.lgRow}><div className={s.lgSym}>◎</div><div className={s.lgTx}><b>동심도</b> Concentricity Ø0.03</div></div>
          <div className={s.lgRow}><div className={s.lgSym}>∥</div><div className={s.lgTx}><b>평행도</b> Parallelism 0.02 A</div></div>
          <div className={s.datumtag}>
            <div className={s.dchip}>⟦A⟧</div>
            <div className={s.dchip}>⟦B⟧</div>
            <div className={s.dchip}>⟦C⟧</div>
          </div>
        </div>

        <div className={`${s.hud} ${s.equip}`}>
          <div className={s.eqH}><span>측정 기법 · 장비</span><span ref={eqCountRef}>0/18</span></div>
          <div className={s.chips}>
            {SKILLS.map((skillName, i) => (
              <span
                className={s.chip}
                key={skillName}
                ref={(el) => {
                  chipRefs.current[i] = el
                }}
              >
                {skillName}
              </span>
            ))}
          </div>
        </div>

        <div className={`${s.hud} ${s.report}`}>
          <div className={s.rpTop}>
            <div className={s.rpTitle}>
              <span className={s.t}>검사 성적서</span>
              <span className={s.badge}>RPT-2026-0618</span>
            </div>
            <div className={s.rpSub}>
              <span>PART <b>DATUM-BLOCK-01</b></span>
              <span>발행 <b>AUTO</b></span>
              <span>S/N <b>SN-04412</b></span>
            </div>
          </div>
          <div className={s.rpHead}>
            <span>측정 피처 (FEATURE)</span><span className={s.r}>규격 · 공차</span><span className={s.r}>실측</span><span className={s.r}>판정</span>
          </div>
          <div className={s.rpBody}>
            {FEATURES.map((feature) => (
              <div
                className={s.row}
                data-key={feature.key}
                key={feature.key}
                ref={(el) => {
                  rowRefs.current[feature.key] = el
                }}
              >
                <div className={s.feat}>{feature.feat}<span className={s.ftSub}>{feature.sub}</span></div>
                <div className={s.spec}>{specStr(feature)}</div>
                <div
                  className={s.meas}
                  ref={(el) => {
                    measRefs.current[feature.key] = el
                  }}
                >
                  — —
                </div>
                <div
                  className={s.jud}
                  ref={(el) => {
                    judRefs.current[feature.key] = el
                  }}
                >
                  <span className={`${s.tag} ${s.waitingTag}`}>대기</span>
                </div>
              </div>
            ))}
          </div>
          <div className={s.rpFoot}>
            <div className={s.cpkWrap}>
              <div className={s.gauge}><canvas ref={cpkGaugeRef} width={176} height={100} /></div>
              <div className={s.cpkRead}>
                <div className={s.lab}>공정능력 Cpk</div>
                <div className={s.num} ref={cpkNumRef}><span ref={cpkValRef}>0.00</span> <small>(목표 ≥1.33)</small></div>
                <div className={s.note} ref={cpkNoteRef}>측정 대기…</div>
              </div>
            </div>
            <div className={s.verdict} ref={verdictRef}>
              <span className={s.vbig}>PASS</span>
              <span className={s.vtx}><b ref={passNRef}>0/8</b> 피처 합격 · 전 GD&amp;T 규격 내<br />검사성적서 자동발행 완료 — 양산 승인</span>
              <span className={s.stamp}>APPROVED<br />QA · METROLOGY</span>
            </div>
            <div className={s.belief}>
              <div className={s.bq}>“측정할 수 없으면 <b>관리할 수 없다.</b>”</div>
              <div className={s.bm}>
                <span className={s.bchip}>전 피처 <b>GD&amp;T 검증</b></span>
                <span className={s.bchip}>공차 대비 <b>편차 정량화</b></span>
                <span className={s.bchip}>20°C <b>기준 보정</b></span>
              </div>
            </div>
          </div>
        </div>

        <div className={`${s.hud} ${s.crossover}`} ref={crossoverRef}>
          <div className={s.xoTop}>
            <div className={s.xoKick}>MEASUREMENT INTEGRITY · 20°C / ISO 10360</div>
            <div className={s.xoTitle}>측정값은 <b>데이텀·열보정·불확도</b><br />위에서만 신뢰할 수 있다</div>
            <div className={s.xoSub}>
              데이텀 = <span className={s.dat}>부품 좌표계 (3-2-1)</span> · 프로브 = <span className={s.dat}>Ø2.0 루비</span><br />
              측정 신호 = 접촉 좌표 → <b className={s.passText}>LSQ 피팅</b>
            </div>
          </div>
          <div className={s.xoHead}>
            <span>신뢰성 점검 (6)</span><span className={s.r}>처리</span><span className={s.r}>상태</span>
          </div>
          <div className={s.xoBody}>
            {XCHECKS.map((check, i) => (
              <div
                className={s.xrow}
                key={check.feat}
                ref={(el) => {
                  xrowRefs.current[i] = el
                }}
              >
                <div className={s.xf}>{check.feat}<span className={s.xs}>{check.sub}</span></div>
                <div className={s.xd}>{check.dev}</div>
                <div className={s.xj}>
                  <span className={`${s.tag} ${check.jud === 'pass' ? s.pass : s.remeas}`}>{check.jud === 'pass' ? 'OK' : '필터'}</span>
                </div>
              </div>
            ))}
          </div>
          <div className={s.xoFoot}>
            <div className={s.xnote}><b>핵심:</b> 데이텀 정렬 → 열보정(20°C) → 최소자승 피팅 → 이상점 필터 → 불확도 평가. 그 위에서만 GD&amp;T 판정과 Cpk가 의미를 가진다.</div>
            <div className={s.xverdict}><span>계측 추적성 · ISO 표준기 소급</span><span className={s.xstamp}>TRACEABLE</span></div>
          </div>
        </div>

        <div className={`${s.hud} ${s.toast}`} ref={toastRef}>
          <span className={s.ic} ref={toastIcRef}>⚠</span>
          <span className={s.tt} ref={toastTxRef} />
        </div>
      </div>

      <div className={s.boot} ref={bootRef}>
        <div className={s.bootMark}>COORDINATE MEASURING MACHINE · METROLOGY</div>
        <div className={s.bootTitle}>CMM 검사 스테이션 초기화 — 데이텀 정렬 · 프로브 자격</div>
        <div className={s.bootBar}><div className={s.bootFill} ref={bootFillRef} /></div>
      </div>
    </SceneHost>
  )
}
