export const NAV_TABS = [
  { id: 'overview', label: '개요', tag: 'OVW' },
  { id: 'line1', label: '역량', tag: 'SKILL' },
  { id: 'quality', label: 'SCM KPI', tag: 'KPI' },
  { id: 'alarms', label: '알람', tag: 'ALM' },
  { id: 'history', label: '이력', tag: 'HIST' },
  { id: 'scmtf', label: 'TF 개선', tag: 'TF-SCM' },
] as const

export type TabId = (typeof NAV_TABS)[number]['id']

export interface PvDef {
  lbl: string
  tag: string
  base: number
  unit: string
  sp: string
  cls: string
  dir: string
  track?: 'risk'
}

export const PV_DEFS: readonly PvDef[] = [
  { lbl: '이관 전산화', tag: 'PV-101', base: 100, unit: '%', sp: '완료', cls: 'good', dir: 'up' },
  { lbl: '재고 정확도', tag: 'PV-102', base: 94, unit: '%', sp: '개선 후', cls: 'good', dir: 'up' },
  { lbl: '과잉/부족 해소', tag: 'PV-103', base: 90, unit: '%', sp: '반복 감소', cls: 'good', dir: 'up' },
  { lbl: '부서 승인 흐름', tag: 'PV-104', base: 100, unit: '%', sp: '제조·영업', cls: 'good', dir: 'up' },
  { lbl: '수기 이관 리스크', tag: 'PV-105', base: 4, unit: '', sp: '관리 대상', cls: 'warn', dir: 'def', track: 'risk' },
]

export const SP_DEFS = [
  { nm: '보조 KPI · 재고회전율', yr: '정본 유지 수치', pv: '+17', un: '%UP', c: '#21d07a' },
  { nm: '창고물류 이관 개선', yr: '3개월 TF 과제 (2023.03-2023.05)', pv: 'TF', un: '3개월', c: '#ffd23f' },
  { nm: 'TF 추진 협업', yr: '제조·영업·구매·생산관리 4개 부서', pv: '5명', un: '구성', c: '#39d6ff' },
  { nm: '제조·영업 이관 프로세스', yr: 'ERP 기록·승인 흐름 정리', pv: 'DONE', un: 'RTN', c: '#21d07a' },
] as const

export interface AlarmEvent {
  sev: string
  ts: string
  desc: string
  st: 'ALM' | 'ACK' | 'RTN'
  age: number
}

export const ALM_POOL = [
  { sev: '#ff3b3b', ts: 'P0', desc: '문제 정의 -- 제조·영업 간 재고 이관 프로세스 미전산화로 재고 정확도 저하', st: 'ALM' },
  { sev: '#ffb020', ts: 'P1', desc: '현장 확인 -- 과잉·부족 재고 반복 구간과 수기 이관 지점을 TF에서 분리', st: 'ACK' },
  { sev: '#39b6ff', ts: 'P2', desc: '프로세스 설계 -- 제조창고 출고, 영업창고 입고, 부서 승인 기준 정리', st: 'RTN' },
  { sev: '#39b6ff', ts: 'P3', desc: '전산 반영 -- ERP 재고 기록 기준과 이관 처리 흐름 정합화', st: 'RTN' },
  { sev: '#21d07a', ts: 'P4', desc: '현장 표준화 -- 제조·영업 창고 3정5S와 재고 위치 기준 정비', st: 'RTN' },
  { sev: '#21d07a', ts: 'P5', desc: '결과 -- 재고 정확도 개선, 과잉·부족 재고 반복 해소, 재고회전율 +17%', st: 'RTN' },
  { sev: '#39b6ff', ts: 'MT', desc: '외부 멘토링 4회 연계 · TF 추진 방향 피드백 반영', st: 'RTN' },
  { sev: '#21d07a', ts: 'TF', desc: 'TF 5명 구성, 2023.03~2023.05 기간 창고 물류 개선 과제 리딩', st: 'RTN' },
] as const satisfies readonly Omit<AlarmEvent, 'age'>[]

export const IO_ITEMS = [
  ['재고 흐름 분석', 'I'],
  ['적정재고 기준설정', 'I'],
  ['MRP 생산계획', 'I'],
  ['칸반(간판) 생산', 'Q'],
  ['경제 로트 설계', 'I'],
  ['면책구역 지정', 'I'],
  ['이관 전산화', 'M'],
  ['3정5S', 'I'],
  ['Kitting 대차', 'Q'],
  ['TF 리딩 · 5명', 'I'],
  ['삼성 멘토링 4회', 'M'],
  ['KPI 보고', 'I'],
] as const

export const SW_ITEMS = [
  ['ERP 재고모듈', 'M'],
  ['MES 연동', 'M'],
  ['재고대장 전산화', 'I'],
  ['입출고 집계', 'I'],
  ['이관 프로세스', 'I'],
  ['보고서 자동화', 'Q'],
] as const

