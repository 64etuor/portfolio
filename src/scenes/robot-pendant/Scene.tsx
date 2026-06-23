'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { createRuntime } from './dom'
import { drawRuntime } from './draw'
import { initRuntime, wireEvents } from './runtime'
import type { Runtime } from './types'
import { DeviceView } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Runtime | null>(null)

  useSceneReady(onReady)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const rt = createRuntime(root)
    runtimeRef.current = rt
    const cleanups = wireEvents(rt)
    initRuntime(rt)
    return () => {
      cleanups.forEach((cleanup) => cleanup())
      rt.timers.forEach((t) => window.clearTimeout(t))
      rt.intervals.forEach((t) => window.clearInterval(t))
      if (rt.toastT !== null) window.clearTimeout(rt.toastT)
      runtimeRef.current = null
    }
  }, [])

  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const rt = runtimeRef.current
    if (!rt) {
      g.clearRect(0, 0, fr.w, fr.h)
      return
    }
    drawRuntime(g, fr, rt)
  }, { running })

  return <DeviceView rootRef={rootRef} canvasRef={canvasRef} />
}
