// 씬 메타데이터의 단일 출처(SSOT).
//
// 이전엔 씬 정체성/메타데이터가 loaders.ts(로더) · registry.ts(레지스트리) ·
// gallery/data.ts(갤러리 카드) · film/acts.ts(필름 비트) · compositions(조합)에
// 흩어져 드리프트했다. 이제 이 catalog 가 정본이며, registry SCENES/sceneById 와
// 단독 라우트(/s)가 모두 여기서 파생된다.
//
// key = loaders.ts 의 로더 키(= 씬 디렉토리명 = public/lab basename, .html 제거).
//   → SceneKey 리터럴 유니온으로 타입 안전성을 강제(오타/구식 키는 컴파일 실패).
//
// 플래그
//   registry  : registry.SCENES 로 노출 + 조합(compositions) 후보.
//   filmBeat  : 필름 내러티브 비트(film/acts.ts).
//   gallery   : 갤러리 카드로 노출(scenes.html / skills-*.html).
//   route 는 별도 플래그 없이 "catalog 의 모든 씬은 /s 단독 라우트를 가진다"로 통일
//   (로더가 존재하므로 전부 단독 뷰 가능 — 이로써 필름 비트 카드의 404 가 해소된다).

import type { SceneKey } from './loaders'

export type { SceneKey }

export interface SceneEntry {
  key: SceneKey
  file: string // "<key>.html"
  slug: string // 단독 라우트 /s/<slug>
  title: string
  bg: string
  // --- registry 메타: registry:true 인 씬만 채운다 ---
  id?: string // "01" 등 시안 번호(조합/레거시 색인 키)
  domain?: string
  // --- 위치 플래그 ---
  registry?: boolean // registry.SCENES + 조합 후보
  filmBeat?: boolean // 필름 내러티브 비트
  gallery?: boolean // 갤러리 카드
}

// helper: key 와 file 은 항상 1:1 — file 은 key + ".html". 템플릿 리터럴 타입을
// 보존해 file 유니온도 리터럴로 좁혀진다(acts.ts Shot.file 타입 안전성).
const f = <K extends SceneKey>(key: K): `${K}.html` => `${key}.html`

