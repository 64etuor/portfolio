'use client'

import { useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { rgba, mix } from '../_host/color'
import { clamp, lerp, ease } from '../_host/math'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneClock } from '../_host/sceneClock'
import { COLD, COLDB, CYCLE, DEV, FIELD, NB, WARM, WARMB } from './constants'
import { applyHero, devC, drawGears, drawSeam, drawSystem, drawTokens, fieldC, focalBreath, persp, setLabel } from './draw'
import { makeProcNodes, syncLayout, syncSide, unloadAll } from './runtime'
import type { BucketItem, LayoutState, ProcNode } from './types'
import { PerspectivesView } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  const fieldHeroRef = useRef<HTMLDivElement | null>(null)
  const devHeroRef = useRef<HTMLDivElement | null>(null)
  const fieldDimRefs = useRef<Array<HTMLSpanElement | null>>([])
  const devDimRefs = useRef<Array<HTMLSpanElement | null>>([])
  const fieldProcRefs = useRef<ProcNode[]>(makeProcNodes(FIELD.length))
  const devProcRefs = useRef<ProcNode[]>(makeProcNodes(DEV.length))
  const vlabelRef = useRef<HTMLSpanElement | null>(null)
  const puckRef = useRef<HTMLSpanElement | null>(null)
  const layoutRef = useRef<LayoutState>({ w: -1, h: -1, pw: 300, ph: 169, gears: [], codeCols: [], archBox: [] })
  const bucketsRef = useRef<BucketItem[][]>(Array.from({ length: NB }, () => []))
  const heroStateRef = useRef(new WeakMap<HTMLElement, { fb: number; ty: number }>())
  const labelStateRef = useRef({ lab: '', labA: -1 })
  const offsetRef = useRef<number | null>(null)

  useSceneReady(onReady)
  const clock = useSceneClock()

  const getOffset = () => {
    if (offsetRef.current === null) {
      offsetRef.current = typeof window === 'undefined' ? 0 : parseFloat(new URLSearchParams(window.location.search).get('t') || '') || 0
    }
    return offsetRef.current
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w
    const H = fr.h
    const time = fr.t + getOffset()
    const f = (time % CYCLE) / CYCLE
    const p = persp(f)
    const sf = ease(p)
    const fieldVis = 1 - sf
    const devVis = sf
    const layout = syncLayout(fieldProcRefs.current, devProcRefs.current, layoutRef, W, H)

    const breath = focalBreath(f, time)
    const focalX = lerp(W * 0.3, W * 0.7, clamp(sf + breath, 0, 1))

    g.clearRect(0, 0, W, H)
    drawGears(g, time, fieldVis, layout.gears)
    drawSystem(g, W, H, time, devVis, layout.codeCols, layout.archBox)
    drawTokens(g, W, H, time, focalX, bucketsRef.current)
    drawSeam(g, W, H, time, sf)

    const intro = ease(f / 0.06)
    applyHero(fieldHeroRef.current, fieldVis, fieldDimRefs.current, (1 - intro) * 3.2, intro, heroStateRef.current)
    applyHero(devHeroRef.current, devVis, devDimRefs.current, 0, 1, heroStateRef.current)

    // Shed the iframes once the film's master clock says this shot has overrun its
    // manifest budget (remainingMs goes negative — see sceneClock.ts): each loaded
    // iframe is its own document with its own rAF loop, ticking regardless of
    // `running`, and holding the main thread busy is exactly what delays the next
    // shot's paint/reveal (the cause of the handoff being late in the first place).
    // Below the gate, keep the normal pan-driven load/unload.
    const overrun = (clock?.remainingMs?.() ?? 1) < 0
    if (overrun) {
      unloadAll(fieldProcRefs.current)
      unloadAll(devProcRefs.current)
    } else {
      syncSide(fieldProcRefs.current, FIELD, fieldC, fieldVis, f)
      syncSide(devProcRefs.current, DEV, devC, devVis, f)
    }

    const puck = puckRef.current
    const pc = mix(WARM, COLD, sf)
    if (puck) {
      puck.style.left = `${(sf * 100).toFixed(2)}%`
      puck.style.background = rgba(mix(WARMB, COLDB, sf), 1)
      puck.style.boxShadow = `0 0 14px ${rgba(pc, 0.7)}`
    }
    setLabel(vlabelRef.current, p, pc, labelStateRef.current)
  }, { running })

  return (
    <PerspectivesView
      canvasRef={ref}
      fieldHeroRef={fieldHeroRef}
      devHeroRef={devHeroRef}
      fieldDimRefs={fieldDimRefs}
      devDimRefs={devDimRefs}
      fieldProcRefs={fieldProcRefs}
      devProcRefs={devProcRefs}
      vlabelRef={vlabelRef}
      puckRef={puckRef}
    />
  )
}
