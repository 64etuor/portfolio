// db-architecture — imperative runtime (DOM build, animation loops, interval logic).
// Extracted verbatim from the original Scene.tsx useEffect body. All closure state,
// rAF/interval timing, event listeners, and SVG/DOM output are IDENTICAL.
// Pure string assembly is delegated to draw.ts; this module owns the live DOM glue.

import {
  MODELS,
  CDC_EVENTS_MES,
  CDC_EVENTS_EBOM,
  FLOW_NODES,
  FLOW_EDGES,
  SM_ORDER,
  RECSQL,
} from './data'
import {
  edgePoint,
  bez,
  fmtRows,
  cls as drawCls,
  hi as drawHi,
  renderDDL as drawRenderDDL,
  relSvgSegment,
  FLOW_EDGE_DEFS,
  flowEdgeSegment,
  flowDotSvg,
  drawSmStr,
  mountRecTree,
} from './draw'
import { h, type Child } from '../_host/richText'
import { KEYWORDS, TYPES, CDC_MAX_LINES, ERD_AUTO_INTERVAL, PACKET_SEG_MS } from './constants'
import type { Packet, RuntimeGate } from './types'

import styles from './scene.module.css'

const s = styles as Record<string, string>

export function createRuntimeGate(running: boolean): RuntimeGate {
  return {
    runningRef: { current: running },
    resumeRef: { current: null },
  }
}

export function syncRuntimeGate(gate: RuntimeGate, running: boolean): void {
  const wasRunning = gate.runningRef.current
  gate.runningRef.current = running
  if (running && !wasRunning) gate.resumeRef.current?.()
}

/**
 * Wires up the entire db-architecture scene against `rootEl`.
 * Returns a cleanup function (clears all timers/rafs/listeners). Behavior is
 * identical to the original inline useEffect; `gate` carries running/resume refs.
 */
