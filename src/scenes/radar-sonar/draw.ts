// Work Radar — radar-sonar 씬 캔버스 렌더 함수 (클로저 상태는 SceneState params 로 주입)
// 출력/타이밍은 원본 Scene.tsx 와 1:1 동일하게 유지

import { RINGS, pad3, typeColRgb } from './helpers'
import type { SceneState } from './types'

export function drawGrid(g: CanvasRenderingContext2D, CX: number, CY: number, R: number) {
  g.save()
  g.strokeStyle = 'rgba(46,255,163,0.5)'
  g.lineWidth = 2
  g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = 'rgba(46,255,163,0.18)'
  g.lineWidth = 1
  g.beginPath(); g.arc(CX, CY, R + 6, 0, Math.PI * 2); g.stroke()

  g.font = "10px 'Share Tech Mono'"
  for (let i = 1; i <= RINGS; i++) {
    const rr = R * i / RINGS
    g.strokeStyle = 'rgba(46,255,163,0.13)'
    g.setLineDash([2, 4])
    g.beginPath(); g.arc(CX, CY, rr, 0, Math.PI * 2); g.stroke()
    g.setLineDash([])
    g.fillStyle = 'rgba(79,154,122,0.7)'
    g.fillText((40 * i / RINGS) + 'NM', CX + 4, CY - rr + 12)
  }

  for (let deg = 0; deg < 360; deg += 5) {
    const a = (deg - 90) * Math.PI / 180
    const major = deg % 30 === 0
    const r1 = major ? R - 14 : R - 6
    const x1 = CX + Math.cos(a) * r1, y1 = CY + Math.sin(a) * r1
    const x2 = CX + Math.cos(a) * R, y2 = CY + Math.sin(a) * R
    g.strokeStyle = major ? 'rgba(46,255,163,0.35)' : 'rgba(46,255,163,0.14)'
    g.lineWidth = major ? 1.4 : 1
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke()
    if (major) {
      const lr = R - 26
      const lx = CX + Math.cos(a) * lr, ly = CY + Math.sin(a) * lr
      g.fillStyle = 'rgba(159,245,207,0.65)'
      g.font = "9px 'Share Tech Mono'"
      g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(pad3(deg), lx, ly)
    }
  }
  g.strokeStyle = 'rgba(46,255,163,0.10)'
  g.lineWidth = 1
  ;[0, 90, 180, 270].forEach((deg) => {
    const a = (deg - 90) * Math.PI / 180
    g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); g.stroke()
  })
  g.textAlign = 'start'; g.textBaseline = 'alphabetic'
  g.restore()
}

export function drawSweep(g: CanvasRenderingContext2D, CX: number, CY: number, R: number, st: SceneState) {
  g.save()
  g.translate(CX, CY)
  const trailSpan = Math.PI * 0.42
  const steps = 28
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const a0 = st.sweepAngle.current - trailSpan * t
    const a1 = st.sweepAngle.current - trailSpan * (t + 1 / steps)
    const alpha = (1 - t) * (1 - t) * 0.20
    g.beginPath()
    g.moveTo(0, 0)
    g.arc(0, 0, R, a0, a1, true)
    g.closePath()
    g.fillStyle = 'rgba(46,255,163,' + alpha + ')'
    g.fill()
  }
  const lx = Math.cos(st.sweepAngle.current) * R
  const ly = Math.sin(st.sweepAngle.current) * R
  const grad = g.createLinearGradient(0, 0, lx, ly)
  grad.addColorStop(0, 'rgba(180,255,220,0.95)')
  grad.addColorStop(0.5, 'rgba(46,255,163,0.85)')
  grad.addColorStop(1, 'rgba(46,255,163,0.25)')
  g.strokeStyle = grad
  g.lineWidth = 2.4
  g.shadowColor = 'rgba(46,255,163,0.9)'; g.shadowBlur = 14
  g.beginPath(); g.moveTo(0, 0); g.lineTo(lx, ly); g.stroke()
  g.shadowBlur = 0
  g.fillStyle = 'rgba(220,255,235,0.9)'
  g.beginPath(); g.arc(lx, ly, 3, 0, Math.PI * 2); g.fill()
  g.restore()
}

