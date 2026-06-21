'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  NODES,
  EDGES,
  SCHEMAS,
  LOG_TEMPLATES,
  METRIC_DEFS,
  doLayout,
  worldBounds,
  type NodeDef,
} from './data'

/* ═══════════════════════════════════════════════════════════════════
   pipeline-dag — Notion OS : 조직 운영 시스템 DAG
   public/lab/pipeline-dag.html → React 이식
   하네스: useSceneCanvas (grid bg canvas + token animation draw loop)
   DOM: nodes/edges/panel/minimap 은 useEffect imperative (복잡 DOM)
   ═══════════════════════════════════════════════════════════════════ */

// ── helpers ──────────────────────────────────────────────────────────

const NS = 'http://www.w3.org/2000/svg'
const TYPE_LABEL: Record<string, string> = {
  extract: 'EXTRACT', transform: 'TRANSFORM', load: 'LOAD', ml: 'AI.AUTO', deploy: 'DEPLOY',
}

function statusPill(status: string): string {
  const map: Record<string, [string, string]> = {
    success: ['success','SUCCESS'], running: ['running','RUNNING'],
    queued: ['queued','QUEUED'], idle: ['idle','IDLE'],
  }
  const [c, t] = map[status] ?? map.idle
  return `<span class="pill ${c}"><span class="d"></span>${t}</span>`
}

function edgePath(a: NodeDef, b: NodeDef): string {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2
  const x2 = b.x,       y2 = b.y + b.h / 2
  const dx = Math.max(40, (x2 - x1) * 0.5)
  return `M ${x1},${y1} C ${x1+dx},${y1} ${x2-dx},${y2} ${x2},${y2}`
}

function topoOrder(nodes: NodeDef[], edges: [string,string][]): string[] {
  const indeg: Record<string, number> = {}
  const adj: Record<string, string[]> = {}
  nodes.forEach(n => { indeg[n.id] = 0; adj[n.id] = [] })
  edges.forEach(([a, b]) => { if (adj[a] && indeg[b] != null) { adj[a].push(b); indeg[b]++ } })
  const q = nodes.filter(n => indeg[n.id] === 0).map(n => n.id)
  const order: string[] = []
  while (q.length) {
    const id = q.shift()!; order.push(id)
    ;(adj[id] ?? []).forEach(t => { if (--indeg[t] === 0) q.push(t) })
  }
  return order
}

function padTs(): string {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(v => String(v).padStart(2, '0')).join(':')
}

// AI chart sample — time-based oscillation (same formula as original)
function aiSample(tMs: number): number {
  const s = tMs * 0.001
  const v = 0.38 + 0.48 * (
    Math.sin(s * 2.1) * 0.38 +
    Math.cos(s * 3.7 + 1.2) * 0.28 +
    Math.sin(s * 5.9 + 2.5) * 0.18 +
    (Math.random() - 0.5) * 0.08
  )
  return Math.max(0.04, Math.min(0.96, v))
}

const AI_MAX = 80

// ── Scene ──────────────────────────────────────────────────────────

