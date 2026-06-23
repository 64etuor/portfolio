'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { renderField, renderPath, renderBead, renderArc, renderThermal } from './draw'
import { setText } from '../_host/dom-util'
import { createEngine, ensureSize, bootstrap, arcUpdate, simulate, updateHUD, updateParams, beginPass, advancePass } from './runtime'
import type { DomRefs } from './types'
import { WeldThermalView } from './view'
import s from './scene.module.css'

export default function Scene({ running = true, onReady }: SceneProps) {
  const engineRef = useRef(createEngine())

  const modeTxtRef = useRef<HTMLSpanElement | null>(null)
  const fiberTxtRef = useRef<HTMLSpanElement | null>(null)
  const gasTxtRef = useRef<HTMLSpanElement | null>(null)
  const focalRef = useRef<HTMLSpanElement | null>(null)
  const spotDiaRef = useRef<HTMLSpanElement | null>(null)
  const passNoRef = useRef<HTMLSpanElement | null>(null)
  const modeChipRef = useRef<HTMLSpanElement | null>(null)
  const mtSpatterRef = useRef<HTMLSpanElement | null>(null)
  const gPeRef = useRef<HTMLSpanElement | null>(null)
  const gPkRef = useRef<HTMLSpanElement | null>(null)
  const gAvgRef = useRef<HTMLSpanElement | null>(null)
  const dutyRef = useRef<HTMLSpanElement | null>(null)
  const pdensRef = useRef<HTMLSpanElement | null>(null)
  const penetRef = useRef<HTMLSpanElement | null>(null)
  const beadwRef = useRef<HTMLSpanElement | null>(null)
  const aspectRef = useRef<HTMLSpanElement | null>(null)
  const mtPrfRef = useRef<HTMLSpanElement | null>(null)
  const mtPwRef = useRef<HTMLSpanElement | null>(null)
  const mtTravelRef = useRef<HTMLSpanElement | null>(null)
  const mtDefocusRef = useRef<HTMLSpanElement | null>(null)
  const mtPitchRef = useRef<HTMLSpanElement | null>(null)
  const mtBeadRef = useRef<HTMLSpanElement | null>(null)
  const arcTimeRef = useRef<HTMLSpanElement | null>(null)
  const frameRef = useRef<HTMLSpanElement | null>(null)
  const fpsRef = useRef<HTMLSpanElement | null>(null)
  const clockRef = useRef<HTMLElement | null>(null)
  const crossRef = useRef<HTMLDivElement | null>(null)
  const spotTempRef = useRef<HTMLSpanElement | null>(null)
  const spotNameRef = useRef<HTMLSpanElement | null>(null)
  const laserOnRef = useRef<HTMLSpanElement | null>(null)
  const arcPhaseRef = useRef<HTMLSpanElement | null>(null)
  const arcBarRef = useRef<HTMLElement | null>(null)
  const thPeakRef = useRef<HTMLElement | null>(null)
  const thHazRef = useRef<HTMLElement | null>(null)
  const thermCvRef = useRef<HTMLCanvasElement | null>(null)
  const detailTxtRef = useRef<HTMLDivElement | null>(null)
  const passRefs = useRef<HTMLDivElement[]>([])

  const domRefs = (): DomRefs => ({
    modeTxt: modeTxtRef.current,
    fiberTxt: fiberTxtRef.current,
    gasTxt: gasTxtRef.current,
    focal: focalRef.current,
    spotDia: spotDiaRef.current,
    passNo: passNoRef.current,
    modeChip: modeChipRef.current,
    mtSpatter: mtSpatterRef.current,
    gPe: gPeRef.current,
    gPk: gPkRef.current,
    gAvg: gAvgRef.current,
    duty: dutyRef.current,
    pdens: pdensRef.current,
    penet: penetRef.current,
    beadw: beadwRef.current,
    aspect: aspectRef.current,
    mtPrf: mtPrfRef.current,
    mtPw: mtPwRef.current,
    mtTravel: mtTravelRef.current,
    mtDefocus: mtDefocusRef.current,
    mtPitch: mtPitchRef.current,
    mtBead: mtBeadRef.current,
    arcTime: arcTimeRef.current,
    frame: frameRef.current,
    fps: fpsRef.current,
    clock: clockRef.current,
    cross: crossRef.current,
    spotTemp: spotTempRef.current,
    spotName: spotNameRef.current,
    laserOn: laserOnRef.current,
    arcPhase: arcPhaseRef.current,
    arcBar: arcBarRef.current,
    thPeak: thPeakRef.current,
    thHaz: thHazRef.current,
    thermCv: thermCvRef.current,
    detailTxt: detailTxtRef.current,
    passEls: passRefs.current,
  })

  useSceneReady(onReady)

  useEffect(() => {
    const engine = engineRef.current
    const onMove = (event: PointerEvent) => {
      engine.mouseX = event.clientX
      engine.mouseY = event.clientY
      engine.mouseInside = true
    }
    const onLeave = () => { engine.mouseInside = false }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  const jumpTo = (index: number) => {
    const engine = engineRef.current
    const refs = domRefs()
    if (engine.gw > 0 && engine.gh > 0) beginPass(engine, index, refs)
    else engine.activePass = index
    engine.arc.phase = 'reset'
    engine.arc.t = 0
  }

  const nudgeProgram = () => {
    const engine = engineRef.current
    if (engine.gw > 0 && engine.gh > 0) advancePass(engine, domRefs())
    engine.arc.phase = 'reset'
    engine.arc.t = 0
  }

  const ref = useSceneCanvas((ctx: CanvasRenderingContext2D, fr: Frame) => {
    const engine = engineRef.current
    const refs = domRefs()
    ensureSize(engine, fr.w, fr.h)
    if (!engine.initialized) bootstrap(engine, refs)

    const now = fr.t * 1000
    const dtFrames = fr.dt * 60
    const dts = dtFrames / 60
    engine.frame++

    arcUpdate(engine, now, dtFrames, refs)
    simulate(engine, dtFrames)

    renderField(engine, ctx)
    renderPath(engine, ctx)
    renderBead(engine, ctx, now)
    renderArc(engine, ctx, now, dts)
    renderThermal(engine, refs)
    updateHUD(engine, refs)
    updateParams(engine, dtFrames, refs)

    engine.fpsCount++
    if (now - engine.lastFps > 500) {
      setText(refs.fps, Math.round((engine.fpsCount * 1000) / (now - engine.lastFps)))
      engine.fpsCount = 0
      engine.lastFps = now
    }
  }, { running })

  return (
    <SceneHost className={`${s.stage} ${s.nosel}`} bg="#000">
      <WeldThermalView
        canvasRef={ref}
        modeTxtRef={modeTxtRef}
        fiberTxtRef={fiberTxtRef}
        gasTxtRef={gasTxtRef}
        focalRef={focalRef}
        spotDiaRef={spotDiaRef}
        passNoRef={passNoRef}
        modeChipRef={modeChipRef}
        mtSpatterRef={mtSpatterRef}
        gPeRef={gPeRef}
        gPkRef={gPkRef}
        gAvgRef={gAvgRef}
        dutyRef={dutyRef}
        pdensRef={pdensRef}
        penetRef={penetRef}
        beadwRef={beadwRef}
        aspectRef={aspectRef}
        mtPrfRef={mtPrfRef}
        mtPwRef={mtPwRef}
        mtTravelRef={mtTravelRef}
        mtDefocusRef={mtDefocusRef}
        mtPitchRef={mtPitchRef}
        mtBeadRef={mtBeadRef}
        arcTimeRef={arcTimeRef}
        frameRef={frameRef}
        fpsRef={fpsRef}
        clockRef={clockRef}
        crossRef={crossRef}
        spotTempRef={spotTempRef}
        spotNameRef={spotNameRef}
        laserOnRef={laserOnRef}
        arcPhaseRef={arcPhaseRef}
        arcBarRef={arcBarRef}
        thPeakRef={thPeakRef}
        thHazRef={thHazRef}
        thermCvRef={thermCvRef}
        detailTxtRef={detailTxtRef}
        passRefs={passRefs}
        onNudgeProgram={nudgeProgram}
        onJumpTo={jumpTo}
      />
    </SceneHost>
  )
}
