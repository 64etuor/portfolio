import type { Frame } from '../_host/types'
import { COMPANY, WAYPOINTS } from './data'
import { setText } from './dom'
import { tickAutoPlay, tickBgEvents, tickReteach } from './runtime'
import type { Point, Runtime } from './types'

export function fk(joints: number[], w: number, h: number) {
  const bx = w * 0.5
  const by = h * 0.84
  const lengths = [0, h * 0.3, h * 0.26, h * 0.16, h * 0.1]
  const a = joints.map((d) => (d * Math.PI) / 180)
  let x = bx
  let y = by
  let ang = -Math.PI / 2 + a[0] * 0.18
  const pts: Point[] = [{ x, y }]
  ang = -Math.PI / 2 + a[1] * 0.9
  x += Math.cos(ang) * lengths[1]
  y += Math.sin(ang) * lengths[1]
  pts.push({ x, y })
  ang += a[2] * 0.95
  x += Math.cos(ang) * lengths[2]
  y += Math.sin(ang) * lengths[2]
  pts.push({ x, y })
  ang += a[4] * 0.55 + 0.2
  x += Math.cos(ang) * lengths[3]
  y += Math.sin(ang) * lengths[3]
  pts.push({ x, y })
  ang += a[5] * 0.4
  x += Math.cos(ang) * lengths[4]
  y += Math.sin(ang) * lengths[4]
  pts.push({ x, y })
  return { pts, base: { x: bx, y: by }, tcpAng: ang }
}

export function drawGrid(g: CanvasRenderingContext2D, rt: Runtime, w: number, h: number) {
  g.save()
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#04100a')
  grad.addColorStop(0.6, '#06140d')
  grad.addColorStop(1, '#020805')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)

  g.strokeStyle = 'rgba(60,230,122,.10)'
  g.lineWidth = 1
  const hz = h * 0.62
  for (let i = -6; i <= 6; i += 1) {
    const fx = w * 0.5 + i * (w * 0.09)
    g.beginPath()
    g.moveTo(w * 0.5 + i * (w * 0.18), h)
    g.lineTo(fx, hz)
    g.stroke()
  }
  for (let j = 0; j < 7; j += 1) {
    const t = j / 6
    const yy = hz + (h - hz) * t * t
    g.globalAlpha = 0.1 - t * 0.05
    g.beginPath()
    g.moveTo(0, yy)
    g.lineTo(w, yy)
    g.stroke()
  }
  g.globalAlpha = 1

  WAYPOINTS.forEach((wp, i) => {
    const cx = w * (0.08 + i * (0.84 / Math.max(1, WAYPOINTS.length - 1)))
    g.fillStyle = `${COMPANY[wp.co].color}18`
    g.fillRect(cx - 26, h - 30, 52, 8)
    g.fillStyle = COMPANY[wp.co].color
    g.globalAlpha = i === rt.state.running || i === rt.state.selected ? 1 : 0.4
    g.font = '700 9px ui-monospace,monospace'
    g.textAlign = 'center'
    g.fillText(`P${wp.id}`, cx, h - 12)
    g.globalAlpha = 1
  })
  g.restore()
}

export function roundLink(
  g: CanvasRenderingContext2D,
  p0: Point,
  p1: Point,
  w0: number,
  w1: number,
  col: string,
  hi: string
) {
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  g.beginPath()
  g.moveTo(p0.x + nx * w0, p0.y + ny * w0)
  g.lineTo(p1.x + nx * w1, p1.y + ny * w1)
  g.lineTo(p1.x - nx * w1, p1.y - ny * w1)
  g.lineTo(p0.x - nx * w0, p0.y - ny * w0)
  g.closePath()
  const grad = g.createLinearGradient(p0.x + nx * w0, p0.y + ny * w0, p0.x - nx * w0, p0.y - ny * w0)
  grad.addColorStop(0, hi)
  grad.addColorStop(0.5, col)
  grad.addColorStop(1, '#0e1512')
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,.55)'
  g.lineWidth = 1.4
  g.stroke()
}

