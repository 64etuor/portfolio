'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import { createRuntime, type InstrumentRackRuntime } from './runtime'
import './en'
import { SceneView, type SceneViewRefs } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  useSceneReady(onReady)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])
  const qRef = useRef<HTMLDivElement | null>(null)
  const aRef = useRef<HTMLDivElement | null>(null)
  const levRef = useRef<HTMLSpanElement | null>(null)
  const idxRef = useRef<HTMLSpanElement | null>(null)
  const ledTotalRef = useRef<HTMLDivElement | null>(null)
  const dmmWinRef = useRef<HTMLDivElement | null>(null)
  const surgeDotRef = useRef<HTMLSpanElement | null>(null)
  const finalStepRef = useRef<HTMLDivElement | null>(null)
  const digitRefs = useRef<Array<HTMLSpanElement | null>>([])
  const wfSvgRef = useRef<SVGSVGElement | null>(null)
  const scopeSvgRef = useRef<SVGSVGElement | null>(null)
  const gaugeSvgRef = useRef<SVGSVGElement | null>(null)

  const runtimeRef = useRef<InstrumentRackRuntime | null>(null)
  if (!runtimeRef.current) {
    runtimeRef.current = createRuntime({
      rowRefs,
      qRef,
      aRef,
      levRef,
      idxRef,
      ledTotalRef,
      dmmWinRef,
      surgeDotRef,
      finalStepRef,
      digitRefs,
      wfSvgRef,
      scopeSvgRef,
      gaugeSvgRef,
    })
  }
  const runtime = runtimeRef.current

  useEffect(() => runtime.setupReducedMotion(), [runtime])
  useEffect(() => {
    runtime.setupDom()
  }, [runtime])

  const canvasRef = useSceneCanvas((_g, f) => runtime.tick(f), { running })

  const refs: SceneViewRefs = {
    canvasRef,
    rowRefs,
    qRef,
    aRef,
    levRef,
    idxRef,
    ledTotalRef,
    dmmWinRef,
    surgeDotRef,
    finalStepRef,
    digitRefs,
    wfSvgRef,
    scopeSvgRef,
    gaugeSvgRef,
  }

  return <SceneView refs={refs} onSelectLedger={runtime.selectLedger} />
}
