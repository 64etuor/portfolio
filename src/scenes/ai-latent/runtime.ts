import type { MutableRefObject, RefObject } from 'react'
import { ANSWERS, CROSS_LINKS, DOMS, KEYS, LOG_LINES, PHASE_EMPH, QTEXT, RETRIEVE, type PhaseKey } from './data'
import { ALL_POINTS, BASE_COUNT } from './constants'
import type { Link, Node, Token } from './types'
import s from './scene.module.css'

export function rnd(seed: number) {
  const s2 = seed * 9301 + 49297
  return ((s2 % 233280) / 233280)
}

export function esc(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
}

export function buildNodes(): Node[] {
  return ALL_POINTS.map((p, i) => {
    const d = DOMS[p[0]]
    const a2 = rnd(i * 7.13) * Math.PI * 2
    const r2 = 0.10 + rnd(i * 3.7) * 0.20
    const ox = Math.cos(a2) * r2, oy = Math.sin(a2) * r2
    const sox = (rnd(i * 2.3) - 0.5) * 0.14, soy = (rnd(i * 6.1) - 0.5) * 0.10
    const isSat = i >= BASE_COUNT
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
      appearAt: isSat ? 1.30 + (i - BASE_COUNT) * 0.50 : 0.05 + i * 0.012,
    }
  })
}

export function buildLinks(nodes: Node[]): Link[] {
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

export function tokenize(src: string): Token[] {
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


export function styleName(v: number) {
  if (v < 0.25) return '[정밀]'
  if (v < 0.55) return '[균형]'
  if (v < 0.8) return '[설명적]'
  return '[자유분방]'
}

export function triggerPhaseEdges(key: PhaseKey, nodes: Node[], links: Link[]) {
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

interface AiLatentRuntimeParams {
  running: boolean
  nodesRef: MutableRefObject<Node[]>
  linksRef: MutableRefObject<Link[]>
  hoverNodeRef: MutableRefObject<Node | null>
  dimFilterRef: MutableRefObject<string | null>
  symTargetRef: MutableRefObject<number>
  tRef: MutableRefObject<number>
  tempValState: MutableRefObject<number>
  runIdRef: MutableRefObject<number>
  totalTokensRef: MutableRefObject<number>
  streamingRef: MutableRefObject<boolean>
  cycleIdxRef: MutableRefObject<number>
  autoCycleTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  idleHeatTimerRef: MutableRefObject<ReturnType<typeof setInterval> | null>
  logIdxRef: MutableRefObject<number>
  chipRefs: MutableRefObject<(HTMLButtonElement | null)[]>
  tpsRef: RefObject<HTMLElement | null>
  tcountRef: RefObject<HTMLElement | null>
  qtextRef: RefObject<HTMLElement | null>
  thinkRef: RefObject<HTMLDivElement | null>
  thinkpctRef: RefObject<HTMLSpanElement | null>
  streamRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  attnRef: RefObject<HTMLDivElement | null>
  heatRef: RefObject<HTMLDivElement | null>
  attnqRef: RefObject<HTMLSpanElement | null>
  retrRef: RefObject<HTMLDivElement | null>
  rcountRef: RefObject<HTMLElement | null>
  latRef: RefObject<HTMLElement | null>
  seedlineRef: RefObject<HTMLDivElement | null>
  tempValRef: RefObject<HTMLElement | null>
  stynameRef: RefObject<HTMLSpanElement | null>
  tempInputRef: RefObject<HTMLInputElement | null>
  liveLogLineRef: RefObject<HTMLSpanElement | null>
  vsToggleRef: RefObject<HTMLButtonElement | null>
  axmodeRef: RefObject<HTMLSpanElement | null>
  tipRef: RefObject<HTMLDivElement | null>
  tipDomRef: RefObject<HTMLDivElement | null>
  tipLabRef: RefObject<HTMLDivElement | null>
  tipVecRef: RefObject<HTMLDivElement | null>
  latentWrapRef: RefObject<HTMLDivElement | null>
}

export function startAiLatentRuntime(params: AiLatentRuntimeParams) {
  const { running, nodesRef, linksRef, hoverNodeRef, symTargetRef, tRef, tempValState, runIdRef, totalTokensRef, streamingRef, cycleIdxRef, autoCycleTimerRef, idleHeatTimerRef, logIdxRef, chipRefs, tpsRef, tcountRef, qtextRef, thinkRef, thinkpctRef, streamRef, scrollRef, attnRef, heatRef, attnqRef, retrRef, rcountRef, latRef, seedlineRef, tempValRef, stynameRef, tempInputRef, liveLogLineRef, vsToggleRef, axmodeRef, tipRef, tipDomRef, tipLabRef, tipVecRef, latentWrapRef } = params
  if (!running) return

  const nodes = nodesRef.current
  const links = linksRef.current

  /* local timer registry for full teardown */
  const timeouts = new Set<ReturnType<typeof setTimeout>>()
  const intervals = new Set<ReturnType<typeof setInterval>>()
  const trackTimeout = (id: ReturnType<typeof setTimeout>) => { timeouts.add(id); return id }
  const trackInterval = (id: ReturnType<typeof setInterval>) => { intervals.add(id); return id }

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
    triggerPhaseEdges(key, nodes, links)
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
  trackInterval(setInterval(() => {
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

}
