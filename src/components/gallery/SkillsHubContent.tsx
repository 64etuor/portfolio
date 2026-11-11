'use client'

import Link from 'next/link'
import { AREA_META, SKILLS_HUB, SKILL_AREAS } from './data'
import { GalleryPageShell } from './GalleryPageShell'
import { SITE } from '@content/site'
import { useLocale } from '@/components/LocaleProvider'
import styles from './gallery.module.css'

export function SkillsHubContent() {
  const { t } = useLocale()
  const count = SKILL_AREAS.reduce((sum, area) => sum + area.cards.length, 0)

  return (
    <GalleryPageShell title={SKILLS_HUB.title} sub={SKILLS_HUB.sub} footer={SITE.gallery.skills.footer} footerValues={{ count }}>
      <div className={styles.areas}>
        {SKILL_AREAS.map((area) => (
          <Link key={area.key} className={styles.area} href={`/skills/${area.key}`}>
            <span className={styles.ac}>{String(area.cards.length).padStart(2, '0')}</span>
            <div className={styles.an}>{t(area.label)}</div>
            <div className={styles.ad}>{t(area.blurb)}</div>
            <div className={styles.al}>{t(AREA_META[area.key].labelLine)}</div>
            <span className={styles.go} aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </GalleryPageShell>
  )
}
