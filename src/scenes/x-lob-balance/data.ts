// LOB 라인 밸런싱 — 사실/라벨/타임라인 상수.
// 사실(출처: content/projects/line-innovation.ts, content/profile.ts):
//  - 커팅 Jig 개발 → Neck 공정 C/T 16.72sec → 12.76sec (24% 단축)
//  - 검사 Jig 개조 → Core-pack Function Test C/T 55sec → 28sec (49% 단축)
//  - 소형 배터리팩 라인 LOB 개선 → 생산성 24% 향상 (연 4,437만원)
// 그 외 공정의 높이는 예시(illustrative)이며 초 단위 수치를 표시하지 않는다.

/** 균형(takt) 레벨의 월드 높이. 두 병목 공정은 개선 후 이 높이에 정렬된다. */
export const LEVEL = 2.0

/** 공정 간격/폭. */
export const SPACING = 1.55
export const TOWER_W = 0.86

export type Bottleneck = {
  key: 'neck' | 'ft'
  /** 스테이션 인덱스 */
  idx: number
  ctBefore: number
  ctAfter: number
  pct: number
  /** 지그 강하 / 절삭 구간(초) */
  drop: [number, number]
  cut: [number, number]
}

export const BOTTLENECKS: Bottleneck[] = [
  {
    key: 'neck',
    idx: 2,
    ctBefore: 16.72,
    ctAfter: 12.76,
    pct: 24,
    drop: [0.9, 1.6],
    cut: [1.6, 2.9],
  },
  {
    key: 'ft',
    idx: 6,
    ctBefore: 55,
    ctAfter: 28,
    pct: 49,
    drop: [2.6, 3.3],
    cut: [3.3, 4.6],
  },
]

/** 높이 = 개선 후 C/T 를 LEVEL 에 맞춘 상대 비율(공정 내 before/after 비율은 실제와 동일). */
export const heightOf = (b: Bottleneck, ct: number) => (LEVEL * ct) / b.ctAfter

/** 일반 공정(예시) — 개선 전/후 상대 높이(LEVEL 대비). 수치 라벨 없음. */
export const STATIONS = 9
export const ILLUSTRATIVE_BEFORE = [0.74, 0.86, 0, 0.68, 0.9, 0.79, 0, 0.83, 0.7]
export const ILLUSTRATIVE_AFTER = [0.9, 0.95, 0, 0.88, 0.96, 0.92, 0, 0.94, 0.89]

/** 타임라인(초). */
export const T = {
  planeDrop: [4.7, 5.5] as [number, number],
  rebalance: [4.9, 5.9] as [number, number],
  flowRamp: [4.9, 6.1] as [number, number],
  hero: [5.4, 6.6] as [number, number],
  heroEnd: 7.0,
}

/** 생산성 +24% → 제품 흐름 속도도 1.24배. */
export const FLOW_V0 = 0.62
export const FLOW_GAIN = 1.24
export const PRODUCTIVITY_PCT = 24

export const HUD = {
  ko: {
    kicker: '이랜텍 · 2022.11–2023.09',
    title: 'LOB 개선 · 소형 배터리팩 라인',
    beats: ['병목 공정 C/T', 'Jig 개발 · C/T 단축', 'LOB 재편성'],
    neck: 'Neck 공정',
    ft: 'Core-pack Function Test',
    jigNeck: '커팅 Jig 개발',
    jigFt: '검사 Jig 개조',
    bottleneck: '병목 C/T',
    balanced: '라인 균형',
    heroLabel: '생산성',
    heroSub: '연 4,437만원',
    foot: '막대 높이 = 공정 C/T(상대) · 수치 없는 공정은 예시',
  },
  en: {
    kicker: 'Elentec · 2022.11–2023.09',
    title: 'LOB improvement · small battery-pack line',
    beats: ['Bottleneck C/T', 'Jig development · C/T cut', 'LOB rebalancing'],
    neck: 'Neck process',
    ft: 'Core-pack Function Test',
    jigNeck: 'Cutting jig (new)',
    jigFt: 'Test jig (modified)',
    bottleneck: 'Bottleneck C/T',
    balanced: 'Line balanced',
    heroLabel: 'Productivity',
    heroSub: 'KRW 44.37M / yr',
    foot: 'Bar height = relative station C/T · unlabeled stations illustrative',
  },
}

export type HudText = (typeof HUD)['ko']
