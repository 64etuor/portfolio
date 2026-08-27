'use client'

import Link from 'next/link'
import type { ProjectContent } from '@content/projects/types'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'

/** Prev / next project + back-to-Gantt link. */
export function ProjectNav({ prev, next }: { prev?: ProjectContent; next?: ProjectContent }) {
  const { t } = useLocale()
  return (
    <nav className="pj-nav" aria-label={t(SITE.project.navigation)}>
      <span>
        {prev ? <Link href={`/projects/${prev.slug}`}>← {prev.hero.title}</Link> : <span />}
      </span>
      <Link className="pj-nav-back" href="/s/gantt-cpm">
        {t(SITE.project.backToTimeline)}
      </Link>
      <span>
        {next ? <Link href={`/projects/${next.slug}`}>{next.hero.title} →</Link> : <span />}
      </span>
    </nav>
  )
}
