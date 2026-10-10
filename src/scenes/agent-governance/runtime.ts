import { EV_TYPES, G_LABELS, SEED_AUDITS, SEED_EVENTS, SEED_TOOLS, STAGES, TOOLS, C } from './data'
import { IV, nowTs, nullEvent } from './constants'
import type { BuiltEvent, CounterKey, EventKind, GraphEdge, GraphNode, SceneCtx } from './types'
import {
  cycleAudit,
  cycleNetZero,
  driftSignals,
  evClass,
  get,
  ledClass,
  pushAudit,
  renderFleet,
  renderNetZero,
  renderReg,
  schedule,
  setText,
  syncLamps,
  tickClock,
} from './dom'

export function buildEvent(ctx: SceneCtx, type: EventKind, msg: string, counterKey: CounterKey): BuiltEvent {
  const state = ctx.stateRef.current
  const id =
    counterKey === 'ev'
      ? `e${String(++state.evId).padStart(4, '0')}`
      : `t${String(++state.toolId).padStart(4, '0')}`
  return { id, type, msg, counterKey, ts: nowTs() }
}

export function flushEvent(ctx: SceneCtx, ev: BuiltEvent, feed: HTMLElement | null, counterKey: CounterKey): void {
  const s = ctx.s
  if (!feed) return
  const row = document.createElement('div')
  row.className = `${s.ev} ${s.new}`
  row.innerHTML =
    `<span class="${s.id}">${ev.id}</span>` +
    `<span class="${s.ts}">${ev.ts}</span>` +
    `<span class="${s.ty} ${evClass(ctx, ev.type)}">${ev.type.toUpperCase()}</span>` +
    `<span class="${s.msg}">${ev.msg}</span>`
  feed.insertBefore(row, feed.firstChild)
  const rows = feed.querySelectorAll<HTMLElement>(`.${s.ev}`)
  rows.forEach((r, i) => {
    r.style.opacity = Math.max(0.25, 1 - i * 0.072).toFixed(2)
  })
  while (feed.childNodes.length > 22 && feed.lastChild) feed.removeChild(feed.lastChild)

  const state = ctx.stateRef.current
  if (counterKey === 'ev') {
    const id = `e${String(state.evId).padStart(4, '0')}`
    setText(ctx, 'evTotal', id)
    setText(ctx, 'evHead', id)
  } else {
    setText(ctx, 'toolTotal', state.toolId)
  }
}

export function pushEvent(
  ctx: SceneCtx,
  type: EventKind,
  msg: string,
  feed: HTMLElement | null,
  counterKey: CounterKey,
): void {
  flushEvent(ctx, buildEvent(ctx, type, msg, counterKey), feed, counterKey)
}

export function buildRandEvent(ctx: SceneCtx): BuiltEvent {
  const t = EV_TYPES[Math.floor(Math.random() * EV_TYPES.length)]
  const state = ctx.stateRef.current
  const msg = t[1]
    .replace('%s', String(state.stage))
    .replace('%s', String(state.evId % 9))
    .replace('%s', String((state.evId % 9) + 1))
  return buildEvent(ctx, t[0] as EventKind, msg, 'ev')
}

export function buildRandTool(ctx: SceneCtx): BuiltEvent {
  const t = TOOLS[Math.floor(Math.random() * TOOLS.length)]
  if (t[0] === 'deny' && !ctx.stateRef.current.autonomyClosed) {
    return buildEvent(ctx, 'tool', 'external.write · ALLOWED (gate open)', 'tool')
  }
  return buildEvent(ctx, t[0] as EventKind, t[1], 'tool')
}

export function spawnEvent(ctx: SceneCtx): void {
  ctx.pipeEvents.current.push({ seg: 0, p: 0, color: C.signal, born: performance.now() })
}

export function layoutPipe(ctx: SceneCtx, w: number, h: number): void {
  ctx.pipeSize.current = { w, h }
  ctx.pipeNodes.current = []
  const n = STAGES.length
  const pad = 58
  const usable = w - pad * 2
  const y = h * 0.4
  for (let i = 0; i < n; i++) {
    ctx.pipeNodes.current.push({ x: pad + usable * (i / (n - 1)), y, r: 23, name: STAGES[i] })
  }
}

