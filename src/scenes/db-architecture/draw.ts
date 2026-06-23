// db-architecture — pure geometry / SVG helper functions.
// No DOM refs, no closure state — all inputs via explicit parameters.

/** Returns the point on the edge of a box closest to (tx, ty). */
export function edgePoint(
  box: { x: number; y: number; w: number; h: number },
  tx: number,
  ty: number
): { x: number; y: number } {
  const cx = box.x + box.w / 2,
    cy = box.y + box.h / 2
  const dx = tx - cx,
    dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const hw = box.w / 2,
    hh = box.h / 2
  const sx = dx === 0 ? Infinity : hw / Math.abs(dx)
  const sy = dy === 0 ? Infinity : hh / Math.abs(dy)
  const sc = Math.min(sx, sy)
  return { x: cx + dx * sc, y: cy + dy * sc }
}

/** Returns an SVG string for a crow-foot arrow from p1 toward p2. */
export function crowFoot(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  col: string,
  hi: boolean
): string {
  const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  const len = hi ? 13 : 10,
    spread = hi ? 7 : 5
  const bx = p1.x + Math.cos(ang) * len,
    by = p1.y + Math.sin(ang) * len
  const perp = ang + Math.PI / 2
  const o1x = bx + Math.cos(perp) * spread,
    o1y = by + Math.sin(perp) * spread
  const o2x = bx - Math.cos(perp) * spread,
    o2y = by - Math.sin(perp) * spread
  const sw = hi ? 2 : 1.3
  return (
    '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + o1x + '" y2="' + o1y + '" stroke="' + col + '" stroke-width="' + sw + '"/>' +
    '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + o2x + '" y2="' + o2y + '" stroke="' + col + '" stroke-width="' + sw + '"/>' +
    '<line x1="' + p1.x + '" y1="' + p1.y + '" x2="' + bx + '" y2="' + by + '" stroke="' + col + '" stroke-width="' + sw + '"/>'
  )
}

/** Returns the point on the edge of a state-machine box closest to (tx, ty). */
export function smEdge(
  box: { cx: number; cy: number },
  tx: number,
  ty: number,
  hw: number,
  hh: number
): { x: number; y: number } {
  const { cx, cy } = box
  const dx = tx - cx,
    dy = ty - cy
  const ex = dx === 0 ? 1e9 : hw / Math.abs(dx),
    ey = dy === 0 ? 1e9 : hh / Math.abs(dy)
  const sc = Math.min(ex, ey)
  return { x: cx + dx * sc, y: cy + dy * sc }
}

/** Cubic Bézier interpolation at t ∈ [0,1] with symmetric control points (mx, my). */
export function bez(
  t: number,
  e: { x1: number; y1: number; x2: number; y2: number; mx: number }
): { x: number; y: number } {
  const { x1, y1, x2, y2, mx } = e
  const u = 1 - t
  const x = u * u * u * x1 + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * x2
  const y = u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2
  return { x, y }
}

/** Formats a row-count number as e.g. "2.85M" or "1,234". */
export function fmtRows(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  return n.toLocaleString()
}
