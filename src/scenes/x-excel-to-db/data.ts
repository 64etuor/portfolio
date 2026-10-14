// 공정 데이터 관리 시스템 (솔라엣지, 2023.10–12) — 씬 사실·라벨·타임라인 상수.
// 성과 수치는 content/projects/process-data.ts 의 metrics 만 사용한다.

export type L10n = { ko: string; en: string }

/** 시트(엑셀 파일) 아틀라스 타일 — 4×2. 순서 = 아틀라스 인덱스. */
export const SHEET_TABS = ['생산실적', '공수', '불량', 'KPI', 'BOM', 'ST', '워크오더', 'OPEX'] as const

/** DB 테이블 슬랩(아래 → 위). tiles = 그 테이블로 흘러드는 시트 아틀라스 인덱스. */
export const SLABS: Array<{ label: L10n; tiles: number[] }> = [
  { label: { ko: '생산실적', en: 'Production' }, tiles: [0] },
  { label: { ko: '공수', en: 'Labor hours' }, tiles: [1] },
  { label: { ko: '불량', en: 'Defects' }, tiles: [2] },
  { label: { ko: 'KPI', en: 'KPI' }, tiles: [3] },
  { label: { ko: 'BOM · ST', en: 'BOM · ST' }, tiles: [4, 5] },
  { label: { ko: '워크오더 · OPEX', en: 'Work order · OPEX' }, tiles: [6, 7] },
]

export const PHASES: Array<{ title: L10n; sub: L10n }> = [
  {
    title: { ko: '담당자별 엑셀 · 수기 문서', en: 'Excel files & paper logs, per owner' },
    sub: { ko: '집계 수작업 · 보고 지연 · 신뢰성 문제', en: 'manual roll-ups · late reports · low trust' },
  },
  {
    title: { ko: '엑셀 개별 문서 → 데이터베이스', en: 'Individual Excel files → database' },
    sub: { ko: '생산실적 · 공수 · 불량 · KPI · BOM · ST · 워크오더 · OPEX', en: 'production · labor · defects · KPI · BOM · ST · WO · OPEX' },
  },
  {
    title: { ko: '입력 데이터 무결성 검증', en: 'Input data integrity validation' },
    sub: { ko: '잘못된 행은 커밋 전에 걸러진다', en: 'bad rows are caught before commit' },
  },
  {
    title: { ko: 'Power BI 통합 대시보드', en: 'Unified Power BI dashboard' },
    sub: { ko: 'On-premises Gateway 자동 갱신 · 보고서 자동 생성', en: 'On-premises Gateway auto-refresh · scripted reports' },
  },
]

export const HUD = {
  project: { ko: '공정 데이터 관리 시스템', en: 'Process Data Management System' },
  org: { ko: '솔라엣지테크놀로지스 코리아 · 2023.10–12', en: 'SolarEdge Technologies Korea · 2023.10–12' },
  unit: { ko: '분 / 일', en: 'min / day' },
  heroLabel: { ko: '사무 공수 감축', en: 'office labor reduced' },
  heroNote: { ko: '연 약 5천만원', en: '≈ KRW 50M / year' },
  st: { ko: '제품 ST −50%', en: 'Product ST −50%' },
  stNote: { ko: '실 데이터 확보 후', en: 'once real data existed' },
  award: { ko: '2023 MOC Best Employee', en: '2023 MOC Best Employee' },
  gateway: { ko: 'On-prem Gateway · 자동 갱신', en: 'On-prem Gateway · auto refresh' },
  label: { ko: '엑셀 문서가 데이터베이스와 대시보드로 정렬되는 장면', en: 'Excel files ordering into a database and dashboard' },
} satisfies Record<string, L10n>

export const pick = (l: L10n, en: boolean) => (en ? l.en : l.ko)

// ── 타임라인(초) ──
export const T = {
  flyStart: 1.5, // 첫 시트 출발
  flyDur: 1.45,
  validate: 4.15, // 검증 스윕 시작
  dash: 5.0, // 대시보드 등장
  dial: 5.55, // 451 다이얼 스윕
  dialEnd: 7.0,
  ambient: 7.5, // 이후 앰비언트 루프
  phaseAt: [0, 1.6, 4.05, 5.15],
} as const

export const SAVED_MIN = 451
export const DAY_MIN = 1440

// ── 레이아웃 ──
export const N_MAIN = 360 // 6 슬랩 × 60 타일
export const N_EXTRA = 72 // 앰비언트 트리클(게이트웨이 갱신)
export const COLS = 10
export const ROWS = 6
export const SLAB_GAP = 0.66
export const SLAB_Y0 = -1.7
export const CELL_W = 0.46
export const CELL_D = 0.34
export const TILE_SCALE = 0.42
export const SHEET_W = 1
export const SHEET_H = 0.71
