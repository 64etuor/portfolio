import { roomEnvironment } from '../_host/three/env'
import type * as THREE from 'three'
import { easeInOutCubic, easeOutCubic, placeLabel, projectToScreen, seg, setData, setStyle } from '../_host/three/helpers'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import { createSoundTimeline, soundAt } from '../_host/sceneSound'
import {
  ARM,
  buildCore,
  buildEnvironment,
  buildLegacy,
  buildLine,
  buildPackets,
  buildPaths,
  buildPouches,
  buildStacker,
  buildStations,
  fatMat,
  fatSegments,
  flushKit,
  hdr,
  loadAddons,
  makeKit,
  setOpacity,
} from './build'
import { COLOR, CORE, LEGACY, LEGACY_DEF, LINE, PICK_X, PROTO_COLOR, ROLL, STACK, STACKER, STATIONS, SUB, T, type LabelId } from './data'
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
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const mod = (a: number, n: number) => ((a % n) + n) % n
const hash = (n: number) => {
  const s = Math.sin(n * 91.7) * 43758.5453
  return s - Math.floor(s)
}
/** 키프레임 [u, v] 사이 smoothstep 보간(u 오름차순). */
function kf(u: number, keys: readonly (readonly [number, number])[]) {
  if (u <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [u1, v1] = keys[i]
    if (u <= u1) {
      const [u0, v0] = keys[i - 1]
      return v0 + (v1 - v0) * smooth((u - u0) / Math.max(1e-6, u1 - u0))
    }
  }
  return keys[keys.length - 1][1]
}

/** 컨베이어 누적 이송 거리(결정적). 가속 1s 후 등속. */
function travel(t: number) {
  const tau = t - T.conveyor
  if (tau <= 0) return 0
  const A = 1.0
  return tau < A ? (LINE.speed * tau * tau) / (2 * A) : LINE.speed * (tau - A / 2)
}

/** 라인 전원 램프(초) — 레일·패킷 밝기가 0 → 1 로 오르는 구간. */
const POWER_RAMP = 0.7
/** 예산표 "누락" 깜빡임 주파수(Hz). */
const FLICK_HZ = 14
const PER_PATH = 5
const FEED_PER_PANEL = 6
const CAP = 24
const INIT_STACK = 9
const L = LINE.count * LINE.pitch
const PICK_Y = LINE.topY + LINE.ph
const HOVER_Y = 1.34
const PALLET_TOP = 0.16

// 글라스울 그리퍼 궤적(u = 다음 파우치 도착 진행도 0→1).
const GRIP_Z = [
  [0, 0],
  [0.06, 0],
  [0.28, -1.05],
  [0.46, -1.05],
  [0.7, 0],
  [1, 0],
] as const
const PAD_PLACE = LINE.topY + 0.021 + 0.1
const PAD_PICK = 1.125
const GRIP_Y = [
  [0, PAD_PLACE],
  [0.1, 1.5],
  [0.28, 1.5],
  [0.34, PAD_PICK],
  [0.38, PAD_PICK],
  [0.46, 1.5],
  [0.74, 1.5],
  [1, PAD_PLACE],
] as const

