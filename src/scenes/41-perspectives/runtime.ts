import type React from 'react'
import { buildLayout, panEnv } from './draw'
import type { LayoutState, ProcNode, Screen } from './types'
import { setStyles } from '../legacy-style'

export const labUrl = (file: string) => (file.startsWith('/') ? file : `/lab/${file}`)
export const makeProcNodes = (count: number): ProcNode[] => Array.from({ length: count }, () => ({ root: null, scr: null, iframe: null }))

export function layoutSide(nodes: ProcNode[], side: -1 | 1, w: number, h: number, pw: number, ph: number) {
  const left = side < 0 ? w * 0.045 : w - w * 0.045 - pw
  nodes.forEach((p, i) => {
    if (!p.root || !p.scr || !p.iframe) return
    setStyles(p.root, { left: `${left}px`, top: `${h * 0.115 + i * h * 0.158}px`, width: `${pw}px` })
    setStyles(p.scr, { width: `${pw}px`, height: `${ph}px` })
    setStyles(p.iframe, { transform: `scale(${(pw / 1280).toFixed(4)})` })
  })
}

export function syncLayout(fieldNodes: ProcNode[], devNodes: ProcNode[], layoutRef: React.MutableRefObject<LayoutState>, w: number, h: number) {
  const prev = layoutRef.current
  if (prev.w === w && prev.h === h) return prev
  const next = buildLayout(w, h)
  layoutSide(fieldNodes, -1, w, h, next.pw, next.ph)
  layoutSide(devNodes, 1, w, h, next.pw, next.ph)
  layoutRef.current = next
  return next
}

function ensureSrc(p: ProcNode, file: string) {
  if (!p.root || !p.iframe || p.root.dataset.loaded) return
  p.root.dataset.loaded = '1'
  p.iframe.src = labUrl(file)
}

function unloadSrc(p: ProcNode) {
  if (!p.root || !p.iframe || !p.root.dataset.loaded) return
  delete p.root.dataset.loaded
  p.iframe.src = 'about:blank'
}

/**
 * Force every iframe on a side to `about:blank`, regardless of the pan-window gate.
 *
 * This scene's `running` prop only gates its OWN canvas rAF — each loaded iframe is
 * a separate same-origin document with its own independent requestAnimationFrame
 * loop, which keeps consuming the main thread even while this scene is still the
 * film's visible slot. In the film, if the NEXT shot can't paint before this one's
 * manifest end (observed: 30-collision staged but starved of main-thread time by
 * these iframes, revealed ~9s late), that contention is self-reinforcing — the cut
 * that would stop these iframes never arrives because these iframes are part of
 * what's blocking it. Called once this scene detects (via SceneClock) that it has
 * overrun its shot's budget, so the handoff gets a clear thread to finish on.
 */
export function unloadAll(nodes: ProcNode[]) {
  for (const p of nodes) unloadSrc(p)
}

export function syncSide(nodes: ProcNode[], set: Screen[], cOf: (i: number) => number, gate: number, f: number) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const c = cOf(i)
    const nowV = panEnv(f, c)
    const env = nowV * gate
    const soon = panEnv(f + 0.055, c)
    if (nowV > 0.001 || soon > 0.001) ensureSrc(node, set[i].file)
    else unloadSrc(node)
    if (node.root) node.root.style.opacity = env.toFixed(3)
  }
}
