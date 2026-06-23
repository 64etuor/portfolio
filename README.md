# portfolio — 박양하 · Yangha Park

데이터 분석·제조 DX→AX 를 주제로 한 **인터랙티브 포트폴리오**. Next.js 15 통합 셸 위에
32개의 자체 캔버스 "씬"을 엮어, 자동재생 **필름**(DX→AX 내러티브)·갤러리·단독 씬 라우트로
구성한다.

**Live: https://yanghapark.com**

## 스택

| 영역 | 사용 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) · React 19 (React Compiler) |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| 씬 | HTML5 Canvas (2D) · 공유 rAF 스케줄러 |
| 3D 히어로 | Spline (`@splinetool/react-spline`, 랜딩에서 지연 로드) |
| 폰트 | Fontsource 셀프호스팅 (Pretendard · JetBrains Mono 외 9종 — `src/app/fonts.ts`) |
| 계측 | Vercel Analytics · Speed Insights |
| 배포 | Vercel → `yanghapark.com` |

## 실행

```bash
npm install        # 의존성 설치
npm run dev        # 개발 서버 (http://localhost:3000)
npm run build      # 타입체크 + 프로덕션 빌드
npm run start      # 빌드 결과 서빙
npm run lint       # next lint
npm run gen:resume # content/ → public/resume.json 생성
npm run audit:react# react-doctor (React 안티패턴)
npm run audit:lh   # Lighthouse (실행 중인 :3000 대상)
```

## 라우트

| 경로 | 내용 |
|------|------|
| `/` | 랜딩 — Spline 3D 로봇 히어로 + 내비 |
| `/film` | 자동재생 필름 (DX→AX 12-비트 내러티브) |
| `/scenes` | 씬 갤러리 (호버 시 재생) |
| `/skills`, `/skills/[area]` | 스킬 갤러리 |
| `/s/[scene]` | 단독 씬 (전체화면) |
| `/c/[comp]` | 씬 조합(composition) |
| `/resume` | 이력서 (content SSOT 렌더) |

## SSOT (단일 출처)

| 출처 | 역할 |
|------|------|
| `content/profile.ts` · `overrides.ts` | 인물·경력·프로젝트·스킬 정본 (이력서/렌더의 base) |
| `content/resume.ts` | `toResumeData(PROFILE)` 투영 → `gen:resume` 가 `public/resume.json` 생성 |
| `content/site.ts` | 랜딩 카피·도메인·타이틀 |
| `src/scenes/catalog.ts` | 씬 카탈로그 — registry/loaders/gallery/acts/`/s` params 가 여기서 파생, `SceneKey` 리터럴 타입 |
| `src/app/fonts.ts` | 폰트 로딩 매니페스트 (한 곳에서 관리) |

## 구조

```
src/
  app/                 App Router (layout·라우트·globals/cinematic/resume CSS)
    fonts.ts           폰트 로딩 SSOT
  components/
    landing/           랜딩(Spline 지연 로드 + 내비)
    film/              필름 엔진 — Film.tsx + 훅(useFilmClock·useSceneBuffer·useIrisOutro)
                       + 컴포넌트(SceneSlot·FilmControls·FilmTransition) + acts.ts(비트)
    gallery/           갤러리(GalleryGrid·GalleryPageShell)
    resume/            이력서 렌더
  scenes/
    catalog.ts         씬 SSOT · loaders.ts · registry.ts
    _host/             씬 런타임 — useSceneCanvas(freeze-resume rAF) · SceneHost(overlay)
                       · SceneFrame · LazyScene · 공유 유틸(color·math·random·dom-util·palette)
    _styles/tokens.css 공유 phosphor 토큰
    <name>/            32개 씬 (Scene.tsx + scene.module.css), public/lab HTML 이식
content/               콘텐츠 SSOT (profile·resume·site·overrides)
public/lab/            원본 자기완결형 HTML 시안 (씬의 출처)
scripts/gen-resume.ts  content → public/resume.json
```

## 이력서 워크플로우

1. `content/profile.ts`(+`overrides.ts`) 만 수정한다.
2. `npm run gen:resume` 로 `public/resume.json` 생성.
3. `/resume` 가 자동 반영된다.

## 메모

- **필름**: `acts.ts` 가 비트(막)·씬별 지속시간(ms)의 SSOT. 씬은 차례가 될 때 코드스플릿 로드,
  더블버퍼 크로스페이드로 컷. 일시정지/이전/SKIP 컨트롤은 씬 캔버스까지 freeze-resume 한다.
- **씬 CSS**: 32개 씬 CSS 모듈이 루트 레이아웃 청크로 묶여 전 라우트에 로드된다(Next 15 한계 —
  라우트그룹/`:global()` 키프레임 공유 미지원으로 환경상 분리 불가). 색상은 `--scene-phos*` 토큰 공유.
- **성능**: 랜딩 Spline 런타임(~568KB)은 `next/dynamic(ssr:false)` + `requestIdleCallback` 로
  크리티컬 패스 밖으로 지연 로드(홈 Lighthouse 54→92).
- **배포**: `main` push 시 Vercel 프로덕션 자동 배포(`yanghapark.com`). 프리뷰는 Deployment
  Protection 으로 보호됨.