export const SCENE_CATALOG = [
  // ── 진입(부팅) — registry + 필름 비트 + 갤러리 ──
  { key: '05-bios-boot', file: f('05-bios-boot'), slug: 'bios-boot', title: 'BIOS / POST 부팅', bg: '#050805', id: '05', domain: '펌웨어', registry: true, filmBeat: true, gallery: true },

  // ── 필름 비트(내러티브 전용) + 갤러리 ──
  { key: '42-era-shift', file: f('42-era-shift'), slug: 'era-shift', title: 'SCENE 01 · 시대 — THE ACCELERATION', bg: '#0a0b0e', filmBeat: true, gallery: true },
  { key: '33-ax-era', file: f('33-ax-era'), slug: 'ax-era', title: 'SCENE 02 · 선언 — AX ERA', bg: '#030303', filmBeat: true, gallery: true },
  { key: '28-gap-reality', file: f('28-gap-reality'), slug: 'gap-reality', title: 'SCENE 03 · 현실 — THE DIVERGENCE', bg: '#020202', filmBeat: true, gallery: true },
  { key: '29-lost-in-translation', file: f('29-lost-in-translation'), slug: 'lost-in-translation', title: 'SCENE 04 · 소통 — LOST IN TRANSLATION', bg: '#020202', filmBeat: true, gallery: true },
  { key: '41-perspectives', file: f('41-perspectives'), slug: 'perspectives', title: 'SCENE 05 · 관점 — PERSPECTIVES', bg: '#030303', filmBeat: true, gallery: true },
  { key: '30-collision', file: f('30-collision'), slug: 'collision', title: 'SCENE 06 · 충돌 — LEXICAL COLLISION', bg: '#020202', filmBeat: true, gallery: true },
  { key: '31-cost-cascade', file: f('31-cost-cascade'), slug: 'cost-cascade', title: 'SCENE 07 · 비용 — COST CASCADE', bg: '#020202', filmBeat: true, gallery: true },
  { key: '32-the-connector', file: f('32-the-connector'), slug: 'the-connector', title: 'SCENE 08 · 연결 — THE CONNECTOR', bg: '#030303', filmBeat: true, gallery: true },
  { key: '36-bridge-experts', file: f('36-bridge-experts'), slug: 'bridge-experts', title: 'SCENE 09 · 해결 — THE BRIDGE', bg: '#030303', filmBeat: true, gallery: true },
  { key: '37-cross-domain', file: f('37-cross-domain'), slug: 'cross-domain', title: 'SCENE 10 · 핵심 — CROSS-DOMAIN', bg: '#020202', filmBeat: true, gallery: true },
  { key: '38-ending-catchphrase', file: f('38-ending-catchphrase'), slug: 'ending-catchphrase', title: '엔딩 · 미래를 만드는 사람', bg: '#020202', filmBeat: true, gallery: true },

  // ── 프로젝트 + 경력 — 프로젝트(자기주도) ──
  { key: 'pipeline-dag', file: f('pipeline-dag'), slug: 'pipeline-dag', title: 'Notion OS — 조직 운영 시스템', bg: '#0c0e12', id: '03', domain: '프로젝트', registry: true, gallery: true },
  { key: 'radar-sonar', file: f('radar-sonar'), slug: 'radar-sonar', title: 'Work Radar — AI 워크플로우 콕핏', bg: '#060a08', id: '13', domain: '프로젝트', registry: true, gallery: true },

  // ── 프로젝트 + 경력 — 경력(제조 3社) ──
  { key: 'instrument-rack', file: f('instrument-rack'), slug: 'instrument-rack', title: '생산관리 · 원가 제1원칙', bg: '#0b0d0f', id: '20', domain: '제조·원가', registry: true, gallery: true },
  { key: 'sonar-waterfall', file: f('sonar-waterfall'), slug: 'sonar-waterfall', title: '초음파 용착 DOE', bg: '#060a10', id: '18', domain: '제조·용착', registry: true, gallery: true },
  { key: 'scada-hmi', file: f('scada-hmi'), slug: 'scada-hmi', title: 'SCM · 재고 최적화', bg: '#0e1217', id: '15', domain: '물류·SCM', registry: true, gallery: true },
  { key: 'gantt-cpm', file: f('gantt-cpm'), slug: 'gantt-cpm', title: '커리어 타임라인 — 경력 + 프로젝트', bg: '#0c0f14', id: '17', domain: '경력 종합', registry: true, gallery: true },
  { key: 'mes-console', file: f('mes-console'), slug: 'mes-console', title: 'MES 구축', bg: '#0a0a0c', id: '01', domain: '제조·MES', registry: true, gallery: true },
  { key: 'cmm-metrology', file: f('cmm-metrology'), slug: 'cmm-metrology', title: 'CMM 정밀 측정 · GD&T 검사', bg: '#0a0e14', id: '12', domain: '계측·CMM', registry: true, gallery: true },

  // ── 스킬 ──
  { key: 'weld-thermal', file: f('weld-thermal'), slug: 'weld-thermal', title: '산업 용접 기술', bg: '#0a0410', id: '11', domain: '공정기술', registry: true, gallery: true },
  { key: 'robot-pendant', file: f('robot-pendant'), slug: 'robot-pendant', title: '설비·로봇 티칭', bg: '#0c0e12', id: '16', domain: '설비', registry: true, gallery: true },
  { key: 'pid-scheme', file: f('pid-scheme'), slug: 'pid-scheme', title: '시스템 토폴로지', bg: '#0c0f14', id: '19', domain: '아키텍처', registry: true, gallery: true },
  { key: 'db-architecture', file: f('db-architecture'), slug: 'db-architecture', title: 'DB 모델링', bg: '#0c0f14', id: '22', domain: '데이터·DB', registry: true, gallery: true },

  // ── 개발(갤러리 dev 영역 전용) ──
  { key: 'ide-coding', file: f('ide-coding'), slug: 'ide-coding', title: 'IDE 코딩 화면', bg: '#050608', gallery: true },

  // ── 철학 ──
  { key: 'digital-twin', file: f('digital-twin'), slug: 'digital-twin', title: '도메인 지식의 미래 유용성', bg: '#0b0b0d', id: '06', domain: '크로스도메인', registry: true, gallery: true },
  { key: 'oscilloscope', file: f('oscilloscope'), slug: 'oscilloscope', title: '품질에 철저한 성격', bg: '#0a0e0c', id: '09', domain: '품질', registry: true, gallery: true },

  // ── 지식관리 ──
  { key: 'ai-latent', file: f('ai-latent'), slug: 'ai-latent', title: '볼트 semantic map', bg: '#07080d', id: '04', domain: '지식·AI', registry: true, gallery: true },
  { key: 'agent-governance', file: f('agent-governance'), slug: 'agent-governance', title: 'Boule 거버넌스', bg: '#0a0d0f', id: '23', domain: 'AI 거버넌스', registry: true, gallery: true },
  { key: 'decision-os', file: f('decision-os'), slug: 'decision-os', title: 'Decision OS', bg: '#0a0d12', id: '25', domain: '의사결정', registry: true, gallery: true },
  { key: 'graphrag', file: f('graphrag'), slug: 'graphrag', title: 'GraphRAG / 신경-기호', bg: '#080a0f', id: '26', domain: 'AI', registry: true, gallery: true },

  // ── 보류(parked) — 홈/릴 제외 ──
  { key: 'gcode-printer', file: f('gcode-printer'), slug: 'gcode-printer', title: 'G-code 3D 프린터 빌드', bg: '#0e1116', id: '07', domain: '적층제조', registry: true, gallery: true },
] as const satisfies readonly SceneEntry[]

export type SceneSlug = (typeof SCENE_CATALOG)[number]['slug']

// 속성 접근/순회용 widened 뷰(optional 필드가 유니온 멤버에서 사라지지 않게).
// 리터럴 유니온(SceneKey/SceneSlug/file)은 위 const 배열에서 그대로 파생된다.
export const SCENES_CATALOG: readonly SceneEntry[] = SCENE_CATALOG

/** key | slug | file basename | "<x>.html" → catalog 항목. */
export function catalogEntry(idOrSlug: string): SceneEntry | undefined {
  const base = idOrSlug.replace(/\.html$/, '')
  return SCENES_CATALOG.find(
    (s) => s.key === base || s.slug === base || s.id === idOrSlug,
  )
}
