# 포트폴리오 4관점 재구조화 + 콘텐츠 개편 — 실행 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 27개 시안의 분류축을 5막 서사 → 4관점(프로젝트+경력·스킬·철학·지식관리)으로 교체하고, 활성 22개 시안 콘텐츠를 한 시안=하나의 관심사로 전면 재작성한다.

**Architecture:** `registry.ts`의 `SECTIONS`/`section`을 `PERSPECTIVES`/`perspective`(+`cluster`/`status`)로 교체 → 홈(`page.tsx`)·조합(`compositions/index.ts`)·릴(`reel.json`)이 이를 읽도록 갱신(Phase A). 그 후 각 시안 HTML(`public/lab/NN-*.html`)을 볼트 근거로 재작성(Phase B). 빌드 그린 + 헤드리스 렌더로 검증.

**Tech Stack:** Next.js(App Router) · TypeScript · self-contained HTML 시안 · CSS 변수 테마(`ThemeProvider`) · `npm run build`/`start`.

**원천(읽기 전용 근거):**
- 이력서 HTML: `/Users/davidpark/Library/CloudStorage/OneDrive-개인/Obsidian/400_Areas/Resume/Newest/Park_Yangha_Resume_Editorial.html`
- 포트폴리오: `…/400_Areas/PORTFOLIO/Portfolio_Korean_v2.md`
- 프로젝트: `…/300_Projects/2510 Notion System/`, `…/300_Projects/2606 Work Radar/`
- 스킬: `public/resume.json`(skills), `…/600_Tech Stack/**`
- 철학: `…/400_Areas/PORTFOLIO/Portfolio_Korean_v2.md`(서문), 이력서 커버레터(위 HTML p.2), `…/500_Resources/문제분석/**`
- 지식관리: `…/000_System/AGENTS.md`, `…/600_Tech Stack/AI Agent/{LLM Wiki,GraphRAG,Decision OS}.md`, `…/600_Tech Stack/Data/ssot-data-architecture.md`
- 설계 스펙: `docs/superpowers/specs/2026-06-15-portfolio-4-perspective-restructure-design.md`

**불변 규칙:** 지표 owner 1:1(중복 금지, 전부 프로젝트+경력 관점) · 브랜드/실명 비표기(뷰티 매장 SW 제품명·이전 직장명·DB 실프로젝트명 금지) · 글/시/에세이 제외 · push 금지(로컬 전용) · 각 시안의 `anim`(릴 durationMs 기준) 동작 보존.

---

## Phase A — 구조 리팩터 (5막 → 4관점)

### Task A1: 레지스트리를 4관점으로 교체

**Files:**
- Modify: `src/scenes/registry.ts`

- [ ] **Step 1: `SceneSection`/`SECTIONS`를 `Perspective`/`PERSPECTIVES`로 교체**

`SceneSection` 인터페이스와 `SECTIONS` 배열을 아래로 대체:

```ts
export interface Perspective {
  id: string
  n: string
  title: string
  blurb: string
}

export const PERSPECTIVES: Perspective[] = [
  { id: 'entry', n: '0', title: '진입', blurb: '부팅 = 커리어의 시작점. 단 한 번.' },
  { id: 'project-career', n: '1', title: '프로젝트 + 경력', blurb: '자기주도 제품과 제조 현장 경력 — 실제로 만들어 성과를 낸 것.' },
  { id: 'skill', n: '2', title: '스킬', blurb: '어떻게 만드는가 — 기술 역량 그 자체.' },
  { id: 'philosophy', n: '3', title: '철학', blurb: '왜 그렇게 일하는가 — 일하는 사고원칙.' },
  { id: 'knowledge', n: '4', title: '지식관리', blurb: '지식을 운영 시스템으로.' },
]
```

- [ ] **Step 2: `Scene` 인터페이스에 `perspective`/`cluster`/`status` 반영**

`Scene` 인터페이스에서 `section: string` 줄을 아래 3줄로 교체:

```ts
  perspective: string // PERSPECTIVES.id
  cluster?: 'project' | 'career' // 'project-career' 관점 내 서브그룹
  status?: 'active' | 'parked' // 미지정 = active. parked는 홈/릴 제외
```

- [ ] **Step 3: `SCENES` 배열을 아래 27행으로 전량 교체**

(각 행의 `section`→`perspective`, `cluster`/`status` 추가. `bg`/`featured`는 보존. `title`/`domain`/`blurb`/`owns`는 Phase B에서 콘텐츠와 함께 다듬으므로 여기서는 분류 필드만 정확히.)

