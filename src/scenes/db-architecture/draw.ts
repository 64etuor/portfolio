// db-architecture — pure geometry / SVG / HTML string builders (+ the CTE tree
// node builder). No closure state — all inputs via explicit parameters.

import {
  SM_STATES,
  SM_W,
  SM_H,
  SM_EDGES,
  REC_TREE,
  type DdlRow,
} from './data'
import { svg } from '../_host/richText'

/** CSS-module class map (scene.module.css default export). */
type ClassMap = Record<string, string>

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

/* ============================================================
   HTML / SVG STRING BUILDERS — pure, css-module map passed in.
   Output byte-identical to the original inline builders.
   ============================================================ */

// 동적 innerHTML 빌드 시 논리 클래스 토큰 → CSS module 해시 클래스 매핑.
// 원본의 `class="col pk fk"` 같은 멀티토큰을 모듈 클래스로 치환.
export function cls(
  s: ClassMap,
  ...tokens: (string | number | false | undefined | null)[]
): string {
  return tokens
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => s[t] ?? t)
    .join(' ')
}

/** HTML-escapes &, <, >. */
export function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Lightweight SQL syntax highlighter → HTML string. */
export function hi(
  s: ClassMap,
  keywords: RegExp,
  types: RegExp,
  line: string
): string {
  if (/^\s*--/.test(line)) return '<span class="' + s.com + '">' + escHtml(line) + '</span>'
  let comment = ''
  const ci = line.indexOf('--')
  if (ci >= 0) {
    comment = line.slice(ci)
    line = line.slice(0, ci)
  }
  let out = escHtml(line)
    .replace(/'([^']*)'/g, '<span class="' + s.str + "\">'$1'</span>")
    .replace(keywords, '<span class="' + s.kw + '">$1</span>')
    .replace(types, '<span class="' + s.typ + '">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="' + s.num + '">$1</span>')
  if (comment) out += '<span class="' + s.com + '">' + escHtml(comment) + '</span>'
  return out
}

/** Renders a DDL row array to numbered, highlighted HTML lines. */
export function renderDDL(
  s: ClassMap,
  keywords: RegExp,
  types: RegExp,
  ddl: DdlRow[]
): string {
  let html = ''
  ddl.forEach((row, i) => {
    const line = row[1]
    html += '<span class="' + s.ln + '">' + (i + 1) + '</span>' + hi(s, keywords, types, line) + '\n'
  })
  return html
}

/** Single ERD crow-foot relationship → SVG string. Geometry resolved by caller. */
export function relSvgSegment(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  isHi: boolean
): string {
  const col = isHi ? '#ff5d8f' : '#2a3a50'
  const w = isHi ? 2.2 : 1.3
  const mx = (p1.x + p2.x) / 2
  const path = 'M' + p1.x + ',' + p1.y + ' C' + mx + ',' + p1.y + ' ' + mx + ',' + p2.y + ' ' + p2.x + ',' + p2.y
  let svg = '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" opacity="' + (isHi ? 1 : 0.6) + '"/>'
  svg += crowFoot(p1, p2, col, isHi)
  svg += '<circle cx="' + p2.x + '" cy="' + p2.y + '" r="' + (isHi ? 4 : 3) + '" fill="' + col + '"/>'
  return svg
}

/** Flow-edge SVG defs marker + opening string. */
export const FLOW_EDGE_DEFS =
  '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#2a3a50"/></marker></defs>'

/** Single architecture-flow edge → SVG path string. Geometry resolved by caller. */
export function flowEdgeSegment(
  a: string,
  b: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const mx = (x1 + x2) / 2
  return (
    '<path id="edge-' + a + '-' + b + '" d="M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2 + '" fill="none" stroke="#22324a" stroke-width="1.6" marker-end="url(#ah)"/>'
  )
}

/** Single flow packet dot → SVG string. */
export function flowDotSvg(x: number, y: number, col: string): string {
  return (
    '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="' + col + '"><animate attributeName="opacity" values="1;.5;1" dur="0.6s" repeatCount="indefinite"/></circle>' +
    '<circle cx="' + x + '" cy="' + y + '" r="9" fill="' + col + '" opacity="0.18"/>'
  )
}

