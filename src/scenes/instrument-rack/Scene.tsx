'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import { CHIPS, INVENTORY, LEDGER, LEVERS, STEPS } from './data'
import s from './scene.module.css'

type SvgAttrs = Record<string, string | number>
type WfBar = { rect: SVGRectElement; yTop: number; yBot: number; h: number }
type DigitRoll = { el: HTMLSpanElement; col: HTMLDivElement; target: number }
type ScopeParts = { trace: SVGPathElement; dot: SVGCircleElement; len: number }
type GaugeParts = { needle: SVGLineElement; val: SVGTextElement }

const NS = 'http://www.w3.org/2000/svg'
const BOOT = 1700
const STEP = 720
const END_HOLD = 1400
const ROW_SCAN = 500
const LAND_SHORT = 1200
const WALK_CYCLE = LEDGER.length * STEP + END_HOLD + 1100

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3)
const easeIO = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: SvgAttrs = {}) {
  const el = document.createElementNS(NS, tag)
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value))
  })
  return el
}

function yOfWaterfall(v: number) {
  const padT = 18
  const padB = 40
  const plotH = 300 - padT - padB
  return padT + plotH * (1 - v / 100)
}

function buildWaterfallSvg(svg: SVGSVGElement, wfBarsRef: React.MutableRefObject<WfBar[]>) {
  svg.replaceChildren()
  const W = 520
  const H = 300
  const padL = 34
  const padR = 12
  const padB = 40
  const plotW = W - padL - padR
  const wfBars: WfBar[] = []

  const defs = svgEl('defs')
  const grad = svgEl('linearGradient', { id: 'wfGrad', x1: '0', y1: '0', x2: '0', y2: '1' })
  grad.appendChild(svgEl('stop', { offset: '0', 'stop-color': '#2ee07b' }))
  grad.appendChild(svgEl('stop', { offset: '1', 'stop-color': '#0c5a39' }))
  defs.appendChild(grad)
  const filt = svgEl('filter', { id: 'wfGlow', x: '-18%', y: '-18%', width: '136%', height: '136%' })
  const blur = svgEl('feGaussianBlur', { stdDeviation: '1.1', in: 'SourceGraphic', result: 'b' })
  const merge = svgEl('feMerge')
  merge.appendChild(svgEl('feMergeNode', { in: 'b' }))
  merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }))
  filt.appendChild(blur)
  filt.appendChild(merge)
  defs.appendChild(filt)
  svg.appendChild(defs)

  ;[0, 25, 50, 75, 100].forEach((v) => {
    const y = yOfWaterfall(v)
    svg.appendChild(
      svgEl('line', {
        x1: padL,
        y1: y.toFixed(1),
        x2: W - padR,
        y2: y.toFixed(1),
        stroke: 'rgba(57,255,138,0.10)',
        'stroke-width': 1,
      })
    )
    const t = svgEl('text', {
      x: padL - 6,
      y: (y + 3).toFixed(1),
      'text-anchor': 'end',
      class: s.wfaxis,
    })
    t.textContent = String(v)
    svg.appendChild(t)
  })

  const n = STEPS.length
  const gap = 10
  const bw = (plotW - gap * (n - 1)) / n
  let prevTop: { x: number; y: number } | null = null

  STEPS.forEach((step, i) => {
    const x = padL + i * (bw + gap)
    let topV: number
    let botV: number
    let fill: string

    if (step.kind === 'baseline') {
      topV = step.val
      botV = 0
      fill = '#3a2a14'
    } else if (step.kind === 'final') {
      topV = step.val
      botV = 0
      fill = 'url(#wfGrad)'
    } else {
      botV = step.val
      topV = step.val + step.drop
      fill = '#0c5a39'
    }

    const yTop = yOfWaterfall(topV)
    const yBot = yOfWaterfall(botV)
    const h = Math.max(2, yBot - yTop)
    const rect = svgEl('rect', {
      x: x.toFixed(1),
      y: yTop.toFixed(1),
      width: bw.toFixed(1),
      height: h.toFixed(1),
      rx: 2,
      fill,
    })

    if (step.kind === 'baseline') {
      rect.setAttribute('stroke', '#5a4422')
      rect.setAttribute('stroke-width', '1')
    } else {
      rect.setAttribute('stroke', 'rgba(57,255,158,0.32)')
      rect.setAttribute('stroke-width', '1')
      rect.setAttribute('filter', 'url(#wfGlow)')
    }
    svg.appendChild(rect)
    wfBars.push({ rect, yTop, yBot, h })

    if (prevTop !== null) {
      svg.appendChild(
        svgEl('line', {
          x1: prevTop.x.toFixed(1),
          y1: prevTop.y.toFixed(1),
          x2: x.toFixed(1),
          y2: yTop.toFixed(1),
          stroke: 'rgba(126,140,135,0.55)',
          'stroke-width': 1,
          'stroke-dasharray': '3 3',
        })
      )
    }

    prevTop = { x: x + bw, y: yTop }
    if (step.kind !== 'baseline' && step.kind !== 'final') prevTop = { x: x + bw, y: yBot }
    if (step.kind === 'baseline') prevTop = { x: x + bw, y: yTop }

    const lblV = svgEl('text', {
      x: (x + bw / 2).toFixed(1),
      y: (yTop - 4).toFixed(1),
      'text-anchor': 'middle',
      class: s.wfval,
    })
    lblV.setAttribute('fill', step.kind === 'baseline' ? '#ffb01f' : '#39ff8a')
    lblV.textContent = step.kind === 'step' ? `−${step.drop}` : String(step.val)
    svg.appendChild(lblV)

    const cap = svgEl('text', {
      x: (x + bw / 2).toFixed(1),
      y: (H - padB + 14).toFixed(1),
      'text-anchor': 'middle',
      class: s.wfcap,
    })
    cap.textContent = step.si
    svg.appendChild(cap)

    const cap2 = svgEl('text', {
      x: (x + bw / 2).toFixed(1),
      y: (H - padB + 25).toFixed(1),
      'text-anchor': 'middle',
      class: s.wfcap,
    })
    cap2.setAttribute('fill', '#5a665f')
    cap2.textContent =
      step.kind === 'baseline'
        ? '기준'
        : step.kind === 'final'
          ? '−85%'
          : step.nm.length > 7
            ? `${step.nm.slice(0, 6)}…`
            : step.nm
    svg.appendChild(cap2)
  })

  wfBarsRef.current = wfBars
}

