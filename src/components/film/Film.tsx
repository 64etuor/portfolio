'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ACTS } from './acts'
import { FILM_SCHEDULE, FILM_TOTAL_MS, firstShotOfAct } from './schedule'
import { SceneSlot } from './SceneSlot'
import { FilmControls, type FilmBeat } from './FilmControls'
import { FilmTransition, txVariantFor } from './FilmTransition'
import { useFilmClock } from './useFilmClock'
import { useSceneBuffer } from './useSceneBuffer'
import { useIrisOutro } from './useIrisOutro'
import { useFilmSoundCues } from './useFilmSoundCues'
import type { SceneClock } from '@/scenes/_host/sceneClock'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'

// Neutral film accent (progress bar / controls). Scenes carry their own color.
const ACCENT = '#cdd2d8'

// Visually-hidden heading: gives SR users the film's name without altering the
// cinematic visual. (Mounted scenes can render their own <main>, so the film
// region is a labelled group — not a second <main>.)
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

/** Builds the SceneClock passed to a slot: shot-local seconds from the master clock. */
function clockFor(shot: { start: number; end: number; duration: number }, filmT: number): SceneClock {
  return {
    now: () => Math.max(0, Math.min(filmT - shot.start, shot.duration)) / 1000,
    remainingMs: () => shot.end - filmT,
  }
}

/**
 * Film — the autoplay portfolio "film" controller (DX→AX narrative).
 *
 * Timing model: a single master clock (useFilmClock) walks a frozen, locale-
 * independent schedule (schedule.ts, derived from acts.ts) purely on wall time.
 * Cuts happen when that clock crosses a shot boundary — never by waiting on a
 * scene's onReady. Readiness only controls whether a slot is actually REVEALED
 * (double-buffer cross-fade, see useSceneBuffer): if the incoming scene hasn't
 * painted yet when its shot starts, the outgoing slot keeps playing until it has.
 * Either way, the scene's own `t` comes from this same clock (SceneClockContext,
 * threaded through SceneSlot), so a late reveal always draws the correct instant
 * instead of restarting from 0 — which is what used to read as a visible "repeat"
 * when EN's heavier per-frame text localization delayed a paint past its shot's
 * internal loop boundary. Locale never touches this clock or the schedule; it only
 * changes the text a scene renders.
 */
export function Film() {
  const router = useRouter()
  const { t } = useLocale()
  const filmTitle = t(SITE.film.title)
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)
  const [ended, setEnded] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true)
    setReady(true)
  }, [])

  const onFilmEnd = useCallback(() => setEnded(true), [])

  // Film outro → landing: on the final beat the whole frame collapses into a single
  // point at center (iris-out), then we navigate. The landing reveals from black, so
  // the film hands off to the home page as one continuous shot (no abrupt cut).
  const irisRef = useIrisOutro(ended)

  // Master clock — the only source of truth for "what shot should be on screen".
  const { shotIdx, filmT, rewindToShot, source: clockSource } = useFilmClock({ paused, reduced, ended, ready, onFilmEnd })

  // Scene-synced sound cues + the background score, driven by the same master clock.
  useFilmSoundCues({ filmT, paused, ended, clock: clockSource })

  const currentShot = FILM_SCHEDULE[shotIdx]
  const nextShot = FILM_SCHEDULE[shotIdx + 1] ?? null
  const currentFile = currentShot.file
  const nextFile = nextShot?.file ?? null

  // Double-buffer scene slots — reveal/blank/cross-fade logic. Driven by the
  // schedule-derived files above, not by any onReady-gated state.
  const { slotFiles, visibleSlot, revealOnLoad, cutId } = useSceneBuffer({
    currentFile,
    nextFile,
    reduced,
    ready,
  })

  // Rewind one beat (act). Always lands on that beat's first scene and resumes
  // playback (un-pause), so the control produces visible motion even while paused.
  const rewindBeat = useCallback(() => {
    setEnded(false)
    setPaused(false)
    rewindToShot(firstShotOfAct(Math.max(0, currentShot.actIdx - 1)))
  }, [rewindToShot, currentShot.actIdx])

  // Skip exits the film immediately. The landing is the portfolio's home and
  // avoids making visitors wait through the closing beat before they can leave.
  const skipToHome = useCallback(() => router.replace('/'), [router])

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
      <div role="region" aria-label={filmTitle} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', background: '#000', overflow: 'hidden' }}>
        <h1 style={srOnly}>{filmTitle}</h1>
        <div style={{ position: 'absolute', inset: 0 }}>
          <SceneSlot file={endFile} running onReady={() => {}} />
        </div>
      </div>
    )
  }

  // Overall film progress — continuous wall-time fraction, not a scene count.
  const overall = Math.min(1, filmT / FILM_TOTAL_MS)
  const txVariant = txVariantFor(currentShot.actId)
  // Sound sync: cutId already bumps exactly on manifest shot boundaries (it is the
  // buffer's PICTURE cut, driven here by the schedule-derived currentFile — not by
  // locale-sensitive readiness), so it fires identically in KO and EN.
  const beat: FilmBeat = { act: currentShot.actIdx, scene: currentShot.sceneIdx, cut: cutId, ended }

  return (
    <div role="region" aria-label={filmTitle} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', background: '#000', overflow: 'hidden' }}>
      <h1 style={srOnly}>{filmTitle}</h1>
      {/* Buffered scene viewport — two stable slots that cross-fade. */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {[0, 1].map((i) => {
          const f = slotFiles[i]
          const isVisible = visibleSlot === i
          // Match this slot's file against the current/next shot so its scene reads
          // `t` from the master clock — never from a local elapsed-since-mount counter.
          const shotForSlot = f === currentFile ? currentShot : f === nextFile ? nextShot : null
          const clock = shotForSlot ? clockFor(shotForSlot, filmT) : undefined
          return (
            <div
              key={`slot-${i}`}
              // Debug/QA hook only (harmless in prod): lets an instrumented
              // Playwright check identify which scene file is in which slot
              // without poking at React internals.
              data-film-slot-file={f ?? ''}
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
                // Materialize: the incoming scene comes INTO FOCUS (blur→sharp, settle
                // from a slight zoom, fade up) via a one-shot keyframe animation; the
                // outgoing one dissolves out. Both END with filter/transform = none so
                // a settled slot never carries a filter — a lingering blur(0px) still
                // forces an extra full-screen GPU pass on every frame over WebGL.
                // (Outgoing uses a plain opacity transition — a keyframe here would also
                // play on a never-shown staged slot at load and flash it.)
                opacity: isVisible ? 1 : 0,
                animation: isVisible ? 'film-materialize 720ms cubic-bezier(.2,.7,.2,1) both' : 'none',
                transition: 'opacity 380ms ease',
                zIndex: isVisible ? 2 : 1,
              }}
            >
              {/* Only the VISIBLE slot runs. The hidden slot holds the next scene already
                  mounted and painted (its static frame, at the clock's current shot-local
                  offset) but NOT ticking — useSceneCanvas skips the rAF subscription when
                  running is false, so a staged scene cannot advance mid-loop before it is
                  seen. Pause freezes the visible scene in place (the host freeze-resumes
                  from the same frame). */}
              <SceneSlot file={f} running={isVisible && !paused} onReady={() => revealOnLoad(i)} clock={clock} />
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

      {/* Controls: rewind + play/pause + return-home */}
      <FilmControls
        paused={paused}
        onRewind={rewindBeat}
        onTogglePause={() => setPaused((p) => !p)}
        onSkip={skipToHome}
        beat={beat}
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
