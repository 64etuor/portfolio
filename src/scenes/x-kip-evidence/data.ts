// KIP — 근거 우선 지식 패브릭: 씬 사실/라벨/타임라인 상수.
// 사실 수치는 content/projects/kip.ts 와 profile.ts(id kip)에 있는 것만 쓴다.
// 파일명·페이지·블록 번호는 locator 형식을 보여주는 시각 텍스처(성과 주장 아님).

export type DocType = 'HWP' | 'PDF' | 'PPTX' | 'XLSX'

export const DOC_TYPES: DocType[] = ['HWP', 'PDF', 'PPTX', 'XLSX']

/** 문서 타입 칩 색(sRGB hex). */
export const TYPE_COLOR: Record<DocType, string> = {
  HWP: '#4ab3cc',
  PDF: '#d98a3d',
  PPTX: '#d7d7d7',
  XLSX: '#4fe0c4',
}

/** 페이지 비율(가로/세로). */
export const TYPE_ASPECT: Record<DocType, number> = {
  HWP: 0.707,
  PDF: 0.707,
  PPTX: 1.6,
  XLSX: 1.45,
}

export const PALETTE = {
  bg: '#05060a',
  ink: '#d7d7d7',
  dim: '#8d8d8d',
  teal: '#4fe0c4',
  blue: '#4ab3cc',
  amber: '#d98a3d',
}

type L = { ko: string; en: string }

export interface SourceDoc {
  id: 'A' | 'B' | 'C'
  type: DocType
  file: string
  /** 월드 위치 / y 회전 */
  pos: [number, number, number]
  rotY: number
  /** 페이지 높이(월드) */
  height: number
  /** 근거 블록(정규화 u0,v0,u1,v1 — v 는 위에서부터) */
  block: [number, number, number, number]
  /** 표 승격 여부와 셀 격자 */
  table: { rows: number; cols: number } | null
  locator: L
  /** 로케이터 라벨 앵커(페이지 정규화 u,v) — 라벨은 오른쪽 정렬, up=true 면 앵커 위로 */
  label: { uv: [number, number]; up: boolean; left?: boolean }
  color: string
}

export const SOURCES: SourceDoc[] = [
  {
    id: 'A',
    type: 'HWP',
    file: 'WPS_weld_rev3.hwpx',
    pos: [-1.6, 1.85, -4.2],
    rotY: 0.32,
    height: 3.0,
    block: [0.1, 0.42, 0.9, 0.72],
    table: { rows: 5, cols: 4 },
    locator: {
      ko: 'WPS_weld_rev3.hwpx · p.3 · 표 2',
      en: 'WPS_weld_rev3.hwpx · p.3 · table 2',
    },
    label: { uv: [1.0, 1.02], up: false },
    color: PALETTE.teal,
  },
  {
    id: 'B',
    type: 'PDF',
    file: 'ECN_0417.pdf',
    pos: [-0.1, -2.25, -6.2],
    rotY: 0.22,
    height: 3.0,
    block: [0.1, 0.5, 0.9, 0.64],
    table: null,
    locator: {
      ko: 'ECN_0417.pdf · p.12 · block 4',
      en: 'ECN_0417.pdf · p.12 · block 4',
    },
    label: { uv: [1.0, 1.02], up: false },
    color: PALETTE.blue,
  },
  {
    id: 'C',
    type: 'XLSX',
    file: 'weld_cond_log.xlsx',
    pos: [2.4, 2.35, -8.6],
    rotY: -0.08,
    height: 2.3,
    block: [0.08, 0.36, 0.92, 0.8],
    table: { rows: 5, cols: 6 },
    locator: {
      ko: 'weld_cond_log.xlsx · Sheet2 · A14:F18',
      en: 'weld_cond_log.xlsx · Sheet2 · A14:F18',
    },
    label: { uv: [0.0, -0.03], up: true, left: true },
    color: PALETTE.amber,
  },
]

/** 답변 카드 — 월드 배치, 크기. 카드 v(위→아래) 기준 각 claim 앵커. */
export const CARD = {
  pos: [3.75, -0.35, 3.4] as [number, number, number],
  w: 3.5,
  h: 2.35,
  claimV: [0.45, 0.65, 0.85],
}

export const CLAIMS: L[] = [
  { ko: '용착 조건표 rev.3 개정', en: 'weld condition table revised (rev.3)' },
  { ko: '공정 변경 통보 승인', en: 'process change notice approved' },
  { ko: '변경 이력 시트 기록', en: 'change logged in history sheet' },
]

export const SERVICE_CORE: [number, number, number] = [-5.4, -0.7, 1.2]

