'use client'

import Link from 'next/link'
import { SceneFrame } from '@/scenes/_host/SceneFrame'
import { loaderFor } from '@/scenes/loaders'
import { catalogEntry } from '@/scenes/catalog'
import type { GalleryCard } from './data'
import styles from './gallery.module.css'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'

// 카드 file → 단독 라우트 slug. catalog 가 모든 씬(필름 비트 포함)을 색인하므로
// 항상 /s 가 해석 가능한 slug 로 매핑된다.
function slugFor(file: string): string {
  const base = file.replace(/\.html$/, '')
  return catalogEntry(file)?.slug ?? base
}

function isFilmBeat(file: string): boolean {
  return catalogEntry(file)?.filmBeat ?? false
}

export function GalleryGrid({ cards }: { cards: GalleryCard[] }) {
  const { t } = useLocale()
  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const load = loaderFor(card.file)
        const slug = slugFor(card.file)
        const film = isFilmBeat(card.file)
        const bg = catalogEntry(card.file)?.bg ?? '#000'
        return (
          <article key={card.file} className={`${styles.card}${film ? ` ${styles.cardFilm}` : ''}`}>
            <div className={styles.bar}>
              <h2 className={styles.tt}>{t(card.title)}</h2>
              <span className={styles.tag}>{t(card.tag)}</span>
            </div>
            <div className={styles.desc}>{t(card.desc)}</div>
            <div className={styles.frameWrap}>
              {load ? (
                <SceneFrame load={load} title={t(card.title)} bg={bg} hoverPlay />
              ) : (
                <div className={styles.placeholder}>● {t(SITE.gallery.previewUnavailable)}</div>
              )}
            </div>
            <div className={styles.actions}>
              <Link href={`/s/${slug}`}>{t(SITE.gallery.openFullscreen)}</Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
