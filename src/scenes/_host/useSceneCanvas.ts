'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from './raf'
import type { Frame, TickFn, UseSceneCanvasOptions } from './types'
import { localizeSceneText } from './localize'

const DPR_CAP = 2
const MAX_DT = 1 / 20 // 탭 복귀/스톨 후 dt 폭주 캡(초)
function localizeCanvasText(ctx: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const fillText = ctx.fillText.bind(ctx)
  const strokeText = ctx.strokeText.bind(ctx)
  const resolve = (text: string) => localizeSceneText(text, document.documentElement.lang === 'en' ? 'en' : 'ko')
  ctx.fillText = ((text: string, x: number, y: number, maxWidth?: number) => fillText(resolve(text), x, y, maxWidth)) as CanvasRenderingContext2D['fillText']
  ctx.strokeText = ((text: string, x: number, y: number, maxWidth?: number) => strokeText(resolve(text), x, y, maxWidth)) as CanvasRenderingContext2D['strokeText']
  return ctx
}

/**
 * 기존 씬의 imperative `frame(now)` 캔버스 루프를 React 로 옮기는 어댑터.
 *
 * 하네스가 소유: canvas 마운트, DPR≤2 + setTransform, ResizeObserver, reduced-motion,
 * 공유 rAF 구독(running && !reduced 일 때만), 정리.
 * 씬이 소유: draw 콜백 본문만 — (now-start)/1000 → f.t, W/H → f.w/f.h, g → ctx.
 *
 * 반환된 ref 콜백을 <canvas> 에 붙인다. 캔버스는 CSS 로 부모를 꽉 채우게(100%/100%)
 * 두면 ResizeObserver 가 픽셀 버퍼를 맞춘다.
 */
export function useSceneCanvas(draw: TickFn, opts: UseSceneCanvasOptions = {}) {
  const { running = true, reducedMotionStatic = true } = opts

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawRef = useRef<TickFn>(draw)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const startRef = useRef(0)
  const lastRef = useRef(0)
  // 누적 재생 시간(초). running 토글(일시정지/재개·뷰포트 진출입) 사이에 보존되어
  // 재개 시 t 가 0 으로 리셋되지 않고 멈춘 지점부터 이어진다(freeze-resume).
  const elapsedRef = useRef(0)
  // reduced-motion 을 state 로 관리 — OS 설정 변경 시 tick effect 가 재실행된다.
  const [reduced, setReduced] = useState(false)

  // 최신 draw 를 항상 참조(의존성으로 인한 재구독 없이).
  drawRef.current = draw

  const applySize = useCallback(() => {
    const cv = canvasRef.current
    const ctx = ctxRef.current
    if (!cv || !ctx) return
    const parent = cv.parentElement
    const w = parent?.clientWidth || cv.clientWidth || window.innerWidth
    const h = parent?.clientHeight || cv.clientHeight || window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
    // 실제로 값이 바뀔 때만 캔버스를 건드린다(불필요한 픽셀 버퍼 재할당 방지).
    const prev = sizeRef.current
    if (prev.w === w && prev.h === h && prev.dpr === dpr) return
    cv.width = Math.max(1, Math.round(w * dpr))
    cv.height = Math.max(1, Math.round(h * dpr))
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    sizeRef.current = { w, h, dpr }
  }, [])

  // 정지 프레임 — 누적 시간(elapsedRef) 지점을 그린다. 최초 마운트/감속모드면 0(=인트로),
  // 일시정지면 멈춘 그 순간을 다시 그려 화면이 인트로로 튀지 않는다.
  const renderStatic = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h, dpr } = sizeRef.current
    drawRef.current(ctx, { w, h, dpr, t: elapsedRef.current, dt: 0 })
  }, [])

  // canvas 마운트/언마운트.
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node
      if (node) {
        const context = node.getContext('2d')
        ctxRef.current = context ? localizeCanvasText(context) : null
        applySize()
      } else {
        ctxRef.current = null
      }
    },
    [applySize]
  )

  // ResizeObserver — 부모 크기 변화에 픽셀 버퍼 동기화. 정지 중이면 정적 프레임 재그림.
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

  // reduced-motion 감지 — state 로 관리해 변경 시 tick effect 재실행.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // tick 루프 — running 이고 reduced 가 아니면 공유 rAF 구독. 아니면 정적 1프레임.
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
    })
    // running 이 꺼지거나 언마운트될 때 이번 세션 재생분을 누적 → 재개 시 이어서.
    return () => {
      unsub()
      if (startRef.current !== 0) {
        elapsedRef.current += (lastRef.current - startRef.current) / 1000
      }
    }
  }, [running, reduced, reducedMotionStatic, renderStatic])

  return ref
}