export function joint(g: CanvasRenderingContext2D, p: Point, r: number, col: string) {
  g.beginPath()
  g.arc(p.x, p.y, r, 0, 7)
  const grad = g.createRadialGradient(p.x - r * 0.4, p.y - r * 0.4, 1, p.x, p.y, r)
  grad.addColorStop(0, '#3a3d42')
  grad.addColorStop(0.7, '#1c1e21')
  grad.addColorStop(1, '#0d0e10')
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = col
  g.lineWidth = 1.6
  g.stroke()
  g.beginPath()
  g.arc(p.x, p.y, r * 0.4, 0, 7)
  g.fillStyle = `${col}cc`
  g.fill()
}

export function roundedRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.lineTo(x + w - r, y)
  g.quadraticCurveTo(x + w, y, x + w, y + r)
  g.lineTo(x + w, y + h - r)
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  g.lineTo(x + r, y + h)
  g.quadraticCurveTo(x, y + h, x, y + h - r)
  g.lineTo(x, y + r)
  g.quadraticCurveTo(x, y, x + r, y)
}

export function drawArm(g: CanvasRenderingContext2D, rt: Runtime, dt: number, w: number, h: number) {
  const st = rt.state
  const wp = WAYPOINTS[Math.min(st.selected, WAYPOINTS.length - 1)]
  const accent = st.estop ? '#ff4d52' : st.mode === 'FAULT' ? '#ff4d52' : COMPANY[wp.co].color
  const { pts, base, tcpAng } = fk(st.jntCur, w, h)

  g.save()
  g.globalAlpha = 0.4
  g.fillStyle = '#000'
  g.beginPath()
  g.ellipse(base.x + st.jogOff.x * 0.4, h * 0.85, 60, 9, 0, 0, 7)
  g.fill()
  g.restore()

  g.save()
  g.fillStyle = '#1a1c1f'
  g.beginPath()
  g.moveTo(base.x - 34, h * 0.86)
  g.lineTo(base.x + 34, h * 0.86)
  g.lineTo(base.x + 24, h * 0.72)
  g.lineTo(base.x - 24, h * 0.72)
  g.closePath()
  g.fill()
  g.strokeStyle = '#2a2c2f'
  g.stroke()
  g.beginPath()
  g.ellipse(base.x, h * 0.72, 24, 7, 0, 0, 7)
  g.fillStyle = '#26282b'
  g.fill()
  g.strokeStyle = accent
  g.lineWidth = 2
  g.stroke()
  g.restore()

  roundLink(g, pts[0], pts[1], 14, 12, '#2a2d31', '#3e4248')
  roundLink(g, pts[1], pts[2], 12, 9, '#2a2d31', '#3e4248')
  roundLink(g, pts[2], pts[3], 9, 7, '#23262a', '#34373c')
  roundLink(g, pts[3], pts[4], 7, 5, '#23262a', '#34373c')

  joint(g, pts[0], 15, accent)
  joint(g, pts[1], 12, accent)
  joint(g, pts[2], 9, accent)
  joint(g, pts[3], 7, accent)

  const tcp = pts[4]
  g.save()
  g.translate(tcp.x, tcp.y)
  g.rotate(tcpAng)
  g.fillStyle = '#15171a'
  g.strokeStyle = accent
  g.lineWidth = 1.6
  roundedRect(g, -5, -5, 18, 10, 2)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(13, -3)
  g.lineTo(22, 0)
  g.lineTo(13, 3)
  g.closePath()
  g.fillStyle = accent
  g.fill()
  g.restore()

  g.save()
  g.strokeStyle = accent
  g.globalAlpha = 0.9
  g.lineWidth = 1
  g.beginPath()
  g.arc(tcp.x, tcp.y, 11, 0, 7)
  g.stroke()
  g.beginPath()
  g.moveTo(tcp.x - 16, tcp.y)
  g.lineTo(tcp.x + 16, tcp.y)
  g.moveTo(tcp.x, tcp.y - 16)
  g.lineTo(tcp.x, tcp.y + 16)
  g.stroke()
  g.restore()

  if (st.weldFx && dt > 0) {
    if (Math.random() < 0.9) {
      for (let k = 0; k < 3; k += 1) {
        rt.sparkParts.push({ x: tcp.x, y: tcp.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1, life: 1 })
      }
    }
    g.save()
    const wg = g.createRadialGradient(tcp.x, tcp.y, 0, tcp.x, tcp.y, 26)
    wg.addColorStop(0, 'rgba(255,240,180,.9)')
    wg.addColorStop(0.4, 'rgba(255,180,60,.5)')
    wg.addColorStop(1, 'transparent')
    g.fillStyle = wg
    g.beginPath()
    g.arc(tcp.x, tcp.y, 26, 0, 7)
    g.fill()
    g.restore()
  }

  g.save()
  const dtScale = dt / 16
  rt.sparkParts = rt.sparkParts.filter((p) => p.life > 0)
  rt.sparkParts.forEach((p) => {
    p.x += p.vx * dtScale
    p.y += p.vy * dtScale
    p.vy += 0.25 * dtScale
    p.life -= 0.04 * dtScale
    g.globalAlpha = Math.max(0, p.life)
    g.fillStyle = p.life > 0.6 ? '#fff8e0' : '#ffb43c'
    g.fillRect(p.x, p.y, 2, 2)
  })
  g.restore()
}

