'use client'

import { useId, useRef } from 'react'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { clamp, lerp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import { GAUGES, JOBS, KPIS, SEED_EVENTS, type FeedSeverity } from './data'
import {
  cdf,
  easeCubicOut,
  flashText,
  formatKpi,
  gaugeArc,
  jobWidth,
  nowLinePct,
  pushSpark,
  severityClass,
  severityLabel,
  updateBell,
  updatePareto,
  updateSpark,
  updateText,
  updateTrend,
} from './draw'
import { createRuntime, shuffleEvents } from './runtime'
import type { Runtime } from './types'
import { MesConsoleView } from './view'
import s from './scene.module.css'

export default function Scene({ running = true, onReady }: SceneProps) {
  const idBase = useId().replace(/:/g, '')
  useSceneReady(onReady)
  const runtimeRef = useRef<Runtime | null>(null)
  if (!runtimeRef.current) runtimeRef.current = createRuntime()

  const clockRef = useRef<HTMLSpanElement | null>(null)
  const uptimeRef = useRef<HTMLSpanElement | null>(null)
  const connRef = useRef<HTMLSpanElement | null>(null)
  const alarmCountRef = useRef<HTMLSpanElement | null>(null)
  const gaugeFillRefs = useRef<Array<SVGPathElement | null>>([])
  const gaugeNeedleRefs = useRef<Array<SVGLineElement | null>>([])
  const gaugeTextRefs = useRef<Array<HTMLDivElement | null>>([])
  const topSparkSvgRefs = useRef<Array<SVGSVGElement | null>>([])
  const topSparkLineRefs = useRef<Array<SVGPathElement | null>>([])
  const topSparkAreaRefs = useRef<Array<SVGPathElement | null>>([])
  const topMetricRefs = useRef<Array<HTMLSpanElement | null>>([])
  const bellRef = useRef<SVGSVGElement | null>(null)
  const cpkRef = useRef<HTMLElement | null>(null)
  const yieldRef = useRef<HTMLElement | null>(null)
  const ppmRef = useRef<HTMLElement | null>(null)
  const kpiValueRefs = useRef<Array<HTMLSpanElement | null>>([])
  const kpiSparkSvgRefs = useRef<Array<SVGSVGElement | null>>([])
  const kpiSparkLineRefs = useRef<Array<SVGPathElement | null>>([])
  const kpiSparkAreaRefs = useRef<Array<SVGPathElement | null>>([])
  const ganttBarRefs = useRef<Array<HTMLDivElement | null>>([])
  const nowLineRefs = useRef<Array<HTMLDivElement | null>>([])
  const paretoRef = useRef<SVGSVGElement | null>(null)
  const trendRef = useRef<SVGSVGElement | null>(null)
  const feedRef = useRef<HTMLDivElement | null>(null)
  const lampGRef = useRef<HTMLSpanElement | null>(null)
  const lampYRef = useRef<HTMLSpanElement | null>(null)
  const lampRRef = useRef<HTMLSpanElement | null>(null)
  const andonStateRef = useRef<HTMLSpanElement | null>(null)
  const stopFlagRef = useRef<HTMLSpanElement | null>(null)

  const setAndon = (level: 'g' | 'y' | 'r') => {
    const lampG = lampGRef.current
    const lampY = lampYRef.current
    const lampR = lampRRef.current
    const state = andonStateRef.current
    const stop = stopFlagRef.current
    ;[lampG, lampY, lampR].forEach((lamp) => lamp?.classList.remove(s.on))
    state?.classList.remove(s.g, s.y, s.r)
    if (level === 'r') {
      lampR?.classList.add(s.on)
      state?.classList.add(s.r)
      updateText(state, '정지 · STOP')
      stop?.classList.add(s.armed)
      updateText(stop, 'LINE STOPPED')
    } else if (level === 'y') {
      lampY?.classList.add(s.on)
      state?.classList.add(s.y)
      updateText(state, '주의 · CAUTION')
      stop?.classList.remove(s.armed)
      updateText(stop, 'STOP-THE-LINE')
    } else {
      lampG?.classList.add(s.on)
      state?.classList.add(s.g)
      updateText(state, '정상 · GO')
      stop?.classList.remove(s.armed)
      updateText(stop, 'STOP-THE-LINE')
    }
  }

  const triggerAndon = (sev: FeedSeverity, ms: number) => {
    const rt = runtimeRef.current
    if (!rt) return
    if (sev === 'crit') {
      setAndon('r')
      rt.andonResetAt = ms + 2600
    } else if (sev === 'warn') {
      setAndon('y')
      rt.andonResetAt = ms + 1800
    } else if (sev === 'ok') {
      setAndon('g')
      rt.andonResetAt = 0
    }
  }

  const pushEvent = (ev: { sev: FeedSeverity; msg: string }, ms: number, initial = false) => {
    const feed = feedRef.current
    const rt = runtimeRef.current
    if (!feed || !rt) return
    const now = new Date()
    const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const row = document.createElement('div')
    row.className = [s.fr, initial ? '' : ev.sev === 'crit' ? s.flashCrit : s.flash].filter(Boolean).join(' ')
    const time = document.createElement('span')
    time.className = s.ft
    time.textContent = ts
    const sev = document.createElement('span')
    sev.className = `${s.fsev} ${severityClass(ev.sev, { sevInfo: s.sevInfo, sevWarn: s.sevWarn, sevCrit: s.sevCrit, sevOk: s.sevOk })}`
    sev.textContent = severityLabel(ev.sev)
    const msg = document.createElement('span')
    msg.className = s.fmsg
    msg.textContent = ev.msg
    row.append(time, sev, msg)
    feed.prepend(row)
    if (ev.sev === 'crit' || ev.sev === 'warn') {
      rt.alarmTotal += 1
      updateText(alarmCountRef.current, `ALARMS ${rt.alarmTotal}`)
    }
    if (!initial) triggerAndon(ev.sev, ms)
    if (feed.children.length > 4) {
      const last = feed.lastElementChild
      if (last) {
        last.classList.add(s.fading)
        rt.feedRemovals.push({ el: last, removeAt: ms + 620 })
      }
    }
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const rt = runtimeRef.current
    if (!rt) return
    const ms = fr.t * 1000
    const dt = Math.min(fr.dt * 1000, 80) || 16
    g.clearRect(0, 0, fr.w, fr.h)

    const now = new Date()
    updateText(clockRef.current, now.toLocaleTimeString('ko-KR', { hour12: false }))
    const shiftStart = new Date(now)
    shiftStart.setHours(8, 0, 0, 0)
    const elapsed = Math.max(0, now.getTime() - shiftStart.getTime())
    const hh = Math.floor(elapsed / 3600000)
    const mm = Math.floor((elapsed % 3600000) / 60000)
    updateText(uptimeRef.current, `${String(hh).padStart(2, '0')}h ${String(mm).padStart(2, '0')}m`)
    if (connRef.current) connRef.current.style.opacity = Math.floor(ms / 900) % 2 === 0 ? '1' : '0.55'

    GAUGES.forEach((gauge, i) => {
      const state = rt.gauges[i]
      let value: number
      if (ms < 1600) {
        value = easeCubicOut(ms / 1600) * gauge.target
        state.cur = value
      } else {
        const noise = (Math.random() - 0.5) * 0.08
        const targetVal = clamp(gauge.target + (Math.random() - 0.5) * 1.0, gauge.target - 0.8, gauge.target + 0.8)
        state.cur = clamp(lerp(state.cur, targetVal, 1 - Math.exp(-dt / 800)) + noise, 0, 99.9)
        value = state.cur
      }
      gaugeFillRefs.current[i]?.setAttribute('d', gaugeArc(value / 100))
      gaugeNeedleRefs.current[i]?.setAttribute('transform', `rotate(${(value / 100 * 180 - 90).toFixed(2)})`)
      updateText(gaugeTextRefs.current[i], value.toFixed(1))
    })

    if (ms - rt.lastSparkAt >= 1400) {
      rt.lastSparkAt = ms
      const uph = pushSpark(rt.topSparks[0])
      const ct = pushSpark(rt.topSparks[1])
      const lob = pushSpark(rt.topSparks[2])
      flashText(topMetricRefs.current[0], Math.round(uph).toString(), s.tickflash)
      flashText(topMetricRefs.current[1], ct.toFixed(1), s.tickflash)
      flashText(topMetricRefs.current[2], lob.toFixed(1), s.tickflash)
      rt.kpiSparks.forEach(pushSpark)
    }
    rt.topSparks.forEach((spark, i) => updateSpark(topSparkSvgRefs.current[i], topSparkLineRefs.current[i], topSparkAreaRefs.current[i], spark))
    rt.kpiSparks.forEach((spark, i) => updateSpark(kpiSparkSvgRefs.current[i], kpiSparkLineRefs.current[i], kpiSparkAreaRefs.current[i], spark))

    updateBell(bellRef.current, 1.67, ms)
    const z = 3 * 1.67
    const yieldPct = (cdf(z) - cdf(-z)) * 100
    const ppm = Math.round((1 - (cdf(z) - cdf(-z))) * 1e6)
    updateText(cpkRef.current, '1.67')
    updateText(yieldRef.current, `${yieldPct.toFixed(3)}%`)
    updateText(ppmRef.current, ppm.toLocaleString())

    const kpiCycle = Math.floor(ms / 9000)
    const kpiPhase = ms % 9000
    KPIS.forEach((kpi, i) => {
      const state = rt.kpis[i]
      const delay = 300 + i * 90
      const dur = 1500
      let value = state.live
      if (kpiPhase >= delay && kpiPhase < delay + dur) {
        value = lerp(0, kpi.value, easeCubicOut((kpiPhase - delay) / dur))
      } else if (kpiPhase >= delay + dur) {
        if (state.cycleDone !== kpiCycle) {
          state.live = kpi.value
          state.nextTarget = kpi.value
          state.nextAt = ms + (Math.random() * 1400 + 1800)
          state.cycleDone = kpiCycle
        }
        if (ms >= state.nextAt) {
          state.nextTarget = clamp(kpi.range[0] + Math.random() * (kpi.range[1] - kpi.range[0]), kpi.range[0], kpi.range[1])
          state.nextAt = ms + (Math.random() * 2200 + 1800)
        }
        state.live = lerp(state.live, state.nextTarget, 1 - Math.exp(-dt / 600))
        value = state.live
      }
      updateText(kpiValueRefs.current[i], formatKpi(value, kpi.fixed))
    })

    const ganttPhase = ms % 6800
    const nowPct = nowLinePct()
    JOBS.forEach((job, i) => {
      const width = jobWidth(job) * easeCubicOut((ganttPhase - (250 + i * 160)) / 1100)
      if (ganttBarRefs.current[i]) ganttBarRefs.current[i]!.style.width = `${width}%`
      if (nowLineRefs.current[i]) nowLineRefs.current[i]!.style.left = `${nowPct}%`
    })

    updatePareto(paretoRef.current, ms, `${idBase}-pareto-bar`)
    updateTrend(trendRef.current, rt, ms)

    while (rt.seedIndex < SEED_EVENTS.length && ms >= rt.seedIndex * 300) {
      pushEvent(SEED_EVENTS[rt.seedIndex], ms, true)
      rt.seedIndex += 1
    }
    if (ms >= rt.nextLiveAt) {
      pushEvent(rt.shuffledEvents[rt.poolIndex % rt.shuffledEvents.length], ms)
      rt.poolIndex += 1
      if (rt.poolIndex % rt.shuffledEvents.length === 0) rt.shuffledEvents = shuffleEvents()
      rt.nextLiveAt = ms + (Math.random() * 1300 + 1500)
    }
    rt.feedRemovals = rt.feedRemovals.filter((item) => {
      if (ms < item.removeAt) return true
      if (item.el.parentNode) item.el.parentNode.removeChild(item.el)
      return false
    })
    if (rt.andonResetAt && ms >= rt.andonResetAt) {
      setAndon('g')
      rt.andonResetAt = 0
    }
  }, { running })

  return (
    <MesConsoleView
      idBase={idBase}
      canvasRef={ref}
      clockRef={clockRef}
      uptimeRef={uptimeRef}
      connRef={connRef}
      alarmCountRef={alarmCountRef}
      gaugeFillRefs={gaugeFillRefs}
      gaugeNeedleRefs={gaugeNeedleRefs}
      gaugeTextRefs={gaugeTextRefs}
      topSparkSvgRefs={topSparkSvgRefs}
      topSparkLineRefs={topSparkLineRefs}
      topSparkAreaRefs={topSparkAreaRefs}
      topMetricRefs={topMetricRefs}
      bellRef={bellRef}
      cpkRef={cpkRef}
      yieldRef={yieldRef}
      ppmRef={ppmRef}
      kpiValueRefs={kpiValueRefs}
      kpiSparkSvgRefs={kpiSparkSvgRefs}
      kpiSparkLineRefs={kpiSparkLineRefs}
      kpiSparkAreaRefs={kpiSparkAreaRefs}
      ganttBarRefs={ganttBarRefs}
      nowLineRefs={nowLineRefs}
      paretoRef={paretoRef}
      trendRef={trendRef}
      feedRef={feedRef}
      lampGRef={lampGRef}
      lampYRef={lampYRef}
      lampRRef={lampRRef}
      andonStateRef={andonStateRef}
      stopFlagRef={stopFlagRef}
    />
  )
}
