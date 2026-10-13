'use client'

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type RefObject } from 'react'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import { copy } from '@/i18n/content'
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
  /** Optional: enables the iris-out SFX (picture cuts, scene cues + score: useFilmSoundCues). */
  beat?: FilmBeat
  /** Film master-clock time (ms) — drives the boot-screen sound intro (centre → dock). */
  filmT?: number
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
 * Also owns the sound toggle, audio pause and the iris-out sound; picture-cut sounds, scene-synced
 * cues and the score are played by useFilmSoundCues off the master clock (cue sheet: soundCues.ts).
 */
export function FilmControls({ paused, onRewind, onTogglePause, onSkip, beat, filmT = Infinity }: FilmControlsProps) {
  const { t, locale, setLocale } = useLocale()
  const sound = useSyncExternalStore(sfx.subscribe, sfx.getState, serverState)

  const ended = beat?.ended ?? false
  const soundBtnRef = useRef<HTMLButtonElement | null>(null)
  const introDone = filmT >= INTRO_HOLD_MS + INTRO_FLY_MS

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

  // Ending: the iris-out lands with a soft impact while the score fades (music.ts).
  useEffect(() => {
    if (ended) sfx.play('impact', { gain: 0.42 })
  }, [ended])

  const soundLabel = sound === 'on' ? t(SITE.film.soundMute) : sound === 'off' ? t(SITE.film.soundUnmute) : t(SITE.film.soundEnable)

  return (
    <>
      {/* Controls (bottom-right): rewind + play/pause + sound */}
      <div style={{ position: 'absolute', right: 'max(16px, env(safe-area-inset-right))', bottom: 'max(16px, env(safe-area-inset-bottom))', zIndex: 50, display: 'flex', gap: 8 }}>
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
          ref={soundBtnRef}
          className={introDone ? 'film-ctrl film-ctrl--land' : 'film-ctrl film-ctrl--await'}
          style={sound === 'blocked' && introDone ? { opacity: 0.6 } : undefined}
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

      {/* Boot-screen sound intro: a large, centred sound control that — shortly before the
          boot shot ends — shrinks and glides into the bottom-right sound button. */}
      {!introDone && (
        <SoundIntro filmT={filmT} sound={sound} targetRef={soundBtnRef} onToggle={toggleSound} />
      )}

      {/* Return home immediately (top-right) */}
      <button
        onClick={onSkip}
        className="film-skip"
        style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 'max(16px, env(safe-area-inset-right))', zIndex: 50 }}
      >
        {t(SITE.film.skip)}
      </button>
    </>
  )
}

function SpeakerIcon({ state, size = 15 }: { state: SfxState; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

/** Boot-screen sound intro timing (film ms): centred until HOLD, then glides to the dock. */
const INTRO_HOLD_MS = 4500
const INTRO_FLY_MS = 820

const INTRO_COPY = {
  on: copy('사운드 켜짐 · 눌러서 끄기 (M)', 'Sound on · click to mute (M)'),
  off: copy('사운드 꺼짐 · 눌러서 켜기 (M)', 'Sound off · click to unmute (M)'),
  blocked: copy('눌러서 사운드 켜기', 'Click to enable sound'),
} as const

/**
 * Large centred sound control shown over the (quiet) boot shot. At INTRO_HOLD_MS it measures the
 * docked sound button and glides there (FLIP: translate + scale, ease-in-out), fading as it lands,
 * after which the real button pops in (`film-ctrl--land`). Clicking it toggles sound like the dock.
 */
function SoundIntro({
  filmT,
  sound,
  targetRef,
  onToggle,
}: {
  filmT: number
  sound: SfxState
  targetRef: RefObject<HTMLButtonElement | null>
  onToggle: () => void
}) {
  const { t } = useLocale()
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const flying = filmT >= INTRO_HOLD_MS

  useLayoutEffect(() => {
    const el = btnRef.current
    const target = targetRef.current
    if (!el) return
    if (!flying || !target) {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = ''
      return
    }
    const r = el.getBoundingClientRect()
    const tr = target.getBoundingClientRect()
    const dx = tr.left + tr.width / 2 - (r.left + r.width / 2)
    const dy = tr.top + tr.height / 2 - (r.top + r.height / 2)
    const scale = tr.width / r.width
    el.style.transition = `transform ${INTRO_FLY_MS}ms cubic-bezier(.65,0,.25,1), opacity 200ms ease ${INTRO_FLY_MS - 200}ms`
    el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${scale.toFixed(3)})`
    el.style.opacity = '0'
  }, [flying, targetRef])

  const label = t(INTRO_COPY[sound])
  return (
    <div className={flying ? 'film-sound-intro is-flying' : 'film-sound-intro'}>
      <button
        ref={btnRef}
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-pressed={sound === 'on'}
        className="film-sound-intro__btn"
        data-state={sound}
      >
        <SpeakerIcon state={sound} size={30} />
      </button>
      <p className="film-sound-intro__label" aria-hidden>
        {label}
      </p>
    </div>
  )
}
