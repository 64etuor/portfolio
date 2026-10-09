import type { MutableRefObject } from 'react'
import { STEPS } from './data'
import { NS } from './constants'
import type { SvgAttrs, WfBar, ScopeParts, GaugeParts } from './types'
import s from './scene.module.css'

export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: SvgAttrs = {}) {
  const el = document.createElementNS(NS, tag)
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value))
  })
  return el
}

export function yOfWaterfall(v: number) {
  const padT = 18
  const padB = 40
  const plotH = 300 - padT - padB
  return padT + plotH * (1 - v / 100)
}

export function buildWaterfallSvg(svg: SVGSVGElement, wfBarsRef: MutableRefObject<WfBar[]>) {
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

export function buildScopeSvg(svg: SVGSVGElement, scopeRef: MutableRefObject<ScopeParts | null>) {
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

export function buildGaugeSvg(svg: SVGSVGElement, gaugeRef: MutableRefObject<GaugeParts | null>) {
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
      'font-family': "'DM Mono', 'Pretendard Variable', monospace",
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
    'font-family': "'DM Mono', 'Pretendard Variable', monospace",
    'font-size': '19',
    'font-weight': '800',
    fill: '#39ff8a',
  })
  val.setAttribute('filter', 'url(#ggGlow)')
  svg.appendChild(val)

  gaugeRef.current = { needle, val }
}

export function setGauge(gauge: GaugeParts | null, v: number) {
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
