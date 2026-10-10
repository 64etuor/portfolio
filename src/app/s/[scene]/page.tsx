import type { Metadata } from 'next'
import { pageMetadata } from '../../seo'
import { notFound } from 'next/navigation'
import { SCENE_CATALOG, catalogEntry } from '@/scenes/catalog'
import { ScenePageContent } from '@/scenes/_host/ScenePageContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ scene: string }>
}): Promise<Metadata> {
  const { scene } = await params
  const s = catalogEntry(scene)
  if (!s) return {}
  const description = s.domain
    ? `${s.title} — ${s.domain}. 박양하 포트폴리오 인터랙티브 씬.`
    : `${s.title} — 박양하 포트폴리오 인터랙티브 씬.`
  return pageMetadata({ title: `${s.title} · Scene`, description, path: `/s/${s.slug}` })
}

// catalog 전체(필름 비트 포함)가 단독 라우트를 가진다 — 갤러리 필름 비트 카드의
// "전체화면으로 열기" 404 가 이로써 해소된다.
export function generateStaticParams() {
  return SCENE_CATALOG.map((s) => ({ scene: s.slug }))
}

export default async function ScenePage({ params }: { params: Promise<{ scene: string }> }) {
  const { scene } = await params
  const entry = catalogEntry(scene)
  if (!entry) notFound()
  return <ScenePageContent scene={entry} />
}