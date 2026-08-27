'use client'

import Link from 'next/link'
import type { ProjectContent } from '@content/projects/types'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import { projectForLocale } from '@content/i18n/portfolio-en'

/** Prev / next project + back-to-Gantt link. */
export function ProjectNav({ prev, next }: { prev?: ProjectContent; next?: ProjectContent }) {
  const { locale, t } = useLocale()
  const localizedPrev = prev ? projectForLocale(prev, locale) : undefined
  const localizedNext = next ? projectForLocale(next, locale) : undefined
  return (
    <nav className="pj-nav" aria-label={t(SITE.project.navigation)}>
      <span>
        {localizedPrev ? <Link href={`/projects/${localizedPrev.slug}`}>← {localizedPrev.hero.title}</Link> : <span />}
      </span>
      <Link className="pj-nav-back" href="/s/gantt-cpm">
        {t(SITE.project.backToTimeline)}
      </Link>
      <span>
        {localizedNext ? <Link href={`/projects/${localizedNext.slug}`}>{localizedNext.hero.title} →</Link> : <span />}
      </span>
    </nav>
  )
}
