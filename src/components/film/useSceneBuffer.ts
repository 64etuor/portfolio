import { useCallback, useEffect, useState } from 'react'
import { ACTS } from './acts'

interface SceneBufferArgs {
  currentFile: string
  /** the scene after this one — staged into the hidden slot. null on the last beat. */
  nextFile: string | null
  reduced: boolean
  ready: boolean
}

interface SceneBuffer {
  slotFiles: [string | null, string | null]
  visibleSlot: number
  /** the current scene is "visible" only once the visible slot has painted it. */
  visible: boolean
  /** reveal a slot once its scene paints (onReady) */
  revealOnLoad: (i: number) => void
  /** bumps on each PICTURE cut (visible slot flips to a new scene); 0 = no cut yet. */
  cutId: number
}

/**
 * useSceneBuffer — the two-slot double-buffer reveal/blank logic.
 *
 * Two stable slots cross-fade between scenes. While one plays, the NEXT scene is
 * staged into the hidden slot as soon as the current cut settles — mounted but
 * frozen (`running=false`), so it paints a static frame (at the master clock's
 * current shot-local offset when a SceneClock is in scope — never a bare t=0) and
 * never subscribes to the rAF. That makes the following cut instant without
 * letting the scene run before it is seen.
 *
 * A slot is showable only once its scene has PAINTED, which it signals through
 * `onReady` → `revealOnLoad`. Holding a file is not the same as being ready: cutting
 * to a slot whose module is still in flight cross-fades to an empty slot, so the
 * picture goes dark and the scene pops in afterwards, out of sync with the cut flash.
 * A safety timer force-reveals after 5000ms if `onReady` never fires. Rewind/skip land
 * on a file in neither slot and fall back to load-on-cut.
 */
export function useSceneBuffer(args: SceneBufferArgs): SceneBuffer {
  const { currentFile, nextFile, reduced, ready } = args

  // Two stable iframe slots; we cross-fade between them.
  const [slotFiles, setSlotFiles] = useState<[string | null, string | null]>(() => [
    ACTS[0].scenes[0].file,
    null,
  ])
  const [visibleSlot, setVisibleSlot] = useState(0)
  // Bumps on each picture cut, so the flash overlay can be keyed off the very event
  // the audience sees. Bumped alongside setVisibleSlot (never in a follow-up effect)
  // so the flash and the cross-fade land in the SAME commit — a separate effect costs
  // a render and starts the flash a frame after the picture has already begun moving.
  const [cutId, setCutId] = useState(0)
  // Which file each slot has actually painted. Holding a file is not the same as being
  // ready to show it — this is what makes "reveal on paint" the only path to a cut.
  const [paintedFiles, setPaintedFiles] = useState<[string | null, string | null]>(() => [null, null])

  /** Cut the picture to slot `i`. No-op when it is already the visible one. */
  const cutTo = useCallback(
    (i: number) => {
      if (i === visibleSlot) return
      setVisibleSlot(i)
      setCutId((n) => n + 1)
    },
    [visibleSlot],
  )

  // The current scene is "visible" only once the visible slot both HOLDS it and has
  // PAINTED it. Holding alone is not enough — slot 0 holds the opening scene from the
  // first render, so a hold-only test would arm the clock before that scene exists and
  // spend its first few hundred ms on the module load.
  const visible = slotFiles[visibleSlot] === currentFile && paintedFiles[visibleSlot] === currentFile

  // Load the current scene into the hidden slot. The cut itself happens in
  // revealOnLoad (or the safety timer) — never here, because at this point the
  // incoming scene has not painted yet.
  useEffect(() => {
    if (reduced || !ready) return
    const at = slotFiles.indexOf(currentFile)
    if (at === visibleSlot) return
    if (at >= 0) {
      // Already loading in the hidden slot. Cut only if it has painted (this covers
      // an onReady that landed before the current scene became current).
      if (paintedFiles[at] === currentFile) cutTo(at)
      return
    }
    const hidden = visibleSlot ^ 1
    setSlotFiles((prev) => {
      if (prev[hidden] === currentFile) return prev
      const n: [string | null, string | null] = [prev[0], prev[1]]
      n[hidden] = currentFile
      return n
    })
  }, [currentFile, slotFiles, paintedFiles, visibleSlot, reduced, ready, cutTo])

  // Safety: if a scene's `onReady` never fires (load stall), force-reveal after a
  // cap so the film can't hang waiting for a frame that never paints.
  useEffect(() => {
    if (reduced || !ready || visible) return
    const at = slotFiles.indexOf(currentFile)
    if (at < 0) return
    const t = setTimeout(() => {
      // Mark it painted too, otherwise `visible` stays false, the clock never arms
      // and the film hangs on the very scene this timer exists to rescue.
      setPaintedFiles((prev) => {
        if (prev[at] === currentFile) return prev
        const n: [string | null, string | null] = [prev[0], prev[1]]
        n[at] = currentFile
        return n
      })
      cutTo(at)
    }, 5000)
    return () => clearTimeout(t)
  }, [reduced, ready, visible, currentFile, slotFiles, cutTo])

  // Swap the outgoing scene in the hidden slot for the NEXT one as soon as the
  // current cut settles, so it is mounted and painted well before its own start
  // time arrives on the master clock (Film passes nextFile ahead of the cut by
  // design — see Film.tsx's schedule-driven nextFile).
  //
  // Loading only on-cut made every scene overrun its budget: the clock ran the full
  // `ms` from paint, then `advance()` fired, and the picture only moved once the
  // incoming scene had loaded — measured at +330ms per cut (+700ms for the heavy
  // beats), which reads as the film switching late. Staging ahead removes that gap
  // at the source instead of compensating for it in the clock.
  //
  // The staged scene mounts with running=false, so useSceneCanvas paints its static
  // frame at the clock's current shot-local offset (never t=0 once a SceneClock is
  // in scope) and never subscribes to the rAF — it cannot advance before it is seen.
  // nextFile is null on the last beat, which blanks the slot exactly as before.
  useEffect(() => {
    if (reduced || !ready) return
    const hidden = visibleSlot ^ 1
    if (slotFiles[hidden] === nextFile) return
    if (slotFiles[hidden] === currentFile) return
    // Deferred to a 0ms timeout (not called synchronously in the effect body) so
    // this commit finishes first — staging still lands in the very next tick.
    const id = setTimeout(() => {
      setSlotFiles((prev) => {
        const h = visibleSlot ^ 1
        if (prev[h] === nextFile || prev[h] === currentFile) return prev
        const n: [string | null, string | null] = [prev[0], prev[1]]
        n[h] = nextFile
        return n
      })
      // The slot's previous occupant is gone — drop its paint mark so a later cut
      // can't treat the unmounted scene as showable. The incoming staged scene
      // re-marks itself when its own onReady fires.
      setPaintedFiles((prev) => {
        const h = visibleSlot ^ 1
        if (prev[h] == null) return prev
        const n: [string | null, string | null] = [prev[0], prev[1]]
        n[h] = null
        return n
      })
    }, 0)
    return () => clearTimeout(id)
  }, [visibleSlot, currentFile, nextFile, reduced, ready, slotFiles])

  const revealOnLoad = (i: number) => {
    const f = slotFiles[i]
    if (f == null) return
    setPaintedFiles((prev) => {
      if (prev[i] === f) return prev
      const n: [string | null, string | null] = [prev[0], prev[1]]
      n[i] = f
      return n
    })
    if (f === currentFile) cutTo(i)
  }

  return { slotFiles, visibleSlot, visible, revealOnLoad, cutId }
}