export function advanceStage(ctx: SceneCtx): void {
  const state = ctx.stateRef.current
  if (state.stage < STAGES.length - 1) state.stage++
  else state.stage = 0
  syncLamps(ctx)
}

export function fireLatch(ctx: SceneCtx): void {
  const state = ctx.stateRef.current
  state.latch++
  setText(ctx, 'latchCt', state.latch)
  const ll = get(ctx, 'latchLed')
  const lt = get(ctx, 'latchTxt')
  if (ll) ll.className = ledClass(ctx, 'amber')
  if (lt) {
    lt.textContent = 'PINNED · 확인필요'
    lt.style.color = 'var(--amber)'
  }
  ctx.regsRef.current[3].h = 'fired'
  renderReg(ctx)
  pushEvent(ctx, 'gate', 'attention.latch · fired · pin for human', get(ctx, 'evFeed'), 'ev')
  const latchParent = get(ctx, 'latchCt')?.parentElement
  if (latchParent) latchParent.style.transform = 'scale(1.06)'
  schedule(ctx, () => {
    if (latchParent) latchParent.style.transform = ''
  }, 220)
  schedule(ctx, () => {
    if (ll) ll.className = ledClass(ctx, 'dim')
    if (lt) {
      lt.textContent = 'armed'
      lt.style.color = ''
    }
    ctx.regsRef.current[3].h = 'armed'
    renderReg(ctx)
  }, 3400)
}

export function jobTickSmooth(ctx: SceneCtx): void {
  if (ctx.agentsRef.current[2].status === 'done') return
  ctx.jobP.current = Math.min(0.95, ctx.jobP.current + 0.018 + Math.random() * 0.012)
  if (Math.random() < 0.4 && ctx.turns.current < 24) {
    ctx.turns.current++
    setText(ctx, 'jobTurns', `${ctx.turns.current} / 24`)
    const cost = (ctx.turns.current * 0.34).toFixed(2)
    setText(ctx, 'jobCost', `$${cost} / $5.00`)
  }
}

export function lintCycleTick(ctx: SceneCtx): void {
  const s = ctx.s
  if (ctx.lintFailActive.current || !ctx.stateRef.current.tickerOn) return
  if (Math.random() < 0.35) {
    ctx.lintFailActive.current = true
    ctx.lintState.current.pass = 46 + Math.floor(Math.random() * 2)
    const pin = get(ctx, 'lintPin')
    if (pin) {
      pin.textContent = 'LINT FAIL'
      pin.classList.add(s.amber)
    }
    const chip = get(ctx, 'lintChip')
    if (chip) {
      chip.textContent = `${ctx.lintState.current.pass}/48`
      chip.style.color = 'var(--amber)'
    }
    pushEvent(ctx, 'gate', `vault-lint · ${48 - ctx.lintState.current.pass} check fail · turn blocked`, get(ctx, 'evFeed'), 'ev')
    schedule(ctx, () => {
      ctx.lintState.current.pass = 48
      ctx.lintFailActive.current = false
      const pin2 = get(ctx, 'lintPin')
      if (pin2) {
        pin2.textContent = 'GATE PASS'
        pin2.classList.remove(s.amber)
      }
      const chip2 = get(ctx, 'lintChip')
      if (chip2) {
        chip2.textContent = '48/48'
        chip2.style.color = ''
      }
      pushEvent(ctx, 'ok', 'vault-lint · 48/48 pass · turn done', get(ctx, 'evFeed'), 'ev')
    }, 1700)
  }
}