export function drawPings(g: CanvasRenderingContext2D, CX: number, CY: number, R: number, dt: number, st: SceneState) {
  g.save()
  const ps = st.pings.current
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]
    p.r += R * 1.1 * dt
    p.life -= dt
    const prog = p.r / R
    const alpha = Math.max(0, 1 - prog) * 0.6
    if (p.r > R || p.life <= 0) { ps.splice(i, 1); continue }
    g.strokeStyle = 'rgba(63,224,255,' + alpha + ')'
    g.lineWidth = 2
    g.shadowColor = 'rgba(63,224,255,0.6)'; g.shadowBlur = 10
    g.beginPath(); g.arc(CX, CY, p.r, 0, Math.PI * 2); g.stroke()
    g.shadowBlur = 0
  }
  g.restore()
}

export function drawLockBox(g: CanvasRenderingContext2D, x: number, y: number, CX: number, CY: number, st: SceneState) {
  const bs = 22 + Math.sin(st.lockPhaseTime.current * 3.2) * 2
  g.save()
  g.strokeStyle = 'rgba(255,176,49,0.95)'
  g.lineWidth = 1.8
  g.shadowColor = 'rgba(255,176,49,0.7)'; g.shadowBlur = 8
  const cl = 8
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  corners.forEach(([sx, sy]) => {
    g.beginPath()
    g.moveTo(x + sx * bs, y + sy * bs - sy * cl)
    g.lineTo(x + sx * bs, y + sy * bs)
    g.lineTo(x + sx * bs - sx * cl, y + sy * bs)
    g.stroke()
  })
  g.shadowBlur = 0
  g.strokeStyle = 'rgba(255,176,49,0.4)'
  g.setLineDash([4, 4])
  g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke()
  g.setLineDash([])
  g.font = "9px 'Share Tech Mono'"
  g.fillStyle = 'rgba(255,176,49,0.95)'
  g.textAlign = 'center'
  g.fillText('LOCKED', x, y - bs - 6)
  g.textAlign = 'start'
  g.restore()
}

