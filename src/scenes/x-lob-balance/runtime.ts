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
  buildTaktLine,
  buildTower,
  COL,
  CONV_Z,
  hdr,
  type Kit,
  radialTexture,
  stationX,
  type Tower,
} from './build'
import {
  BOTTLENECKS,
  FLOW_GAIN,
  FLOW_V0,
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

export const BG = '#050607'
const LINE_LEN = STATIONS * SPACING + 1.2
const PRODUCTS = 22
const smooth = (x: number) => x * x * (3 - 2 * x)

/** ∫ 속도 — 램프 구간 smoothstep 의 적분으로 위치를 t 에서 결정적으로 계산. */
function flowDistance(t: number) {
  const [a, b] = T.flowRamp
  const dv = FLOW_V0 * (FLOW_GAIN - 1)
  let extra = 0
  if (t > a) {
    const L = b - a
    if (t < b) {
      const u = (t - a) / L
      extra = dv * L * (u * u * u - (u * u * u * u) / 2)
    } else extra = dv * (L / 2 + (t - b))
  }
  return FLOW_V0 * t + extra
}

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

  const heights = new Array<number>(STATIONS).fill(0)
  const stCol = new THREE.Color()
  const colAmber = new THREE.Color(COL.amber)
  const h = findHud(ctx.container)

  const update = (t: number) => {
    const amb = t > T.heroEnd ? loopT(t - T.heroEnd, 24) : 0

    // ── camera ──
    const cp = easeInOutCubic(seg(t, 0, T.heroEnd))
    camPos.lerpVectors(camA, camB, cp)
    tgt.lerpVectors(tgtA, tgtB, cp)
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
      // jig
      const dp = seg(t, b.drop[0], b.drop[1])
      const jigGroup = r.jig.group
      jigGroup.visible = t >= b.drop[0]
      const dropY = r.h0 + 3.6 * (1 - easeOutCubic(dp))
      jigGroup.position.y = t < b.cut[0] ? dropY : cur
      jigGroup.rotation.y = (1 - easeOutCubic(dp)) * 0.9
      const active = seg(t, b.drop[0], b.drop[1]) * (1 - seg(t, b.cut[1], b.cut[1] + 0.6))
      r.jig.glowMat.color.setHex(COL.amber).multiplyScalar(1.0 + 2.6 * active)
      r.jig.edgeMat.color.setHex(COL.amber).multiplyScalar(0.9 + 1.8 * active)
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
      anchor.set(r.x + TOWER_W * 0.5 + 0.35, r.jig.group.position.y + 0.45, 0)
      projectToScreen(ctx, anchor, scr)
      const jo = seg(t, b.drop[0] + 0.2, b.drop[1]) * (1 - seg(t, b.cut[1] + 0.4, b.cut[1] + 1.0))
      placeLabel(h.jig[k], scr.x, scr.y, r.jig.group.visible ? jo : 0)
    }
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

    // ── products ──
    const d = flowDistance(t)
    const sp = LINE_LEN / PRODUCTS
    const hot = seg(t, T.flowRamp[0], T.flowRamp[1])
    for (let i = 0; i < PRODUCTS; i++) {
      const u = (((i * sp + d) % LINE_LEN) + LINE_LEN) % LINE_LEN
      const x = -LINE_LEN / 2 + u
      const edgeFade = Math.min(1, u / 0.6, (LINE_LEN - u) / 0.6)
      const s = Math.max(0.001, edgeFade)
      pv.set(x, BELT_TOP, CONV_Z)
      sc.set(s, s, s)
      m4.compose(pv, q, sc)
      prod.mesh.setMatrixAt(i, m4)
      prod.strip.setMatrixAt(i, m4)
    }
    prod.mesh.instanceMatrix.needsUpdate = true
    prod.strip.instanceMatrix.needsUpdate = true
    base.beltTex.offset.x = -(d / 0.11) % 1
    prod.stripMat.color.setHex(COL.teal).multiplyScalar(1.6 + 1.6 * hot)
    base.railMat.color.setHex(COL.blue).multiplyScalar(0.7 + 0.8 * hot)

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
