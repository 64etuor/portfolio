import type { Locale } from '@/i18n/content'

// 공정 추적성(S/N genealogy) 씬 — 사실·라벨·타이밍.
// 사실 출처: content/projects/traceability.ts, content/profile.ts (traceability-2403).
// 그래프 노드 수·LOT/SN 번호는 시각 텍스처일 뿐 성과 수치가 아니다.

/** 히어로 시퀀스 길이(초). 이후 AMBIENT_PERIOD 로 무한 반복. */
export const HERO = 7.6
export const AMBIENT_PERIOD = 8

/** 타임라인 비트(초). */
export const T = {
  defectIn: 0.35,
  defectFull: 1.0,
  ambigIn: 1.5,
  ambigFull: 2.3,
  ambigOut: 3.3,
  backStart: 3.35,
  backHop: 0.36, // 제품→상위조립→서브→LOT 각 홉
  fwdStart: 4.55,
  fwdHop: 0.42, // LOT→서브→상위조립→제품
  gateStart: 5.3,
  gateHit: 6.15,
  awardIn: 6.6,
} as const

/** 레이어: 원자재 LOT → 서브 조립 → 상위 공정 조립 → 출하 제품. */
export const LAYERS = [
  { count: 30, x: -8.2, y: -1.4, r: 2.1 },
  { count: 120, x: -2.9, y: -0.45, r: 3.0 },
  { count: 300, x: 2.3, y: 0.45, r: 3.55 },
  { count: 1200, x: 7.6, y: 1.3, r: 4.1 },
] as const

/** 자식 하나가 갖는 부모 수(레이어 l → l+1). */
export const PARENTS = [2, 2, 1] as const

export const EDGE_SEGS = 6

export const DECOR = {
  defectSn: 'SN-2403-0917',
  lot: 'LOT-0417',
  unreg: 'SN-2405-1132',
}

export interface HudText {
  kicker: string
  title: string
  layers: [string, string, string, string]
  defect: string
  lotFound: string
  rangeUnknown: string
  rangeKnown: string
  gate: string
  gateSub: string
  steps: [string, string, string]
  award: string
  awardSub: string
  stack: string
}

const KO: HudText = {
  kicker: 'SOLAREDGE KOREA · 2024.03–06',
  title: '공정 추적성 관리',
  layers: ['원자재 LOT', '서브 조립', '상위 공정 조립', '출하 제품 S/N'],
  defect: '필드 원자재 불량',
  lotFound: '원인 LOT 역추적',
  rangeUnknown: '영향 범위 ?',
  rangeKnown: '영향 S/N 특정',
  gate: '미등록 제품',
  gateSub: '상위 공정 투입 차단',
  steps: ['수기 S/N → 리스크 범위 측정 불가', 'S/N 추적 → 영향 범위 특정', '미등록 제품 상위 공정 차단'],
  award: '2024 Core Value Award',
  awardSub: '필드 원자재 불량 재발 방지',
  stack: 'Power Apps · Power BI · Power Automate',
}

const EN: HudText = {
  kicker: 'SOLAREDGE KOREA · 2024.03–06',
  title: 'Process Traceability',
  layers: ['RAW LOT', 'SUB-ASSY', 'UPPER ASSY', 'SHIPPED S/N'],
  defect: 'FIELD DEFECT · raw material',
  lotFound: 'root LOT traced back',
  rangeUnknown: 'affected range ?',
  rangeKnown: 'affected S/N set',
  gate: 'UNREGISTERED',
  gateSub: 'blocked at upper process',
  steps: ['Manual S/N → risk range unmeasurable', 'S/N trace → affected range pinpointed', 'Unregistered units blocked at upper process'],
  award: '2024 Core Value Award',
  awardSub: 'field defect recurrence prevention',
  stack: 'Power Apps · Power BI · Power Automate',
}

export const hudText = (locale: Locale | undefined): HudText => (locale === 'en' ? EN : KO)
