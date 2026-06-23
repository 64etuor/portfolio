import type { CSSProperties } from 'react'
import { LAYER_H, PLATE, T_TARGET, jigWorld, type Point } from './data'
import type { Cam, FixtureAnnotation, SimState } from './types'

export function fmt(n: number, d = 1) {
  return n.toFixed(d)
}

export function cssVarStyle(name: string, value: string): CSSProperties {
  return { [name]: value } as CSSProperties
}

export function setupCam(W: number, H: number): Cam {
  const tiltY = 0.52
  const margin = 0.16
  const projW = PLATE.w
  const projDepth = PLATE.d * Math.sin(tiltY)
  const sx = (W * (1 - margin * 2)) / projW
  const sy = (H * 0.78) / (projW * 0.5 + projDepth)
  return {
    cx: W / 2,
    cy: H * 0.6,
    scale: Math.min(sx, sy),
    tiltY,
  }
}

export function project(cam: Cam, x: number, y: number, z: number): Point {
  const px = x - PLATE.w / 2
  const py = y - PLATE.d / 2
  const sinT = Math.sin(cam.tiltY)
  return [cam.cx + px * cam.scale, cam.cy + (py * sinT - z * 0.9) * cam.scale * 0.92]
}

export function drawPlate(g: CanvasRenderingContext2D, cam: Cam) {
  const z = 0
  const c00 = project(cam, 0, 0, z)
  const c10 = project(cam, PLATE.w, 0, z)
  const c11 = project(cam, PLATE.w, PLATE.d, z)
  const c01 = project(cam, 0, PLATE.d, z)

  const grad = g.createLinearGradient(0, c00[1], 0, c11[1])
  grad.addColorStop(0, 'rgba(47,129,247,.10)')
  grad.addColorStop(1, 'rgba(20,30,46,.30)')
  g.beginPath()
  g.moveTo(c00[0], c00[1])
  g.lineTo(c10[0], c10[1])
  g.lineTo(c11[0], c11[1])
  g.lineTo(c01[0], c01[1])
  g.closePath()
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = 'rgba(47,129,247,.5)'
  g.lineWidth = 1.4
  g.stroke()

  g.strokeStyle = 'rgba(47,129,247,.13)'
  g.lineWidth = 1
  const N = 11
  for (let i = 1; i < N; i++) {
    const t = i / N
    let p0 = project(cam, PLATE.w * t, 0, z)
    let p1 = project(cam, PLATE.w * t, PLATE.d, z)
    g.beginPath()
    g.moveTo(p0[0], p0[1])
    g.lineTo(p1[0], p1[1])
    g.stroke()
    p0 = project(cam, 0, PLATE.d * t, z)
    p1 = project(cam, PLATE.w, PLATE.d * t, z)
    g.beginPath()
    g.moveTo(p0[0], p0[1])
    g.lineTo(p1[0], p1[1])
    g.stroke()
  }

  const fb0 = project(cam, 0, PLATE.d, 0)
  const fb1 = project(cam, PLATE.w, PLATE.d, 0)
  g.fillStyle = 'rgba(12,16,22,.9)'
  g.beginPath()
  g.moveTo(fb0[0], fb0[1])
  g.lineTo(fb1[0], fb1[1])
  g.lineTo(fb1[0], fb1[1] + 10)
  g.lineTo(fb0[0], fb0[1] + 10)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(47,129,247,.3)'
  g.stroke()
}

