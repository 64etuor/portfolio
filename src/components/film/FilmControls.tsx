'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import { sfx, type SfxState } from '@/lib/sfx'

/** Where the film is — drives the sound design. */
export interface FilmBeat {
  act: number
  scene: number
  /** bumps on each PICTURE cut (useSceneBuffer.cutId) */
  cut: number
  ended: boolean
}

interface FilmControlsProps {
  paused: boolean
  onRewind: () => void
  onTogglePause: () => void
  onSkip: () => void
  /** Optional: enables picture-cut / ending SFX (scene cues + score: useFilmSoundCues). */
  beat?: FilmBeat
}

const serverState = (): SfxState => 'off'

function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
}

/** Toggle respecting the 'blocked' state: a click/M while blocked enables, never mutes. */
function toggleSound() {
  if (sfx.state === 'blocked') sfx.prime()
  else sfx.setEnabled(!sfx.enabled)
}

/**
 * FilmControls — rewind + play/pause + sound (bottom-right) and immediate return home (top-right).
 * Also owns the sound toggle, audio pause and the picture-cut / iris-out sounds; scene-synced
 * cues and the score are played by useFilmSoundCues (cue sheet: soundCues.ts).
 */
export function FilmControls({ paused, onRewind, onTogglePause, onSkip, beat }: FilmControlsProps) {
  const { t, locale, setLocale } = useLocale()
  const sound = useSyncExternalStore(sfx.subscribe, sfx.getState, serverState)

  const act = beat?.act ?? -1
  const cut = beat?.cut ?? 0
  const ended = beat?.ended ?? false

  const lastCutAct = useRef(act)

  // Prime on mount (sticky activation from the landing click usually allows it);
  // silence everything on unmount (skip home / navigation).
  useEffect(() => {
    sfx.prime()
    return () => {
      sfx.stopAll()
      sfx.setPaused(false)
    }
  }, [])

  // Keyboard: M toggles sound.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyM' || e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return
      e.preventDefault()
      toggleSound()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Film pause ↔ audio pause.
  useEffect(() => {
    sfx.setPaused(paused)
  }, [paused])

  // Picture cuts: a soft whoosh + thump when the act changes, a lighter thump inside an act.
  // (Kept under the score — the music carries the flow; the cut only marks the edit.)
  useEffect(() => {
    if (cut === 0) return
    const actChanged = lastCutAct.current !== act
    lastCutAct.current = act
    if (actChanged) {
      sfx.play('whoosh', { gain: 0.55 })
      sfx.play('cut', { gain: 0.5, delay: 0.05 })
    } else {
      sfx.play('cut', { gain: 0.4, pitch: 1.15 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per cut only
  }, [cut])

  // Ending: the iris-out lands with a soft impact while the score fades (music.ts).
  useEffect(() => {
    if (ended) sfx.play('impact', { gain: 0.5 })
  }, [ended])

  const soundLabel = sound === 'on' ? t(SITE.film.soundMute) : sound === 'off' ? t(SITE.film.soundUnmute) : t(SITE.film.soundEnable)

  return (
    <>
      {/* Controls (bottom-right): rewind + play/pause + sound */}
      <div style={{ position: 'absolute', right: 20, bottom: 16, zIndex: 50, display: 'flex', gap: 8 }}>
        <button onClick={onRewind} aria-label={t(SITE.film.previous)} className="film-ctrl">
          ←
        </button>
        <button onClick={onTogglePause} aria-label={paused ? t(SITE.film.play) : t(SITE.film.pause)} className="film-ctrl">
          {paused ? '▶' : '⏸'}
        </button>
        <button
          onClick={toggleSound}
          aria-label={soundLabel}
          title={soundLabel}
          aria-pressed={sound === 'on'}
          className="film-ctrl"
          style={sound === 'blocked' ? { opacity: 0.6 } : undefined}
        >
          <SpeakerIcon state={sound} />
        </button>
        {/* Language (KO/EN): the site header is hidden on /film, so the film carries its
            own switch. Toggling mid-film is safe — timing comes from the locale-independent
            master clock; scenes only redraw their text. */}
        <div role="group" aria-label={t(SITE.locale.label)} style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
          {(['ko', 'en'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              aria-pressed={locale === option}
              aria-label={`${option.toUpperCase()} — ${option === 'ko' ? t(SITE.locale.korean) : t(SITE.locale.english)}`}
              className="film-ctrl"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', opacity: locale === option ? 1 : 0.55 }}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Return home immediately (top-right) */}
      <button
        onClick={onSkip}
        className="film-skip"
        style={{ position: 'absolute', top: '6.2vh', right: 20, zIndex: 50 }}
      >
        {t(SITE.film.skip)}
      </button>
    </>
  )
}

function SpeakerIcon({ state }: { state: SfxState }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6h2.2L8 3.3v9.4L4.7 10H2.5z" fill="currentColor" stroke="none" />
      {state === 'on' ? (
        <>
          <path d="M10.4 6.1a2.6 2.6 0 0 1 0 3.8" />
          <path d="M12.2 4.4a5 5 0 0 1 0 7.2" />
        </>
      ) : (
        <path d="M10.6 6.2l3.4 3.6M14 6.2l-3.4 3.6" />
      )}
    </svg>
  )
}
