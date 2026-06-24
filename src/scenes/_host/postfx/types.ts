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
