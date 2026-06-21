import Link from 'next/link'
import { AREA_META, SKILLS_HUB, SKILL_AREAS } from '@/components/gallery/data'
import { GalleryPageShell } from '@/components/gallery/GalleryPageShell'
import styles from '@/components/gallery/gallery.module.css'

export const metadata = { title: 'Skills · 영역별 실작업 — Lab' }

export default function SkillsHubPage() {
  return (
    <GalleryPageShell
      title={SKILLS_HUB.title}
      sub={SKILLS_HUB.sub}
      footer={`총 ${SKILL_AREAS.reduce((s, a) => s + a.cards.length, 0)}종 · 영역별 페이지는 지연로딩(뷰포트 진입 시 미리보기 렌더).`}
    >
      <div className={styles.areas}>
        {SKILL_AREAS.map((area) => (
          <Link key={area.key} className={styles.area} href={`/skills/${area.key}`}>
            <span className={styles.ac}>{area.cards.length}</span>
            <div className={styles.an}>{area.label}</div>
            <div className={styles.ad}>{area.blurb}</div>
            <div className={styles.al}>{AREA_META[area.key].labelLine}</div>
          </Link>
        ))}
      </div>
    </GalleryPageShell>
  )
}