```ts
export const SCENES: Scene[] = [
  // 진입
  { id: '05', slug: 'bios-boot', file: '05-bios-boot.html', title: 'BIOS / POST 부팅', domain: '펌웨어', perspective: 'entry', bg: '#050805', blurb: '시스템 부팅 = 커리어 시작점. 인트로 전용.' },

  // 프로젝트 + 경력 — 프로젝트(자기주도)
  { id: '03', slug: 'pipeline-dag', file: '03-pipeline-dag.html', title: 'Notion OS — 조직 운영 시스템', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#0c0e12', featured: true, blurb: '회의→결정→OKR→백로그→PRD→Runbook을 잇는 조직 운영 OS.' },
  { id: '13', slug: 'radar-sonar', file: '13-radar-sonar.html', title: 'Work Radar — AI 워크플로우 콕핏', domain: '프로젝트', perspective: 'project-career', cluster: 'project', bg: '#060a08', featured: true, blurb: 'local-first AI 콕핏 11 서피스. 신호 수집·시간 배치·agent 거버넌스.' },

  // 프로젝트 + 경력 — 경력(제조 3社)
  { id: '20', slug: 'instrument-rack', file: '20-instrument-rack.html', title: '은성 — 생산관리·원가', domain: '경력·은성', perspective: 'project-career', cluster: 'career', bg: '#0b0d0f', owns: '운영경비 −85%', blurb: '배터리팩 생산관리. 운영경비 −85%·불량 0건의 단독 무대.' },
  { id: '02', slug: 'assembly-line', file: '02-assembly-line.html', title: '이랜텍 — 라인 생산성', domain: '경력·이랜텍', perspective: 'project-career', cluster: 'career', bg: '#0d0d0d', featured: true, owns: 'C/T −49% · 생산성 +24%', blurb: 'LOB·C/T 분석 기반 라인 개선. C/T −49%·생산성 +24%의 단독 무대.' },
  { id: '18', slug: 'sonar-waterfall', file: '18-sonar-waterfall.html', title: '이랜텍 — 초음파 용착 DOE', domain: '경력·이랜텍', perspective: 'project-career', cluster: 'career', bg: '#060a10', owns: '용착 15%→0%', blurb: '스팟·레이저·초음파 용착 DOE. 용착 15%→0%의 단독 무대.' },
  { id: '15', slug: 'scada-hmi', file: '15-scada-hmi.html', title: '이랜텍/삼성 — SCM·재고', domain: '경력·SCM', perspective: 'project-career', cluster: 'career', bg: '#0e1217', owns: '재고회전율 +17%', blurb: '삼성 상생아카데미 SCM 개선. 재고회전율 +17%의 단독 무대.' },
  { id: '17', slug: 'gantt-cpm', file: '17-gantt-cpm.html', title: '솔라엣지 — 공정 데이터 관리', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#f5f3ee', featured: true, owns: '사무공수 −451분 · ST −50%', blurb: '데이터 통합 관리. 사무공수 −451분·ST −50%의 단독 무대.' },
  { id: '01', slug: 'mes-console', file: '01-mes-console.html', title: '솔라엣지 — MES 구축', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#0a0a0c', featured: true, blurb: '신제품 라인 MES 자체 개발·운영 체계 구축.' },
  { id: '12', slug: 'cmm-metrology', file: '12-cmm-metrology.html', title: '솔라엣지 — 추적성·검사', domain: '경력·솔라엣지', perspective: 'project-career', cluster: 'career', bg: '#0a0e14', owns: 'S/N 추적성', blurb: 'S/N 추적성·검사성적서 자동발행. 추적성의 단독 무대.' },

  // 스킬
  { id: '11', slug: 'weld-thermal', file: '11-weld-thermal.html', title: '산업 용접 기술', domain: '공정기술', perspective: 'skill', bg: '#0a0410', blurb: '스팟·레이저 용접 공정 기술과 조건 설계.' },
  { id: '16', slug: 'robot-pendant', file: '16-robot-pendant.html', title: '설비·로봇 티칭', domain: '설비', perspective: 'skill', bg: '#0c0e12', blurb: '설비 기술·로봇 티칭·레시피(작업 프로그램) 설계.' },
  { id: '19', slug: 'pid-scheme', file: '19-pid-scheme.html', title: '시스템 토폴로지', domain: '아키텍처', perspective: 'skill', bg: '#0c0f14', blurb: 'ISA-5.1 도면 언어로 그린 시스템 토폴로지/아키텍처.' },
  { id: '22', slug: 'db-architecture', file: '22-db-architecture.html', title: 'DB 모델링', domain: '데이터·DB', perspective: 'skill', bg: '#0c0f14', featured: true, blurb: '유명·장대한 DB 스키마 예제로 보는 데이터 모델링 역량.' },

  // 철학
  { id: '06', slug: 'digital-twin', file: '06-digital-twin.html', title: '도메인 지식의 미래 유용성', domain: '크로스도메인', perspective: 'philosophy', bg: '#0b0b0d', featured: true, blurb: '제조+개발+AI 이해도 — 다가올 시대에 크로스도메인이 갖는 가치.' },
  { id: '08', slug: 'living-spreadsheet', file: '08-living-spreadsheet.html', title: '코딩의 기원', domain: '크로스도메인', perspective: 'philosophy', bg: '#e9eef0', blurb: '엑셀 자동화에서 시작된 코딩 — 현장에서 도구로 건너간 길.' },
  { id: '09', slug: 'oscilloscope', file: '09-oscilloscope.html', title: '품질에 철저한 성격', domain: '품질', perspective: 'philosophy', bg: '#0a0e0c', blurb: '스팟 용접 검사 — 품질과 타협하지 않는 검사 기준.' },
  { id: '24', slug: 'delegation-cost', file: '24-delegation-cost.html', title: '위임 = 비용 이동', domain: '사상', perspective: 'philosophy', bg: '#0c0d10', blurb: '"위임은 비용을 옮길 뿐" — 하네스 사고(포카요케).' },

  // 지식관리
  { id: '04', slug: 'ai-latent', file: '04-ai-latent.html', title: '볼트 semantic map', domain: '지식·AI', perspective: 'knowledge', bg: '#07080d', blurb: 'BGE-M3→UMAP→HDBSCAN 볼트 임베딩 의미맵. 그대로 유지.' },
  { id: '23', slug: 'agent-governance', file: '23-agent-governance.html', title: 'Boule 거버넌스', domain: 'AI 거버넌스', perspective: 'knowledge', bg: '#0a0d0f', featured: true, blurb: '권한·중단조건·인간승인 경계가 먼저인 자동 개발 거버넌스.' },
  { id: '25', slug: 'decision-os', file: '25-decision-os.html', title: 'Decision OS', domain: '의사결정', perspective: 'knowledge', bg: '#0a0d12', blurb: '결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger.' },
  { id: '26', slug: 'graphrag', file: '26-graphrag.html', title: 'GraphRAG / 신경-기호', domain: 'AI', perspective: 'knowledge', bg: '#080a0f', blurb: 'Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉.' },

  // 보류 (parked) — 홈/릴 제외, 콘텐츠 작업 안 함
  { id: '07', slug: 'gcode-printer', file: '07-gcode-printer.html', title: 'G-code 3D 프린터 빌드', domain: '적층제조', perspective: 'project-career', cluster: 'project', status: 'parked', bg: '#0e1116', blurb: '하드웨어 개발 후보 — 보류.' },
  { id: '10', slug: 'pcb-board', file: '10-pcb-board.html', title: 'PCB 회로기판', domain: '하드웨어', perspective: 'project-career', cluster: 'project', status: 'parked', bg: '#07140d', blurb: '하드웨어 개발 후보 — 보류.' },
  { id: '14', slug: 'fluid-power', file: '14-fluid-power.html', title: '유압 / 공압 회로도', domain: '설비', perspective: 'skill', status: 'parked', bg: '#0a1426', blurb: '추후 제거 예정 — 보류.' },
  { id: '21', slug: 'windtunnel-cfd', file: '21-windtunnel-cfd.html', title: '풍동 / CFD 유동해석', domain: '기구설계', perspective: 'skill', status: 'parked', bg: '#07101c', blurb: '쓸 곳 미정 — 보류.' },
  { id: '27', slug: 'writer-philosophy', file: '27-writer-philosophy.html', title: '(구) 작가', domain: '인문', perspective: 'philosophy', status: 'parked', bg: '#f1ede3', blurb: '폐기 예정 — 보류.' },
]
```

