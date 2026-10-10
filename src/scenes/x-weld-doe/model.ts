// 응답 곡면 모델 — 시각화용 가상 곡면(실측 파라미터 아님).
// 좌표: a = 진폭, p = 가압력, w = 용착 시간, 모두 코딩 단위 [-1, 1].
// 값: 불량률(%) — 시작 조건에서 정확히 15%, 최적 창 바닥은 0%대(0.4%).
// GLSL 판(build.ts SURF_GLSL)과 식이 1:1 로 같아야 한다.

export const SPAN = 3 // 코딩 단위 1 = 월드 3
export const HS = 0.085 // 불량률 1% = 월드 높이 0.085
export const FLOOR_Y = -0.45
export const FLOOR_PCT = 0.4
export const START = { a: -0.85, p: 0.85 }

export const center = (w: number): [number, number] => [0.25 + 0.2 * w, -0.2 - 0.1 * w]

function qb(a: number, p: number, w: number): number {
  const [ca, cp] = center(w)
  const da = a - ca
  const dp = p - cp
  const q = da * da + 0.9 * dp * dp + 0.5 * da * dp
  const b = 1 + 0.18 * Math.sin(2.3 * a + 1.1) * Math.cos(1.7 * p - 0.4)
  return (1 + 0.25 * w * w) * q * b
}

/** 포화 상한(고원) — 조건이 크게 벗어나면 불량률이 평평한 고원으로 수렴. */
export const D_SAT = 22
/** 시작 조건에서 정확히 15% 가 되도록 스케일. */
export const K = (-D_SAT * Math.log(1 - (15 - FLOOR_PCT) / D_SAT)) / qb(START.a, START.p, 0)

export const defect = (a: number, p: number, w: number): number =>
  FLOOR_PCT + D_SAT * (1 - Math.exp((-K * qb(a, p, w)) / D_SAT))

const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export interface SurfState {
  w: number
  fit: number
  ripT: number
  ripA: number
}

export const fitLocal = (a: number, p: number, fit: number) =>
  sstep(0, 1, Math.min(1, Math.max(0, fit * 2.2 - Math.hypot(a, p) * 0.8)))

export function ripple(a: number, p: number, s: SurfState): number {
  const r = Math.hypot(a - START.a, p - START.p) * SPAN
  const front = s.ripT * 2.4
  return s.ripA * 0.06 * Math.sin(r * 10 - s.ripT * 16) * Math.exp(-r * 0.35) * (1 - sstep(front - 0.8, front, r))
}

/** 화면에 보이는 곡면 높이(월드 y). */
export function surfaceY(a: number, p: number, s: SurfState): number {
  const l = fitLocal(a, p, s.fit)
  return defect(a, p, s.w) * HS * l + ripple(a, p, s) * (1 - l)
}

/** w=0 에서 시작 조건 → 최적 창 경사 하강 경로(코딩 좌표), 균등 호장 리샘플. */
export function descentPath(n = 160): Array<[number, number]> {
  const raw: Array<[number, number]> = [[START.a, START.p]]
  let a = START.a
  let p = START.p
  const [ca, cp] = center(0)
  const e = 1e-3
  for (let i = 0; i < 900; i++) {
    const d0 = defect(a, p, 0)
    const ga = (defect(a + e, p, 0) - d0) / e
    const gp = (defect(a, p + e, 0) - d0) / e
    const g = Math.hypot(ga, gp)
    if (g < 1e-6 || Math.hypot(a - ca, p - cp) < 0.015) break
    const step = 0.006
    a -= (ga / g) * step
    p -= (gp / g) * step
    raw.push([a, p])
  }
  raw.push([ca, cp])
  // 호장 리샘플
  const cum = [0]
  for (let i = 1; i < raw.length; i++)
    cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]))
  const total = cum[cum.length - 1]
  const out: Array<[number, number]> = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * total
    while (j < cum.length - 2 && cum[j + 1] < s) j++
    const seg = cum[j + 1] - cum[j] || 1
    const f = (s - cum[j]) / seg
    out.push([raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f, raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f])
  }
  return out
}

/** DOE 런 배치(장식용 잔차 포함) — 요인 배치 + 중심점. 결과 수치로 표시하지 않는다. */
export interface Run {
  a: number
  p: number
  w: number
  res: number
}
const R = 0.75
const RES = [0.9, -0.6, 0.5, -0.8, 0.7, -0.4, 0.6, -0.7, 0.3, -0.2, 0.25]
export const RUNS: Run[] = (() => {
  const out: Run[] = []
  let k = 0
  for (const w of [-1, 1]) for (const p of [-R, R]) for (const a of [-R, R]) out.push({ a, p, w, res: RES[k++] })
  const cOff: Array<[number, number]> = [
    [0, 0],
    [0.05, -0.04],
    [-0.05, 0.04],
  ]
  for (const [da, dp] of cOff) out.push({ a: da, p: dp, w: 0, res: RES[k++] })
  return out
})()
