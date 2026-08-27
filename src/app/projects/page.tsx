import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import { enabledProjects } from '@content/projects'
import { COMPANY_ACCENT } from '@content/projects/types'
import { SITE } from '@content/site'

export const metadata: Metadata = {
  title: SITE.pages.projects.ko,
  description: '공정·데이터 엔지니어링부터 로컬-퍼스트 AI 워크플로우까지 — 직접 기획·구현한 프로젝트 모음.',
}

export default function ProjectsIndex() {
  const projects = enabledProjects()
  return (
    <main className="pj-root">
      <div className="pj-scan" aria-hidden />
      <div className="pj-vignette" aria-hidden />
      <div className="pj-index-head">
        <p className="pj-eyebrow">
          <span className="pj-acc">Projects</span> · {projects.length}
        </p>
        <h1 className="pj-title">직접 기획하고 구현한 것들</h1>
      </div>
      <div className="pj-index-grid">
        {projects.map((p) => {
          const topKpi = p.metrics[0]
          const thumb = p.gallery?.[0]?.src
          const cardStyle = { '--pj-acc': COMPANY_ACCENT[p.hero.companyKey] } as CSSProperties
          return (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="pj-card" style={cardStyle}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pj-card-thumb" src={thumb} alt="" loading="lazy" decoding="async" />
              ) : null}
              <div className="pj-card-body">
                <span className="pj-card-eyebrow">
                  {p.hero.company} · {p.hero.period}
                </span>
                <h2 className="pj-card-title">{p.hero.title}</h2>
                {topKpi ? (
                  <span className="pj-card-kpi">
                    {topKpi.value}
                    {topKpi.label ? ` · ${topKpi.label}` : ''}
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
