export type Point = [number, number]

export interface CareerEntry {
  org: string
  role: string
  date: string
  layerNo: string
  body: string
  tags: Array<[string, 0 | 1]>
}

export interface MetricEntry {
  label: string
  val: string
  cls: 'good' | 'up' | 'zero'
  w: number
}

export type SkillEntry = [string, string]

interface TravelMove {
  type: 'travel'
  x: number
  y: number
  z: number
  note?: string
}

interface ExtrudeMove {
  type: 'extrude'
  x: number
  y: number
  z: number
  e: number
  feature?: string
  infill?: boolean
}

export type Move = TravelMove | ExtrudeMove

export interface Layer {
  z: number
  moves: Move[]
}

export const CAREER: CareerEntry[] = [
  {
    org: '인필 / 팬 / 재료',
    role: 'INFILL · FAN · MATERIAL',
    date: 'LAYER 067–088 · top solid',
    layerNo: 'LAYER 067–088 · top solid',
    body: '인필 밀도 35% · Gyroid 패턴 / 솔리드 레이어 상단 4 / 하단 4 · 완전 밀폐 / 팬 속도 60% · 초기 3레이어 OFF / 재료: PETG-CF 1.75mm · 노즐 0.4mm(강화형) / ABS·Nylon 혼용 가능',
    tags: [
      ['인필 35%', 1],
      ['Gyroid', 1],
      ['팬 60%', 0],
      ['PETG-CF', 1],
      ['ABS/Nylon', 0],
    ],
  },
  {
    org: '속도 / 리트랙션',
    role: 'SPEED · RETRACTION · TRAVEL',
    date: 'LAYER 045–066',
    layerNo: 'LAYER 045–066',
    body: '출력 속도 60mm/s · 외벽 45mm/s / 이동 속도(travel) 180mm/s · 오징 최소화 / 리트랙션 거리 1.0mm(직결) · 4–5mm(Bowden) / 리트랙션 속도 45mm/s · 코너 감속 활성화',
    tags: [
      ['60mm/s', 1],
      ['travel 180', 0],
      ['리트랙션 1.0mm', 1],
      ['코너 감속', 1],
      ['외벽 우선', 0],
    ],
  },
  {
    org: '레이어 / 압출',
    role: 'LAYER · EXTRUSION · WALLS',
    date: 'LAYER 023–044',
    layerNo: 'LAYER 023–044',
    body: '레이어 높이 0.20mm · 초기 레이어 0.30mm(베드 접착 강화) / 벽 두께(perimeters) 3겹 1.2mm · 외벽 우선 출력 / 플로우율(flow) 97% · PETG 오버 압출 보정 / 상단·하단 솔리드 4레이어씩',
    tags: [
      ['0.20mm', 1],
      ['초기 0.30mm', 0],
      ['3겹 벽', 1],
      ['flow 97%', 1],
      ['솔리드 4L', 0],
    ],
  },
  {
    org: '온도 설정',
    role: 'TEMPERATURE · HEATING',
    date: 'LAYER 001–022 · base',
    layerNo: 'LAYER 001–022 · base',
    body: '노즐 온도 215°C · PETG-CF 권장 범위 / 베드 온도 60°C · PEI 코팅 베드 최적 / 챔버 온도 35°C · 열수축 방지 / 히팅 대기 M109(노즐) + M190(베드) 동시 예열 / PLA 195–220°C · ABS 240–260°C',
    tags: [
      ['노즐 215°C', 1],
      ['베드 60°C', 1],
      ['M109/M190', 0],
      ['PLA 200°C', 0],
      ['ABS 250°C', 0],
    ],
  },
]

export const METRICS: MetricEntry[] = [
  { label: '베드 기준면 평탄도', val: '0.08mm', cls: 'good', w: 92 },
  { label: '카트리지 안착 유격', val: '0.15mm', cls: 'good', w: 78 },
  { label: '인서트 포켓 반복성', val: '±0.10', cls: 'good', w: 86 },
  { label: '외벽/홀 순서 검증', val: 'OK', cls: 'good', w: 88 },
  { label: '인필 밀도', val: '35%', cls: 'up', w: 62 },
  { label: '체결 보스 보강', val: '4EA', cls: 'up', w: 74 },
  { label: '시제품 빌드 시간', val: '42분', cls: 'good', w: 60 },
  { label: '현장 피드백 반영', val: '2회', cls: 'zero', w: 66 },
]

export const SKILLS: SkillEntry[] = [
  ['적층제조 FDM', '#ff7a18'],
  ['치공구 설계', '#ff7a18'],
  ['기구설계', '#ff7a18'],
  ['카트리지 JIG', '#ff7a18'],
  ['인서트 JIG', '#ff7a18'],
  ['PETG-CF', '#ffb454'],
  ['PLA', '#ffb454'],
  ['ABS', '#ffb454'],
  ['Nylon', '#ffb454'],
  ['TPU', '#ffb454'],
  ['노즐 0.4mm', '#9aa2b1'],
  ['레이어 0.2mm', '#9aa2b1'],
  ['인필 35%', '#9aa2b1'],
  ['Cura', '#3ddc97'],
  ['PrusaSlicer', '#3ddc97'],
]

export const TOTAL_LAYERS = 88
export const LAYER_H = 0.2
export const T_TARGET = 215
export const PLATE = { w: 220, d: 220 }
const JIG = { x: 28, y: 48, w: 164, h: 124 }
export const CAREER_REVEAL = [22, 44, 66, 84]

