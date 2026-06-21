// 갤러리 정본 데이터 — public/lab/scenes.html + skills*.html 에서 한국어 카피 그대로 옮김.
// file = 씬 basename(catalog key 와 동일).

import { SCENE_CATALOG } from '@/scenes/catalog'

// file = catalog key — 오타/구식 키는 컴파일 실패.
type SceneFileKey = (typeof SCENE_CATALOG)[number]['key']

export interface GalleryCard {
  file: SceneFileKey
  title: string
  tag: string
  desc: string
}

export type SkillAreaKey = 'pm' | 'process' | 'dev' | 'infra' | 'pkm'

export interface SkillArea {
  key: SkillAreaKey
  label: string
  count: number
  blurb: string
  cards: GalleryCard[]
}

// scenes.html — 부팅 + SCENE 01–10 + 엔딩, 서사 순서대로 (12장).
export const SCENES_GALLERY: GalleryCard[] = [
  { file: '05-bios-boot', title: '콜드 오픈 · 시스템 부팅', tag: 'Boot', desc: 'POST → SYSTEM READY. 필름이 기계처럼 부팅하며 열린다.' },
  { file: '42-era-shift', title: 'SCENE 01 · 시대 — THE ACCELERATION', tag: 'Scene 01', desc: '시대는 빠르게 변하고 있습니다 — 가속하는 시대의 오프닝.' },
  { file: '33-ax-era', title: 'SCENE 02 · 선언 — AX ERA', tag: 'Scene 02', desc: 'DX를 넘어 AX의 시대. 데이터·지식이 경쟁력으로 솟아오른다.' },
  { file: '28-gap-reality', title: 'SCENE 03 · 현실 — THE DIVERGENCE', tag: 'Scene 03', desc: '기대선과 성과선이 갈라지는 void — 현실의 격차.' },
  { file: '29-lost-in-translation', title: 'SCENE 04 · 소통 — LOST IN TRANSLATION', tag: 'Scene 04', desc: '기술은 손실 있는 번역 레이어, 핵심은 소통.' },
  { file: '41-perspectives', title: 'SCENE 05 · 관점 — PERSPECTIVES', tag: 'Scene 05', desc: 'RACK FOCUS — 현장↔시스템, 초점이 오가며 한쪽은 또렷·한쪽은 안개.' },
  { file: '30-collision', title: 'SCENE 06 · 충돌 — LEXICAL COLLISION', tag: 'Scene 06', desc: '언어가 정면충돌, 요구사항이 찢긴다 (클라이맥스).' },
  { file: '31-cost-cascade', title: 'SCENE 07 · 비용 — COST CASCADE', tag: 'Scene 07', desc: '한 점의 어긋남이 세 갈래의 비용으로 이어진다.' },
  { file: '32-the-connector', title: 'SCENE 08 · 연결 — THE CONNECTOR', tag: 'Scene 08', desc: '분열을 잇는 단 하나의 연결 — 현장과 기술을 잇는 사람.' },
  { file: '36-bridge-experts', title: 'SCENE 09 · 해결 — THE BRIDGE', tag: 'Scene 09', desc: '제조↔디지털을 한 사람이 양방향으로 잇는 양손잡이 전문가.' },
  { file: '37-cross-domain', title: 'SCENE 10 · 핵심 — CROSS-DOMAIN', tag: 'Scene 10', desc: '경계를 넘는 지식의 교집합이 경쟁력으로 점화.' },
  { file: '38-ending-catchphrase', title: '엔딩 · 미래를 만드는 사람', tag: 'Ending', desc: 'THE MAKERS — "미래를 만드는 사람." 캐치프레이즈.' },
]

