# Scene PostFX (WebGL) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 큐레이션된 캔버스-지배 씬에 opt-in WebGL2 후처리(포스포 글로우·색수차·스캔라인·그레인·비네팅)를 입혀 "계측 장비 / 필름" 룩으로 격상한다.

**Architecture:** 씬의 2D draw 콜백 계약은 불변. `useSceneCanvas` 가 postFX 옵션이 켜지면 씬을 화면 밖 offscreen 2D 캔버스에 그리게 하고, DOM 에 보이는 캔버스는 WebGL2 풀스크린 쿼드로 바꿔 매 프레임 offscreen 을 텍스처로 받아 프래그먼트 셰이더 한 장을 통과시킨다. GL 미지원/컨텍스트 로스 시 자동으로 기존 2D 경로로 폴백한다.

**Tech Stack:** TypeScript, React 19, Next.js 15 App Router, raw WebGL2 (의존성 추가 없음 — three.js 미사용), Playwright(시각 회귀), tsx(순수 함수 어서션).

## Global Constraints

- **의존성 추가 금지.** raw WebGL2 만 사용. three.js 끌어오지 않는다.
- **draw 계약 불변:** `(ctx: CanvasRenderingContext2D, f: Frame) => void`. 씬 draw 코드는 수정하지 않는다(옵션 한 줄만 추가 가능).
- **opt-in, 기본 OFF:** `postFX` 기본값 `false`. 큐레이션 리스트의 씬만 명시적으로 켠다.
- **barrel 곡률 기본 비활성:** 기본 프리셋(`instrument`)의 `curvature` 는 0(또는 ≤0.02). DOM 오버레이와 어긋나지 않게.
- **DPR ≤ 2 캡 유지** (기존 `DPR_CAP = 2`).
- **reduced-motion:** GL 경로에선 시간 고정 단일 프레임만 렌더(모션 없음). rAF 미구독.
- **GL 미지원/로스 → 2D 폴백:** `getContext('webgl2')` 가 null 이면 기존 2D 경로 그대로.
- 파일 위치: 신규 모듈은 `src/scenes/_host/postfx/`. 기존 패턴(thin module, 명시적 타입) 준수.
- 기존 visual.spec.ts 의 결정론 전략(reduced-motion + 애니메이션 freeze + 2% 톨러런스)을 깨지 않는다.

## File Structure

- `src/scenes/_host/postfx/types.ts` (신규) — `PostFXPreset`, `PresetUniforms`.
- `src/scenes/_host/postfx/presets.ts` (신규) — 프리셋 → uniform 매핑, `resolvePreset`.
- `src/scenes/_host/postfx/shader.ts` (신규) — GLSL vertex/fragment 소스 문자열.
- `src/scenes/_host/postfx/glRenderer.ts` (신규) — WebGL2 래퍼: 컴파일·쿼드·텍스처 업로드·드로우·리사이즈·dispose·컨텍스트 로스.
- `src/scenes/_host/types.ts` (수정) — `UseSceneCanvasOptions` 에 `postFX?`, `preset?` 추가.
- `src/scenes/_host/useSceneCanvas.ts` (수정) — postFX 경로 통합.
- 큐레이션 씬들의 `Scene.tsx` (수정) — `useSceneCanvas(..., { running, postFX: true, preset: '...' })` 한 줄.
- `tests/unit/postfx-presets.ts` (신규) — 프리셋 어서션(tsx 실행, Playwright 미수집).
- `tests/visual.spec.ts` (수정) — 큐레이션 씬 1~2개 스냅샷 추가.

---

### Task 1: PostFX 타입 + 프리셋

**Files:**
- Create: `src/scenes/_host/postfx/types.ts`
- Create: `src/scenes/_host/postfx/presets.ts`
- Test: `tests/unit/postfx-presets.ts`

