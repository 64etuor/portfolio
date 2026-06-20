'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import type { Frame, SceneProps } from '../_host/types'
import {
  BG_EVENTS,
  COMPANY,
  HOME,
  INITIAL_IOST,
  IO_MAP,
  PLC_SEQ,
  PROGRAM,
  SKILLS,
  WAYPOINTS,
  WP_IO,
} from './data'
import type { IoKey } from './data'
import s from './scene.module.css'

type Mode = 'AUTO_PAUSED' | 'PLAY' | 'PAUSED' | 'FAULT'

interface RuntimeState {
  selected: number
  running: number
  mode: Mode
  estop: boolean
  servo: boolean
  coord: string
  ovr: number
  keyMode: string
  soft: string
  cycle: number
  jntCur: number[]
  jntTgt: number[]
  jogOff: { x: number; y: number; z: number }
  weldFx: number
  weldDone: boolean
  autoPlay: boolean
  dwellLeft: number
  arrived: boolean
}

interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

interface Runtime {
  root: HTMLDivElement
  progScroll: HTMLDivElement
  detail: HTMLDivElement
  toastEl: HTMLDivElement
  harnessOv: HTMLDivElement
  state: RuntimeState
  iost: Record<IoKey, number>
  timers: number[]
  intervals: number[]
  toastT: number | null
  reTeachActive: boolean
  reTeachPct: number
  reTeachNext: number
  plcActStep: number
  bgEvIdx: number
  bgEvNext: number
  sparkParts: Spark[]
}

interface Point {
  x: number
  y: number
}

const LOG_MAX = 4

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

function byRef<T extends HTMLElement = HTMLElement>(rt: Runtime, name: string) {
  return rt.root.querySelector<T>(`[data-ref="${name}"]`)
}

function needRef<T extends HTMLElement = HTMLElement>(root: HTMLDivElement, name: string) {
  const el = root.querySelector<T>(`[data-ref="${name}"]`)
  if (!el) throw new Error(`robot-pendant missing data-ref="${name}"`)
  return el
}

function all<T extends Element = HTMLElement>(rt: Runtime, selector: string) {
  return Array.from(rt.root.querySelectorAll<T>(selector))
}

function setText(rt: Runtime, name: string, value: string) {
  const el = byRef(rt, name)
  if (el) el.textContent = value
}

function createRuntime(root: HTMLDivElement): Runtime {
  return {
    root,
    progScroll: needRef<HTMLDivElement>(root, 'progScroll'),
    detail: needRef<HTMLDivElement>(root, 'detail'),
    toastEl: needRef<HTMLDivElement>(root, 'toast'),
    harnessOv: needRef<HTMLDivElement>(root, 'harnessOv'),
    state: {
      selected: 0,
      running: 0,
      mode: 'AUTO_PAUSED',
      estop: false,
      servo: true,
      coord: 'WORLD',
      ovr: 100,
      keyMode: 'T1',
      soft: 'SELECT',
      cycle: 124,
      jntCur: [...HOME],
      jntTgt: [...WAYPOINTS[0].pose],
      jogOff: { x: 0, y: 0, z: 0 },
      weldFx: 0,
      weldDone: false,
      autoPlay: false,
      dwellLeft: 0,
      arrived: false,
    },
    iost: { ...INITIAL_IOST },
    timers: [],
    intervals: [],
    toastT: null,
    reTeachActive: false,
    reTeachPct: 0,
    reTeachNext: 0,
    plcActStep: 0,
    bgEvIdx: 0,
    bgEvNext: 1800,
    sparkParts: [],
  }
}

function scrollLocal(el: Element | null) {
  if (!el) return
  let p = el.parentElement
  while (p) {
    const oy = window.getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
      const er = el.getBoundingClientRect()
      const pr = p.getBoundingClientRect()
      if (er.top < pr.top) p.scrollTop -= pr.top - er.top
      else if (er.bottom > pr.bottom) p.scrollTop += er.bottom - pr.bottom
      return
    }
    p = p.parentElement
  }
}

function ioGridHtml(rt: Runtime) {
  return IO_MAP.map((io) => {
    const on = !!rt.iost[io.k]
    return (
      `<div class="iocell${on ? ' on' : ''}${io.r ? ' r' : ''}" data-io="${io.k}">` +
      `<span class="iolamp"></span><span class="iotag">${io.id}</span>` +
      `<span class="io-label">${io.lab}</span>` +
      `<span class="iov">${on ? 'ON' : 'OFF'}</span></div>`
    )
  }).join('')
}

function refreshIO(rt: Runtime) {
  all<HTMLElement>(rt, '.iocell').forEach((el) => {
    const key = el.dataset.io as IoKey | undefined
    if (!key) return
    const on = !!rt.iost[key]
    el.classList.toggle('on', on)
    const v = el.querySelector<HTMLElement>('.iov')
    if (v) v.textContent = on ? 'ON' : 'OFF'
  })
}

function plcRowsHtml(rt: Runtime) {
  return PLC_SEQ.map(
    (p, i) =>
      `<div class="plcrow${i === rt.plcActStep ? ' act' : ''}" data-step="${i}">` +
      `<span class="stp">S${p.s}</span><span class="cond">${p.c}</span><span class="out">${p.o}</span></div>`
  ).join('')
}

function setPlcStep(rt: Runtime, i: number) {
  rt.plcActStep = ((i % PLC_SEQ.length) + PLC_SEQ.length) % PLC_SEQ.length
  all<HTMLElement>(rt, '.plcrow').forEach((row) => {
    const act = Number(row.dataset.step) === rt.plcActStep
    row.classList.toggle('act', act)
    if (act) scrollLocal(row)
  })
}

function applyWaypointIO(rt: Runtime, i: number) {
  const m = WP_IO[i]
  if (!m) return
  Object.assign(rt.iost, m.set)
  refreshIO(rt)
  setPlcStep(rt, m.plc)
}

function buildProgram(rt: Runtime) {
  rt.progScroll.innerHTML = ''
  let ln = 0
  PROGRAM.forEach((row) => {
    const line = document.createElement('div')
    const isMove = row.t === 'mv'
    let cls = 'pline'
    if (isMove) cls += ` ${COMPANY[WAYPOINTS[row.wp].co].cls}`
    line.className = cls

    let lnLabel = ''
    if (row.t !== 'hdr') {
      ln += 1
      lnLabel = `${String(ln).padStart(3, '0')}:`
    }

    const codeArr = isMove ? WAYPOINTS[row.wp].code : row.code
    const codeHtml = codeArr.map((c) => `<span class="${c[0]}">${c[1] ?? ''}</span>`).join('')
    line.innerHTML =
      `<span class="ln">${lnLabel}</span>` +
      `<span class="code">${codeHtml}${isMove ? '<span class="cursor"></span>' : ''}</span>`

    if (isMove) {
      line.dataset.idx = String(row.wp)
      line.addEventListener('click', () => selectLine(rt, row.wp, true))
    } else if (row.t === 'hdr' || row.t === 'cm') {
      line.style.cursor = 'default'
    }
    rt.progScroll.appendChild(line)
  })

  const reg = document.createElement('div')
  reg.className = 'pline reg-line'
  reg.innerHTML = `<span class="ln"></span><span class="code"><span class="cm">; TOOL/REG — ${SKILLS.length} SKILLS · UT[1..3] · UF[1] · ${WAYPOINTS.length} PR[ ]</span></span>`
  rt.progScroll.appendChild(reg)
}

