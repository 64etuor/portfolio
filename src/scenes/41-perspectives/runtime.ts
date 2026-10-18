import type React from 'react'
import { buildLayout, panEnv, PAN_IN_W, PAN_SPAN } from './draw'
import type { LayoutState, ProcNode, Screen } from './types'
import { setStyles } from '../legacy-style'

export const labUrl = (file: string) => (file.startsWith('/') ? file : `/lab/${file}`)
/** Static stand-in for a panel's lab page (see make-posters.mjs). */
export const posterUrl = (file: string, locale: 'ko' | 'en') => `/lab/posters/${file.replace(/\.html$/, '')}.${locale}.jpg`
export const makeProcNodes = (count: number): ProcNode[] =>
  Array.from({ length: count }, () => ({ root: null, scr: null, iframe: null, live: false, shown: false, timer: 0 }))

/** live iframe → poster crossfade (ms); keep in step with `.scr iframe` transition in scene.module.css */
const FADE_MS = 220
/** after the iframe's `load`, let its first frames (and the localizer) land before revealing it */
const SETTLE_MS = 140

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

function clearTimer(p: ProcNode) {
  if (p.timer) window.clearTimeout(p.timer)
  p.timer = 0
}

/** Load the panel's lab page; it fades in over its poster once it has painted. */
function goLive(p: ProcNode, file: string) {
  const fr = p.iframe
  if (!fr || p.live) return
  clearTimer(p)
  p.live = true
  p.shown = false
  fr.onload = () => {
    if (!p.live || fr.src === 'about:blank') return
    clearTimer(p)
    p.timer = window.setTimeout(() => {
      p.timer = 0
      if (!p.live) return
      p.shown = true
      fr.style.opacity = '1'
    }, SETTLE_MS)
  }
  fr.src = labUrl(file)
}

/**
 * Drop the panel back to its poster. `fade` crossfades the live page out first
 * (it keeps running for FADE_MS); otherwise the document is torn down at once.
 */
function goPoster(p: ProcNode, fade: boolean) {
  const fr = p.iframe
  if (!fr) return
  if (!p.live) {
    // Already a poster — or still fading out, which a hard request cuts short.
    if (p.timer && !fade) {
      clearTimer(p)
      fr.src = 'about:blank'
    }
    return
  }
  const wasShown = p.shown
  p.live = false
  p.shown = false
  clearTimer(p)
  fr.style.opacity = '0'
  if (fade && wasShown) {
    p.timer = window.setTimeout(() => {
      p.timer = 0
      if (!p.live) fr.src = 'about:blank'
    }, FADE_MS)
  } else {
    fr.src = 'about:blank'
  }
}

/** True while a panel's live page is still fading out (its document is alive). */
const draining = (p: ProcNode) => !p.live && p.timer !== 0

/**
 * Tear down every live iframe on a side immediately (pause, unmount, or the shot's
 * last ~1.5 s). Each loaded iframe is its own document with its own rAF loop that
 * ticks regardless of this scene's `running`, so they must not outlive the moment
 * the film needs the main thread to stage / paint the next shot.
 */
export function unloadAll(nodes: ProcNode[]) {
  for (const p of nodes) goPoster(p, false)
}

/**
 * The panel that owns the single live iframe at loop phase f: each panel from the
 * start of its own fade-in until the next panel on its side starts fading in (the
 * last one until its envelope ends). Both sides' windows are disjoint in f, so at
 * most one panel scene-wide is live; the crossfades between neighbours run on the
 * outgoing / incoming panels' posters.
 */
export function liveIndex(f: number, cOf: (i: number) => number, count: number) {
  for (let i = 0; i < count; i++) {
    const a = cOf(i) - PAN_IN_W
    const b = i + 1 < count ? cOf(i + 1) - PAN_IN_W : a + PAN_SPAN
    if (f >= a && f < b) return i
  }
  return -1
}

/**
 * Per-frame panel sync: opacity from the pan envelope (unchanged), plus the live
 * iframe for the focused panel when `allowLive`. Panels otherwise show their poster.
 */
export function syncSide(nodes: ProcNode[], set: Screen[], cOf: (i: number) => number, gate: number, f: number, allowLive: boolean, othersDraining: boolean) {
  const live = allowLive ? liveIndex(f, cOf, nodes.length) : -1
  for (let i = 0; i < nodes.length; i++) {
    if (i !== live) goPoster(nodes[i], allowLive)
  }
  // Hold the incoming page until the outgoing one has finished its fade-out, so two
  // documents never run at once.
  if (live >= 0 && !set[live].still && !othersDraining && !nodes.some((p, i) => i !== live && draining(p))) goLive(nodes[live], set[live].file)
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (node.root) node.root.style.opacity = (panEnv(f, cOf(i)) * gate).toFixed(3)
  }
}

export const anyDraining = (nodes: ProcNode[]) => nodes.some(draining)
