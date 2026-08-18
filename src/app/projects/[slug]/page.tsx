import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { notFound } from 'next/navigation'
import { enabledProjects, projectBySlug } from '@content/projects'
import { COMPANY_ACCENT } from '@content/projects/types'
import { ProjectBody } from '@/components/projects/ProjectBody'
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
        <ProjectBody project={project} />
        <ProjectNav prev={prev} next={next} />
      </div>
    </main>
  )
}