function selectLine(rt: Runtime, i: number, fromUser: boolean) {
  rt.state.selected = i
  const wp = WAYPOINTS[i]
  if (!wp) return

  all<HTMLElement>(rt, '.pline').forEach((p) => p.classList.remove('sel'))
  const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${i}"]`)
  if (el) {
    el.classList.add('sel')
    scrollLocal(el)
  }

  const c = COMPANY[wp.co]
  const f1 = (v: number) => `${v >= 0 ? ' ' : ''}${v.toFixed(1)}`
  const worldCells =
    `<div class="poscell j1"><div class="ax">X mm</div><div class="v" data-live="dw-x">${f1(wp.world[0])}</div></div>` +
    `<div class="poscell j2"><div class="ax">Y mm</div><div class="v" data-live="dw-y">${f1(wp.world[1])}</div></div>` +
    `<div class="poscell j3"><div class="ax">Z mm</div><div class="v" data-live="dw-z">${f1(wp.world[2])}</div></div>` +
    `<div class="poscell j4"><div class="ax">W °</div><div class="v" data-live="dw-w">${f1(wp.world[3])}</div></div>` +
    `<div class="poscell j5"><div class="ax">P °</div><div class="v" data-live="dw-p">${f1(wp.world[4])}</div></div>` +
    `<div class="poscell j6"><div class="ax">R °</div><div class="v" data-live="dw-r">${f1(wp.world[5])}</div></div>`
  const jointCells = wp.joint
    .map(
      (v, k) =>
        `<div class="poscell j${k + 1}"><div class="ax">J${k + 1} °</div><div class="v" data-live="dj-${k}">${f1(v)}</div></div>`
    )
    .join('')

  let weldCard = ''
  if (wp.weld) {
    const wd = wp.weld
    weldCard =
      `<div class="tpcard"><div class="tph">WELD SCHEDULE <span class="chk">[확인필요 · 예시값]</span></div>` +
      `<div class="wsg">` +
      `<div class="wscell"><span class="k">가압력</span><span class="v">${wd.force.toFixed(2)}<small> kN</small></span></div>` +
      `<div class="wscell"><span class="k">전류</span><span class="v">${wd.cur.toFixed(1)}<small> kA</small></span></div>` +
      `<div class="wscell"><span class="k">통전</span><span class="v">${wd.on}<small> cyc</small></span></div>` +
      `<div class="wscell"><span class="k">홀드</span><span class="v">${wd.hold}<small> cyc</small></span></div>` +
      `</div></div>`
  }

  const toolMatch = wp.tool.match(/UT:(\d)/)
  rt.detail.innerHTML =
    `<div class="dtag"><span><span class="dot" style="background:${c.color};box-shadow:0 0 8px ${c.color}"></span>P[${wp.id}] WAYPOINT · ${wp.tool}</span><span>${wp.speed}% ${wp.motn}</span></div>` +
    `<div class="role">${wp.role}</div>` +
    `<h3>${wp.company}</h3>` +
    `<div class="period">UF:1 · UT:${toolMatch ? toolMatch[1] : '1'} · GP1 · ${wp.period}</div>` +
    `<div class="desc">${wp.desc}</div>` +
    `<div class="tpstack">` +
    `<div class="tpcard"><div class="tph">CURRENT POS · WORLD <b>UF:1</b></div><div class="posg">${worldCells}</div></div>` +
    `<div class="tpcard"><div class="tph">JOINT · J1~J6 <b>UT:1</b></div><div class="posg">${jointCells}</div></div>` +
    weldCard +
    `<div class="tpcard"><div class="tph">I/O 상태 · DI/DO</div><div class="iog">${ioGridHtml(rt)}</div></div>` +
    `<div class="tpcard"><div class="tph">PLC 시퀀스 · 취출/단축 <span class="chk">STEP/조건/출력</span></div><div class="plcwrap"><div class="plcscroll">${plcRowsHtml(rt)}</div></div></div>` +
    `</div>` +
    `<div class="regs">${wp.regs
      .filter((r) => r[0])
      .map((r) => `<span class="reg">${r[0]}${r[1] ? ` <b>${r[1]}</b>` : ''}</span>`)
      .join('')}</div>`

  setText(rt, 'mi-cur', `P[${wp.id}]`)
  setText(rt, 'lt-line', String(i + 1).padStart(4, '0'))
  setText(rt, 'st-tool', wp.tool)
  setText(rt, 'st-spd', `${wp.speed}%`)
  setText(rt, 'st-motn', wp.motn)
  setText(rt, 'st-msg', `${wp.period} · ${wp.company}`)
  setText(rt, 'vp-pt', `▸ AT P[${wp.id}]`)
  if (!rt.state.estop) rt.state.jntTgt = [...wp.pose]
  if (fromUser) toast(rt, `P[${wp.id}] SELECTED · ${wp.company}`)
}

function setRunLine(rt: Runtime, i: number) {
  all<HTMLElement>(rt, '.pline').forEach((p) => p.classList.remove('run'))
  WAYPOINTS.forEach((_, idx) => {
    const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${idx}"]`)
    if (!el) return
    el.classList.toggle('done', idx < i && rt.state.mode === 'PLAY')
    if (idx === i) el.classList.add('run')
  })
}

function gotoLine(rt: Runtime, i: number) {
  let next = i
  if (next < 0) next = 0
  if (next >= WAYPOINTS.length) next = WAYPOINTS.length - 1
  rt.state.running = next
  rt.state.arrived = false
  rt.state.dwellLeft = 0
  setRunLine(rt, next)
  selectLine(rt, next, false)
  applyWaypointIO(rt, next)
  setText(rt, 'mi-cur', `P[${WAYPOINTS[next].id}]`)
  if (WAYPOINTS[next].weld && !rt.state.weldDone) startWeldReteach(rt)
}

function tickAutoPlay(rt: Runtime, dt: number) {
  const st = rt.state
  if (!st.autoPlay || st.mode !== 'PLAY' || st.estop) return
  const wp = WAYPOINTS[st.running]
  let err = 0
  for (let i = 0; i < 6; i += 1) err += Math.abs(st.jntCur[i] - st.jntTgt[i])

  if (!st.arrived && err < 1.2) {
    st.arrived = true
    st.dwellLeft = 520 + (wp.motn === 'FINE' ? 280 : 80)
    pushLog(rt, `P[${wp.id}] REACHED · ${wp.company} · ${wp.motn}`)
    if (wp.motn === 'FINE') pushLog(rt, `FINE STOP: P[${wp.id}] 위치 확정 · DO[${wp.id}] CHK`)
    else pushLog(rt, `CNT BLEND: P[${wp.id}] 통과 — 감속 없음`)
  }

  if (!st.arrived) return
  st.dwellLeft -= dt
  if (st.dwellLeft > 0) return

  if (st.running >= WAYPOINTS.length - 1) {
    st.cycle += 1
    setText(rt, 'mi-cyc', String(st.cycle).padStart(6, '0'))
    toast(rt, 'CYCLE COMPLETE · P[1]→P[10] 1주기 완료 · 재순환')
    pushLog(rt, `CYCLE #${st.cycle} COMPLETE · P[1] 재순환`, 'ev-reach')
    WAYPOINTS.forEach((_, idx) => {
      const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${idx}"]`)
      if (el) el.classList.remove('done')
    })
    st.weldDone = false
    setMode(rt, 'PLAY')
    pushLog(rt, `MOVE → P[${WAYPOINTS[0].id}] ${WAYPOINTS[0].code[0][1]}${WAYPOINTS[0].code[2][1]}`)
    gotoLine(rt, 0)
  } else {
    const next = st.running + 1
    pushLog(rt, `MOVE → P[${WAYPOINTS[next].id}] ${WAYPOINTS[next].code[0][1]}${WAYPOINTS[next].code[2][1]}`)
    gotoLine(rt, next)
  }
}

