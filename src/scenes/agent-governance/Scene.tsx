'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import {
  AGENT_DEFS,
  AUDITS,
  C,
  EV_TYPES,
  G_LABELS,
  NZ_PAIRS,
  REG_DEFS,
  SEED_AUDITS,
  SEED_EVENTS,
  SEED_TOOLS,
  STAGES,
  STATUS_LABEL,
  TOOLS,
  type AgentStatus,
} from './data'
import s from './scene.module.css'

type CounterKey = 'ev' | 'tool'
type EventKind = 'emit' | 'gate' | 'ok' | 'tool' | 'deny'
type BuiltEvent = { id: string; type: EventKind; msg: string; counterKey: CounterKey; ts: string }
type RuntimeState = {
  evId: number
  toolId: number
  jobOk: number
  jobFail: number
  latch: number
  capture: number
  tickerOn: boolean
  gateRelease: boolean
  autonomyClosed: boolean
  acp: 'awaiting' | 'approved' | 'denied'
  stage: number
}
type Agent = { g: string; name: string; scope: string; status: AgentStatus }
type Reg = { n: string; h: 'healthy' | 'armed' | 'awaiting' | 'fired' }
type PipeNode = { x: number; y: number; r: number; name: string }
type PipeEvent = { seg: number; p: number; color: string; born: number }
type GraphNode = {
  x: number
  y: number
  vx: number
  vy: number
  c: number
  r: number
  label: string
  cx: number
  cy: number
  lit: number
}
type GraphEdge = [number, number, number]
type LiveState = {
  bpm: number
  bpmTarget: number
  capture: number
  captureTarget: number
  jobPSmooth: number
  evAcc: number
  toolAcc: number
  spawnAcc: number
  jobAcc: number
  stageAcc: number
  gateAcc: number
  latchAcc: number
  capAcc: number
  sigAcc: number
  nzAcc: number
  auditAcc: number
  lintAcc: number
  clockAcc: number
  evQueue: BuiltEvent[]
  toolQueue: BuiltEvent[]
}

type ElementKey =
  | 'agentList'
  | 'regList'
  | 'sStat'
  | 'lintChip'
  | 'jobOk'
  | 'jobFail'
  | 'latchCt'
  | 'capCt'
  | 'clock'
  | 'fleetActive'
  | 'jobId'
  | 'jobBadge'
  | 'jobProg'
  | 'jobCost'
  | 'jobTurns'
  | 'killTicker'
  | 'killNote'
  | 'evHead'
  | 'gateLed'
  | 'gateTxt'
  | 'tickLed'
  | 'tickTxt'
  | 'autLed'
  | 'autTxt'
  | 'latchLed'
  | 'latchTxt'
  | 'bpm'
  | 'rawCt'
  | 'wikiCt'
  | 'schCt'
  | 'gtrace'
  | 'acp'
  | 'acpState'
  | 'acpQ'
  | 'envWrite'
  | 'envWriteTail'
  | 'envPrio'
  | 'envPrioTail'
  | 'evTotal'
  | 'toolTotal'
  | 'evFeed'
  | 'toolFeed'
  | 'lintPin'
  | 'lintNum'
  | 'nzPin'
  | 'nzList'
  | 'nzBal'
  | 'cronPin'
  | 'sig0'
  | 'sig1'
  | 'sig2'
  | 'sig3'
  | 'sig4'
  | 'auditPin'
  | 'auditFeed'

const IV = {
  ev: 0.9,
  tool: 1.3,
  spawn: 1.4,
  job: 1.1,
  stage: 4.2,
  gate: 3.0,
  latch: 5.2,
  cap: 1.7,
  sig: 2.1,
  nz: 4.8,
  audit: 5.6,
  lint: 6.4,
  clock: 1.0,
}

const COMM = [C.hueA, C.hueB, C.hueC]
const rootBg =
  'radial-gradient(1200px 600px at 78% -10%, rgba(54,224,164,.06), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(90,169,230,.05), transparent 60%), linear-gradient(#0a0e15,#06080c)'

