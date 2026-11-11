# portfolio — 박양하 · Yangha Park

제조 현장 → 데이터 → AI를 주제로 한 **인터랙티브 포트폴리오**. Next.js 15 통합 셸 위에
33개 씬(2D 캔버스 24 + three.js 9)을 엮어 자동재생 **필름**(DX→AX 내러티브)·갤러리·
단독 씬 라우트·프로젝트 상세·이력서로 구성한다. 전 페이지 KO/EN 전환을 지원한다.

**Live: https://yanghapark.com**

## 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) · React 19 (React Compiler) |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| 씬 | HTML5 Canvas 2D · three.js(`x-*` 씬) · 공유 rAF 스케줄러 |
| 사운드 | Web Audio 효과음 엔진(`src/lib/sfx`) + 필름 큐 시트(`soundCues.ts`) |
| 3D 히어로 | Spline (`@splinetool/react-spline`, 랜딩에서 지연 로드) |
| 폰트 | Fontsource 셀프호스팅 (`src/app/fonts.ts`) — 제목 세리프는 Playfair Display + Noto Serif KR 하나 |
| 계측 · 배포 | Vercel Analytics · Speed Insights · Vercel → `yanghapark.com` |

## 실행

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 타입체크 + 프로덕션 빌드
npm run lint         # eslint (빌드 비차단)
npm run test:e2e     # Playwright (smoke · i18n · film-cut · visual)
npm run gen:resume   # content/ → public/resume.json 생성
```

## 라우트

| 경로 | 내용 |
|------|------|
| `/` | 랜딩 — Spline 3D 히어로 + 내비 |
| `/film` | 자동재생 필름 — 부팅 + SCENE 01–10 + 엔딩, 사운드 · KO/EN 토글 |
| `/scenes` | 필름 서사 갤러리 (12장, 뷰포트 진입 시 재생) |
| `/skills`, `/skills/[area]` | 영역별 실작업 갤러리 (pm · process · dev · infra · pkm) |
| `/s/[scene]` | 단독 씬 (전체화면) — 은퇴 씬 슬러그는 `next.config.ts` 에서 리다이렉트 |
| `/c/[comp]` | 씬 조합 — overview · project-career · skill · manufacturing-data · knowledge |
| `/projects`, `/projects/[slug]` | 프로젝트 상세 (12건) |
| `/resume` | 이력서 (`public/resume.json` 렌더, EN 은 `portfolio-en.ts`) |

## 씬

- **필름 비트(12)**: `05-bios-boot` → `42-era-shift` · `33-ax-era` · `28-gap-reality` ·
  `29-lost-in-translation` · `41-perspectives` · `30-collision` · `31-cost-cascade` ·
  `32-the-connector` · `36-bridge-experts` · `37-cross-domain` → `38-ending-catchphrase`.
  SCENE 09 뒤에 `work-radar`·`kip-evidence`, SCENE 10 뒤에 `smart-factory`·`excel-to-db`·`mes-line` 삽입.
- **three.js 프로젝트 씬(9, `src/scenes/x-*`, `public/lab` 원본 없음)**: smart-factory · mes-line ·
  excel-to-db · vision-inspection · sn-trace · weld-doe · line-balance · kip-evidence · work-radar.
- **2D 데모 씬(12)**: gantt-cpm · instrument-rack · scada-hmi · pipeline-dag · weld-thermal ·
  robot-pendant · pid-scheme · db-architecture · ide-coding · agent-governance · decision-os ·
  gcode-printer(parked).
- 은퇴(→ 대체): radar-sonar→work-radar · graphrag→kip-evidence · mes-console→mes-line ·
  digital-twin→smart-factory · sonar-waterfall→weld-doe · cmm-metrology·oscilloscope→vision-inspection ·
  ai-latent→sn-trace.

## SSOT (단일 출처)

| 출처 | 역할 |
|------|------|
| `content/profile.ts` · `overrides.ts` | 인물·경력·이력서 프로젝트·스킬 정본 |
| `content/projects/*.ts` | `/projects` 상세 정본 (기간·지표의 가장 구체적인 출처) |
| `content/i18n/portfolio-en.ts` · `scene-en.ts` | 프로젝트·이력서·씬 메타 EN 투영 |
| `content/resume.ts` | `toResumeData(PROFILE)` → `gen:resume` 가 `public/resume.json` 생성 |
| `content/site.ts` | 공용 UI 카피(KO/EN)·내비·도메인 |
| `src/scenes/catalog.ts` | 씬 카탈로그 — registry/loaders/gallery/`/s` params 파생, `SceneKey` 리터럴 타입 |
| `src/components/film/acts.ts` | 필름 비트·씬별 지속시간(ms) — 마스터 시계(`useFilmClock`)가 컷·효과음 동기 |

## 구조

```
src/
  app/                 App Router (라우트 · sitemap/robots · CSS)
  components/
    film/              필름 엔진 — Film.tsx + useFilmClock(마스터 시계) · useSceneBuffer ·
                       useFilmSoundCues · acts.ts · soundCues.ts
    gallery/           /scenes · /skills 카드 데이터(data.ts) + 그리드
    projects/ resume/  프로젝트 상세 · 이력서 렌더
    LocaleProvider     KO/EN 상태 (씬 텍스트는 _host/localize.tsx + 씬별 en.ts)
    SiteHeader         문서 라우트(/projects·/scenes·/skills·/resume)는 섹션 내비, 씬 라우트(/s·/c)는 HOME 바
    SiteFooter         문서 라우트 끝의 연락 푸터 (연락처는 content/profile.ts 에서 서버에서만 읽음)
  lib/sfx/             효과음 엔진
  scenes/
    catalog.ts         씬 SSOT · loaders.ts · registry.ts
    _host/             씬 런타임 — useSceneCanvas · SceneHost · localize · three/ 공용 유틸
    <name>/            씬별 Scene.tsx (+ data.ts · en.ts · scene.module.css)
  compositions/        /c 조합 정의
content/               콘텐츠 SSOT (profile · projects · i18n · site · resume)
public/lab/            2D 씬의 원본 자기완결형 HTML (헤더 "단독 보기"로 열림)
scripts/               gen-resume · ingest-projects · gen-image-dims
```

## 이력서 워크플로우

1. `content/profile.ts`(+`overrides.ts`)와 해당 `content/projects/*.ts`, EN 은 `content/i18n/portfolio-en.ts` 를 함께 수정한다.
2. `npm run gen:resume` 로 `public/resume.json` 재생성.
3. `/resume` 에 자동 반영된다.

## 메모

- **디자인 토큰**: 색·선·배경·모서리·모션은 `src/app/globals.css` `:root` 가 단일 출처다. 페이지 스코프 변수
  (`--pj-*`, `--rz-*`, 갤러리 모듈)는 이 토큰을 참조만 한다. 액센트는 코랄(`--accent`)=조작·강조,
  시안(`--accent-cool`)=필름·CRT 계열, 고용사 색(`--pj-acc`)=데이터 구분.

- **필름**: 마스터 시계가 비트 전환·씬 프리롤·효과음 큐를 한 시간축으로 구동. 씬은 차례가 오기 전
  코드스플릿 로드 후 더블버퍼 크로스페이드로 컷. 일시정지/이전/SKIP·사운드(M)·언어 토글 제공.
- **씬 CSS**: 씬 CSS 모듈이 루트 레이아웃 청크로 묶여 전 라우트에 로드된다(Next 15 한계).
- **배포**: `main` push 시 Vercel 프로덕션 자동 배포. 프리뷰는 Deployment Protection 으로 보호.
