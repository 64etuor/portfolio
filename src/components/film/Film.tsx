'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACTS } from './acts'

// Neutral film accent (progress bar / controls). Scenes carry their own color.
const ACCENT = '#cdd2d8'

// Per-beat scene-cut flavor, keyed by the INCOMING beat's id (else 'default').
const TX_VARIANT: Record<string, string> = {
  's6-collision': 'glitch', // 충돌 — 디지털 글리치/찢김
  's8-insight': 'weave', // 연결 — 양쪽(현업·개발)이 중앙에서 만나 봉합
  's9-bridge': 'weave', // 해결(양손잡이) — 봉합
  's10-crossdomain': 'weave', // 크로스도메인 — 봉합
  ending: 'bloom', // 엔딩 — 빛이 바깥으로 열림
}

// The scene that plays after (actIdx, sceneIdx), or null at the end of the film.
function nextIndex(actIdx: number, sceneIdx: number): [number, number] | null {
  const a = ACTS[actIdx]
  if (sceneIdx + 1 < a.scenes.length) return [actIdx, sceneIdx + 1]
  if (actIdx + 1 < ACTS.length) return [actIdx + 1, 0]
  return null
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
  const router = useRouter()
  const [reduced, setReduced] = useState(false)
  const [ready, setReady] = useState(false)
  const [ended, setEnded] = useState(false)

  const [actIdx, setActIdx] = useState(0)
  const [sceneIdx, setSceneIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)

  // Two stable iframe slots; we cross-fade between them.
  const [slotFiles, setSlotFiles] = useState<[string | null, string | null]>(() => [
    ACTS[0].scenes[0].file,
    null,
  ])
  const [visibleSlot, setVisibleSlot] = useState(0)
  const [txId, setTxId] = useState(0) // bumps on each cut → replays the transition overlay

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setReduced(true)
    setReady(true)
  }, [])

  const shot = ACTS[actIdx].scenes[sceneIdx]
  const currentFile = shot.file
  const currentMs = shot.ms
  // The current scene is "visible" only once the visible slot actually holds it.
  const visible = slotFiles[visibleSlot] === currentFile

  const onFilmEnd = useCallback(() => setEnded(true), [])
  useEffect(() => {
    if (ended) router.push('/')
  }, [ended, router])

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

  // NOTE: no prefetch. Each scene loads only when it becomes current (load-on-cut),
  // so its rAF starts at reveal ≈ t0 — the scene is seen from its true start point
  // (static intro → dynamic), not mid-loop. The load gap is hidden by the cut overlay.

  const advance = useCallback(() => {
    const n = nextIndex(actIdx, sceneIdx)
    if (!n) {
      onFilmEnd()
      return
    }
    setActIdx(n[0])
    setSceneIdx(n[1])
  }, [actIdx, sceneIdx, onFilmEnd])

  // Clock — starts only when the current scene is VISIBLE, runs for currentMs.
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const carriedRef = useRef(0)
  // Shared per-scene guard: advance() fires at most once per scene, even if two
  // rAF loops briefly coexist (React StrictMode double-invokes effects in dev).
  // Reset to false whenever the scene changes (see the reset effect below).
  const advancedRef = useRef(false)
  useEffect(() => {
    if (reduced || ended || !ready || !visible) return

    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      carriedRef.current += performance.now() - startRef.current
      return
    }

    startRef.current = performance.now()
    let alive = true
    const tick = () => {
      if (!alive) return
      const elapsed = carriedRef.current + (performance.now() - startRef.current)
      const p = Math.min(1, elapsed / currentMs)
      setProgress(p)
      if (p >= 1) {
        if (!advancedRef.current) {
          advancedRef.current = true
          carriedRef.current = 0
          advance()
        }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      alive = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [actIdx, sceneIdx, paused, reduced, ended, ready, visible, currentMs, advance])

  // On a fresh scene: reset the clock guard, and fire the cinematic cut transition.
  // (Skip the very first scene so the overlay doesn't flash on initial load; the
  // ref-compare also makes it immune to React StrictMode's double-invoke in dev.)
  const prevSceneRef = useRef('')
  useEffect(() => {
    const key = `${actIdx}-${sceneIdx}`
    if (prevSceneRef.current && prevSceneRef.current !== key) setTxId((n) => n + 1)
    prevSceneRef.current = key
    carriedRef.current = 0
    advancedRef.current = false
    setProgress(0)
  }, [actIdx, sceneIdx])

  const revealOnLoad = (i: number) => {
    if (slotFiles[i] === currentFile && i !== visibleSlot) setVisibleSlot(i)
  }

  const rewindBeat = useCallback(() => {
    setEnded(false)
    carriedRef.current = 0
    setActIdx((i) => {
      const t = Math.max(0, i - 1)
      setSceneIdx(0)
      return t
    })
  }, [])

  const skipToEnd = useCallback(() => {
    setEnded(false)
    carriedRef.current = 0
    setSceneIdx(0)
    setActIdx(ACTS.length - 1)
  }, [])

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
      <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
        <iframe
          src={`/lab/${endFile}`}
          title="ending"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    )
  }

  // Overall film progress across all scenes (flattened) for the top bar.
  const flatTotal = ACTS.reduce((s, a) => s + a.scenes.length, 0)
  const flatIdx = ACTS.slice(0, actIdx).reduce((s, a) => s + a.scenes.length, 0) + sceneIdx
  const overall = Math.min(1, (flatIdx + progress) / flatTotal)
  const txVariant = TX_VARIANT[ACTS[actIdx].id] ?? 'default'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* Buffered scene viewport — two stable iframes that cross-fade. */}
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
            />
          )
        })}
      </div>

      {/* Cinematic letterbox + vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, boxShadow: 'inset 0 0 220px rgba(0,0,0,0.6)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '5vh', background: '#000', pointerEvents: 'none', zIndex: 20 }} />

      {/* Cinematic scene-cut transition — the key replays the animation on each cut */}
      {txId > 0 && (
        <div className={`film-tx film-tx--${txVariant}`} key={txId} aria-hidden>
          {txVariant === 'glitch' && (
            <>
              <div className="ftx-flash" />
              <div className="ftx-slice a" />
              <div className="ftx-slice b" />
              <div className="ftx-noise" />
            </>
          )}
          {txVariant === 'weave' && (
            <>
              <div className="ftx-wl" />
              <div className="ftx-wr" />
              <div className="ftx-merge" />
            </>
          )}
          {txVariant === 'bloom' && <div className="ftx-b" />}
          {txVariant === 'default' && (
            <>
              <div className="film-tx-bloom" />
              <div className="film-tx-slash" />
            </>
          )}
        </div>
      )}

      {/* Overall progress bar (top) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: 2,
          width: `${overall * 100}%`,
          background: ACCENT,
          opacity: 0.55,
          transition: 'width 120ms linear',
          zIndex: 41,
        }}
      />

      {/* Controls (bottom-right): rewind + play/pause */}
      <div style={{ position: 'absolute', right: 20, bottom: 16, zIndex: 50, display: 'flex', gap: 8 }}>
        <button onClick={rewindBeat} aria-label="이전" style={ctrlBtn}>
          ←
        </button>
        <button onClick={() => setPaused((p) => !p)} aria-label={paused ? '재생' : '일시정지'} style={ctrlBtn}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* Skip to ending (top-right) */}
      <button
        onClick={skipToEnd}
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
        건너뛰기 →
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
