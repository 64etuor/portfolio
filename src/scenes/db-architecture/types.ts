// db-architecture — shared runtime/orchestrator types.

import type { MutableRefObject } from 'react'

/** A CDC packet travelling along the architecture-flow edges. */
export type Packet = {
  route: [string, string, string][]
  seg: number
  t: number
  counted: boolean
  dead?: boolean
}

/** Refs threaded from the orchestrator (Scene.tsx) into the imperative runtime. */
export interface RuntimeGate {
  /** True while the scene is on-screen; runtime loops idle when false. */
  runningRef: MutableRefObject<boolean>
  /** Runtime registers a resume callback here for the off→on-screen transition. */
  resumeRef: MutableRefObject<(() => void) | null>
}
