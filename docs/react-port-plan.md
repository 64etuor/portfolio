# React 풀포팅 + 성능 개선 계획 (rev.2)

_원안 2026-06-19 · **개정 2026-06-20**(리네이밍 커밋 `7bfa205` 이후 정합화) · 브랜치 `feat/portfolio-film`_

> **현황(2026-10)**: 포팅은 완료된 과거 계획이다. 이후 레거시 씬 8개(radar-sonar · graphrag · mes-console · digital-twin ·
> sonar-waterfall · cmm-metrology · oscilloscope · ai-latent)는 은퇴하고 three.js 씬 9개(`src/scenes/x-*`)로 대체됐다.
> 현재 씬 목록의 정본은 `src/scenes/catalog.ts`, 요약은 `README.md` 의 "씬" 절을 본다. 아래 §7 인벤토리는 당시 기준이다.

`public/lab/*.html` 자기완결 씬(인라인 CSS + 바닐라 JS 캔버스 rAF + DOM 빌드 UI)들이 **iframe으로 임베드**(Film 더블버퍼, 갤러리 lazy)돼 있다. 이를 React 컴포넌트로 풀포팅하고 iframe 제거·공유 rAF·컬링·코드스플릿·테마 통일로 성능을 개선한다.

> **rev.2 변경점**: ① 파일 네이밍이 탈번호화됨(데모=슬러그 `robot-pendant.html`, 메시지 씬만 번호 `28-*`; 번호는 `registry.ts`의 `id`로 분리). ② `registry.ts`·`SceneFrame.tsx`는 **이미 존재**(메타데이터/iframe 임시본) → 신규가 아니라 **확장/대체**. ③ 라이브러리 스택 확정. ④ 결정사항(§8) 락. ⑤ codex+claude 반반 팬아웃 프로토콜 추가.

---

## 0. 핵심 결정 — "실용적 포팅"을 기본값으로
순수 React 재작성이 아니라, 씬의 imperative 캔버스/DOM 로직을 **공통 하네스(`useSceneCanvas`)의 tick 콜백 안에서 그대로 동작**시킨다. iframe 제거·공유 rAF·컬링·코드스플릿·테마 통일 이득의 ~80%를 풀 재작성 대비 ~40% 공수로 얻고 시각 회귀 리스크도 낮춘다.

---

## 0.5 확정된 결정사항 (구 §8)
1. **스타일링 = CSS Module.** 인라인 `<style>` → `scene.module.css`. 색/폰트는 공통 테마 토큰. (셸 단순 UI는 기존 Tailwind+globals 유지, 씬 내부는 Module.)
2. **범위 = 33 일괄.** 하네스(직렬) 확정 후 전 씬을 에이전트 병렬 팬아웃.
3. **라이브러리 스택(설치 완료):** `clsx`(Module 조건부 클래스) · `usehooks-ts`(intersection·reduced-motion·resize 훅) · `zustand`(공유 rAF/재생·가시성 상태) · `react-error-boundary`(씬별 크래시 격리) · `@vercel/speed-insights`+`@vercel/analytics`(성능 실측, layout 배선됨) · **React Compiler**(`next.config.ts` `experimental.reactCompiler` + `babel-plugin-react-compiler` — 셸/오케스트레이션 리렌더 자동 메모, 빌드 검증 완료).
4. **폰트:** 씬 인라인 `@import`(Pretendard/JetBrains Mono 등 CDN) → 포팅 시 `next/font` self-host로 흡수(결정성·CLS 제거). globals.css의 CDN @import도 동반 정리.

---

