'use client'

import Link from 'next/link'
import { SceneFrame } from '@/scenes/_host/SceneFrame'
import { loaderFor } from '@/scenes/loaders'
import { SCENES, sceneById } from '@/scenes/registry'
import type { GalleryCard } from './data'
import styles from './gallery.module.css'

// 카드 file → 단독 라우트 slug. registry 는 slug 와 file basename 양쪽으로 색인되지만
// 필름 비트(예: 42-era-shift)는 registry 에 없으므로 file basename 으로 폴백.
function slugFor(file: string): string {
  const base = file.replace(/\.html$/, '')
  const byFile = SCENES.find((s) => s.file === file || s.file === `${base}.html`)
  if (byFile) return byFile.slug
  return sceneById(base)?.slug ?? base
}

function isFilmBeat(file: string): boolean {
  // 필름 비트는 registry 에 등록되지 않은 씬들(숫자 prefix + 내러티브 전용).
  const base = file.replace(/\.html$/, '')
  return !SCENES.some((s) => s.file === `${base}.html` || s.slug === base)
}

export function GalleryGrid({ cards }: { cards: GalleryCard[] }) {
  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const load = loaderFor(card.file)
        const slug = slugFor(card.file)
        const film = isFilmBeat(card.file)
        const bg = sceneById(card.file.replace(/\.html$/, ''))?.bg ?? '#000'
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
