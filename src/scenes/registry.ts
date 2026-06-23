// 4관점 레지스트리 — 이제 catalog(SSOT)에서 파생된다.
// 각 시안은 public/lab 의 self-contained HTML.
// bg = 배경 톤 매칭용 hex.
//
// registry:true 인 catalog 항목만 SCENES 로 노출된다(필름 비트는 제외).
// 단독 라우트(/s)는 registry 가 아니라 catalog 전체를 해석하므로, 필름 비트도
// /s 페이지를 가진다(catalogEntry 사용). 여기 SCENES/sceneById 의 외부 API 는 유지.

import { SCENES_CATALOG } from './catalog'

export interface Scene {
  id: string // "01"
  slug: string
  file: string
  title: string
  domain: string
  bg: string
}

export const SCENES: Scene[] = SCENES_CATALOG.filter((s) => s.registry).map((s) => ({
  id: s.id as string,
  slug: s.slug,
  file: s.file,
  title: s.title,
  domain: s.domain as string,
  bg: s.bg,
}))

export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