## 1. 타깃 아키텍처
```
src/scenes/
  _host/
    raf.ts               # 단일 공유 rAF 스케줄러 (subscribe/unsubscribe, 구독자 없으면 정지)
    useSceneCanvas.ts    # canvas ref·DPR캡(≤2)·ResizeObserver·reduced-motion·running일 때만 tick 등록·정리
    SceneHost.tsx        # 풀블리드 스테이지 프레이밍 + 오버레이 children
    SceneFrame.tsx       # 갤러리/필름용: IntersectionObserver → running, lazy mount/pause (구 components/SceneFrame iframe 임시본을 대체)
    types.ts             # SceneProps, TickFn 등 공유 타입
  <slug>/                # 예: robot-pendant/ · 28-gap-reality/  (디렉토리명 = 파일 슬러그)
    Scene.tsx            # 'use client', 하네스 사용. default export
    data.ts              # 인라인 데이터 → TS (없으면 생략)
    scene.module.css     # 인라인 CSS → CSS Module(테마 토큰 매핑)
src/scenes/registry.ts   # 기존 메타 + lazy: () => import('./<slug>/Scene'), filmMs 추가
```
- **단일 공유 rAF**: 33개 독립 루프 → 1 스케줄러. 씬이 tick 등록, 화면 밖이면 해제(0 작업).
- **SceneFrame**: 근처면 lazy-mount + `running=true`, 멀어지면 pause.
- **registry**: Film·갤러리·단독 라우트가 공유하는 단일 진실원.

### 1.1 하네스 API 계약 (★ 에이전트가 따르는 고정 인터페이스 — Phase 0에서 확정)
```ts
// useSceneCanvas — 기존 frame(now) 루프를 거의 그대로 이식하는 어댑터
const ref = useSceneCanvas((ctx, f) => {
  // f: { w, h, dpr, t /*초, 씬 마운트 기준*/, dt /*초*/ }
  // 기존 frame 본문에서 (now-start)/1000 → f.t, W/H → f.w/f.h 로 치환.
  // ctx 는 DPR transform 이 이미 적용된 2D 컨텍스트.
}, { running, reducedMotionStatic: true })
return <SceneHost><canvas ref={ref} className={s.c} /> /* + 정적 오버레이 JSX */ </SceneHost>
```
- 하네스가 소유: canvas 마운트·DPR≤2 setTransform·ResizeObserver·reduced-motion(정적 1프레임)·shared-rAF subscribe(running&&!reduced)·cleanup.
- 씬은 소유: draw 콜백 본문·정적 오버레이 DOM(JSX)·`data.ts`·`scene.module.css`.
- **Film 핸드셰이크 대체**: 기존 `postMessage{type:'film-scene',ms,ready}` → 컴포넌트 prop/콜백(`onReady`, `declaredMs`)으로. Film.tsx는 iframe 더블버퍼 → `<SceneFrame>` 컴포넌트 더블버퍼로 전환(Phase 4).

---

## 2. 성능 전략
| 레버 | 효과 |
|---|---|
| iframe 33개 제거 | 독립 문서 메모리·CPU 대폭 감소, 경계 버그 소멸 |
| 단일 공유 rAF + 컬링 | 화면 안 씬만 tick |
| 씬별 코드스플릿(dynamic import) | 초기 번들 축소 |
| canvas DPR≤2 · 컨텍스트 재사용 | 고해상도 메모리 폭주 방지 |
| React Compiler | 셸/갤러리/Film 리렌더 자동 메모 |
| @vercel/speed-insights | 포팅 전후 perf 실측 게이트 |

---

## 3. 단계별 실행
- **Phase 0 — 하네스 + 레퍼런스 씬 (직렬, 내가 직접):** `_host/*` 구축 + `28-gap-reality` 1개 포팅으로 API 확정 + 빌드/시각 검증. **이 게이트 통과 전 팬아웃 금지.**
- **Phase 1~3 — 전 씬 팬아웃(33):** codex/claude 반반 동시 디스패치. 1씬=1에이전트, **각자 `src/scenes/<slug>/`만 생성**(공유 파일 미수정 → 충돌 없음). §4 템플릿 준수.
- **Phase 4 — 통합(직렬):** registry에 `lazy`/`filmMs` 배선 · Film.tsx iframe→`SceneFrame` 컴포넌트 더블버퍼 · 갤러리(`scenes.html` 등 static)→React + SceneFrame lazy · `/s`·`/c` 라우트.
- **Phase 5 — 성능 패스:** 공유 rAF 배선·컬링·프로파일·코드스플릿·전역 QA.
- **Phase 6 — 정리:** `public/lab` HTML → `public/lab/_archive/` 보존(롤백) · 데드코드(`components/SceneFrame` iframe 임시본 등) 제거 · 폰트 self-host 마무리.

