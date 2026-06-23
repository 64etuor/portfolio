'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import { DATA } from './data'
import { useEscapeClose, usePidRuntime } from './runtime'
import type { PanelState, PidRuntimeRefs } from './types'
import { PidSchemeView } from './view'
import s from './scene.module.css'

const INITIAL_PANEL: PanelState = {
  open: false,
  tag: '',
  title: '',
  type: '',
  body: '',
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const [panel, setPanel] = useState<PanelState>(INITIAL_PANEL)

  // Terraform Apply Loop
  const smStateRef = useRef<SVGTextElement | null>(null)
  const smBackoffRef = useRef<SVGTextElement | null>(null)
  const smBarRef = useRef<SVGTextElement | null>(null)
  const applyFillRef = useRef<SVGRectElement | null>(null)

  // Ticker
  const tickerDotRef = useRef<SVGCircleElement | null>(null)
  const tickerHzRef = useRef<SVGTextElement | null>(null)

  // Interlock
  const ilBoxRef = useRef<SVGRectElement | null>(null)
  const ilGaugeRef = useRef<SVGCircleElement | null>(null)
  const ilPctRef = useRef<SVGTextElement | null>(null)
  const ilStatusRef = useRef<SVGTextElement | null>(null)
  const deployRORef = useRef<HTMLDivElement | null>(null)


  const runtimeRefs = useMemo<PidRuntimeRefs>(() => ({
    smStateRef,
    smBackoffRef,
    smBarRef,
    applyFillRef,
    tickerDotRef,
    tickerHzRef,
    ilBoxRef,
    ilGaugeRef,
    ilPctRef,
    ilStatusRef,
    deployRORef,
  }), [])

  const openPanel = useCallback((id: string) => {
    const d = DATA[id]
    if (!d) return
    setPanel({ open: true, tag: d.tag, title: d.title, type: d.type, body: d.body })
  }, [])

  const closePanel = useCallback(() => {
    setPanel((p) => ({ ...p, open: false }))
  }, [])

  useEscapeClose(closePanel)
  useSceneReady(onReady)
  usePidRuntime(running, runtimeRefs, s.good)

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGElement | HTMLElement>) => {
      const id = (e.currentTarget as HTMLElement).dataset.id
      if (id) openPanel(id)
    },
    [openPanel],
  )

  return <PidSchemeView panel={panel} closePanel={closePanel} handleClick={handleClick} {...runtimeRefs} />
}