export function updateDRO(rt: Runtime) {
  const st = rt.state
  const j = st.jntCur
  setText(rt, 'd-x', (j[0] * 8.4 + st.jogOff.x).toFixed(1))
  setText(rt, 'd-y', (520 + j[1] * 6.2 + st.jogOff.y).toFixed(1))
  setText(rt, 'd-z', (880 + j[2] * 5.1 + st.jogOff.z).toFixed(1))
  setText(rt, 'd-w', j[3].toFixed(1))
  setText(rt, 'd-p', j[4].toFixed(1))
  setText(rt, 'd-r', j[5].toFixed(1))

  const wp = WAYPOINTS[st.selected]
  if (!wp) return
  const f1 = (v: number) => `${v >= 0 ? ' ' : ''}${v.toFixed(1)}`
  for (let i = 0; i < 6; i += 1) {
    const el = rt.detail.querySelector<HTMLElement>(`[data-live="dj-${i}"]`)
    if (el) el.textContent = f1(j[i])
  }
  let e = 0
  for (let i = 0; i < 6; i += 1) e += Math.abs(st.jntCur[i] - st.jntTgt[i])
  const errFrac = Math.min(1, e / 40)
  const drift = [errFrac * 9.4, -errFrac * 6.1, errFrac * 7.7, errFrac * 0.6, -errFrac * 0.5, errFrac * 0.7]
  const jogD = [st.jogOff.x, st.jogOff.y, st.jogOff.z, 0, 0, 0]
  ;['dw-x', 'dw-y', 'dw-z', 'dw-w', 'dw-p', 'dw-r'].forEach((id, i) => {
    const el = rt.detail.querySelector<HTMLElement>(`[data-live="${id}"]`)
    if (el) el.textContent = f1(wp.world[i] + (i < 3 ? jogD[i] : 0) + drift[i])
  })
}

export function drawRuntime(g: CanvasRenderingContext2D, fr: Frame, rt: Runtime) {
  const w = fr.w
  const h = fr.h
  const dt = Math.min(50, Math.max(0, fr.dt * 1000))
  if (dt > 0) {
    const st = rt.state
    const spd = st.estop ? 0 : 0.1 * (st.ovr / 100) + 0.02
    for (let i = 0; i < 6; i += 1) {
      st.jntCur[i] += (st.jntTgt[i] - st.jntCur[i]) * Math.min(1, spd * (dt / 16))
    }
    tickAutoPlay(rt, dt)
    tickBgEvents(rt, dt)
    tickReteach(rt, dt)
  }
  g.clearRect(0, 0, w, h)
  drawGrid(g, rt, w, h)
  drawArm(g, rt, dt, w, h)
  updateDRO(rt)
}
