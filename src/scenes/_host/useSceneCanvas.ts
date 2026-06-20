'use client'

import { useCallback, useEffect, useRef } from 'react'
import { subscribe } from './raf'
import type { Frame, TickFn, UseSceneCanvasOptions } from './types'

const DPR_CAP = 2
const MAX_DT = 1 / 20 // 탭 복귀/스톨 후 dt 폭주 캡(초)

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
  const reducedRef = useRef(false)

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
    cv.width = Math.max(1, Math.round(w * dpr))
    cv.height = Math.max(1, Math.round(h * dpr))
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    sizeRef.current = { w, h, dpr }
  }, [])

  const renderStatic = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h, dpr } = sizeRef.current
    drawRef.current(ctx, { w, h, dpr, t: 0, dt: 0 })
  }, [])

  // canvas 마운트/언마운트.
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node
      if (node) {
        ctxRef.current = node.getContext('2d')
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
      if (!running || reducedRef.current) renderStatic()
    })
    if (cv.parentElement) ro.observe(cv.parentElement)
    ro.observe(cv)
    return () => ro.disconnect()
  }, [applySize, renderStatic, running])

  // reduced-motion 감지.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => {
      reducedRef.current = mq.matches
    }
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // tick 루프 — running 이고 reduced 가 아니면 공유 rAF 구독. 아니면 정적 1프레임.
  useEffect(() => {
    if (!canvasRef.current || !ctxRef.current) return

    if (reducedRef.current && reducedMotionStatic) {
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
      const t = (now - startRef.current) / 1000
      const dt = Math.min(MAX_DT, (now - lastRef.current) / 1000)
      lastRef.current = now
      const { w, h, dpr } = sizeRef.current
      const f: Frame = { w, h, dpr, t, dt }
      drawRef.current(ctx, f)
    })
    return unsub
  }, [running, reducedMotionStatic, renderStatic])

  return ref
}
