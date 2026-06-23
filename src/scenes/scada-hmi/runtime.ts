import { lerp } from '../_host/math'
import { setText } from '../_host/dom-util'
import type { Frame } from '../_host/types'
import { SCM_AREA_MAX } from './constants'
import { SCM_AREAS, PV_DEFS, type AlarmEvent } from './data'
import { drawTrendCanvas, pad, renderAlarms, round2, setAttr } from './draw'
import type { AckPhase, MimicState, ProcessState, TrendRuntime } from './types'

// ── Refs bundle passed from Scene ────────────────────────────────────────────
export interface DomRefs {
  clk: HTMLDivElement | null
  date: HTMLDivElement | null
  alarmMini: HTMLDivElement | null
  alarmFull: HTMLDivElement | null
  sbAlm: HTMLElement | null
  pump1: SVGGElement | null
  pump2: SVGGElement | null
  tk1fill: SVGRectElement | null
  tk1wave: SVGRectElement | null
  tk1pct: SVGTextElement | null
  tk2fill: SVGRectElement | null
  tk2wave: SVGRectElement | null
  tk2pct: SVGTextElement | null
  convBox: SVGRectElement | null
  weldBar: SVGRectElement | null
  weldCt: SVGTextElement | null
  uph: SVGTextElement | null
  weldLed: SVGCircleElement | null
  axLed: SVGCircleElement | null
  tankLevels: Array<HTMLDivElement | null>
  pvNums: Array<HTMLSpanElement | null>
  riskTile: HTMLDivElement | null
  trend: HTMLCanvasElement | null
  trend2: HTMLCanvasElement | null
  trendInv: HTMLCanvasElement | null
  trendScm: HTMLCanvasElement | null
}

export interface AckRamp {
  start: number | null
  d0: number
  eventInserted: boolean
}

// ── Ack helpers ───────────────────────────────────────────────────────────────

export function applyAckCleared(
  ackRamp: AckRamp,
  ackPhaseRef: React.MutableRefObject<AckPhase>,
  setAckPhase: (p: AckPhase) => void,
  dom: Pick<DomRefs, 'weldLed' | 'axLed' | 'sbAlm' | 'alarmMini' | 'alarmFull'>,
  eventLog: AlarmEvent[],
) {
  if (ackRamp.eventInserted) return
  ackRamp.eventInserted = true
  ackPhaseRef.current = 'cleared'
  setAckPhase('cleared')
  setAttr(dom.weldLed, 'fill', '#21d07a')
  setAttr(dom.axLed, 'fill', '#21d07a')
  setText(dom.sbAlm, '0')
  if (dom.sbAlm) dom.sbAlm.style.color = '#21d07a'

  const rtnEntry: AlarmEvent = {
    sev: '#21d07a',
    ts: 'ACK',
    desc: '개선 적용 확인 -- 재고 정확도 개선·과잉/부족 반복 해소·재고회전율 +17%',
    st: 'RTN',
    age: 0,
  }
  eventLog.forEach((a) => { a.age++ })
  eventLog.unshift(rtnEntry)
  if (eventLog.length > 20) eventLog.pop()
  renderAlarms(eventLog, dom.alarmMini, dom.alarmFull)
}

export function handleAck(
  state: ProcessState,
  ackPhaseRef: React.MutableRefObject<AckPhase>,
  setAckPhase: (p: AckPhase) => void,
  ackRampRef: React.MutableRefObject<AckRamp | null>,
  dom: Pick<DomRefs, 'weldLed'>,
) {
  if (state.acked) return
  state.acked = true
  ackPhaseRef.current = 'ramping'
  setAckPhase('ramping')
  ackRampRef.current = { start: null, d0: state.invCost, eventInserted: false }
  setAttr(dom.weldLed, 'fill', '#ffb020')
}

// ── rAF tick ─────────────────────────────────────────────────────────────────