export function drawFixtureAnnotations(g: CanvasRenderingContext2D, cam: Cam, layer: number) {
  const z = Math.max(2.2, layer * LAYER_H + 1.6)
  const labels: FixtureAnnotation[] = [
    { p: [58, 56], text: '카트리지 컷팅/누름 JIG', dx: -96, dy: -18 },
    { p: [126, 38], text: 'Insert 자동화 포켓', dx: 18, dy: -24 },
    { p: [126, 84], text: 'Insert 자동화 포켓', dx: 18, dy: 12 },
    { p: [18, 18], text: '체결 보스', dx: -44, dy: -18 },
    { p: [102, 78], text: '기준 리브', dx: -18, dy: 24 },
  ]
  g.save()
  g.font = '10px "SFMono-Regular", ui-monospace, Menlo, Consolas, monospace'
  g.textBaseline = 'middle'
  for (const l of labels) {
    const [wx, wy] = jigWorld(l.p[0], l.p[1])
    const [x, y] = project(cam, wx, wy, z)
    const tx = x + l.dx
    const ty = y + l.dy
    g.strokeStyle = 'rgba(154,162,177,.32)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(tx, ty)
    g.stroke()
    g.fillStyle = 'rgba(8,9,11,.72)'
    const tw = g.measureText(l.text).width + 12
    g.fillRect(tx - 6, ty - 9, tw, 18)
    g.strokeStyle = 'rgba(255,122,24,.22)'
    g.strokeRect(tx - 6, ty - 9, tw, 18)
    g.fillStyle = 'rgba(238,241,245,.82)'
    g.fillText(l.text, tx, ty)
  }
  g.restore()
}

export function drawNozzle(g: CanvasRenderingContext2D, cam: Cam, W: number, state: SimState) {
  const n = state.nozzle
  const [nx, ny] = project(cam, n.x, n.y, n.z)
  const liftTop = project(cam, n.x, n.y, n.z + 24)[1]

  g.strokeStyle = 'rgba(150,162,177,.18)'
  g.lineWidth = 1.2
  g.beginPath()
  g.moveTo(nx, liftTop - 30)
  g.lineTo(nx, ny - 14)
  g.stroke()

  const gy = liftTop - 30
  g.strokeStyle = 'rgba(110,122,140,.22)'
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(20, gy)
  g.lineTo(W - 20, gy)
  g.stroke()
  g.strokeStyle = 'rgba(150,162,177,.12)'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(20, gy - 3)
  g.lineTo(W - 20, gy - 3)
  g.stroke()

  g.fillStyle = '#2b3038'
  g.fillRect(nx - 15, gy - 9, 30, 16)
  g.strokeStyle = 'rgba(255,122,24,.5)'
  g.lineWidth = 1
  g.strokeRect(nx - 15, gy - 9, 30, 16)

  const hot = state.temp >= T_TARGET
  g.beginPath()
  g.moveTo(nx - 9, ny - 22)
  g.lineTo(nx + 9, ny - 22)
  g.lineTo(nx + 4, ny - 3)
  g.lineTo(nx - 4, ny - 3)
  g.closePath()
  const hg = g.createLinearGradient(nx, ny - 22, nx, ny - 3)
  hg.addColorStop(0, '#3a3f49')
  hg.addColorStop(1, hot ? '#ff5a1a' : '#5a3520')
  g.fillStyle = hg
  g.fill()
  g.strokeStyle = hot ? 'rgba(255,122,24,.8)' : 'rgba(120,80,40,.6)'
  g.lineWidth = 1
  g.stroke()

  g.fillStyle = hot ? '#ff7a18' : '#6b4326'
  g.fillRect(nx - 7, ny - 9, 14, 6)
  g.beginPath()
  g.moveTo(nx - 3, ny - 3)
  g.lineTo(nx + 3, ny - 3)
  g.lineTo(nx, ny + 2)
  g.closePath()
  g.fillStyle = hot ? '#ffd9a8' : '#8a8f99'
  g.fill()

  if (hot) {
    const gl = g.createRadialGradient(nx, ny, 1, nx, ny, 16)
    gl.addColorStop(0, 'rgba(255,140,40,.5)')
    gl.addColorStop(1, 'rgba(255,140,40,0)')
    g.fillStyle = gl
    g.beginPath()
    g.arc(nx, ny, 16, 0, Math.PI * 2)
    g.fill()
  }

  g.strokeStyle = 'rgba(255,122,24,.55)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(nx, gy + 7)
  g.lineTo(nx, ny - 22)
  g.stroke()

  const [bx, by] = project(cam, n.x, n.y, 0)
  g.strokeStyle = 'rgba(47,129,247,.5)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(bx, by, 5, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.moveTo(bx - 9, by)
  g.lineTo(bx + 9, by)
  g.moveTo(bx, by - 9)
  g.lineTo(bx, by + 9)
  g.stroke()
}
