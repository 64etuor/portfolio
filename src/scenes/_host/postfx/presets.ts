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
  // 기본 — 계측/제어. 선명, 곡률 0, 은은하지만 존재감 있게.
  instrument: {
    curvature: 0.0,
    aberration: 0.6,
    bloom: 0.2,
    scanline: 0.07,
    grain: 0.045,
    vignette: 0.32,
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
