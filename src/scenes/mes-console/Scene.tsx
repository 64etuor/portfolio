'use client'

import { useEffect, useId, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { clamp, lerp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import {
  DEFECTS,
  GAUGE_COLORS,
  GAUGES,
  JOBS,
  KPIS,
  LIVE_POOL,
  SEED_EVENTS,
  SKILL_GROUPS,
  type FeedSeverity,
} from './data'
import s from './scene.module.css'

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const easeCubicOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
const fmt = (n: number) => n.toFixed(2)

type Point = [number, number]
type SparkState = { data: number[]; range: readonly [number, number] }
type Runtime = {
  gauges: Array<{ cur: number }>
  topSparks: SparkState[]
  kpiSparks: SparkState[]
  kpis: Array<{ live: number; nextTarget: number; nextAt: number; cycleDone: number }>
  lastSparkAt: number
  trendCycle: number
  trendData: Array<{ w: number; v: number }>
  seedIndex: number
  shuffledEvents: Array<{ sev: FeedSeverity; msg: string }>
  poolIndex: number
  nextLiveAt: number
  alarmTotal: number
  andonResetAt: number
  feedRemovals: Array<{ el: Element; removeAt: number }>
}

const sparkRanges = [
  [820, 910],
  [11.5, 13.2],
  [88, 97],
] as const

function shuffleEvents() {
  return [...LIVE_POOL].sort(() => Math.random() - 0.5)
}

function createSpark(range: readonly [number, number]) {
  return { range, data: Array.from({ length: 44 }, () => rnd(range[0], range[1])) }
}

function createRuntime(): Runtime {
  return {
    gauges: GAUGES.map((g) => ({ cur: g.target })),
    topSparks: sparkRanges.map(createSpark),
    kpiSparks: KPIS.map((k) => createSpark(k.sparkRange)),
    kpis: KPIS.map((k) => ({ live: k.value, nextTarget: k.value, nextAt: rnd(1800, 3200), cycleDone: -1 })),
    lastSparkAt: 0,
    trendCycle: -1,
    trendData: generateTrendData(),
    seedIndex: 0,
    shuffledEvents: shuffleEvents(),
    poolIndex: 0,
    nextLiveAt: SEED_EVENTS.length * 300 + 800 + rnd(1500, 2800),
    alarmTotal: 0,
    andonResetAt: 0,
    feedRemovals: [],
  }
}

function polar(radius: number, angle: number) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const
}

function gaugeArc(frac: number) {
  const inner = 35
  const outer = 44
  const start = -Math.PI / 2
  const end = start + Math.PI * clamp(frac, 0.001, 1)
  const [osx, osy] = polar(outer, start)
  const [oex, oey] = polar(outer, end)
  const [iex, iey] = polar(inner, end)
  const [isx, isy] = polar(inner, start)
  const large = end - start > Math.PI ? 1 : 0
  return `M ${fmt(osx)} ${fmt(osy)} A ${outer} ${outer} 0 ${large} 1 ${fmt(oex)} ${fmt(oey)} L ${fmt(iex)} ${fmt(iey)} A ${inner} ${inner} 0 ${large} 0 ${fmt(isx)} ${fmt(isy)} Z`
}

function catmullPath(points: Point[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${fmt(points[0][0])} ${fmt(points[0][1])}`
  let d = `M ${fmt(points[0][0])} ${fmt(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`
  }
  return d
}

function areaPath(points: Point[], baseY: number) {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${catmullPath(points)} L ${fmt(last[0])} ${fmt(baseY)} L ${fmt(first[0])} ${fmt(baseY)} Z`
}

function sparkPaths(data: number[], width: number, height: number) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const lo = min * 0.96
  const hi = max * 1.04
  const span = hi - lo || 1
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * width
    const y = height - 2 - ((v - lo) / span) * (height - 5)
    return [x, y] as Point
  })
  return { line: catmullPath(pts), area: areaPath(pts, height) }
}

function updateSpark(
  svg: SVGSVGElement | null,
  line: SVGPathElement | null,
  area: SVGPathElement | null,
  state: SparkState,
) {
  if (!svg || !line || !area) return
  const width = svg.clientWidth || 220
  const height = svg.clientHeight || 30
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('preserveAspectRatio', 'none')
  const paths = sparkPaths(state.data, width, height)
  line.setAttribute('d', paths.line)
  area.setAttribute('d', paths.area)
}

function pushSpark(state: SparkState) {
  const next = rnd(state.range[0], state.range[1])
  state.data.push(next)
  state.data.shift()
  return next
}

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x))
  return x >= 0 ? y : -y
}

function cdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