function play(rt: Runtime) {
  const st = rt.state
  if (st.estop) {
    toast(rt, 'E-STOP 해제 필요', true)
    return
  }
  setMode(rt, 'PLAY')
  if (st.running >= WAYPOINTS.length - 1) st.running = -1
  const next = Math.max(0, st.running + 1)
  pushLog(rt, `PROG[SPOT_WLD] START · P[${WAYPOINTS[next].id}] 이동`)
  gotoLine(rt, next)
  st.autoPlay = true
}

function pause(rt: Runtime) {
  setMode(rt, 'PAUSED')
  rt.state.autoPlay = false
  pushLog(rt, 'HOLD — 피드 홀드')
}

function stepFwd(rt: Runtime) {
  pause(rt)
  const next = Math.min(rt.state.running + 1, WAYPOINTS.length - 1)
  gotoLine(rt, next)
  toast(rt, `STEP → P[${WAYPOINTS[next].id}]`)
  pushLog(rt, `STEP FWD → P[${WAYPOINTS[next].id}]`)
}

function rewind(rt: Runtime) {
  pause(rt)
  WAYPOINTS.forEach((_, idx) => {
    const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${idx}"]`)
    if (el) el.classList.remove('done')
  })
  gotoLine(rt, 0)
  toast(rt, 'REWIND → P[1]')
  pushLog(rt, 'REWIND — P[1] 복귀')
}

function setMode(rt: Runtime, mode: Exclude<Mode, 'AUTO_PAUSED'>) {
  rt.state.mode = mode
  byRef(rt, 'l-run')?.classList.toggle('on', mode === 'PLAY')
  byRef(rt, 'l-pause')?.classList.toggle('on', mode === 'PAUSED')
  const fault = byRef(rt, 'l-fault')
  fault?.classList.toggle('on', mode === 'FAULT')
  fault?.classList.toggle('blink', mode === 'FAULT')
  rt.root.querySelector<HTMLElement>('.fk.play')?.classList.toggle('active', mode === 'PLAY')

  const lt = byRef(rt, 'lt-state')
  if (!lt) return
  if (mode === 'PLAY') {
    lt.textContent = '▶ RUNNING'
    lt.style.color = '#3ce67a'
  } else if (mode === 'PAUSED') {
    lt.textContent = '⏸ HELD'
    lt.style.color = 'var(--amber)'
  } else {
    lt.textContent = '✖ FAULT'
    lt.style.color = 'var(--red)'
  }
}

function startWeldReteach(rt: Runtime) {
  rt.state.weldFx = 1
  rt.reTeachActive = true
  rt.reTeachPct = 15
  rt.reTeachNext = 320
  setText(rt, 'st-msg', 'P[2] 용접점 편차 검출 — 재교시 실행 중')
  toast(rt, '! 용접점 위치 편차 — 재교시(RE-TEACH) 실행', true)
  pushLog(rt, '! P[2] 용접점 편차 검출 — RE-TEACH 시작', 'ev-warn')
}

function tickReteach(rt: Runtime, dt: number) {
  if (!rt.reTeachActive) return
  rt.reTeachNext -= dt
  if (rt.reTeachNext > 0) return
  rt.reTeachNext += 320
  rt.reTeachPct -= 3
  if (rt.reTeachPct <= 0) {
    rt.reTeachPct = 0
    rt.reTeachActive = false
    rt.state.weldFx = 0
    rt.state.weldDone = true
    setText(rt, 'st-msg', 'RE-TEACH 완료 · 용접점 위치 수렴 OK')
    toast(rt, 'P[2] 재교시 완료 — 용접점 정상 등록')
    pushLog(rt, 'RE-TEACH DONE · 위치편차 0.00mm · 가압 OK', 'ev-reach')
  } else {
    const msg = `용접점 위치 교정 중… 편차 ${(rt.reTeachPct / 100).toFixed(2)}mm`
    setText(rt, 'st-msg', msg)
    pushLog(rt, `P[2] 위치 보정 ${(rt.reTeachPct / 100).toFixed(2)}mm 수렴 중`, 'ev-warn')
  }
}

function jog(rt: Runtime, dir: string | undefined) {
  const st = rt.state
  if (!dir) return
  if (st.estop) {
    toast(rt, 'E-STOP 상태 · JOG 불가', true)
    return
  }
  if (!st.servo) {
    toast(rt, 'SERVO OFF · JOG 불가', true)
    return
  }
  const stepDeg = 4 * (st.ovr / 100)
  const j = st.jntTgt
  switch (dir) {
    case 'X+':
      j[0] += stepDeg
      st.jogOff.x += 8
      break
    case 'X-':
      j[0] -= stepDeg
      st.jogOff.x -= 8
      break
    case 'Y+':
      j[1] += stepDeg
      st.jogOff.y += 8
      break
    case 'Y-':
      j[1] -= stepDeg
      st.jogOff.y -= 8
      break
    case 'Z+':
      j[2] += stepDeg
      st.jogOff.z += 8
      break
    case 'Z-':
      j[2] -= stepDeg
      st.jogOff.z -= 8
      break
  }
  j[0] = clamp(j[0], -120, 120)
  j[1] = clamp(j[1], -20, 90)
  j[2] = clamp(j[2], -120, 40)
  setText(rt, 'vp-st', `JOG ${dir} · ${st.coord}`)
}

function pushLog(rt: Runtime, msg: string, cls = 'ev-move') {
  const strip = byRef(rt, 'logStrip')
  if (!strip) return
  const el = document.createElement('div')
  el.className = `log-line ${cls}`
  const now = new Date()
  const ts = `${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`
  el.textContent = `[${ts}]  ${msg}`
  strip.appendChild(el)
  while (strip.children.length > LOG_MAX) strip.removeChild(strip.firstChild as ChildNode)
}

function tickBgEvents(rt: Runtime, dt: number) {
  if (rt.state.estop) return
  rt.bgEvNext -= dt
  if (rt.bgEvNext > 0) return
  const ev = BG_EVENTS[rt.bgEvIdx % BG_EVENTS.length]
  rt.bgEvIdx += 1
  pushLog(rt, ev.t, ev.cls)
  rt.bgEvNext = 1100 + Math.random() * 1400
}

function toast(rt: Runtime, msg: string, warn = false) {
  rt.toastEl.textContent = msg
  rt.toastEl.classList.toggle('warn', warn)
  rt.toastEl.classList.add('show')
  if (rt.toastT !== null) window.clearTimeout(rt.toastT)
  rt.toastT = window.setTimeout(() => rt.toastEl.classList.remove('show'), 2200)
}

function fk(joints: number[], w: number, h: number) {
  const bx = w * 0.5
  const by = h * 0.84
  const lengths = [0, h * 0.3, h * 0.26, h * 0.16, h * 0.1]
  const a = joints.map((d) => (d * Math.PI) / 180)
  let x = bx
  let y = by
  let ang = -Math.PI / 2 + a[0] * 0.18
  const pts: Point[] = [{ x, y }]
  ang = -Math.PI / 2 + a[1] * 0.9
  x += Math.cos(ang) * lengths[1]
  y += Math.sin(ang) * lengths[1]
  pts.push({ x, y })
  ang += a[2] * 0.95
  x += Math.cos(ang) * lengths[2]
  y += Math.sin(ang) * lengths[2]
  pts.push({ x, y })
  ang += a[4] * 0.55 + 0.2
  x += Math.cos(ang) * lengths[3]
  y += Math.sin(ang) * lengths[3]
  pts.push({ x, y })
  ang += a[5] * 0.4
  x += Math.cos(ang) * lengths[4]
  y += Math.sin(ang) * lengths[4]
  pts.push({ x, y })
  return { pts, base: { x: bx, y: by }, tcpAng: ang }
}

