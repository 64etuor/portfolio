// Decision OS — effect runtime helpers extracted from Scene.tsx.
// Provides a tracked timer/rAF registry plus the dt-aware wait/lerp loops and
// the pan/zoom handler factory. Behavior, timing, and dt clamps are identical
// to the originals; the only change is that loop helpers read the live
// `cancelled` flag through a getter so the registry can fully own teardown.

import { ZOOM_MIN, ZOOM_MAX } from './constants'
import { HIDDEN_EDGES, LEDGER, NODES, computeRanking } from './data'
import {
  LIVE_TEMPLATES,
  highlightRank,
  populateDetail,
  rankPositions,
  renderContext,
  renderDAG,
  renderLedger,
  renderRank,
  treePositions,
} from './draw'
import type { SceneState } from './types'
import type { SceneCtx } from './types'
import { HUD_TREE, MAX_LIVE_ENTRIES } from './constants'

/* ── Tracked timer/rAF registry ── */
// Owns every setTimeout/rAF spawned by the loops so cleanup can flush them all.
export class LoopRegistry {
  private timers = new Set<ReturnType<typeof setTimeout>>()
  private rafs = new Set<number>()
  cancelled = false

  tset(fn: () => void, ms: number) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  rreq(fn: FrameRequestCallback) {
    const id = requestAnimationFrame((ts) => {
      this.rafs.delete(id)
      fn(ts)
    })
    this.rafs.add(id)
    return id
  }

  /* rAF-based wait: resolves after `ms` milliseconds, dt-aware, max 300ms dt clamp */
  waitRAF(ms: number) {
    return new Promise<void>((resolve) => {
      let elapsed = 0,
        last: number | null = null
      const frame = (ts: number) => {
        if (this.cancelled) return resolve()
        if (last === null) {
          last = ts
          this.rreq(frame)
          return
        }
        const dt = Math.min(ts - last, 300)
        elapsed += dt
        last = ts
        if (elapsed >= ms) resolve()
        else this.rreq(frame)
      }
      this.rreq(frame)
    })
  }

  /* lerp score display: smoothly animate a numeric text element from `from` to `to` over `ms` */
  lerpText(el: HTMLElement, from: number, to: number, ms: number, fmt?: (x: number) => string) {
    let start: number | null = null
    const frame = (ts: number) => {
      if (this.cancelled) return
      if (!start) start = ts
      const dt = Math.min(ts - start, ms)
      const t = Math.min(dt / ms, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease-in-out
      const val = from + (to - from) * ease
      el.textContent = fmt ? fmt(val) : val.toFixed(1)
      if (t < 1) this.rreq(frame)
    }
    this.rreq(frame)
  }

  /* flush all tracked timers + rAFs (cleanup) */
  flush() {
    this.timers.forEach((t) => clearTimeout(t))
    this.rafs.forEach((r) => cancelAnimationFrame(r))
  }
}

/* ── PAN / ZOOM ── */
// Returns mouse/wheel handlers bound to the canvas shell; they mutate the shared
// `state` (tx/ty/scale) and reposition #viewport in place, exactly as before.
export function createPanZoom(root: HTMLDivElement, shell: HTMLElement, state: SceneState) {
  let dragging = false,
    lastX = 0,
    lastY = 0

  const onMouseDown = (e: MouseEvent) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    shell.classList.add('grabbing')
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX,
      dy = e.clientY - lastY
    state.tx += dx
    state.ty += dy
    lastX = e.clientX
    lastY = e.clientY
    const vp = root.querySelector('#viewport')
    if (vp) vp.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`)
  }
  const onMouseUp = () => {
    dragging = false
    shell.classList.remove('grabbing')
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = shell.getBoundingClientRect()
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    const ns = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, state.scale * factor))
    state.tx = mx - (mx - state.tx) * (ns / state.scale)
    state.ty = my - (my - state.ty) * (ns / state.scale)
    state.scale = ns
    const vp = root.querySelector('#viewport')
    if (vp) vp.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.scale})`)
  }

  return { onMouseDown, onMouseMove, onMouseUp, onWheel }
}

