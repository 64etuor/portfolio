'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import { createRuntime } from './runtime'
import { DecisionOSView } from './view'

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useSceneReady(onReady)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !running) return
    return createRuntime(root)
  }, [running])

  return (
    <SceneHost className={s.root} bg="#06080c" scroll>
      <DecisionOSView rootRef={rootRef} />
    </SceneHost>
  )
}
