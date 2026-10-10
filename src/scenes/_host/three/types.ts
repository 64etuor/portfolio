import type * as THREE_NS from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export type Three = typeof THREE_NS

/** setup(ctx) 가 받는 하네스 소유 객체들. */
export interface ThreeContext {
  /** 동적 import 된 three 네임스페이스 — 씬은 `import * as THREE` 대신 이걸 쓴다(코드스플릿 유지). */
  THREE: Three
  renderer: THREE_NS.WebGLRenderer
  scene: THREE_NS.Scene
  camera: THREE_NS.PerspectiveCamera
  /** bloom:false 면 null — 그땐 renderer.render 로 직접 그린다. */
  composer: EffectComposer | null
  bloom: UnrealBloomPass | null
  /** 캔버스를 담은 컨테이너(HUD 투영 좌표 기준). */
  container: HTMLDivElement
  /** 현재 CSS px 크기. resize 시 갱신된다. */
  size: { w: number; h: number; dpr: number }
}

export interface ThreeSetupResult {
  /**
   * 매 프레임 호출. t = 누적 재생 시간(초, 일시정지 사이 보존), dt = 프레임 간격(정지 프레임이면 0).
   * **t 만으로 상태를 결정적으로 계산**해야 정지 프레임·프리스테이징이 같은 그림을 낸다.
   */
  update(t: number, dt: number): void
  resize?(w: number, h: number): void
  /** 하네스가 scene.traverse 로 geometry/material/texture 를 정리한다. 그 외(리스너, 커스텀 RT 등)만. */
  dispose?(): void
}

export type ThreeSetup = (ctx: ThreeContext) => ThreeSetupResult | Promise<ThreeSetupResult>

export interface ThreeSceneOptions {
  running?: boolean
  /** 첫 프레임 페인트 후 1회. 필름 클럭 arming 용. */
  onReady?: () => void
  /** false 면 후처리 없음. 기본 strength .9 / radius .55 / threshold .2 */
  bloom?: false | { strength?: number; radius?: number; threshold?: number }
  fov?: number
  near?: number
  far?: number
  exposure?: number
  background?: string
}