---

## 4. 씬 포팅 템플릿 (에이전트 스펙)
입력 `public/lab/<file>.html` → 산출 `src/scenes/<slug>/{Scene.tsx, data.ts?, scene.module.css}`.
1. 정적 DOM(canvas·오버레이) → JSX. canvas 는 `useSceneCanvas` ref.
2. `<script>`의 `frame(now)` 루프 → draw 콜백: `(now-start)/1000`→`f.t`, `W/H`→`f.w/f.h`, `g`→`ctx`. resize/DPR/rAF boot 코드는 **삭제**(하네스 소유). 데이터 상수 → `data.ts`.
3. 인라인 `<style>` → `scene.module.css`. 색/폰트는 가능한 공통 테마 토큰. 폰트 `@import`/`@font-face` 제거(`next/font`가 전역 제공).
4. `running` false 또는 reduced-motion 시 tick 안 돎(하네스 처리) — draw는 멱등하게.
5. **검증(필수):** old HTML과 시각 대조 스크린샷, 콘솔 0, running/pause·reduced-motion, `tsc --noEmit` 0.
6. **금지:** 공유 파일(`registry.ts`·`acts.ts`·`Film.tsx`·`_host/*`·`globals.css`) 수정 금지. 자기 `<slug>/`만 만든다.

---

## 5. 리스크 & 롤백
- **33개 시각 회귀** = 최대 리스크 → 씬별 before/after 스크린샷 게이트 + HTML 아카이브 보존(iframe 폴백 가능).
- Film 타이밍/전환 회귀 → Phase 4에서 비트 지속시간 대조.
- imperative 심한 씬은 "순수 React" 비효율 → 실용적 포팅 유지.

---

## 6. 팬아웃 프로토콜 (codex + claude 반반)
- **claude 측**: `Agent`(executor/general-purpose, 복잡 씬은 opus). 입력=§4 템플릿 + 하네스 계약(§1.1) + 대상 HTML 경로.
- **codex 측**: `codex exec -s workspace-write`(established 방식, 파일 1개씩). 동일 스펙 프롬프트.
- **충돌 회피**: 모든 에이전트가 신규 `src/scenes/<slug>/` 파일만 생성, 공유 파일 미수정 → 병렬 안전(worktree 불필요).
- **할당**: 헤비 인터랙티브를 양 엔진에 분산(한 엔진에 몰지 않음). 메시지 씬(단순)도 분산.
- **수확**: 각 씬 산출 후 빌드/시각 대조 → 통과분만 Phase 4 배선.

---

## 7. 씬 인벤토리 (포팅 대상 = 32, gallery 셸 제외 — 2026-06 당시 기준, 은퇴 씬 포함)
**메시지 씬(12, 번호 유지):** 05-bios-boot · 28-gap-reality · 29-lost-in-translation · 30-collision · 31-cost-cascade · 32-the-connector · 33-ax-era · 36-bridge-experts · 37-cross-domain · 38-ending-catchphrase · 41-perspectives · 42-era-shift
**데모 씬(20, 슬러그):** agent-governance · ai-latent · cmm-metrology · db-architecture · decision-os · digital-twin · gantt-cpm · gcode-printer(parked) · graphrag · ide-coding(registry 미등록—확인) · instrument-rack · mes-console · oscilloscope · pid-scheme · pipeline-dag · radar-sonar · robot-pendant · scada-hmi · sonar-waterfall · weld-thermal
**헤비(집중 리뷰):** db-architecture(2206) · robot-pendant(1968) · gantt-cpm(1403) · scada-hmi(1331) · agent-governance · decision-os · mes-console · oscilloscope
**제외(gallery 인프라):** scenes.html · skills*.html · _gallery.{css,js}

> 레퍼런스 씬 = **28-gap-reality**(394줄, 캔버스+오버레이 표준형). Phase 0에서 이걸로 API 확정.
</content>
</invoke>