**Interfaces:**
- Produces:
  - `type PostFXPreset = 'phosphor' | 'instrument' | 'clean' | 'boot'`
  - `interface PresetUniforms { curvature: number; aberration: number; bloom: number; scanline: number; grain: number; vignette: number; tint: [number, number, number] }`
  - `const PRESETS: Record<PostFXPreset, PresetUniforms>`
  - `const DEFAULT_PRESET: PostFXPreset` (= `'instrument'`)
  - `function resolvePreset(p?: PostFXPreset): PresetUniforms`

- [ ] **Step 1: 타입 파일 작성**

`src/scenes/_host/postfx/types.ts`:

```ts
// WebGL 후처리 프리셋 타입.

export type PostFXPreset = 'phosphor' | 'instrument' | 'clean' | 'boot'

/** 프래그먼트 셰이더 uniform 값 묶음. 모든 강도는 0~1 정규화(aberration 만 px). */
export interface PresetUniforms {
  /** barrel 곡률. DOM 오버레이와 어긋나므로 기본 0 권장. */
  curvature: number
  /** 색수차 — RGB 채널 샘플 오프셋(px). */
  aberration: number
  /** 글로우(이웃 샘플 가중) 강도 0~1. */
  bloom: number
  /** 스캔라인 강도 0~1. */
  scanline: number
  /** 필름 그레인 강도 0~1. */
  grain: number
  /** 비네팅 강도 0~1. */
  vignette: number
  /** 색조 곱(RGB). 중립이면 [1,1,1]. */
  tint: [number, number, number]
}
```

- [ ] **Step 2: 프리셋 파일 작성**

`src/scenes/_host/postfx/presets.ts`:

```ts
import type { PostFXPreset, PresetUniforms } from './types'

export const DEFAULT_PRESET: PostFXPreset = 'instrument'

/**
 * 도메인별 프리셋. curvature 는 DOM 오버레이와 어긋나므로 기본적으로 0 에 가깝게 둔다.
 * (큐레이션 씬은 DOM 이 희박해 미세 곡률은 허용하지만 안전하게 0~0.02.)
 */
export const PRESETS: Record<PostFXPreset, PresetUniforms> = {
  // 오실로스코프/레이더 등 — 잔광·글로우 강조, 약한 녹색조.
  phosphor: {
    curvature: 0.02,
    aberration: 0.8,
    bloom: 0.35,
    scanline: 0.1,
    grain: 0.05,
    vignette: 0.35,
    tint: [0.92, 1.0, 0.94],
  },
  // 기본 — 계측/제어. 선명, 곡률 0, 은은.
  instrument: {
    curvature: 0.0,
    aberration: 0.5,
    bloom: 0.15,
    scanline: 0.05,
    grain: 0.03,
    vignette: 0.25,
    tint: [1.0, 1.0, 1.0],
  },
  // 클린 — 차트/대시보드형. 거의 무효과.
  clean: {
    curvature: 0.0,
    aberration: 0.0,
    bloom: 0.06,
    scanline: 0.0,
    grain: 0.015,
    vignette: 0.15,
    tint: [1.0, 1.0, 1.0],
  },
  // BIOS 부팅 등 — 글리치·노이즈·스캔라인 강. DOM 거의 없는 씬 전용이므로 곡률 허용.
  boot: {
    curvature: 0.06,
    aberration: 1.2,
    bloom: 0.25,
    scanline: 0.18,
    grain: 0.1,
    vignette: 0.4,
    tint: [0.96, 0.99, 1.0],
  },
}

/** preset 미지정 시 DEFAULT_PRESET 으로 해석. */
export function resolvePreset(p?: PostFXPreset): PresetUniforms {
  return PRESETS[p ?? DEFAULT_PRESET]
}
```

- [ ] **Step 3: 실패하는 어서션 테스트 작성**

`tests/unit/postfx-presets.ts`:

```ts
// 순수 함수 어서션. 실행: npx tsx tests/unit/postfx-presets.ts
// (파일명에 test/spec 없음 → Playwright 가 수집하지 않음.)
import assert from 'node:assert/strict'
import { PRESETS, DEFAULT_PRESET, resolvePreset } from '../../src/scenes/_host/postfx/presets'
import type { PostFXPreset } from '../../src/scenes/_host/postfx/types'

const ALL: PostFXPreset[] = ['phosphor', 'instrument', 'clean', 'boot']

// 모든 프리셋이 정의돼 있다.
for (const k of ALL) assert.ok(PRESETS[k], `missing preset: ${k}`)

// 기본 프리셋은 instrument, curvature 0 (DOM 어긋남 방지).
assert.equal(DEFAULT_PRESET, 'instrument')
assert.equal(PRESETS.instrument.curvature, 0)

// resolvePreset: 미지정 → 기본, 지정 → 해당.
assert.deepEqual(resolvePreset(), PRESETS.instrument)
assert.deepEqual(resolvePreset('phosphor'), PRESETS.phosphor)

// tint 는 길이 3.
for (const k of ALL) assert.equal(PRESETS[k].tint.length, 3, `tint len ${k}`)

// 모든 강도는 음수가 아니다.
for (const k of ALL) {
  const u = PRESETS[k]
  for (const [field, v] of Object.entries(u)) {
    if (field === 'tint') continue
    assert.ok((v as number) >= 0, `${k}.${field} < 0`)
  }
}

console.log('postfx-presets: all assertions passed')
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx tsx tests/unit/postfx-presets.ts`
Expected: `postfx-presets: all assertions passed` (종료코드 0)

- [ ] **Step 5: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/scenes/_host/postfx/types.ts src/scenes/_host/postfx/presets.ts tests/unit/postfx-presets.ts
git commit -m "feat(postfx): preset 타입·값 + 어서션 테스트"
```

---

### Task 2: GLSL 셰이더 소스

**Files:**
- Create: `src/scenes/_host/postfx/shader.ts`

**Interfaces:**
- Consumes: 없음(순수 문자열).
- Produces:
  - `const VERT_SRC: string`
  - `const FRAG_SRC: string`
  - frag uniform 계약(다음 Task 의 glRenderer 가 set): `uTex`(sampler2D), `uResolution`(vec2, device px), `uTime`(float, sec), `uCurvature`(float), `uAberration`(float, px), `uBloom`(float), `uScanline`(float), `uGrain`(float), `uVignette`(float), `uTint`(vec3).

- [ ] **Step 1: 셰이더 파일 작성**

`src/scenes/_host/postfx/shader.ts`:

```ts
// WebGL2 풀스크린 쿼드 후처리 셰이더(단일 패스).
// 곡률·색수차·스캔라인·그레인·비네팅·값싼 글로우 근사.

export const VERT_SRC = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG_SRC = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTex;
uniform vec2  uResolution; // device px
uniform float uTime;       // sec
uniform float uCurvature;
uniform float uAberration; // px
uniform float uBloom;
uniform float uScanline;
uniform float uGrain;
uniform float uVignette;
uniform vec3  uTint;

// 값싼 해시 노이즈.
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// barrel 곡률로 UV 를 안쪽으로 휘게. curvature=0 이면 항등.
vec2 curve(vec2 uv, float amt) {
  if (amt <= 0.0) return uv;
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + amt * dot(c, c);
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = curve(vUv, uCurvature);

  // 곡률로 화면 밖으로 나간 영역은 검정.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // 색수차 — 화면 중심에서 멀수록 RGB 분리.
  vec2 px = uAberration / uResolution;
  vec2 dir = (uv - 0.5);
  float r = texture(uTex, uv + dir * px.x).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - dir * px.x).b;
  vec3 col = vec3(r, g, b);

  // 값싼 글로우 근사 — 이웃 4탭 평균을 가산.
  if (uBloom > 0.0) {
    vec2 o = 1.5 / uResolution;
    vec3 sum = texture(uTex, uv + vec2(o.x, 0.0)).rgb
             + texture(uTex, uv - vec2(o.x, 0.0)).rgb
             + texture(uTex, uv + vec2(0.0, o.y)).rgb
             + texture(uTex, uv - vec2(0.0, o.y)).rgb;
    col += (sum * 0.25) * uBloom;
  }

  // 스캔라인 — 세로 방향 명암 변조(시간에 따라 미세 스크롤).
  if (uScanline > 0.0) {
    float line = sin((uv.y * uResolution.y * 3.14159) + uTime * 2.0);
    col *= 1.0 - uScanline * (0.5 + 0.5 * line) * 0.5;
  }

  // 필름 그레인.
  if (uGrain > 0.0) {
    float n = hash(uv * uResolution + uTime * 60.0) - 0.5;
    col += n * uGrain;
  }

  // 비네팅.
  if (uVignette > 0.0) {
    float d = distance(uv, vec2(0.5));
    col *= 1.0 - uVignette * smoothstep(0.4, 0.85, d);
  }

  col *= uTint;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/scenes/_host/postfx/shader.ts
