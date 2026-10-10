// pipeline-dag — render helpers (pure functions, no React)

import type { NodeDef } from './data'
import { canvasFont } from '../_host/fonts'

export const NS = 'http://www.w3.org/2000/svg'

export const TYPE_LABEL: Record<string, string> = {
  extract: 'EXTRACT', transform: 'TRANSFORM', load: 'LOAD', ml: 'AI.AUTO', deploy: 'DEPLOY',
}

export function statusPill(status: string): string {
  const map: Record<string, [string, string]> = {
    success: ['success', 'SUCCESS'], running: ['running', 'RUNNING'],
    queued: ['queued', 'QUEUED'], idle: ['idle', 'IDLE'],
  }
  const [c, t] = map[status] ?? map.idle
  return `<span class="pill ${c}"><span class="d"></span>${t}</span>`
}

export function edgePath(a: NodeDef, b: NodeDef): string {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2
  const x2 = b.x,       y2 = b.y + b.h / 2
  const dx = Math.max(40, (x2 - x1) * 0.5)
  return `M ${x1},${y1} C ${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`
}

export function topoOrder(nodes: NodeDef[], edges: [string, string][]): string[] {
  const indeg: Record<string, number> = {}
  const adj: Record<string, string[]> = {}
  nodes.forEach(n => { indeg[n.id] = 0; adj[n.id] = [] })
  edges.forEach(([a, b]) => { if (adj[a] && indeg[b] != null) { adj[a].push(b); indeg[b]++ } })
  const q: string[] = []
  for (const n of nodes) if (indeg[n.id] === 0) q.push(n.id)
  const order: string[] = []
  while (q.length) {
    const id = q.shift()!; order.push(id)
    ;(adj[id] ?? []).forEach(t => { if (--indeg[t] === 0) q.push(t) })
  }
  return order
}

export function padTs(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':')
}

// AI chart sample — time-based oscillation (same formula as original)
export function aiSample(tMs: number): number {
  const s = tMs * 0.001
  const v = 0.38 + 0.48 * (
    Math.sin(s * 2.1) * 0.38 +
    Math.cos(s * 3.7 + 1.2) * 0.28 +
    Math.sin(s * 5.9 + 2.5) * 0.18 +
    (Math.random() - 0.5) * 0.08
  )
  return Math.max(0.04, Math.min(0.96, v))
}

export const AI_MAX = 80

// AI canvas initialisation — called once per canvas element
export function initAICanvas(canvas: HTMLCanvasElement, aiData: number[]): CanvasRenderingContext2D | null {
  // Cap at 2 like the shared scene host (useSceneCanvas DPR_CAP). Uncapped, a 4K
  // Windows laptop at dpr 3 allocates 2.25x the pixels of a Retina Mac for a 206x54
  // sparkline that gains nothing above 2 — and Windows fractional scaling (1.25/1.5)
  // makes this the one canvas whose backing size differed from every other scene's.
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = 206 * dpr; canvas.height = 54 * dpr
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(dpr, dpr)
  const now = performance.now()
  aiData.length = 0
  for (let i = 0; i < AI_MAX; i++) aiData.push(aiSample(now - (AI_MAX - i) * 83))
  return ctx
}

// AI mini-chart draw — called every rAF frame
export function drawAIChart(
  tMs: number,
  ctx: CanvasRenderingContext2D,
  aiData: number[],
  nextSampleAt: { value: number },
): void {
  if (tMs >= nextSampleAt.value) {
    aiData.push(aiSample(tMs))
    if (aiData.length > AI_MAX) aiData.shift()
    nextSampleAt.value = tMs + 83
  }
  const W = 206, H = 54, pad = 4
  ctx.clearRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
  for (let gg = 1; gg < 4; gg++) {
    const gy = pad + (H - 2 * pad) * gg / 4
    ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
  }
  const n = aiData.length
  if (n < 2) return
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const x = pad + (W - 2 * pad) * i / (AI_MAX - 1)
    const y = pad + (H - 2 * pad) * (1 - aiData[i])
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  const lxA = pad + (W - 2 * pad) * (n - 1) / (AI_MAX - 1)
  ctx.lineTo(lxA, H - pad); ctx.lineTo(pad, H - pad); ctx.closePath()
  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, 'rgba(240,180,41,.28)'); grad.addColorStop(1, 'rgba(240,180,41,0)')
  ctx.fillStyle = grad; ctx.fill()
  ctx.beginPath()
  for (let j = 0; j < n; j++) {
    const xj = pad + (W - 2 * pad) * j / (AI_MAX - 1)
    const yj = pad + (H - 2 * pad) * (1 - aiData[j])
    if (j === 0) ctx.moveTo(xj, yj); else ctx.lineTo(xj, yj)
  }
  ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke()
  const hx = pad + (W - 2 * pad) * (n - 1) / (AI_MAX - 1)
  const hy = pad + (H - 2 * pad) * (1 - aiData[n - 1])
  ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, 7); ctx.fillStyle = '#5ee3a1'; ctx.fill()
  ctx.fillStyle = 'rgba(201,212,227,.5)'; ctx.font = canvasFont(400, 8, 'mono')
  ctx.fillText('ai.pipelines · throughput', 6, 11)
  ctx.fillStyle = '#5ee3a1'
  ctx.fillText('AUTO', W - 34, 11)
}

export function drawGridBackground(
  g: CanvasRenderingContext2D,
  W: number, H: number,
  sc: number, tx: number, ty: number,
  fw: number, fh: number,
): void {
  g.clearRect(0, 0, fw, fh)
  const step = 40 * sc
  if (step >= 6) {
    const ox = ((tx % step) + step) % step
    const oy = ((ty % step) + step) % step
    g.strokeStyle = 'rgba(255,255,255,.025)'
    g.lineWidth = 1
    g.beginPath()
    for (let x = ox; x < W; x += step) { g.moveTo(x, 0); g.lineTo(x, H) }
    for (let y = oy; y < H; y += step) { g.moveTo(0, y); g.lineTo(W, y) }
    g.stroke()
    const mstep = step * 5
    const mox = ((tx % mstep) + mstep) % mstep
    const moy = ((ty % mstep) + mstep) % mstep
    g.fillStyle = 'rgba(94,227,161,.10)'
    for (let xi = mox; xi < W; xi += mstep) {
      for (let yi = moy; yi < H; yi += mstep) {
        g.beginPath(); g.arc(xi, yi, 1.3, 0, 7); g.fill()
      }
    }
  }
}