function drawGrid(g: CanvasRenderingContext2D, rt: Runtime, w: number, h: number) {
  g.save()
  const grad = g.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, '#04100a')
  grad.addColorStop(0.6, '#06140d')
  grad.addColorStop(1, '#020805')
  g.fillStyle = grad
  g.fillRect(0, 0, w, h)

  g.strokeStyle = 'rgba(60,230,122,.10)'
  g.lineWidth = 1
  const hz = h * 0.62
  for (let i = -6; i <= 6; i += 1) {
    const fx = w * 0.5 + i * (w * 0.09)
    g.beginPath()
    g.moveTo(w * 0.5 + i * (w * 0.18), h)
    g.lineTo(fx, hz)
    g.stroke()
  }
  for (let j = 0; j < 7; j += 1) {
    const t = j / 6
    const yy = hz + (h - hz) * t * t
    g.globalAlpha = 0.1 - t * 0.05
    g.beginPath()
    g.moveTo(0, yy)
    g.lineTo(w, yy)
    g.stroke()
  }
  g.globalAlpha = 1

  WAYPOINTS.forEach((wp, i) => {
    const cx = w * (0.08 + i * (0.84 / Math.max(1, WAYPOINTS.length - 1)))
    g.fillStyle = `${COMPANY[wp.co].color}18`
    g.fillRect(cx - 26, h - 30, 52, 8)
    g.fillStyle = COMPANY[wp.co].color
    g.globalAlpha = i === rt.state.running || i === rt.state.selected ? 1 : 0.4
    g.font = '700 9px ui-monospace,monospace'
    g.textAlign = 'center'
    g.fillText(`P${wp.id}`, cx, h - 12)
    g.globalAlpha = 1
  })
  g.restore()
}

function roundLink(g: CanvasRenderingContext2D, p0: Point, p1: Point, w0: number, w1: number, col: string, hi: string) {
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  g.beginPath()
  g.moveTo(p0.x + nx * w0, p0.y + ny * w0)
  g.lineTo(p1.x + nx * w1, p1.y + ny * w1)
  g.lineTo(p1.x - nx * w1, p1.y - ny * w1)
  g.lineTo(p0.x - nx * w0, p0.y - ny * w0)
  g.closePath()
  const grad = g.createLinearGradient(p0.x + nx * w0, p0.y + ny * w0, p0.x - nx * w0, p0.y - ny * w0)
  grad.addColorStop(0, hi)
  grad.addColorStop(0.5, col)
  grad.addColorStop(1, '#0e1512')
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,.55)'
  g.lineWidth = 1.4
  g.stroke()
}

function joint(g: CanvasRenderingContext2D, p: Point, r: number, col: string) {
  g.beginPath()
  g.arc(p.x, p.y, r, 0, 7)
  const grad = g.createRadialGradient(p.x - r * 0.4, p.y - r * 0.4, 1, p.x, p.y, r)
  grad.addColorStop(0, '#3a3d42')
  grad.addColorStop(0.7, '#1c1e21')
  grad.addColorStop(1, '#0d0e10')
  g.fillStyle = grad
  g.fill()
  g.strokeStyle = col
  g.lineWidth = 1.6
  g.stroke()
  g.beginPath()
  g.arc(p.x, p.y, r * 0.4, 0, 7)
  g.fillStyle = `${col}cc`
  g.fill()
}

function roundedRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.lineTo(x + w - r, y)
  g.quadraticCurveTo(x + w, y, x + w, y + r)
  g.lineTo(x + w, y + h - r)
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  g.lineTo(x + r, y + h)
  g.quadraticCurveTo(x, y + h, x, y + h - r)
  g.lineTo(x, y + r)
  g.quadraticCurveTo(x, y, x + r, y)
}

function drawArm(g: CanvasRenderingContext2D, rt: Runtime, dt: number, w: number, h: number) {
  const st = rt.state
  const wp = WAYPOINTS[Math.min(st.selected, WAYPOINTS.length - 1)]
  const accent = st.estop ? '#ff4d52' : st.mode === 'FAULT' ? '#ff4d52' : COMPANY[wp.co].color
  const { pts, base, tcpAng } = fk(st.jntCur, w, h)

  g.save()
  g.globalAlpha = 0.4
  g.fillStyle = '#000'
  g.beginPath()
  g.ellipse(base.x + st.jogOff.x * 0.4, h * 0.85, 60, 9, 0, 0, 7)
  g.fill()
  g.restore()

  g.save()
  g.fillStyle = '#1a1c1f'
  g.beginPath()
  g.moveTo(base.x - 34, h * 0.86)
  g.lineTo(base.x + 34, h * 0.86)
  g.lineTo(base.x + 24, h * 0.72)
  g.lineTo(base.x - 24, h * 0.72)
  g.closePath()
  g.fill()
  g.strokeStyle = '#2a2c2f'
  g.stroke()
  g.beginPath()
  g.ellipse(base.x, h * 0.72, 24, 7, 0, 0, 7)
  g.fillStyle = '#26282b'
  g.fill()
  g.strokeStyle = accent
  g.lineWidth = 2
  g.stroke()
  g.restore()

  roundLink(g, pts[0], pts[1], 14, 12, '#2a2d31', '#3e4248')
  roundLink(g, pts[1], pts[2], 12, 9, '#2a2d31', '#3e4248')
  roundLink(g, pts[2], pts[3], 9, 7, '#23262a', '#34373c')
  roundLink(g, pts[3], pts[4], 7, 5, '#23262a', '#34373c')

  joint(g, pts[0], 15, accent)
  joint(g, pts[1], 12, accent)
  joint(g, pts[2], 9, accent)
  joint(g, pts[3], 7, accent)

  const tcp = pts[4]
  g.save()
  g.translate(tcp.x, tcp.y)
  g.rotate(tcpAng)
  g.fillStyle = '#15171a'
  g.strokeStyle = accent
  g.lineWidth = 1.6
  roundedRect(g, -5, -5, 18, 10, 2)
  g.fill()
  g.stroke()
  g.beginPath()
  g.moveTo(13, -3)
  g.lineTo(22, 0)
  g.lineTo(13, 3)
  g.closePath()
  g.fillStyle = accent
  g.fill()
  g.restore()

  g.save()
  g.strokeStyle = accent
  g.globalAlpha = 0.9
  g.lineWidth = 1
  g.beginPath()
  g.arc(tcp.x, tcp.y, 11, 0, 7)
  g.stroke()
  g.beginPath()
  g.moveTo(tcp.x - 16, tcp.y)
  g.lineTo(tcp.x + 16, tcp.y)
  g.moveTo(tcp.x, tcp.y - 16)
  g.lineTo(tcp.x, tcp.y + 16)
  g.stroke()
  g.restore()

  if (st.weldFx && dt > 0) {
    if (Math.random() < 0.9) {
      for (let k = 0; k < 3; k += 1) {
        rt.sparkParts.push({ x: tcp.x, y: tcp.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 3 - 1, life: 1 })
      }
    }
    g.save()
    const wg = g.createRadialGradient(tcp.x, tcp.y, 0, tcp.x, tcp.y, 26)
    wg.addColorStop(0, 'rgba(255,240,180,.9)')
    wg.addColorStop(0.4, 'rgba(255,180,60,.5)')
    wg.addColorStop(1, 'transparent')
    g.fillStyle = wg
    g.beginPath()
    g.arc(tcp.x, tcp.y, 26, 0, 7)
    g.fill()
    g.restore()
  }

  g.save()
  const dtScale = dt / 16
  rt.sparkParts = rt.sparkParts.filter((p) => p.life > 0)
  rt.sparkParts.forEach((p) => {
    p.x += p.vx * dtScale
    p.y += p.vy * dtScale
    p.vy += 0.25 * dtScale
    p.life -= 0.04 * dtScale
    g.globalAlpha = Math.max(0, p.life)
    g.fillStyle = p.life > 0.6 ? '#fff8e0' : '#ffb43c'
    g.fillRect(p.x, p.y, 2, 2)
  })
  g.restore()
}

