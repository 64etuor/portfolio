'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import { createRuntime } from './runtime'
import { DecisionOSView } from './view'
import './en'

export default function Scene({ locale = 'ko', running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useSceneReady(onReady)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !running) return
    // Restart on locale change: SVG node titles are wrapped / truncated from the
    // localized string, which the DOM projection cannot do after the fact.
    return createRuntime(root, locale)
  }, [running, locale])

  return (
    <SceneHost className={s.root} bg="#06080c" scroll>
      <DecisionOSView rootRef={rootRef} />
    </SceneHost>
  )
}