function buildScopeSvg(svg: SVGSVGElement, scopeRef: React.MutableRefObject<ScopeParts | null>) {
  svg.replaceChildren()
  const W = 360
  const H = 150

  const defs = svgEl('defs')
  const filter = svgEl('filter', { id: 'scGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' })
  filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: '1.4', in: 'SourceGraphic', result: 'b' }))
  const merge = svgEl('feMerge')
  merge.appendChild(svgEl('feMergeNode', { in: 'b' }))
  merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }))
  filter.appendChild(merge)
  defs.appendChild(filter)
  svg.appendChild(defs)

  for (let gx = 0; gx <= W; gx += 40) {
    svg.appendChild(
      svgEl('line', { x1: gx, y1: 0, x2: gx, y2: H, stroke: 'rgba(57,255,138,0.07)', 'stroke-width': 1 })
    )
  }
  for (let gy = 0; gy <= H; gy += 30) {
    svg.appendChild(
      svgEl('line', { x1: 0, y1: gy, x2: W, y2: gy, stroke: 'rgba(57,255,138,0.07)', 'stroke-width': 1 })
    )
  }
  svg.appendChild(svgEl('line', { x1: 0, y1: H / 2, x2: W, y2: H / 2, stroke: 'rgba(57,255,138,0.16)', 'stroke-width': 1 }))

  const yOf = (v: number) => {
    const t = (v - 15) / (100 - 15)
    return 128 - t * (128 - 18)
  }
  const levels = [100, 73, 51, 27, 15]
  const curveY = (fx: number) => {
    const seg = fx * (levels.length - 1)
    const i = Math.min(levels.length - 2, Math.floor(seg))
    const f = seg - i
    const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, f * 1.2))
    const v = levels[i] + (levels[i + 1] - levels[i]) * e
    return yOf(v)
  }
  const buildPath = () => {
    let d = ''
    const N = 72
    for (let i = 0; i <= N; i++) {
      const fx = i / N
      const x = fx * W
      const y = curveY(fx)
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }

  const trace = svgEl('path', {
    fill: 'none',
    stroke: '#39ff8a',
    'stroke-width': 2,
    'stroke-linejoin': 'round',
    'stroke-linecap': 'round',
    filter: 'url(#scGlow)',
  })
  trace.setAttribute('d', buildPath())
  svg.appendChild(trace)

  const dot = svgEl('circle', { r: 3.2, fill: '#bfffd9', stroke: '#39ff8a', 'stroke-width': 1 })
  svg.appendChild(dot)

  let len = W * 1.4
  try {
    len = trace.getTotalLength()
  } catch {
    len = W * 1.4
  }
  trace.setAttribute('stroke-dasharray', String(len))
  scopeRef.current = { trace, dot, len }
}

