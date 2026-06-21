// Digital Twin — 3-layer cross-domain station data (ported from digital-twin.html)

interface StationMetric {
  v: string
  l: string
}

interface StationKpi {
  k: string
  v: string
  c: string
}

export interface Station {
  id: string
  station: string
  label: string
  color: number
  css: string
  layer: string
  role: string
  period: string
  kind: 'machine' | 'data' | 'ax' | 'hub'
  metrics: StationMetric[]
  log: string[]
  chips: string[]
  kpis: StationKpi[]
}

export const STATIONS: Station[] = [
  {
    id: 'mfg-cell',
    station: 'MFG CELL 01',
    label: '제조 현장 레이어',
    color: 0xff7a8a,
    css: '--c-mfg',
    layer: 'mfg',
    role: '공정·설비·품질·물류 — 제조 현장 도메인',
    period: '제조 현장 레이어 — 공정·설비 도메인',
    kind: 'machine',
    metrics: [
      { v: 'OEE 92%', l: '종합설비효율' },
      { v: 'Takt 42s', l: '표준 사이클타임' },
      { v: '사일로 시', l: '데이터에 공정 맥락 미반영' },
      { v: '연결 시', l: '현장 변수가 모델·코드로 전파' },
    ],
    log: [
      '사일로 시: 공정 이상이 <b>데이터 레이어에 도달하지 않음</b> — 누락·오분류',
      '연결 시: 현장 OEE·Takt·안돈 신호가 <b>파이프라인으로 즉시 반영</b>',
      '제조 현장 경험 — <b>공정 변수의 실제 의미</b>를 안다',
      '수기 관리 → 디지털 전환 — <b>현장 도메인 지식이 설계를 결정</b>',
      '단일 데이터 전문가는 이 맥락 없이 <b>지표 해석 오류 발생</b>',
    ],
    chips: ['OEE', 'Andon', 'Takt Time', 'LOB', 'PFMEA/CP', '공정표준화', '현장 도메인'],
    kpis: [
      { k: 'OEE', v: '92.4%', c: 'mfg' },
      { k: 'Takt', v: '42s', c: '' },
      { k: '가동률', v: '98.1%', c: '' },
    ],
  },
  {
    id: 'dev-cell',
    station: 'DEV CELL 02',
    label: '데이터 / 개발 레이어',
    color: 0x6fb4ff,
    css: '--c-dev',
    layer: 'dev',
    role: 'MES · 파이프라인 · SSOT — 현장을 코드로 구조화',
    period: '데이터 엔지니어링 — 현장을 코드로 구조화',
    kind: 'data',
    metrics: [
      { v: 'MES', l: '현장 공정을 코드로 구조화' },
      { v: 'SSOT', l: '단일 진실 출처 — 사일로 제거' },
      { v: '사일로 시', l: '현장 맥락 없는 지표 — 판단 오류' },
      { v: '연결 시', l: '공정 변수가 파이프라인에 정합 반영' },
    ],
    log: [
      '사일로 시: <b>현장 맥락 없는 BI 지표</b> — 수치는 있으나 해석 오류',
      '연결 시: 제조 도메인 지식이 <b>스키마 설계·ETL 로직에 반영</b>',
      '<b>MES 자체 개발</b> — 현장을 아는 사람만 설계 가능한 구조',
      '검사성적서 자동발행 · S/N 추적성 — <b>공정 도메인이 코드를 결정</b>',
      '데이터 전문가만으로는 <b>현장 변수의 의미를 파이프라인에 담지 못함</b>',
    ],
    chips: ['MES', 'SQL', 'BI 대시보드', 'FastAPI', 'CI/CD', 'SSOT', 'ETL', '도메인 기반 설계'],
    kpis: [
      { k: '파이프라인', v: 'OK', c: 'dev' },
      { k: 'SSOT', v: 'LIVE', c: 'dev' },
      { k: '동기화', v: '<40ms', c: 'amber' },
    ],
  },
  {
    id: 'ai-cell',
    station: 'AI CELL 03',
    label: 'AI 도메인 레이어',
    color: 0xc9a3ff,
    css: '--c-ai',
    layer: 'ai',
    role: '예측 · 이상탐지 · 에이전트 — 모델로 도메인을 연결',
    period: 'AI 도메인 — 예측·이상탐지·에이전트',
    kind: 'ax',
    metrics: [
      { v: '사일로 시', l: '도메인 없는 모델 — 오탐·오분류' },
      { v: '연결 시', l: '공정 맥락 주입 — 정합 추론' },
      { v: 'RPA', l: '반복업무 자동화 (경계 업무 식별)' },
      { v: 'MCP', l: '현장 컨텍스트 주입 에이전트' },
    ],
    log: [
      '사일로 시: <b>현장·데이터 맥락 없는 AI</b> — 오탐·무의미한 예측',
      '연결 시: 공정 변수·도메인 지식이 <b>모델 피처·프롬프트에 반영</b>',
      '<b>경계에 숨은 문제</b>: 현장⟷코드⟷데이터 접점에서 단독 전문가가 놓치는 오류',
      '<b>MCP 컨텍스트 주입</b> — 현장 도메인 지식이 AI 판단의 검증 레이어',
      '도메인을 코드와 모델로 잇는 사람 — <b>조직·공정의 디지털 트윈</b>',
    ],
    chips: ['AI MCP', 'RPA', '이상탐지', '예측모델', 'Claude API', '도메인 컨텍스트', 'AX'],
    kpis: [
      { k: 'AI 정확도', v: '94.1%', c: 'ai' },
      { k: '이상탐지', v: '<2s', c: 'ai' },
      { k: 'RPA', v: 'ON', c: '' },
    ],
  },
  {
    id: 'fusion-hub',
    station: 'DOMAIN TWIN HUB',
    label: '연결된 도메인 = 조직의 트윈',
    color: 0x46e6b0,
    css: '--signal',
    layer: 'hub',
    role: '제조 · 데이터 · AI 도메인 연결 — 사일로 오류를 잡는 허브',
    period: '시대는 변한다, 사람도 변해야 한다',
    kind: 'hub',
    metrics: [
      { v: '3', l: '연결된 도메인 수' },
      { v: 'LIVE', l: '사일로→연결 상태' },
      { v: 'SSOT', l: '단일 진실 출처' },
      { v: '트윈', l: '조직·공정의 거울' },
    ],
    log: [
      '디지털 트윈이 현실을 거울처럼 비추듯 — <b>연결된 도메인이 조직을 비춘다</b>',
      '효과 ①: 부서 간 통역 — <b>사일로 커뮤니케이션 오류</b>를 줄인다',
      '효과 ②: 현장⟷코드⟷데이터 <b>경계에 숨은 문제 식별</b> (단일 전문가는 못 보는)',
      '레이어가 끊기면(사일로) — 오류·누락 발생 / 연결되면 — <b>정합·전파</b>',
      '시대는 변한다, 사람도 변해야 한다 — <b>변해서 도메인을 전부 연결함</b>',
    ],
    chips: ['사일로→연결', '도메인 트윈', '부서 간 통역', '경계 문제 식별', '크로스도메인', 'AX', '실행'],
    kpis: [
      { k: 'Twin', v: 'LIVE', c: '' },
      { k: '도메인', v: '3/3', c: '' },
      { k: '상태', v: 'SYNCED', c: '' },
    ],
  },
]

