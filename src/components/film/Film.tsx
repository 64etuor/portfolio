'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { ACTS } from './acts'
import { SceneSlot } from './SceneSlot'
import { FilmControls } from './FilmControls'
import { FilmTransition, txVariantFor } from './FilmTransition'
import { useFilmClock } from './useFilmClock'
import { useSceneBuffer } from './useSceneBuffer'
import { useIrisOutro } from './useIrisOutro'

// Neutral film accent (progress bar / controls). Scenes carry their own color.
const ACCENT = '#cdd2d8'

// Visually-hidden heading: gives SR users the film's name without altering the
// cinematic visual. (Mounted scenes can render their own <main>, so the film
// region is a labelled group — not a second <main>.)
const FILM_TITLE = '박양하 포트폴리오 필름'
const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Film — the autoplay portfolio "film" controller (DX→AX narrative).
 *
 * Timing model (fixes the "cut too early / clock starts before the scene shows"
 * problems):
 *  - Per-scene durations come from acts.ts (Shot.ms), tuned to each scene's arc.
 *  - Double-buffered iframes. The NEXT scene is PREFETCHED into the hidden slot
 *    while the current one plays, so a cut is an instant cross-fade with no load
 *    wait. (Heavy scenes never flash a black/blank frame.)
 *  - The per-scene CLOCK only starts once the scene is actually VISIBLE (painted
 *    in the visible slot) — so each scene gets its full budget regardless of how
 *    long it took to load, and its static intro is never spent behind the fade.
 *  - prefers-reduced-motion: skip autoplay, render the ending catchphrase.
 *  - After the ending beat → onFilmEnd() returns to the landing.
 */
