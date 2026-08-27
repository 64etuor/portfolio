'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { enabledProjects } from '@content/projects'
import { COMPANY_ACCENT } from '@content/projects/types'
import { projectForLocale } from '@content/i18n/portfolio-en'
import { SITE } from '@content/site'
import { useLocale } from '@/components/LocaleProvider'

export function ProjectsIndexContent() {
  const { locale, t } = useLocale()
  const projects = enabledProjects().map((project) => projectForLocale(project, locale))

  return (
    <main className="pj-root">
      <div className="pj-scan" aria-hidden />
      <div className="pj-vignette" aria-hidden />
      <div className="pj-index-head">
        <p className="pj-eyebrow"><span className="pj-acc">Projects</span> · {projects.length}</p>
        <h1 className="pj-title">{t(SITE.project.indexTitle)}</h1>
      </div>
      <div className="pj-index-grid">
        {projects.map((project) => {
          const topKpi = project.metrics[0]
          const thumbnail = project.gallery?.[0]?.src
          const cardStyle = { '--pj-acc': COMPANY_ACCENT[project.hero.companyKey] } as CSSProperties
          return (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="pj-card" style={cardStyle}>
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pj-card-thumb" src={thumbnail} alt="" loading="lazy" decoding="async" />
              ) : null}
              <div className="pj-card-body">
                <span className="pj-card-eyebrow">{project.hero.company} · {project.hero.period}</span>
                <h2 className="pj-card-title">{project.hero.title}</h2>
                {topKpi ? <span className="pj-card-kpi">{topKpi.value}{topKpi.label ? ` · ${topKpi.label}` : ''}</span> : null}
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
