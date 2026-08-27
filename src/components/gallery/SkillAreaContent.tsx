'use client'

import { GalleryGrid } from './GalleryGrid'
import { AREA_META, SKILL_AREAS, type SkillAreaKey } from './data'
import { GalleryPageShell } from './GalleryPageShell'
import { SITE } from '@content/site'
import { useLocale } from '@/components/LocaleProvider'

export function SkillAreaContent({ areaKey }: { areaKey: SkillAreaKey }) {
  const { t } = useLocale()
  const area = SKILL_AREAS.find((item) => item.key === areaKey)
  if (!area) return null
  const meta = AREA_META[area.key]

  return (
    <GalleryPageShell
      title={meta.heading}
      sub={meta.sub}
      footer={SITE.gallery.skills.areaFooter}
      footerValues={{ area: t(area.label), count: area.cards.length }}
    >
      <GalleryGrid cards={area.cards} />
    </GalleryPageShell>
  )
}