const statusColor = (status: AgentStatus) =>
  status === 'run' ? C.signal : status === 'await' ? C.amber : status === 'done' ? C.hueA : C.ink3

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const elRefs = useRef<Partial<Record<ElementKey, HTMLElement | null>>>({})
  const readyFired = useRef(false)
  const prepainted = useRef(false)
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([])

  const stateRef = useRef<RuntimeState>({
    evId: 0,
    toolId: 0,
    jobOk: 0,
    jobFail: 0,
    latch: 0,
    capture: 0,
    tickerOn: true,
    gateRelease: true,
    autonomyClosed: true,
    acp: 'awaiting',
    stage: 0,
  })
  const agentsRef = useRef<Agent[]>(AGENT_DEFS.map((a) => ({ ...a, status: a.status as AgentStatus })))
  const regsRef = useRef<Reg[]>(REG_DEFS.map((r) => ({ ...r })) as Reg[])
  const pipeNodes = useRef<PipeNode[]>([])
  const pipeEvents = useRef<PipeEvent[]>([])
  const pipeSize = useRef({ w: 0, h: 0 })
  const hbData = useRef<number[]>(new Array(160).fill(0))
  const graphNodes = useRef<GraphNode[]>([])
  const graphEdges = useRef<GraphEdge[]>([])
  const graphSize = useRef({ w: 0, h: 0 })
  const trace = useRef<number[]>([])
  const traceProg = useRef(0)
  const traceTimer = useRef(0)
  const lintState = useRef({ pass: 48, total: 48 })
  const lintFailActive = useRef(false)
  const nzIdx = useRef(0)
  const auditIdx = useRef(0)
  const jobP = useRef(0.3)
  const turns = useRef(7)
  const liveRef = useRef<LiveState>({
    bpm: 72,
    bpmTarget: 72,
    capture: 37,
    captureTarget: 37,
    jobPSmooth: 0.3,
    evAcc: 0,
    toolAcc: 0,
    spawnAcc: 0,
    jobAcc: 0,
    stageAcc: 0,
    gateAcc: 0,
    latchAcc: 0,
    capAcc: 0,
    sigAcc: 0,
    nzAcc: 0,
    auditAcc: 0,
    lintAcc: 0,
    clockAcc: 0,
    evQueue: [],
    toolQueue: [],
  })

  const setEl = (key: ElementKey) => (node: HTMLElement | null) => {
    elRefs.current[key] = node
  }
  const get = (key: ElementKey) => elRefs.current[key] ?? null
  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timeouts.current.push(id)
  }
  const evClass = (type: EventKind) => (type === 'ok' ? s.okText : s[type])
  const ledClass = (kind: 'ok' | 'amber' | 'rust' | 'dim') => `${s.led} ${s[kind]}`
  const setText = (key: ElementKey, value: string | number) => {
    const el = get(key)
    if (el) el.textContent = String(value)
  }

  useEffect(() => {
    return () => {
      timeouts.current.forEach((id) => clearTimeout(id))
      timeouts.current = []
    }
  }, [])

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  useEffect(() => {
    renderFleet()
    renderReg()
    prepaint()
  })

  function nowTs() {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${ms}`
  }

  function buildEvent(type: EventKind, msg: string, counterKey: CounterKey): BuiltEvent {
    const state = stateRef.current
    const id =
      counterKey === 'ev'
        ? `e${String(++state.evId).padStart(4, '0')}`
        : `t${String(++state.toolId).padStart(4, '0')}`
    return { id, type, msg, counterKey, ts: nowTs() }
  }

  function flushEvent(ev: BuiltEvent, feed: HTMLElement | null, counterKey: CounterKey) {
    if (!feed) return
    const row = document.createElement('div')
    row.className = `${s.ev} ${s.new}`
    row.innerHTML =
      `<span class="${s.id}">${ev.id}</span>` +
      `<span class="${s.ts}">${ev.ts}</span>` +
      `<span class="${s.ty} ${evClass(ev.type)}">${ev.type.toUpperCase()}</span>` +
      `<span class="${s.msg}">${ev.msg}</span>`
    feed.insertBefore(row, feed.firstChild)
    const rows = feed.querySelectorAll<HTMLElement>(`.${s.ev}`)
    rows.forEach((r, i) => {
      r.style.opacity = Math.max(0.25, 1 - i * 0.072).toFixed(2)
    })
    while (feed.childNodes.length > 22 && feed.lastChild) feed.removeChild(feed.lastChild)

    const state = stateRef.current
    if (counterKey === 'ev') {
      const id = `e${String(state.evId).padStart(4, '0')}`
      setText('evTotal', id)
      setText('evHead', id)
    } else {
      setText('toolTotal', state.toolId)
    }
  }

  function pushEvent(type: EventKind, msg: string, feed: HTMLElement | null, counterKey: CounterKey) {
    flushEvent(buildEvent(type, msg, counterKey), feed, counterKey)
  }

  function buildRandEvent() {
    const t = EV_TYPES[Math.floor(Math.random() * EV_TYPES.length)]
    const state = stateRef.current
    const msg = t[1]
      .replace('%s', String(state.stage))
      .replace('%s', String(state.evId % 9))
      .replace('%s', String((state.evId % 9) + 1))
    return buildEvent(t[0] as EventKind, msg, 'ev')
  }

  function buildRandTool() {
    const t = TOOLS[Math.floor(Math.random() * TOOLS.length)]
    if (t[0] === 'deny' && !stateRef.current.autonomyClosed) {
      return buildEvent('tool', 'external.write · ALLOWED (gate open)', 'tool')
    }
    return buildEvent(t[0] as EventKind, t[1], 'tool')
  }

  function renderFleet() {
    const el = get('agentList')
    if (!el) return
    el.innerHTML = ''
    agentsRef.current.forEach((agent, i) => {
      const row = document.createElement('div')
      row.className = s.agent
      row.innerHTML =
        `<div class="${s.glyph}" style="background:${statusColor(agent.status)};">${agent.g}</div>` +
        `<div class="${s.meta}"><div class="${s.name}">${agent.name}</div><div class="${s.scope}">${agent.scope}</div></div>` +
        `<div class="${s.pill} ${s[agent.status]}">${STATUS_LABEL[agent.status]}</div>` +
        `<div class="${s.runline}" data-i="${i}"></div>`
      el.appendChild(row)
    })
  }

  function renderReg() {
    const el = get('regList')
    if (!el) return
    el.innerHTML = ''
    regsRef.current.forEach((reg) => {
      const ok = reg.h === 'healthy'
      const col = ok ? C.signal : reg.h === 'awaiting' ? C.amber : C.hueA
      const row = document.createElement('div')
      row.className = s['reg-row']
      row.innerHTML =
        `<span class="${s.led}" style="background:${col};box-shadow:0 0 7px ${col}"></span>` +
        `${reg.n}<span class="${s.h}">${reg.h}</span>`
      el.appendChild(row)
    })
  }

  function syncLamps() {
    const state = stateRef.current
    const gl = get('gateLed')
    const gt = get('gateTxt')
    if (gl) gl.className = ledClass(state.gateRelease ? 'ok' : 'amber')
    if (gt) {
      gt.textContent = state.gateRelease ? 'RELEASE' : 'HOLD'
      gt.style.color = state.gateRelease ? '' : 'var(--amber)'
    }

    const tl = get('tickLed')
    const tt = get('tickTxt')
    if (tl) tl.className = ledClass(state.tickerOn ? 'ok' : 'rust')
    if (tt) {
      tt.textContent = state.tickerOn ? 'RUNNING' : 'STOPPED'
      tt.style.color = state.tickerOn ? '' : 'var(--rust)'
    }

    const al = get('autLed')
    const at = get('autTxt')
    if (al) al.className = ledClass(state.autonomyClosed ? 'ok' : 'amber')
    if (at) {
      at.textContent = state.autonomyClosed ? 'FAIL-CLOSED' : 'OPENED'
      at.style.color = state.autonomyClosed ? 'var(--signal)' : 'var(--amber)'
    }

    const ew = get('envWrite')
    const ep = get('envPrio')
    if (state.autonomyClosed) {
      if (ew) ew.className = ledClass('amber')
      if (ep) ep.className = ledClass('amber')
      setText('envWriteTail', '사람 게이트')
      setText('envPrioTail', '사람 게이트')
    } else {
      if (ew) ew.className = ledClass('ok')
      if (ep) ep.className = ledClass('ok')
      setText('envWriteTail', '개방됨 (승인)')
      setText('envPrioTail', '개방됨 (승인)')
    }
  }

  function tickClock() {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    setText('clock', `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
  }

  function spawnEvent() {
    pipeEvents.current.push({ seg: 0, p: 0, color: C.signal, born: performance.now() })
  }

  function layoutPipe(w: number, h: number) {
    pipeSize.current = { w, h }
    pipeNodes.current = []
    const n = STAGES.length
    const pad = 58
    const usable = w - pad * 2
    const y = h * 0.4
    for (let i = 0; i < n; i++) {
      pipeNodes.current.push({ x: pad + usable * (i / (n - 1)), y, r: 23, name: STAGES[i] })
    }
  }

  function advanceStage() {
    const state = stateRef.current
    if (state.stage < STAGES.length - 1) state.stage++
    else state.stage = 0
    syncLamps()
  }

  function fireLatch() {
    const state = stateRef.current
    state.latch++
    setText('latchCt', state.latch)
    const ll = get('latchLed')
    const lt = get('latchTxt')
    if (ll) ll.className = ledClass('amber')
    if (lt) {
      lt.textContent = 'PINNED · 확인필요'
      lt.style.color = 'var(--amber)'
    }
    regsRef.current[3].h = 'fired'
    renderReg()
    pushEvent('gate', 'attention.latch · fired · pin for human', get('evFeed'), 'ev')
    const latchParent = get('latchCt')?.parentElement
    if (latchParent) latchParent.style.transform = 'scale(1.06)'
    schedule(() => {
      if (latchParent) latchParent.style.transform = ''
    }, 220)
    schedule(() => {
      if (ll) ll.className = ledClass('dim')
      if (lt) {
        lt.textContent = 'armed'
        lt.style.color = ''
      }
      regsRef.current[3].h = 'armed'
      renderReg()
    }, 3400)
  }

  function jobTickSmooth() {
    if (agentsRef.current[2].status === 'done') return
    jobP.current = Math.min(0.95, jobP.current + 0.018 + Math.random() * 0.012)
    if (Math.random() < 0.4 && turns.current < 24) {
      turns.current++
      setText('jobTurns', `${turns.current} / 24`)
      const cost = (turns.current * 0.34).toFixed(2)
      setText('jobCost', `$${cost} / $5.00`)
    }
  }

  function lintCycleTick() {
    if (lintFailActive.current || !stateRef.current.tickerOn) return
    if (Math.random() < 0.35) {
      lintFailActive.current = true
      lintState.current.pass = 46 + Math.floor(Math.random() * 2)
      const pin = get('lintPin')
      if (pin) {
        pin.textContent = 'LINT FAIL'
        pin.classList.add(s.amber)
      }
      const chip = get('lintChip')
      if (chip) {
        chip.textContent = `${lintState.current.pass}/48`
        chip.style.color = 'var(--amber)'
      }
      pushEvent('gate', `vault-lint · ${48 - lintState.current.pass} check fail · turn blocked`, get('evFeed'), 'ev')
      schedule(() => {
        lintState.current.pass = 48
        lintFailActive.current = false
        const pin2 = get('lintPin')
        if (pin2) {
          pin2.textContent = 'GATE PASS'
          pin2.classList.remove(s.amber)
        }
        const chip2 = get('lintChip')
        if (chip2) {
          chip2.textContent = '48/48'
          chip2.style.color = ''
        }
        pushEvent('ok', 'vault-lint · 48/48 pass · turn done', get('evFeed'), 'ev')
      }, 1700)
    }
  }

  function runlines(now: number) {
    rootRef.current?.querySelectorAll<HTMLElement>(`.${s.runline}`).forEach((el) => {
      const i = Number(el.dataset.i)
      if (agentsRef.current[i] && agentsRef.current[i].status === 'run') {
        const w = (now / 14 + i * 60) % 100
        el.style.width = `${w}%`
        el.style.opacity = '0.6'
      } else {
        el.style.width = '0'
      }
    })
  }

  function wikiFlow(now: number) {
    rootRef.current?.querySelectorAll<HTMLElement>(`.${s.flow}`).forEach((flow) => {
      const d = Number(flow.dataset.d)
      const t = (now / 1400 + d * 0.33) % 1
      const wparent = flow.parentElement?.clientWidth ?? 0
      flow.style.transform = `translateX(${t * (wparent + 40) - 40}px)`
    })
  }

  function renderNetZero() {
    const el = get('nzList')
    if (!el) return
    el.innerHTML = ''
    const pair = NZ_PAIRS[nzIdx.current % NZ_PAIRS.length]
    ;[
      ['a', 'A', pair[0]],
      ['r', 'R', pair[1]],
    ].forEach((p) => {
      const row = document.createElement('div')
      row.className = s['nz-row']
      row.innerHTML = `<span class="${s.tag} ${s[p[0]]}">[${p[1]}]</span><span class="${s.txt}">${p[2]}</span>`
      el.appendChild(row)
    })
  }

  function cycleNetZero() {
    nzIdx.current++
    renderNetZero()
  }

  function driftSignals() {
    const ids: ElementKey[] = ['sig0', 'sig1', 'sig2', 'sig3', 'sig4']
    const i = Math.floor(Math.random() * 5)
    const sig = rootRef.current?.querySelector<HTMLElement>(`.${s.sig}[data-sig="${i}"]`)
    if (sig) {
      sig.classList.add(s.flash)
      schedule(() => sig.classList.remove(s.flash), 600)
    }
    const el = get(ids[i])
    if (!el) return
    if (i === 0) el.textContent = `${(1.2 + Math.random() * 0.4).toFixed(1)}k`
    else if (i === 3) el.textContent = String(90 + Math.floor(Math.random() * 9))
    else el.textContent = String(Math.max(0, parseInt(el.textContent || '0', 10) + (Math.random() < 0.5 ? 1 : -1)))
  }

  function pushAudit(src: string, msg: string, seed: boolean) {
    const auditFeed = get('auditFeed')
    if (!auditFeed) return
    const row = document.createElement('div')
    row.className = `${s['audit-row']}${seed ? '' : ` ${s.new}`}`
    row.innerHTML = `<span class="${s.src} ${s[src]}">[${src}]</span><span class="${s.am}">${msg}</span>`
    auditFeed.insertBefore(row, auditFeed.firstChild)
    while (auditFeed.childNodes.length > 5 && auditFeed.lastChild) auditFeed.removeChild(auditFeed.lastChild)
  }

  function cycleAudit() {
    const audit = AUDITS[auditIdx.current % AUDITS.length]
    auditIdx.current++
    pushAudit(audit[0], audit[1], false)
  }

  function prepaint() {
    if (prepainted.current) return
    prepainted.current = true

    SEED_EVENTS.forEach((event) => pushEvent(event[0] as EventKind, event[1], get('evFeed'), 'ev'))
    SEED_TOOLS.forEach((event) => pushEvent(event[0] as EventKind, event[1], get('toolFeed'), 'tool'))

    const state = stateRef.current
    state.jobOk = 3
    setText('jobOk', 3)
    state.jobFail = 1
    setText('jobFail', 1)
    state.capture = 37
    setText('capCt', 37)
    state.latch = 2
    setText('latchCt', 2)
    state.stage = 2
    const jobProg = get('jobProg')
    if (jobProg) jobProg.style.width = '30%'
    syncLamps()
    for (let i = 0; i < 5; i++) {
      pipeEvents.current.push({ seg: i % 4, p: Math.random(), color: C.signal, born: 0 })
    }
    renderNetZero()
    SEED_AUDITS.forEach((audit) => pushAudit(audit[0], audit[1], true))
    tickClock()
  }

  function handleKillTicker() {
    const state = stateRef.current
    state.tickerOn = !state.tickerOn
    const btn = get('killTicker')
    if (btn) {
      btn.classList.toggle(s.killed, !state.tickerOn)
      btn.innerHTML = `<span class="${s.led}"></span>${state.tickerOn ? 'KILL TICKER' : 'RESTART TICKER'}`
    }
    const note = get('killNote')
    if (!state.tickerOn) {
      if (note) {
        note.innerHTML = '⏻ 시계 정지 — 권한은 <b style="color:var(--signal)">새지 않음</b> (fail-closed 증명)'
        note.style.color = 'var(--ink2)'
      }
      pushEvent('gate', 'ticker.killed · autonomy STAYS gated', get('evFeed'), 'ev')
    } else {
      if (note) {
        note.innerHTML = 'ticker·autonomy 분리 → fail-closed 증명'
        note.style.color = ''
      }
      pushEvent('emit', 'ticker.restart · heartbeat resumed', get('evFeed'), 'ev')
    }
    syncLamps()
  }

  function approveACP() {
    const state = stateRef.current
    if (state.acp === 'approved') return
    state.acp = 'approved'
    const acp = get('acp')
    acp?.classList.remove(s.pending)
    acp?.classList.add(s.opened)
    setText('acpState', 'APPROVED')
    const q = get('acpQ')
    if (q) {
      q.innerHTML =
        `승인됨 — <span class="${s.k}">git push origin main</span> 1회 실행 허용. ` +
        'autonomy 봉투가 <b style="color:var(--signal)">일시 개방 → fail-closed 복귀</b>.'
    }
    state.autonomyClosed = false
    syncLamps()
    pushEvent('ok', 'acp.approved · external.write granted (1×)', get('evFeed'), 'ev')
    pushEvent('tool', 'external.write · git push (approved)', get('toolFeed'), 'tool')
    advanceStage()
    agentsRef.current[2].status = 'done'
    renderFleet()
    regsRef.current[4].h = 'healthy'
    renderReg()
    state.jobOk++
    setText('jobOk', state.jobOk)
    schedule(() => {
      state.autonomyClosed = true
      syncLamps()
      pushEvent('gate', 'envelope.reclosed · fail-closed default restored', get('evFeed'), 'ev')
    }, 2600)
  }

  function denyACP() {
    const state = stateRef.current
    state.acp = 'denied'
    const acp = get('acp')
    acp?.classList.remove(s.pending)
    const acpState = get('acpState')
    if (acpState) {
      acpState.textContent = 'DENIED'
      acpState.style.color = 'var(--rust)'
      acpState.style.borderColor = '#6b3530'
      acpState.style.animation = 'none'
    }
    const q = get('acpQ')
    if (q) q.innerHTML = '거부됨 — 외부 쓰기 차단 유지. autonomy 봉투 <b style="color:var(--signal)">fail-closed</b>.'
    pushEvent('deny', 'acp.denied · external.write blocked', get('evFeed'), 'ev')
  }

  function handleJobAccept() {
    const badge = get('jobBadge')
    if (badge) {
      badge.textContent = 'ACCEPTED'
      badge.style.color = 'var(--signal)'
      badge.style.borderColor = 'var(--signal-dim)'
    }
    const state = stateRef.current
    state.jobOk++
    setText('jobOk', state.jobOk)
    pushEvent('ok', 'codex.proposal · accepted · merged', get('evFeed'), 'ev')
    agentsRef.current[2].status = 'done'
    renderFleet()
  }

  function handleJobReject() {
    const badge = get('jobBadge')
    if (badge) {
      badge.textContent = 'KILLED'
      badge.style.color = 'var(--rust)'
      badge.style.borderColor = '#6b3530'
    }
    const state = stateRef.current
    state.jobFail++
    setText('jobFail', state.jobFail)
    pushEvent('deny', 'codex.runner · kill · proposal rejected', get('evFeed'), 'ev')
    agentsRef.current[2].status = 'idle'
    renderFleet()
  }

  function buildGraph(w: number, h: number) {
    graphSize.current = { w, h }
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
    graphNodes.current = nodes
    graphEdges.current = edges
    buildTrace()
    fireTrace()
  }

  function buildTrace() {
    const nodes = graphNodes.current
    const edges = graphEdges.current
    if (!nodes.length) return
    const start = nodes.findIndex((node) => node.label === 'LLM Wiki')
    const nextTrace = [start < 0 ? 0 : start]
    for (let h = 0; h < 3; h++) {
      const last = nextTrace[nextTrace.length - 1]
      const cands = edges
        .filter((edge) => edge[0] === last || edge[1] === last)
        .map((edge) => (edge[0] === last ? edge[1] : edge[0]))
        .filter((node) => !nextTrace.includes(node))
      if (!cands.length) break
      nextTrace.push(cands[Math.floor(Math.random() * cands.length)])
    }
    trace.current = nextTrace
    traceProg.current = 0
  }

  function fireTrace() {
    const nodes = graphNodes.current
    if (!nodes.length || !trace.current.length) return
    const labels = trace.current.map((i) => nodes[i]?.label).filter(Boolean)
    const gtrace = get('gtrace')
    if (gtrace) {
      gtrace.innerHTML =
        'multi-hop: ' + labels.map((label) => `<b>${label}</b>`).join(' → ') + ' · cite: LLM Wiki schema-layer'
    }
  }

  function stepLive(now: number, dt: number) {
    if (dt <= 0) return
    const live = liveRef.current
    const state = stateRef.current
    const k = 1 - Math.pow(0.01, dt * 4)
    live.bpm += (live.bpmTarget - live.bpm) * k
    live.captureTarget += 0
    live.capture += (live.captureTarget - live.capture) * k
    live.jobPSmooth += (jobP.current - live.jobPSmooth) * (1 - Math.pow(0.01, dt * 3))

    const prog = get('jobProg')
    if (prog && agentsRef.current[2].status !== 'done') {
      prog.style.width = `${(live.jobPSmooth * 100).toFixed(2)}%`
    }

    const bpm = get('bpm')
    if (bpm) {
      const bpmRound = Math.round(live.bpm)
      bpm.textContent = state.tickerOn ? `${bpmRound} bpm` : '-- bpm'
      bpm.style.color = state.tickerOn ? 'var(--signal)' : 'var(--rust)'
    }
    setText('capCt', Math.floor(live.capture))

    live.clockAcc += dt
    if (live.clockAcc >= IV.clock) {
      live.clockAcc -= IV.clock
      tickClock()
    }

    if (state.tickerOn) {
      live.evAcc += dt
      if (live.evAcc >= IV.ev) {
        live.evAcc -= IV.ev
        live.evQueue.push(buildRandEvent())
      }
      live.toolAcc += dt
      if (live.toolAcc >= IV.tool) {
        live.toolAcc -= IV.tool
        live.toolQueue.push(buildRandTool())
      }
      live.spawnAcc += dt
      if (live.spawnAcc >= IV.spawn) {
        live.spawnAcc -= IV.spawn
        spawnEvent()
      }
      live.jobAcc += dt
      if (live.jobAcc >= IV.job) {
        live.jobAcc -= IV.job
        jobTickSmooth()
      }
      live.stageAcc += dt
      if (live.stageAcc >= IV.stage) {
        live.stageAcc -= IV.stage
        if (!state.gateRelease) {
          state.gateRelease = true
          syncLamps()
        } else {
          advanceStage()
        }
      }
      live.gateAcc += dt
      if (live.gateAcc >= IV.gate) {
        live.gateAcc -= IV.gate
        state.gateRelease = Math.random() < 0.7
        syncLamps()
      }
      live.latchAcc += dt
      if (live.latchAcc >= IV.latch) {
        live.latchAcc -= IV.latch
        if (Math.random() < 0.6) fireLatch()
      }
      live.capAcc += dt
      if (live.capAcc >= IV.cap) {
        live.capAcc -= IV.cap
        live.captureTarget += Math.random() * 3.5
      }
      live.lintAcc += dt
      if (live.lintAcc >= IV.lint) {
        live.lintAcc -= IV.lint
        lintCycleTick()
      }
      live.bpm += (Math.random() - 0.5) * 0.08
      live.bpmTarget = 68 + Math.sin(now / 9000) * 6 + Math.random() * 2
    }

    live.sigAcc += dt
    if (live.sigAcc >= IV.sig) {
      live.sigAcc -= IV.sig
      driftSignals()
    }
    live.nzAcc += dt
    if (live.nzAcc >= IV.nz) {
      live.nzAcc -= IV.nz
      cycleNetZero()
    }
    live.auditAcc += dt
    if (live.auditAcc >= IV.audit) {
      live.auditAcc -= IV.audit
      cycleAudit()
    }

    if (live.evQueue.length) flushEvent(live.evQueue.shift() ?? nullEvent(), get('evFeed'), 'ev')
    if (live.toolQueue.length) flushEvent(live.toolQueue.shift() ?? nullEvent(), get('toolFeed'), 'tool')
  }

  function nullEvent(): BuiltEvent {
    return { id: '', type: 'emit', msg: '', counterKey: 'ev', ts: '' }
  }

  function drawPipe(g: CanvasRenderingContext2D, fr: Frame) {
    const now = fr.t * 1000
    const dt = fr.dt
    if (Math.abs(pipeSize.current.w - fr.w) > 1 || Math.abs(pipeSize.current.h - fr.h) > 1 || !pipeNodes.current.length) {
      layoutPipe(fr.w, fr.h)
    }
    stepLive(now, dt)

    const nodes = pipeNodes.current
    const events = pipeEvents.current
    const state = stateRef.current
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
        g.font = '700 8px ui-monospace,monospace'
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
      g.font = '700 11px ui-monospace,monospace'
      g.textAlign = 'center'
      g.fillText(nd.name, nd.x, nd.y + nd.r + 15)
      g.font = '600 8px ui-monospace,monospace'
      g.fillStyle = C.ink3
      g.fillText(`§${i}`, nd.x, nd.y + nd.r + 26)
      g.restore()
    })

    g.fillStyle = C.ink3
    g.font = '600 9px ui-monospace,monospace'
    g.textAlign = 'left'
    g.fillText('event flow → readiness gate → next stage', 6, 16)

    runlines(now)
    wikiFlow(now)
  }

  function drawHeartbeat(g: CanvasRenderingContext2D, fr: Frame) {
    const now = fr.t * 1000
    const w = fr.w
    const h = fr.h
    const state = stateRef.current
    const live = liveRef.current
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
        hbData.current.push(v)
      } else {
        hbData.current.push(0)
      }
      hbData.current.shift()
    }
    g.strokeStyle = state.tickerOn ? C.signal : C.rust
    g.lineWidth = 1.6
    g.shadowColor = state.tickerOn ? C.signal : C.rust
    g.shadowBlur = 6
    g.beginPath()
    hbData.current.forEach((value, i) => {
      const x = (i / (hbData.current.length - 1)) * w
      const y = h / 2 - value * (h / 2 - 4)
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    })
    g.stroke()
    g.shadowBlur = 0
  }

  function drawGraph(g: CanvasRenderingContext2D, fr: Frame) {
    const now = fr.t * 1000
    const dtMs = fr.dt * 1000
    if (
      Math.abs(graphSize.current.w - fr.w) > 1 ||
      Math.abs(graphSize.current.h - fr.h) > 1 ||
      !graphNodes.current.length
    ) {
      buildGraph(fr.w, fr.h)
    }
    const nodes = graphNodes.current
    const edges = graphEdges.current
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
      traceTimer.current += dtMs
      if (traceTimer.current > 2600) {
        traceTimer.current = 0
        buildTrace()
        fireTrace()
      }
      traceProg.current += dtMs / 520
    }
    const litHops = Math.min(trace.current.length, Math.floor(traceProg.current) + 1)
    for (let i = 0; i < litHops - 1; i++) {
      const a = nodes[trace.current[i]]
      const b = nodes[trace.current[i + 1]]
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
    trace.current.slice(0, litHops).forEach((idx) => {
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
        g.font = '700 8px ui-monospace,monospace'
        g.textAlign = 'center'
        g.fillText(node.label, node.x, node.y - node.r - 4)
      }
    })
  }

  function drawLintGauge(g: CanvasRenderingContext2D, fr: Frame) {
    const sz = Math.min(fr.w, fr.h) || 62
    g.clearRect(0, 0, fr.w, fr.h)
    const cx = sz / 2
    const cy = sz / 2
    const r = 24
    const frac = lintState.current.pass / lintState.current.total
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
    const num = get('lintNum')
    if (num) {
      num.textContent = `${lintState.current.pass}/${lintState.current.total}`
      num.style.color = col
    }
  }

  const pipeRef = useSceneCanvas(drawPipe, { running })
  const hbRef = useSceneCanvas(drawHeartbeat, { running })
  const graphRef = useSceneCanvas(drawGraph, { running })
  const lintRef = useSceneCanvas(drawLintGauge, { running })

  return (
    <SceneHost className={s.root} bg="#06080c" style={{ background: rootBg }} scroll>
      <div className={s.wrap} ref={rootRef}>
        <div className={s.topbar}>
          <div className={s.brand}>
            <div className={s.logo} />
            <div>
              <h1>Boule Control Room</h1>
              <div className={s.sub}>BOUNDARIES BEFORE EXECUTION · BOUNDED TICKER · EVENT-SOURCED · v2.3</div>
            </div>
          </div>
          <div className={s.spacer} />
          <div className={s['stat-strip']}>
            <div className={s.chip}>
              <span className={s.dot} />SESSION <b ref={setEl('sStat')}>LIVE</b>
            </div>
            <div className={s.chip}>SSOT <b>AGENTS.md</b></div>
            <div className={s.chip}>LINT <b ref={setEl('lintChip')}>48/48</b></div>
            <div className={s.chip}>JOBS <b ref={setEl('jobOk')}>0</b>✓ / <b className={s.jobFail} ref={setEl('jobFail')}>0</b>✗</div>
            <div className={`${s.chip} ${s.warn}`}>
              <span className={s.dot} />LATCH <b ref={setEl('latchCt')}>0</b>
            </div>
            <div className={s.chip}>CAPTURE <b ref={setEl('capCt')}>0</b>/d</div>
          </div>
          <div className={s.clock} ref={setEl('clock')}>--:--:--</div>
        </div>

        <div className={s.grid}>
          <section className={`${s.panel} ${s.fleet}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>FLEET</span>
              <h2>Agent Fleet · Orchestration</h2>
              <span className={s.pin} ref={setEl('fleetActive')}>5 types</span>
            </div>
            <div ref={setEl('agentList')} />

            <div className={s.registry}>
              <div className={s['reg-head']}>ServiceRegistry · lifecycle</div>
              <div ref={setEl('regList')} />
            </div>

            <div className={s.job}>
              <div className={s.jh}>
                ⌬ Codex Job <span className={s.jobId} ref={setEl('jobId')}>job#0481</span>
                <span className={s.badge} ref={setEl('jobBadge')}>RUNNING</span>
              </div>
              <div className={s.prog}><i ref={setEl('jobProg')} /></div>
              <div className={s.row}><span>timeout</span><b>900s</b></div>
              <div className={s.row}><span>maxTurns</span><b>24</b></div>
              <div className={s.row}><span>costCap</span><b ref={setEl('jobCost')}>$2.40 / $5.00</b></div>
              <div className={`${s.row} ${s.rowLast}`}><span>turns used</span><b ref={setEl('jobTurns')}>7 / 24</b></div>
              <div className={s.acts}>
                <div className={`${s.mini} ${s.accept}`} onClick={handleJobAccept}>ACCEPT proposal</div>
                <div className={`${s.mini} ${s.reject}`} onClick={handleJobReject}>REJECT · kill</div>
              </div>
            </div>
          </section>

          <section className={`${s.panel} ${s.pipe}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>CORE</span>
              <h2>Boule Pipeline · 경계 설계 후 실행</h2>
              <span className={s.pin} ref={setEl('evHead')}>e0000</span>
            </div>

            <div className={s['pipe-canvas-wrap']}>
              <canvas ref={pipeRef} className={s.pipeCanvas} />
            </div>

            <div className={s['lamp-row']}>
              <div className={s.lamp}>
                <div className={s.lab}>readiness gate</div>
                <div className={s.val}><span className={ledClass('ok')} ref={setEl('gateLed')} /><span ref={setEl('gateTxt')}>RELEASE</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>ticker · heartbeat</div>
                <div className={s.val}><span className={ledClass('ok')} ref={setEl('tickLed')} /><span ref={setEl('tickTxt')}>RUNNING</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>autonomy · bounded envelope</div>
                <div className={s.val}><span className={ledClass('ok')} ref={setEl('autLed')} /><span ref={setEl('autTxt')} style={{ color: 'var(--signal)' }}>FAIL-CLOSED</span></div>
              </div>
              <div className={s.lamp}>
                <div className={s.lab}>attention latch</div>
                <div className={s.val}><span className={ledClass('dim')} ref={setEl('latchLed')} /><span ref={setEl('latchTxt')}>armed</span></div>
              </div>
            </div>

            <div className={s['hb-wrap']}>
              <canvas className={s['hb-canvas']} ref={hbRef} />
              <div className={s['hb-bpm']} ref={setEl('bpm')}>72 bpm</div>
            </div>

            <div className={s['pipe-controls']}>
              <div className={s.btn} ref={setEl('killTicker')} onClick={handleKillTicker}><span className={s.led} />KILL TICKER</div>
              <span className={s['ticker-mini']} ref={setEl('killNote')}>ticker 정지해도 권한 봉투는 닫힌 채 유지 — 경계는 하트비트와 무관</span>
            </div>
          </section>

          <section className={`${s.panel} ${s.know}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>KNOWLEDGE</span>
              <h2>LLM Wiki · Lineage Graph</h2>
              <span className={s.pin}>3-layer</span>
            </div>

            <div className={s['wiki-stack']}>
              <div className={s.layer}><span className={s.ln}>raw</span><span className={s.desc}>원천 캡처 — 미가공 노트/대화</span><span className={s.ct} ref={setEl('rawCt')}>1,284</span><span className={s.flow} data-d="0" /></div>
              <div className={s.layer}><span className={s.ln}>wiki</span><span className={s.desc}>정제 위키 — ingest · query · lint</span><span className={s.ct} ref={setEl('wikiCt')}>412</span><span className={s.flow} data-d="1" /></div>
              <div className={s.layer}><span className={s.ln}>schema</span><span className={s.desc}>강제 스키마 — 구조화된 진실</span><span className={s.ct} ref={setEl('schCt')}>96</span><span className={s.flow} data-d="2" /></div>
            </div>

            <div className={s['know-sub']}>GraphRAG · Leiden community · multi-hop</div>
            <canvas ref={graphRef} className={s.graphCanvas} />
            <div className={s['graph-trace']} ref={setEl('gtrace')}>query → multi-hop trace 대기…</div>
          </section>

          <section className={`${s.panel} ${s.human}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>HUMAN-IN-THE-LOOP</span>
              <h2>Hermes ACP · human approval gate</h2>
            </div>

            <div className={`${s.acp} ${s.pending}`} ref={setEl('acp')}>
              <div className={s.ah}>
                <div className={s.ic}>!</div>
                <div className={s.t}>권한 승인 요청<small>Hermes ACP · permission gate</small></div>
                <div className={s.state} ref={setEl('acpState')}>AWAITING</div>
              </div>
              <div className={s.q} ref={setEl('acpQ')}>
                에이전트가 외부 쓰기를 요청합니다 — <span className={s.k}>git push origin main</span><br />
                autonomy 봉투 밖의 작업. 사람 승인 없이는 실행되지 않습니다.
              </div>
              <div className={s.acts}>
                <div className={`${s.mini} ${s.accept}`} onClick={approveACP}>APPROVE · 게이트 개방</div>
                <div className={`${s.mini} ${s.reject}`} onClick={denyACP}>DENY · 유지</div>
              </div>
            </div>

            <div className={s.envelope}>
              <div className={`${s['reg-head']} ${s.regHeadEnvelope}`}>permission envelope · 권한 봉투</div>
              <div className={s['env-row']}><span className={ledClass('ok')} />read · 코드/이벤트 관측<span className={s.tail}>자율 허용</span></div>
              <div className={s['env-row']}><span className={ledClass('ok')} />plan · 제안 생성<span className={s.tail}>자율 허용</span></div>
              <div className={s['env-row']}><span className={ledClass('amber')} ref={setEl('envWrite')} />external write · push/배포<span className={s.tail} ref={setEl('envWriteTail')}>사람 게이트</span></div>
              <div className={s['env-row']}><span className={ledClass('amber')} ref={setEl('envPrio')} />priority 변경<span className={s.tail} ref={setEl('envPrioTail')}>사람 게이트</span></div>
            </div>
          </section>

          <section className={`${s.panel} ${s.log}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>OBSERVABILITY</span>
              <h2>Append-only Event Store</h2>
              <span className={s.pin}>SQLite · 50+ migrations</span>
            </div>
            <div className={s.logbody}>
              <div className={s.stream}>
                <div className={s.sh}>EVENT LOG <span className={s.ct} ref={setEl('evTotal')}>e0000</span></div>
                <div className={s.feed} ref={setEl('evFeed')} />
              </div>
              <div className={s.stream}>
                <div className={s.sh}>TOOL / MCP STREAM <span className={s.ct} ref={setEl('toolTotal')}>0</span></div>
                <div className={s.feed} ref={setEl('toolFeed')} />
              </div>
            </div>
          </section>

          <section className={`${s.panel} ${s.guards}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>GOVERNANCE</span>
              <h2>Named Failure-modes · stop conditions</h2>
              <span className={s.pin}>contained</span>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />Schema 비대화<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>SSOT가 모든 규칙 종착지로 비대해짐 — Hyrum's Law. net-zero 레저로 차단. <b>최소주의 = 비대화 면역력.</b></div>
              <div className={s.meter}><i style={{ width: '22%' }} /></div>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />사문화 드리프트<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>정형화됐지만 아무도 안 읽음 = 공동묘지. read_log · dead_notes 텔레메트리로 사문화를 관측.</div>
              <div className={s.meter}><i style={{ width: '14%' }} /></div>
            </div>
            <div className={s.guard}>
              <div className={s.gh}><span className={s.led} />행동적 부패<span className={s.st}>CONTAINED</span></div>
              <div className={s.gd}>형식은 살았으나 의미가 죽음 — lint로 못 잡는 부패. Instruction Review Protocol + 텔레메트리 read-side 신호로 검출, 처분은 수동.</div>
              <div className={s.meter}><i style={{ width: '9%' }} /></div>
            </div>
          </section>

          <section className={`${s.panel} ${s.vault}`}>
            <div className={s.corner} />
            <div className={s.ph}>
              <span className={s.tag}>SELF-GOVERNING VAULT OS</span>
              <h2>Vault Governance · 자가통치</h2>
              <span className={s.pin}>running infra</span>
            </div>

            <div className={s['vault-grid']}>
              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>CONSTITUTION · SSOT</span><span className={s.vp}>AUTHORITATIVE</span></div>
                <div className={s['const-row']}><span className={s.led} />AGENTS.md<span className={s.h}>30KB · English-only</span></div>
                <div className={s['const-row']}><span className={s.led} />CLAUDE.md<span className={s.h}>1-line · @AGENTS.md import</span></div>
                <div className={s['const-note']}>모든 볼트-쓰기 규칙의 단일 진실원천. <b>충돌 시 이 파일이 이김</b> — 권한·중단조건·인간 게이트를 여기서 선언 후 실행.</div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>COMPILER · vault-lint.py</span><span className={s.vp} ref={setEl('lintPin')}>GATE PASS</span></div>
                <div className={s['gauge-wrap']}>
                  <div className={s.gauge}><canvas ref={lintRef} className={s.lintCanvas} /><div className={s.gnum} ref={setEl('lintNum')}>48/48</div></div>
                  <div className={s['gauge-meta']}>
                    <div className={s.gl}>frontmatter 7-field<b className={s.okText}>ok</b></div>
                    <div className={s.gl}>wikilink · tag taxonomy<b className={s.okText}>ok</b></div>
                    <div className={s.gl}>AUTOGEN drift <span className={s.h}>#34</span><b className={s.okText}>ok</b></div>
                    <div className={s.gl}>매 편집 턴 후 통과해야 <b className={s.okText}>done</b></div>
                  </div>
                </div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>NET-ZERO LEDGER · CHANGELOG</span><span className={s.vp} ref={setEl('nzPin')}>BALANCED</span></div>
                <div className={s.nzList} ref={setEl('nzList')} />
                <div className={s['nz-bal']} ref={setEl('nzBal')}>slug: changelog-net-zero · [A]==[R] · 비대화 거버너</div>
              </div>

              <div className={s.vcard}>
                <div className={s.vch}><span className={s.vt}>MAINTENANCE CRON</span><span className={s.vp} ref={setEl('cronPin')}>FRESH</span></div>
                <div className={s['cron-stack']}>
                  <div className={s['cron-row']}><span className={s.cn}>read_log</span><span className={s.bar}><i style={{ width: '88%' }} /></span><span className={s.age}>1d</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>graph_health</span><span className={s.bar}><i style={{ width: '62%' }} /></span><span className={s.age}>3d</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>dead_notes</span><span className={s.bar}><i className={s.due} style={{ width: '24%' }} /></span><span className={s.age}>due</span></div>
                  <div className={s['cron-row']}><span className={s.cn}>status_aging</span><span className={s.bar}><i style={{ width: '71%' }} /></span><span className={s.age}>2d</span></div>
                </div>
                <div className={s['cron-foot']}>run_due_maintenance.py · CADENCE_DAYS+state · 의존성 순서 · 매주 월 <b>06:00 cron</b></div>
              </div>

              <div className={`${s.vcard} ${s.wide2}`}>
                <div className={s.vch}><span className={s.vt}>TELEMETRY · read-side 5-signal</span><span className={s.vp}>MEASURED</span></div>
                <div className={s['sig-row']}>
                  <div className={s.sig} data-sig="0"><span className={s.sled} /><span className={s.sn}>read_log</span><span className={s.sv} ref={setEl('sig0')}>1.2k</span></div>
                  <div className={s.sig} data-sig="1"><span className={s.sled} /><span className={s.sn}>dead_notes</span><span className={s.sv} ref={setEl('sig1')}>7</span></div>
                  <div className={s.sig} data-sig="2"><span className={s.sled} /><span className={s.sn}>status_aging</span><span className={s.sv} ref={setEl('sig2')}>3</span></div>
                  <div className={s.sig} data-sig="3"><span className={s.sled} /><span className={s.sn}>graph_health</span><span className={s.sv} ref={setEl('sig3')}>94</span></div>
                  <div className={s.sig} data-sig="4"><span className={s.sled} /><span className={s.sn}>knowledge_gap</span><span className={s.sv} ref={setEl('sig4')}>12</span></div>
                </div>
                <div className={s['sig-note']}>graph_health = god-notes · hub-overload · echo-chambers / knowledge_gap = 끊긴 wikilink 랭킹 → <b>다음에 쓸 것</b>. 측정은 자동, 판결은 아님.</div>
              </div>

              <div className={`${s.vcard} ${s.wide2}`}>
                <div className={s.vch}><span className={s.vt}>INSTRUCTION REVIEW PROTOCOL · audit append-only</span><span className={`${s.vp} ${s.amber}`} ref={setEl('auditPin')}>HUMAN-REVIEW</span></div>
                <div className={s['audit-feed']} ref={setEl('auditFeed')} />
                <div className={s['sig-note']}>stale 규칙은 <b>절대 조용히 수정 안 함</b> → 000_System/audits/instruction-review.md 에 append. [llm] 제안 vs [auto] 감지 — 처분은 사람이.</div>
              </div>
            </div>
          </section>
        </div>

        <div className={s.footer}>
          <div className={s.who}>Boule Governance Doctrine
            <small>경계 설계 → 인간 게이트 → fail-closed 복귀 · 이벤트 소싱 단일 진실원천</small>
          </div>
          <div className={s.impact}>
            <div className={s.imp}><b>FAIL-CLOSED</b><span>autonomy 기본값</span></div>
            <div className={s.imp}><b>48/48</b><span>vault-lint 게이트</span></div>
            <div className={s.imp}><b>1-SSOT</b><span>AGENTS.md 단일원천</span></div>
            <div className={s.imp}><b>append-only</b><span>이벤트 · 감사 로그</span></div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
