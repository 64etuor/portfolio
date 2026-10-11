// 스마트 팩토리 디지털 트윈 — 사실/라벨/타이밍 상수.
// 사실은 브리프에 준 것만: 은성, 2021.08–2022.01, 신청·PM·요구사항, Ecount ERP·바코드·태블릿.
// 재고 수량(EA)은 씬 안의 실제 적재 박스 개수를 센 장식 값 — 성과 지표 아님.

export type L = { ko: string; en: string }

export const COLORS = {
  bg: '#05070a',
  phos: '#d7d7d7',
  dim: '#8d8d8d',
  teal: '#4fe0c4',
  blue: '#4ab3cc',
  amber: '#d98a3d',
}

/** 타임라인(초). 0–7s 히어로, 이후 앰비언트 루프. */
export const T = {
  scan0: 0.8,
  scan1: 3.4,
  x0: -10.5,
  x1: 10.5,
  riseDelay: 0.35,
  riseJitter: 0.3,
  riseDur: 1.5,
  panelErp: 4.0,
  panelBarcode: 4.6,
  panelTablet: 5.2,
  hero: 6.6,
  ambientScanStart: 8.5,
  ambientScanPeriod: 11,
  ambientScanDur: 3.2,
}

/** 트윈이 떠오르는 높이. */
export const LIFT = 5.0

export const HUD = {
  kicker: { ko: 'SMART FACTORY · ERP · BARCODE', en: 'SMART FACTORY · ERP · BARCODE' },
  title: { ko: '스마트 팩토리 도입', en: 'Smart factory adoption' },
  program: { ko: '중소기업진흥청 대기업상생 프로그램 · 은성', en: 'SME agency × large-company program · Eunsung' },
  period: { ko: '2021.08 – 2022.01 · 약 6개월', en: '2021.08 – 2022.01 · ~6 months' },
  role: { ko: '프로젝트 신청 · PM · 개발 요구사항 수립', en: 'Applied for the project · PM · dev requirements' },
} satisfies Record<string, L>

export const PHASES: L[] = [
  { ko: '수작업 라인 · 종이/수기 기록', en: 'Manual lines · paper & handwritten logs' },
  { ko: '현장 → 데이터', en: 'Floor → data' },
  { ko: 'ERP·바코드 기반 업무 절차 체계화 · 재고 현황 가시화', en: 'ERP + barcode workflows systematized · inventory visible' },
]

export const SYSTEMS: { n: string; label: L; at: number }[] = [
  { n: '01', label: { ko: 'Ecount ERP 도입', en: 'Ecount ERP rollout' }, at: T.panelErp },
  { n: '02', label: { ko: 'ERP 연계 바코드 관리', en: 'ERP-linked barcode system' }, at: T.panelBarcode },
  { n: '03', label: { ko: '태블릿 생산현황', en: 'Tablet production status' }, at: T.panelTablet },
]

/** 생산 라인(물리 바닥) — z 위치와 이름. */
export const LINES: { z: number; kind: 'battery' | 'filter' | 'harness'; label: L }[] = [
  { z: -2.5, kind: 'battery', label: { ko: '2차전지 배터리팩', en: 'Battery packs' } },
  { z: 0.1, kind: 'filter', label: { ko: '정수기 부품', en: 'Water purifier parts' } },
  { z: 2.7, kind: 'harness', label: { ko: '와이어링 하네스', en: 'Wiring harness' } },
]

export const WAREHOUSE_LABEL: L = { ko: '자재 창고', en: 'Warehouse' }

export const BENCH_X = [-7.6, -5.6, -3.6, -1.6, 0.4]
export const TABLET_X = 2.0

/** 3D 패널 앵커(트윈 위). */
export const PANELS: { key: 'erp' | 'barcode' | 'tablet'; pos: [number, number, number]; at: number; title: L; sub: L }[] = [
  {
    key: 'erp',
    pos: [-6.2, 8.6, -3.2],
    at: T.panelErp,
    title: { ko: 'ERP', en: 'ERP' },
    sub: { ko: 'Ecount ERP', en: 'Ecount ERP' },
  },
  {
    key: 'tablet',
    pos: [0.2, 9.3, -4.6],
    at: T.panelTablet,
    title: { ko: '태블릿 생산현황', en: 'Tablet production' },
    sub: { ko: '수작업 라인', en: 'Manual lines' },
  },
  {
    key: 'barcode',
    pos: [6.6, 8.6, -3.4],
    at: T.panelBarcode,
    title: { ko: '바코드 재고', en: 'Barcode inventory' },
    sub: { ko: 'ERP 연계', en: 'ERP-linked' },
  },
]

export const ERP_MODULES: L[] = [
  { ko: '품목', en: 'Items' },
  { ko: '입고', en: 'Inbound' },
  { ko: '출고', en: 'Outbound' },
  { ko: '재고', en: 'Stock' },
]

/** 재고 태그 — stackIdx 는 build 레이아웃의 pallet/rack 스택 인덱스. 수량은 씬의 실제 박스 수. */
export const STOCK_ITEMS: { code: string; name: L }[] = [
  { code: 'PLT-01', name: { ko: '셀 모듈', en: 'Cell modules' } },
  { code: 'PLT-04', name: { ko: '필터 하우징', en: 'Filter housings' } },
  { code: 'PLT-06', name: { ko: '커넥터', en: 'Connectors' } },
  { code: 'RACK-A', name: { ko: '부자재', en: 'Sub-materials' } },
]

/** 장식용 바코드 로그(로트 ID 텍스처, 실적 아님). */
export const LOG_IDS = ['LOT-0417', 'LOT-0422', 'LOT-0503', 'LOT-0518', 'LOT-0611', 'LOT-0624', 'LOT-0702', 'LOT-0719']