function updateDRO(rt: Runtime) {
  const st = rt.state
  const j = st.jntCur
  setText(rt, 'd-x', (j[0] * 8.4 + st.jogOff.x).toFixed(1))
  setText(rt, 'd-y', (520 + j[1] * 6.2 + st.jogOff.y).toFixed(1))
  setText(rt, 'd-z', (880 + j[2] * 5.1 + st.jogOff.z).toFixed(1))
  setText(rt, 'd-w', j[3].toFixed(1))
  setText(rt, 'd-p', j[4].toFixed(1))
  setText(rt, 'd-r', j[5].toFixed(1))

  const wp = WAYPOINTS[st.selected]
  if (!wp) return
  const f1 = (v: number) => `${v >= 0 ? ' ' : ''}${v.toFixed(1)}`
  for (let i = 0; i < 6; i += 1) {
    const el = rt.detail.querySelector<HTMLElement>(`[data-live="dj-${i}"]`)
    if (el) el.textContent = f1(j[i])
  }
  let e = 0
  for (let i = 0; i < 6; i += 1) e += Math.abs(st.jntCur[i] - st.jntTgt[i])
  const errFrac = Math.min(1, e / 40)
  const drift = [errFrac * 9.4, -errFrac * 6.1, errFrac * 7.7, errFrac * 0.6, -errFrac * 0.5, errFrac * 0.7]
  const jogD = [st.jogOff.x, st.jogOff.y, st.jogOff.z, 0, 0, 0]
  ;['dw-x', 'dw-y', 'dw-z', 'dw-w', 'dw-p', 'dw-r'].forEach((id, i) => {
    const el = rt.detail.querySelector<HTMLElement>(`[data-live="${id}"]`)
    if (el) el.textContent = f1(wp.world[i] + (i < 3 ? jogD[i] : 0) + drift[i])
  })
}

function drawRuntime(g: CanvasRenderingContext2D, fr: Frame, rt: Runtime) {
  const w = fr.w
  const h = fr.h
  const dt = Math.min(50, Math.max(0, fr.dt * 1000))
  if (dt > 0) {
    const st = rt.state
    const spd = st.estop ? 0 : 0.1 * (st.ovr / 100) + 0.02
    for (let i = 0; i < 6; i += 1) {
      st.jntCur[i] += (st.jntTgt[i] - st.jntCur[i]) * Math.min(1, spd * (dt / 16))
    }
    tickAutoPlay(rt, dt)
    tickBgEvents(rt, dt)
    tickReteach(rt, dt)
  }
  g.clearRect(0, 0, w, h)
  drawGrid(g, rt, w, h)
  drawArm(g, rt, dt, w, h)
  updateDRO(rt)
}

function press(rt: Runtime, el: HTMLElement) {
  el.classList.add('held')
  rt.timers.push(window.setTimeout(() => el.classList.remove('held'), 120))
}

function syncHarnessLive(rt: Runtime) {
  const st = rt.state
  const ov = `${st.ovr}%`
  setText(rt, 'hx-mode', st.keyMode)
  setText(rt, 'hx-mode2', st.keyMode)
  setText(rt, 'hx-ovr', ov)
  setText(rt, 'hx-ovr2', ov)
  setText(rt, 'hx-frame2', st.coord)
  setText(rt, 'hx-servo2', st.servo ? 'ON' : 'OFF')
}

function syncEnvelopeMeter(rt: Runtime) {
  const on = all(rt, '.hx-pillar.on').length
  const pct = Math.round((on / 5) * 100)
  const fill = byRef(rt, 'hxEnvFill')
  if (fill) fill.style.width = `${pct}%`
  setText(rt, 'hxEnvPct', `${pct}%`)
  setText(rt, 'hxEnvN', String(on))
}

function openHarness(rt: Runtime) {
  syncHarnessLive(rt)
  syncEnvelopeMeter(rt)
  rt.harnessOv.classList.add('show')
}

function closeHarness(rt: Runtime) {
  rt.harnessOv.classList.remove('show')
}

function addListener<K extends keyof HTMLElementEventMap>(
  cleanups: Array<() => void>,
  target: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void
) {
  target.addEventListener(type, handler as EventListener)
  cleanups.push(() => target.removeEventListener(type, handler as EventListener))
}

