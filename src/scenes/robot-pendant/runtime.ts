import { clamp } from '../_host/math'
import { scrollIntoNearestScrollable } from '../_host/dom-util'
import {
  BG_EVENTS,
  COMPANY,
  IO_MAP,
  PLC_SEQ,
  PROGRAM,
  SKILLS,
  WAYPOINTS,
  WP_IO,
} from './data'
import type { IoKey } from './data'
import { LOG_MAX } from './constants'
import { addListener, all, byRef, setText } from './dom'
import type { Mode, Runtime } from './types'

export function ioGridHtml(rt: Runtime) {
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

export function refreshIO(rt: Runtime) {
  all<HTMLElement>(rt, '.iocell').forEach((el) => {
    const key = el.dataset.io as IoKey | undefined
    if (!key) return
    const on = !!rt.iost[key]
    el.classList.toggle('on', on)
    const v = el.querySelector<HTMLElement>('.iov')
    if (v) v.textContent = on ? 'ON' : 'OFF'
  })
}

export function plcRowsHtml(rt: Runtime) {
  return PLC_SEQ.map(
    (p, i) =>
      `<div class="plcrow${i === rt.plcActStep ? ' act' : ''}" data-step="${i}">` +
      `<span class="stp">S${p.s}</span><span class="cond">${p.c}</span><span class="out">${p.o}</span></div>`
  ).join('')
}

export function setPlcStep(rt: Runtime, i: number) {
  rt.plcActStep = ((i % PLC_SEQ.length) + PLC_SEQ.length) % PLC_SEQ.length
  all<HTMLElement>(rt, '.plcrow').forEach((row) => {
    const act = Number(row.dataset.step) === rt.plcActStep
    row.classList.toggle('act', act)
    if (act) scrollIntoNearestScrollable(row)
  })
}

export function applyWaypointIO(rt: Runtime, i: number) {
  const m = WP_IO[i]
  if (!m) return
  Object.assign(rt.iost, m.set)
  refreshIO(rt)
  setPlcStep(rt, m.plc)
}

export function buildProgram(rt: Runtime) {
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

export function selectLine(rt: Runtime, i: number, fromUser: boolean) {
  rt.state.selected = i
  const wp = WAYPOINTS[i]
  if (!wp) return

  all<HTMLElement>(rt, '.pline').forEach((p) => p.classList.remove('sel'))
  const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${i}"]`)
  if (el) {
    el.classList.add('sel')
    scrollIntoNearestScrollable(el)
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

export function setRunLine(rt: Runtime, i: number) {
  all<HTMLElement>(rt, '.pline').forEach((p) => p.classList.remove('run'))
  WAYPOINTS.forEach((_, idx) => {
    const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${idx}"]`)
    if (!el) return
    el.classList.toggle('done', idx < i && rt.state.mode === 'PLAY')
    if (idx === i) el.classList.add('run')
  })
}

export function gotoLine(rt: Runtime, i: number) {
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

export function tickAutoPlay(rt: Runtime, dt: number) {
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

export function play(rt: Runtime) {
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

export function pause(rt: Runtime) {
  setMode(rt, 'PAUSED')
  rt.state.autoPlay = false
  pushLog(rt, 'HOLD — 피드 홀드')
}

export function stepFwd(rt: Runtime) {
  pause(rt)
  const next = Math.min(rt.state.running + 1, WAYPOINTS.length - 1)
  gotoLine(rt, next)
  toast(rt, `STEP → P[${WAYPOINTS[next].id}]`)
  pushLog(rt, `STEP FWD → P[${WAYPOINTS[next].id}]`)
}

export function rewind(rt: Runtime) {
  pause(rt)
  WAYPOINTS.forEach((_, idx) => {
    const el = rt.progScroll.querySelector<HTMLElement>(`.pline[data-idx="${idx}"]`)
    if (el) el.classList.remove('done')
  })
  gotoLine(rt, 0)
  toast(rt, 'REWIND → P[1]')
  pushLog(rt, 'REWIND — P[1] 복귀')
}

export function setMode(rt: Runtime, mode: Exclude<Mode, 'AUTO_PAUSED'>) {
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

export function startWeldReteach(rt: Runtime) {
  rt.state.weldFx = 1
  rt.reTeachActive = true
  rt.reTeachPct = 15
  rt.reTeachNext = 320
  setText(rt, 'st-msg', 'P[2] 용접점 편차 검출 — 재교시 실행 중')
  toast(rt, '! 용접점 위치 편차 — 재교시(RE-TEACH) 실행', true)
  pushLog(rt, '! P[2] 용접점 편차 검출 — RE-TEACH 시작', 'ev-warn')
}

export function tickReteach(rt: Runtime, dt: number) {
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

export function jog(rt: Runtime, dir: string | undefined) {
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

export function pushLog(rt: Runtime, msg: string, cls = 'ev-move') {
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

export function tickBgEvents(rt: Runtime, dt: number) {
  if (rt.state.estop) return
  rt.bgEvNext -= dt
  if (rt.bgEvNext > 0) return
  const ev = BG_EVENTS[rt.bgEvIdx % BG_EVENTS.length]
  rt.bgEvIdx += 1
  pushLog(rt, ev.t, ev.cls)
  rt.bgEvNext = 1100 + Math.random() * 1400
}

export function toast(rt: Runtime, msg: string, warn = false) {
  rt.toastEl.textContent = msg
  rt.toastEl.classList.toggle('warn', warn)
  rt.toastEl.classList.add('show')
  if (rt.toastT !== null) window.clearTimeout(rt.toastT)
  rt.toastT = window.setTimeout(() => rt.toastEl.classList.remove('show'), 2200)
}

export function press(rt: Runtime, el: HTMLElement) {
  el.classList.add('held')
  rt.timers.push(window.setTimeout(() => el.classList.remove('held'), 120))
}

export function syncHarnessLive(rt: Runtime) {
  const st = rt.state
  const ov = `${st.ovr}%`
  setText(rt, 'hx-mode', st.keyMode)
  setText(rt, 'hx-mode2', st.keyMode)
  setText(rt, 'hx-ovr', ov)
  setText(rt, 'hx-ovr2', ov)
  setText(rt, 'hx-frame2', st.coord)
  setText(rt, 'hx-servo2', st.servo ? 'ON' : 'OFF')
}

export function syncEnvelopeMeter(rt: Runtime) {
  const on = all(rt, '.hx-pillar.on').length
  const pct = Math.round((on / 5) * 100)
  const fill = byRef(rt, 'hxEnvFill')
  if (fill) fill.style.width = `${pct}%`
  setText(rt, 'hxEnvPct', `${pct}%`)
  setText(rt, 'hxEnvN', String(on))
}

export function openHarness(rt: Runtime) {
  syncHarnessLive(rt)
  syncEnvelopeMeter(rt)
  rt.harnessOv.classList.add('show')
}

export function closeHarness(rt: Runtime) {
  rt.harnessOv.classList.remove('show')
}

export function wireEvents(rt: Runtime) {
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

export function initRuntime(rt: Runtime) {
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
