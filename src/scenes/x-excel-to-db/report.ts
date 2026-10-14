// Power BI 리포트 페이지 — DB 에서 갱신된 데이터가 흘러들어 오는 운영 대시보드.
// 화면의 숫자는 '장식용 운영 데이터'(소형 전자 라인의 현실적인 크기)이며 성과 주장이 아니다.
// 성과(−451분/일, ST −50%, MOC)는 HUD 만 말한다.
//
// 좌표: 리포트 px(rpx) — 100 rpx = 1 월드 유닛. 각 비주얼은 자기 캔버스(×TEX_SCALE)를 가진
// 평면 메시이며, 상태(진행도 양자화·로케일·갱신 회차)가 바뀔 때만 다시 그린다 → t 에 결정적.

import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { FONT_SANS } from '../_host/fonts'
import { mulberry32 } from '../_host/random'

const MONO = "'JetBrains Mono', 'Pretendard Variable', monospace"
const SANS = FONT_SANS

/** 텍스처 px / rpx — 최종 프레이밍에서 2x DPR 기준 ≈1:1. */
const TEX_SCALE = 2.4
export const RPX = 0.01 // rpx → 월드
export const PAGE_W = 960
export const PAGE_H = 516
export const REPORT_W = PAGE_W * RPX
export const REPORT_H = PAGE_H * RPX

type L = { ko: string; en: string }
const tr = (l: L, en: boolean) => (en ? l.en : l.ko)

// ─────────────────────────── 팔레트(Power BI 다크 리포트 + 씬 팔레트) ───────────────────────────
const C = {
  page: 'rgba(11,15,19,0.9)',
  pageEdge: 'rgba(120,190,205,0.28)',
  card: 'rgba(22,28,34,0.97)',
  cardEdge: 'rgba(255,255,255,0.07)',
  title: '#e9eef1',
  text: '#c9d1d6',
  sub: '#8b979e',
  axis: '#77838a',
  grid: 'rgba(255,255,255,0.075)',
  blue: '#4ab3cc',
  blueDeep: '#2a6878',
  teal: '#4fe0c4',
  amber: '#d98a3d',
  red: '#e0524a',
  phos: '#d7d7d7',
  pbi: '#f2c811',
}

// ─────────────────────────── 장식용 운영 데이터 ───────────────────────────
type Kpi = { label: L; value: number; digits: number; unit: L; scale?: number; note: L; ok: boolean; spark: number[] }
function series(seed: number, n: number, base: number, amp: number, drift = 0) {
  const r = mulberry32(seed)
  const out: number[] = []
  let v = 0
  for (let i = 0; i < n; i++) {
    v = v * 0.55 + (r() - 0.5) * amp
    out.push(base + v + drift * (i / n))
  }
  return out
}
// 11월 일별 생산량(30일) — 일요일(5일 주기) 감산, 하루 수백 EA.
const DAILY: number[] = (() => {
  const r = mulberry32(2311)
  const out: number[] = []
  for (let d = 0; d < 30; d++) {
    const sunday = (d + 2) % 7 === 0
    const v = 606 + (r() - 0.5) * 70 + Math.sin(d * 0.7) * 14 - (sunday ? 88 : 0)
    out.push(Math.round(v))
  }
  return out
})()
const DAILY_TARGET = 600

const KPIS: Kpi[] = [
  {
    label: { ko: '생산량 · 일평균', en: 'Output · daily avg' },
    value: 612,
    digits: 0,
    unit: { ko: 'EA', en: 'EA' },
    note: { ko: '목표 600', en: 'Target 600' },
    ok: true,
    spark: DAILY.slice(14),
  },
  {
    label: { ko: 'FPY · 직행률', en: 'FPY · first pass yield' },
    value: 97.6,
    digits: 1,
    unit: { ko: '%', en: '%' },
    note: { ko: '목표 97.0%', en: 'Target 97.0%' },
    ok: true,
    spark: series(31, 16, 97.4, 0.9),
  },
  {
    label: { ko: '불량률', en: 'Defect rate' },
    value: 0.42,
    digits: 2,
    unit: { ko: '%', en: '%' },
    note: { ko: '관리 상한 0.50%', en: 'Limit 0.50%' },
    ok: true,
    spark: series(47, 16, 0.45, 0.16),
  },
  {
    label: { ko: 'OPEX · 월', en: 'OPEX · month' },
    value: 1.18,
    digits: 2,
    unit: { ko: '억원', en: 'B KRW' },
    scale: 1,
    note: { ko: '예산 1.25억원', en: 'Budget 0.125B' },
    ok: true,
    spark: series(59, 16, 1.2, 0.08),
  },
]
// EN OPEX 는 B KRW 로 0.118 표기
const kpiValue = (k: Kpi, en: boolean) => (k.unit.en === 'B KRW' && en ? k.value / 10 : k.value)
const kpiDigits = (k: Kpi, en: boolean) => (k.unit.en === 'B KRW' && en ? 3 : k.digits)

