import { lerp } from '../_host/math'
import type { AlarmEvent } from './data'
import { NBUF, SAMPLE_INTERVAL, TREND_CONFIG } from './constants'
import type { TrendRuntime, TrendSeriesState } from './types'

export const pad = (n: number) => String(n).padStart(2, '0')
export const round2 = (n: number) => n.toFixed(2)

export function makeTrendRuntime(): TrendRuntime {
  return Object.fromEntries(
    Object.entries(TREND_CONFIG).map(([id, series]) => [
      id,
      series.map((entry) => ({
        ...entry,
        buf: new Array(NBUF).fill(entry.start),
        cur: entry.start,
        acc: 0,
      })),
    ])
  ) as TrendRuntime
}

export function setAttr(node: Element | null | undefined, name: string, value: string) {
  if (node) node.setAttribute(name, value)
}

/** Escape text for interpolation into the alarm-row HTML template. */
function escHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function fmtAlarmRow(a: AlarmEvent) {
  const op = Math.max(0.35, 1 - Math.min(a.age, 12) * 0.05)
  const st = escHtml(a.st)
  return `<div class="alm-item" style="opacity:${op.toFixed(2)}"><span class="sev" style="background:${escHtml(a.sev)}"></span><span class="ts">${escHtml(a.ts)}</span><span class="desc">${escHtml(a.desc)}</span><span class="st ${st}">${st}</span></div>`
}

export function renderAlarms(events: AlarmEvent[], mini: HTMLDivElement | null, full: HTMLDivElement | null) {
  if (mini) mini.innerHTML = events.slice(0, 4).map(fmtAlarmRow).join('')
  if (full) full.innerHTML = events.slice(0, 18).map(fmtAlarmRow).join('')
}

export function drawTrendCanvas(
  canvas: HTMLCanvasElement | null,
  series: TrendSeriesState[],
  dtMs: number,
  target: (i: number) => number,
  markerY: ((height: number) => number) | null
) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height

  ctx.clearRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(57,182,255,0.07)'
  ctx.lineWidth = 1
  for (let x = 0; x <= W; x += W / 12) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y <= H; y += H / 6) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  series.forEach((entry, seriesIndex) => {
    entry.acc += dtMs
    while (entry.acc >= SAMPLE_INTERVAL) {
      entry.acc -= SAMPLE_INTERVAL
      entry.cur = lerp(entry.cur, target(seriesIndex), 0.12)
      entry.cur = Math.max(0, Math.min(100, entry.cur))
      entry.buf.shift()
      entry.buf.push(entry.cur)
    }

    ctx.strokeStyle = entry.color
    ctx.lineWidth = 2
    ctx.shadowColor = entry.color
    ctx.shadowBlur = 6
    ctx.beginPath()
    for (let i = 0; i < entry.buf.length; i++) {
      const x = i * (W / (entry.buf.length - 1))
      const y = H - (entry.buf[i] / 100) * H
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.shadowBlur = 0
  })

  if (markerY) {
    const y = markerY(H)
    ctx.strokeStyle = '#ffd23f'
    ctx.setLineDash([6, 5])
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
    ctx.setLineDash([])
  }
}