export function prepaint(ctx: SceneCtx): void {
  if (ctx.prepainted.current) return
  ctx.prepainted.current = true

  SEED_EVENTS.forEach((event) => pushEvent(ctx, event[0] as EventKind, event[1], get(ctx, 'evFeed'), 'ev'))
  SEED_TOOLS.forEach((event) => pushEvent(ctx, event[0] as EventKind, event[1], get(ctx, 'toolFeed'), 'tool'))

  const state = ctx.stateRef.current
  state.jobOk = 3
  setText(ctx, 'jobOk', 3)
  state.jobFail = 1
  setText(ctx, 'jobFail', 1)
  state.capture = 37
  setText(ctx, 'capCt', 37)
  state.latch = 2
  setText(ctx, 'latchCt', 2)
  state.stage = 2
  const jobProg = get(ctx, 'jobProg')
  if (jobProg) jobProg.style.width = '30%'
  syncLamps(ctx)
  for (let i = 0; i < 5; i++) {
    ctx.pipeEvents.current.push({ seg: i % 4, p: Math.random(), color: C.signal, born: 0 })
  }
  renderNetZero(ctx)
  SEED_AUDITS.forEach((audit) => pushAudit(ctx, audit[0], audit[1], true))
  tickClock(ctx)
}

export function handleKillTicker(ctx: SceneCtx): void {
  const s = ctx.s
  const state = ctx.stateRef.current
  state.tickerOn = !state.tickerOn
  const btn = get(ctx, 'killTicker')
  if (btn) {
    btn.classList.toggle(s.killed, !state.tickerOn)
    btn.innerHTML = `<span class="${s.led}"></span>${state.tickerOn ? 'KILL TICKER' : 'RESTART TICKER'}`
  }
  const note = get(ctx, 'killNote')
  if (!state.tickerOn) {
    if (note) {
      note.innerHTML = '⏻ 시계 정지 — 권한은 <b style="color:var(--signal)">새지 않음</b> (fail-closed 증명)'
      note.style.color = 'var(--ink2)'
    }
    pushEvent(ctx, 'gate', 'ticker.killed · autonomy STAYS gated', get(ctx, 'evFeed'), 'ev')
  } else {
    if (note) {
      note.innerHTML = 'ticker·autonomy 분리 → fail-closed 증명'
      note.style.color = ''
    }
    pushEvent(ctx, 'emit', 'ticker.restart · heartbeat resumed', get(ctx, 'evFeed'), 'ev')
  }
  syncLamps(ctx)
}

export function approveACP(ctx: SceneCtx): void {
  const s = ctx.s
  const state = ctx.stateRef.current
  if (state.acp === 'approved') return
  state.acp = 'approved'
  const acp = get(ctx, 'acp')
  acp?.classList.remove(s.pending)
  acp?.classList.add(s.opened)
  setText(ctx, 'acpState', 'APPROVED')
  const q = get(ctx, 'acpQ')
  if (q) {
    q.innerHTML =
      `승인됨 — <span class="${s.k}">git push origin main</span> 1회 실행 허용. ` +
      'autonomy 봉투가 <b style="color:var(--signal)">일시 개방 → fail-closed 복귀</b>.'
  }
  state.autonomyClosed = false
  syncLamps(ctx)
  pushEvent(ctx, 'ok', 'acp.approved · external.write granted (1×)', get(ctx, 'evFeed'), 'ev')
  pushEvent(ctx, 'tool', 'external.write · git push (approved)', get(ctx, 'toolFeed'), 'tool')
  advanceStage(ctx)
  ctx.agentsRef.current[2].status = 'done'
  renderFleet(ctx)
  ctx.regsRef.current[4].h = 'healthy'
  renderReg(ctx)
  state.jobOk++
  setText(ctx, 'jobOk', state.jobOk)
  schedule(ctx, () => {
    state.autonomyClosed = true
    syncLamps(ctx)
    pushEvent(ctx, 'gate', 'envelope.reclosed · fail-closed default restored', get(ctx, 'evFeed'), 'ev')
  }, 2600)
}

export function denyACP(ctx: SceneCtx): void {
  const s = ctx.s
  const state = ctx.stateRef.current
  state.acp = 'denied'
  const acp = get(ctx, 'acp')
  acp?.classList.remove(s.pending)
  const acpState = get(ctx, 'acpState')
  if (acpState) {
    acpState.textContent = 'DENIED'
    acpState.style.color = 'var(--rust)'
    acpState.style.borderColor = '#6b3530'
    acpState.style.animation = 'none'
  }
  const q = get(ctx, 'acpQ')
  if (q) q.innerHTML = '거부됨 — 외부 쓰기 차단 유지. autonomy 봉투 <b style="color:var(--signal)">fail-closed</b>.'
  pushEvent(ctx, 'deny', 'acp.denied · external.write blocked', get(ctx, 'evFeed'), 'ev')
}