export function Film() {
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)
  const [ended, setEnded] = useState(false)

  const [actIdx, setActIdx] = useState(0)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  // Ported scenes signal readiness via their onReady prop (no postMessage handshake).
  // Armed is stored as the scene it was armed FOR, not a boolean: a boolean stays
  // true across the index change until a reset effect clears it, and the clock reads
  // that stale `true` and starts a throwaway loop for the incoming scene. Keying it
  // makes disarming instantaneous — armed is false in the very render that cuts.
  const [armedKey, setArmedKey] = useState<string | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true)
    setReady(true)
  }, [])

  const shot = ACTS[actIdx].scenes[sceneIdx]
  const currentFile = shot.file
  const sceneKey = `${actIdx}-${sceneIdx}`
  // Playtime is the static acts.ts value (ported scenes don't declare their own).
  const effectiveMs = shot.ms

  const onFilmEnd = useCallback(() => setEnded(true), [])

  // Film outro → landing: on the final beat the whole frame collapses into a single
  // point at center (iris-out), then we navigate. The landing reveals from black, so
  // the film hands off to the home page as one continuous shot (no abrupt cut).
  const irisRef = useIrisOutro(ended)

  // Double-buffer scene slots — reveal/blank/cross-fade logic.
  const { slotFiles, visibleSlot, visible, revealOnLoad, cutId } = useSceneBuffer({
    currentFile,
    reduced,
    ready,
  })

  // Arm the clock the moment the scene is actually on screen — `visible` now flips
  // only when the incoming scene has painted, so this is its true t0.
  const armed = armedKey === sceneKey
  useEffect(() => {
    if (reduced || !ready || !visible || armed) return
    setArmedKey(sceneKey)
  }, [reduced, ready, visible, armed, sceneKey])

  // NOTE: no prefetch. Each scene loads only when it becomes current (load-on-cut),
  // so its rAF starts at reveal ≈ t0 — the scene is seen from its true start point
  // (static intro → dynamic), not mid-loop. The load gap is hidden by the cut overlay.

  // Clock — progress, scene advancement, pause carry. (The cut overlay is fired by
  // the buffer's picture cut, not by this clock: the index change and the picture
  // change are separated by the incoming scene's load.)
  const { progress, carriedRef } = useFilmClock({
    actIdx,
    sceneIdx,
    setActIdx,
    setSceneIdx,
    paused,
    reduced,
    ended,
    ready,
    armed,
    effectiveMs,
    onFilmEnd,
  })

  // Rewind one beat (act). Always lands on that beat's first scene and resumes
  // playback (un-pause), so the control produces visible motion even while paused.
  const rewindBeat = useCallback(() => {
    setEnded(false)
    setPaused(false)
    carriedRef.current = 0
    setActIdx((i) => Math.max(0, i - 1))
    setSceneIdx(0)
  }, [carriedRef])

  // Jump to the ending beat and resume playback (un-pause).
  const skipToEnd = useCallback(() => {
    setEnded(false)
    setPaused(false)
    carriedRef.current = 0
    setActIdx(ACTS.length - 1)
    setSceneIdx(0)
  }, [carriedRef])

  // Keyboard: space = play/pause, ArrowLeft = rewind one beat.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        rewindBeat()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rewindBeat])

  if (!ready) return <div style={{ position: 'fixed', inset: 0, background: '#050505' }} />

  // Reduced motion: skip the journey, render the ending catchphrase directly.
  if (reduced) {
    const endFile = ACTS[ACTS.length - 1].scenes[0].file
    return (
      <div role="region" aria-label={FILM_TITLE} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
        <h1 style={srOnly}>{FILM_TITLE}</h1>
        <div style={{ position: 'absolute', inset: 0 }}>
          <SceneSlot file={endFile} running onReady={() => {}} />
        </div>
      </div>
    )
  }

  // Overall film progress across all scenes (flattened) for the top bar.
  const flatTotal = ACTS.reduce((s, a) => s + a.scenes.length, 0)
  const flatIdx = ACTS.slice(0, actIdx).reduce((s, a) => s + a.scenes.length, 0) + sceneIdx
  const overall = Math.min(1, (flatIdx + progress) / flatTotal)
  const txVariant = txVariantFor(ACTS[actIdx].id)

  return (
    <div role="region" aria-label={FILM_TITLE} style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <h1 style={srOnly}>{FILM_TITLE}</h1>
      {/* Buffered scene viewport — two stable slots that cross-fade. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {[0, 1].map((i) => {
          const f = slotFiles[i]
          const isVisible = visibleSlot === i
          return (
            <div
              key={`slot-${i}`}
              style={{
                // Render each scene INSIDE the letterbox safe band (top/bottom 5vh
                // are masked by the bars below). Full-bleed (inset:0) hid the top/
                // bottom 5vh of every scene behind the bars; banding the slot to
                // the visible 90vh means the whole scene viewport is on-screen and
                // nothing gets clipped behind the letterbox. The scene's own
                // SceneHost is position:absolute inset:0, so it fills this band.
                position: 'absolute',
                top: '5vh',
                left: 0,
                width: '100%',
                height: '90vh',
                pointerEvents: 'none',
                // Materialize: the incoming scene comes INTO FOCUS (blur→sharp,
                // settle from a slight zoom, fade up) so its content builds in
                // naturally instead of being pre-rendered. Outgoing dissolves out.
                opacity: isVisible ? 1 : 0,
                filter: isVisible ? 'blur(0px)' : 'blur(11px)',
                transform: isVisible ? 'scale(1)' : 'scale(1.035)',
                transformOrigin: 'center',
                transition: isVisible
                  ? 'opacity 640ms ease, filter 720ms cubic-bezier(.2,.7,.2,1), transform 720ms cubic-bezier(.2,.7,.2,1)'
                  : 'opacity 380ms ease, filter 380ms ease, transform 380ms ease',
                zIndex: isVisible ? 2 : 1,
              }}
            >
              {/* Mounted scenes run unless paused; blanking unmount (f→null) stops the outgoing.
                  Tying running to !paused freezes the visible scene's canvas on pause (the
                  scene host now freeze-resumes, so it continues from the same frame on play). */}
              <SceneSlot file={f} running={f != null && !paused} onReady={() => revealOnLoad(i)} />
            </div>
          )
        })}
      </div>

      {/* Cinematic letterbox + vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, boxShadow: 'inset 0 0 220px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />

      {/* Cinematic scene-cut transition — the key replays the animation on each cut.
          Driven by the buffer's picture cut so the flash lands ON the cross-fade. */}
      <FilmTransition txId={cutId} txVariant={txVariant} />

      {/* Overall progress bar (top) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: 2,
          width: '100%',
          transform: `scaleX(${overall})`,
          transformOrigin: 'left',
          background: ACCENT,
          opacity: 0.55,
          transition: 'transform 120ms linear',
          willChange: 'transform',
          zIndex: 41,
        }}
      />

      {/* Controls: rewind + play/pause + skip-to-ending */}
      <FilmControls
        paused={paused}
        onRewind={rewindBeat}
        onTogglePause={() => setPaused((p) => !p)}
        onSkip={skipToEnd}
      />

      {/* Outro iris — at the end, the frame collapses into a point, then routes home */}
      {ended && (
        <div
          ref={irisRef}
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '170vmax',
            height: '170vmax',
            borderRadius: '50%',
            boxShadow: '0 0 0 100vmax #000',
            zIndex: 60,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