const LINES = [
  { name: 'L1', day: 112, night: 76 },
  { name: 'L2', day: 98, night: 66 },
  { name: 'L3', day: 88, night: 54 },
  { name: 'L4', day: 74, night: 44 },
]
const PARETO: Array<{ name: L; n: number }> = [
  { name: { ko: '납땜', en: 'Solder' }, n: 38 },
  { name: { ko: '커넥터', en: 'Connector' }, n: 24 },
  { name: { ko: '스크래치', en: 'Scratch' }, n: 15 },
  { name: { ko: '라벨', en: 'Label' }, n: 9 },
  { name: { ko: '기능 NG', en: 'Func. NG' }, n: 6 },
  { name: { ko: '기타', en: 'Other' }, n: 4 },
]
type WoState = 'done' | 'run' | 'late' | 'wait'
const WO: Array<[string, string, number, number, WoState]> = [
  ['WO-2311-041', 'ASSY-0440', 1200, 1188, 'done'],
  ['WO-2311-042', 'ASSY-0500', 800, 812, 'done'],
  ['WO-2311-043', 'ASSY-1200', 600, 534, 'run'],
  ['WO-2311-044', 'ASSY-0440', 1500, 1500, 'done'],
  ['WO-2311-045', 'ASSY-0650', 400, 296, 'late'],
  ['WO-2311-046', 'ASSY-0500', 900, 0, 'wait'],
]
const WO_STATE: Record<WoState, { l: L; c: string }> = {
  done: { l: { ko: '완료', en: 'Done' }, c: C.teal },
  run: { l: { ko: '진행', en: 'Running' }, c: C.blue },
  late: { l: { ko: '지연', en: 'Delayed' }, c: C.amber },
  wait: { l: { ko: '대기', en: 'Queued' }, c: C.sub },
}

const TXT = {
  title: { ko: '공정 데이터 대시보드', en: 'Process Data Dashboard' },
  subtitle: { ko: '생산 · 품질 · 원가 통합 리포트 · 2023년 11월', en: 'Production · quality · cost report · Nov 2023' },
  period: { ko: '기간', en: 'Period' },
  periodV: { ko: '2023-11-01 ~ 11-30', en: '2023-11-01 – 11-30' },
  line: { ko: '라인', en: 'Line' },
  proc: { ko: '공정', en: 'Process' },
  all: { ko: '전체', en: 'All' },
  tabs: [
    { ko: '생산현황', en: 'Production' },
    { ko: '불량현황', en: 'Defects' },
    { ko: 'KPI', en: 'KPI' },
  ],
  refresh: { ko: '마지막 새로 고침', en: 'Last refresh' },
  refreshing: { ko: '새로 고침 중…', en: 'Refreshing…' },
  gw: { ko: 'On-premises Gateway', en: 'On-premises Gateway' },
  trend: { ko: '일별 생산량 · 목표 대비', en: 'Daily output vs target' },
  output: { ko: '생산량', en: 'Output' },
  target: { ko: '목표', en: 'Target' },
  stacked: { ko: '라인 · 교대별 생산량', en: 'Output by line · shift' },
  day: { ko: '주간', en: 'Day' },
  night: { ko: '야간', en: 'Night' },
  pareto: { ko: '불량 유형 파레토', en: 'Defect Pareto' },
  count: { ko: '건수', en: 'Count' },
  cum: { ko: '누적 %', en: 'Cum. %' },
  wo: { ko: '워크오더 현황', en: 'Work orders' },
  woCols: [
    { ko: 'WO', en: 'WO' },
    { ko: '품목', en: 'Item' },
    { ko: '계획', en: 'Plan' },
    { ko: '실적', en: 'Actual' },
    { ko: '달성률', en: 'Attain.' },
    { ko: '상태', en: 'Status' },
  ],
}

/** 캔버스에 구울 모든 글자(폰트 서브셋 선로딩용). */
export function reportText() {
  const parts: string[] = []
  const walk = (o: unknown) => {
    if (typeof o === 'string') parts.push(o)
    else if (Array.isArray(o)) o.forEach(walk)
    else if (o && typeof o === 'object') Object.values(o).forEach(walk)
  }
  walk(TXT)
  walk(KPIS.map((k) => [k.label, k.unit, k.note]))
  walk(PARETO.map((p) => p.name))
  walk(Object.values(WO_STATE).map((s) => s.l))
  parts.push('0123456789.,%~–:⟳▾·▲▼ WO-ASSY')
  return parts.join(' ')
}

