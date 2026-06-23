import { INTERLOCK_CIRCUMFERENCE, TF_BARS, TF_COLORS, TF_FILL_HEIGHTS, TF_STAGES, TF_STATES } from './constants'
import type { PidRuntimeRefs } from './types'

export function setTfState(refs: Pick<PidRuntimeRefs, 'smStateRef' | 'smBarRef' | 'smBackoffRef'>, i: number) {
  if (refs.smStateRef.current) {
    refs.smStateRef.current.textContent = TF_STATES[i]
    refs.smStateRef.current.style.fill = TF_COLORS[i]
  }
  if (refs.smBarRef.current) refs.smBarRef.current.textContent = TF_BARS[i]
  if (refs.smBackoffRef.current) refs.smBackoffRef.current.textContent = TF_STAGES[i]
  return TF_FILL_HEIGHTS[i]
}

export function updateApplyFill(fill: SVGRectElement | null, h: number) {
  if (!fill) return
  fill.setAttribute('y', (534 - h).toFixed(1))
  fill.setAttribute('height', h.toFixed(1))
}

export function updateTicker(dot: SVGCircleElement | null, hz: SVGTextElement | null, tickPhase: number) {
  const v = (Math.sin(tickPhase) + 1) / 2
  const r = 5 + v * 2
  const op = 0.2 + v * 0.8
  if (dot) {
    dot.setAttribute('r', r.toFixed(2))
    dot.setAttribute('opacity', op.toFixed(3))
  }
  if (hz) hz.setAttribute('opacity', (0.6 + v * 0.4).toFixed(3))
}

export function applyGaugeRaw(refs: Pick<PidRuntimeRefs, 'ilGaugeRef' | 'ilPctRef'>, p: number) {
  const frac = Math.max(0, Math.min(1, p / 15))
  refs.ilGaugeRef.current?.setAttribute('stroke-dashoffset', (INTERLOCK_CIRCUMFERENCE - INTERLOCK_CIRCUMFERENCE * frac).toFixed(2))
  if (refs.ilPctRef.current) {
    refs.ilPctRef.current.textContent = p >= 9.5 ? 'BLOCK' : p > 0.5 ? 'CHECK' : 'PASS'
  }
}

export function paintInterlockBlocked(refs: PidRuntimeRefs, goodClass: string) {
  refs.ilGaugeRef.current?.setAttribute('stroke', 'var(--trip)')
  refs.ilPctRef.current?.setAttribute('fill', 'var(--trip)')
  refs.ilBoxRef.current?.setAttribute('stroke', 'var(--trip)')
  if (refs.ilStatusRef.current) {
    refs.ilStatusRef.current.textContent = 'WAITING'
    refs.ilStatusRef.current.setAttribute('fill', 'var(--trip)')
  }
  if (refs.deployRORef.current) {
    refs.deployRORef.current.textContent = 'BLOCKED'
    refs.deployRORef.current.style.color = 'var(--trip)'
    refs.deployRORef.current.classList.remove(goodClass)
  }
  applyGaugeRaw(refs, 15)
}

export function paintInterlockChecking(refs: PidRuntimeRefs, goodClass: string) {
  if (refs.ilStatusRef.current) {
    refs.ilStatusRef.current.textContent = 'CHECKING'
    refs.ilStatusRef.current.setAttribute('fill', 'var(--amber)')
  }
  refs.ilGaugeRef.current?.setAttribute('stroke', 'var(--amber)')
  refs.ilPctRef.current?.setAttribute('fill', 'var(--amber)')
  refs.ilBoxRef.current?.setAttribute('stroke', 'var(--amber)')
  if (refs.deployRORef.current) {
    refs.deployRORef.current.textContent = 'VERIFY'
    refs.deployRORef.current.style.color = 'var(--amber)'
    refs.deployRORef.current.classList.remove(goodClass)
  }
}

export function paintInterlockGreen(refs: PidRuntimeRefs, goodClass: string) {
  refs.ilGaugeRef.current?.setAttribute('stroke', 'var(--accent3)')
  refs.ilPctRef.current?.setAttribute('fill', 'var(--accent3)')
  refs.ilBoxRef.current?.setAttribute('stroke', 'var(--accent3)')
  if (refs.ilStatusRef.current) {
    refs.ilStatusRef.current.textContent = 'GREEN'
    refs.ilStatusRef.current.setAttribute('fill', 'var(--accent3)')
  }
  if (refs.deployRORef.current) {
    refs.deployRORef.current.textContent = 'ALLOWED'
    refs.deployRORef.current.style.color = 'var(--accent3)'
    refs.deployRORef.current.classList.add(goodClass)
  }
  applyGaugeRaw(refs, 0)
}
