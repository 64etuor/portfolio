'use client'

import { useEffect, useRef } from 'react'

/**
 * Fires `onReady?.()` exactly once on mount, regardless of re-renders.
 *
 * This replicates the pattern used in every numbered scene (32 scenes confirmed):
 *
 *   const readyFired = useRef(false)
 *   useEffect(() => {
 *     if (!readyFired.current) {
 *       readyFired.current = true
 *       onReady?.()
 *     }
 *   }, [onReady])
 *
 * Representative extractions:
 *   05-bios-boot/Scene.tsx:56-63
 *   30-collision/Scene.tsx:171-178
 *   41-perspectives/Scene.tsx:610-617
 *   37-cross-domain/Scene.tsx:154-160
 *   31-cost-cascade/Scene.tsx:124-130
 *
 * The `onReady` dep is kept in the dependency array to match the original
 * pattern exactly — the ref guard ensures the callback fires only once even
 * if `onReady` changes identity between renders.
 *
 * @param onReady  Optional callback supplied by the scene host. Called once.
 */
export function useSceneReady(onReady?: () => void): void {
  const readyFired = useRef(false)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])
}
