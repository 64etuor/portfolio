# 씬 포팅 에이전트 스펙 (codex/claude 공용)

너는 자기완결 HTML 씬 1개를 React 컴포넌트로 "실용적 포팅" 한다. **이 문서 + 레퍼런스 구현을 그대로 따라라.**

> 적용 범위: `public/lab` 원본이 있는 2D 캔버스 씬. three.js 씬(`src/scenes/x-*`)은 HTML 원본 없이 React 로 직접 작성되며
> `src/scenes/_host/three/` 하네스를 쓴다. 현재 씬 목록은 `src/scenes/catalog.ts` 참고.

## 입력 / 산출
- 입력: `public/lab/<FILE>.html` (배정받은 파일)
- 산출: `src/scenes/<SLUG>/` 디렉토리에 아래만 생성 (SLUG = 파일명에서 `.html` 제거, 번호 접두 유지: 예 `29-lost-in-translation`, `robot-pendant`)
  - `Scene.tsx` — `'use client'`, **default export** 컴포넌트
  - `scene.module.css` — 인라인 `<style>` 이식
  - `data.ts` — 큰 상수 데이터가 있으면 분리(없으면 생략)

## 레퍼런스 (★ 반드시 먼저 읽고 패턴을 그대로 모방)
- `src/scenes/28-gap-reality/Scene.tsx` · `scene.module.css` ← **정본 예시**
- 하네스: `src/scenes/_host/useSceneCanvas.ts` · `SceneHost.tsx` · `types.ts`

## 하네스 API 계약 (고정)
```tsx
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'

export default function Scene({ running = true, onReady }: SceneProps) {
  // 오버레이 DOM 을 매 프레임 갱신하면 useRef 로 잡아 draw 안에서 .style 변경(실용적).
  const ref = useSceneCanvas((g, f: Frame) => {
    // f = { w, h, dpr, t(초), dt(초) }.  g = 2D ctx (DPR transform 이미 적용).
    // 기존 frame(now) 본문을 여기로: (now-start)/1000 → f.t,  W/H → f.w/f.h,  ctx 그대로.
  }, { running })
  return (
    <SceneHost className={s.root} bg="#050505">
      <canvas ref={ref} className={s.c} />
      {/* 정적/오버레이 DOM 을 JSX 로 */}
    </SceneHost>
  )
}
```

## 변환 규칙
1. **삭제(하네스가 소유):** 원본의 `resize()`, `DPR`, `cv.width=...`, `window.addEventListener('resize')`, `requestAnimationFrame` boot/loop, `document.fonts.ready` 부트. → 전부 제거. draw 콜백 본문만 남긴다.
2. **시간:** `let start; t=(now-start)/1000; f=(t%CYCLE)/CYCLE` → `const t=f.t; const phase=(f.t%CYCLE)/CYCLE`. 절대 `now` 가 필요하면 `f.t*1000` 사용. 스크롤 누적값(예: `tickScroll+=`)은 `useRef(0)` 로.
3. **canvas:** `document.getElementById('c')` 제거, `<canvas ref={ref} className={s.c}/>`. ctx 인자 `g` 사용.
4. **정적 DOM:** `<body>` 의 오버레이(텍스트/레전드/HUD) → JSX. `id=` → `className={s.x}`. 매 프레임 `el.style.opacity=` 갱신하던 요소는 `useRef` + draw 안에서 `.current.style` 변경.
5. **CSS:** 인라인 `<style>` → `scene.module.css`. `#id`→`.id`(class), 선택자 정리. **폰트 `@import`/`@font-face` 제거**(전역 제공). 색/간격 값은 유지.
6. **데이터 빌드 DOM(동적 생성):** 복잡하면 ref 컨테이너에 imperative 유지 가능(실용적). 단순하면 JSX.
7. `running` false 또는 reduced-motion 시 tick 은 하네스가 멈춘다 — draw 는 부작용 없이 멱등하게. `onReady`는 첫 마운트 effect 에서 1회 호출(레퍼런스대로).

## 금지
- **공유 파일 수정 금지:** `registry.ts` · `acts.ts` · `components/film/*` · `scenes/_host/*` · `app/globals.css` · 다른 씬 디렉토리. **오직 자기 `src/scenes/<SLUG>/` 만 생성.**
- 새 npm 패키지 설치 금지(이미 있는 것만: clsx 등).

## 검증 (필수, 보고에 포함)
- `npx tsc --noEmit` 통과 (네 파일에서 에러 0).
- 원본 HTML 과 시각 의도 일치(레이아웃·색·모션 아크). 수치/카피 변경 금지.
- 완료 보고: 생성 파일 목록 + tsc 결과 + 원본 대비 주의점(있으면).