export const SURFACES: {
  key: string
  label: L
  from: [number, number, number]
  mid: [number, number, number]
}[] = [
  {
    key: 'cli',
    label: { ko: 'CLI · 버전 고정 JSON', en: 'CLI · versioned JSON' },
    from: [-12.5, 3.6, -1.5],
    mid: [-8.6, 2.6, 0.4],
  },
  {
    key: 'rest',
    label: { ko: 'REST · OpenAPI', en: 'REST · OpenAPI' },
    from: [-13.2, -0.4, 2.6],
    mid: [-8.8, -0.6, 1.8],
  },
  {
    key: 'mcp',
    label: { ko: 'MCP · agent', en: 'MCP · agent' },
    from: [-12.5, -4.6, -0.6],
    mid: [-8.6, -3.6, 0.8],
  },
]

/** 카메라 시작/끝 포즈. */
export const CAM_A = {
  pos: [-2.4, 1.8, 17.2] as [number, number, number],
  look: [-1.1, 0.25, -2.6] as [number, number, number],
}
export const CAM_B = {
  pos: [0.0, 0.45, 13.9] as [number, number, number],
  look: [-0.15, 0.0, -2.3] as [number, number, number],
}

/** HUD 가 차지하는 화면 영역(정규화 x0,y0,x1,y1) — 라이브러리 페이지를 여기 두지 않는다. */
export const HUD_ZONES: [number, number, number, number][] = [
  [0, 0, 0.26, 0.2],
  [0.33, 0, 0.67, 0.2],
  [0.62, 0.82, 1, 1],
  [0, 0.88, 0.4, 1],
]

/** 질의 빔 끝(라이브러리 깊은 곳). */
export const BEAM_END: [number, number, number] = [3.0, 0.6, -30]

export const TEXT = {
  kicker: {
    ko: 'KIP · 근거 우선 지식 검색',
    en: 'KIP · evidence-first knowledge search',
  },
  sub: {
    ko: 'HWP · PDF · PPTX · XLSX → 하나의 색인',
    en: 'HWP · PDF · PPTX · XLSX → one index',
  },
  queryLabel: { ko: '질의', en: 'query' },
  query: { ko: '용착 조건 변경 이력', en: '용착 조건 변경 이력' },
  queryGloss: { ko: '', en: 'weld condition change history' },
  core: { ko: 'retrieval service', en: 'retrieval service' },
  coreSub: { ko: '같은 검색 의미론', en: 'same search semantics' },
  tableTag: { ko: '표 → 별도 단위', en: 'table → own unit' },
  cardHead: { ko: '답변', en: 'answer' },
  cardMeta: {
    ko: '근거 3 · locator 동반',
    en: '3 sources · locators attached',
  },
  captions: [
    {
      ko: 'CLI · REST · MCP → 같은 retrieval service',
      en: 'CLI · REST · MCP → one retrieval service',
    },
    {
      ko: '표는 문단으로 뭉개지 않고 별도 단위로',
      en: 'tables kept as units, not flattened into text',
    },
    {
      ko: '답변 문장마다 원문 위치(file · page · block)',
      en: 'every answer line → file · page · block',
    },
  ] as L[],
}

export interface Metric {
  label: L
  value: number
  digits: number
  prefix?: string
  note: L
  headline?: boolean
}

export const METRICS: Metric[] = [
  {
    label: { ko: 'lexical Recall@10', en: 'lexical Recall@10' },
    value: 1,
    digits: 4,
    note: { ko: '', en: '' },
    headline: true,
  },
  {
    label: { ko: 'MRR', en: 'MRR' },
    value: 0.9861,
    digits: 4,
    note: { ko: '', en: '' },
  },
  {
    label: { ko: 'ACL 유출', en: 'ACL leaks' },
    value: 0,
    digits: 0,
    note: { ko: '건', en: '' },
  },
  {
    label: { ko: 'raw 파싱', en: 'raw parsing' },
    value: 19.2,
    digits: 1,
    prefix: '×',
    note: { ko: 'public PDF 6종', en: '6 public PDFs' },
  },
]

/** 히어로 타임라인(초). */
export const TL = {
  typeA: 0.25,
  typeB: 1.15,
  conduitA: 0.9,
  conduitB: 1.75,
  beamA: 1.6,
  beamB: 3.0,
  hitA: 2.55,
  hitB: 3.25,
  liftA: 3.2,
  liftB: 4.4,
  cardA: 4.2,
  cardB: 5.1,
  threadA: 4.9,
  threadB: 6.2,
  metricA: 5.8,
  metricB: 7.0,
  heroEnd: 7.2,
  loop: 6,
}

export const pick = (l: L, en: boolean) => (en ? l.en : l.ko)