function wireEvents(rt: Runtime) {
  const cleanups: Array<() => void> = []

  all<HTMLElement>(rt, '.hx-close').forEach((el) => addListener(cleanups, el, 'click', () => closeHarness(rt)))
  all<HTMLElement>(rt, '.hx-pillar').forEach((p) => {
    addListener(cleanups, p, 'click', () => {
      p.classList.toggle('on')
      syncEnvelopeMeter(rt)
      const nm = p.querySelector('.pname')?.childNodes[0]?.textContent?.trim() || ''
      if (p.classList.contains('on')) toast(rt, `기둥 충족 → ${nm}`)
      else toast(rt, `기둥 누락 → ${nm} · 하네스 빈 구멍`, true)
    })
  })

  all<HTMLElement>(rt, '.skey').forEach((k) => {
    addListener(cleanups, k, 'click', () => {
      all<HTMLElement>(rt, '.skey').forEach((x) => x.classList.remove('active'))
      k.classList.add('active')
      rt.state.soft = k.dataset.soft || 'SELECT'
      press(rt, k)
      const msg: Record<string, string> = {
        SELECT: '프로그램 선택 모드 — 라인을 눌러 스킬 상세 보기',
        EDIT: 'EDIT 모드 — 라인 편집 활성',
        DATA: 'DATA 모드 — 레지스터 R[ ] 표시',
        RESET: 'RESET — 알람/FAULT 해제',
        HARNESS: 'SKILL — 스킬 상세 / 티칭 역량 페이지',
      }
      if (rt.state.soft === 'RESET') {
        if (rt.state.mode === 'FAULT') setMode(rt, 'PAUSED')
        toast(rt, 'RESET · 알람 해제')
      } else if (rt.state.soft === 'HARNESS') {
        openHarness(rt)
      } else {
        toast(rt, msg[rt.state.soft])
      }
    })
  })

  all<HTMLElement>(rt, '.fk').forEach((f) => {
    addListener(cleanups, f, 'click', () => {
      press(rt, f)
      const act = f.dataset.act
      if (act === 'play') play(rt)
      else if (act === 'pause') pause(rt)
      else if (act === 'step') stepFwd(rt)
      else if (act === 'rew') rewind(rt)
    })
  })

  all<HTMLElement>(rt, '.jbtn').forEach((b) => {
    let iv: number | null = null
    const go = () => jog(rt, b.dataset.jog)
    const clear = () => {
      b.classList.remove('held')
      if (iv !== null) {
        window.clearInterval(iv)
        iv = null
      }
    }
    addListener(cleanups, b, 'mousedown', () => {
      b.classList.add('held')
      go()
      iv = window.setInterval(go, 90)
      rt.intervals.push(iv)
    })
    addListener(cleanups, b, 'mouseup', clear)
    addListener(cleanups, b, 'mouseleave', clear)
    addListener(cleanups, b, 'click', go)
  })

  all<HTMLElement>(rt, '.csel').forEach((c) => {
    addListener(cleanups, c, 'click', () => {
      all<HTMLElement>(rt, '.csel').forEach((x) => x.classList.remove('on'))
      c.classList.add('on')
      rt.state.coord = c.dataset.coord || 'WORLD'
      setText(rt, 'jog-frame', rt.state.coord)
      setText(rt, 'dro-frame', rt.state.coord)
      setText(rt, 'vp-tl', `VIEW · ${rt.state.coord} FRAME`)
      syncHarnessLive(rt)
      toast(rt, `좌표계 → ${rt.state.coord}`)
    })
  })

  const ovrBar = byRef(rt, 'ovrBar')
  if (ovrBar) {
    addListener(cleanups, ovrBar, 'click', (ev) => {
      const r = ovrBar.getBoundingClientRect()
      let p = Math.round(((ev.clientX - r.left) / r.width) * 100)
      p = clamp(p, 5, 100)
      rt.state.ovr = p
      const fill = byRef(rt, 'ovrFill')
      if (fill) fill.style.width = `${p}%`
      setText(rt, 'ovr-val', `${p}%`)
      setText(rt, 'lt-ovr', 'OVR')
      setText(rt, 'st-spd', `${p}%`)
      syncHarnessLive(rt)
      toast(rt, `SPEED OVERRIDE → ${p}%`)
    })
  }

  all<HTMLElement>(rt, '.mode').forEach((m) => {
    addListener(cleanups, m, 'click', () => {
      all<HTMLElement>(rt, '.mode').forEach((x) => x.classList.remove('on'))
      m.classList.add('on')
      rt.state.keyMode = m.dataset.mode || 'T1'
      const led = byRef(rt, 'l-t1')?.querySelector<HTMLElement>('.led')
      if (led) led.className = `led ${rt.state.keyMode === 'AUTO' ? 'a' : 'c'}`
      setText(rt, 'l-t1-label', rt.state.keyMode)
      setText(rt, 'lcd-mode', rt.state.coord === 'JOINT' ? 'JOINT' : rt.state.keyMode)
      syncHarnessLive(rt)
      toast(rt, `운전 모드 → ${rt.state.keyMode}`)
    })
  })

  const servoSw = byRef(rt, 'servoSw')
  if (servoSw) {
    addListener(cleanups, servoSw, 'click', () => {
      if (rt.state.estop) {
        toast(rt, 'E-STOP 상태 · SERVO ON 불가', true)
        return
      }
      rt.state.servo = !rt.state.servo
      servoSw.classList.toggle('on', rt.state.servo)
      setText(rt, 'servo-label', rt.state.servo ? 'SERVO ON' : 'SERVO OFF')
      byRef(rt, 'l-servo')?.classList.toggle('on', rt.state.servo)
      if (!rt.state.servo) pause(rt)
      syncHarnessLive(rt)
      toast(rt, rt.state.servo ? 'SERVO ON · 서보 투입' : 'SERVO OFF · 서보 차단', !rt.state.servo)
    })
  }

  const estop = byRef(rt, 'estop')
  if (estop) {
    addListener(cleanups, estop, 'click', () => {
      rt.state.estop = !rt.state.estop
      estop.classList.toggle('pressed', rt.state.estop)
      if (rt.state.estop) {
        pause(rt)
        setMode(rt, 'FAULT')
        rt.state.servo = false
        byRef(rt, 'servoSw')?.classList.remove('on')
        setText(rt, 'servo-label', 'SERVO OFF')
        byRef(rt, 'l-servo')?.classList.remove('on')
        byRef(rt, 'faultflash')?.classList.add('on')
        toast(rt, '⛔ EMERGENCY STOP — 비상정지', true)
      } else {
        byRef(rt, 'faultflash')?.classList.remove('on')
        setMode(rt, 'PAUSED')
        toast(rt, 'E-STOP 해제 · RESET 후 SERVO ON 필요')
      }
      syncHarnessLive(rt)
    })
  }

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      if (rt.harnessOv.classList.contains('show')) {
        closeHarness(rt)
        return
      }
    }
    if (ev.key === 'h' || ev.key === 'H') {
      rt.harnessOv.classList.contains('show') ? closeHarness(rt) : openHarness(rt)
      return
    }
    if (ev.key === ' ') {
      ev.preventDefault()
      rt.state.mode === 'PLAY' ? pause(rt) : play(rt)
    } else if (ev.key === 'ArrowRight') stepFwd(rt)
    else if (ev.key === 'ArrowLeft') rewind(rt)
    else if (ev.key >= '1' && ev.key <= '4') selectLine(rt, Number(ev.key) - 1, true)
  }
  window.addEventListener('keydown', onKey)
  cleanups.push(() => window.removeEventListener('keydown', onKey))

  return cleanups
}

function initRuntime(rt: Runtime) {
  buildProgram(rt)
  setText(rt, 'mi-lines', `${WAYPOINTS.length} / ${WAYPOINTS.length}`)
  setText(rt, 'mi-skill', `TOOL[01..${SKILLS.length}]`)
  rt.state.jntCur = [...WAYPOINTS[0].pose]
  rt.state.jntTgt = [...WAYPOINTS[0].pose]
  selectLine(rt, 0, false)
  setRunLine(rt, 0)
  setMode(rt, 'PAUSED')
  const lt = byRef(rt, 'lt-state')
  if (lt) {
    lt.textContent = '⏸ READY · CYCLE 대기'
    lt.style.color = 'var(--amber)'
  }
  setText(rt, 'mi-cyc', String(rt.state.cycle).padStart(6, '0'))
  rt.timers.push(
    window.setTimeout(() => {
      pushLog(rt, 'PROG[SPOT_WLD] LOADED · P[1]~P[4] 교시 완료', 'ev-reach')
      pushLog(rt, 'SERVO ON · 스팟용접 로봇 READY', 'ev-io')
    }, 200)
  )
  rt.timers.push(window.setTimeout(() => play(rt), 800))
}