export default function Scene({ running = true, onReady }: SceneProps) {
  // DOM refs (imperative containers)
  const stageRef    = useRef<HTMLDivElement | null>(null)
  const worldRef    = useRef<HTMLDivElement | null>(null)
  const edgesSvgRef = useRef<SVGSVGElement | null>(null)
  const nodesLayRef = useRef<HTMLDivElement | null>(null)
  const panelRef    = useRef<HTMLDivElement | null>(null)
  const pbodyRef    = useRef<HTMLDivElement | null>(null)
  const piconRef    = useRef<HTMLDivElement | null>(null)
  const pnameRef    = useRef<HTMLDivElement | null>(null)
  const pmetaRef    = useRef<HTMLDivElement | null>(null)
  const minimapSvgRef = useRef<SVGSVGElement | null>(null)
  const schemaRef   = useRef<HTMLDivElement | null>(null)
  const runbarRef   = useRef<HTMLDivElement | null>(null)
  const runBtnRef   = useRef<HTMLButtonElement | null>(null)
  const zlabelRef   = useRef<HTMLDivElement | null>(null)
  const hintRef     = useRef<HTMLDivElement | null>(null)
  const legendRef   = useRef<HTMLDivElement | null>(null)

  // Animation state refs (survive re-renders)
  const scaleRef  = useRef(1)
  const txRef     = useRef(0)
  const tyRef     = useRef(0)
  const mmSRef    = useRef(0)
  const mmOxRef   = useRef(0)
  const mmOyRef   = useRef(0)
  const selIdRef  = useRef<string | null>(null)
  const runningRef = useRef(false)
  const movedRef  = useRef(false)

  // Edge token animation state
  interface EdgeEl {
    a: string; b: string
    path: SVGPathElement; len: number; tok: SVGCircleElement
    phase: number; speed: number; targetSpeed: number; active: boolean
  }
  const edgeElsRef = useRef<EdgeEl[]>([])

  // AI chart state
  const aiCanvasRef    = useRef<HTMLCanvasElement | null>(null)
  const aiCtxRef       = useRef<CanvasRenderingContext2D | null>(null)
  const aiDataRef      = useRef<number[]>([])
  const aiNextSampleAt = useRef(0)

  // Sweep state
  interface SweepState {
    order: string[]; total: number; idx: number; accum: number
    phase: string; nodeRunDur: number; finishing: boolean; finishAccum: number
  }
  const sweepRef = useRef<SweepState | null>(null)

  // Metric tick
  const metricNextTickRef = useRef(0)

  // Log state
  const logElRef      = useRef<HTMLDivElement | null>(null)
  const logNextTimeRef = useRef(0)
  const LOG_INTERVAL_BASE = 2800

  // Node/layout state (built once)
  const nodes = useRef<NodeDef[]>([])
  const nodeById = useRef<Record<string, NodeDef>>({})
  const WB = useRef({ w: 0, h: 0 })

  // onReady
  useSceneReady(onReady)

  // ── grid background + token/AI animation draw callback ────────────
  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const tMs = fr.t * 1000
    const dt = fr.dt

    // 1) Grid background
    const stage = stageRef.current
    const W = stage?.clientWidth ?? fr.w
    const H = stage?.clientHeight ?? fr.h
    const sc = scaleRef.current
    const tx = txRef.current
    const ty = tyRef.current

    g.clearRect(0, 0, fr.w, fr.h)
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

    // 2) Edge token animation
    const edges = edgeElsRef.current
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]
      if (!e.active) { e.tok.style.opacity = '0'; continue }
      e.speed += (e.targetSpeed - e.speed) * Math.min(1, dt * 4)
      e.phase += e.speed * dt
      if (e.phase > 1) e.phase -= 1
      const pt = e.path.getPointAtLength(e.phase * e.len)
      e.tok.setAttribute('cx', String(pt.x))
      e.tok.setAttribute('cy', String(pt.y))
      const edge = Math.min(e.phase, 1 - e.phase)
      e.tok.style.opacity = String(Math.min(1, edge * 8) * 0.95)
    }

    // 3) AI mini chart
    drawAI(tMs)

    // 4) Run sweep tick
    tickRunSweep(dt)

    // 5) Metric tick
    tickMetrics(tMs)

    // 6) Event log tick
    tickEventLog(tMs)
  }, { running })

  // ── AI chart helpers ──────────────────────────────────────────────

  function initAI(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio || 1
    canvas.width = 206 * dpr; canvas.height = 54 * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    aiCtxRef.current = ctx
    aiCanvasRef.current = canvas
    const now = performance.now()
    aiDataRef.current = []
    for (let i = 0; i < AI_MAX; i++) aiDataRef.current.push(aiSample(now - (AI_MAX - i) * 83))
    aiNextSampleAt.current = now
  }

  function drawAI(tMs: number) {
    const ctx = aiCtxRef.current
    if (!ctx) return
    if (tMs >= aiNextSampleAt.current) {
      aiDataRef.current.push(aiSample(tMs))
      if (aiDataRef.current.length > AI_MAX) aiDataRef.current.shift()
      aiNextSampleAt.current = tMs + 83
    }
    const W = 206, H = 54, pad = 4
    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1
    for (let gg = 1; gg < 4; gg++) {
      const gy = pad + (H - 2 * pad) * gg / 4
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
    }
    const n = aiDataRef.current.length
    if (n < 2) return
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const x = pad + (W - 2 * pad) * i / (AI_MAX - 1)
      const y = pad + (H - 2 * pad) * (1 - aiDataRef.current[i])
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
      const yj = pad + (H - 2 * pad) * (1 - aiDataRef.current[j])
      if (j === 0) ctx.moveTo(xj, yj); else ctx.lineTo(xj, yj)
    }
    ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.stroke()
    const hx = pad + (W - 2 * pad) * (n - 1) / (AI_MAX - 1)
    const hy = pad + (H - 2 * pad) * (1 - aiDataRef.current[n - 1])
    ctx.beginPath(); ctx.arc(hx, hy, 2.4, 0, 7); ctx.fillStyle = '#5ee3a1'; ctx.fill()
    ctx.fillStyle = 'rgba(201,212,227,.5)'; ctx.font = '8px monospace'
    ctx.fillText('ai.pipelines · throughput', 6, 11)
    ctx.fillStyle = '#5ee3a1'
    ctx.fillText('AUTO', W - 34, 11)
  }

  // ── Run sweep ─────────────────────────────────────────────────────

  function updatePill(n: NodeDef) {
    if (n.metric) return
    const pill = n.el?.querySelector('.pill')
    if (!pill) return
    const map: Record<string, [string, string]> = {
      success: ['success','SUCCESS'], running: ['running','RUNNING'],
      queued: ['queued','QUEUED'], idle: ['idle','IDLE'],
    }
    const [c, t] = map[n.status ?? 'idle'] ?? map.idle
    pill.className = `pill ${c}`
    pill.innerHTML = `<span class="d"></span>${t}`
  }

  function tickRunSweep(dt: number) {
    const sw = sweepRef.current
    if (!sw) return
    const nb = nodeById.current
    const runbar = runbarRef.current
    const runBtn = runBtnRef.current
    if (sw.idx >= sw.order.length) {
      if (runbar) runbar.style.width = '100%'
      if (!sw.finishing) { sw.finishing = true; sw.finishAccum = 0 }
      sw.finishAccum += dt
      if (sw.finishAccum > 0.45) {
        if (runbar) runbar.style.width = '0%'
        edgeElsRef.current.forEach(e => { e.active = true; e.targetSpeed = 0.10 + Math.random() * 0.13 })
        runningRef.current = false
        sweepRef.current = null
        if (runBtn) {
          runBtn.classList.remove(s.btnRunActive)
          runBtn.innerHTML = '<span class="' + s.btnTri + '">&#9654;</span> RUN PIPELINE'
        }
        setTimeout(runPipeline, 650)
      }
      return
    }
    sw.accum += dt
    const n = nb[sw.order[sw.idx]]
    if (sw.phase === 'run') {
      if (sw.accum >= sw.nodeRunDur) {
        n.status = 'success'; if (n.el) n.el.dataset.status = 'success'; updatePill(n)
        edgeElsRef.current.forEach(e => {
          if (e.b === n.id) e.targetSpeed = 0.12 + Math.random() * 0.10
        })
        sw.idx++; sw.accum = 0; sw.phase = 'run'
        if (runbar) runbar.style.width = ((sw.idx / sw.total) * 100) + '%'
        if (sw.idx < sw.order.length) {
          const next = nb[sw.order[sw.idx]]
          next.status = 'running'; if (next.el) next.el.dataset.status = 'running'; updatePill(next)
          sw.nodeRunDur = next.metric ? 0.17 : 0.28 + Math.random() * 0.12
          edgeElsRef.current.forEach(e => {
            if (e.b === next.id) { e.active = true; e.phase = 0; e.targetSpeed = 0.55 + Math.random() * 0.3 }
          })
        }
      }
    }
  }

  function runPipeline() {
    if (runningRef.current) return
    runningRef.current = true
    const runBtn = runBtnRef.current
    if (runBtn) {
      runBtn.classList.add(s.btnRunActive)
      runBtn.innerHTML = '<span class="' + s.btnTri + '">&#9632;</span> RUNNING&#8230; <span style="opacity:.6">&#8635;</span>'
    }
    const nb = nodeById.current
    nodes.current.forEach(n => { n.status = 'queued'; if (n.el) n.el.dataset.status = 'queued'; updatePill(n) })
    edgeElsRef.current.forEach(e => { e.active = false; e.targetSpeed = e.speed })
    const order = topoOrder(nodes.current, EDGES)
    const total = order.length
    const runbar = runbarRef.current
    if (runbar) runbar.style.width = '0%'
    const first = nb[order[0]]
    first.status = 'running'; if (first.el) first.el.dataset.status = 'running'; updatePill(first)
    edgeElsRef.current.forEach(e => {
      if (e.b === first.id) { e.active = true; e.phase = 0; e.targetSpeed = 0.55 + Math.random() * 0.3 }
    })
    sweepRef.current = {
      order, total, idx: 0, accum: 0, phase: 'run',
      nodeRunDur: first.metric ? 0.17 : 0.28 + Math.random() * 0.12,
      finishing: false, finishAccum: 0,
    }
  }

  // ── Metric tick ───────────────────────────────────────────────────

  function tickMetrics(tMs: number) {
    if (tMs < metricNextTickRef.current) return
    metricNextTickRef.current = tMs + 4200 + Math.random() * 2000;
    (['m1', 'm2'] as const).forEach(id => {
      const n = nodeById.current[id]; if (!n?.el) return
      const def = METRIC_DEFS[id]; if (!def) return
      const v = def.variants[Math.floor(Math.random() * def.variants.length)]
      const big = n.el.querySelector('.big')
      if (big) big.textContent = v
    })
  }

  // ── Event log tick ────────────────────────────────────────────────

  function tickEventLog(tMs: number) {
    const logEl = logElRef.current
    if (!logEl) return
    if (tMs >= logNextTimeRef.current) pushLogEntry(tMs)
  }

  function pushLogEntry(tMs: number) {
    const logEl = logElRef.current
    if (!logEl) return
    const tpl = LOG_TEMPLATES[Math.floor(Math.random() * LOG_TEMPLATES.length)]
    const msg = tpl.msgs[Math.floor(Math.random() * tpl.msgs.length)]
    const line = document.createElement('div')
    line.style.cssText = 'opacity:0;transition:opacity .4s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'
    const tsSpan = `<span style="color:#3a4a5c">${padTs()}</span> `
    const pipeCol = tpl.cls === 'ok' ? '#5ee3a1' : '#f0b429'
    const pipeSpan = `<span style="color:${pipeCol}">${tpl.pipe}</span> `
    const msgSpan = `<span style="color:#6b7787">${msg}</span>`
    line.innerHTML = tsSpan + pipeSpan + msgSpan
    logEl.appendChild(line)
    requestAnimationFrame(() => { line.style.opacity = '1' })
    const children = logEl.children
    if (children.length > 5) {
      const old = children[0] as HTMLElement
      old.style.transition = 'opacity .6s'; old.style.opacity = '0'
      setTimeout(() => { if (old.parentNode) old.parentNode.removeChild(old) }, 650)
    }
    logNextTimeRef.current = tMs + LOG_INTERVAL_BASE + Math.random() * 1800
  }

  // ── Pan / Zoom ────────────────────────────────────────────────────

  function applyTransform() {
    const world = worldRef.current
    const zlabel = zlabelRef.current
    if (world) world.style.transform = `translate(${txRef.current}px,${tyRef.current}px) scale(${scaleRef.current})`
    if (zlabel) zlabel.textContent = Math.round(scaleRef.current * 100) + '%'
    updateMinimap()
  }

  function fit() {
    const stage = stageRef.current
    if (!stage) return
    const vw = stage.clientWidth, vh = stage.clientHeight
    const wb = WB.current
    const sc = Math.min(vw / (wb.w + 60), vh / (wb.h + 60), 1.2)
    scaleRef.current = sc
    txRef.current = (vw - wb.w * sc) / 2
    tyRef.current = (vh - wb.h * sc) / 2
    applyTransform()
  }

  function zoomBtn(f: number) {
    const stage = stageRef.current; if (!stage) return
    const cx = stage.clientWidth / 2, cy = stage.clientHeight / 2
    const wx = (cx - txRef.current) / scaleRef.current
    const wy = (cy - tyRef.current) / scaleRef.current
    scaleRef.current = Math.min(2.4, Math.max(0.25, scaleRef.current * f))
    txRef.current = cx - wx * scaleRef.current
    tyRef.current = cy - wy * scaleRef.current
    applyTransform()
  }

  // ── Minimap ───────────────────────────────────────────────────────

  function buildMinimap() {
    const mmsvg = minimapSvgRef.current; if (!mmsvg) return
    mmsvg.innerHTML = ''
    const bbox = mmsvg.getBoundingClientRect()
    const mw = bbox.width || 200, mh = bbox.height || 108
    const wb = WB.current
    const sc = Math.min(mw / wb.w, mh / wb.h) * 0.92
    const offx = (mw - wb.w * sc) / 2, offy = (mh - wb.h * sc) / 2
    mmSRef.current = sc; mmOxRef.current = offx; mmOyRef.current = offy
    const nb = nodeById.current
    EDGES.forEach(([ea, eb]) => {
      const a = nb[ea], b = nb[eb]; if (!a || !b) return
      const l = document.createElementNS(NS, 'line')
      l.setAttribute('x1', String(offx + (a.x + a.w) * sc))
      l.setAttribute('y1', String(offy + (a.y + a.h / 2) * sc))
      l.setAttribute('x2', String(offx + b.x * sc))
      l.setAttribute('y2', String(offy + (b.y + b.h / 2) * sc))
      l.setAttribute('stroke', '#2a3543'); l.setAttribute('stroke-width', '0.6')
      mmsvg.appendChild(l)
    })
    const COLOR: Record<string, string> = {
      source:'#4aa8ff', decision:'#b08cff', okr:'#36d9d9',
      metric:'#5ee3a1', sink:'#ff7eb6', ai:'#f0b429',
    }
    nodes.current.forEach(n => {
      const r = document.createElementNS(NS, 'rect')
      r.setAttribute('x', String(offx + n.x * sc)); r.setAttribute('y', String(offy + n.y * sc))
      r.setAttribute('width', String(Math.max(3, n.w * sc))); r.setAttribute('height', String(Math.max(2, n.h * sc)))
      r.setAttribute('rx', '1.5'); r.setAttribute('fill', COLOR[n.kind] ?? '#888'); r.setAttribute('opacity', '.85')
      mmsvg.appendChild(r)
    })
    const view = document.createElementNS(NS, 'rect')
    view.setAttribute('id', 'mmview'); view.setAttribute('rx', '2')
    view.setAttribute('fill', 'rgba(94,227,161,.1)'); view.setAttribute('stroke', '#5ee3a1'); view.setAttribute('stroke-width', '1.2')
    mmsvg.appendChild(view)
    updateMinimap()
  }

  function updateMinimap() {
    const mmsvg = minimapSvgRef.current; if (!mmsvg) return
    const view = mmsvg.querySelector('#mmview'); if (!view) return
    const sc = mmSRef.current, offx = mmOxRef.current, offy = mmOyRef.current
    const stage = stageRef.current; if (!stage) return
    const s = scaleRef.current
    if (!isFinite(sc) || !s || !isFinite(s)) return
    const vx = -txRef.current / s, vy = -tyRef.current / s
    const vw = stage.clientWidth / s, vh = stage.clientHeight / s
    view.setAttribute('x', String(offx + vx * sc)); view.setAttribute('y', String(offy + vy * sc))
    view.setAttribute('width', String(vw * sc)); view.setAttribute('height', String(vh * sc))
  }

  // ── Panel ─────────────────────────────────────────────────────────

  function openPanel(id: string) {
    const nb = nodeById.current
    const n = nb[id]; if (!n) return
    const panel = panelRef.current
    const legend = legendRef.current
    if (selIdRef.current) nb[selIdRef.current].el?.classList.remove('sel')
    selIdRef.current = id; n.el?.classList.add('sel')
    if (piconRef.current) piconRef.current.textContent = n.icon
    if (pnameRef.current) pnameRef.current.textContent = n.name
    const kindLabel: Record<string, string> = {
      source:'SOURCE', decision:'DECISION', okr:'EXECUTION', metric:'METRIC', sink:'SINK', ai:'AI.AUTO',
    }
    if (pmetaRef.current) {
      pmetaRef.current.innerHTML =
        `<span>${statusPill(n.status ?? 'success')}</span>` +
        `<span style="color:#414c5c">${kindLabel[n.kind] ?? ''} · ${TYPE_LABEL[n.type] ?? 'TASK'}</span>` +
        `<span style="color:#414c5c">&#9201; ${n.dur}</span>`
    }
    let html = `<div class="sec"><h4>description</h4><div class="desc">${n.desc}</div></div>`
    if (n.kv) {
      html += '<div class="sec"><h4>params</h4>'
      n.kv.forEach(([k, v]) => { html += `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>` })
      html += '</div>'
    }
    if (n.ach) {
      html += '<div class="sec"><h4>output metrics</h4>'
      n.ach.forEach(([a, b]) => { html += `<div class="ach"><span class="n">${a}</span><span class="t">${b}</span></div>` })
      html += '</div>'
    }
    if (n.tags) {
      html += '<div class="sec"><h4>tags</h4><div class="tags">' +
        n.tags.map(t => `<span class="tag ${n.kind === 'okr' ? 'hl' : ''}">${t}</span>`).join('') +
        '</div></div>'
    }
    const up = EDGES.filter(e => e[1] === id).map(e => nb[e[0]]?.name).filter(Boolean)
    const down = EDGES.filter(e => e[0] === id).map(e => nb[e[1]]?.name).filter(Boolean)
    html += '<div class="sec"><h4>dependencies</h4>'
    html += `<div class="kv"><span class="k">upstream &#8593;</span><span class="v">${up.length ? up.join(', ') : '&#8212; (root source)'}</span></div>`
    html += `<div class="kv"><span class="k">downstream &#8595;</span><span class="v">${down.length ? down.join(', ') : '&#8212; (terminal sink)'}</span></div>`
    html += '</div>'
    html += `<div class="sec"><h4>task log</h4><div class="logbox">` +
      `<div class="l"><span class="t">[${n.runs}]</span> queued &#8594; scheduler</div>` +
      `<div class="l"><span class="t">[exec]</span> task_instance started</div>` +
      (n.status === 'running'
        ? '<div class="l w">[exec] running&#8230; (live)</div>'
        : `<div class="l ok">[exec] marked SUCCESS in ${n.dur}</div>`) +
      '</div></div>'
    if (pbodyRef.current) { pbodyRef.current.innerHTML = html; pbodyRef.current.scrollTop = 0 }
    panel?.classList.add('open')
    legend?.classList.add(s.legendShift)
    if (n.ml) {
      requestAnimationFrame(() => {
        const ac = document.getElementById('aicanvas-detail') as HTMLCanvasElement | null
        if (ac) initAI(ac)
      })
    }
  }

  function closePanel() {
    panelRef.current?.classList.remove('open')
    legendRef.current?.classList.remove(s.legendShift)
    if (selIdRef.current) {
      nodeById.current[selIdRef.current]?.el?.classList.remove('sel')
      selIdRef.current = null
    }
  }

  // ── Schema tooltip ────────────────────────────────────────────────

  function showSchema(ev: MouseEvent, sch: typeof SCHEMAS[number]) {
    const el = schemaRef.current; if (!el) return
    el.style.display = 'block'
    el.innerHTML = `<div class="h">${sch.h}</div>` +
      sch.rows.map(r => `<div class="row"><span class="key">${r[0]}</span>: <span class="ty">${r[1]}</span></div>`).join('')
    let x = ev.clientX + 14, y = ev.clientY + 14
    if (x + 260 > window.innerWidth) x = ev.clientX - 260
    el.style.left = x + 'px'; el.style.top = y + 'px'
  }
  function hideSchema() { if (schemaRef.current) schemaRef.current.style.display = 'none' }

  // ── Main setup effect ─────────────────────────────────────────────

  useEffect(() => {
    // 1) Layout
    const ns = NODES.map(n => ({ ...n })) // shallow clone for mutation safety
    doLayout(ns)
    const nb: Record<string, NodeDef> = {}
    ns.forEach(n => { nb[n.id] = n })
    nodes.current = ns
    nodeById.current = nb
    WB.current = worldBounds(ns)

    const wb = WB.current
    const nodesLayer = nodesLayRef.current
    const edgesSvg = edgesSvgRef.current
    const stage = stageRef.current
    const panel = panelRef.current

    if (!nodesLayer || !edgesSvg || !stage) return

    edgesSvg.setAttribute('width', String(wb.w))
    edgesSvg.setAttribute('height', String(wb.h))

    // 2) Build node cards
    ns.forEach(n => {
      const el = document.createElement('div')
      el.className = 'node' + (n.metric ? ' metric' : '')
      el.dataset.id = n.id; el.dataset.kind = n.kind
      n.status = n.status ?? 'success'
      el.dataset.status = n.status
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; el.style.width = n.w + 'px'
      if (n.metric) {
        el.innerHTML =
          `<div class="top"><div class="ico">${n.icon}</div>` +
          `<div class="ttl"><div class="name">${n.name}</div><div class="type">LOAD · OUTPUT</div></div></div>` +
          `<div class="body" style="padding-bottom:12px">` +
          `<div class="big ${n.dir}">${n.big}</div><div class="lbl">${n.lbl}</div></div>` +
          `<span class="port in"></span><span class="port out"></span>`
      } else {
        const aiChart = n.ml ? '<canvas id="aicanvas" style="display:block;width:100%;height:54px;background:rgba(0,0,0,.25);border-radius:5px;margin-top:2px"></canvas>' : ''
        el.innerHTML =
          `<div class="top"><div class="ico">${n.icon}</div>` +
          `<div class="ttl"><div class="name">${n.name}</div><div class="type">${TYPE_LABEL[n.type] ?? 'TASK'}</div></div>` +
          statusPill(n.status) + '</div>' +
          `<div class="body"><div class="sub">${n.sub}</div>${aiChart}</div>` +
          `<div class="foot"><span class="runid">${n.runs}</span><span class="dur">&#9201; ${n.dur}</span></div>` +
          `<span class="port in"></span><span class="port out"></span>`
      }
      el.addEventListener('click', (e) => { e.stopPropagation(); openPanel(n.id) })
      nodesLayer.appendChild(el)
      n.el = el
    })

    // Build event log in AI node
    const aiNode = nb['ai_layer']
    if (aiNode?.el) {
      const body = aiNode.el.querySelector('.body')
      if (body) {
        const box = document.createElement('div')
        box.style.cssText = 'margin-top:6px;background:#050810;border:1px solid #1a2232;border-radius:5px;' +
          'padding:5px 7px;font-size:9px;line-height:1.65;height:62px;overflow:hidden;position:relative;'
        const fade = document.createElement('div')
        fade.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:18px;' +
          'background:linear-gradient(transparent,#050810);pointer-events:none;z-index:1;'
        box.appendChild(fade)
        const lines = document.createElement('div')
        lines.style.cssText = 'position:relative;z-index:0;'
        box.appendChild(lines)
        body.appendChild(box)
        logElRef.current = lines
      }
    }

    // Init AI canvas
    const aiCanvas = document.getElementById('aicanvas') as HTMLCanvasElement | null
    if (aiCanvas) initAI(aiCanvas)

    // 3) Build edges + tokens
    const defs = document.createElementNS(NS, 'defs')
    defs.innerHTML =
      '<marker id="dag-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" fill="#2c3848"/></marker>' +
      '<marker id="dag-arrowA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
        '<path d="M0,0 L10,5 L0,10 z" fill="#5ee3a1"/></marker>' +
      '<linearGradient id="dag-eg" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0" stop-color="#243040"/><stop offset="1" stop-color="#2c3a4c"/></linearGradient>'
    edgesSvg.appendChild(defs)

    const edgeEls: EdgeEl[] = []
    EDGES.forEach(([ea, eb], i) => {
      const a = nb[ea], b = nb[eb]; if (!a || !b) return
      const d = edgePath(a, b)
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('d', d); p.setAttribute('fill', 'none')
      p.setAttribute('stroke', 'url(#dag-eg)'); p.setAttribute('stroke-width', '1.4')
      p.setAttribute('marker-end', 'url(#dag-arrow)'); p.setAttribute('opacity', '0.85')
      edgesSvg.appendChild(p)

      const hit = document.createElementNS(NS, 'path')
      hit.setAttribute('d', d)
      hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '14')
      hit.setAttribute('fill', 'none'); hit.style.cursor = 'help'
      const sch = SCHEMAS[i % SCHEMAS.length]
      hit.addEventListener('mousemove', (ev) => showSchema(ev as MouseEvent, sch))
      hit.addEventListener('mouseenter', () => {
        p.setAttribute('stroke', '#5ee3a1'); p.setAttribute('stroke-width', '2'); p.setAttribute('marker-end', 'url(#dag-arrowA)')
      })
      hit.addEventListener('mouseleave', () => {
        hideSchema(); p.setAttribute('stroke', 'url(#dag-eg)'); p.setAttribute('stroke-width', '1.4'); p.setAttribute('marker-end', 'url(#dag-arrow)')
      })
      edgesSvg.appendChild(hit)

      const tok = document.createElementNS(NS, 'circle')
      tok.setAttribute('r', '2.6'); tok.setAttribute('fill', '#5ee3a1')
      tok.style.filter = 'drop-shadow(0 0 4px #5ee3a1)'
      edgesSvg.appendChild(tok)

      edgeEls.push({
        a: ea, b: eb, path: p, len: p.getTotalLength(), tok,
        phase: Math.random(), speed: 0.10 + Math.random() * 0.13,
        targetSpeed: 0.10 + Math.random() * 0.13, active: true,
      })
    })
    edgeElsRef.current = edgeEls

    // 4) Pan/zoom event listeners
    let dragging = false, sx = 0, sy = 0, stx = 0, sty = 0
    movedRef.current = false

    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Element
      if (t.closest('.node') || t.classList.contains('ehit')) return
      dragging = true; movedRef.current = false
      sx = e.clientX; sy = e.clientY; stx = txRef.current; sty = tyRef.current
      stage.classList.add(s.stageGrabbing)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      txRef.current = stx + (e.clientX - sx); tyRef.current = sty + (e.clientY - sy)
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 3) movedRef.current = true
      applyTransform()
    }
    const onMouseUp = () => { dragging = false; stage.classList.remove(s.stageGrabbing) }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = stage.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const wx = (mx - txRef.current) / scaleRef.current
      const wy = (my - tyRef.current) / scaleRef.current
      const factor = e.deltaY < 0 ? 1.12 : 0.89
      scaleRef.current = Math.min(2.4, Math.max(0.25, scaleRef.current * factor))
      txRef.current = mx - wx * scaleRef.current; tyRef.current = my - wy * scaleRef.current
      applyTransform()
    }
    const onStageClick = (e: MouseEvent) => {
      if (!movedRef.current && !(e.target as Element).closest('.node')) closePanel()
    }
    stage.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    stage.addEventListener('wheel', onWheel, { passive: false })
    stage.addEventListener('click', onStageClick)

    // 5) Minimap click
    const mmsvg = minimapSvgRef.current
    const onMmClick = (e: MouseEvent) => {
      const rect = mmsvg!.getBoundingClientRect()
      const sc = mmSRef.current, offx = mmOxRef.current, offy = mmOyRef.current
      const wx = ((e.clientX - rect.left) - offx) / sc
      const wy = ((e.clientY - rect.top) - offy) / sc
      txRef.current = stage.clientWidth / 2 - wx * scaleRef.current
      tyRef.current = stage.clientHeight / 2 - wy * scaleRef.current
      applyTransform()
    }
    if (mmsvg) mmsvg.addEventListener('click', onMmClick)

    // 6) Panel close
    const pclose = panel?.querySelector('#pclose')
    if (pclose) pclose.addEventListener('click', closePanel)

    // 7) Run button
    const runBtn = runBtnRef.current
    if (runBtn) runBtn.addEventListener('click', runPipeline)

    // 8) Resize
    const onResize = () => { buildMinimap(); updateMinimap() }
    window.addEventListener('resize', onResize)

    // 9) Boot
    buildMinimap()
    fit()

    // Set exec_runbook to running status
    const rb = nb['exec_runbook']
    if (rb) { rb.status = 'running'; if (rb.el) rb.el.dataset.status = 'running'; updatePill(rb) }

    // Hint auto-hide
    setTimeout(() => { if (hintRef.current) hintRef.current.style.opacity = '0' }, 6500)

    // Auto-start sweep
    setTimeout(runPipeline, 800)

    // Cleanup
    return () => {
      stage.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      stage.removeEventListener('wheel', onWheel)
      stage.removeEventListener('click', onStageClick)
      if (mmsvg) mmsvg.removeEventListener('click', onMmClick)
      window.removeEventListener('resize', onResize)
      if (nodesLayer) nodesLayer.innerHTML = ''
      if (edgesSvg) edgesSvg.innerHTML = ''
      edgeElsRef.current = []
      sweepRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── JSX ───────────────────────────────────────────────────────────

  return (
    <SceneHost className={s.root} bg="#0a0e14">
      {/* Toolbar */}
      <div className={s.toolbar}>
        <div className={s.brand}>
          <span className={s.brandDot} />
          <b className={s.brandB}>notion-os</b>
          <span className={s.brandPath}>/ notion-os.dag</span>
        </div>
        <div className={s.tbSep} />
        <div className={s.tbMeta}>
          <span><span className="k">project:</span> <span className="v">Notion OS</span></span>
          <span><span className="k">domain:</span> <span className="v">조직 운영 시스템 · 의사결정 OS</span></span>
          <span><span className="k">schedule:</span> <span className="v">@continuous</span></span>
        </div>
        <div className={s.spacer} />
        <div className={s.banner}><span className={s.bannerOk} />SSOT: Notion · GitHub · Drive · 운영 중</div>
        <button ref={runBtnRef} className={`${s.btn} ${s.btnRun}`}>
          <span className={s.btnTri}>&#9654;</span> RUN PIPELINE
        </button>
        <button className={s.btnGhost} onClick={fit} title="reset view">&#10562; fit</button>
      </div>

      {/* Run progress bar */}
      <div ref={runbarRef} className={s.runbar} />

      {/* Stage */}
      <div ref={stageRef} className={s.stage}>
        {/* Grid background canvas */}
        <canvas ref={ref} className={s.c} />
        {/* World (pan/zoom container) */}
        <div ref={worldRef} className={s.world}>
          <svg ref={edgesSvgRef} className={s.edgesSvg} />
          <div ref={nodesLayRef} className={s.nodesLayer} />
        </div>
      </div>

      {/* Zoom controls */}
      <div className={s.zoomCtl}>
        <button className={s.zoomBtn} onClick={() => zoomBtn(1.2)}>+</button>
        <button className={s.zoomBtn} onClick={() => zoomBtn(0.83)}>&#8722;</button>
        <button className={`${s.zoomBtn} ${s.zoomBtnLast}`} onClick={fit}>FIT</button>
      </div>
      <div ref={zlabelRef} className={s.zLabel}>100%</div>

      {/* Hint */}
      <div ref={hintRef} className={s.hint}>
        드래그로 이동 · 휠로 줌 · 노드 클릭으로 상세 · <span className={s.kbd}>RUN</span> 으로 파이프라인 실행
      </div>

      {/* Schema tooltip */}
      <div ref={schemaRef} className={s.schema} style={{ display: 'none', position: 'fixed' }} />

      {/* Minimap */}
      <div className={s.minimap}>
        <div className={s.minimapH}><span>MINIMAP</span><span>overview</span></div>
        <svg ref={minimapSvgRef} className={s.mmSvg} />
      </div>

      {/* Legend */}
      <div ref={legendRef} className={s.legend}>
        <span className={s.leg}><span className={s.legD} style={{ background: '#4aa8ff' }} />input</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#b08cff' }} />decision</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#36d9d9' }} />execution</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#f0b429' }} />ai</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#5ee3a1' }} />metric</span>
        <span className={s.leg}><span className={s.legD} style={{ background: '#ff7eb6' }} />sink</span>
      </div>

      {/* Detail panel — static structure; body filled imperatively */}
      <aside ref={panelRef} className={s.panel}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:11, padding:'18px 18px 14px', borderBottom:'1px solid #1f2733' }}>
          <div ref={piconRef} style={{ width:40, height:40, borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, background:'rgba(255,255,255,.04)', border:'1px solid #1f2733', flexShrink:0 }}>&#11041;</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div ref={pnameRef} style={{ fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.3 }}>node</div>
            <div ref={pmetaRef} style={{ fontSize:10.5, color:'#6b7787', marginTop:4, display:'flex', gap:8, flexWrap:'wrap' }} />
          </div>
          <div id="pclose" style={{ marginLeft:'auto', cursor:'pointer', color:'#6b7787', fontSize:18, lineHeight:1, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, flexShrink:0 }}>&#10005;</div>
        </div>
        <div ref={pbodyRef} style={{ overflowY:'auto', padding:'16px 18px 28px', flex:1 }} />
      </aside>
    </SceneHost>
  )
}
