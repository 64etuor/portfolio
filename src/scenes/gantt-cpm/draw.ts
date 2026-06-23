// Pure, closure-free draw helpers/constants for the gantt-cpm scene.
// Extracted module-scope helpers from Scene.tsx — no DOM closures, no scene state.
// Date/scale math reads the timeline window (T0/T1) from the data CANON.

import { T0, T1, type Row } from './data'

export const NS = 'http://www.w3.org/2000/svg'

// Effective progress %: ongoing rows derive from elapsed time clamped to [start,end];
// finished rows use their static pct. Pure — caller passes `now` (TODAY.getTime()).
export function rowPct(t: Row, now: number) {
  if (!t.ongoing) return t.pct
  const st = t.start.getTime(),
    e = t.end.getTime()
  const tdy = Math.max(st, Math.min(now, e))
  return Math.round(((tdy - st) / (e - st)) * 100)
}

export function fmtYM(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function span(d: Date) {
  return (d.getTime() - T0.getTime()) / (T1.getTime() - T0.getTime())
}

// easeInOutCubic
export function eio(t: number) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

export function sparkSVG(data: number[], color: string, w = 46, h = 16) {
  const min = Math.min(...data),
    max = Math.max(...data),
    rng = max - min || 1
  const pts = data
    .map((d, i) => {
      const px = (i / (data.length - 1)) * (w - 2) + 1
      const py = h - 1 - ((d - min) / rng) * (h - 2)
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(' ')
  const last = data[data.length - 1]
  const lx = w - 2 + 1,
    ly = h - 1 - ((last - min) / rng) * (h - 2)
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.8" fill="${color}"/></svg>`
}
