import type { RGB } from '../_host/color'
import { PALETTE_WARM, PALETTE_DIM } from '../_host/palette'
import { fractHash } from '../_host/random'
import type { Screen } from './types'

export const WARM: RGB = PALETTE_WARM
export const WARMB: RGB = [243, 193, 132]
export const COLD: RGB = [110, 168, 255]
export const COLDB: RGB = [207, 224, 255]
export const COLDD: RGB = [35, 70, 127]
export const DIM: RGB = PALETTE_DIM



// `still`: the x-* entries redirect to full app pages (/s/<slug>: Next + three.js). Booting
// one inside the panel's ~1.1 s live window costs far more main-thread time than it ever
// shows live, so those panels stay on their poster (public/lab/posters, make-posters.mjs).
export const FIELD: Screen[] = [
  { file: 'x-weld-doe.html', title: '초음파 용착', tag: 'ULTRASONIC', still: true },
  { file: 'weld-thermal.html', title: 'Nd:YAG 레이저 용접', tag: 'Nd:YAG' },
  { file: 'robot-pendant.html', title: '스팟 용접 티칭', tag: 'SPOT' },
  { file: 'gcode-printer.html', title: '적층제조', tag: 'AM' },
  { file: 'x-vision-reverse.html', title: '비전 검사', tag: 'VISION', still: true },
]
export const DEV: Screen[] = [
  { file: 'pid-scheme.html', title: '시스템 토폴로지', tag: 'P&ID' },
  { file: 'db-architecture.html', title: 'DB 모델링', tag: 'SCHEMA' },
  { file: 'ide-coding.html', title: 'IDE 코딩', tag: 'EDITOR' },
  { file: 'agent-governance.html', title: '에이전트 거버넌스', tag: 'GOVERN' },
  { file: 'decision-os.html', title: 'Decision OS', tag: 'DECISION' },
]

export const FIELDTOK = [
  '공정',
  '설비',
  '치수',
  '공차',
  '불량',
  '작업표준',
  '양산',
  '셋업',
  '수율',
  '가공',
  '조립',
  '검사',
  '치공구',
  '사이클타임',
  '설비보전',
  '라인밸런싱',
]
export const SYSTOK = [
  'SELECT *',
  'JOIN … ON',
  'schema',
  'git commit',
  'PR #',
  'branch',
  'merge',
  'API',
  '{ json }',
  'endpoint',
  'migration',
  'deploy',
  'CI / CD',
  'PRIMARY KEY',
  'FK →',
  'git push',
]
export const CODE_TOK = [
  'const system = compose(',
  '  pipeline, schema,',
  '  contract, resolver',
  ')',
  '',
  'function resolve(node){',
  '  return graph.walk(node)',
  '}',
  '',
  'class Service extends Core {}',
  '',
  'api ⟶ model ⟶ store',
]

export const CYCLE = 22.0
export const BLUR_MAX = 6
export const BLUR_STEP = 0.5
export const NB = Math.round(BLUR_MAX / BLUR_STEP) + 1
export const hsh = fractHash
