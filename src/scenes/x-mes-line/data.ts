import type { Locale } from '@/i18n/content'

// x-mes-line — 신제품(글라스울 파우치 · 배터리 화재 방지) 자동화 라인 셋업 · MES 자체 개발 (mes-newline-2410).
// 화면 문구는 content/profile.ts · projects/mes-console.ts 의 사실만 사용한다. 수치 성과·KPI 는 넣지 않는다.
// 용액은 이름을 특정하지 않는다("용액 주입"만).

export type Copy = { ko: string; en: string }
export const pick = (c: Copy, locale: Locale | undefined): string => (locale === 'en' ? c.en : c.ko)

export const COLOR = {
  phos: 0xd7d7d7,
  dim: 0x8d8d8d,
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xff5a4f,
  heat: 0xff8a4a,
} as const

/** 타임라인(초). 0–7s 히어로, 이후 앰비언트 루프. */
export const T = {
  missingFrom: 0.25,
  built: 1.85,
  powerOn: 1.95,
  conveyor: 2.0,
  ledgerOut: [2.7, 3.4] as const,
  core: [3.5, 4.4] as const,
  api: [4.2, 4.8] as const,
  dash: [4.5, 5.4] as const,
  client: [4.8, 5.6] as const,
  headline: [5.7, 6.4] as const,
  cam: [1.2, 6.9] as const,
  heroEnd: 6.9,
}

/** 라인 기하. 파우치 간격·이송 속도. x0 = 재단기(파우치 생성), x0+L = 로봇 픽업. */
export const LINE = {
  x0: -8.0,
  pitch: 0.96,
  count: 15, // L = 15 * 0.96 = 14.4 → 픽업 x = 6.4
  speed: 0.62,
  /** 롤러 상면 높이(파우치 바닥). */
  topY: 0.66,
  /** 파우치 외형(x · z) 과 부풀었을 때 두께. */
  pw: 0.72,
  pd: 0.5,
  ph: 0.15,
}
export const PICK_X = LINE.x0 + LINE.count * LINE.pitch

/** 필름 롤(언와인더) 중심. */
export const ROLL = { x: -10.25, y: 1.2, r: 0.5 }

/** 적재 — SCARA 베이스 · 팔레트 중심. */
export const STACKER = { baseX: 7.25, baseZ: -1.05, palletX: 8.05, palletZ: 0.05 }

/** 코어(PostgreSQL) 위치. */
export const CORE = { x: -0.6, y: 0, z: -6.8 }

/** 구형 검사 장비(라인 밖 데이터 소스) 위치. */
export const LEGACY = { x: -7.7, z: -5.6 }

export type Proto = 'opc' | 'tcp'
export type StationId = 'cut' | 'wool' | 'seal' | 'gauge' | 'vision' | 'stack'

export interface StationDef {
  id: StationId
  /** 공정 기준 x(라벨·접촉 판정). */
  x: number
  proto: Proto
  on: number
  label: Copy
  sub: Copy
  /** 데이터 경로: 출발점(월드), 성장 구간, 코어 진입 높이 */
  path: { from: readonly [number, number, number]; grow: readonly [number, number]; entryY: number }
}

/** 공정 내부 기준점. */
export const SUB = {
  align: -8.85, // 비전 정렬 카메라
  inject: -2.75, // 용액 주입 노즐
  seal: -1.75, // 히트 실 바
}

export const PROTO_COLOR: Record<Proto, number> = { opc: COLOR.teal, tcp: COLOR.blue }

export const STATIONS: StationDef[] = [
  {
    id: 'cut',
    x: -8.4,
    proto: 'tcp',
    on: 2.05,
    label: { ko: '비전 정렬 · 재단', en: 'Vision align · cut' },
    sub: { ko: '01 · 롤 파우치', en: '01 · roll pouch' },
    path: { from: [-8.4, 2.28, 0], grow: [2.45, 3.4], entryY: 2.55 },
  },
  {
    id: 'wool',
    x: -5.1,
    proto: 'opc',
    on: 2.2,
    label: { ko: '글라스울 투입', en: 'Glass-wool insert' },
    sub: { ko: '02 · 자동', en: '02 · auto' },
    path: { from: [-5.1, 2.42, -0.35], grow: [2.6, 3.5], entryY: 2.25 },
  },
  {
    id: 'seal',
    x: -2.25,
    proto: 'opc',
    on: 2.35,
    label: { ko: '용액 주입 · 밀봉', en: 'Fluid injection · seal' },
    sub: { ko: '03 · 자동', en: '03 · auto' },
    path: { from: [-2.25, 2.3, 0], grow: [2.75, 3.6], entryY: 1.95 },
  },
  {
    id: 'gauge',
    x: 0.9,
    proto: 'opc',
    on: 2.5,
    label: { ko: '크기 · 무게 측정', en: 'Size · weight check' },
    sub: { ko: '04 · 자동', en: '04 · auto' },
    path: { from: [0.9, 2.2, 0], grow: [2.9, 3.75], entryY: 1.65 },
  },
  {
    id: 'vision',
    x: 3.65,
    proto: 'tcp',
    on: 2.65,
    label: { ko: '비전 검사', en: 'Vision inspection' },
    sub: { ko: '05 · 자동', en: '05 · auto' },
    path: { from: [3.65, 2.45, 0], grow: [3.05, 3.9], entryY: 1.35 },
  },
  {
    id: 'stack',
    x: 7.25,
    proto: 'opc',
    on: 2.8,
    label: { ko: '적재', en: 'Stacking' },
    sub: { ko: '06 · 자동', en: '06 · auto' },
    path: { from: [7.25, 2.05, -1.05], grow: [3.2, 4.05], entryY: 1.05 },
  },
]