export function setupRuntime(rootEl: HTMLElement, gate: RuntimeGate): () => void {
  const { runningRef, resumeRef } = gate

  const $id = <T extends HTMLElement = HTMLElement>(id: string) =>
    rootEl.querySelector<T>('[data-id="' + id + '"]')
  const $$ = <T extends Element = HTMLElement>(sel: string) => rootEl.querySelectorAll<T>(sel)

  // 동적 innerHTML 빌드 시 논리 클래스 토큰 → CSS module 해시 클래스 매핑.
  const cls = (...tokens: (string | number | false | undefined | null)[]) => drawCls(s, ...tokens)

  // 정리 대상 타이머/리스너 수집.
  const timers: Array<ReturnType<typeof setInterval>> = []
  const timeouts: Array<ReturnType<typeof setTimeout>> = []
  const rafs: number[] = []
  const cleanups: Array<() => void> = []

  /* ============================================================
     TAB SWITCHING
     ============================================================ */
  const views = { erd: 'view-erd', arch: 'view-arch', sm: 'view-sm' }
  const footView = $id('footView')!
  const footLabels: Record<string, string> = {
    erd: '01 · ERD',
    arch: '02 · ARCHITECTURE',
    sm: '03 · STATE / RECURSIVE',
  }
  $$('.' + s.tab).forEach((t) => {
    const handler = () => {
      $$('.' + s.tab).forEach((x) => x.classList.remove(s.active))
      t.classList.add(s.active)
      const v = (t as HTMLElement).dataset.view as keyof typeof views
      Object.values(views).forEach((id) => $id(id)?.classList.remove(s.active))
      $id(views[v])?.classList.add(s.active)
      footView.textContent = footLabels[v]
      if (v === 'arch') {
        ensureFlow()
      } else {
        stopFlow()
      }
    }
    t.addEventListener('click', handler)
    cleanups.push(() => t.removeEventListener('click', handler))
  })

  /* ============================================================
     SQL SYNTAX HIGHLIGHTER (lightweight)
     ============================================================ */
  const hi = (line: string) => drawHi(s, KEYWORDS, TYPES, line)
  const renderDDL = (ddl: Parameters<typeof drawRenderDDL>[3]) => drawRenderDDL(s, KEYWORDS, TYPES, ddl)

  /* ============================================================
     VIEW 1: ERD ENGINE
     ============================================================ */
  let curModel = 'mes'
  let curTable: string | null = null
  const pan = { x: 40, y: 30, k: 1 }

  const tableLayer = $id('tableLayer')!
  const relSvg = $id('relSvg')!
  const erdCanvas = $id('erdCanvas')!
  const canvasWrap = $id('canvasWrap')!
  const erdRowsEl = $id('erdRows')
  const erdQpsEl = $id('erdQps')
  const erdTxEl = $id('erdTx')
  const erdLagEl = $id('erdLag')
  const tableEls: Record<string, HTMLElement> = {}

  function modelDesc(m: (typeof MODELS)[string]) {
    return m.tables.length + ' tables · ' + m.desc
  }

  function buildModelSwitch() {
    const ms = $id('modelSwitch')!
    ms.innerHTML = ''
    Object.entries(MODELS).forEach(([k, m]) => {
      const b = document.createElement('button')
      b.className = cls('msBtn') + (k === curModel ? ' ' + s.active : '')
      b.innerHTML =
        '<div class="' + s.t + '">' + m.label + '</div><div class="' + s.d + '">' + modelDesc(m) + '</div>'
      b.onclick = () => {
        curModel = k
        loadModel()
      }
      ms.appendChild(b)
    })
  }

  function loadModel() {
    const m = MODELS[curModel]
    buildModelSwitch()
    $id('engineLbl')!.textContent = m.enginePill
    $id('footEngine')!.textContent = m.engine
    $id('footTbl')!.textContent = 'tables: ' + m.tables.length
    const tl = $id('treeList')!
    tl.innerHTML = ''
    m.tables.forEach((t) => {
      const n = document.createElement('div')
      n.className = s.tnode
      n.dataset.name = t.name
      n.innerHTML =
        '<span class="' + s.ic + '">&#9636;</span><span>' + t.name + '</span><span class="' + s.ncol + '">' + t.cols.length + '</span>'
      n.onclick = () => {
        pauseAndResumeErdAuto()
        selectTable(t.name, true)
      }
      tl.appendChild(n)
    })
    tableLayer.innerHTML = ''
    for (const k in tableEls) delete tableEls[k]
    m.tables.forEach((t) => {
      const el = document.createElement('div')
      el.className = s.tbl
      el.style.cssText = 'left:' + t.x + 'px;top:' + t.y + 'px'
      el.dataset.name = t.name
      const cols = t.cols
        .map((c) => {
          const cl = cls('col', c.pk && 'pk', c.fk && 'fk')
          const key = c.pk
            ? '<span class="' + cls('key', 'pkk') + '">&#128273;</span>'
            : c.fk
              ? '<span class="' + cls('key', 'fkk') + '">&#8600;</span>'
              : '<span class="' + s.key + '"></span>'
          const nn = c.nn ? '<span class="' + s.nn + '">NN</span>' : ''
          return (
            '<div class="' + cl + '">' + key + '<span class="' + s.cn + '">' + c.n + '</span>' + nn + '<span class="' + s.ct + '">' + c.t + '</span></div>'
          )
        })
        .join('')
      el.innerHTML =
        '<div class="' + s.tblH + '"><span class="' + s.tk + '"></span><span class="' + s.nm + '">' + t.name + '</span><span class="' + s.badge + '">' + t.cols.length + ' cols</span></div>' + cols
      el.onclick = (e) => {
        e.stopPropagation()
        pauseAndResumeErdAuto()
        selectTable(t.name, false)
      }
      tableLayer.appendChild(el)
      tableEls[t.name] = el
    })
    const cap = $id('modelCaption')!
    if (m.caption) {
      cap.innerHTML = m.caption
        .replace('{tableCount}', String(m.tables.length))
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      cap.classList.add(s.show)
    } else {
      cap.classList.remove(s.show)
      cap.innerHTML = ''
    }
    const to = setTimeout(() => {
      fitView()
      selectTable(m.defaultTable, false, true)
    }, 0)
    timeouts.push(to)
  }

  function applyTransform() {
    erdCanvas.style.transform = 'translate(' + pan.x + 'px,' + pan.y + 'px) scale(' + pan.k + ')'
  }
  function fitView() {
    const m = MODELS[curModel]
    let maxX = 0,
      maxY = 0,
      minX = 1e9,
      minY = 1e9
    m.tables.forEach((t) => {
      const el = tableEls[t.name]
      const w = el ? el.offsetWidth : 230
      const h = el ? el.offsetHeight : 160
      minX = Math.min(minX, t.x)
      minY = Math.min(minY, t.y)
      maxX = Math.max(maxX, t.x + w)
      maxY = Math.max(maxY, t.y + h)
    })
    const cw = canvasWrap.clientWidth,
      ch = canvasWrap.clientHeight
    const cap = $id('modelCaption')
    const capShown = cap != null && cap.classList.contains(s.show)
    const PAD_T = 30,
      PAD_L = 50,
      PAD_R = 30
    const PAD_B = 28 + (capShown ? 110 : 10)
    const gw = maxX - minX,
      gh = maxY - minY
    const availW = cw - PAD_L - PAD_R,
      availH = ch - PAD_T - PAD_B
    const k = Math.min(availW / Math.max(gw, 1), availH / Math.max(gh, 1), 1)
    pan.k = Math.max(0.45, Math.min(k, 1))
    pan.x = PAD_L + (availW - gw * pan.k) / 2 - minX * pan.k
    pan.y = PAD_T + Math.max(0, (availH - gh * pan.k) / 2) - minY * pan.k
    applyTransform()
    drawRels()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function selectTable(name: string, _fromTree?: boolean, _silent?: boolean) {
    curTable = name
    const m = MODELS[curModel]
    const t = m.tables.find((x) => x.name === name)
    if (!t) return
    $$('.' + s.tnode).forEach((n) =>
      n.classList.toggle(s.active, (n as HTMLElement).dataset.name === name)
    )
    const related = new Set<string>([name])
    const fkLines: typeof m.rels = []
    m.rels.forEach((r) => {
      if (r[0] === name) {
        related.add(r[2])
        fkLines.push(r)
      }
      if (r[2] === name) {
        related.add(r[0])
        fkLines.push(r)
      }
    })
    Object.entries(tableEls).forEach(([n, el]) => {
      el.classList.remove(s.sel, s.dim, s.fkhi)
      if (n === name) el.classList.add(s.sel)
      else if (related.has(n)) el.classList.add(s.fkhi)
      else el.classList.add(s.dim)
    })
    $id('ddlTitle')!.textContent = name
    $id('ddlCode')!.innerHTML = renderDDL(t.ddl)
    const rl = $id('relList')!
    if (fkLines.length) {
      rl.innerHTML = fkLines
        .map((r) => {
          return (
            '<div class="' + s.relRow + '"><span class="' + s.a + '">' + r[0] + '.' + r[1] + '</span><span class="' + s.car + '">&#8212;' + r[4] + '&#8594;</span><span class="' + s.b + '">' + r[2] + '.' + r[3] + '</span></div>'
          )
        })
        .join('')
    } else {
      rl.innerHTML =
        '<div class="' + s.relRow + '" style="color:var(--dim)">no foreign keys (root / master)</div>'
    }
    drawRels(name, related)
  }

  /* crow-foot relationship lines */
  function center(el: HTMLElement) {
    const w = el.offsetWidth || 230,
      h = el.offsetHeight || 120
    return { x: parseFloat(el.style.left), y: parseFloat(el.style.top), w, h }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function drawRels(selName?: string, _related?: Set<string>) {
    const m = MODELS[curModel]
    let svg = ''
    m.rels.forEach((r) => {
      const ea = tableEls[r[0]],
        eb = tableEls[r[2]]
      if (!ea || !eb) return
      if (r[0] === r[2]) return
      const a = center(ea),
        b = center(eb)
      const ax = a.x + a.w / 2,
        ay = a.y + a.h / 2
      const bx = b.x + b.w / 2,
        by = b.y + b.h / 2
      const p1 = edgePoint(a, bx, by)
      const p2 = edgePoint(b, ax, ay)
      if (!isFinite(p1.x) || !isFinite(p1.y) || !isFinite(p2.x) || !isFinite(p2.y)) return
      const isHi = !!selName && (r[0] === selName || r[2] === selName)
      svg += relSvgSegment(p1, p2, isHi)
    })
    relSvg.innerHTML = svg
  }

  /* pan + zoom */
  let dragging = false,
    sx = 0,
    sy = 0
  const onMouseDown = (e: MouseEvent) => {
    const tgt = e.target as HTMLElement
    if (tgt.closest('.' + s.tbl) || tgt.closest('.' + s.zoombar)) return
    dragging = true
    sx = e.clientX - pan.x
    sy = e.clientY - pan.y
    canvasWrap.style.cursor = 'grabbing'
  }
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return
    pan.x = e.clientX - sx
    pan.y = e.clientY - sy
    applyTransform()
  }
  const onMouseUp = () => {
    dragging = false
    canvasWrap.style.cursor = 'default'
  }
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = canvasWrap.getBoundingClientRect()
    const mx = e.clientX - rect.left,
      my = e.clientY - rect.top
    const old = pan.k
    const dir = e.deltaY < 0 ? 1.12 : 0.89
    pan.k = Math.max(0.3, Math.min(2.2, pan.k * dir))
    pan.x = mx - (mx - pan.x) * (pan.k / old)
    pan.y = my - (my - pan.y) * (pan.k / old)
    applyTransform()
  }
  canvasWrap.addEventListener('mousedown', onMouseDown)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  canvasWrap.addEventListener('wheel', onWheel, { passive: false })
  cleanups.push(() => canvasWrap.removeEventListener('mousedown', onMouseDown))
  cleanups.push(() => window.removeEventListener('mousemove', onMouseMove))
  cleanups.push(() => window.removeEventListener('mouseup', onMouseUp))
  cleanups.push(() => canvasWrap.removeEventListener('wheel', onWheel))

  $id<HTMLButtonElement>('zin')!.onclick = () => {
    pan.k = Math.min(2.2, pan.k * 1.18)
    applyTransform()
  }
  $id<HTMLButtonElement>('zout')!.onclick = () => {
    pan.k = Math.max(0.3, pan.k * 0.85)
    applyTransform()
  }
  $id<HTMLButtonElement>('zfit')!.onclick = () => fitView()
  const copyBtn = $id<HTMLButtonElement>('copyBtn')!
  copyBtn.onclick = () => {
    const t = MODELS[curModel].tables.find((x) => x.name === curTable)
    if (!t) return
    const txt = t.ddl.map((r) => r[1]).join('\n')
    if (navigator.clipboard) navigator.clipboard.writeText(txt)
    copyBtn.textContent = 'copied v'
    const to = setTimeout(() => (copyBtn.textContent = 'copy'), 1200)
    timeouts.push(to)
  }

  /* ============================================================
     ERD LIVE STATS — row count / QPS / tx / lag 미세 변동
     ============================================================ */
  let erdRowBase = 2847391,
    erdQpsBase = 1240,
    erdTxBase = 14,
    erdLagBase = 12
  function updateErdStats() {
    if (!runningRef.current) return
    erdRowBase += Math.floor(Math.random() * 7)
    erdQpsBase = Math.max(900, erdQpsBase + Math.floor((Math.random() - 0.48) * 18))
    erdTxBase = Math.max(4, erdTxBase + Math.floor((Math.random() - 0.5) * 3))
    erdLagBase = Math.max(2, erdLagBase + Math.floor((Math.random() - 0.5) * 4))
    if (erdRowsEl) erdRowsEl.textContent = fmtRows(erdRowBase)
    if (erdQpsEl) erdQpsEl.textContent = erdQpsBase.toLocaleString()
    if (erdTxEl) erdTxEl.textContent = String(erdTxBase)
    if (erdLagEl) erdLagEl.textContent = erdLagBase + 'ms'
  }
  function startErdStats() {
    updateErdStats()
    timers.push(setInterval(updateErdStats, 1400))
  }

  /* ============================================================
     ERD AUTO HIGHLIGHT — 테이블 자동 순회 (rAF dt 기반)
     ============================================================ */
  let erdAutoRAF: number | null = null,
    erdAutoLastTs = 0,
    erdAutoIdx = 0,
    erdAutoElapsed = 0
  // running-gate 로 멈췄는지 추적(사용자 상호작용 pause 와 구분 → 재가동 충돌 방지).
  let erdAutoPausedByGate = false
  function erdAutoStep(ts: number) {
    if (!runningRef.current) {
      // 화면 밖: 다음 프레임 스케줄 중단(일시정지). 재가동은 resumeRef 가 처리.
      erdAutoRAF = null
      erdAutoPausedByGate = true
      return
    }
    if (!erdAutoLastTs) {
      erdAutoLastTs = ts
    }
    const dt = Math.min(ts - erdAutoLastTs, 100)
    erdAutoLastTs = ts
    erdAutoElapsed += dt
    if (erdAutoElapsed >= ERD_AUTO_INTERVAL) {
      erdAutoElapsed = 0
      const m = MODELS[curModel]
      erdAutoIdx = (erdAutoIdx + 1) % m.tables.length
      selectTable(m.tables[erdAutoIdx].name, false, true)
    }
    erdAutoRAF = requestAnimationFrame(erdAutoStep)
    rafs.push(erdAutoRAF)
  }
  function startErdAuto() {
    if (erdAutoRAF) cancelAnimationFrame(erdAutoRAF)
    erdAutoLastTs = 0
    erdAutoElapsed = 0
    erdAutoRAF = requestAnimationFrame(erdAutoStep)
    rafs.push(erdAutoRAF)
  }
  let erdAutoResumeTimer: ReturnType<typeof setTimeout> | null = null
  function pauseAndResumeErdAuto() {
    if (erdAutoRAF) {
      cancelAnimationFrame(erdAutoRAF)
      erdAutoRAF = null
    }
    if (erdAutoResumeTimer) clearTimeout(erdAutoResumeTimer)
    erdAutoResumeTimer = setTimeout(() => {
      erdAutoLastTs = 0
      erdAutoElapsed = 0
      erdAutoRAF = requestAnimationFrame(erdAutoStep)
      rafs.push(erdAutoRAF)
    }, 5000)
    timeouts.push(erdAutoResumeTimer)
  }

  /* ============================================================
     SAMPLE CHANGE EVENT STREAM
     ============================================================ */
  let cdcEvtIdx = 0
  const cdcLogBody = $id('cdcLogBody')
  const cdcQpsEl = $id('cdcQps')

  function cdcNow() {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return hh + ':' + mm + ':' + ss + '.' + ms
  }
  function cdcTagClass(type: string) {
    if (type === 'ins') return s.ins
    if (type === 'upd') return s.upd
    return s.cdc
  }
  function cdcTagLabel(type: string) {
    if (type === 'ins') return 'INSERT'
    if (type === 'upd') return 'UPDATE'
    return 'CDC'
  }
  const modelTableNames = Object.values(MODELS).flatMap((m) => m.tables.map((t) => t.name))
  const tableRe = new RegExp('\\b(' + modelTableNames.join('|') + ')\\b', 'g')
  /** Message → nodes: `<val>…</val>` markers become styled spans, known table names are highlighted (text only, never parsed as HTML). */
  function cdcMsgNodes(msg: string): Child[] {
    const withTables = (text: string): Child[] =>
      text.split(tableRe).map((part, i) => (i % 2 ? h('span', s.tbl, part) : part))
    return msg
      .split(/<val>(.*?)<\/val>/)
      .flatMap((part, i) => (i % 2 ? [h('span', s.val, withTables(part))] : withTables(part)))
  }
  function appendCdcLine(type: string, _tbl: string, msg: string) {
    const body = cdcLogBody
    if (!body) return
    const line = h(
      'div',
      s.cdcLine,
      h('span', s.cdcTs, cdcNow()),
      h('span', cls('cdcTag') + ' ' + cdcTagClass(type), cdcTagLabel(type)),
      h('span', s.cdcMsg, cdcMsgNodes(msg))
    )
    body.appendChild(line)
    const lines = body.querySelectorAll('.' + s.cdcLine)
    if (lines.length > CDC_MAX_LINES) {
      const old = lines[0]
      old.classList.add(s.fade)
      const to = setTimeout(() => old.remove(), 620)
      timeouts.push(to)
    }
    rafs.push(requestAnimationFrame(() => (line.style.opacity = '1')))
  }
  function getCdcEvents() {
    return curModel === 'mes' ? CDC_EVENTS_MES : CDC_EVENTS_EBOM
  }
  function fireCdcEvent() {
    const evts = getCdcEvents()
    const e = evts[cdcEvtIdx % evts.length]
    cdcEvtIdx++
    appendCdcLine(e[0], e[1], e[2])
  }
  let cdcLogInterval: ReturnType<typeof setInterval> | null = null
  let cdcQpsSampleCount = 0,
    cdcQpsLastCheck = 0
  function startCdcLog() {
    if (cdcLogInterval) clearInterval(cdcLogInterval)
    cdcEvtIdx = 0
    cdcQpsSampleCount = 0
    cdcQpsLastCheck = Date.now()
    for (let i = 0; i < 6; i++) fireCdcEvent()
    cdcLogInterval = setInterval(() => {
      if (!runningRef.current) return
      fireCdcEvent()
      cdcQpsSampleCount++
      const now = Date.now()
      if (now - cdcQpsLastCheck >= 1000) {
        if (cdcQpsEl) cdcQpsEl.textContent = '예시 ' + cdcQpsSampleCount + ' evt/s'
        cdcQpsSampleCount = 0
        cdcQpsLastCheck = now
      }
    }, 480 + Math.floor(Math.random() * 120))
    timers.push(cdcLogInterval)
  }
  function stopCdcLog() {
    if (cdcLogInterval) {
      clearInterval(cdcLogInterval)
      cdcLogInterval = null
    }
  }

  /* ============================================================
     VIEW 2: ARCHITECTURE — animated CDC flow
     ============================================================ */
  const flowSvg = $id('flowSvg')!
  const archStage = $id('archStage')!
  const evtCountEl = $id('evtCount')!
  let flowRunning = false,
    flowRAF: number | null = null,
    flowSpeed = 1,
    evtCount = 0
  let packets: Packet[] = []
  let flowPrevTs = 0
  const nodePos: Record<string, { x: number; y: number; w: number; h: number; el: HTMLElement }> = {}
  function layoutFlow() {
    flowSvg.innerHTML = ''
    archStage.querySelectorAll('.' + s.node).forEach((n) => n.remove())
    const W = archStage.clientWidth,
      H = archStage.clientHeight
    FLOW_NODES.forEach((n) => {
      const el = document.createElement('div')
      el.className = cls('node', n.cls)
      el.style.cssText = 'left:' + n.x * W + 'px;top:' + n.y * H + 'px'
      el.innerHTML =
        '<div class="' + s.nh + '"><span class="' + s.ic + '">' + n.ic + '</span>' + n.t + '</div><div class="' + s.ns + '">' + n.s + '</div>' + (n.pill ? '<span class="' + s.pill + '">' + n.pill + '</span>' : '')
      archStage.appendChild(el)
      nodePos[n.id] = { x: n.x * W + 84, y: n.y * H + 30, w: 168, h: 60, el }
    })
    rafs.push(requestAnimationFrame(() => {
      FLOW_NODES.forEach((n) => {
        const el = nodePos[n.id].el
        nodePos[n.id] = {
          x: n.x * W + el.offsetWidth / 2,
          y: n.y * H + el.offsetHeight / 2,
          w: el.offsetWidth,
          h: el.offsetHeight,
          el,
        }
      })
      drawFlowEdges()
    }))
    drawFlowEdges()
  }
  function drawFlowEdges() {
    const dotsEl = flowSvg.querySelector('g.dots')
    let str = FLOW_EDGE_DEFS
    FLOW_EDGES.forEach(([a, b]) => {
      const na = nodePos[a],
        nb = nodePos[b]
      if (!na || !nb) return
      const x1 = na.x + na.w / 2,
        y1 = na.y,
        x2 = nb.x - nb.w / 2,
        y2 = nb.y
      str += flowEdgeSegment(a, b, x1, y1, x2, y2)
    })
    flowSvg.innerHTML = str
    if (dotsEl) flowSvg.appendChild(dotsEl)
  }
  function edgePath(a: string, b: string) {
    const na = nodePos[a],
      nb = nodePos[b]
    if (!na || !nb) return null
    const x1 = na.x + na.w / 2,
      y1 = na.y,
      x2 = nb.x - nb.w / 2,
      y2 = nb.y
    const mx = (x1 + x2) / 2
    return { x1, y1, x2, y2, mx }
  }
  function spawnPacket() {
    const proj = (['redis', 'es', 'bq'] as const)[Math.floor(Math.random() * 3)]
    const route: [string, string, string][] = [
      ['app', 'outbox', '#00e0a4'],
      ['outbox', 'cdc', '#00e0a4'],
      ['cdc', 'kafka', '#3fb6ff'],
      ['kafka', proj, '#ffcb47'],
    ]
    packets.push({ route, seg: 0, t: 0, counted: false })
  }
  let lastSpawn = 0
  function flowTick(ts: number) {
    if (!flowRunning) return
    if (!runningRef.current) {
      // 화면 밖: 다음 프레임 스케줄 중단. flowRunning 은 유지(시각상 진행 중),
      // 재가동은 resumeRef 가 처리. dt 점프 방지를 위해 ts 리셋.
      flowRAF = null
      flowPrevTs = 0
      return
    }
    if (!flowPrevTs) flowPrevTs = ts
    const dt = Math.min(ts - flowPrevTs, 64)
    flowPrevTs = ts
    const dtNorm = (dt / PACKET_SEG_MS) * flowSpeed

    if (ts - lastSpawn > 900 / flowSpeed) {
      spawnPacket()
      lastSpawn = ts
    }

    let dots = ''
    packets.forEach((p) => {
      p.t += dtNorm
      if (p.t >= 1) {
        p.t = p.t - 1
        p.seg++
        if (p.seg >= p.route.length) {
          p.dead = true
          if (!p.counted) {
            evtCount++
            evtCountEl.textContent = String(evtCount)
            p.counted = true
          }
          return
        }
      }
      const seg = p.route[p.seg]
      if (!seg) return
      const e = edgePath(seg[0], seg[1])
      if (!e) return
      const pos = bez(Math.max(0, Math.min(1, p.t)), e)
      const col = seg[2]
      dots += flowDotSvg(pos.x, pos.y, col)
    })
    packets = packets.filter((p) => !p.dead)
    const dotsEl = flowSvg.querySelector('g.dots')
    if (dotsEl) {
      dotsEl.innerHTML = dots
    } else {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      g.setAttribute('class', 'dots')
      g.innerHTML = dots
      flowSvg.appendChild(g)
    }
    flowRAF = requestAnimationFrame(flowTick)
    rafs.push(flowRAF)
  }
  function startFlow() {
    layoutFlow()
    if (flowRunning) return
    flowRunning = true
    flowPrevTs = 0
    $id('archToggle')!.innerHTML = '&#9646;&#9646; pause flow'
    flowRAF = requestAnimationFrame(flowTick)
    rafs.push(flowRAF)
    startCdcLog()
  }
  function ensureFlow() {
    if (!flowRunning) startFlow()
    else layoutFlow()
  }
  function stopFlow() {
    flowRunning = false
    if (flowRAF) cancelAnimationFrame(flowRAF)
    stopCdcLog()
  }
  const archToggle = $id<HTMLButtonElement>('archToggle')!
  archToggle.onclick = () => {
    if (flowRunning) {
      stopFlow()
      archToggle.innerHTML = '&#9654; resume flow'
    } else {
      flowRunning = true
      flowPrevTs = 0
      archToggle.innerHTML = '&#9646;&#9646; pause flow'
      flowRAF = requestAnimationFrame(flowTick)
      rafs.push(flowRAF)
      startCdcLog()
    }
  }
  const archSpeed = $id<HTMLButtonElement>('archSpeed')!
  archSpeed.onclick = () => {
    flowSpeed = flowSpeed >= 4 ? 1 : flowSpeed * 2
    archSpeed.textContent = 'speed: ' + flowSpeed + 'x'
  }
  const onResize = () => {
    if ($id('view-arch')?.classList.contains(s.active)) layoutFlow()
  }
  window.addEventListener('resize', onResize)
  cleanups.push(() => window.removeEventListener('resize', onResize))

  /* ============================================================
     VIEW 3a: STATE MACHINE
     ============================================================ */
  const smSvg = $id('smSvg')!
  let smCur = 'OPEN',
    smRetry = 0

  function drawSM() {
    smSvg.innerHTML = drawSmStr(s, smCur)
  }
  function smUpdateInfo() {
    $id('smState')!.textContent = smCur
    $id('smRetry')!.textContent = String(smRetry)
    const due = smCur === 'HOLD' || smCur === 'CANCELLED' ? '+' + Math.pow(2, smRetry) + 's' : '&#8212;'
    $id('smNext')!.innerHTML = due
  }
  function smManualStep() {
    if (smCur === 'HOLD' || smCur === 'CANCELLED') {
      smCur = 'OPEN'
    } else {
      const i = SM_ORDER.indexOf(smCur)
      if (i >= 0 && i < SM_ORDER.length - 1) smCur = SM_ORDER[i + 1]
    }
    drawSM()
    smUpdateInfo()
  }
  $id<HTMLButtonElement>('smStep')!.onclick = () => {
    smManualStep()
    smPauseAndResume()
  }
  $id<HTMLButtonElement>('smFail')!.onclick = () => {
    if (smCur === 'OPEN') {
      smCur = 'HOLD'
      smRetry++
    } else if (smCur === 'IN_PROGRESS') {
      smCur = 'CANCELLED'
      smRetry++
    }
    drawSM()
    smUpdateInfo()
    smPauseAndResume()
  }
  $id<HTMLButtonElement>('smReset')!.onclick = () => {
    smCur = 'OPEN'
    smRetry = 0
    drawSM()
    smUpdateInfo()
    smPauseAndResume()
  }

  let smAutoTimer: ReturnType<typeof setInterval> | null = null,
    smAutoResumeTimer: ReturnType<typeof setTimeout> | null = null,
    smAutoTick = 0
  function smAutoAdvance() {
    if (!runningRef.current) return
    smAutoTick++
    if (smCur === 'CLOSED') {
      smCur = 'OPEN'
      smRetry = 0
      drawSM()
      smUpdateInfo()
      return
    }
    if (smCur === 'OPEN' && smAutoTick % 5 === 0) {
      smCur = 'HOLD'
      smRetry++
      drawSM()
      smUpdateInfo()
      return
    }
    if (smCur === 'IN_PROGRESS' && smAutoTick % 7 === 0) {
      smCur = 'CANCELLED'
      smRetry++
      drawSM()
      smUpdateInfo()
      return
    }
    smManualStep()
  }
  function startSmAuto() {
    if (smAutoTimer) clearInterval(smAutoTimer)
    smAutoTimer = setInterval(smAutoAdvance, 1600)
    timers.push(smAutoTimer)
  }
  function smPauseAndResume() {
    if (smAutoTimer) {
      clearInterval(smAutoTimer)
      smAutoTimer = null
    }
    if (smAutoResumeTimer) clearTimeout(smAutoResumeTimer)
    smAutoResumeTimer = setTimeout(startSmAuto, 5000)
    timeouts.push(smAutoResumeTimer)
  }

  /* ============================================================
     VIEW 3b: RECURSIVE CTE TREE
     ============================================================ */
  $id('recSql')!.innerHTML = RECSQL.map(
    (r, i) => '<span class="' + s.ln + '">' + (i + 1) + '</span>' + hi(r[1])
  ).join('\n')

  const updateRecTree = mountRecTree($id('recSvg')!)
  let recShown = 0
  function drawRec() {
    updateRecTree(recShown)
    $id('recDepth')!.textContent = String(recShown)
  }
  let recTimer: ReturnType<typeof setInterval> | null = null,
    recResumeTimer: ReturnType<typeof setTimeout> | null = null,
    recHold = 0
  function recAutoTick() {
    if (!runningRef.current) return
    if (recHold > 0) {
      recHold--
      if (recHold === 0) {
        recShown = 0
        drawRec()
      }
      return
    }
    recShown++
    if (recShown > 3) {
      recShown = 3
      drawRec()
      recHold = 3
      return
    }
    drawRec()
  }
  function startRecAuto() {
    if (recTimer) clearInterval(recTimer)
    recShown = 0
    recHold = 0
    drawRec()
    recTimer = setInterval(recAutoTick, 650)
    timers.push(recTimer)
  }
  function recPauseAndResume() {
    if (recTimer) {
      clearInterval(recTimer)
      recTimer = null
    }
    if (recResumeTimer) clearTimeout(recResumeTimer)
    recResumeTimer = setTimeout(startRecAuto, 5000)
    timeouts.push(recResumeTimer)
  }
  $id<HTMLButtonElement>('recRun')!.onclick = () => {
    if (recTimer) clearInterval(recTimer)
    recShown = 0
    recHold = 0
    drawRec()
    recTimer = setInterval(recAutoTick, 650)
    timers.push(recTimer)
  }
  $id<HTMLButtonElement>('recReset')!.onclick = () => {
    if (recTimer) clearInterval(recTimer)
    recShown = 0
    recHold = 0
    drawRec()
    recPauseAndResume()
  }

  /* ============================================================
     INIT
     ============================================================ */
  buildModelSwitch()
  loadModel()
  drawSM()
  smUpdateInfo()
  drawRec()
  startErdStats()
  timeouts.push(
    setTimeout(() => {
      startErdAuto()
    }, 400)
  )
  timeouts.push(
    setTimeout(() => {
      startFlow()
    }, 200)
  )
  startSmAuto()
  startRecAuto()

  // running false→true 재가동: 게이트로 멈춘 rAF 루프만 다시 스케줄.
  // 인터벌(stats/cdc/sm/rec)은 콜백 내부 게이트라 별도 재가동 불필요(스스로 재개).
  resumeRef.current = () => {
    if (erdAutoRAF == null && erdAutoPausedByGate) {
      erdAutoPausedByGate = false
      erdAutoLastTs = 0
      erdAutoRAF = requestAnimationFrame(erdAutoStep)
      rafs.push(erdAutoRAF)
    }
    if (flowRunning && flowRAF == null) {
      flowPrevTs = 0
      flowRAF = requestAnimationFrame(flowTick)
      rafs.push(flowRAF)
    }
  }

  return () => {
    resumeRef.current = null
    timers.forEach((t) => clearInterval(t))
    timeouts.forEach((t) => clearTimeout(t))
    rafs.forEach((r) => cancelAnimationFrame(r))
    if (cdcLogInterval) clearInterval(cdcLogInterval)
    if (flowRAF) cancelAnimationFrame(flowRAF)
    if (erdAutoRAF) cancelAnimationFrame(erdAutoRAF)
    flowRunning = false
    cleanups.forEach((c) => c())
  }
}