export const Q_DEFS = [
  { big: '전산화', cap: '제조·영업 간 재고 이관<br>수기 처리에서 ERP 기록 기준으로 전환', delta: '+17% TURN KPI' },
  { big: '3개월', cap: 'TF 추진 기간<br>창고물류 개선 · 2023.03~2023.05', delta: 'TF LEAD' },
  { big: '정확도', cap: '재고 위치·수량·책임 기준 정합화<br>과잉·부족 재고 반복 해소', delta: 'INVENTORY ACCURACY' },
  { big: '3정5S', cap: '제조·영업 창고 전면 실시<br>현장 정리·정돈·청소·청결·습관화', delta: 'WH STANDARD UP' },
] as const

export const HIST = [
  {
    when: 'Phase 1',
    sub: '분석·기준 정립',
    role: '재고 흐름 분석 · 문제 정의',
    org: 'SCM 개선 TF · 제조·영업·구매·생산관리',
    body: '제조창고와 영업창고 사이 재고 이관 프로세스의 미전산화 문제를 현장 확인. 과잉·부족 재고 반복 구간과 수기 이관 지점을 TF에서 분리하고 개선 우선순위를 수립.',
    chips: ['재고 흐름 분석', '문제 정의', '수기 이관 지점 식별', '개선 우선순위'],
  },
  {
    when: 'Phase 2',
    sub: '프로세스 설계',
    role: '이관 기준 정리 · ERP 프로세스 설계',
    org: 'SCM 개선 TF · 구매·제조·영업 협업',
    body: '제조창고 출고, 영업창고 입고, 부서 승인 기준을 정리. ERP 재고 기록 기준과 이관 처리 흐름을 정합화하여 전산 반영.',
    chips: ['이관 기준 정립', 'ERP 기록 기준', '부서 승인 흐름', '이관전산화'],
  },
  {
    when: 'Phase 3',
    sub: '현장 표준화',
    role: '창고 3정5S · 재고 위치 기준 정비',
    org: 'SCM 개선 TF · 제조창고·영업창고',
    body: '제조창고와 영업창고 3정5S 전면 실시. 재고 위치·수량·책임 기준 정합화. 과잉·부족 재고 반복 해소.',
    chips: ['3정5S', '재고 위치 기준', '수량 정합화', '책임 명확화'],
  },
  {
    when: '결과',
    sub: 'KPI 달성',
    role: 'SCM 개선 TF 완료 · 보조 KPI 확인',
    org: 'SCM 개선 TF · 전체 부서',
    body: '재고 정확도 개선, 과잉·부족 재고 반복 해소. 보조 KPI: 재고회전율 +17%.',
    chips: ['이관전산화 완료', '재고 정확도 개선', '과잉/부족 해소', '재고회전율 +17%', '3정5S'],
  },
] as const

export const SCM_AREAS = [
  { root: '구매', nm: '입고', cnt: 85 },
  { root: '제조WH', nm: '적정재고', cnt: 72 },
  { root: '이관', nm: '전산화', cnt: 90 },
  { root: '영업WH', nm: '3정5S', cnt: 88 },
  { root: '출하', nm: '리드타임', cnt: 78 },
] as const

export const SCM_PV_DEFS = [
  { lbl: '이관 전산화', tag: 'PV-S01', val: '완료', unit: '', sp: '수기→전산', cls: 'good' },
  { lbl: '재고 정확도', tag: 'PV-S02', val: '개선', unit: '', sp: '제조·영업', cls: 'good' },
  { lbl: '과잉/부족 해소', tag: 'PV-S03', val: '완료', unit: '', sp: '반복 감소', cls: 'good' },
  { lbl: '보조 KPI', tag: 'PV-S04', val: '+17', unit: '%', sp: '재고회전율', cls: 'good' },
  { lbl: 'TF 구성 부서', tag: 'PV-S05', val: '4', unit: '개', sp: '3개월 리딩', cls: 'good' },
] as const

export const TF_ITEMS = [
  { nm: '재고 흐름 분석', sub: '제조·영업 창고 전체', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '면책구역 지정', sub: '제조-영업 경계 명확화', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '이관 전산 개선', sub: '수기->ERP 전산 프로세스', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '3정5S 제조창고', sub: '정리·정돈·청소·청결·습관화', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '3정5S 영업창고', sub: '완제품 창고 전면 적용', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: 'TF 킥오프', sub: '구매·영업·제조·생산관리', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '외부 멘토링 연계', sub: 'TF 추진 방향 피드백 4회', v: '완료', col: '#21d07a', sp: 'W -> RTN' },
  { nm: '보조 KPI · 재고회전율', sub: '정본 유지 수치 +17%', v: '+17%', col: '#21d07a', sp: 'KPI UP' },
] as const

export const ACTION_DEFS = [
  { lk: '재고 정확도 개선', sub: '제조·영업 창고 재고 기준 정합화', dep: '완료', qd: 'RTN' },
  { lk: '물류 흐름 개선', sub: '제조→영업 이관 승인 흐름 표준화', dep: '완료', qd: 'RTN' },
  { lk: '이관 프로세스 전산화', sub: '제조->영업 재고 이관 ERP 처리', dep: '완료', qd: 'RTN' },
  { lk: '창고 3정5S 실시', sub: '제조·영업 창고 전면 정비', dep: '완료', qd: 'RTN' },
  { lk: 'TF 주간 보고', sub: '멘토 피드백 반영', dep: '완료', qd: 'RTN' },
] as const
