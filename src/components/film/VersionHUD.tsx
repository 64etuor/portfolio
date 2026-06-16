'use client'

/**
 * VersionHUD — bottom-left mono version ladder v0 … v5 / now.
 * Highlights the current act's version. Dry, instrument-panel tone.
 */
const LADDER = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'now']

export function VersionHUD({ version, color }: { version: string; color: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: 20,
        bottom: 16,
        zIndex: 40,
        display: 'flex',
        gap: 8,
        fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
        fontSize: 11,
        letterSpacing: '0.12em',
        pointerEvents: 'none',
        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
      }}
    >
      {LADDER.map((v) => {
        const active = v === version
        return (
          <span
            key={v}
            style={{
              color: active ? color : 'rgba(255,255,255,0.3)',
              fontWeight: active ? 700 : 400,
              transition: 'color 0.5s ease',
              borderBottom: active ? `1px solid ${color}` : '1px solid transparent',
              paddingBottom: 2,
            }}
          >
            {v}
          </span>
        )
      })}
    </div>
  )
}
