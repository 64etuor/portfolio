import { C } from './data'
import { COMM } from './constants'
import type { Frame } from '../_host/types'
import type { SceneCtx } from './types'
import { get } from './dom'
import { buildGraph, buildTrace, fireTrace, layoutPipe, stepLive } from './runtime'

/** 에이전트 run-line 진행 애니메이션 — pipe 프레임 now 로 구동되는 DOM 갱신. */
export function runlines(ctx: SceneCtx, now: number): void {
  const s = ctx.s
  ctx.rootRef.current?.querySelectorAll<HTMLElement>(`.${s.runline}`).forEach((el) => {
    const i = Number(el.dataset.i)
    if (ctx.agentsRef.current[i] && ctx.agentsRef.current[i].status === 'run') {
      const w = (now / 14 + i * 60) % 100
      el.style.width = `${w}%`
      el.style.opacity = '0.6'
    } else {
      el.style.width = '0'
    }
  })
}

/** wiki 레이어 flow 글로우 이동 — pipe 프레임 now 로 구동되는 DOM 갱신. */
export function wikiFlow(ctx: SceneCtx, now: number): void {
  const s = ctx.s
  ctx.rootRef.current?.querySelectorAll<HTMLElement>(`.${s.flow}`).forEach((flow) => {
    const d = Number(flow.dataset.d)
    const t = (now / 1400 + d * 0.33) % 1
    const wparent = flow.parentElement?.clientWidth ?? 0
    flow.style.transform = `translateX(${t * (wparent + 40) - 40}px)`
  })
}

export function drawPipe(ctx: SceneCtx, g: CanvasRenderingContext2D, fr: Frame): void {
  const now = fr.t * 1000
  const dt = fr.dt
  if (
    Math.abs(ctx.pipeSize.current.w - fr.w) > 1 ||
    Math.abs(ctx.pipeSize.current.h - fr.h) > 1 ||
    !ctx.pipeNodes.current.length
  ) {
    layoutPipe(ctx, fr.w, fr.h)
  }
  stepLive(ctx, now, dt)

  const nodes = ctx.pipeNodes.current
  const events = ctx.pipeEvents.current
  const state = ctx.stateRef.current
  const w = fr.w
  const h = fr.h
  g.clearRect(0, 0, w, h)

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    g.strokeStyle = C.line2
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(a.x + a.r, a.y)
    g.lineTo(b.x - b.r, b.y)
    g.stroke()
    const mx = (a.x + b.x) / 2
    if (i === state.stage) {
      const open = state.gateRelease
      g.strokeStyle = open ? C.signal : C.amber
      g.lineWidth = 2.5
      g.beginPath()
      if (open) {
        g.moveTo(mx, a.y - 15)
        g.lineTo(mx, a.y - 7)
        g.moveTo(mx, a.y + 7)
        g.lineTo(mx, a.y + 15)
      } else {
        g.moveTo(mx, a.y - 15)
        g.lineTo(mx, a.y + 15)
      }
      g.stroke()
      g.fillStyle = open ? C.signal : C.amber
      g.font = '700 8px "JetBrains Mono", "Pretendard Variable", monospace'
      g.textAlign = 'center'
      g.fillText(open ? 'GATE↑' : 'GATE✕', mx, a.y - 22)
    }
  }

  const speedPerSec = state.tickerOn ? 0.55 : 0
  for (let k = events.length - 1; k >= 0; k--) {
    const e = events[k]
    if (dt > 0) e.p += speedPerSec * dt * (1 + Math.sin(now / 400) * 0.04)
    const seg = Math.min(e.seg, nodes.length - 2)
    const a = nodes[seg]
    const b = nodes[seg + 1]
    let p = e.p
    if (seg === state.stage && !state.gateRelease && p > 0.5) {
      p = 0.5
      e.p = 0.5
    }
    if (p >= 1) {
      if (e.seg < nodes.length - 2) {
        e.seg++
        e.p = 0
      } else {
        events.splice(k, 1)
        continue
      }
    }
    const x = a.x + (b.x - a.x) * p
    const y = a.y
    const grd = g.createRadialGradient(x, y, 0, x, y, 8)
    grd.addColorStop(0, e.color)
    grd.addColorStop(1, 'rgba(54,224,164,0)')
    g.fillStyle = grd
    g.beginPath()
    g.arc(x, y, 8, 0, 7)
    g.fill()
    g.fillStyle = e.color
    g.beginPath()
    g.arc(x, y, 2.4, 0, 7)
    g.fill()
  }

  nodes.forEach((nd, i) => {
    const active = i <= state.stage
    const isCur = i === state.stage
    g.save()
    g.beginPath()
    g.arc(nd.x, nd.y, nd.r, 0, 7)
    g.fillStyle = '#070b11'
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = isCur ? C.signal : active ? C.signalDim : C.line2
    if (isCur) {
      g.shadowColor = C.signal
      g.shadowBlur = 14
    }
    g.stroke()
    g.shadowBlur = 0
    if (isCur) {
      const pr = 4 + Math.sin(now / 220) * 2
      g.fillStyle = C.signal
      g.globalAlpha = 0.85
      g.beginPath()
      g.arc(nd.x, nd.y, pr, 0, 7)
      g.fill()
      g.globalAlpha = 1
    } else if (active) {
      g.fillStyle = C.signalDim
      g.beginPath()
      g.arc(nd.x, nd.y, 3, 0, 7)
      g.fill()
    }
    g.fillStyle = isCur ? C.signal : active ? C.ink2 : C.ink3
    g.font = '700 11px "JetBrains Mono", "Pretendard Variable", monospace'
    g.textAlign = 'center'
    g.fillText(nd.name, nd.x, nd.y + nd.r + 15)
    g.font = '600 8px "JetBrains Mono", "Pretendard Variable", monospace'
    g.fillStyle = C.ink3
    g.fillText(`§${i}`, nd.x, nd.y + nd.r + 26)
    g.restore()
  })

  g.fillStyle = C.ink3
  g.font = '600 9px "JetBrains Mono", "Pretendard Variable", monospace'
  g.textAlign = 'left'
  g.fillText('event flow → readiness gate → next stage', 6, 16)

  runlines(ctx, now)
  wikiFlow(ctx, now)
}

