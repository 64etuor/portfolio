import type { ProjectContent } from '@content/projects/types'
import { Hero } from './Hero'
import { MetricGrid } from './MetricGrid'
import { Prose } from './Prose'
import { Gallery } from './Gallery'
import { StackTags } from './StackTags'
import { Diagram } from './Diagram'

/**
 * Shared project detail body — the block sequence rendered identically by both
 * the /projects/[slug] page and the in-scene ProjectDrawer. Presentational and
 * hook-free, so it works in both server and client trees.
 */
export function ProjectBody({ project }: { project: ProjectContent }) {
  return (
    <>
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
    </>
  )
}
