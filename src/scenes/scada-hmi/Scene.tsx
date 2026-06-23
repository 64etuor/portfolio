'use client'

import { useEffect, useRef, useState } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import type { TabId } from './data'
import { ALM_POOL } from './data'
import { makeTrendRuntime, renderAlarms } from './draw'
import { handleAck, tick } from './runtime'
import type { DomRefs } from './runtime'
import s from './scene.module.css'
import type { AckPhase, MimicState, ProcessState, TrendRuntime } from './types'
import type { AlarmEvent } from './data'
import { HmiView } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [ackPhase, setAckPhase] = useState<AckPhase>('active')
  const ackPhaseRef = useRef<AckPhase>('active')

  const stateRef = useRef<ProcessState>({
    invCost: 4.0,
    invCostSP: 1.5,
    turnRate: 62.0,
    whEff: 78.0,
    acked: false,
  })
  const mimicRef = useRef<MimicState>({
    pumpAngle1: 0,
    pumpAngle2: 0,
    convX: 0,
    tk1Cur: 78,
    tk2Cur: 62,
    weldWidthCur: 20,
    phase1: 0,
    phase2: 1.0,
  })
  const trendsRef = useRef<TrendRuntime>(makeTrendRuntime())
  const eventLogRef = useRef<AlarmEvent[]>([...ALM_POOL].reverse().map((a) => ({ ...a, age: 0 })))
  const eventTimerRef = useRef(0)
  const ackRampRef = useRef<{ start: number | null; d0: number; eventInserted: boolean } | null>(null)
  const invPhaseAccRef = useRef(0)
  const lastClockRef = useRef('')

  // DOM refs
  const domRef = useRef<DomRefs>({
    clk: null, date: null, alarmMini: null, alarmFull: null, sbAlm: null,
    pump1: null, pump2: null,
    tk1fill: null, tk1wave: null, tk1pct: null,
    tk2fill: null, tk2wave: null, tk2pct: null,
    convBox: null, weldBar: null, weldCt: null, uph: null,
    weldLed: null, axLed: null,
    tankLevels: [], pvNums: [],
    riskTile: null,
    trend: null, trend2: null, trendInv: null, trendScm: null,
  })

  useSceneReady(onReady)

  useEffect(() => {
    renderAlarms(eventLogRef.current, domRef.current.alarmMini, domRef.current.alarmFull)
  }, [])

  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    tick(g, fr, {
      state: stateRef,
      mimic: mimicRef,
      trends: trendsRef,
      eventLog: eventLogRef,
      eventTimer: eventTimerRef,
      ackRamp: ackRampRef,
      invPhaseAcc: invPhaseAccRef,
      lastClock: lastClockRef,
      ackPhase: ackPhaseRef,
      setAckPhase,
      dom: domRef.current,
    })
  }, { running })

  return (
    <SceneHost className={s.root} bg="#0c1014">
      <canvas ref={canvasRef} className={s.c} />
      <HmiView
        activeTab={activeTab}
        ackPhase={ackPhase}
        onTabChange={setActiveTab}
        onAck={() => handleAck(stateRef.current, ackPhaseRef, setAckPhase, ackRampRef, { weldLed: domRef.current.weldLed })}
        clkRef={(n) => { domRef.current.clk = n }}
        dateRef={(n) => { domRef.current.date = n }}
        alarmMiniRef={(n) => { domRef.current.alarmMini = n }}
        alarmFullRef={(n) => { domRef.current.alarmFull = n }}
        sbAlmRef={(n) => { domRef.current.sbAlm = n }}
        tk1fillRef={(n) => { domRef.current.tk1fill = n }}
        tk1waveRef={(n) => { domRef.current.tk1wave = n }}
        tk1pctRef={(n) => { domRef.current.tk1pct = n }}
        tk2fillRef={(n) => { domRef.current.tk2fill = n }}
        tk2waveRef={(n) => { domRef.current.tk2wave = n }}
        tk2pctRef={(n) => { domRef.current.tk2pct = n }}
        pump1Ref={(n) => { domRef.current.pump1 = n }}
        pump2Ref={(n) => { domRef.current.pump2 = n }}
        convBoxRef={(n) => { domRef.current.convBox = n }}
        weldBarRef={(n) => { domRef.current.weldBar = n }}
        weldCtRef={(n) => { domRef.current.weldCt = n }}
        uphRef={(n) => { domRef.current.uph = n }}
        weldLedRef={(n) => { domRef.current.weldLed = n }}
        axLedRef={(n) => { domRef.current.axLed = n }}
        tankLevelRef={(i) => (n) => { domRef.current.tankLevels[i] = n }}
        pvNumRef={(i) => (n) => { domRef.current.pvNums[i] = n }}
        riskTileRef={(n) => { domRef.current.riskTile = n }}
        trendRef={(n) => { domRef.current.trend = n }}
        trend2Ref={(n) => { domRef.current.trend2 = n }}
        trendInvRef={(n) => { domRef.current.trendInv = n }}
        trendScmRef={(n) => { domRef.current.trendScm = n }}
      />
    </SceneHost>
  )
}