export function createRuntime(root: HTMLDivElement): () => void {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T | null
  const $svg = $<SVGSVGElement>('#dagSvg')!
  const shell = $('#canvasShell')!
  const ctx: SceneCtx = { root, $, $svg }

  const state: SceneState = {
    viewMode: 'tree',
    selId: 'D-05',
    tx: 0,
    ty: 0,
    scale: 1,
    positions: treePositions(),
  }
  let curCtx = 'complicated'
  let lastRanking = computeRanking()

  const reg = new LoopRegistry()

  function selectNode(id: string) {
    state.selId = id
    populateDetail(ctx, id, curCtx, lastRanking)
    renderDAG(ctx, state, selectNode)
    highlightRank(ctx, state.selId)
  }

  let runningRun = false

  async function runScoring() {
    if (runningRun) return
    runningRun = true
    const btn = $('#runBtn')!
    btn.setAttribute('disabled', '')
    const stages = ['st0', 'st1', 'st2', 'st3']
    for (let i = 0; i < stages.length; i++) {
      if (reg.cancelled) break
      const el = $('#' + stages[i])!
      el.classList.add('fire')
      await reg.waitRAF(360)
      if (i > 0) $('#' + stages[i - 1])!.classList.remove('fire')
    }
    $('#' + stages[3])!.classList.remove('fire')
    lastRanking = computeRanking()
    lastRanking.rows.forEach((r) => (r.n._rank = r.rank))
    renderRank(ctx, state.selId, lastRanking, selectNode)
    state.viewMode = 'rank'
    state.positions = rankPositions(lastRanking)
    state.tx = 0
    state.ty = 0
    state.scale = 1
    renderDAG(ctx, state, selectNode)
    $('#rankFlag')!.classList.add('show')
    $('#dagHud')!.innerHTML = `RANK projection · det_hash <b>${lastRanking.hash}</b><br>run twice = identical`
    root.querySelectorAll<HTMLElement>('#rankBody .sc').forEach((scEl) => {
      const v = parseFloat(scEl.textContent || '')
      if (!isNaN(v)) {
        reg.lerpText(scEl, v * 0.7, v, 500, (x) => x.toFixed(1))
      }
    })
    const r = lastRanking.rows.find((x) => x.n.id === state.selId)
    if (r) $('#detRank')!.textContent = `rank #${r.rank}`
    toast(`RUN 완료 · 결정론적 해시 ${lastRanking.hash}`, '같은 입력 = 같은 출력. 다시 RUN 해도 해시가 동일합니다.', true)
    runningRun = false
    btn.removeAttribute('disabled')
  }

  let autoLoopTimer: ReturnType<typeof setTimeout> | null = null
  function resetToTree() {
    state.viewMode = 'tree'
    state.positions = treePositions()
    state.tx = 0
    state.ty = 0
    state.scale = 1
    NODES.forEach((n) => (n._rank = null))
    $('#rankFlag')!.classList.remove('show')
    $('#dagHud')!.innerHTML = HUD_TREE
    renderDAG(ctx, state, selectNode)
  }
  async function autoSweep() {
    if (reg.cancelled) return
    try {
      await runScoring()
      await reg.waitRAF(3500)
      if (reg.cancelled) return
      resetToTree()
      await reg.waitRAF(3000)
    } catch {
      runningRun = false
      const b = $('#runBtn')
      if (b) b.removeAttribute('disabled')
    }
    if (reg.cancelled) return
    autoLoopTimer = reg.tset(autoSweep, 600)
  }
  function startAutoLoop() {
    if (autoLoopTimer) clearTimeout(autoLoopTimer)
    autoLoopTimer = reg.tset(autoSweep, 0)
  }

  let liveSeq = 7
  let liveTimer: ReturnType<typeof setTimeout> | null = null

  function appendLiveLedger() {
    try {
      const tmpl = LIVE_TEMPLATES[Math.floor(Math.random() * LIVE_TEMPLATES.length)]
      const entry = tmpl()
      liveSeq++
      const id = `L-${String(liveSeq).padStart(3, '0')}`
      const now = new Date()
      const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      const list = $('#ledgerList')!
      const div = document.createElement('div')
      div.className = `lentry ${entry.kind}`
      div.style.opacity = '0'
      div.style.transform = 'translateY(-6px)'
      div.style.transition = 'opacity .5s ease, transform .5s ease'
      div.innerHTML = `<div class="lr">
            <span class="lid">${id}</span>
            <span class="lstate ${entry.kind}">${entry.kind}</span>
          </div>
          <div class="ltxt">${entry.msg}</div>
          <div class="lmeta"><span><b>node</b> ${entry.node}</span><span><b>at</b> ${ts}</span><span><b>by</b> engine</span></div>`
      list.insertBefore(div, list.firstChild)
      reg.rreq(() =>
        reg.rreq(() => {
          div.style.opacity = '1'
          div.style.transform = 'translateY(0)'
        })
      )
      while (list.children.length > MAX_LIVE_ENTRIES) {
        list.removeChild(list.lastChild!)
      }
      $('#cLedger')!.textContent = String(LEDGER.length + liveSeq - 6)
    } catch {
      /* swallow — the log stream must never stall */
    }
    const delay = 1200 + Math.random() * 2300
    if (liveTimer) clearTimeout(liveTimer)
    liveTimer = reg.tset(appendLiveLedger, delay)
  }

  let pulseRAF: number | null = null
  let pulseT = 0
  let pulseLast: number | null = null
  function pulseTick(ts: number) {
    if (reg.cancelled) return
    if (pulseLast === null) {
      pulseLast = ts
    }
    const dt = Math.min(ts - pulseLast, 100)
    pulseT += dt
    pulseLast = ts
    const circles = root.querySelectorAll<SVGCircleElement>('#dagSvg circle[cx]')
    circles.forEach((c, i) => {
      const phase = (pulseT / 1000 + i * 0.37) % (Math.PI * 2)
      const alpha = 0.55 + 0.45 * Math.sin(phase)
      c.style.opacity = alpha.toFixed(3)
    })
    pulseRAF = reg.rreq(pulseTick)
  }
  function startPulse() {
    if (pulseRAF) cancelAnimationFrame(pulseRAF)
    pulseLast = null
    pulseRAF = reg.rreq(pulseTick)
  }

  function attemptPrune() {
    const n = NODES.find((x) => x.id === state.selId)!
    if (n.axes.ev < 85 || n.state === 'deferred') {
      toast(
        `⛔ PRUNE BLOCKED · ${n.id}`,
        `추정 기반 pruning 금지 — evidence_readiness=${n.axes.ev} (<85) ${n.state === 'deferred' ? '· 노드가 deferred 상태' : ''}. Pruning은 확인된 사실로만 허용됩니다. Deferred ≠ pruned: 보류 후 재방문 트리거를 거세요.`,
        false
      )
      flashStage('st0')
      return
    }
    toast(
      `PRUNE 허용됨 · ${n.id}`,
      `evidence_readiness=${n.axes.ev} (≥85) — 확인된 사실 기준 충족. 단, 비가역 손실이므로 ledger에 Superseded로 추적됩니다.`,
      true
    )
  }
  function flashStage(id: string) {
    const el = $('#' + id)!
    el.style.borderColor = 'var(--rust)'
    el.style.boxShadow = '0 0 0 1px var(--rust) inset'
    reg.tset(() => {
      el.style.borderColor = ''
      el.style.boxShadow = ''
    }, 900)
  }

  function setContext(c: string) {
    curCtx = c
    renderContext(ctx, c)
    if (state.selId) selectNode(state.selId)
  }

  const { onMouseDown, onMouseMove, onMouseUp, onWheel } = createPanZoom(root, shell, state)
  shell.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  shell.addEventListener('wheel', onWheel, { passive: false })

  let toastTimer: ReturnType<typeof setTimeout> | null = null
  function toast(title: string, sub: string, ok: boolean) {
    const t = $('#toast')!
    t.style.borderLeftColor = ok ? 'var(--signal)' : 'var(--rust)'
    t.innerHTML = `<b style="color:${ok ? 'var(--signal)' : 'var(--rust)'}">${title}</b>${sub ? `<div class="tsub">${sub}</div>` : ''}`
    t.classList.add('show')
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = reg.tset(() => t.classList.remove('show'), 5200)
  }

  function tick() {
    const d = new Date()
    const p = (x: number) => String(x).padStart(2, '0')
    $('#clock')!.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  const runBtn = $('#runBtn')!
  const pruneBtn = $('#pruneBtn')!
  const resetViewBtn = $('#resetView')!
  const onRunClick = () => runScoring()
  const onPruneClick = () => attemptPrune()
  const onResetClick = () => resetToTree()
  runBtn.addEventListener('click', onRunClick)
  pruneBtn.addEventListener('click', onPruneClick)
  resetViewBtn.addEventListener('click', onResetClick)
  const segBtns = Array.from(root.querySelectorAll<HTMLElement>('#cynefinSeg button'))
  const segHandlers = segBtns.map((b) => {
    const h = () => setContext(b.dataset.c!)
    b.addEventListener('click', h)
    return [b, h] as const
  })

  $('#cNodes')!.textContent = String(NODES.length)
  $('#cEdges')!.textContent = String(NODES.reduce((sum, n) => sum + n.deps.length, 0))
  $('#cHidden')!.textContent = String(HIDDEN_EDGES.length)
  $('#cLedger')!.textContent = String(LEDGER.length)

  setContext('complicated')
  renderRank(ctx, state.selId, lastRanking, selectNode)
  renderLedger(ctx)
  state.positions = treePositions()
  renderDAG(ctx, state, selectNode)
  selectNode(state.selId)
  tick()
  const clockInterval = setInterval(tick, 1000)
  const startSweepTimer = reg.tset(startAutoLoop, 1800)
  startPulse()
  const liveStartTimer = reg.tset(appendLiveLedger, 2400)

  return () => {
    reg.cancelled = true
    clearInterval(clockInterval)
    if (autoLoopTimer) clearTimeout(autoLoopTimer)
    if (liveTimer) clearTimeout(liveTimer)
    if (toastTimer) clearTimeout(toastTimer)
    if (pulseRAF) cancelAnimationFrame(pulseRAF)
    clearTimeout(startSweepTimer)
    clearTimeout(liveStartTimer)
    reg.flush()
    shell.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    shell.removeEventListener('wheel', onWheel)
    runBtn.removeEventListener('click', onRunClick)
    pruneBtn.removeEventListener('click', onPruneClick)
    resetViewBtn.removeEventListener('click', onResetClick)
    segHandlers.forEach(([b, h]) => b.removeEventListener('click', h))
    NODES.forEach((n) => (n._rank = null))
  }
}
