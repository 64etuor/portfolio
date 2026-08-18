# Portfolio Project Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruct the user's OneDrive Obsidian project docs as on-brand, data-driven React project pages at `/projects/[slug]`, wired into the existing Gantt detail panel.

**Architecture:** A manual ingestion script does first-pass extraction of each Obsidian doc + its images into the repo (typed content objects + `public/projects/<slug>/` assets). Reusable, token-styled React block components render a `ProjectContent` object per project. The standalone Gantt HTML gets an additive `docTo(slug)` button mirroring its proven `rewindToScene()` navigation.

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind 4, existing CSS custom-property design tokens. No markdown/mermaid libraries. Node script (ESM) for ingestion.

## Global Constraints

- Next.js `^15.5.4`, React `~19.2.6`, static-generated routes via `generateStaticParams()` (mirror `/s/[scene]`).
- Design tokens ONLY (no hardcoded colors): `--bg #0b0d10 · --panel #14171c · --ink #e9e9ec · --muted #8b909a · --accent #e07a5f · --line rgba(233,233,236,.12) · --font-serif · --font-sans · --font-mono`. Company accents: 은성 `#e0704e` · 이랜텍 `#3fa8c0` · 솔라엣지 `#5588e8` · startup `#9470e0`.
- NO markdown rendering pipeline (no react-markdown/remark/rehype/mermaid). `sections[].body` uses a minimal in-repo inline renderer (bold/italic/lists/links only).
- Content ingested as-is; every project has `enabled: boolean` — `Private/` docs (mirrorless, kh-project) toggleable off without code change.
- `/resume` is OUT OF SCOPE — do not touch `src/components/resume/**` or `/resume`.
- Verification per task: `npm run build` exits 0 AND `npm run lint` clean AND (for routes) the page renders in a headless DOM check. No unit-test framework exists — do not invent one.
- Vault root: `/Users/davidpark/Library/CloudStorage/OneDrive-개인/Obsidian`. Repo builds must NOT read the vault at runtime/build — only the manual `npm run ingest:projects` step does.
- Commit after each task on branch `feat/portfolio-film`.

---

### Task 1: Content model + types + minimal inline renderer

**Files:**
- Create: `src/content/projects/types.ts`
- Create: `src/content/projects/inline.tsx` (minimal inline markdown-string renderer)
- Create: `src/content/projects/index.ts` (registry + helpers)

**Interfaces:**
- Produces: `type ProjectContent` (fields: `slug, ganttId, order, enabled, hero{title,company,companyKey,period,role}, summary, metrics[{label,value,note?}], stack[], sections[{heading,body}], gallery?[{src,caption?}], diagram?, links?[{label,href}]}`); `type CompanyKey = 'eun'|'elen'|'sol'|'startup'`; `COMPANY_ACCENT: Record<CompanyKey,string>`; `renderInline(body: string): ReactNode`; `ALL_PROJECTS: ProjectContent[]`; `enabledProjects(): ProjectContent[]`; `projectBySlug(slug): ProjectContent | undefined`.

- [ ] **Step 1:** Write `types.ts` defining `ProjectContent`, `CompanyKey`, `Diagram` (`{kind:'flow'|'pipeline', nodes:{id,label}[], edges:{from,to,label?}[]}`), and `COMPANY_ACCENT`.
- [ ] **Step 2:** Write `inline.tsx` — `renderInline(body)` handling `**bold**`, `*italic*`, `` `code` ``, `[text](href)`, `- ` bullet lists, and paragraph splits on blank lines. Pure function returning React nodes. No external deps.
- [ ] **Step 3:** Write `index.ts` importing every `content/projects/<slug>.ts` (added in Task 3+) — start with an empty array and the three helper functions.
- [ ] **Step 4:** Run `npm run build` and `npm run lint`. Expected: exit 0, clean (unused-vars OK to fix inline).
- [ ] **Step 5:** Commit `feat(projects): content model, types, inline renderer`.

---

### Task 2: Ingestion script + manifest + npm script

