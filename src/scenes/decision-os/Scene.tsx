'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import { HIDDEN_EDGES, LEDGER, NODES, computeRanking } from './data'
import { MAX_LIVE_ENTRIES, HUD_TREE } from './constants'
import {
  treePositions,
  rankPositions,
  LIVE_TEMPLATES,
  renderDAG,
  populateDetail,
  renderRank,
  highlightRank,
  renderLedger,
  renderContext,
} from './draw'
import { LoopRegistry, createPanZoom } from './runtime'
import type { SceneCtx, SceneState } from './types'
import { DecisionOSView } from './view'

/* ════════════════════════════════════════════════════════════════
   Decision OS — 가치 변위 콘솔  (decision-os.html 이식 / 레퍼런스 포팅)
   DAG = SSOT, tree = projection. Deterministic Gate→Score→Cap→Tiebreaker.
   캔버스가 없는 DOM/SVG 중심 인터랙티브 씬 — 스펙 규칙 6에 따라 복잡한 빌드 DOM 을
   ref 컨테이너 안에서 imperative 로 유지. 하네스(useSceneCanvas) 대신 SceneHost +
   effect 로 마운트하고, running=false 시 모든 루프를 정리한다.
   값은 결정론적(같은 입력=같은 출력). 라이브 느낌은 RUN 스윕·레저 스트림·노드
   하트비트로만 — 수치/카피/색/모션 원본과 동일.

   이 컴포넌트는 thin orchestrator: 정적 JSX 는 view.tsx, 순수 DOM 빌더는 draw.ts,
   타이머/rAF 루프와 pan/zoom 은 runtime.ts 에 있고, 여기서는 상태(state)와
   콜백을 와이어링한다.
   ════════════════════════════════════════════════════════════════ */

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useSceneReady(onReady)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !running) return

    const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T | null
    const $svg = $<SVGSVGElement>('#dagSvg')!
    const shell = $('#canvasShell')!
    const ctx: SceneCtx = { root, $, $svg }

    /* ---------- DAG GEOMETRY / STATE ---------- */
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

    /* ---------- DETAIL PANEL ---------- */
    function selectNode(id: string) {
      state.selId = id
      populateDetail(ctx, id, curCtx, lastRanking)
      // re-render to update selection highlight + ledger row highlight
      renderDAG(ctx, state, selectNode)
      highlightRank(ctx, state.selId)
    }

    /* RUN: animate the 4 stages with rAF+dt, then switch DAG to rank-projection */
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
      // recompute (deterministic — identical every run)
      lastRanking = computeRanking()
      lastRanking.rows.forEach((r) => (r.n._rank = r.rank))
      renderRank(ctx, state.selId, lastRanking, selectNode)
      // project DAG to rank order
      state.viewMode = 'rank'
      state.positions = rankPositions(lastRanking)
      state.tx = 0
      state.ty = 0
      state.scale = 1
      renderDAG(ctx, state, selectNode)
      $('#rankFlag')!.classList.add('show')
      $('#dagHud')!.innerHTML = `RANK projection · det_hash <b>${lastRanking.hash}</b><br>run twice = identical`
      // smooth-lerp score values in rank table
      root!.querySelectorAll<HTMLElement>('#rankBody .sc').forEach((scEl) => {
        const v = parseFloat(scEl.textContent || '')
        if (!isNaN(v)) {
          reg.lerpText(scEl, v * 0.7, v, 500, (x) => x.toFixed(1))
        }
      })
      // refresh selected node's rank pin
      const r = lastRanking.rows.find((x) => x.n.id === state.selId)
      if (r) $('#detRank')!.textContent = `rank #${r.rank}`
      toast(`RUN 완료 · 결정론적 해시 ${lastRanking.hash}`, '같은 입력 = 같은 출력. 다시 RUN 해도 해시가 동일합니다.', true)
      runningRun = false
      btn.removeAttribute('disabled')
    }

    /* ---------- AUTO-SWEEP LOOP (runs without any interaction) ---------- */
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
        await runScoring() // Gate→Score→Cap→Tiebreaker animation
        await reg.waitRAF(3500) // hold rank projection so viewer can read it
        if (reg.cancelled) return
        resetToTree() // snap back to dependency tree
        await reg.waitRAF(3000) // pause on tree before next cycle
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

    /* ---------- LIVE LEDGER STREAMING ---------- */
    // LIVE_TEMPLATES imported from ./draw
    let _liveSeq = 7
    let _liveTimer: ReturnType<typeof setTimeout> | null = null

    function appendLiveLedger() {
      try {
        const tmpl = LIVE_TEMPLATES[Math.floor(Math.random() * LIVE_TEMPLATES.length)]
        const entry = tmpl()
        _liveSeq++
        const id = `L-${String(_liveSeq).padStart(3, '0')}`
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
        // prepend (newest on top)
        list.insertBefore(div, list.firstChild)
        reg.rreq(() =>
          reg.rreq(() => {
            div.style.opacity = '1'
            div.style.transform = 'translateY(0)'
          })
        )
        // trim overflow (keep append-only feel but cap DOM size)
        while (list.children.length > MAX_LIVE_ENTRIES) {
          list.removeChild(list.lastChild!)
        }
        // update counter chip
        $('#cLedger')!.textContent = String(LEDGER.length + _liveSeq - 6)
      } catch {
        /* swallow — the log stream must never stall */
      }
      // schedule next entry: random 1.2..3.5 s interval (always reschedule, even on error)
      const delay = 1200 + Math.random() * 2300
      if (_liveTimer) clearTimeout(_liveTimer)
      _liveTimer = reg.tset(appendLiveLedger, delay)
    }

    /* ---------- NODE PULSE ANIMATION (rAF continuous) ---------- */
    let _pulseRAF: number | null = null
    let _pulseT = 0
    let _pulseLast: number | null = null
    function pulseTick(ts: number) {
      if (reg.cancelled) return
      if (_pulseLast === null) {
        _pulseLast = ts
      }
      const dt = Math.min(ts - _pulseLast, 100)
      _pulseT += dt
      _pulseLast = ts
      const circles = root!.querySelectorAll<SVGCircleElement>('#dagSvg circle[cx]')
      circles.forEach((c, i) => {
        const phase = (_pulseT / 1000 + i * 0.37) % (Math.PI * 2)
        const alpha = 0.55 + 0.45 * Math.sin(phase)
        c.style.opacity = alpha.toFixed(3)
      })
      _pulseRAF = reg.rreq(pulseTick)
    }
    function startPulse() {
      if (_pulseRAF) cancelAnimationFrame(_pulseRAF)
      _pulseLast = null
      _pulseRAF = reg.rreq(pulseTick)
    }

    /* ---------- PRUNE (the blocked-action delight) ---------- */
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

    /* ---------- CONTEXT SELECTOR ---------- */
    function setContext(c: string) {
      curCtx = c
      renderContext(ctx, c)
      if (state.selId) selectNode(state.selId)
    }

    /* ---------- PAN / ZOOM ---------- */
    const { onMouseDown, onMouseMove, onMouseUp, onWheel } = createPanZoom(root, shell, state)
    shell.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    shell.addEventListener('wheel', onWheel, { passive: false })

    /* ---------- TOAST ---------- */
    let toastTimer: ReturnType<typeof setTimeout> | null = null
    function toast(title: string, sub: string, ok: boolean) {
      const t = $('#toast')!
      t.style.borderLeftColor = ok ? 'var(--signal)' : 'var(--rust)'
      t.innerHTML = `<b style="color:${ok ? 'var(--signal)' : 'var(--rust)'}">${title}</b>${sub ? `<div class="tsub">${sub}</div>` : ''}`
      t.classList.add('show')
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = reg.tset(() => t.classList.remove('show'), 5200)
    }

    /* ---------- CLOCK ---------- */
    function tick() {
      const d = new Date()
      const p = (x: number) => String(x).padStart(2, '0')
      $('#clock')!.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    }

    /* ---------- WIRE UP ---------- */
    const runBtn = $('#runBtn')!
    const pruneBtn = $('#pruneBtn')!
    const resetViewBtn = $('#resetView')!
    const onRunClick = () => runScoring()
    const onPruneClick = () => attemptPrune()
    const onResetClick = () => {
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
    runBtn.addEventListener('click', onRunClick)
    pruneBtn.addEventListener('click', onPruneClick)
    resetViewBtn.addEventListener('click', onResetClick)
    const segBtns = Array.from(root.querySelectorAll<HTMLElement>('#cynefinSeg button'))
    const segHandlers = segBtns.map((b) => {
      const h = () => setContext(b.dataset.c!)
      b.addEventListener('click', h)
      return [b, h] as const
    })

    /* counters */
    $('#cNodes')!.textContent = String(NODES.length)
    $('#cEdges')!.textContent = String(NODES.reduce((sum, n) => sum + n.deps.length, 0))
    $('#cHidden')!.textContent = String(HIDDEN_EDGES.length)
    $('#cLedger')!.textContent = String(LEDGER.length)

    /* ---------- FIRST PAINT ---------- */
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

    /* ---------- CLEANUP ---------- */
    return () => {
      reg.cancelled = true
      clearInterval(clockInterval)
      if (autoLoopTimer) clearTimeout(autoLoopTimer)
      if (_liveTimer) clearTimeout(_liveTimer)
      if (toastTimer) clearTimeout(toastTimer)
      if (_pulseRAF) cancelAnimationFrame(_pulseRAF)
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
  }, [running])

  return (
    <SceneHost className={s.root} bg="#06080c" scroll>
      <DecisionOSView rootRef={rootRef} />
    </SceneHost>
  )
}
