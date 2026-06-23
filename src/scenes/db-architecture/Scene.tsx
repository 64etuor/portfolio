'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneReady } from '../_host/useSceneReady'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  MODELS,
  CDC_EVENTS_MES,
  CDC_EVENTS_EBOM,
  FLOW_NODES,
  FLOW_EDGES,
  SM_STATES,
  SM_W,
  SM_H,
  SM_EDGES,
  SM_ORDER,
  RECSQL,
  REC_TREE,
  type DdlRow,
} from './data'
import { edgePoint, crowFoot, smEdge, bez, fmtRows } from './draw'
import { KEYWORDS, TYPES, CDC_MAX_LINES, ERD_AUTO_INTERVAL, PACKET_SEG_MS } from './constants'

/* ════════════════════════════════════════════════════════════════
   DB 모델링 & 데이터 아키텍처 (db-architecture.html 이식 / 실용적 포팅)
   3개 뷰: 도메인 ERD · 데이터 아키텍처 플로우 · 상태머신/재귀 CTE.
   순수 DOM/SVG 기반 인터랙티브 — 캔버스 드로우 루프 없음. 정적 셸은 JSX,
   동적 빌드 DOM/SVG·자동 순회·CDC 스트림은 useEffect 안에서 imperative 유지
   (스펙 규칙 6: 복잡한 동적 DOM 은 ref 컨테이너에 imperative 허용).
   하네스 계약상 SceneHost + useSceneCanvas 사용 — 캔버스는 베이스 배경만 칠한다.
   수치/카피/색/모션 원본과 동일.
   ════════════════════════════════════════════════════════════════ */

