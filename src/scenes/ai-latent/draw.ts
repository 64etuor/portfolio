import { DOMS } from './data'
import type { Link, Node } from './types'

function hexA(c: string, a: number) {
  let h = c.replace('#', '')
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function norm2px(nx: number, ny: number, W: number, H: number): [number, number] {
  const pad = 58
  const x = pad + (nx * 0.5 + 0.5) * (W - pad * 2)
  const y = pad + (-ny * 0.5 + 0.5) * (H - pad * 2)
  return [x, y]
}

export interface DrawLatentSceneParams {
  g: CanvasRenderingContext2D
  W: number
  H: number
  dt: number
  tRef: { current: number }
  nodes: Node[]
  links: Link[]
  hoverNode: Node | null
  dimFilter: string | null
  symMixRef: { current: number }
  symTargetRef: { current: number }
}

export function drawLatentScene({ g, W, H, dt, tRef, nodes, links, hoverNode, dimFilter, symMixRef, symTargetRef }: DrawLatentSceneParams) {
  tRef.current += 0.006 * dt
  const t = tRef.current

    g.clearRect(0, 0, W, H)

  /* grid backdrop */
  g.strokeStyle = 'rgba(255,255,255,0.025)'; g.lineWidth = 1
  const step = Math.max(46, W / 22)
  for (let gx = 0; gx < W; gx += step) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, H); g.stroke() }
  for (let gy = 0; gy < H; gy += step) { g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke() }

  /* symMix ease */
  symMixRef.current += (symTargetRef.current - symMixRef.current) * (1 - Math.pow(0.92, dt))
  const symMix = symMixRef.current

  /* node appear */
  nodes.forEach((n) => {
    const want = t >= n.appearAt ? 1 : 0
    n.appear += (want - n.appear) * (1 - Math.pow(0.86, dt))
  })

  /* positions */
  const driftAmt = 0.022 * (1 - symMix * 0.85)
  nodes.forEach((n) => {
    n.bx = n.vbx + (n.sbx - n.vbx) * symMix
    n.by = n.vby + (n.sby - n.vby) * symMix
    const dx = Math.cos(t * n.spd + n.phase) * driftAmt
    const dy = Math.sin(t * n.spd * 0.8 + n.phase) * driftAmt;
    [n.x, n.y] = norm2px(n.bx + dx, n.by + dy, W, H)
  })

  /* cluster hulls */
  Object.keys(DOMS).forEach((dom) => {
    const grp = nodes.filter((n) => n.dom === dom && n.appear > 0.3)
    if (!grp.length) return
    let cx = 0, cy = 0
    grp.forEach((n) => { cx += n.x; cy += n.y })
    cx /= grp.length; cy /= grp.length
    const faded = dimFilter && dimFilter !== dom
    const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 130)
    const col = DOMS[dom].c
    grad.addColorStop(0, hexA(col, faded ? 0.04 : 0.12))
    grad.addColorStop(1, hexA(col, 0))
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 130, 0, 7); g.fill()
    g.font = '10px ui-monospace, monospace'
    g.fillStyle = hexA(col, faded ? 0.22 : 0.78)
    g.fillText(dom, cx - 16, cy - 104)
  })

  /* knowledge edges */
  links.forEach((l) => {
    const A = nodes[l.a], B = nodes[l.b]
    const present = Math.min(A.appear, B.appear)
    const want = present > 0.55 ? 1 : 0
    l.lp += (want - l.lp) * (1 - Math.pow(0.90, dt))
    l.emph += (l.emphTarget - l.emph) * (1 - Math.pow(0.88, dt))
    if (l.lp < 0.012) return
    const faded = dimFilter && dimFilter !== A.dom && dimFilter !== B.dom
    const breathe = 0.84 + Math.sin(t * 1.25 + l.a * 0.7) * 0.16
    const em = l.emph
    const ex = A.x + (B.x - A.x) * l.lp, ey = A.y + (B.y - A.y) * l.lp
    if (l.cross) {
      const a2 = (faded ? 0.05 : (0.13 + 0.27 * em)) * l.lp * breathe
      const grad = g.createLinearGradient(A.x, A.y, B.x, B.y)
      grad.addColorStop(0, hexA(A.color, a2)); grad.addColorStop(1, hexA(B.color, a2))
      g.strokeStyle = grad; g.lineWidth = faded ? 1 : (1.1 + 1.0 * em)
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(ex, ey); g.stroke()
      if (l.lp > 0.97 && em > 0.4 && !faded) {
        const tp = (t * 0.45 + l.a * 0.17) % 1
        const px = A.x + (B.x - A.x) * tp, py = A.y + (B.y - A.y) * tp
        const gg = g.createRadialGradient(px, py, 0, px, py, 5)
        gg.addColorStop(0, hexA('#ffffff', 0.55 * em * breathe))
        gg.addColorStop(1, hexA('#ffffff', 0))
        g.fillStyle = gg; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill()
      }
    } else {
      const a2 = (faded ? 0.02 : (0.06 + 0.11 * em)) * l.lp * breathe
      g.strokeStyle = hexA(A.color, a2); g.lineWidth = 1
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(ex, ey); g.stroke()
    }
  })

  /* retrieval links */
  nodes.forEach((n) => {
    if (n.lit > 0.01 && n.appear > 0.5) {
      g.strokeStyle = hexA(n.color, 0.5 * n.lit)
      g.lineWidth = 1.3
      g.setLineDash([4, 6]); g.lineDashOffset = -t * 40
      g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(W - 6, n.y * 0.6 + H * 0.2); g.stroke()
      g.setLineDash([])
    }
  })

  /* hover cluster lines */
  if (hoverNode) {
    nodes.filter((n) => n.dom === hoverNode.dom && n.appear > 0.5).forEach((m) => {
      g.strokeStyle = hexA(hoverNode.color, 0.4); g.lineWidth = 1
      g.beginPath(); g.moveTo(hoverNode.x, hoverNode.y); g.lineTo(m.x, m.y); g.stroke()
    })
  }

  /* points */
  nodes.forEach((n) => {
    if (n.appear < 0.012) return
    const faded = dimFilter && dimFilter !== n.dom
    n.lit *= Math.pow(0.96, dt)
    const isHover = n === hoverNode
    const glow = Math.max(n.lit, isHover ? 1 : 0)
    const pop = n.appear < 1 ? n.appear * (2 - n.appear) : 1
    const r = n.rad * (1 + glow * 0.9) * pop
    if (n.sat && n.appear > 0.04 && n.appear < 0.985) {
      g.strokeStyle = hexA(n.color, (1 - n.appear) * 0.6)
      g.lineWidth = 1; g.beginPath()
      g.arc(n.x, n.y, r + (1 - n.appear) * 14, 0, 7); g.stroke()
    }
    if (glow > 0.05) {
      const gg = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5)
      gg.addColorStop(0, hexA(n.color, 0.5 * glow))
      gg.addColorStop(1, hexA(n.color, 0))
      g.fillStyle = gg; g.beginPath(); g.arc(n.x, n.y, r * 5, 0, 7); g.fill()
    }
    g.fillStyle = faded ? hexA(n.color, 0.18) : hexA(n.color, 0.85 * Math.min(1, n.appear + 0.15))
    g.beginPath(); g.arc(n.x, n.y, r, 0, 7); g.fill()
    g.fillStyle = hexA('#ffffff', faded ? 0.1 : 0.5)
    g.beginPath(); g.arc(n.x - r * 0.3, n.y - r * 0.3, r * 0.35, 0, 7); g.fill()
    if ((isHover || n.lit > 0.4) && !faded) {
      g.font = '11px ui-monospace, monospace'
      g.fillStyle = hexA(n.color, 1)
      g.fillText(n.label, n.x + r + 6, n.y + 3)
    }
  })

}