export function drawContacts(g: CanvasRenderingContext2D, CX: number, CY: number, R: number, st: SceneState) {
  g.save()
  st.contacts.current.forEach((c) => {
    if (!c._detected) return
    if (!st.activeFilters.current[c.type as keyof typeof st.activeFilters.current]) return
    const rr = R * c.ring
    const x = CX + Math.cos(c._a) * rr
    const y = CY + Math.sin(c._a) * rr
    const isSel = st.selected.current === c
    const isHover = st.hoverContact.current === c
    const glow = Math.max(c._glow, isSel ? 0.5 : 0, isHover ? 0.4 : 0)
    const col = typeColRgb(c.type)

    const halo = g.createRadialGradient(x, y, 0, x, y, 8 + glow * 18)
    halo.addColorStop(0, 'rgba(' + col + ',' + glow * 0.55 + ')')
    halo.addColorStop(1, 'rgba(' + col + ',0)')
    g.fillStyle = halo
    g.beginPath(); g.arc(x, y, 8 + glow * 18, 0, Math.PI * 2); g.fill()

    g.strokeStyle = 'rgba(' + col + ',' + glow * 0.9 + ')'
    g.fillStyle = 'rgba(' + col + ',' + glow * 0.85 + ')'
    g.lineWidth = 1.6
    const sz = 5
    if (c.type === 'agent' || c.priority) {
      g.beginPath()
      g.moveTo(x, y - sz - 1); g.lineTo(x + sz + 1, y); g.lineTo(x, y + sz + 1); g.lineTo(x - sz - 1, y)
      g.closePath(); g.stroke()
      g.fillStyle = 'rgba(' + col + ',' + glow * 0.6 + ')'; g.fill()
    } else if (c.type === 'gate') {
      g.beginPath(); g.arc(x, y, sz + 1, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 1, y + 2.5); g.lineTo(x + 3.5, y - 3); g.stroke()
    } else if (c.type === 'signal') {
      g.beginPath(); g.arc(x, y, sz - 1, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.arc(x, y, sz + 2, 0, Math.PI * 2); g.stroke()
    } else {
      g.beginPath(); g.rect(x - sz, y - sz, sz * 2, sz * 2); g.stroke()
      g.fillStyle = 'rgba(' + col + ',' + glow * 0.5 + ')'; g.fillRect(x - sz, y - sz, sz * 2, sz * 2)
    }

    const labAlpha = glow * 0.8
    g.font = (c.priority || c.type === 'gate') ? "600 11px 'IBM Plex Sans KR'" : "10px 'IBM Plex Sans KR'"
    g.fillStyle = 'rgba(' + col + ',' + labAlpha + ')'
    g.textAlign = x > CX ? 'left' : 'right'
    const ox = x > CX ? sz + 8 : -(sz + 8)
    g.fillText(c.id, x + ox, y + 3)
    g.font = "8px 'Share Tech Mono'"
    g.fillStyle = 'rgba(' + col + ',' + labAlpha * 0.8 + ')'
    g.fillText('TRK' + String(c._trk).padStart(2, '0'), x + ox, y - 8)

    if (isSel) drawLockBox(g, x, y, CX, CY, st)
    g.textAlign = 'start'
  })
  g.restore()
}

export function drawCursor(
  g: CanvasRenderingContext2D,
  CX: number,
  CY: number,
  R: number,
  st: SceneState,
  curBrgRef: { current: HTMLSpanElement | null },
  curRngRef: { current: HTMLSpanElement | null },
) {
  const m = st.mouse.current
  if (!m.inScope) return
  const dx = m.x - CX, dy = m.y - CY
  const dist = Math.hypot(dx, dy)
  if (dist > R) {
    if (curBrgRef.current) curBrgRef.current.textContent = 'BRG ---deg'
    if (curRngRef.current) curRngRef.current.textContent = 'RNG -- NM'
    return
  }
  const a = Math.atan2(dy, dx)
  const brg = ((a * 180 / Math.PI) + 90 + 360) % 360
  const rng = dist / R * 40
  if (curBrgRef.current) curBrgRef.current.textContent = 'BRG ' + pad3(brg) + 'deg'
  if (curRngRef.current) curRngRef.current.textContent = 'RNG ' + rng.toFixed(1) + ' NM'
  g.save()
  g.strokeStyle = 'rgba(46,255,163,0.4)'
  g.lineWidth = 1; g.setLineDash([3, 3])
  g.beginPath(); g.moveTo(CX, CY); g.lineTo(m.x, m.y); g.stroke()
  g.setLineDash([])
  g.strokeStyle = 'rgba(46,255,163,0.7)'
  g.beginPath()
  g.moveTo(m.x - 7, m.y); g.lineTo(m.x + 7, m.y)
  g.moveTo(m.x, m.y - 7); g.lineTo(m.x, m.y + 7)
  g.stroke()
  g.beginPath(); g.arc(m.x, m.y, 4, 0, Math.PI * 2); g.stroke()
  g.restore()
}

export function drawCenter(g: CanvasRenderingContext2D, CX: number, CY: number) {
  g.save()
  g.fillStyle = 'rgba(220,255,235,0.9)'
  g.beginPath(); g.arc(CX, CY, 3, 0, Math.PI * 2); g.fill()
  g.strokeStyle = 'rgba(46,255,163,0.5)'
  g.beginPath(); g.arc(CX, CY, 7, 0, Math.PI * 2); g.stroke()
  g.restore()
}
