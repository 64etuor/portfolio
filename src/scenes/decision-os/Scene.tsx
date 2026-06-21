'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  CAP_THRESHOLD,
  CTX,
  HIDDEN_EDGES,
  LEDGER,
  NODES,
  PRESERVED,
  capScore,
  computeRanking,
  rawScore,
  tsToMin,
  type NodeT,
  type RankRow,
} from './data'

/* ════════════════════════════════════════════════════════════════
   Decision OS — 가치 변위 콘솔  (decision-os.html 이식 / 레퍼런스 포팅)
   DAG = SSOT, tree = projection. Deterministic Gate→Score→Cap→Tiebreaker.
   캔버스가 없는 DOM/SVG 중심 인터랙티브 씬 — 스펙 규칙 6에 따라 복잡한 빌드 DOM 을
   ref 컨테이너 안에서 imperative 로 유지. 하네스(useSceneCanvas) 대신 SceneHost +
   effect 로 마운트하고, running=false 시 모든 루프를 정리한다.
   값은 결정론적(같은 입력=같은 출력). 라이브 느낌은 RUN 스윕·레저 스트림·노드
   하트비트로만 — 수치/카피/색/모션 원본과 동일.
   ════════════════════════════════════════════════════════════════ */

const SVGNS = 'http://www.w3.org/2000/svg'
const NODE_W = 176,
  NODE_H = 58,
  GAP_Y = 78,
  COL_X = [120, 470]
