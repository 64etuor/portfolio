'use client'

import { useEffect, useState } from 'react'
import { projectBySlug } from '@content/projects'
import { ProjectDrawer } from './ProjectDrawer'

/**
 * Mounts one shared ProjectDrawer and opens it in response to
 * `project-drawer:open` window events (see ProjectDetailLink). Lets
 * server-rendered pages (the résumé) reuse the same drawer as the gantt scene.
 */
export function ProjectDrawerHost() {
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    const onOpen = (e: Event) => {
      const s = (e as CustomEvent<string>).detail
      if (s) setSlug(s)
    }
    window.addEventListener('project-drawer:open', onOpen)
    return () => window.removeEventListener('project-drawer:open', onOpen)
  }, [])

  return <ProjectDrawer project={slug ? projectBySlug(slug) ?? null : null} onClose={() => setSlug(null)} />
}
