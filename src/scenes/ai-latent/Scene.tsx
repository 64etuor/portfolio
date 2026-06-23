'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { drawLatentScene } from './draw'
import { AiLatentView } from './view'
import { buildLinks, buildNodes, startAiLatentRuntime } from './runtime'
import type { Link, Node } from './types'
import s from './scene.module.css'

export default function Scene({ running = true, onReady }: SceneProps) {
  const tpsRef = useRef<HTMLElement>(null)
  const tcountRef = useRef<HTMLElement>(null)
  const qtextRef = useRef<HTMLElement>(null)
  const thinkRef = useRef<HTMLDivElement>(null)
  const thinkpctRef = useRef<HTMLSpanElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const attnRef = useRef<HTMLDivElement>(null)
  const heatRef = useRef<HTMLDivElement>(null)
  const attnqRef = useRef<HTMLSpanElement>(null)
  const retrRef = useRef<HTMLDivElement>(null)
  const rcountRef = useRef<HTMLElement>(null)
  const latRef = useRef<HTMLElement>(null)
  const seedlineRef = useRef<HTMLDivElement>(null)
  const tempValRef = useRef<HTMLElement>(null)
  const stynameRef = useRef<HTMLSpanElement>(null)
  const tempInputRef = useRef<HTMLInputElement>(null)
  const liveLogLineRef = useRef<HTMLSpanElement>(null)
  const vsToggleRef = useRef<HTMLButtonElement>(null)
  const axmodeRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const tipDomRef = useRef<HTMLDivElement>(null)
  const tipLabRef = useRef<HTMLDivElement>(null)
  const tipVecRef = useRef<HTMLDivElement>(null)
  const latentWrapRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null, null, null])

  const nodesRef = useRef<Node[]>(buildNodes())
  const linksRef = useRef<Link[]>([])
  const hoverNodeRef = useRef<Node | null>(null)
  const dimFilterRef = useRef<string | null>(null)
  const symMixRef = useRef(0)
  const symTargetRef = useRef(0)
  const tRef = useRef(0)
  const tempValState = useRef(0.35)
  const runIdRef = useRef(0)
  const totalTokensRef = useRef(0)
  const streamingRef = useRef(false)
  const cycleIdxRef = useRef(0)
  const autoCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleHeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logIdxRef = useRef(0)

  useSceneReady(onReady)

  useEffect(() => {
    linksRef.current = buildLinks(nodesRef.current)
  }, [])

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    drawLatentScene({
      g,
      W: fr.w,
      H: fr.h,
      dt: fr.dt > 0 ? fr.dt * 60 : 1,
      tRef,
      nodes: nodesRef.current,
      links: linksRef.current,
      hoverNode: hoverNodeRef.current,
      dimFilter: dimFilterRef.current,
      symMixRef,
      symTargetRef,
    })
  }, { running })

  useEffect(() => startAiLatentRuntime({
    running,
    nodesRef,
    linksRef,
    hoverNodeRef,
    dimFilterRef,
    symTargetRef,
    tRef,
    tempValState,
    runIdRef,
    totalTokensRef,
    streamingRef,
    cycleIdxRef,
    autoCycleTimerRef,
    idleHeatTimerRef,
    logIdxRef,
    chipRefs,
    tpsRef,
    tcountRef,
    qtextRef,
    thinkRef,
    thinkpctRef,
    streamRef,
    scrollRef,
    attnRef,
    heatRef,
    attnqRef,
    retrRef,
    rcountRef,
    latRef,
    seedlineRef,
    tempValRef,
    stynameRef,
    tempInputRef,
    liveLogLineRef,
    vsToggleRef,
    axmodeRef,
    tipRef,
    tipDomRef,
    tipLabRef,
    tipVecRef,
    latentWrapRef,
  }), [running])

  return (
    <AiLatentView
      canvasRef={ref}
      tpsRef={tpsRef}
      tcountRef={tcountRef}
      qtextRef={qtextRef}
      thinkRef={thinkRef}
      thinkpctRef={thinkpctRef}
      streamRef={streamRef}
      scrollRef={scrollRef}
      attnRef={attnRef}
      heatRef={heatRef}
      attnqRef={attnqRef}
      retrRef={retrRef}
      rcountRef={rcountRef}
      latRef={latRef}
      seedlineRef={seedlineRef}
      tempValRef={tempValRef}
      stynameRef={stynameRef}
      tempInputRef={tempInputRef}
      liveLogLineRef={liveLogLineRef}
      vsToggleRef={vsToggleRef}
      axmodeRef={axmodeRef}
      tipRef={tipRef}
      tipDomRef={tipDomRef}
      tipLabRef={tipLabRef}
      tipVecRef={tipVecRef}
      latentWrapRef={latentWrapRef}
      chipRefs={chipRefs}
      setDimFilter={(value) => { dimFilterRef.current = value }}
    />
  )
}
