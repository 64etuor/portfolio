'use client'

import Link from 'next/link'
import { SceneFrame } from '@/scenes/_host/SceneFrame'
import { loaderFor } from '@/scenes/loaders'
import { catalogEntry } from '@/scenes/catalog'
import type { GalleryCard } from './data'
import styles from './gallery.module.css'

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
              <span className={styles.tt}>{card.title}</span>
              <span className={styles.tag}>{card.tag}</span>
            </div>
            <div className={styles.desc}>{card.desc}</div>
            <div className={styles.frameWrap}>
              {load ? (
                <SceneFrame load={load} title={card.title} bg={bg} hoverPlay />
              ) : (
                <div className={styles.placeholder}>● 미리보기 없음</div>
              )}
            </div>
            <div className={styles.actions}>
              <Link href={`/s/${slug}`}>전체화면으로 열기 ↗</Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
