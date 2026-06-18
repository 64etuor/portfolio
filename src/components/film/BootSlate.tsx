'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * BootSlate — restrained "projector / slate ignition" for the opening boot act.
 *
 * Sequence (~1.5s, then settles and unmounts):
 *   1. brief black
 *   2. the datum line draws in (left→right)
 *   3. one faint scanline / flicker pass
 *   4. settle — fade out so the underlying BIOS scene + Subtitle take over
 *
 * Subtitle already renders the v0 / motto log lines, so this does NOT duplicate
 * any text. It only sets the system/projector "powering on" tone matching the
 * BIOS scene. Purely visual, pointer-events:none, self-expiring.
 *
 * Reduced motion: parent never mounts this (Finale is shown directly), so no
 * special handling needed; the globals.css freeze rule covers any edge.
 */
export function BootSlate({ color, onDone }: { color: string; onDone: () => void }) {
  const [gone, setGone] = useState(false)

  // Keep onDone in a ref so the self-destruct timers run exactly once on mount.
  // (Film re-renders ~60fps via setProgress; a non-memoized onDone in the deps
  // would reset these timers every frame and the slate would never unmount,
  // leaving its opaque #05070a layer covering every scene.)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 1200) // begin settle
    const t2 = setTimeout(() => doneRef.current(), 1500) // unmount
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 46, // above iframe + baseline, below controls
        pointerEvents: 'none',
        background: '#05070a',
        opacity: gone ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* projector ignition line draws in */}
      <svg
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <line
          x1={0}
          y1={30}
          x2={1000}
          y2={30}
          stroke={color}
          strokeWidth={0.6}
          strokeOpacity={0.6}
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: 'pf-bl-draw 0.9s ease forwards' }}
        />
      </svg>
      {/* single scanline / flicker pass */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '14%',
          background: 'linear-gradient(rgba(255,255,255,0.08), rgba(255,255,255,0))',
          animation: 'pf-boot-scan 1.2s ease-out forwards',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          animation: 'pf-boot-flicker 1.2s steps(1) forwards',
        }}
      />
    </div>
  )
}
