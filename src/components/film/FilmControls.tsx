'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'
import { ACTS } from './acts'
import { sfx, playSequence, BOOT_SEQUENCE, type DroneTone, type SfxState } from '@/lib/sfx'

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
  /** Optional: enables scene-synced SFX (cuts, boot, ending). */
  beat?: FilmBeat
}

const TENSE = new Set(['s2-reality', 's3-problem', 's4-perspectives', 's6-collision', 's7-cost'])
const BRIGHT = new Set(['s8-insight', 's9-bridge', 's10-crossdomain', 'ending'])
const toneFor = (id: string | undefined): DroneTone => (id && TENSE.has(id) ? 'tense' : id && BRIGHT.has(id) ? 'bright' : 'bed')

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
 * Also hosts the film's phase-1 sound design (src/lib/sfx), since it is mounted for the film's lifetime.
 */
export function FilmControls({ paused, onRewind, onTogglePause, onSkip, beat }: FilmControlsProps) {
  const { t } = useLocale()
  const sound = useSyncExternalStore(sfx.subscribe, sfx.getState, serverState)

  const act = beat?.act ?? -1
  const cut = beat?.cut ?? 0
  const ended = beat?.ended ?? false
  const actId = act >= 0 ? ACTS[act]?.id : undefined

  const mountedAt = useRef(0)
  const lastCutAct = useRef(act)
  const bootPlayed = useRef(false)

  // Prime on mount (sticky activation from the landing click usually allows it);
  // silence everything on unmount (skip home / navigation).
  useEffect(() => {
    mountedAt.current = performance.now()
    sfx.prime()
    return () => {
      sfx.drone(false)
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

  // Drone bed while the film plays; tone follows the narrative.
  const droneOn = sound === 'on' && !paused && !ended
  const tone = toneFor(actId)
  useEffect(() => {
    sfx.drone(droneOn, tone)
  }, [droneOn, tone])

  // Opening boot beat (no picture cut precedes it): play once audio is live, but only
  // if that happens early enough to still line up with the scene.
  useEffect(() => {
    if (sound !== 'on' || bootPlayed.current || cut !== 0 || actId !== 's0-boot') return
    bootPlayed.current = true
    if (performance.now() - mountedAt.current < 1500) playSequence(sfx.play.bind(sfx), BOOT_SEQUENCE)
  }, [sound, cut, actId])

  // Picture cuts: a thump on every cut, plus a whoosh when the act changes.
  useEffect(() => {
    if (cut === 0) return
    const actChanged = lastCutAct.current !== act
    lastCutAct.current = act
    if (actChanged) {
      sfx.play('whoosh')
      sfx.play('cut', { delay: 0.05 })
    } else {
      sfx.play('cut', { gain: 0.65, pitch: 1.15 })
    }
    if (actChanged && actId === 's0-boot') playSequence(sfx.play.bind(sfx), BOOT_SEQUENCE, 0.1)
    if (actChanged && actId === 'ending') sfx.play('confirm', { delay: 0.9 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire per cut only
  }, [cut])

  // Ending: iris-out lands with an impact; the bed fades via droneOn.
  useEffect(() => {
    if (ended) sfx.play('impact')
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