// ─────────────────────────── 레이아웃(rpx) ───────────────────────────
export type VisualKind = 'kpi0' | 'kpi1' | 'kpi2' | 'kpi3' | 'trend' | 'stacked' | 'pareto' | 'table'
export interface VisualDef {
  kind: VisualKind
  x: number
  y: number
  w: number
  h: number
  /** 등장 그룹(0: KPI 줄, 1: 생산 줄, 2: 불량/WO 줄) — 사운드 pop 5.0/5.22/5.44 와 동기 */
  group: number
  /** 데이터를 공급하는 DB 슬랩 인덱스 */
  src: number[]
}
const M = 12
const GAP = 8
const KPI_Y = 56
const KPI_H = 78
const MID_Y = KPI_Y + KPI_H + GAP
const MID_H = 172
const BOT_Y = MID_Y + MID_H + GAP
const BOT_H = 162
const KPI_W = (PAGE_W - M * 2 - GAP * 3) / 4
export const VISUALS: VisualDef[] = [
  ...[0, 1, 2, 3].map((i) => ({
    kind: `kpi${i}` as VisualKind,
    x: M + i * (KPI_W + GAP),
    y: KPI_Y,
    w: KPI_W,
    h: KPI_H,
    group: 0,
    src: [[0], [3], [2], [5]][i],
  })),
  { kind: 'trend', x: M, y: MID_Y, w: 556, h: MID_H, group: 1, src: [0] },
  { kind: 'stacked', x: M + 556 + GAP, y: MID_Y, w: PAGE_W - M * 2 - 556 - GAP, h: MID_H, group: 1, src: [1] },
  { kind: 'pareto', x: M, y: BOT_Y, w: 420, h: BOT_H, group: 2, src: [2] },
  { kind: 'table', x: M + 420 + GAP, y: BOT_Y, w: PAGE_W - M * 2 - 420 - GAP, h: BOT_H, group: 2, src: [5, 4] },
]

// ─────────────────────────── 그리기 유틸 ───────────────────────────
type G = CanvasRenderingContext2D
function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const sg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const eo = (x: number) => 1 - Math.pow(1 - x, 3)
const fmt = (v: number, d = 0) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

function text(g: G, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'left') {
  g.font = font
  g.fillStyle = color
  g.textAlign = align
  g.fillText(s, x, y)
}

function cardBase(g: G, w: number, h: number, title: string) {
  rr(g, 0.5, 0.5, w - 1, h - 1, 5)
  g.fillStyle = C.card
  g.fill()
  g.strokeStyle = C.cardEdge
  g.lineWidth = 1
  g.stroke()
  if (title) text(g, title, 12, 19, `600 11.5px ${SANS}`, C.title)
  // Power BI 비주얼 헤더 아이콘(포커스 · 더보기) — 아주 옅게
  g.fillStyle = 'rgba(255,255,255,0.18)'
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.arc(w - 14 - i * 4, 14, 0.9, 0, Math.PI * 2)
    g.fill()
  }
}

function legend(g: G, items: Array<[string, string, 'dot' | 'line' | 'dash']>, xr: number, y: number) {
  g.font = `500 9px ${SANS}`
  let x = xr
  for (let i = items.length - 1; i >= 0; i--) {
    const [label, col, kind] = items[i]
    const w = g.measureText(label).width
    x -= w
    text(g, label, x, y, `500 9px ${SANS}`, C.sub)
    x -= 12
    g.strokeStyle = col
    g.fillStyle = col
    if (kind === 'dot') {
      g.beginPath()
      g.arc(x + 4, y - 3, 3, 0, Math.PI * 2)
      g.fill()
    } else {
      g.lineWidth = 1.6
      g.setLineDash(kind === 'dash' ? [3, 2] : [])
      g.beginPath()
      g.moveTo(x, y - 3)
      g.lineTo(x + 9, y - 3)
      g.stroke()
      g.setLineDash([])
    }
    x -= 10
  }
}

function hGrid(g: G, x0: number, x1: number, y0: number, y1: number, lo: number, hi: number, step: number, label: (v: number) => string, right = false) {
  g.lineWidth = 1
  for (let v = lo; v <= hi + 1e-6; v += step) {
    const y = Math.round(y1 - ((v - lo) / (hi - lo)) * (y1 - y0)) + 0.5
    g.strokeStyle = C.grid
    g.beginPath()
    g.moveTo(x0, y)
    g.lineTo(x1, y)
    g.stroke()
    text(g, label(v), right ? x1 + 4 : x0 - 5, y + 3, `500 8.5px ${MONO}`, C.axis, right ? 'left' : 'right')
  }
}

