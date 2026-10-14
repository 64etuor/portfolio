'use client'

import type { ProjectContent } from '@content/projects/types'
import { Hero } from './Hero'
import { MetricGrid } from './MetricGrid'
import { Prose } from './Prose'
import { Gallery } from './Gallery'
import { StackTags } from './StackTags'
import { Diagram } from './Diagram'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import { projectForLocale } from '@content/i18n/portfolio-en'

/**
 * Shared project detail body — the block sequence rendered identically by both
 * the /projects/[slug] page and the in-scene ProjectDrawer. Presentational and
 * hook-free, so it works in both server and client trees.
 */
export function ProjectBody({ project }: { project: ProjectContent }) {
  const { locale, t } = useLocale()
  const localizedProject = projectForLocale(project, locale)
  return (
    <>
      <Hero project={localizedProject} />

      {localizedProject.metrics.length > 0 ? (
        <section className="pj-section">
          <h2 className="pj-h2">{t(SITE.project.keyOutcomes)}</h2>
          <MetricGrid metrics={localizedProject.metrics} />
        </section>
      ) : null}

      <Prose sections={localizedProject.sections} />

      {localizedProject.diagram ? (
        <section className="pj-section">
          <h2 className="pj-h2">{t(SITE.project.workflow)}</h2>
          <Diagram diagram={localizedProject.diagram} />
        </section>
      ) : null}

      {localizedProject.gallery && localizedProject.gallery.length > 0 ? (
        <section className="pj-section">
          <h2 className="pj-h2">{t(SITE.project.screens)}</h2>
          <Gallery items={localizedProject.gallery} />
        </section>
      ) : null}

      {localizedProject.stack.length > 0 ? (
        <section className="pj-section">
          <h2 className="pj-h2">{t(SITE.project.stack)}</h2>
          <StackTags stack={localizedProject.stack} />
        </section>
      ) : null}

      {localizedProject.links && localizedProject.links.length > 0 ? (
        <section className="pj-section">
          <h2 className="pj-h2">{t(SITE.project.links)}</h2>
          <ul className="pj-links">
            {localizedProject.links.map((link) => {
              const external = /^https?:\/\//.test(link.href)
              return (
                <li key={link.href}>
                  <a href={link.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                    {link.label} ↗
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </>
  )
}
