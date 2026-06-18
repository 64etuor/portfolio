'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ACTS } from './acts'
import { BaselineLayer } from './BaselineLayer'
import { VersionHUD } from './VersionHUD'
import { Subtitle } from './Subtitle'
import { Finale } from './Finale'
import { Transition } from './Transition'
import { BootSlate } from './BootSlate'

// Deterministic per-act seed (id chars → number) for the datum-line variation.
function seedOf(id: string): number {
  let s = 0
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 9973
  return s
}

/**
 * Film — the autoplay portfolio controller.
 *
 * Flow:
 *  - Autoplays ACTS in order. Within an act, its scenes cycle (gentle fade)
 *    sharing the act's durationMs. Between acts it CUTS (no crossfade).
 *  - Overlays: BaselineLayer (datum motif), VersionHUD, Subtitle, ProgressBar,
 *    and an always-visible "Skip to Gantt" button.
 *  - Controls: Play/Pause, ← rewind one act.
 *  - prefers-reduced-motion: skip autoplay, render Finale directly.
 *  - When the last act finishes → reveal Finale.
 */
export function Film() {
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false) // resolved reduced-motion check
  const [showFinale, setShowFinale] = useState(false)

  const [actIdx, setActIdx] = useState(0)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  // Double-buffered scene iframes: two stable <iframe> slots. The next scene is
  // loaded into the HIDDEN slot and we cross-fade to it only after it fires
  // `load` — so heavy self-contained scenes never show a black loading frame
  // (the prior scene stays up until the next one has painted). Fixes the
  // "black + datum line" autoplay caused by per-scene iframe remount/reload.
  const [slotFiles, setSlotFiles] = useState<[string | null, string | null]>(() => [
    ACTS[0].scenes[0],
    null,
  ])
  const [visibleSlot, setVisibleSlot] = useState(0)

  // Phase 2 (purely visual — never touches the rAF clock / paused / act state):
  //  - seam: the active match-cut overlay (from→to act ids), self-expiring.
  //  - showBootSlate: the one-shot projector ignition over the boot act.
  const [seam, setSeam] = useState<{ from: string; to: string } | null>(null)
  const [showBootSlate, setShowBootSlate] = useState(false)
  const prevActIdxRef = useRef(0)

  // Honor prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setReduced(true)
      setShowFinale(true)
    }
    setReady(true)
  }, [])

  const act = ACTS[actIdx]

  // Boot slate: one-shot projector ignition, only over the very first (boot) act.
  // Mounts once we're ready and not in reduced/finale; self-clears via onDone.
  useEffect(() => {
    if (!ready || reduced || showFinale) return
    if (actIdx === 0 && prevActIdxRef.current === 0) setShowBootSlate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Match-cut seam: when actIdx changes, render the Transition overlay for ~0.55s.
  // This is intentionally decoupled from the clock effect — it only reads the
  // previous/next act ids and sets `seam`; it never pauses or reschedules the rAF
  // tick, so the film keeps advancing underneath and reaching the Gantt on time.
  useEffect(() => {
    const prev = prevActIdxRef.current
    if (prev !== actIdx) {
      if (!reduced && !showFinale && ready) {
        setSeam({ from: ACTS[prev].id, to: ACTS[actIdx].id })
      }
      prevActIdxRef.current = actIdx
    }
  }, [actIdx, reduced, showFinale, ready])

  // Timing refs for pause-aware scheduling.
  const rafRef = useRef<number | null>(null)
  const sceneStartRef = useRef(0) // performance.now() at scene start
  const elapsedAtPauseRef = useRef(0) // accumulated elapsed when paused

  const advanceFromScene = useCallback(() => {
    setSceneIdx((prevScene) => {
      const a = ACTS[actIdx]
      if (prevScene + 1 < a.scenes.length) {
        return prevScene + 1
      }
      // Act finished → next act, or finale.
      setActIdx((prevAct) => {
        if (prevAct + 1 >= ACTS.length) {
          setShowFinale(true)
          return prevAct
        }
        return prevAct + 1
      })
      return 0
    })
  }, [actIdx])

  // Drive the current scene's timer + progress bar. Re-runs on act/scene/pause.
  useEffect(() => {
    if (reduced || showFinale || !ready) return
    const a = ACTS[actIdx]
    const perScene = a.durationMs / a.scenes.length

    if (paused) {
      // Freeze: capture elapsed so resume continues from here.
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      elapsedAtPauseRef.current =
        elapsedAtPauseRef.current + (performance.now() - sceneStartRef.current)
      return
    }

    // (Re)start clock for this scene, accounting for any prior partial elapsed.
    const carried = elapsedAtPauseRef.current
    sceneStartRef.current = performance.now()
    let alive = true

    const tick = () => {
      if (!alive) return
      const elapsed = carried + (performance.now() - sceneStartRef.current)
      const p = Math.min(1, elapsed / perScene)
      setProgress(p)
      if (p >= 1) {
        elapsedAtPauseRef.current = 0
        advanceFromScene()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [actIdx, sceneIdx, paused, reduced, showFinale, ready, advanceFromScene])

  // Reset carried elapsed whenever we move to a fresh scene (not on pause toggle).
  useEffect(() => {
    elapsedAtPauseRef.current = 0
    setProgress(0)
  }, [actIdx, sceneIdx])

  // Buffer: load the current scene into the hidden slot whenever it changes.
  // We never overwrite the visible slot (keeps the prior scene painted) and skip
  // if the hidden slot is already loading the target.
  useEffect(() => {
    if (reduced || showFinale || !ready) return
    const cur = ACTS[actIdx]?.scenes[sceneIdx]
    if (!cur) return
    setSlotFiles((prev) => {
      if (prev[visibleSlot] === cur) return prev
      const hidden = visibleSlot ^ 1
      if (prev[hidden] === cur) return prev
      const next: [string | null, string | null] = [prev[0], prev[1]]
      next[hidden] = cur
      return next
    })
  }, [actIdx, sceneIdx, reduced, showFinale, ready, visibleSlot])

  const rewindAct = useCallback(() => {
    setShowFinale(false)
    elapsedAtPauseRef.current = 0
    setSceneIdx(0)
    setActIdx((i) => Math.max(0, i - 1))
  }, [])

  const skipToGantt = useCallback(() => setShowFinale(true), [])

  // Keyboard: space = play/pause, ArrowLeft = rewind one act.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showFinale) return
      if (e.code === 'Space') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        rewindAct()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showFinale, rewindAct])

  if (!ready) return <div style={{ position: 'fixed', inset: 0, background: '#0b0d10' }} />

  if (showFinale) return <Finale />

  const currentFile = act.scenes[sceneIdx]
  // Overall film progress across all acts (for the top progress bar).
  const totalActs = ACTS.length
  const actProgress = (actIdx + (sceneIdx + progress) / act.scenes.length) / totalActs

  // Reveal a buffer slot once its scene has finished loading. The 0.5s opacity
  // cross-fade (below) doubles as warm-up time for the scene's first canvas paint.
  const revealOnLoad = (i: number) => {
    if (slotFiles[i] && slotFiles[i] === currentFile && i !== visibleSlot) {
      setVisibleSlot(i)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* Letterboxed scene viewport — two stable buffered iframes that cross-fade.
          The hidden slot pre-loads the next scene; we only fade it in on `load`,
          so a heavy scene's blank/loading frame is never shown. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {[0, 1].map((i) => {
          const f = slotFiles[i]
          const isVisible = visibleSlot === i
          return (
            <iframe
              key={`slot-${i}`}
              src={f ? `/lab/${f}` : 'about:blank'}
              title={`scene-slot-${i}`}
              onLoad={() => revealOnLoad(i)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 0,
                pointerEvents: 'none',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.5s ease',
                zIndex: isVisible ? 2 : 1,
              }}
            />
          )
        })}
      </div>

      {/* Cinematic letterbox + vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 20,
          boxShadow: 'inset 0 0 220px rgba(0,0,0,0.6)',
        }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />

      {/* Datum-line motif — morphs form per act (boot/rail/caliper/db/cursor/trace/radar) */}
      <BaselineLayer color={act.color} actId={act.id} seed={seedOf(act.id)} />

      {/* Inter-act match-cut overlay (visual only; does not affect the clock) */}
      {seam && (
        <Transition
          from={seam.from}
          to={seam.to}
          color={act.color}
          onDone={() => setSeam(null)}
        />
      )}

      {/* Boot projector ignition (one-shot over the boot act) */}
      {showBootSlate && (
        <BootSlate color={act.color} onDone={() => setShowBootSlate(false)} />
      )}

      {/* Era label (top-left, dry) */}
      {act.label && (
        <div
          style={{
            position: 'absolute',
            top: '6.5vh',
            left: 20,
            zIndex: 40,
            fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
            fontSize: 12,
            letterSpacing: '0.16em',
            color: act.color,
            textShadow: '0 1px 8px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}
        >
          {act.label}
        </div>
      )}

      {/* Overlays */}
      <VersionHUD version={act.version} color={act.color} />
      <Subtitle
        subtitles={act.subtitles}
        durationMs={act.durationMs}
        actKey={`${act.id}`}
        color={act.color}
      />

      {/* Overall progress bar (top) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: 2,
          width: `${actProgress * 100}%`,
          background: act.color,
          transition: 'width 90ms linear',
          zIndex: 41,
        }}
      />

      {/* Controls (bottom-right): play/pause + rewind */}
      <div
        style={{
          position: 'absolute',
          right: 20,
          bottom: 16,
          zIndex: 50,
          display: 'flex',
          gap: 8,
        }}
      >
        <button onClick={rewindAct} aria-label="이전 막" style={ctrlBtn}>
          ←
        </button>
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'} style={ctrlBtn}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* Skip to Gantt (top-right, always visible) */}
      <button
        onClick={skipToGantt}
        style={{
          position: 'absolute',
          top: '6.2vh',
          right: 20,
          zIndex: 50,
          color: '#fff',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 999,
          padding: '6px 14px',
          fontSize: 12,
          fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
      >
        Skip to Gantt →
      </button>
    </div>
  )
}

const ctrlBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
}
