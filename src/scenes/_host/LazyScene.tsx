import { Suspense, lazy, useMemo, type ComponentType, type ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { loaderFor } from '@/scenes/loaders'
import type { SceneProps } from './types'
import { useLocale } from '@/components/LocaleProvider'
import { SceneLocalizedRoot } from './localize'

type Loader = () => Promise<{ default: ComponentType<SceneProps> }>

// Per-source memoized lazy components, so a scene module is split & created once and
// re-used across re-renders (a fresh lazy() per render would remount/reload it).
// Keyed by the file string when given, else by the loader function identity (loaderFor
// returns a stable loader per file, so this stays one lazy() per scene module).
const lazyCache = new Map<string | Loader, ComponentType<SceneProps>>()

function lazyFor(key: string | Loader, loader: Loader): ComponentType<SceneProps> {
  const cached = lazyCache.get(key)
  if (cached) return cached
  const Comp = lazy(loader)
  lazyCache.set(key, Comp)
  return Comp
}

/**
 * Shared lazy-scene boundary: owns the **lazy loading + ErrorBoundary + Suspense +
 * memoized-per-source lazy component** concern only. Resolves a scene from either a
 * `file` key (via loaderFor) or an explicit `load` loader, mounts it lazily, isolates
 * it behind an ErrorBoundary, and threads `running`/`onReady` through to the scene.
 *
 * Viewport/hoverPlay/keepMounted concerns live in the consumers (SceneFrame), not here.
 */
export function LazyScene({
  file,
  load,
  running,
  onReady,
  errorFallback = null,
  loadingFallback = null,
}: {
  /** Scene file key — resolved via loaderFor. Renders null if no loader exists. */
  file?: string | null
  /** Explicit loader — used when no file key is given. */
  load?: Loader
  running?: boolean
  onReady?: () => void
  /** Shown by the ErrorBoundary if the scene throws. */
  errorFallback?: ReactNode
  /** Shown by Suspense while the scene module loads. */
  loadingFallback?: ReactNode
}) {
  const { locale } = useLocale()
  const Comp = useMemo(() => {
    if (file != null) {
      const loader = loaderFor(file)
      if (!loader) return null // no loader for this file → render nothing (don't crash)
      return lazyFor(file, loader)
    }
    if (load) return lazyFor(load, load)
    return null
  }, [file, load])

  if (!Comp) return null

  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={loadingFallback}>
        <SceneLocalizedRoot locale={locale}>
          <Comp locale={locale} running={running} onReady={onReady} />
        </SceneLocalizedRoot>
      </Suspense>
    </ErrorBoundary>
  )
}
