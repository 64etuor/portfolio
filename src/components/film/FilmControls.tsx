'use client'

import { SITE } from '@content/site'
import { useLocale } from '../LocaleProvider'

interface FilmControlsProps {
  paused: boolean
  onRewind: () => void
  onTogglePause: () => void
  onSkip: () => void
}

/**
 * FilmControls — rewind + play/pause (bottom-right) and immediate return home (top-right).
 */
export function FilmControls({ paused, onRewind, onTogglePause, onSkip }: FilmControlsProps) {
  const { t } = useLocale()
  return (
    <>
      {/* Controls (bottom-right): rewind + play/pause */}
      <div style={{ position: 'absolute', right: 20, bottom: 16, zIndex: 50, display: 'flex', gap: 8 }}>
        <button onClick={onRewind} aria-label={t(SITE.film.previous)} className="film-ctrl">
          ←
        </button>
        <button onClick={onTogglePause} aria-label={paused ? t(SITE.film.play) : t(SITE.film.pause)} className="film-ctrl">
          {paused ? '▶' : '⏸'}
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
