'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Transition — inter-act match-cut overlay.
 *
 * True iframe-to-iframe visual match cuts are impossible, so we APPROXIMATE: on
 * an act change a short (~0.55s) overlay masks the iframe swap with a quick dark
 * wipe and morphs the shared datum-line motif from the OUTGOING act's shape
 * toward the INCOMING act's shape across the seam.
 *
 * Crucially this is PURELY visual:
 *  - It does NOT pause, advance, or touch the rAF clock / paused / actIdx state.
 *  - It self-expires on its own timer and unmounts (the parent clears `seam`).
 *  - It is pointer-events:none and sits above the iframe but below controls.
 *
 * Reduced motion: when `reduced` is true the parent simply never mounts this,
 * so the act swap is instant.
 */

const DUR_MS = 550

type Seam = { from: string; to: string }

export function Transition({ from, to, color, onDone }: Seam & { color: string; onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  // onDone via ref: Film re-renders ~60fps, so a non-memoized onDone in the deps
  // would reset the self-destruct timer every frame and this match-cut overlay
  // (opaque #05070a) would never clear, covering the scene permanently.
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    setPhase('in')
    const t1 = setTimeout(() => setPhase('out'), DUR_MS * 0.5)
    const t2 = setTimeout(() => doneRef.current(), DUR_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [from, to])

  const shapes = seamShapes(from, to, color)

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 45, // above iframe(0) + baseline(30), below controls(50)
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Dark wipe: sweeps in from left, then out to the right across the seam. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#05070a',
          animation: `pf-tx-wipe ${DUR_MS}ms cubic-bezier(0.7,0,0.3,1) forwards`,
        }}
      />
      {/* Morphing datum-line motif centered on the seam. */}
      <svg
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <line x1={0} y1={30} x2={1000} y2={30} stroke={color} strokeWidth={0.5} strokeOpacity={0.45} />
        <g style={{ opacity: phase === 'in' ? 1 : 0, transition: `opacity ${DUR_MS * 0.4}ms ease` }}>
          {shapes.from}
        </g>
        <g style={{ opacity: phase === 'out' ? 1 : 0, transition: `opacity ${DUR_MS * 0.4}ms ease` }}>
          {shapes.to}
        </g>
      </svg>
    </div>
  )
}

/**
 * Returns abstract from→to shapes for a given seam. The `from`/`to` ids let us
 * pick a tailored pair; unknown seams fall back to a generic dot→dot morph.
 */
function seamShapes(from: string, to: string, color: string): { from: React.ReactNode; to: React.ReactNode } {
  const cx = 500
  const cy = 30
  const stroke = { stroke: color, strokeOpacity: 0.7, fill: 'none' as const }
  const key = `${from}->${to}`

  switch (key) {
    // boot→eunseong: line → metal cut-edge (a beveled corner)
    case 'boot->eunseong':
      return {
        from: <line x1={cx - 40} y1={cy} x2={cx + 40} y2={cy} strokeWidth={0.6} {...stroke} />,
        to: <path d={`M ${cx - 40} ${cy + 6} L ${cx} ${cy + 6} L ${cx + 10} ${cy - 6} L ${cx + 40} ${cy - 6}`} strokeWidth={0.6} {...stroke} />,
      }
    // eunseong→elentec: a small box corner → jig fixation point
    case 'eunseong->elentec':
      return {
        from: <path d={`M ${cx - 30} ${cy - 6} L ${cx - 6} ${cy - 6} L ${cx - 6} ${cy + 6}`} strokeWidth={0.6} {...stroke} />,
        to: (
          <g {...stroke} strokeWidth={0.6}>
            <line x1={cx} y1={cy - 7} x2={cx} y2={cy + 7} />
            <circle cx={cx} cy={cy} r={2.4} />
          </g>
        ),
      }
    // elentec→solaredge: jig hole array → DB PK dots
    case 'elentec->solaredge':
      return {
        from: (
          <g {...stroke} strokeWidth={0.5}>
            {[-1, 0, 1].map((d) => (
              <circle key={d} cx={cx + d * 14} cy={cy} r={1.6} />
            ))}
          </g>
        ),
        to: (
          <g fill={color} fillOpacity={0.65} stroke="none">
            {[-1, 0, 1].map((d) => (
              <circle key={d} cx={cx + d * 14} cy={cy} r={1.4} />
            ))}
          </g>
        ),
      }
    // solaredge→bridge: an ERD relation line → code cursor
    case 'solaredge->bridge':
      return {
        from: (
          <g {...stroke} strokeWidth={0.5}>
            <line x1={cx - 24} y1={cy} x2={cx + 24} y2={cy} />
            <circle cx={cx - 24} cy={cy} r={1.4} />
            <circle cx={cx + 24} cy={cy} r={1.4} />
          </g>
        ),
        to: <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={color} fillOpacity={0.55} stroke="none" />,
      }
    // bridge→startup: terminal cursor → ALB health trace
    case 'bridge->startup':
      return {
        from: <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={color} fillOpacity={0.55} stroke="none" />,
        to: <line x1={cx - 50} y1={cy} x2={cx + 50} y2={cy} strokeWidth={0.7} strokeDasharray="5 4" {...stroke} />,
      }
    // startup→epilogue: trace → radar echo
    case 'startup->epilogue':
      return {
        from: <line x1={cx - 50} y1={cy} x2={cx + 50} y2={cy} strokeWidth={0.7} strokeDasharray="5 4" {...stroke} />,
        to: (
          <g {...stroke} strokeWidth={0.6}>
            <circle cx={cx} cy={cy} r={4} />
            <circle cx={cx} cy={cy} r={8} strokeOpacity={0.35} />
          </g>
        ),
      }
    default:
      return {
        from: <circle cx={cx} cy={cy} r={2} fill={color} fillOpacity={0.6} stroke="none" />,
        to: <circle cx={cx} cy={cy} r={2} fill={color} fillOpacity={0.6} stroke="none" />,
      }
  }
}
