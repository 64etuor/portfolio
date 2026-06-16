'use client'

/**
 * BaselineLayer — the "datum line" through-line motif.
 *
 * A single thin horizontal SVG datum line spans the screen (pointer-events:none,
 * low opacity, act color). It now MORPHS into a different *form* per act so the
 * through-line reads as the same instrument evolving across the career:
 *
 *   boot      — a faint single line being drawn in (birth, left→right)
 *   eunseong  — a straight, solid production rail (calm)
 *   elentec   — a ruler/caliper with tick marks + a jig guide notch
 *   solaredge — the line sprouts branching DB-relation nodes (connector dots/edges)
 *   bridge    — line with a blinking code-cursor segment (neutral/dry)
 *   startup   — a dashed infra "trace" with slow-moving dashes (health-check)
 *   epilogue  — a radar-sweep echo that settles
 *
 * Tasteful/minimal, not neon. All variants honor prefers-reduced-motion by way
 * of `@media (prefers-reduced-motion: reduce)` rules in globals.css that freeze
 * the per-variant animations (the keyframes are namespaced `pf-bl-*`).
 */
export function BaselineLayer({ color, actId, seed }: { color: string; actId: string; seed: number }) {
  const W = 1000
  const H = 60
  // Gentle deterministic vertical drift so successive acts don't sit pixel-identical.
  const baseY = 30 + ((seed % 5) - 2) * 0.7

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 30,
        transition: 'opacity 0.6s ease',
      }}
    >
      {renderForm(actId, color, W, baseY, seed)}
    </svg>
  )
}

function renderForm(actId: string, color: string, W: number, y: number, seed: number) {
  switch (actId) {
    case 'boot':
      return <BootForm color={color} W={W} y={y} />
    case 'eunseong':
      return <RailForm color={color} W={W} y={y} />
    case 'elentec':
      return <CaliperForm color={color} W={W} y={y} seed={seed} />
    case 'solaredge':
      return <DbForm color={color} W={W} y={y} seed={seed} />
    case 'bridge':
      return <CursorForm color={color} W={W} y={y} />
    case 'startup':
      return <TraceForm color={color} W={W} y={y} />
    case 'epilogue':
      return <RadarForm color={color} W={W} y={y} />
    default:
      return <RailForm color={color} W={W} y={y} />
  }
}

/* boot — single faint line drawn in left→right (stroke-dash reveal). */
function BootForm({ color, W, y }: { color: string; W: number; y: number }) {
  return (
    <line
      x1={0}
      y1={y}
      x2={W}
      y2={y}
      stroke={color}
      strokeWidth={0.5}
      strokeOpacity={0.5}
      pathLength={1}
      style={{
        strokeDasharray: 1,
        strokeDashoffset: 1,
        animation: 'pf-bl-draw 1.4s ease forwards',
      }}
    />
  )
}

/* eunseong — solid, calm production rail (two faint guide rails). */
function RailForm({ color, W, y }: { color: string; W: number; y: number }) {
  return (
    <g>
      <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.55} strokeOpacity={0.55} />
      <line x1={0} y1={y + 1.6} x2={W} y2={y + 1.6} stroke={color} strokeWidth={0.3} strokeOpacity={0.22} />
    </g>
  )
}

/* elentec — ruler/caliper with regular tick marks + one jig guide notch. */
function CaliperForm({ color, W, y, seed }: { color: string; W: number; y: number; seed: number }) {
  const n = 24
  const ticks = Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * W)
  const notchX = ((seed % 6) / 9 + 0.32) * W
  return (
    <g>
      <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.5} strokeOpacity={0.55} />
      {ticks.map((tx, i) => {
        const major = i % 4 === 0
        const h = major ? 2.4 : 1.2
        return (
          <line
            key={i}
            x1={tx}
            x2={tx}
            y1={y - h}
            y2={y}
            stroke={color}
            strokeWidth={0.4}
            strokeOpacity={major ? 0.5 : 0.3}
          />
        )
      })}
      {/* jig guide notch — caliper jaw straddling the datum */}
      <g style={{ animation: 'pf-bl-notch 5s ease-in-out infinite' }}>
        <line x1={notchX} x2={notchX} y1={y - 4} y2={y + 4} stroke={color} strokeWidth={0.6} strokeOpacity={0.65} />
        <path
          d={`M ${notchX - 3} ${y - 4} L ${notchX} ${y - 1.4} L ${notchX + 3} ${y - 4}`}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          strokeOpacity={0.6}
        />
      </g>
    </g>
  )
}

