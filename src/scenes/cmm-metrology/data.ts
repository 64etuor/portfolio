type FeatureType = 'form' | 'size'
type TargetType = 'pad' | 'bore' | 'edge' | 'cyl' | 'slot'

export interface FeatureDatum {
  key: string
  feat: string
  sub: string
  type: FeatureType
  sym?: string
  tol?: number
  dev: number
  unit: string
  nom?: number
  lo?: number
  up?: number
  spec?: string
  redev?: number
  special?: boolean
}

export interface TargetDatum {
  x: number
  y: number
  z: number
  type: TargetType
  featureKey: string
}

export interface XCheckDatum {
  feat: string
  sub: string
  dev: string
  jud: 'pass' | 'warn'
}

export const SEED0 = 20260618

export const FEATURES: FeatureDatum[] = [
  { key: 'flat', feat: '기준면 A 평면도', sub: '⏥ Flatness · 데이텀 A', type: 'form', sym: '⏥', tol: 0.02, dev: 0.011, unit: 'mm' },
  { key: 'pos', feat: '보어 ⌀20 위치도', sub: '⌖ Position · A|B|C', type: 'form', sym: '⌖', tol: 0.05, dev: 0.034, unit: 'mm' },
  { key: 'perp', feat: '측면 B 직각도', sub: '⟂ Perpendicularity · A', type: 'form', sym: '⟂', tol: 0.03, dev: 0.019, unit: 'mm' },
  { key: 'cyl', feat: '보스 원통도', sub: '⌭ Cylindricity · 재측정', type: 'form', sym: '⌭', tol: 0.04, dev: 0.061, redev: 0.024, unit: 'mm', special: true },
  { key: 'para', feat: '상면 평행도', sub: '∥ Parallelism · A', type: 'form', sym: '∥', tol: 0.02, dev: 0.013, unit: 'mm' },
  { key: 'dia', feat: '보어 직경 ⌀20 H7', sub: '⌀ Size · LSQ 피팅', type: 'size', nom: 20, lo: 0, up: 0.021, dev: 0.012, spec: '⌀20 +.021/0', unit: 'mm' },
  { key: 'slot', feat: '키홈 폭', sub: '↔ Width · 양측 프로빙', type: 'size', nom: 12, lo: -0.05, up: 0.05, dev: -0.028, spec: '12 ±.05', unit: 'mm' },
  { key: 'conc', feat: '홀 동심도', sub: '◎ Concentricity · A', type: 'form', sym: '◎', tol: 0.03, dev: 0.017, unit: 'mm' },
]

export const SKILLS = [
  '스캐닝 프로브',
  '터치트리거',
  'Ø2.0 루비',
  '데이텀 3-2-1',
  '최소자승 LSQ',
  '평면도',
  '진원도',
  '원통도',
  '위치도',
  '직각도',
  '평행도',
  '동심도',
  '열보정 20°C',
  '프로브 자격',
  'ISO 10360',
  '측정 불확도',
  'GD&T',
  '검사성적서',
]

export const XCHECKS: XCheckDatum[] = [
  { feat: '데이텀 3-2-1 정렬', sub: '평면 A · 직선 B · 점 C 구속', dev: '좌표계 설정', jud: 'pass' },
  { feat: '프로브 자격 (Ø2.0)', sub: '기준 구체 25점 캘리브레이션', dev: 'σ 0.6µm', jud: 'pass' },
  { feat: '기준온도 20°C 보정', sub: 'ISO 1 · 열팽창 α 보정', dev: 'ΔT 보정', jud: 'pass' },
  { feat: '최소자승(LSQ) 피팅', sub: '원·평면·실린더 적합', dev: '잔차 최소', jud: 'pass' },
  { feat: '이상점 필터', sub: '버·오염점 3σ 제거 → 재프로빙', dev: '재측정', jud: 'warn' },
  { feat: '측정 불확도 U', sub: 'U = k · u_c (k=2)', dev: '신뢰 95%', jud: 'pass' },
]

export const TARGETS: TargetDatum[] = [
  { x: 34, y: 30, z: 14, type: 'pad', featureKey: 'flat' },
  { x: 150, y: 26, z: 14, type: 'bore', featureKey: 'pos' },
  { x: 100, y: 18, z: 14, type: 'edge', featureKey: 'perp' },
  { x: 166, y: 96, z: 30, type: 'cyl', featureKey: 'cyl' },
  { x: 64, y: 108, z: 22, type: 'pad', featureKey: 'para' },
  { x: 118, y: 74, z: 18, type: 'bore', featureKey: 'dia' },
  { x: 30, y: 80, z: 14, type: 'slot', featureKey: 'slot' },
  { x: 104, y: 118, z: 14, type: 'pad', featureKey: 'conc' },
]

export const SYMS: Record<string, [string, string]> = {
  flat: ['⏥', '0.02 A'],
  pos: ['⌖', 'Ø0.05 A B C'],
  perp: ['⟂', '0.03 A'],
  cyl: ['⌭', '0.04'],
  para: ['∥', '0.02 A'],
  dia: ['⌀', '20 H7'],
  slot: ['↔', '12 ±.05'],
  conc: ['◎', 'Ø0.03 A'],
}
