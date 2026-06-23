import { LazyScene } from '@/scenes/_host/LazyScene'

/**
 * One double-buffer slot. Renders the ported React scene for `file` (or nothing if
 * the slot is blank / has no loader). Isolated behind an ErrorBoundary so one bad
 * scene can't kill the film. `running` mounts/runs the scene; `onReady` drives reveal.
 */
export function SceneSlot({ file, running, onReady }: { file: string | null; running: boolean; onReady: () => void }) {
  return <LazyScene file={file} running={running} onReady={onReady} />
}