/* solaredge — datum sprouts branching DB-relation nodes (connector dots/edges). */
function DbForm({ color, W, y, seed }: { color: string; W: number; y: number; seed: number }) {
  const cols = 5
  const xs = Array.from({ length: cols }, (_, i) => ((i + 1) / (cols + 1)) * W)
  return (
    <g>
      <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.5} strokeOpacity={0.5} />
      {xs.map((x, i) => {
        const up = (i + seed) % 2 === 0
        const ny = up ? y - 7 : y + 7
        return (
          <g key={i} style={{ animation: `pf-bl-node 4.5s ease-in-out ${i * 0.35}s infinite` }}>
            <line x1={x} y1={y} x2={x} y2={ny} stroke={color} strokeWidth={0.4} strokeOpacity={0.4} />
            <circle cx={x} cy={ny} r={1.1} fill={color} fillOpacity={0.55} />
            {/* PK dot on the datum */}
            <circle cx={x} cy={y} r={0.7} fill={color} fillOpacity={0.7} />
          </g>
        )
      })}
    </g>
  )
}

/* bridge — datum with a blinking code-cursor segment (neutral/dry). */
function CursorForm({ color, W, y }: { color: string; W: number; y: number }) {
  const segX = W * 0.46
  const segW = W * 0.05
  return (
    <g>
      <line x1={0} y1={y} x2={segX} y2={y} stroke={color} strokeWidth={0.5} strokeOpacity={0.5} />
      <line x1={segX + segW} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.5} strokeOpacity={0.5} />
      {/* the cursor block sitting in the gap */}
      <rect
        x={segX + 1.5}
        y={y - 2.2}
        width={segW - 3}
        height={4.4}
        fill={color}
        fillOpacity={0.45}
        style={{ animation: 'pf-bl-cursor 1.1s steps(1) infinite' }}
      />
    </g>
  )
}

/* startup — dashed infra trace with slowly moving dashes (health-check feel). */
function TraceForm({ color, W, y }: { color: string; W: number; y: number }) {
  return (
    <g>
      <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.3} strokeOpacity={0.18} />
      <line
        x1={0}
        y1={y}
        x2={W}
        y2={y}
        stroke={color}
        strokeWidth={0.6}
        strokeOpacity={0.55}
        strokeDasharray="6 5"
        style={{ animation: 'pf-bl-dash 3.2s linear infinite' }}
      />
      {/* health-check pulse riding the trace */}
      <circle cx={0} cy={y} r={1.3} fill={color} fillOpacity={0.7}>
        <animate attributeName="cx" from="0" to={W} dur="4.2s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

/* epilogue — radar-sweep echo that settles onto the datum. */
function RadarForm({ color, W, y }: { color: string; W: number; y: number }) {
  const cx = W / 2
  return (
    <g>
      <line x1={0} y1={y} x2={W} y2={y} stroke={color} strokeWidth={0.45} strokeOpacity={0.45} />
      {/* expanding echo rings, centered, low opacity */}
      {[0, 1.4].map((delay, i) => (
        <circle
          key={i}
          cx={cx}
          cy={y}
          r={4}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          strokeOpacity={0.5}
          style={{
            transformOrigin: `${cx}px ${y}px`,
            animation: `pf-bl-echo 2.8s ease-out ${delay}s infinite`,
          }}
        />
      ))}
      <circle cx={cx} cy={y} r={1} fill={color} fillOpacity={0.7} />
    </g>
  )
}
