import { notFound } from 'next/navigation'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { AREA_META, SKILL_AREAS, type SkillAreaKey } from '@/components/gallery/data'
import styles from '@/components/gallery/gallery.module.css'

export function generateStaticParams() {
  return SKILL_AREAS.map((a) => ({ area: a.key }))
}

export default async function SkillAreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area } = await params
  const found = SKILL_AREAS.find((a) => a.key === area)
  if (!found) notFound()
  const meta = AREA_META[found.key as SkillAreaKey]

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.h1}>{meta.heading}</h1>
        <p className={styles.sub}>{meta.sub}</p>
      </header>
      <GalleryGrid cards={found.cards} />
      <footer className={styles.footer}>{found.label} · {found.count}종</footer>
    </div>
  )
}
