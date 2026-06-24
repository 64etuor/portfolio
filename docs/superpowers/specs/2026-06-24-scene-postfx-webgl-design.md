# useScenePostFX — 캔버스 씬 WebGL 후처리

- **Date:** 2026-06-24
- **Status:** Approved (design)
- **Scope:** `src/scenes/_host/` — 2D 캔버스 씬에 공용 WebGL 후처리 레이어 도입

## 목표

31개 2D 캔버스 씬을 씬별 재작성 없이 일괄 시각 격상한다. 각 씬의 2D 출력을 GPU 텍스처로
받아 풀스크린 프래그먼트 셰이더(CRT 곡률·색수차·스캔라인·그레인·비네팅·글로우 근사)를
통과시킨다. 도메인별 프리셋으로 톤을 차등화한다.

## 결정 사항 (브레인스토밍 결과)

| 축 | 결정 |
|---|---|
| 기술 경로 | **진짜 WebGL 후처리** (offscreen 2D → texImage2D → WebGL2 풀스크린 쿼드). CSS 필터 경로 아님. |
| 적용 모델 | **opt-in, 기본 OFF + 큐레이션 리스트.** `useSceneCanvas` 옵션으로 씬이 명시적으로 켠다. |
| 효과 성격 | **도메인별 프리셋.** `phosphor` / `instrument`(기본) / `clean` / `boot`. |
| 적용 대상 | 아래 "큐레이션 리스트" 참조 — 캔버스가 화면 전체(또는 full-bleed 배경 + 희박한 DOM)인 씬만. |
| barrel 곡률 | **기본 비활성.** 캔버스만 휘면 위에 얹힌 DOM 텍스트와 어긋난다. 곡률은 DOM이 거의 없는 씬(`boot` 등)에만 opt-in. |

### 적용 모델이 전역 ON → opt-in 으로 바뀐 이유 (구현 중 발견)

씬 구조를 실측한 결과, 거의 모든 씬이 캔버스를 **배경/한 레이어**로 쓰고 그 위에
DOM/SVG UI(자막·라벨·컨트롤)를 합성한다. WebGL 은 캔버스만 텍스처로 받을 수 있어
DOM 오버레이는 후처리되지 않는다. 따라서:

- **전역 ON 으로 가면** 대시보드/계측 씬은 "배경만 후처리 + 크리스프 DOM" 으로 깨져 보인다.
- **곡률을 강하게 쓰면** 휘어진 캔버스 + 똑바른 DOM 텍스트가 시각적으로 충돌한다.

→ 기본 OFF + 큐레이션 opt-in, 곡률 기본 비활성이 정답.

### 큐레이션 리스트 (1차 — 캔버스 지배적 + 희박한 DOM)

| 씬 | 비고 | preset |
|---|---|---|
| `28-gap-reality` ~ `33-ax-era`, `36-bridge-experts`, `37-cross-domain`, `38-ending-catchphrase`, `42-era-shift` | 필름 시네마틱 — full-bleed 캔버스 배경 + 희박한 자막 DOM | `instrument` 또는 `phosphor` |
| `graphrag` | 캔버스 그래프 지배, DOM 소량 — 구현 시 시각 확인 후 확정 | `instrument` |

**제외 (DOM 밀도 높음 / 멀티-캔버스 / 배경-only):** `ai-latent`(DOM 75)·`radar-sonar`(DOM 157)·
`mes-console`·`robot-pendant`·`db-architecture`(배경-only)·`41-perspectives`(iframe) 및 모든 멀티-캔버스
씬(`oscilloscope`·`scada-hmi`·`agent-governance`·`cmm-metrology`·`pipeline-dag`·`sonar-waterfall`·`weld-thermal`).

각 씬 enable 은 시각 확인 후 확정한다. opt-in 이므로 잘못 포함돼도 끄면 그만 — 리스크 낮음.
`digital-twin` 은 자체 Three.js 캔버스라 2D draw 경로를 안 타므로 자동 제외.

## 아키텍처

draw 계약 `(ctx2d: CanvasRenderingContext2D, f: Frame) => void` 은 **불변**. 씬은 계속
2D 컨텍스트에 그린다. 훅 내부가 캔버스 2개를 소유한다:

```
씬 draw(ctx2d) → [offscreen 2D canvas (createElement, 미마운트)]
              → texImage2D
              → [visible WebGL2 canvas (DOM, ref 위치)]
                  fullscreen quad + frag shader
              → 화면
```

- **offscreen 2D 캔버스:** `document.createElement('canvas')`, DOM에 미마운트. 씬 draw 의 대상.
- **visible WebGL2 캔버스:** 씬의 `<canvas ref={ref} />` 그 자리. 훅이 `getContext('webgl2')` 로 잡는다.
- 매 rAF tick: ① 씬 draw 를 offscreen 2D ctx 로 호출 → ② offscreen 을 GL 텍스처 업로드 → ③ 셰이더 패스를 visible 캔버스로 렌더.

씬 코드(`<canvas ref={ref} />`)는 변경 없음. 프리셋만 옵션으로 추가.

## 모듈 구성 (`_host/postfx/`)

