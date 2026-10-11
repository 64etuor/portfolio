'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import './en'
import { SceneShell } from './view'
import { createRuntimeGate, setupRuntime, syncRuntimeGate } from './runtime'

/* ════════════════════════════════════════════════════════════════
   DB 모델링 & 데이터 아키텍처 (db-architecture.html 이식 / 실용적 포팅)
   3개 뷰: 도메인 ERD · 데이터 아키텍처 플로우 · 상태머신/재귀 CTE.
   순수 DOM/SVG 기반 인터랙티브 — 캔버스 드로우 루프 없음. 정적 셸은 JSX,
   동적 빌드 DOM/SVG·자동 순회·CDC 스트림은 useEffect 안에서 imperative 유지
   (스펙 규칙 6: 복잡한 동적 DOM 은 ref 컨테이너에 imperative 허용).
   하네스 계약상 SceneHost + useSceneCanvas 사용 — 캔버스는 베이스 배경만 칠한다.
   수치/카피/색/모션 원본과 동일.

   이 파일은 얇은 오케스트레이터:
   - 정적 셸 JSX → view.tsx (SceneShell)
   - imperative 런타임(DOM 빌드·rAF/interval·이벤트) → runtime.ts (setupRuntime)
   - 순수 SVG/HTML 문자열 빌더 → draw.ts · 타입 → types.ts
   ════════════════════════════════════════════════════════════════ */

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const gateRef = useRef(createRuntimeGate(running))

  // 하네스 계약 충족용 베이스 배경 캔버스(불투명 DOM 뒤에 깔림). 베이스 톤만 칠한다.
  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, f: Frame) => {
    g.fillStyle = '#0a0e14'
    g.fillRect(0, 0, f.w, f.h)
  }, { running })

  useSceneReady(onReady)

  useEffect(() => {
    syncRuntimeGate(gateRef.current, running)
  }, [running])

  useEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl) return
    return setupRuntime(rootEl, gateRef.current)
  }, [])

  return (
    <SceneHost bg="#0a0e14">
      <canvas ref={canvasRef} className={s.bgCanvas} />
      <div ref={rootRef} className={s.root}>
        <SceneShell />
      </div>
    </SceneHost>
  )
}
