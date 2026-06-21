interface FilmControlsProps {
  paused: boolean
  onRewind: () => void
  onTogglePause: () => void
  onSkip: () => void
}

/**
 * FilmControls — rewind + play/pause (bottom-right) and skip-to-ending (top-right).
 */
export function FilmControls({ paused, onRewind, onTogglePause, onSkip }: FilmControlsProps) {
  return (
    <>
      {/* Controls (bottom-right): rewind + play/pause */}
      <div style={{ position: 'absolute', right: 20, bottom: 16, zIndex: 50, display: 'flex', gap: 8 }}>
        <button onClick={onRewind} aria-label="이전" className="film-ctrl">
          ←
        </button>
        <button onClick={onTogglePause} aria-label={paused ? '재생' : '일시정지'} className="film-ctrl">
          {paused ? '▶' : '⏸'}
        </button>
      </div>

      {/* Skip to ending (top-right) */}
      <button
        onClick={onSkip}
        className="film-skip"
        style={{ position: 'absolute', top: '6.2vh', right: 20, zIndex: 50 }}
      >
        SKIP →
      </button>
    </>
  )
}