export const PLANT_KPIS = [
  { k: '제조 레이어', v: '연결', c: 'mfg' },
  { k: 'OEE', v: '92.4%', c: 'mfg' },
  { k: '데이터 레이어', v: 'LIVE', c: 'dev' },
  { k: 'SSOT', v: '정합', c: 'dev' },
  { k: 'AI 레이어', v: 'ON', c: 'ai' },
  { k: '이상탐지', v: '<2s', c: 'ai' },
  { k: '사일로 오류', v: '0', c: '' },
  { k: '경계 식별', v: 'ACTIVE', c: 'amber' },
  { k: '도메인', v: '3/3', c: '' },
  { k: 'Twin State', v: 'SYNCED', c: '' },
]

export const STREAM_MSGS = [
  { c: 'var(--c-mfg)', t: '<b>제조</b> OEE {oee}% — 공정 변수 데이터 레이어로 전파' },
  { c: 'var(--c-dev)', t: '<b>데이터</b> MES WIP {wip}ea — 현장 맥락 포함 SSOT 반영' },
  { c: 'var(--c-ai)', t: '<b>AI</b> 도메인 컨텍스트 주입 — 오탐 {acc}% 감소' },
  { c: 'var(--signal)', t: '<b>연결</b> 사일로 해제 — 3-Domain 동기 지연 &lt;{lag}ms' },
  { c: 'var(--c-mfg)', t: '<b>제조</b> Takt {takt}s — 단일 전문가 미식별 경계 신호 감지' },
  { c: 'var(--c-dev)', t: '<b>데이터</b> 파이프라인 API {api}ms — 현장→코드 정합' },
  { c: 'var(--c-ai)', t: '<b>AI</b> 경계 이상 식별 — 현장⟷코드⟷데이터 접점' },
  { c: 'var(--c-mfg)', t: '<b>제조</b> 안돈 신호 — AI 레이어로 즉시 연결' },
  { c: 'var(--signal)', t: '<b>Twin</b> 도메인 연결 완료 — 조직 거울 상태 SYNCED' },
  { c: 'var(--c-dev)', t: '<b>데이터</b> CI/CD 배포 — 공정 도메인 지식 반영 완료' },
  { c: 'var(--c-ai)', t: '<b>AI</b> 모델 갱신 v{ver} — 제조 피처 재적용' },
  { c: 'var(--c-mfg)', t: '<b>제조</b> WIP {wip}ea — 부서 간 통역 오류 0건' },
  { c: 'var(--signal)', t: '<b>Twin</b> 사일로→연결 전환 — 경계 오류 차단 {lag}ms' },
  { c: 'var(--c-ai)', t: '<b>RPA</b> 경계 업무 자동화 — 도메인 식별 기반' },
  { c: 'var(--c-dev)', t: '<b>BI</b> 현장 맥락 포함 대시보드 갱신 — OEE {oee}%' },
]

export function renderStreamMsg(tmpl: string): string {
  return tmpl
    .replace(/{takt}/g, '42')
    .replace(/{wip}/g, '14')
    .replace(/{acc}/g, '94.2')
    .replace(/{lag}/g, '38')
    .replace(/{oee}/g, '92.4')
    .replace(/{api}/g, '24')
    .replace(/{ver}/g, '2.4')
}
