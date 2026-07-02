'use client'

import { useEffect, useRef, useState } from 'react'
import { useSceneReady } from '../_host/useSceneReady'
import type { SceneProps } from '../_host/types'
import { projectBySlug } from '@content/projects'
import { ProjectDrawer } from '@/components/projects/ProjectDrawer'
import s from './scene.module.css'
import { NS, eio, fmtYM, rowPct, span, sparkSVG } from './draw'
import { GanttView } from './view'
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
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null)
  useSceneReady(onReady)

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
      dimOn = false
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
      // key 가 '/s/...' 절대경로면 전용 씬 직행, 아니면 회사·시대 되감기 맵을 조회.
      const path = key.startsWith('/') ? key : REWIND_ROUTES[key]
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
    const dDoc = detail!.querySelector<HTMLButtonElement>('[data-d="doc"]')!
    const dX = detail!.querySelector<HTMLElement>('[data-d="x"]')!

    // 패널은 position:fixed → 뷰포트 좌표(clientX/clientY)에 직접 배치한다.
    // offsetParent·스크롤·중앙정렬 마진·스케일 transform 같은 좌표 함정을 피하려고
    // 클릭 지점(커서)에 패널 중심을 맞추고, 뷰포트 안으로만 클램프한다.
    function positionDetail(e?: MouseEvent) {
      if (!detail) return
      const pad = 16
      const pr = detail.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = pr.width || 430
      const h = pr.height || Math.min(vh - 48, 520)
      let left: number, top: number
      if (e) {
        // 커서에 패널 중심 정렬(좌우·상하 모두) → "클릭한 곳"에서 열린다.
        left = e.clientX - w / 2
        top = e.clientY - h / 2
      } else {
        left = vw - w - 24
        top = vh - h - 24
      }
      left = Math.max(pad, Math.min(left, vw - w - pad))
      top = Math.max(pad, Math.min(top, vh - h - pad))
      detail.style.left = left + 'px'
      detail.style.top = top + 'px'
      detail.style.right = 'auto'
      detail.style.bottom = 'auto'
    }

    function openDetail(t: Row, e?: MouseEvent) {
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

      // 전용 씬(t.scene)이 있으면 /s/<scene> 직행, 없으면 회사·시대 되감기 키.
      dRewind.dataset.rewind = t.scene ? `/s/${t.scene}` : t.rewind || ''
      // 프로젝트 상세 문서 버튼 — slug 가 있는 막대에만 노출(primary CTA).
      if (t.slug) {
        dDoc.dataset.slug = t.slug
        dDoc.style.display = ''
      } else {
        dDoc.dataset.slug = ''
        dDoc.style.display = 'none'
      }
      positionDetail(e)
      detail!.classList.add(s.show)
      startVerificationReplay()
    }

    const closeDetail = () => {
      clearVerificationReplay()
      detail!.classList.remove(s.show)
    }
    const onX = () => closeDetail()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail()
    }
    // 간트 빈 공간(막대·라벨이 아닌 곳) 클릭 → 패널 닫기. 막대/라벨 클릭은
    // stopPropagation 하므로 여기까지 오지 않는다.
    const onBgClick = () => closeDetail()
    const onRewindClick = function (this: HTMLButtonElement) {
      rewindToScene(this.dataset.rewind || '')
    }
    // 상세 문서는 풀페이지 이동 대신 우측 드로어로 — 간트 패널을 닫고 드로어를 연다.
    const onDocClick = function (this: HTMLButtonElement) {
      const slug = this.dataset.slug || ''
      if (!slug) return
      closeDetail()
      setDrawerSlug(slug)
    }
    dX.addEventListener('click', onX)
    document.addEventListener('keydown', onKey)
    svg.addEventListener('click', onBgClick)
    dRewind.addEventListener('click', onRewindClick)
    dDoc.addEventListener('click', onDocClick)
    dReplay.addEventListener('click', startVerificationReplay)
    cleanups.push(() => {
      dX.removeEventListener('click', onX)
      document.removeEventListener('keydown', onKey)
      svg.removeEventListener('click', onBgClick)
      dRewind.removeEventListener('click', onRewindClick)
      dDoc.removeEventListener('click', onDocClick)
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
        const g = el('g', { class: cls, 'data-id': t.id }, rowsG)

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
          } else if (t.slug) {
            // 상세 문서(드로어)가 있는 행 — 작은 문서 아이콘으로 특별 표시.
            const mx = 39,
              my = cy - 6
            const mk = el('g', {}, lblG)
            el('rect', { x: mx, y: my, width: 9, height: 12, rx: 1.5, fill: 'rgba(143,180,255,.12)', stroke: '#8fb4ff', 'stroke-width': 1.1 }, mk)
            el('line', { x1: mx + 2.4, y1: my + 4, x2: mx + 6.6, y2: my + 4, stroke: '#8fb4ff', 'stroke-width': 1 }, mk)
            el('line', { x1: mx + 2.4, y1: my + 7, x2: mx + 6.6, y2: my + 7, stroke: '#8fb4ff', 'stroke-width': 1 }, mk)
          } else {
            el('rect', { x: 42, y: cy - 6, width: 3, height: 12, rx: 1.5, fill: t.color, 'fill-opacity': 0.9 }, lblG)
          }
          const nm = el('text', { x: 51, y: cy - 1.5, fill: t.slug ? '#eaf1ff' : '#ccd4e0', 'font-size': 10, 'font-weight': 700 }, lblG)
          nm.textContent = t.role.length > 25 ? t.role.slice(0, 24) + '…' : t.role
          const sub = el('text', { x: 50, y: cy + 9, fill: study ? '#7fd4b3' : 'var(--ink-2)', 'font-size': 8, 'font-family': 'var(--mono)' }, lblG)
          sub.textContent = t.co
        }

        const track = el('rect', { x: bx, y: cy - bhh, width: bw, height: bh, rx: 5, fill: '#1c2330', stroke: 'var(--line-2)', 'stroke-width': 1 }, g)

        const pct = rowPct(t, TODAY.getTime())
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

        // 클릭·호버 타깃을 "프로젝트 막대 + 이름 라벨"로만 한정한다.
        // 행의 빈 공간을 누르면 (막대/라벨이 아니므로) svg 배경 핸들러가 패널을 닫는다.
        ;[lblG, track, fill].forEach((node) => {
          node.style.cursor = 'pointer'
          node.addEventListener('click', (ev) => {
            ev.stopPropagation()
            openDetail(t, ev as MouseEvent)
          })
          node.addEventListener('mousemove', (ev) => showTip(ev as MouseEvent, t))
          node.addEventListener('mouseleave', hideTip)
        })
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
    <>
      <GanttView
        rootRef={rootRef}
        boardWrapRef={boardWrapRef}
        svgRef={svgRef}
        railRef={railRef}
        boardHdRef={boardHdRef}
        kpisRef={kpisRef}
        derivedRef={derivedRef}
        skillsRef={skillsRef}
        heroNumRef={heroNumRef}
        detailRef={detailRef}
        tipRef={tipRef}
        cpToggleRef={cpToggleRef}
        dimToggleRef={dimToggleRef}
      />
      <ProjectDrawer
        project={drawerSlug ? projectBySlug(drawerSlug) ?? null : null}
        onClose={() => setDrawerSlug(null)}
      />
    </>
  )
}