// 동적 innerHTML 빌드 시 논리 클래스 토큰 → CSS module 해시 클래스 매핑.
// 원본의 `class="col pk fk"` 같은 멀티토큰을 모듈 클래스로 치환.
function cls(...tokens: (string | number | false | undefined | null)[]): string {
  return tokens
    .filter((t): t is string => typeof t === 'string' && t.length > 0)
    .map((t) => (s as Record<string, string>)[t] ?? t)
    .join(' ')
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  // 씬이 화면 밖(running=false)일 때 자체 rAF/interval 틱을 멈추기 위한 게이트.
  // ref 로 들고 useEffect 내부 루프가 매 틱 읽는다. running=true 동안엔 동작 동일.
  const runningRef = useRef(running)
  // running 이 false→true 로 바뀔 때 멈춘 rAF 루프를 재가동하는 콜백을 등록한다.
  const resumeRef = useRef<(() => void) | null>(null)

  // 하네스 계약 충족용 베이스 배경 캔버스(불투명 DOM 뒤에 깔림). 베이스 톤만 칠한다.
  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, f: Frame) => {
    g.fillStyle = '#0a0e14'
    g.fillRect(0, 0, f.w, f.h)
  }, { running })

  useSceneReady(onReady)

  // running 프롭 → runningRef 동기화. false→true 전환 시 멈췄던 rAF 루프 재가동.
  useEffect(() => {
    const wasRunning = runningRef.current
    runningRef.current = running
    if (running && !wasRunning) resumeRef.current?.()
  }, [running])

  useEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl) return
    const $ = <T extends Element = HTMLElement>(sel: string) => rootEl.querySelector<T>(sel)
    const $id = <T extends HTMLElement = HTMLElement>(id: string) =>
      rootEl.querySelector<T>('[data-id="' + id + '"]')
    const $$ = <T extends Element = HTMLElement>(sel: string) => rootEl.querySelectorAll<T>(sel)

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
    const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    function hi(line: string): string {
      if (/^\s*--/.test(line)) return '<span class="' + s.com + '">' + esc(line) + '</span>'
      let comment = ''
      const ci = line.indexOf('--')
      if (ci >= 0) {
        comment = line.slice(ci)
        line = line.slice(0, ci)
      }
      let out = esc(line)
        .replace(/'([^']*)'/g, '<span class="' + s.str + "\">'$1'</span>")
        .replace(KEYWORDS, '<span class="' + s.kw + '">$1</span>')
        .replace(TYPES, '<span class="' + s.typ + '">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="' + s.num + '">$1</span>')
      if (comment) out += '<span class="' + s.com + '">' + esc(comment) + '</span>'
      return out
    }
    function renderDDL(ddl: DdlRow[]): string {
      let html = ''
      ddl.forEach((row, i) => {
        const line = row[1]
        html += '<span class="' + s.ln + '">' + (i + 1) + '</span>' + hi(line) + '\n'
      })
      return html
    }

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
        el.style.left = t.x + 'px'
        el.style.top = t.y + 'px'
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
        const col = isHi ? '#ff5d8f' : '#2a3a50'
        const w = isHi ? 2.2 : 1.3
        const mx = (p1.x + p2.x) / 2
        const path = 'M' + p1.x + ',' + p1.y + ' C' + mx + ',' + p1.y + ' ' + mx + ',' + p2.y + ' ' + p2.x + ',' + p2.y
        svg += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" opacity="' + (isHi ? 1 : 0.6) + '"/>'
        svg += crowFoot(p1, p2, col, isHi)
        svg += '<circle cx="' + p2.x + '" cy="' + p2.y + '" r="' + (isHi ? 4 : 3) + '" fill="' + col + '"/>'
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
    function appendCdcLine(type: string, _tbl: string, msg: string) {
      const body = cdcLogBody
      if (!body) return
      const ts = cdcNow()
      const line = document.createElement('div')
      line.className = s.cdcLine
      const tagCls = cdcTagClass(type)
      const tagLbl = cdcTagLabel(type)
      const msgHtml = msg
        .replace(/<val>(.*?)<\/val>/g, '<span class="' + s.val + '">$1</span>')
        .replace(tableRe, '<span class="' + s.tbl + '">$1</span>')
      line.innerHTML =
        '<span class="' + s.cdcTs + '">' + ts + '</span><span class="' + cls('cdcTag') + ' ' + tagCls + '">' + tagLbl + '</span><span class="' + s.cdcMsg + '">' + msgHtml + '</span>'
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
    type Packet = { route: [string, string, string][]; seg: number; t: number; counted: boolean; dead?: boolean }
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
        el.style.left = n.x * W + 'px'
        el.style.top = n.y * H + 'px'
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
      let str =
        '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#2a3a50"/></marker></defs>'
      FLOW_EDGES.forEach(([a, b]) => {
        const na = nodePos[a],
          nb = nodePos[b]
        if (!na || !nb) return
        const x1 = na.x + na.w / 2,
          y1 = na.y,
          x2 = nb.x - nb.w / 2,
          y2 = nb.y
        const mx = (x1 + x2) / 2
        str +=
          '<path id="edge-' + a + '-' + b + '" d="M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2 + '" fill="none" stroke="#22324a" stroke-width="1.6" marker-end="url(#ah)"/>'
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
        dots +=
          '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="4.5" fill="' + col + '"><animate attributeName="opacity" values="1;.5;1" dur="0.6s" repeatCount="indefinite"/></circle>'
        dots += '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="9" fill="' + col + '" opacity="0.18"/>'
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

    function smPos(id: string) {
      const st = SM_STATES.find((x) => x.id === id)!
      return { cx: st.x + SM_W / 2, cy: st.y + SM_H / 2, ...st }
    }
    function drawSM() {
      let str =
        '<defs><marker id="sma" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#3a4d66"/></marker><marker id="sma-hot" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#00e0a4"/></marker></defs>'
      SM_EDGES.forEach(([a, b, lbl]) => {
        const pa = smPos(a),
          pb = smPos(b)
        const dx = pb.cx - pa.cx,
          dy = pb.cy - pa.cy
        const ea = smEdge(pa, pb.cx, pb.cy, SM_W / 2, SM_H / 2),
          eb = smEdge(pb, pa.cx, pa.cy, SM_W / 2, SM_H / 2)
        const hot = a === smCur
        const col = hot ? '#00e0a4' : '#34465e'
        const mx = (ea.x + eb.x) / 2,
          my = (ea.y + eb.y) / 2
        const ctrl =
          Math.abs(dx) > Math.abs(dy)
            ? mx + ',' + ea.y + ' ' + mx + ',' + eb.y
            : ea.x + ',' + my + ' ' + eb.x + ',' + my
        str +=
          '<path d="M' + ea.x + ',' + ea.y + ' C' + ctrl + ' ' + eb.x + ',' + eb.y + '" fill="none" stroke="' + col + '" stroke-width="' + (hot ? 2.4 : 1.4) + '" marker-end="url(#' + (hot ? 'sma-hot' : 'sma') + ')" opacity="' + (hot ? 1 : 0.7) + '"/>'
        str +=
          '<text x="' + mx + '" y="' + (my - 4) + '" fill="' + (hot ? '#00e0a4' : '#5c708a') + '" font-size="9.5" font-family="JetBrains Mono" text-anchor="middle">' + lbl + '</text>'
      })
      SM_STATES.forEach((st) => {
        const active = st.id === smCur
        const fill = active ? st.c : '#141d29'
        const stroke = st.c
        const txt = active ? '#06140f' : st.c
        str +=
          '<g><rect class="' + s.stRect + '" x="' + st.x + '" y="' + st.y + '" rx="9" width="' + SM_W + '" height="' + SM_H + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (active ? 2.4 : 1.4) + '" ' + (active ? 'filter="url(#glow)"' : '') + '/><text x="' + (st.x + SM_W / 2) + '" y="' + (st.y + SM_H / 2 + 4) + '" text-anchor="middle" font-family="JetBrains Mono" font-weight="700" font-size="12" fill="' + txt + '">' + st.id + '</text></g>'
      })
      str +=
        '<filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      smSvg.innerHTML = str
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

    const recSvg = $id('recSvg')!
    let recShown = 0
    function drawRec() {
      let str = ''
      REC_TREE.forEach((n) => {
        if (n.mgr == null) return
        const p = REC_TREE.find((x) => x.id === n.mgr)!
        const visible = n.depth <= recShown
        const col = visible ? '#a78bfa' : '#1c2636'
        str +=
          '<path d="M' + p.x + ',' + (p.y + 13) + ' C' + p.x + ',' + (p.y + n.y) / 2 + ' ' + n.x + ',' + (p.y + n.y) / 2 + ' ' + n.x + ',' + (n.y - 13) + '" fill="none" stroke="' + col + '" stroke-width="' + (visible ? 1.8 : 1) + '" opacity="' + (visible ? 0.85 : 0.3) + '"/>'
      })
      REC_TREE.forEach((n) => {
        const visible = n.depth <= recShown
        const justIn = n.depth === recShown
        const col = ['#3fb6ff', '#a78bfa', '#ffcb47', '#00e0a4'][n.depth]
        const fill = visible ? (justIn ? col : '#141d29') : '#0e1620'
        const stroke = visible ? col : '#1c2636'
        const tcol = visible ? (justIn ? '#06140f' : col) : '#2a3a50'
        str +=
          '<g opacity="' + (visible ? 1 : 0.25) + '"><rect x="' + (n.x - 52) + '" y="' + (n.y - 14) + '" rx="8" width="104" height="28" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (justIn ? 2.2 : 1.4) + '"/><text x="' + n.x + '" y="' + (n.y + 1) + '" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="' + (justIn ? 700 : 500) + '" fill="' + tcol + '">' + n.name + '</text><text x="' + n.x + '" y="' + (n.y + 11) + '" text-anchor="middle" font-family="JetBrains Mono" font-size="7" fill="' + (visible ? '#5c708a' : '#1c2636') + '">#' + n.id + ' parent:' + (n.mgr === null ? 'null' : n.mgr) + '</text></g>'
      })
      recSvg.innerHTML = str
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
  }, [])

  return (
    <SceneHost bg="#0a0e14">
      <canvas ref={canvasRef} className={s.bgCanvas} />
      <div ref={rootRef} className={s.root}>
        <div className={s.app}>
          {/* ============ HEADER ============ */}
          <header className={s.header}>
            <div className={s.brand}>
              <div className={s.logo}>db</div>
              <div>
                <div>
                  data<b>·</b>studio <span style={{ color: 'var(--dim)', fontWeight: 500 }}>/ schema.lab</span>
                </div>
                <div className={`${s.sub} ${s.mono}`}>DB 모델링 &amp; 데이터 아키텍처</div>
              </div>
            </div>
            <div className={s.tabs}>
              <button className={`${s.tab} ${s.active}`} data-view="erd">
                <span className={s.idx}>01</span> 도메인 ERD
              </button>
              <button className={s.tab} data-view="arch">
                <span className={s.idx}>02</span> 데이터 아키텍처
              </button>
              <button className={s.tab} data-view="sm">
                <span className={s.idx}>03</span> 상태머신 · 재귀쿼리
              </button>
            </div>
            <div className={s.spacer} />
            <div className={s.metaPill}>
              <span className={`${s.dot} ${s.live}`} /> <span data-id="engineLbl">PostgreSQL engine</span>
            </div>
            <div className={s.metaPill}>
              connected: <span style={{ color: 'var(--acc)' }}>local.dev</span>
            </div>
          </header>

          {/* ============ MAIN ============ */}
          <main className={s.main}>
            {/* ===== VIEW 1: ERD ===== */}
            <section className={`${s.view} ${s.active}`} data-id="view-erd">
              <div className={s.erdShell}>
                {/* tree */}
                <aside className={s.tree}>
                  <h4>schema model</h4>
                  <div className={s.modelSwitch} data-id="modelSwitch" />
                  <h4 style={{ paddingTop: 4 }}>tables</h4>
                  <div className={s.treeList} data-id="treeList" />
                </aside>

                {/* canvas */}
                <div className={s.canvasWrap} data-id="canvasWrap">
                  <div className={s.erdCanvas} data-id="erdCanvas">
                    <svg className={s.relSvg} data-id="relSvg" />
                    <div data-id="tableLayer" />
                  </div>
                  <div className={s.zoombar}>
                    <button className={s.zb} data-id="zin">
                      +
                    </button>
                    <button className={s.zb} data-id="zout">
                      &#8722;
                    </button>
                    <button className={s.zb} data-id="zfit">
                      &#10626;
                    </button>
                  </div>
                  <div className={s.hint}>
                    drag <b>캔버스</b> 패닝 · scroll <b>줌</b> · click <b>테이블 -&gt; DDL</b>
                  </div>
                  <div className={s.modelCaption} data-id="modelCaption" />
                  <div className={s.erdStats}>
                    <div className={s.erdStat}>
                      <span className={s.lbl}>예시 rows</span>
                      <span className={s.val} data-id="erdRows">
                        --
                      </span>
                    </div>
                    <div className={s.erdStat}>
                      <span className={s.lbl}>예시 qps</span>
                      <span className={`${s.val} ${s.blue}`} data-id="erdQps">
                        --
                      </span>
                    </div>
                    <div className={s.erdStat}>
                      <span className={s.lbl}>예시 active tx</span>
                      <span className={`${s.val} ${s.gold}`} data-id="erdTx">
                        --
                      </span>
                    </div>
                    <div className={s.erdStat}>
                      <span className={s.lbl}>예시 repl lag</span>
                      <span className={s.val} data-id="erdLag">
                        --
                      </span>
                    </div>
                  </div>
                </div>

                {/* DDL */}
                <aside className={s.ddl}>
                  <div className={s.ddlH}>
                    <span className={s.tg}>DDL</span>
                    <span className={`${s.ti} ${s.mono}`} data-id="ddlTitle">
                      &#8212;
                    </span>
                    <button className={s.copy} data-id="copyBtn">
                      copy
                    </button>
                  </div>
                  <div className={s.ddlBody}>
                    <pre className={s.code} data-id="ddlCode" />
                  </div>
                  <div className={s.relsNote}>
                    <h5>relationships</h5>
                    <div data-id="relList" />
                  </div>
                </aside>
              </div>
            </section>

            {/* ===== VIEW 2: ARCHITECTURE ===== */}
            <section className={s.view} data-id="view-arch">
              <div className={s.arch}>
                <div className={s.archHead}>
                  <div>
                    <h2>
                      공정 데이터 <span className={s.em}>수집 → 정규화 DB → Power BI</span> 파이프라인
                    </h2>
                    <p>
                      엑셀 파편화(생산일보·공수·불량 각개 관리) 안티패턴을 제거.{' '}
                      <b style={{ color: 'var(--acc)' }}>PostgreSQL 정규화 DB</b>(1NF/2NF/3NF)에 단일 입력하고, 자체개발 MES가 OPC UA 설비 데이터와 계층형 S/N 바코드를 연결 — Power BI에서 공수·생산현황·불량 리스크 범위를 투명하게 집계.
                    </p>
                  </div>
                  <div className={s.archCtrl}>
                    <button className={s.btn} data-id="archSpeed">
                      speed: 1x
                    </button>
                    <button className={`${s.btn} ${s.primary}`} data-id="archToggle">
                      &#9646;&#9646; pause flow
                    </button>
                  </div>
                </div>

                <div className={s.archStage} data-id="archStage">
                  <svg className={s.flowSvg} data-id="flowSvg" />

                  <aside className={s.archAside}>
                    <div className={s.card}>
                      <h6>&#10007; anti-pattern</h6>
                      <p>
                        <b style={{ color: 'var(--red)' }}>엑셀 파편화</b>: 생산일보·공수·불량을 각기 다른 파일로 관리 — 집계 오류·중복·추적 불가.
                      </p>
                    </div>
                    <div className={s.card}>
                      <h6>정규화 설계 근거</h6>
                      <p>1NF/2NF/3NF 준수. PK/FK 명시, UNIQUE·partial index·CHECK 제약으로 중복과 상태 오류를 DB 레벨에서 차단.</p>
                      <span className={s.tag}>1NF/2NF/3NF</span>
                      <span className={s.tag}>PK/FK</span>
                      <span className={s.tag}>PostgreSQL</span>
                    </div>
                    <div className={s.card}>
                      <h6>S/N 추적성</h6>
                      <p>
                        시리얼 번호 기반 조회로 <b style={{ color: 'var(--acc2)' }}>불량 리스크 범위</b> 측정 가능. 필드 원자재 불량 재발 방지.
                      </p>
                    </div>
                  </aside>

                  <div className={s.counter}>
                    <div className={`${s.big} ${s.mono}`} data-id="evtCount">
                      0
                    </div>
                    <div className={s.lbl}>records committed &#8594; Power BI</div>
                  </div>

                  <div className={s.cdcLogWrap} data-id="cdcLogWrap">
                    <div className={s.cdcLogHead}>
                      <span className={`${s.dot} ${s.live}`} />
                      예시 변경 이벤트
                      <b data-id="cdcLogTag">MES / PostgreSQL</b>
                      <span className={`${s.qps} ${s.mono}`} data-id="cdcQps">
                        예시 -- evt/s
                      </span>
                    </div>
                    <div className={s.cdcLogBody} data-id="cdcLogBody" />
                  </div>

                  <div className={s.legend}>
                    <span>
                      <i style={{ background: 'var(--acc)' }} />
                      DB 입력
                    </span>
                    <span>
                      <i style={{ background: 'var(--acc2)' }} />
                      OPC UA 수집
                    </span>
                    <span>
                      <i style={{ background: 'var(--gold)' }} />
                      PostgreSQL 저장
                    </span>
                    <span>
                      <i style={{ background: 'var(--viol)' }} />
                      Power BI 출력
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== VIEW 3: STATE MACHINE + RECURSIVE ===== */}
            <section className={s.view} data-id="view-sm">
              <div className={s.smShell}>
                {/* LEFT: state machine */}
                <div className={`${s.pane} ${s.left}`}>
                  <div className={s.paneH}>
                    <h3>
                      <span className={s.em}>work_order</span> 상태머신
                    </h3>
                    <p className={s.mono}>OPEN &#8594; IN_PROGRESS &#8594; COMPLETED · HOLD/retry</p>
                  </div>
                  <div className={s.paneBody}>
                    <svg className={s.smSvg} data-id="smSvg" viewBox="0 0 560 420" preserveAspectRatio="xMidYMid meet" />
                    <div className={s.smInfo}>
                      <h6>current row · work_order</h6>
                      <div className={s.row}>
                        wo_no <b className={s.mono}>23P30027KMDA1</b>
                      </div>
                      <div className={s.row}>
                        status{' '}
                        <b className={`${s.cur} ${s.mono}`} data-id="smState">
                          OPEN
                        </b>
                      </div>
                      <div className={s.row}>
                        retry_count{' '}
                        <b className={s.mono} data-id="smRetry">
                          0
                        </b>
                      </div>
                      <div className={s.row}>
                        next_retry_ts{' '}
                        <b className={s.mono} data-id="smNext">
                          &#8212;
                        </b>
                      </div>
                    </div>
                    <div className={s.smCtrl}>
                      <button className={`${s.btn} ${s.primary}`} data-id="smStep">
                        &#9654; step transition
                      </button>
                      <button className={s.btn} data-id="smFail">
                        &#9889; inject failure
                      </button>
                      <button className={s.btn} data-id="smReset">
                        reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* RIGHT: recursive query */}
                <div className={s.pane}>
                  <div className={s.paneH}>
                    <h3>
                      <span className={s.em}>WITH RECURSIVE</span> · BOM 다단계 전개
                    </h3>
                    <p className={s.mono}>bom_line(id PK, parent_id FK-&gt;id, component_no, qty_per)</p>
                  </div>
                  <div className={s.recTop}>
                    <pre data-id="recSql" />
                  </div>
                  <div className={s.recCanvas}>
                    <svg className={s.recSvg} data-id="recSvg" viewBox="0 0 560 300" preserveAspectRatio="xMidYMid meet" />
                    <div className={s.lvlBadge}>
                      recursion depth: <b data-id="recDepth">0</b>
                    </div>
                    <div className={s.recCtrl}>
                      <button className={`${s.btn} ${s.primary}`} data-id="recRun">
                        &#9654; run recursive CTE
                      </button>
                      <button className={s.btn} data-id="recReset">
                        reset
                      </button>
                    </div>
                  </div>
                  <div className={s.depthStrip}>
                    <span className={s.chip}>
                      covering index <b>(parent_id, id)</b>
                    </span>
                    <span className={s.chip}>
                      partial index <b>WHERE parent_id IS NULL</b>
                    </span>
                    <span className={s.chip}>expanded_qty = levels(n-1) × qty_per</span>
                    <span className={s.chip}>anchor + UNION ALL</span>
                    <span className={s.chip}>
                      Make/Buy <b>E / EP / SC</b> 분류
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </main>

          {/* ============ FOOTER ============ */}
          <footer className={s.footer}>
            <div className={`${s.seg} ${s.accent}`} data-id="footView">
              01 · ERD
            </div>
            <div className={s.seg} data-id="footEngine">
              PostgreSQL · 정규화 MES 스키마
            </div>
            <div className={s.seg} data-id="footTbl">
              tables: --
            </div>
            <div className={s.seg}>MES 공정기술 · DB 아키텍처</div>
            <div className={s.spacer} style={{ flex: 1 }} />
          </footer>
        </div>
      </div>
    </SceneHost>
  )
}
