// Work Radar — radar-sonar 씬 순수 헬퍼 (클로저 없음)

import { CONTACTS_DEF, PHASE_BY_TYPE } from './data'
import type { Contact } from './types'

/* ────────────────────────────────────────────────────
   Pure formatters
   ──────────────────────────────────────────────────── */
export function pad3(n: number) {
  return String(Math.round(n)).padStart(3, '0')
}

export function typeAbbr(t: string) {
  return t === 'signal' ? 'SIG' : t === 'surface' ? 'SRF' : t === 'agent' ? 'AGT' : 'GATE'
}

export function typeKo(t: string) {
  return t === 'signal' ? '외부 신호' : t === 'surface' ? '서피스' : t === 'agent' ? '에이전트' : '거버넌스 게이트'
}

export function typeColRgb(type: string) {
  if (type === 'signal') return '46,255,163'
  if (type === 'surface') return '63,224,255'
  if (type === 'agent') return '255,176,49'
  return '255,255,255'
}

/* ────────────────────────────────────────────────────
   Contact initializer
   ──────────────────────────────────────────────────── */
export function initContacts(): Contact[] {
  return CONTACTS_DEF.map((def, i) => ({
    ...def,
    _glow: 0,
    _detected: false,
    _verified: false,
    _phase: PHASE_BY_TYPE[def.type] ?? 3,
    _trk: i + 1,
    _baseA: (def.brg - 90) * (Math.PI / 180),
    _a: (def.brg - 90) * (Math.PI / 180),
    _baseRing: def.ring,
    _driftT: Math.random() * Math.PI * 2,
    _driftSpeed: 0.18 + Math.random() * 0.14,
    _driftAmp: 0.004 + Math.random() * 0.006,
    _driftRingAmp: 0.006 + Math.random() * 0.006,
    _liveDriftT: Math.random() * Math.PI * 2,
  }))
}
