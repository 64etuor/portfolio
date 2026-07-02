// Registry of all /projects doc content. Curated <slug>.ts files are imported
// here. Helpers back the routes + the /projects index.

import type { ProjectContent } from './types'
import { mes_console } from './mes-console'
import { dv_data } from './dv-data'
import { traceability } from './traceability'
import { process_data } from './process-data'
import { samsung_logistics } from './samsung-logistics'
import { idle_equipment } from './idle-equipment'
import { line_innovation } from './line-innovation'
import { smart_factory } from './smart-factory'
import { work_radar } from './work-radar'
import { notion_os } from './notion-os'
import { mirrorless } from './mirrorless'

export const ALL_PROJECTS: ProjectContent[] = [
  mes_console,
  dv_data,
  traceability,
  process_data,
  samsung_logistics,
  idle_equipment,
  line_innovation,
  smart_factory,
  work_radar,
  notion_os,
  mirrorless,
]

export function enabledProjects(): ProjectContent[] {
  return ALL_PROJECTS.filter((p) => p.enabled).sort((a, b) => a.order - b.order)
}

export function projectBySlug(slug: string): ProjectContent | undefined {
  const p = ALL_PROJECTS.find((x) => x.slug === slug)
  return p && p.enabled ? p : undefined
}
