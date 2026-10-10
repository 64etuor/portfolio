// 비전 검사 · 셀 역삽 검출 — 화면 문구/레이아웃 상수.
// 사실 출처: content/projects/idle-equipment.ts, content/profile.ts(idle-equipment-2212), coverLetter.ts
// (은성에스아이티 배터리팩 라인 역삽 비전 검사 · 이랜텍 유휴 비전 M/C 4대 재활용)

export type Lang = 'ko' | 'en'
type L = { ko: string; en: string }

export const pick = (l: L, lang: Lang) => (lang === 'en' ? l.en : l.ko)

/** 하단 HUD 4줄 — 등장 시각(초). */
export const HUD_LINES: Array<{ at: number; text: L; accent?: 'red' | 'teal' | 'amber' }> = [
  { at: 0, text: { ko: '셀 역삽입 → 쇼트 위험', en: 'Reversed cell → short-circuit risk' }, accent: 'red' },
  { at: 1.0, text: { ko: '비전 검사 도입', en: 'Vision inspection added' }, accent: 'teal' },
  { at: 5.3, text: { ko: '유휴 장비 4대 재활용 · 약 400만원 절감', en: '4 idle machines reused · ≈ ₩4M saved' }, accent: 'amber' },
  { at: 6.1, text: { ko: '필드 불량 0건', en: '0 field defects' }, accent: 'teal' },
]

export const HEADER: L = { ko: '배터리 모듈 · 셀 극성 비전 검사', en: 'Battery module · cell polarity vision check' }

export const REVERSED_LABEL = {
  main: { ko: '역삽 검출 · REVERSED', en: 'REVERSED CELL DETECTED' } as L,
  sub: { ko: '극성 − / + 반전 · NG 배출', en: 'polarity − / + flipped · NG reject' } as L,
}

export const OK_LABEL = '+ OK'

/** 유휴 비전 M/C 4대 역할 (좌→우). */
export const MACHINES: Array<{ no: string; role: L; kind: 'kit' | 'insert' | 'battery' | 'spare' }> = [
  { no: 'M/C 1', role: { ko: '의료키트 조립 설비 · 사급', en: 'Medical-kit assembly · supplied unit' }, kind: 'kit' },
  { no: 'M/C 2', role: { ko: '사출 인서트·너트 누락 검사', en: 'Molded part insert/nut check' }, kind: 'insert' },
  { no: 'M/C 3', role: { ko: '배터리 모듈 역삽 검사', en: 'Battery module reverse check' }, kind: 'battery' },
  { no: 'M/C 4', role: { ko: '예비 보관', en: 'Kept as spare' }, kind: 'spare' },
]

export const REUSE_TAG: L = { ko: '유휴 비전 M/C 4대 재활용 · 2022.12–2023.04', en: '4 idle vision M/Cs reused · 2022.12–2023.04' }

// ── 셀 배열 ──
export const COLS = 9
export const ROWS = 5
export const PITCH = 0.205
export const CELL_R = 0.09
export const CELL_H = 0.65
export const TRAY_TOP = 0.07
export const CELL_TOP = TRAY_TOP + CELL_H
/** 역삽 셀 위치. */
export const REV_COL = 6
export const REV_ROW = 1
/** "+ OK" DOM 라벨을 붙일 셀 (col,row). */
export const OK_CELLS: Array<[number, number]> = [
  [1, 3],
  [3, 0],
  [4, 4],
]

export const cellX = (c: number) => (c - (COLS - 1) / 2) * PITCH
export const cellZ = (r: number) => (r - (ROWS - 1) / 2) * PITCH

/** 머신 배치 x (M/C 3 = 원점, 배터리 트레이). */
export const MACHINE_X = [-7.4, -3.7, 0, 3.7]

// ── 타임라인(초) ──
export const T = {
  barStartX: -0.62,
  barEndX: 1.02,
  lockAt: 2.8,
  resumeAt: 4.0,
  sweepEnd: 4.5,
  liftAt: 4.0,
  liftEnd: 5.2,
  goneAt: 6.4,
  wideAt: 7.0,
  ambientStart: 7.6,
  ambientPeriod: 3.6,
}
