import type * as THREE from 'three'
import { easeInOutCubic, easeOutCubic, placeLabel, projectToScreen, seg } from '../_host/three/helpers'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import { buildCore, buildEnvironment, buildLine, buildPackets, buildPaths, buildStations, hdr, radialTexture } from './build'
import { COLOR, CORE, LINE, STACK, STATIONS, T, type LabelId } from './data'
import { buildClient, buildDash } from './holo'

/** DOM HUD 핸들 — Scene.tsx 가 ref 콜백으로 채운다. */
export interface Hud {
  labels: Partial<Record<LabelId, HTMLElement | null>>
  chips: (HTMLElement | null)[]
  ledger: HTMLElement | null
  mesRow: HTMLElement | null
  head: HTMLElement | null
}

export const emptyHud = (): Hud => ({ labels: {}, chips: [], ledger: null, mesRow: null, head: null })

const smooth = (x: number) => x * x * (3 - 2 * x)
const mod = (a: number, n: number) => ((a % n) + n) % n
const hash = (n: number) => {
  const s = Math.sin(n * 91.7) * 43758.5453
  return s - Math.floor(s)
}

/** 컨베이어 누적 이송 거리(결정적). 가속 1s 후 등속. */
function travel(t: number) {
  const tau = t - T.conveyor
  if (tau <= 0) return 0
  const A = 1.0
  return tau < A ? (LINE.speed * tau * tau) / (2 * A) : LINE.speed * (tau - A / 2)
}

const PACKETS_PER_PATH = 7
const FEED_PER_PANEL = 6

