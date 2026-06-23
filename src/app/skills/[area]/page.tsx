import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { AREA_META, SKILL_AREAS, type SkillAreaKey } from '@/components/gallery/data'
import { GalleryPageShell } from '@/components/gallery/GalleryPageShell'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>
}): Promise<Metadata> {
  const { area } = await params
  const found = SKILL_AREAS.find((a) => a.key === area)
  if (!found) return {}
  const meta = AREA_META[found.key as SkillAreaKey]
  return { title: `${meta.heading} · Skills`, description: meta.sub }
}

export function generateStaticParams() {
  return SKILL_AREAS.map((a) => ({ area: a.key }))
}

export default async function SkillAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params
  const found = SKILL_AREAS.find((a) => a.key === area)
  if (!found) notFound()
  const meta = AREA_META[found.key as SkillAreaKey]

  return (
    <GalleryPageShell
      title={meta.heading}
      sub={meta.sub}
      footer={`${found.label} · ${found.cards.length}종`}
    >
      <GalleryGrid cards={found.cards} />
    </GalleryPageShell>
  )
}
