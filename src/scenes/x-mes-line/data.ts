import type { Locale } from '@/i18n/content'

// x-mes-line — 신제품(배터리) 생산 라인 셋업 · 자동화 설비 MES 자체 개발 (mes-newline-2410).
// 화면 문구는 content/profile.ts 의 사실만 사용한다. 수치 성과·KPI 는 넣지 않는다.

export type Copy = { ko: string; en: string }
export const pick = (c: Copy, locale: Locale | undefined): string => (locale === 'en' ? c.en : c.ko)

export const COLOR = {
  phos: 0xd7d7d7,
  dim: 0x8d8d8d,
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xff5a4f,
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
  cam: [1.4, 6.8] as const,
  heroEnd: 6.8,
}

/** 라인 기하. 셀 간격·이송 속도. */
export const LINE = {
  x0: -9.35,
  pitch: 0.55,
  cells: 28, // L = 28 * 0.55 = 15.4
  speed: 1.1,
  beltY: 0.56,
}

/** 코어(PostgreSQL) 위치. */
export const CORE = { x: -1.2, y: 0, z: -6.6 }

export type StationId = 'scan' | 'ocv' | 'vision' | 'assy'
export interface StationDef {
  id: StationId
  x: number
  color: number
  on: number
  label: Copy
  sub: Copy
  /** 데이터 경로: 프로토콜 라벨, 성장 구간, 코어 진입 높이 */
  path?: { label: Copy; grow: readonly [number, number]; entryY: number }
}

export const STATIONS: StationDef[] = [
  {
    id: 'scan',
    x: -7.2,
    color: COLOR.phos,
    on: 2.05,
    label: { ko: 'S/N 등록', en: 'S/N registration' },
    sub: { ko: 'Barcode', en: 'Barcode' },
  },
  {
    id: 'ocv',
    x: -4.4,
    color: COLOR.amber,
    on: 2.3,
    label: { ko: 'OCV/IR 검사', en: 'OCV/IR test' },
    sub: { ko: '구형 검사 장비', en: 'legacy tester' },
    path: { label: { ko: 'MS Access → Python', en: 'MS Access → Python' }, grow: [2.55, 3.45], entryY: 0.95 },
  },
  {
    id: 'vision',
    x: -1.2,
    color: COLOR.blue,
    on: 2.55,
    label: { ko: '비전 검사', en: 'Vision inspection' },
    sub: { ko: 'Vision', en: '' },
    path: { label: { ko: 'TCP/IP', en: 'TCP/IP' }, grow: [2.8, 3.7], entryY: 1.65 },
  },
  {
    id: 'assy',
    x: 2.2,
    color: COLOR.teal,
    on: 2.8,
    label: { ko: '조립', en: 'Assembly' },
    sub: { ko: '자동화 설비', en: 'automated equipment' },
    path: { label: { ko: 'OPC UA', en: 'OPC UA' }, grow: [3.05, 3.95], entryY: 2.35 },
  },
]

export const COPY = {
  org: { ko: '솔라엣지테크놀로지스 코리아 · 아산', en: 'SolarEdge Technologies Korea · Asan' },
  title: { ko: '신제품 생산 라인 셋업', en: 'New product line setup' },
  meta: { ko: '2024.10–12 · 3개월 · 자체 개발', en: 'Oct–Dec 2024 · 3 months · built in-house' },
  ledgerHead: { ko: '설비 예산 점검 · FAT 이후', en: 'Budget check · post-FAT' },
  ledgerSub: { ko: '해외 설치 예정 라인 → 한국 이관', en: 'Line planned overseas → moved to Korea' },
  rowEquip: { ko: '자동화 설비 예산', en: 'Automation equipment budget' },
  rowEquipVal: { ko: '30만불 · 초과', en: '$300K · over' },
  rowMes: { ko: 'MES 외주 개발비', en: 'MES outsourcing cost' },
  rowMesMissing: { ko: '누락', en: 'missing' },
  rowMesBuilt: { ko: '자체 개발', en: 'build in-house' },
  core: { ko: 'PostgreSQL', en: 'PostgreSQL' },
  coreSub: { ko: 'DB 아키텍처', en: 'DB architecture' },
  api: { ko: 'Django · DRF', en: 'Django · DRF' },
  apiSub: { ko: 'Backend', en: 'Backend' },
  dash: { ko: 'Python Dash', en: 'Python Dash' },
  dashSub: { ko: '실시간 공정 현황', en: 'real-time process status' },
  client: { ko: 'React · TypeScript · Electron', en: 'React · TypeScript · Electron' },
  clientSub: { ko: 'MES 클라이언트', en: 'MES client' },
  headline: { ko: 'MES 자체 개발', en: 'MES built in-house' },
  headSub: { ko: '외주 개발비 누락분을 자체 개발로 대체', en: 'Replaced the missing outsourcing budget with an in-house build' },
}

/** 하단 스택 칩 — 켜지는 시각. */
export const STACK: { name: string; on: number }[] = [
  { name: 'Python', on: 2.9 },
  { name: 'MS Access', on: 2.9 },
  { name: 'TCP/IP', on: 3.2 },
  { name: 'OPC UA', on: 3.45 },
  { name: 'PostgreSQL', on: 3.9 },
  { name: 'Django', on: 4.4 },
  { name: 'DRF', on: 4.5 },
  { name: 'Python Dash', on: 4.9 },
  { name: 'React', on: 5.1 },
  { name: 'TypeScript', on: 5.2 },
  { name: 'Electron', on: 5.3 },
]

/** 투영 라벨 id. */
export type LabelId = StationId | 'p-ocv' | 'p-vision' | 'p-assy' | 'core' | 'api' | 'dash' | 'client'
