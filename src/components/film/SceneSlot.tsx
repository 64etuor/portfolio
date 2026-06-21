import { Suspense, lazy, useMemo, type ComponentType } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { loaderFor } from '@/scenes/loaders'
import type { SceneProps } from '@/scenes/_host/types'

// Per-file memoized lazy components, so a scene module is split & created once and
// re-used across slot re-renders (a fresh lazy() per render would remount/reload it).
const lazyCache = new Map<string, ComponentType<SceneProps>>()
function lazyFor(file: string): ComponentType<SceneProps> | null {
  const cached = lazyCache.get(file)
  if (cached) return cached
  const loader = loaderFor(file)
  if (!loader) return null // no loader for this file → render nothing (don't crash)
  const Comp = lazy(loader)
  lazyCache.set(file, Comp)
  return Comp
}

/**
 * One double-buffer slot. Renders the ported React scene for `file` (or nothing if
 * the slot is blank / has no loader). Isolated behind an ErrorBoundary so one bad
 * scene can't kill the film. `running` mounts/runs the scene; `onReady` drives reveal.
 */
export function SceneSlot({ file, running, onReady }: { file: string | null; running: boolean; onReady: () => void }) {
  const Comp = useMemo(() => (file ? lazyFor(file) : null), [file])
  if (!Comp) return null
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Comp running={running} onReady={onReady} />
      </Suspense>
    </ErrorBoundary>
  )
}
