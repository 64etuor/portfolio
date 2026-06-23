'use client'

import { useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { ROOT_BG } from './constants'
import { createRuntimeState, drawScene } from './runtime'
import type { SceneDomRefs } from './types'
import { SceneView } from './view'
import s from './scene.module.css'

export default function Scene({ running = true, onReady }: SceneProps) {
  const runtimeRef = useRef<ReturnType<typeof createRuntimeState> | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createRuntimeState()

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const measRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const judRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const chipRefs = useRef<Array<HTMLSpanElement | null>>([])
  const xrowRefs = useRef<Array<HTMLDivElement | null>>([])
  const droXRef = useRef<HTMLSpanElement | null>(null)
  const droYRef = useRef<HTMLSpanElement | null>(null)
  const droZRef = useRef<HTMLSpanElement | null>(null)
  const ptCountRef = useRef<HTMLElement | null>(null)
  const eqCountRef = useRef<HTMLElement | null>(null)
  const clockRef = useRef<HTMLElement | null>(null)
  const cpkGaugeRef = useRef<HTMLCanvasElement | null>(null)
  const cpkValRef = useRef<HTMLElement | null>(null)
  const cpkNoteRef = useRef<HTMLDivElement | null>(null)
  const cpkNumRef = useRef<HTMLDivElement | null>(null)
  const passNRef = useRef<HTMLElement | null>(null)
  const verdictRef = useRef<HTMLDivElement | null>(null)
  const statLedRef = useRef<HTMLSpanElement | null>(null)
  const statTextRef = useRef<HTMLElement | null>(null)
  const crossoverRef = useRef<HTMLDivElement | null>(null)
  const toastRef = useRef<HTMLDivElement | null>(null)
  const toastIcRef = useRef<HTMLElement | null>(null)
  const toastTxRef = useRef<HTMLElement | null>(null)
  const bootRef = useRef<HTMLDivElement | null>(null)
  const bootFillRef = useRef<HTMLDivElement | null>(null)

  const refs: SceneDomRefs = {
    rows: rowRefs,
    meas: measRefs,
    jud: judRefs,
    chips: chipRefs,
    xrows: xrowRefs,
    droX: droXRef,
    droY: droYRef,
    droZ: droZRef,
    ptCount: ptCountRef,
    eqCount: eqCountRef,
    clock: clockRef,
    cpkGauge: cpkGaugeRef,
    cpkVal: cpkValRef,
    cpkNote: cpkNoteRef,
    cpkNum: cpkNumRef,
    passN: passNRef,
    verdict: verdictRef,
    statLed: statLedRef,
    statText: statTextRef,
    crossover: crossoverRef,
    toast: toastRef,
    toastIc: toastIcRef,
    toastTx: toastTxRef,
    boot: bootRef,
    bootFill: bootFillRef,
  }

  useSceneReady(onReady)

  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    drawScene(g, fr, runtimeRef.current!, refs, s)
  }, { running })

  return (
    <SceneHost className={s.root} bg={ROOT_BG}>
      <SceneView canvasRef={canvasRef} refs={refs} />

      <div className={s.boot} ref={bootRef}>
        <div className={s.bootMark}>COORDINATE MEASURING MACHINE · METROLOGY</div>
        <div className={s.bootTitle}>CMM 검사 스테이션 초기화 — 데이텀 정렬 · 프로브 자격</div>
        <div className={s.bootBar}><div className={s.bootFill} ref={bootFillRef} /></div>
      </div>
    </SceneHost>
  )
}