git commit -m "feat(postfx): GLSL 단일 패스 후처리 셰이더"
```

---

### Task 3: WebGL2 렌더러 래퍼

**Files:**
- Create: `src/scenes/_host/postfx/glRenderer.ts`

**Interfaces:**
- Consumes: `VERT_SRC`, `FRAG_SRC` (Task 2); `PresetUniforms` (Task 1).
- Produces:
  - `interface GlPostFX { resize(wCss: number, hCss: number, dpr: number): void; render(source: TexImageSource, timeSec: number): void; dispose(): void; readonly lost: boolean }`
  - `function createGlPostFX(canvas: HTMLCanvasElement, uniforms: PresetUniforms): GlPostFX | null` — webgl2 불가 시 `null`.

- [ ] **Step 1: 렌더러 파일 작성**

`src/scenes/_host/postfx/glRenderer.ts`:

```ts
import { FRAG_SRC, VERT_SRC } from './shader'
import type { PresetUniforms } from './types'

export interface GlPostFX {
  /** CSS px + dpr 로 캔버스 픽셀버퍼·뷰포트 리사이즈. */
  resize(wCss: number, hCss: number, dpr: number): void
  /** source(offscreen 2D 캔버스 등)를 텍스처로 받아 한 프레임 후처리 렌더. */
  render(source: TexImageSource, timeSec: number): void
  /** GL 리소스 해제 + 리스너 제거. */
  dispose(): void
  /** 컨텍스트 로스 상태. true 면 호출부가 2D 폴백으로 전환해야 한다. */
  readonly lost: boolean
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type)
  if (!sh) return null
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[postfx] shader compile failed:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/** webgl2 컨텍스트를 잡아 후처리 파이프라인을 만든다. 불가 시 null. */
export function createGlPostFX(
  canvas: HTMLCanvasElement,
  uniforms: PresetUniforms
): GlPostFX | null {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
  if (!vs || !fs) return null

  const prog = gl.createProgram()
  if (!prog) return null
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('[postfx] program link failed:', gl.getProgramInfoLog(prog))
    return null
  }
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  // 풀스크린 트라이앵글(쿼드보다 1드로우 효율).
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  // 캔버스 텍스처는 좌상단 원점 — Y 뒤집어 vUv 와 맞춘다.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  const loc = {
    tex: gl.getUniformLocation(prog, 'uTex'),
    res: gl.getUniformLocation(prog, 'uResolution'),
    time: gl.getUniformLocation(prog, 'uTime'),
    curvature: gl.getUniformLocation(prog, 'uCurvature'),
    aberration: gl.getUniformLocation(prog, 'uAberration'),
    bloom: gl.getUniformLocation(prog, 'uBloom'),
    scanline: gl.getUniformLocation(prog, 'uScanline'),
    grain: gl.getUniformLocation(prog, 'uGrain'),
    vignette: gl.getUniformLocation(prog, 'uVignette'),
    tint: gl.getUniformLocation(prog, 'uTint'),
  }

  let lost = false
  const onLost = (e: Event) => {
    e.preventDefault()
    lost = true
  }
  canvas.addEventListener('webglcontextlost', onLost, false)

  let pxW = 1
  let pxH = 1

  return {
    get lost() {
      return lost
    },
    resize(wCss, hCss, dpr) {
      pxW = Math.max(1, Math.round(wCss * dpr))
      pxH = Math.max(1, Math.round(hCss * dpr))
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW
        canvas.height = pxH
      }
      canvas.style.width = wCss + 'px'
      canvas.style.height = hCss + 'px'
      gl.viewport(0, 0, pxW, pxH)
    },
    render(source, timeSec) {
      if (lost) return
      gl.useProgram(prog)
      gl.bindVertexArray(vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      gl.uniform1i(loc.tex, 0)
      gl.uniform2f(loc.res, pxW, pxH)
      gl.uniform1f(loc.time, timeSec)
      gl.uniform1f(loc.curvature, uniforms.curvature)
      gl.uniform1f(loc.aberration, uniforms.aberration)
      gl.uniform1f(loc.bloom, uniforms.bloom)
      gl.uniform1f(loc.scanline, uniforms.scanline)
      gl.uniform1f(loc.grain, uniforms.grain)
      gl.uniform1f(loc.vignette, uniforms.vignette)
      gl.uniform3f(loc.tint, uniforms.tint[0], uniforms.tint[1], uniforms.tint[2])
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onLost, false)
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(prog)
    },
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: 신규 파일 관련 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/scenes/_host/postfx/glRenderer.ts
git commit -m "feat(postfx): WebGL2 렌더러 래퍼(컴파일·텍스처·리사이즈·로스 처리)"
```

---

### Task 4: useSceneCanvas 에 postFX 경로 통합

**Files:**
- Modify: `src/scenes/_host/types.ts`
- Modify: `src/scenes/_host/useSceneCanvas.ts`

**Interfaces:**
- Consumes: `createGlPostFX`, `GlPostFX` (Task 3); `resolvePreset` (Task 1); `PostFXPreset` (Task 1).
- Produces: 확장된 `UseSceneCanvasOptions { running?, reducedMotionStatic?, postFX?, preset? }`. 반환값(ref 콜백)·draw 계약 불변.

- [ ] **Step 1: 옵션 타입 확장**

`src/scenes/_host/types.ts` 의 `UseSceneCanvasOptions` 를 교체:

```ts
import type { PostFXPreset } from './postfx/types'