// ─────────────────────────── 비주얼 ───────────────────────────
function drawKpi(g: G, w: number, h: number, k: Kpi, p: number, en: boolean) {
  cardBase(g, w, h, '')
  // 상단 액센트 바
  g.fillStyle = k.ok ? C.blue : C.amber
  g.fillRect(1, 1, 3, h - 2)
  text(g, tr(k.label, en), 14, 18, `500 10px ${SANS}`, C.sub)
  const v = kpiValue(k, en) * eo(sg(p, 0, 0.85))
  const d = kpiDigits(k, en)
  g.font = `650 27px ${SANS}`
  const s = fmt(v, d)
  text(g, s, 14, 50, `650 27px ${SANS}`, '#f1f4f6')
  const vw = g.measureText(s).width
  text(g, tr(k.unit, en), 14 + vw + 4, 50, `500 11px ${SANS}`, C.sub)
  // 목표 + 상태 점
  const na = sg(p, 0.5, 0.9)
  g.globalAlpha = na
  g.fillStyle = k.ok ? C.teal : C.amber
  g.beginPath()
  g.arc(17.5, 64.5, 2.6, 0, Math.PI * 2)
  g.fill()
  text(g, tr(k.note, en), 24, 68, `500 9px ${SANS}`, C.sub)
  g.globalAlpha = 1
  // 스파크라인(오른쪽)
  const sx0 = w * 0.6
  const sx1 = w - 12
  const sy0 = 28
  const sy1 = h - 14
  const arr = k.spark
  let lo = Infinity
  let hi = -Infinity
  for (const a of arr) {
    lo = Math.min(lo, a)
    hi = Math.max(hi, a)
  }
  const pad = (hi - lo) * 0.15 || 1
  lo -= pad
  hi += pad
  const n = arr.length
  const shown = sg(p, 0.1, 1) * (n - 1)
  const X = (i: number) => sx0 + (i / (n - 1)) * (sx1 - sx0)
  const Y = (a: number) => sy1 - ((a - lo) / (hi - lo)) * (sy1 - sy0)
  if (shown > 0) {
    const last = Math.floor(shown)
    const fr = shown - last
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= last; i++) pts.push([X(i), Y(arr[i])])
    if (last < n - 1) pts.push([X(last + fr), Y(arr[last] + (arr[last + 1] - arr[last]) * fr)])
    const grd = g.createLinearGradient(0, sy0, 0, sy1)
    grd.addColorStop(0, 'rgba(74,179,204,0.32)')
    grd.addColorStop(1, 'rgba(74,179,204,0)')
    g.beginPath()
    g.moveTo(pts[0][0], sy1)
    for (const [x, y] of pts) g.lineTo(x, y)
    g.lineTo(pts[pts.length - 1][0], sy1)
    g.closePath()
    g.fillStyle = grd
    g.fill()
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.strokeStyle = C.blue
    g.lineWidth = 1.4
    g.lineJoin = 'round'
    g.stroke()
    const [ex, ey] = pts[pts.length - 1]
    g.fillStyle = '#e9f7fa'
    g.beginPath()
    g.arc(ex, ey, 2, 0, Math.PI * 2)
    g.fill()
  }
}

function drawTrend(g: G, w: number, h: number, p: number, en: boolean) {
  cardBase(g, w, h, tr(TXT.trend, en))
  legend(
    g,
    [
      [tr(TXT.output, en), C.blue, 'line'],
      [tr(TXT.target, en), C.amber, 'dash'],
    ],
    w - 30,
    19,
  )
  const x0 = 40
  const x1 = w - 14
  const y0 = 34
  const y1 = h - 24
  const lo = 450
  const hi = 700
  hGrid(g, x0, x1, y0, y1, lo, hi, 50, (v) => String(v))
  const n = DAILY.length
  const X = (i: number) => x0 + 4 + (i / (n - 1)) * (x1 - x0 - 8)
  const Y = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0)
  // x 라벨
  for (const d of [0, 7, 14, 21, 28]) text(g, `11/${String(d + 1).padStart(2, '0')}`, X(d), h - 10, `500 8.5px ${MONO}`, C.axis, 'center')
  // 목표선
  const ty = Math.round(Y(DAILY_TARGET)) + 0.5
  g.strokeStyle = C.amber
  g.globalAlpha = 0.85 * sg(p, 0, 0.2)
  g.lineWidth = 1.1
  g.setLineDash([4, 3])
  g.beginPath()
  g.moveTo(x0, ty)
  g.lineTo(x1, ty)
  g.stroke()
  g.setLineDash([])
  g.globalAlpha = 1
  // 라인 + 영역(왼→오른쪽으로 그려진다)
  const shown = eo(sg(p, 0.05, 0.95)) * (n - 1)
  if (shown <= 0) return
  const last = Math.floor(shown)
  const fr = shown - last
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= last; i++) pts.push([X(i), Y(DAILY[i])])
  if (last < n - 1) pts.push([X(last + fr), Y(DAILY[last] + (DAILY[last + 1] - DAILY[last]) * fr)])
  const grd = g.createLinearGradient(0, y0, 0, y1)
  grd.addColorStop(0, 'rgba(74,179,204,0.36)')
  grd.addColorStop(1, 'rgba(74,179,204,0.02)')
  g.beginPath()
  g.moveTo(pts[0][0], y1)
  for (const [x, y] of pts) g.lineTo(x, y)
  g.lineTo(pts[pts.length - 1][0], y1)
  g.closePath()
  g.fillStyle = grd
  g.fill()
  g.beginPath()
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.strokeStyle = C.blue
  g.lineWidth = 1.8
  g.lineJoin = 'round'
  g.stroke()
  // 마커(목표 미달은 앰버)
  for (let i = 0; i <= last; i++) {
    g.fillStyle = DAILY[i] < DAILY_TARGET - 40 ? C.amber : '#bfe6ef'
    g.beginPath()
    g.arc(X(i), Y(DAILY[i]), 1.7, 0, Math.PI * 2)
    g.fill()
  }
  // 데이터 라벨: 최대값 + 마지막 점
  const lab = (i: number) => {
    const x = X(i)
    const y = Y(DAILY[i]) - 7
    const s = String(DAILY[i])
    g.font = `600 8.5px ${MONO}`
    const tw = g.measureText(s).width
    rr(g, x - tw / 2 - 3, y - 9, tw + 6, 11, 2)
    g.fillStyle = 'rgba(10,14,18,0.85)'
    g.fill()
    text(g, s, x, y, `600 8.5px ${MONO}`, '#e6f4f7', 'center')
  }
  let mx = 0
  for (let i = 1; i < n; i++) if (DAILY[i] > DAILY[mx]) mx = i
  if (mx <= last) lab(mx)
  if (last >= 1 && last !== mx && Math.abs(last - mx) > 2) lab(last)
}

