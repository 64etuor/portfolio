// Work Radar — radar-sonar 씬 런타임/상태 엔진 (HUD·탐지·트랙테이블·라이브 틱)
// 클로저 상태는 SceneRefs/SceneState 로 명시적으로 주입한다.
// 동작/타이밍/rAF/캔버스 출력은 원본 Scene.tsx 와 1:1 동일.

import { SWEEP_SPEED } from './constants'
import { pad3, typeAbbr, typeKo } from './helpers'
import { PHASE_LABEL, PHASE_KO, FAKE_SIGNALS } from './data'
import type { Contact, FakeRow, SceneRefs, SceneState } from './types'

type Styles = Record<string, string>

export function typCls(s: Styles, type: string) {
  if (type === 'signal') return s.typSignal
  if (type === 'surface') return s.typSurface
  if (type === 'agent') return s.typAgent
  return s.typGate
}

export interface Runtime {
  setTicker: (text: string) => void
  updateHUD: () => void
  escalatePhase: (p: number) => void
  setLockVerdict: (c: Contact) => void
  verifyContact: (c: Contact) => void
  openDetail: (c: Contact) => void
  closeDetail: () => void
  renderTrackRow: (c: Contact) => void
  selectContact: (c: Contact) => void
  resetAcquisition: () => void
  onAcquire: (c: Contact) => void
  onReacquire: (c: Contact) => void
  updateDetection: (dt: number) => void
  getContactAt: (mx: number, my: number) => Contact | null
  liveTableTick: () => void
  hudNoiseTick: () => void
  clockTick: () => void
}

/**
 * 씬 런타임 엔진 생성. Scene.tsx 가 마운트당 1회 생성해 동일 인스턴스를
 * effect/draw 에서 재사용한다 (refs/state/style 은 안정적인 ref 묶음).
 */