export interface UseSceneCanvasOptions {
  /** false 면 tick 을 등록하지 않는다(컬링/일시정지). 기본 true. */
  running?: boolean
  /** prefers-reduced-motion 시 t=0 정적 1프레임만 그린다. 기본 true. */
  reducedMotionStatic?: boolean
  /** true 면 WebGL2 후처리 경로(offscreen 2D → 셰이더). 기본 false(opt-in). */
  postFX?: boolean
  /** 후처리 프리셋. 미지정 시 'instrument'. postFX=true 일 때만 의미. */
  preset?: PostFXPreset
}
```

(파일 상단에 `import type { PostFXPreset } from './postfx/types'` 추가. `Frame`/`TickFn`/`SceneProps` 정의는 그대로 둔다.)

- [ ] **Step 2: useSceneCanvas 전체 교체**

`src/scenes/_host/useSceneCanvas.ts` 전체를 아래로 교체. (postFX 가 꺼져 있으면 기존과 동일 동작 — 회귀 위험을 막기 위해 2D 경로 로직은 보존하고 GL 경로만 분기로 추가.)

```ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from './raf'
import { createGlPostFX, type GlPostFX } from './postfx/glRenderer'
import { resolvePreset } from './postfx/presets'
import type { Frame, TickFn, UseSceneCanvasOptions } from './types'

const DPR_CAP = 2
const MAX_DT = 1 / 20 // 탭 복귀/스톨 후 dt 폭주 캡(초)

