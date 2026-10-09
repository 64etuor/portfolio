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

// projectToScreen 용 스크래치 — 매 프레임 라벨마다 clone() 하던 할당을 없앤다.
let scratch: THREE_NS.Vector3 | null = null

/**
 * 월드 좌표 → 컨테이너 CSS px. HUD(DOM) 라벨을 3D 앵커에 붙일 때.
 * visible=false 면 카메라 뒤.
 */
export function projectToScreen(
  ctx: ThreeContext,
  pos: THREE_NS.Vector3,
  out: { x: number; y: number; visible: boolean } = { x: 0, y: 0, visible: false },
) {
  scratch ??= pos.clone()
  const v = scratch.copy(pos).project(ctx.camera)
  out.x = (v.x * 0.5 + 0.5) * ctx.size.w
  out.y = (-v.y * 0.5 + 0.5) * ctx.size.h
  out.visible = v.z < 1 && v.z > -1
  return out
}

// ── HUD DOM 쓰기 캐시 ──
// 매 프레임 같은 값을 style/textContent/dataset 에 다시 쓰면 문자열 파싱·스타일 무효화(텍스트는
// 노드 교체 + 레이아웃)가 매번 일어난다. 마지막으로 쓴 값을 요소별로 기억해 바뀔 때만 쓴다.
// 읽기(레이아웃)는 하지 않는다 — 쓰기 전용이라 강제 동기 리플로가 생기지 않는다.
const lastWrites = new WeakMap<Element, Map<string, string>>()
function changed(el: Element, key: string, v: string): boolean {
  let m = lastWrites.get(el)
  if (!m) {
    m = new Map()
    lastWrites.set(el, m)
  }
  if (m.get(key) === v) return false
  m.set(key, v)
  return true
}

/** el.style[prop] = v — 값이 바뀔 때만. prop 은 camelCase 또는 --커스텀 속성. */
export function setStyle(el: HTMLElement | SVGElement | null | undefined, prop: string, v: string) {
  if (!el || !changed(el, prop, v)) return
  if (prop.startsWith('--')) el.style.setProperty(prop, v)
  else (el.style as unknown as Record<string, string>)[prop] = v
}

/** el.textContent = v — 값이 바뀔 때만. */
export function setText(el: Element | null | undefined, v: string) {
  if (!el || !changed(el, '#text', v)) return
  el.textContent = v
}

/** el.dataset[key] = v — 값이 바뀔 때만. */
export function setData(el: HTMLElement | null | undefined, key: string, v: string) {
  if (!el || !changed(el, `data-${key}`, v)) return
  el.dataset[key] = v
}

/** opacity 문자열(소수 3자리). */
export const op3 = (x: number) => x.toFixed(3)

/** DOM 요소를 투영 좌표로 이동(transform 만 — 레이아웃 없음). 값이 바뀔 때만 쓴다. */
export function placeLabel(el: HTMLElement | null, x: number, y: number, opacity = 1) {
  if (!el) return
  setStyle(el, 'transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`)
  setStyle(el, 'opacity', opacity.toFixed(3))
}

// toLocaleString 은 호출마다 로캘 데이터를 해석한다 — 자릿수별 포매터를 모듈에서 한 번 만든다.
const FMTS = [0, 1, 2, 3].map((d) => new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }))

/** 카운트업 숫자 포맷(정수/소수 자릿수). */
export function countUp(from: number, to: number, p: number, digits = 0): string {
  const v = from + (to - from) * p
  const f = FMTS[digits]
  return f ? f.format(v) : v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