**Files:**
- Create: `scripts/ingest-projects.mjs`
- Create: `content/projects/manifest.ts` (source-of-truth mapping; NOT bundled)
- Modify: `package.json` (add `"ingest:projects": "node scripts/ingest-projects.mjs"`)
- Create: `public/projects/.gitkeep`

**Interfaces:**
- Produces: on run, writes `src/content/projects/<slug>.draft.ts` drafts + copies images to `public/projects/<slug>/`. Consumed by human curation in Task 3+.

- [ ] **Step 1:** Write `manifest.ts` — array of `{slug, ganttId, title, company, companyKey, period, order, enabled, source, sliceHeading?}` for all 12 projects (paths from the spec table; legacy 5–8 use `source: 'Portfolio_Korean_v2.md'` + `sliceHeading`).
- [ ] **Step 2:** Write `ingest-projects.mjs`: for each manifest entry — read source (or slice `Portfolio_Korean_v2.md` by heading), strip frontmatter, convert `==x==`→metric candidates, `[[a|b]]`→`b`, drop git-page hover notes/callout markers; find every `![[img]]` filename by walking the vault (`Settings/Attachments/`, colocated `assets/`), copy into `public/projects/<slug>/`, collect into `gallery`; emit a `<slug>.draft.ts` exporting a `ProjectContent` best-guess.
- [ ] **Step 3:** Add the npm script to `package.json`.
- [ ] **Step 4:** Run `npm run ingest:projects`. Expected: 12 draft files under `src/content/projects/`, images under `public/projects/<slug>/`. Log a per-project summary (sections found, images copied).
- [ ] **Step 5:** Run `npm run build` (drafts not yet imported → still builds). Commit `feat(projects): ingestion script + manifest` (do NOT commit `.draft.ts` — they are curated into `.ts` next).

---

### Task 3: Block components

**Files:**
- Create: `src/components/projects/Hero.tsx`, `MetricGrid.tsx`, `Prose.tsx`, `Gallery.tsx`, `StackTags.tsx`, `ProjectNav.tsx`
- Create: `src/components/projects/Diagram.tsx` (bespoke SVG flow/pipeline)
- Create: `src/components/projects/projects.module.css`

**Interfaces:**
- Consumes: `ProjectContent` + sub-types from Task 1.
- Produces: `<Hero project>`, `<MetricGrid metrics>`, `<Prose sections>`, `<Gallery items>`, `<StackTags stack>`, `<Diagram diagram>`, `<ProjectNav prev next>`.

- [ ] **Step 1:** `Hero` — serif title, company·period·role line, KPI chip row, left accent bar in `COMPANY_ACCENT[companyKey]`.
- [ ] **Step 2:** `MetricGrid` — 2×N cards, coral value, muted note. `StackTags` — pills reusing Gantt `.s` idiom.
- [ ] **Step 3:** `Prose` — maps `sections[]` to `<h2>` (serif) + `renderInline(body)` in ~720px column. `Gallery` — lazy `<figure>` with `loading="lazy"`, caption; `next/image` if straightforward, else `<img>`.
- [ ] **Step 4:** `Diagram` — render `diagram.nodes/edges` as an inline SVG (horizontal flow), token colors, CSS scroll-in animation. `ProjectNav` — prev/next links + "↩ 간트로" (`/s/gantt-cpm`).
- [ ] **Step 5:** `npm run build` + `npm run lint`. Commit `feat(projects): block components`.

---

### Task 4: Routes `/projects/[slug]` and `/projects`

**Files:**
- Create: `src/app/projects/[slug]/page.tsx`
- Create: `src/app/projects/page.tsx`
- Create: `src/app/projects/projects-page.module.css` (if needed)

**Interfaces:**
- Consumes: `enabledProjects()`, `projectBySlug()`, block components.

- [ ] **Step 1:** `[slug]/page.tsx` — `generateStaticParams()` from `enabledProjects()`; `generateMetadata` (title/description mirroring `/s/[scene]`); compose `Hero → MetricGrid → Prose → Gallery → Diagram → StackTags → ProjectNav`; `notFound()` on unknown/disabled slug; `<main>` landmark + single `<h1>`.
- [ ] **Step 2:** `projects/page.tsx` — card grid (title, company, period, top KPI, first gallery thumb) linking to each slug.
- [ ] **Step 3:** `npm run build`. Expected: `/projects` + each enabled `/projects/<slug>` in the static output.
- [ ] **Step 4:** Headless check — load `/projects/work-radar`, assert hero title + ≥1 image + metrics render (DOM eval, per project verification convention).
- [ ] **Step 5:** Commit `feat(projects): [slug] + index routes`.