/**
 * 기존 씬의 imperative `frame(now)` 캔버스 루프를 React 로 옮기는 어댑터.
 *
 * postFX=false(기본): 씬은 보이는 캔버스의 2D 컨텍스트에 직접 그린다(기존 동작).
 * postFX=true: 씬은 화면 밖 offscreen 2D 캔버스에 그리고, 보이는 캔버스는 WebGL2 로
 *   바뀌어 매 프레임 offscreen 을 텍스처로 받아 후처리 셰이더를 통과시킨다.
 *   webgl2 불가/로스 시 2D 경로로 자동 폴백한다.
 *
 * draw 계약은 두 경로 모두 동일: (ctx2d, frame) => void.
 */
export function useSceneCanvas(draw: TickFn, opts: UseSceneCanvasOptions = {}) {
  const { running = true, reducedMotionStatic = true, postFX = false, preset } = opts

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // 씬 draw 의 대상 2D 컨텍스트. 2D 경로면 보이는 캔버스, GL 경로면 offscreen 캔버스의 것.
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  // GL 경로 전용.
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const glRef = useRef<GlPostFX | null>(null)
  // 이 마운트가 GL 경로로 활성됐는지(폴백 시 false).
  const usingGlRef = useRef(false)

  const drawRef = useRef<TickFn>(draw)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const startRef = useRef(0)
  const lastRef = useRef(0)
  const elapsedRef = useRef(0)
  const [reduced, setReduced] = useState(false)

  drawRef.current = draw

  const applySize = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const parent = cv.parentElement
    const w = parent?.clientWidth || cv.clientWidth || window.innerWidth
    const h = parent?.clientHeight || cv.clientHeight || window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    const prev = sizeRef.current
    if (prev.w === w && prev.h === h && prev.dpr === dpr) return

    if (usingGlRef.current) {
      // GL 경로: offscreen(2D) 은 씬 좌표계, 보이는 캔버스는 GL 이 리사이즈.
      const off = offscreenRef.current
      const offCtx = ctxRef.current
      if (off && offCtx) {
        off.width = Math.max(1, Math.round(w * dpr))
        off.height = Math.max(1, Math.round(h * dpr))
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      glRef.current?.resize(w, h, dpr)
    } else {
      // 2D 경로(기존 동작): 보이는 캔버스 자체에 그린다.
      const ctx = ctxRef.current
      if (!ctx) return
      cv.width = Math.max(1, Math.round(w * dpr))
      cv.height = Math.max(1, Math.round(h * dpr))
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    sizeRef.current = { w, h, dpr }
  }, [])

  // 정지/정적 1프레임 — 누적 시간 지점을 그린다. GL 경로면 셰이더도 한 번 통과.
  const renderStatic = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h } = sizeRef.current
    const t = elapsedRef.current
    drawRef.current(ctx, { w, h, dpr: sizeRef.current.dpr, t, dt: 0 })
    if (usingGlRef.current && offscreenRef.current && glRef.current) {
      // reduced-motion: 시간 고정(t) → 셰이더 애니메이션(grain/scanline) 정지.
      glRef.current.render(offscreenRef.current, reducedMotionStatic && reduced ? 0 : t)
    }
  }, [reduced, reducedMotionStatic])

  // canvas 마운트/언마운트.
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      // 정리(언마운트 또는 교체).
      if (!node) {
        glRef.current?.dispose()
        glRef.current = null
        offscreenRef.current = null
        usingGlRef.current = false
        ctxRef.current = null
        canvasRef.current = null
        return
      }
      canvasRef.current = node

      if (postFX) {
        const off = document.createElement('canvas')
        const offCtx = off.getContext('2d')
        const gl = offCtx ? createGlPostFX(node, resolvePreset(preset)) : null
        if (offCtx && gl) {
          offscreenRef.current = off
          ctxRef.current = offCtx
          glRef.current = gl
          usingGlRef.current = true
          applySize()
          return
        }
        // 폴백: webgl2 불가 → 기존 2D 경로.
      }
      // 2D 경로(기본/폴백).
      usingGlRef.current = false
      offscreenRef.current = null
      glRef.current = null
      ctxRef.current = node.getContext('2d')
      applySize()
    },
    [applySize, postFX, preset]
  )

  // ResizeObserver.
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ro = new ResizeObserver(() => {
      applySize()
      if (!running || reduced) renderStatic()
    })
    if (cv.parentElement) ro.observe(cv.parentElement)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [applySize, renderStatic, running, reduced])

  // reduced-motion 감지.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // tick 루프.
  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return

    if (reduced && reducedMotionStatic) {
      renderStatic()
      return
    }
    if (!running) {
      renderStatic()
      return
    }

    startRef.current = 0
    lastRef.current = 0
    const unsub = subscribe((now) => {
      const ctx = ctxRef.current
      if (!ctx) return
      if (startRef.current === 0) {
        startRef.current = now
        lastRef.current = now
      }
      const t = elapsedRef.current + (now - startRef.current) / 1000
      const dt = Math.min(MAX_DT, (now - lastRef.current) / 1000)
      lastRef.current = now
      const { w, h, dpr } = sizeRef.current
      const f: Frame = { w, h, dpr, t, dt }
      drawRef.current(ctx, f)
      // GL 경로: offscreen → 셰이더 합성. 로스 시 이후 프레임은 no-op(씬은 멈춰도 죽지 않음).
      if (usingGlRef.current && offscreenRef.current && glRef.current) {
        glRef.current.render(offscreenRef.current, t)
      }
    })
    return () => {
      unsub()
      if (startRef.current !== 0) {
        elapsedRef.current += (lastRef.current - startRef.current) / 1000
      }
    }
  }, [running, reduced, reducedMotionStatic, renderStatic])

  return ref
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 4: postFX OFF 회귀 확인 — 기존 비주얼 스냅샷**