- [ ] **Step 4: 헬퍼를 perspective 기반으로 교체**

파일 하단 헬퍼에서 `scenesBySection`을 아래로 교체(`sceneById`/`featuredScenes`는 유지하되 parked 제외):

```ts
export const sceneById = (id: string) => SCENES.find((s) => s.id === id || s.slug === id)
export const activeScenes = () => SCENES.filter((s) => s.status !== 'parked')
export const featuredScenes = () => activeScenes().filter((s) => s.featured)
export const scenesByPerspective = (pid: string) =>
  activeScenes().filter((s) => s.perspective === pid)
export const scenesByCluster = (pid: string, cluster: 'project' | 'career') =>
  scenesByPerspective(pid).filter((s) => s.cluster === cluster)
```

- [ ] **Step 5: 타입체크**

Run: `cd /Users/davidpark/private_project/portfolio && npx tsc --noEmit -p tsconfig.json`
Expected: `registry.ts` 관련 에러 없음. (다른 파일은 `section`/`scenesBySection` 참조로 에러 — A2에서 해결.)

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/registry.ts
git commit -m "refactor: 레지스트리 5막 SECTIONS → 4관점 PERSPECTIVES"
```

### Task A2: 홈을 4관점으로 렌더

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: import 교체**

`src/app/page.tsx:3` 을 아래로 교체:

```ts
import { PERSPECTIVES, scenesByPerspective, scenesByCluster } from '@/scenes/registry'
```

- [ ] **Step 2: 시안 섹션(54–84행) 교체**

기존 "27 scenes grouped into the 5-act narrative" `<section>`(54–84행)을 아래로 교체. `project-career` 관점만 프로젝트/경력 두 서브그룹으로, 나머지는 단일 그리드. 카드 마크업(`Link`…)은 기존 67–79행과 동일하게 유지.

```tsx
      {/* 4관점 */}
      <section className="mt-20">
        <h2 className="font-serif text-3xl font-semibold" style={{ color: 'var(--ink)' }}>4관점으로 보기</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>프로젝트+경력 · 스킬 · 철학 · 지식관리. 각 지표는 단 한 시안이 소유합니다.</p>
        {PERSPECTIVES.filter((p) => p.id !== 'entry').map((p) => {
          const groups =
            p.id === 'project-career'
              ? [
                  { label: '프로젝트 (자기주도)', scenes: scenesByCluster(p.id, 'project') },
                  { label: '경력 (제조 현장)', scenes: scenesByCluster(p.id, 'career') },
                ]
              : [{ label: '', scenes: scenesByPerspective(p.id) }]
          return (
            <div key={p.id} className="mt-12">
              <div className="flex items-baseline gap-3 border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                <span className="font-serif text-2xl font-semibold" style={{ color: 'var(--accent)' }}>{p.n}</span>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{p.title}</h3>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.blurb}</span>
              </div>
              {groups.map((g) => (
                <div key={g.label || p.id} className="mt-4">
                  {g.label && <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{g.label}</div>}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {g.scenes.map((s) => (
                      <Link key={s.id} href={`/s/${s.slug}`} className="group flex gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--accent)]" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
                        <span className="mt-0.5 h-10 w-10 flex-none rounded-md border" style={{ background: s.bg, borderColor: 'var(--line)' }} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{s.id}</span>
                            <span className="truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>{s.title}</span>
                            {s.featured && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#000' }}>★</span>}
                          </div>
                          <div className="mt-0.5 text-[11px]" style={{ color: 'var(--accent)' }}>{s.domain}</div>
                          {s.owns && <div className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in oklab, var(--accent) 18%, transparent)', color: 'var(--ink)' }}>소유: {s.owns}</div>}
                          <p className="mt-1 line-clamp-2 text-xs leading-snug" style={{ color: 'var(--muted)' }}>{s.blurb}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </section>
```

- [ ] **Step 3: 빌드**

Run: `cd /Users/davidpark/private_project/portfolio && npm run build`
Expected: 성공. 정적 페이지 생성(parked 5개 포함 27 시안 라우트는 여전히 존재 — 홈에서만 숨김).

- [ ] **Step 4: 커밋**

```bash
git add src/app/page.tsx
git commit -m "feat: 홈을 4관점(프로젝트+경력/스킬/철학/지식관리)으로 렌더"
```

### Task A3: 조합(compositions) 4관점으로 재구성

**Files:**
- Modify: `src/compositions/index.ts`

- [ ] **Step 1: `COMPOSITIONS` 배열을 아래로 교체** (parked 시안 미포함, active id만 사용)

```ts
export const COMPOSITIONS: Composition[] = [
  {
    slug: 'overview',
    title: '전체 투어 (4관점)',
    audience: '처음 보는 사람',
    blurb: '프로젝트+경력 → 스킬 → 철학 → 지식관리. 한 사람을 보는 네 각도.',
    scenes: ['13', '02', '22', '06', '23'],
  },
  {
    slug: 'project-career',
    title: '프로젝트 + 경력',
    audience: '채용·리더',
    blurb: '미러리스/개인 제품과 제조 3社 경력 — 실제로 성과를 낸 것.',
    scenes: ['03', '13', '20', '02', '18', '15', '17'],
  },
  {
    slug: 'skill',
    title: '스킬',
    audience: '기술 면접',
    blurb: '공정기술부터 데이터 모델링까지 — 어떻게 만드는가.',
    scenes: ['11', '16', '19', '22'],
  },
  {
    slug: 'philosophy',
    title: '철학',
    audience: '문화 적합성',
    blurb: '크로스도메인·품질·위임 — 왜 그렇게 일하는가.',
    scenes: ['06', '08', '09', '24'],
  },
  {
    slug: 'knowledge',
    title: '지식관리',
    audience: 'AI·플랫폼',
    blurb: '지식을 운영 시스템으로 — 거버넌스·결정·검색.',
    scenes: ['04', '23', '25', '26'],
  },
]
```

- [ ] **Step 2: 빌드 + 커밋**

Run: `npm run build` → 성공 확인 후:

```bash
git add src/compositions/index.ts
git commit -m "feat: 조합을 4관점 축으로 재구성"
```

### Task A4: 릴(reel.json) 4관점 순서로 재정렬 + parked 제외

**Files:**
- Modify: `content/reel.json`

- [ ] **Step 1: `reel` 배열을 4관점 순서로 재정렬하고 parked(07·10·14·21·27) `include:false` 설정**

`reel` 배열의 항목 순서를 아래로 변경(각 항목의 `slug`/`file`/`durationMs`/`anim`은 기존 값 보존, `include`만 규칙대로): 05(false, 인트로) → 03·13·20·02·18·15·17·01·12 → 11·16·19·22 → 06·08·09·24 → 04·23·25·26 (모두 include:true) → 07·10·14·21·27 (include:false, parked).

규칙: parked 5개와 05는 `include:false`, 나머지 21개 active는 `include:true`. (재생 21개 = active 22 − 인트로 전용 05.)

- [ ] **Step 2: 동기화 검증 스크립트 실행**

Run:
```bash
cd /Users/davidpark/private_project/portfolio && node -e '
const reel = require("./content/reel.json").reel;
const parked = ["07","10","14","21","27"];
const bad = reel.filter(r => (parked.includes(r.id) || r.id==="05") ? r.include : !r.include);
console.log(bad.length ? "MISMATCH:"+bad.map(r=>r.id) : "OK: include flags consistent");
console.log("playing:", reel.filter(r=>r.include).length);
'
```
Expected: `OK: include flags consistent` / `playing: 21`

- [ ] **Step 3: 커밋**

```bash
git add content/reel.json
git commit -m "feat: 릴을 4관점 순서로 재정렬 + 보류 5개 제외"
```

### Task A5: Phase A 통합 검증

- [ ] **Step 1: 빌드 + 기동**

Run: `cd /Users/davidpark/private_project/portfolio && npm run build && (npm run start &) && sleep 6`

- [ ] **Step 2: 헤드리스로 홈 + 인트로 확인**

Playwright MCP로 `http://localhost:3000/` 스냅샷 → 4관점 4개 그룹 + 프로젝트/경력 서브그룹 표시 확인. `http://localhost:3000/?intro` → 인트로 릴이 21개 active만 재생하는지 확인(parked 미등장). 스크린샷은 검증 후 정리.

- [ ] **Step 3: owner 1:1 점검**

Run:
```bash
cd /Users/davidpark/private_project/portfolio && node -e '
const {SCENES}=require("./src/scenes/registry.ts");' 2>/dev/null || node -e '
const fs=require("fs");const t=fs.readFileSync("src/scenes/registry.ts","utf8");
const owns=[...t.matchAll(/owns:\s*\x27([^\x27]+)\x27/g)].map(m=>m[1]);
const dup=owns.filter((v,i)=>owns.indexOf(v)!==i);
console.log(dup.length?"DUP owns:"+dup:"OK: owns unique ("+owns.length+")");
'
```
Expected: `OK: owns unique` (중복 owner 없음).

- [ ] **Step 4: 서버 종료**

Run: `pkill -f "next start" || true`

---

## Phase B — 시안 콘텐츠 재작성 (활성 22개)

> **Phase B 시안 재작성 공통 절차** (각 Task B-NN에 동일 적용, 반복 기재 생략):
> 1. 대상 `public/lab/NN-*.html`을 읽는다(self-contained: HTML+CSS+JS 한 파일).
> 2. 브리프의 **원천 파일**을 읽어 사실을 확보한다(추론 금지, 문서에 적힌 것만).
> 3. **시각 메타포·애니메이션 구조는 보존**한다(릴 `durationMs`가 이 동작 길이를 가정). 텍스트/라벨/수치/카피만 새 관심사로 교체.
> 4. 브리프의 **must-include**를 반영하고 **must-exclude**(브랜드·실명·타 관심사·중복 지표)를 제거한다.
> 5. `owns` 지표가 있으면 그 시안에서만 강조(다른 시안엔 등장 금지).
> 6. 헤드리스 렌더 검증: Playwright MCP로 `http://localhost:3000/s/<slug>` 스냅샷, 깨짐/빈 영역 없음 확인. 스크린샷 정리.
> 7. 커밋: `git add public/lab/NN-*.html && git commit -m "content: NN <한줄>"`.
>
> 실행 권장: 관점 그룹 단위로 병렬 서브에이전트 배치(동시 ≤4 — 5개 이상 시 socket 사망 이력). 각 에이전트는 위 절차 + 자기 브리프만 수행.
>
> **검증 서버**: Phase B 시작 시 `npm run build && (npm run start &)` 한 번 띄워두고 각 시안 렌더 검증, 종료 시 `pkill -f "next start"`.

### 프로젝트 (자기주도)

- [ ] **Task B-03 — Notion OS** (`03-pipeline-dag.html`, owns 없음)
  - 원천: `…/300_Projects/2510 Notion System/2510 Notion OS.md`
  - 관심사: 조직 운영 시스템. must-include: 회의→결정(Decision Ledger)→OKR/KPI→백로그/에픽/PRD→운영 Runbook 흐름, AI Reconciliation(회의록→결정 후보), SSOT 거버넌스. must-exclude: 회사 내부 민감 정보.
- [ ] **Task B-13 — Work Radar** (`13-radar-sonar.html`, owns 없음)
  - 원천: `…/300_Projects/2606 Work Radar/Work Radar 프로젝트 포트폴리오.md`
  - 관심사: local-first AI 콕핏. must-include: 11 서피스(Capture Board·Today Timeline·Control Room 등), Boule readiness gate, Tauri2+Rust+SQLite. must-exclude: KH 잔재(구 레이더 콘텐츠).

### 경력 (제조 3社) — 이력서 HTML + 포트폴리오 근거

- [ ] **Task B-20 — 은성 생산관리** (`20-instrument-rack.html`, **owns 운영경비 −85%**)
  - 원천: 이력서 HTML(은성 entry + 커버레터 은성 문단), `Portfolio_Korean_v2.md` #8.
  - must-include: 운영경비 −85%, 불량 0건, 원가 재분석→단가 30%↑, 비전검사 도입, ERP/IATF16949. must-exclude: 타 회사 지표.
- [ ] **Task B-02 — 이랜텍 라인 생산성** (`02-assembly-line.html`, **owns C/T −49% · 생산성 +24%**)
  - 원천: 이력서 HTML(이랜텍 entry + 커버레터), `Portfolio_Korean_v2.md` #7.
  - must-include: Jig 개발 C/T 31~49%↓, LOB 생산성 +24%. must-exclude: 용착 불량(→B-18로 분리), 재고(→B-15).
- [ ] **Task B-18 — 이랜텍 초음파 용착** (`18-sonar-waterfall.html`, **owns 용착 15%→0%**)
  - 원천: 이력서 HTML(이랜텍), `Portfolio_Korean_v2.md` #7(용착 DOE).
  - must-include: 스팟·레이저·초음파 용착 DOE, 불량 15%→0%, 재작업/폐기 절감. (음파 시각화=초음파 메타포 활용) must-exclude: C/T·생산성(→B-02).
- [ ] **Task B-15 — 이랜텍/삼성 SCM** (`15-scada-hmi.html`, **owns 재고회전율 +17%**)
  - 원천: 이력서 HTML(이랜텍 SCM + 삼성 아카데미 활동), `Portfolio_Korean_v2.md` #5.
  - must-include: 재고회전율 +17%, 면책구역·전산 프로세스·3정5S. must-exclude: 구 "지식 볼트 운영 OS" 잔재(→지식관리 관점), 타 지표.
- [ ] **Task B-17 — 솔라엣지 데이터 관리** (`17-gantt-cpm.html`, **owns 사무공수 −451분 · ST −50%**)
  - 원천: 이력서 HTML(솔라엣지 + 커버레터 451분/ST 문단), `Portfolio_Korean_v2.md` #4, 이력서 Key Achievements 차트(6지표).
  - must-include: 사무공수 −451분/일(연 5천만), ST −50%, DB/대시보드 통합. 선택: Key Achievements 6지표 스코어카드 재현. must-exclude: 추적성(→B-12).
- [ ] **Task B-01 — 솔라엣지 MES** (`01-mes-console.html`, owns 없음)
  - 원천: 이력서 HTML(솔라엣지 MES 구축), `Portfolio_Korean_v2.md` #1.
  - must-include: 신제품 라인 MES 자체 개발(외주비 누락 대응), OPC UA·Django·React·PostgreSQL, PFMEA/CP/PFD/SOP. must-exclude: 451분/ST(→B-17).
- [ ] **Task B-12 — 솔라엣지 추적성** (`12-cmm-metrology.html`, **owns S/N 추적성**)
  - 원천: 이력서 HTML(솔라엣지 추적성), `Portfolio_Korean_v2.md` #3(Core Value Award).
  - must-include: S/N 기반 추적성, 검사성적서 자동발행, 부품 혼입 방지, Core Value Award. must-exclude: 정량 지표(추적성은 정성 owner).

### 스킬

- [ ] **Task B-11 — 산업 용접 기술** (`11-weld-thermal.html`)
  - 원천: 이력서 Skills("산업용접 스팟·레이저·초음파"), 이력서 이랜텍 entry.
  - 관심사: 용접 공정 기술/조건 설계(기법 자체). must-exclude: 불량 15%→0% 성과 수치(그건 B-18 소유).
- [ ] **Task B-16 — 설비·로봇 티칭** (`16-robot-pendant.html`)
  - 원천: 이력서 Skills("로봇 티칭·비전 검사·설비 PM/BM·4M"), 유휴설비 재활용(`Portfolio_Korean_v2.md` #6).
  - 관심사: 설비 기술·로봇 티칭·레시피(작업 프로그램) 설계.
- [ ] **Task B-19 — 시스템 토폴로지** (`19-pid-scheme.html`, ⚠️ 테마색)
  - 원천: `…/600_Tech Stack/Architecture/**`, 기존 P&ID 콘텐츠.
  - 관심사: ISA-5.1 도면으로 그린 시스템 토폴로지/아키텍처. **추가 작업**: 라이트 배경(`bg:#eef0e8` 흔적)을 테마 변수에 맞춰 다크 테마에서도 어울리게 보정(시안 내부 CSS를 `prefers-color-scheme`/테마 변수 또는 다크 기본으로). 렌더 시 배경-텍스트 대비 확인.
- [ ] **Task B-22 — DB 모델링** (`22-db-architecture.html`)
  - 원천: `…/600_Tech Stack/Data/ssot-data-architecture.md`, `…/600_Tech Stack/SQL/**`.
  - 관심사: DB 모델링 역량. must-include: 유명·장대한 공개 도메인 DB 스키마 예제(예: 대형 e-commerce/SNS 류 — 가상/일반), 정규화·인덱싱·CDC. **must-exclude: 실제 프로젝트/회사명**.

### 철학

- [ ] **Task B-06 — 도메인 지식의 미래 유용성** (`06-digital-twin.html`)
  - 원천: 이력서 커버레터(역량 전환·"현장+데이터"·강점 문단), `Portfolio_Korean_v2.md` 서문.
  - 관심사: 제조+개발+AI 크로스도메인 이해도가 다가올 시대에 갖는 가치. **고도화**: 더미 데이터를 풍부히 넣어 3D 트윈을 설명형 자료로. must-exclude: 특정 제품 브랜드.
- [ ] **Task B-08 — 코딩의 기원** (`08-living-spreadsheet.html`, ⚠️ 이미지 deferred)
  - 원천: 이력서 커버레터(솔라엣지 451분 문단 = 엑셀→DB 전환 서사), `Portfolio_Korean_v2.md` #4.
  - 관심사: 엑셀 자동화에서 코딩으로 건너간 길(크로스도메인). **참고 이미지는 사용자 추후 제공** → 자리(placeholder slot)만 마련하고 TODO 주석. must-exclude: 451분 수치 강조(그건 B-17 owner) — 여기선 "기원 서사"로만.
- [ ] **Task B-09 — 품질에 철저한 성격** (`09-oscilloscope.html`)
  - 원천: 이력서 커버레터(품질·비전검사 판단), 신념 3원칙("품질과 타협하지 않는다").
  - 관심사: 스팟 용접 검사 등 검사 기준에 철저한 성격(품질 불타협). must-exclude: ST −50% 수치(구 owner였음 → 이제 B-17).
- [ ] **Task B-24 — 위임 = 비용 이동** (`24-delegation-cost.html`)
  - 원천: `…/600_Tech Stack/AI Agent/**`(하네스), 기존 위임 콘텐츠.
  - 관심사: "위임은 비용을 옮길 뿐" 인터랙티브 + 하네스(포카요케) 사고. 유지 위주, 글/에세이 톤 제거.

### 지식관리

- [ ] **Task B-04 — semantic map** (`04-ai-latent.html`)
  - **변경 최소**: 사용자가 "그대로 놔둬" 지정. 원천: `…/000_System/scripts/semantic_map.py` 개념. 관심사 라벨이 지식관리와 맞는지만 확인, 콘텐츠 대규모 재작성 불필요. 렌더 확인 후 커밋(또는 무변경 시 skip).
- [ ] **Task B-23 — Boule 거버넌스** (`23-agent-governance.html`)
  - 원천: `…/300_Projects/2606 Work Radar/`(Control Room/Boule), `…/600_Tech Stack/AI Agent/**`.
  - 관심사: 권한·중단조건·인간승인 경계 우선의 자동 개발 거버넌스(지식/운영 시스템 측면).
- [ ] **Task B-25 — Decision OS** (`25-decision-os.html`)
  - 원천: `…/600_Tech Stack/AI Agent/Decision OS.md`.
  - 관심사: 결정론적 Gate→Score→Cap→Tiebreaker·append-only Ledger.
- [ ] **Task B-26 — GraphRAG** (`26-graphrag.html`)
  - 원천: `…/600_Tech Stack/AI Agent/GraphRAG.md`.
  - 관심사: Leiden 커뮤니티 그래프·벡터↔그래프 멀티홉·검증가능성×설명가능성.

### Task B-FINAL: 콘텐츠 통합 검증

- [ ] **Step 1: 전체 빌드**

Run: `cd /Users/davidpark/private_project/portfolio && npm run build`
Expected: 성공(정적 페이지 생성).

- [ ] **Step 2: blurb/owns ↔ 콘텐츠 정합 점검**

각 active 시안의 registry `blurb`/`owns`/`title`이 재작성된 HTML과 일치하도록 `registry.ts` 최종 동기화(필요 시 수정 후 빌드).

- [ ] **Step 3: 인트로 릴 durationMs 재확인**

콘텐츠 재작성으로 애니 길이가 바뀐 시안이 있으면 `content/reel.json`의 해당 `durationMs` 조정. `npm run start` → `?intro`로 릴 흐름 육안 확인.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A && git commit -m "content: 22개 활성 시안 4관점 콘텐츠 정합 마무리"
```

---

## 자기 검토 메모 (플랜 작성자)

- **스펙 커버리지**: 4관점 정의(A1 PERSPECTIVES)·매핑 27행(A1 SCENES)·홈(A2)·조합(A3)·릴(A4)·콘텐츠 22개(B-*)·테마 #19(B-19)·금지규칙(각 브리프 must-exclude)·deferred(07/10/14/21/27 parked, #08 이미지 placeholder) 모두 태스크 존재. ✓
- **지표 owner 1:1**: A5-Step3 자동 점검 + 각 경력 브리프 must-exclude로 강제. owner 7개(−85/C/T·생산성/용착/재고/451·ST/추적성) 전부 project-career. ✓
- **금지**: 뷰티 매장 SW 제품명·이전 직장명·DB 실명·글에세이 → 해당 브리프 must-exclude 명시(B-13·B-22·B-08·B-09·B-24). ✓
- **타입 정합**: `perspective`/`cluster`/`status` 필드명이 A1(정의)·A2(`scenesByPerspective`/`scenesByCluster`)·A4 점검 스크립트에서 일관. ✓