export function jigWorld(x: number, y: number): Point {
  return [JIG.x + (x / 164) * JIG.w, JIG.y + (y / 124) * JIG.h]
}

function resample(poly: Point[], step: number): Point[] {
  const out: Point[] = [[poly[0][0], poly[0][1]]]
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1]
    const b = poly[i]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const d = Math.hypot(dx, dy)
    const n = Math.max(1, Math.round(d / step))
    for (let k = 1; k <= n; k++) out.push([a[0] + (dx * k) / n, a[1] + (dy * k) / n])
  }
  return out
}

function roundedRect(x: number, y: number, w: number, h: number, r: number, steps = 5): Point[] {
  const pts: Point[] = []
  const corners: Array<[number, number, number, number]> = [
    [x + w - r, y + r, -Math.PI / 2, 0],
    [x + w - r, y + h - r, 0, Math.PI / 2],
    [x + r, y + h - r, Math.PI / 2, Math.PI],
    [x + r, y + r, Math.PI, Math.PI * 1.5],
  ]
  pts.push([x + r, y])
  for (const [cx, cy, a0, a1] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (a1 - a0) * (i / steps)
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  }
  pts.push([x + r, y])
  return pts
}

function circle(cx: number, cy: number, r: number, steps = 28): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return pts
}

const TOOLPATHS: Array<{ name: string; start: number; pts: Point[]; every: number }> = [
  { name: 'base outer shell', start: 0, pts: roundedRect(0, 0, 164, 124, 10), every: 1 },
  { name: 'cartridge cutting nest', start: 0, pts: roundedRect(18, 34, 82, 42, 5), every: 1 },
  { name: 'press pad contact face', start: 12, pts: roundedRect(36, 48, 48, 18, 3), every: 1 },
  { name: 'upper clamp rail', start: 18, pts: roundedRect(16, 20, 92, 9, 3), every: 1 },
  { name: 'lower clamp rail', start: 18, pts: roundedRect(16, 82, 92, 9, 3), every: 1 },
  { name: 'insert automation pocket A', start: 4, pts: circle(126, 38, 13), every: 1 },
  { name: 'insert automation pocket B', start: 4, pts: circle(126, 84, 13), every: 1 },
  { name: 'shuttle guide slot', start: 10, pts: roundedRect(113, 55, 40, 14, 4), every: 1 },
  { name: 'screw boss NW', start: 0, pts: circle(18, 18, 6, 20), every: 2 },
  { name: 'screw boss NE', start: 0, pts: circle(146, 18, 6, 20), every: 2 },
  { name: 'screw boss SW', start: 0, pts: circle(18, 106, 6, 20), every: 2 },
  { name: 'screw boss SE', start: 0, pts: circle(146, 106, 6, 20), every: 2 },
  {
    name: 'datum rib left',
    start: 28,
    pts: [
      [25, 30],
      [25, 95],
    ],
    every: 1,
  },
  {
    name: 'datum rib right',
    start: 28,
    pts: [
      [102, 30],
      [102, 95],
    ],
    every: 1,
  },
]

const INFILL_LINES: Array<[Point, Point]> = [
  [
    [10, 14],
    [154, 110],
  ],
  [
    [10, 30],
    [138, 114],
  ],
  [
    [10, 46],
    [118, 114],
  ],
  [
    [10, 62],
    [98, 114],
  ],
  [
    [10, 78],
    [78, 114],
  ],
  [
    [30, 10],
    [154, 86],
  ],
  [
    [50, 10],
    [154, 70],
  ],
  [
    [70, 10],
    [154, 54],
  ],
  [
    [90, 10],
    [154, 38],
  ],
  [
    [110, 10],
    [154, 22],
  ],
]

function buildLayer(li: number): Layer {
  const moves: Move[] = []
  let e = 0
  const z = (li + 1) * LAYER_H
  for (const path of TOOLPATHS) {
    if (li < path.start || li % path.every !== 0) continue
    const pts = resample(path.pts, 6)
    const [sx, sy] = jigWorld(pts[0][0], pts[0][1])
    moves.push({ type: 'travel', x: sx, y: sy, z, note: path.name })
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = jigWorld(pts[i - 1][0], pts[i - 1][1])
      const [wx, wy] = jigWorld(pts[i][0], pts[i][1])
      const seg = Math.hypot(wx - px, wy - py)
      e += seg * 0.043
      moves.push({ type: 'extrude', x: wx, y: wy, z, e, feature: path.name })
    }
  }

  if (li % 3 === 0 && li < 72) {
    const dir = (li / 3) % 2 === 0
    for (const line of INFILL_LINES) {
      const a = dir ? line[0] : line[1]
      const b = dir ? line[1] : line[0]
      const [p0x, p0y] = jigWorld(a[0], a[1])
      const [p1x, p1y] = jigWorld(b[0], b[1])
      moves.push({ type: 'travel', x: p0x, y: p0y, z, note: '35% infill' })
      e += Math.hypot(p1x - p0x, p1y - p0y) * 0.02
      moves.push({ type: 'extrude', x: p1x, y: p1y, z, e, infill: true, feature: '35% infill' })
    }
  }

  return { z, moves }
}

export const LAYERS: Layer[] = Array.from({ length: TOTAL_LAYERS }, (_, i) => buildLayer(i))
