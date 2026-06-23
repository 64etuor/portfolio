'use client'

import { useEffect, useRef, useState } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { DOE_AT, EVT_INTERVAL, ROW_MS, WELD_LEN, TOP } from './constants'
import { drawLut, drawVisible } from './draw'
import { createEngine, layout, logEvent, prime, pushRow, updateReadouts, updateWeldReadout } from './runtime'
import type { Engine } from './types'
import { SonarWaterfallView } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const engineRef = useRef<Engine | null>(null)
  const lutRef = useRef<HTMLCanvasElement | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const gainRef = useRef<HTMLSpanElement | null>(null)
  const ampRef = useRef<HTMLDivElement | null>(null)
  const forceRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef<HTMLDivElement | null>(null)
  const weldRef = useRef<HTMLDivElement | null>(null)
  const ampStatRef = useRef<HTMLElement | null>(null)
  const sweepRef = useRef<HTMLElement | null>(null)

  useSceneReady(onReady)

  useEffect(() => {
    drawLut(lutRef.current)
  }, [])

  useEffect(() => {
    if (selected === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    if (fr.w <= 0 || fr.h <= 0) return

    if (!engineRef.current) engineRef.current = createEngine()
    const engine = engineRef.current
    const W = Math.max(320, Math.floor(fr.w))
    const H = Math.max(240, Math.floor(fr.h))
    const dpr = fr.dpr || 1
    const sizeKey = `${W}:${H}:${dpr}`
    const t = fr.t * 1000

    if (engine.sizeKey !== sizeKey) {
      layout(engine, W, H, dpr)
      prime(engine, t, feedRef.current)
      engine.lastMs = t
    }

    let dt = fr.dt * 1000
    if (engine.lastMs === null || t < engine.lastMs) dt = 0
    else dt = Math.min(t - engine.lastMs, 100)
    engine.lastMs = t

    engine.weldPhase = (t % WELD_LEN) / WELD_LEN
    if (engine.weldPhase < engine.lastWeldPhase) engine.doeFired = false
    engine.lastWeldPhase = engine.weldPhase
    if (engine.weldPhase >= DOE_AT && !engine.doeFired) {
      engine.doeFired = true
      engine.doeRowY = TOP + 1
      logEvent(engine, feedRef.current, 'doe')
    }
    if (engine.weldPhase < DOE_AT && engine.doeFired) engine.doeFired = false

    updateWeldReadout(weldRef.current, engine.weldPhase >= DOE_AT)

    engine.scrollBudget += dt / ROW_MS
    let pushed = 0
    while (engine.scrollBudget >= 1) {
      engine.scrollBudget -= 1
      pushRow(engine, t)
      pushed++
      if (pushed >= 4) {
        engine.scrollBudget = 0
        break
      }
    }

    updateReadouts(
      engine,
      {
        gain: gainRef.current,
        amp: ampRef.current,
        force: forceRef.current,
        time: timeRef.current,
        weld: weldRef.current,
        ampStat: ampStatRef.current,
        sweep: sweepRef.current,
      },
      t,
      dt
    )

    if (t - engine.lastEvtMs > EVT_INTERVAL) {
      engine.lastEvtMs = t
      logEvent(engine, feedRef.current, 'evt')
    }

    drawVisible(g, engine)
  }, { running })

  return (
    <SonarWaterfallView
      canvasRef={ref}
      selected={selected}
      setSelected={setSelected}
      lutRef={lutRef}
      feedRef={feedRef}
      gainRef={gainRef}
      ampRef={ampRef}
      forceRef={forceRef}
      timeRef={timeRef}
      weldRef={weldRef}
      ampStatRef={ampStatRef}
      sweepRef={sweepRef}
    />
  )
}
