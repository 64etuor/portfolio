'use client'

import { useEffect, useRef } from 'react'
import { SceneHost } from '../_host/SceneHost'
import type { SceneProps } from '../_host/types'
import s from './scene.module.css'
import { STATIONS, PLANT_KPIS, STREAM_MSGS, renderStreamMsg } from './data'

/* ══════════════════════════════════════════════════════════════════
   Digital Twin — 연결된 도메인 = 조직·공정의 트윈
   Three.js (OrbitControls + CSS2DRenderer) 씬을 React 컴포넌트로 이식.
   Three.js 는 npm 패키지 없음 → esm.sh CDN dynamic import(클라이언트 전용).
   useSceneCanvas 를 사용하지 않음: Three.js 가 WebGL renderer + rAF 를 직접 소유.
   SceneHost + SceneProps 계약은 동일하게 준수.
   ══════════════════════════════════════════════════════════════════ */

// CDN Three.js 모듈 타입 — 런타임 전용, tsc 는 any 로 취급.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMod = any

export default function Scene({ running = true, onReady }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const readyFired = useRef(false)

  // `running` mirror — read inside the rAF loop so pause/resume never re-inits Three.js.
  const runningRef = useRef(running)
  // resume hook — set by initThree once the loop exists; called when running flips true.
  const resumeLoopRef = useRef<(() => void) | null>(null)

  const clockElRef = useRef<HTMLSpanElement>(null)
  const bootFillRef = useRef<HTMLDivElement>(null)
  const bootRef = useRef<HTMLDivElement>(null)
  const lineStateRef = useRef<HTMLSpanElement>(null)
  const spdValRef = useRef<HTMLSpanElement>(null)
  const xdStateRef = useRef<HTMLSpanElement>(null)
  const flAiRef = useRef<HTMLSpanElement>(null)
  const streamRowsRef = useRef<HTMLDivElement>(null)
  const kpisRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLDivElement>(null)
  const swLineRef = useRef<HTMLDivElement>(null)
  const spdRef = useRef<HTMLInputElement>(null)
  const syncBtnRef = useRef<HTMLButtonElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const dtAccentRef = useRef<HTMLDivElement>(null)
  const dtStationRef = useRef<HTMLSpanElement>(null)
  const dtCoRef = useRef<HTMLDivElement>(null)
  const dtRoleRef = useRef<HTMLDivElement>(null)
  const dtPeriodRef = useRef<HTMLDivElement>(null)
  const dtStatusRef = useRef<HTMLDivElement>(null)
  const dtMetricsRef = useRef<HTMLDivElement>(null)
  const dtListRef = useRef<HTMLDivElement>(null)
  const dtChipsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!readyFired.current) {
      readyFired.current = true
      onReady?.()
    }
  }, [onReady])

  // Pause/resume the render loop on `running` change WITHOUT tearing down Three.js.
  useEffect(() => {
    runningRef.current = running
    if (running) resumeLoopRef.current?.()
  }, [running])

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false
    let rafId = 0

    // Track every setTimeout/setInterval so teardown can clear stragglers (stream/sync/boot).
    const timeouts = new Set<ReturnType<typeof setTimeout>>()
    const intervals = new Set<ReturnType<typeof setInterval>>()
    const track = <T extends ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>(
      id: T,
      kind: 'timeout' | 'interval',
    ): T => {
      if (kind === 'timeout') timeouts.add(id as ReturnType<typeof setTimeout>)
      else intervals.add(id as ReturnType<typeof setInterval>)
      return id
    }

    // ── clock ──
    const clockEl = clockElRef.current
    function tickClock() {
      if (!clockEl) return
      const d = new Date()
      clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, '0'))
        .join(':')
    }
    tickClock()
    const clockIv = setInterval(tickClock, 1000)

    // ── boot bar ──
    let bootP = 0
    const bootIv = setInterval(() => {
      bootP = Math.min(96, bootP + Math.random() * 22)
      if (bootFillRef.current) bootFillRef.current.style.width = bootP + '%'
    }, 120)

    // ── KPI strip (static) ──
    const kpisEl = kpisRef.current
    if (kpisEl) {
      kpisEl.innerHTML = ''
      PLANT_KPIS.forEach((k) => {
        const d = document.createElement('div')
        d.className = s.kpi
        d.innerHTML = `<div class="${s.kpiK}">${k.k}</div><div class="${s.kpiV}${k.c ? ' ' + k.c : ''}">${k.v}</div>`
        kpisEl.appendChild(d)
      })
    }

    // mutable state
    let lineOn = true
    let speed = 1.0
    let activeIdx = -1
    let hovered = -1

    // ── legend ──
    const legEl = legendRef.current
    if (legEl) {
      legEl.innerHTML = ''
      STATIONS.forEach((st, i) => {
        const li = document.createElement('div')
        li.className = s.legendLi
        const hex = '#' + st.color.toString(16).padStart(6, '0')
        li.innerHTML = `<span class="${s.legendSw}" style="background:${hex}"></span>${st.station}`
        li.addEventListener('click', () => focusStation(i))
        legEl.appendChild(li)
      })
    }

    // ── switch / slider / sync btn ──
    const swLineEl = swLineRef.current
    if (swLineEl) {
      swLineEl.addEventListener('click', () => {
        lineOn = !lineOn
        swLineEl.classList.toggle(s.switchOn, lineOn)
        if (lineStateRef.current) lineStateRef.current.textContent = lineOn ? 'ON' : 'OFF'
        if (activeIdx >= 0) openDetail(STATIONS[activeIdx])
      })
    }
    const spdEl = spdRef.current
    if (spdEl) {
      spdEl.addEventListener('input', () => {
        speed = Number(spdEl.value) / 100
        if (spdValRef.current) spdValRef.current.textContent = speed.toFixed(1) + 'x'
      })
    }
    const syncBtnEl = syncBtnRef.current
    if (syncBtnEl) {
      syncBtnEl.addEventListener('click', () => triggerCrossDomainPulse())
    }

    // ── detail panel ──
    function openDetail(st: (typeof STATIONS)[0]) {
      const hex = '#' + st.color.toString(16).padStart(6, '0')
      if (dtAccentRef.current) dtAccentRef.current.style.background = hex
      if (dtStationRef.current) dtStationRef.current.textContent = st.station
      if (dtCoRef.current) dtCoRef.current.textContent = st.label
      if (dtRoleRef.current) dtRoleRef.current.textContent = st.role
      if (dtPeriodRef.current) dtPeriodRef.current.textContent = st.period
      const statusEl = dtStatusRef.current
      if (statusEl) {
        const lamp = statusEl.querySelector<HTMLElement>('.' + s.dtStatusLamp)
        const txt = statusEl.querySelector<HTMLElement>('.' + s.dtStatusTxt)
        if (lamp) {
          lamp.style.background = lineOn ? '#46e6b0' : '#ffb454'
          lamp.style.boxShadow = lineOn
            ? '0 0 4px rgba(70,230,176,.55)'
            : '0 0 4px rgba(255,180,84,.55)'
        }
        if (txt) txt.textContent = lineOn ? 'RUNNING' : 'IDLE'
        statusEl.style.color = lineOn ? '#46e6b0' : '#ffb454'
      }
      const mw = dtMetricsRef.current
      if (mw) {
        mw.innerHTML = ''
        st.metrics.forEach((m) => {
          const d = document.createElement('div')
          d.className = s.metric
          d.innerHTML = `<div class="${s.metricMv}" style="color:${hex}">${m.v}</div><div class="${s.metricMl}">${m.l}</div>`
          mw.appendChild(d)
        })
      }
      const lw = dtListRef.current
      if (lw) {
        lw.innerHTML = ''
        st.log.forEach((t) => {
          const d = document.createElement('div')
          d.className = s.dtListIt
          d.innerHTML = `<span>${t}</span>`
          lw.appendChild(d)
        })
      }
      const cw = dtChipsRef.current
      if (cw) {
        cw.innerHTML = ''
        st.chips.forEach((c) => {
          const d = document.createElement('div')
          d.className = s.chip
          d.textContent = c
          cw.appendChild(d)
        })
      }
      if (detailRef.current) detailRef.current.classList.add(s.detailOpen)
    }

    // dtClose wired after DOM mount — see JSX onClick below (handled via ref)
    function handleDetailClose() {
      if (detailRef.current) detailRef.current.classList.remove(s.detailOpen)
      activeIdx = -1
      if (threeCtx) {
        const { controls, camera, THREE } = threeCtx
        camTween = {
          fromT: controls.target.clone(),
          toT: new THREE.Vector3(0, 1.5, 0),
          fromP: camera.position.clone(),
          toP: new THREE.Vector3(34, 30, 34),
          t: 0,
        }
      }
    }
    const dtCloseBtn = detailRef.current?.querySelector<HTMLElement>('.' + s.dtClose)
    if (dtCloseBtn) dtCloseBtn.addEventListener('click', handleDetailClose)

    // ── stream ──
    const streamWrapEl = streamRowsRef.current
    let streamMsgIdx = 0
    let streamIntervalT = 0
    const STREAM_INTERVAL = 2.1
    const MAX_STREAM_ROWS = 4

    function pushStreamRow() {
      if (!streamWrapEl) return
      const msg = STREAM_MSGS[streamMsgIdx % STREAM_MSGS.length]
      streamMsgIdx++
      const row = document.createElement('div')
      row.className = s.streamRow
      row.style.opacity = '0'
      row.style.transition = 'opacity 0.45s ease'
      row.innerHTML = `<span class="${s.streamSc}" style="background:${msg.c}"></span><span>${renderStreamMsg(msg.t)}</span>`
      streamWrapEl.appendChild(row)
      requestAnimationFrame(() => requestAnimationFrame(() => { row.style.opacity = '1' }))
      const rows = streamWrapEl.querySelectorAll<HTMLElement>('.' + s.streamRow)
      if (rows.length > MAX_STREAM_ROWS) {
        const oldest = rows[0]
        oldest.style.opacity = '0'
        track(setTimeout(() => { if (oldest.parentNode) oldest.parentNode.removeChild(oldest) }, 460), 'timeout')
      }
    }
    for (let i = 0; i < MAX_STREAM_ROWS; i++) pushStreamRow()

    function updateStream(dt: number) {
      streamIntervalT += dt
      if (streamIntervalT >= STREAM_INTERVAL) {
        streamIntervalT -= STREAM_INTERVAL
        pushStreamRow()
      }
    }

    // ── KPI live lerp ──
    const kpiEls = kpisEl ? kpisEl.querySelectorAll<HTMLElement>('.' + s.kpiV) : null
    const kpiBase: (number | null)[] = [null, 92.4, null, null, null, 1.8, null, null, null, null]
    const kpiCur: (number | null)[] = [null, 92.4, null, null, null, 1.8, null, null, null, null]
    const kpiTarget: (number | null)[] = [null, 92.4, null, null, null, 1.8, null, null, null, null]
    let kpiRefreshT = 0

    function refreshKpiTargets() {
      kpiBase.forEach((base, i) => {
        if (base === null) return
        kpiTarget[i] = base + (Math.random() - 0.5) * 0.6
      })
    }
    refreshKpiTargets()

    function updateKpis(dt: number) {
      kpiRefreshT -= dt
      if (kpiRefreshT <= 0) { refreshKpiTargets(); kpiRefreshT = 3.2 }
      if (!kpiEls) return
      kpiEls.forEach((el, i) => {
        if (kpiBase[i] === null) return
        const cur = kpiCur[i] ?? (kpiBase[i] as number)
        const tgt = kpiTarget[i] ?? (kpiBase[i] as number)
        kpiCur[i] = cur + (tgt - cur) * Math.min(1, dt * 1.2)
        const v = kpiCur[i] as number
        el.textContent = i === 5 ? '<' + v.toFixed(1) + 's' : v.toFixed(1) + '%'
      })
    }

    // ── ripple / xd sync state ──
    let rippleT = -1
    let xdSyncT = -1

    // threeCtx populated after async Three.js load
    let threeCtx: { THREE: AnyMod; controls: AnyMod; camera: AnyMod } | null = null
    // camTween — plain object, no Three.js types needed here
    let camTween: { fromT: AnyMod; toT: AnyMod; fromP: AnyMod; toP: AnyMod; t: number } | null = null

    // flowLines ref for pulse boost
    let flowLinesRef: Array<{ mat: AnyMod; pulseBoost: boolean }> = []

    function triggerCrossDomainPulse() {
      rippleT = 0
      xdSyncT = 0.8
      const xdEl = xdStateRef.current
      if (xdEl) {
        xdEl.textContent = 'SYNCING...'
        xdEl.style.color = '#ffb454'
      }
      flowLinesRef.forEach((fl) => { fl.mat.opacity = 0.28; fl.pulseBoost = true })
      const flAiEl = flAiRef.current
      const frames = ['LINK', 'SYNC', 'TWIN', 'OK']
      let k = 0
      const iv = track(setInterval(() => {
        if (flAiEl) flAiEl.textContent = frames[k++] || 'ON'
        if (k >= frames.length) { clearInterval(iv); intervals.delete(iv) }
      }, 180), 'interval')
    }

    function reconcileXD() {
      xdSyncT = -1
      const xdEl = xdStateRef.current
      if (xdEl) { xdEl.textContent = 'SYNCED'; xdEl.style.color = '#c9a3ff' }
      flowLinesRef.forEach((fl) => { fl.pulseBoost = false })
      if (flAiRef.current) flAiRef.current.textContent = 'ON'
    }

    function focusStation(i: number) {
      activeIdx = i
      triggerCrossDomainPulse()
      openDetail(STATIONS[i])
      if (!threeCtx) return
      const { controls, camera, THREE } = threeCtx
      const pos = STATION_POS_RAW[i]
      const tgt = new THREE.Vector3(pos[0], 2.2, pos[1])
      const camTo = tgt.clone().add(new THREE.Vector3(9, 9, 9))
      camTween = { fromT: controls.target.clone(), toT: tgt, fromP: camera.position.clone(), toP: camTo, t: 0 }
    }

    // station positions as plain arrays (no Three.js dep needed at declaration time)
    const STATION_POS_RAW: [number, number][] = [[-13, -6], [-4, 8], [10, 6], [14, -10]]

    // ── async Three.js init ──
    async function initThree() {
      if (destroyed) return

      const THREE: AnyMod = await import(/* webpackIgnore: true */ 'https://esm.sh/three@0.184.0' as AnyMod)
      const { OrbitControls }: AnyMod = await import(/* webpackIgnore: true */ 'https://esm.sh/three@0.184.0/examples/jsm/controls/OrbitControls.js' as AnyMod)
      const { CSS2DRenderer, CSS2DObject }: AnyMod = await import(/* webpackIgnore: true */ 'https://esm.sh/three@0.184.0/examples/jsm/renderers/CSS2DRenderer.js' as AnyMod)

      if (destroyed || !containerRef.current) return
      const container = containerRef.current

      // scene
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x070a0f)
      scene.fog = new THREE.Fog(0x070a0f, 42, 100)

      const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.1, 400)
      camera.position.set(34, 30, 34)

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.appendChild(renderer.domElement)

      const labelRenderer = new CSS2DRenderer()
      labelRenderer.setSize(container.clientWidth, container.clientHeight)
      labelRenderer.domElement.style.position = 'absolute'
      labelRenderer.domElement.style.top = '0'
      labelRenderer.domElement.style.left = '0'
      labelRenderer.domElement.style.pointerEvents = 'none'
      labelRenderer.domElement.style.zIndex = '15'
      container.appendChild(labelRenderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.target.set(0, 1.5, 0)
      controls.minDistance = 16
      controls.maxDistance = 80
      controls.maxPolarAngle = Math.PI * 0.49
      controls.minPolarAngle = Math.PI * 0.12
      controls.rotateSpeed = 0.7

      // expose to outer scope
      threeCtx = { THREE, controls, camera }

      // lighting
      scene.add(new THREE.HemisphereLight(0x9fb6ff, 0x0a0d14, 0.55))
      const key = new THREE.DirectionalLight(0xfff2dd, 1.15)
      key.position.set(22, 34, 14)
      key.castShadow = true
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.camera.near = 1; key.shadow.camera.far = 110
      const sc = 40
      key.shadow.camera.left = -sc; key.shadow.camera.right = sc; key.shadow.camera.top = sc; key.shadow.camera.bottom = -sc
      key.shadow.bias = -0.0004
      scene.add(key)
      const fillLight = new THREE.DirectionalLight(0x6fb4ff, 0.35)
      fillLight.position.set(-20, 16, -18)
      scene.add(fillLight)
      scene.add(new THREE.AmbientLight(0x404a60, 0.4))

      // ground + grid
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: 0x0d1119, roughness: 0.95, metalness: 0.05 }))
      ground.rotation.x = -Math.PI / 2
      ground.receiveShadow = true
      scene.add(ground)
      const grid = new THREE.GridHelper(140, 70, 0x1c2740, 0x121826)
      grid.position.y = 0.02
      grid.material.transparent = true; grid.material.opacity = 0.5
      scene.add(grid)

      // helpers
      function box(w: number, h: number, d: number, color: number, opts: Record<string, number | boolean | undefined> = {}) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.6, metalness: opts.metal ?? 0.25, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emi ?? 0 })
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
        mesh.castShadow = opts.cast ?? true
        mesh.receiveShadow = opts.recv ?? true
        return mesh
      }
      function cyl(rt: number, rb: number, h: number, seg: number, color: number, opts: Record<string, number | boolean | undefined> = {}) {
        const mat = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.5, metalness: opts.metal ?? 0.4, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emi ?? 0 })
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
        mesh.castShadow = opts.cast ?? true
        mesh.receiveShadow = opts.recv ?? true
        return mesh
      }

      // station positions as Vector3
      const STATION_POS = STATION_POS_RAW.map(([x, z]) => new THREE.Vector3(x, 0, z))

      const machineGroups: AnyMod[] = []
      const pulsers: AnyMod[] = []
      const statusNodes: AnyMod[] = []
      const graphAnimators: AnyMod[] = []

      // domain layer rings
      const layerRingColors = [0xff7a8a, 0x6fb4ff, 0xc9a3ff, 0x46e6b0]
      const layerRings: AnyMod[] = []
      STATION_POS.forEach((pos: AnyMod, i: number) => {
        const mat = new THREE.MeshBasicMaterial({ color: layerRingColors[i], transparent: true, opacity: 0.07, side: THREE.DoubleSide })
        const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 4.8, 64), mat)
        ring.rotation.x = -Math.PI / 2
        ring.position.set(pos.x, 0.04, pos.z)
        scene.add(ring)
        layerRings.push({ mesh: ring, mat, base: 0.07 })
      })

      // flow lines + particles
      const flowLines: AnyMod[] = []
      const pairs = [[0, 1], [1, 2], [2, 3], [0, 3], [1, 3]]
      pairs.forEach(([a, b]) => {
        const pa = new THREE.Vector3(STATION_POS[a].x, 2.5, STATION_POS[a].z)
        const pb = new THREE.Vector3(STATION_POS[b].x, 2.5, STATION_POS[b].z)
        const pts = []
        for (let t = 0; t <= 1; t += 0.05) pts.push(new THREE.Vector3().lerpVectors(pa, pb, t))
        const lineMat = new THREE.LineBasicMaterial({ color: layerRingColors[a], transparent: true, opacity: 0.12 })
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat))
        const pMat = new THREE.MeshBasicMaterial({ color: layerRingColors[a], transparent: true, opacity: 0.45 })
        const particle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pMat)
        scene.add(particle)
        flowLines.push({ pa, pb, particle, t: a * 0.2, speed: 0.08 + Math.random() * 0.04, mat: lineMat, pulseBoost: false })
      })
      flowLinesRef = flowLines

      // ripple
      const rippleMat = new THREE.MeshBasicMaterial({ color: 0x46e6b0, transparent: true, opacity: 0, side: THREE.DoubleSide })
      const ripple = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 64), rippleMat)
      ripple.rotation.x = -Math.PI / 2
      ripple.position.y = 0.06
      scene.add(ripple)

      // AI rings
      const aiRings: AnyMod[] = []
      for (let r = 0; r < 3; r++) {
        const rMat = new THREE.MeshBasicMaterial({ color: 0xc9a3ff, transparent: true, opacity: 0, side: THREE.DoubleSide })
        const rm = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 48), rMat)
        rm.rotation.x = -Math.PI / 2
        rm.position.set(STATION_POS[2].x, 0.05, STATION_POS[2].z)
        scene.add(rm)
        aiRings.push({ mesh: rm, mat: rMat, offset: r / 3, phase: r / 3 })
      }

      // build stations
      STATIONS.forEach((st, i) => {
        const g = new THREE.Group()
        g.position.copy(STATION_POS[i])
        g.userData.index = i
        g.userData.station = st

        const pad = box(7.2, 0.5, 6.4, 0x0f1622, { metal: 0.1, rough: 0.85 })
        pad.position.y = 0.25; g.add(pad)
        const padTrim = box(7.4, 0.08, 6.6, st.color, { emissive: st.color, emi: 0.16, metal: 0.25, cast: false })
        padTrim.position.y = 0.06; g.add(padTrim)

        const body = box(4.2, 2.8, 3.4, 0x242b3a, { metal: 0.45, rough: 0.55 })
        body.position.y = 0.5 + 1.6; g.add(body)
        const stripe = box(4.3, 0.28, 3.5, st.color, { emissive: st.color, emi: 0.18, metal: 0.15, cast: false })
        stripe.position.y = 0.5 + 2.7; g.add(stripe)
        const ctlbox = box(1.1, 1.3, 0.25, 0x10151f, { metal: 0.4, rough: 0.5 })
        ctlbox.position.set(0, 1.7, 1.75)
        const screen = box(0.85, 0.85, 0.04, st.color, { emissive: st.color, emi: 0.22, cast: false })
        screen.position.set(0, 1.85, 1.88)
        pulsers.push(screen); g.add(ctlbox, screen)

        for (let l = 0; l < 3; l++) {
          const active = l === i % 3
          const nodeMat = new THREE.MeshStandardMaterial({ color: active ? st.color : 0x2a3344, emissive: active ? st.color : 0x000000, emissiveIntensity: active ? 0.18 : 0, roughness: 0.5 })
          const node = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), nodeMat)
          node.position.set(-1.35 + l * 0.34, 3.42, -1.35)
          node.castShadow = true; g.add(node)
          statusNodes.push({ mat: nodeMat, color: st.color, active })
        }

        if (st.kind === 'machine') {
          for (let k = 0; k < 3; k++) {
            const probe = cyl(0.08, 0.1, 1.4, 10, 0x39414f, { metal: 0.45 })
            probe.position.set(0.75 + k * 0.55, 3.15, -1.0); g.add(probe)
            const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.14, roughness: 0.45 }))
            cap.position.set(0.75 + k * 0.55, 3.9, -1.0); g.add(cap)
          }
          const cam = box(0.5, 0.5, 0.7, 0x14181f, { metal: 0.35 })
          cam.position.set(1.4, 1.9, 1.4)
          const lens = cyl(0.18, 0.18, 0.2, 16, st.color, { emissive: st.color, emi: 0.18 })
          lens.rotation.x = Math.PI / 2; lens.position.set(1.4, 1.9, 1.85); g.add(cam, lens)
        } else if (st.kind === 'data') {
          for (let r = 0; r < 3; r++) {
            const panel = box(0.9, 2.1, 0.18, 0x161d2a, { metal: 0.25, rough: 0.6 })
            panel.position.set(-1.4 + r * 1.1, 0.5 + 1.25, 1.15); g.add(panel)
            for (let u = 0; u < 5; u++) {
              const led = box(0.55, 0.045, 0.04, u % 2 ? st.color : 0x46e6b0, { emissive: u % 2 ? st.color : 0x46e6b0, emi: 0.18, cast: false })
              led.position.set(-1.4 + r * 1.1, 0.8 + u * 0.34, 1.28)
              pulsers.push(led); g.add(led)
            }
          }
          const dash = box(2.4, 1.5, 0.08, 0x0c1320, { emissive: st.color, emi: 0.08, metal: 0.15 })
          dash.position.set(0, 0.5 + 4.4, 0); dash.rotation.x = -0.12; g.add(dash)
          graphAnimators.push({ mesh: dash, axis: 'none', baseY: 0.5 + 4.4 })
        } else if (st.kind === 'ax') {
          const graph = new THREE.Group(); graph.position.set(-0.9, 1.35, 1.0); g.add(graph)
          const gPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.8, 0.7, 0.2), new THREE.Vector3(1.2, -0.1, -0.35), new THREE.Vector3(0.25, 1.25, -0.45)]
          gPts.forEach((p: AnyMod, idx: number) => {
            const node = new THREE.Mesh(new THREE.IcosahedronGeometry(idx === 0 ? 0.28 : 0.18, 0), new THREE.MeshStandardMaterial({ color: idx === 0 ? st.color : 0x39414f, emissive: idx === 0 ? st.color : 0x000000, emissiveIntensity: 0.16, roughness: 0.4 }))
            node.position.copy(p); graph.add(node)
            if (idx > 0) graph.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([gPts[0], p]), new THREE.LineBasicMaterial({ color: st.color, transparent: true, opacity: 0.18 })))
          })
          graphAnimators.push({ mesh: graph, axis: 'float', baseY: 1.35 })
          const ring = new THREE.Group(); ring.position.set(0, 0.5 + 4.3, 0); g.add(ring)
          for (let n = 0; n < 6; n++) {
            const a = (n / 6) * Math.PI * 2
            const node = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.16, roughness: 0.35 }))
            node.position.set(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6); ring.add(node)
          }
          graphAnimators.push({ mesh: ring, axis: 'y', speed: 0.22 })
        } else if (st.kind === 'hub') {
          const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: st.color, emissive: st.color, emissiveIntensity: 0.16, roughness: 0.35, metalness: 0.35 }))
          core.position.y = 0.5 + 3.0; g.add(core); pulsers.push(core)
          const ringColors = [0xff7a8a, 0x6fb4ff, 0xc9a3ff]
          for (let r = 0; r < 3; r++) {
            const rMesh = new THREE.Mesh(new THREE.TorusGeometry(1.6 + r * 0.5, 0.05, 8, 48), new THREE.MeshStandardMaterial({ color: ringColors[r], emissive: ringColors[r], emissiveIntensity: 0.16, roughness: 0.35 }))
            rMesh.position.y = 0.5 + 3.0
            rMesh.rotation.x = (r / 3) * Math.PI
            rMesh.rotation.z = (r / 3) * Math.PI * 0.5
            g.add(rMesh)
            graphAnimators.push({ mesh: rMesh, axis: 'hub', speed: 0.18 + r * 0.08 })
          }
        }

        const plate = box(1.6, 0.05, 0.9, 0x0a0e15, { emissive: st.color, emi: 0.06, cast: false })
        plate.position.set(0, 0.07, 2.8); g.add(plate)

        // CSS2D HUD label
        const hud = document.createElement('div')
        const hex = '#' + st.color.toString(16).padStart(6, '0')
        const layerTag = ({ mfg: 'MFG', dev: 'DEV', ai: 'AI', hub: 'HUB' } as Record<string, string>)[st.layer]
        hud.style.cssText = `transform:translate(-50%,-100%);background:rgba(10,14,21,.88);border:1px solid rgba(255,255,255,.10);border-left:3px solid ${hex};border-radius:9px;padding:8px 11px;min-width:160px;backdrop-filter:blur(8px);box-shadow:0 12px 30px rgba(0,0,0,.5);font-family:var(--sans);user-select:none;cursor:pointer;`
        hud.innerHTML = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><span style="width:7px;height:7px;border-radius:50%;background:${hex};box-shadow:0 0 4px ${hex}99"></span><span style="font-family:var(--mono);font-size:8px;letter-spacing:.18em;color:#5d6a82">${st.station}</span><span style="font-family:var(--mono);font-size:8px;letter-spacing:.1em;color:${hex};border:1px solid ${hex}33;border-radius:3px;padding:1px 5px">${layerTag}</span></div><div style="font-size:12px;font-weight:800;color:#e8edf6;line-height:1.15">${st.label}</div><div style="font-size:9.5px;color:#9aa6bd;margin-top:2px">${st.role}</div><div style="display:flex;gap:8px;margin-top:7px"><div><div style="font-family:var(--mono);font-size:12px;font-weight:700;color:${hex}" data-m0>${st.metrics[0].v}</div><div style="font-size:8px;color:#5d6a82">${st.metrics[0].l}</div></div><div><div style="font-family:var(--mono);font-size:12px;font-weight:700;color:#e8edf6" data-thr>--</div><div style="font-size:8px;color:#5d6a82">throughput/h</div></div></div>`
        hud.addEventListener('click', () => focusStation(i))
        const hudObj = new CSS2DObject(hud)
        hudObj.position.set(0, 0.5 + 5.8, 0)
        g.add(hudObj)
        g.userData.hud = hud

        scene.add(g)
        machineGroups.push(g)
      })

      // domain link path
      const pathPts = STATION_POS.map((p: AnyMod) => new THREE.Vector3(p.x, 0.55, p.z))
      pathPts.push(new THREE.Vector3(STATION_POS[0].x, 0.55, STATION_POS[0].z))
      const curve = new THREE.CatmullRomCurve3(pathPts, true, 'catmullrom', 0.4)
      const linkMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.08, 8, true), new THREE.MeshStandardMaterial({ color: 0x172235, roughness: 0.82, metalness: 0.12 }))
      linkMesh.castShadow = false; linkMesh.receiveShadow = true; scene.add(linkMesh)

      // WIP signal nodes
      const wipColors = [0xff7a8a, 0x6fb4ff, 0xc9a3ff, 0x46e6b0, 0xffb454]
      const wips: AnyMod[] = []
      const wipGeo = new THREE.SphereGeometry(0.18, 12, 12)
      for (let i = 0; i < 10; i++) {
        const c = wipColors[i % wipColors.length]
        const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.08, roughness: 0.5, metalness: 0.15 })
        const m = new THREE.Mesh(wipGeo, mat)
        m.castShadow = true; scene.add(m)
        wips.push({ mesh: m, t: i / 10 })
      }

      // raycaster
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()

      function setPointerFromEvent(e: PointerEvent) {
        const r = renderer.domElement.getBoundingClientRect()
        mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
        mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
      }

      renderer.domElement.addEventListener('pointermove', (e: PointerEvent) => {
        setPointerFromEvent(e)
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(machineGroups, true)
        let idx = -1
        if (hits.length) {
          let o: AnyMod = hits[0].object
          while (o && o.userData.index === undefined) o = o.parent
          if (o) idx = o.userData.index as number
        }
        if (idx !== hovered) {
          hovered = idx
          renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'default'
        }
      })
      let downXY: [number, number] | null = null
      renderer.domElement.addEventListener('pointerdown', (e: PointerEvent) => {
        downXY = [e.clientX, e.clientY]
        autoCycleEnabled = false
      })
      renderer.domElement.addEventListener('pointerup', (e: PointerEvent) => {
        if (!downXY) return
        const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1])
        downXY = null
        if (moved > 6) return
        setPointerFromEvent(e)
        raycaster.setFromCamera(mouse, camera)
        const hits = raycaster.intersectObjects(machineGroups, true)
        if (hits.length) {
          let o: AnyMod = hits[0].object
          while (o && o.userData.index === undefined) o = o.parent
          if (o) focusStation(o.userData.index as number)
        }
      })

      let autoCycleT = 0
      let autoCycleIdx = 0
      let autoCycleEnabled = true
      let syncBeatT = 0
      let syncBeatIdx = 0
      const SYNC_BEAT_INTERVAL = 3.0

      const throughputShown = STATIONS.map(() => 0)
      const clock = new THREE.Clock()

      // resize
      function onResize() {
        const w = container.clientWidth
        const h = container.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
        labelRenderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      function animate() {
        if (destroyed) return
        // Paused (off-screen): fully stop the loop. No rAF reschedule, no WebGL work.
        // resumeLoopRef restarts it when `running` flips back to true.
        if (!runningRef.current) { rafId = 0; return }
        rafId = requestAnimationFrame(animate)

        const dt: number = Math.min(clock.getDelta(), 0.08)
        const time: number = clock.elapsedTime
        const eff = lineOn ? speed : 0

        wips.forEach((w: AnyMod, i: number) => {
          w.t = (w.t + dt * 0.044 * eff) % 1
          const p = curve.getPointAt(w.t)
          w.mesh.position.set(p.x, p.y + 0.25, p.z)
          w.mesh.rotation.y += dt * 0.8 * eff
          w.mesh.position.y += Math.sin(time * 2 + i) * 0.014
        })

        pulsers.forEach((m: AnyMod, i: number) => {
          m.material.emissiveIntensity = 0.14 + (lineOn ? 0.12 * Math.abs(Math.sin(time * 2.2 * speed + i * 0.6)) : 0)
        })

        statusNodes.forEach((a: AnyMod, i: number) => {
          if (lineOn) {
            a.mat.color.setHex(a.active ? a.color : 0x2a3344)
            a.mat.emissive.setHex(a.active ? a.color : 0x000000)
            a.mat.emissiveIntensity = a.active ? 0.16 + 0.08 * Math.abs(Math.sin(time * 1.5 + i)) : 0
          } else {
            const blink = Math.sin(time * 5) > 0
            a.mat.color.setHex(0xffb454); a.mat.emissive.setHex(0xffb454)
            a.mat.emissiveIntensity = blink ? 0.28 : 0.04
          }
        })

        graphAnimators.forEach((f: AnyMod, i: number) => {
          if (f.axis === 'y') f.mesh.rotation.y += dt * (f.speed ?? 0.2) * (0.25 + eff)
          else if (f.axis === 'hub') {
            f.mesh.rotation.x += dt * (f.speed ?? 0.2) * (lineOn ? 1 : 0.1)
            f.mesh.rotation.z += dt * (f.speed ?? 0.2) * 0.7 * (lineOn ? 1 : 0.1)
          } else if (f.axis === 'float') {
            f.mesh.position.y = (f.baseY ?? 1.35) + Math.sin(time * 1.1 + i) * 0.04
            f.mesh.rotation.y = Math.sin(time * 0.35) * 0.12
          } else {
            f.mesh.position.y = (f.baseY ?? 5.0) + Math.sin(time * 1.2 + i) * 0.06
            f.mesh.rotation.y = Math.sin(time * 0.35) * 0.1
          }
        })

        layerRings.forEach((lr: AnyMod, i: number) => {
          lr.mat.opacity = lineOn ? lr.base + 0.025 * Math.abs(Math.sin(time * 1.0 + i * 1.1)) : lr.base * 0.4
        })

        aiRings.forEach((ar: AnyMod) => {
          ar.phase = (ar.phase + dt * 0.5) % 1
          ar.mesh.scale.setScalar(1 + ar.phase * 6)
          ar.mat.opacity = (1 - ar.phase) * 0.12 * (lineOn ? 1 : 0.2)
        })

        flowLines.forEach((fl: AnyMod, i: number) => {
          fl.t = (fl.t + dt * fl.speed) % 1
          fl.particle.position.lerpVectors(fl.pa, fl.pb, fl.t)
          fl.particle.scale.setScalar(lineOn ? 1 : 0.35)
          const wave = 0.5 + 0.5 * Math.sin(time * 1.6 + i * 1.2)
          fl.mat.opacity = fl.pulseBoost
            ? fl.mat.opacity + (0.12 - fl.mat.opacity) * Math.min(1, dt * 1.4)
            : (lineOn ? 0.10 + wave * 0.10 : 0.05)
        })

        STATIONS.forEach((_, i) => {
          const target = lineOn ? Math.round((160 + i * 45) * speed) : 0
          throughputShown[i] += (target - throughputShown[i]) * Math.min(1, dt * 3)
          const hudEl: HTMLElement = machineGroups[i]?.userData.hud
          const thr = hudEl?.querySelector<HTMLElement>('[data-thr]')
          if (thr) thr.textContent = String(Math.round(throughputShown[i]))
        })

        machineGroups.forEach((g: AnyMod, i: number) => {
          g.scale.setScalar(lineOn ? 1 + 0.004 * Math.sin(time * 2 * speed + i) : 1)
          const isHover = i === hovered && i !== activeIdx
          g.position.y = (STATION_POS[i] as AnyMod).y + (isHover ? 0.15 : 0)
        })

        if (rippleT >= 0) {
          rippleT += dt * 0.65
          ripple.scale.setScalar((rippleT * 60) / 0.6)
          ripple.material.opacity = Math.max(0, 0.18 * (1 - rippleT))
          if (rippleT >= 1) { rippleT = -1; ripple.material.opacity = 0 }
        }

        if (xdSyncT > 0) { xdSyncT -= dt; if (xdSyncT <= 0) reconcileXD() }

        syncBeatT += dt
        if (syncBeatT >= SYNC_BEAT_INTERVAL) {
          syncBeatT = 0
          syncBeatIdx = (syncBeatIdx + 1) % STATIONS.length
          triggerCrossDomainPulse()
          if (autoCycleEnabled) {
            const pos = STATION_POS[syncBeatIdx]
            const tgt = new THREE.Vector3(pos.x, 2.2, pos.z)
            camTween = { fromT: controls.target.clone(), toT: tgt, fromP: camera.position.clone(), toP: tgt.clone().add(new THREE.Vector3(9, 9, 9)), t: 0 }
          }
        }

        updateKpis(dt)
        updateStream(dt)

        if (autoCycleEnabled) {
          autoCycleT += dt
          if (autoCycleT > 6.0) {
            autoCycleT = 0
            autoCycleIdx = (autoCycleIdx + 1) % STATIONS.length
            const pos = STATION_POS[autoCycleIdx]
            const tgt = new THREE.Vector3(pos.x, 2.2, pos.z)
            camTween = { fromT: controls.target.clone(), toT: tgt, fromP: camera.position.clone(), toP: tgt.clone().add(new THREE.Vector3(9, 9, 9)), t: 0 }
            triggerCrossDomainPulse()
          }
        }

        if (camTween) {
          camTween.t += dt * 1.5
          const k = Math.min(1, camTween.t)
          const e = 1 - Math.pow(1 - k, 3)
          controls.target.lerpVectors(camTween.fromT, camTween.toT, e)
          camera.position.lerpVectors(camTween.fromP, camTween.toP, e)
          if (k >= 1) camTween = null
        }

        controls.update()
        renderer.render(scene, camera)
        labelRenderer.render(scene, camera)
      }

      // Resume hook: restart the loop only if it's actually stopped (rafId === 0).
      // Discard the accumulated delta so the first resumed frame matches a normal frame.
      resumeLoopRef.current = () => {
        if (destroyed || rafId !== 0) return
        clock.getDelta()
        animate()
      }

      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
      // Start the loop only if currently on-screen; otherwise wait for resume.
      if (runningRef.current) animate()

      clearInterval(bootIv)
      if (bootFillRef.current) bootFillRef.current.style.width = '100%'
      track(setTimeout(() => {
        if (bootRef.current) bootRef.current.classList.add(s.bootHide)
        rippleT = 0
        track(setTimeout(() => { autoCycleT = 4.5 }, 1500), 'timeout')
      }, 480), 'timeout')

      return () => {
        window.removeEventListener('resize', onResize)
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
        resumeLoopRef.current = null

        // OrbitControls owns its own pointer/wheel/key listeners on domElement — dispose removes them.
        controls.dispose()

        // Dispose every geometry/material/texture in the scene graph.
        scene.traverse((obj: AnyMod) => {
          if (obj.geometry) obj.geometry.dispose?.()
          const mat = obj.material
          if (mat) {
            const mats: AnyMod[] = Array.isArray(mat) ? mat : [mat]
            mats.forEach((m: AnyMod) => {
              for (const key in m) {
                const val = m[key]
                if (val && val.isTexture) val.dispose?.()
              }
              m.dispose?.()
            })
          }
        })
        // Shared geometries created outside group traversal.
        wipGeo.dispose?.()

        // Drop the WebGL context and remove both renderer DOM nodes.
        // Their attached pointer listeners (anonymous) become GC-eligible with the element.
        renderer.dispose()
        renderer.forceContextLoss?.()
        renderer.domElement.remove()
        labelRenderer.domElement.remove()
      }
    }

    const cleanupPromise = initThree()

    return () => {
      destroyed = true
      clearInterval(clockIv)
      clearInterval(bootIv)
      if (rafId) cancelAnimationFrame(rafId)
      resumeLoopRef.current = null

      // Clear every tracked straggler timer (stream removal, sync pulse, boot reveal).
      intervals.forEach((id) => clearInterval(id))
      timeouts.forEach((id) => clearTimeout(id))
      intervals.clear()
      timeouts.clear()

      // Remove the detail-close listener (named handler on a persistent DOM node).
      if (dtCloseBtn) dtCloseBtn.removeEventListener('click', handleDetailClose)

      cleanupPromise.then((cleanup) => cleanup?.())
    }
    // Mount once: pause/resume is handled by runningRef + resumeLoopRef, no re-init on `running` change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <SceneHost className={s.root} bg="#070a0f">
      {/* Three.js renderer canvas mounts here */}
      <div ref={containerRef} className={s.c} />

      {/* boot overlay */}
      <div className={`${s.hud} ${s.boot}`} ref={bootRef}>
        <div className={s.bootMark}>Digital Twin · Connected Domains</div>
        <div className={s.bootTitle}>도메인 연결 상태 초기화 중</div>
        <div className={s.bootSub}>
          제조 · 데이터 · AI 도메인이 한 사람 안에서 연결되면 — 그 자체가 조직·공정의 디지털
          트윈이 된다
        </div>
        <div className={s.bootBar}>
          <div className={s.bootFill} ref={bootFillRef} />
        </div>
      </div>

      {/* top bar */}
      <div className={`${s.hud} ${s.topbar}`}>
        <div className={s.brand}>
          <span className={s.brandNm}>도메인 트윈</span>
          <span className={s.brandRole}>연결된 도메인 = 조직·공정의 디지털 트윈</span>
          <span className={s.brandTw}>
            <span className={s.dot} />
            DOMAIN TWIN · SILO→CONNECTED LIVE
          </span>
        </div>
        <div className={s.topRight}>
          <span>Silo→Connected State</span>
          <span className={s.clock} ref={clockElRef}>--:--:--</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className={`${s.hud} ${s.kpis}`} ref={kpisRef} />

      {/* left control panel */}
      <div className={`${s.hud} ${s.control}`}>
        <div className={s.ctlH}>
          <span className={s.ctlHT}>도메인 연결 상태</span>
          <span className={s.ctlHSub}>Silo→Connected Overlay</span>
        </div>
        <div className={s.ctlBody}>
          <div>
            <div className={s.monoLabel}>
              Domain Layers — 사일로 시 오류[ERR], 연결 시 정합[OK]
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#ff7a8a', boxShadow: '0 0 4px rgba(255,122,138,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#ff7a8a' }}>제조 현장</div>
                <div className={s.layerSub}>설비·공정·OEE·물류 — 제조 현장 도메인</div>
              </div>
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#6fb4ff', boxShadow: '0 0 4px rgba(111,180,255,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#6fb4ff' }}>데이터 / 개발</div>
                <div className={s.layerSub}>MES·파이프라인·SSOT — 현장을 코드로 구조화</div>
              </div>
            </div>
            <div className={s.layerRow}>
              <div className={s.layerDot} style={{ background: '#c9a3ff', boxShadow: '0 0 4px rgba(201,163,255,.55)' }} />
              <div>
                <div className={s.layerLabel} style={{ color: '#c9a3ff' }}>AI 도메인</div>
                <div className={s.layerSub}>예측·이상탐지·에이전트 — 모델로 도메인을 연결</div>
              </div>
            </div>
          </div>
          <div className={s.divider} />
          <div className={s.row}>
            <span className={s.rowLab}>
              라인 가동 <b ref={lineStateRef}>ON</b>
            </span>
            <div className={`${s.switch} ${s.switchOn}`} ref={swLineRef}>
              <div className={s.knob} />
            </div>
          </div>
          <div className={s.row}>
            <span className={s.rowLab}>
              라인 속도 <b ref={spdValRef}>1.0x</b>
            </span>
          </div>
          <input type="range" className={s.slider} ref={spdRef} min="0" max="200" defaultValue="100" />
          <button className={s.btn} ref={syncBtnRef}>
            Sync Pulse : 사일로 → 연결
          </button>
          <div className={s.divider} />
          <div className={s.monoLabelSm}>Stations</div>
          <div className={s.legend} ref={legendRef} />
        </div>
      </div>

      {/* hint */}
      <div className={`${s.hud} ${s.hint}`}>
        <div><b>드래그</b> 궤도 회전 · <b>휠</b> 줌</div>
        <div><b>노드 클릭</b> 포커스 + 상세</div>
      </div>

      {/* cross-domain sync panel (right) */}
      <div className={`${s.hud} ${s.xdpanel}`}>
        <div className={s.xdH}>
          <div className={s.xdHT}>
            도메인 트윈 상태 <span className={s.badge}>LIVE</span>
          </div>
          <div className={s.xdHSub}>사일로 → 연결 · 오류 → 정합 전파</div>
        </div>
        <div className={s.xdBody}>
          <div className={s.fusion}>
            <div className={`${s.fusionLayer} ${s.mfg}`}>
              <div className={`${s.flIcon} ${s.mfg}`}>MFG</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.mfg}`}>제조 현장</div>
                <div className={s.flSub}>사일로 시: 공정 문제가 데이터에 미반영 · 누락</div>
              </div>
              <div className={`${s.flVal} ${s.mfg}`}>연결</div>
            </div>
            <div className={`${s.fusionLayer} ${s.dev}`}>
              <div className={`${s.flIcon} ${s.dev}`}>DEV</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.dev}`}>데이터 / 개발</div>
                <div className={s.flSub}>사일로 시: 현장 맥락 없는 지표 — 판단 오류</div>
              </div>
              <div className={`${s.flVal} ${s.dev}`}>LIVE</div>
            </div>
            <div className={`${s.fusionLayer} ${s.ai}`}>
              <div className={`${s.flIcon} ${s.ai}`}>AI</div>
              <div className={s.flInfo}>
                <div className={`${s.flLabel} ${s.ai}`}>AI 도메인</div>
                <div className={s.flSub}>사일로 시: 도메인 없는 모델 — 오탐·오분류</div>
              </div>
              <span className={`${s.flVal} ${s.ai}`} ref={flAiRef}>ON</span>
            </div>
          </div>
          <div className={s.xdCap}>
            세 도메인이 한 사람 안에서 연결되면
            <br />
            <b>부서 간 통역 + 경계의 숨은 문제 식별</b>이 가능해진다.
            <br />
            단일 도메인 전문가는 보지 못하는 영역이다.
          </div>
          <div className={s.xdStream}>
            <div className={s.streamRqh}>Domain Link Stream — 사일로 해제 피드</div>
            <div ref={streamRowsRef} />
          </div>
          <div className={s.xdState}>
            <span className={s.xdStateLbl}>Twin State</span>
            <span className={s.xdStateVal} ref={xdStateRef}>SYNCED</span>
          </div>
          <div className={s.xdPort}>
            <b>LOG:</b> 세 도메인이 연결될 때 — 경계의 문제가 비로소 보인다.
            <br />
            제조 현장 → 데이터/SW → AI —
            <br />
            <span className={s.xdPortPh}>도메인을 코드와 모델로 잇는 허브</span>가 조직의
            트윈이 된다.
          </div>
        </div>
      </div>

      {/* detail panel */}
      <div className={s.detail} ref={detailRef}>
        <div className={s.dtHead}>
          <div className={s.dtAccentbar} ref={dtAccentRef} />
          <button className={s.dtClose}>x</button>
          <span className={s.dtStation} ref={dtStationRef}>STATION 01</span>
          <div className={s.dtCo} ref={dtCoRef}>--</div>
          <div className={s.dtRole} ref={dtRoleRef}>--</div>
          <div className={s.dtPeriod} ref={dtPeriodRef}>--</div>
          <div className={s.dtStatus} ref={dtStatusRef}>
            <span className={s.dtStatusLamp} />
            <span className={s.dtStatusTxt}>RUNNING</span>
          </div>
        </div>
        <div className={s.dtBody}>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Layer Metrics</div>
            <div className={s.dtMetrics} ref={dtMetricsRef} />
          </div>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Domain Log</div>
            <div className={s.dtList} ref={dtListRef} />
          </div>
          <div className={s.dtSec}>
            <div className={s.dtSecH}>Tooling</div>
            <div className={s.chips} ref={dtChipsRef} />
          </div>
        </div>
        <div className={s.dtFoot}>
          <span>연결된 도메인 = 조직·공정의 디지털 트윈</span>
        </div>
      </div>
    </SceneHost>
  )
}
