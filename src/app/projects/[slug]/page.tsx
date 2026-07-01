import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { enabledProjects, projectBySlug } from '@content/projects'
import { COMPANY_ACCENT } from '@content/projects/types'
import { Hero } from '@/components/projects/Hero'
import { MetricGrid } from '@/components/projects/MetricGrid'
import { Prose } from '@/components/projects/Prose'
import { Gallery } from '@/components/projects/Gallery'
import { StackTags } from '@/components/projects/StackTags'
import { Diagram } from '@/components/projects/Diagram'
import { ProjectNav } from '@/components/projects/ProjectNav'

export function generateStaticParams() {
  return enabledProjects().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = projectBySlug(slug)
  if (!p) return {}
  const desc = p.summary || `${p.hero.company} · ${p.hero.period} · ${p.hero.title}`
  return { title: `${p.hero.title} · Project`, description: desc }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = projectBySlug(slug)
  if (!project) notFound()

  const list = enabledProjects()
  const i = list.findIndex((p) => p.slug === slug)
  const prev = i > 0 ? list[i - 1] : undefined
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : undefined

  const rootStyle = { '--pj-acc': COMPANY_ACCENT[project.hero.companyKey] } as CSSProperties

  return (
    <main className="pj-root" style={rootStyle}>
      <div className="pj-scan" aria-hidden />
      <div className="pj-vignette" aria-hidden />
      <div className="pj-sheet">
        <Hero project={project} />

        {project.metrics.length > 0 ? (
          <section className="pj-section">
            <h2 className="pj-h2">핵심 성과</h2>
            <MetricGrid metrics={project.metrics} />
          </section>
        ) : null}

        <Prose sections={project.sections} />

        {project.diagram ? (
          <section className="pj-section">
            <h2 className="pj-h2">동작 흐름</h2>
            <Diagram diagram={project.diagram} />
          </section>
        ) : null}

        {project.gallery && project.gallery.length > 0 ? (
          <section className="pj-section">
            <h2 className="pj-h2">화면</h2>
            <Gallery items={project.gallery} />
          </section>
        ) : null}

        {project.stack.length > 0 ? (
          <section className="pj-section">
            <h2 className="pj-h2">기술 스택</h2>
            <StackTags stack={project.stack} />
          </section>
        ) : null}

        <ProjectNav prev={prev} next={next} />
      </div>
    </main>
  )
}