export async function setupMesLine(ctx: ThreeContext, hudRef: { current: Hud }): Promise<ThreeSetupResult> {
  const { THREE: T3, scene, camera } = ctx
  const [A, envRT] = await Promise.all([loadAddons(), roomEnvironment(ctx)])
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.32

  const k = makeKit(T3, A, scene)
  const env = buildEnvironment(k)
  const line = buildLine(k)
  const pz = buildPouches(k)
  const { handles: stations, glows } = buildStations(k)
  const stk = buildStacker(k, pz.geo)
  const legacy = buildLegacy(k)
  const pathDefs = [
    ...STATIONS.map((s) => ({ from: s.path.from, entryY: s.path.entryY, color: PROTO_COLOR[s.proto], grow: s.path.grow })),
    { from: LEGACY_DEF.path.from, entryY: LEGACY_DEF.path.entryY, color: COLOR.amber, grow: LEGACY_DEF.path.grow },
  ]
  const paths = buildPaths(k, pathDefs)
  const core = buildCore(k)
  const nPathPk = paths.length * PER_PATH
  const packets = buildPackets(k, nPathPk + FEED_PER_PANEL * 2)

  const dash = buildDash(k)
  dash.group.position.set(3.9, 4.95, -6.1)
  const client = buildClient(k)
  client.group.position.set(-6.3, 4.8, -5.9)
  scene.add(dash.group, client.group)
  const camFocus = new T3.Vector3(1.0, 5.2, 15)
  dash.group.lookAt(camFocus)
  client.group.lookAt(camFocus)
  dash.group.updateMatrixWorld(true)
  client.group.updateMatrixWorld(true)
  flushKit(k)

  // 프로젝션 빔: 코어 상단 → 패널 하단 모서리(팻 라인) + 옅은 면.
  const src = core.top.clone()
  const panelFeeds = [
    { g: dash.group, w: 5.4, h: 3.0 },
    { g: client.group, w: 3.2, h: 2.9 },
  ].map(({ g, w, h }) => ({
    bl: g.localToWorld(new T3.Vector3(-w / 2, -h / 2, 0)),
    br: g.localToWorld(new T3.Vector3(w / 2, -h / 2, 0)),
    bc: g.localToWorld(new T3.Vector3(0, -h / 2, 0)),
  }))
  const beamPts: number[] = []
  for (const f of panelFeeds) beamPts.push(src.x, src.y, src.z, f.bl.x, f.bl.y, f.bl.z, src.x, src.y, src.z, f.br.x, f.br.y, f.br.z)
  const beamMat = fatMat(k, COLOR.teal, 1.0, 1.2, 0)
  scene.add(fatSegments(k, beamPts, beamMat))
  const fanPos: number[] = []
  for (const f of panelFeeds) fanPos.push(src.x, src.y, src.z, f.bl.x, f.bl.y, f.bl.z, f.br.x, f.br.y, f.br.z)
  const fanGeo = new T3.BufferGeometry()
  fanGeo.setAttribute('position', new T3.Float32BufferAttribute(fanPos, 3))
  const fanMat = new T3.MeshBasicMaterial({ color: hdr(T3, COLOR.teal, 0.6), transparent: true, opacity: 0, blending: T3.AdditiveBlending, depthWrite: false, side: T3.DoubleSide })
  scene.add(new T3.Mesh(fanGeo, fanMat))

  // 라벨 앵커.
  const V = (x: number, y: number, z: number) => new T3.Vector3(x, y, z)
  const labelX: Record<string, number> = { cut: -8.6, stack: STACKER.palletX }
  const anchors: Partial<Record<LabelId, { p: THREE.Vector3; on: number }>> = {}
  for (const st of STATIONS) anchors[st.id] = { p: V(labelX[st.id] ?? st.x, 0.28, 0.8), on: st.on + 0.1 }
  anchors.legacy = { p: V(LEGACY.x, 1.42, LEGACY.z), on: 3.9 }
  const gIdx = STATIONS.findIndex((s) => s.id === 'stack')
  const vIdx = STATIONS.findIndex((s) => s.id === 'vision')
  anchors['p-opc'] = { p: paths[gIdx].curve.getPointAt(0.18), on: STATIONS[gIdx].path.grow[0] + 0.45 }
  anchors['p-tcp'] = { p: paths[vIdx].curve.getPointAt(0.14), on: STATIONS[vIdx].path.grow[0] + 0.45 }
  anchors['p-legacy'] = { p: paths[paths.length - 1].curve.getPointAt(0.5), on: LEGACY_DEF.path.grow[0] + 0.45 }
  anchors.core = { p: V(CORE.x + 1.15, 1.0, CORE.z), on: T.core[0] + 0.3 }
  anchors.api = { p: V(CORE.x + 0.95, 3.72, CORE.z), on: T.api[0] + 0.2 }
  anchors.dash = { p: dash.group.localToWorld(V(-1.8, 1.62, 0)), on: T.dash[0] + 0.4 }
  anchors.client = { p: client.group.localToWorld(V(0.35, 1.57, 0)), on: T.client[0] + 0.4 }

  const d = new T3.Object3D()
  const col = new T3.Color()
  const v3 = new T3.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  const camP0 = V(-2.4, 2.0, 4.8)
  const camL0 = V(-9.4, 0.85, -1.3)
  const camP1 = V(0.2, 6.4, 16.2)
  const camL1 = V(-0.6, 1.72, -3.0)
  const camPos = new T3.Vector3()
  const camLook = new T3.Vector3()
  const pulses = [0, 0, 0] // opc · tcp · legacy
  const woolSt = STATIONS.find((s) => s.id === 'wool')!
  const sealCX = SUB.seal + LINE.pw / 2 - 0.04
  const fatMats = k.fat

  /** 기준 x 에서 가장 가까운 파우치까지 거리(이송 s). */
  const nearest = (sx: number, s: number) => {
    const dn = mod(sx - LINE.x0 - s, LINE.pitch)
    return Math.min(dn, LINE.pitch - dn)
  }
  const contactAt = (sx: number, s: number, w = 0.22) => smooth(clamp01(1 - nearest(sx, s) / w))

  const slot = (n: number, ox: number, oz: number, out: THREE.Vector3) => {
    const layer = Math.floor(n / 4)
    const r = n % 4
    return out.set(STACKER.palletX + ox + (r % 2 ? 0.37 : -0.37), PALLET_TOP + layer * 0.152 + LINE.ph / 2, STACKER.palletZ + oz + (r < 2 ? -0.26 : 0.26))
  }
  const tgt = new T3.Vector3()
  const tP = new T3.Vector3()
  const tQ = new T3.Vector3()

  function solveArm(x: number, z: number, plateBottom: number) {
    const dx = x - STACKER.baseX
    const dz = z - STACKER.baseZ
    const D = Math.min(ARM.l1 + ARM.l2 - 1e-3, Math.hypot(dx, dz))
    const a = Math.atan2(-dz, dx)
    const c2 = Math.max(-1, Math.min(1, (D * D - ARM.l1 * ARM.l1 - ARM.l2 * ARM.l2) / (2 * ARM.l1 * ARM.l2)))
    const t2 = -Math.acos(c2)
    const t1 = a - Math.atan2(ARM.l2 * Math.sin(t2), ARM.l1 + ARM.l2 * Math.cos(t2))
    stk.link1.rotation.y = t1
    stk.link2.rotation.y = t2
    stk.quill.rotation.y = -(t1 + t2)
    stk.quill.position.y = plateBottom + 0.02 - ARM.y2
  }

  // ── 사운드 이벤트(필름에서만 울림) — 화면 비트와 같은 T 상수에서 발화, x 는 화면 위치(패닝). ──
  const cues = createSoundTimeline(ctx.sound)
  const worldX = (p: THREE.Vector3) => clamp01(projectToScreen(ctx, p, scr).x / Math.max(1, ctx.size.w))
  const elX = (el: Element | null | undefined) => {
    if (!el) return 0.5
    const r = el.getBoundingClientRect()
    const c = ctx.container.getBoundingClientRect()
    return clamp01((r.left + r.width / 2 - c.left) / Math.max(1, c.width))
  }
  const growStart = Math.min(...pathDefs.map((p) => p.grow[0]))
  const growEnd = Math.max(...pathDefs.map((p) => p.grow[1]))
  const firstPath = pathDefs.reduce((a, b) => (b.grow[0] < a.grow[0] ? b : a))
  const pathFrom = V(firstPath.from[0], firstPath.from[1], firstPath.from[2])
  const coreMid = V(CORE.x, CORE.y + 1, CORE.z)
  // 라인 중 화면에 보이는 구간의 가운데(근접 샷에선 라인 대부분이 화면 밖).
  const lineX = () => (worldX(v3.set(LINE.x0, LINE.topY, 0)) + worldX(v3.set(PICK_X, LINE.topY, 0))) / 2
  // "누락" 깜빡임: 컷 직후를 피해 첫 '어두운' 깜빡임 프레임(HUD 의 hash(floor(t·14)) ≤ 0.3 과 같은 식).
  let missingAt = T.missingFrom
  for (let f = Math.ceil(Math.max(T.missingFrom, 0.4) * FLICK_HZ); f / FLICK_HZ < T.built; f++) {
    if (hash(f) <= 0.3) {
      missingAt = f / FLICK_HZ
      break
    }
  }
  const sounds = (t: number) => {
    if (t >= T.heroEnd) return
    const hud = hudRef.current
    // 예산표 "MES 외주 개발비 · 누락" 깜빡임 — 결함 톤
    soundAt(cues, t, missingAt, 'defect', () => ({ id: 'mes.missing', x: elX(hud.mesRow), intensity: 0.7 }))
    // 스탬프 → 자체 개발
    soundAt(cues, t, T.built, 'lock', () => ({ id: 'mes.stamp', x: elX(hud.mesRow) }))
    // 라인 전원 — 레일·스테이션이 켜지며 오른다
    soundAt(cues, t, T.powerOn, 'rise', () => ({ id: 'mes.power', x: lineX(), durationS: POWER_RAMP, intensity: 0.8 }))
    // 스테이션 → PostgreSQL 데이터 경로가 자란다
    soundAt(cues, t, growStart, 'data', () => ({ id: 'mes.paths', x: worldX(pathFrom), toX: worldX(coreMid), durationS: growEnd - growStart }))
    // 코어 점화
    soundAt(cues, t, T.core[0], 'reveal', () => ({ id: 'mes.core', x: worldX(coreMid) }))
    // 홀로그램: Python Dash · MES 클라이언트
    soundAt(cues, t, T.dash[0], 'node', () => ({ id: 'mes.dash', x: worldX(dash.group.position), intensity: 0.7 }))
    soundAt(cues, t, T.client[0], 'node', () => ({ id: 'mes.client', x: worldX(client.group.position), intensity: 0.7 }))
    // 헤드라인 "MES 자체 개발" — 결론
    soundAt(cues, t, T.headline[0], 'payoff', () => ({ id: 'mes.headline', x: elX(hud.head) }))
  }

  function update(t: number) {
    const hud = hudRef.current
    const power = smooth(seg(t, T.powerOn, T.powerOn + POWER_RAMP))
    const s = travel(t)

    // ── 카메라 ──
    const kc = easeInOutCubic(seg(t, T.cam[0], T.cam[1]))
    camPos.lerpVectors(camP0, camP1, kc)
    camLook.lerpVectors(camL0, camL1, kc)
    // 중간에 살짝 높게 호를 그리며 빠진다.
    camPos.y += Math.sin(Math.PI * kc) * 1.2
    camPos.x += Math.sin(Math.PI * kc) * 1.4
    const tau = Math.max(0, t - T.heroEnd)
    const w = smooth(seg(t, T.heroEnd, T.heroEnd + 3))
    camPos.x += Math.sin(tau * 0.11) * 2.4 * w
    camPos.y += Math.sin(tau * 0.08) * 0.45 * w
    camPos.z += (Math.cos(tau * 0.11) - 1) * 1.2 * w
    camLook.x += Math.sin(tau * 0.09) * 0.6 * w
    camPos.y += Math.sin(t * 0.7) * 0.03
    camera.position.copy(camPos)
    camera.lookAt(camLook)

    // ── 컨베이어: 웹 · 롤 ──
    line.webTex.offset.x = -mod(s / LINE.pitch, 1)
    line.roll.rotation.z = s / ROLL.r
    line.railMat.color.copy(hdr(T3, COLOR.phos, 0.1 + 0.5 * power))

    // ── 파우치 ──
    for (let i = 0; i < LINE.count; i++) {
      const xr = mod(i * LINE.pitch + s, L)
      const x = LINE.x0 + xr
      const puff = smooth(seg(x, SUB.seal + 0.12, SUB.seal + 0.5))
      const sy = 0.14 + 0.86 * puff
      const th = LINE.ph * sy
      d.position.set(x, LINE.topY + th / 2, 0)
      d.rotation.set(0, 0, 0)
      d.scale.set(1, th, 1)
      d.updateMatrix()
      pz.pouches.setMatrixAt(i, d.matrix)

      // 글라스울 배트 — 투입 스테이션 통과 후 ~ 밀봉 직후까지.
      const hasWool = x >= woolSt.x && x < SUB.seal + 0.55
      d.position.set(x, LINE.topY + 0.021 + 0.05, 0)
      d.rotation.set(0, (hash(i + 3) - 0.5) * 0.06, 0)
      d.scale.setScalar(hasWool ? 1 : 1e-4)
      d.updateMatrix()
      pz.batts.setMatrixAt(i, d.matrix)
      pz.shells.setMatrixAt(i, d.matrix)

      // 실링 라인 잔열.
      const hot = x > sealCX - 0.05 ? Math.exp(-Math.max(0, x - sealCX) / 0.55) * smooth(clamp01((x - sealCX + 0.05) / 0.1)) : 0
      d.position.set(x, LINE.topY + th / 2, 0)
      d.rotation.set(0, 0, 0)
      d.scale.setScalar(hot > 0.01 ? 1 : 1e-4)
      d.updateMatrix()
      pz.rims.setMatrixAt(i, d.matrix)
      pz.rims.setColorAt(i, col.copy(hdr(T3, COLOR.heat, 1.4 * hot * power)))

      // S/N 바코드 라벨 — 밀봉 후.
      d.position.set(x - 0.13, LINE.topY + th + 0.003, 0.02)
      d.scale.setScalar(puff > 0.97 ? 1 : 1e-4)
      d.updateMatrix()
      pz.tags.setMatrixAt(i, d.matrix)
    }
    for (const m of [pz.pouches, pz.batts, pz.shells, pz.rims, pz.tags]) m.instanceMatrix.needsUpdate = true
    if (pz.rims.instanceColor) pz.rims.instanceColor.needsUpdate = true

    // ── 스테이션 ──
    for (const st of stations) {
      const def = st.def
      const raw = seg(t, def.on, def.on + 0.4)
      const flick = raw > 0 && raw < 1 ? (hash(Math.floor(t * 28) + def.x) > 0.45 ? 1 : 0.3) : 1
      const on = smooth(raw) * flick
      const hex = PROTO_COLOR[def.proto]
      let c = 0
      if (def.id === 'cut') {
        const ph = mod(s / LINE.pitch, 1)
        const cutP = smooth(clamp01(1 - (Math.min(ph, 1 - ph) * LINE.pitch) / 0.09)) * Math.min(1, s / 0.3)
        st.parts.blade.position.y = 1.22 - 0.4 * cutP
        const ca = contactAt(SUB.align + LINE.pw / 2, s, 0.18)
        c = Math.max(cutP, ca)
        if (st.beamMat) st.beamMat.uniforms.uOpacity.value = on * (0.1 + 0.45 * ca)
      } else if (def.id === 'wool') {
        const dd = mod(def.x - LINE.x0 - s, LINE.pitch)
        const u = 1 - dd / LINE.pitch
        const gz = kf(u, GRIP_Z)
        const gy = kf(u, GRIP_Y)
        const gx = def.x - dd * smooth(seg(u, 0.66, 0.8))
        const { carriage, rod, pad, held } = st.parts
        carriage.position.set(gx, 2.04, gz)
        const len = 2.0 - gy
        rod.position.set(gx, gy + len / 2, gz)
        rod.scale.set(1, len, 1)
        pad.position.set(gx, gy + 0.0175, gz)
        const carry = u >= 0.36 && u < 0.9999
        held.position.set(gx, gy - 0.05, gz)
        held.scale.setScalar(carry ? 1 : 1e-4)
        c = smooth(clamp01(1 - dd / 0.2)) + smooth(clamp01(1 - (LINE.pitch - dd) / 0.2))
      } else if (def.id === 'seal') {
        const ci = contactAt(SUB.inject, s, 0.2)
        const cs = contactAt(sealCX, s, 0.2)
        st.parts.noz.position.y = 1.55 - 0.15 * ci
        setOpacity(st.mats.drop, ci * power * 0.9)
        st.parts.jaw.position.y = 1.25 - 0.46 * cs
        ;(st.mats.heat as THREE.MeshBasicMaterial).color.copy(hdr(T3, COLOR.heat, 0.12 + 2.4 * cs * power))
        if (st.light) st.light.intensity = cs * power * 3.5
        c = Math.max(ci, cs)
      } else if (def.id === 'gauge') {
        c = contactAt(def.x, s, 0.24)
        setOpacity(st.mats.curtain, on * (0.1 + 0.8 * c))
        ;(st.mats.screen as THREE.MeshBasicMaterial).color.copy(hdr(T3, 0xffffff, 0.15 + on * 0.85))
        const bw = 0.48 * (0.08 + 0.92 * c) * on + 1e-4
        st.parts.bar.scale.set(bw, 0.07, 1)
        st.parts.bar.position.x = -0.24 + bw / 2
      } else if (def.id === 'vision') {
        c = contactAt(def.x, s, 0.3)
        ;(st.mats.ring as THREE.MeshBasicMaterial).color.copy(hdr(T3, COLOR.blue, 0.15 + on * (0.7 + 2.0 * c)))
        if (st.beamMat) st.beamMat.uniforms.uOpacity.value = on * (0.05 + 0.45 * c)
        if (st.light) st.light.intensity = on * (1.2 + 4 * c)
      } else {
        c = 0
      }
      st.strip.color.copy(hdr(T3, hex, 0.18 + on * (1.0 + 0.9 * c)))
      glows.setColorAt(st.glowIdx, col.copy(hdr(T3, hex, on * (0.1 + 0.22 * c))))
    }

    // ── 적재 로봇 + 팔레트 ──
    const nP = s / LINE.pitch
    const picks = Math.floor(nP)
    const phi = nP - picks
    const cont = INIT_STACK + Math.max(0, nP - 0.5)
    const placed = Math.floor(cont)
    const cyc = Math.floor(placed / CAP)
    const j = placed - cyc * CAP
    const q = cyc > 0 ? easeInOutCubic(clamp01((cont - cyc * CAP) / 0.8)) : 1
    const newOz = (1 - q) * 2.6
    const oldOx = q * 3.4
    // 팔레트 2개: 0 = 현재, 1 = 퇴장(교체 중일 때만).
    d.rotation.set(0, 0, 0)
    d.scale.setScalar(1)
    d.position.set(STACKER.palletX, 0, STACKER.palletZ + newOz)
    d.updateMatrix()
    stk.pallets.setMatrixAt(0, d.matrix)
    stk.shadows[0].position.set(STACKER.palletX, 0.007, STACKER.palletZ + newOz)
    const swapping = cyc > 0 && q < 1
    d.position.set(STACKER.palletX + oldOx, 0, STACKER.palletZ)
    d.scale.setScalar(swapping ? 1 : 1e-4)
    d.updateMatrix()
    stk.pallets.setMatrixAt(1, d.matrix)
    stk.shadows[1].position.set(STACKER.palletX + oldOx, swapping ? 0.007 : -1, STACKER.palletZ)
    stk.pallets.instanceMatrix.needsUpdate = true
    for (let n = 0; n < CAP; n++) {
      d.rotation.set(0, (hash(n * 1.3 + cyc) - 0.5) * 0.05, 0)
      slot(n, 0, newOz, v3)
      d.position.copy(v3)
      d.scale.set(1, LINE.ph, 1).multiplyScalar(n < j ? 1 : 1e-4)
      d.updateMatrix()
      stk.stack.setMatrixAt(n, d.matrix)
      slot(n, oldOx, 0, v3)
      d.position.copy(v3)
      d.scale.set(1, LINE.ph, 1).multiplyScalar(swapping ? 1 : 1e-4)
      d.updateMatrix()
      stk.stack.setMatrixAt(CAP + n, d.matrix)
    }
    stk.stack.instanceMatrix.needsUpdate = true

    // 로봇 궤적: φ 0 픽 → 0.5 플레이스 → 1 다음 픽.
    tP.set(PICK_X, PICK_Y, 0)
    slot(j, 0, newOz, tQ)
    const placeY = tQ.y + LINE.ph / 2
    let carry = false
    if (picks < 1) {
      tgt.set(PICK_X, PICK_Y + 0.12 * (1 - phi), 0)
    } else if (phi < 0.5) {
      carry = true
      const m = smooth(seg(phi, 0.1, 0.4))
      tgt.x = tP.x + (tQ.x - tP.x) * m
      tgt.z = tP.z + (tQ.z - tP.z) * m
      tgt.y = phi < 0.1 ? PICK_Y + (HOVER_Y - PICK_Y) * smooth(phi / 0.1) : phi < 0.4 ? HOVER_Y : HOVER_Y + (placeY - HOVER_Y) * smooth((phi - 0.4) / 0.1)
    } else {
      // 플레이스 직후 슬롯은 j-1(이미 증가) — 손이 떠나는 위치를 유지.
      slot(Math.max(0, j - 1), 0, newOz, tQ)
      const qy = tQ.y + LINE.ph / 2
      const m = smooth(seg(phi, 0.58, 0.88))
      tgt.x = tQ.x + (tP.x - tQ.x) * m
      tgt.z = tQ.z + (tP.z - tQ.z) * m
      tgt.y = phi < 0.58 ? qy + (HOVER_Y - qy) * smooth((phi - 0.5) / 0.08) : phi < 0.88 ? HOVER_Y : HOVER_Y + (PICK_Y - HOVER_Y) * smooth((phi - 0.88) / 0.12)
    }
    solveArm(tgt.x, tgt.z, tgt.y)
    stk.carried.position.set(tgt.x, tgt.y - LINE.ph / 2, tgt.z)
    stk.carried.scale.set(1, LINE.ph, 1).multiplyScalar(carry ? 1 : 1e-4)

    // ── 데이터 경로 + 패킷 ──
    const coreOn = smooth(seg(t, T.core[0], T.core[1]))
    pulses[0] = pulses[1] = pulses[2] = 0
    paths.forEach((ph, pi) => {
      const def = pathDefs[pi]
      const g = easeInOutCubic(seg(t, def.grow[0], def.grow[1]))
      const cnt = Math.floor((ph.indexCount * g) / 3) * 3
      ph.core.geometry.setDrawRange(0, cnt)
      ph.glow.geometry.setDrawRange(0, cnt * 1)
      const isLegacy = pi === STATIONS.length
      const sx = isLegacy ? 0 : STATIONS[pi].id === 'stack' ? PICK_X : STATIONS[pi].x
      const f = isLegacy ? mod(t * 0.42, 1) : mod((s - (sx - LINE.x0)) / LINE.pitch, 1)
      const pulse = Math.pow(1 - f, 5) * coreOn
      const slotI = isLegacy ? 2 : STATIONS[pi].proto === 'opc' ? 0 : 1
      pulses[slotI] = Math.max(pulses[slotI], pulse)
      for (let jj = 0; jj < PER_PATH; jj++) {
        const u = (f + jj) / PER_PATH
        const idx = pi * PER_PATH + jj
        const vis = u <= g && power > 0 && (isLegacy || s > 0.01)
        ph.curve.getPointAt(Math.min(1, u), v3)
        packets.pos[idx * 3] = v3.x
        packets.pos[idx * 3 + 1] = v3.y
        packets.pos[idx * 3 + 2] = v3.z
        const b = vis ? 2.4 * (1 - 0.6 * smooth(seg(u, 0.85, 1))) * Math.min(1, power) : 0
        col.copy(hdr(T3, def.color, b))
        packets.col[idx * 3] = col.r
        packets.col[idx * 3 + 1] = col.g
        packets.col[idx * 3 + 2] = col.b
      }
    })

    // ── 구형 검사 장비 ──
    const legOn = smooth(seg(t, LEGACY_DEF.on, LEGACY_DEF.on + 0.4))
    legacy.scrMat.color.copy(hdr(T3, COLOR.amber, 0.12 + legOn * (0.55 + 0.5 * Math.pow(1 - mod(t * 0.42, 1), 4))))
    glows.setColorAt(STATIONS.length, col.copy(hdr(T3, COLOR.amber, legOn * 0.14)))
    if (glows.instanceColor) glows.instanceColor.needsUpdate = true

    // ── 코어 ──
    const pulseSum = pulses[0] + pulses[1] + pulses[2]
    core.rimMats.forEach((m, i) => {
      const p = pulses[i % 3]
      m.color.copy(hdr(T3, COLOR.teal, 0.05 + coreOn * (1.2 + 1.4 * p)))
      if (t < T.built) m.color.lerp(col.copy(hdr(T3, COLOR.red, 0.75 * (hash(Math.floor(t * 14) + i) > 0.3 ? 1 : 0.3))), 1 - seg(t, T.built - 0.3, T.built))
    })
    core.columnMat.uniforms.uI.value = 0.15 + coreOn * (1.6 + 0.25 * Math.sin(t * 2.4) + 0.6 * pulseSum)
    core.orbits.forEach((o, i) => (o.rotation.y = t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1)))
    core.orbitMats.forEach((m) => setOpacity(m, coreOn * 0.9))
    core.light.intensity = coreOn * (8 + 5 * pulseSum)
    env.poolMat.color.copy(hdr(T3, COLOR.teal, 0.08 + 0.4 * coreOn))
    const apiOn = smooth(seg(t, T.api[0], T.api[1]))
    core.apiMat.color.copy(hdr(T3, COLOR.phos, apiOn * (1.5 + 0.4 * Math.sin(t * 5))))
    core.apiMat.opacity = apiOn

    // ── 홀로그램 패널 ──
    const dashOn = easeOutCubic(seg(t, T.dash[0], T.dash[1]))
    const clientOn = easeOutCubic(seg(t, T.client[0], T.client[1]))
    const holoFlick = 0.93 + 0.07 * Math.sin(t * 17) * Math.sin(t * 5.3)
    for (const [panel, on] of [
      [dash, dashOn],
      [client, clientOn],
    ] as const) {
      panel.group.visible = on > 0.001
      panel.group.scale.set(0.7 + 0.3 * on, Math.max(0.001, on), 1)
      for (const { m, base } of panel.mats) setOpacity(m, base * on * holoFlick)
    }
    dash.update(t, seg(t, T.dash[0] + 0.2, T.dash[1] + 1.0), pulses)
    client.update(s)
    const beamOn = Math.max(dashOn, clientOn)
    setOpacity(beamMat, beamOn * 0.4)
    fanMat.opacity = beamOn * 0.04
    panelFeeds.forEach((f, pi) => {
      const on = pi === 0 ? dashOn : clientOn
      for (let jj = 0; jj < FEED_PER_PANEL; jj++) {
        const u = mod(t * 0.55 + jj / FEED_PER_PANEL + pi * 0.37, 1)
        const idx = nPathPk + pi * FEED_PER_PANEL + jj
        v3.lerpVectors(src, f.bc, u)
        packets.pos[idx * 3] = v3.x
        packets.pos[idx * 3 + 1] = v3.y
        packets.pos[idx * 3 + 2] = v3.z
        const b = on > 0.05 ? 1.8 * Math.sin(Math.PI * u) : 0
        packets.col[idx * 3] = packets.col[idx * 3 + 1] = packets.col[idx * 3 + 2] = b * 0.84
      }
    })
    packets.geo.attributes.position.needsUpdate = true
    packets.geo.attributes.color.needsUpdate = true

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
      setStyle(hud.ledger, 'opacity', (1 - out).toFixed(3))
      setStyle(hud.ledger, 'transform', `translate3d(${(-30 * out).toFixed(1)}px, ${(-14 * out).toFixed(1)}px, 0) scale(${(1 - 0.06 * out).toFixed(3)})`)
      setStyle(hud.ledger, 'visibility', out >= 1 ? 'hidden' : 'visible')
    }
    if (hud.mesRow) {
      const built = t >= T.built
      setData(hud.mesRow, 'state', built ? 'built' : 'missing')
      const fl = t < T.missingFrom ? 0.85 : hash(Math.floor(t * FLICK_HZ)) > 0.3 ? 1 : 0.35
      setStyle(hud.mesRow, '--flick', built ? '1' : fl.toFixed(2))
      setStyle(hud.mesRow, '--stamp', easeOutCubic(seg(t, T.built, T.built + 0.35)).toFixed(3))
    }
    hud.chips.forEach((el, i) => {
      if (!el) return
      setData(el, 'on', t >= STACK[i].on ? '1' : '0')
    })
    if (hud.head) {
      const h = easeOutCubic(seg(t, T.headline[0], T.headline[1]))
      setStyle(hud.head, 'opacity', h.toFixed(3))
      setStyle(hud.head, 'transform', `translate3d(0, ${(12 * (1 - h)).toFixed(1)}px, 0)`)
    }
    sounds(t)
  }

  const resize = (w: number, h: number) => {
    for (const m of fatMats) (m as unknown as { resolution: THREE.Vector2 }).resolution.set(w, h)
  }
  resize(ctx.size.w, ctx.size.h)

  return {
    update,
    resize,
    dispose() {
      envRT.dispose()
      scene.environment = null
      scene.fog = null
    },
  }
}
