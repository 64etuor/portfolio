'use client'

import type React from 'react'
import { setText, scrollIntoNearestScrollable } from '../_host/dom-util'
import { FIL_HOT, G_MAX, TOTAL_MOVES } from './constants'
import { CAREER_REVEAL, LAYER_H, LAYERS, METRICS, PLATE, SKILLS, T_TARGET, TOTAL_LAYERS, type Layer, type Move } from './data'
import { drawFixtureAnnotations, drawNozzle, drawPlate, fmt, project, setupCam } from './draw'
import type { DefectAnim, Deposit, Pos, SimState } from './types'
import s from './scene.module.css'

export function createInitialState(): SimState {
  return {
    layer: 0,
    moveIdx: 0,
    prevPos: null,
    segT: 0,
    nozzle: { x: PLATE.w / 2, y: PLATE.d / 2, z: LAYER_H },
    eTotal: 0,
    gline: 0,
    temp: 25,
    bed: 25,
    running: true,
    done: false,
    totalMoves: TOTAL_MOVES,
    doneAt: null,
  }
}

export interface GcodeRuntimeRefs {
  state: React.MutableRefObject<SimState>
  deposited: React.MutableRefObject<Deposit[]>
  movesDone: React.MutableRefObject<number>
  gLines: React.MutableRefObject<string[]>
  tHist: React.MutableRefObject<number[]>
  tempTick: React.MutableRefObject<number>
  careerSolid: React.MutableRefObject<boolean[]>
  metricSolid: React.MutableRefObject<boolean[]>
  skillSolid: React.MutableRefObject<boolean[]>
  defectShown: React.MutableRefObject<boolean>
  defectAnim: React.MutableRefObject<DefectAnim>
  tNozRef: React.MutableRefObject<HTMLElement | null>
  tBedRef: React.MutableRefObject<HTMLElement | null>
  statetagRef: React.MutableRefObject<HTMLDivElement | null>
  statetxtRef: React.MutableRefObject<HTMLSpanElement | null>
  layerRef: React.MutableRefObject<HTMLSpanElement | null>
  zRef: React.MutableRefObject<HTMLSpanElement | null>
  xRef: React.MutableRefObject<HTMLElement | null>
  yRef: React.MutableRefObject<HTMLElement | null>
  eRef: React.MutableRefObject<HTMLElement | null>
  tempRef: React.MutableRefObject<HTMLElement | null>
  etaRef: React.MutableRefObject<HTMLElement | null>
  pctRef: React.MutableRefObject<HTMLSpanElement | null>
  fillRef: React.MutableRefObject<HTMLDivElement | null>
  gcodeRef: React.MutableRefObject<HTMLDivElement | null>
  gLnRef: React.MutableRefObject<HTMLSpanElement | null>
  matMetaRef: React.MutableRefObject<HTMLDivElement | null>
  completeRef: React.MutableRefObject<HTMLElement | null>
  defectRef: React.MutableRefObject<HTMLDivElement | null>
  defectLabelRef: React.MutableRefObject<HTMLSpanElement | null>
  defectTagRef: React.MutableRefObject<HTMLSpanElement | null>
  defectTextRef: React.MutableRefObject<HTMLDivElement | null>
  reprintBtnRef: React.MutableRefObject<HTMLButtonElement | null>
  tempTargetRef: React.MutableRefObject<SVGLineElement | null>
  tempPathRef: React.MutableRefObject<SVGPathElement | null>
  tempAreaRef: React.MutableRefObject<SVGPathElement | null>
  defectSvgRef: React.MutableRefObject<SVGSVGElement | null>
  careerRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  metricRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
  metricBarRefs: React.MutableRefObject<Array<HTMLElement | null>>
  skillRefs: React.MutableRefObject<Array<HTMLDivElement | null>>
}

