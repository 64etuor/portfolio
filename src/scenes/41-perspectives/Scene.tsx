'use client'

import { useEffect, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import { rgba, mix } from '../_host/color'
import { clamp, lerp, ease } from '../_host/math'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneClock } from '../_host/sceneClock'
import { createSoundTimeline, soundAt, useSceneSound, type SoundAtState } from '../_host/sceneSound'
import { COLD, COLDB, CYCLE, DEV, FIELD, NB, WARM, WARMB } from './constants'
import { applyHero, devC, drawGears, drawSeam, drawSystem, drawTokens, fieldC, focalBreath, PAN_IN_W, persp, PULL_A, PULL_B, setLabel } from './draw'
import { anyDraining, makeProcNodes, syncLayout, syncSide, unloadAll } from './runtime'
import type { BucketItem, LayoutState, ProcNode } from './types'
import { PerspectivesView } from './view'
import './en'
// The side panels iframe the static /lab pages of these scenes; their English
// projections are registered here so the same-origin iframe localizer can use them.
import '../weld-thermal/en'
import '../robot-pendant/en'
import '../gcode-printer/en'
import '../pid-scheme/en'
import '../db-architecture/en'
import '../ide-coding/en'
import '../agent-governance/en'
import '../decision-os/en'

/** Tear the live iframe down this long before the film's cut, so the next shot stages/paints on a free main thread. */
const LIVE_TAIL_MS = 1500

export default function Scene({ running = true, onReady, locale = 'ko' }: SceneProps) {
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
  // Scene sound events (film only; silent elsewhere). Emitted from this React scene's draw loop
  // only — never from inside the iframed lab pages. A soft pop as the first and the last panel
  // of each side fades in (at its own screen side — the cascade's start and end), and one swish
  // at the peak of the FIELD → DEV rack-focus shift.
  const sound = useSceneSound()
  const cues = useRef<SoundAtState | null>(null)

  // Paused (film paused, staged slot, off-screen): the canvas loop stops, but a live iframe
  // would keep its own rAF ticking — drop it to its poster; the draw loop reloads it on resume.
  useEffect(() => {
    if (running) return
    unloadAll(fieldProcRefs.current)
    unloadAll(devProcRefs.current)
  }, [running])
  useEffect(() => {
    const field = fieldProcRefs.current
    const dev = devProcRefs.current
    return () => {
      unloadAll(field)
      unloadAll(dev)
    }
  }, [])

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

    // Panels: posters everywhere, plus at most ONE live lab iframe (the focused panel —
    // see liveIndex). Each loaded iframe is its own document with its own rAF loop that
    // ticks regardless of `running`, so: none while paused/staged, and none in the shot's
    // last LIVE_TAIL_MS (film master clock), leaving the main thread free for the next
    // shot's staging and paint. Standalone pages have no clock → always allowed.
    const allowLive = running && (clock?.remainingMs?.() ?? Infinity) > LIVE_TAIL_MS
    syncSide(fieldProcRefs.current, FIELD, fieldC, fieldVis, f, allowLive, anyDraining(devProcRefs.current))
    syncSide(devProcRefs.current, DEV, devC, devVis, f, allowLive, anyDraining(fieldProcRefs.current))

    const puck = puckRef.current
    const pc = mix(WARM, COLD, sf)
    if (puck) {
      puck.style.left = `${(sf * 100).toFixed(2)}%`
      puck.style.background = rgba(mix(WARMB, COLDB, sf), 1)
      puck.style.boxShadow = `0 0 14px ${rgba(pc, 0.7)}`
    }
    setLabel(vlabelRef.current, p, pc, labelStateRef.current, locale)

    // ---- sound (loop-local time; same pan / pull constants as the visuals) ----
    const tl = time % CYCLE
    const c = (cues.current ??= createSoundTimeline(sound))
    const edge = 0.045 + layout.pw / 2 / W // panel centre, fraction of W (layoutSide)
    const fl = FIELD.length - 1
    const dl = DEV.length - 1
    soundAt(c, tl, (fieldC(0) - PAN_IN_W) * CYCLE, 'node', { id: 'persp.field0', x: edge, intensity: 0.5 })
    soundAt(c, tl, (fieldC(fl) - PAN_IN_W) * CYCLE, 'node', { id: `persp.field${fl}`, x: edge, intensity: 0.5 })
    soundAt(c, tl, ((PULL_A + PULL_B) / 2) * CYCLE, 'transition', { id: 'persp.rackFocus', x: 0.5 })
    soundAt(c, tl, (devC(0) - PAN_IN_W) * CYCLE, 'node', { id: 'persp.dev0', x: 1 - edge, intensity: 0.5 })
    soundAt(c, tl, (devC(dl) - PAN_IN_W) * CYCLE, 'node', { id: `persp.dev${dl}`, x: 1 - edge, intensity: 0.5 })
  }, { running })

  return (
    <PerspectivesView
      locale={locale}
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