/** State-machine diagram → SVG string for the given active state. */
export function drawSmStr(s: ClassMap, smCur: string): string {
  const smPos = (id: string) => {
    const st = SM_STATES.find((x) => x.id === id)!
    return { cx: st.x + SM_W / 2, cy: st.y + SM_H / 2, ...st }
  }
  let str =
    '<defs><marker id="sma" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#3a4d66"/></marker><marker id="sma-hot" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#00e0a4"/></marker></defs>'
  SM_EDGES.forEach(([a, b, lbl]) => {
    const pa = smPos(a),
      pb = smPos(b)
    const dx = pb.cx - pa.cx,
      dy = pb.cy - pa.cy
    const ea = smEdge(pa, pb.cx, pb.cy, SM_W / 2, SM_H / 2),
      eb = smEdge(pb, pa.cx, pa.cy, SM_W / 2, SM_H / 2)
    const hot = a === smCur
    const col = hot ? '#00e0a4' : '#34465e'
    const mx = (ea.x + eb.x) / 2,
      my = (ea.y + eb.y) / 2
    const ctrl =
      Math.abs(dx) > Math.abs(dy)
        ? mx + ',' + ea.y + ' ' + mx + ',' + eb.y
        : ea.x + ',' + my + ' ' + eb.x + ',' + my
    str +=
      '<path d="M' + ea.x + ',' + ea.y + ' C' + ctrl + ' ' + eb.x + ',' + eb.y + '" fill="none" stroke="' + col + '" stroke-width="' + (hot ? 2.4 : 1.4) + '" marker-end="url(#' + (hot ? 'sma-hot' : 'sma') + ')" opacity="' + (hot ? 1 : 0.7) + '"/>'
    str +=
      '<text x="' + mx + '" y="' + (my - 4) + '" fill="' + (hot ? '#00e0a4' : '#5c708a') + '" font-size="9.5" font-family="JetBrains Mono" text-anchor="middle">' + lbl + '</text>'
  })
  SM_STATES.forEach((st) => {
    const active = st.id === smCur
    const fill = active ? st.c : '#141d29'
    const stroke = st.c
    const txt = active ? '#06140f' : st.c
    str +=
      '<g><rect class="' + s.stRect + '" x="' + st.x + '" y="' + st.y + '" rx="9" width="' + SM_W + '" height="' + SM_H + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (active ? 2.4 : 1.4) + '" ' + (active ? 'filter="url(#glow)"' : '') + '/><text x="' + (st.x + SM_W / 2) + '" y="' + (st.y + SM_H / 2 + 4) + '" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="12" fill="' + txt + '">' + st.id + '</text></g>'
  })
  str +=
    '<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
  return str
}

/**
 * Recursive-CTE BOM tree. Builds the SVG nodes once into `root` and returns an
 * updater that only rewrites the depth-dependent attributes per tick.
 */
export function mountRecTree(root: Element): (recShown: number) => void {
  const edges = REC_TREE.flatMap((n) => {
    if (n.mgr == null) return []
    const p = REC_TREE.find((x) => x.id === n.mgr)!
    const d = 'M' + p.x + ',' + (p.y + 13) + ' C' + p.x + ',' + (p.y + n.y) / 2 + ' ' + n.x + ',' + (p.y + n.y) / 2 + ' ' + n.x + ',' + (n.y - 13)
    return [{ n, path: svg('path', { d, fill: 'none' }) }]
  })
  const nodes = REC_TREE.map((n) => {
    const rect = svg('rect', { x: n.x - 52, y: n.y - 14, rx: 8, width: 104, height: 28 })
    const name = svg('text', { x: n.x, y: n.y + 1, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 11 }, n.name)
    const meta = svg('text', { x: n.x, y: n.y + 11, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 7 }, '#' + n.id + ' parent:' + (n.mgr === null ? 'null' : n.mgr))
    return { n, g: svg('g', null, rect, name, meta), rect, name, meta }
  })
  root.replaceChildren(...edges.map((e) => e.path), ...nodes.map((x) => x.g))

  return (recShown) => {
    for (const { n, path } of edges) {
      const visible = n.depth <= recShown
      path.setAttribute('stroke', visible ? '#a78bfa' : '#1c2636')
      path.setAttribute('stroke-width', String(visible ? 1.8 : 1))
      path.setAttribute('opacity', String(visible ? 0.85 : 0.3))
    }
    for (const { n, g, rect, name, meta } of nodes) {
      const visible = n.depth <= recShown
      const justIn = n.depth === recShown
      const col = ['#3fb6ff', '#a78bfa', '#ffcb47', '#00e0a4'][n.depth]
      g.setAttribute('opacity', String(visible ? 1 : 0.25))
      rect.setAttribute('fill', visible ? (justIn ? col : '#141d29') : '#0e1620')
      rect.setAttribute('stroke', visible ? col : '#1c2636')
      rect.setAttribute('stroke-width', String(justIn ? 2.2 : 1.4))
      name.setAttribute('font-weight', String(justIn ? 700 : 500))
      name.setAttribute('fill', visible ? (justIn ? '#06140f' : col) : '#2a3a50')
      meta.setAttribute('fill', visible ? '#5c708a' : '#1c2636')
    }
  }
}