export function createGcodeRuntime(refs: GcodeRuntimeRefs) {
  const {
    state,
    deposited,
    movesDone,
    gLines,
    tHist,
    tempTick,
    careerSolid,
    metricSolid,
    skillSolid,
    defectShown,
    defectAnim,
    tNozRef,
    tBedRef,
    statetagRef,
    statetxtRef,
    layerRef,
    zRef,
    xRef,
    yRef,
    eRef,
    tempRef,
    etaRef,
    pctRef,
    fillRef,
    gcodeRef,
    gLnRef,
    matMetaRef,
    completeRef,
    defectRef,
    defectLabelRef,
    defectTagRef,
    defectTextRef,
    reprintBtnRef,
    tempTargetRef,
    tempPathRef,
    tempAreaRef,
    defectSvgRef,
    careerRefs,
    metricRefs,
    metricBarRefs,
    skillRefs
  } = refs

  function currentLayer(): Layer | undefined {
    return LAYERS[state.current.layer]
  }

  function pushG(html: string) {
    state.current.gline++
    gLines.current.push(html)
    if (gLines.current.length > G_MAX) gLines.current.shift()
  }

  function renderG() {
    if (gcodeRef.current) {
      gcodeRef.current.innerHTML = gLines.current
        .map((line, i) => {
          const cur = i === gLines.current.length - 1 ? ` ${s.cur}` : ''
          return `<div class="${s.gline}${cur}">${line}</div>`
        })
        .join('')
    }
    setText(gLnRef.current, state.current.gline)
  }

  function gcodeLine(move: Move) {
    if (move.type === 'travel') {
      return `<span class="${s.cmd}">G0</span> <span class="${s.ax}">X${fmt(move.x)} Y${fmt(move.y)}</span> <span class="${s.cmt}">; ${move.note || 'travel'}</span>`
    }
    return `<span class="${s.g1}">G1</span> <span class="${s.ax}">X${fmt(move.x)} Y${fmt(move.y)}</span> <span class="${s.ext}">E${fmt(move.e, 3)}</span>${move.feature ? ` <span class="${s.cmt}">; ${move.feature}</span>` : ''}`
  }

  function emitGForMove(move: Move) {
    pushG(gcodeLine(move))
  }

  function emitHeader() {
    pushG(`<span class="${s.cmt}">; cartridge_press_jig.gcode · cartridge_press_insert_jig · PETG-CF</span>`)
    pushG(`<span class="${s.mc}">M104 S215</span> <span class="${s.cmt}">; 노즐 가열 215°C</span>`)
    pushG(`<span class="${s.mc}">M140 S60</span> <span class="${s.cmt}">; 베드 가열 60°C</span>`)
    pushG(`<span class="${s.cmd}">G28</span> <span class="${s.cmt}">; home all axes</span>`)
    pushG(`<span class="${s.cmd}">G29</span> <span class="${s.cmt}">; auto bed leveling</span>`)
    pushG(`<span class="${s.mc}">M109 S215</span> <span class="${s.cmt}">; 노즐 온도 대기</span>`)
    pushG(`<span class="${s.cmd}">G92</span> <span class="${s.ext}">E0</span> <span class="${s.cmt}">; reset extruder</span>`)
  }

  function solidifyCareer(uptoLayer: number) {
    const order = [3, 2, 1, 0]
    order.forEach((ci, k) => {
      if (!careerSolid.current[ci] && uptoLayer >= CAREER_REVEAL[k]) {
        careerSolid.current[ci] = true
        careerRefs.current[ci]?.classList.add(s.solid)
      }
    })
  }

  function solidifyMetrics(progress: number) {
    METRICS.forEach((m, i) => {
      if (!metricSolid.current[i] && progress >= (((i + 1) / METRICS.length) * 0.92)) {
        metricSolid.current[i] = true
        metricRefs.current[i]?.classList.add(s.solid)
        if (metricBarRefs.current[i]) metricBarRefs.current[i]!.style.width = `${m.w}%`
      }
    })
  }

  function solidifySkills(progress: number) {
    const target = Math.floor(progress * SKILLS.length)
    let loaded = 0
    SKILLS.forEach((_, i) => {
      if (!skillSolid.current[i] && i < target) {
        skillSolid.current[i] = true
        skillRefs.current[i]?.classList.add(s.solid)
      }
      if (skillSolid.current[i]) loaded++
    })
    setText(matMetaRef.current, `로드된 스풀 ${loaded} / ${SKILLS.length}`)
  }

  function maybeShowDefect() {
    if (!defectShown.current && state.current.layer >= 42) {
      defectShown.current = true
      scrollIntoNearestScrollable(defectRef.current)
    }
  }

  function finish(now: number) {
    const st = state.current
    if (st.done) return
    st.done = true
    st.running = false
    st.doneAt = now
    pushG(`<span class="${s.mc}">M104 S0</span> <span class="${s.cmt}">; 노즐 히터 OFF</span>`)
    pushG(`<span class="${s.mc}">M140 S0</span> <span class="${s.cmt}">; 베드 히터 OFF</span>`)
    pushG(`<span class="${s.mc}">M84</span> <span class="${s.cmt}">; 스텝모터 정지 · build logged</span>`)
    careerSolid.current = careerSolid.current.map(() => true)
    careerRefs.current.forEach((el) => el?.classList.add(s.solid))
    solidifyMetrics(1)
    solidifySkills(1)
    completeRef.current?.classList.add(s.done)
    statetagRef.current?.classList.add(s.done)
    setText(statetxtRef.current, 'BUILD LOGGED — cartridge_press_jig.gcode')
    setText(etaRef.current, '빌드 기록 완료 · 100%')
  }

  function onLayerComplete(now: number) {
    const z = (state.current.layer + 1) * LAYER_H
    pushG(`<span class="${s.mc}">G0</span> <span class="${s.ax}">Z${fmt(z, 2)}</span> <span class="${s.cmt}">; layer ${state.current.layer + 1} → lift</span>`)
    state.current.layer++
    state.current.moveIdx = 0
    state.current.prevPos = null
    state.current.segT = 0
    if (state.current.layer >= TOTAL_LAYERS) {
      finish(now)
      return
    }
    solidifyCareer(state.current.layer)
    const progress = state.current.layer / TOTAL_LAYERS
    solidifyMetrics(progress)
    solidifySkills(progress)
    maybeShowDefect()
  }

  function addDeposit(a: Pos, b: Pos, z: number, layer: number, infill?: boolean) {
    deposited.current.push({ a, b, z, layer, infill })
  }

  function advance(dt: number, now: number) {
    const st = state.current
    if (!st.running || st.done) return
    if (st.temp < T_TARGET) {
      st.temp = Math.min(T_TARGET, st.temp + dt * 220)
      st.bed = Math.min(60, st.bed + dt * 70)
      return
    }

    const layer = currentLayer()
    if (!layer) {
      finish(now)
      return
    }
    const moves = layer.moves
    const SIM_RATE = 15
    let budget = dt * 1000 * SIM_RATE
    let safety = 0
    while (budget > 0 && !st.done && safety++ < 4000) {
      const move = moves[st.moveIdx]
      if (!move) {
        onLayerComplete(now)
        if (st.done) break
        continue
      }
      if (!st.prevPos) {
        st.prevPos = { x: move.x, y: move.y, z: move.z }
        st.nozzle = { x: move.x, y: move.y, z: move.z }
        emitGForMove(move)
        st.moveIdx++
        movesDone.current++
        continue
      }
      const a = st.prevPos
      const b = move
      const dist = Math.hypot(b.x - a.x, b.y - a.y) + Math.abs(b.z - a.z) * 4
      const isTravel = move.type === 'travel'
      const speed = isTravel ? 520 : 200
      const segMs = Math.max(0.0001, (dist / speed) * 1000)
      const step = budget / segMs
      st.segT += step
      budget -= segMs * step

      if (st.segT >= 1) {
        st.segT = 0
        st.nozzle = { x: b.x, y: b.y, z: b.z }
        if (move.type === 'extrude') {
          addDeposit({ x: a.x, y: a.y, z: a.z }, { x: b.x, y: b.y, z: b.z }, b.z, st.layer, move.infill)
          st.eTotal = move.e + st.layer * 100
        }
        emitGForMove(move)
        st.prevPos = { x: b.x, y: b.y, z: b.z }
        st.moveIdx++
        movesDone.current++
      } else {
        st.nozzle = {
          x: a.x + (b.x - a.x) * st.segT,
          y: a.y + (b.y - a.y) * st.segT,
          z: a.z + (b.z - a.z) * st.segT,
        }
        break
      }
    }
  }

  function updateTempGraph() {
    tempTick.current++
    if (tempTick.current % 2 === 0) {
      const wob =
        state.current.temp >= T_TARGET
          ? Math.sin(tempTick.current * 0.3) * 1.6 + Math.sin(tempTick.current * 0.11) * 0.6
          : 0
      tHist.current.push(state.current.temp + wob)
      if (tHist.current.length > 60) tHist.current.shift()
    }

    const w = 178
    const h = 34
    const ty = h - (T_TARGET / 240) * h
    tempTargetRef.current?.setAttribute('y1', String(ty))
    tempTargetRef.current?.setAttribute('y2', String(ty))
    if (tHist.current.length <= 1) {
      tempPathRef.current?.setAttribute('d', '')
      tempAreaRef.current?.setAttribute('d', '')
      return
    }

    let d = ''
    for (let i = 0; i < tHist.current.length; i++) {
      const x = (i / (tHist.current.length - 1)) * w
      const y = h - (tHist.current[i] / 240) * h
      d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `
    }
    tempPathRef.current?.setAttribute('d', d.trim())
    tempAreaRef.current?.setAttribute('d', `${d}L${w} ${h} L0 ${h} Z`)
  }

  function updateHUD() {
    const st = state.current
    const n = st.nozzle
    setText(xRef.current, fmt(n.x))
    setText(yRef.current, fmt(n.y))
    setText(eRef.current, fmt(st.eTotal % 1000, 2))
    setText(layerRef.current, Math.min(st.layer + (st.done ? 0 : 1), TOTAL_LAYERS))
    setText(zRef.current, fmt((st.layer + (st.done ? 0 : 1)) * LAYER_H, 2))

    const progress = st.done ? 1 : movesDone.current / st.totalMoves
    const pct = Math.round(progress * 100)
    setText(pctRef.current, `${pct}%`)
    if (fillRef.current) fillRef.current.style.width = `${pct}%`
    if (!st.done) {
      const remain = Math.max(0, Math.round((1 - progress) * 42))
      setText(etaRef.current, `남은 시간 ≈ ${remain}분 · ${movesDone.current}/${st.totalMoves} moves`)
    }

    const tn = Math.round(st.temp)
    const tb = Math.round(st.bed)
    setText(tNozRef.current, `${tn}°C`)
    setText(tBedRef.current, `${tb}°C`)
    setText(tempRef.current, `${tn}°C`)
    renderG()
    updateTempGraph()
  }

  function drawMain(g: CanvasRenderingContext2D, W: number, H: number) {
    const st = state.current
    const cam = setupCam(W, H)
    g.clearRect(0, 0, W, H)
    drawPlate(g, cam)

    const curZ = st.layer * LAYER_H
    for (const d of deposited.current) {
      const [x0, y0] = project(cam, d.a.x, d.a.y, d.z)
      const [x1, y1] = project(cam, d.b.x, d.b.y, d.z)
      const age = curZ - d.z
      const warm = Math.max(0, 1 - age / 2.2)
      const baseW = d.infill ? 1.1 : 2.0
      if (warm > 0.15) {
        g.strokeStyle = `rgba(255,150,60,${0.18 * warm})`
        g.lineWidth = (baseW + 3) * cam.scale * 0.06 + baseW + 2
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(x0, y0)
        g.lineTo(x1, y1)
        g.stroke()
      }
      const r = 255
      const gg = Math.round(122 - age * 16 + warm * 60)
      const b = Math.round(24 + warm * 90)
      g.strokeStyle = d.infill
        ? `rgba(255,150,70,${0.3 + 0.4 * warm})`
        : `rgb(${r},${Math.max(70, gg)},${Math.max(10, b)})`
      g.lineWidth = baseW + warm * 1.2
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.beginPath()
      g.moveTo(x0, y0)
      g.lineTo(x1, y1)
      g.stroke()
    }

    drawFixtureAnnotations(g, cam, st.layer)

    if (st.prevPos && !st.done) {
      const a = st.prevPos
      const n = st.nozzle
      const move = currentLayer()?.moves[st.moveIdx] ?? null
      if (move && move.type === 'extrude') {
        const [x0, y0] = project(cam, a.x, a.y, n.z)
        const [x1, y1] = project(cam, n.x, n.y, n.z)
        g.strokeStyle = FIL_HOT
        g.lineWidth = 2.6
        g.lineCap = 'round'
        g.shadowColor = 'rgba(255,180,90,.9)'
        g.shadowBlur = 10
        g.beginPath()
        g.moveTo(x0, y0)
        g.lineTo(x1, y1)
        g.stroke()
        g.shadowBlur = 0
      }
    }

    drawNozzle(g, cam, W, st)
    updateHUD()
  }

  function onDefectFixed() {
    defectRef.current?.classList.add(s.fixed)
    setText(defectLabelRef.current, 'PARAMETER NOTE · 비드 흐름 안정')
    setText(defectTagRef.current, 'layer 042')
    if (defectTextRef.current) {
      defectTextRef.current.innerHTML =
        '<b>기록:</b> 코너 감속, 외벽 우선, 리트랙션 거리 조정. 카트리지 누름면 외곽 비드가 끊기지 않도록 출력 조건을 보정.'
    }
    setText(reprintBtnRef.current, 'PARAMETER NOTE APPLIED')
  }

  function startReprint() {
    const da = defectAnim.current
    if (da.fixing || da.fixed) return
    da.fixing = true
    da.fixStart = da.t
    setText(defectLabelRef.current, 'PARAMETER NOTE · 재슬라이싱 반영 중')
    setText(reprintBtnRef.current, '… 코너 감속 / 외벽 우선 반영 중')
  }

  function drawDefect() {
    const svg = defectSvgRef.current
    if (!svg) return
    const da = defectAnim.current
    const w = 480
    const h = 46
    da.t += 0.03
    const rows = 4
    const cols = 18
    const parts = [
      '<defs><radialGradient id="gcodePrinterSweep" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="rgba(255,180,90,.7)"/><stop offset="1" stop-color="rgba(255,180,90,0)"/></radialGradient></defs>',
    ]
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ((c + 0.5) / cols) * w
        const y = ((r + 0.5) / rows) * h
        let bad = false
        if (!da.fixed) bad = (r === 1 && c > 4 && c < 9) || (r === 2 && c > 5 && c < 8) || (r === 0 && c === 12)
        if (da.fixing) {
          const sweep = (da.t - da.fixStart) / 1.2
          if (c / cols < sweep) bad = false
        }
        const good = !bad
        const fill = good ? 'rgba(255,122,24,.9)' : 'rgba(255,77,77,.95)'
        if (c > 0) {
          const px = ((c - 0.5) / cols) * w
          const stroke = good ? 'rgba(255,122,24,.5)' : 'rgba(255,77,77,.5)'
          parts.push(`<line x1="${px.toFixed(2)}" y1="${y.toFixed(2)}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${stroke}" stroke-width="${good ? 2 : 2.4}"/>`)
        }
        parts.push(
          `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${good ? 2.6 : 3.4}" fill="${fill}"${good ? '' : ' style="filter:drop-shadow(0 0 6px rgba(255,77,77,.9))"'}/>`
        )
      }
    }
    if (da.fixing) {
      const sweep = (da.t - da.fixStart) / 1.2
      if (sweep < 1.05) {
        const sx = sweep * w
        parts.push(`<line x1="${sx.toFixed(2)}" y1="0" x2="${sx.toFixed(2)}" y2="${h}" stroke="rgba(255,217,168,.9)" stroke-width="2"/>`)
        parts.push(`<circle cx="${sx.toFixed(2)}" cy="${h / 2}" r="14" fill="url(#gcodePrinterSweep)"/>`)
      } else {
        da.fixing = false
        da.fixed = true
        onDefectFixed()
      }
    }
    svg.innerHTML = parts.join('')
  }

  function resetSimulation() {
    deposited.current = []
    gLines.current = []
    tHist.current = []
    state.current = createInitialState()
    movesDone.current = 0
    careerSolid.current = [false, false, false, false]
    metricSolid.current = METRICS.map(() => false)
    skillSolid.current = SKILLS.map(() => false)
    defectShown.current = false
    defectAnim.current = { t: 0, fixing: false, fixed: false, fixStart: 0 }
    tempTick.current = 0

    careerRefs.current.forEach((el) => el?.classList.remove(s.solid))
    metricRefs.current.forEach((el) => el?.classList.remove(s.solid))
    metricBarRefs.current.forEach((el) => {
      if (el) el.style.width = '0'
    })
    skillRefs.current.forEach((el) => el?.classList.remove(s.solid))
    completeRef.current?.classList.remove(s.done)
    statetagRef.current?.classList.remove(s.done)
    defectRef.current?.classList.remove(s.fixed)
    setText(statetxtRef.current, 'PRINTING — cartridge_press_jig.gcode')
    setText(defectLabelRef.current, 'PROCESS NOTE · 코너 비드 관찰')
    setText(defectTagRef.current, 'layer 042')
    if (defectTextRef.current) {
      defectTextRef.current.innerHTML =
        '<b>공정 메모:</b> layer 042 카트리지 누름면 코너에서 비드 끊김 경향 확인. 코너 감속과 외벽 순서를 조정해 재슬라이싱.'
    }
    setText(reprintBtnRef.current, '▶ APPLY PARAMETER NOTE — 코너 감속 / 외벽 우선')
    setText(matMetaRef.current, `로드된 스풀 0 / ${SKILLS.length}`)
    emitHeader()
    renderG()
  }



  return { advance, drawMain, drawDefect, resetSimulation, startReprint }
}
