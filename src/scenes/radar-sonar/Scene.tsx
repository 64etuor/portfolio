'use client'

import { useEffect, useRef, useCallback } from 'react'
import { SceneHost } from '../_host/SceneHost'
import { useSceneCanvas } from '../_host/useSceneCanvas'
import { useSceneReady } from '../_host/useSceneReady'
import type { Frame, SceneProps } from '../_host/types'
import s from './scene.module.css'
import {
  PHASE_LABEL,
  PHASE_KO,
  FAKE_SIGNALS,
  SURFACE_STACK,
} from './data'
import {
  RINGS,
  SWEEP_SPEED,
  pad3,
  typeAbbr,
  typeKo,
  typeColRgb,
  initContacts,
  type Contact,
  type Ping,
  type FakeRow,
} from './helpers'

/* ════════════════════════════════════════════════════════════════
   Work Radar — radar-sonar.html 이식
   PPI 소나 스코프 + 신호 탐지 관제 콕핏
   ════════════════════════════════════════════════════════════════ */

function typCls(type: string) {
  if (type === 'signal') return s.typSignal
  if (type === 'surface') return s.typSurface
  if (type === 'agent') return s.typAgent
  return s.typGate
}

export default function Scene({ running = true, onReady }: SceneProps) {
  // --- DOM refs for HUD / overlay elements ---
  const hudBearingRef = useRef<HTMLSpanElement>(null)
  const hudRangeRef = useRef<HTMLSpanElement>(null)
  const hudContactsRef = useRef<HTMLSpanElement>(null)
  const hudVerifiedRef = useRef<HTMLSpanElement>(null)
  const hudPhaseRef = useRef<HTMLSpanElement>(null)
  const hudPhaseTagRef = useRef<HTMLDivElement>(null)
  const curBrgRef = useRef<HTMLSpanElement>(null)
  const curRngRef = useRef<HTMLSpanElement>(null)
  const liveDetRef = useRef<HTMLSpanElement>(null)
  const livePriRef = useRef<HTMLSpanElement>(null)
  const liveResRef = useRef<HTMLSpanElement>(null)
  const lockStateRef = useRef<HTMLSpanElement>(null)
  const lockIdRef = useRef<HTMLSpanElement>(null)
  const lockVerdictRef = useRef<HTMLSpanElement>(null)
  const trackBodyRef = useRef<HTMLDivElement>(null)
  const tickerRef = useRef<HTMLSpanElement>(null)
  const clockRef = useRef<HTMLSpanElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const dcTrkRef = useRef<HTMLDivElement>(null)
  const dcIdRef = useRef<HTMLDivElement>(null)
  const dcSubRef = useRef<HTMLDivElement>(null)
  const dcBrgRef = useRef<HTMLDivElement>(null)
  const dcRngRef = useRef<HTMLDivElement>(null)
  const dcClassRef = useRef<HTMLDivElement>(null)
  const dcConfRef = useRef<HTMLDivElement>(null)
  const dcVerdictRef = useRef<HTMLDivElement>(null)
  const dcDescRef = useRef<HTMLDivElement>(null)
  const dcAchRef = useRef<HTMLDivElement>(null)
  const dcTagsRef = useRef<HTMLDivElement>(null)

  // --- legend filter rows ---
  const legendSignalRef = useRef<HTMLDivElement>(null)
  const legendSurfaceRef = useRef<HTMLDivElement>(null)
  const legendAgentRef = useRef<HTMLDivElement>(null)
  const legendGateRef = useRef<HTMLDivElement>(null)
  const cntSignalRef = useRef<HTMLSpanElement>(null)
  const cntSurfaceRef = useRef<HTMLSpanElement>(null)
  const cntAgentRef = useRef<HTMLSpanElement>(null)
  const cntGateRef = useRef<HTMLSpanElement>(null)

  // --- ladder lad refs (4 phases) ---
  const ladRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  // --- mutable scene state in refs ---
  const contacts = useRef<Contact[]>(initContacts())
  const sweepAngle = useRef(-Math.PI / 2)
  const prevSweep = useRef(-Math.PI / 2)
  const lockPhaseTime = useRef(0)
  const acqHold = useRef(0)
  const lastReann = useRef(0)
  const maxPhase = useRef(0)
  const selected = useRef<Contact | null>(null)
  const hoverContact = useRef<Contact | null>(null)
  const mouse = useRef({ x: -9999, y: -9999, inScope: false })
  const pings = useRef<Ping[]>([])
  const activeFilters = useRef({ signal: true, surface: true, agent: true, gate: true })
  const fakeRowsRef = useRef<FakeRow[]>([])
  const fakeIdxRef = useRef(0)

  // canvas interaction needs current W/H/CX/CY/R derived from f.w/f.h each frame
  const scopeGeom = useRef({ W: 0, H: 0, CX: 0, CY: 0, R: 0 })

  useSceneReady(onReady)

  // --- helpers ---
  const setTicker = useCallback((text: string) => {
    if (tickerRef.current) {
      tickerRef.current.textContent =
        text +
        ' · Work Radar: 지금 무엇을 봐야 하는지를 잃지 않게 하는 local-first 관제 콕핏 · Boule Governance: 자동화 많을수록 인간 가시성 확보'
    }
  }, [])

  const updateHUD = useCallback(() => {
    const cs = contacts.current
    const det = cs.filter((c) => c._detected).length
    const ver = cs.filter((c) => c._verified).length
    const pri = cs.filter((c) => c._detected && (c.priority || c.type === 'gate')).length
    if (hudContactsRef.current) hudContactsRef.current.textContent = det + ' / ' + cs.length
    if (hudVerifiedRef.current) hudVerifiedRef.current.textContent = ver + ' / ' + cs.length
    if (liveDetRef.current) liveDetRef.current.textContent = String(det)
    if (livePriRef.current) livePriRef.current.textContent = String(pri)
    if (liveResRef.current) liveResRef.current.textContent = String(ver)
    if (cntSignalRef.current) cntSignalRef.current.textContent = String(cs.filter((c) => c.type === 'signal' && c._detected).length)
    if (cntSurfaceRef.current) cntSurfaceRef.current.textContent = String(cs.filter((c) => c.type === 'surface' && c._detected).length)
    if (cntAgentRef.current) cntAgentRef.current.textContent = String(cs.filter((c) => c.type === 'agent' && c._detected).length)
    if (cntGateRef.current) cntGateRef.current.textContent = String(cs.filter((c) => c.type === 'gate' && c._detected).length)
  }, [])

  const escalatePhase = useCallback((p: number) => {
    if (p > maxPhase.current) maxPhase.current = p
    if (hudPhaseRef.current) hudPhaseRef.current.textContent = PHASE_LABEL[maxPhase.current]
    // flash animation: remove then re-add class
    const tag = hudPhaseTagRef.current
    if (tag) {
      tag.classList.remove(s.tagFlash)
      // force reflow
      void tag.offsetWidth
      tag.classList.add(s.tagFlash)
    }
    ladRefs.current.forEach((el, lp) => {
      if (!el) return
      el.classList.toggle(s.ladActive, lp === maxPhase.current)
      el.classList.toggle(s.ladReached, lp < maxPhase.current)
    })
  }, [])

  const setLockVerdict = useCallback((c: Contact) => {
    const el = lockVerdictRef.current
    if (!el) return
    if (c._verified) {
      el.textContent = 'STATUS LOCKED'
      el.style.color = '#2effa3'
    } else {
      el.textContent = 'STATUS SCANNING'
      el.style.color = '#ffb031'
    }
  }, [])

  const verifyContact = useCallback(
    (c: Contact) => {
      if (!c._detected) return
      if (c._verified) return
      c._verified = true
      // find row and update chip
      const rows = trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]')
      rows?.forEach((row) => {
        if (row.dataset.idx === String(contacts.current.indexOf(c))) {
          const chip = row.querySelector<HTMLElement>('.vchip-el')
          if (chip) {
            chip.className = 'vchip-el ' + s.vchip + ' ' + s.vchipVerified
            chip.textContent = 'LOCKED'
          }
        }
      })
      if (selected.current === c) setLockVerdict(c)
      updateHUD()
    },
    [setLockVerdict, updateHUD],
  )

  const openDetail = useCallback((c: Contact) => {
    if (dcTrkRef.current) dcTrkRef.current.textContent = 'TRK-' + String(c._trk).padStart(2, '0') + ' · ' + typeAbbr(c.type)
    if (dcIdRef.current) dcIdRef.current.textContent = c.id
    if (dcSubRef.current) dcSubRef.current.textContent = c.sub || ''
    if (dcBrgRef.current) dcBrgRef.current.textContent = pad3(c.brg) + 'deg'
    if (dcRngRef.current) dcRngRef.current.textContent = (c.ring * 40).toFixed(0) + ' NM'
    if (dcClassRef.current) dcClassRef.current.textContent = typeKo(c.type)
    if (dcConfRef.current) dcConfRef.current.textContent = (c.conf || 97) + '%'
    if (dcVerdictRef.current) {
      const vstate = c._verified
        ? `<span class="${s.dcVerdictState} ${s.dcVerdictVerified}">LOCKED</span>`
        : `<span class="${s.dcVerdictState} ${s.dcVerdictPending}">SCANNING</span>`
      dcVerdictRef.current.innerHTML =
        `<span class="${s.dcVerdictPhase}">${PHASE_LABEL[c._phase]}</span>` +
        vstate +
        `<span class="${s.dcVerdictNote}">서피스: ${PHASE_KO[c._phase]}</span>`
    }
    if (dcDescRef.current) dcDescRef.current.textContent = c.desc || ''
    if (dcAchRef.current) {
      dcAchRef.current.innerHTML = (c.ach || [])
        .map(
          ([b, x]) =>
            `<div class="${s.dcAchItem}"><span class="${s.dcAchItemB}">[${b}]</span><span class="${s.dcAchItemX}">${x}</span></div>`,
        )
        .join('')
    }
    if (dcTagsRef.current) {
      dcTagsRef.current.innerHTML = (c.tags || [])
        .map((t) => `<span class="${s.dcTag}">${t}</span>`)
        .join('')
    }
    detailRef.current?.classList.add(s.detailOpen)
  }, [])

  const closeDetail = useCallback(() => {
    detailRef.current?.classList.remove(s.detailOpen)
    if (lockStateRef.current) {
      lockStateRef.current.textContent = 'STANDBY'
      lockStateRef.current.style.color = ''
    }
    if (lockIdRef.current) lockIdRef.current.textContent = '--'
    if (lockVerdictRef.current) {
      lockVerdictRef.current.textContent = 'STATUS --'
      lockVerdictRef.current.style.color = '#4f9a7a'
    }
    selected.current = null
    trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]').forEach((r) => r.classList.remove(s.trackRowSel))
  }, [])

  const renderTrackRow = useCallback(
    (c: Contact) => {
      const tb = trackBodyRef.current
      if (!tb) return
      const row = document.createElement('div')
      row.className = s.trackRow
      row.dataset.idx = String(contacts.current.indexOf(c))
      const rng = (c.ring * 40).toFixed(0)
      const chipCls = `vchip-el ${s.vchip} ${c._verified ? s.vchipVerified : s.vchipPending}`
      const chipTxt = c._verified ? 'LOCKED' : 'SCANNING'

      const trk = document.createElement('span')
      trk.className = s.trackTrk
      trk.textContent = String(c._trk).padStart(2, '0')

      const brg = document.createElement('span')
      brg.textContent = pad3(c.brg) + 'deg'

      const rngEl = document.createElement('span')
      rngEl.textContent = rng + 'N'

      const surf = document.createElement('span')
      surf.className = s.trackTyp + ' ' + typCls(c.type)
      surf.textContent = 'S' + c._phase

      const id = document.createElement('span')
      id.className = s.trackId
      id.title = c.id
      id.textContent = c.id
      const chip = document.createElement('span')
      chip.className = chipCls
      chip.textContent = chipTxt
      id.appendChild(chip)

      row.appendChild(trk)
      row.appendChild(brg)
      row.appendChild(rngEl)
      row.appendChild(surf)
      row.appendChild(id)

      row.addEventListener('click', () => selectContact(c))
      row.addEventListener('mouseenter', () => { hoverContact.current = c })
      row.addEventListener('mouseleave', () => { if (hoverContact.current === c) hoverContact.current = null })
      tb.appendChild(row)
      requestAnimationFrame(() => row.classList.add(s.trackRowIn))
      tb.scrollTop = tb.scrollHeight
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // selectContact defined after renderTrackRow to avoid circular — use a stable ref
  const selectContactRef = useRef<(c: Contact) => void>(() => {})

  const selectContact = useCallback(
    (c: Contact) => {
      selected.current = c
      trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]').forEach((r) => r.classList.remove(s.trackRowSel))
      const row = trackBodyRef.current?.querySelector<HTMLElement>(`[data-idx="${contacts.current.indexOf(c)}"]`)
      if (row) row.classList.add(s.trackRowSel)
      if (lockStateRef.current) {
        lockStateRef.current.textContent = 'LOCKED'
        lockStateRef.current.style.color = '#ffb031'
      }
      if (lockIdRef.current) lockIdRef.current.textContent = 'TRK-' + String(c._trk).padStart(2, '0')
      setLockVerdict(c)
      pings.current.push({ r: 6, life: 1.2 })
      openDetail(c)
      const vk = c._verified ? 'LOCKED · 신호 확인 완료' : 'SCANNING · 탐지 진행 중'
      setTicker('신호 고정 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · ' + vk)
    },
    [setLockVerdict, openDetail, setTicker],
  )

  useEffect(() => {
    selectContactRef.current = selectContact
  }, [selectContact])

  const resetAcquisition = useCallback(() => {
    contacts.current.forEach((c) => {
      c._detected = false
      c._verified = false
      c._glow = 0
    })
    maxPhase.current = 0
    selected.current = null
    if (trackBodyRef.current) trackBodyRef.current.innerHTML = ''
    fakeRowsRef.current = []
    ladRefs.current.forEach((el) => el?.classList.remove(s.ladActive, s.ladReached))
    if (hudPhaseRef.current) hudPhaseRef.current.textContent = '—'
    updateHUD()
    setTicker('스캔 1주기 완료 -- 신호 재취득 시작')
  }, [updateHUD, setTicker])

  const onAcquire = useCallback(
    (c: Contact) => {
      escalatePhase(c._phase)
      renderTrackRow(c)
      updateHUD()
      setTicker('신호 탐지 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · 락온 시작')
      setTimeout(() => verifyContact(c), 700 + Math.random() * 900)
    },
    [escalatePhase, renderTrackRow, updateHUD, setTicker, verifyContact],
  )

  const onReacquire = useCallback(
    (c: Contact) => {
      c._glow = Math.max(c._glow || 0, 0.9)
      const now = performance.now()
      if (now - lastReann.current < 1500) return
      lastReann.current = now
      setTicker('재확인 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · 트랙 유지')
    },
    [setTicker],
  )

  const updateDetection = useCallback(
    (dt: number) => {
      sweepAngle.current += SWEEP_SPEED * dt
      lockPhaseTime.current += dt

      contacts.current.forEach((c) => {
        const norm = ((sweepAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const ca = ((c._a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const pa = ((prevSweep.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        let crossed = false
        if (pa <= norm) {
          crossed = ca > pa && ca <= norm
        } else {
          crossed = ca > pa || ca <= norm
        }
        if (crossed) {
          c._glow = 1
          if (!c._detected) {
            c._detected = true
            onAcquire(c)
          } else {
            onReacquire(c)
          }
        }
      })
      prevSweep.current = sweepAngle.current
    },
    [onAcquire, onReacquire],
  )

  // --- Canvas draw functions ---
  function drawGrid(g: CanvasRenderingContext2D, CX: number, CY: number, R: number) {
    g.save()
    g.strokeStyle = 'rgba(46,255,163,0.5)'
    g.lineWidth = 2
    g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.stroke()
    g.strokeStyle = 'rgba(46,255,163,0.18)'
    g.lineWidth = 1
    g.beginPath(); g.arc(CX, CY, R + 6, 0, Math.PI * 2); g.stroke()

    g.font = "10px 'Share Tech Mono'"
    for (let i = 1; i <= RINGS; i++) {
      const rr = R * i / RINGS
      g.strokeStyle = 'rgba(46,255,163,0.13)'
      g.setLineDash([2, 4])
      g.beginPath(); g.arc(CX, CY, rr, 0, Math.PI * 2); g.stroke()
      g.setLineDash([])
      g.fillStyle = 'rgba(79,154,122,0.7)'
      g.fillText((40 * i / RINGS) + 'NM', CX + 4, CY - rr + 12)
    }

    for (let deg = 0; deg < 360; deg += 5) {
      const a = (deg - 90) * Math.PI / 180
      const major = deg % 30 === 0
      const r1 = major ? R - 14 : R - 6
      const x1 = CX + Math.cos(a) * r1, y1 = CY + Math.sin(a) * r1
      const x2 = CX + Math.cos(a) * R, y2 = CY + Math.sin(a) * R
      g.strokeStyle = major ? 'rgba(46,255,163,0.35)' : 'rgba(46,255,163,0.14)'
      g.lineWidth = major ? 1.4 : 1
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke()
      if (major) {
        const lr = R - 26
        const lx = CX + Math.cos(a) * lr, ly = CY + Math.sin(a) * lr
        g.fillStyle = 'rgba(159,245,207,0.65)'
        g.font = "9px 'Share Tech Mono'"
        g.textAlign = 'center'; g.textBaseline = 'middle'
        g.fillText(pad3(deg), lx, ly)
      }
    }
    g.strokeStyle = 'rgba(46,255,163,0.10)'
    g.lineWidth = 1
    ;[0, 90, 180, 270].forEach((deg) => {
      const a = (deg - 90) * Math.PI / 180
      g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); g.stroke()
    })
    g.textAlign = 'start'; g.textBaseline = 'alphabetic'
    g.restore()
  }

  function drawSweep(g: CanvasRenderingContext2D, CX: number, CY: number, R: number) {
    g.save()
    g.translate(CX, CY)
    const trailSpan = Math.PI * 0.42
    const steps = 28
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const a0 = sweepAngle.current - trailSpan * t
      const a1 = sweepAngle.current - trailSpan * (t + 1 / steps)
      const alpha = (1 - t) * (1 - t) * 0.20
      g.beginPath()
      g.moveTo(0, 0)
      g.arc(0, 0, R, a0, a1, true)
      g.closePath()
      g.fillStyle = 'rgba(46,255,163,' + alpha + ')'
      g.fill()
    }
    const lx = Math.cos(sweepAngle.current) * R
    const ly = Math.sin(sweepAngle.current) * R
    const grad = g.createLinearGradient(0, 0, lx, ly)
    grad.addColorStop(0, 'rgba(180,255,220,0.95)')
    grad.addColorStop(0.5, 'rgba(46,255,163,0.85)')
    grad.addColorStop(1, 'rgba(46,255,163,0.25)')
    g.strokeStyle = grad
    g.lineWidth = 2.4
    g.shadowColor = 'rgba(46,255,163,0.9)'; g.shadowBlur = 14
    g.beginPath(); g.moveTo(0, 0); g.lineTo(lx, ly); g.stroke()
    g.shadowBlur = 0
    g.fillStyle = 'rgba(220,255,235,0.9)'
    g.beginPath(); g.arc(lx, ly, 3, 0, Math.PI * 2); g.fill()
    g.restore()
  }

  function drawPings(g: CanvasRenderingContext2D, CX: number, CY: number, R: number, dt: number) {
    g.save()
    const ps = pings.current
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.r += R * 1.1 * dt
      p.life -= dt
      const prog = p.r / R
      const alpha = Math.max(0, 1 - prog) * 0.6
      if (p.r > R || p.life <= 0) { ps.splice(i, 1); continue }
      g.strokeStyle = 'rgba(63,224,255,' + alpha + ')'
      g.lineWidth = 2
      g.shadowColor = 'rgba(63,224,255,0.6)'; g.shadowBlur = 10
      g.beginPath(); g.arc(CX, CY, p.r, 0, Math.PI * 2); g.stroke()
      g.shadowBlur = 0
    }
    g.restore()
  }

  function drawLockBox(g: CanvasRenderingContext2D, x: number, y: number, CX: number, CY: number) {
    const bs = 22 + Math.sin(lockPhaseTime.current * 3.2) * 2
    g.save()
    g.strokeStyle = 'rgba(255,176,49,0.95)'
    g.lineWidth = 1.8
    g.shadowColor = 'rgba(255,176,49,0.7)'; g.shadowBlur = 8
    const cl = 8
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
    corners.forEach(([sx, sy]) => {
      g.beginPath()
      g.moveTo(x + sx * bs, y + sy * bs - sy * cl)
      g.lineTo(x + sx * bs, y + sy * bs)
      g.lineTo(x + sx * bs - sx * cl, y + sy * bs)
      g.stroke()
    })
    g.shadowBlur = 0
    g.strokeStyle = 'rgba(255,176,49,0.4)'
    g.setLineDash([4, 4])
    g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke()
    g.setLineDash([])
    g.font = "9px 'Share Tech Mono'"
    g.fillStyle = 'rgba(255,176,49,0.95)'
    g.textAlign = 'center'
    g.fillText('LOCKED', x, y - bs - 6)
    g.textAlign = 'start'
    g.restore()
  }

  function drawContacts(g: CanvasRenderingContext2D, CX: number, CY: number, R: number) {
    g.save()
    contacts.current.forEach((c) => {
      if (!c._detected) return
      if (!activeFilters.current[c.type as keyof typeof activeFilters.current]) return
      const rr = R * c.ring
      const x = CX + Math.cos(c._a) * rr
      const y = CY + Math.sin(c._a) * rr
      const isSel = selected.current === c
      const isHover = hoverContact.current === c
      const glow = Math.max(c._glow, isSel ? 0.5 : 0, isHover ? 0.4 : 0)
      const col = typeColRgb(c.type)

      const halo = g.createRadialGradient(x, y, 0, x, y, 8 + glow * 18)
      halo.addColorStop(0, 'rgba(' + col + ',' + glow * 0.55 + ')')
      halo.addColorStop(1, 'rgba(' + col + ',0)')
      g.fillStyle = halo
      g.beginPath(); g.arc(x, y, 8 + glow * 18, 0, Math.PI * 2); g.fill()

      g.strokeStyle = 'rgba(' + col + ',' + glow * 0.9 + ')'
      g.fillStyle = 'rgba(' + col + ',' + glow * 0.85 + ')'
      g.lineWidth = 1.6
      const sz = 5
      if (c.type === 'agent' || c.priority) {
        g.beginPath()
        g.moveTo(x, y - sz - 1); g.lineTo(x + sz + 1, y); g.lineTo(x, y + sz + 1); g.lineTo(x - sz - 1, y)
        g.closePath(); g.stroke()
        g.fillStyle = 'rgba(' + col + ',' + glow * 0.6 + ')'; g.fill()
      } else if (c.type === 'gate') {
        g.beginPath(); g.arc(x, y, sz + 1, 0, Math.PI * 2); g.stroke()
        g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 1, y + 2.5); g.lineTo(x + 3.5, y - 3); g.stroke()
      } else if (c.type === 'signal') {
        g.beginPath(); g.arc(x, y, sz - 1, 0, Math.PI * 2); g.fill()
        g.beginPath(); g.arc(x, y, sz + 2, 0, Math.PI * 2); g.stroke()
      } else {
        g.beginPath(); g.rect(x - sz, y - sz, sz * 2, sz * 2); g.stroke()
        g.fillStyle = 'rgba(' + col + ',' + glow * 0.5 + ')'; g.fillRect(x - sz, y - sz, sz * 2, sz * 2)
      }

      const labAlpha = glow * 0.8
      g.font = (c.priority || c.type === 'gate') ? "600 11px 'IBM Plex Sans KR'" : "10px 'IBM Plex Sans KR'"
      g.fillStyle = 'rgba(' + col + ',' + labAlpha + ')'
      g.textAlign = x > CX ? 'left' : 'right'
      const ox = x > CX ? sz + 8 : -(sz + 8)
      g.fillText(c.id, x + ox, y + 3)
      g.font = "8px 'Share Tech Mono'"
      g.fillStyle = 'rgba(' + col + ',' + labAlpha * 0.8 + ')'
      g.fillText('TRK' + String(c._trk).padStart(2, '0'), x + ox, y - 8)

      if (isSel) drawLockBox(g, x, y, CX, CY)
      g.textAlign = 'start'
    })
    g.restore()
  }

  function drawCursor(g: CanvasRenderingContext2D, CX: number, CY: number, R: number) {
    const m = mouse.current
    if (!m.inScope) return
    const dx = m.x - CX, dy = m.y - CY
    const dist = Math.hypot(dx, dy)
    if (dist > R) {
      if (curBrgRef.current) curBrgRef.current.textContent = 'BRG ---deg'
      if (curRngRef.current) curRngRef.current.textContent = 'RNG -- NM'
      return
    }
    const a = Math.atan2(dy, dx)
    const brg = ((a * 180 / Math.PI) + 90 + 360) % 360
    const rng = dist / R * 40
    if (curBrgRef.current) curBrgRef.current.textContent = 'BRG ' + pad3(brg) + 'deg'
    if (curRngRef.current) curRngRef.current.textContent = 'RNG ' + rng.toFixed(1) + ' NM'
    g.save()
    g.strokeStyle = 'rgba(46,255,163,0.4)'
    g.lineWidth = 1; g.setLineDash([3, 3])
    g.beginPath(); g.moveTo(CX, CY); g.lineTo(m.x, m.y); g.stroke()
    g.setLineDash([])
    g.strokeStyle = 'rgba(46,255,163,0.7)'
    g.beginPath()
    g.moveTo(m.x - 7, m.y); g.lineTo(m.x + 7, m.y)
    g.moveTo(m.x, m.y - 7); g.lineTo(m.x, m.y + 7)
    g.stroke()
    g.beginPath(); g.arc(m.x, m.y, 4, 0, Math.PI * 2); g.stroke()
    g.restore()
  }

  function drawCenter(g: CanvasRenderingContext2D, CX: number, CY: number) {
    g.save()
    g.fillStyle = 'rgba(220,255,235,0.9)'
    g.beginPath(); g.arc(CX, CY, 3, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(46,255,163,0.5)'
    g.beginPath(); g.arc(CX, CY, 7, 0, Math.PI * 2); g.stroke()
    g.restore()
  }

  // --- Main draw callback ---
  const ref = useSceneCanvas(
    (g: CanvasRenderingContext2D, fr: Frame) => {
      const W = fr.w, H = fr.h
      const CX = W / 2, CY = H / 2
      const R = Math.min(W, H) * 0.46

      // store for mouse hit-test
      scopeGeom.current = { W, H, CX, CY, R }

      const dt = Math.min(fr.dt, 0.05)

      updateDetection(dt)

      // reset cycle when all detected
      if (contacts.current.every((c) => c._detected)) {
        acqHold.current += dt
        if (acqHold.current > 2.2) {
          resetAcquisition()
          acqHold.current = 0
        }
      } else {
        acqHold.current = 0
      }

      // drift + glow decay
      contacts.current.forEach((c) => {
        if (c._glow > 0) c._glow = Math.max(0, c._glow - dt / 3.8)
        if (c._detected) {
          c._driftT += c._driftSpeed * dt
          c._a = c._baseA + Math.sin(c._driftT) * c._driftAmp
          c.ring = c._baseRing + Math.sin(c._driftT * 0.7 + 1.3) * c._driftRingAmp
        }
      })

      // sweep bearing readout
      let brgDeg = ((sweepAngle.current * 180 / Math.PI) + 90) % 360
      if (brgDeg < 0) brgDeg += 360
      if (hudBearingRef.current) hudBearingRef.current.textContent = pad3(brgDeg) + '°'

      g.clearRect(0, 0, W, H)

      // background radial glow
      const bg = g.createRadialGradient(CX, CY, 0, CX, CY, R * 1.15)
      bg.addColorStop(0, 'rgba(20,70,45,0.35)')
      bg.addColorStop(0.6, 'rgba(8,40,26,0.18)')
      bg.addColorStop(1, 'rgba(2,10,6,0)')
      g.fillStyle = bg
      g.beginPath(); g.arc(CX, CY, R * 1.15, 0, Math.PI * 2); g.fill()

      drawGrid(g, CX, CY, R)
      drawPings(g, CX, CY, R, dt)
      drawSweep(g, CX, CY, R)
      drawContacts(g, CX, CY, R)
      drawCursor(g, CX, CY, R)
      drawCenter(g, CX, CY)
    },
    { running },
  )

  // --- Canvas mouse events ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      // forward to useSceneCanvas ref
      ;(ref as unknown as React.RefCallback<HTMLCanvasElement>)(node)
      canvasRef.current = node
    },
    [ref],
  )

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    function getContactAt(mx: number, my: number): Contact | null {
      const { CX, CY, R } = scopeGeom.current
      let best: Contact | null = null
      let bd = 18
      contacts.current.forEach((c) => {
        if (!c._detected || !activeFilters.current[c.type as keyof typeof activeFilters.current]) return
        const rr = R * c.ring
        const x = CX + Math.cos(c._a) * rr
        const y = CY + Math.sin(c._a) * rr
        const d = Math.hypot(mx - x, my - y)
        if (d < bd) { bd = d; best = c }
      })
      return best
    }

    function onMouseMove(e: MouseEvent) {
      const r = cv!.getBoundingClientRect()
      mouse.current.x = e.clientX - r.left
      mouse.current.y = e.clientY - r.top
      mouse.current.inScope = true
      const c = getContactAt(mouse.current.x, mouse.current.y)
      hoverContact.current = c
      cv!.style.cursor = c ? 'pointer' : 'crosshair'
    }
    function onMouseLeave() {
      mouse.current.inScope = false
      hoverContact.current = null
    }
    function onCanvasClick(e: MouseEvent) {
      const r = cv!.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const c = getContactAt(mx, my)
      if (c) selectContactRef.current(c)
    }

    cv.addEventListener('mousemove', onMouseMove)
    cv.addEventListener('mouseleave', onMouseLeave)
    cv.addEventListener('click', onCanvasClick)
    return () => {
      cv.removeEventListener('mousemove', onMouseMove)
      cv.removeEventListener('mouseleave', onMouseLeave)
      cv.removeEventListener('click', onCanvasClick)
    }
  }, [])

  // --- Live table / HUD noise intervals ---
  useEffect(() => {
    if (!running) return

    function liveTableTick() {
      const tb = trackBodyRef.current
      if (!tb) return
      const rows = tb.querySelectorAll<HTMLElement>('[data-idx]')
      rows.forEach((row) => {
        const idx = parseInt(row.dataset.idx ?? 'NaN', 10)
        if (isNaN(idx)) return
        const c = contacts.current[idx]
        if (!c || !c._detected) return
        c._liveDriftT += 0.035 + Math.random() * 0.015
        const brgDrift = Math.sin(c._liveDriftT) * 1.8
        const rngDrift = Math.sin(c._liveDriftT * 0.7 + 0.5) * 0.4
        const liveBrg = ((c.brg + brgDrift + 360) % 360) | 0
        const liveRng = Math.max(0, c.ring * 40 + rngDrift)
        const cells = row.querySelectorAll<HTMLElement>('span')
        if (cells[1]) cells[1].textContent = pad3(liveBrg) + 'deg'
        if (cells[2]) cells[2].textContent = liveRng.toFixed(0) + 'N'
        if (!c._verified && cells[4]) {
          const chip = cells[4].querySelector<HTMLElement>('.vchip-el')
          if (chip && chip.classList.contains(s.vchipPending)) {
            const labels = ['SCANNING', 'TRACKING', 'ACQUIRE']
            if (Math.random() < 0.08) chip.textContent = labels[(Math.random() * labels.length) | 0]
          }
        }
      })

      const fakeRows = fakeRowsRef.current
      fakeRows.forEach((fr) => {
        fr.driftT += 0.04
        const bLive = ((fr.brgBase + Math.sin(fr.driftT) * 2.1 + 360) % 360) | 0
        const rLive = Math.max(1, fr.rngBase + Math.sin(fr.driftT * 0.6) * 0.6)
        const cells = fr.el.querySelectorAll<HTMLElement>('span')
        if (cells[1]) cells[1].textContent = pad3(bLive) + 'deg'
        if (cells[2]) cells[2].textContent = rLive.toFixed(0) + 'N'
        fr.statusT = (fr.statusT || 0) + 1
        if (fr.statusT % 18 === 0) {
          const chip = fr.el.querySelector<HTMLElement>('.vchip-el')
          if (chip) {
            const cycle = ['SCANNING', 'TRACKING', 'LOCKED']
            fr.statusIdx = ((fr.statusIdx || 0) + 1) % cycle.length
            chip.textContent = cycle[fr.statusIdx]
            chip.className = 'vchip-el ' + s.vchip + ' ' + (fr.statusIdx === 2 ? s.vchipVerified : s.vchipPending)
          }
        }
      })

      const detected = contacts.current.filter((c) => c._detected)
      if (fakeRows.length < 3 && detected.length >= 4 && Math.random() < 0.18) {
        const sig = FAKE_SIGNALS[fakeIdxRef.current % FAKE_SIGNALS.length]
        fakeIdxRef.current++
        const row = document.createElement('div')
        row.className = s.trackRow
        row.dataset.idx = 'fake'
        const trkNo = 'F' + String(fakeIdxRef.current).padStart(2, '0')
        const rngBase = sig.ring * 40

        const trkSpan = document.createElement('span')
        trkSpan.className = s.trackTrk
        trkSpan.style.color = '#4f9a7a'
        trkSpan.textContent = trkNo
        const brgSpan = document.createElement('span')
        brgSpan.textContent = pad3(sig.brg) + 'deg'
        const rngSpan = document.createElement('span')
        rngSpan.textContent = rngBase.toFixed(0) + 'N'
        const typSpan = document.createElement('span')
        typSpan.className = s.trackTyp + ' ' + typCls(sig.type)
        typSpan.textContent = 'EXT'
        const idSpan = document.createElement('span')
        idSpan.className = s.trackId
        idSpan.textContent = sig.id
        const chip = document.createElement('span')
        chip.className = 'vchip-el ' + s.vchip + ' ' + s.vchipPending
        chip.textContent = 'SCANNING'
        idSpan.appendChild(chip)

        row.appendChild(trkSpan)
        row.appendChild(brgSpan)
        row.appendChild(rngSpan)
        row.appendChild(typSpan)
        row.appendChild(idSpan)

        if (tb) {
          tb.appendChild(row)
          requestAnimationFrame(() => row.classList.add(s.trackRowIn))
          tb.scrollTop = tb.scrollHeight
        }
        const fr: FakeRow = { el: row, brgBase: sig.brg, rngBase, driftT: Math.random() * Math.PI * 2, statusIdx: 0, statusT: 0 }
        fakeRows.push(fr)
        const ttl = 18000 + Math.random() * 10000
        setTimeout(() => {
          row.style.transition = 'opacity 0.8s'
          row.style.opacity = '0'
          setTimeout(() => {
            if (row.parentNode) row.parentNode.removeChild(row)
            fakeRowsRef.current = fakeRowsRef.current.filter((f) => f !== fr)
          }, 800)
        }, ttl)
      }
    }

    function hudNoiseTick() {
      const det = contacts.current.filter((c) => c._detected).length
      if (det > 0 && liveDetRef.current) {
        const noise = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0
        liveDetRef.current.textContent = String(Math.max(0, det + noise))
      }
      const pri = contacts.current.filter((c) => c._detected && (c.priority || c.type === 'gate')).length
      if (pri > 0 && livePriRef.current && Math.random() < 0.1) {
        livePriRef.current.textContent = String(Math.max(0, pri + (Math.random() < 0.5 ? 1 : 0)))
      }
    }

    function clockTick() {
      const d = new Date()
      if (clockRef.current) clockRef.current.textContent = d.toISOString().substring(11, 19)
    }

    clockTick()
    const t1 = setInterval(liveTableTick, 420)
    const t2 = setInterval(hudNoiseTick, 1100)
    const t3 = setInterval(clockTick, 1000)
    return () => {
      clearInterval(t1)
      clearInterval(t2)
      clearInterval(t3)
    }
  }, [running])

  // --- Keyboard / global event for modal close ---
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDetail()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeDetail])

  // --- Boot: escalate S0 + HUD init ---
  useEffect(() => {
    escalatePhase(0)
    updateHUD()
  }, [escalatePhase, updateHUD])

  // --- Legend filter toggle handlers ---
  function handleFilterToggle(type: 'signal' | 'surface' | 'agent' | 'gate', rowRef: React.RefObject<HTMLDivElement | null>) {
    return () => {
      activeFilters.current[type] = !activeFilters.current[type]
      rowRef.current?.classList.toggle(s.legendRowOff, !activeFilters.current[type])
    }
  }

  return (
    <SceneHost className={s.root} bg="#020705">
      <div className={s.shell}>
        {/* TOP BAR */}
        <header className={s.topbar}>
          <div className={s.tag}>
            <span className={s.tagK}>MODE</span>
            <span className={s.tagV}>PPI / SCAN</span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>SIGNALS</span>
            <span className={s.tagV}><span ref={hudRangeRef}>11 CH</span></span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>AUTONOMY</span>
            <span className={`${s.tagV} ${s.tagVAmb}`}>BOUNDED</span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>GATE</span>
            <span className={s.tagV}>HUMAN</span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>SWEEP</span>
            <span className={s.tagV}><span ref={hudBearingRef}>000°</span></span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>CONTACTS</span>
            <span className={`${s.tagV} ${s.tagVAmb}`}><span ref={hudContactsRef}>0 / 20</span></span>
          </div>
          <div className={s.tag} ref={hudPhaseTagRef} title="Work Radar -- Boule Governance readiness gate">
            <span className={s.tagK}>SURFACE</span>
            <span className={`${s.tagV} ${s.tagVCyn}`}><span ref={hudPhaseRef}>S0 · CAPTURE BOARD</span></span>
          </div>
          <div className={s.tag}>
            <span className={s.tagK}>LOCKED</span>
            <span className={s.tagV}><span ref={hudVerifiedRef}>0 / 20</span></span>
          </div>
          <div className={s.topbarSys}>
            <span className={s.topbarTitle}><b>WORK RADAR</b> COCKPIT</span>
            <span className={s.blink} />
            <span className={s.topbarOnline}>ONLINE</span>
          </div>
        </header>

        {/* LEFT PANEL */}
        <aside className={s.left}>
          <div className={s.ident}>
            <span className={`${s.corner} ${s.cornerTl}`} />
            <span className={`${s.corner} ${s.cornerTr}`} />
            <span className={`${s.corner} ${s.cornerBl}`} />
            <span className={`${s.corner} ${s.cornerBr}`} />
            <div className={s.identName}>WORK RADAR</div>
            <div className={s.identEn}>OPERATOR</div>
            <div className={s.identRole}>Work Radar · local-first AI 워크플로우 관제 콕핏</div>
          </div>

          <div className={s.sectionH}>SIGNAL CLASS <span>FILTER</span></div>
          <div className={s.legend}>
            <div className={s.legendRow} ref={legendSignalRef} onClick={handleFilterToggle('signal', legendSignalRef)}>
              <span className={s.legendSym}>
                <svg width="20" height="20"><circle cx="10" cy="10" r="3.5" fill="#2effa3"/><circle cx="10" cy="10" r="6.5" fill="none" stroke="#2effa3" strokeWidth="1.4"/></svg>
              </span>
              <span className={s.legendLbl}>외부 신호 SIGNAL</span>
              <span className={s.legendCnt} ref={cntSignalRef}>0</span>
            </div>
            <div className={s.legendRow} ref={legendSurfaceRef} onClick={handleFilterToggle('surface', legendSurfaceRef)}>
              <span className={s.legendSym}>
                <svg width="20" height="20"><rect x="5" y="5" width="10" height="10" fill="none" stroke="#3fe0ff" strokeWidth="1.4"/><rect x="7" y="7" width="6" height="6" fill="rgba(63,224,255,0.4)"/></svg>
              </span>
              <span className={s.legendLbl}>운영 서피스 SURFACE</span>
              <span className={s.legendCnt} ref={cntSurfaceRef}>0</span>
            </div>
            <div className={s.legendRow} ref={legendAgentRef} onClick={handleFilterToggle('agent', legendAgentRef)}>
              <span className={s.legendSym}>
                <svg width="20" height="20"><path d="M10 3 L17 10 L10 17 L3 10 Z" fill="rgba(255,176,49,0.4)" stroke="#ffb031" strokeWidth="1.4"/></svg>
              </span>
              <span className={s.legendLbl}>에이전트 AGENT</span>
              <span className={s.legendCnt} ref={cntAgentRef}>0</span>
            </div>
            <div className={s.legendRow} ref={legendGateRef} onClick={handleFilterToggle('gate', legendGateRef)}>
              <span className={s.legendSym}>
                <svg width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="#fff" strokeWidth="1.4"/><path d="M6 10 L9 13 L14 6" fill="none" stroke="#fff" strokeWidth="1.6"/></svg>
              </span>
              <span className={s.legendLbl}>거버넌스 GATE</span>
              <span className={s.legendCnt} ref={cntGateRef}>0</span>
            </div>
          </div>

          <div className={s.sectionH}>SURFACE STACK <span>운영 레이어</span></div>
          <div className={s.ladder}>
            {SURFACE_STACK.map((item, i) => (
              <div
                key={item.px}
                className={s.lad}
                ref={(el) => { ladRefs.current[i] = el }}
              >
                <span className={s.ladPx}>{item.px}</span>
                <span className={s.ladPl}>{item.label}<small>{item.sub}</small></span>
              </div>
            ))}
            <div className={s.ladRule}>▲ 자동화 많을수록 인간 가시성 확보</div>
          </div>

          <div className={s.creed}>
            <div className={s.creedQ}>
              "자동화가 많아질수록, <b>인간이 운영 상태를 이해하고 멈출 수 있게</b> 정보를 아키텍처한다."
            </div>
            <div className={s.creedR}>
              BOULE GOVERNANCE · tick_enabled · max_steps · autonomy_level · 인간 승인 게이트
            </div>
          </div>

          <div className={s.sectionH}>SENSOR STATUS</div>
          <div className={s.hudGrid}>
            <div className={s.hudCell}>
              <div className={s.hudCellK}>DETECTED</div>
              <div className={s.hudCellV}><span ref={liveDetRef}>0</span><small>/20</small></div>
            </div>
            <div className={`${s.hudCell} ${s.hudCellAmb}`}>
              <div className={s.hudCellK}>PRIORITY</div>
              <div className={s.hudCellV}><span ref={livePriRef}>0</span><small>SIG</small></div>
            </div>
            <div className={s.hudCell}>
              <div className={s.hudCellK}>SWEEP RPM</div>
              <div className={s.hudCellV}>12<small>rpm</small></div>
            </div>
            <div className={s.hudCell}>
              <div className={s.hudCellK}>PERSIST</div>
              <div className={s.hudCellV}>4.5<small>s</small></div>
            </div>
            <div className={s.hudCell}>
              <div className={s.hudCellK}>LOCKED</div>
              <div className={s.hudCellV}><span ref={liveResRef}>0</span><small>sig</small></div>
            </div>
            <div className={`${s.hudCell} ${s.hudCellAmb}`}>
              <div className={s.hudCellK}>GATE</div>
              <div className={s.hudCellV}>HUMAN</div>
            </div>
          </div>
        </aside>

        {/* CENTER SCOPE */}
        <main className={s.scopeWrap}>
          <canvas ref={setCanvasRef} className={s.c} />
          <div className={s.scopeOverlay}>
            <div className={`${s.ovCorner} ${s.ovCornerTl}`}>
              SCOPE-01 <b>ACTIVE</b><br />Work Radar v0.1<br />local-first desktop
            </div>
            <div className={`${s.ovCorner} ${s.ovCornerTr}`}>
              SCAN <b>360°</b> CONTINUOUS<br />BOULE GATE <b>ON</b><br />Tauri 2 · Rust · SQLite
            </div>
            <div className={`${s.ovCorner} ${s.ovCornerBl}`}>
              CURSOR<br /><span ref={curBrgRef}>BRG ---°</span><br /><span ref={curRngRef}>RNG -- NM</span>
            </div>
            <div className={`${s.ovCorner} ${s.ovCornerBr}`}>
              SIG LOCK<br /><b><span ref={lockStateRef}>STANDBY</span></b><br /><span ref={lockIdRef}>--</span><br /><span ref={lockVerdictRef} style={{ color: '#4f9a7a' }}>STATUS --</span>
            </div>
          </div>
          <button
            className={s.pingBtn}
            onClick={() => {
              pings.current.push({ r: 6, life: 1.4 })
              escalatePhase(1)
              setTicker('ACTIVE PING (S1) -- Today Timeline 서피스 신호 재조사 · drag 배치 큐 갱신 중')
            }}
          >
            ▷ ACTIVE PING (SIGNAL SCAN)
          </button>
        </main>

        {/* RIGHT TRACK TABLE */}
        <aside className={s.right}>
          <div className={s.rightHead}>
            <div className={s.rightHeadT}>SIGNAL TRACK TABLE</div>
            <div className={s.rightHeadS}>들어오는 작업 신호 탐지 · 서피스 배정 · 락온</div>
          </div>
          <div className={s.trackHead}>
            <span>TRK#</span><span>BRG</span><span>RNG</span><span>SURF</span><span>ID · STATUS</span>
          </div>
          <div className={s.trackBody} ref={trackBodyRef} />
          <div className={s.rightFoot}>COMMS · WORK RADAR</div>
        </aside>

        {/* BOTTOM STATUS */}
        <footer className={s.statusbar}>
          <div className={s.statusSeg}>SYS<b>NOMINAL</b></div>
          <div className={s.statusSeg}>STACK<b>Tauri/Rust</b></div>
          <div className={s.statusSeg}>DB<b>SQLite</b></div>
          <div className={s.statusTicker}>
            <span className={s.statusTickerSpan} ref={tickerRef}>
              Work Radar -- 캘린더 PR Notion 백로그 worktree AI agent 세션 루틴이 서로 다른 속도로 들어올 때, 지금 무엇을 봐야 하는지를 잃지 않게 하는 local-first 데스크톱 관제 콕핏 · Boule Governance: tick_enabled interval_sec max_steps autonomy_level · 인간 승인 게이트
            </span>
          </div>
          <div className={s.statusSeg}>UTC<b><span ref={clockRef}>--:--:--</span></b></div>
        </footer>
      </div>

      {/* DETAIL MODAL */}
      <div className={s.detail} ref={detailRef} onClick={(e) => { if (e.target === detailRef.current) closeDetail() }}>
        <div className={s.detailCard}>
          <span className={`${s.dcCorner} ${s.dcCornerTl}`} />
          <span className={`${s.dcCorner} ${s.dcCornerTr}`} />
          <span className={`${s.dcCorner} ${s.dcCornerBl}`} />
          <span className={`${s.dcCorner} ${s.dcCornerBr}`} />
          <div className={s.dcHead}>
            <div>
              <div className={s.dcTrkno} ref={dcTrkRef}>TRK-00</div>
              <div className={s.dcId} ref={dcIdRef}>--</div>
              <div className={s.dcSub} ref={dcSubRef}>--</div>
            </div>
            <button className={s.dcClose} onClick={closeDetail}>×</button>
          </div>
          <div className={s.dcSolution}>
            <div className={s.dcSolCell}><div className={s.dcSolK}>BEARING</div><div className={s.dcSolV} ref={dcBrgRef}>000°</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>RANGE</div><div className={s.dcSolV} ref={dcRngRef}>0 NM</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>CLASS</div><div className={s.dcSolV} ref={dcClassRef}>--</div></div>
            <div className={s.dcSolCell}><div className={s.dcSolK}>CONF</div><div className={s.dcSolV} ref={dcConfRef}>99%</div></div>
          </div>
          <div className={s.dcBody}>
            <div className={s.dcVerdict} ref={dcVerdictRef} />
            <div className={s.dcDesc} ref={dcDescRef} />
            <div className={s.dcAch} ref={dcAchRef} />
            <div className={s.dcTags} ref={dcTagsRef} />
          </div>
        </div>
      </div>
    </SceneHost>
  )
}