function drawStacked(g: G, w: number, h: number, p: number, en: boolean) {
  cardBase(g, w, h, tr(TXT.stacked, en))
  legend(
    g,
    [
      [tr(TXT.day, en), C.blue, 'dot'],
      [tr(TXT.night, en), C.blueDeep, 'dot'],
    ],
    w - 30,
    19,
  )
  const x0 = 34
  const x1 = w - 12
  const y0 = 36
  const y1 = h - 22
  const hi = 200
  hGrid(g, x0, x1, y0, y1, 0, hi, 50, (v) => String(v))
  const n = LINES.length
  const slot = (x1 - x0) / n
  const bw = slot * 0.52
  const Y = (v: number) => y1 - (v / hi) * (y1 - y0)
  LINES.forEach((ln, i) => {
    const e = eo(sg(p, i * 0.1, 0.55 + i * 0.1))
    const cx = x0 + slot * (i + 0.5)
    const xL = cx - bw / 2
    const dayH = (y1 - Y(ln.day)) * e
    const nightH = (y1 - Y(ln.night)) * e
    // 야간(아래) → 주간(위)
    g.fillStyle = C.blueDeep
    g.fillRect(xL, y1 - nightH, bw, nightH)
    g.fillStyle = C.blue
    g.fillRect(xL, y1 - nightH - dayH, bw, dayH)
    g.fillStyle = 'rgba(10,14,18,0.6)'
    g.fillRect(xL, y1 - nightH - 0.5, bw, 1)
    text(g, ln.name, cx, h - 9, `500 9px ${MONO}`, C.axis, 'center')
    const la = sg(p, 0.45 + i * 0.1, 0.75 + i * 0.1)
    if (la > 0) {
      g.globalAlpha = la
      text(g, String(ln.night), cx, y1 - nightH / 2 + 3, `600 8.5px ${MONO}`, '#d6eef4', 'center')
      text(g, String(ln.day), cx, y1 - nightH - dayH / 2 + 3, `600 8.5px ${MONO}`, '#0d1a1f', 'center')
      text(g, String(ln.day + ln.night), cx, y1 - nightH - dayH - 5, `600 9px ${MONO}`, C.title, 'center')
      g.globalAlpha = 1
    }
  })
}

function drawPareto(g: G, w: number, h: number, p: number, en: boolean) {
  cardBase(g, w, h, tr(TXT.pareto, en))
  legend(
    g,
    [
      [tr(TXT.count, en), C.amber, 'dot'],
      [tr(TXT.cum, en), C.phos, 'line'],
    ],
    w - 30,
    19,
  )
  const x0 = 30
  const x1 = w - 34
  const y0 = 36
  const y1 = h - 24
  const hi = 40
  hGrid(g, x0, x1, y0, y1, 0, hi, 10, (v) => String(v))
  // 오른쪽 % 축
  for (const v of [0, 50, 100]) {
    const y = y1 - (v / 100) * (y1 - y0)
    text(g, `${v}%`, x1 + 5, y + 3, `500 8.5px ${MONO}`, C.axis)
  }
  const total = PARETO.reduce((a, b) => a + b.n, 0)
  const n = PARETO.length
  const slot = (x1 - x0) / n
  const bw = slot * 0.62
  // 80% 기준선
  const y80 = Math.round(y1 - 0.8 * (y1 - y0)) + 0.5
  g.strokeStyle = 'rgba(215,215,215,0.28)'
  g.setLineDash([3, 3])
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(x0, y80)
  g.lineTo(x1, y80)
  g.stroke()
  g.setLineDash([])
  let cum = 0
  const cpts: Array<[number, number, number]> = []
  PARETO.forEach((d, i) => {
    const e = eo(sg(p, i * 0.07, 0.5 + i * 0.07))
    const cx = x0 + slot * (i + 0.5)
    const bh = (d.n / hi) * (y1 - y0) * e
    g.fillStyle = i === 0 ? C.red : C.amber
    g.globalAlpha = i === 0 ? 0.92 : 0.85 - i * 0.06
    g.fillRect(cx - bw / 2, y1 - bh, bw, bh)
    g.globalAlpha = 1
    if (e > 0.6) text(g, String(d.n), cx, y1 - bh - 4, `600 8.5px ${MONO}`, C.text, 'center')
    text(g, tr(d.name, en), cx, h - 10, `500 8.5px ${SANS}`, C.axis, 'center')
    cum += d.n
    cpts.push([cx, y1 - (cum / total) * (y1 - y0), Math.round((cum / total) * 100)])
  })
  // 누적 % 라인(막대 뒤에 그려진다)
  const lp = eo(sg(p, 0.35, 1)) * (n - 1)
  const last = Math.floor(lp)
  const fr = lp - last
  g.beginPath()
  for (let i = 0; i <= last; i++) (i ? g.lineTo : g.moveTo).call(g, cpts[i][0], cpts[i][1])
  if (last < n - 1) g.lineTo(cpts[last][0] + (cpts[last + 1][0] - cpts[last][0]) * fr, cpts[last][1] + (cpts[last + 1][1] - cpts[last][1]) * fr)
  g.strokeStyle = C.phos
  g.lineWidth = 1.5
  g.globalAlpha = sg(p, 0.35, 0.45)
  g.stroke()
  for (let i = 0; i <= last; i++) {
    g.fillStyle = '#f0f0f0'
    g.beginPath()
    g.arc(cpts[i][0], cpts[i][1], 2, 0, Math.PI * 2)
    g.fill()
    if (i > 0 && i < n - 1) text(g, `${cpts[i][2]}%`, cpts[i][0] + 4, cpts[i][1] - 5, `500 8px ${MONO}`, C.sub)
  }
  g.globalAlpha = 1
}

