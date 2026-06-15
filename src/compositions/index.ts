// 조합(Composition) — 청중/메시지별 시안 시퀀스. 각 조합은 "한 문장 결론"을 가진다.
// 5막 서사(현장→측정→시스템→운영→자율→사람) 위에서 owner 시안 위주로 구성.

export interface Composition {
  slug: string
  title: string
  audience: string
  blurb: string // 한 문장 결론(메시지 아크)
  scenes: string[] // scene id 순서
}

export const COMPOSITIONS: Composition[] = [
  {
    slug: 'overview',
    title: '전체 투어 (5막)',
    audience: '처음 보는 사람',
    blurb: '현장 부팅 → 측정 → 수렴 → 자율 → 사람. 한 동작의 5단계.',
    scenes: ['05', '11', '22', '23', '27'],
  },
  {
    slug: 'data-architect',
    title: '데이터·플랫폼 엔지니어',
    audience: '데이터/백엔드 채용',
    blurb: 'SSOT outbox+CDC를 제조에서 먼저 했고, 지금도 한다.',
    scenes: ['22', '19', '08', '03', '18'],
  },
  {
    slug: 'manufacturing-dx',
    title: '제조 DX / 스마트팩토리',
    audience: '제조 DX 리더',
    blurb: '도면 언어로 그린 진짜 소프트웨어 — 유일한 차별점.',
    scenes: ['05', '02', '11', '12', '01'],
  },
  {
    slug: 'ai-builder',
    title: 'AI 빌더 / 에이전트',
    audience: 'AI 제품/플랫폼',
    blurb: '경계를 설계해 자율을 확장한다(하네스 = 포카요케).',
    scenes: ['23', '25', '26', '24', '04'],
  },
  {
    slug: 'ops-pm',
    title: '운영·데이터 PM',
    audience: 'PM / 운영 리더',
    blurb: '데이터로 현장 성과를 낸 운영자(451분·재고+17%·수상).',
    scenes: ['17', '15', '01', '13'],
  },
  {
    slug: 'maker',
    title: '메이커 / 하드웨어',
    audience: '하드웨어·기구·품질',
    blurb: '회로·적층·기구·로봇 — 손으로 만드는 엔지니어.',
    scenes: ['10', '07', '21', '16', '06'],
  },
  {
    slug: 'human',
    title: '사람 — 작가이자 사상가',
    audience: '문화 적합성 / 깊이',
    blurb: '글 쓰는 엔지니어. 철학을 도구로, 신념으로 일한다.',
    scenes: ['27', '25', '24'],
  },
]

export const compBySlug = (slug: string) => COMPOSITIONS.find((c) => c.slug === slug)
