import type { Metadata } from 'next'
import { SITE } from '@content/site'
import { pageMetadata } from '../seo'
import { ProjectsIndexContent } from '@/components/projects/ProjectsIndexContent'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata: Metadata = pageMetadata({
  title: SITE.pages.projects.ko,
  description: '공정·데이터 엔지니어링부터 로컬-퍼스트 AI 워크플로우까지 — 직접 기획·구현한 프로젝트 모음.',
  path: '/projects',
})

export default function ProjectsIndex() {
  return (
    <>
      <ProjectsIndexContent />
      <SiteFooter />
    </>
  )
}