export function handleJobAccept(ctx: SceneCtx): void {
  const badge = get(ctx, 'jobBadge')
  if (badge) {
    badge.textContent = 'ACCEPTED'
    badge.style.color = 'var(--signal)'
    badge.style.borderColor = 'var(--signal-dim)'
  }
  const state = ctx.stateRef.current
  state.jobOk++
  setText(ctx, 'jobOk', state.jobOk)
  pushEvent(ctx, 'ok', 'codex.proposal · accepted · merged', get(ctx, 'evFeed'), 'ev')
  ctx.agentsRef.current[2].status = 'done'
  renderFleet(ctx)
}

export function handleJobReject(ctx: SceneCtx): void {
  const badge = get(ctx, 'jobBadge')
  if (badge) {
    badge.textContent = 'KILLED'
    badge.style.color = 'var(--rust)'
    badge.style.borderColor = '#6b3530'
  }
  const state = ctx.stateRef.current
  state.jobFail++
  setText(ctx, 'jobFail', state.jobFail)
  pushEvent(ctx, 'deny', 'codex.runner · kill · proposal rejected', get(ctx, 'evFeed'), 'ev')
  ctx.agentsRef.current[2].status = 'idle'
  renderFleet(ctx)
}

export function buildGraph(ctx: SceneCtx, w: number, h: number): void {
  ctx.graphSize.current = { w, h }
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const centers = [
    [w * 0.26, h * 0.34],
    [w * 0.72, h * 0.3],
    [w * 0.5, h * 0.74],
  ]
  for (let i = 0; i < 14; i++) {
    const c = i % 3
    const cx = centers[c][0]
    const cy = centers[c][1]
    const ang = Math.random() * 7
    const rad = 14 + Math.random() * 34
    nodes.push({
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      c,
      r: 3.4 + Math.random() * 2.2,
      label: G_LABELS[i] || `n${i}`,
      cx,
      cy,
      lit: 0,
    })
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const same = nodes[i].c === nodes[j].c
      if (same && Math.random() < 0.5) edges.push([i, j, 0])
      else if (!same && Math.random() < 0.1) edges.push([i, j, 1])
    }
  }
  ctx.graphNodes.current = nodes
  ctx.graphEdges.current = edges
  buildTrace(ctx)
  fireTrace(ctx)
}

export function buildTrace(ctx: SceneCtx): void {
  const nodes = ctx.graphNodes.current
  const edges = ctx.graphEdges.current
  if (!nodes.length) return
  const start = nodes.findIndex((node) => node.label === 'LLM Wiki')
  const nextTrace = [start < 0 ? 0 : start]
  const visited = new Set(nextTrace)
  for (let h = 0; h < 3; h++) {
    const last = nextTrace[nextTrace.length - 1]
    const cands: number[] = []
    for (const [a, b] of edges) {
      const other = a === last ? b : b === last ? a : -1
      if (other >= 0 && !visited.has(other)) cands.push(other)
    }
    if (!cands.length) break
    const pick = cands[Math.floor(Math.random() * cands.length)]
    nextTrace.push(pick)
    visited.add(pick)
  }
  ctx.trace.current = nextTrace
  ctx.traceProg.current = 0
}

export function fireTrace(ctx: SceneCtx): void {
  const nodes = ctx.graphNodes.current
  if (!nodes.length || !ctx.trace.current.length) return
  const gtrace = get(ctx, 'gtrace')
  if (!gtrace) return
  // Built as DOM (text nodes + <b>) rather than an HTML string.
  const parts: (string | Node)[] = ['multi-hop: ']
  for (const i of ctx.trace.current) {
    const label = nodes[i]?.label
    if (!label) continue
    if (parts.length > 1) parts.push(' → ')
    const b = document.createElement('b')
    b.textContent = label
    parts.push(b)
  }
  parts.push(' · cite: LLM Wiki schema-layer')
  gtrace.replaceChildren(...parts)
}

