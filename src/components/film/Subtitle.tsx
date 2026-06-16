'use client'

import { useEffect, useState } from 'react'

/**
 * Subtitle — bottom-area monospace log line that types the act's subtitles
 * sequentially across the act duration. Dry tone, no emoji, no exclamation.
 * Subtitles re-sequence whenever `subtitles` or `actKey` change.
 */
export function Subtitle({
  subtitles,
  durationMs,
  actKey,
  color,
}: {
  subtitles: string[]
  durationMs: number
  actKey: string
  color: string
}) {
  const [lineIdx, setLineIdx] = useState(0)
  const [typed, setTyped] = useState('')

  // Advance which subtitle line is shown, spaced across the act duration.
  useEffect(() => {
    setLineIdx(0)
    if (subtitles.length <= 1) return
    // Reserve a small lead-in/tail; divide remaining time across lines.
    const slot = durationMs / (subtitles.length + 0.5)
    const timers = subtitles.map((_, i) =>
      i === 0 ? null : setTimeout(() => setLineIdx(i), slot * i)
    )
    return () => timers.forEach((t) => t && clearTimeout(t))
  }, [actKey, subtitles, durationMs])

  // Typewriter for the current line.
  useEffect(() => {
    const text = subtitles[lineIdx] ?? ''
    setTyped('')
    let i = 0
    let alive = true
    const step = () => {
      if (!alive) return
      i += 1
      setTyped(text.slice(0, i))
      if (i < text.length) setTimeout(step, 34)
    }
    const t0 = setTimeout(step, 120)
    return () => {
      alive = false
      clearTimeout(t0)
    }
  }, [lineIdx, subtitles])

  if (!subtitles.length) return null

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '8vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '0 6vw',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
          fontSize: 'clamp(13px, 1.7vw, 17px)',
          letterSpacing: '0.01em',
          color: 'rgba(238,243,248,0.92)',
          textAlign: 'center',
          wordBreak: 'keep-all',
          textShadow: '0 1px 10px rgba(0,0,0,0.95)',
        }}
      >
        <span style={{ color, opacity: 0.7, marginRight: 8 }}>›</span>
        {typed}
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: '1em',
            marginLeft: 2,
            verticalAlign: '-0.15em',
            background: color,
            opacity: 0.7,
            animation: 'pf-blink-soft 1.1s ease-in-out infinite',
          }}
        />
      </p>
    </div>
  )
}
