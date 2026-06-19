# React 풀포팅 + 성능 개선 계획

_작성 기준일: 2026-06-19 · 브랜치: feat/portfolio-film_

현재 `public/lab/*.html` **33개 씬(총 ~31,000줄)**이 자기완결 HTML(인라인 CSS + 바닐라 JS 캔버스 rAF + DOM 빌드 UI)로 작성돼 **iframe으로 임베드**(Film 더블버퍼, 갤러리 lazy)되어 있다. 이를 React 컴포넌트로 풀포팅하고 성능을 개선한다.

> 실측: 씬 33개, 평균 ~940줄, 최대 `22-db-architecture`(2,212) · `16-robot-pendant`(1,985) · `23-agent-governance`(1,427) · `17-gantt-cpm`(1,384).

---

## 0. 핵심 결정 — "실용적 포팅"을 기본값으로
순수 React 재작성이 아니라, 씬의 imperative 캔버스/DOM 로직(가장 비싼 부분)을 **공통 하네스로 감싼 컴포넌트의 `useEffect` 안에서 ref된 컨테이너에 그대로 동작**시킨다. iframe 제거·공유 rAF·컬링·코드스플릿·테마 통일이라는 이득의 ~80%를 풀 재작성 대비 ~40% 공수로 얻고, 시각 회귀 리스크도 낮춘다. (UI가 단순하거나 상호작용이 중요한 씬만 선택적으로 진짜 React화)

---

## 1. 타깃 아키텍처
```
src/scenes/
  _host/
    raf.ts               # 단일 공유 rAF 스케줄러 (subscribe/unsubscribe, visible일 때만 tick)
    useSceneCanvas.ts    # canvas ref·DPR캡(≤2)·리사이즈·reduced-motion·정리
    SceneHost.tsx        # 16:9 스테이지 프레이밍 + 마운트/언마운트
    SceneFrame.tsx       # 갤러리/필름용 래퍼: IntersectionObserver → running prop, lazy mount/pause
  16-robot-pendant/
    Scene.tsx            # 'use client', 하네스 사용
    data.ts              # 인라인 데이터 → TS
    scene.module.css     # 인라인 CSS → CSS Module(테마 토큰 매핑)
  ...(33개)
  registry.ts            # id → { lazy: () => import(...), title, area, filmMs }
```
- **단일 공유 rAF**: 33개 독립 루프 → 1개 스케줄러. 씬이 tick 콜백 등록, 화면 밖이면 해제(0 작업).
- **SceneFrame**: 근처면 lazy-mount + `running=true`, 멀어지면 pause. (현재 iframe `display:none` 임시본의 정식 버전)
- **registry**: Film·갤러리·단독 라우트가 공유하는 단일 진실원.

---

## 2. 성능 전략 (진짜 상금)
| 레버 | 효과 |
|---|---|
| iframe 33개 제거 | 각 iframe=독립 문서 → 메모리·CPU 대폭 감소, 경계 버그(scrollIntoView류) 소멸 |
| 단일 공유 rAF + 컬링 | 동시에 도는 씬을 화면 안으로 한정 |
| 씬별 코드스플릿(dynamic import) | 초기 번들 축소, 필요 씬만 로드 |
| canvas DPR≤2 · 컨텍스트 재사용 | 고해상도 메모리 폭주 방지 |
| 헤비 씬만 OffscreenCanvas/worker 검토 | 메인스레드 부담 분산(필요시) |

---

## 3. 단계별 실행 (에이전트 병렬화 + 검증 게이트)
- **Phase 0 — 하네스 + 레퍼런스 씬 (직렬)**: `raf.ts`/`useSceneCanvas`/`SceneHost`/`SceneFrame`/`registry` 구축 + 대표 씬 1개 포팅해 패턴/API 확정. 게이트: 레퍼런스 씬 HTML과 1:1 + perf 베이스라인.
- **Phase 1 — 메시지 씬 13개(28~40, 거의 캔버스만)**: 팬아웃 1씬=1에이전트. 게이트: 씬별 시각 대조.
- **Phase 2 — 중간 난이도 ~12개**: 팬아웃.
- **Phase 3 — 헤비 인터랙티브 ~8개**(db-architecture·robot-pendant·gantt·scada·decision-os·mes·oscilloscope·agent-governance): 1에이전트씩 + 집중 리뷰.
- **Phase 4 — 통합**: Film(`acts.ts`→컴포넌트 ref, `Film.tsx`가 iframe 대신 컴포넌트 더블버퍼, materialize/전환 유지) · 갤러리(static→React, SceneFrame lazy) · 단독 씬 라우트.
- **Phase 5 — 성능 패스**: 공유 rAF 배선·컬링·프로파일·메모리·코드스플릿 검증 + 전역 QA.
- **Phase 6 — 정리**: `public/lab` HTML → `archive/` 보존(롤백), 데드코드 제거.

---

## 4. 씬 포팅 템플릿 (에이전트 스펙)
입력 `public/lab/NN.html` → 산출 `src/scenes/NN/{Scene.tsx,data.ts,scene.module.css}`.
1. 정적 DOM → JSX, 동적 빌드 DOM은 ref 컨테이너 + imperative 유지(실용적).
2. `<script>` → 컴포넌트: rAF 루프 → `useSceneCanvas` tick 등록, 데이터 → `data.ts`.
3. 인라인 CSS → `scene.module.css`, 색/폰트는 공통 테마 토큰.
4. **검증(필수)**: old HTML과 시각 대조 스크린샷, 콘솔 0, running/pause, reduced-motion, `tsc` 0.

---

## 5. 리스크 & 롤백
- **33개 시각 회귀** = 최대 리스크 → 씬별 before/after 스크린샷 게이트 + HTML 아카이브 보존(iframe 폴백).
- Film 타이밍/전환 회귀 → 비트 지속시간 회귀 테스트.
- imperative 심한 씬은 "순수 React"가 비효율 → 실용적 포팅 유지.

---

## 6. 공수
솔로 ~8~9주. **에이전트 병렬화 시 포팅 wall-clock 며칠**, 단 하네스·통합·성능·33개 QA가 직렬 병목 → **실질 ~1.5~2주(오케스트레이션+리뷰)**.

---

## 7. 순서 — 부분 수정 vs 포팅
**원칙: 디자인/내용 수정은 HTML에서 먼저 끝내고 포팅. 구조/성능/경계 버그는 패치 말고 포팅이 해결.**
포팅은 충실한 번역이라 움직이는 타깃을 번역하면 이중 작업이 된다. HTML에서 먼저 고치면 포팅 시 수정본이 그대로 번역돼 1패스.
1. **곧 포팅할 씬의 수정** → 포팅 지시에 **번들**(에이전트가 포팅하며 동시 적용).
2. **지금 당장 필요한 수정** → HTML에서 지금.
3. **새 아키텍처가 없애는 문제**(iframe 경계·메모리) → 포팅에 맡김.
4. **전반 디자인 방향**은 대량 포팅 전에 확정.
- 아키텍처가 **하이브리드(registry + iframe 폴백)**라 디자인 굳은 씬부터 **점진 React화**하면서 나머지는 HTML로 병행 수정 가능.

---

## 8. 시작 전 결정사항
1. **스타일링**: CSS Module(권고 — 기존 인라인 CSS에 가장 가까움) / Tailwind / styled-jsx?
2. **범위**: 33개 일괄 vs **핫한 것부터(필름 12 + 갤러리)** 단계적(권고)?

→ 결정되면 **Phase 0(하네스 + 레퍼런스 씬 1개)**부터 시작.