function drawTable(g: G, w: number, h: number, p: number, en: boolean) {
  cardBase(g, w, h, tr(TXT.wo, en))
  const x0 = 10
  const x1 = w - 10
  const top = 30
  const rh = 18.5
  // 열 위치(오른쪽 정렬 숫자)
  const cols = [x0 + 4, x0 + 94, x0 + 222, x0 + 272, x0 + 286, x1 - 58]
  // 헤더
  g.fillStyle = 'rgba(255,255,255,0.05)'
  g.fillRect(x0, top, x1 - x0, rh)
  const hf = `600 9px ${SANS}`
  text(g, tr(TXT.woCols[0], en), cols[0], top + 12.5, hf, C.text)
  text(g, tr(TXT.woCols[1], en), cols[1], top + 12.5, hf, C.text)
  text(g, tr(TXT.woCols[2], en), cols[2], top + 12.5, hf, C.text, 'right')
  text(g, tr(TXT.woCols[3], en), cols[3], top + 12.5, hf, C.text, 'right')
  text(g, tr(TXT.woCols[4], en), cols[4], top + 12.5, hf, C.text)
  text(g, tr(TXT.woCols[5], en), cols[5], top + 12.5, hf, C.text)
  g.fillStyle = C.blue
  g.fillRect(x0, top + rh - 1, x1 - x0, 1)
  const barX = cols[4]
  const barW = cols[5] - cols[4] - 12
  WO.forEach((r, i) => {
    const a = sg(p, i * 0.1, i * 0.1 + 0.25)
    if (a <= 0) return
    const y = top + rh * (i + 1)
    g.globalAlpha = a
    if (i % 2 === 1) {
      g.fillStyle = 'rgba(255,255,255,0.025)'
      g.fillRect(x0, y, x1 - x0, rh)
    }
    g.fillStyle = 'rgba(255,255,255,0.05)'
    g.fillRect(x0, y + rh - 0.5, x1 - x0, 0.5)
    const f = `500 9px ${MONO}`
    const cy = y + 12.5
    text(g, r[0], cols[0], cy, f, C.text)
    text(g, r[1], cols[1], cy, f, C.sub)
    text(g, fmt(r[2]), cols[2], cy, f, C.text, 'right')
    const act = Math.round(r[3] * eo(sg(p, i * 0.1 + 0.1, i * 0.1 + 0.55)))
    text(g, fmt(act), cols[3], cy, f, C.title, 'right')
    // 조건부 서식: 데이터 바 + 색 구간
    const pct = r[2] ? r[3] / r[2] : 0
    const col = pct >= 0.95 ? C.teal : pct >= 0.8 ? C.amber : pct > 0 ? C.red : C.sub
    const bp = eo(sg(p, i * 0.1 + 0.15, i * 0.1 + 0.6))
    g.fillStyle = 'rgba(255,255,255,0.05)'
    g.fillRect(barX, y + 4, barW, rh - 8)
    g.fillStyle = col
    g.globalAlpha = a * 0.55
    g.fillRect(barX, y + 4, barW * Math.min(1, pct) * bp, rh - 8)
    g.globalAlpha = a
    text(g, `${(pct * 100 * bp).toFixed(1)}%`, barX + 4, cy, `600 8.5px ${MONO}`, '#eef3f5')
    // 상태 아이콘
    const st = WO_STATE[r[4]]
    g.fillStyle = st.c
    g.beginPath()
    g.arc(cols[5] + 3, cy - 3, 3, 0, Math.PI * 2)
    g.fill()
    text(g, tr(st.l, en), cols[5] + 10, cy, `500 9px ${SANS}`, C.text)
    g.globalAlpha = 1
  })
}