export function drawHeartbeat(ctx: SceneCtx, g: CanvasRenderingContext2D, fr: Frame): void {
  const now = fr.t * 1000
  const w = fr.w
  const h = fr.h
  const state = ctx.stateRef.current
  const live = ctx.liveRef.current
  g.clearRect(0, 0, w, h)
  g.strokeStyle = C.line2
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(0, h / 2)
  g.lineTo(w, h / 2)
  g.stroke()
  if (fr.dt > 0) {
    if (state.tickerOn) {
      const beatPeriod = 60000 / live.bpm
      const hbPhase = (now % beatPeriod) / beatPeriod
      let v = 0
      if (hbPhase < 0.06) v = Math.sin((hbPhase / 0.06) * Math.PI) * 0.9
      else if (hbPhase < 0.1) v = -Math.sin(((hbPhase - 0.06) / 0.04) * Math.PI) * 0.35
      ctx.hbData.current.push(v)
    } else {
      ctx.hbData.current.push(0)
    }
    ctx.hbData.current.shift()
  }
  g.strokeStyle = state.tickerOn ? C.signal : C.rust
  g.lineWidth = 1.6
  g.shadowColor = state.tickerOn ? C.signal : C.rust
  g.shadowBlur = 6
  g.beginPath()
  ctx.hbData.current.forEach((value, i) => {
    const x = (i / (ctx.hbData.current.length - 1)) * w
    const y = h / 2 - value * (h / 2 - 4)
    if (i) g.lineTo(x, y)
    else g.moveTo(x, y)
  })
  g.stroke()
  g.shadowBlur = 0
}

