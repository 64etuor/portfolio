'use client'

/* ════════════════════════════════════════════════════════════════════
   Hermes Control Plane — 시스템 아키텍처 다이어그램
   경계 1: runtime agents → Hermes MCP 만 호출 (단일 진입점)
   경계 2: Graphiti temporal graph 는 Hermes 뒤에 은닉 (직접 접근 불가)
   경계 3: 문서 write 는 PR proposal 게이트로만 (LLM 직접 write 금지)
   모션: 결정적(시간 파라미터) · 무한 루프 · 난수/가짜 로그 없음
   ════════════════════════════════════════════════════════════════════ */

import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { GRAPH_NODES, GRAPH_EDGES } from './data'
import s from './scene.module.css'

/* ───────────────── colour palette ───────────────── */
const COL = {
  read: '#4fe0c4',
  readD: 'rgba(79,224,196,.42)',
  gov: '#e6b24f',
  govD: 'rgba(230,178,79,.40)',
  ctrl: 'rgba(141,141,141,.4)',
  deny: '#e0685a',
} as const

function applyA(col: string, a: number): string {
  if (col.startsWith('rgba')) return col.replace(/[\d.]+\)$/, a.toFixed(2) + ')')
  const m = col.match(/#(\w\w)(\w\w)(\w\w)/)
  if (!m) return col
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a.toFixed(2)})`
}

function strokeFor(kind: string): string {
  if (kind === 'gov') return COL.govD
  if (kind === 'ctrl') return COL.ctrl
  return 'rgba(79,224,196,.30)'
}

/* ───────────────── geometry types ───────────────── */
interface Pt { x: number; y: number }

interface AgentDef {
  label: string
  role: string
  x: number
  y: number
  w: number
  h: number
}

interface ModDef {
  n: string
  title: string
  sub: string
  x: number
  y: number
  w: number
  h: number
  key: string
}

interface Edge {
  pts: Pt[]
  kind: string
  w: number
  dash?: boolean
}

interface Flow {
  path: Pt[]
  col: string
  n: number
  speed: number
  head: boolean
}

interface RejectDef {
  from: Pt
  block: Pt
}

interface Layout {
  top: number
  bot: number
  left: number
  right: number
  midY: number
  gateX: number
  agents: AgentDef[]
  hub: Pt
  gate: { x: number; y: number; h: number }
  hermes: { x: number; y: number; w: number; h: number }
  modules: ModDef[]
  modByKey: Record<string, ModDef>
  graphiti: { x: number; y: number; w: number; h: number }
  canon: { x: number; y: number; w: number; h: number }
  prgate: { x: number; y: number; w: number; h: number }
  edges: Edge[]
  flows: Flow[]
  reject: RejectDef
}

/* ───────────────── geometry helpers ───────────────── */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function polyTotal(pts: Pt[]): number {
  let t = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    t += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return t
}

function ptOn(pts: Pt[], p: number): Pt {
  p = ((p % 1) + 1) % 1
  const total = polyTotal(pts)
  let d = p * total
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (d <= seg) {
      const k = seg ? d / seg : 0
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
    d -= seg
  }
  return { ...pts[pts.length - 1] }
}

/* ───────────────── layout ───────────────── */
function buildLayout(W: number, H: number): Layout {
  const top = H * 0.205, bot = H * 0.835
  const left = W * 0.045, right = W * 0.955
  const cw = right - left, ch = bot - top
  const midY = (top + bot) / 2

  const gateX = left + cw * 0.275

  // runtime agents (left)
  const agX = left + cw * 0.085
  const agW = Math.min(cw * 0.155, 190)
  const agH = Math.min(ch * 0.205, 78)
  const agGap = Math.min(ch * 0.09, 34)
  const agTotal = agH * 3 + agGap * 2
  const agTop = midY - agTotal / 2
  const agents: AgentDef[] = [
    { label: 'runtime agent', role: 'task · planner', x: agX, y: agTop + agH / 2,           w: agW, h: agH },
    { label: 'runtime agent', role: 'task · coder',   x: agX, y: agTop + agH * 1.5 + agGap,  w: agW, h: agH },
    { label: 'runtime agent', role: 'task · qa',      x: agX, y: agTop + agH * 2.5 + agGap * 2, w: agW, h: agH },
  ]

  const hub: Pt = { x: gateX - cw * 0.045, y: midY }
  const gate = { x: gateX, y: midY, h: Math.min(ch * 0.62, 340) }

  // HERMES control plane (center)
  const hx = left + cw * 0.355, hw = cw * 0.305
  const hh = Math.min(ch * 0.58, 320), hy = midY - hh / 2
  const hermes = { x: hx, y: hy, w: hw, h: hh }

  // 4 modules in 2x2 grid inside hermes
  const padX = hw * 0.07, padTop = hh * 0.30, padBot = hh * 0.07, gMid = hw * 0.05
  const mW = (hw - padX * 2 - gMid) / 2
  const gridTop = hy + padTop, gridH = hh - padTop - padBot
  const mH = (gridH - hh * 0.05) / 2, vGap = hh * 0.05
  const cxL = hx + padX, cxR = hx + padX + mW + gMid
  const ry0 = gridTop, ry1 = gridTop + mH + vGap
  const modules: ModDef[] = [
    { n: '①', title: 'OKF 번들 관리',  sub: 'okf.bundle',      x: cxL, y: ry0, w: mW, h: mH, key: 'bundle' },
    { n: '②', title: 'Graphiti 적재',  sub: 'graphiti.ingest', x: cxR, y: ry0, w: mW, h: mH, key: 'ingest' },
    { n: '③', title: '검색 라우팅',    sub: 'search.route',    x: cxL, y: ry1, w: mW, h: mH, key: 'route'  },
    { n: '④', title: 'MCP 권한 제어',  sub: 'mcp.authz',       x: cxR, y: ry1, w: mW, h: mH, key: 'authz'  },
  ]
  const modByKey: Record<string, ModDef> = {}
  modules.forEach((m) => { modByKey[m.key] = m })

  // Graphiti temporal graph (right, hidden)
  const grW = cw * 0.205, grH = Math.min(ch * 0.50, 250)
  const grX = left + cw * 0.755, grY = midY - grH / 2
  const graphiti = { x: grX, y: grY, w: grW, h: grH }

  // OKF canonical store / llmwiki (top)
  const canon = { x: hx + hw * 0.30, y: top + ch * 0.045, w: Math.min(cw * 0.20, 230), h: Math.min(ch * 0.135, 58) }
  // PR proposal review gate (bottom)
  const prgate = { x: hx + hw * 0.52, y: bot - ch * 0.045, w: Math.min(cw * 0.22, 250), h: Math.min(ch * 0.135, 58) }

  // helpers
  function modPort(key: string, side: string): Pt {
    const m = modByKey[key]
    if (side === 'l') return { x: m.x,           y: m.y + m.h / 2 }
    if (side === 'r') return { x: m.x + m.w,     y: m.y + m.h / 2 }
    if (side === 't') return { x: m.x + m.w / 2, y: m.y }
    return { x: m.x + m.w / 2, y: m.y + m.h }
  }
  function agentPort(a: AgentDef): Pt { return { x: a.x + a.w / 2, y: a.y } }

  // static edges
  const gFrontX = graphiti.x
  const gMidY = graphiti.y + graphiti.h / 2
  const canonPt: Pt = { x: canon.x, y: canon.y + canon.h / 2 }
  const pr: Pt    = { x: prgate.x, y: prgate.y - prgate.h / 2 }
  const prIn: Pt  = { x: prgate.x, y: prgate.y }

  const edges: Edge[] = [
    ...agents.map((a) => ({ pts: [agentPort(a), { x: hub.x, y: hub.y }], kind: 'read', w: 1 })),
    { pts: [hub, { x: gate.x, y: gate.y }, modPort('route', 'l')], kind: 'read', w: 1.4 },
    { pts: [modPort('route', 'r'), { x: hx + hw + (gFrontX - (hx + hw)) * 0.45, y: gMidY }, { x: gFrontX, y: gMidY }], kind: 'read', w: 1.4 },
    { pts: [modPort('ingest', 'r'), { x: hx + hw + (gFrontX - (hx + hw)) * 0.5, y: graphiti.y + graphiti.h * 0.30 }, { x: gFrontX, y: graphiti.y + graphiti.h * 0.30 }], kind: 'read', w: 1.2 },
    { pts: [canonPt, { x: modPort('bundle', 't').x, y: (canonPt.y + modPort('bundle', 't').y) / 2 }, modPort('bundle', 't')], kind: 'gov', w: 1.3 },
    { pts: [{ x: hub.x, y: hub.y + 8 }, { x: hub.x, y: bot - 6 }, { x: prIn.x, y: prIn.y }], kind: 'gov', w: 1.2, dash: true },
    { pts: [pr, { x: pr.x, y: canonPt.y }, { x: canonPt.x, y: canonPt.y }], kind: 'gov', w: 1.3 },
    { pts: [modPort('authz', 'l'), { x: gate.x, y: gate.y + gate.h * 0.22 }], kind: 'ctrl', w: 1, dash: true },
  ]

  const bundle = modByKey['bundle']
  const ingest = modByKey['ingest']

  // animated pulse flows
  const flows: Flow[] = [
    { path: [hub, { x: gate.x, y: gate.y }, modPort('route', 'l')], col: 'read',  n: 2, speed: 0.42, head: true  },
    { path: [modPort('route', 'r'), { x: gFrontX, y: gMidY }],       col: 'read',  n: 2, speed: 0.5,  head: true  },
    { path: [{ x: gFrontX, y: gMidY }, modPort('route', 'r')],       col: 'readD', n: 2, speed: 0.5,  head: false },
    { path: [modPort('route', 'l'), { x: gate.x, y: gate.y }, hub],  col: 'readD', n: 2, speed: 0.42, head: false },
    { path: [modPort('ingest', 'r'), { x: gFrontX, y: graphiti.y + graphiti.h * 0.30 }], col: 'read', n: 1, speed: 0.34, head: true },
    { path: [canonPt, { x: modPort('bundle', 't').x, y: (canonPt.y + modPort('bundle', 't').y) / 2 }, modPort('bundle', 't')], col: 'gov', n: 2, speed: 0.3, head: true },
    { path: [{ x: bundle.x + bundle.w, y: bundle.y + bundle.h / 2 }, { x: ingest.x, y: ingest.y + ingest.h / 2 }], col: 'govD', n: 1, speed: 0.4, head: true },
    { path: [{ x: hub.x, y: hub.y + 8 }, { x: hub.x, y: bot - 6 }, { x: prIn.x, y: prIn.y }], col: 'gov', n: 2, speed: 0.26, head: true },
    { path: [pr, { x: pr.x, y: canonPt.y }, { x: canonPt.x, y: canonPt.y }], col: 'gov', n: 2, speed: 0.3, head: true },
  ]

  const reject: RejectDef = {
    from:  { x: agents[1].x + agents[1].w / 2 + 10, y: agents[1].y },
    block: { x: gateX - 6, y: midY - gate.h * 0.30 },
  }

  return { top, bot, left, right, midY, gateX, agents, hub, gate, hermes, modules, modByKey, graphiti, canon, prgate, edges, flows, reject }
}

/* ───────────────── drawing functions ───────────────── */
function drawEdges(ctx: CanvasRenderingContext2D, L: Layout) {
  L.edges.forEach((e) => {
    ctx.beginPath()
    ctx.moveTo(e.pts[0].x, e.pts[0].y)
    for (let i = 1; i < e.pts.length; i++) ctx.lineTo(e.pts[i].x, e.pts[i].y)
    ctx.lineWidth = e.w
    ctx.strokeStyle = strokeFor(e.kind)
    ctx.setLineDash(e.dash ? [3, 5] : [])
    ctx.stroke()
    ctx.setLineDash([])
  })
}

function drawFlows(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  L.flows.forEach((f) => {
    const baseCol = (COL as Record<string, string>)[f.col] || COL.read
    const glow = f.col === 'read' || f.col === 'gov'
    for (let i = 0; i < f.n; i++) {
      const ph = (t * f.speed + i / f.n) % 1
      for (let ss = 0; ss < 4; ss++) {
        const pp = ph - ss * 0.018
        if (pp < 0) continue
        const pt = ptOn(f.path, pp)
        const a = (1 - ss / 4) * (f.head ? 0.95 : 0.6)
        const rad = ss === 0 ? (f.head ? 2.6 : 2.0) : 1.6
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, rad, 0, 7)
        ctx.fillStyle = applyA(baseCol, a)
        if (glow && ss === 0) { ctx.shadowColor = baseCol; ctx.shadowBlur = 10 } else ctx.shadowBlur = 0
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }
  })
}

function drawBoundary(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  const g = L.gate
  const x = g.x, y0 = g.y - g.h / 2, y1 = g.y + g.h / 2
  const grd = ctx.createLinearGradient(0, y0, 0, y1)
  grd.addColorStop(0, 'rgba(58,58,58,0)')
  grd.addColorStop(0.5, 'rgba(120,120,120,.55)')
  grd.addColorStop(1, 'rgba(58,58,58,0)')
  ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1)
  ctx.lineWidth = 1.4; ctx.strokeStyle = grd; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([])

  const oy = g.y, oh = 26
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.2)
  ctx.beginPath(); ctx.moveTo(x, oy - oh / 2); ctx.lineTo(x, oy + oh / 2)
  ctx.lineWidth = 2.4; ctx.strokeStyle = applyA(COL.read, 0.75 + 0.2 * pulse)
  ctx.shadowColor = COL.read; ctx.shadowBlur = 12 + 6 * pulse; ctx.stroke(); ctx.shadowBlur = 0

  ctx.strokeStyle = applyA(COL.read, 0.7); ctx.lineWidth = 1.6
  ;[-1, 1].forEach((d) => {
    ctx.beginPath(); ctx.moveTo(x, oy + d * oh / 2); ctx.lineTo(x - 6, oy + d * oh / 2 + d * 5); ctx.stroke()
  })

  ctx.save()
  ctx.translate(x - 14, y0 + (y1 - y0) * 0.12)
  ctx.rotate(-Math.PI / 2)
  ctx.font = '600 10px "JetBrains Mono",monospace'
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(141,141,141,.85)'
  ctx.fillText('HERMES MCP · 단일 진입점', 0, 0)
  ctx.restore()
}

function drawAgents(ctx: CanvasRenderingContext2D, L: Layout) {
  L.agents.forEach((a) => {
    const x = a.x - a.w / 2, y = a.y - a.h / 2
    rr(ctx, x, y, a.w, a.h, 8)
    ctx.fillStyle = 'rgba(16,16,16,.92)'; ctx.fill()
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(70,70,70,.9)'; ctx.stroke()

    const p = { x: a.x + a.w / 2, y: a.y }
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7)
    ctx.fillStyle = COL.read; ctx.shadowColor = COL.read; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.font = '700 12px "Pretendard",sans-serif'; ctx.fillStyle = '#d7d7d7'
    ctx.fillText(a.label, x + 13, y + a.h * 0.42)
    ctx.font = '500 9.5px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(141,141,141,.95)'
    ctx.fillText(a.role, x + 13, y + a.h * 0.42 + 15)
    ctx.font = '500 8px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(79,224,196,.85)'; ctx.textAlign = 'left'
    ctx.fillText('→ hermes.mcp', x + 13, y + a.h - 9)
  })

  ctx.font = '600 9.5px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(141,141,141,.7)'; ctx.textAlign = 'center'
  ctx.fillText('RUNTIME AGENTS', L.agents[0].x, L.agents[0].y - L.agents[0].h / 2 - 14)
  ctx.fillStyle = 'rgba(58,58,58,.9)'; ctx.font = '500 8px "JetBrains Mono",monospace'
  ctx.fillText('graphiti 직접 호출 없음', L.agents[0].x, L.agents[0].y - L.agents[0].h / 2 - 2)
}

function drawHermes(ctx: CanvasRenderingContext2D, L: Layout) {
  const h = L.hermes
  rr(ctx, h.x - 3, h.y - 3, h.w + 6, h.h + 6, 16)
  ctx.strokeStyle = 'rgba(79,224,196,.12)'; ctx.lineWidth = 1; ctx.stroke()

  rr(ctx, h.x, h.y, h.w, h.h, 14)
  const pg = ctx.createLinearGradient(0, h.y, 0, h.y + h.h)
  pg.addColorStop(0, 'rgba(20,22,21,.96)'); pg.addColorStop(1, 'rgba(11,12,12,.96)')
  ctx.fillStyle = pg; ctx.fill()
  ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(79,224,196,.34)'; ctx.stroke()

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font = '800 16px "Pretendard",sans-serif'; ctx.fillStyle = '#e7faf5'
  ctx.fillText('HERMES', h.x + h.w * 0.07, h.y + h.h * 0.115)
  ctx.font = '600 10px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(79,224,196,.9)'
  ctx.fillText('CONTROL PLANE', h.x + h.w * 0.07 + 86, h.y + h.h * 0.115)
  ctx.font = '500 10px "Pretendard",sans-serif'; ctx.fillStyle = 'rgba(141,141,141,.95)'
  ctx.fillText('제어 평면 · 유일한 진입점 · 라우팅 / 권한 / 정본 / 적재', h.x + h.w * 0.07, h.y + h.h * 0.115 + 17)

  L.modules.forEach((m) => {
    rr(ctx, m.x, m.y, m.w, m.h, 9)
    ctx.fillStyle = 'rgba(8,9,9,.9)'; ctx.fill()
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,72,70,.95)'; ctx.stroke()
    ctx.font = '700 12px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(79,224,196,.9)'; ctx.textAlign = 'left'
    ctx.fillText(m.n, m.x + 11, m.y + m.h * 0.42)
    ctx.font = '700 12.5px "Pretendard",sans-serif'; ctx.fillStyle = '#d7d7d7'
    ctx.fillText(m.title, m.x + 30, m.y + m.h * 0.42)
    ctx.font = '500 9px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(141,141,141,.85)'
    ctx.fillText(m.sub, m.x + 30, m.y + m.h * 0.42 + 15)
    ctx.beginPath(); ctx.arc(m.x + m.w - 9, m.y + m.h - 9, 2.2, 0, 7)
    ctx.fillStyle = 'rgba(79,224,196,.6)'; ctx.fill()
  })
}

function drawGraphiti(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  const g = L.graphiti
  const slices = 4, dx = g.w * 0.055, dy = -g.h * 0.06
  for (let i = slices - 1; i >= 0; i--) {
    const ox = g.x + dx * i, oy = g.y + dy * i
    rr(ctx, ox, oy, g.w, g.h, 12)
    const a = 0.20 + (slices - i) / slices * 0.16
    ctx.fillStyle = `rgba(14,16,16,${a.toFixed(2)})`; ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = `rgba(79,224,196,${(0.05 + (slices - 1 - i) / slices * 0.13).toFixed(2)})`; ctx.stroke()
  }

  // front slice — clipped
  const fx = g.x, fy = g.y
  ctx.save(); rr(ctx, fx, fy, g.w, g.h, 12); ctx.clip()

  const np = GRAPH_NODES.map((n, i) => ({
    x: fx + g.w * (n[0] + Math.sin(t * 0.4 + i) * 0.006),
    y: fy + g.h * (n[1] + Math.cos(t * 0.4 + i * 1.3) * 0.008),
  }))

  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(79,224,196,.18)'
  GRAPH_EDGES.forEach(([a, b]) => {
    ctx.beginPath(); ctx.moveTo(np[a].x, np[a].y); ctx.lineTo(np[b].x, np[b].y); ctx.stroke()
  })
  np.forEach((p, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.9)
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, 7)
    ctx.fillStyle = applyA(COL.read, 0.4 + 0.4 * pulse); ctx.fill()
  })
  ctx.restore()

  // t-axis arrow
  ctx.strokeStyle = 'rgba(141,141,141,.5)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3])
  ctx.beginPath()
  ctx.moveTo(g.x + g.w * 0.5, g.y + g.h + 10)
  ctx.lineTo(g.x + g.w * 0.5 + dx * slices, g.y + g.h + 10 + dy * slices)
  ctx.stroke(); ctx.setLineDash([])
  ctx.font = '500 8.5px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(141,141,141,.7)'; ctx.textAlign = 'left'
  ctx.fillText('t →  temporal', g.x + g.w * 0.5 + 6, g.y + g.h + 5 + dy * slices)

  ctx.font = '600 10px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(141,141,141,.9)'; ctx.textAlign = 'center'
  ctx.fillText('GRAPHITI · temporal graph index', g.x + g.w / 2, g.y - 14)
  ctx.font = '500 9px "Pretendard",sans-serif'; ctx.fillStyle = 'rgba(224,104,90,.7)'
  ctx.fillText('HIDDEN · 런타임 직접 접근 ✕', g.x + g.w / 2, g.y - 2)
}

function drawCanon(ctx: CanvasRenderingContext2D, L: Layout) {
  const c = L.canon
  const x = c.x - c.w / 2, y = c.y - c.h / 2
  rr(ctx, x, y, c.w, c.h, 9)
  ctx.fillStyle = 'rgba(20,17,10,.95)'; ctx.fill()
  ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(230,178,79,.5)'; ctx.stroke()
  ctx.fillStyle = COL.gov; ctx.fillRect(x, y + 6, 3, c.h - 12)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font = '700 12.5px "Pretendard",sans-serif'; ctx.fillStyle = '#f0dcab'
  ctx.fillText('OKF · 정본 문서 포맷', x + 14, y + c.h * 0.44)
  ctx.font = '500 9px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(230,178,79,.8)'
  ctx.fillText('llmwiki canonical bundle', x + 14, y + c.h * 0.44 + 15)
}

function drawPRGate(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  const p = L.prgate
  const x = p.x - p.w / 2, y = p.y - p.h / 2
  rr(ctx, x, y, p.w, p.h, 9)
  ctx.fillStyle = 'rgba(20,17,10,.95)'; ctx.fill()
  ctx.lineWidth = 1.3; ctx.strokeStyle = 'rgba(230,178,79,.55)'; ctx.stroke()
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.0)
  ctx.strokeStyle = applyA(COL.gov, 0.6 + 0.3 * pulse); ctx.lineWidth = 2
  for (let i = 0; i < 2; i++) {
    const gx = x + 16 + i * 7
    ctx.beginPath()
    ctx.moveTo(gx, y + p.h * 0.32); ctx.lineTo(gx + 6, y + p.h / 2); ctx.lineTo(gx, y + p.h * 0.68)
    ctx.stroke()
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font = '700 12.5px "Pretendard",sans-serif'; ctx.fillStyle = '#f0dcab'
  ctx.fillText('PR PROPOSAL · 리뷰 게이트', x + 34, y + p.h * 0.44)
  ctx.font = '500 9px "JetBrains Mono",monospace'; ctx.fillStyle = 'rgba(230,178,79,.8)'
  ctx.fillText('write → review → merge', x + 34, y + p.h * 0.44 + 15)
}

function drawReject(ctx: CanvasRenderingContext2D, L: Layout, t: number) {
  const period = 6.0, ph = (t % period) / period
  if (ph > 0.55) return
  const k = ph / 0.55
  const from = L.reject.from, to = L.reject.block
  const px = from.x + (to.x - from.x) * Math.min(k, 1)
  const py = from.y + (to.y - from.y) * Math.min(k, 1)
  ctx.strokeStyle = applyA(COL.deny, 0.35); ctx.lineWidth = 1.2; ctx.setLineDash([3, 4])
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([])
  if (k >= 0.96) {
    const f = 0.5 + 0.5 * Math.sin(t * 9)
    ctx.strokeStyle = applyA(COL.deny, 0.7 + 0.3 * f); ctx.lineWidth = 2
    const ss = 6
    ctx.beginPath()
    ctx.moveTo(to.x - ss, to.y - ss); ctx.lineTo(to.x + ss, to.y + ss)
    ctx.moveTo(to.x + ss, to.y - ss); ctx.lineTo(to.x - ss, to.y + ss)
    ctx.stroke()
    ctx.font = '600 8.5px "JetBrains Mono",monospace'; ctx.fillStyle = applyA(COL.deny, 0.85); ctx.textAlign = 'left'
    ctx.fillText('직접 write 거부', to.x + 12, to.y + 3)
  } else {
    ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fillStyle = COL.deny; ctx.fill()
  }
}

/* ───────────────── component ───────────────── */
export default function Scene({ running = true, onReady }: SceneProps) {
  useSceneReady(onReady)

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w, H = fr.h
    const t = fr.t

    const L = buildLayout(W, H)

    g.clearRect(0, 0, W, H)
    drawBoundary(g, L, t)
    drawGraphiti(g, L, t)
    drawEdges(g, L)
    drawCanon(g, L)
    drawPRGate(g, L, t)
    drawAgents(g, L)
    drawHermes(g, L)
    drawFlows(g, L, t)
    drawReject(g, L, t)
  }, { running, postFX: true, preset: 'phosphor' })

  return (
    <SceneHost
      className={s.root}
      bg="#050505"
      overlay={{
        grain: { opacity: 0.04, z: 59, dur: '1.1s' },
        scan: {
          bg: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 2px, rgba(0, 0, 0, 0.22) 3px, rgba(0, 0, 0, 0) 4px)',
          z: 60,
          opacity: 0.5,
        },
        vignette: {
          bg: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.64) 100%)',
          z: 61,
        },
      }}
    >
      <canvas ref={ref} className={s.c} />

      <div className={s.kicker}>
        <span>llmwiki ARCHITECTURE</span>
        <span className={s.sep}>/</span>
        <span className={s.dot} />
        <span className={`${s.hl}`}>HERMES · 단일 진입점 제어 평면</span>
        <span className={s.sep}>/</span>
        <span>OKF · GRAPHITI</span>
      </div>

      <div className={`${s.legend}`}>
        <div className={s.legendIt}>
          <span className={`${s.sw} ${s.swRead}`} /><b className={s.legendBold}>검색 · ingest 흐름</b>&nbsp;(read plane)
        </div>
        <div className={s.legendIt}>
          <span className={`${s.sw} ${s.swGov}`} /><b className={s.legendBold}>OKF 정본 · PR write</b>&nbsp;(governance)
        </div>
        <div className={s.legendIt}>
          <span className={s.deny}>✕</span><b className={s.legendBold}>LLM 직접 write 차단</b>&nbsp;— PR proposal 경유
        </div>
      </div>

    </SceneHost>
  )
}
