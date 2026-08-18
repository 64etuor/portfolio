// SSOT for the /projects doc pages. Each project is a typed content object
// (reconstruction, not markdown) rendered by block components in
// src/components/projects/. First-pass drafts come from scripts/ingest-projects.ts,
// then get hand-curated here. See docs/superpowers/specs/2026-07-01-portfolio-project-docs-design.md

export type CompanyKey = 'eun' | 'elen' | 'sol' | 'startup'

/** Per-employer accent, matching public/lab/gantt-cpm.html company colors. */
export const COMPANY_ACCENT: Record<CompanyKey, string> = {
  eun: '#e0704e', // 은성
  elen: '#3fa8c0', // 이랜텍
  sol: '#5588e8', // 솔라엣지
  startup: '#9470e0', // 개인/스타트업 dev
}

export type Metric = {
  label: string
  value: string
  note?: string
}

export type GalleryItem = {
  src: string // /projects/<slug>/<file>
  caption?: string
}

export type DiagramNode = { id: string; label: string }
export type DiagramEdge = { from: string; to: string; label?: string }
export type Diagram = {
  kind: 'flow' | 'pipeline'
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export type Section = {
  heading: string
  /** Light markdown STRING (bold/italic/code/links/lists only) — see renderInline. */
  body: string
}

export type ProjectLink = { label: string; href: string }

export type ProjectContent = {
  slug: string
  /** Matches an id in public/lab/gantt-cpm.html COMPANIES/PROJECTS. */
  ganttId: string
  order: number
  /** Per-doc kill switch — Private/ docs can be dropped without code changes. */
  enabled: boolean
  hero: {
    title: string
    company: string
    companyKey: CompanyKey
    period: string
    role: string
  }
  summary: string
  metrics: Metric[]
  stack: string[]
  sections: Section[]
  gallery?: GalleryItem[]
  diagram?: Diagram
  links?: ProjectLink[]
}
