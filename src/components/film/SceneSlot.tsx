import { LazyScene } from '@/scenes/_host/LazyScene'
import { SceneClockContext, type SceneClock } from '@/scenes/_host/sceneClock'

/**
 * One double-buffer slot. Renders the ported React scene for `file` (or nothing if
 * the slot is blank / has no loader). Isolated behind an ErrorBoundary so one bad
 * scene can't kill the film. `running` mounts/runs the scene; `onReady` drives reveal.
 *
 * `clock`, when given, is the film's master SceneClock for whichever shot currently
 * occupies this slot — threaded down so the scene's own canvas/three harness reads
 * its `t` from the film's single wall-clock instead of a local elapsed accumulator.
 * That is what makes a late reveal show the correct instant instead of restarting.
 */
export function SceneSlot({
  file,
  running,
  onReady,
  clock,
}: {
  file: string | null
  running: boolean
  onReady: () => void
  clock?: SceneClock
}) {
  const scene = <LazyScene file={file} running={running} onReady={onReady} />
  if (!clock) return scene
  return <SceneClockContext.Provider value={clock}>{scene}</SceneClockContext.Provider>
}