function updateBell(svg: SVGSVGElement | null, cpk: number, ms: number) {
  if (!svg) return
  const width = svg.clientWidth || 300
  const height = svg.clientHeight || 120
  const m = { l: 6, r: 6, t: 8, b: 16 }
  const x = (v: number) => m.l + ((v + 4.2) / 8.4) * (width - m.l - m.r)
  const pdf = (v: number) => Math.exp(-0.5 * v * v) / Math.sqrt(2 * Math.PI)
  const pts = Array.from({ length: 85 }, (_, i) => -4.2 + i * 0.1).map((v) => [v, pdf(v)] as const)
  const maxY = Math.max(...pts.map((p) => p[1]))
  const y = (v: number) => height - m.b - (v / maxY) * (height - m.t - m.b)
  const lsl = -3 * cpk
  const usl = 3 * cpk
  const toPts = (rows: ReadonlyArray<readonly [number, number]>) => rows.map((p) => [x(p[0]), y(p[1])] as Point)
  const progress = easeCubicOut((ms % 5200) / 1400)
  const outsideLeft = pts.filter((p) => p[0] >= -4.2 && p[0] <= lsl)
  const outsideRight = pts.filter((p) => p[0] >= usl && p[0] <= 4.2)
  const inside = pts.filter((p) => p[0] >= lsl && p[0] <= usl)
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.innerHTML = `
    <path fill="rgba(255,77,77,.25)" d="${areaPath(toPts(outsideLeft), y(0))}" />
    <path fill="rgba(255,77,77,.25)" d="${areaPath(toPts(outsideRight), y(0))}" />
    <path fill="rgba(55,240,142,.14)" d="${areaPath(toPts(inside), y(0))}" />
    <path fill="none" stroke="#3fd0e0" stroke-width="1.6" filter="drop-shadow(0 0 4px #3fd0e0)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${fmt(1 - progress)}" d="${catmullPath(toPts(pts))}" />
    <line x1="${fmt(x(lsl))}" x2="${fmt(x(lsl))}" y1="${m.t}" y2="${height - m.b}" stroke="#ff4d4d" stroke-width="1" stroke-dasharray="2 2" opacity=".7" />
    <line x1="${fmt(x(usl))}" x2="${fmt(x(usl))}" y1="${m.t}" y2="${height - m.b}" stroke="#ff4d4d" stroke-width="1" stroke-dasharray="2 2" opacity=".7" />
    <text x="${fmt(x(lsl))}" y="${height - 4}" text-anchor="middle" fill="#ff4d4d">LSL</text>
    <text x="${fmt(x(usl))}" y="${height - 4}" text-anchor="middle" fill="#ff4d4d">USL</text>
    <line x1="${fmt(x(0))}" x2="${fmt(x(0))}" y1="${m.t}" y2="${height - m.b}" stroke="#ffb627" stroke-width="1" opacity=".5" />
  `
}

