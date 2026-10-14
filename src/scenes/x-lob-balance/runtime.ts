import { ensureSceneFonts } from '../_host/fonts'
import { roomEnvironment } from '../_host/three/env'
import { easeInOutCubic, easeOutCubic, loopT, placeLabel, projectToScreen, seg, setData, setStyle } from '../_host/three/helpers'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import {
  BELT_TOP,
  buildBenches,
  buildConveyor,
  buildCutter,
  buildDust,
  buildFloor,
  buildGaugeGeometry,
  buildGhost,
  buildGrounding,
  buildJig,
  buildPlane,
  buildProducts,
  buildSparks,
  buildSpur,
  buildTaktLine,
  buildTower,
  COL,
  CONV_Z,
  LANE_DZ,
  hdr,
  type Kit,
  radialTexture,
  stationX,
  type Tower,
} from './build'
import {
  BOTTLENECKS,
  heightOf,
  ILLUSTRATIVE_AFTER,
  ILLUSTRATIVE_BEFORE,
  LEVEL,
  PRODUCTIVITY_PCT,
  SPACING,
  STATIONS,
  T,
  TOWER_W,
} from './data'
import { buildStations, paintFtScreen, type StationRig } from './machines'

export const BG = '#050607'
const LINE_LEN = STATIONS * SPACING + 1.2
const PRODUCTS = 12
const PACK_GAP = 0.48
const PACK_SPEED = 2.7
/** 균형 공정 1사이클(초). 병목은 C/T 비율로 늘어난다. */
const FILM_TAKT = 0.46
const smooth = (x: number) => x * x * (3 - 2 * x)

/** HUD DOM(형제 오버레이)을 data-h 로 찾는다. 없으면 null — 라벨 없이도 씬은 동작. */
function findHud(container: HTMLElement) {
  const root = container.parentElement?.querySelector<HTMLElement>('[data-lob-hud]') ?? null
  const q = (k: string) => root?.querySelector<HTMLElement>(`[data-h="${k}"]`) ?? null
  const per = (k: string) => BOTTLENECKS.map((b) => q(`${k}-${b.key}`))
  return {
    tower: per('tower'),
    from: per('from'),
    arrow: per('arrow'),
    ct: per('ct'),
    pct: per('pct'),
    jig: per('jig'),
    plane: q('plane'),
    planeHot: q('plane-hot'),
    planeOk: q('plane-ok'),
    beats: [0, 1, 2].map((k) => q(`beat-${k}`)),
    hero: q('hero'),
    heroNum: q('hero-num'),
  }
}