export function stepLive(ctx: SceneCtx, now: number, dt: number): void {
  if (dt <= 0) return
  const live = ctx.liveRef.current
  const state = ctx.stateRef.current
  const k = 1 - Math.pow(0.01, dt * 4)
  live.bpm += (live.bpmTarget - live.bpm) * k
  live.captureTarget += 0
  live.capture += (live.captureTarget - live.capture) * k
  live.jobPSmooth += (ctx.jobP.current - live.jobPSmooth) * (1 - Math.pow(0.01, dt * 3))

  const prog = get(ctx, 'jobProg')
  if (prog && ctx.agentsRef.current[2].status !== 'done') {
    prog.style.width = `${(live.jobPSmooth * 100).toFixed(2)}%`
  }

  const bpm = get(ctx, 'bpm')
  if (bpm) {
    const bpmRound = Math.round(live.bpm)
    bpm.textContent = state.tickerOn ? `${bpmRound} bpm` : '-- bpm'
    bpm.style.color = state.tickerOn ? 'var(--signal)' : 'var(--rust)'
  }
  setText(ctx, 'capCt', Math.floor(live.capture))

  live.clockAcc += dt
  if (live.clockAcc >= IV.clock) {
    live.clockAcc -= IV.clock
    tickClock(ctx)
  }

  if (state.tickerOn) {
    live.evAcc += dt
    if (live.evAcc >= IV.ev) {
      live.evAcc -= IV.ev
      live.evQueue.push(buildRandEvent(ctx))
    }
    live.toolAcc += dt
    if (live.toolAcc >= IV.tool) {
      live.toolAcc -= IV.tool
      live.toolQueue.push(buildRandTool(ctx))
    }
    live.spawnAcc += dt
    if (live.spawnAcc >= IV.spawn) {
      live.spawnAcc -= IV.spawn
      spawnEvent(ctx)
    }
    live.jobAcc += dt
    if (live.jobAcc >= IV.job) {
      live.jobAcc -= IV.job
      jobTickSmooth(ctx)
    }
    live.stageAcc += dt
    if (live.stageAcc >= IV.stage) {
      live.stageAcc -= IV.stage
      if (!state.gateRelease) {
        state.gateRelease = true
        syncLamps(ctx)
      } else {
        advanceStage(ctx)
      }
    }
    live.gateAcc += dt
    if (live.gateAcc >= IV.gate) {
      live.gateAcc -= IV.gate
      state.gateRelease = Math.random() < 0.7
      syncLamps(ctx)
    }
    live.latchAcc += dt
    if (live.latchAcc >= IV.latch) {
      live.latchAcc -= IV.latch
      if (Math.random() < 0.6) fireLatch(ctx)
    }
    live.capAcc += dt
    if (live.capAcc >= IV.cap) {
      live.capAcc -= IV.cap
      live.captureTarget += Math.random() * 3.5
    }
    live.lintAcc += dt
    if (live.lintAcc >= IV.lint) {
      live.lintAcc -= IV.lint
      lintCycleTick(ctx)
    }
    live.bpm += (Math.random() - 0.5) * 0.08
    live.bpmTarget = 68 + Math.sin(now / 9000) * 6 + Math.random() * 2
  }

  live.sigAcc += dt
  if (live.sigAcc >= IV.sig) {
    live.sigAcc -= IV.sig
    driftSignals(ctx)
  }
  live.nzAcc += dt
  if (live.nzAcc >= IV.nz) {
    live.nzAcc -= IV.nz
    cycleNetZero(ctx)
  }
  live.auditAcc += dt
  if (live.auditAcc >= IV.audit) {
    live.auditAcc -= IV.audit
    cycleAudit(ctx)
  }

  if (live.evQueue.length) flushEvent(ctx, live.evQueue.shift() ?? nullEvent(), get(ctx, 'evFeed'), 'ev')
  if (live.toolQueue.length) flushEvent(ctx, live.toolQueue.shift() ?? nullEvent(), get(ctx, 'toolFeed'), 'tool')
}