export function createRuntime(refs: SceneRefs, st: SceneState, s: Styles): Runtime {
  const setTicker = (text: string) => {
    if (refs.tickerRef.current) {
      refs.tickerRef.current.textContent =
        text +
        ' · Work Radar: 지금 무엇을 봐야 하는지를 잃지 않게 하는 local-first 관제 콕핏 · Boule Governance: 자동화 많을수록 인간 가시성 확보'
    }
  }

  const updateHUD = () => {
    const cs = st.contacts.current
    const det = cs.filter((c) => c._detected).length
    const ver = cs.filter((c) => c._verified).length
    const pri = cs.filter((c) => c._detected && (c.priority || c.type === 'gate')).length
    if (refs.hudContactsRef.current) refs.hudContactsRef.current.textContent = det + ' / ' + cs.length
    if (refs.hudVerifiedRef.current) refs.hudVerifiedRef.current.textContent = ver + ' / ' + cs.length
    if (refs.liveDetRef.current) refs.liveDetRef.current.textContent = String(det)
    if (refs.livePriRef.current) refs.livePriRef.current.textContent = String(pri)
    if (refs.liveResRef.current) refs.liveResRef.current.textContent = String(ver)
    if (refs.cntSignalRef.current) refs.cntSignalRef.current.textContent = String(cs.filter((c) => c.type === 'signal' && c._detected).length)
    if (refs.cntSurfaceRef.current) refs.cntSurfaceRef.current.textContent = String(cs.filter((c) => c.type === 'surface' && c._detected).length)
    if (refs.cntAgentRef.current) refs.cntAgentRef.current.textContent = String(cs.filter((c) => c.type === 'agent' && c._detected).length)
    if (refs.cntGateRef.current) refs.cntGateRef.current.textContent = String(cs.filter((c) => c.type === 'gate' && c._detected).length)
  }

  const escalatePhase = (p: number) => {
    if (p > st.maxPhase.current) st.maxPhase.current = p
    if (refs.hudPhaseRef.current) refs.hudPhaseRef.current.textContent = PHASE_LABEL[st.maxPhase.current]
    // flash animation: remove then re-add class
    const tag = refs.hudPhaseTagRef.current
    if (tag) {
      tag.classList.remove(s.tagFlash)
      // force reflow
      void tag.offsetWidth
      tag.classList.add(s.tagFlash)
    }
    refs.ladRefs.current.forEach((el, lp) => {
      if (!el) return
      el.classList.toggle(s.ladActive, lp === st.maxPhase.current)
      el.classList.toggle(s.ladReached, lp < st.maxPhase.current)
    })
  }

  const setLockVerdict = (c: Contact) => {
    const el = refs.lockVerdictRef.current
    if (!el) return
    if (c._verified) {
      el.textContent = 'STATUS LOCKED'
      el.style.color = '#2effa3'
    } else {
      el.textContent = 'STATUS SCANNING'
      el.style.color = '#ffb031'
    }
  }

  const verifyContact = (c: Contact) => {
    if (!c._detected) return
    if (c._verified) return
    c._verified = true
    // find row and update chip
    const rows = refs.trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]')
    rows?.forEach((row) => {
      if (row.dataset.idx === String(st.contacts.current.indexOf(c))) {
        const chip = row.querySelector<HTMLElement>('.vchip-el')
        if (chip) {
          chip.className = 'vchip-el ' + s.vchip + ' ' + s.vchipVerified
          chip.textContent = 'LOCKED'
        }
      }
    })
    if (st.selected.current === c) setLockVerdict(c)
    updateHUD()
  }

  const openDetail = (c: Contact) => {
    if (refs.dcTrkRef.current) refs.dcTrkRef.current.textContent = 'TRK-' + String(c._trk).padStart(2, '0') + ' · ' + typeAbbr(c.type)
    if (refs.dcIdRef.current) refs.dcIdRef.current.textContent = c.id
    if (refs.dcSubRef.current) refs.dcSubRef.current.textContent = c.sub || ''
    if (refs.dcBrgRef.current) refs.dcBrgRef.current.textContent = pad3(c.brg) + 'deg'
    if (refs.dcRngRef.current) refs.dcRngRef.current.textContent = (c.ring * 40).toFixed(0) + ' NM'
    if (refs.dcClassRef.current) refs.dcClassRef.current.textContent = typeKo(c.type)
    if (refs.dcConfRef.current) refs.dcConfRef.current.textContent = (c.conf || 97) + '%'
    if (refs.dcVerdictRef.current) {
      const vstate = c._verified
        ? `<span class="${s.dcVerdictState} ${s.dcVerdictVerified}">LOCKED</span>`
        : `<span class="${s.dcVerdictState} ${s.dcVerdictPending}">SCANNING</span>`
      refs.dcVerdictRef.current.innerHTML =
        `<span class="${s.dcVerdictPhase}">${PHASE_LABEL[c._phase]}</span>` +
        vstate +
        `<span class="${s.dcVerdictNote}">서피스: ${PHASE_KO[c._phase]}</span>`
    }
    if (refs.dcDescRef.current) refs.dcDescRef.current.textContent = c.desc || ''
    if (refs.dcAchRef.current) {
      refs.dcAchRef.current.innerHTML = (c.ach || [])
        .map(
          ([b, x]) =>
            `<div class="${s.dcAchItem}"><span class="${s.dcAchItemB}">[${b}]</span><span class="${s.dcAchItemX}">${x}</span></div>`,
        )
        .join('')
    }
    if (refs.dcTagsRef.current) {
      refs.dcTagsRef.current.innerHTML = (c.tags || [])
        .map((t) => `<span class="${s.dcTag}">${t}</span>`)
        .join('')
    }
    refs.detailRef.current?.classList.add(s.detailOpen)
  }

  const closeDetail = () => {
    refs.detailRef.current?.classList.remove(s.detailOpen)
    if (refs.lockStateRef.current) {
      refs.lockStateRef.current.textContent = 'STANDBY'
      refs.lockStateRef.current.style.color = ''
    }
    if (refs.lockIdRef.current) refs.lockIdRef.current.textContent = '--'
    if (refs.lockVerdictRef.current) {
      refs.lockVerdictRef.current.textContent = 'STATUS --'
      refs.lockVerdictRef.current.style.color = '#4f9a7a'
    }
    st.selected.current = null
    refs.trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]').forEach((r) => r.classList.remove(s.trackRowSel))
  }

  const renderTrackRow = (c: Contact) => {
    const tb = refs.trackBodyRef.current
    if (!tb) return
    const row = document.createElement('div')
    row.className = s.trackRow
    row.dataset.idx = String(st.contacts.current.indexOf(c))
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
    surf.className = s.trackTyp + ' ' + typCls(s, c.type)
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
    row.addEventListener('mouseenter', () => { st.hoverContact.current = c })
    row.addEventListener('mouseleave', () => { if (st.hoverContact.current === c) st.hoverContact.current = null })
    tb.appendChild(row)
    requestAnimationFrame(() => row.classList.add(s.trackRowIn))
    tb.scrollTop = tb.scrollHeight
  }

  const selectContact = (c: Contact) => {
    st.selected.current = c
    refs.trackBodyRef.current?.querySelectorAll<HTMLElement>('[data-idx]').forEach((r) => r.classList.remove(s.trackRowSel))
    const row = refs.trackBodyRef.current?.querySelector<HTMLElement>(`[data-idx="${st.contacts.current.indexOf(c)}"]`)
    if (row) row.classList.add(s.trackRowSel)
    if (refs.lockStateRef.current) {
      refs.lockStateRef.current.textContent = 'LOCKED'
      refs.lockStateRef.current.style.color = '#ffb031'
    }
    if (refs.lockIdRef.current) refs.lockIdRef.current.textContent = 'TRK-' + String(c._trk).padStart(2, '0')
    setLockVerdict(c)
    st.pings.current.push({ r: 6, life: 1.2 })
    openDetail(c)
    const vk = c._verified ? 'LOCKED · 신호 확인 완료' : 'SCANNING · 탐지 진행 중'
    setTicker('신호 고정 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · ' + vk)
  }

  const resetAcquisition = () => {
    st.contacts.current.forEach((c) => {
      c._detected = false
      c._verified = false
      c._glow = 0
    })
    st.maxPhase.current = 0
    st.selected.current = null
    if (refs.trackBodyRef.current) refs.trackBodyRef.current.innerHTML = ''
    st.fakeRowsRef.current = []
    refs.ladRefs.current.forEach((el) => el?.classList.remove(s.ladActive, s.ladReached))
    if (refs.hudPhaseRef.current) refs.hudPhaseRef.current.textContent = '—'
    updateHUD()
    setTicker('스캔 1주기 완료 -- 신호 재취득 시작')
  }

  const onAcquire = (c: Contact) => {
    escalatePhase(c._phase)
    renderTrackRow(c)
    updateHUD()
    setTicker('신호 탐지 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · 락온 시작')
    setTimeout(() => verifyContact(c), 700 + Math.random() * 900)
  }

  const onReacquire = (c: Contact) => {
    c._glow = Math.max(c._glow || 0, 0.9)
    const now = performance.now()
    if (now - st.lastReann.current < 1500) return
    st.lastReann.current = now
    setTicker('재확인 -- TRK-' + String(c._trk).padStart(2, '0') + ' · ' + c.id + ' · ' + PHASE_LABEL[c._phase] + ' · 트랙 유지')
  }

  const updateDetection = (dt: number) => {
    st.sweepAngle.current += SWEEP_SPEED * dt
    st.lockPhaseTime.current += dt

    st.contacts.current.forEach((c) => {
      const norm = ((st.sweepAngle.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const ca = ((c._a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      const pa = ((st.prevSweep.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
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
    st.prevSweep.current = st.sweepAngle.current
  }

  const getContactAt = (mx: number, my: number): Contact | null => {
    const { CX, CY, R } = st.scopeGeom.current
    let best: Contact | null = null
    let bd = 18
    st.contacts.current.forEach((c) => {
      if (!c._detected || !st.activeFilters.current[c.type as keyof typeof st.activeFilters.current]) return
      const rr = R * c.ring
      const x = CX + Math.cos(c._a) * rr
      const y = CY + Math.sin(c._a) * rr
      const d = Math.hypot(mx - x, my - y)
      if (d < bd) { bd = d; best = c }
    })
    return best
  }

  const liveTableTick = () => {
    const tb = refs.trackBodyRef.current
    if (!tb) return
    const rows = tb.querySelectorAll<HTMLElement>('[data-idx]')
    rows.forEach((row) => {
      const idx = parseInt(row.dataset.idx ?? 'NaN', 10)
      if (isNaN(idx)) return
      const c = st.contacts.current[idx]
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

    const fakeRows = st.fakeRowsRef.current
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

    const detected = st.contacts.current.filter((c) => c._detected)
    if (fakeRows.length < 3 && detected.length >= 4 && Math.random() < 0.18) {
      const sig = FAKE_SIGNALS[st.fakeIdxRef.current % FAKE_SIGNALS.length]
      st.fakeIdxRef.current++
      const row = document.createElement('div')
      row.className = s.trackRow
      row.dataset.idx = 'fake'
      const trkNo = 'F' + String(st.fakeIdxRef.current).padStart(2, '0')
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
      typSpan.className = s.trackTyp + ' ' + typCls(s, sig.type)
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
          st.fakeRowsRef.current = st.fakeRowsRef.current.filter((f) => f !== fr)
        }, 800)
      }, ttl)
    }
  }

  const hudNoiseTick = () => {
    const det = st.contacts.current.filter((c) => c._detected).length
    if (det > 0 && refs.liveDetRef.current) {
      const noise = Math.random() < 0.15 ? (Math.random() < 0.5 ? 1 : -1) : 0
      refs.liveDetRef.current.textContent = String(Math.max(0, det + noise))
    }
    const pri = st.contacts.current.filter((c) => c._detected && (c.priority || c.type === 'gate')).length
    if (pri > 0 && refs.livePriRef.current && Math.random() < 0.1) {
      refs.livePriRef.current.textContent = String(Math.max(0, pri + (Math.random() < 0.5 ? 1 : 0)))
    }
  }

  const clockTick = () => {
    const d = new Date()
    if (refs.clockRef.current) refs.clockRef.current.textContent = d.toISOString().substring(11, 19)
  }

  return {
    setTicker,
    updateHUD,
    escalatePhase,
    setLockVerdict,
    verifyContact,
    openDetail,
    closeDetail,
    renderTrackRow,
    selectContact,
    resetAcquisition,
    onAcquire,
    onReacquire,
    updateDetection,
    getContactAt,
    liveTableTick,
    hudNoiseTick,
    clockTick,
  }
}