/** 페이지 배경: 헤더(로고·제목·슬라이서) + 페이지 탭 + 새로 고침 스탬프. refreshN<0 이면 '새로 고침 중'. */
function drawPage(g: G, en: boolean, refreshN: number) {
  const W = PAGE_W
  const H = PAGE_H
  rr(g, 1, 1, W - 2, H - 2, 9)
  g.fillStyle = C.page
  g.fill()
  g.strokeStyle = C.pageEdge
  g.lineWidth = 1.2
  g.stroke()
  // 상단 하이라이트(유리 엣지)
  const hl = g.createLinearGradient(0, 0, W, 0)
  hl.addColorStop(0, 'rgba(150,220,235,0)')
  hl.addColorStop(0.5, 'rgba(150,220,235,0.55)')
  hl.addColorStop(1, 'rgba(150,220,235,0)')
  g.fillStyle = hl
  g.fillRect(40, 1, W - 80, 1)
  // Power BI 로고 글리프(세로 막대 3)
  g.fillStyle = C.pbi
  const lx = 16
  ;[
    [0, 12, 0.55],
    [6, 6, 0.8],
    [12, 0, 1],
  ].forEach(([dx, dy, a]) => {
    g.globalAlpha = a
    rr(g, lx + dx, 16 + dy, 5, 22 - dy, 1.2)
    g.fill()
  })
  g.globalAlpha = 1
  text(g, tr(TXT.title, en), 42, 27, `700 15px ${SANS}`, C.title)
  text(g, tr(TXT.subtitle, en), 42, 42, `500 9.5px ${SANS}`, C.sub)
  // 슬라이서
  const sl: Array<[L, L, number]> = [
    [TXT.period, TXT.periodV, 150],
    [TXT.line, TXT.all, 92],
    [TXT.proc, TXT.all, 92],
  ]
  let sx = W - M
  for (let i = sl.length - 1; i >= 0; i--) {
    const [lab, val, sw] = sl[i]
    sx -= sw
    text(g, tr(lab, en), sx, 15, `600 8.5px ${SANS}`, C.sub)
    rr(g, sx + 0.5, 20.5, sw - 1, 22, 3)
    g.fillStyle = 'rgba(255,255,255,0.04)'
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.16)'
    g.lineWidth = 1
    g.stroke()
    text(g, tr(val, en), sx + 8, 35, `500 9.5px ${i === 0 ? MONO : SANS}`, C.text)
    // ▾ 셰브론
    g.strokeStyle = C.sub
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(sx + sw - 15, 29)
    g.lineTo(sx + sw - 11.5, 32.5)
    g.lineTo(sx + sw - 8, 29)
    g.stroke()
    sx -= 10
  }
  // 페이지 탭
  const ty = PAGE_H - 22
  let tx = M
  TXT.tabs.forEach((tb, i) => {
    const s = tr(tb, en)
    g.font = `600 9.5px ${SANS}`
    const tw = g.measureText(s).width + 20
    if (i === 0) {
      rr(g, tx, ty, tw, 17, 3)
      g.fillStyle = 'rgba(255,255,255,0.08)'
      g.fill()
      g.fillStyle = C.pbi
      g.fillRect(tx + 6, ty + 16, tw - 12, 1.6)
    }
    text(g, s, tx + 10, ty + 12, `600 9.5px ${SANS}`, i === 0 ? C.title : C.sub)
    tx += tw + 4
  })
  // 새로 고침 스탬프
  const right = W - M
  let stamp: string
  if (refreshN < 0) stamp = tr(TXT.refreshing, en)
  else {
    const mins = 7 * 60 + 30 * refreshN
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0')
    const mm = String(mins % 60).padStart(2, '0')
    stamp = `${tr(TXT.refresh, en)}  2023-11-30 ${hh}:${mm}`
  }
  g.font = `500 9px ${SANS}`
  const gw = `  ·  ${tr(TXT.gw, en)}`
  const gwW = g.measureText(gw).width
  text(g, gw, right, ty + 12, `500 9px ${SANS}`, C.blue, 'right')
  g.font = `500 9px ${MONO}`
  const sw = g.measureText(stamp).width
  text(g, stamp, right - gwW, ty + 12, `500 9px ${MONO}`, refreshN < 0 ? C.amber : C.text, 'right')
  // 새로 고침 아이콘(원호 + 화살촉)
  const ix = right - gwW - sw - 10
  const iy = ty + 9
  g.strokeStyle = refreshN < 0 ? C.amber : C.teal
  g.lineWidth = 1.3
  g.beginPath()
  g.arc(ix, iy, 4, -Math.PI * 0.2, Math.PI * 1.45)
  g.stroke()
  g.fillStyle = g.strokeStyle
  g.beginPath()
  g.moveTo(ix + 4.6, iy - 4.6)
  g.lineTo(ix + 4.8, iy + 0.2)
  g.lineTo(ix + 0.6, iy - 2.2)
  g.fill()
}