export function drawGraph(ctx: SceneCtx, g: CanvasRenderingContext2D, fr: Frame): void {
  const dtMs = fr.dt * 1000
  if (
    Math.abs(ctx.graphSize.current.w - fr.w) > 1 ||
    Math.abs(ctx.graphSize.current.h - fr.h) > 1 ||
    !ctx.graphNodes.current.length
  ) {
    buildGraph(ctx, fr.w, fr.h)
  }
  const nodes = ctx.graphNodes.current
  const edges = ctx.graphEdges.current
  g.clearRect(0, 0, fr.w, fr.h)

  if (dtMs > 0) {
    nodes.forEach((node) => {
      node.x += node.vx
      node.y += node.vy
      node.vx += (node.cx - node.x) * 0.0009
      node.vy += (node.cy - node.y) * 0.0009
      node.vx *= 0.985
      node.vy *= 0.985
      node.lit *= 0.94
    })
  }

  edges.forEach((edge) => {
    const a = nodes[edge[0]]
    const b = nodes[edge[1]]
    const bridge = edge[2] === 1
    g.strokeStyle = bridge ? 'rgba(159,176,196,.22)' : 'rgba(90,120,150,.16)'
    g.lineWidth = bridge ? 1 : 0.8
    if (bridge) g.setLineDash([3, 3])
    else g.setLineDash([])
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  })
  g.setLineDash([])

  if (dtMs > 0) {
    ctx.traceTimer.current += dtMs
    if (ctx.traceTimer.current > 2600) {
      ctx.traceTimer.current = 0
      buildTrace(ctx)
      fireTrace(ctx)
    }
    ctx.traceProg.current += dtMs / 520
  }
  const litHops = Math.min(ctx.trace.current.length, Math.floor(ctx.traceProg.current) + 1)
  for (let i = 0; i < litHops - 1; i++) {
    const a = nodes[ctx.trace.current[i]]
    const b = nodes[ctx.trace.current[i + 1]]
    g.strokeStyle = C.signal
    g.lineWidth = 1.8
    g.shadowColor = C.signal
    g.shadowBlur = 8
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
    g.shadowBlur = 0
  }
  ctx.trace.current.slice(0, litHops).forEach((idx) => {
    if (nodes[idx]) nodes[idx].lit = 1
  })

  nodes.forEach((node) => {
    g.beginPath()
    g.arc(node.x, node.y, node.r + node.lit * 2, 0, 7)
    g.fillStyle = COMM[node.c]
    g.globalAlpha = 0.55 + node.lit * 0.45
    if (node.lit > 0.3) {
      g.shadowColor = C.signal
      g.shadowBlur = 10 * node.lit
    }
    g.fill()
    g.shadowBlur = 0
    g.globalAlpha = 1
    if (node.lit > 0.4) {
      g.fillStyle = C.signal
      g.font = '700 8px "JetBrains Mono", "Pretendard Variable", monospace'
      g.textAlign = 'center'
      g.fillText(node.label, node.x, node.y - node.r - 4)
    }
  })
}

export function drawLintGauge(ctx: SceneCtx, g: CanvasRenderingContext2D, fr: Frame): void {
  const sz = Math.min(fr.w, fr.h) || 62
  g.clearRect(0, 0, fr.w, fr.h)
  const cx = sz / 2
  const cy = sz / 2
  const r = 24
  const frac = ctx.lintState.current.pass / ctx.lintState.current.total
  g.lineWidth = 5
  g.strokeStyle = C.line2
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.stroke()
  const col = frac >= 1 ? C.signal : frac >= 0.9 ? C.amber : C.rust
  g.strokeStyle = col
  g.shadowColor = col
  g.shadowBlur = 8
  g.beginPath()
  g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac)
  g.stroke()
  g.shadowBlur = 0
  const num = get(ctx, 'lintNum')
  if (num) {
    num.textContent = `${ctx.lintState.current.pass}/${ctx.lintState.current.total}`
    num.style.color = col
  }
}
