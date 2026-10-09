import type * as THREE_NS from 'three'
import type { ThreeContext } from './types'

// three 씬 공용 헬퍼 — 타임라인/이징/HUD 투영.

/** 0..1 클램프된 구간 진행도: t 가 a→b 를 지나는 비율. */
export const seg = (t: number, a: number, b: number): number => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a))

export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3)
export const easeInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeOutExpo = (x: number): number => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x))
export const easeOutBack = (x: number): number => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** 반복 루프 시간: 길이 `period` 의 사이클 안에서의 위치(초). 씬 타임라인을 무한 반복할 때. */
export const loopT = (t: number, period: number): number => ((t % period) + period) % period

/**
 * 월드 좌표 → 컨테이너 CSS px. HUD(DOM) 라벨을 3D 앵커에 붙일 때.
 * visible=false 면 카메라 뒤.
 */
export function projectToScreen(
  ctx: ThreeContext,
  pos: THREE_NS.Vector3,
  out: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false },
) {
  const v = pos.clone().project(ctx.camera)
  out.x = (v.x * 0.5 + 0.5) * ctx.size.w
  out.y = (-v.y * 0.5 + 0.5) * ctx.size.h
  out.visible = v.z < 1 && v.z > -1
  return out
}

/** DOM 요소를 투영 좌표로 이동(transform 만 — 레이아웃 없음). */
export function placeLabel(el: HTMLElement | null, x: number, y: number, opacity = 1) {
  if (!el) return
  el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
  el.style.opacity = opacity.toFixed(3)
}

/** 카운트업 숫자 포맷(정수/소수 자릿수). */
export function countUp(from: number, to: number, p: number, digits = 0): string {
  const v = from + (to - from) * p
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
