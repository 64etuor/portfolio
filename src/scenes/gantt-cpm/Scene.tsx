'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  COLORS,
  COMPANIES,
  DERIVED,
  KPIS,
  MILES,
  PROJECTS,
  REWIND_ROUTES,
  ROWS,
  SKILLS,
  T0,
  T1,
  TODAY,
  type Kpi,
  type Row,
} from './data'

/* ════════════════════════════════════════════════════════════════
   SCENE · 커리어 타임라인 & 프로젝트 임팩트 보드 (gantt-cpm.html 이식)
   회사 5社 = 크리티컬 패스 / 프로젝트 16건 = 병렬(Float). gantt = career CANON.
   복잡한 SVG/스코어카드/디테일 패널은 ref 컨테이너에 imperative 로 빌드(실용적).
   삭제됨: resize/DPR/rAF boot/fonts.ready. running false → 멱등(빌드 1회).
   ════════════════════════════════════════════════════════════════ */

const NS = 'http://www.w3.org/2000/svg'

function fmtYM(d: Date) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}
function span(d: Date) {
  return (d.getTime() - T0.getTime()) / (T1.getTime() - T0.getTime())
}
function eio(t: number) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
}

function sparkSVG(data: number[], color: string, w = 46, h = 16) {
  const min = Math.min(...data),
    max = Math.max(...data),
    rng = max - min || 1
  const pts = data
    .map((d, i) => {
      const px = (i / (data.length - 1)) * (w - 2) + 1
      const py = h - 1 - ((d - min) / rng) * (h - 2)
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(' ')
  const last = data[data.length - 1]
  const lx = w - 2 + 1,
    ly = h - 1 - ((last - min) / rng) * (h - 2)
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.8" fill="${color}"/></svg>`
}

export default function Scene({ running = true, onReady }: SceneProps) {
  void running // 이 씬은 캔버스 tick 이 없는 정적 인터랙티브 보드 — DOM 빌드는 멱등 1회.
  const rootRef = useRef<HTMLDivElement | null>(null)
  const boardWrapRef = useRef<HTMLElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const railRef = useRef<HTMLDivElement | null>(null)
  const boardHdRef = useRef<HTMLDivElement | null>(null)
  const kpisRef = useRef<HTMLDivElement | null>(null)
  const derivedRef = useRef<HTMLDivElement | null>(null)
  const skillsRef = useRef<HTMLDivElement | null>(null)
  const heroNumRef = useRef<HTMLSpanElement | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)
  const tipRef = useRef<HTMLDivElement | null>(null)
  const cpToggleRef = useRef<HTMLDivElement | null>(null)
  const dimToggleRef = useRef<HTMLDivElement | null>(null)
  const readyFired = useRef(false)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  useEffect(() => {
    const root = rootRef.current
    const svg = svgRef.current
    const boardWrap = boardWrapRef.current
    const detail = detailRef.current
    const tip = tipRef.current
    const cpToggle = cpToggleRef.current
    const dimToggle = dimToggleRef.current
    if (!root || !svg || !boardWrap || !detail || !tip || !cpToggle || !dimToggle) return

    let cpOn = true,
      dimOn = true
    let replayTimers: ReturnType<typeof setTimeout>[] = []
    const cleanups: Array<() => void> = []

    function el<K extends keyof SVGElementTagNameMap>(
      tag: K,
      attrs: Record<string, string | number> = {},
      parent?: Element
    ): SVGElementTagNameMap[K] {
      const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K]
      for (const k in attrs) e.setAttribute(k, String(attrs[k]))
      if (parent) parent.appendChild(e)
      return e
    }

    /* ---------- tooltip ---------- */
    function positionTip(e: MouseEvent) {
      if (!tip) return
      const rect = root!.getBoundingClientRect()
      const pad = 14
      let x = e.clientX - rect.left + 16,
        y = e.clientY - rect.top + 16
      const r = tip.getBoundingClientRect()
      if (x + r.width > rect.width - pad) x = e.clientX - rect.left - r.width - 16
      if (y + r.height > rect.height - pad) y = e.clientY - rect.top - r.height - 16
      tip.style.left = x + 'px'
      tip.style.top = y + 'px'
    }
    function showTip(e: MouseEvent, t: Row) {
      if (!tip) return
      const top = t.metrics[0],
        second = t.metrics[1]
      tip.innerHTML = `<div class="${s.h}">${t.co} · ${t.role}</div>
        <div class="${s.m}">${top.k}: ${top.v}${second ? ' · ' + second.k + ': ' + second.v : ''}</div>
        <div class="${s.row}">${
        t.crit
          ? '크리티컬 패스'
          : t.kind === 'study'
            ? '역량 보강 (부트캠프)'
            : t.slack > 0
              ? '병렬 (Float ' + t.slack + 'mo)'
              : '자기주도 프로젝트'
      } · 클릭하여 상세</div>`
      tip.classList.add(s.show)
      positionTip(e)
    }
    function hideTip() {
      if (tip) tip.classList.remove(s.show)
    }

    /* ---------- detail / verification replay ---------- */
    const REPLAY_STEPS = [
      { id: 'problem', ms: 2000 },
      { id: 'built', ms: 3000 },
      { id: 'metrics', ms: 2000 },
    ]
    const secRefs: Record<string, HTMLElement | null> = {
      problem: detail!.querySelector(`[data-sec="problem"]`),
      built: detail!.querySelector(`[data-sec="built"]`),
      metrics: detail!.querySelector(`[data-sec="metrics"]`),
    }
    function clearVerificationReplay() {
      replayTimers.forEach(clearTimeout)
      replayTimers = []
      Object.values(secRefs).forEach((sec) => sec && sec.classList.remove(s.replayActive))
    }
    function startVerificationReplay() {
      clearVerificationReplay()
      let elapsed = 0
      REPLAY_STEPS.forEach((step, idx) => {
        replayTimers.push(
          setTimeout(() => {
            REPLAY_STEPS.forEach((st) => {
              const sec = secRefs[st.id]
              if (sec) sec.classList.toggle(s.replayActive, st.id === step.id)
            })
            const active = secRefs[step.id]
            if (active && window.self === window.top) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, elapsed)
        )
        elapsed += step.ms
        if (idx === REPLAY_STEPS.length - 1) {
          replayTimers.push(setTimeout(clearVerificationReplay, elapsed))
        }
      })
    }
    function rewindToScene(key: string) {
      const path = REWIND_ROUTES[key]
      if (!path) return
      try {
        const targetWindow = window.top && window.top !== window ? window.top : window
        targetWindow.location.href = path
      } catch {
        window.location.href = path
      }
    }

    const dBar = detail!.querySelector<HTMLElement>('[data-d="bar"]')!
    const dCo = detail!.querySelector<HTMLElement>('[data-d="co"]')!
    const dTi = detail!.querySelector<HTMLElement>('[data-d="ti"]')!
    const dPd = detail!.querySelector<HTMLElement>('[data-d="pd"]')!
    const dCrit = detail!.querySelector<HTMLElement>('[data-d="crit"]')!
    const dProblem = detail!.querySelector<HTMLElement>('[data-d="problem"]')!
    const dBuilt = detail!.querySelector<HTMLElement>('[data-d="built"]')!
    const dStack = detail!.querySelector<HTMLElement>('[data-d="stack"]')!
    const dMetrics = detail!.querySelector<HTMLElement>('[data-d="metrics"]')!
    const dRewind = detail!.querySelector<HTMLButtonElement>('[data-d="rewind"]')!
    const dReplay = detail!.querySelector<HTMLButtonElement>('[data-d="replay"]')!
    const dX = detail!.querySelector<HTMLElement>('[data-d="x"]')!

    function openDetail(t: Row) {
      dBar.style.background = t.kind === 'study' ? COLORS.self : t.color
      dCo.textContent = t.co
      dTi.textContent = t.role
      dPd.textContent = `${fmtYM(t.start)} – ${t.ongoing ? '현재' : fmtYM(t.end)} · 진척 ${t.pct}%`

      dCrit.style.cssText = ''
      if (t.crit) {
        dCrit.className = s.detailCrit
        dCrit.textContent = '● CRITICAL PATH · 이 경력은 커리어 핵심 의존 체인 위에 있습니다 (Slack 0)'
      } else if (t.kind === 'study') {
        dCrit.className = `${s.detailCrit} ${s.off}`
        dCrit.textContent = '◇ 역량 보강 · 부트캠프 학습 과정'
      } else if (t.award) {
        dCrit.className = s.detailCrit
        dCrit.textContent = `★ ${t.award} · 자기주도 프로젝트`
      } else {
        dCrit.className = `${s.detailCrit} ${s.off}`
        dCrit.textContent = t.slack > 0 ? `○ 병렬 프로젝트 · 여유(Float) ${t.slack}개월` : '○ 자기주도 프로젝트 · 회사 성과의 본선 기여'
      }

      dProblem.textContent = t.problem || t.desc
      dBuilt.textContent = t.built || ''

      dStack.innerHTML = ''
      ;(t.stack || []).forEach((sk) => {
        const e = document.createElement('span')
        e.className = s.s
        e.textContent = sk
        dStack.appendChild(e)
      })

      dMetrics.innerHTML = ''
      ;(t.metrics || []).forEach((m) => {
        const d = document.createElement('div')
        d.className = s.dm
        d.innerHTML = `<div class="${s.k}">${m.k}</div><div class="${s.vv} ${m.cls === 'g' ? s.g : ''}">${m.v}</div><div class="${s.cc}">${m.c}</div>`
        dMetrics.appendChild(d)
      })

      dRewind.dataset.rewind = t.rewind || ''
      detail!.classList.add(s.show)
      startVerificationReplay()
    }

    const onX = () => {
      clearVerificationReplay()
      detail!.classList.remove(s.show)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearVerificationReplay()
        detail!.classList.remove(s.show)
      }
    }
    const onRewindClick = function (this: HTMLButtonElement) {
      rewindToScene(this.dataset.rewind || '')
    }
    dX.addEventListener('click', onX)
    document.addEventListener('keydown', onKey)
    dRewind.addEventListener('click', onRewindClick)
    dReplay.addEventListener('click', startVerificationReplay)
    cleanups.push(() => {
      dX.removeEventListener('click', onX)
      document.removeEventListener('keydown', onKey)
      dRewind.removeEventListener('click', onRewindClick)
      dReplay.removeEventListener('click', startVerificationReplay)
    })

    /* ---------- critical-path / dim — 단일 소스: svg 의 cp·dim 클래스 (나머지 전부 CSS) ---------- */
    function applyCP() {
      svg!.classList.toggle(s.cp, cpOn)
      svg!.classList.toggle(s.dim, dimOn)
    }
    function setTog(elm: HTMLElement, on: boolean) {
      elm.classList.toggle(s.on, on)
      elm.setAttribute('aria-pressed', String(on))
    }
    const onCp = () => {
      cpOn = !cpOn
      setTog(cpToggle!, cpOn)
      applyCP()
    }
    const onDim = () => {
      dimOn = !dimOn
      setTog(dimToggle!, dimOn)
      applyCP()
    }
    const onTogKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).click()
      }
    }
    cpToggle.addEventListener('click', onCp)
    dimToggle.addEventListener('click', onDim)
    cpToggle.addEventListener('keydown', onTogKey)
    dimToggle.addEventListener('keydown', onTogKey)
    cleanups.push(() => {
      cpToggle!.removeEventListener('click', onCp)
      dimToggle!.removeEventListener('click', onDim)
      cpToggle!.removeEventListener('keydown', onTogKey)
      dimToggle!.removeEventListener('keydown', onTogKey)
    })

    /* ---------- gantt build ---------- */
    let barRAF = 0
    function buildGantt() {
      while (svg!.firstChild) svg!.removeChild(svg!.firstChild)
      if (barRAF) cancelAnimationFrame(barRAF)
      const W = svg!.clientWidth || boardWrap!.clientWidth
      if (W <= 0) return // layout not ready — ResizeObserver or tryInit will retry
      const padL = 212,
        padR = 22,
        padT = 46,
        BOT = 30
      const plotW = W - padL - padR
      const slot = (t: Row) => (t.tier === 1 ? { gap: 5, h: 27 } : { gap: 11, h: 40 })
      const naturalBand = ROWS.reduce((acc, t) => {
        const r = slot(t)
        return acc + r.gap + r.h
      }, 0)
      let scale = 1
      const railEl = railRef.current
      const hdEl = boardHdRef.current
      if (window.innerWidth > 1080 && railEl && hdEl) {
        const avail = railEl.getBoundingClientRect().height - hdEl.getBoundingClientRect().height - padT - BOT - 2
        if (avail > 120) scale = Math.max(0.66, Math.min(1.7, avail / naturalBand))
      }
      let yy = padT
      const RG: Record<string, { top: number; h: number; cy: number }> = {}
      ROWS.forEach((t) => {
        const r = slot(t)
        yy += r.gap * scale
        const h = r.h * scale
        RG[t.id] = { top: yy, h, cy: yy + h / 2 }
        yy += h
      })
      const H = yy + BOT
      svg!.setAttribute('viewBox', `0 0 ${W} ${H}`)
      svg!.setAttribute('height', String(H))

      const x = (d: Date) => padL + span(d) * plotW

      const defs = el('defs', {}, svg!)
      function marker(id: string, color: string) {
        const m = el('marker', { id, markerWidth: 8, markerHeight: 8, refX: 6.5, refY: 3.2, orient: 'auto', markerUnits: 'userSpaceOnUse' }, defs)
        el('path', { d: 'M0,0 L7,3.2 L0,6.4 Z', fill: color }, m)
      }
      marker('arrCrit', '#f05555')
      marker('arrNorm', '#3e4e62')

      // ---- year/quarter grid ----
      const gridG = el('g', {}, svg!)
      for (let y = 2020; y <= 2026; y++) {
        for (let q = 1; q <= 4; q++) {
          const mm = (q - 1) * 3 + 1
          const qd = new Date(y, mm - 1, 1)
          if (qd < T0 || qd > T1) continue
          const gx = x(qd)
          el('line', { x1: gx, y1: padT - 10, x2: gx, y2: H - 22, stroke: 'var(--grid)', 'stroke-width': 1 }, gridG)
          const ql = el('text', { x: gx + 4, y: padT - 16, fill: 'var(--ink-3)', 'font-size': 9, 'font-family': 'var(--mono)', 'letter-spacing': '.05em' }, gridG)
          ql.textContent = `Q${q}`
        }
        const yd = new Date(y, y === 2020 ? 6 : 0, 1)
        if (yd < T0) continue
        const yx = x(yd)
        el('line', { x1: yx, y1: padT - 26, x2: yx, y2: H - 22, stroke: 'var(--rule)', 'stroke-width': 1.4 }, gridG)
        const yl = el('text', { x: yx + 5, y: padT - 30, fill: 'var(--ink)', 'font-size': 12, 'font-weight': 800, 'letter-spacing': '-.01em' }, gridG)
        yl.textContent = String(y)
      }
      el('line', { x1: padL, y1: padT - 26, x2: padL, y2: H - 22, stroke: 'var(--rule)', 'stroke-width': 1.4 }, gridG)

      const boxes: Record<string, { x: number; x2: number; y: number; cy: number; w: number; h: number }> = {}

      const rowsG = el('g', {}, svg!)

      // tier-1 tree brackets
      const brG = el('g', { class: 'brackets' }, rowsG)
      COMPANIES.forEach((c) => {
        const kids = PROJECTS.filter((p) => p.parent === c.id)
        if (!kids.length) return
        const cTop = RG[c.id],
          last = RG[kids[kids.length - 1].id]
        const gx = 22
        el('line', { x1: gx, y1: cTop.cy + 8, x2: gx, y2: last.cy, stroke: c.color, 'stroke-opacity': 0.32, 'stroke-width': 1.4 }, brG)
        kids.forEach((k) => {
          const r = RG[k.id]
          el('line', { x1: gx, y1: r.cy, x2: 38, y2: r.cy, stroke: c.color, 'stroke-opacity': 0.32, 'stroke-width': 1.4 }, brG)
        })
      })

      ROWS.forEach((t) => {
        const r0 = RG[t.id]
        const cy = r0.cy
        const isP = t.tier === 1
        const barCol = isP && t.kind === 'study' ? COLORS.self : t.color
        const bh = Math.max(7, Math.min(isP ? 14 : 18, r0.h - 6)),
          bhh = bh / 2
        const bx = x(t.start),
          bx2 = x(t.end),
          bw = Math.max(8, bx2 - bx)
        boxes[t.id] = { x: bx, x2: bx2, y: r0.top, cy, w: bw, h: r0.h }

        const cls = t.crit ? `${s.task} ${s.crit}` : `${s.task} ${s.nc}`
        const g = el('g', { class: cls, 'data-id': t.id, style: 'cursor:pointer' }, rowsG)

        el('rect', { x: 0, y: r0.top - 2, width: W, height: r0.h + 4, fill: 'transparent' }, g)

        const lblG = el('g', {}, g)
        if (!isP) {
          el('rect', { x: 14, y: cy - 8, width: 4, height: 16, rx: 1.5, fill: t.color }, lblG)
          const co = el('text', { x: 24, y: cy - 2, fill: 'var(--ink)', 'font-size': 11.5, 'font-weight': 800 }, lblG)
          co.textContent = t.co
          const rl = el('text', { x: 24, y: cy + 11, fill: t.color, 'font-size': 9.6, 'font-weight': 600, 'font-family': 'var(--mono)', 'fill-opacity': 0.95 }, lblG)
          rl.textContent = t.role.length > 30 ? t.role.slice(0, 29) + '…' : t.role
        } else {
          const study = t.kind === 'study'
          if (study) {
            el('rect', { x: 38, y: cy - 7, width: 8, height: 14, rx: 3, fill: COLORS.self }, lblG)
            el('path', { d: `M ${40.5} ${cy} L ${42} ${cy + 2} L ${44.5} ${cy - 2.6}`, fill: 'none', stroke: '#06241a', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': 0.75 }, lblG)
          } else {
            el('rect', { x: 42, y: cy - 6, width: 3, height: 12, rx: 1.5, fill: t.color, 'fill-opacity': 0.9 }, lblG)
          }
          const nm = el('text', { x: 50, y: cy - 1.5, fill: '#ccd4e0', 'font-size': 10, 'font-weight': 700 }, lblG)
          nm.textContent = t.role.length > 25 ? t.role.slice(0, 24) + '…' : t.role
          const sub = el('text', { x: 50, y: cy + 9, fill: study ? '#7fd4b3' : 'var(--ink-2)', 'font-size': 8, 'font-family': 'var(--mono)' }, lblG)
          sub.textContent = t.co
        }

        el('rect', { x: bx, y: cy - bhh, width: bw, height: bh, rx: 5, fill: '#1c2330', stroke: 'var(--line-2)', 'stroke-width': 1 }, g)

        let pct = t.pct
        if (t.ongoing) {
          const st = t.start.getTime(),
            e = t.end.getTime()
          const tdy = Math.max(st, Math.min(TODAY.getTime(), e))
          pct = Math.round(((tdy - st) / (e - st)) * 100)
        }
        const fw = bw * (pct / 100)
        const grad = `grad-${t.id}`
        const lg = el('linearGradient', { id: grad, x1: 0, y1: 0, x2: 1, y2: 0 }, defs)
        el('stop', { offset: '0%', 'stop-color': barCol, 'stop-opacity': 0.92 }, lg)
        const stopEnd = el('stop', { offset: '100%', 'stop-color': barCol, 'stop-opacity': 0.74 }, lg)
        if (t.ongoing) stopEnd.classList.add(s.mirShimmer)
        const fill = el('rect', { x: bx, y: cy - bhh, width: 0, height: bh, rx: 5, fill: `url(#${grad})` }, g)
        fill.dataset.target = String(fw)
        if (!isP) {
          const pl = el('text', { x: bx + 8, y: cy + 3.6, fill: '#fff', 'font-size': 9.5, 'font-weight': 800, 'font-family': 'var(--mono)', 'pointer-events': 'none' }, g)
          pl.textContent = t.ongoing ? `${pct}% · 진행중` : `${pct}%`
        }

        const endLabel = t.ongoing ? '현재' : fmtYM(t.end)
        const periodStr = `${fmtYM(t.start)}–${endLabel}`
        if (!isP) {
          const pdl = el('text', { x: bx2 - 7, y: cy + 3, fill: '#fff', 'font-size': 8.5, 'font-weight': 700, 'font-family': 'var(--mono)', 'text-anchor': 'end', 'fill-opacity': 0.9, 'letter-spacing': '.01em', 'pointer-events': 'none' }, g)
          pdl.textContent = periodStr
        } else {
          let tailX = bx2
          if (t.slack > 0) {
            const sd = new Date(t.end)
            sd.setMonth(sd.getMonth() + t.slack)
            tailX = x(sd > T1 ? T1 : sd)
          }
          const ptxt = t.ongoing ? `${pct}%·진행` : periodStr
          const approxW = ptxt.length * 4.7
          const edge = W - padR - 2
          let px = tailX + 6,
            anchor = 'start'
          if (px + approxW > edge) {
            px = edge
            anchor = 'end'
          }
          const pdl = el('text', { x: px, y: cy + 3, 'text-anchor': anchor, fill: 'var(--ink-3)', 'font-size': 8, 'font-family': 'var(--mono)', 'pointer-events': 'none' }, g)
          pdl.textContent = ptxt
        }

        if (pct < 100) {
          const edgeX = bx + fw
          el('line', { x1: edgeX, y1: cy - bhh, x2: edgeX, y2: cy + bhh, stroke: t.color, 'stroke-width': 2.5, 'stroke-linecap': 'round', class: s.ongoingEdge, 'data-color': t.color }, g)
        }
        if (t.crit) {
          el('rect', { x: bx - 1.5, y: cy - bhh - 1.5, width: bw + 3, height: bh + 3, rx: 6, fill: 'none', stroke: '#f05555', 'stroke-width': 1.6, 'stroke-opacity': 0.85, class: `${s.critline} ${s.critlineAnimated}` }, g)
        }
        if (t.slack > 0) {
          const sx = x(t.end)
          const slackD = new Date(t.end)
          slackD.setMonth(slackD.getMonth() + t.slack)
          const sx2 = x(slackD > T1 ? T1 : slackD)
          el('rect', { x: sx, y: cy - 4, width: Math.max(0, sx2 - sx), height: 8, rx: 3, fill: t.color, 'fill-opacity': 0.14, stroke: t.color, 'stroke-opacity': 0.4, 'stroke-dasharray': '2 3', 'stroke-width': 1 }, g)
        }

        g.addEventListener('click', () => openDetail(t))
        g.addEventListener('mousemove', (e) => showTip(e, t))
        g.addEventListener('mouseleave', hideTip)
      })

      // ---- dependency arrows (FS) ----
      const depG = el('g', { class: 'deps' }, svg!)
      COMPANIES.forEach((t) => {
        t.deps.forEach((pid) => {
          const a = boxes[pid],
            b = boxes[t.id]
          if (!a || !b) return
          const isCrit = t.crit && COMPANIES.find((c) => c.id === pid)?.crit
          const sx = a.x2,
            sy = a.cy,
            ex = b.x,
            ey = b.cy
          const d = `M ${sx} ${sy} L ${sx + 12} ${sy} L ${sx + 12} ${ey} L ${ex - 7} ${ey}`
          // 색/굵기/마커는 .dep(기본) + .gantt.cp .critdep(CSS)로 제어 — inline 상태 없음
          el('path', { d, class: isCrit ? `${s.dep} ${s.critdep}` : `${s.dep} ${s.nc}` }, depG)
        })
      })

      // ---- milestones ----
      const milG = el('g', {}, svg!)
      const milesByRow: Record<string, typeof MILES> = {}
      MILES.forEach((m) => {
        if (RG[m.row]) (milesByRow[m.row] = milesByRow[m.row] || []).push(m)
      })
      Object.values(milesByRow).forEach((list) => {
        list.sort((a, b) => a.at.getTime() - b.at.getTime())
        list.forEach((m, idx) => {
          const cy = RG[m.row].cy
          const mx = x(m.at)
          const sz = 6
          const dcy = cy - 15
          el('path', { d: `M ${mx} ${dcy - sz} L ${mx + sz} ${dcy} L ${mx} ${dcy + sz} L ${mx - sz} ${dcy} Z`, fill: 'var(--ink)', stroke: 'var(--paper)', 'stroke-width': 1.3 }, milG)
          const lane = idx % 2
          const labY = dcy - 5 - lane * 11
          const anchor = mx > W - padR - 150 ? 'end' : 'start'
          const lx = anchor === 'end' ? mx - sz - 5 : mx + sz + 5
          if (lane > 0) {
            el('line', { x1: mx, y1: dcy - sz, x2: mx, y2: labY + 3, stroke: 'var(--line-2)', 'stroke-width': 1 }, milG)
          }
          const ml = el('text', { x: lx, y: labY, 'text-anchor': anchor, fill: 'var(--ink-2)', 'font-size': 8.7, 'font-family': 'var(--mono)', 'letter-spacing': '.01em' }, milG)
          ml.textContent = m.label
        })
      })

      // ---- TODAY line ----
      const tx = x(TODAY)
      const todayG = el('g', { class: s.todayGroup }, svg!)
      el('line', { x1: tx, y1: padT - 26, x2: tx, y2: H - 22, stroke: 'var(--today)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3' }, todayG)
      const tflag = el('g', {}, todayG)
      el('rect', { x: tx - 26, y: padT - 44, width: 52, height: 15, rx: 3, fill: 'var(--today)' }, tflag)
      const tt = el('text', { x: tx, y: padT - 33, fill: '#fff', 'font-size': 9, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'var(--mono)', 'letter-spacing': '.06em' }, tflag)
      tt.textContent = 'TODAY'

      // animate fills — rAF, easeInOutCubic, staggered
      {
        const fills = [...svg!.querySelectorAll<SVGRectElement>('rect[data-target]')]
        const DUR = 1000,
          STAGGER = 80
        let started: number | null = null
        const tickBars = (now: number) => {
          if (!started) started = now
          const elapsed = now - started
          let anyRunning = false
          fills.forEach((r, idx) => {
            const delay = idx * STAGGER
            const local = Math.max(0, elapsed - delay)
            const p = Math.min(1, local / DUR)
            const tgt = +(r.dataset.target || 0)
            r.setAttribute('width', String(tgt * eio(p)))
            if (p < 1) anyRunning = true
          })
          if (anyRunning) barRAF = requestAnimationFrame(tickBars)
          else fills.forEach((r) => r.setAttribute('width', String(+(r.dataset.target || 0))))
        }
        barRAF = requestAnimationFrame(tickBars)
      }

      applyCP()
    }

    /* ---------- scorecard renders ---------- */
    function renderKPIs() {
      const wrap = kpisRef.current
      if (!wrap) return
      wrap.innerHTML = ''
      KPIS.forEach((k: Kpi) => {
        const d = document.createElement('div')
        d.className = `${s.kpi} ${k.cls === 'dn' ? s.dn : s.up}`
        const arrow = k.cls === 'dn' ? '▼' : '▲'
        d.innerHTML = `
          <div class="${s.cat}">${k.cat}</div>
          <div class="${s.spark}">${sparkSVG(k.spark, k.color)}</div>
          <div class="${s.v}"><span class="${s.n}">${k.n}</span><span class="${s.u}">${k.u}</span></div>
          <div class="${s.nm}">${k.nm}</div>
          <div class="${s.delta}">${arrow} ${k.delta}</div>
          <div class="${s.barbg}"><div class="${s.barfg}" style="width:0%;background:${k.color}"></div></div>`
        wrap.appendChild(d)
        {
          const bar = d.querySelector<HTMLElement>('.' + s.barfg)!
          const target = k.bar
          const DUR = 950
          let st: number | null = null
          const tickBar = (now: number) => {
            if (!st) st = now
            const p = Math.min(1, (now - st) / DUR)
            bar.style.width = target * eio(p) + '%'
            if (p < 1) requestAnimationFrame(tickBar)
            else bar.style.width = target + '%'
          }
          setTimeout(() => requestAnimationFrame(tickBar), 300)
        }
      })
    }
    function renderDerived() {
      const wrap = derivedRef.current
      if (!wrap) return
      wrap.innerHTML = ''
      DERIVED.forEach((xx) => {
        const d = document.createElement('div')
        d.className = s.dframe + (xx.est ? ' ' + s.estL : '')
        d.innerHTML = `<div class="${s.h}"><div class="${s.t}">${xx.t}${xx.tag ? `<span class="${s.tag}">` + xx.tag + '</span>' : ''}</div><div class="${s.v}">${xx.v}</div></div>
          <div class="${s.d}">${xx.d}</div>`
        wrap.appendChild(d)
      })
    }
    function renderSkills() {
      const wrap = skillsRef.current
      if (!wrap) return
      wrap.innerHTML = ''
      SKILLS.forEach(([group, items]) => {
        const section = document.createElement('div')
        section.className = s.skgroup
        const h = document.createElement('div')
        h.className = s.skgroupH
        h.textContent = group
        section.appendChild(h)
        const list = document.createElement('div')
        list.className = s.skgroupList
        items.forEach(([sk, core]) => {
          const e = document.createElement('span')
          e.className = s.sk + (core ? ' ' + s.core : '')
          e.textContent = sk
          list.appendChild(e)
        })
        section.appendChild(list)
        wrap.appendChild(section)
      })
    }

    function countUp(elm: HTMLElement, target: number, dur = 1700, sign = '') {
      elm.textContent = sign + target
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) return
      const startT = performance.now()
      elm.textContent = sign + '0'
      let shown = -1
      const tick = (now: number) => {
        const p = Math.min(1, (now - startT) / dur)
        const val = Math.min(target, Math.floor(p * (target + 1)))
        if (val !== shown) {
          shown = val
          elm.textContent = sign + val
        }
        if (p < 1) requestAnimationFrame(tick)
        else elm.textContent = sign + target
      }
      requestAnimationFrame(tick)
    }

    /* ---------- init ---------- */
    // Render static scorecard panels immediately (no layout dependency).
    renderKPIs()
    renderDerived()
    renderSkills()

    // buildGantt needs a real clientWidth. Use getBoundingClientRect for a
    // reliable measurement even before clientWidth reflects the CSS layout.
    // Use setTimeout (not rAF) so it survives React Strict Mode cleanup cycles.
    let heroCountStarted = false
    let initDone = false
    function runInit() {
      if (initDone) return
      const W = boardWrap!.getBoundingClientRect().width || boardWrap!.clientWidth || svg!.clientWidth
      if (W <= 0) return // still no layout — ResizeObserver will retry
      initDone = true
      buildGantt()
      if (!heroCountStarted && heroNumRef.current) {
        heroCountStarted = true
        countUp(heroNumRef.current, 16, 1700, '')
      }
    }

    // Try immediately (layout may already be settled on mount).
    runInit()
    // Fallback: defer one tick in case layout isn't ready synchronously.
    const initT0 = setTimeout(runInit, 0)
    const initT1 = setTimeout(runInit, 100)

    // resize → rebuild (debounced). Also first-time builds if runInit was skipped.
    let rt: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(rt)
      rt = setTimeout(() => {
        const W = boardWrap!.getBoundingClientRect().width || boardWrap!.clientWidth
        if (W <= 0) return
        if (!initDone) {
          initDone = true
          buildGantt()
          if (!heroCountStarted && heroNumRef.current) {
            heroCountStarted = true
            countUp(heroNumRef.current, 16, 1700, '')
          }
        } else {
          buildGantt()
        }
      }, 180)
    })
    ro.observe(boardWrap)

    return () => {
      clearTimeout(rt)
      clearTimeout(initT0)
      clearTimeout(initT1)
      ro.disconnect()
      if (barRAF) cancelAnimationFrame(barRAF)
      clearVerificationReplay()
      cleanups.forEach((fn) => fn())
    }
  }, [])

  return (
    <SceneHost className={s.root} bg="#0c0f14" scroll>
      <div className={s.app} ref={rootRef}>
        {/* masthead */}
        <header className={s.mast}>
          <div className={s.mastL}>
            <div className={s.kicker}>CAREER TIMELINE · CRITICAL PATH METHOD · PROJECT PORTFOLIO</div>
            <h1>
              <span className={s.nm}>박양하</span> &nbsp;<span className={s.subt}>커리어 타임라인 &amp; 프로젝트 임팩트 보드</span>
            </h1>
            <div className={s.roleRow}>
              <span className={`${s.rolePill} ${s.lead}`}>생산운영 PM · 공정기술 엔지니어</span>
              <span className={`${s.rolePill} ${s.lead}`}>데이터 · AI 시스템 빌더</span>
              <span className={s.rolePill}>제조 3社 + 데이터·SW·AI 보강</span>
              <span className={s.rolePill}>프로젝트 16건 · 수상 2회</span>
            </div>
          </div>
          <div className={s.mastR}>
            <div className={s.legend}>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-eun)' }} />은성</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-elen)' }} />이랜텍</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-sol)' }} />솔라엣지</span>
              <span className={s.lg}><span className={s.sw} style={{ background: 'var(--c-mir)' }} />스타트업</span>
              <span className={s.lg}><span className={s.sw} style={{ background: '#46c79a' }} />개인 PJ·교육</span>
              <span className={s.lg}><span className={s.swl} />크리티컬 패스(회사 · 제조 기준선→데이터 무결성→시스템 운영→AI 거버넌스)</span>
              <span className={s.lg}><span className={`${s.swl} ${s.t}`} />Today</span>
              <span className={s.lg}><span className={s.swd} />마일스톤</span>
            </div>
          </div>
        </header>

        {/* controls */}
        <div className={s.controls}>
          <div className={s.ctlL}>
            <div className={`${s.toggle} ${s.on}`} ref={cpToggleRef} role="button" tabIndex={0} aria-pressed="true">
              <span className={s.dot} />크리티컬 패스 강조
            </div>
            <div className={`${s.toggle} ${s.ghost} ${s.on}`} ref={dimToggleRef} role="button" tabIndex={0} aria-pressed="true">
              <span className={s.dot} />프로젝트 디밍
            </div>
            <span className={s.hint}>회사·프로젝트 막대를 클릭하면 역할 상세 + 비즈니스 임팩트가 열립니다.</span>
          </div>
          <div className={`${s.cpNote} ${s.mono}`}>
            CP = <b>제조 기준선 → 데이터 무결성 → 시스템 운영 → AI 거버넌스</b> · 프로젝트 = 병렬(Float)
          </div>
        </div>

        {/* main layout */}
        <div className={s.layout}>
          <section className={s.board} ref={boardWrapRef}>
            <div className={s.boardHd} ref={boardHdRef}>
              <h2>
                <span className={s.ix}>GANTT</span> 커리어 타임라인 · 회사 5社 + 프로젝트 16건 + 부트캠프 3종 · 마일스톤
              </h2>
              <div className={`${s.boardMeta} ${s.mono}`}>2020 Q3 → 2026 Q3 · 회사=크리티컬 패스 · 프로젝트=병렬 · Today 2026.06</div>
            </div>
            <svg className={s.gantt} ref={svgRef} role="img" aria-label="커리어 간트 차트" />
          </section>

          <aside className={s.rail} ref={railRef}>
            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>프로젝트 포트폴리오</span>
                <span className={s.b}>KEY IMPACT</span>
              </div>
              <div className={s.hero}>
                <div className={s.lbl}>자기주도로 기획·리딩한 프로젝트</div>
                <div className={s.big}>
                  <span className={`${s.num} ${s.heroNum}`} ref={heroNumRef}>0</span>
                  <span className={s.unit}>건 · 5社 · 6년</span>
                </div>
                <div className={s.subd}>
                  제조 현장(은성·이랜텍·솔라엣지)에서 SW·AI까지 — 비전검사·라인혁신·물류 SCM·데이터/추적성·<b>MES 자체개발</b>·CRM 플랫폼·AI 콕핏. 수상 2회(MOC Best·Core Value).
                </div>
                <span className={s.est}>집계: 회사 5社 위 자기주도 프로젝트 16건 · 2020.08–현재</span>
              </div>
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>커리어 임팩트 스코어카드</span>
                <span className={s.b}>SCORECARD · 회사별 대표</span>
              </div>
              <div className={s.catstrip}>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-eun)' }} />은성</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-elen)' }} />이랜텍</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-sol)' }} />솔라엣지</span>
                <span className={s.cattag}><span className={s.d} style={{ background: 'var(--c-bridge)' }} />삼성·SCM</span>
              </div>
              <div className={s.kpis} ref={kpisRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>파생 비즈니스 프레이밍</span>
                <span className={s.b}>DERIVED</span>
              </div>
              <div className={s.derived} ref={derivedRef} />
            </div>

            <div className={s.card}>
              <div className={s.cardHd}>
                <span className={s.t}>역량 스택</span>
                <span className={s.b}>CAPABILITY</span>
              </div>
              <div className={s.skills} ref={skillsRef} />
            </div>
          </aside>
        </div>

        <footer className={s.footer}>
          <div className={`${s.l} ${s.mono}`}>
            PARK YANGHA · 커리어 타임라인 &amp; 프로젝트 임팩트 · GANTT v17 · CPM · 제조 3社 + 데이터·SW·AI 보강 · 프로젝트 16건
          </div>
          <div className={`${s.r} ${s.mono}`}>회사 = 크리티컬 패스 · 프로젝트 = 병렬(Float) · 부트캠프 = 역량 보강</div>
        </footer>
      </div>

      {/* detail panel */}
      <div className={s.detail} ref={detailRef} aria-live="polite">
        <div className={s.detailBar} data-d="bar" />
        <div className={s.detailHd}>
          <div>
            <div className={s.co} data-d="co" />
            <div className={s.ti} data-d="ti" />
            <div className={`${s.pd} ${s.mono}`} data-d="pd" />
          </div>
          <div className={s.detailX} data-d="x" role="button" aria-label="닫기">✕</div>
        </div>
        <div className={s.detailCrit} data-d="crit" />
        <div className={s.detailBody}>
          <div className={s.vpSection} data-sec="problem">
            <div className={s.vpLabel}><span className={s.vpNum}>①</span>문제 · 상황</div>
            <div className={s.vpText} data-d="problem" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="built">
            <div className={s.vpLabel}><span className={s.vpNum}>②</span>직접 만든 도구 · 시스템</div>
            <div className={s.vpText} data-d="built" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>③</span>사용 기술</div>
            <div className={s.vpStack} data-d="stack" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection} data-sec="metrics">
            <div className={s.vpLabel}><span className={s.vpNum}>④</span>운영 · 개선 증거</div>
            <div className={`${s.vpMetrics} ${s.dmetrics}`} data-d="metrics" />
          </div>
          <div className={s.vpDivider} />
          <div className={s.vpSection}>
            <div className={s.vpLabel}><span className={s.vpNum}>⑤</span>관련 장면 되감기</div>
            <div className={s.vpActions}>
              <button className={s.vpRewind} data-d="rewind" type="button">↩ 관련 장면으로</button>
              <button className={s.vpReplay} data-d="replay" type="button">검증 리플레이</button>
            </div>
          </div>
        </div>
      </div>

      <div className={s.tip} ref={tipRef} />
    </SceneHost>
  )
}