Run: `npx playwright test tests/visual.spec.ts`
Expected: 전부 PASS (postFX 기본 OFF 라 기존 씬 렌더 불변. 베이스라인 없으면 먼저
`npx playwright test tests/visual.spec.ts --update-snapshots` 로 생성 후 재실행.)

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/_host/types.ts src/scenes/_host/useSceneCanvas.ts
git commit -m "feat(postfx): useSceneCanvas 에 opt-in WebGL 후처리 경로 통합"
```

---

### Task 5: 큐레이션 씬에 opt-in 활성 + 시각 확인

**Files:**
- Modify: `src/scenes/42-era-shift/Scene.tsx` (대표 1개 먼저)
- Modify: 나머지 큐레이션 씬들의 `Scene.tsx` (각 1줄)

**Interfaces:**
- Consumes: Task 4 의 `useSceneCanvas(draw, { running, postFX, preset })`.

대상(스펙 큐레이션 리스트): `28-gap-reality`, `29-lost-in-translation`, `30-collision`,
`31-cost-cascade`, `32-the-connector`, `33-ax-era`, `36-bridge-experts`, `37-cross-domain`,
`38-ending-catchphrase`, `42-era-shift`, `graphrag`.

- [ ] **Step 1: 대표 1개(42-era-shift) 활성**

`src/scenes/42-era-shift/Scene.tsx` 에서 `useSceneCanvas(...)` 호출의 옵션 객체에 `postFX: true, preset: 'instrument'` 를 추가한다. 예:

```ts
// 변경 전
const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
  /* ...draw 본문 그대로... */
}, { running })

// 변경 후
const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
  /* ...draw 본문 그대로... */
}, { running, postFX: true, preset: 'instrument' })
```

(draw 본문은 절대 수정하지 않는다. 옵션 객체만.)

- [ ] **Step 2: dev 서버에서 육안 확인**

Run: `npm run dev` (백그라운드) → 브라우저에서 `http://localhost:3000/s/42-era-shift`
확인 항목:
- 씬이 정상 렌더되고 은은한 글로우/비네팅이 보인다.
- DOM 자막이 캔버스 위에서 깨지지 않는다(곡률 0 이라 어긋남 없음).
- 콘솔에 `[postfx]` 컴파일/링크 에러가 없다.