| 파일 | 책임 |
|---|---|
| `postfx/glRenderer.ts` | webgl2 컨텍스트 생성, 프로그램 컴파일, 풀스크린 쿼드 셋업, 텍스처 업로드/드로우, 리사이즈, **컨텍스트 로스 핸들링**, teardown. GL 생명주기 단독 소유. |
| `postfx/shader.ts` | GLSL vertex/fragment 소스. uniform 으로 파라미터화. |
| `postfx/presets.ts` | `PostFXPreset` → uniform 값 매핑. 기본 = `instrument`. |
| `postfx/types.ts` | `PostFXPreset` 유니온, postFX 옵션 타입. |
| `useSceneCanvas.ts` (수정) | postFX 경로 추가. 기존 2D 경로는 fallback·opt-out·reduced-motion 용으로 보존. |

## 옵션 계약

```ts
useSceneCanvas(draw, {
  // 기존
  running,                 // 기본 true
  reducedMotionStatic,     // 기본 true
  // 신규
  postFX,                  // 기본 false(opt-in). true 로 켜면 WebGL 경로 진입
  preset,                  // 'phosphor' | 'instrument' | 'clean' | 'boot'. 미지정 시 'instrument'
})
```

전형적 사용: 큐레이션 리스트의 씬만 `{ postFX: true, preset: 'phosphor' }` 추가. 미지정 씬은
기존 2D 경로 그대로(변화 없음). preset 만 주고 postFX 생략 시에도 OFF — postFX:true 가 스위치.

## 셰이더 (MVP 단일 패스)

하나의 프래그먼트 셰이더, uniform 으로 제어:

- barrel 곡률 (UV 왜곡)
- 색수차 (RGB 채널별 샘플 오프셋)
- 스캔라인 (시간 스크롤)
- 필름 그레인 (시간·좌표 해시 노이즈)
- 비네팅
- 값싼 글로우 근사 (이웃 샘플 가중합)

프리셋은 이 uniform 숫자 세트일 뿐이다. 멀티패스 진짜 블룸(다운샘플→블러→합성)은 비용 때문에
**MVP 제외**, 스트레치 목표. 의존성 0 — raw WebGL2, three.js 미사용.

### 프리셋 초안 (구현 시 튜닝)

| preset | 대상 도메인 | 특성 |
|---|---|---|
| `phosphor` | oscilloscope, radar-sonar, sonar-waterfall | 잔광·강한 글로우·녹색 편향 허용 |
| `instrument` (기본) | cmm-metrology, pid-scheme 등 계측·제어 | 선명, 곡률·색수차 약, 은은 |
| `clean` | DOM 성격이 강한 차트/대시보드형 캔버스 | 최소 — 그레인·스캔라인 거의 0 |
| `boot` | bios-boot 등 | 글리치·노이즈·스캔라인 강 |

## 리스크와 해법 — WebGL 컨텍스트 한계

브라우저 동시 WebGL 컨텍스트 ~16 제한. opt-in 큐레이션(≈10여 씬)이라 위험은 낮지만,
`/scenes` 갤러리·필름에서 동시 마운트를 고려해 다음을 지킨다.

**해법(권장):** GL 컨텍스트는 씬이 **실제 `running` 일 때만 lazy 생성**, pause/언마운트 시 즉시 teardown.

- 갤러리는 `hoverPlay`(포스터=정지). 정지 카드는 GL 없이 **2D 정적 프레임**만, 호버 running 시에만 GL 활성 → 동시 running 사실상 1.
- 필름 더블버퍼 → 동시 1~2. 단독 라우트 → 1.
- 실제 동시 GL 컨텍스트 ≈ 1~2. 안전.

대안 "단일 공유 GL 렌더러 + ImageBitmap 전송" 은 MVP 과설계라 채택 안 함.

## 안전망

- **reduced-motion → 모션 정지.** 그레인/스캔라인 스크롤·플리커는 모션이므로 reduced-motion 위반.
  단 캔버스의 컨텍스트 타입(webgl2)은 한 번 잡으면 2d 로 못 바꾼다. 따라서 GL 경로에선
  **시간 고정(frozen t) 단일 정적 프레임**을 셰이더로 렌더한다(애니메이션 없음 = 모션 없음).
  결과적으로 reduced-motion 의도(무모션)는 지켜지고 정적 후처리 룩은 유지된다.
- **GL 생성 실패·컨텍스트 로스 → 자동 2D fallback.** `getContext('webgl2')` 가 null 이면
  마운트 시점에 기존 2D 경로로 떨어진다(현행 동작 그대로). 후처리 불가여도 씬은 항상 보인다.
- DPR≤2 캡 유지. 모바일에서 필요 시 곡률·글로우 강도 자동 감쇠.

## 테스트

- **단위:** 프리셋 uniform 값 매핑, 셰이더 컴파일 성공.
- **비주얼 회귀:** 고정 `t` 결정론 프레임을 프리셋별 스냅샷(레포 기존 비주얼 테스트 활용).
- **fallback:** GL 비가용 환경에서 2D 경로로 떨어지는지.

## 범위 밖 (YAGNI)

- 멀티패스 진짜 블룸
- DOM 대시보드 씬 후처리 적용
- 단일 공유 GL 렌더러
- 프리셋 런타임 토글 UI

## 영향 받는 핵심 파일

- `src/scenes/_host/useSceneCanvas.ts` (수정)
- `src/scenes/_host/postfx/*` (신규)
- `src/scenes/_host/types.ts` (옵션 타입 확장)
- 프리셋 지정이 필요한 개별 씬의 `Scene.tsx`/`view.tsx` (옵션 한 줄 추가, 점진)