export interface TickRefs {
  state: React.MutableRefObject<ProcessState>
  mimic: React.MutableRefObject<MimicState>
  trends: React.MutableRefObject<TrendRuntime>
  eventLog: React.MutableRefObject<AlarmEvent[]>
  eventTimer: React.MutableRefObject<number>
  ackRamp: React.MutableRefObject<AckRamp | null>
  invPhaseAcc: React.MutableRefObject<number>
  lastClock: React.MutableRefObject<string>
  ackPhase: React.MutableRefObject<AckPhase>
  setAckPhase: (p: AckPhase) => void
  dom: DomRefs
}

export function tick(g: CanvasRenderingContext2D, fr: Frame, refs: TickRefs) {
  g.clearRect(0, 0, fr.w, fr.h)
  const dtS = fr.dt > 0 ? Math.min(fr.dt, 0.08) : 0.016
  const dtMs = dtS * 1000
  const state = refs.state.current
  const mimic = refs.mimic.current
  const dom = refs.dom

  // clock
  const nowDate = new Date()
  const clockKey = `${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`
  if (refs.lastClock.current !== clockKey) {
    refs.lastClock.current = clockKey
    setText(dom.clk, clockKey)
    setText(dom.date, `${nowDate.getFullYear()}.${pad(nowDate.getMonth() + 1)}.${pad(nowDate.getDate())}`)
  }

  // pumps
  mimic.phase1 += dtS * 0.8
  mimic.phase2 += dtS * 0.6
  mimic.pumpAngle1 = (mimic.pumpAngle1 + 220 * dtS) % 360
  mimic.pumpAngle2 = (mimic.pumpAngle2 - 180 * dtS + 360) % 360
  setAttr(dom.pump1, 'transform', `rotate(${round2(mimic.pumpAngle1)})`)
  setAttr(dom.pump2, 'transform', `rotate(${round2(mimic.pumpAngle2)})`)

  // tanks
  const lv1Target = 78 + Math.sin(mimic.phase1) * 9
  const lv2Target = 62 + Math.sin(mimic.phase2) * 7
  mimic.tk1Cur = lerp(mimic.tk1Cur, lv1Target, 1 - Math.pow(0.05, dtS))
  mimic.tk2Cur = lerp(mimic.tk2Cur, lv2Target, 1 - Math.pow(0.05, dtS))

  const h1 = 108 * (mimic.tk1Cur / 100)
  setAttr(dom.tk1fill, 'y', round2(6 + 108 - h1))
  setAttr(dom.tk1fill, 'height', round2(h1))
  setAttr(dom.tk1wave, 'y', round2(6 + 108 - h1 - 2 + Math.sin(mimic.phase1 * 2.3) * 1.5))
  setText(dom.tk1pct, `${Math.round(mimic.tk1Cur)}%`)

  const h2 = 108 * (mimic.tk2Cur / 100)
  setAttr(dom.tk2fill, 'y', round2(6 + 108 - h2))
  setAttr(dom.tk2fill, 'height', round2(h2))
  setAttr(dom.tk2wave, 'y', round2(6 + 108 - h2 - 2 + Math.sin(mimic.phase2 * 1.9) * 1.5))
  setText(dom.tk2pct, `${Math.round(mimic.tk2Cur)}%`)

  // conveyor
  mimic.convX += 60 * dtS
  if (mimic.convX > 266) mimic.convX -= 266
  setAttr(dom.convBox, 'x', round2(mimic.convX - 26))

  // weld bar
  const weldTarget = 20 + 68 * ((Math.sin(mimic.phase1 * 0.7) + 1) / 2)
  mimic.weldWidthCur = lerp(mimic.weldWidthCur, weldTarget, 1 - Math.pow(0.1, dtS))
  setAttr(dom.weldBar, 'width', round2(Math.min(mimic.weldWidthCur, 90)))
  setText(dom.weldCt, `${Math.round(82 + Math.sin(mimic.phase1) * 6)}%`)
  setText(dom.uph, `정합 ${Math.round(88 + Math.sin(mimic.phase1) * 4)}%`)

  // PV numbers
  if (fr.t < 1.4) {
    const t = Math.min(fr.t / 1.4, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    PV_DEFS.forEach((p, i) => {
      const value = p.track === 'risk' ? state.invCost : p.base * ease
      setText(dom.pvNums[i], value.toFixed(1))
    })
  } else if (fr.t > 1.5) {
    const targets = [
      100,
      94 + Math.sin(fr.t * 0.9 + 1) * 0.4,
      90 + Math.sin(fr.t * 1.1 + 2) * 0.4,
      100,
      state.invCost + Math.sin(fr.t * 1.3) * 0.05,
    ]
    targets.forEach((target, i) => {
      const runtime = refs.trends.current.trend[i] ?? { cur: target }
      const prev = i === 4 ? state.invCost : runtime.cur
      const value = lerp(prev, target, 1 - Math.pow(0.2, dtS))
      setText(dom.pvNums[i], value.toFixed(1))
    })
  }

  // ack ramp
  if (refs.ackRamp.current && refs.ackPhase.current === 'ramping') {
    const ramp = refs.ackRamp.current
    if (ramp.start === null) ramp.start = fr.t
    const k = Math.min((fr.t - ramp.start) / 2.6, 1)
    const e = 1 - Math.pow(1 - k, 3)
    state.invCost = ramp.d0 * (1 - e) + state.invCostSP * e
    state.turnRate = 62 + (79 - 62) * e
    state.whEff = 78 + (92 - 78) * e
    setText(dom.pvNums[4], state.invCost.toFixed(1))
    if (dom.riskTile) {
      dom.riskTile.classList.toggle('warn', state.invCost > state.invCostSP)
      dom.riskTile.classList.toggle('good', state.invCost <= state.invCostSP)
    }
    if (k >= 1) {
      applyAckCleared(
        ramp,
        refs.ackPhase,
        refs.setAckPhase,
        { weldLed: dom.weldLed, axLed: dom.axLed, sbAlm: dom.sbAlm, alarmMini: dom.alarmMini, alarmFull: dom.alarmFull },
        refs.eventLog.current,
      )
    }
  }

  // event log rotation
  refs.eventTimer.current += dtS
  while (refs.eventTimer.current >= 3.2) {
    refs.eventTimer.current -= 3.2
    const moved = refs.eventLog.current.pop()
    if (moved) {
      moved.age = 0
      refs.eventLog.current.forEach((a) => { a.age++ })
      refs.eventLog.current.unshift(moved)
      renderAlarms(refs.eventLog.current, dom.alarmMini, dom.alarmFull)
    }
  }

  // tank level bars
  dom.tankLevels.forEach((node, i) => {
    if (!node) return
    const pct = Math.round((SCM_AREAS[i].cnt / SCM_AREA_MAX) * 100)
    node.style.height = `${pct}%`
  })

  // trend canvases
  drawTrendCanvas(dom.trend, refs.trends.current.trend, dtMs, (i) => (i === 0 ? state.invCost * 10 : state.turnRate), (H) =>
    H - (state.invCostSP / 10) * H - 1
  )
  drawTrendCanvas(dom.trend2, refs.trends.current.trend2, dtMs, (i) => (i === 0 ? state.turnRate : state.whEff), null)
  drawTrendCanvas(
    dom.trendInv,
    refs.trends.current.trendInv,
    dtMs,
    (i) => {
      if (i === 0) {
        refs.invPhaseAcc.current += 0.002
        return Math.min(82, 62 + 20 * Math.min(1, refs.invPhaseAcc.current))
      }
      return 50 + Math.sin(fr.t * 0.9) * 6
    },
    null,
  )
  drawTrendCanvas(dom.trendScm, refs.trends.current.trendScm, dtMs, (i) => (i === 0 ? 82 : 90), (H) => H - 0.8 * H - 1)
}
