'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import { SceneShell } from './view'
import { setupRuntime } from './runtime'

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
  // 씬이 화면 밖(running=false)일 때 자체 rAF/interval 틱을 멈추기 위한 게이트.
  // ref 로 들고 useEffect 내부 루프가 매 틱 읽는다. running=true 동안엔 동작 동일.
  const runningRef = useRef(running)
  // running 이 false→true 로 바뀔 때 멈춘 rAF 루프를 재가동하는 콜백을 등록한다.
  const resumeRef = useRef<(() => void) | null>(null)

  // 하네스 계약 충족용 베이스 배경 캔버스(불투명 DOM 뒤에 깔림). 베이스 톤만 칠한다.
  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, f: Frame) => {
    g.fillStyle = '#0a0e14'
    g.fillRect(0, 0, f.w, f.h)
  }, { running })

  useSceneReady(onReady)

  // running 프롭 → runningRef 동기화. false→true 전환 시 멈췄던 rAF 루프 재가동.
  useEffect(() => {
    const wasRunning = runningRef.current
    runningRef.current = running
    if (running && !wasRunning) resumeRef.current?.()
  }, [running])

  useEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl) return
    return setupRuntime(rootEl, { runningRef, resumeRef })
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