문제가 보이면 그 씬은 리스트에서 제외(`postFX` 제거)하고 기록한다.

- [ ] **Step 3: 나머지 큐레이션 씬 활성**

Step 1 과 동일하게 각 씬 `Scene.tsx` 의 `useSceneCanvas` 옵션에 `postFX: true` 추가.
preset 기본은 `instrument`. 더 강한 룩을 원하는 씬은 `preset: 'phosphor'` 사용 가능.
각 씬을 `http://localhost:3000/s/<key>` 로 육안 확인하고, 깨지는 씬은 제외한다.

- [ ] **Step 4: 타입체크 + 린트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add src/scenes/*/Scene.tsx
git commit -m "feat(postfx): 큐레이션 캔버스 씬에 WebGL 후처리 opt-in 활성"
```

---

### Task 6: 시각 회귀 + reduced-motion + 폴백 검증

**Files:**
- Modify: `tests/visual.spec.ts`

**Interfaces:**
- Consumes: 활성된 큐레이션 씬(Task 5).

- [ ] **Step 1: 큐레이션 씬 스냅샷 추가**

`tests/visual.spec.ts` 의 `instrument and scene routes` describe 블록에 추가:

```ts
  test('/s/42-era-shift (postfx)', async ({ page }) => {
    await sceneSnapshot(page, '/s/42-era-shift', 'scene-42-era-shift.png');
  });

  test('/s/graphrag (postfx)', async ({ page }) => {
    await sceneSnapshot(page, '/s/graphrag', 'scene-graphrag.png');
  });
```

- [ ] **Step 2: 베이스라인 생성 + 검증**

Run: `npx playwright test tests/visual.spec.ts --update-snapshots`
그 다음: `npx playwright test tests/visual.spec.ts`
Expected: 전부 PASS. (reduced-motion 경로 — visual.spec 은 `emulateMedia({reducedMotion:'reduce'})`
를 쓰므로, GL 경로가 시간 고정 정적 프레임을 렌더해 결정론적으로 통과해야 한다.
이게 곧 reduced-motion 동작 검증이다.)

- [ ] **Step 3: GL 폴백 수동 검증**

DevTools 에서 WebGL 을 비활성(`chrome://flags` 또는 `--disable-webgl` 로 dev 재기동)하고
`http://localhost:3000/s/42-era-shift` 접속.
Expected: 씬이 후처리 없이 기존 2D 로 정상 렌더(검은 화면/크래시 아님). 콘솔 무에러.
(코드 경로상 `createGlPostFX` 가 null → 2D 폴백.)

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add tests/visual.spec.ts tests/__snapshots__
git commit -m "test(postfx): 큐레이션 씬 시각 회귀 베이스라인 + reduced-motion 검증"
```

---

## Self-Review (작성자 체크 완료)

- **스펙 커버리지:** opt-in 기본 OFF(Task 4 옵션 기본값) · 도메인 프리셋(Task 1) · offscreen→GL 파이프(Task 3·4) · 곡률 기본 0(Task 1 instrument) · reduced-motion 정적 프레임(Task 4 renderStatic/tick) · GL 폴백(Task 4 ref) · 컨텍스트 로스(Task 3 onLost + Task 4 render 가드) · 큐레이션 리스트(Task 5) · 시각 회귀(Task 6). 모두 태스크 존재.
- **플레이스홀더:** 없음 — 모든 코드 스텝은 실제 코드 포함.
- **타입 일관성:** `createGlPostFX`/`GlPostFX`/`resolvePreset`/`PostFXPreset`/`PresetUniforms` 시그니처가 Task 1·3·4 에서 일치. frag uniform 이름이 shader.ts(Task 2) ↔ glRenderer.ts(Task 3) 일치.
- **범위:** 단일 구현 플랜으로 적정. 멀티패스 블룸·DOM 씬·공유 렌더러는 스펙대로 범위 밖.
