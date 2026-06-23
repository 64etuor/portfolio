// Decision OS — pure helper functions extracted from Scene.tsx
// All functions depend only on their arguments and imported constants/data.

import { NODES, rawScore, capScore, CAP_THRESHOLD, type NodeT, type RankRow } from './data'
import { NODE_W, NODE_H, GAP_Y, COL_X } from './constants'

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
