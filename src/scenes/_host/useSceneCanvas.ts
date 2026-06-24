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

  useEffect(() => {
    drawRef.current = draw
  }, [draw])

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