const MAX_LIVE_ENTRIES = 28

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  useSceneReady(onReady)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !running) return

    const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T | null
    const $svg = $<SVGSVGElement>('#dagSvg')!
    const shell = $('#canvasShell')!

    /* ---------- DAG GEOMETRY / STATE ---------- */
    let viewMode: 'tree' | 'rank' = 'tree'
    let selId = 'D-05'
    let tx = 0,
      ty = 0,
      scale = 1
    let curCtx = 'complicated'
    let lastRanking = computeRanking()

    function treePositions() {
      const pos: Record<string, { x: number; y: number }> = {}
      NODES.forEach((n, i) => {
        const col = i % 2
        pos[n.id] = { x: COL_X[col], y: 26 + n.row * GAP_Y }
      })
      return pos
    }
    function rankPositions(ranking: { rows: RankRow[] }) {
      const pos: Record<string, { x: number; y: number }> = {}
      ranking.rows.forEach((r, i) => {
        const col = i % 2
        pos[r.n.id] = { x: COL_X[col], y: 26 + i * GAP_Y }
      })
      return pos
    }
    let positions = treePositions()

    function gColor(n: NodeT) {
      if (n.state === 'decided') return { stroke: '#1f6058', txt: '#4fd6c8', fill: '#0c1a1a' }
      if (n.state === 'deferred') return { stroke: '#5a4a2a', txt: '#e6a64b', fill: '#19150d' }
      return { stroke: '#30405a', txt: '#9fb0c4', fill: '#0e141d' } // proposed
    }

    function renderDAG() {
      while ($svg.firstChild) $svg.removeChild($svg.firstChild)
      const defs = document.createElementNS(SVGNS, 'defs')
      defs.innerHTML = `
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#2c3c52"/>
        </marker>`
      $svg.appendChild(defs)

      const rootG = document.createElementNS(SVGNS, 'g')
      rootG.setAttribute('id', 'viewport')
      rootG.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`)
      $svg.appendChild(rootG)

      const edgeLayer = document.createElementNS(SVGNS, 'g')
      const nodeLayer = document.createElementNS(SVGNS, 'g')
      rootG.appendChild(edgeLayer)
      rootG.appendChild(nodeLayer)

      const center = (id: string) => ({ x: positions[id].x + NODE_W / 2, y: positions[id].y + NODE_H / 2 })

      // dependency edges (solid)
      NODES.forEach((n) =>
        n.deps.forEach((d) => {
          const a = center(d),
            b = center(n.id)
          const p = document.createElementNS(SVGNS, 'path')
          const my = (a.y + b.y) / 2
          p.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`)
          p.setAttribute('fill', 'none')
          p.setAttribute('stroke', selId === n.id || selId === d ? '#4fd6c8' : '#243043')
          p.setAttribute('stroke-width', selId === n.id || selId === d ? '1.8' : '1.2')
          p.setAttribute('marker-end', 'url(#arr)')
          p.setAttribute('opacity', selId === n.id || selId === d ? '0.95' : '0.55')
          edgeLayer.appendChild(p)
        })
      )
      // hidden dependency edges (dashed amber)
      HIDDEN_EDGES.forEach(([from, to]) => {
        const a = center(to),
          b = center(from)
        const p = document.createElementNS(SVGNS, 'path')
        const my = (a.y + b.y) / 2
        p.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`)
        p.setAttribute('fill', 'none')
        p.setAttribute('stroke', '#5a4a2a')
        p.setAttribute('stroke-width', '1.3')
        p.setAttribute('stroke-dasharray', '4 4')
        p.setAttribute('opacity', '0.8')
        edgeLayer.appendChild(p)
      })

      // nodes
      NODES.forEach((n) => {
        const p = positions[n.id]
        const c = gColor(n)
        const g = document.createElementNS(SVGNS, 'g')
        g.setAttribute('transform', `translate(${p.x},${p.y})`)
        g.style.cursor = 'pointer'
        g.addEventListener('click', (e) => {
          e.stopPropagation()
          selectNode(n.id)
        })

        const sel = selId === n.id
        const rect = document.createElementNS(SVGNS, 'rect')
        rect.setAttribute('width', String(NODE_W))
        rect.setAttribute('height', String(NODE_H))
        rect.setAttribute('rx', '10')
        rect.setAttribute('fill', c.fill)
        rect.setAttribute('stroke', sel ? '#4fd6c8' : c.stroke)
        rect.setAttribute('stroke-width', sel ? '2' : '1.2')
        rect.setAttribute('filter', sel ? 'drop-shadow(0 0 14px rgba(79,214,200,.45))' : '')
        g.appendChild(rect)

        // type-1 left bar
        const bar = document.createElementNS(SVGNS, 'rect')
        bar.setAttribute('x', '0')
        bar.setAttribute('y', '0')
        bar.setAttribute('width', '4')
        bar.setAttribute('height', String(NODE_H))
        bar.setAttribute('rx', '2')
        bar.setAttribute('fill', n.type === 'type1' ? '#9f86e6' : '#5aa9e6')
        g.appendChild(bar)

        const idt = document.createElementNS(SVGNS, 'text')
        idt.setAttribute('x', '13')
        idt.setAttribute('y', '18')
        idt.setAttribute('fill', c.txt)
        idt.setAttribute('font-family', 'var(--mono)')
        idt.setAttribute('font-size', '10')
        idt.setAttribute('font-weight', '700')
        idt.setAttribute('letter-spacing', '.5')
        idt.textContent = `${n.id} · ${n.type.toUpperCase()}`
        g.appendChild(idt)

        // title (wrapped to 2 lines)
        const words = n.title
        const line1 = words.length > 20 ? words.slice(0, 20) : words
        const line2 = words.length > 20 ? words.slice(20, 40) + (words.length > 40 ? '…' : '') : ''
        const t1 = document.createElementNS(SVGNS, 'text')
        t1.setAttribute('x', '13')
        t1.setAttribute('y', '35')
        t1.setAttribute('fill', '#e8eef6')
        t1.setAttribute('font-family', 'var(--sans)')
        t1.setAttribute('font-size', '11.5')
        t1.setAttribute('font-weight', '600')
        t1.textContent = line1
        g.appendChild(t1)
        if (line2) {
          const t2 = document.createElementNS(SVGNS, 'text')
          t2.setAttribute('x', '13')
          t2.setAttribute('y', '49')
          t2.setAttribute('fill', '#9fb0c4')
          t2.setAttribute('font-family', 'var(--sans)')
          t2.setAttribute('font-size', '11.5')
          t2.setAttribute('font-weight', '500')
          t2.textContent = line2
          g.appendChild(t2)
        }
        // state dot
        const dot = document.createElementNS(SVGNS, 'circle')
        dot.setAttribute('cx', String(NODE_W - 13))
        dot.setAttribute('cy', '15')
        dot.setAttribute('r', '4.5')
        dot.setAttribute('fill', c.txt)
        g.appendChild(dot)

        // rank badge (visible in rank mode)
        if (viewMode === 'rank' && n._rank) {
          const rb = document.createElementNS(SVGNS, 'text')
          rb.setAttribute('x', String(NODE_W - 13))
          rb.setAttribute('y', String(NODE_H - 9))
          rb.setAttribute('text-anchor', 'end')
          rb.setAttribute('fill', '#4fd6c8')
          rb.setAttribute('font-family', 'var(--mono)')
          rb.setAttribute('font-size', '13')
          rb.setAttribute('font-weight', '700')
          rb.textContent = `#${n._rank}`
          g.appendChild(rb)
        }

        nodeLayer.appendChild(g)
      })
    }

    /* ---------- DETAIL PANEL ---------- */
    function selectNode(id: string) {
      selId = id
      const n = NODES.find((x) => x.id === id)!
      $('#detId')!.innerHTML = `decision · <b>${n.id}</b> · row ${n.row}`
      $('#detTitle')!.textContent = n.title
      // pills
      const pills = $('#detPills')!
      const typeCls = n.type === 'type1' ? 'type1' : 'type2'
      const typeLab = n.type === 'type1' ? 'TYPE-1 비가역' : 'TYPE-2 가역'
      const stMap: Record<string, [string, string]> = {
        decided: ['dec', 'DECIDED'],
        deferred: ['def', 'DEFERRED'],
        proposed: ['', 'PROPOSED'],
      }
      const [sc, sl] = stMap[n.state]
      pills.innerHTML =
        `<span class="pill ${typeCls}">${typeLab}</span>` +
        `<span class="pill ${sc}">${sl}</span>` +
        `<span class="pill">deps: ${n.deps.length ? n.deps.join(', ') : '—'}</span>`
      $('#detDesc')!.textContent = n.desc
      // value displacement
      $('#vdPos')!.innerHTML = n.pos.map((x) => `<li>${x}</li>`).join('')
      $('#vdNeg')!.innerHTML = n.neg.map((x) => `<li>${x}</li>`).join('')
      // magnitude = scale × reversibility
      const scaleV = Math.round(n.axes.dep * 0.5 + n.axes.info * 0.5) // breadth of impact
      const revV = n.axes.irr // irreversibility magnitude
      const magnitude = Math.round((scaleV / 100) * (revV / 100) * 100)
      const magScaleEl = $('#magScale')!
      const magRevEl = $('#magRev')!
      magScaleEl.style.width = scaleV + '%'
      magScaleEl.dataset.base = String(scaleV)
      magRevEl.style.width = revV + '%'
      magRevEl.dataset.base = String(revV)
      $('#magScaleN')!.textContent = String(scaleV)
      $('#magRevN')!.textContent = String(revV)
      $('#magVal')!.textContent = String(magnitude)
      // 5 axes
      const axDefs: [string, string, keyof NodeT['axes'], boolean][] = [
        ['information_gain', '정보 이득', 'info', false],
        ['irreversibility_risk', '비가역 위험', 'irr', true],
        ['dependency_enablement', '의존성 enable', 'dep', false],
        ['deadline_pressure', '마감 압력', 'ddl', false],
        ['evidence_readiness', '증거 준비도', 'ev', false],
      ]
      const axEl = $('#axes')!
      axEl.innerHTML = axDefs
        .map(
          ([k, lab, key, danger]) =>
            `<div class="axis ${danger && n.axes[key] >= CAP_THRESHOLD ? 'danger' : ''}">
           <div class="al">${lab}<span>${k}</span></div>
           <div class="at"><div class="afill" data-w="${n.axes[key]}"></div></div>
           <div class="av">${n.axes[key]}</div>
         </div>`
        )
        .join('')
      requestAnimationFrame(() => {
        axEl.querySelectorAll<HTMLElement>('.afill').forEach((f) => {
          f.style.width = f.dataset.w + '%'
          f.dataset.base = f.dataset.w
        })
      })
      // recommendation (context-driven)
      const reco = CTX[curCtx].reco(n)
      $('#recoCtx')!.textContent = CTX[curCtx].label
      $('#recoTxt')!.innerHTML = reco.t
      $('#recoSub')!.textContent = reco.s
      // rank pin
      const r = lastRanking.rows.find((x) => x.n.id === id)
      $('#detRank')!.textContent = r ? `rank #${r.rank}` : 'rank —'
      // re-render to update selection highlight + ledger row highlight
      renderDAG()
      highlightRank()
    }

    /* ---------- PIPELINE / RANK TABLE ---------- */
    function renderRank(ranking: { rows: RankRow[]; hash: string }) {
      const body = $('#rankBody')!
      body.innerHTML = ranking.rows
        .map((r) => {
          const gateCls = r.gate.pass ? 'pass' : 'blk'
          const gateTxt = r.gate.pass ? 'PASS' : 'BLOCK'
          const scv = r.gate.pass ? r.eff.toFixed(1) : '—'
          const cap = r.cap.capped ? `↓${r.cap.from.toFixed(1)}` : '—'
          return `<div class="rrow ${r.n.id === selId ? 'sel' : ''}" data-id="${r.n.id}">
          <span class="pos">${r.rank}</span>
          <span class="nm">${r.n.id} · ${r.n.title.slice(0, 16)}${r.n.title.length > 16 ? '…' : ''}</span>
          <span class="gate ${gateCls}">${gateTxt}</span>
          <span class="sc">${scv}</span>
          <span class="cap">${cap}</span>
        </div>`
        })
        .join('')
      body.querySelectorAll<HTMLElement>('.rrow').forEach((rowEl) => rowEl.addEventListener('click', () => selectNode(rowEl.dataset.id!)))
      $('#detHash')!.textContent = ranking.hash
    }
    function highlightRank() {
      root!.querySelectorAll<HTMLElement>('#rankBody .rrow').forEach((r) => r.classList.toggle('sel', r.dataset.id === selId))
    }

    /* RUN: animate the 4 stages with rAF+dt, then switch DAG to rank-projection */
    let runningRun = false
    let cancelled = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const rafs = new Set<number>()
    function tset(fn: () => void, ms: number) {
      const id = setTimeout(() => {
        timers.delete(id)
        fn()
      }, ms)
      timers.add(id)
      return id
    }
    function rreq(fn: FrameRequestCallback) {
      const id = requestAnimationFrame((ts) => {
        rafs.delete(id)
        fn(ts)
      })
      rafs.add(id)
      return id
    }

    /* rAF-based wait: resolves after `ms` milliseconds, dt-aware, max 300ms dt clamp */
    function waitRAF(ms: number) {
      return new Promise<void>((resolve) => {
        let elapsed = 0,
          last: number | null = null
        function frame(ts: number) {
          if (cancelled) return resolve()
          if (last === null) {
            last = ts
            rreq(frame)
            return
          }
          const dt = Math.min(ts - last, 300)
          elapsed += dt
          last = ts
          if (elapsed >= ms) resolve()
          else rreq(frame)
        }
        rreq(frame)
      })
    }

    /* lerp score display: smoothly animate a numeric text element from `from` to `to` over `ms` */
    function lerpText(el: HTMLElement, from: number, to: number, ms: number, fmt?: (x: number) => string) {
      let start: number | null = null
      function frame(ts: number) {
        if (cancelled) return
        if (!start) start = ts
        const dt = Math.min(ts - start, ms)
        const t = Math.min(dt / ms, 1)
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease-in-out
        const val = from + (to - from) * ease
        el.textContent = fmt ? fmt(val) : val.toFixed(1)
        if (t < 1) rreq(frame)
      }
      rreq(frame)
    }

    async function runScoring() {
      if (runningRun) return
      runningRun = true
      const btn = $('#runBtn')!
      btn.setAttribute('disabled', '')
      const stages = ['st0', 'st1', 'st2', 'st3']
      for (let i = 0; i < stages.length; i++) {
        if (cancelled) break
        const el = $('#' + stages[i])!
        el.classList.add('fire')
        await waitRAF(360)
        if (i > 0) $('#' + stages[i - 1])!.classList.remove('fire')
      }
      $('#' + stages[3])!.classList.remove('fire')
      // recompute (deterministic — identical every run)
      lastRanking = computeRanking()
      lastRanking.rows.forEach((r) => (r.n._rank = r.rank))
      renderRank(lastRanking)
      // project DAG to rank order
      viewMode = 'rank'
      positions = rankPositions(lastRanking)
      tx = 0
      ty = 0
      scale = 1
      renderDAG()
      $('#rankFlag')!.classList.add('show')
      $('#dagHud')!.innerHTML = `RANK projection · det_hash <b>${lastRanking.hash}</b><br>run twice = identical`
      // smooth-lerp score values in rank table
      root!.querySelectorAll<HTMLElement>('#rankBody .sc').forEach((scEl) => {
        const v = parseFloat(scEl.textContent || '')
        if (!isNaN(v)) {
          lerpText(scEl, v * 0.7, v, 500, (x) => x.toFixed(1))
        }
      })
      // refresh selected node's rank pin
      const r = lastRanking.rows.find((x) => x.n.id === selId)
      if (r) $('#detRank')!.textContent = `rank #${r.rank}`
      toast(`RUN 완료 · 결정론적 해시 ${lastRanking.hash}`, '같은 입력 = 같은 출력. 다시 RUN 해도 해시가 동일합니다.', true)
      runningRun = false
      btn.removeAttribute('disabled')
    }

    /* ---------- AUTO-SWEEP LOOP (runs without any interaction) ---------- */
    let autoLoopTimer: ReturnType<typeof setTimeout> | null = null
    function resetToTree() {
      viewMode = 'tree'
      positions = treePositions()
      tx = 0
      ty = 0
      scale = 1
      NODES.forEach((n) => (n._rank = null))
      $('#rankFlag')!.classList.remove('show')
      $('#dagHud')!.innerHTML = 'DAG = SSOT · tree = projection<br>drag=pan · scroll=zoom'
      renderDAG()
    }
    async function autoSweep() {
      if (cancelled) return
      try {
        await runScoring() // Gate→Score→Cap→Tiebreaker animation
        await waitRAF(3500) // hold rank projection so viewer can read it
        if (cancelled) return
        resetToTree() // snap back to dependency tree
        await waitRAF(3000) // pause on tree before next cycle
      } catch {
        runningRun = false
        const b = $('#runBtn')
        if (b) b.removeAttribute('disabled')
      }
      if (cancelled) return
      autoLoopTimer = tset(autoSweep, 600)
    }
    function startAutoLoop() {
      if (autoLoopTimer) clearTimeout(autoLoopTimer)
      autoLoopTimer = tset(autoSweep, 0)
    }

    /* ---------- LIVE LEDGER STREAMING ---------- */
    const LIVE_TEMPLATES: (() => { kind: string; node: string; msg: string })[] = [
      () => {
        const n = NODES[Math.floor(Math.random() * NODES.length)]
        return { kind: 'decided', node: n.id, msg: `Gate PASS · ${n.id} scored ${rawScore(n).toFixed(1)} (cap=${n.axes.irr >= CAP_THRESHOLD ? 'YES' : 'NO'})` }
      },
      () => {
        const n = NODES.filter((x) => x.state === 'decided')[Math.floor(Math.random() * 5)]
        return { kind: 'decided', node: n.id, msg: `Score confirmed · ${n.id} eff=${capScore(n, rawScore(n)).value.toFixed(1)}` }
      },
      () => {
        const n = NODES[Math.floor(Math.random() * NODES.length)]
        return { kind: 'proposed', node: n.id, msg: `Tiebreaker resolved · topo-order enforced (${n.id})` }
      },
      () => {
        const n = NODES.filter((x) => x.state === 'decided')[Math.floor(Math.random() * 5)]
        return { kind: 'decided', node: n.id, msg: `Gate→Score→Cap pipeline: ${n.id} irr=${n.axes.irr} ev=${n.axes.ev}` }
      },
      () => ({ kind: 'proposed', node: 'D-08', msg: 'Value displacement POSITIVE logged: 트레이드오프 명시 완료' }),
      () => ({ kind: 'proposed', node: 'D-06', msg: 'Deferred ≠ pruned — defer trigger set, assumptions preserved' }),
      () => ({ kind: 'decided', node: 'D-03', msg: 'Append-only state: Proposed→Decided (L-new) written to ledger' }),
      () => ({ kind: 'decided', node: 'D-05', msg: 'Pruning BLOCKED: evidence_readiness<85 — engine enforced' }),
      () => ({ kind: 'proposed', node: 'D-07', msg: 'Reconcile check: Last Edited At > Last Agent Sync At — PROTECT' }),
      () => ({ kind: 'decided', node: 'D-04', msg: 'Topo sort stable: dependency-first ordering confirmed' }),
      () => ({ kind: 'decided', node: 'D-01', msg: 'Context lock: COMPLICATED · Pre-mortem flagged as HOT' }),
      () => ({ kind: 'proposed', node: 'D-08', msg: 'Value displacement NEGATIVE logged: 변위 추정 편향 가능성 기록' }),
      () => {
        const n = NODES[Math.floor(Math.random() * NODES.length)]
        const vd = n.pos[Math.floor(Math.random() * n.pos.length)]
        return { kind: 'decided', node: n.id, msg: `VD+ ${n.id}: ${vd.slice(0, 42)}` }
      },
      () => {
        const n = NODES[Math.floor(Math.random() * NODES.length)]
        const vd = n.neg[Math.floor(Math.random() * n.neg.length)]
        return { kind: 'proposed', node: n.id, msg: `VD- ${n.id}: ${vd.slice(0, 42)}` }
      },
    ]
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
        rreq(() =>
          rreq(() => {
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
      _liveTimer = tset(appendLiveLedger, delay)
    }

    /* ---------- NODE PULSE ANIMATION (rAF continuous) ---------- */
    let _pulseRAF: number | null = null
    let _pulseT = 0
    let _pulseLast: number | null = null
    function pulseTick(ts: number) {
      if (cancelled) return
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
      _pulseRAF = rreq(pulseTick)
    }
    function startPulse() {
      if (_pulseRAF) cancelAnimationFrame(_pulseRAF)
      _pulseLast = null
      _pulseRAF = rreq(pulseTick)
    }

    /* ---------- PRUNE (the blocked-action delight) ---------- */
    function attemptPrune() {
      const n = NODES.find((x) => x.id === selId)!
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
      tset(() => {
        el.style.borderColor = ''
        el.style.boxShadow = ''
      }, 900)
    }

    /* ---------- LEDGER + PRESERVED ---------- */
    function renderLedger() {
      const list = $('#ledgerList')!
      list.innerHTML = LEDGER.map((e) => {
        const protectedEdit = e.by === 'human' && tsToMin(e.edited) > tsToMin(e.sync)
        return `<div class="lentry ${e.state}">
          <div class="lr">
            <span class="lid">${e.id}</span>
            <span class="lstate ${e.state}">${e.state}</span>
          </div>
          <div class="ltxt">${e.txt}</div>
          <div class="lmeta">
            <span><b>node</b> ${e.node}</span>
            <span><b>by</b> ${e.by}</span>
            <span><b>edited</b> ${e.edited}</span>
            ${protectedEdit ? `<span style="color:var(--signal)"><b>🛡 protected</b> (edited&gt;sync)</span>` : ''}
          </div>
        </div>`
      }).join('')
      $('#prAssume')!.innerHTML = PRESERVED.assume.map((x) => `<div class="pitem">${x}</div>`).join('')
      $('#prUnknown')!.innerHTML = PRESERVED.unknown.map((x) => `<div class="pitem">${x}</div>`).join('')
      $('#prOpen')!.innerHTML = PRESERVED.open.map((x) => `<div class="pitem">${x}</div>`).join('')
    }

    /* ---------- CONTEXT SELECTOR ---------- */
    function setContext(c: string) {
      curCtx = c
      const ctx = CTX[c]
      root!.querySelectorAll<HTMLElement>('#cynefinSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === c))
      $('#ctxPin')!.textContent = ctx.pin
      $('#staceyTxt')!.innerHTML = ctx.stacey
      $('#ctxDomain')!.innerHTML = ctx.domains.map((d) => `<div class="ctx-dom ${d.act ? 'act' : ''}"><div class="dn">${d.n}</div><div class="dd">${d.d}</div></div>`).join('')
      $('#stackFlow')!.innerHTML = ctx.stack
        .map((l, i) => {
          const hot = l === ctx.hot
          return `<span class="lyr ${hot ? 'hot' : ''}">${l}</span>` + (i < ctx.stack.length - 1 ? `<span class="arr">→</span>` : '')
        })
        .join('')
      if (selId) selectNode(selId)
    }

    /* ---------- PAN / ZOOM ---------- */
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
      tx += dx
      ty += dy
      lastX = e.clientX
      lastY = e.clientY
      const vp = root!.querySelector('#viewport')
      if (vp) vp.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`)
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
      const ns = Math.min(2.2, Math.max(0.5, scale * factor))
      tx = mx - (mx - tx) * (ns / scale)
      ty = my - (my - ty) * (ns / scale)
      scale = ns
      const vp = root!.querySelector('#viewport')
      if (vp) vp.setAttribute('transform', `translate(${tx},${ty}) scale(${scale})`)
    }
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
      toastTimer = tset(() => t.classList.remove('show'), 5200)
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
      viewMode = 'tree'
      positions = treePositions()
      tx = 0
      ty = 0
      scale = 1
      NODES.forEach((n) => (n._rank = null))
      $('#rankFlag')!.classList.remove('show')
      $('#dagHud')!.innerHTML = 'DAG = SSOT · tree = projection<br>drag=pan · scroll=zoom'
      renderDAG()
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
    renderRank(lastRanking)
    renderLedger()
    positions = treePositions()
    renderDAG()
    selectNode(selId)
    tick()
    const clockInterval = setInterval(tick, 1000)
    const startSweepTimer = tset(startAutoLoop, 1800)
    startPulse()
    const liveStartTimer = tset(appendLiveLedger, 2400)

    /* ---------- CLEANUP ---------- */
    return () => {
      cancelled = true
      clearInterval(clockInterval)
      if (autoLoopTimer) clearTimeout(autoLoopTimer)
      if (_liveTimer) clearTimeout(_liveTimer)
      if (toastTimer) clearTimeout(toastTimer)
      if (_pulseRAF) cancelAnimationFrame(_pulseRAF)
      clearTimeout(startSweepTimer)
      clearTimeout(liveStartTimer)
      timers.forEach((t) => clearTimeout(t))
      rafs.forEach((r) => cancelAnimationFrame(r))
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
      <div className="wrap" ref={rootRef}>
        {/* TOP BAR */}
        <div className="topbar">
          <div className="brand">
            <div className="logo">
              <svg viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="9" r="3" fill="#4fd6c8" />
                <circle cx="10" cy="22" r="2.4" fill="#9fb0c4" />
                <circle cx="26" cy="22" r="2.4" fill="#9fb0c4" />
                <circle cx="26" cy="30" r="2" fill="#62768c" />
                <path d="M18 12 L10 19.5 M18 12 L26 19.5 M26 24.4 L26 28" stroke="#1f6058" strokeWidth="1.3" />
              </svg>
            </div>
            <div>
              <h1>
                Decision <b>OS</b> — 가치 변위 콘솔
              </h1>
              <div className="sub">DECISION-TREE ARCHITECT · DAG=SSOT · GATE→SCORE→CAP→TIEBREAKER · DETERMINISTIC</div>
            </div>
          </div>
          <div className="spacer" />
          <div className="stat-strip">
            <div className="chip">
              <span className="dot" />
              nodes <b id="cNodes">8</b>
            </div>
            <div className="chip">
              <span className="dot" />
              edges <b id="cEdges">9</b>
            </div>
            <div className="chip warn">
              <span className="dot" />
              hidden_dep <b id="cHidden">2</b>
            </div>
            <div className="chip">
              ledger <b id="cLedger">6</b>
            </div>
          </div>
          <div className="clock" id="clock">
            --:--:--
          </div>
        </div>

        {/* TENET */}
        <div className="tenet">
          <div className="q">
            &quot;모든 결정은 <em>가치 변위(value displacement)</em>다 — Positive와 Negative를 반드시 명시하고 트레이드오프를 숨기지 마라.&quot;
          </div>
          <div className="by">
            좋은 결정은 결론의 정확성이 아니라,
            <br />
            결정이 놓인 <span style={{ color: 'var(--signal)' }}>구조의 정직함</span>에서 나온다.
          </div>
        </div>

        {/* GRID */}
        <div className="grid">
          {/* CONTEXT SELECTOR */}
          <section className="panel" id="ctx">
            <div className="corner" />
            <div className="ph">
              <span className="tag">STEP 0</span>
              <h2>문제 분류 · 좌표계 설정</h2>
              <span className="pin" id="ctxPin">
                CYNEFIN
              </span>
            </div>
            <div className="ctx-lead">
              첫 결정은 결론이 아니라 문제를 <b>분류</b>하는 것 — 좌표계가 틀리면 이후 분석이 다 무너진다. 컨텍스트를 바꾸면 동일 노드의 권고 경로가 변한다.
            </div>
            <div className="seg" id="cynefinSeg">
              <button data-c="clear">CLEAR</button>
              <button data-c="complicated" className="on">
                COMPLICATED
              </button>
              <button data-c="complex">COMPLEX</button>
              <button data-c="chaotic">CHAOTIC</button>
            </div>
            <div className="ctx-card">
              <div className="k">Stacey · 합의×확실성</div>
              <div className="v" id="staceyTxt">
                합의 높음 · 확실성 중간 → <b>분석적(analyzable)</b> 영역. 전문가 판단 + 모범사례 적용.
              </div>
            </div>
            <div className="ctx-domain" id="ctxDomain" />
            <div className="ctx-stack">
              <div className="stack-lab">의사결정 스택 (레이어드 · 대체 아님)</div>
              <div className="stack-flow" id="stackFlow" />
            </div>
          </section>

          {/* DAG CANVAS */}
          <section className="panel" id="dag">
            <div className="corner" />
            <div className="ph">
              <span className="tag">CANONICAL DAG</span>
              <h2>의사결정 트리 · 의존성(topological) 순서</h2>
            </div>
            <div className="dag-toolbar">
              <button className="btn primary" id="runBtn">
                <span className="led" />
                RUN 스코어링
              </button>
              <button className="btn" id="resetView">
                뷰 리셋
              </button>
              <button className="btn" id="pruneBtn" title="추정 기반 pruning 시도">
                prune (추정)
              </button>
              <div className="dag-legend">
                <span>
                  <i style={{ background: 'var(--signal)' }} />
                  decided
                </span>
                <span>
                  <i style={{ background: 'var(--amber)' }} />
                  deferred
                </span>
                <span>
                  <i style={{ background: 'var(--violet)' }} />
                  type-1(비가역)
                </span>
                <span>
                  <i style={{ background: 'var(--line3)' }} />
                  proposed
                </span>
              </div>
            </div>
            <div className="canvas-shell" id="canvasShell">
              <svg id="dagSvg" />
              <div className="rankflag" id="rankFlag">
                RANK 모드 · y=결정론적 점수순
              </div>
              <div className="canvas-hud" id="dagHud">
                DAG = SSOT · tree = projection
                <br />
                drag=pan · scroll=zoom
              </div>
              <div className="canvas-note">실선 = dependency_edge · 점선 = hidden_dependency_edge (정보손실 추적, 숨기지 않음)</div>
            </div>
          </section>

          {/* DETAIL (spans two rows) */}
          <section className="panel" id="detail">
            <div className="corner" />
            <div className="ph">
              <span className="tag">NODE</span>
              <h2>노드 상세 · 가치 변위 &amp; 스코어</h2>
              <span className="pin" id="detRank">
                rank #1
              </span>
            </div>
            <div className="det-id" id="detId">
              decision · <b>D-—</b>
            </div>
            <div className="det-title" id="detTitle">
              —
            </div>
            <div className="det-state" id="detPills" />
            <div className="det-desc" id="detDesc">
              —
            </div>

            <div className="sect-lab">가치 변위 — Value Displacement</div>
            <div className="vd">
              <div className="vd-col pos">
                <div className="vh">
                  <span className="sgn">▲</span>POSITIVE
                </div>
                <ul id="vdPos" />
              </div>
              <div className="vd-col neg">
                <div className="vh">
                  <span className="sgn">▼</span>NEGATIVE
                </div>
                <ul id="vdNeg" />
              </div>
            </div>

            <div className="sect-lab">Magnitude = Scale × Reversibility</div>
            <div className="mag">
              <div className="mag-top">
                <div className="mf">
                  magnitude = scale <b>×</b> reversibility
                </div>
                <div className="mval">
                  <span id="magVal">—</span>
                  <small> / 100</small>
                </div>
              </div>
              <div className="mag-bars">
                <div className="mbar">
                  <span className="ml">scale</span>
                  <div className="mt">
                    <div className="mfill scale" id="magScale" />
                  </div>
                  <span className="mn" id="magScaleN">
                    —
                  </span>
                </div>
                <div className="mbar">
                  <span className="ml">irreversibility</span>
                  <div className="mt">
                    <div className="mfill rev" id="magRev" />
                  </div>
                  <span className="mn" id="magRevN">
                    —
                  </span>
                </div>
              </div>
            </div>

            <div className="sect-lab">5축 결정론적 스코어</div>
            <div className="axes" id="axes" />

            <div className="sect-lab">권고 경로 — Context-driven</div>
            <div className="reco">
              <div className="rl">
                RECOMMENDATION · <span id="recoCtx">COMPLICATED</span>
              </div>
              <div className="rt" id="recoTxt">
                —
              </div>
              <div className="rsub" id="recoSub">
                —
              </div>
            </div>
          </section>

          {/* PIPELINE */}
          <section className="panel" id="pipe">
            <div className="corner" />
            <div className="ph">
              <span className="tag">DETERMINISTIC</span>
              <h2>Gate → Score → Cap → Tiebreaker</h2>
            </div>
            <div className="pl-lead">
              같은 입력 = 같은 출력. 4단계 결정론적 파이프라인이 노드를 <code>RUN</code> 시 재랭크한다. 두 번 실행해도 해시가 동일하다.
            </div>
            <div className="pl-stages">
              <div className="pl-stage" id="st0">
                <div className="sweep" />
                <div className="si">①</div>
                <div className="sn">GATE</div>
                <div className="sd">사전조건/의존성 충족 검사. 미충족 → 차단</div>
              </div>
              <div className="pl-stage" id="st1">
                <div className="sweep" />
                <div className="si">②</div>
                <div className="sn">SCORE</div>
                <div className="sd">5축 가중합 (고정 가중치)</div>
              </div>
              <div className="pl-stage" id="st2">
                <div className="sweep" />
                <div className="si">③</div>
                <div className="sn">CAP</div>
                <div className="sd">비가역 위험 상한 적용</div>
              </div>
              <div className="pl-stage" id="st3">
                <div className="sweep" />
                <div className="si">④</div>
                <div className="sn">TIEBREAK</div>
                <div className="sd">동점 → 위상순서·ID로 결정론 해소</div>
              </div>
            </div>
            <div className="pl-rank">
              <div className="rh">
                <span className="nm">node</span>
                <span>gate</span>
                <span>score</span>
                <span>cap</span>
              </div>
              <div id="rankBody" />
            </div>
            <div className="pl-foot">
              <span className="hash">det_hash:</span>
              <span id="detHash">—</span>
            </div>
          </section>

          {/* LEDGER */}
          <section className="panel" id="ledg">
            <div className="corner" />
            <div className="ph">
              <span className="tag">APPEND-ONLY</span>
              <h2>Decision Ledger · 인간 편집 보호</h2>
              <span className="pin">NON-OVERWRITING</span>
            </div>
            <div className="ledg-head">
              <div className="lt">
                <b>Proposed</b> → Decided → Superseded
              </div>
              <div className="lt">
                Reconcile <b>before</b> creating
              </div>
              <div className="lt">
                Last Edited At &gt; Last Agent Sync At ⇒ <b>protect</b>
              </div>
            </div>
            <div className="ledg-cols">
              <div className="ledg-list" id="ledgerList" />
              <div className="preserve">
                <div className="pgrp">
                  <div className="ptitle" style={{ color: 'var(--amber)' }}>
                    <span className="d" style={{ background: 'var(--amber)' }} />
                    ASSUMPTIONS
                  </div>
                  <div id="prAssume" />
                </div>
                <div className="pgrp">
                  <div className="ptitle" style={{ color: 'var(--blue)' }}>
                    <span className="d" style={{ background: 'var(--blue)' }} />
                    UNKNOWNS
                  </div>
                  <div id="prUnknown" />
                </div>
                <div className="pgrp">
                  <div className="ptitle" style={{ color: 'var(--violet)' }}>
                    <span className="d" style={{ background: 'var(--violet)' }} />
                    OPEN_QUESTIONS
                  </div>
                  <div id="prOpen" />
                </div>
              </div>
            </div>
            <div className="ledg-banner">
              <span>
                <b>Deferred ≠ pruned.</b> 되돌릴 수 있으면 보류 + 재방문 트리거. 정보 부족해도 멈추지 않고 구조화 보존한다 — Pruning은 <b>확인된 사실로만</b>.
              </span>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <div className="footer">
          <div>
            <div className="fid">Decision OS</div>
            <div className="frole">Canonical DAG harness · 가치 변위 콘솔</div>
          </div>
          <div className="fcontact">
            <span className="fc">
              <span className="d" />
              deterministic engine online
            </span>
          </div>
        </div>

        <div className="toast" id="toast" />
      </div>
    </SceneHost>
  )
}