// ─────────────────────────── 3D 메시 ───────────────────────────
const VS = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
/** 캔버스 텍스처 + 아래→위 와이프 등장(전선에 틸 빛띠) + 갱신 플래시. 밝기 uMul 은 블룸 임계 아래. */
const FS = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uReveal;
uniform float uFlash;
uniform float uMul;
uniform vec3 uEdge;
varying vec2 vUv;
void main() {
  vec4 tx = texture2D(uMap, vUv);
  float front = uReveal * 1.08;
  float m = 1.0 - smoothstep(front - 0.08, front, vUv.y);
  float band = exp(-pow((vUv.y - (front - 0.04)) / 0.02, 2.0)) * (1.0 - step(1.0, uReveal)) * step(0.001, uReveal);
  vec3 c = tx.rgb * uMul;
  // 갱신 플래시: 가장자리 링 + 아주 옅은 면
  vec2 q = abs(vUv - 0.5);
  float edge = smoothstep(0.47, 0.5, max(q.x, q.y));
  c += uEdge * uFlash * (0.08 + 0.6 * edge) * tx.a;
  c += uEdge * band * 1.6;
  float a = (tx.a * m + band * 0.8) * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(c, a);
}
`

export interface VisualMesh {
  def: VisualDef
  mesh: THREE_NS.Mesh
  mat: THREE_NS.ShaderMaterial
  tex: THREE_NS.CanvasTexture
  cv: HTMLCanvasElement
  key: string
  /** 월드 좌표 앵커(카드 중심) — 스트림 도착점 */
  center: THREE_NS.Vector3
}
export interface Report {
  group: THREE_NS.Group
  page: { mesh: THREE_NS.Mesh; mat: THREE_NS.ShaderMaterial; tex: THREE_NS.CanvasTexture; cv: HTMLCanvasElement; key: string }
  bezel: THREE_NS.Mesh
  bezelMat: THREE_NS.MeshStandardMaterial
  visuals: VisualMesh[]
  /** 상태가 바뀐 경우에만 다시 그린다(결정적). progress = 비주얼별 0..1 */
  paint(progress: number[], en: boolean, refreshN: number): void
}

function makeLayer(THREE: Three, w: number, h: number, mul: number, edge: THREE_NS.Color) {
  const cv = document.createElement('canvas')
  cv.width = Math.round(w * TEX_SCALE)
  cv.height = Math.round(h * TEX_SCALE)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS,
    fragmentShader: FS,
    uniforms: {
      uMap: { value: tex },
      uOpacity: { value: 0 },
      uReveal: { value: 0 },
      uFlash: { value: 0 },
      uMul: { value: mul },
      uEdge: { value: edge },
    },
    transparent: true,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * RPX, h * RPX), mat)
  return { cv, tex, mat, mesh }
}

function draw(cv: HTMLCanvasElement, fn: (g: G) => void) {
  const g = cv.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, cv.width, cv.height)
  g.setTransform(TEX_SCALE, 0, 0, TEX_SCALE, 0, 0)
  g.textBaseline = 'alphabetic'
  fn(g)
}

export function makeReport(THREE: Three, RoundedBox: new (w: number, h: number, d: number, s: number, r: number) => THREE_NS.BufferGeometry, edge: THREE_NS.Color): Report {
  const group = new THREE.Group()
  // 페이지(유리 캔버스) + 뒤 베젤(두께감)
  const pageL = makeLayer(THREE, PAGE_W, PAGE_H, 0.92, edge)
  pageL.mesh.renderOrder = 5
  group.add(pageL.mesh)
  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x151b20, metalness: 0.85, roughness: 0.38, transparent: true, opacity: 0, depthWrite: false })
  const bezel = new THREE.Mesh(new RoundedBox(REPORT_W - 0.04, REPORT_H - 0.04, 0.06, 3, 0.028), bezelMat)
  bezel.position.z = -0.045
  group.add(bezel)
  const visuals: VisualMesh[] = VISUALS.map((def) => {
    const l = makeLayer(THREE, def.w, def.h, 0.86, edge)
    l.mesh.position.set((def.x + def.w / 2 - PAGE_W / 2) * RPX, (PAGE_H / 2 - (def.y + def.h / 2)) * RPX, 0.018)
    l.mesh.renderOrder = 6
    group.add(l.mesh)
    return { def, mesh: l.mesh, mat: l.mat, tex: l.tex, cv: l.cv, key: '', center: new THREE.Vector3() }
  })
  const page = { mesh: pageL.mesh, mat: pageL.mat, tex: pageL.tex, cv: pageL.cv, key: '' }

  function paint(progress: number[], en: boolean, refreshN: number) {
    const pk = `${en ? 1 : 0}|${refreshN}`
    if (pk !== page.key) {
      page.key = pk
      draw(page.cv, (g) => drawPage(g, en, refreshN))
      page.tex.needsUpdate = true
    }
    visuals.forEach((v, i) => {
      // 진행도 1/72 양자화 — 애니메이션 중에만 다시 그린다
      const q = Math.round(clamp01(progress[i]) * 72) / 72
      const key = `${en ? 1 : 0}|${q}`
      if (key === v.key) return
      v.key = key
      const { w, h, kind } = v.def
      draw(v.cv, (g) => {
        if (kind.startsWith('kpi')) drawKpi(g, w, h, KPIS[Number(kind[3])], q, en)
        else if (kind === 'trend') drawTrend(g, w, h, q, en)
        else if (kind === 'stacked') drawStacked(g, w, h, q, en)
        else if (kind === 'pareto') drawPareto(g, w, h, q, en)
        else drawTable(g, w, h, q, en)
      })
      v.tex.needsUpdate = true
    })
  }
  return { group, page, bezel, bezelMat, visuals, paint }
}
