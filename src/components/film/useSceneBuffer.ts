import { useEffect, useState } from 'react'
import { ACTS } from './acts'

interface SceneBufferArgs {
  currentFile: string
  reduced: boolean
  ready: boolean
}

interface SceneBuffer {
  slotFiles: [string | null, string | null]
  visibleSlot: number
  /** the current scene is "visible" only once the visible slot actually holds it. */
  visible: boolean
  /** reveal a slot once its scene paints (onReady) */
  revealOnLoad: (i: number) => void
}

/**
 * useSceneBuffer — the two-slot double-buffer reveal/blank logic.
 *
 * Two stable slots cross-fade between scenes. The current scene is revealed by
 * showing whichever slot already holds it (prefetched → instant), or by loading it
 * into the hidden slot and revealing on its `load`. A safety timer force-reveals
 * after 5000ms if `onReady` never fires. After a cut settles, the now-hidden slot is
 * blanked (1100ms) so the outgoing scene stops its rAF loop.
 */
export function useSceneBuffer(args: SceneBufferArgs): SceneBuffer {
  const { currentFile, reduced, ready } = args

  // Two stable iframe slots; we cross-fade between them.
  const [slotFiles, setSlotFiles] = useState<[string | null, string | null]>(() => [
    ACTS[0].scenes[0].file,
    null,
  ])
  const [visibleSlot, setVisibleSlot] = useState(0)

  // The current scene is "visible" only once the visible slot actually holds it.
  const visible = slotFiles[visibleSlot] === currentFile

  // Reveal the current scene: show whichever slot has it (prefetched → instant);
  // otherwise load it into the hidden slot and reveal on its `load`.
  useEffect(() => {
    if (reduced || !ready) return
    const at = slotFiles.indexOf(currentFile)
    if (at === visibleSlot) return
    if (at >= 0) {
      setVisibleSlot(at)
      return
    }
    const hidden = visibleSlot ^ 1
    setSlotFiles((prev) => {
      if (prev[hidden] === currentFile) return prev
      const n: [string | null, string | null] = [prev[0], prev[1]]
      n[hidden] = currentFile
      return n
    })
  }, [currentFile, slotFiles, visibleSlot, reduced, ready])

  // Safety: if a scene's `onReady` never fires (load stall), force-reveal after a
  // cap so the film can't hang waiting for a frame that never paints.
  useEffect(() => {
    if (reduced || !ready || visible) return
    const at = slotFiles.indexOf(currentFile)
    if (at < 0) return
    const t = setTimeout(() => setVisibleSlot(at), 5000)
    return () => clearTimeout(t)
  }, [reduced, ready, visible, currentFile, slotFiles])

  // Optimization: once a cut has settled, blank the now-hidden slot so the OUTGOING
  // scene stops rendering. Otherwise its iframe keeps a full rAF loop alive — invisibly —
  // for the entire duration of the next scene (the double-buffer always retains the
  // previous file). Blanking it after the cross-fade halves steady-state canvas load
  // with zero visual change (it's already faded out), and the slot reloads on the next
  // cut exactly as before (load-on-cut).
  useEffect(() => {
    if (reduced || !ready) return
    const hidden = visibleSlot ^ 1
    if (slotFiles[hidden] == null) return
    const t = setTimeout(() => {
      setSlotFiles((prev) => {
        const h = visibleSlot ^ 1
        if (prev[h] == null || prev[h] === currentFile) return prev
        const n: [string | null, string | null] = [prev[0], prev[1]]
        n[h] = null
        return n
      })
    }, 1100) // after the 720ms cross-fade has fully settled
    return () => clearTimeout(t)
  }, [visibleSlot, currentFile, reduced, ready, slotFiles])

  const revealOnLoad = (i: number) => {
    if (slotFiles[i] === currentFile && i !== visibleSlot) setVisibleSlot(i)
  }

  return { slotFiles, visibleSlot, visible, revealOnLoad }
}
