'use client'

import { useEffect } from 'react'
import { subscribe } from '../_host/raf'
import { TF_PERIOD_MS } from './constants'
import {
  applyGaugeRaw,
  paintInterlockBlocked,
  paintInterlockChecking,
  paintInterlockGreen,
  setTfState,
  updateApplyFill,
  updateTicker,
} from './draw'
import type { InterlockPhase, PidRuntimeRefs } from './types'

export function useEscapeClose(closePanel: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [closePanel])
}

export function usePidRuntime(running: boolean, refs: PidRuntimeRefs, goodClass: string) {
  useEffect(() => {
    if (!running) return

    let tfIdx = 0
    let tfElapsed = 0
    let fillCur = 8
    let fillTarget = setTfState(refs, 0)

    let tickPhase = 0
    let pCur = 15
    let pTarget = 15
    let phase: InterlockPhase = 'blocked'
    let autoBlockTimer = 0
    let autoStartTimer = 2600
    let userInteracted = false

    function setBlocked() {
      pTarget = 15
      pCur = 15
      phase = 'blocked'
      autoBlockTimer = 0
      autoStartTimer = 2600
      paintInterlockBlocked(refs, goodClass)
    }

    function startCheck() {
      if (phase === 'checking') return
      phase = 'checking'
      pTarget = 0
      paintInterlockChecking(refs, goodClass)
    }

    function setGreen() {
      phase = 'green'
      pCur = 0
      pTarget = 0
      autoBlockTimer = userInteracted ? 7000 : 2400
      paintInterlockGreen(refs, goodClass)
    }

    setBlocked()

    let lastNow = 0
    const unsub = subscribe((now: number) => {
      const dtMs = lastNow === 0 ? 16 : Math.min(now - lastNow, 100)
      lastNow = now

      fillCur += (fillTarget - fillCur) * Math.min(dtMs / 180, 1)
      updateApplyFill(refs.applyFillRef.current, fillCur)
      tfElapsed += dtMs
      if (tfElapsed >= TF_PERIOD_MS) {
        tfElapsed -= TF_PERIOD_MS
        tfIdx = (tfIdx + 1) % 4
        fillTarget = setTfState(refs, tfIdx)
      }

      tickPhase += dtMs * 0.001 * Math.PI * 2
      updateTicker(refs.tickerDotRef.current, refs.tickerHzRef.current, tickPhase)

      if (phase === 'blocked') {
        autoStartTimer -= dtMs
        if (autoStartTimer <= 0) startCheck()
      } else if (phase === 'checking') {
        pCur = pCur + (pTarget - pCur) * Math.min(dtMs / 600, 1)
        applyGaugeRaw(refs, pCur)
        if (pCur < 0.3) setGreen()
      } else if (phase === 'green') {
        autoBlockTimer -= dtMs
        if (autoBlockTimer <= 0) setBlocked()
      }
    })

    const badge = document.getElementById('pid-interlock-badge')
    function handleBadgeClick(e: Event) {
      e.stopPropagation()
      userInteracted = true
      if (phase === 'blocked') startCheck()
      else if (phase === 'green') setBlocked()
    }
    badge?.addEventListener('click', handleBadgeClick)

    return () => {
      unsub()
      badge?.removeEventListener('click', handleBadgeClick)
    }
  }, [running, refs, goodClass])
}