// skills.html (허브) + skills-<area>.html (그리드).
export const SKILL_AREAS: SkillArea[] = [
  {
    key: 'pm',
    label: 'PM',
    count: 5,
    blurb: '경영 · 관리 · 의사결정 — 원가 제1원칙, 커리어 임팩트 보드, Notion OS, 창고물류 SCM, 결정 시스템.',
    cards: [
      { file: 'instrument-rack', title: '원가 제1원칙 해부 보드', tag: '원가', desc: 'OPEX First-Principles Ledger — 원가를 분해·측정·절감.' },
      { file: 'gantt-cpm', title: '커리어 간트 · 임팩트 보드', tag: 'PM', desc: '간트 + 크리티컬 패스 + 스코어카드 — 프로젝트 임팩트 보드.' },
      { file: 'pipeline-dag', title: 'Notion OS · DAG', tag: '운영 OS', desc: 'Org Operating System — 조직 운영을 노드 그래프(DAG)로.' },
      { file: 'scada-hmi', title: '창고물류 SCM HMI', tag: '물류·SCM', desc: '창고물류 이관 개선 TF — 재고·물류 SCADA/HMI. 재고회전율 +17%.' },
      { file: 'decision-os', title: 'Decision OS', tag: '의사결정', desc: '가치 변위 콘솔 — 결정론적 Gate→Score→Cap·append-only Ledger.' },
    ],
  },
  {
    key: 'process',
    label: '공정',
    count: 7,
    blurb: '제조 · 계측 · 로보틱스 — 용접/적층/측정/로봇 교시와 디지털 트윈.',
    cards: [
      { file: 'sonar-waterfall', title: '초음파 용착 DOE', tag: '공정', desc: '조건 최적화 반응면 — 용착 파라미터 DOE 워터폴.' },
      { file: 'weld-thermal', title: 'Nd:YAG 레이저 용접기', tag: '용접', desc: '1064nm 펄스 — 레이저가 경로를 그리며 키홀/심/패턴 용접.' },
      { file: 'oscilloscope', title: '스팟 용접 전류 파형', tag: '계측', desc: '2차 전류 모니터 — AC/MFDC 파형, 라이브 오실로스코프 + 전류 모니터.' },
      { file: 'robot-pendant', title: '티칭 펜던트 · 스팟용접', tag: '로보틱스', desc: 'PROG[SPOT_WLD] 교시 — 로봇 스팟 용접 티칭 펜던트.' },
      { file: 'gcode-printer', title: '적층제조 치공구 빌드', tag: '적층제조', desc: 'Jig 직접 제작 — FDM 빌드 + 슬라이싱 파라미터.' },
      { file: 'cmm-metrology', title: 'CMM 정밀 측정', tag: '계측', desc: '3D 좌표측정 — 프로브 시퀀스·GD&T·검사성적서 자동발행.' },
      { file: 'digital-twin', title: '디지털 트윈', tag: '제조·3D', desc: '연결된 도메인 = 조직·공정의 디지털 트윈.' },
    ],
  },
  {
    key: 'dev',
    label: '개발',
    count: 4,
    blurb: '소프트웨어 · 데이터 — 도면·DB·MES·IDE로 보는 시스템 설계.',
    cards: [
      { file: 'pid-scheme', title: 'P&ID 시스템 토폴로지', tag: '아키텍처', desc: 'ISA-5.1 — 소프트웨어 아키텍처를 P&ID 도면으로.' },
      { file: 'db-architecture', title: 'DB 모델링 / 데이터 아키텍처', tag: '데이터·DB', desc: '엑셀 파편화 → 정규화 관계형 DB(26테이블 ERD).' },
      { file: 'mes-console', title: 'MES 실시간 운영 콘솔', tag: '데이터', desc: '현장 운영 시스템 — MES/BI 실시간 콘솔.' },
      { file: 'ide-coding', title: 'IDE 코딩 화면', tag: '개발', desc: '라이브 타이핑 + 터미널 테스트(pnpm test → 6 passed) — 개발자의 코드 에디터.' },
    ],
  },
  {
    key: 'infra',
    label: '인프라',
    count: 2,
    blurb: '시스템 · 관제 — 작업 관제와 에이전트 거버넌스.',
    cards: [
      { file: 'radar-sonar', title: 'Work Radar 관제 콕핏', tag: '관제', desc: 'PPI 스코프 — 작업 신호를 무한 재취득하는 관제 레이더.' },
      { file: 'agent-governance', title: 'AI 에이전트 거버넌스', tag: '거버넌스', desc: 'Boule Control Room — 에이전트 자율성·권한·감사 관제.' },
    ],
  },
  {
    key: 'pkm',
    label: 'PKM',
    count: 2,
    blurb: '지식관리 — 볼트 의미지도와 Hermes 지식 컨트롤 플레인.',
    cards: [
      { file: 'ai-latent', title: '볼트 의미지도', tag: 'PKM', desc: 'BGE-M3 지식그래프 — 캡션 전환마다 크로스도메인 연결이 재형성. 테크스택·철학을 한 그래프로.' },
      { file: 'graphrag', title: 'Hermes 컨트롤 플레인', tag: '지식 플랫폼', desc: 'OKF 정본 · Graphiti 은닉 temporal index · Hermes MCP 단일 진입점 · PR write 게이트.' },
    ],
  },
]

// 허브/스킬 페이지 헤더 (skills.html). label 라인은 .al 텍스트.
export const SKILLS_HUB = {
  title: 'Skills · 영역별 실작업',
  sub: '실제로 만든 시안 20종을 5개 영역으로 나눴습니다. 각 영역 페이지는 해당 시안만 지연로딩하여 가볍게 열립니다.',
}

// 영역별 헤더 (skills-<area>.html) + 허브 카드 라벨 라인(.al).
export const AREA_META: Record<SkillAreaKey, { heading: string; sub: string; labelLine: string }> = {
  pm: {
    heading: 'PM · 경영 · 관리 · 의사결정',
    sub: '원가를 제1원칙으로 분해하고, 프로젝트 임팩트를 보드로, 결정을 시스템으로 — 운영을 OS로.',
    labelLine: '원가 · 간트 · Notion OS · 창고물류 SCM · Decision OS',
  },
  process: {
    heading: '공정 · 제조 · 계측 · 로보틱스',
    sub: '용접·적층·측정·로봇 교시와 디지털 트윈 — 현장 기술을 인터랙티브 계측으로.',
    labelLine: 'DOE · 레이저 · 전류 · 로봇 · 적층 · CMM · 트윈',
  },
  dev: {
    heading: '개발 · 소프트웨어 · 데이터',
    sub: '도면·DB·MES·IDE — 시스템을 설계하고 데이터를 구조화한 결과물.',
    labelLine: 'P&ID · DB · MES · IDE',
  },
  infra: {
    heading: '인프라 · 시스템 · 관제',
    sub: '관제·거버넌스 — 시스템을 운영·통제하는 레이어.',
    labelLine: 'Work Radar · 거버넌스',
  },
  pkm: {
    heading: 'PKM · 지식관리',
    sub: '지식을 흘려보내지 않고 구조로 — 볼트 의미지도와 Hermes 지식 컨트롤 플레인.',
    labelLine: '볼트 의미지도 · Hermes',
  },
}
