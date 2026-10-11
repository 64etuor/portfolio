'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { METRICS, SKILLS } from './data'
import { createGcodeRuntime, createInitialState } from './runtime'
import './en'
import { GcodePrinterView } from './view'
import type { DefectAnim, Deposit, SimState } from './types'

export default function Scene({ running = true, onReady }: SceneProps) {
  useSceneReady(onReady)
  const state = useRef<SimState>(createInitialState())
  const deposited = useRef<Deposit[]>([])
  const movesDone = useRef(0)
  const gLines = useRef<string[]>([])
  const tHist = useRef<number[]>([])
  const tempTick = useRef(0)
  const careerSolid = useRef([false, false, false, false])
  const metricSolid = useRef(METRICS.map(() => false))
  const skillSolid = useRef(SKILLS.map(() => false))
  const defectShown = useRef(false)
  const defectAnim = useRef<DefectAnim>({ t: 0, fixing: false, fixed: false, fixStart: 0 })

  const tNozRef = useRef<HTMLElement | null>(null)
  const tBedRef = useRef<HTMLElement | null>(null)
  const statetagRef = useRef<HTMLDivElement | null>(null)
  const statetxtRef = useRef<HTMLSpanElement | null>(null)
  const layerRef = useRef<HTMLSpanElement | null>(null)
  const zRef = useRef<HTMLSpanElement | null>(null)
  const xRef = useRef<HTMLElement | null>(null)
  const yRef = useRef<HTMLElement | null>(null)
  const eRef = useRef<HTMLElement | null>(null)
  const tempRef = useRef<HTMLElement | null>(null)
  const etaRef = useRef<HTMLElement | null>(null)
  const pctRef = useRef<HTMLSpanElement | null>(null)
  const fillRef = useRef<HTMLDivElement | null>(null)
  const gcodeRef = useRef<HTMLDivElement | null>(null)
  const gLnRef = useRef<HTMLSpanElement | null>(null)
  const matMetaRef = useRef<HTMLDivElement | null>(null)
  const completeRef = useRef<HTMLElement | null>(null)
  const defectRef = useRef<HTMLDivElement | null>(null)
  const defectLabelRef = useRef<HTMLSpanElement | null>(null)
  const defectTagRef = useRef<HTMLSpanElement | null>(null)
  const defectTextRef = useRef<HTMLDivElement | null>(null)
  const reprintBtnRef = useRef<HTMLButtonElement | null>(null)
  const tempTargetRef = useRef<SVGLineElement | null>(null)
  const tempPathRef = useRef<SVGPathElement | null>(null)
  const tempAreaRef = useRef<SVGPathElement | null>(null)
  const defectSvgRef = useRef<SVGSVGElement | null>(null)

  const careerRefs = useRef<Array<HTMLDivElement | null>>([])
  const metricRefs = useRef<Array<HTMLDivElement | null>>([])
  const metricBarRefs = useRef<Array<HTMLElement | null>>([])
  const skillRefs = useRef<Array<HTMLDivElement | null>>([])


  const runtime = createGcodeRuntime({
    state: state,
    deposited: deposited,
    movesDone: movesDone,
    gLines: gLines,
    tHist: tHist,
    tempTick: tempTick,
    careerSolid: careerSolid,
    metricSolid: metricSolid,
    skillSolid: skillSolid,
    defectShown: defectShown,
    defectAnim: defectAnim,
    tNozRef: tNozRef,
    tBedRef: tBedRef,
    statetagRef: statetagRef,
    statetxtRef: statetxtRef,
    layerRef: layerRef,
    zRef: zRef,
    xRef: xRef,
    yRef: yRef,
    eRef: eRef,
    tempRef: tempRef,
    etaRef: etaRef,
    pctRef: pctRef,
    fillRef: fillRef,
    gcodeRef: gcodeRef,
    gLnRef: gLnRef,
    matMetaRef: matMetaRef,
    completeRef: completeRef,
    defectRef: defectRef,
    defectLabelRef: defectLabelRef,
    defectTagRef: defectTagRef,
    defectTextRef: defectTextRef,
    reprintBtnRef: reprintBtnRef,
    tempTargetRef: tempTargetRef,
    tempPathRef: tempPathRef,
    tempAreaRef: tempAreaRef,
    defectSvgRef: defectSvgRef,
    careerRefs: careerRefs,
    metricRefs: metricRefs,
    metricBarRefs: metricBarRefs,
    skillRefs: skillRefs
  })

  useEffect(() => {
    runtime.resetSimulation()
  }, [])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    runtime.advance(fr.dt, fr.t)
    runtime.drawMain(g, fr.w, fr.h)
    runtime.drawDefect()
    const st = state.current
    if (st.done && st.doneAt !== null) {
      if (!defectAnim.current.fixing && !defectAnim.current.fixed && fr.t - st.doneAt >= 1.4) runtime.startReprint()
      if (fr.t - st.doneAt >= 2.6) runtime.resetSimulation()
    }
  }, { running })

  return (
    <GcodePrinterView
      canvasRef={ref}
      tNozRef={tNozRef}
      tBedRef={tBedRef}
      statetagRef={statetagRef}
      statetxtRef={statetxtRef}
      layerRef={layerRef}
      zRef={zRef}
      xRef={xRef}
      yRef={yRef}
      eRef={eRef}
      tempRef={tempRef}
      etaRef={etaRef}
      pctRef={pctRef}
      fillRef={fillRef}
      gcodeRef={gcodeRef}
      gLnRef={gLnRef}
      matMetaRef={matMetaRef}
      completeRef={completeRef}
      defectRef={defectRef}
      defectLabelRef={defectLabelRef}
      defectTagRef={defectTagRef}
      defectTextRef={defectTextRef}
      reprintBtnRef={reprintBtnRef}
      tempTargetRef={tempTargetRef}
      tempPathRef={tempPathRef}
      tempAreaRef={tempAreaRef}
      defectSvgRef={defectSvgRef}
      careerRefs={careerRefs}
      metricRefs={metricRefs}
      metricBarRefs={metricBarRefs}
      skillRefs={skillRefs}
      startReprint={runtime.startReprint}
      resetSimulation={runtime.resetSimulation}
    />
  )
}