function updatePareto(svg: SVGSVGElement | null, ms: number, gradientId: string) {
  if (!svg) return
  const width = svg.clientWidth || 400
  const height = svg.clientHeight || 200
  const m = { l: 30, r: 36, t: 10, b: 34 }
  const plotW = width - m.l - m.r
  const maxN = Math.max(...DEFECTS.map((d) => d.count)) * 1.1
  const y = (v: number) => height - m.b - (v / maxN) * (height - m.t - m.b)
  const step = plotW / DEFECTS.length
  const bw = step * 0.52
  const x = (i: number) => m.l + i * step + (step - bw) / 2
  const total = DEFECTS.reduce((sum, d) => sum + d.count, 0)
  let cum = 0
  const cumPts = DEFECTS.map((d, i) => {
    cum += d.count
    return [x(i) + bw / 2, height - m.b - (cum / total) * (height - m.t - m.b)] as Point
  })
  const phase = ms % 6400
  const lineProgress = easeCubicOut((phase - 500) / 900)
  const circlesOpacity = clamp((phase - 900) / 250, 0, 1)
  const ticks = [0, maxN / 4, maxN / 2, (maxN * 3) / 4, maxN]
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffb627" />
        <stop offset="100%" stop-color="#a8761a" stop-opacity=".6" />
      </linearGradient>
    </defs>
    ${ticks
      .map(
        (t) =>
          `<line x1="${m.l}" x2="${width - m.r}" y1="${fmt(y(t))}" y2="${fmt(y(t))}" stroke="#1f2c27" />`,
      )
      .join('')}
    ${DEFECTS.map((d, i) => {
      const p = easeCubicOut((phase - i * 80) / 900)
      const barH = (height - m.b - y(d.count)) * p
      return `<rect x="${fmt(x(i))}" width="${fmt(bw)}" y="${fmt(height - m.b - barH)}" height="${fmt(barH)}" fill="url(#${gradientId})" stroke="#a8761a" stroke-width=".5" />`
    }).join('')}
    <path fill="none" stroke="#37f08e" stroke-width="1.6" filter="drop-shadow(0 0 3px #37f08e)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${fmt(1 - lineProgress)}" d="${catmullPath(cumPts)}" />
    ${cumPts
      .map(
        (p) =>
          `<circle cx="${fmt(p[0])}" cy="${fmt(p[1])}" r="2.5" fill="#37f08e" opacity="${fmt(circlesOpacity)}" />`,
      )
      .join('')}
    ${DEFECTS.map(
      (d, i) =>
        `<text x="${fmt(x(i) + bw / 2)}" y="${height - m.b + 11}" text-anchor="middle" style="font-size:7.5px">${d.cat}</text><text x="${fmt(x(i) + bw / 2)}" y="${height - m.b + 21}" text-anchor="middle" style="font-size:8px" fill="#6f857c">${d.count}</text>`,
    ).join('')}
  `
}

function generateTrendData() {
  return Array.from({ length: 24 }, (_, i) => {
    const v = i < 11 ? 15 - i * 0.25 + rnd(-1.2, 1.2) : Math.max(0.1, 5.5 * Math.exp(-(i - 11) * 0.55) + rnd(-0.3, 0.3))
    return { w: i, v: clamp(v, 0, 17) }
  })
}

function updateTrend(svg: SVGSVGElement | null, rt: Runtime, ms: number) {
  if (!svg) return
  const cycle = Math.floor(ms / 7000)
  if (cycle !== rt.trendCycle) {
    rt.trendCycle = cycle
    rt.trendData = generateTrendData()
  }
  const width = svg.clientWidth || 400
  const height = svg.clientHeight || 200
  const m = { l: 30, r: 14, t: 12, b: 24 }
  const x = (v: number) => m.l + (v / 23) * (width - m.l - m.r)
  const y = (v: number) => height - m.b - (v / 17) * (height - m.t - m.b)
  const phase = ms % 7000
  const before = rt.trendData.filter((d) => d.w <= 11).map((d) => [x(d.w), y(d.v)] as Point)
  const after = rt.trendData.filter((d) => d.w >= 11).map((d) => [x(d.w), y(d.v)] as Point)
  const redProgress = easeCubicOut(phase / 1100)
  const greenProgress = easeCubicOut((phase - 1000) / 1100)
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.innerHTML = `
    ${[0, 4.25, 8.5, 12.75, 17]
      .map(
        (t) =>
          `<line x1="${m.l}" x2="${width - m.r}" y1="${fmt(y(t))}" y2="${fmt(y(t))}" stroke="#1f2c27" /><text x="${m.l - 4}" y="${fmt(y(t) + 3)}" text-anchor="end">${Math.round(t)}%</text>`,
      )
      .join('')}
    <line x1="${fmt(x(11))}" x2="${fmt(x(11))}" y1="${m.t}" y2="${height - m.b}" stroke="#ffb627" stroke-dasharray="3 3" opacity=".7" />
    <text x="${fmt(x(11))}" y="${m.t}" text-anchor="middle" fill="#ffb627" style="font-size:8px">◀ 개선 개입</text>
    <path fill="none" stroke="#ff4d4d" stroke-width="1.7" filter="drop-shadow(0 0 3px #ff4d4d)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${fmt(1 - redProgress)}" d="${catmullPath(before)}" />
    <path fill="none" stroke="#37f08e" stroke-width="1.7" filter="drop-shadow(0 0 3px #37f08e)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="${fmt(1 - greenProgress)}" d="${catmullPath(after)}" />
    <rect x="${m.l}" y="${fmt(y(1))}" width="${width - m.r - m.l}" height="${fmt(height - m.b - y(1))}" fill="rgba(55,240,142,.06)" />
    ${[0, 6, 12, 18, 23].map((w) => `<text x="${fmt(x(w))}" y="${height - 8}" text-anchor="middle">W${w}</text>`).join('')}
  `
}

function updateText(el: HTMLElement | null, text: string) {
  if (el && el.textContent !== text) el.textContent = text
}

function flashText(el: HTMLElement | null, text: string) {
  if (!el || el.textContent === text) return
  el.textContent = text
  el.classList.remove(s.tickflash)
  void el.offsetWidth
  el.classList.add(s.tickflash)
}

function formatKpi(value: number, fixed: number) {
  return fixed ? value.toFixed(fixed) : Math.round(value).toLocaleString()
}

function chipToneClass(tone: string) {
  if (tone === 'a') return s.amber
  if (tone === 'c') return s.cyan
  return ''
}

function severityClass(sev: FeedSeverity) {
  if (sev === 'info') return s.sevInfo
  if (sev === 'warn') return s.sevWarn
  if (sev === 'crit') return s.sevCrit
  return s.sevOk
}

function severityLabel(sev: FeedSeverity) {
  if (sev === 'info') return 'INFO'
  if (sev === 'warn') return 'WARN'
  if (sev === 'crit') return 'CRIT'
  return 'OK'
}

function jobLeft(job: (typeof JOBS)[number]) {
  return ((job.startHour * 60 + job.startMinute) / (18 * 60)) * 100
}

function jobWidth(job: (typeof JOBS)[number]) {
  const start = job.startHour * 60 + job.startMinute
  const end = job.endHour * 60 + job.endMinute
  return ((end - start) / (18 * 60)) * 100
}

function nowLinePct() {
  const now = new Date()
  const base = new Date(now)
  base.setHours(6, 0, 0, 0)
  return ((now.getTime() - base.getTime()) / (18 * 3600 * 1000)) * 100
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const idBase = useId().replace(/:/g, '')
  useSceneReady(onReady)
  const runtimeRef = useRef<Runtime | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createRuntime()

  const clockRef = useRef<HTMLSpanElement | null>(null)
  const uptimeRef = useRef<HTMLSpanElement | null>(null)
  const connRef = useRef<HTMLSpanElement | null>(null)
  const alarmCountRef = useRef<HTMLSpanElement | null>(null)
  const gaugeFillRefs = useRef<Array<SVGPathElement | null>>([])
  const gaugeNeedleRefs = useRef<Array<SVGLineElement | null>>([])
  const gaugeTextRefs = useRef<Array<HTMLDivElement | null>>([])
  const topSparkSvgRefs = useRef<Array<SVGSVGElement | null>>([])
  const topSparkLineRefs = useRef<Array<SVGPathElement | null>>([])
  const topSparkAreaRefs = useRef<Array<SVGPathElement | null>>([])
  const topMetricRefs = useRef<Array<HTMLSpanElement | null>>([])
  const bellRef = useRef<SVGSVGElement | null>(null)
  const cpkRef = useRef<HTMLElement | null>(null)
  const yieldRef = useRef<HTMLElement | null>(null)
  const ppmRef = useRef<HTMLElement | null>(null)
  const kpiValueRefs = useRef<Array<HTMLSpanElement | null>>([])
  const kpiSparkSvgRefs = useRef<Array<SVGSVGElement | null>>([])
  const kpiSparkLineRefs = useRef<Array<SVGPathElement | null>>([])
  const kpiSparkAreaRefs = useRef<Array<SVGPathElement | null>>([])
  const ganttBarRefs = useRef<Array<HTMLDivElement | null>>([])
  const nowLineRefs = useRef<Array<HTMLDivElement | null>>([])
  const paretoRef = useRef<SVGSVGElement | null>(null)
  const trendRef = useRef<SVGSVGElement | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const lampGRef = useRef<HTMLSpanElement | null>(null)
  const lampYRef = useRef<HTMLSpanElement | null>(null)
  const lampRRef = useRef<HTMLSpanElement | null>(null)
  const andonStateRef = useRef<HTMLSpanElement | null>(null)
  const stopFlagRef = useRef<HTMLSpanElement | null>(null)

  const setAndon = (level: 'g' | 'y' | 'r') => {
    const lampG = lampGRef.current
    const lampY = lampYRef.current
    const lampR = lampRRef.current
    const state = andonStateRef.current
    const stop = stopFlagRef.current
    ;[lampG, lampY, lampR].forEach((lamp) => lamp?.classList.remove(s.on))
    state?.classList.remove(s.g, s.y, s.r)
    if (level === 'r') {
      lampR?.classList.add(s.on)
      state?.classList.add(s.r)
      updateText(state, '정지 · STOP')
      stop?.classList.add(s.armed)
      updateText(stop, 'LINE STOPPED')
    } else if (level === 'y') {
      lampY?.classList.add(s.on)
      state?.classList.add(s.y)
      updateText(state, '주의 · CAUTION')
      stop?.classList.remove(s.armed)
      updateText(stop, 'STOP-THE-LINE')
    } else {
      lampG?.classList.add(s.on)
      state?.classList.add(s.g)
      updateText(state, '정상 · GO')
      stop?.classList.remove(s.armed)
      updateText(stop, 'STOP-THE-LINE')
    }
  }

  const triggerAndon = (sev: FeedSeverity, ms: number) => {
    const rt = runtimeRef.current
    if (!rt) return
    if (sev === 'crit') {
      setAndon('r')
      rt.andonResetAt = ms + 2600
    } else if (sev === 'warn') {
      setAndon('y')
      rt.andonResetAt = ms + 1800
    } else if (sev === 'ok') {
      setAndon('g')
      rt.andonResetAt = 0
    }
  }

  const pushEvent = (ev: { sev: FeedSeverity; msg: string }, ms: number, initial = false) => {
    const feed = feedRef.current
    const rt = runtimeRef.current
    if (!feed || !rt) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const row = document.createElement('div')
    row.className = [s.fr, initial ? '' : ev.sev === 'crit' ? s.flashCrit : s.flash].filter(Boolean).join(' ')
    const time = document.createElement('span')
    time.className = s.ft
    time.textContent = ts
    const sev = document.createElement('span')
    sev.className = `${s.fsev} ${severityClass(ev.sev)}`
    sev.textContent = severityLabel(ev.sev)
    const msg = document.createElement('span')
    msg.className = s.fmsg
    msg.textContent = ev.msg
    row.append(time, sev, msg)
    feed.prepend(row)
    if (ev.sev === 'crit' || ev.sev === 'warn') {
      rt.alarmTotal += 1
      updateText(alarmCountRef.current, `ALARMS ${rt.alarmTotal}`)
    }
    if (!initial) triggerAndon(ev.sev, ms)
    if (feed.children.length > 4) {
      const last = feed.lastElementChild
      if (last) {
        last.classList.add(s.fading)
        rt.feedRemovals.push({ el: last, removeAt: ms + 620 })
      }
    }
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const rt = runtimeRef.current
    if (!rt) return
    const ms = fr.t * 1000
    const dt = Math.min(fr.dt * 1000, 80) || 16
    g.clearRect(0, 0, fr.w, fr.h)

    const now = new Date()
    updateText(clockRef.current, now.toLocaleTimeString('ko-KR', { hour12: false }))
    const shiftStart = new Date(now)
    shiftStart.setHours(8, 0, 0, 0)
    const elapsed = Math.max(0, now.getTime() - shiftStart.getTime())
    const hh = Math.floor(elapsed / 3600000)
    const mm = Math.floor((elapsed % 3600000) / 60000)
    updateText(uptimeRef.current, `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`)
    if (connRef.current) connRef.current.style.opacity = Math.floor(ms / 900) % 2 === 0 ? '1' : '0.55'

    GAUGES.forEach((gauge, i) => {
      const state = rt.gauges[i]
      let value: number
      if (ms < 1600) {
        value = easeCubicOut(ms / 1600) * gauge.target
        state.cur = value
      } else {
        const noise = rnd(-0.04, 0.04)
        const targetVal = clamp(gauge.target + rnd(-0.5, 0.5), gauge.target - 0.8, gauge.target + 0.8)
        state.cur = clamp(lerp(state.cur, targetVal, 1 - Math.exp(-dt / 800)) + noise, 0, 99.9)
        value = state.cur
      }
      gaugeFillRefs.current[i]?.setAttribute('d', gaugeArc(value / 100))
      gaugeNeedleRefs.current[i]?.setAttribute('transform', `rotate(${fmt(-90 + (value / 100) * 180)})`)
      updateText(gaugeTextRefs.current[i], value.toFixed(1))
    })

    if (ms - rt.lastSparkAt >= 1400) {
      rt.lastSparkAt = ms
      const uph = pushSpark(rt.topSparks[0])
      const ct = pushSpark(rt.topSparks[1])
      const lob = pushSpark(rt.topSparks[2])
      flashText(topMetricRefs.current[0], Math.round(uph).toString())
      flashText(topMetricRefs.current[1], ct.toFixed(1))
      flashText(topMetricRefs.current[2], lob.toFixed(1))
      rt.kpiSparks.forEach(pushSpark)
    }
    rt.topSparks.forEach((spark, i) => updateSpark(topSparkSvgRefs.current[i], topSparkLineRefs.current[i], topSparkAreaRefs.current[i], spark))
    rt.kpiSparks.forEach((spark, i) => updateSpark(kpiSparkSvgRefs.current[i], kpiSparkLineRefs.current[i], kpiSparkAreaRefs.current[i], spark))

    updateBell(bellRef.current, 1.67, ms)
    const z = 3 * 1.67
    const yieldPct = (cdf(z) - cdf(-z)) * 100
    const ppm = Math.round((1 - (cdf(z) - cdf(-z))) * 1e6)
    updateText(cpkRef.current, '1.67')
    updateText(yieldRef.current, `${yieldPct.toFixed(3)}%`)
    updateText(ppmRef.current, ppm.toLocaleString())

    const kpiCycle = Math.floor(ms / 9000)
    const kpiPhase = ms % 9000
    KPIS.forEach((kpi, i) => {
      const state = rt.kpis[i]
      const delay = 300 + i * 90
      const dur = 1500
      let value = state.live
      if (kpiPhase >= delay && kpiPhase < delay + dur) {
        value = lerp(0, kpi.value, easeCubicOut((kpiPhase - delay) / dur))
      } else if (kpiPhase >= delay + dur) {
        if (state.cycleDone !== kpiCycle) {
          state.live = kpi.value
          state.nextTarget = kpi.value
          state.nextAt = ms + rnd(1800, 3200)
          state.cycleDone = kpiCycle
        }
        if (ms >= state.nextAt) {
          state.nextTarget = clamp(rnd(kpi.range[0], kpi.range[1]), kpi.range[0], kpi.range[1])
          state.nextAt = ms + rnd(1800, 4000)
        }
        state.live = lerp(state.live, state.nextTarget, 1 - Math.exp(-dt / 600))
        value = state.live
      }
      updateText(kpiValueRefs.current[i], formatKpi(value, kpi.fixed))
    })

    const ganttPhase = ms % 6800
    const nowPct = nowLinePct()
    JOBS.forEach((job, i) => {
      const width = jobWidth(job) * easeCubicOut((ganttPhase - (250 + i * 160)) / 1100)
      if (ganttBarRefs.current[i]) ganttBarRefs.current[i]!.style.width = `${width}%`
      if (nowLineRefs.current[i]) nowLineRefs.current[i]!.style.left = `${nowPct}%`
    })

    updatePareto(paretoRef.current, ms, `${idBase}-pareto-bar`)
    updateTrend(trendRef.current, rt, ms)

    while (rt.seedIndex < SEED_EVENTS.length && ms >= rt.seedIndex * 300) {
      pushEvent(SEED_EVENTS[rt.seedIndex], ms, true)
      rt.seedIndex += 1
    }
    if (ms >= rt.nextLiveAt) {
      pushEvent(rt.shuffledEvents[rt.poolIndex % rt.shuffledEvents.length], ms)
      rt.poolIndex += 1
      if (rt.poolIndex % rt.shuffledEvents.length === 0) rt.shuffledEvents = shuffleEvents()
      rt.nextLiveAt = ms + rnd(1500, 2800)
    }
    rt.feedRemovals = rt.feedRemovals.filter((item) => {
      if (ms < item.removeAt) return true
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el)
      return false
    })
    if (rt.andonResetAt && ms >= rt.andonResetAt) {
      setAndon('g')
      rt.andonResetAt = 0
    }
  }, { running })

  const sparkColors = ['#37f08e', '#ffb627', '#3fd0e0']

  return (
    <SceneHost className={s.root} bg="#0a0e0d">
      <canvas ref={ref} className={s.c} />
      <div className={s.screen}>
        <div className={s.topbar}>
          <div className={s.tbBrand}>
            <div className={s.logoLed} />
            <div>
              <div className={s.title}>MES&nbsp;//&nbsp;CONSOLE</div>
              <div className={s.sub}>실시간 운영 콘솔 · 신제품 양산 라인</div>
            </div>
          </div>
          <div className={s.tbMeta}>
            <div className={s.tbCell}>
              <span className={s.k}>Line</span>
              <span className={`${s.v} ${s.amber}`}>LINE-01</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Shift</span>
              <span className={s.v}>DAY / A조</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Stack</span>
              <span className={s.v}>Django · React · Electron · OPC UA · PostgreSQL</span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>System Clock</span>
              <span className={`${s.v} ${s.g}`} ref={clockRef}>
                --:--:--
              </span>
            </div>
            <div className={s.tbCell}>
              <span className={s.k}>Shift Elapsed</span>
              <span className={`${s.v} ${s.amber}`} ref={uptimeRef}>
                --
              </span>
            </div>
          </div>
          <div className={s.tbRight}>
            <span className={`${s.pill} ${s.live}`} ref={connRef}>
              DAQ LIVE
            </span>
            <span className={s.pill} ref={alarmCountRef}>
              ALARMS 0
            </span>
          </div>
        </div>

        <div className={s.wrap}>
          <div className={s.sectionTag}>// ABOUT THIS CONSOLE — 자체개발 MES 아키텍처 · 인-하우스 설계 원칙</div>
          <div className={s.philo}>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>$</span> 자체개발 배경 · WHY IN-HOUSE
              </div>
              <div className={s.ptag}>MES 인-하우스 개발 · 비용 절감 설계</div>
              <div className={s.pdesc}>
                자동화 설비 예산 <em>30만 달러 초과</em> 상황에서 MES 외주 개발비 누락 확인. 추가 발주 대신{' '}
                <em>인-하우스 기획·개발</em>을 선택.
              </div>
            </div>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>⚙</span> 데이터 수집 · ETL LAYER
              </div>
              <div className={s.ptag}>OPC UA · TCP/IP 비전 · OCV/IR 검사장비 · MS Access DB</div>
              <div className={s.pdesc}>
                구형 OCV/IR 검사장비 <em>Python 드라이버</em>(MS Access DB) + OPC UA 설비 태그 수집 + TCP/IP 비전 데이터.
                수집 데이터 → <em>PostgreSQL</em> 중앙 적재.
              </div>
            </div>
            <div className={s.philoCell}>
              <div className={s.pname}>
                <span className={s.pj}>⬡</span> 풀스택 아키텍처 · FULL-STACK
              </div>
              <div className={s.ptag}>Django REST · React · TypeScript · Electron · PostgreSQL · Dash</div>
              <div className={s.pdesc}>
                Backend DRF API · Frontend React/TS/Electron · DB PostgreSQL · 실시간 대시보드 Python Dash.{' '}
                <em>계층형 S/N 바코드 체계 자체 설계.</em>
              </div>
            </div>
          </div>

          <div className={s.sectionTag}>// PLANT OVERVIEW — 설비 종합 효율 · 실시간 공정 현황</div>
          <div className={`${s.grid} ${s.row1}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>설비 종합 효율 OEE</span>
                <span className={s.hId}>PNL-01 / OEE.SUITE</span>
              </div>
              <div className={s.pBody}>
                <div className={s.gaugeWrap}>
                  {GAUGES.map((gauge, i) => {
                    const color = GAUGE_COLORS[gauge.color]
                    return (
                      <div className={s.gauge} key={gauge.id}>
                        <svg viewBox="0 0 108 78" aria-hidden="true">
                          <g transform="translate(54,66)">
                            <path d={gaugeArc(1)} fill="#16201c" />
                            {Array.from({ length: 11 }, (_, tick) => {
                              const ang = -Math.PI / 2 + (tick / 10) * Math.PI
                              return (
                                <line
                                  key={tick}
                                  x1={Math.cos(ang) * 45.5}
                                  y1={Math.sin(ang) * 45.5}
                                  x2={Math.cos(ang) * 49}
                                  y2={Math.sin(ang) * 49}
                                  stroke="#2a3a33"
                                  strokeWidth="1"
                                />
                              )
                            })}
                            <path ref={(el) => { gaugeFillRefs.current[i] = el }} fill={color} filter={`drop-shadow(0 0 4px ${color})`} />
                            <line
                              ref={(el) => { gaugeNeedleRefs.current[i] = el }}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="-40"
                              stroke="#fff"
                              strokeWidth="1.4"
                              opacity=".85"
                            />
                            <circle r="3" fill="#0a0e0d" stroke={color} />
                          </g>
                        </svg>
                        <div className={s.gv} style={{ color }} ref={(el) => { gaugeTextRefs.current[i] = el }}>
                          0.0
                        </div>
                        <div className={s.gl}>{gauge.label}</div>
                        <div className={s.gt}>{gauge.sub}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>처리량 · 생산 신호</span>
                <span className={s.hId}>PNL-02 / THRPT</span>
              </div>
              <div className={s.pBody}>
                <div className={s.throughputStack}>
                  {[
                    ['시간당 생산량 UPH', 'uph', s.txtGreen],
                    ['사이클타임 C/T (s)', 'ct', s.txtAmber],
                    ['생산 달성률 ACHV (%)', 'lob', s.txtCyan],
                  ].map(([label, key, tone], i) => (
                    <div key={key}>
                      <div className={s.metricLine}>
                        <span className={s.txtDim}>{label}</span>
                        <span className={`${s.num} ${tone}`} ref={(el) => { topMetricRefs.current[i] = el }}>
                          0
                        </span>
                      </div>
                      <svg className={s.sparkline} ref={(el) => { topSparkSvgRefs.current[i] = el }}>
                        <defs>
                          <linearGradient id={`${idBase}-spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={sparkColors[i]} stopOpacity=".35" />
                            <stop offset="100%" stopColor={sparkColors[i]} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path ref={(el) => { topSparkAreaRefs.current[i] = el }} fill={`url(#${idBase}-spark-${i})`} />
                        <path ref={(el) => { topSparkLineRefs.current[i] = el }} fill="none" stroke={sparkColors[i]} strokeWidth="1.3" filter={`drop-shadow(0 0 3px ${sparkColors[i]})`} />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>공정 수율 FPY · 품질 분포</span>
                <span className={s.hId}>PNL-03 / FPY.BELL</span>
              </div>
              <div className={s.pBody}>
                <svg ref={bellRef} className={s.bellSvg} />
                <div className={s.cpkReadout}>
                  <div>
                    <span>Cpk</span>
                    <b ref={cpkRef}>1.67</b>
                  </div>
                  <div>
                    <span>수율 FPY</span>
                    <b className={s.txtAmber} ref={yieldRef}>
                      —
                    </b>
                  </div>
                  <div>
                    <span>불량 PPM</span>
                    <b className={s.txtCyan} ref={ppmRef}>
                      —
                    </b>
                  </div>
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>안돈 · 실시간 알람 피드</span>
                <span className={s.hId}>PNL-04 / ANDON.FEED</span>
              </div>
              <div className={s.andonBar}>
                <div className={s.andonLamps}>
                  <span className={`${s.alamp} ${s.r}`} ref={lampRRef} title="정지 — 설비/품질 이상" />
                  <span className={`${s.alamp} ${s.y}`} ref={lampYRef} title="주의 — 일탈 감시" />
                  <span className={`${s.alamp} ${s.g} ${s.on}`} ref={lampGRef} title="정상 가동" />
                </div>
                <span className={`${s.andonState} ${s.g}`} ref={andonStateRef}>
                  정상 · GO
                </span>
                <div className={s.andonJidoka}>
                  <span className={s.stopFlag} ref={stopFlagRef}>
                    STOP-THE-LINE
                  </span>
                  <b>ANDON</b>
                </div>
              </div>
              <div className={s.pBody}>
                <div className={s.feed} ref={feedRef} />
              </div>
            </div>
          </div>

          <div className={s.sectionTag}>// CUMULATIVE KPI — 실시간 운영 지표 (OEE 구성요소 분해)</div>
          <div className={`${s.grid} ${s.rowKpi}`}>
            {KPIS.slice(0, 4).map((kpi, i) => (
              <KpiTile
                key={kpi.label}
                index={i}
                idBase={idBase}
                kpi={kpi}
                valueRefs={kpiValueRefs}
                svgRefs={kpiSparkSvgRefs}
                lineRefs={kpiSparkLineRefs}
                areaRefs={kpiSparkAreaRefs}
              />
            ))}
          </div>
          <div className={`${s.grid} ${s.rowKpi} ${s.rowKpiSpaced}`}>
            {KPIS.slice(4).map((kpi, localIndex) => {
              const i = localIndex + 4
              return (
                <KpiTile
                  key={kpi.label}
                  index={i}
                  idBase={idBase}
                  kpi={kpi}
                  valueRefs={kpiValueRefs}
                  svgRefs={kpiSparkSvgRefs}
                  lineRefs={kpiSparkLineRefs}
                  areaRefs={kpiSparkAreaRefs}
                />
              )
            })}
          </div>

          <div className={s.sectionTag}>// PRODUCTION SCHEDULE — 당일 워크오더 · 라인별 생산 계획</div>
          <div className={`${s.grid} ${s.row2}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>생산 스케줄 GANTT · 워크오더</span>
                <span className={s.hId}>PNL-05 / WO.PLAN</span>
              </div>
              <div className={s.pBody}>
                <div className={s.gantt}>
                  <div className={s.ganttAxisWrap}>
                    <div />
                    <div className={s.ganttAxis}>
                      {['06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '→'].map((tick) => (
                        <span key={tick}>{tick}</span>
                      ))}
                    </div>
                  </div>
                  {JOBS.map((job, i) => (
                    <div className={s.grow} key={job.wo}>
                      <div>
                        <div className={s.wo}>{job.wo}</div>
                        <div className={s.gn}>{job.name}</div>
                        <div className={s.gc}>{job.role}</div>
                      </div>
                      <div className={s.gtrack}>
                        <div
                          className={`${s.gbar} ${job.status === 'run' ? s.run : s.done}`}
                          ref={(el) => { ganttBarRefs.current[i] = el }}
                          title={job.desc}
                          style={{ left: `${jobLeft(job)}%`, width: '0%' }}
                        >
                          {job.status === 'run' ? '● RUNNING' : '■ COMPLETE'}
                        </div>
                        <div className={s.nowLine} ref={(el) => { nowLineRefs.current[i] = el }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>불량 모드 파레토 · 4M</span>
                <span className={s.hId}>PNL-06 / DEFECT.PARETO</span>
              </div>
              <div className={s.pBody}>
                <svg ref={paretoRef} className={s.chartBox} />
                <div className={s.legend}>
                  <span>
                    <i className={s.legendAmber} />
                    불량 건수
                  </span>
                  <span>
                    <i className={s.legendGreen} />
                    누적 % (FPY 개선)
                  </span>
                </div>
                <table className={`${s.dtable} ${s.dtableSpaced}`}>
                  <tbody>
                    <tr>
                      <th>불량 모드</th>
                      <th>4M</th>
                      <th>건수</th>
                      <th>비중</th>
                    </tr>
                    {DEFECTS.map((d) => (
                      <tr key={d.mode}>
                        <td>{d.mode}</td>
                        <td className={s.txtCyan}>{d.cat}</td>
                        <td className={s.num}>{d.count}</td>
                        <td>
                          <div className={s.barCell}>
                            <div className={s.bf} style={{ width: `${((d.count / DEFECTS[0].count) * 100).toFixed(0)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={`${s.grid} ${s.row3}`}>
            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>OEE 추이 · 불량률 개선 개입</span>
                <span className={s.hId}>PNL-07 / OEE.TREND</span>
              </div>
              <div className={s.pBody}>
                <svg ref={trendRef} className={s.chartBox} />
                <div className={s.legend}>
                  <span>
                    <i className={s.legendRed} />
                    개선 전
                  </span>
                  <span>
                    <i className={s.legendGreen} />
                    개선 후
                  </span>
                  <span className={s.txtAmber}>▲ 개선 개입 시점</span>
                </div>
                <div className={s.trendNote}>
                  <span className={s.trendNoteAmber}>// MES 자체개발 스택</span> · OPC UA 수집 → PostgreSQL 적재 → Django REST API →
                  React/Electron UI → Python Dash 대시보드.
                  <br />
                  <b className={s.trendNoteText}>OCV/IR 검사장비</b> 레거시 연동 +{' '}
                  <b className={s.trendNoteCyan}>TCP/IP 비전 데이터</b> 수집 → 실시간 FPY 반영.
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>설비 · 라인 상태 · MES 스택</span>
                <span className={s.hId}>PNL-08 / ASSET.HEALTH</span>
              </div>
              <div className={s.pBody}>
                <div className={s.statGrid}>
                  {SKILL_GROUPS.map((group) => (
                    <div key={group.cat}>
                      <div className={s.statCat}>{group.cat}</div>
                      <div className={s.chips}>
                        {group.items.map(([name, tone]) => (
                          <span className={s.chip} key={name}>
                            <span className={`${s.led} ${chipToneClass(tone)}`} />
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.panel}>
              <div className={s.pHead}>
                <span className={s.pHeadDot} />
                <span className={s.hTitle}>공정 표준 · 인증 · 산출물</span>
                <span className={s.hId}>PNL-09 / CERT.LOG</span>
              </div>
              <div className={s.pBody}>
                <div className={s.statCat}>MES 개발 산출물</div>
                <div className={`${s.chips} ${s.chipsSpaced}`}>
                  <span className={s.chip}>
                    <span className={s.led} />
                    Django REST API
                  </span>
                  <span className={s.chip}>
                    <span className={s.led} />
                    PostgreSQL 스키마
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    React/Electron 앱
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.cyan}`} />
                    Python Dash 대시보드
                  </span>
                  <span className={s.chip}>
                    <span className={s.led} />
                    OPC UA ETL 파이프라인
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.cyan}`} />
                    계층형 S/N 바코드 체계
                  </span>
                </div>
                <div className={s.statCat}>하드웨어 · 인프라</div>
                <div className={`${s.chips} ${s.chipsSpaced}`}>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    Zebra DS2208 바코드 스캐너
                  </span>
                  <span className={s.chip}>
                    <span className={`${s.led} ${s.amber}`} />
                    RAID1 서버
                  </span>
                </div>
                <div className={s.statCat}>공정 문서 산출물</div>
                <table className={s.dtable}>
                  <tbody>
                    <tr>
                      <td className={s.txtDim}>PFMEA</td>
                      <td>신제품 라인 고장모드분석 (국·영문)</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>CP · PFD</td>
                      <td>관리계획서 · 공정흐름도</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>SOP</td>
                      <td>표준작업절차서 번역·작성</td>
                    </tr>
                    <tr>
                      <td className={s.txtDim}>MES Spec</td>
                      <td>MES 스펙시트 자체 작성 (R0·R1)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className={s.footer}>
            <div className={s.fcell}>
              <div className={s.fk}>System</div>
              <div className={s.fv}>MES 실시간 운영 콘솔 · DAY SHIFT</div>
            </div>
            <div className={s.fcell}>
              <div className={s.fk}>Console Build</div>
              <div className={`${s.fv} ${s.txtDim}`}>MES-CONSOLE v1.0 · DAQ@1Hz · 자체개발</div>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}

function KpiTile({
  index,
  idBase,
  kpi,
  valueRefs,
  svgRefs,
  lineRefs,
  areaRefs,
}: {
  index: number
  idBase: string
  kpi: (typeof KPIS)[number]
  valueRefs: React.MutableRefObject<Array<HTMLSpanElement | null>>
  svgRefs: React.MutableRefObject<Array<SVGSVGElement | null>>
  lineRefs: React.MutableRefObject<Array<SVGPathElement | null>>
  areaRefs: React.MutableRefObject<Array<SVGPathElement | null>>
}) {
  const color = kpi.colorClass === 'g' ? '#37f08e' : kpi.colorClass === 'c' ? '#3fd0e0' : '#ffb627'
  const colorClass = kpi.colorClass === 'g' ? s.g : kpi.colorClass === 'c' ? s.cyan : ''
  return (
    <div className={s.kpi}>
      <div className={s.kl}>{kpi.label}</div>
      <div className={`${s.kv} ${colorClass}`}>
        <span ref={(el) => { valueRefs.current[index] = el }}>0</span>
        <span className={s.kpiUnit}>{kpi.suffix}</span>
      </div>
      <div className={s.kd}>{kpi.desc}</div>
      <svg className={s.kspark} ref={(el) => { svgRefs.current[index] = el }}>
        <defs>
          <linearGradient id={`${idBase}-kpi-${index}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path ref={(el) => { areaRefs.current[index] = el }} fill={`url(#${idBase}-kpi-${index})`} />
        <path ref={(el) => { lineRefs.current[index] = el }} fill="none" stroke={color} strokeWidth="1.3" filter={`drop-shadow(0 0 3px ${color})`} />
      </svg>
    </div>
  )
}