export async function setupLob(ctx: ThreeContext): Promise<ThreeSetupResult> {
  const { THREE, scene, camera, bloom } = ctx
  const [{ RoundedBoxGeometry }, { mergeGeometries }, envRT] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    roomEnvironment(ctx),
    ensureSceneFonts('CORE-PACK 기능검사 웨이크업 슬립 포고핀 회로에 전류 지그 없음 셀 장착 대기 2라인'),
  ])
  const kit: Kit = { RoundedBox: RoundedBoxGeometry, merge: (g) => mergeGeometries(g) }

  // ── 환경맵(금속/크롬 반사) — 낮은 강도 ──
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.45

  scene.fog = new THREE.FogExp2(new THREE.Color(BG), 0.032)
  if (bloom) {
    bloom.strength = 0.75
    bloom.radius = 0.5
    bloom.threshold = 0.5
  }

  // ── lights: 키(좌상 전면) + 차가운 림(후면) ──
  scene.add(new THREE.HemisphereLight(0x4ab3cc, 0x050607, 0.25))
  const key = new THREE.DirectionalLight(0xd7d7d7, 1.1)
  key.position.set(-4, 8, 6)
  scene.add(key)
  const rim = new THREE.DirectionalLight(COL.blue, 0.9)
  rim.position.set(3, 4, -7)
  scene.add(rim)
  const warm = new THREE.PointLight(COL.amber, 0, 6, 1.6)
  scene.add(warm)

  // ── floor: 무광 다크 플로어 + 원거리 페이드 그리드 + 소프트 접지 ──
  const radial = radialTexture(THREE)
  scene.add(buildFloor(THREE, BG))
  const ground = buildGrounding(THREE, radial, LINE_LEN)
  scene.add(ground.group)

  // ── line: 작업대 + 컨베이어 ──
  const benches = buildBenches(THREE, kit)
  scene.add(benches.mesh, benches.lights)
  const base = buildConveyor(THREE, kit, LINE_LEN)
  scene.add(base.group)

  // ── glass C/T gauges ──
  const gaugeGeo = buildGaugeGeometry(THREE)
  const bnByIdx = new Map(BOTTLENECKS.map((b) => [b.idx, b]))
  const towers: Tower[] = []
  for (let i = 0; i < STATIONS; i++) {
    const isBn = bnByIdx.has(i)
    const tw = buildTower(THREE, stationX(i), isBn ? COL.blue : COL.teal, gaugeGeo)
    tw.uni.uTakt.value = LEVEL
    tw.uni.uHotAmt.value = isBn ? 1 : 0
    if (!isBn) {
      tw.uni.uColor.value.multiplyScalar(0.62)
      tw.uni.uAlpha.value = 0.7
    }
    scene.add(tw.group)
    towers.push(tw)
  }

  // ── per-bottleneck rigs: ghost outline, jig, cutter, sparks ──
  const rigs = BOTTLENECKS.map((b, k) => {
    const x = stationX(b.idx)
    const h0 = heightOf(b, b.ctBefore)
    const h1 = heightOf(b, b.ctAfter)
    const ghost = buildGhost(THREE, gaugeGeo)
    ghost.mesh.scale.set(1.02, h0, 1.02)
    ghost.mesh.position.x = x
    ghost.uni.uH.value = h0
    scene.add(ghost.mesh)

    const jig = buildJig(THREE, b.key === 'neck' ? 'cut' : 'test', kit)
    jig.group.position.x = x
    // 차트 위가 아니라 팩 위. 도입 전에는 숨긴다.
    jig.group.position.z = CONV_Z
    jig.group.visible = false
    scene.add(jig.group)

    const cutter = buildCutter(THREE, radial)
    cutter.group.position.x = x
    scene.add(cutter.group)

    const sparks = buildSparks(THREE, 900, 1234 + k * 999)
    sparks.points.position.x = x
    sparks.uni.uWin.value.set(b.cut[0], b.cut[1])
    sparks.uni.uH.value.set(h0, h1)
    scene.add(sparks.points)
    return { b, x, h0, h1, ghost, jig, cutter, sparks }
  })
  /** 스테이션 인덱스 → 병목 리그(매 프레임 indexOf 대신). */
  const rigAt: (typeof rigs)[number][] = []
  for (const r of rigs) rigAt[r.b.idx] = r

  // ── bottleneck plane + takt line ──
  const plane = buildPlane(THREE, LINE_LEN + 0.6, 1.5)
  scene.add(plane.group)
  const takt = buildTaktLine(THREE, LINE_LEN + 0.6, 0.75, LEVEL)
  scene.add(takt.line)
  const planeTop = Math.max(...rigs.map((r) => r.h0))
  const colRed = new THREE.Color(COL.red)
  const colTeal = new THREE.Color(COL.teal)

  // ── products ──
  const prod = buildProducts(THREE, kit, PRODUCTS)
  scene.add(prod.mesh, prod.strip)
  const stations: StationRig[] = buildStations(THREE, kit)
  for (let i = 0; i < stations.length; i++) {
    stations[i].group.position.x = stationX(i)
    scene.add(stations[i].group)
  }
  // 새 지그는 개선 시점에 라인으로 내려온다. 스테이션에 미리 붙어 있던 헤드는 그리지 않는다.
  if (stations[2].head) stations[2].head.visible = false
  if (stations[6].head) {
    stations[6].head.visible = false
    stations[6].head.name = 'ft-head'
  }
  // Core-pack 검사 2라인: 본선 벨트는 그대로 두고, 포고 지그가 앉는 동안 카메라 쪽으로 짧은 레인이 갈라진다.
  const ftIdx = BOTTLENECKS[1].idx
  const ftX = stationX(ftIdx)
  const neckIdx = BOTTLENECKS[0].idx
  // 커팅 지그가 내려오기 전에는 넥 프레스 자체가 없다. 도입 순간에 지그와 함께 생긴다.
  stations[neckIdx].group.visible = false
  const spurLen = 3.45
  const spur = buildSpur(THREE, kit, spurLen)
  spur.group.position.x = ftX
  spur.group.visible = false
  scene.add(spur.group)
  const jig2 = buildJig(THREE, 'test', kit)
  jig2.group.position.x = ftX
  jig2.group.visible = false
  scene.add(jig2.group)
  const ftTwin = stations[ftIdx].group.clone(true)
  const twinHead = ftTwin.getObjectByName('ft-head')
  if (twinHead) twinHead.visible = false
  ftTwin.visible = false
  ftTwin.traverse((obj) => {
    obj.frustumCulled = false
  })
  scene.add(ftTwin)
  const packLed = new THREE.InstancedBufferAttribute(new Float32Array(PRODUCTS * 3), 3)
  prod.strip.instanceColor = packLed
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const sc = new THREE.Vector3()
  const pv = new THREE.Vector3()

  // ── dust ──
  const dust = buildDust(THREE, 300)
  scene.add(dust.points)

  // ── camera path ──
  const camA = new THREE.Vector3(-5.4, 4.3, 13.4)
  const camB = new THREE.Vector3(3.8, 3.7, 13.0)
  const tgtA = new THREE.Vector3(-1.2, 2.3, 0)
  const tgtB = new THREE.Vector3(0.8, 1.9, 0)
  // 숫자가 내려가는 동안은 그 공정에 멈춘다. 이동은 컷과 컷 사이만.
  const neckPos = new THREE.Vector3(stationX(neckIdx) - 0.15, 4.0, 12.0)
  const neckLook = new THREE.Vector3(stationX(neckIdx), 2.0, 0.25)
  const ftPos = new THREE.Vector3(ftX + 0.2, 3.65, 11.15)
  const ftLook = new THREE.Vector3(ftX - 0.25, 1.72, 1.05)
  const camKeys = [
    { t: 0, pos: camA, tgt: tgtA },
    { t: 1.4, pos: neckPos, tgt: neckLook },
    { t: 3.05, pos: neckPos, tgt: neckLook },
    { t: 3.9, pos: ftPos, tgt: ftLook },
    { t: 4.95, pos: ftPos, tgt: ftLook },
    { t: T.heroEnd, pos: camB, tgt: tgtB },
  ]
  const camPos = new THREE.Vector3()
  const tgt = new THREE.Vector3()
  const dir = new THREE.Vector3()

  const colLevelTeal = hdr(THREE, COL.teal, 1.1)
  const colLevelRed = hdr(THREE, COL.red, 2.0)
  const tmpCol = new THREE.Color()
  const anchor = new THREE.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  const lastText: string[] = []
  const setText = (el: HTMLElement | null, i: number, s: string) => {
    if (!el || lastText[i] === s) return
    lastText[i] = s
    el.textContent = s
  }

  const applyScale = () => {
    const s = (ctx.size.h * ctx.size.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360))
    for (const r of rigs) r.sparks.uni.uScale.value = s
    dust.uni.uScale.value = s
  }
  applyScale()

  type Pack = { x: number; next: number; holding: number; work: number; lane: number; laneLock: boolean }
  const packs: Pack[] = []
  let simT = -12
  let beltU = 0
  let prevPackX = 0
  const FORK = spurLen / 2 - 0.05
  /** 0 = 한 줄. Core-pack 막대(55→28)와 같은 곡선으로 2라인이 열린다. */
  const splitAmt = (time: number) => smooth(seg(time, BOTTLENECKS[1].cut[0], BOTTLENECKS[1].cut[1]))
  const forkWin = (x: number) => {
    const d = Math.abs(x - ftX)
    if (d <= 0.4) return 1
    if (d >= FORK) return 0
    return 1 - (d - 0.4) / (FORK - 0.4)
  }
  const resetPacks = () => {
    packs.length = 0
    const x0 = stationX(0) - 0.85
    for (let i = 0; i < PRODUCTS; i++) packs.push({ x: x0 - i * PACK_GAP, next: 0, holding: -1, work: 0, lane: 0, laneLock: false })
    simT = -12
    prevPackX = packs.reduce((a, p) => a + p.x, 0)
  }
  /** 공정 i 의 필름상 처리시간(초). 병목은 실제 C/T 비율, 나머지는 막대 높이 비율. */
  const svc = (i: number, time: number) => {
    const b = bnByIdx.get(i)
    if (b) {
      const p = smooth(seg(time, b.cut[0], b.cut[1]))
      const ct = b.ctBefore + (b.ctAfter - b.ctBefore) * p
      return FILM_TAKT * (ct / b.ctAfter)
    }
    const p = easeInOutCubic(seg(time, T.rebalance[0] + i * 0.06, T.rebalance[1] + i * 0.06))
    const rel = ILLUSTRATIVE_BEFORE[i] + (ILLUSTRATIVE_AFTER[i] - ILLUSTRATIVE_BEFORE[i]) * p
    return Math.max(0.22, FILM_TAKT * rel)
  }
  const atFt = (p: Pack) => p.holding === ftIdx || p.next === ftIdx
  /** 하류부터 빈 레인에 배정. 락이 풀리기 전에는 레인을 바꾸지 않는다. */
  const claimLane = (p: Pack, open: number) => {
    if (!atFt(p)) {
      if (forkWin(p.x) <= 0) {
        p.lane = 0
        p.laneLock = false
      }
      return
    }
    if (open < 0.08) {
      p.lane = 0
      p.laneLock = false
      return
    }
    if (p.laneLock) return
    let n0 = 0
    let n1 = 0
    for (let i = 0; i < packs.length; i++) {
      const o = packs[i]
      if (o === p || !o.laneLock || !atFt(o)) continue
      if (o.lane === 1) n1++
      else n0++
    }
    p.lane = n1 < n0 ? 1 : 0
    p.laneLock = true
  }
  const stepPacks = (dt: number, time: number) => {
    // 인덱스 0 이 항상 하류(오른쪽). 재투입 후에도 순서를 유지해야 간격 제한이 맞다.
    packs.sort((a, b) => b.x - a.x || a.lane - b.lane)
    const open = splitAmt(time)
    for (let i = 0; i < packs.length; i++) claimLane(packs[i], open)
    for (let i = 0; i < packs.length; i++) {
      const p = packs[i]
      if (p.holding >= 0) {
        p.work -= dt / svc(p.holding, time)
        if (p.work <= 0) {
          p.holding = -1
          p.next += 1
          p.work = 0
        }
        continue
      }
      let nx = p.x + PACK_SPEED * dt
      if (i > 0) {
        const a = packs[i - 1]
        // 2라인이 열린 포크 안에서는 서로 다른 레인이 같은 x 에 나란히 선다. 같은 x 를 막으면 둘 다 멈춘다.
        const beside = open > 0.35 && p.lane !== a.lane && forkWin(p.x) > 0.45 && forkWin(a.x) > 0.45
        if (!beside) nx = Math.min(nx, a.x - PACK_GAP)
      }
      if (p.next >= STATIONS) {
        p.x = nx
        continue
      }
      const stop = stationX(p.next)
      let ahead = 0
      for (let j = 0; j < i; j++) {
        const o = packs[j]
        if (o.lane !== p.lane) continue
        if (o.holding === p.next || (o.holding < 0 && o.next === p.next)) ahead++
      }
      nx = Math.min(nx, stop - ahead * PACK_GAP)
      if (ahead === 0 && nx >= stop - 0.02) {
        p.x = stop
        p.holding = p.next
        p.work = 1
      } else p.x = nx
    }
    // 라인을 빠져나간 팩은 맨 뒤로 돌려 흐름이 끊기지 않게 한다.
    const lead = packs[0]
    if (lead && lead.next >= STATIONS && lead.holding < 0 && lead.x > LINE_LEN / 2 + 0.35) {
      let minX = Infinity
      for (let i = 1; i < packs.length; i++) minX = Math.min(minX, packs[i].x)
      lead.x = minX - PACK_GAP
      lead.next = 0
      lead.holding = -1
      lead.work = 0
      lead.lane = 0
      lead.laneLock = false
    }
  }
  resetPacks()
  const syncPacks = (t: number) => {
    if (t + 0.05 < simT) resetPacks()
    const step = 1 / 60
    let n = 0
    while (simT < t && n++ < 6000) {
      stepPacks(step, simT)
      simT += step
    }
  }
  const headDown = (i: number) => {
    for (let k = 0; k < packs.length; k++) {
      const p = packs[k]
      if (p.holding !== i) continue
      const phase = 1 - Math.min(1, Math.max(0, p.work))
      if (phase < 0.16) return phase / 0.16
      if (phase > 0.84) return (1 - phase) / 0.16
      return 1
    }
    return 0
  }

  const heights = new Array<number>(STATIONS).fill(0)
  const stCol = new THREE.Color()
  const colAmber = new THREE.Color(COL.amber)
  const h = findHud(ctx.container)

  const update = (t: number) => {
    const amb = t > T.heroEnd ? loopT(t - T.heroEnd, 24) : 0

    // ── camera ──
    let camI = 0
    while (camI < camKeys.length - 2 && t >= camKeys[camI + 1].t) camI++
    const camFrom = camKeys[camI]
    const camTo = camKeys[camI + 1]
    const camU = easeInOutCubic(seg(t, camFrom.t, camTo.t))
    camPos.lerpVectors(camFrom.pos, camTo.pos, camU)
    tgt.lerpVectors(camFrom.tgt, camTo.tgt, camU)
    if (t > T.heroEnd) {
      const w = (amb / 24) * Math.PI * 2
      const ramp = seg(t, T.heroEnd, T.heroEnd + 3)
      camPos.x += -Math.sin(w) * 3.2 * ramp
      camPos.y += Math.sin(w * 2) * 0.25 * ramp
      tgt.x += -Math.sin(w) * 1.0 * ramp
    }
    const aspect = ctx.size.w / Math.max(1, ctx.size.h)
    if (aspect < 1.65) {
      dir.subVectors(camPos, tgt).multiplyScalar(Math.min(2.4, 1.65 / aspect))
      camPos.copy(tgt).add(dir)
    }
    camera.position.copy(camPos)
    camera.lookAt(tgt)

    // ── tower heights ──
    for (let i = 0; i < STATIONS; i++) {
      const r = rigAt[i]
      if (r) {
        const b = r.b
        heights[i] = r.h0 + (r.h1 - r.h0) * smooth(seg(t, b.cut[0], b.cut[1]))
      } else {
        const p = easeInOutCubic(seg(t, T.rebalance[0] + i * 0.06, T.rebalance[1] + i * 0.06))
        const breathe = Math.sin(t * 0.9 + i * 1.7) * 0.025 * seg(t, T.heroEnd, T.heroEnd + 2)
        heights[i] = LEVEL * (ILLUSTRATIVE_BEFORE[i] + (ILLUSTRATIVE_AFTER[i] - ILLUSTRATIVE_BEFORE[i]) * p) + breathe
      }
    }
    const levelT = seg(t, T.planeDrop[0], T.planeDrop[1])
    for (let i = 0; i < STATIONS; i++) {
      const tw = towers[i]
      const hh = heights[i]
      tw.shell.scale.y = hh
      tw.core.scale.y = Math.max(0.001, hh - 0.012)
      tw.cap.position.y = hh
      tw.uni.uH.value = hh
      tw.uni.uTime.value = t
      const c = T.planeDrop[1] - 0.15 + i * 0.07
      tw.uni.uPulse.value = Math.exp(-(((t - c) / 0.14) ** 2))
      if (bnByIdx.has(i)) {
        // 병목 → 균형: 블루 → 틸
        tw.uni.uColor.value.setHex(COL.blue).lerp(colTeal, levelT)
      }
      // 바닥 빛 웅덩이 + 작업대 상태 라이트
      const bn = bnByIdx.get(i)
      stCol.copy(tw.uni.uColor.value).multiplyScalar((0.05 + 0.03 * hh) * (bn ? 1.3 : 1) + 0.12 * tw.uni.uPulse.value)
      ground.pools.setColorAt(i, stCol)
      if (bn) {
        const okP = seg(t, bn.cut[1] - 0.2, bn.cut[1] + 0.4)
        stCol.copy(colRed).lerp(colAmber, seg(t, bn.drop[0], bn.cut[0])).lerp(colTeal, okP).multiplyScalar(2.2)
      } else stCol.setHex(COL.teal).multiplyScalar(1.1)
      benches.lights.setColorAt(i, stCol)
    }

    // 팩 위치를 먼저 확정해야 지그 프레스·화면이 같은 프레임의 레인과 맞는다.
    syncPacks(t)
    // 지그 장착 전: 셀은 슬립. 2라인이 열리면 레인마다 포고핀이 전류로 웨이크업한 뒤 검사.
    const open = splitAmt(t)
    const ftB = BOTTLENECKS[1]
    type FtMode = 'off' | 'sleep' | 'wake' | 'test' | 'ready'
    const laneMode = (lane: number): FtMode => {
      let pack: Pack | undefined
      for (let i = 0; i < packs.length; i++) {
        const p = packs[i]
        if (p.holding === ftIdx && p.lane === lane) {
          pack = p
          break
        }
      }
      // 화면 문구도 55→28 과 같이 간다. 지그가 앉기 전에는 슬립.
      if (open < 0.22) return pack ? 'sleep' : 'off'
      if (!pack) return open > 0.85 ? 'ready' : 'off'
      if (open < 0.72) return 'wake'
      return 'test'
    }
    const mode0 = laneMode(0)
    const mode1 = laneMode(1)
    const rank: Record<FtMode, number> = { off: 0, ready: 1, sleep: 2, test: 3, wake: 4 }
    const ftMode: FtMode = rank[mode1] > rank[mode0] ? mode1 : mode0

    // ── rigs ──
    let warmI = 0
    for (let k = 0; k < rigs.length; k++) {
      const r = rigs[k]
      const { b } = r
      const cutP = seg(t, b.cut[0], b.cut[1])
      const cur = heights[b.idx]
      // ghost(이전 높이)
      r.ghost.uni.uAlpha.value = 0.9 * seg(t, b.cut[0], b.cut[0] + 0.3) * (1 - seg(t, b.cut[1], b.cut[1] + 1.4))
      r.ghost.mesh.visible = r.ghost.uni.uAlpha.value > 0.001
      // 지그 강하는 막대·숫자와 같은 곡선. 숫자가 움직이기 직전에만 살짝 들어온다.
      const isNeck = b.key === 'neck'
      const cutEase = smooth(cutP)
      const lead = seg(t, b.cut[0] - 0.5, b.cut[0])
      const dp = cutEase + (1 - cutEase) * lead * 0.22
      const jigGroup = r.jig.group
      jigGroup.visible = t >= b.cut[0] - 0.5
      const seatY = 0.36
      const fromY = isNeck ? 4.85 : 3.15
      const settle = seg(t, b.cut[1] - 0.16, b.cut[1]) * (1 - seg(t, b.cut[1], b.cut[1] + 0.28))
      const working = cutEase > 0.9 ? (isNeck ? headDown(b.idx) : mode0 === 'wake' || mode0 === 'test' ? 1 : 0) : 0
      const stroke = isNeck ? 0.13 : 0.055
      jigGroup.position.y = seatY + (fromY - seatY) * (1 - dp) - (isNeck ? 0.07 : 0.03) * settle - working * stroke
      jigGroup.position.z = CONV_Z
      jigGroup.rotation.y = (1 - dp) * (isNeck ? 0.95 : 0.4)
      const scJ = (isNeck ? 0.34 : 0.62) + ((isNeck ? 1.16 : 1) - (isNeck ? 0.34 : 0.62)) * dp
      jigGroup.scale.setScalar(scJ)
      const waking = !isNeck && mode0 === 'wake'
      const glowHex = isNeck ? COL.amber : waking || mode0 === 'sleep' ? COL.amber : COL.teal
      const glowK = waking ? 2.4 + 2.4 * Math.sin(t * 28) ** 2 : 0.45 + working * (isNeck ? 3.4 : 2.2)
      r.jig.glowMat.color.setHex(glowHex).multiplyScalar(glowK)
      r.jig.edgeMat.color.setHex(COL.amber).multiplyScalar(0.35 + dp * (isNeck ? 2.2 : 1.4))
      // cutter
      const cv = seg(t, b.cut[0] - 0.1, b.cut[0] + 0.1) * (1 - seg(t, b.cut[1] - 0.05, b.cut[1] + 0.25))
      r.cutter.group.visible = cv > 0.001
      r.cutter.group.position.y = cur
      const flick = 0.75 + 0.25 * Math.sin(t * 73 + r.x)
      r.cutter.mat.opacity = cv * flick
      r.cutter.discMat.opacity = 0.45 * cv * flick
      // sparks
      r.sparks.uni.uT.value = t
      r.sparks.points.visible = t > b.cut[0] - 0.05 && t < b.cut[1] + 1.4
      if (cv > warmI) {
        warmI = cv
        warm.position.set(r.x, cur + 0.2, 0.8)
      }
      // labels
      const i = b.idx
      anchor.set(r.x, Math.max(cur, r.jig.group.visible ? r.jig.group.position.y + 0.62 : cur) + 0.15, 0)
      projectToScreen(ctx, anchor, scr)
      placeLabel(h.tower[k], scr.x, scr.y, scr.visible ? 1 : 0)
      const ct = b.ctBefore + (b.ctAfter - b.ctBefore) * smooth(cutP)
      const digits = b.key === 'neck' ? 2 : 0
      setText(h.ct[k], i * 3, ct.toFixed(digits))
      const pctEl = h.pct[k]
      const fo = seg(t, b.cut[0] - 0.2, b.cut[0] + 0.2).toFixed(3)
      for (const el of [h.from[k], h.arrow[k]]) if (el) setStyle(el, 'opacity', fo)
      if (pctEl) setStyle(pctEl, 'opacity', seg(t, b.cut[1] - 0.1, b.cut[1] + 0.3).toFixed(3))
      // jig label (지그 옆)
      const labelZ = b.key === 'ft' ? CONV_Z + LANE_DZ * open * 0.5 : CONV_Z
      anchor.set(r.x + (b.key === 'neck' ? 0.42 : 0.15), r.jig.group.position.y + (b.key === 'neck' ? 1.05 : 0.78), labelZ)
      projectToScreen(ctx, anchor, scr)
      const jo = seg(t, b.cut[0] - 0.15, b.cut[0] + 0.45)
      placeLabel(h.jig[k], scr.x, scr.y, r.jig.group.visible ? jo : 0)
    }
    // 2호 포고 지그·갈라진 레인 — 55→28 과 같은 진행.
    const ftLead = seg(t, ftB.cut[0] - 0.45, ftB.cut[0])
    const dp2 = open + (1 - open) * ftLead * 0.18
    const seatY = 0.36
    jig2.group.visible = t >= ftB.cut[0] - 0.4
    jig2.group.position.x = ftX
    jig2.group.position.z = CONV_Z + LANE_DZ * open
    const working2 = open > 0.9 && (mode1 === 'wake' || mode1 === 'test') ? 1 : 0
    jig2.group.position.y = seatY + (3.15 - seatY) * (1 - dp2) - working2 * 0.055
    jig2.group.rotation.y = (1 - dp2) * -0.55
    jig2.group.scale.setScalar(0.62 + 0.38 * dp2)
    const waking2 = mode1 === 'wake'
    jig2.glowMat.color.setHex(waking2 || mode1 === 'sleep' ? COL.amber : COL.teal).multiplyScalar(waking2 ? 2.4 + 2.4 * Math.sin(t * 28 + 1.4) ** 2 : 0.45 + working2 * 2.2)
    jig2.edgeMat.color.setHex(COL.amber).multiplyScalar(0.35 + dp2 * 1.8)
    spur.group.visible = open > 0.08
    spur.group.position.set(ftX, -0.06 * (1 - open), CONV_Z + LANE_DZ * open)
    spur.group.scale.set(0.18 + 0.82 * open, 1, 1)
    spur.railMat.color.setHex(COL.amber).multiplyScalar(0.55 + open * 0.35)
    const neckSt = stations[neckIdx].group
    const neckCut = smooth(seg(t, BOTTLENECKS[0].cut[0], BOTTLENECKS[0].cut[1]))
    const neckLead = seg(t, BOTTLENECKS[0].cut[0] - 0.5, BOTTLENECKS[0].cut[0])
    const neckIn = neckCut + (1 - neckCut) * neckLead * 0.22
    neckSt.visible = t >= BOTTLENECKS[0].cut[0] - 0.5
    neckSt.position.y = (1 - neckIn) * 1.05
    ftTwin.visible = open > 0.2
    ftTwin.position.y = -0.12 * (1 - open)
    ftTwin.position.z = LANE_DZ * open
    if (ground.pools.instanceColor) ground.pools.instanceColor.needsUpdate = true
    if (benches.lights.instanceColor) benches.lights.instanceColor.needsUpdate = true
    warm.intensity = warmI * 9 * (0.8 + 0.2 * Math.sin(t * 51))

    // ── bottleneck plane ──
    const dropE = easeOutCubic(levelT)
    const py = planeTop + (LEVEL - planeTop) * dropE
    plane.group.position.y = py
    tmpCol.copy(colRed).lerp(colTeal, levelT)
    plane.uni.uColor.value.copy(tmpCol).multiplyScalar(1.4)
    plane.uni.uTime.value = t
    plane.uni.uAlpha.value = 0.85 + 0.15 * Math.sin(t * 2.2)
    plane.lineMat.color.copy(colLevelRed).lerp(colLevelTeal, levelT)
    takt.mat.opacity = 0.55 * (1 - levelT * 0.6)
    anchor.set(-LINE_LEN / 2 - 0.45, py, 0.75)
    projectToScreen(ctx, anchor, scr)
    placeLabel(h.plane, Math.max(scr.x, 150), scr.y, scr.visible ? 1 : 0)
    if (h.planeHot) setStyle(h.planeHot, 'opacity', (1 - levelT).toFixed(3))
    if (h.planeOk) setStyle(h.planeOk, 'opacity', levelT.toFixed(3))

    // ── packs: 스테이션에서 멈추고, 병목 앞에 쌓였다가 2라인으로 갈라진 뒤 풀린다 ──
    const half = LINE_LEN / 2
    let packSum = 0
    const neckPress = headDown(neckIdx)
    for (let i = 0; i < PRODUCTS; i++) {
      const x = packs[i].x
      packSum += x
      const edgeFade = Math.min(1, Math.max(0, (x + half) / 0.5), Math.max(0, (half - x) / 0.5))
      const s = Math.max(0.001, edgeFade)
      const squash = packs[i].holding === neckIdx ? 1 - 0.22 * neckPress : 1
      const z = CONV_Z + packs[i].lane * LANE_DZ * open * forkWin(x)
      pv.set(x, BELT_TOP, z)
      sc.set(s, s * squash, s)
      m4.compose(pv, q, sc)
      prod.mesh.setMatrixAt(i, m4)
      prod.strip.setMatrixAt(i, m4)
    }
    prod.mesh.instanceMatrix.needsUpdate = true
    prod.strip.instanceMatrix.needsUpdate = true
    const moved = packSum - prevPackX
    prevPackX = packSum
    if (moved > 0) beltU += moved / PRODUCTS
    base.beltTex.offset.x = -(beltU / 0.11) % 1
    spur.beltTex.offset.x = base.beltTex.offset.x
    const hot = seg(t, T.flowRamp[0], T.flowRamp[1])
    prod.stripMat.color.setHex(COL.teal).multiplyScalar(1.6 + 1.6 * hot)
    base.railMat.color.setHex(COL.blue).multiplyScalar(0.7 + 0.8 * hot)

    for (let i = 0; i < stations.length; i++) {
      const rig = stations[i]
      const k = headDown(i)
      if (rig.head) rig.head.position.y = rig.headUp + (rig.headDown - rig.headUp) * k
      for (const jaw of rig.jaws) jaw.obj.position.x = jaw.openX + (jaw.closedX - jaw.openX) * k
      if (rig.glow && rig.kind !== 'ft') {
        const hex = rig.kind === 'final' && i === 8 ? COL.teal : rig.kind === 'final' ? COL.blue : COL.amber
        const punch = rig.kind === 'weld' ? 5 : 2.4
        rig.glow.color.setHex(hex).multiplyScalar(0.25 + k * punch)
      }
    }
    const ft = stations[6]
    const lampLv = [ftMode === 'sleep' ? 2.2 : 0.12, ftMode === 'wake' ? 2.4 : 0.12, ftMode === 'test' || ftMode === 'ready' ? 1.8 : 0.12]
    const lampHex = [COL.red, COL.amber, COL.teal]
    ft.lamps.forEach((m, i) => m.color.setHex(lampHex[i]).multiplyScalar(lampLv[i]))
    if (ft.screen && ftMode !== 'off' && ft.screen.mode !== ftMode) {
      ft.screen.mode = ftMode
      paintFtScreen(ft.screen.cv, ftMode, document.documentElement.lang === 'en')
      ft.screen.tex.needsUpdate = true
    }
    for (let i = 0; i < PRODUCTS; i++) {
      const mode = packs[i].lane === 1 ? mode1 : mode0
      const held = packs[i].holding === ftB.idx
      const asleep = held && mode === 'sleep'
      const waking = held && mode === 'wake'
      const testing = held && mode === 'test'
      packLed.setXYZ(i, waking ? 1.4 : asleep ? 0.45 : 0.15, waking ? 0.55 : testing ? 0.9 : 0.12, waking ? 0.15 : testing ? 0.75 : 0.12)
    }
    packLed.needsUpdate = true

    dust.uni.uT.value = t

    // ── HUD: beats / hero ──
    const beatIdx = t < BOTTLENECKS[0].drop[0] ? 0 : t < T.planeDrop[0] ? 1 : 2
    h.beats.forEach((el, k) => {
      if (el) setData(el, 'on', k === beatIdx ? '1' : k < beatIdx ? 'done' : '0')
    })
    const heroP = seg(t, T.hero[0], T.hero[1])
    if (h.hero) setStyle(h.hero, 'opacity', seg(t, T.hero[0] - 0.1, T.hero[0] + 0.5).toFixed(3))
    setText(h.heroNum, 99, `+${Math.round(PRODUCTIVITY_PCT * easeOutCubic(heroP))}`)
  }

  return {
    update,
    resize() {
      applyScale()
    },
    dispose() {
      envRT.dispose()
      scene.environment = null
    },
  }
}