export function setupMesLine(ctx: ThreeContext, hudRef: { current: Hud }): ThreeSetupResult {
  const { THREE: T3, scene, camera } = ctx
  const glowTex = radialTexture(T3)
  const env = buildEnvironment(T3, scene, glowTex)
  const line = buildLine(T3, scene)
  const stations = buildStations(T3, scene, glowTex)
  const paths = buildPaths(T3, scene)
  const core = buildCore(T3, scene)
  const nPathPackets = paths.length * PACKETS_PER_PATH
  const packets = buildPackets(T3, scene, nPathPackets + FEED_PER_PANEL * 2)

  const dash = buildDash(T3)
  dash.group.position.set(3.7, 4.9, -6.1)
  const client = buildClient(T3)
  client.group.position.set(-6.3, 4.75, -5.9)
  scene.add(dash.group, client.group)
  // 패널이 기본 카메라 쪽을 보게.
  const camFocus = new T3.Vector3(2.6, 5.2, 15)
  dash.group.lookAt(camFocus)
  client.group.lookAt(camFocus)
  dash.group.updateMatrixWorld(true)
  client.group.updateMatrixWorld(true)

  // 프로젝션 빔: 코어 상단 → 패널 하단 모서리.
  const src = core.top.clone()
  const panelFeeds = [
    { g: dash.group, w: 5.4, h: 3.0 },
    { g: client.group, w: 3.2, h: 2.9 },
  ].map(({ g, w, h }) => {
    const bl = g.localToWorld(new T3.Vector3(-w / 2, -h / 2, 0))
    const br = g.localToWorld(new T3.Vector3(w / 2, -h / 2, 0))
    const bc = g.localToWorld(new T3.Vector3(0, -h / 2, 0))
    return { bl, br, bc }
  })
  const beamPts: THREE.Vector3[] = []
  for (const f of panelFeeds) beamPts.push(src, f.bl, src, f.br)
  const beamMat = new T3.LineBasicMaterial({
    color: hdr(T3, COLOR.teal, 1.2),
    transparent: true,
    opacity: 0,
    blending: T3.AdditiveBlending,
    depthWrite: false,
  })
  scene.add(new T3.LineSegments(new T3.BufferGeometry().setFromPoints(beamPts), beamMat))
  // 빔 면(삼각형) — 아주 옅게.
  const fanPos: number[] = []
  for (const f of panelFeeds) fanPos.push(src.x, src.y, src.z, f.bl.x, f.bl.y, f.bl.z, f.br.x, f.br.y, f.br.z)
  const fanGeo = new T3.BufferGeometry()
  fanGeo.setAttribute('position', new T3.Float32BufferAttribute(fanPos, 3))
  const fanMat = new T3.MeshBasicMaterial({
    color: hdr(T3, COLOR.teal, 0.6),
    transparent: true,
    opacity: 0,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    side: T3.DoubleSide,
  })
  scene.add(new T3.Mesh(fanGeo, fanMat))

  // 라벨 앵커.
  const anchors: Partial<Record<LabelId, { p: THREE.Vector3; on: number }>> = {}
  for (const st of stations) anchors[st.def.id] = { p: st.def.id === 'scan' ? new T3.Vector3(st.def.x, 2.3, 0) : new T3.Vector3(st.def.x, 0.02, 0.95), on: st.def.on + 0.1 }
  for (const ph of paths) {
    const id = `p-${ph.station.id}` as LabelId
    anchors[id] = { p: ph.curve.getPointAt(ph.station.id === 'vision' ? 0.12 : 0.2), on: ph.station.path!.grow[0] + 0.45 }
  }
  anchors.core = { p: new T3.Vector3(CORE.x + 1.15, 1.0, CORE.z), on: T.core[0] + 0.3 }
  anchors.api = { p: new T3.Vector3(CORE.x + 0.95, 3.75, CORE.z), on: T.api[0] + 0.2 }
  anchors.dash = { p: dash.group.localToWorld(new T3.Vector3(-1.8, 1.62, 0)), on: T.dash[0] + 0.4 }
  anchors.client = { p: client.group.localToWorld(new T3.Vector3(-0.6, 1.57, 0)), on: T.client[0] + 0.4 }

  const L = LINE.cells * LINE.pitch
  const d = new T3.Object3D()
  const col = new T3.Color()
  const tmp = new T3.Color()
  const v3 = new T3.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  const camP0 = new T3.Vector3(6.8, 3.1, 9.2)
  const camL0 = new T3.Vector3(-2.4, 1.2, -2.2)
  const camP1 = new T3.Vector3(2.6, 6.0, 15.2)
  const camL1 = new T3.Vector3(-1.0, 2.75, -3.0)
  const camPos = new T3.Vector3()
  const camLook = new T3.Vector3()
  const stateHex = [COLOR.phos, COLOR.amber, COLOR.blue, COLOR.teal]

  return {
    update(t) {
      const hud = hudRef.current
      const power = smooth(seg(t, T.powerOn, T.powerOn + 0.7))
      const s = travel(t)

      // ── 카메라 ──
      const k = easeInOutCubic(seg(t, T.cam[0], T.cam[1]))
      camPos.lerpVectors(camP0, camP1, k)
      camLook.lerpVectors(camL0, camL1, k)
      const tau = Math.max(0, t - T.heroEnd)
      const w = smooth(seg(t, T.heroEnd, T.heroEnd + 3))
      camPos.x += Math.sin(tau * 0.13) * 2.6 * w
      camPos.y += Math.sin(tau * 0.09) * 0.5 * w
      camPos.z += (Math.cos(tau * 0.13) - 1) * 1.2 * w
      camLook.x += Math.sin(tau * 0.1) * 0.6 * w
      // 히어로 초반 미세한 핸드헬드 드리프트.
      camPos.y += Math.sin(t * 0.7) * 0.05
      camera.position.copy(camPos)
      camera.lookAt(camLook)

      // ── 컨베이어/셀 ──
      for (let i = 0; i < LINE.cells * 2; i++) {
        d.position.set(LINE.x0 + mod(i * (L / (LINE.cells * 2)) + s, L), LINE.beltY - 0.005, 0)
        d.scale.set(1, 1, 1)
        d.rotation.set(0, 0, 0)
        d.updateMatrix()
        line.slats.setMatrixAt(i, d.matrix)
      }
      line.slats.instanceMatrix.needsUpdate = true
      line.railMat.color.copy(hdr(T3, COLOR.phos, 0.18 + 0.35 * power))
      line.slotMat.color.copy(hdr(T3, COLOR.phos, 0.12 + 0.22 * power))

      for (let i = 0; i < LINE.cells; i++) {
        const xr = mod(i * LINE.pitch + s, L)
        const x = LINE.x0 + xr
        const edge = Math.min(1, Math.max(0, (xr - 0.05) / 0.45), Math.max(0, (L - xr - 0.05) / 0.45))
        const sc = Math.max(0.001, smooth(edge))
        let state = -1
        for (let j = 0; j < STATIONS.length; j++) if (x > STATIONS[j].x) state = j
        // 스테이션 접촉 플래시.
        let flash = 0
        for (const st of STATIONS) flash = Math.max(flash, 1 - Math.min(1, Math.abs(x - st.x) / 0.22))
        flash = smooth(flash) * power
        const y = LINE.beltY + 0.3
        d.rotation.set(0, i * 0.7, 0)
        d.position.set(x, y, 0)
        d.scale.set(sc, sc, sc)
        d.updateMatrix()
        line.bodies.setMatrixAt(i, d.matrix)
        d.position.set(x, y + 0.31 * sc, 0)
        d.updateMatrix()
        line.caps.setMatrixAt(i, d.matrix)
        d.position.set(x, y + 0.12 * sc, 0)
        d.updateMatrix()
        line.bands.setMatrixAt(i, d.matrix)

        const hex = state >= 0 ? stateHex[state] : COLOR.dim
        const lit = state >= 0 ? (state === 0 ? 0.9 : 1.9) : 0.25
        col.setRGB(0.09, 0.09, 0.09).lerp(tmp.copy(hdr(T3, hex, lit * (1 + flash * 1.4))), 0.25 + 0.75 * power)
        line.caps.setColorAt(i, col)
        col.setRGB(0.12, 0.12, 0.12).lerp(tmp.copy(hdr(T3, hex, state >= 1 ? 0.9 : 0.25)), 0.2 + 0.8 * power)
        line.bands.setColorAt(i, col)
        col.setRGB(0.36, 0.4, 0.43).lerp(tmp.setHex(hex), state >= 1 ? 0.12 : 0.0)
        line.bodies.setColorAt(i, col)
      }
      for (const m of [line.bodies, line.caps, line.bands]) {
        m.instanceMatrix.needsUpdate = true
        if (m.instanceColor) m.instanceColor.needsUpdate = true
      }

      // ── 스테이션 ──
      for (const st of stations) {
        const raw = seg(t, st.def.on, st.def.on + 0.4)
        const flick = raw > 0 && raw < 1 ? (hash(Math.floor(t * 28) + st.def.x) > 0.45 ? 1 : 0.25) : 1
        const on = smooth(raw) * flick
        const dn = mod(st.def.x - LINE.x0 - s, LINE.pitch)
        const dist = Math.min(dn, LINE.pitch - dn)
        const contact = smooth(Math.max(0, 1 - dist / 0.2)) * smooth(raw)
        st.strip.color.copy(hdr(T3, st.def.color, (st.def.id === 'scan' ? 0.55 : 1) * (0.22 + on * (1.6 + contact * 1.2))))
        st.light.intensity = on * (2.5 + contact * 5)
        st.floorGlow.color.copy(hdr(T3, st.def.color, on * (0.28 + contact * 0.3)))
        if (st.head) st.head.position.y = 1.65 - 0.17 * contact
        if (st.beamMat) st.beamMat.uniforms.uOpacity.value = on * (st.def.id === 'scan' ? 0.03 + 0.22 * contact : 0.1 + 0.55 * contact)
        if (st.pushers) for (const p of st.pushers) p.position.z = (p.userData.side as number) * (0.5 - 0.17 * contact)
        if (st.ring) {
          ;(st.ring.material as THREE.MeshBasicMaterial).opacity = contact
          st.ring.scale.setScalar(1 + (1 - contact) * 0.5)
        }
      }

      // ── 데이터 경로 + 패킷 ──
      const coreOn = smooth(seg(t, T.core[0], T.core[1]))
      const pulses = [0, 0, 0]
      paths.forEach((ph, pi) => {
        const [g0, g1] = ph.station.path!.grow
        const g = easeInOutCubic(seg(t, g0, g1))
        const cnt = Math.floor((ph.indexCount * g) / 3) * 3
        ph.core.geometry.setDrawRange(0, cnt)
        ph.glow.geometry.setDrawRange(0, cnt)
        const f = mod((s - (ph.station.x - LINE.x0)) / LINE.pitch, 1)
        pulses[pi] = Math.pow(1 - f, 5) * coreOn
        for (let j = 0; j < PACKETS_PER_PATH; j++) {
          const u = (f + j) / PACKETS_PER_PATH
          const idx = pi * PACKETS_PER_PATH + j
          const vis = u <= g && power > 0
          ph.curve.getPointAt(Math.min(1, u), v3)
          d.position.copy(v3)
          d.rotation.set(t * 1.3 + j, t * 0.9 + pi, 0)
          const sc = vis ? 1 - 0.5 * smooth(seg(u, 0.85, 1)) : 0.0001
          d.scale.setScalar(sc)
          d.updateMatrix()
          packets.setMatrixAt(idx, d.matrix)
          packets.setColorAt(idx, col.copy(hdr(T3, ph.station.color, 3.2)))
        }
      })

      // ── 코어 ──
      const pulseSum = pulses[0] + pulses[1] + pulses[2]
      core.rimMats.forEach((m, i) => {
        const p = i === 0 ? pulses[0] : i === 1 ? Math.max(pulses[0], pulses[1]) : i === 2 ? Math.max(pulses[1], pulses[2]) : pulses[2]
        m.color.copy(hdr(T3, COLOR.teal, 0.05 + coreOn * (1.3 + 1.6 * p)))
        if (t < T.built) m.color.lerp(tmp.copy(hdr(T3, COLOR.red, 0.75 * (hash(Math.floor(t * 14) + i) > 0.3 ? 1 : 0.3))), 1 - seg(t, T.built - 0.3, T.built))
      })
      core.columnMat.color.copy(hdr(T3, COLOR.teal, 0.04 + coreOn * (1.1 + 0.2 * Math.sin(t * 2.4) + 0.5 * pulseSum)))
      core.orbits.forEach((o, i) => (o.rotation.y = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1)))
      core.orbitMats.forEach((m, i) => {
        m.opacity = coreOn
        m.color.copy(hdr(T3, i === 1 ? COLOR.blue : COLOR.teal, 1.1))
      })
      core.light.intensity = coreOn * (10 + 6 * pulseSum)
      env.poolMat.color.copy(hdr(T3, COLOR.teal, 0.1 + 0.55 * coreOn))
      const apiOn = smooth(seg(t, T.api[0], T.api[1]))
      core.apiMat.color.copy(hdr(T3, COLOR.phos, apiOn * (1.6 + 0.4 * Math.sin(t * 5))))
      core.apiMat.opacity = apiOn

      // ── 홀로그램 패널 ──
      const dashOn = easeOutCubic(seg(t, T.dash[0], T.dash[1]))
      const clientOn = easeOutCubic(seg(t, T.client[0], T.client[1]))
      const holoFlick = 0.9 + 0.1 * Math.sin(t * 17) * Math.sin(t * 5.3)
      for (const [panel, on] of [
        [dash, dashOn],
        [client, clientOn],
      ] as const) {
        panel.group.visible = on > 0.001
        panel.group.scale.set(0.7 + 0.3 * on, Math.max(0.001, on), 1)
        for (const { m, base } of panel.mats) m.opacity = base * on * holoFlick
      }
      dash.update(t, seg(t, T.dash[0] + 0.2, T.dash[1] + 1.0), pulses)
      client.update(s, seg(t, T.client[0] + 0.2, T.client[1] + 0.8))
      const beamOn = Math.max(dashOn, clientOn)
      beamMat.opacity = beamOn * 0.45
      fanMat.opacity = beamOn * 0.05
      // 코어 → 패널 피드 패킷.
      panelFeeds.forEach((f, pi) => {
        const on = pi === 0 ? dashOn : clientOn
        for (let j = 0; j < FEED_PER_PANEL; j++) {
          const u = mod(t * 0.55 + j / FEED_PER_PANEL + pi * 0.37, 1)
          const idx = nPathPackets + pi * FEED_PER_PANEL + j
          v3.lerpVectors(src, f.bc, u)
          d.position.copy(v3)
          d.rotation.set(t, t * 1.2, 0)
          d.scale.setScalar(on > 0.05 ? 0.55 * Math.sin(Math.PI * u) + 0.0001 : 0.0001)
          d.updateMatrix()
          packets.setMatrixAt(idx, d.matrix)
          packets.setColorAt(idx, col.copy(hdr(T3, COLOR.phos, 2.6)))
        }
      })
      packets.instanceMatrix.needsUpdate = true
      if (packets.instanceColor) packets.instanceColor.needsUpdate = true

      env.dust.rotation.y = t * 0.012
      env.dust.position.y = Math.sin(t * 0.21) * 0.15

      // ── HUD ──
      camera.updateMatrixWorld()
      for (const id of Object.keys(anchors) as LabelId[]) {
        const a = anchors[id]!
        const el = hud.labels[id]
        if (!el) continue
        projectToScreen(ctx, a.p, scr)
        const op = scr.visible ? smooth(seg(t, a.on, a.on + 0.45)) : 0
        placeLabel(el, scr.x, scr.y, op)
      }
      if (hud.ledger) {
        const out = easeInOutCubic(seg(t, T.ledgerOut[0], T.ledgerOut[1]))
        hud.ledger.style.opacity = (1 - out).toFixed(3)
        hud.ledger.style.transform = `translate3d(${(-30 * out).toFixed(1)}px, ${(-14 * out).toFixed(1)}px, 0) scale(${(1 - 0.06 * out).toFixed(3)})`
        hud.ledger.style.visibility = out >= 1 ? 'hidden' : 'visible'
      }
      if (hud.mesRow) {
        const built = t >= T.built
        hud.mesRow.dataset.state = built ? 'built' : 'missing'
        const fl = t < T.missingFrom ? 0.85 : hash(Math.floor(t * 14)) > 0.3 ? 1 : 0.35
        hud.mesRow.style.setProperty('--flick', built ? '1' : fl.toFixed(2))
        hud.mesRow.style.setProperty('--stamp', easeOutCubic(seg(t, T.built, T.built + 0.35)).toFixed(3))
      }
      hud.chips.forEach((el, i) => {
        if (!el) return
        el.dataset.on = t >= STACK[i].on ? '1' : '0'
      })
      if (hud.head) {
        const h = easeOutCubic(seg(t, T.headline[0], T.headline[1]))
        hud.head.style.opacity = h.toFixed(3)
        hud.head.style.transform = `translate3d(0, ${(12 * (1 - h)).toFixed(1)}px, 0)`
      }
    },
  }
}