export default function Scene({ running = true, onReady }: SceneProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Runtime | null>(null)
  const readyFired = useRef(false)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const rt = createRuntime(root)
    runtimeRef.current = rt
    const cleanups = wireEvents(rt)
    initRuntime(rt)
    return () => {
      cleanups.forEach((cleanup) => cleanup())
      rt.timers.forEach((t) => window.clearTimeout(t))
      rt.intervals.forEach((t) => window.clearInterval(t))
      if (rt.toastT !== null) window.clearTimeout(rt.toastT)
      runtimeRef.current = null
    }
  }, [])

  const canvasRef = useSceneCanvas((g: CanvasRenderingContext2D, fr: Frame) => {
    const rt = runtimeRef.current
    if (!rt) {
      g.clearRect(0, 0, fr.w, fr.h)
      return
    }
    drawRuntime(g, fr, rt)
  }, { running })

  return (
    <SceneHost className={s.root} bg="#0c0d0e">
      <div className="device" ref={rootRef}>
        <div className="contact">
          <b>SPOT_WLD · TEACH PENDANT</b>
        </div>
        <div className="faultflash" data-ref="faultflash" />

        <div className="harnessOv" data-ref="harnessOv">
          <div className="hx-top">
            <div className="hx-tt">
              설비·로봇 티칭 · PLC 시퀀스 제어
              <small>SPOT WELD TEACH · PLC SEQUENCE CONTROL</small>
            </div>
            <div className="hx-env">
              <span className="led c miniLed" />
              MODE: <span data-ref="hx-mode">T1</span> · OVR <span data-ref="hx-ovr">100%</span>
            </div>
            <div className="hx-close">x CLOSE</div>
          </div>
          <div className="hx-body">
            <div className="hx-left">
              <div className="hx-paradox">
                <div className="lbl">핵심 역량 · CORE SKILL</div>
                <div className="big">
                  스팟 용접 포인트를 <b>티치펜던트로 직접 교시</b>하고,
                  <br />
                  취출·단축 로봇 동작을 <b>PLC 시퀀스</b>로 제어한다.
                </div>
              </div>

              <div className="hx-sec-h">
                5대 현장 역량 / 티칭·PLC 시퀀스 <b>waypoint = 설비 역량</b>
              </div>
              <div className="hx-pillars">
                <div className="hx-pillar on" data-pillar="teach">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      스팟 용접 포인트 교시<small>SPOT WELD TEACH</small>
                    </div>
                    <div className="pdesc">티치펜던트로 스팟 용접 건의 포인트별 위치(P1, P2, …)를 직접 교시한다. 이동 경로·자세(W/P/R)·속도·가압 타이밍을 점 단위로 등록한다.</div>
                  </div>
                  <div className="pmap">
                    jog → P[ ] 기록
                    <br />= 용접 포인트 교시
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="plc">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      PLC 시퀀스 제어<small>PLC SEQUENCE</small>
                    </div>
                    <div className="pdesc">단축로봇·취출로봇 동작을 PLC 스텝 시퀀스로 제어한다. 취출로봇 31대 개조·개선, 모터 구동 시퀀스 설정, 인터락 조건 설계.</div>
                  </div>
                  <div className="pmap">
                    STEP / 조건 / 출력
                    <br />= 인터락 시퀀스
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="extract">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      취출 로봇 개조·개선<small>EXTRACTION ROBOT</small>
                    </div>
                    <div className="pdesc">취출(取出)로봇 31대 개조 및 동작 개선. Pin Point GATE 취출 동작 중 커팅 시퀀스를 PLC 인터락과 연동해 사출 불량 없이 안정 취출한다.</div>
                  </div>
                  <div className="pmap">
                    GATE 커팅 / EJECT
                    <br />= 취출 인터락
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="jig">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      엔드밀 사상 JIG 연동<small>JIG INTERLOCK</small>
                    </div>
                    <div className="pdesc">엔드밀 사상 JIG와 로봇 동작을 PLC 인터락으로 연동한다. JIG 클램프 완료 신호 확인 후 로봇 진입, 사상 완료 후 자동 후퇴 시퀀스를 구성한다.</div>
                  </div>
                  <div className="pmap">
                    CLAMP CHK / 진입
                    <br />= JIG 연동 시퀀스
                  </div>
                </div>
                <div className="hx-pillar on" data-pillar="weld-seq">
                  <span className="plamp" />
                  <div className="pmain">
                    <div className="pname">
                      용접 동작 시퀀스<small>WELD SEQUENCE</small>
                    </div>
                    <div className="pdesc">스팟 용접 동작을 가압→통전→유지→해제 4단계로 분리해 각 단계별 시간·전류 조건을 티칭 프로그램 내 I/O로 제어한다.</div>
                  </div>
                  <div className="pmap">
                    가압→통전→유지
                    <br />= I/O 타이밍 제어
                  </div>
                </div>
              </div>

              <div className="hx-env-bar">
                <div className="hx-env-fill" data-ref="hxEnvFill" />
              </div>
              <div className="hx-env-cap">
                스킬 충족도 <b data-ref="hxEnvPct">100%</b> · 5대 역량 중 <b data-ref="hxEnvN">5</b>개 확인
              </div>

              <div className="hx-cap">
                <b>현장에서 완결하는 기술.</b> 스팟 용접 티칭은 좌표 등록이 아니라 <b>가압→통전→유지 시퀀스 전체를 포인트 단위로 설계</b>하는 과정이다 — 이동 경로·자세·속도·I/O 인터락까지. 취출로봇 31대 개조·PLC 시퀀스 설계 경험이 설비 정지 없는 개선을 가능하게 한다. <b>[확인필요: 좌표 수치는 실제 작업 방식을 기반으로 한 예시값임]</b>
              </div>
            </div>

            <div className="hx-right">
              <div className="hx-sec-h hxSecTight">작업 READOUTS</div>
              <div className="hx-read moat">
                <div className="rt">SPOT WELD TEACH · 스팟 용접 교시</div>
                <div className="rv">
                  티치펜던트로 용접 건의 <b>포인트별 위치를 직접 교시</b>. 이동 경로·자세·속도·가압 타이밍을 P[ ] 단위로 등록.
                </div>
                <div className="rmono">TEACH P[n] → 가압 → 통전 → 유지</div>
                <div className="rv hxInlineNote">좌표 수치는 예시값 [확인필요] — 교시 방법과 시퀀스 구조는 실제 작업 기반.</div>
              </div>
              <div className="hx-read fail">
                <div className="rt">PLC SEQUENCE · 취출 로봇 시퀀스</div>
                <div className="rv">
                  단축로봇·취출로봇 <b>31대 개조·개선</b>. PLC 스텝 시퀀스로 모터 구동·인터락·Pin Point GATE 커팅 제어.
                </div>
                <div className="rv hxInlineNote">
                  → <b className="hot">취출 동작 중 커팅</b> 시퀀스 + 엔드밀 사상 JIG 인터락 연동 직접 설계.
                </div>
              </div>
              <div className="hx-read">
                <div className="rt">MAPPING · 펜던트 → 현장 작업</div>
                <div className="rv hxMonoMap">
                  T1 교시 모드&nbsp;&nbsp;&nbsp;= 포인트 직접 등록
                  <br />
                  jog + 기록&nbsp;&nbsp;&nbsp;&nbsp;= 용접 포인트 위치 확정
                  <br />
                  DO/DI 인터락&nbsp;= 가압·통전·유지 타이밍
                  <br />
                  PLC STEP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 취출·커팅 시퀀스
                  <br />
                  JIG CLAMP CHK = 로봇 진입 조건 인터락
                </div>
              </div>
              <div className="hx-read hxReadAmber">
                <div className="rt">LIVE · 현재 운전 상태</div>
                <div className="rv hxLive">
                  MODE&nbsp;<b data-ref="hx-mode2">T1</b> · SPD OVR <b data-ref="hx-ovr2">100%</b>
                  <br />
                  FRAME <b data-ref="hx-frame2">WORLD</b> · SERVO <b data-ref="hx-servo2">ON</b>
                </div>
                <div className="rv hxInlineNote">T1(교시) → T2(검증) → AUTO(양산) 단계적 전환으로 안전 확보.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="inner">
          <div className="topbar">
            <div className="brand">
              <div className="logo">TP</div>
              <div className="nm">
                티칭 펜던트 · 스팟 용접 교시
                <small>PROG[SPOT_WLD] · SPOT WELD TEACH</small>
              </div>
            </div>
            <div className="lamps">
              <div className="lamp on" data-ref="l-run">
                <span className="led g" />
                RUNNING
              </div>
              <div className="lamp" data-ref="l-pause">
                <span className="led a" />
                PAUSED
              </div>
              <div className="lamp" data-ref="l-fault">
                <span className="led r" />
                FAULT
              </div>
              <div className="lamp on" data-ref="l-servo">
                <span className="led g" />
                SERVO
              </div>
              <div className="lamp on" data-ref="l-t1">
                <span className="led c" />
                <span data-ref="l-t1-label">T1</span>
              </div>
            </div>
          </div>

          <div className="leftcol">
            <div className="panel">
              <div className="phead">
                SOFT KEYS <b>F-MENU</b>
              </div>
              <div className="softkeys">
                <div className="skey k-sel active" data-soft="SELECT">
                  <span className="ic">SE</span>
                  <span className="lab">
                    SELECT<small>프로그램 선택</small>
                  </span>
                </div>
                <div className="skey k-edit" data-soft="EDIT">
                  <span className="ic">ED</span>
                  <span className="lab">
                    EDIT<small>라인 편집</small>
                  </span>
                </div>
                <div className="skey k-data" data-soft="DATA">
                  <span className="ic">DA</span>
                  <span className="lab">
                    DATA<small>레지스터 R[ ]</small>
                  </span>
                </div>
                <div className="skey k-reset" data-soft="RESET">
                  <span className="ic">RS</span>
                  <span className="lab">
                    RESET<small>알람 해제</small>
                  </span>
                </div>
                <div className="skey k-harness" data-soft="HARNESS">
                  <span className="ic">SK</span>
                  <span className="lab">
                    SKILL<small>스킬 상세</small>
                  </span>
                </div>
              </div>
            </div>
            <div className="panel programInfoPanel">
              <div className="phead">PROGRAM INFO</div>
              <div className="metaP">
                <div className="mrow">
                  <span className="k">PROG</span>
                  <span className="v amb">SPOT_WLD.TP</span>
                </div>
                <div className="mrow">
                  <span className="k">LINES</span>
                  <span className="v" data-ref="mi-lines">— / —</span>
                </div>
                <div className="mrow">
                  <span className="k">CURRENT</span>
                  <span className="v amb" data-ref="mi-cur">P[1]</span>
                </div>
                <div className="mrow">
                  <span className="k">GROUP</span>
                  <span className="v">GP1</span>
                </div>
                <div className="mrow">
                  <span className="k">UFRAME</span>
                  <span className="v">UF:1</span>
                </div>
                <div className="mrow">
                  <span className="k">UTOOL</span>
                  <span className="v">UT:1</span>
                </div>
                <div className="mrow">
                  <span className="k">PAYLOAD</span>
                  <span className="v">용접 건</span>
                </div>
                <div className="mrow">
                  <span className="k">CYCLE</span>
                  <span className="v" data-ref="mi-cyc">000124</span>
                </div>
                <div className="mrow">
                  <span className="k">ROBOT</span>
                  <span className="v">스팟용접 로봇</span>
                </div>
                <div className="mrow">
                  <span className="k">PLC</span>
                  <span className="v">취출로봇 ×31</span>
                </div>
                <div className="mrow skillSetRow">
                  <span className="k">SKILL SET</span>
                  <span className="v" data-ref="mi-skill">TOOL[01..18]</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lcdwrap">
            <div className="lcd">
              <div className="lcd-top">
                <span className="tt">SKILL</span>
                <span>
                  LINE <b data-ref="lt-line">0001</b>
                </span>
                <span data-ref="lcd-mode">JOINT</span>
                <span className="sp">
                  100% <span className="pct" data-ref="lt-ovr">OVR</span>
                </span>
                <span className="ltState" data-ref="lt-state">▶ RUNNING</span>
              </div>
              <div className="lcd-body lcdBodyRel">
                <div className="prog">
                  <div className="prog-scroll" data-ref="progScroll" />
                </div>
                <div className="detail" data-ref="detail" />
                <div className="log-strip" data-ref="logStrip" />
              </div>
              <div className="lcd-status">
                <div className="seg">
                  TOOL <b data-ref="st-tool">UT:1 [WELD-GUN]</b>
                </div>
                <div className="seg amb">
                  SPD <b data-ref="st-spd">100%</b>
                </div>
                <div className="seg">
                  MOTN <b data-ref="st-motn">FINE</b>
                </div>
                <div className="seg grow" data-ref="st-msg">SPOT WELD TEACH · P[4] 포인트 교시 완료</div>
              </div>
            </div>
          </div>

          <div className="rightcol">
            <div className="panel viewportPanel">
              <div className="viewport">
                <canvas ref={canvasRef} className={s.c} />
                <div className="vp-ov">
                  <span className="tl" data-ref="vp-tl">VIEW · WORLD FRAME</span>
                  <span className="tr" data-ref="vp-pt">▸ AT P[1]</span>
                  <span className="bl" data-ref="vp-st">스팟용접 로봇 · SERVO ON</span>
                </div>
              </div>
            </div>

            <div className="panel dro">
              <div className="phead droHead">
                TCP POSITION <b data-ref="dro-frame">WORLD</b>
              </div>
              <div className="dro-grid">
                <div className="dro-cell x">
                  <div className="ax">X</div>
                  <div className="val" data-ref="d-x">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell y">
                  <div className="ax">Y</div>
                  <div className="val" data-ref="d-y">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell z">
                  <div className="ax">Z</div>
                  <div className="val" data-ref="d-z">0.0</div>
                  <div className="un">mm</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">W</div>
                  <div className="val" data-ref="d-w">0.0</div>
                  <div className="un">deg</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">P</div>
                  <div className="val" data-ref="d-p">0.0</div>
                  <div className="un">deg</div>
                </div>
                <div className="dro-cell">
                  <div className="ax">R</div>
                  <div className="val" data-ref="d-r">0.0</div>
                  <div className="un">deg</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="phead">
                JOG · 수동 조작 <b data-ref="jog-frame">WORLD</b>
              </div>
              <div className="jog">
                <div className="dpad">
                  <div className="jbtn up" data-jog="Y+">+Y</div>
                  <div className="jbtn dn" data-jog="Y-">−Y</div>
                  <div className="jbtn lf" data-jog="X-">−X</div>
                  <div className="jbtn rt" data-jog="X+">+X</div>
                  <div className="jbtn zp" data-jog="Z+">+Z</div>
                  <div className="jbtn zm" data-jog="Z-">−Z</div>
                  <div className="ctr">
                    JOG
                    <br />
                    1.0mm
                  </div>
                </div>
                <div className="jogside">
                  <div className="coordsel">
                    <div className="csel on" data-coord="WORLD">WORLD</div>
                    <div className="csel" data-coord="TOOL">TOOL</div>
                    <div className="csel" data-coord="JOINT">JOINT</div>
                  </div>
                  <div className="ovr">
                    <div className="ovr-top">
                      <span>SPEED OVR</span>
                      <b data-ref="ovr-val">100%</b>
                    </div>
                    <div className="ovr-bar" data-ref="ovrBar">
                      <div className="ovr-fill" data-ref="ovrFill" />
                    </div>
                    <div className="ovr-ticks">
                      <span>VFINE</span>
                      <span>25</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bottombar">
            <div className="fkeys">
              <div className="fk rew" data-act="rew">
                <span className="ico">⏮</span>
                <span className="ttl">REWIND</span>
                <span className="sub">BWD</span>
              </div>
              <div className="fk play active" data-act="play">
                <span className="ico">▶</span>
                <span className="ttl">PLAY</span>
                <span className="sub">CYCLE START</span>
              </div>
              <div className="fk pause" data-act="pause">
                <span className="ico">⏸</span>
                <span className="ttl">HOLD</span>
                <span className="sub">FEED HOLD</span>
              </div>
              <div className="fk step" data-act="step">
                <span className="ico">⏭</span>
                <span className="ttl">STEP</span>
                <span className="sub">FWD 1 LINE</span>
              </div>
            </div>
            <div className="cluster">
              <div className="modesw">
                <div className="ml">MODE SELECT KEY-SW</div>
                <div className="modes">
                  <div className="mode on" data-mode="T1">
                    T1<small>≤250mm/s</small>
                  </div>
                  <div className="mode" data-mode="T2">
                    T2<small>TEST FULL</small>
                  </div>
                  <div className="mode" data-mode="AUTO">
                    AUTO<small>운전</small>
                  </div>
                </div>
                <div className="servo on" data-ref="servoSw">
                  <div className="sw">
                    <div className="kn" />
                  </div>
                  <span className="slab" data-ref="servo-label">SERVO ON</span>
                </div>
              </div>
              <div className="estop" data-ref="estop">
                <div className="btn">
                  EMERGENCY
                  <br />
                  STOP
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="minitag">티칭펜던트 · SPOT_WLD.TP · 취출로봇 PLC SEQ · v2025.08</div>
        <div className="toast" data-ref="toast" />
      </div>
    </SceneHost>
  )
}
