// Registry of all /projects doc content. Curated <slug>.ts files are imported
// here (added in Task 5). Helpers back the routes + the /projects index.

import type { ProjectContent } from './types'

// --- curated projects (registered as each is authored) ---
// (imports added in Task 5)

export const ALL_PROJECTS: ProjectContent[] = []

export function enabledProjects(): ProjectContent[] {
  return ALL_PROJECTS.filter((p) => p.enabled).sort((a, b) => a.order - b.order)
}

export function projectBySlug(slug: string): ProjectContent | undefined {
  const p = ALL_PROJECTS.find((x) => x.slug === slug)
  return p && p.enabled ? p : undefined
}

export type { ProjectContent }
export { COMPANY_ACCENT } from './types'