---

### Task 5: Curate the 12 content objects

**Files:**
- Create: `src/content/projects/<slug>.ts` × 12 (from Task 2 drafts, curated)
- Modify: `src/content/projects/index.ts` (import all 12)
- Delete: the `.draft.ts` files

**Interfaces:** Consumes drafts; produces final `ProjectContent` exports registered in `index.ts`.

- [ ] **Step 1:** Curate the 4 SolarEdge docs (mes-console, dv-data, traceability, process-data) — tighten summary, pick 2–4 headline metrics each, clean sections, verify image paths.
- [ ] **Step 2:** Curate legacy 5–8 (samsung-logistics, idle-equipment, line-innovation, smart-factory) from the `Portfolio_Korean_v2.md` slices.
- [ ] **Step 3:** Curate work-radar — 11-shot gallery, hand-author the `diagram` (Signals→Shape→Work→Govern→Learn), spec table → metrics/stack.
- [ ] **Step 4:** Curate notion-os; curate mirrorless + kh-project with `enabled: true` (togglable). Register all 12 in `index.ts`; delete drafts.
- [ ] **Step 5:** `npm run build` + headless spot-check 3 routes. Commit `feat(projects): curated content for 12 projects`.

---

### Task 6: Gantt integration

**Files:**
- Modify: `public/lab/gantt-cpm.html` (COMPANIES/PROJECTS `slug` fields, `docTo()`, detail-panel button, `openDetail` wiring)

**Interfaces:** Consumes `slug` values matching `manifest.ts`/content `ganttId`.

- [ ] **Step 1:** Add `slug:'<slug>'` to the ~12 mapped items in `COMPANIES`/`PROJECTS`.
- [ ] **Step 2:** Add `docTo(slug)` mirroring `rewindToScene()` (same `window.top.location.href` guard). Add `<button class="vp-rewind" id="dDoc">📄 프로젝트 문서 →</button>` in the detail panel markup.
- [ ] **Step 3:** In `openDetail(t)`, show `#dDoc` only when `t.slug`, wire `onclick=()=>docTo(t.slug)`; hide otherwise.
- [ ] **Step 4:** `npm run build`; headless — open `/s/gantt-cpm`, click a mapped bar, assert `#dDoc` visible and href target correct; verify unmapped bar hides it.
- [ ] **Step 5:** Commit `feat(gantt): 프로젝트 문서 버튼 → /projects/[slug]`.

---

### Task 7: Landing polish + final verification

**Files:**
- Modify: `src/components/landing/Landing.tsx` (optional: confirm "Projects" copy; no route change)
- Verify only: full build + lint + headless sweep

- [ ] **Step 1:** Confirm "Projects" nav still points to `/s/gantt-cpm` (unchanged); no edit unless copy tweak wanted.
- [ ] **Step 2:** `npm run build` + `npm run lint` — exit 0, clean.
- [ ] **Step 3:** Headless sweep: `/projects`, 3 sample `/projects/<slug>`, `/s/gantt-cpm` doc button → target route. Confirm images load, no console errors.
- [ ] **Step 4:** Toggle `mirrorless.enabled=false`, rebuild, confirm route 404s + index omits it; toggle back on.
- [ ] **Step 5:** Commit `chore(projects): final verification`.

## Self-Review

- **Spec coverage:** §1 model→T1; §2 ingestion→T2; §3 project set→T2 manifest+T5; §4 blocks→T3; §5 routes→T4; §6 gantt→T6; resume out-of-scope respected (no task touches it). ✓
- **Placeholders:** none — each task names exact files and concrete deliverables. ✓
- **Type consistency:** `ProjectContent`, `renderInline`, `enabledProjects/projectBySlug`, `COMPANY_ACCENT`, `docTo` used consistently across tasks. ✓
