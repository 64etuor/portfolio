import { AUDITS, C, NZ_PAIRS, STATUS_LABEL } from './data'
import { statusColor } from './constants'
import type { ElementKey, EventKind, SceneCtx } from './types'

/** elRefs.current[key] 를 가져온다(없으면 null). */
export function get(ctx: SceneCtx, key: ElementKey): HTMLElement | null {
  return ctx.elRefs.current[key] ?? null
}

/** ref 콜백 팩토리 — 엘리먼트를 elRefs 에 등록한다. */
export function setEl(ctx: SceneCtx, key: ElementKey) {
  return (node: HTMLElement | null) => {
    ctx.elRefs.current[key] = node
  }
}

/** setTimeout 등록 + 정리용 추적. */
export function schedule(ctx: SceneCtx, fn: () => void, ms: number): void {
  const id = setTimeout(fn, ms)
  ctx.timeouts.current.push(id)
}

export function evClass(ctx: SceneCtx, type: EventKind): string {
  const s = ctx.s
  return type === 'ok' ? s.okText : s[type]
}

export function ledClass(ctx: SceneCtx, kind: 'ok' | 'amber' | 'rust' | 'dim'): string {
  const s = ctx.s
  return `${s.led} ${s[kind]}`
}

export function setText(ctx: SceneCtx, key: ElementKey, value: string | number): void {
  const el = get(ctx, key)
  if (el) el.textContent = String(value)
}

export function renderFleet(ctx: SceneCtx): void {
  const s = ctx.s
  const el = get(ctx, 'agentList')
  if (!el) return
  el.innerHTML = ''
  ctx.agentsRef.current.forEach((agent, i) => {
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

export function renderReg(ctx: SceneCtx): void {
  const s = ctx.s
  const el = get(ctx, 'regList')
  if (!el) return
  el.innerHTML = ''
  ctx.regsRef.current.forEach((reg) => {
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

export function syncLamps(ctx: SceneCtx): void {
  const state = ctx.stateRef.current
  const gl = get(ctx, 'gateLed')
  const gt = get(ctx, 'gateTxt')
  if (gl) gl.className = ledClass(ctx, state.gateRelease ? 'ok' : 'amber')
  if (gt) {
    gt.textContent = state.gateRelease ? 'RELEASE' : 'HOLD'
    gt.style.color = state.gateRelease ? '' : 'var(--amber)'
  }

  const tl = get(ctx, 'tickLed')
  const tt = get(ctx, 'tickTxt')
  if (tl) tl.className = ledClass(ctx, state.tickerOn ? 'ok' : 'rust')
  if (tt) {
    tt.textContent = state.tickerOn ? 'RUNNING' : 'STOPPED'
    tt.style.color = state.tickerOn ? '' : 'var(--rust)'
  }

  const al = get(ctx, 'autLed')
  const at = get(ctx, 'autTxt')
  if (al) al.className = ledClass(ctx, state.autonomyClosed ? 'ok' : 'amber')
  if (at) {
    at.textContent = state.autonomyClosed ? 'FAIL-CLOSED' : 'OPENED'
    at.style.color = state.autonomyClosed ? 'var(--signal)' : 'var(--amber)'
  }

  const ew = get(ctx, 'envWrite')
  const ep = get(ctx, 'envPrio')
  if (state.autonomyClosed) {
    if (ew) ew.className = ledClass(ctx, 'amber')
    if (ep) ep.className = ledClass(ctx, 'amber')
    setText(ctx, 'envWriteTail', '사람 게이트')
    setText(ctx, 'envPrioTail', '사람 게이트')
  } else {
    if (ew) ew.className = ledClass(ctx, 'ok')
    if (ep) ep.className = ledClass(ctx, 'ok')
    setText(ctx, 'envWriteTail', '개방됨 (승인)')
    setText(ctx, 'envPrioTail', '개방됨 (승인)')
  }
}

export function tickClock(ctx: SceneCtx): void {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  setText(ctx, 'clock', `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
}

export function renderNetZero(ctx: SceneCtx): void {
  const s = ctx.s
  const el = get(ctx, 'nzList')
  if (!el) return
  el.innerHTML = ''
  const pair = NZ_PAIRS[ctx.nzIdx.current % NZ_PAIRS.length]
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

export function cycleNetZero(ctx: SceneCtx): void {
  ctx.nzIdx.current++
  renderNetZero(ctx)
}

export function pushAudit(ctx: SceneCtx, src: string, msg: string, seed: boolean): void {
  const s = ctx.s
  const auditFeed = get(ctx, 'auditFeed')
  if (!auditFeed) return
  const row = document.createElement('div')
  row.className = `${s['audit-row']}${seed ? '' : ` ${s.new}`}`
  row.innerHTML = `<span class="${s.src} ${s[src]}">[${src}]</span><span class="${s.am}">${msg}</span>`
  auditFeed.insertBefore(row, auditFeed.firstChild)
  while (auditFeed.childNodes.length > 5 && auditFeed.lastChild) auditFeed.removeChild(auditFeed.lastChild)
}

export function cycleAudit(ctx: SceneCtx): void {
  const audit = AUDITS[ctx.auditIdx.current % AUDITS.length]
  ctx.auditIdx.current++
  pushAudit(ctx, audit[0], audit[1], false)
}

export function driftSignals(ctx: SceneCtx): void {
  const s = ctx.s
  const ids: ElementKey[] = ['sig0', 'sig1', 'sig2', 'sig3', 'sig4']
  const i = Math.floor(Math.random() * 5)
  const sig = ctx.rootRef.current?.querySelector<HTMLElement>(`.${s.sig}[data-sig="${i}"]`)
  if (sig) {
    sig.classList.add(s.flash)
    schedule(ctx, () => sig.classList.remove(s.flash), 600)
  }
  const el = get(ctx, ids[i])
  if (!el) return
  if (i === 0) el.textContent = `${(1.2 + Math.random() * 0.4).toFixed(1)}k`
  else if (i === 3) el.textContent = String(90 + Math.floor(Math.random() * 9))
  else el.textContent = String(Math.max(0, parseInt(el.textContent || '0', 10) + (Math.random() < 0.5 ? 1 : -1)))
}
