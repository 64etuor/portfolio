'use client'

import { useEffect, useRef } from 'react'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { AGENT_DEFS, REG_DEFS, type AgentStatus } from './data'
import type { Agent, LiveState, Reg, RuntimeState, SceneCtx } from './types'
import { renderFleet, renderReg } from './dom'
import {
  approveACP,
  denyACP,
  handleJobAccept,
  handleJobReject,
  handleKillTicker,
  prepaint,
} from './runtime'
import { drawGraph, drawHeartbeat, drawLintGauge, drawPipe } from './draw'
import { View } from './view'
import s from './scene.module.css'
import './en'

export default function Scene({ running = true, onReady }: SceneProps) {
  const ctxRef = useRef<SceneCtx | null>(null)
  if (!ctxRef.current) {
    ctxRef.current = {
      s,
      rootRef: { current: null },
      elRefs: { current: {} },
      prepainted: { current: false },
      timeouts: { current: [] },
      stateRef: {
        current: {
          evId: 0,
          toolId: 0,
          jobOk: 0,
          jobFail: 0,
          latch: 0,
          capture: 0,
          tickerOn: true,
          gateRelease: true,
          autonomyClosed: true,
          acp: 'awaiting',
          stage: 0,
        } as RuntimeState,
      },
      agentsRef: { current: AGENT_DEFS.map((a) => ({ ...a, status: a.status as AgentStatus })) as Agent[] },
      regsRef: { current: REG_DEFS.map((r) => ({ ...r })) as Reg[] },
      pipeNodes: { current: [] },
      pipeEvents: { current: [] },
      pipeSize: { current: { w: 0, h: 0 } },
      hbData: { current: new Array(160).fill(0) },
      graphNodes: { current: [] },
      graphEdges: { current: [] },
      graphSize: { current: { w: 0, h: 0 } },
      trace: { current: [] },
      traceProg: { current: 0 },
      traceTimer: { current: 0 },
      lintState: { current: { pass: 48, total: 48 } },
      lintFailActive: { current: false },
      nzIdx: { current: 0 },
      auditIdx: { current: 0 },
      jobP: { current: 0.3 },
      turns: { current: 7 },
      liveRef: {
        current: {
          bpm: 72,
          bpmTarget: 72,
          capture: 37,
          captureTarget: 37,
          jobPSmooth: 0.3,
          evAcc: 0,
          toolAcc: 0,
          spawnAcc: 0,
          jobAcc: 0,
          stageAcc: 0,
          gateAcc: 0,
          latchAcc: 0,
          capAcc: 0,
          sigAcc: 0,
          nzAcc: 0,
          auditAcc: 0,
          lintAcc: 0,
          clockAcc: 0,
          evQueue: [],
          toolQueue: [],
        } as LiveState,
      },
    }
  }
  const ctx = ctxRef.current

  useEffect(() => {
    return () => {
      ctx.timeouts.current.forEach((id) => clearTimeout(id))
      ctx.timeouts.current = []
    }
  }, [ctx])

  useSceneReady(onReady)

  useEffect(() => {
    renderFleet(ctx)
    renderReg(ctx)
    prepaint(ctx)
  }, [ctx])

  const pipeRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => drawPipe(ctx, g, fr), { running })
  const hbRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => drawHeartbeat(ctx, g, fr), { running })
  const graphRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => drawGraph(ctx, g, fr), { running })
  const lintRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => drawLintGauge(ctx, g, fr), { running })

  return (
    <View
      ctx={ctx}
      pipeRef={pipeRef}
      hbRef={hbRef}
      graphRef={graphRef}
      lintRef={lintRef}
      onJobAccept={() => handleJobAccept(ctx)}
      onJobReject={() => handleJobReject(ctx)}
      onApproveACP={() => approveACP(ctx)}
      onDenyACP={() => denyACP(ctx)}
      onKillTicker={() => handleKillTicker(ctx)}
    />
  )
}
