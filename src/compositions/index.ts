// 조합(Composition) — 청중/메시지별 시안 시퀀스. 각 조합은 "한 문장 결론"을 가진다.
// 4관점(프로젝트+경력 / 스킬 / 철학 / 지식관리) 위에서 owner 시안 위주로 구성.

import { SCENE_CATALOG } from '@/scenes/catalog'

// scene id = registry 시안 번호("01" 등). catalog 의 id 만 허용 — sceneById 로 해석된다.
type SceneId = NonNullable<Extract<(typeof SCENE_CATALOG)[number], { id: string }>['id']>

export interface Composition {
  slug: string
  title: string
  audience: string
  blurb: string // 한 문장 결론(메시지 아크)
  scenes: SceneId[] // scene id 순서
}

export const COMPOSITIONS: Composition[] = [
  {
    slug: 'overview',
    title: '전체 투어 (4관점)',
    audience: '처음 보는 사람',
    blurb: '프로젝트+경력 → 스킬 → 철학 → 지식관리. 한 사람을 보는 네 각도.',
    scenes: ['13', '22', '06', '23'],
  },
  {
    slug: 'project-career',
    title: '프로젝트 + 경력',
    audience: '채용·리더',
    blurb: '스타트업/개인 제품과 제조 3社 경력 — 실제로 성과를 낸 것.',
    scenes: ['03', '13', '20', '18', '15', '17'],
  },
  {
    slug: 'skill',
    title: '스킬',
    audience: '기술 면접',
    blurb: '공정기술부터 데이터 모델링까지 — 어떻게 만드는가.',
    scenes: ['11', '16', '19', '22'],
  },
  {
    slug: 'philosophy',
    title: '철학',
    audience: '문화 적합성',
    blurb: '크로스도메인·품질·위임 — 왜 그렇게 일하는가.',
    scenes: ['06', '12'],
  },
  {
    slug: 'knowledge',
    title: '지식관리',
    audience: 'AI·플랫폼',
    blurb: '지식을 운영 시스템으로 — 거버넌스·결정·검색.',
    scenes: ['23', '25', '26'],
  },
]

export const compBySlug = (slug: string) => COMPOSITIONS.find((c) => c.slug === slug)
