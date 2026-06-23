/**
 * Pure helper functions for mes-console Scene.tsx.
 * No React imports, no closure state — all inputs are explicit parameters.
 */
import { clamp } from '../_host/math'
import { DEFECTS, GAUGES, JOBS, KPIS, LIVE_POOL, SEED_EVENTS } from './data'
import { SPARK_RANGES } from './constants'
import type { Point, Runtime, SparkState } from './types'

// ─── tiny math helpers ────────────────────────────────────────────────────────

export const rnd = (a: number, b: number) => a + Math.random() * (b - a)
export const easeCubicOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3)
export const fmt = (n: number) => n.toFixed(2)

// ─── SVG path helpers ─────────────────────────────────────────────────────────

function polar(radius: number, angle: number) {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const
}

export function gaugeArc(frac: number) {
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

export function catmullPath(points: Point[]) {
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

export function areaPath(points: Point[], baseY: number) {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${catmullPath(points)} L ${fmt(last[0])} ${fmt(baseY)} L ${fmt(first[0])} ${fmt(baseY)} Z`
}

export function sparkPaths(data: number[], width: number, height: number) {
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

// ─── spark DOM updaters ───────────────────────────────────────────────────────

export function updateSpark(
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

export function pushSpark(state: SparkState) {
  const next = rnd(state.range[0], state.range[1])
  state.data.push(next)
  state.data.shift()
  return next
}

// ─── statistics ───────────────────────────────────────────────────────────────

function erf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x))
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x))
  return x >= 0 ? y : -y
}

export function cdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

// ─── SVG chart updaters ───────────────────────────────────────────────────────

export function updateBell(svg: SVGSVGElement | null, cpk: number, ms: number) {
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

export function updatePareto(svg: SVGSVGElement | null, ms: number, gradientId: string) {
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

export function generateTrendData() {
  return Array.from({ length: 24 }, (_, i) => {
    const v = i < 11 ? 15 - i * 0.25 + rnd(-1.2, 1.2) : Math.max(0.1, 5.5 * Math.exp(-(i - 11) * 0.55) + rnd(-0.3, 0.3))
    return { w: i, v: clamp(v, 0, 17) }
  })
}

export function updateTrend(svg: SVGSVGElement | null, rt: Runtime, ms: number) {
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

// ─── DOM text helpers ─────────────────────────────────────────────────────────

export function updateText(el: HTMLElement | null, text: string) {
  if (el && el.textContent !== text) el.textContent = text
}

export function flashText(el: HTMLElement | null, text: string, flashClass: string) {
  if (!el || el.textContent === text) return
  el.textContent = text
  el.classList.remove(flashClass)
  void el.offsetWidth
  el.classList.add(flashClass)
}

export function formatKpi(value: number, fixed: number) {
  return fixed ? value.toFixed(fixed) : Math.round(value).toLocaleString()
}

// ─── CSS class helpers ────────────────────────────────────────────────────────

export function chipToneClass(tone: string, amberClass: string, cyanClass: string) {
  if (tone === 'a') return amberClass
  if (tone === 'c') return cyanClass
  return ''
}

export function severityClass(
  sev: string,
  classes: { sevInfo: string; sevWarn: string; sevCrit: string; sevOk: string },
) {
  if (sev === 'info') return classes.sevInfo
  if (sev === 'warn') return classes.sevWarn
  if (sev === 'crit') return classes.sevCrit
  return classes.sevOk
}

export function severityLabel(sev: string) {
  if (sev === 'info') return 'INFO'
  if (sev === 'warn') return 'WARN'
  if (sev === 'crit') return 'CRIT'
  return 'OK'
}

// ─── Gantt helpers ────────────────────────────────────────────────────────────

export function jobLeft(job: (typeof JOBS)[number]) {
  return ((job.startHour * 60 + job.startMinute) / (18 * 60)) * 100
}

export function jobWidth(job: (typeof JOBS)[number]) {
  const start = job.startHour * 60 + job.startMinute
  const end = job.endHour * 60 + job.endMinute
  return ((end - start) / (18 * 60)) * 100
}

export function nowLinePct() {
  const now = new Date()
  const base = new Date(now)
  base.setHours(6, 0, 0, 0)
  return ((now.getTime() - base.getTime()) / (18 * 3600 * 1000)) * 100
}

// ─── runtime initialisation ───────────────────────────────────────────────────

export function shuffleEvents() {
  const copy = LIVE_POOL.slice()
  copy.sort(() => Math.random() - 0.5)
  return copy
}

export function createSpark(range: readonly [number, number]): SparkState {
  return { range, data: Array.from({ length: 44 }, () => rnd(range[0], range[1])) }
}

export function createRuntime(): Runtime {
  return {
    gauges: GAUGES.map((g) => ({ cur: g.target })),
    topSparks: SPARK_RANGES.map(createSpark),
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
