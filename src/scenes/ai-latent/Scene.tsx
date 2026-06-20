'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  DOMS, POINTS, SATELLITES, CROSS_LINKS, PHASE_EMPH, RETRIEVE,
  ANSWERS, QTEXT, LOG_LINES, KEYS, type PhaseKey,
} from './data'

/* ════════════════════════════════════════════════════════════════
   ai-latent — 지식 볼트 의미지도 (BGE-M3 → UMAP → HDBSCAN)
   public/lab/ai-latent.html 이식
   ════════════════════════════════════════════════════════════════ */

/* ── helpers ── */
function rnd(seed: number) {
  const s2 = seed * 9301 + 49297
  return ((s2 % 233280) / 233280)
}

function hexA(c: string, a: number) {
  let h = c.replace('#', '')
  if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function esc(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}

/* ── node type ── */
interface Node {
  dom: string
  label: string
  color: string
  vbx: number; vby: number
  sbx: number; sby: number
  bx: number;  by: number
  phase: number; spd: number
  rad: number
  x: number; y: number
  lit: number
  vx: number; vy: number
  appear: number
  sat: boolean
  appearAt: number
}

interface Link {
  a: number; b: number
  cross: boolean
  lp: number
  emph: number
  emphTarget: number
}

/* ── build nodes (stable, no RNG) ── */
const baseCount = POINTS.length
const ALL = [...POINTS, ...SATELLITES]

function buildNodes(): Node[] {
  return ALL.map((p, i) => {
    const d = DOMS[p[0]]
    const a2 = rnd(i * 7.13) * Math.PI * 2
    const r2 = 0.10 + rnd(i * 3.7) * 0.20
    const ox = Math.cos(a2) * r2, oy = Math.sin(a2) * r2
    const sox = (rnd(i * 2.3) - 0.5) * 0.14, soy = (rnd(i * 6.1) - 0.5) * 0.10
    const isSat = i >= baseCount
    return {
      dom: p[0], label: p[1], color: d.c,
      vbx: d.cx + ox, vby: d.cy + oy,
      sbx: (d.sx !== undefined ? d.sx : d.cx) + sox,
      sby: (d.sy !== undefined ? d.sy : d.cy) + soy,
      bx: d.cx + ox, by: d.cy + oy,
      phase: rnd(i * 1.9) * Math.PI * 2,
      spd: 0.5 + rnd(i * 5.1) * 0.7,
      rad: 2.6 + rnd(i * 2.2) * 1.8,
      x: 0, y: 0,
      lit: 0,
      vx: (rnd(i * 4) * 100) | 0,
      vy: (rnd(i * 8) * 100) | 0,
      appear: 0,
      sat: isSat,
      appearAt: isSat ? 1.30 + (i - baseCount) * 0.50 : 0.05 + i * 0.012,
    }
  })
}

function buildLinks(nodes: Node[]): Link[] {
  const out: Link[] = []
  const has = (a: number, b: number) => out.some((l) => l.a === a && l.b === b)

  Object.keys(DOMS).forEach((dom) => {
    const grp = nodes.map((n, i) => ({ n, i })).filter((o) => o.n.dom === dom)
    grp.forEach((o) => {
      const near = grp
        .filter((p) => p.i !== o.i)
        .map((p) => ({ i: p.i, d: Math.hypot(o.n.vbx - p.n.vbx, o.n.vby - p.n.vby) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      near.forEach((p) => {
        const a = Math.min(o.i, p.i), b = Math.max(o.i, p.i)
        if (!has(a, b)) out.push({ a, b, cross: false, lp: 0, emph: 0, emphTarget: 0 })
      })
    })
  })

  CROSS_LINKS.forEach((pair) => {
    const ai = nodes.findIndex((n) => n.label === pair[0])
    const bi = nodes.findIndex((n) => n.label === pair[1])
    if (ai < 0 || bi < 0) return
    const a = Math.min(ai, bi), b = Math.max(ai, bi)
    const ex = out.find((l) => l.a === a && l.b === b)
    if (ex) ex.cross = true
    else out.push({ a, b, cross: true, lp: 0, emph: 0, emphTarget: 0 })
  })
  return out
}

/* ── token streaming helpers ── */
interface Token { html: string; plain: string }

function chunk(str: string): string[] {
  const res: string[] = []; let buf = ''
  for (const ch of str) {
    buf += ch
    if (ch === ' ' || ch === '\n' || ch === ',' || ch === '.' || ch === '·' || buf.length >= 2) {
      res.push(buf); buf = ''
    }
  }
  if (buf) res.push(buf)
  return res
}

function tokenize(src: string): Token[] {
  const out: Token[] = []; let i = 0
  const push = (html: string, plain: string) => out.push({ html, plain })
  while (i < src.length) {
    if (src.startsWith('**', i)) {
      const end = src.indexOf('**', i + 2); const txt = src.slice(i + 2, end)
      chunk(txt).forEach((c) => push(`<span class="aiLatentEm">${esc(c)}</span>`, c))
      i = end + 2; continue
    }
    if (src.startsWith('[[', i)) {
      const end = src.indexOf(']]', i + 2); const inner = src.slice(i + 2, end)
      const parts = inner.split('|'); const txt = parts[0]; const cite = parts[1] ?? ''
      push(
        `<span class="aiLatentCite" title="출처: ${esc(cite)}">${esc(txt)}<span style="opacity:.6"> ▸${esc(cite.split(' ')[0])}</span></span>`,
        txt,
      )
      i = end + 2; continue
    }
    if (src.startsWith('<<', i)) {
      const end = src.indexOf('>>', i + 2); const txt = src.slice(i + 2, end)
      push(`<span class="aiLatentMetric">${esc(txt)}</span>`, txt)
      i = end + 2; continue
    }
    let next = src.length
    for (const m of ['**', '[[', '<<']) {
      const k = src.indexOf(m, i); if (k >= 0 && k < next) next = k
    }
    const plain = src.slice(i, next)
    chunk(plain).forEach((c) => push(esc(c), c))
    i = next
  }
  return out
}

function norm2px(nx: number, ny: number, W: number, H: number): [number, number] {
  const pad = 58
  const x = pad + (nx * 0.5 + 0.5) * (W - pad * 2)
  const y = pad + (-ny * 0.5 + 0.5) * (H - pad * 2)
  return [x, y]
}

function styleName(v: number) {
  if (v < 0.25) return '[정밀]'
  if (v < 0.55) return '[균형]'
  if (v < 0.8) return '[설명적]'
  return '[자유분방]'
}

/* ════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function Scene({ running = true, onReady }: SceneProps) {
  /* ── overlay refs ── */
  const tpsRef      = useRef<HTMLElement>(null)
  const tcountRef   = useRef<HTMLElement>(null)
  const qtextRef    = useRef<HTMLElement>(null)
  const thinkRef    = useRef<HTMLDivElement>(null)
  const thinkpctRef = useRef<HTMLSpanElement>(null)
  const streamRef   = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)
  const attnRef     = useRef<HTMLDivElement>(null)
  const heatRef     = useRef<HTMLDivElement>(null)
  const attnqRef    = useRef<HTMLSpanElement>(null)
  const retrRef     = useRef<HTMLDivElement>(null)
  const rcountRef   = useRef<HTMLElement>(null)
  const latRef      = useRef<HTMLElement>(null)
  const seedlineRef = useRef<HTMLDivElement>(null)
  const tempValRef  = useRef<HTMLElement>(null)
  const stynameRef  = useRef<HTMLSpanElement>(null)
  const tempInputRef = useRef<HTMLInputElement>(null)
  const liveLogLineRef = useRef<HTMLSpanElement>(null)
  const vsToggleRef  = useRef<HTMLButtonElement>(null)
  const axmodeRef    = useRef<HTMLSpanElement>(null)
  const tipRef       = useRef<HTMLDivElement>(null)
  const tipDomRef    = useRef<HTMLDivElement>(null)
  const tipLabRef    = useRef<HTMLDivElement>(null)
  const tipVecRef    = useRef<HTMLDivElement>(null)
  const latentWrapRef = useRef<HTMLDivElement>(null)

  /* chip button refs — indexed by KEYS order */
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([null, null, null, null, null, null])

  /* ── mutable scene state (stable refs, not re-rendered) ── */
  const nodesRef     = useRef<Node[]>(buildNodes())
  const linksRef     = useRef<Link[]>([])
  const hoverNodeRef = useRef<Node | null>(null)
  const dimFilterRef = useRef<string | null>(null)
  const symMixRef    = useRef(0)
  const symTargetRef = useRef(0)
  const tRef         = useRef(0)          // cumulative draw-time accumulator
  const tempValState = useRef(0.35)
  const runIdRef     = useRef(0)
  const totalTokensRef = useRef(0)
  const streamingRef = useRef(false)
  const cycleIdxRef  = useRef(0)
  const autoCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleHeatTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const logIdxRef    = useRef(0)
  const readyFired   = useRef(false)

  /* ── onReady ── */
  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  /* ── build links once nodes exist ── */
  useEffect(() => {
    linksRef.current = buildLinks(nodesRef.current)
  }, [])

  /* ── canvas draw ── */
  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const W = fr.w, H = fr.h
    const dt = fr.dt > 0 ? fr.dt * 60 : 1   // normalised: 1.0 at 60fps
    tRef.current += 0.006 * dt
    const t = tRef.current

    const nodes = nodesRef.current
    const links = linksRef.current

    g.clearRect(0, 0, W, H)

    /* grid backdrop */
    g.strokeStyle = 'rgba(255,255,255,0.025)'; g.lineWidth = 1
    const step = Math.max(46, W / 22)
    for (let gx = 0; gx < W; gx += step) { g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, H); g.stroke() }
    for (let gy = 0; gy < H; gy += step) { g.beginPath(); g.moveTo(0, gy); g.lineTo(W, gy); g.stroke() }

    /* symMix ease */
    symMixRef.current += (symTargetRef.current - symMixRef.current) * (1 - Math.pow(0.92, dt))
    const symMix = symMixRef.current

    /* node appear */
    nodes.forEach((n) => {
      const want = t >= n.appearAt ? 1 : 0
      n.appear += (want - n.appear) * (1 - Math.pow(0.86, dt))
    })

    /* positions */
    const driftAmt = 0.022 * (1 - symMix * 0.85)
    nodes.forEach((n) => {
      n.bx = n.vbx + (n.sbx - n.vbx) * symMix
      n.by = n.vby + (n.sby - n.vby) * symMix
      const dx = Math.cos(t * n.spd + n.phase) * driftAmt
      const dy = Math.sin(t * n.spd * 0.8 + n.phase) * driftAmt;
      [n.x, n.y] = norm2px(n.bx + dx, n.by + dy, W, H)
    })

    /* cluster hulls */
    Object.keys(DOMS).forEach((dom) => {
      const grp = nodes.filter((n) => n.dom === dom && n.appear > 0.3)
      if (!grp.length) return
      let cx = 0, cy = 0
      grp.forEach((n) => { cx += n.x; cy += n.y })
      cx /= grp.length; cy /= grp.length
      const faded = dimFilterRef.current && dimFilterRef.current !== dom
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 130)
      const col = DOMS[dom].c
      grad.addColorStop(0, hexA(col, faded ? 0.04 : 0.12))
      grad.addColorStop(1, hexA(col, 0))
      g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, 130, 0, 7); g.fill()
      g.font = '10px ui-monospace, monospace'
      g.fillStyle = hexA(col, faded ? 0.22 : 0.78)
      g.fillText(dom, cx - 16, cy - 104)
    })

    /* knowledge edges */
    links.forEach((l) => {
      const A = nodes[l.a], B = nodes[l.b]
      const present = Math.min(A.appear, B.appear)
      const want = present > 0.55 ? 1 : 0
      l.lp += (want - l.lp) * (1 - Math.pow(0.90, dt))
      l.emph += (l.emphTarget - l.emph) * (1 - Math.pow(0.88, dt))
      if (l.lp < 0.012) return
      const faded = dimFilterRef.current && dimFilterRef.current !== A.dom && dimFilterRef.current !== B.dom
      const breathe = 0.84 + Math.sin(t * 1.25 + l.a * 0.7) * 0.16
      const em = l.emph
      const ex = A.x + (B.x - A.x) * l.lp, ey = A.y + (B.y - A.y) * l.lp
      if (l.cross) {
        const a2 = (faded ? 0.05 : (0.13 + 0.27 * em)) * l.lp * breathe
        const grad = g.createLinearGradient(A.x, A.y, B.x, B.y)
        grad.addColorStop(0, hexA(A.color, a2)); grad.addColorStop(1, hexA(B.color, a2))
        g.strokeStyle = grad; g.lineWidth = faded ? 1 : (1.1 + 1.0 * em)
        g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(ex, ey); g.stroke()
        if (l.lp > 0.97 && em > 0.4 && !faded) {
          const tp = (t * 0.45 + l.a * 0.17) % 1
          const px = A.x + (B.x - A.x) * tp, py = A.y + (B.y - A.y) * tp
          const gg = g.createRadialGradient(px, py, 0, px, py, 5)
          gg.addColorStop(0, hexA('#ffffff', 0.55 * em * breathe))
          gg.addColorStop(1, hexA('#ffffff', 0))
          g.fillStyle = gg; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill()
        }
      } else {
        const a2 = (faded ? 0.02 : (0.06 + 0.11 * em)) * l.lp * breathe
        g.strokeStyle = hexA(A.color, a2); g.lineWidth = 1
        g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(ex, ey); g.stroke()
      }
    })

    /* retrieval links */
    nodes.forEach((n) => {
      if (n.lit > 0.01 && n.appear > 0.5) {
        g.strokeStyle = hexA(n.color, 0.5 * n.lit)
        g.lineWidth = 1.3
        g.setLineDash([4, 6]); g.lineDashOffset = -t * 40
        g.beginPath(); g.moveTo(n.x, n.y); g.lineTo(W - 6, n.y * 0.6 + H * 0.2); g.stroke()
        g.setLineDash([])
      }
    })

    /* hover cluster lines */
    const hoverNode = hoverNodeRef.current
    if (hoverNode) {
      nodes.filter((n) => n.dom === hoverNode.dom && n.appear > 0.5).forEach((m) => {
        g.strokeStyle = hexA(hoverNode.color, 0.4); g.lineWidth = 1
        g.beginPath(); g.moveTo(hoverNode.x, hoverNode.y); g.lineTo(m.x, m.y); g.stroke()
      })
    }

    /* points */
    nodes.forEach((n) => {
      if (n.appear < 0.012) return
      const faded = dimFilterRef.current && dimFilterRef.current !== n.dom
      n.lit *= Math.pow(0.96, dt)
      const isHover = n === hoverNode
      const glow = Math.max(n.lit, isHover ? 1 : 0)
      const pop = n.appear < 1 ? n.appear * (2 - n.appear) : 1
      const r = n.rad * (1 + glow * 0.9) * pop
      if (n.sat && n.appear > 0.04 && n.appear < 0.985) {
        g.strokeStyle = hexA(n.color, (1 - n.appear) * 0.6)
        g.lineWidth = 1; g.beginPath()
        g.arc(n.x, n.y, r + (1 - n.appear) * 14, 0, 7); g.stroke()
      }
      if (glow > 0.05) {
        const gg = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5)
        gg.addColorStop(0, hexA(n.color, 0.5 * glow))
        gg.addColorStop(1, hexA(n.color, 0))
        g.fillStyle = gg; g.beginPath(); g.arc(n.x, n.y, r * 5, 0, 7); g.fill()
      }
      g.fillStyle = faded ? hexA(n.color, 0.18) : hexA(n.color, 0.85 * Math.min(1, n.appear + 0.15))
      g.beginPath(); g.arc(n.x, n.y, r, 0, 7); g.fill()
      g.fillStyle = hexA('#ffffff', faded ? 0.1 : 0.5)
      g.beginPath(); g.arc(n.x - r * 0.3, n.y - r * 0.3, r * 0.35, 0, 7); g.fill()
      if ((isHover || n.lit > 0.4) && !faded) {
        g.font = '11px ui-monospace, monospace'
        g.fillStyle = hexA(n.color, 1)
        g.fillText(n.label, n.x + r + 6, n.y + 3)
      }
    })
  }, { running })

  /* ── streaming engine (all imperative, stable refs) ──
     Gated on `running`: when off-screen (running=false) every own
     timer/rAF-free loop and listener is torn down; when back on-screen
     the effect re-runs and reboots identically to a fresh mount. */
  useEffect(() => {
    if (!running) return

    const nodes = nodesRef.current
    const links = linksRef.current

    /* local timer registry for full teardown */
    const timeouts = new Set<ReturnType<typeof setTimeout>>()
    const intervals = new Set<ReturnType<typeof setInterval>>()
    const trackTimeout = (id: ReturnType<typeof setTimeout>) => { timeouts.add(id); return id }
    const trackInterval = (id: ReturnType<typeof setInterval>) => { intervals.add(id); return id }

    /* phase edges */
    function triggerPhaseEdges(key: PhaseKey) {
      links.forEach((l) => { l.emphTarget = 0 })
      const star = new Set<Link>()
      ;(PHASE_EMPH[key] || []).forEach(([a, b]) => {
        const l = links.find((L) => {
          const la = nodes[L.a].label, lb = nodes[L.b].label
          return (la === a && lb === b) || (la === b && lb === a)
        })
        if (l) { l.emphTarget = 1; l.lp = 0; star.add(l) }
      })
      const clusters = new Set<string>()
      ;(RETRIEVE[key] || []).forEach((lab) => {
        const n = nodes.find((x) => x.label.includes(lab) || lab.includes(x.label.split(' ')[0]))
        if (n) clusters.add(n.dom)
      })
      links.forEach((l) => {
        if (star.has(l)) return
        if (!l.cross && clusters.has(nodes[l.a].dom)) {
          l.lp = 0
          l.emphTarget = Math.max(l.emphTarget, 0.5)
        }
      })
    }

    /* retrieve lit */
    function retrieveFor(key: PhaseKey): number {
      const labels = RETRIEVE[key] || []
      labels.forEach((lab, idx) => {
        const match = nodes.filter((n) => n.label.includes(lab) || lab.includes(n.label.split(' ')[0]))
        match.forEach((n) => { trackTimeout(setTimeout(() => { n.lit = 1 }, idx * 180)) })
      })
      return labels.length
    }

    /* heat bars */
    function buildHeat(n: number) {
      const heat = heatRef.current; if (!heat) return
      heat.innerHTML = ''
      for (let k = 0; k < n; k++) {
        const el = document.createElement('i')
        el.style.cssText = 'flex:1;background:var(--signal);border-radius:1px;opacity:.2;transition:height .3s,opacity .3s;height:30%;display:block'
        heat.appendChild(el)
      }
    }

    function pulseHeat() {
      const heat = heatRef.current; if (!heat) return
      const t = tRef.current
      ;[...heat.children].forEach((b, k) => {
        const v = 0.2 + Math.abs(Math.sin(t * 3 + k)) * 0.8 * Math.random()
        ;(b as HTMLElement).style.height = (15 + v * 85) + '%'
        ;(b as HTMLElement).style.opacity = (0.25 + v * 0.75).toFixed(2)
      })
    }

    function idleHeat() {
      const heat = heatRef.current; if (!heat) return
      const t = tRef.current
      ;[...heat.children].forEach((b, k) => {
        const v = 0.5 + Math.sin(t * 1.4 + k * 0.5) * 0.5
        ;(b as HTMLElement).style.height = (15 + v * 30) + '%'
        ;(b as HTMLElement).style.opacity = (0.18 + v * 0.22).toFixed(2)
      })
    }

    idleHeatTimerRef.current = trackInterval(setInterval(idleHeat, 110))

    function speedForTemp() { return 16 + tempValState.current * 30 }
    function wait(ms: number) { return new Promise<void>((r) => trackTimeout(setTimeout(r, ms))) }

    async function runStreamAuto(key: PhaseKey) {
      const my = ++runIdRef.current
      streamingRef.current = true

      if (streamRef.current) streamRef.current.innerHTML = ''
      if (qtextRef.current) qtextRef.current.textContent = QTEXT[key]
      if (attnqRef.current) attnqRef.current.textContent = 'q: ' + QTEXT[key]
      triggerPhaseEdges(key)
      totalTokensRef.current = 0
      if (tcountRef.current) tcountRef.current.textContent = '0'
      if (tpsRef.current) tpsRef.current.textContent = '0.0'
      if (latRef.current) latRef.current.textContent = '--'
      if (rcountRef.current) rcountRef.current.textContent = '0'

      thinkRef.current?.classList.add(s.on)
      retrRef.current?.classList.add(s.on)
      const rN = retrieveFor(key)
      for (let p = 0; p <= 100; p += 8) {
        if (my !== runIdRef.current) return
        if (thinkpctRef.current) thinkpctRef.current.textContent = p + '%'
        await wait(22)
      }
      thinkRef.current?.classList.remove(s.on)
      if (rcountRef.current) rcountRef.current.textContent = String(rN)
      const t0 = performance.now()

      const toks = tokenize(ANSWERS[key])
      buildHeat(Math.min(48, Math.max(24, (toks.length / 3) | 0)))
      attnRef.current?.classList.add(s.on)
      if (idleHeatTimerRef.current) clearInterval(idleHeatTimerRef.current)
      const heatTimer = trackInterval(setInterval(pulseHeat, 90))

      for (let k = 0; k < toks.length; k++) {
        if (my !== runIdRef.current) { clearInterval(heatTimer); return }
        const span = document.createElement('span')
        span.className = 'aiLatentTok'
        span.innerHTML = toks[k].html
        streamRef.current?.appendChild(span)
        totalTokensRef.current++
        if (tcountRef.current) tcountRef.current.textContent = String(totalTokensRef.current)
        const elapsed = (performance.now() - t0) / 1000
        if (tpsRef.current) tpsRef.current.textContent = (totalTokensRef.current / Math.max(elapsed, 0.05)).toFixed(1)
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        let d = speedForTemp()
        if (/[.\n]/.test(toks[k].plain)) d += 140
        d += (Math.random() - 0.5) * tempValState.current * 40
        await wait(Math.max(6, d))
      }

      if (my !== runIdRef.current) { clearInterval(heatTimer); idleHeatTimerRef.current = trackInterval(setInterval(idleHeat, 110)); return }
      clearInterval(heatTimer)
      idleHeatTimerRef.current = trackInterval(setInterval(idleHeat, 110))
      retrRef.current?.classList.remove(s.on)
      streamingRef.current = false
      const finalElapsed = (performance.now() - t0) / 1000
      if (latRef.current) latRef.current.textContent = finalElapsed.toFixed(2) + 's'
      if (tpsRef.current) tpsRef.current.textContent = (totalTokensRef.current / Math.max(finalElapsed, 0.05)).toFixed(1)
      scheduleNextCycle(1600)
    }

    function scheduleNextCycle(delay: number) {
      if (autoCycleTimerRef.current) clearTimeout(autoCycleTimerRef.current)
      autoCycleTimerRef.current = trackTimeout(setTimeout(() => {
        cycleIdxRef.current = (cycleIdxRef.current + 1) % KEYS.length
        const key = KEYS[cycleIdxRef.current]
        chipRefs.current.forEach((b, i) => b?.classList.toggle(s.active, KEYS[i] === key))
        nodes.forEach((n) => { n.lit = 0 })
        runStreamAuto(key)
      }, delay))
    }

    /* chip buttons */
    const chipHandlers: Array<{ btn: HTMLButtonElement; fn: () => void }> = []
    chipRefs.current.forEach((btn, i) => {
      if (!btn) return
      const fn = () => {
        if (autoCycleTimerRef.current) clearTimeout(autoCycleTimerRef.current)
        chipRefs.current.forEach((b) => b?.classList.remove(s.active))
        btn.classList.add(s.active)
        const key = KEYS[i]
        cycleIdxRef.current = i
        nodes.forEach((n) => { n.lit = 0 })
        runStreamAuto(key)
      }
      btn.addEventListener('click', fn)
      chipHandlers.push({ btn, fn })
    })

    /* temp slider */
    const tempInput = tempInputRef.current
    function onTempChange() {
      if (!tempInput) return
      tempValState.current = Number(tempInput.value) / 100
      if (tempValRef.current) tempValRef.current.textContent = tempValState.current.toFixed(2)
      if (stynameRef.current) stynameRef.current.textContent = styleName(tempValState.current)
      if (seedlineRef.current) seedlineRef.current.textContent = `seed 0x59 · top_p ${(0.85 + tempValState.current * 0.12).toFixed(2)}`
    }
    tempInput?.addEventListener('input', onTempChange)

    /* legend filter */
    const wrapEl = latentWrapRef.current
    // hover tooltip
    function onMouseMove(e: MouseEvent) {
      const wrap = latentWrapRef.current; if (!wrap) return
      const r = wrap.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      let best: Node | null = null, bd = 18
      nodes.forEach((n) => {
        if (n.appear < 0.5) return
        const d = Math.hypot(n.x - mx, n.y - my)
        if (d < bd) { bd = d; best = n }
      })
      hoverNodeRef.current = best
      const tipEl = tipRef.current
      const bestNode = best as Node | null
      if (bestNode && tipEl) {
        tipEl.classList.add(s.on)
        const W = wrap.offsetWidth
        tipEl.style.left = Math.min(mx + 16, W - 260) + 'px'
        tipEl.style.top = Math.max(my - 10, 8) + 'px'
        if (tipDomRef.current) {
          tipDomRef.current.textContent = bestNode.dom + ' cluster'
          tipDomRef.current.style.color = bestNode.color
        }
        if (tipLabRef.current) tipLabRef.current.textContent = bestNode.label
        if (tipVecRef.current) tipVecRef.current.textContent = `vec[${bestNode.vx}…${bestNode.vy}] · cos_sim ${(0.6 + rnd(bestNode.vx) * 0.39).toFixed(3)}`
      } else {
        tipEl?.classList.remove(s.on)
      }
    }
    function onMouseLeave() {
      hoverNodeRef.current = null
      tipRef.current?.classList.remove(s.on)
    }
    wrapEl?.addEventListener('mousemove', onMouseMove)
    wrapEl?.addEventListener('mouseleave', onMouseLeave)

    /* vsToggle */
    const vsBtn = vsToggleRef.current
    function onVsToggle() {
      symTargetRef.current = symTargetRef.current ? 0 : 1
      const sym = symTargetRef.current === 1
      vsBtn?.classList.toggle('sym', sym)
      if (axmodeRef.current) {
        axmodeRef.current.textContent = sym ? 'symbol view · 검증가능' : 'vector view'
        axmodeRef.current.style.color = sym ? 'var(--amber)' : 'var(--signal)'
      }
    }
    vsBtn?.addEventListener('click', onVsToggle)

    /* ambient idle glow */
    const idleGlowTimer = trackInterval(setInterval(() => {
      if (streamingRef.current || !nodes.length) return
      const live = nodes.filter((n) => n.appear > 0.6)
      if (!live.length) return
      const n = live[(Math.random() * live.length) | 0]
      n.lit = Math.max(n.lit, 0.55 + Math.random() * 0.35)
    }, 520))

    /* live log */
    function tickLog() {
      const lineEl = liveLogLineRef.current; if (!lineEl) return
      lineEl.style.opacity = '0'
      trackTimeout(setTimeout(() => {
        const raw = LOG_LINES[logIdxRef.current % LOG_LINES.length]
        logIdxRef.current++
        let colored = raw
        if (raw.startsWith('[embed]'))   colored = '<span style="color:var(--c-dev)">[embed]</span>'   + esc(raw.slice(7))
        else if (raw.startsWith('[umap]'))   colored = '<span style="color:var(--c-data)">[umap] </span>'  + esc(raw.slice(6))
        else if (raw.startsWith('[hdbscan]')) colored = '<span style="color:var(--c-ai)">[hdbscan]</span>' + esc(raw.slice(9))
        else if (raw.startsWith('[query]'))  colored = '<span style="color:var(--amber)">[query]</span>'  + esc(raw.slice(7))
        else if (raw.startsWith('[link]'))   colored = '<span style="color:var(--signal)">[link] </span>' + esc(raw.slice(6))
        else if (raw.startsWith('[grow]'))   colored = '<span style="color:var(--c-mfg)">[grow] </span>'  + esc(raw.slice(6))
        lineEl.innerHTML = colored
        lineEl.style.opacity = '1'
        const delay = 1400 + Math.random() * 900
        trackTimeout(setTimeout(tickLog, delay))
      }, 260))
    }
    tickLog()

    /* boot streaming */
    buildHeat(36)
    retrieveFor('who')
    if (rcountRef.current) rcountRef.current.textContent = String(RETRIEVE.who.length)
    runStreamAuto('who')

    return () => {
      runIdRef.current++ // cancel any in-flight stream (stops new timers being queued)
      timeouts.forEach(clearTimeout)
      intervals.forEach(clearInterval)
      timeouts.clear()
      intervals.clear()
      autoCycleTimerRef.current = null
      idleHeatTimerRef.current = null
      wrapEl?.removeEventListener('mousemove', onMouseMove)
      wrapEl?.removeEventListener('mouseleave', onMouseLeave)
      vsBtn?.removeEventListener('click', onVsToggle)
      tempInput?.removeEventListener('input', onTempChange)
      chipHandlers.forEach(({ btn, fn }) => btn.removeEventListener('click', fn))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <SceneHost className={s.root} bg="#07090d" scroll>
      {/* full-page layout — NOT a canvas-only scene */}
      <div className={s.shell}>

        {/* topbar */}
        <header className={s.topbar}>
          <div className={s.brand}>
            <div className={s.logo} />
            <div className={s.brandMeta}>
              <b>Knowledge Vault</b>
              <span>obsidian · 지식 그래프 · 의미 군집</span>
            </div>
          </div>
          <div className={s.toprite}>
            <div className={s.modeltag}>
              <span className={s.dot} />
              semantic_map.py · BGE-M3 → UMAP → HDBSCAN
            </div>
            <div className={s.stat}><b ref={tpsRef}>0.0</b><span>TOKENS / SEC</span></div>
            <div className={s.stat}><b ref={tcountRef}>0</b><span>TOKENS OUT</span></div>
            <div className={s.stat}><b>28</b><span>LAYERS</span></div>
          </div>
        </header>

        <div className={s.grid}>

          {/* LATENT SPACE */}
          <section className={`${s.card} ${s.latentCard}`}>
            <div className={s.cardH}>
              <div className={s.cardHtt}><span className={s.sq} /> semantic_map.py — 학습 노트의 의미 군집화</div>
              <div>BGE-M3 1024d → UMAP 2d · HDBSCAN</div>
            </div>
            <div className={s.latentWrap} ref={latentWrapRef}>
              <canvas ref={ref} className={s.c} />
              <div className={`${s.retrieving}`} ref={retrRef}>
                <div className={s.bars}><i /><i /><i /><i /></div>
                {' '}retrieving context…
              </div>
              <div className={s.axisNote}>
                UMAP dim_0 →<br />
                ↑ UMAP dim_1<br />
                <span style={{ color: 'var(--ink-2)' }}>hover · 노트 탐색</span><br />
                <span className={s.axmode} ref={axmodeRef}>vector view</span>
              </div>
              <button className={s.vsToggle} ref={vsToggleRef} title="분산 표상(vector) ↔ 기호 표상(symbol) 전환">
                vector ↔ symbol
              </button>
              <div className={s.legend}>
                <div className={s.legendRow} onMouseEnter={() => { dimFilterRef.current = '프론트엔드' }} onMouseLeave={() => { dimFilterRef.current = null }}>
                  <span className={s.chip} style={{ background: 'var(--c-data)' }} /> 프론트엔드 <small>TypeScript·React·Next</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { dimFilterRef.current = '데이터/AI' }} onMouseLeave={() => { dimFilterRef.current = null }}>
                  <span className={s.chip} style={{ background: 'var(--c-ai)' }} /> 데이터/AI <small>RAG·GraphRAG·에이전트</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { dimFilterRef.current = '백엔드/인프라' }} onMouseLeave={() => { dimFilterRef.current = null }}>
                  <span className={s.chip} style={{ background: 'var(--c-dev)' }} /> 백엔드/인프라 <small>PostgreSQL·MCP</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { dimFilterRef.current = '제조/도메인' }} onMouseLeave={() => { dimFilterRef.current = null }}>
                  <span className={s.chip} style={{ background: 'var(--c-mfg)' }} /> 제조/도메인 <small>MES·계측·공정제어</small>
                </div>
                <div className={s.legendRow} onMouseEnter={() => { dimFilterRef.current = '철학/원칙' }} onMouseLeave={() => { dimFilterRef.current = null }}>
                  <span className={s.chip} style={{ background: 'var(--c-phil)' }} /> 철학/원칙 <small>제1원칙·크로스도메인</small>
                </div>
              </div>
              <div className={s.tip} ref={tipRef}>
                <div className={s.tipDom} ref={tipDomRef} />
                <div className={s.tipLab} ref={tipLabRef} />
                <div className={s.tipVec} ref={tipVecRef} />
              </div>
            </div>
          </section>

          {/* INFERENCE CONSOLE */}
          <section className={`${s.card} ${s.consoleCard}`}>
            <div className={s.cardH}>
              <div className={s.cardHtt}><span className={s.sq} /> vault.agent — 의미지도 위 추론 스트림</div>
              <div ref={seedlineRef}>retriever cos_sim · top_p 0.92</div>
            </div>
            <div className={s.consoleBody}>
              <div className={s.qLine}>
                <span className={s.qmark}>user&nbsp;❯</span>
                <span className={s.qtext} ref={qtextRef}>이 지도는 무엇인가?</span>
              </div>
              <div className={s.thinking} ref={thinkRef}>
                <span>reasoning</span><div className={s.shimmer} /><span ref={thinkpctRef}>0%</span>
              </div>
              <div className={s.streamScroll} ref={scrollRef}>
                <div className={s.stream} ref={streamRef} />
                <span className={s.caret} />
              </div>
              <div className={s.attn} ref={attnRef}>
                <div className={s.attnLbl}>
                  <span>attention · 토큰별 가중치 (head 3/12)</span>
                  <span ref={attnqRef} />
                </div>
                <div className={s.heat} ref={heatRef} />
              </div>
              <div className={s.controls}>
                <div className={s.chips}>
                  {KEYS.map((key, i) => (
                    <button
                      key={key}
                      className={`${s.chipBtn}${i === 0 ? ' active' : ''}`}
                      ref={(el) => { chipRefs.current[i] = el }}
                    >
                      <span className={s.chipQ}>❯</span>
                      {QTEXT[key]}
                    </button>
                  ))}
                </div>
                <div className={s.ctlRow}>
                  <div className={s.temp}>
                    temp
                    <input type="range" ref={tempInputRef} min={0} max={100} defaultValue={35} />
                    <b ref={tempValRef}>0.35</b>
                    <span className={s.styname} ref={stynameRef}>[균형]</span>
                  </div>
                  <div className={s.runinfo}>
                    <span>retrieved <b ref={rcountRef}>0</b> ctx</span>
                    <span>latency <b ref={latRef}>—</b></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* live log */}
        <div className={s.liveLog}>
          <span className={s.liveBadge}>live</span>
          <span className={s.liveLogLine} ref={liveLogLineRef} />
        </div>

        {/* footer */}
        <footer className={s.footer}>
          <div className={s.footerWho}>
            <b>원칙</b> — 제1원칙으로 사고한다 · 지식을 구조로 만든다 · 도메인을 가로질러 연결한다
          </div>
        </footer>
      </div>
    </SceneHost>
  )
}
