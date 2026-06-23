'use client'

import { useEffect, useRef, useState } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import { cx, setText } from '../_host/dom-util'
import { lerp } from '../_host/math'
import type { Frame, SceneProps } from '../_host/types'
import { SCM_AREA_MAX } from './constants'
import {
  ACTION_DEFS,
  ALM_POOL,
  HIST,
  IO_ITEMS,
  NAV_TABS,
  PV_DEFS,
  Q_DEFS,
  SCM_AREAS,
  SCM_PV_DEFS,
  SP_DEFS,
  SW_ITEMS,
  TF_ITEMS,
  type AlarmEvent,
  type TabId,
} from './data'
import { drawTrendCanvas, makeTrendRuntime, pad, renderAlarms, round2, setAttr } from './draw'
import s from './scene.module.css'
import type { AckPhase, MimicState, ProcessState, TrendRuntime } from './types'

export default function Scene({ running = true, onReady }: SceneProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [ackPhase, setAckPhase] = useState<AckPhase>('active')
  const ackPhaseRef = useRef<AckPhase>('active')

  const stateRef = useRef<ProcessState>({
    invCost: 4.0,
    invCostSP: 1.5,
    turnRate: 62.0,
    whEff: 78.0,
    acked: false,
  })
  const mimicRef = useRef<MimicState>({
    pumpAngle1: 0,
    pumpAngle2: 0,
    convX: 0,
    tk1Cur: 78,
    tk2Cur: 62,
    weldWidthCur: 20,
    phase1: 0,
    phase2: 1.0,
  })
  const trendsRef = useRef<TrendRuntime>(makeTrendRuntime())
  const eventLogRef = useRef<AlarmEvent[]>([...ALM_POOL].reverse().map((a) => ({ ...a, age: 0 })))
  const eventTimerRef = useRef(0)
  const ackRampRef = useRef<{ start: number | null; d0: number; eventInserted: boolean } | null>(null)
  const invPhaseAccRef = useRef(0)
  const lastClockRef = useRef('')

  const clkRef = useRef<HTMLDivElement | null>(null)
  const dateRef = useRef<HTMLDivElement | null>(null)
  const alarmMiniRef = useRef<HTMLDivElement | null>(null)
  const alarmFullRef = useRef<HTMLDivElement | null>(null)
  const sbAlmRef = useRef<HTMLElement | null>(null)
  const almIcoRef = useRef<HTMLDivElement | null>(null)
  const almLvlRef = useRef<HTMLDivElement | null>(null)
  const almTxtRef = useRef<HTMLDivElement | null>(null)
  const ackBtnRef = useRef<HTMLButtonElement | null>(null)

  const tk1fillRef = useRef<SVGRectElement | null>(null)
  const tk1waveRef = useRef<SVGRectElement | null>(null)
  const tk1pctRef = useRef<SVGTextElement | null>(null)
  const tk2fillRef = useRef<SVGRectElement | null>(null)
  const tk2waveRef = useRef<SVGRectElement | null>(null)
  const tk2pctRef = useRef<SVGTextElement | null>(null)
  const pump1Ref = useRef<SVGGElement | null>(null)
  const pump2Ref = useRef<SVGGElement | null>(null)
  const convBoxRef = useRef<SVGRectElement | null>(null)
  const weldBarRef = useRef<SVGRectElement | null>(null)
  const weldCtRef = useRef<SVGTextElement | null>(null)
  const uphRef = useRef<SVGTextElement | null>(null)
  const weldLedRef = useRef<SVGCircleElement | null>(null)
  const axLedRef = useRef<SVGCircleElement | null>(null)
  const tankLevelRefs = useRef<Array<HTMLDivElement | null>>([])
  const pvNumRefs = useRef<Array<HTMLSpanElement | null>>([])
  const riskTileRef = useRef<HTMLDivElement | null>(null)

  const trendRef = useRef<HTMLCanvasElement | null>(null)
  const trend2Ref = useRef<HTMLCanvasElement | null>(null)
  const trendInvRef = useRef<HTMLCanvasElement | null>(null)
  const trendScmRef = useRef<HTMLCanvasElement | null>(null)

  useSceneReady(onReady)

  useEffect(() => {
    renderAlarms(eventLogRef.current, alarmMiniRef.current, alarmFullRef.current)
  }, [])

  function applyAckCleared() {
    if (!ackRampRef.current || ackRampRef.current.eventInserted) return
    ackRampRef.current.eventInserted = true
    ackPhaseRef.current = 'cleared'
    setAckPhase('cleared')
    setAttr(weldLedRef.current, 'fill', '#21d07a')
    setAttr(axLedRef.current, 'fill', '#21d07a')
    setText(sbAlmRef.current, '0')
    if (sbAlmRef.current) sbAlmRef.current.style.color = '#21d07a'

    const rtnEntry: AlarmEvent = {
      sev: '#21d07a',
      ts: 'ACK',
      desc: '개선 적용 확인 -- 재고 정확도 개선·과잉/부족 반복 해소·재고회전율 +17%',
      st: 'RTN',
      age: 0,
    }
    eventLogRef.current.forEach((a) => {
      a.age++
    })
    eventLogRef.current.unshift(rtnEntry)
    if (eventLogRef.current.length > 20) eventLogRef.current.pop()
    renderAlarms(eventLogRef.current, alarmMiniRef.current, alarmFullRef.current)
  }

  function handleAck() {
    const state = stateRef.current
    if (state.acked) return
    state.acked = true
    ackPhaseRef.current = 'ramping'
    setAckPhase('ramping')
    ackRampRef.current = { start: null, d0: state.invCost, eventInserted: false }
    setAttr(weldLedRef.current, 'fill', '#ffb020')
  }

  const ref = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    g.clearRect(0, 0, fr.w, fr.h)
    const dtS = fr.dt > 0 ? Math.min(fr.dt, 0.08) : 0.016
    const dtMs = dtS * 1000
    const state = stateRef.current
    const mimic = mimicRef.current

    const nowDate = new Date()
    const clockKey = `${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}:${pad(nowDate.getSeconds())}`
    if (lastClockRef.current !== clockKey) {
      lastClockRef.current = clockKey
      setText(clkRef.current, clockKey)
      setText(dateRef.current, `${nowDate.getFullYear()}.${pad(nowDate.getMonth() + 1)}.${pad(nowDate.getDate())}`)
    }

    mimic.phase1 += dtS * 0.8
    mimic.phase2 += dtS * 0.6
    mimic.pumpAngle1 = (mimic.pumpAngle1 + 220 * dtS) % 360
    mimic.pumpAngle2 = (mimic.pumpAngle2 - 180 * dtS + 360) % 360
    setAttr(pump1Ref.current, 'transform', `rotate(${round2(mimic.pumpAngle1)})`)
    setAttr(pump2Ref.current, 'transform', `rotate(${round2(mimic.pumpAngle2)})`)

    const lv1Target = 78 + Math.sin(mimic.phase1) * 9
    const lv2Target = 62 + Math.sin(mimic.phase2) * 7
    mimic.tk1Cur = lerp(mimic.tk1Cur, lv1Target, 1 - Math.pow(0.05, dtS))
    mimic.tk2Cur = lerp(mimic.tk2Cur, lv2Target, 1 - Math.pow(0.05, dtS))

    const h1 = 108 * (mimic.tk1Cur / 100)
    setAttr(tk1fillRef.current, 'y', round2(6 + 108 - h1))
    setAttr(tk1fillRef.current, 'height', round2(h1))
    setAttr(tk1waveRef.current, 'y', round2(6 + 108 - h1 - 2 + Math.sin(mimic.phase1 * 2.3) * 1.5))
    setText(tk1pctRef.current, `${Math.round(mimic.tk1Cur)}%`)

    const h2 = 108 * (mimic.tk2Cur / 100)
    setAttr(tk2fillRef.current, 'y', round2(6 + 108 - h2))
    setAttr(tk2fillRef.current, 'height', round2(h2))
    setAttr(tk2waveRef.current, 'y', round2(6 + 108 - h2 - 2 + Math.sin(mimic.phase2 * 1.9) * 1.5))
    setText(tk2pctRef.current, `${Math.round(mimic.tk2Cur)}%`)

    mimic.convX += 60 * dtS
    if (mimic.convX > 266) mimic.convX -= 266
    setAttr(convBoxRef.current, 'x', round2(mimic.convX - 26))

    const weldTarget = 20 + 68 * ((Math.sin(mimic.phase1 * 0.7) + 1) / 2)
    mimic.weldWidthCur = lerp(mimic.weldWidthCur, weldTarget, 1 - Math.pow(0.1, dtS))
    setAttr(weldBarRef.current, 'width', round2(Math.min(mimic.weldWidthCur, 90)))
    setText(weldCtRef.current, `${Math.round(82 + Math.sin(mimic.phase1) * 6)}%`)
    setText(uphRef.current, `정합 ${Math.round(88 + Math.sin(mimic.phase1) * 4)}%`)

    if (fr.t < 1.4) {
      const t = Math.min(fr.t / 1.4, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      PV_DEFS.forEach((p, i) => {
        const value = p.track === 'risk' ? state.invCost : p.base * ease
        setText(pvNumRefs.current[i], value.toFixed(1))
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
        const runtime = trendsRef.current.trend[i] ?? { cur: target }
        const prev = i === 4 ? state.invCost : runtime.cur
        const value = lerp(prev, target, 1 - Math.pow(0.2, dtS))
        setText(pvNumRefs.current[i], value.toFixed(1))
      })
    }

    if (ackRampRef.current && ackPhaseRef.current === 'ramping') {
      if (ackRampRef.current.start === null) ackRampRef.current.start = fr.t
      const k = Math.min((fr.t - ackRampRef.current.start) / 2.6, 1)
      const e = 1 - Math.pow(1 - k, 3)
      state.invCost = ackRampRef.current.d0 * (1 - e) + state.invCostSP * e
      state.turnRate = 62 + (79 - 62) * e
      state.whEff = 78 + (92 - 78) * e
      setText(pvNumRefs.current[4], state.invCost.toFixed(1))
      if (riskTileRef.current) {
        riskTileRef.current.classList.toggle('warn', state.invCost > state.invCostSP)
        riskTileRef.current.classList.toggle('good', state.invCost <= state.invCostSP)
      }
      if (k >= 1) applyAckCleared()
    }

    eventTimerRef.current += dtS
    while (eventTimerRef.current >= 3.2) {
      eventTimerRef.current -= 3.2
      const moved = eventLogRef.current.pop()
      if (moved) {
        moved.age = 0
        eventLogRef.current.forEach((a) => {
          a.age++
        })
        eventLogRef.current.unshift(moved)
        renderAlarms(eventLogRef.current, alarmMiniRef.current, alarmFullRef.current)
      }
    }

    tankLevelRefs.current.forEach((node, i) => {
      if (!node) return
      const pct = Math.round((SCM_AREAS[i].cnt / SCM_AREA_MAX) * 100)
      node.style.height = `${pct}%`
    })

    drawTrendCanvas(trendRef.current, trendsRef.current.trend, dtMs, (i) => (i === 0 ? state.invCost * 10 : state.turnRate), (H) =>
      H - (state.invCostSP / 10) * H - 1
    )
    drawTrendCanvas(trend2Ref.current, trendsRef.current.trend2, dtMs, (i) => (i === 0 ? state.turnRate : state.whEff), null)
    drawTrendCanvas(
      trendInvRef.current,
      trendsRef.current.trendInv,
      dtMs,
      (i) => {
        if (i === 0) {
          invPhaseAccRef.current += 0.002
          return Math.min(82, 62 + 20 * Math.min(1, invPhaseAccRef.current))
        }
        return 50 + Math.sin(fr.t * 0.9) * 6
      },
      null
    )
    drawTrendCanvas(trendScmRef.current, trendsRef.current.trendScm, dtMs, (i) => (i === 0 ? 82 : 90), (H) => H - 0.8 * H - 1)
  }, { running })

  return (
    <SceneHost className={s.root} bg="#0c1014">
      <canvas ref={ref} className={s.c} />

      <div className="hmi">
        <div className="bezel">
          <div className="screen">
            <header className="bar">
              <div className="brand">
                <div className="logo" />
                <div>
                  <h1>창고물류 이관 개선 HMI</h1>
                  <div className="sub">INVENTORY TRANSFER DIGITALIZATION BOARD</div>
                </div>
              </div>
              <div className="hdr-block">
                <div className="k">Plant</div>
                <div className="v">제조창고</div>
              </div>
              <div className="hdr-block">
                <div className="k">Operator</div>
                <div className="v">OPERATOR · SCM TF</div>
              </div>
              <div className="hdr-block">
                <div className="k">기간</div>
                <div className="v">2023.03 ~ 2023.05</div>
              </div>
              <div className="hdr-spacer" />
              <div className="mode-pill">
                <span className="dot" />
                TF VIEW
              </div>
              <div className="clock">
                <div className="t mono" ref={clkRef}>
                  --:--:--
                </div>
                <div className="d mono" ref={dateRef}>
                  ----.--.--
                </div>
              </div>
            </header>

            <nav className="tabs">
              {NAV_TABS.map((tab) => (
                <button
                  className={activeTab === tab.id ? 'active' : undefined}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label} <span className="tag">{tab.tag}</span>
                </button>
              ))}
            </nav>

            <div className={cx('alarm-banner', ackPhase === 'active' && 'active', ackPhase === 'cleared' && 'cleared')}>
              <div className="ico" ref={almIcoRef}>
                {ackPhase === 'cleared' ? '*' : ackPhase === 'ramping' ? '+' : '!'}
              </div>
              <div className="msg">
                <div className="lvl" ref={almLvlRef}>
                  {ackPhase === 'cleared' ? 'RTN · 정상복귀 (CLEARED)' : ackPhase === 'ramping' ? 'ACK · 개선 조치 적용' : 'PROBLEM · 개선 전'}
                </div>
                <div className="txt" ref={almTxtRef}>
                  {ackPhase === 'cleared'
                    ? '재고 정확도 개선 · 과잉/부족 재고 반복 해소 · 재고회전율 +17% 보조 KPI 유지'
                    : ackPhase === 'ramping'
                      ? '이관 기준 정리·ERP 기록 프로세스 반영·창고 3정5S 적용 -- 재고 정확도 개선 추적'
                      : '제조·영업 간 재고 이관 프로세스가 전산화되어 있지 않아 재고 정확도가 낮고 과잉·부족 재고가 반복되었음.'}
                </div>
              </div>
              <button className={cx('ack-btn', ackPhase === 'cleared' && 'ok')} disabled={ackPhase !== 'active'} onClick={handleAck} ref={ackBtnRef} type="button">
                {ackPhase === 'cleared' ? '* CLEARED' : ackPhase === 'ramping' ? '개선 적용중...' : 'ACK · 개선 적용'}
              </button>
            </div>

            <section className={cx('stage', activeTab === 'overview' && 'show')}>
              <div className="layout">
                <div>
                  <div className="panel">
                    <div className="panel-h">
                      <div className="ttl">
                        재고·물류 MIMIC <small>제조·영업 재고 이관 공정</small>
                      </div>
                      <div className="tagid">MIM-001</div>
                    </div>
                    <div className="mimic-wrap">
                      <svg className="mimic" viewBox="0 0 1000 430" preserveAspectRatio="xMidYMid meet">
                        <defs>
                          <linearGradient id="tankG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#39d6ff" />
                            <stop offset="1" stopColor="#1a78a8" />
                          </linearGradient>
                          <linearGradient id="tankG2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#21d07a" />
                            <stop offset="1" stopColor="#0c8a4c" />
                          </linearGradient>
                          <linearGradient id="steelG" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#3a4654" />
                            <stop offset="1" stopColor="#1a212a" />
                          </linearGradient>
                          <radialGradient id="lampG" cx="35%" cy="30%" r="75%">
                            <stop offset="0" stopColor="#fff" stopOpacity=".7" />
                            <stop offset="1" stopColor="#fff" stopOpacity="0" />
                          </radialGradient>
                          <pattern id="flowDash" width="24" height="6" patternUnits="userSpaceOnUse">
                            <rect width="24" height="6" fill="none" />
                            <rect width="12" height="6" fill="#39d6ff" opacity=".85" />
                          </pattern>
                          <clipPath id="clipTk1">
                            <rect x="6" y="6" width="78" height="108" rx="6" />
                          </clipPath>
                          <clipPath id="clipTk2">
                            <rect x="6" y="6" width="88" height="108" rx="6" />
                          </clipPath>
                        </defs>

                        <text x="14" y="22" fill="#7e8c99" fontFamily="'Share Tech Mono',monospace" fontSize="11" letterSpacing="2">
                          INVENTORY TRANSFER FLOW · MANUFACTURING WH TO SALES WH
                        </text>

                        <g stroke="#2a333d" strokeWidth="7" fill="none">
                          <path d="M150 150 H300" />
                          <path d="M420 150 H560" />
                          <path d="M680 150 H820" />
                          <path d="M150 320 H300" />
                          <path d="M420 320 H560" />
                          <path d="M680 320 H820" />
                        </g>
                        <g stroke="url(#flowDash)" strokeWidth="3" fill="none" className="flow">
                          <path d="M150 150 H300" />
                          <path d="M420 150 H560" />
                          <path d="M680 150 H820" />
                          <path d="M150 320 H300" />
                          <path d="M420 320 H560" />
                          <path d="M680 320 H820" />
                        </g>

                        <g transform="translate(60,90)">
                          <rect x="0" y="0" width="90" height="120" rx="10" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <g clipPath="url(#clipTk1)">
                            <rect ref={tk1fillRef} x="6" y="60" width="78" height="60" fill="url(#tankG)" opacity=".9" />
                            <rect ref={tk1waveRef} x="6" y="58" width="78" height="6" fill="#9be8ff" opacity=".5" />
                          </g>
                          <rect x="0" y="0" width="90" height="120" rx="10" fill="none" stroke="#46535f" strokeWidth="2" />
                          <text x="45" y="-8" textAnchor="middle" fill="#dbe7f0" fontSize="11" fontWeight="700">
                            TK-01
                          </text>
                          <text x="45" y="138" textAnchor="middle" fill="#7e8c99" fontSize="9">
                            구매 입고 · 자재창고
                          </text>
                          <text ref={tk1pctRef} x="45" y="65" textAnchor="middle" fill="#fff" fontFamily="'Share Tech Mono',monospace" fontSize="13" fontWeight="700">
                            --%
                          </text>
                          <circle cx="78" cy="10" r="5" fill="#21d07a" className="led" stroke="#0c5a36" />
                        </g>

                        <g transform="translate(345,150)">
                          <circle r="34" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <g className="pump" ref={pump1Ref}>
                            <path d="M0 -22 A22 22 0 0 1 19 11 L0 0 Z" fill="#39d6ff" opacity=".85" />
                            <path d="M19 11 A22 22 0 0 1 -19 11 L0 0 Z" fill="#1a9ed0" opacity=".85" />
                            <path d="M-19 11 A22 22 0 0 1 0 -22 L0 0 Z" fill="#2ab6e8" opacity=".85" />
                          </g>
                          <circle r="6" fill="#0c1014" stroke="#46535f" />
                          <text x="0" y="52" textAnchor="middle" fill="#dbe7f0" fontSize="10" fontWeight="700">
                            MRP-S1
                          </text>
                          <circle cx="26" cy="-26" r="5" fill="#21d07a" className="led" />
                        </g>

                        <g transform="translate(560,95)">
                          <rect x="0" y="0" width="120" height="110" rx="8" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <text x="60" y="-8" textAnchor="middle" fill="#dbe7f0" fontSize="11" fontWeight="700">
                            MFG-WH 제조창고
                          </text>
                          <text x="60" y="128" textAnchor="middle" fill="#7e8c99" fontSize="9">
                            수기 이관 → 전산 기준
                          </text>
                          <rect x="14" y="30" width="92" height="14" rx="3" fill="#0c1014" stroke="#3a4654" />
                          <rect ref={weldBarRef} x="16" y="32" width="20" height="10" rx="2" fill="#ffb020" />
                          <text x="60" y="66" textAnchor="middle" fill="#7e8c99" fontSize="9" fontFamily="'Share Tech Mono',monospace">
                            재고정확도
                          </text>
                          <text ref={weldCtRef} x="60" y="84" textAnchor="middle" fill="#39d6ff" fontSize="15" fontWeight="700" fontFamily="'Share Tech Mono',monospace">
                            --
                          </text>
                          <circle ref={weldLedRef} cx="106" cy="10" r="5" fill="#ffb020" className="led" />
                        </g>

                        <g transform="translate(750,150)">
                          <rect x="-26" y="-14" width="52" height="28" rx="4" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <path d="M-14 -10 L0 0 L-14 10 Z M14 -10 L0 0 L14 10 Z" fill="#21d07a" />
                          <text x="0" y="32" textAnchor="middle" fill="#dbe7f0" fontSize="10" fontWeight="700">
                            V-203
                          </text>
                          <text x="0" y="-22" textAnchor="middle" fill="#21d07a" fontSize="8" fontFamily="'Share Tech Mono',monospace">
                            OPEN
                          </text>
                        </g>

                        <g transform="translate(820,90)">
                          <rect x="0" y="0" width="100" height="120" rx="10" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <g clipPath="url(#clipTk2)">
                            <rect ref={tk2fillRef} x="6" y="80" width="88" height="40" fill="url(#tankG2)" opacity=".9" />
                            <rect ref={tk2waveRef} x="6" y="78" width="88" height="6" fill="#a6ffd0" opacity=".5" />
                          </g>
                          <rect x="0" y="0" width="100" height="120" rx="10" fill="none" stroke="#46535f" strokeWidth="2" />
                          <text x="50" y="-8" textAnchor="middle" fill="#dbe7f0" fontSize="11" fontWeight="700">
                            SLS-WH
                          </text>
                          <text x="50" y="138" textAnchor="middle" fill="#7e8c99" fontSize="9">
                            영업창고 · 완제품 · 3정5S
                          </text>
                          <text ref={tk2pctRef} x="50" y="105" textAnchor="middle" fill="#fff" fontFamily="'Share Tech Mono',monospace" fontSize="13" fontWeight="700">
                            --%
                          </text>
                          <circle cx="88" cy="10" r="5" fill="#21d07a" className="led" />
                        </g>

                        <g transform="translate(60,300)">
                          <rect x="0" y="0" width="240" height="40" rx="6" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <g fill="#0c1014" stroke="#46535f" strokeWidth="1.5">
                            <circle cx="22" cy="20" r="11" />
                            <circle cx="60" cy="20" r="11" />
                            <circle cx="98" cy="20" r="11" />
                            <circle cx="136" cy="20" r="11" />
                            <circle cx="174" cy="20" r="11" />
                            <circle cx="212" cy="20" r="11" />
                          </g>
                          <rect ref={convBoxRef} x="0" y="2" width="26" height="16" rx="2" fill="#ffd23f" />
                          <text x="120" y="58" textAnchor="middle" fill="#7e8c99" fontSize="9">
                            CONV-1 · 제조→영업 이관 전산 프로세스
                          </text>
                          <text ref={uphRef} x="120" y="-8" textAnchor="middle" fill="#dbe7f0" fontSize="10" fontWeight="700" fontFamily="'Share Tech Mono',monospace">
                            정합 ----
                          </text>
                        </g>

                        <g transform="translate(345,320)">
                          <circle r="30" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <g className="pump" ref={pump2Ref}>
                            <path d="M0 -20 A20 20 0 0 1 17 10 L0 0 Z" fill="#21d07a" opacity=".85" />
                            <path d="M17 10 A20 20 0 0 1 -17 10 L0 0 Z" fill="#0e9a58" opacity=".85" />
                            <path d="M-17 10 A20 20 0 0 1 0 -20 L0 0 Z" fill="#16b86c" opacity=".85" />
                          </g>
                          <circle r="5" fill="#0c1014" stroke="#46535f" />
                          <text x="0" y="48" textAnchor="middle" fill="#dbe7f0" fontSize="10" fontWeight="700">
                            KBN-S2
                          </text>
                          <circle cx="22" cy="-22" r="5" fill="#21d07a" className="led" />
                        </g>

                        <g transform="translate(560,275)">
                          <rect x="0" y="0" width="260" height="90" rx="10" fill="url(#steelG)" stroke="#46535f" strokeWidth="2" />
                          <text x="130" y="-8" textAnchor="middle" fill="#dbe7f0" fontSize="11" fontWeight="700">
                            TF-CTR · SCM 개선 TF 통합관제
                          </text>
                          <text x="130" y="108" textAnchor="middle" fill="#7e8c99" fontSize="9">
                            SCM 개선 TF · 제조·영업 이관 전산화 · 재고회전율 +17%
                          </text>
                          <g fontFamily="'Share Tech Mono',monospace" fontSize="9">
                            <circle cx="30" cy="30" r="6" fill="#21d07a" className="led" />
                            <text x="44" y="34" fill="#c4d2dd">
                              구매
                            </text>
                            <circle cx="100" cy="30" r="6" fill="#21d07a" className="led" />
                            <text x="114" y="34" fill="#c4d2dd">
                              영업
                            </text>
                            <circle cx="165" cy="30" r="6" fill="#21d07a" className="led" />
                            <text x="179" y="34" fill="#c4d2dd">
                              제조
                            </text>
                            <circle cx="30" cy="58" r="6" fill="#39d6ff" className="led" />
                            <text x="44" y="62" fill="#c4d2dd">
                              생산관리
                            </text>
                            <circle cx="100" cy="58" r="6" fill="#39d6ff" className="led" />
                            <text x="114" y="62" fill="#c4d2dd">
                              3정5S
                            </text>
                            <circle ref={axLedRef} cx="165" cy="58" r="6" fill="#ffb020" className="led" />
                            <text x="179" y="62" fill="#c4d2dd">
                              이관전산
                            </text>
                          </g>
                        </g>
                      </svg>
                    </div>
                  </div>

                  <div className="pv-strip">
                    {PV_DEFS.map((p, i) => (
                      <div className={cx('pv-tile', p.cls)} key={p.tag} ref={i === 4 ? riskTileRef : undefined}>
                        <div className="lbl">
                          <span>{p.lbl}</span>
                          <span className="tg">{p.tag}</span>
                        </div>
                        <div>
                          <span
                            className="num"
                            ref={(node) => {
                              pvNumRefs.current[i] = node
                            }}
                          >
                            0.0
                          </span>
                          <span className="unit">{p.unit}</span>
                        </div>
                        <div className="sp">{p.sp}</div>
                      </div>
                    ))}
                  </div>

                  <div className="panel inv-panel mt16">
                    <div className="panel-h">
                      <div className="ttl">
                        창고 물류 개선 과제 <small>제조·영업 이관 프로세스 전산화</small>
                      </div>
                      <div className="tagid">WH-TF</div>
                    </div>
                    <div className="inv-grid">
                      <div className="inv-gauge role-card">
                        <div className="role-code">SCM TF · WH LOGISTICS</div>
                        <div className="role-title">창고 물류 개선</div>
                        <div className="role-copy">제조창고와 영업창고 사이의 재고 이관을 수기 처리에서 전산 승인·기록 프로세스로 전환한 개선 과제.</div>
                        <div className="role-flow">수기 이관 → ERP 기준 기록 → 재고 정확도 개선 → 과잉·부족 반복 해소</div>
                        <span className="micro-kpi" title="정본 유지 KPI: 재고회전율 +17%">
                          <span className="muted">KPI</span> +17% TURN
                        </span>
                      </div>
                      <div className="inv-body">
                        <div className="inv-stat">
                          <span className="k">TF</span>
                          <span className="v">창고물류 개선 TF (2023.03 ~ 2023.05)</span>
                        </div>
                        <div className="inv-stat">
                          <span className="k">구성</span>
                          <span className="v">TF 5명 · 제조·영업·구매·생산관리 협업</span>
                        </div>
                        <div className="inv-stat">
                          <span className="k">문제</span>
                          <span className="v">제조·영업 간 재고 이관 프로세스가 전산화되어 있지 않아 재고 정확도가 낮고 과잉·부족 재고가 반복되었음.</span>
                        </div>
                        <div className="inv-stat">
                          <span className="k">성과</span>
                          <span className="v">
                            재고 정확도 개선·과잉/부족 반복 해소 <span className="micro-kpi" title="정본 유지 보조 KPI">재고회전율 +17%</span>
                          </span>
                        </div>
                        <div className="inv-note">
                          창고 물류 개선 TF 관점에서 이관 기준, 부서 승인 흐름, ERP 기록 기준, 현장 3정5S를 함께 정리해 제조창고와 영업창고의 재고 위치·책임·수량 기준을 맞춘 과제.
                        </div>
                      </div>
                    </div>
                    <div className="trend-box top-line">
                      <div className="trend-legend">
                        <span>
                          <i className="swatch-run" />
                          이관 전산화 정착도
                        </span>
                        <span>
                          <i className="swatch-pv" />
                          재고 정확도 개선 추이
                        </span>
                      </div>
                      <canvas className="trendCanvas" height={160} ref={trendInvRef} width={900} />
                    </div>
                  </div>

                  <div className="panel mt16">
                    <div className="panel-h">
                      <div className="ttl">
                        개선 TREND <small>TF 추진 단계별 재고 정확도·이관 정착 추이</small>
                      </div>
                      <div className="tagid">TRD-101</div>
                    </div>
                    <div className="trend-box">
                      <div className="trend-legend">
                        <span>
                          <i className="swatch-alarm" />
                          수기 이관 리스크 지수
                        </span>
                        <span>
                          <i className="swatch-pv" />
                          재고 정확도 개선 추이
                        </span>
                        <span>
                          <i className="swatch-sp" />
                          관리 기준선
                        </span>
                      </div>
                      <canvas className="trendCanvas" height={200} ref={trendRef} width={900} />
                    </div>
                  </div>
                </div>

                <aside>
                  <div className="panel">
                    <div className="panel-h">
                      <div className="ttl">SETPOINT · 핵심 SCM PV</div>
                      <div className="tagid">SP-KPI</div>
                    </div>
                    <div className="sp-list">
                      {SP_DEFS.map((item) => (
                        <div className="sp-row" key={item.nm}>
                          <span className="area-led" style={{ background: item.c, color: item.c }} />
                          <div className="info">
                            <div className="nm">{item.nm}</div>
                            <div className="yr">{item.yr}</div>
                          </div>
                          <div className="val">
                            <div className="pv" style={{ color: item.c }}>
                              {item.pv}
                            </div>
                            <div className="un">{item.un}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel mt16">
                    <div className="panel-h">
                      <div className="ttl">최근 알람</div>
                      <div className="tagid">ALM-LOG</div>
                    </div>
                    <div className="alm-list" ref={alarmMiniRef} />
                  </div>
                </aside>
              </div>
            </section>

            <section className={cx('stage', activeTab === 'line1' && 'show')}>
              <div className="panel">
                <div className="panel-h">
                  <div className="ttl">
                    SCM·제조 역량 IO 목록 <small>보유 역량 = I/O 포인트</small>
                  </div>
                  <div className="tagid">IO-L01</div>
                </div>
                <div className="io-grid">
                  {IO_ITEMS.map((item, i) => (
                    <div className="io-tag" key={item[0]}>
                      <span className="io-led" />
                      <span className="io-nm">{item[0]}</span>
                      <span className="io-addr">%{item[1]}{String(i).padStart(3, '0')}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="gridrow">
                <div className="panel">
                  <div className="panel-h">
                    <div className="ttl">물류·재고 관리 도구</div>
                    <div className="tagid">SCM-STK</div>
                  </div>
                  <div className="io-grid">
                    {SW_ITEMS.map((item, i) => (
                      <div className="io-tag" key={item[0]}>
                        <span className="io-led" />
                        <span className="io-nm">{item[0]}</span>
                        <span className="io-addr">%{item[1]}{String(i).padStart(3, '0')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className={cx('stage', activeTab === 'quality' && 'show')}>
              <div className="panel">
                <div className="panel-h">
                  <div className="ttl">
                    SCM 성과 지표 대시보드 <small>창고물류 개선 TF 실측 KPI</small>
                  </div>
                  <div className="tagid">KPI-001</div>
                </div>
                <div className="q-grid">
                  {Q_DEFS.map((q) => (
                    <div className="q-card" key={q.big}>
                      <div className="big">{q.big}</div>
                      <div className="cap" dangerouslySetInnerHTML={{ __html: q.cap }} />
                      <div className="delta">{q.delta}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel mt16">
                <div className="panel-h">
                  <div className="ttl">
                    재고회전율 개선 TREND <small>TF 추진 전-&gt;후 추이</small>
                  </div>
                  <div className="tagid">KPI-TRD</div>
                </div>
                <div className="trend-box">
                  <div className="trend-legend">
                    <span>
                      <i className="swatch-run" />
                      재고회전율 PV (%UP)
                    </span>
                    <span>
                      <i className="swatch-pv" />
                      입출고 리드타임 PV (단축 추이)
                    </span>
                  </div>
                  <canvas className="trendCanvas" height={200} ref={trend2Ref} width={900} />
                </div>
              </div>
            </section>

            <section className={cx('stage', activeTab === 'alarms' && 'show')}>
              <div className="panel">
                <div className="panel-h">
                  <div className="ttl">
                    개선 이벤트 기록 <small>문제 정의 / 조치 / 결과</small>
                  </div>
                  <div className="tagid">EVT-FULL</div>
                </div>
                <div className="alm-list" ref={alarmFullRef} />
              </div>
            </section>

            <section className={cx('stage', activeTab === 'history' && 'show')}>
              <div className="panel">
                <div className="panel-h">
                  <div className="ttl">
                    SCM 개선 추진 이력 <small>TF 단계별 배치 이력 (Batch History)</small>
                  </div>
                  <div className="tagid">HIST-001</div>
                </div>
                <div className="hist">
                  {HIST.map((h) => (
                    <div className="hist-row" key={h.when}>
                      <div className="when">
                        {h.when}
                        <small>{h.sub}</small>
                      </div>
                      <div className="what">
                        <div className="role">{h.role}</div>
                        <div className="org">{h.org}</div>
                        <div className="body">{h.body}</div>
                        <div className="chips">
                          {h.chips.map((chip) => (
                            <span className="chip" key={chip}>
                              {chip}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel mt16">
                <div className="panel-h">
                  <div className="ttl">운영자 연락 채널</div>
                  <div className="tagid">COMM</div>
                </div>
                <div className="contact-bar">
                  <span>
                    <span className="ic">◆</span>CONTACT · SCM 개선 TF
                  </span>
                </div>
              </div>
            </section>

            <section className={cx('stage', activeTab === 'scmtf' && 'show')}>
              <div className="scm-creed">
                <span className="ic">◎</span>
                <div className="ct">
                  재고 측정은 현장 / 검토 트리거는 TF 주간회의 / 처분(이관·면책)은 부서 합의 -- <b className="blue">수치는 판결이 아니라 개선의 시작이다.</b>
                  <span className="principle">TF 운영 원칙: "불합리한 재고 흐름을 방치하지 않는다."</span>
                </div>
              </div>
              <div className="scm-note">
                <b>SCM 개선 TF (2023.03 ~ 2023.05)</b> -- 구매·영업·제조·생산관리 4개 부서 TF 5명을 구성, 3개월 운영. 제조·영업 간 재고 이관 프로세스가
                전산화되어 있지 않아 재고 정확도가 낮고 과잉·부족 재고가 반복되던 문제를 이관 기준 정리 → ERP 기록 프로세스 반영 → 창고 3정5S → 재고 정확도 개선·과잉/부족
                해소로 연결했다. 재고회전율 <span className="micro-kpi" title="정본 유지 보조 KPI">+17%</span>는 보조 성과지표로 유지한다.
              </div>

              <div className="layout">
                <div>
                  <div className="panel">
                    <div className="panel-h">
                      <div className="ttl">
                        SCM 개선 공정 영역 <small>단계별 재고 흐름 개선도 = 탱크 레벨</small>
                      </div>
                      <div className="tagid">TF-PARA</div>
                    </div>
                    <div className="para-grid">
                      {SCM_AREAS.map((area, i) => {
                        const pct = Math.round((area.cnt / SCM_AREA_MAX) * 100)
                        return (
                          <div className="para-tank" key={area.root}>
                            <div className="ph">
                              <span className="root">{area.root}</span>
                              <span className="nm">{area.nm}</span>
                            </div>
                            <div className="lvlwrap">
                              <div
                                className="lvl"
                                ref={(node) => {
                                  tankLevelRefs.current[i] = node
                                }}
                                style={{ height: '0%' }}
                              >
                                <div className="wave" />
                              </div>
                              <div className="cnt">{area.cnt}%</div>
                            </div>
                            <div className="cap">개선도 · {pct}% lvl</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pv-strip">
                    {SCM_PV_DEFS.map((p) => (
                      <div className={cx('pv-tile', p.cls)} key={p.tag}>
                        <div className="lbl">
                          <span>{p.lbl}</span>
                          <span className="tg">{p.tag}</span>
                        </div>
                        <div>
                          <span className="num">{p.val}</span>
                          <span className="unit">{p.unit}</span>
                        </div>
                        <div className="sp">{p.sp}</div>
                      </div>
                    ))}
                  </div>

                  <div className="panel mt16">
                    <div className="panel-h">
                      <div className="ttl">
                        TF 추진 개선 TREND <small>스트립 차트 · 이관 전산화·재고 정확도 추이</small>
                      </div>
                      <div className="tagid">TRD-TF</div>
                    </div>
                    <div className="trend-box">
                      <div className="trend-legend">
                        <span>
                          <i className="swatch-run" />
                          재고회전율 개선도 PV (%)
                        </span>
                        <span>
                          <i className="swatch-pv" />
                          창고 운영 효율 PV (%)
                        </span>
                        <span>
                          <i className="swatch-sp" />
                          목표 기준선
                        </span>
                      </div>
                      <canvas className="trendCanvas" height={200} ref={trendScmRef} width={900} />
                    </div>
                  </div>
                </div>

                <aside>
                  <div className="panel">
                    <div className="panel-h">
                      <div className="ttl">TF 추진 항목 · 진행상태</div>
                      <div className="tagid">TF-SP</div>
                    </div>
                    <div className="ssot-grid">
                      {TF_ITEMS.map((item) => (
                        <div className="ssot-row" key={item.nm}>
                          <span className="sl" style={{ background: item.col, color: item.col }} />
                          <div className="nm">
                            {item.nm}
                            <small>{item.sub}</small>
                          </div>
                          <div className="pv" style={{ color: item.col }}>
                            {item.v}
                          </div>
                          <div className="sp">{item.sp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel mt16">
                    <div className="panel-h">
                      <div className="ttl">
                        개선 액션 큐 <small>부서별 실행 항목</small>
                      </div>
                      <div className="tagid">ACT-Q</div>
                    </div>
                    <div className="gap-queue">
                      {ACTION_DEFS.map((item, i) => (
                        <div className="gap-item" key={item.lk}>
                          <span className="rk">#{i + 1}</span>
                          <span className="lk">
                            {item.lk}
                            <br />
                            <small>{item.sub}</small>
                          </span>
                          <span className="dep green">{item.dep}</span>
                          <span className="qd">{item.qd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </section>

            <footer className="statusbar">
              <div className="seg">
                <span className="l run-dot" />
                <b>RUN</b>
              </div>
              <div className="seg">
                문서상태: <b className="green">정본 반영</b>
              </div>
              <div className="seg">
                검토주기: <b className="mono">TF WEEKLY</b>
              </div>
              <div className="seg">
                개선항목:{' '}
                <b className="mono green" ref={sbAlmRef}>
                  5
                </b>
              </div>
              <div className="seg">
                노드: <b className="mono">SCM-TF-01</b>
              </div>
              <div className="seg hdr-spacer footer-note">SCM 재고·물류 HMI DEMO</div>
            </footer>
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
