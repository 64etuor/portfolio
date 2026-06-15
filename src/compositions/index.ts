// 조합(Composition) — 메시지/청중별 시안 시퀀스. 시안을 "조합"해서 설명한다.

export interface Composition {
  slug: string
  title: string
  audience: string
  blurb: string
  scenes: string[] // scene id 순서
}

export const COMPOSITIONS: Composition[] = [
  {
    slug: 'overview',
    title: '전체 투어',
    audience: '처음 보는 사람',
    blurb: '현장 → 데이터 → AI → 사상까지, 한 사람으로 수렴하는 흐름.',
    scenes: ['19', '22', '01', '23', '17', '27'],
  },
  {
    slug: 'data-architect',
    title: '데이터·백엔드 아키텍트',
    audience: '데이터/플랫폼 엔지니어 채용',
    blurb: '실제 스키마·SSOT·파이프라인·실시간 신호로 증명하는 데이터 깊이.',
    scenes: ['22', '19', '01', '18', '03'],
  },
  {
    slug: 'field-software-fusion',
    title: '현장 × 소프트웨어 융합',
    audience: '제조 DX / 스마트팩토리',
    blurb: '제조 도면 언어로 그린 실제 소프트웨어 — 당신만의 차별점.',
    scenes: ['19', '06', '20', '12', '02'],
  },
  {
    slug: 'ai-builder',
    title: 'AI 빌더 / 에이전트 아키텍트',
    audience: 'AI 제품/플랫폼',
    blurb: '거버넌스·지식그래프·의사결정·위임까지, 2026 AI 시스템 사고.',
    scenes: ['23', '26', '25', '24', '04'],
  },
  {
    slug: 'ops-pm',
    title: '운영·데이터 PM',
    audience: 'PM / 운영 리더',
    blurb: '데이터로 현장 성과를 낸 운영자 — 정량·수상·자기 운영까지.',
    scenes: ['01', '17', '15', '14'],
  },
  {
    slug: 'maker',
    title: '메이커 / 하드웨어',
    audience: '하드웨어·기구·품질',
    blurb: '회로·적층제조·용접·로봇·기구설계 — 손으로 만드는 엔지니어.',
    scenes: ['10', '07', '11', '16', '21'],
  },
  {
    slug: 'human',
    title: '사람 — 작가이자 사상가',
    audience: '문화 적합성 / 깊이',
    blurb: '글 쓰는 엔지니어. 철학을 도구로, 신념으로 일하는 사람.',
    scenes: ['27', '25', '24'],
  },
]

export const compBySlug = (slug: string) => COMPOSITIONS.find((c) => c.slug === slug)
