// 4관점 레지스트리 — 이제 catalog(SSOT)에서 파생된다.
// 각 시안은 public/lab 의 self-contained HTML.
// owns = 이 시안이 단독 소유하는 핵심 지표(중복 제거 기준).
// bg = 배경 톤 매칭용 hex.
//
// registry:true 인 catalog 항목만 SCENES 로 노출된다(필름 비트는 제외).
// 단독 라우트(/s)는 registry 가 아니라 catalog 전체를 해석하므로, 필름 비트도
// /s 페이지를 가진다(catalogEntry 사용). 여기 SCENES/sceneById 의 외부 API 는 유지.

import { SCENES_CATALOG, type ScenePerspective } from './catalog'

export interface Scene {
  id: string // "01"
  slug: string
  file: string
  title: string
  domain: string
  perspective: ScenePerspective
  cluster?: 'project' | 'career' // 'project-career' 관점 내 서브그룹
  status?: 'active' | 'parked' // 미지정 = active. parked는 홈/릴 제외
  bg: string
  featured?: boolean
  owns?: string // 단독 소유 핵심 지표 (없으면 지표 미보유 시안)
  blurb: string
}

export const SCENES: Scene[] = SCENES_CATALOG.filter((s) => s.registry).map((s) => ({
  id: s.id as string,
  slug: s.slug,
  file: s.file,
  title: s.title,
  domain: s.domain as string,
  perspective: s.perspective as ScenePerspective,
  ...(s.cluster ? { cluster: s.cluster } : {}),
  ...(s.status ? { status: s.status } : {}),
  bg: s.bg,
  ...(s.featured ? { featured: s.featured } : {}),
  ...(s.owns ? { owns: s.owns } : {}),
  blurb: s.blurb as string,
}))

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