/** 구형 검사 장비 — 라인 공정이 아닌 별도 데이터 소스. */
export const LEGACY_DEF = {
  on: 2.4,
  label: { ko: '구형 검사 장비', en: 'Legacy test rig' },
  sub: { ko: '별도 데이터 소스', en: 'separate data source' },
  path: { from: [LEGACY.x, 1.62, LEGACY.z] as const, grow: [2.55, 3.45] as const, entryY: 0.75 },
}

export const COPY = {
  org: { ko: '솔라엣지테크놀로지스 코리아 · 아산', en: 'SolarEdge Technologies Korea · Asan' },
  title: { ko: '글라스울 파우치 자동화 라인 셋업', en: 'Glass-wool pouch automation line setup' },
  product: { ko: '신제품 · 배터리 화재 방지용 글라스울 파우치', en: 'New product · glass-wool pouch for battery fire prevention' },
  meta: { ko: '2024.10–12 · 약 3개월 · 자체 개발', en: 'Oct–Dec 2024 · ~3 months · built in-house' },
  ledgerHead: { ko: '설비 예산 점검 · FAT 이후', en: 'Budget check · post-FAT' },
  ledgerSub: { ko: '해외 설치 예정 라인 → 한국 이관', en: 'Line planned overseas → moved to Korea' },
  rowEquip: { ko: '자동화 설비 예산', en: 'Automation equipment budget' },
  rowEquipVal: { ko: '30만불 · 초과', en: '$300K · over' },
  rowMes: { ko: 'MES 외주 개발비', en: 'MES outsourcing cost' },
  rowMesMissing: { ko: '누락', en: 'missing' },
  rowMesBuilt: { ko: '자체 개발', en: 'build in-house' },
  pOpc: { ko: 'OPC UA', en: 'OPC UA' },
  pTcp: { ko: 'TCP/IP', en: 'TCP/IP' },
  pLegacy: { ko: 'MS Access → Python', en: 'MS Access → Python' },
  core: { ko: 'PostgreSQL', en: 'PostgreSQL' },
  coreSub: { ko: 'DB 아키텍처', en: 'DB architecture' },
  api: { ko: 'Django · DRF', en: 'Django · DRF' },
  apiSub: { ko: 'Backend', en: 'Backend' },
  dash: { ko: 'Python Dash', en: 'Python Dash' },
  dashSub: { ko: '실시간 공정 현황', en: 'real-time process status' },
  client: { ko: 'React · TypeScript · Electron', en: 'React · TypeScript · Electron' },
  clientSub: { ko: 'MES 클라이언트 · 바코드 스캔 등록 ≤150ms (Wi-Fi)', en: 'MES client · barcode scan registration ≤150ms (Wi-Fi)' },
  headline: { ko: 'MES 자체 개발', en: 'MES built in-house' },
  headSub: { ko: '외주 개발비 누락분을 자체 개발로 대체', en: 'Replaced the missing outsourcing budget with an in-house build' },
}

/** 하단 스택 칩 — 켜지는 시각. */
export const STACK: { name: string; on: number }[] = [
  { name: 'OPC UA', on: 2.9 },
  { name: 'TCP/IP', on: 3.1 },
  { name: 'Python', on: 3.25 },
  { name: 'MS Access', on: 3.25 },
  { name: 'PostgreSQL', on: 3.9 },
  { name: 'Django', on: 4.4 },
  { name: 'DRF', on: 4.5 },
  { name: 'Python Dash', on: 4.9 },
  { name: 'React', on: 5.1 },
  { name: 'TypeScript', on: 5.2 },
  { name: 'Electron', on: 5.3 },
]

/** 투영 라벨 id. */
export type LabelId = StationId | 'legacy' | 'p-opc' | 'p-tcp' | 'p-legacy' | 'core' | 'api' | 'dash' | 'client'
