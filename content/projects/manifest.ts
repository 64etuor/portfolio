// Ingestion manifest — source-of-truth mapping from Obsidian docs to /projects
// slugs. Consumed ONLY by scripts/ingest-projects.ts (never bundled at runtime).
// Paths are relative to VAULT root (see script). Legacy 5–8 have no standalone
// doc, so they slice a numbered block out of Portfolio_Korean_v2.md.

import type { CompanyKey } from './types'

export type ManifestEntry = {
  slug: string
  ganttId: string // '' if the project has no Gantt bar (index-only)
  title: string
  company: string
  companyKey: CompanyKey
  period: string
  order: number
  enabled: boolean
  source: string
  /** For Portfolio_Korean_v2.md slices: the leading project number, e.g. '5'. */
  sliceNumber?: string
}

const SOL = '300_Projects/00_Archives/2401 솔라엣지 공정 관리'
const PORTFOLIO = '400_Areas/PORTFOLIO/Portfolio_Korean_v2.md'
const PRIVATE = '300_Projects/Private'

export const MANIFEST: ManifestEntry[] = [
  { slug: 'mes-console', ganttId: 'p-mes', title: '신제품 라인 셋업 — MES 자체 개발', company: '솔라엣지', companyKey: 'sol', period: '2024.10–12', order: 1, enabled: true,
    source: `${SOL}/2410 자동화 설비 MES 구축 프로젝트.md` },
  { slug: 'dv-data', ganttId: 'p-dv', title: '개발품 DV 데이터 전산 관리', company: '솔라엣지', companyKey: 'sol', period: '2024.08–10', order: 2, enabled: true,
    source: `${SOL}/2408 개발품 DV 데이터 전산 관리 프로젝트.md` },
  { slug: 'traceability', ganttId: 'p-trace', title: '공정 추적성 관리 프로그램 개발', company: '솔라엣지', companyKey: 'sol', period: '2024.03–06', order: 3, enabled: true,
    source: `${SOL}/2403 공정 추적성 관리 시스템 개발 프로젝트.md` },
  { slug: 'process-data', ganttId: 'p-procdata', title: '공정 데이터 관리 시스템 개발', company: '솔라엣지', companyKey: 'sol', period: '2023.10–12', order: 4, enabled: true,
    source: `${SOL}/2310 공정 데이터 관리 시스템 개발 프로젝트.md` },
  { slug: 'samsung-logistics', ganttId: 'p-samsung', title: '삼성 제조리더 연계 — 물류 시스템 개선', company: '이랜텍', companyKey: 'elen', period: '2023.03–05', order: 5, enabled: true,
    source: PORTFOLIO, sliceNumber: '5' },
  { slug: 'idle-equipment', ganttId: 'p-idle', title: '유휴 설비 재활용 프로젝트', company: '이랜텍', companyKey: 'elen', period: '2022.12–2023.04', order: 6, enabled: true,
    source: PORTFOLIO, sliceNumber: '6' },
  { slug: 'line-innovation', ganttId: 'p-line', title: '연간 생산라인 혁신 프로젝트', company: '이랜텍', companyKey: 'elen', period: '2022.11–2023.09', order: 7, enabled: true,
    source: PORTFOLIO, sliceNumber: '7' },
  { slug: 'smart-factory', ganttId: 'p-smartfac', title: '중기청 상생 스마트팩토리 도입', company: '은성', companyKey: 'eun', period: '2021.08–2022.01', order: 8, enabled: true,
    source: PORTFOLIO, sliceNumber: '8' },
  { slug: 'work-radar', ganttId: 'p-radar', title: 'Work Radar — Local-first AI 워크플로우 콕핏', company: '개인 프로젝트', companyKey: 'startup', period: '2026.06', order: 9, enabled: true,
    source: '300_Projects/2606 Work Radar/Work Radar 프로젝트 포트폴리오.md' },
  { slug: 'notion-os', ganttId: 'p-notion', title: 'Notion OS — 조직 운영 시스템', company: '스타트업', companyKey: 'startup', period: '2025.10–', order: 10, enabled: true,
    source: '300_Projects/2510 Notion System/2510 Notion OS.md' },
  { slug: 'mirrorless', ganttId: 'p-kiosk-app', title: '미러리스 키오스크 — SW 아키텍처', company: '스타트업', companyKey: 'startup', period: '2025.08–', order: 11, enabled: true,
    source: `${PRIVATE}/2508 Mirrorless/개발 문서/미러리스 키오스크 아키텍쳐.md` },
]
