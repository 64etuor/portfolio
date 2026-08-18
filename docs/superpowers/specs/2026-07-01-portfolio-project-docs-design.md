# Portfolio Project Docs — Design Spec

**Date:** 2026-07-01
**Branch:** `feat/portfolio-film`
**Status:** Approved (design) → pending implementation plan

## Goal

Bring the user's OneDrive Obsidian project-description documents into the portfolio as
**visually reconstructed, on-brand project pages**, reachable naturally from the existing
Gantt (the "Projects" menu). The `/resume` page is explicitly **out of scope** — left as-is.

## Key decisions (locked)

- **Display model:** In-app React pages at `/projects/[slug]`, styled in the site's
  CRT/noir design tokens. NOT markdown rendering.
- **Content strategy:** **Reconstruction** — each project is a typed content object rendered
  by reusable React block components. Diagrams (e.g. Work Radar's mermaid flowchart) are
  **rebuilt as bespoke on-brand SVG**, not rendered from mermaid source. Rationale: the raw
  Obsidian docs are not presentation-ready (callouts, `==highlights==`, git-page hover notes,
  meta-cruft), the whole codebase is already data-driven React (zero markdown anywhere — resume
  is JSON-Resume, scenes are TS objects, the Gantt encodes `problem`/`built`/`metrics`/`stack`
  as data), and a markdown pipeline would be the one generic-looking corner of a bespoke,
  design-forward site. Reconstruction also unlocks per-project layouts (galleries, KPI grids,
  before/after) that markdown flattens away.
- **Confidentiality:** Ingest content as-is (user decision), BUT each project has an
  `enabled` flag so the `Private/` KH Project and Mirrorless docs can be dropped without code
  changes. (Flagged because these were previously scrubbed from the film scenes as 기밀.)
- **Scope:** All 8 legacy manufacturing/data projects + modern dev projects (Work Radar,
  Notion OS, Mirrorless, KH Project) = ~12 project pages.

## Architecture

```
OneDrive Obsidian vault  ──(build-time first-pass extract)──►  repo, then human-curated
   *.md + attachments                                     content/projects/<slug>.ts (typed object)
                                                          public/projects/<slug>/*.png
                                                                    │
   Gantt bar click ──► window.top.location = /projects/<slug> ──► <ProjectPage> (React blocks)
```

Three parts: **(a)** ingestion script (first-pass draft extraction + image copy),
**(b)** typed content model + reusable block components, **(c)** Gantt → doc wiring.

## 1. Content model

Each project is a typed object (co-located `content/projects/<slug>.ts`, aggregated in an
index). Shape:

```ts
type ProjectContent = {
  slug: string
  ganttId: string          // matches an id in gantt-cpm.html COMPANIES/PROJECTS
  order: number
  enabled: boolean         // per-doc kill switch (Private/ docs default-droppable)
  hero: { title: string; company: string; period: string; role: string }
  summary: string          // 1–2 sentence lede
  metrics: { label: string; value: string; note?: string }[]   // KPI chips / grid
  stack: string[]
  sections: { heading: string; body: string }[]  // body = light markdown STRING (bold/lists/links only)
  gallery?: { src: string; caption?: string }[]
  diagram?: { kind: 'flow' | 'pipeline'; nodes: ...; edges: ... }  // rebuilt as SVG
  links?: { label: string; href: string }[]
}
```

`sections[].body` allows a **small** markdown string (paragraphs, bold, lists, links) rendered
by a minimal inline renderer — convenience for prose without importing a full markdown/rehype
pipeline or accepting its design ceiling. All structural presentation (hero, metrics, gallery,
diagram, stack) is bespoke React.

## 2. Ingestion script (`scripts/ingest-projects.mjs`, `npm run ingest:projects`)

Manifest-driven, run manually when docs change. `content/projects/manifest.ts` lists each
project: `slug`, `ganttId`, `title`, `company`, `period`, `order`, `enabled`, `source` (vault
path), `assets` mode.

Per entry the script:
- reads the source `.md` (or a heading-sliced block of `Portfolio_Korean_v2.md` for legacy 5–8
  which have no standalone doc),
- **first-pass extracts** a *draft* `ProjectContent` object: headings → `sections`,
  `==highlight==` → `metrics` candidates, `>[!callout]` → prose, `![[image]]` → `gallery`,
- **copies images**: resolves each `![[image]]` from the vault (`Settings/Attachments/` +
  colocated `assets/`) into `public/projects/<slug>/` and rewrites `src` to
  `/projects/<slug>/<file>`,
- strips Obsidian frontmatter, wikilink `[[x|label]]` → label, git-page hover notes, etc.,
- writes `content/projects/<slug>.draft.ts` for **human curation** → renamed to `<slug>.ts`.

Output is a *head start*, not the final artifact. Committed to the repo so Vercel builds are
self-contained (Vercel cannot read OneDrive).

## 3. Project set (12)

| # | slug | Source | Notes |
|---|------|--------|-------|
| 1 | mes-console | 2410 자동화 설비 MES 구축 프로젝트.md | 솔라엣지; React/Django/Electron |
| 2 | dv-data | 2408 개발품 DV 데이터 전산 관리 프로젝트.md | 솔라엣지; AppSheet/Matplotlib |
| 3 | traceability | 2403 공정 추적성 관리 시스템.md | 솔라엣지; Core Value Award |
| 4 | process-data | 2310 공정 데이터 관리 시스템.md | 솔라엣지; −451분/일, ST −50%, MOC Best |
| 5 | samsung-logistics | Portfolio_Korean_v2.md §5 | 이랜텍; 회전율 +17% |
| 6 | idle-equipment | Portfolio_Korean_v2.md §6 | 이랜텍; 비전검사 재활용 |
| 7 | line-innovation | Portfolio_Korean_v2.md §7 | 이랜텍; 불량 15→0%, C/T −31/−49% |
| 8 | smart-factory | Portfolio_Korean_v2.md §8 | 은성; ERP/바코드 |
| 9 | work-radar | 2606 Work Radar/…md | flagship dev; 11 screenshots + flow diagram (SVG rebuild) |
| 10 | mirrorless | Private/2508 Mirrorless/… | `enabled` toggle |
| 11 | kh-project | Private/2407 KH Project/Docs/… | `enabled` toggle |
| 12 | notion-os | 2510 Notion System/2510 Notion OS.md | PKM system |

Not every Gantt bar maps to a doc; only items with a matching `ganttId`/`slug` get a doc link.

## 4. Rendering — block components

`<ProjectPage>` composes a small set of reusable, token-styled blocks:

- **`Hero`** — serif (`--font-serif`) title, `company · period · role`, KPI chip row.
- **`MetricGrid`** — 2×N cards, coral `--accent` values, context note; the portfolio's
  "hard evidence" moment.
- **`Prose`** — minimal markdown-string renderer (bold/lists/links), `--font-sans`, ~720px column.
- **`Gallery`** — lazy `<figure>` screenshots w/ captions (Work Radar's 11 shots).
- **`Diagram`** — bespoke **SVG** flow/pipeline diagrams (Work Radar's Signals→Shape→Work→
  Govern→Learn loop), animated on scroll, matching the CRT palette. A good lightweight lib may
  back layout (e.g. an SVG/flow lib) but styling is ours.
- **`StackTags`** — tech pills, reusing the Gantt's `.s` tag idiom.
- **`ProjectNav`** — prev/next project + "↩ 간트로" back link.

Reading surface is a slightly lifted `--panel` on `--bg` for long-form legibility while keeping
noir. Optional subtle scanline/vignette to match scenes.

## 5. Routes

- **`/projects/[slug]`** — the doc page; `generateStaticParams()` from the content index
  (like `/s/[scene]`). Only `enabled` projects are generated.
- **`/projects`** — lightweight index card grid (title, company, period, top KPI, thumbnail)
  for direct browsing/SEO. The Gantt remains the primary entry point; this is a fallback.

## 6. Gantt integration (`public/lab/gantt-cpm.html`)

- Add a `slug` field to the ~12 mapped items in `COMPANIES` / `PROJECTS`.
- Mirror the existing, proven `rewindToScene()` as **`docTo(slug)`** — same
  `window.top.location.href` guard (works whether iframed via `SceneMount` or standalone).
- In the detail panel (`openDetail`), add a **"📄 프로젝트 문서 →"** button beside the existing
  `↩ 관련 장면으로`, shown **only when `t.slug` exists**. Purely additive parallel path — zero
  risk to the existing rewind flow.

## Out of scope

- `/resume` — untouched.
- No general markdown rendering pipeline (react-markdown/remark/rehype/mermaid) is added.
- No live OneDrive read at runtime/build beyond the manual ingestion step.

## Design tokens (reference)

`--bg #0b0d10 · --panel #14171c · --ink #e9e9ec · --muted #8b909a · --accent #e07a5f (coral)`
`--line rgba(233,233,236,.12) · --font-serif Cormorant/Noto Serif KR · --font-sans Pretendard
· --font-mono JetBrains Mono`. Company colors (for hero accent per employer):
`은성 #e0704e · 이랜텍 #3fa8c0 · 솔라엣지 #5588e8 · startup #9470e0`.
