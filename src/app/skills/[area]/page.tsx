import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AREA_META, SKILL_AREAS, type SkillAreaKey } from '@/components/gallery/data'
import { SkillAreaContent } from '@/components/gallery/SkillAreaContent'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>
}): Promise<Metadata> {
  const { area } = await params
  const found = SKILL_AREAS.find((a) => a.key === area)
  if (!found) return {}
  const meta = AREA_META[found.key as SkillAreaKey]
  return { title: `${meta.heading.en} · Skills`, description: meta.sub.en }
}

export function generateStaticParams() {
  return SKILL_AREAS.map((a) => ({ area: a.key }))
}

export default async function SkillAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params
  const found = SKILL_AREAS.find((a) => a.key === area)
  if (!found) notFound()
  return <SkillAreaContent areaKey={found.key as SkillAreaKey} />
}