function buildGaugeSvg(svg: SVGSVGElement, gaugeRef: React.MutableRefObject<GaugeParts | null>) {
  svg.replaceChildren()
  const cx = 100
  const cy = 104
  const R = 82
  const angOf = (v: number) => 180 - (v / 100) * 180
  const pt = (ang: number, r: number) => {
    const a = (ang * Math.PI) / 180
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const
  }
  const arc = (rr: number, a0: number, a1: number, stroke: string, width: number, extra: SvgAttrs = {}) => {
    const p0 = pt(a0, rr)
    const p1 = pt(a1, rr)
    const large = Math.abs(a0 - a1) > 180 ? 1 : 0
    const sweep = a1 < a0 ? 1 : 0
    return svgEl('path', {
      d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${rr} ${rr} 0 ${large} ${sweep} ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`,
      fill: 'none',
      stroke,
      'stroke-width': width,
      'stroke-linecap': 'round',
      ...extra,
    })
  }

  const defs = svgEl('defs')
  const filter = svgEl('filter', { id: 'ggGlow', x: '-40%', y: '-40%', width: '180%', height: '180%' })
  filter.appendChild(svgEl('feGaussianBlur', { stdDeviation: '1.5', in: 'SourceGraphic', result: 'b' }))
  const merge = svgEl('feMerge')
  merge.appendChild(svgEl('feMergeNode', { in: 'b' }))
  merge.appendChild(svgEl('feMergeNode', { in: 'SourceGraphic' }))
  filter.appendChild(merge)
  defs.appendChild(filter)
  svg.appendChild(defs)

  svg.appendChild(arc(R, angOf(100), angOf(0), 'rgba(57,255,138,0.12)', 10))
  svg.appendChild(arc(R, angOf(100), angOf(15), 'rgba(255,176,31,0.18)', 10))
  svg.appendChild(arc(R, angOf(15), angOf(0), 'rgba(57,255,138,0.5)', 10, { filter: 'url(#ggGlow)' }))

  ;[0, 15, 25, 50, 75, 100].forEach((v) => {
    const a = angOf(v)
    const o = pt(a, R + 2)
    const inr = pt(a, R - 10)
    svg.appendChild(
      svgEl('line', {
        x1: inr[0].toFixed(1),
        y1: inr[1].toFixed(1),
        x2: o[0].toFixed(1),
        y2: o[1].toFixed(1),
        stroke: v === 15 ? '#39ff8a' : 'rgba(170,190,182,0.5)',
        'stroke-width': v === 15 ? 2 : 1,
      })
    )
    const lp = pt(a, R - 22)
    const text = svgEl('text', {
      x: lp[0].toFixed(1),
      y: (lp[1] + 3).toFixed(1),
      'text-anchor': 'middle',
      'font-family': "'DM Mono',monospace",
      'font-size': '8',
      fill: v === 15 ? '#39ff8a' : '#7e8c87',
    })
    text.textContent = String(v)
    svg.appendChild(text)
  })

  const needleStart = pt(angOf(100), R - 14)
  const needle = svgEl('line', {
    x1: cx,
    y1: cy,
    x2: needleStart[0].toFixed(1),
    y2: needleStart[1].toFixed(1),
    stroke: '#39ff8a',
    'stroke-width': 2.4,
    'stroke-linecap': 'round',
    filter: 'url(#ggGlow)',
  })
  svg.appendChild(needle)
  svg.appendChild(svgEl('circle', { cx, cy, r: 5, fill: '#0a1410', stroke: '#39ff8a', 'stroke-width': 1.5 }))

  const val = svgEl('text', {
    x: cx,
    y: (cy - 26).toFixed(1),
    'text-anchor': 'middle',
    'font-family': "'DM Mono',monospace",
    'font-size': '19',
    'font-weight': '800',
    fill: '#39ff8a',
  })
  val.setAttribute('filter', 'url(#ggGlow)')
  svg.appendChild(val)

  gaugeRef.current = { needle, val }
}

function setGauge(gauge: GaugeParts | null, v: number) {
  if (!gauge) return
  const cx = 100
  const cy = 104
  const R = 82
  const ang = (180 - (v / 100) * 180) * (Math.PI / 180)
  const x = cx + (R - 14) * Math.cos(ang)
  const y = cy - (R - 14) * Math.sin(ang)
  gauge.needle.setAttribute('x2', x.toFixed(1))
  gauge.needle.setAttribute('y2', y.toFixed(1))
  gauge.val.textContent = String(Math.round(v))
}

function moduleEars() {
  return (
    <>
      <span className={`${s.ear} ${s.tl}`} />
      <span className={`${s.ear} ${s.tr}`} />
      <span className={`${s.ear} ${s.bl}`} />
      <span className={`${s.ear} ${s.br}`} />
    </>
  )
}

export default function Scene({ running = true, onReady }: SceneProps) {
  useSceneReady(onReady)
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([])
  const qRef = useRef<HTMLDivElement | null>(null)
  const aRef = useRef<HTMLDivElement | null>(null)
  const levRef = useRef<HTMLSpanElement | null>(null)
  const idxRef = useRef<HTMLSpanElement | null>(null)
  const ledTotalRef = useRef<HTMLDivElement | null>(null)
  const dmmWinRef = useRef<HTMLDivElement | null>(null)
  const surgeDotRef = useRef<HTMLSpanElement | null>(null)
  const finalStepRef = useRef<HTMLDivElement | null>(null)
  const digitRefs = useRef<Array<HTMLSpanElement | null>>([])
  const digitRolls = useRef<DigitRoll[]>([])
  const wfSvgRef = useRef<SVGSVGElement | null>(null)
  const wfBarsRef = useRef<WfBar[]>([])
  const scopeSvgRef = useRef<SVGSVGElement | null>(null)
  const scopeRef = useRef<ScopeParts | null>(null)
  const gaugeSvgRef = useRef<SVGSVGElement | null>(null)
  const gaugeRef = useRef<GaugeParts | null>(null)
  const walkingRef = useRef(true)
  const activeLedgerRef = useRef(-1)
  const reducedRef = useRef(false)

  const showInterro = (i: number) => {
    const item = LEDGER[i]
    if (!item) return
    if (activeLedgerRef.current !== i) {
      rowRefs.current.forEach((el, j) => el?.classList.toggle(s.active, j === i))
      activeLedgerRef.current = i
    }
    if (qRef.current && qRef.current.textContent !== item.q) qRef.current.textContent = item.q
    if (aRef.current && aRef.current.innerHTML !== item.a) aRef.current.innerHTML = item.a
    if (levRef.current && levRef.current.textContent !== item.lever) levRef.current.textContent = item.lever
    const idx = `항목 ${String(i + 1).padStart(2, '0')} / ${String(LEDGER.length).padStart(2, '0')}`
    if (idxRef.current && idxRef.current.textContent !== idx) idxRef.current.textContent = idx
  }

  const selectLedger = (i: number) => {
    walkingRef.current = false
    rowRefs.current.forEach((el) => el?.classList.remove(s.scan))
    ledTotalRef.current?.classList.remove(s.land)
    dmmWinRef.current?.classList.remove(s.land)
    surgeDotRef.current?.classList.remove(s.surge)
    finalStepRef.current?.classList.remove(s.land)
    showInterro(i)
  }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => {
      reducedRef.current = mq.matches
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const wfSvg = wfSvgRef.current
    const scopeSvg = scopeSvgRef.current
    const gaugeSvg = gaugeSvgRef.current
    if (wfSvg) buildWaterfallSvg(wfSvg, wfBarsRef)
    if (scopeSvg) buildScopeSvg(scopeSvg, scopeRef)
    if (gaugeSvg) buildGaugeSvg(gaugeSvg, gaugeRef)

    digitRolls.current = digitRefs.current.flatMap((el) => {
      if (!el) return []
      const target = Number(el.dataset.d ?? '0')
      const col = document.createElement('div')
      col.className = s.col
      const seq = Array.from({ length: 10 }, (_, n) => n).concat(target)
      seq.forEach((n) => {
        const span = document.createElement('span')
        span.textContent = String(n)
        col.appendChild(span)
      })
      el.replaceChildren(col)
      return [{ el, col, target }]
    })

    showInterro(0)
  }, [])

  const ref = useSceneCanvas((_g: CanvasRenderingContext2D, f: Frame) => {
    const now = f.t * 1000
    const reduce = reducedRef.current

    if (walkingRef.current) {
      if (reduce || now < BOOT) {
        showInterro(0)
        rowRefs.current.forEach((el) => el?.classList.remove(s.scan))
        ledTotalRef.current?.classList.remove(s.land)
        dmmWinRef.current?.classList.remove(s.land)
        surgeDotRef.current?.classList.remove(s.surge)
        finalStepRef.current?.classList.remove(s.land)
      } else {
        const local = (now - BOOT) % WALK_CYCLE
        const walkSpan = LEDGER.length * STEP
        const inRows = local < walkSpan
        const idx = inRows ? Math.floor(local / STEP) : LEDGER.length - 1
        const rowPhase = local % STEP
        showInterro(idx)
        rowRefs.current.forEach((el, j) => {
          el?.classList.toggle(s.scan, inRows && j === idx && rowPhase < ROW_SCAN)
        })
        const climaxElapsed = local - walkSpan
        const shortLand = !inRows && climaxElapsed < LAND_SHORT
        const ledLand = !inRows && climaxElapsed < END_HOLD + 1100
        ledTotalRef.current?.classList.toggle(s.land, ledLand)
        dmmWinRef.current?.classList.toggle(s.land, shortLand)
        surgeDotRef.current?.classList.toggle(s.surge, shortLand)
        finalStepRef.current?.classList.toggle(s.land, shortLand)
      }
    }

    const wfBars = wfBarsRef.current
    if (wfBars.length) {
      const FILL = 520
      const STAG = 230
      const HOLD = 2600
      const cycle = wfBars.length * STAG + FILL + HOLD
      const p = now % cycle
      wfBars.forEach((bar, i) => {
        const k = reduce ? 1 : easeOutCubic((p - i * STAG) / FILL)
        const curY = bar.yBot + (bar.yTop - bar.yBot) * k
        const curH = Math.max(0.5, bar.yBot - curY)
        bar.rect.setAttribute('y', curY.toFixed(1))
        bar.rect.setAttribute('height', curH.toFixed(1))
      })
    }

    digitRolls.current.forEach((digit, idx) => {
      if (reduce) {
        digit.col.style.transform = `translateY(-${digit.target}em)`
        return
      }
      const ROLL = 900
      const HOLD = 2200
      const cycle = ROLL + HOLD
      const off = idx * 120
      const p = (((now - off) % cycle) + cycle) % cycle
      let em: number
      if (p < ROLL) {
        const k = easeOutCubic(p / ROLL)
        const total = 2 * 10 + digit.target
        em = (total * k) % 10
        if (p / ROLL > 0.985) em = digit.target
      } else {
        em = digit.target
      }
      digit.col.style.transform = `translateY(-${em.toFixed(3)}em)`
    })

    const scope = scopeRef.current
    if (scope) {
      const W = 360
      const levels = [100, 73, 51, 27, 15]
      const yOf = (v: number) => {
        const t = (v - 15) / (100 - 15)
        return 128 - t * (128 - 18)
      }
      const curveY = (fx: number) => {
        const seg = fx * (levels.length - 1)
        const i = Math.min(levels.length - 2, Math.floor(seg))
        const local = seg - i
        const e = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, local * 1.2))
        const v = levels[i] + (levels[i + 1] - levels[i]) * e
        return yOf(v)
      }
      if (reduce) {
        scope.trace.setAttribute('stroke-dashoffset', '0')
        scope.dot.setAttribute('cx', String(W))
        scope.dot.setAttribute('cy', curveY(1).toFixed(1))
        scope.dot.setAttribute('opacity', '1')
      } else {
        const SWEEP = 2600
        const GAP = 900
        const cyc = SWEEP + GAP
        const p = (now % cyc) / SWEEP
        const k = Math.min(1, p)
        scope.trace.setAttribute('stroke-dashoffset', (scope.len * (1 - k)).toFixed(1))
        scope.dot.setAttribute('cx', (k * W).toFixed(1))
        scope.dot.setAttribute('cy', curveY(k).toFixed(1))
        scope.dot.setAttribute('opacity', p <= 1 ? '1' : '0.0')
      }
    }

    const gauge = gaugeRef.current
    if (gauge) {
      if (reduce) {
        setGauge(gauge, 15)
      } else {
        const DROP = 2200
        const HOLD = 2400
        const cyc = DROP + HOLD
        const p = now % cyc
        setGauge(gauge, p < DROP ? 100 - (100 - 15) * easeIO(p / DROP) : 15)
      }
    }
  }, { running })

  return (
    <SceneHost className={s.root} bg="#070809">
      <canvas ref={ref} className={s.c} />
      <div className={s.scroll}>
        <div className={s.wrap}>
          <div className={s.rack}>
            <div className={`${s.railholes} ${s.l}`} aria-hidden="true" />
            <div className={`${s.railholes} ${s.r}`} aria-hidden="true" />
            <div className={s.scanbeam} aria-hidden="true" />
            <div className={s.crtflick} aria-hidden="true" />
            <div className={s.rackinner}>
              <section className={s.u} aria-label="시스템 헤더">
                {moduleEars()}
                <div className={s.head}>
                  <div className={s.logo} aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#39ff8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 20V4" />
                      <path d="M4 20h16" />
                      <path d="M7 14l3-4 3 3 4-7" />
                    </svg>
                  </div>
                  <div className={s.brand}>
                    <h1>원가 제1원칙 해부 보드</h1>
                    <div className={s.role}>
                      <b>운영경비(OPEX) −85%</b> 절감 · 제1원칙 분석
                    </div>
                  </div>
                  <div className={s.topmeta}>
                    <span className={s.pill}>
                      <span className={`${s.dot} ${s.run}`} ref={surgeDotRef} /> OPEX&nbsp;−85%
                    </span>
                    <span className={s.pill}>
                      <span className={s.dot} /> 0불량
                    </span>
                    <span className={`${s.pill} ${s.mono}`}>
                      <span className={`${s.dot} ${s.warn}`} /> IATF&nbsp;16949
                    </span>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="제1원칙 선언">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>DOCTRINE</span>
                  <h3>제1원칙 — 모든 원가를 처음부터 다시 본다</h3>
                  <span className={`${s.sub} ${s.mono}`}>FIRST-PRINCIPLES COST TEARDOWN</span>
                </div>
                <div className={s.creed}>
                  <span className={s.q}>"이 비용은 관행이 아니라, 꼭 필요해서 존재하는가?"</span>
                  <br />
                  운영경비(OPEX)를 결과가 아니라 <b>구조</b>로 본다 — 원가를 숫자로 세우기 위해 항목을 한 줄씩 원장에 펼치고, 각 줄을 심문한다.
                  답이 "관행"이면 레버를 건다. 조달단가 재협상 · 라인 운영구조 재설계 · 비전검사 0불량 · 인원·공수·생산계획·재고 개선으로
                  기준 OPEX를 단계적으로 깎아 <b>−85%</b>까지 내렸다. 1막은 손의 시대에서 정렬을 시작한 시기였다.
                </div>
              </section>

              <section className={s.u} aria-label="원가 원장 및 워터폴">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>LEDGER · WATERFALL</span>
                  <h3>운영경비 원장 해부 → 단계 절감 워터폴</h3>
                  <span className={`${s.sub} ${s.mono}`}>왼쪽: 항목별 심문 · 오른쪽: 100 → 15 계단식 하강</span>
                </div>

                <div className={s.board2}>
                  <div>
                    <div className={s.ledger} role="group" aria-label="원가 원장">
                      <div className={s.ledhead}>
                        <span>원가 항목 · 심문 대상</span>
                        <span className={s.r}>기준 비중</span>
                        <span className={s.r}>절감 후</span>
                      </div>
                      <div>
                        {LEDGER.map((item, i) => (
                          <button
                            className={s.ledrow}
                            type="button"
                            key={item.nm}
                            ref={(node) => {
                              rowRefs.current[i] = node
                            }}
                            style={{ animationDelay: `${(1.05 + i * 0.11).toFixed(2)}s` }}
                            onClick={() => selectLedger(i)}
                            onFocus={() => selectLedger(i)}
                          >
                            <span className={s.li}>
                              <span className={s.led} />
                              <span className={s.min0}>
                                <span className={s.nm}>{item.nm}</span>
                              </span>
                            </span>
                            <span className={s.base}>{item.base}</span>
                            <span className={`${s.cut} ${item.cut === 0 ? s.zero : ''}`}>{item.cut === 0 ? '0' : item.cut}</span>
                          </button>
                        ))}
                      </div>
                      <div className={s.ledtot} ref={ledTotalRef}>
                        <span className={s.nm}>운영경비 합계 (지수)</span>
                        <span className={s.base}>100</span>
                        <span className={s.cut}>15</span>
                      </div>
                    </div>

                    <div className={s.interro} aria-live="polite">
                      <div className={s.qh}>
                        <span className={s.qt}>원장 메모 · LEDGER NOTE</span>
                        <span className={s.qn} ref={idxRef}>항목 01 / 06</span>
                      </div>
                      <div className={s.qq} ref={qRef} />
                      <div className={s.qa} ref={aRef} />
                      <span className={s.qlev} ref={levRef} />
                    </div>
                  </div>

                  <div className={s.wfwrap}>
                    <div className={s.wfchart}>
                      <div className={s.ovl} />
                      <span className={`${s.wfcorner} ${s.tl} ${s.mono}`}>OPEX INDEX</span>
                      <span className={`${s.wfcorner} ${s.tr} ${s.mono}`}>illustrative [확인필요]</span>
                      <span className={`${s.wfcorner} ${s.br} ${s.mono}`}>ENDPOINT −85%</span>
                      <svg
                        className={s.wfsvg}
                        ref={wfSvgRef}
                        viewBox="0 0 520 300"
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="운영경비 워터폴 차트 — 100에서 15까지 단계 하강"
                      />
                    </div>

                    <div className={s.wfsteps}>
                      {STEPS.map((step, i) => (
                        <div
                          className={`${s.wfstep} ${step.kind !== 'step' ? s[step.kind] : ''}`}
                          key={step.nm}
                          ref={step.kind === 'final' ? finalStepRef : undefined}
                          style={{ animationDelay: `${(0.95 + i * 0.14).toFixed(2)}s` }}
                        >
                          <span className={s.si}>{step.si}</span>
                          <span>
                            <div className={s.sn}>{step.nm}</div>
                            <div className={s.sd}>{step.sd}</div>
                          </span>
                          <span className={s.sv}>
                            {step.kind === 'step' ? `−${step.drop} → ${step.val}` : step.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className={s.illnote}>
                      <span className={s.flag}>[확인필요]</span> 총 <b>운영경비 −85%</b>(지수 100→15)와 레버 항목은 실제 성과·실제 활동.
                      단, <b>레버별 절감 분해 비율</b>은 정확히 알 수 없어 워터폴 각 단계값은 illustrative(예시) 지수로 표기 — 실제 원화 총액 아님.
                    </div>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="절감 레버">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>LEVERS</span>
                  <h3>제1원칙으로 건 4개 레버 — 실제 활동</h3>
                  <span className={`${s.sub} ${s.mono}`}>분해 비율은 illustrative · 활동 자체는 실제</span>
                </div>
                <div className={s.levgrid}>
                  {LEVERS.map((lever) => (
                    <div className={s.lev} key={lever.key}>
                      <div className={s.lk}>{lever.key}</div>
                      <div className={s.lt}>{lever.title}</div>
                      <div className={s.ld}>{lever.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={s.u} aria-label="계측 패널 — 측정 readout">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>INSTRUMENTS</span>
                  <h3>계측 패널 — 측정으로 확정한 성과 readout</h3>
                  <span className={`${s.sub} ${s.mono}`}>DMM 절감률 · 원가 스코프 · OPEX 게이지 · live</span>
                </div>
                <div className={s.instgrid}>
                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>DMM · 절감률</span>
                      <span className={s.iu}>PERCENT · DC</span>
                    </div>
                    <div className={s.dmm}>
                      <div className={s.dlabel}>운영경비(OPEX) 절감률 — 실측</div>
                      <div className={s.dwin} ref={dmmWinRef} aria-label="OPEX 절감률 마이너스 85 퍼센트">
                        <span className={s.sign}>−</span>
                        <span
                          className={s.digit}
                          data-d="8"
                          ref={(node) => {
                            digitRefs.current[0] = node
                          }}
                        />
                        <span
                          className={s.digit}
                          data-d="5"
                          ref={(node) => {
                            digitRefs.current[1] = node
                          }}
                        />
                        <span className={s.unit}>%</span>
                      </div>
                      <div className={s.drange}>
                        <span>RANGE 0–100%</span>
                        <span>HOLD · ENDPOINT</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>Scope · 원가 트레이스</span>
                      <span className={s.iu}>100 → 15</span>
                    </div>
                    <div className={s.scope}>
                      <div className={s.scopewrap}>
                        <svg
                          ref={scopeSvgRef}
                          viewBox="0 0 360 150"
                          preserveAspectRatio="none"
                          role="img"
                          aria-label="기준 100에서 15까지 원가 하강 트레이스"
                        />
                      </div>
                      <div className={s.scopefoot}>
                        <span>BASE <b>100</b> idx</span>
                        <span>SWEEP · loop</span>
                        <span>END <b>15</b> idx</span>
                      </div>
                    </div>
                  </div>

                  <div className={s.inst}>
                    <div className={s.insth}>
                      <span className={s.il} />
                      <span className={s.it}>Gauge · 잔여 OPEX</span>
                      <span className={s.iu}>INDEX</span>
                    </div>
                    <div className={s.gauge}>
                      <svg ref={gaugeSvgRef} viewBox="0 0 200 124" role="img" aria-label="잔여 운영경비 게이지 — 100에서 15로" />
                      <div className={s.gcap}>
                        바늘: 기준 100 → <b>잔여 15</b> · 스윕 반복
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={s.u} aria-label="품질·시스템 현황">
                {moduleEars()}
                <div className={s.modtitle}>
                  <span className={s.uno}>SYSTEMS</span>
                  <h3>품질체계 · 운영 시스템 — 절감을 떠받친 기반</h3>
                  <span className={`${s.sub} ${s.mono}`}>OPEX 절감 · 제1원칙 분석</span>
                </div>
                <div className={s.inv}>
                  {INVENTORY.map((item) => (
                    <div className={s.invrow} key={item.nm}>
                      <div>
                        <div className={s.nm}>{item.nm}</div>
                        <div className={s.cap}>{item.cap}</div>
                      </div>
                      <div className={s.cap}>{item.role}</div>
                      <div className={`${s.stled} ${s[item.tone]}`}>
                        <span className={s.d} /> {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={s.u} aria-label="기술 스택 / 연락처">
                {moduleEars()}
                <div className={s.footu}>
                  <div className={s.chips}>
                    {CHIPS.map((chip) => (
                      <span className={s.chip} key={chip.text}>
                        {'strong' in chip && chip.strong ? <b>{chip.text}</b> : chip.text}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={s.labelStripFooter}>OPEX −85% · 제1원칙 · 측정 · 심문 · 절감</div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
