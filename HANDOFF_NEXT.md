# 다음 세션 인계 — 27 시안을 4관점으로 재구조화 + 콘텐츠 전면 개편

> 작성: 이전 세션. **git이 진실원.** 이 문서의 주장은 git/파일로 검증할 것.

## 1. 상황 요약
박양하 Next.js 포트폴리오(`/Users/davidpark/private_project/portfolio`)는 27개 인터랙티브 '시안(scene)' + SSOT + 인트로 시퀀스까지 **전부 커밋 완료**(master @ `69b6541`, **원격 없음 = 로컬 전용, 한 번도 push 안 됨**).
**다음 목표**: 현재 "5막 서사"(현장→측정→시스템→운영→자율→사람) 구조를 **4가지 관점 — 프로젝트 / 스킬 / 철학 / 지식관리 — 으로 재구조화**하고, **각 시안의 내용을 싹 갈아엎는다.** 콘텐츠 원천은 옵시디언 볼트.
별도 master-plan 파일은 없음 — 이 문서가 그 역할. (대화로 합의된 계획)

## 2. 작업 상태
**Done (검증: git 커밋):**
- `3de051a` Vite→Next.js 전환 + **SSOT**(`content/profile.ts` 11프로젝트·8지표·신념·글·철학, `overrides.ts` 최우선 빈 레이어, `index.ts` deep-merge → `PROFILE`)
- `748b5e5` **5막 IA**: `src/scenes/registry.ts`에 `SECTIONS`(6그룹) + `scene.section` + `scene.owns`(지표 단독소유) / 홈 5막 그룹+배지 / `src/compositions/index.ts` 7조합+메시지
- `d24d5ca` **지표 owner 1:1 중복제거**: 27 시안 HTML에서 비소유 지표 제거, 용착15%→0%는 #11 단독, **재고+17% #15 신설(유실 복구)**
- `69b6541` **인트로 시퀀스**: `src/components/intro/{IntroGate,IntroSequence,Reel}.tsx` + `content/reel.json` + globals.css 키프레임. BIOS(#05)→CRT turn-off→타이핑("시대는 빠르게 변하고 있습니다."+커서)→시안 릴(크로스페이드·레터박스·캡션·진행바·건너뛰기). 세션당 1회(sessionStorage), `?intro` 강제.
- **빌드 그린**: `npm run build` 38 정적 페이지 통과(이번 세션 확인). resume.json은 `npm run gen:resume`로 SSOT에서 파생.
- 코드 정리: `.omc/` 추적 제외(.gitignore) — 이번 세션 미커밋분이니 §3-1에서 커밋할 것.

**Remaining (다음 세션 핵심):**
- 27 시안을 **4관점으로 재분류** + 각 시안 **콘텐츠 전면 재작성**.
- 결정 필요: 4관점이 5막 SECTIONS를 **대체**할지, **두 번째 축**으로 공존할지(레지스트리에 `perspective` 필드 추가). 사용자와 먼저 확정.

**Just decided / 방향:**
- 사용자가 "4관점으로 나눠서 구조화 + 내용 싹 변경" 명시. dedup(지표 owner 1:1)·서사 수렴 원칙은 유지하되 분류축을 5막→4관점으로 바꾸는 것.

## 3. 다음 세션 액션 (순서대로)
1. **`.omc` 정리 커밋**: `cd /Users/davidpark/private_project/portfolio && git add .gitignore && git add -A && git commit -m "chore: .omc 추적 제외"` (작업 트리 깨끗하게).
2. **사용자와 4관점 정의 확정**: 프로젝트/스킬/철학/지식관리 각각이 *무엇을 증명*하는지 + 4관점이 SECTIONS 대체인지 공존인지. (AskUserQuestion 권장)
3. **콘텐츠 원천 매핑** (옵시디언 읽기 → SSOT 보강): 아래 §4 경로. 4관점별 소스:
   - 프로젝트 → `300_Projects/**` + `400_Areas/PORTFOLIO/Portfolio_Korean_v2.md`(11프로젝트·원화·수상)
   - 스킬 → `600_Tech Stack/**`(AI Agent·Data·SQL·Harness·git·JS)
   - 철학 → `500_Resources/{철학,심리학,문제분석,경영전략}` + `900_Writings/**`
   - 지식관리 → `000_System/**`(볼트 OS: AGENTS.md·vault-lint·net-zero·telemetry) + `600_Tech Stack/AI Agent/{LLM Wiki,GraphRAG,Decision OS}` + `Data/ssot-data-architecture`
4. **registry 재구조화**: `src/scenes/registry.ts`의 SECTIONS/section(또는 perspective 필드) 변경 → 홈(`src/app/page.tsx`)·조합(`src/compositions/index.ts`)·릴(`content/reel.json`)이 다 이걸 읽으니 함께 갱신.
5. **시안 콘텐츠 전면 개편**: `public/lab/01..27-*.html` 각 파일. dedup owner 맵 유지(아래 §5). 분량 크니 병렬 에이전트 배치 권장(이전 세션 방식). 편집 후 헤드리스 렌더 검증 필수.
6. **빌드 + 인트로 확인**: `npm run build`, `npm run start` → `http://localhost:3000/?intro`.

## 4. 경로 & 명령
- 레포(단일 worktree): `/Users/davidpark/private_project/portfolio` — `master` @ `69b6541`, clean(§3-1 커밋 후).
- SSOT: `content/{profile.ts,overrides.ts,index.ts,types.ts}` · 릴: `content/reel.json` · 이력서 생성: `scripts/gen-resume.ts`
- 구조: `src/scenes/registry.ts`(SECTIONS·owns) · `src/compositions/index.ts` · `src/app/page.tsx`(홈) · `src/app/{s/[scene],c/[comp]}/page.tsx`
- 인트로: `src/components/intro/{IntroGate,IntroSequence,Reel}.tsx` · `src/app/globals.css`(pf-crt-off 등)
- 시안 27개: `public/lab/NN-slug.html` (self-contained)
- **옵시디언 볼트(콘텐츠 원천)**: `/Users/davidpark/Library/CloudStorage/OneDrive-개인/Obsidian` → `400_Areas/PORTFOLIO`, `300_Projects`, `600_Tech Stack`, `900_Writings`, `500_Resources`, `000_System`
- 명령: `npm run dev` / `npm run build` / `npm run start` / `npm run gen:resume`
- 자매 레포: `/Users/davidpark/private_project/deckforge`(HTML→PDF/PPTX), `/Users/davidpark/private_project/portfolio-lab`(시안 원본 사본 — 현재는 portfolio/public/lab가 정본)

## 5. 주의 & 암묵 컨텍스트
- **로컬 전용**: 원격 없음. push 정책 없음 — 사용자 지시 없으면 push 금지(불가).
- **지표 owner 1:1 유지**: 용착15%→0%→#11 · 불량/추적성→#12 · C/T31~49%→#02 · ST−50%→#09 · 사무공수−451분→#08 · 생산성+24%→#17 · OPEX−85%→#20 · 재고+17%→#15. 콘텐츠 갈아엎어도 한 지표가 여러 시안에 중복되지 않게.
- **인트로 의존성**: 릴은 `content/reel.json`(현재 #05 include:false=인트로 전용, 26개 재생) 순서/시간을 읽음. 시안 추가/삭제/번호변경 시 reel.json·registry 동기화 필수. durationMs는 각 시안 실제 애니 길이 기준.
- **옵시디언 `400_Areas`**: 볼트 자체 `.claude/settings.local.json`에 firewall이 있으나, **이 레포(`private_project`)에서 실행하는 세션은 읽기 가능**했음(이전 세션 PORTFOLIO/Resume 읽음). 못 읽으면 사용자에게 요청.
- **불량 0건**: Codex가 "근거 약함" 지적 → 사용자는 "헤드라인 유지" 결정. 콘텐츠 개편 시에도 유지.
- **병렬 에이전트 운영**: 5개 동시 돌리면 일부가 "socket closed"로 죽을 수 있음(이전 세션 2회). 죽으면 파일 부분편집 상태 → 재실행으로 복구(파일은 안 깨짐). 각 에이전트는 편집 후 헤드리스 렌더 검증시킬 것.
- **headless 스크린샷 저장 위치**: MCP playwright가 세션 cwd(`/Users/davidpark/private_project`)에 png를 떨굼. 검증 후 정리할 것.
- **두 모델 구조 제안 원문**: 이전 세션이 Codex(`codex exec`)+Claude 병렬로 받은 구조안은 합의되어 5막+dedup으로 반영됨. 4관점은 그 위에 새로 얹는 작업.
