'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { enabledProjects } from '@content/projects'
import { COMPANY_ACCENT } from '@content/projects/types'
import { projectForLocale } from '@content/i18n/portfolio-en'
import { SITE } from '@content/site'
import { useLocale } from '@/components/LocaleProvider'
import { IMAGE_DIMS } from './imageDims'

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
        {projects.map((project, index) => {
          const topKpi = project.metrics[0]
          const thumbnail = project.gallery?.find((g) => IMAGE_DIMS[g.src])?.src
          const cardStyle = { '--pj-acc': COMPANY_ACCENT[project.hero.companyKey] } as CSSProperties
          return (
            <Link key={project.slug} href={`/projects/${project.slug}`} className="pj-card" style={{ ...cardStyle, '--pj-i': Math.min(index, 8) } as CSSProperties}>
              {thumbnail ? (
                <Image
                  className="pj-card-thumb"
                  src={thumbnail}
                  alt=""
                  width={IMAGE_DIMS[thumbnail][0]}
                  height={IMAGE_DIMS[thumbnail][1]}
                  sizes="(max-width: 600px) 100vw, 440px"
                  quality={70}
                  // The first two thumbnails sit above the fold on mobile (one column) and
                  // either can be the LCP element — fetch them eagerly at high priority
                  // instead of lazy-loading after layout. The rest stay lazy.
                  priority={index < 2}
                />
              ) : (
                // 스크린샷이 없는 프로젝트 — 빈 카드 대신 대표 지표를 타이포그래피 썸네일로.
                // 값·라벨은 아래 본문에 그대로 있으므로 장식(aria-hidden)이다.
                <div className="pj-card-thumb pj-card-thumb--type" aria-hidden>
                  <span className="pj-card-thumb-v">{topKpi?.value ?? project.hero.period}</span>
                </div>
              )}
              <div className="pj-card-body">
                <span className="pj-card-eyebrow">{project.hero.company} · {project.hero.period}</span>
                <h2 className="pj-card-title">{project.hero.title}</h2>
                {topKpi ? (
                  <span className="pj-card-kpi">
                    <span>{topKpi.value}{topKpi.label ? ` · ${topKpi.label}` : ''}</span>
                    <span className="pj-card-go" aria-hidden>→</span>
                  </span>
                ) : null}
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
