// Decision OS — pure helper functions extracted from Scene.tsx
// All functions depend only on their arguments and imported constants/data.

import {
  NODES,
  HIDDEN_EDGES,
  LEDGER,
  PRESERVED,
  CTX,
  rawScore,
  capScore,
  tsToMin,
  CAP_THRESHOLD,
  type NodeT,
  type RankRow,
} from './data'
import { SVGNS, NODE_W, NODE_H, GAP_Y, COL_X } from './constants'
import type { SceneCtx, SceneState } from './types'

/* ── Color palette per node state ── */
export function gColor(n: NodeT): { stroke: string; txt: string; fill: string } {
  if (n.state === 'decided') return { stroke: '#1f6058', txt: '#4fd6c8', fill: '#0c1a1a' }
  if (n.state === 'deferred') return { stroke: '#5a4a2a', txt: '#e6a64b', fill: '#19150d' }
  return { stroke: '#30405a', txt: '#9fb0c4', fill: '#0e141d' } // proposed
}

/* ── Position maps ── */
export function treePositions(): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}
  NODES.forEach((n, i) => {
    const col = i % 2
    pos[n.id] = { x: COL_X[col], y: 26 + n.row * GAP_Y }
  })
  return pos
}

export function rankPositions(ranking: { rows: RankRow[] }): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {}
  ranking.rows.forEach((r, i) => {
    const col = i % 2
    pos[r.n.id] = { x: COL_X[col], y: 26 + i * GAP_Y }
  })
  return pos
}

/* ── Live ledger entry templates ── */
export type LiveEntry = { kind: string; node: string; msg: string }

export const LIVE_TEMPLATES: (() => LiveEntry)[] = [
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

/* ── Title word-wrap helper ── */
export function wrapTitle(title: string): { line1: string; line2: string } {
  const line1 = title.length > 20 ? title.slice(0, 20) : title
  const line2 = title.length > 20 ? title.slice(20, 40) + (title.length > 40 ? '…' : '') : ''
  return { line1, line2 }
}

/* ── Node center point ── */
export function nodeCenter(positions: Record<string, { x: number; y: number }>, id: string): { x: number; y: number } {
  return { x: positions[id].x + NODE_W / 2, y: positions[id].y + NODE_H / 2 }
}

/* ════════════════════════════════════════════════════════════════
   DOM BUILDERS — moved verbatim from Scene.tsx. They read all view
   state through the explicit `state` arg (no captured closures) and
   query the DOM through the `ctx` arg. Output is identical.
   ════════════════════════════════════════════════════════════════ */

/* ---------- DAG GEOMETRY / RENDER ---------- */
export function renderDAG(ctx: SceneCtx, state: SceneState, onSelect: (id: string) => void) {
  const { $svg } = ctx
  const { positions, selId, viewMode, tx, ty, scale } = state
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

  const center = (id: string) => nodeCenter(positions, id)

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
      onSelect(n.id)
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
    const { line1, line2 } = wrapTitle(n.title)
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

/* ---------- DETAIL PANEL POPULATION ---------- */
// Pure DOM write of the node-detail panel. The orchestrator (Scene.tsx) handles
// selId mutation + re-render + rank highlight; this only paints the panel.
export function populateDetail(ctx: SceneCtx, id: string, curCtx: string, lastRanking: { rows: RankRow[]; hash: string }) {
  const { $ } = ctx
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
}

/* ---------- PIPELINE / RANK TABLE ---------- */
export function renderRank(ctx: SceneCtx, selId: string, ranking: { rows: RankRow[]; hash: string }, onSelect: (id: string) => void) {
  const { $ } = ctx
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
  body.querySelectorAll<HTMLElement>('.rrow').forEach((rowEl) => rowEl.addEventListener('click', () => onSelect(rowEl.dataset.id!)))
  $('#detHash')!.textContent = ranking.hash
}

export function highlightRank(ctx: SceneCtx, selId: string) {
  ctx.root.querySelectorAll<HTMLElement>('#rankBody .rrow').forEach((r) => r.classList.toggle('sel', r.dataset.id === selId))
}

/* ---------- LEDGER + PRESERVED ---------- */
export function renderLedger(ctx: SceneCtx) {
  const { $ } = ctx
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

/* ---------- CONTEXT SELECTOR (DOM paint only) ---------- */
// Paints the context panel for context `c`. The orchestrator owns curCtx and
// re-selects the node afterward.
export function renderContext(ctx: SceneCtx, c: string) {
  const { $, root } = ctx
  const def = CTX[c]
  root.querySelectorAll<HTMLElement>('#cynefinSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === c))
  $('#ctxPin')!.textContent = def.pin
  $('#staceyTxt')!.innerHTML = def.stacey
  $('#ctxDomain')!.innerHTML = def.domains.map((d) => `<div class="ctx-dom ${d.act ? 'act' : ''}"><div class="dn">${d.n}</div><div class="dd">${d.d}</div></div>`).join('')
  $('#stackFlow')!.innerHTML = def.stack
    .map((l, i) => {
      const hot = l === def.hot
      return `<span class="lyr ${hot ? 'hot' : ''}">${l}</span>` + (i < def.stack.length - 1 ? `<span class="arr">→</span>` : '')
    })
    .join('')
}
