import { roomEnvironment } from '../_host/three/env'
import type * as THREE from 'three'
import { easeInOutCubic, easeOutCubic, loopT, placeLabel, seg, setData, setStyle } from '../_host/three/helpers'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import {
  buildEdges,
  buildFatEdges,
  buildGate,
  buildGraph,
  buildHaze,
  buildLayerRings,
  buildLotShell,
  buildNodes,
  buildSparks,
  curvePoint,
  loadAddons,
  makeDotTexture,
} from './build'
import { AMBIENT_PERIOD, EDGE_SEGS, HERO, LAYERS, T } from './data'

// 타임라인 런타임 — 모든 시각 상태를 t 에서 결정적으로 계산한다.


const TEAL: [number, number, number] = [0.31, 0.88, 0.77]
const AMBER: [number, number, number] = [0.85, 0.54, 0.24]
const RED: [number, number, number] = [1.0, 0.16, 0.13]
const WHITE_TEAL: [number, number, number] = [0.75, 1.0, 0.95]
// 노드 기본 자체발광(형태는 조명·환경맵이 만든다).
const LAYER_BASE = [0.05, 0.04, 0.034, 0.03]

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** t 에서 파생되는 서사 상태. */
interface State {
  defect: number // 필드 불량 강조 0..1
  ambig: number // 수기 S/N 불확실 0..1
  calm: number // 추적 시작 → 나머지 진정 0..1
  backLit: number // 역추적 점등 홉 0..3
  backSpark: number // 역추적 스파크 진행 0..3 (범위 밖이면 숨김)
  fwdLit: number // 순방향 점등 깊이 0..3
  fwdSpark: number
  box: number // 범위 박스: 0=전체(?), 1=영향 군집
  boxVis: number
  lotFound: number
  token: number // 미등록 토큰 진행 0..1(게이트 도달)
  tokenVis: number
  blockFlash: number
  blocked: number
  steps: [number, number, number, number]
  hero: boolean
}

function stateAt(t: number): State {
  const backEnd = T.backStart + 3 * T.backHop
  const fwdEnd = T.fwdStart + 3 * T.fwdHop
  if (t < HERO) {
    const ambig = easeInOutCubic(seg(t, T.ambigIn, T.ambigFull)) * (1 - easeInOutCubic(seg(t, T.ambigOut - 0.2, T.backStart + 0.5)))
    const back = (t - T.backStart) / T.backHop
    const fwd = (t - T.fwdStart) / T.fwdHop
    const hit = t - T.gateHit
    return {
      defect: easeOutCubic(seg(t, T.defectIn, T.defectFull)),
      ambig,
      calm: easeInOutCubic(seg(t, T.backStart - 0.1, T.fwdStart + 0.4)),
      backLit: Math.max(0, Math.min(3, back)),
      backSpark: back,
      fwdLit: Math.max(0, Math.min(3, fwd)),
      fwdSpark: fwd,
      box: easeInOutCubic(seg(t, T.fwdStart + 0.2, fwdEnd + 0.1)),
      boxVis: Math.max(easeOutCubic(seg(t, T.ambigIn + 0.2, T.ambigFull)), seg(t, backEnd, backEnd + 0.3)),
      lotFound: easeOutCubic(seg(t, backEnd - 0.08, backEnd + 0.25)),
      token: easeInOutCubic(seg(t, T.gateStart, T.gateHit)),
      tokenVis: seg(t, T.gateStart - 0.05, T.gateStart + 0.2),
      blockFlash: hit >= 0 ? Math.exp(-hit * 3.2) : 0,
      blocked: hit >= 0 ? 1 : 0,
      steps: [
        seg(t, T.ambigIn + 0.3, T.ambigFull + 0.2),
        seg(t, T.fwdStart + 0.3, T.fwdStart + 0.8),
        seg(t, T.gateHit - 0.05, T.gateHit + 0.4),
        seg(t, T.awardIn, T.awardIn + 0.7),
      ],
      hero: true,
    }
  }
  // 앰비언트 루프: 최종 상태 유지 + 역추적/순방향 스파크·게이트 차단을 주기적으로 재생.
  const u = loopT(t - HERO, AMBIENT_PERIOD)
  const back = (u - 0.6) / T.backHop
  const fwd = (u - 0.6 - 3 * T.backHop - 0.15) / T.fwdHop
  const gs = 4.6
  const gh = 5.45
  const hit = u - gh
  const fade = 1 - seg(u, 0, 0.5)
  return {
    defect: 1,
    ambig: 0,
    calm: 1,
    backLit: 3,
    backSpark: back,
    fwdLit: 3,
    fwdSpark: fwd,
    box: 1,
    boxVis: 1,
    lotFound: 1,
    token: u < gs ? (u < 0.5 ? 1 : 0) : easeInOutCubic(seg(u, gs, gh)),
    tokenVis: u < 0.5 ? fade : seg(u, gs - 0.05, gs + 0.2),
    blockFlash: hit >= 0 ? Math.exp(-hit * 3.2) : 0,
    blocked: hit >= 0 || u < 0.5 ? 1 : 0,
    steps: [1, 1, 1, 1],
    hero: false,
  }
}

export async function setupSnTrace(ctx: ThreeContext): Promise<ThreeSetupResult> {
  const { THREE: T3, scene, camera } = ctx
  const [A, envRT] = await Promise.all([loadAddons(), roomEnvironment(ctx)])
  const g = buildGraph()

  // 환경맵(금속 노드 반사) + 키/림 — 낮은 세기.
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.42
  const key = new T3.DirectionalLight(0xe8eef2, 1.1)
  key.position.set(-6, 9, 12)
  const rim = new T3.DirectionalLight(0x4ab3cc, 0.9)
  rim.position.set(7, 2, -10)
  scene.add(key, rim, new T3.HemisphereLight(0x1a2630, 0x050608, 0.6))
  const bg = new T3.Color('#05060a')
  const fogAmber = new T3.Color('#1c1309')
  const fog = new T3.FogExp2(bg.getHex(), 0.02)
  scene.fog = fog

  const tex = makeDotTexture(T3)
  const edges = buildEdges(T3, g)
  scene.add(edges.lines)
  const nodes = buildNodes(T3, g, A.RoundedBox)
  for (const m of nodes) scene.add(m)
  const haze = buildHaze(T3, 1400, tex)
  scene.add(haze)
  const SPARKS = 900
  const sparks = buildSparks(T3, SPARKS, tex, 0.32)
  scene.add(sparks.pts)

  // 필드 불량 링(2겹)
  const ringGeo = new T3.RingGeometry(0.9, 1.0, 64)
  const rings = [0, 1].map(() => {
    const mat = new T3.MeshBasicMaterial({
      color: new T3.Color(...RED).multiplyScalar(2.2),
      transparent: true,
      blending: T3.AdditiveBlending,
      depthWrite: false,
      side: T3.DoubleSide,
      fog: false,
    })
    const r = new T3.Mesh(ringGeo, mat)
    scene.add(r)
    return r
  })
  // 하이라이트 엣지(팻 라인): 영향 군집 + 역추적 경로. 기본 섬유장은 1px 로 아주 옅게 둔다.
  const aff = buildFatEdges(A, g, g.affectedEdges, 12, 1.35)
  const path = buildFatEdges(A, g, g.pathEdges, 20, 2.2)
  scene.add(aff.lines, path.lines)
  const affEdgeSet = new Uint8Array(g.eFrom.length)
  for (const e of g.affectedEdges) affEdgeSet[e] = 1
  // 레이어 단면 링(계측 프레임)
  const rings2 = buildLayerRings(A)
  scene.add(rings2.lines)
  // 원인 LOT 하이라이트 셸(팻 라인 브래킷)
  const shell = buildLotShell(A)
  const lotShell = shell.lines
  const lp = g.lot * 3
  lotShell.position.set(g.pos[lp], g.pos[lp + 1], g.pos[lp + 2])
  scene.add(lotShell)

  // 게이트: 미등록 토큰 경로(서브 → 상위 조립) 중간.
  const GATE_S = 0.56
  const gp = curvePoint(g.pos, g.unregFrom, g.unregTo, GATE_S, { x: 0, y: 0, z: 0 })
  const gate = buildGate(T3)
  gate.group.position.set(gp.x, gp.y, gp.z)
  gate.group.rotation.y = -0.85 // 경로 위 게이트를 카메라 쪽으로 비스듬히
  gate.group.scale.setScalar(1.05)
  scene.add(gate.group)
  const token = new T3.Mesh(new T3.SphereGeometry(0.085, 16, 12), new T3.MeshBasicMaterial({ color: 0xffffff, fog: false }))
  scene.add(token)
  const tokenMat = token.material as THREE.MeshBasicMaterial

  // HUD 요소
  const root = ctx.container.parentElement?.querySelector<HTMLElement>('[data-hud]') ?? null
  const q = (k: string) => (root?.querySelector(`[data-k="${k}"]`) as HTMLElement | null) ?? null
  const elDefect = q('defect')
  const elLot = q('lot')
  const elGate = q('gate')
  const elBox = q('box')
  const elBoxUnknown = q('boxUnknown')
  const elBoxKnown = q('boxKnown')
  const elQ = q('q')
  const elLayers = [0, 1, 2, 3].map((i) => q(`layer${i}`))
  const elSteps = [0, 1, 2, 3].map((i) => q(`step${i}`))

  const v3 = new T3.Vector3()
  const proj = (x: number, y: number, z: number) => {
    v3.set(x, y, z).project(camera)
    return { x: (v3.x * 0.5 + 0.5) * ctx.size.w, y: (-v3.y * 0.5 + 0.5) * ctx.size.h }
  }
  const nodeScreen = (i: number) => proj(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2])

  // 범위 박스 대상: 전체 제품(서브샘플) / 영향 제품.
  const allProducts: number[] = []
  for (let i = g.offset[3]; i < g.n; i += 3) allProducts.push(i)
  const affProducts = g.affectedList.filter((i) => g.layerOf[i] === 3)
  const extents = (list: number[]) => {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const i of list) {
      const s = nodeScreen(i)
      if (s.x < x0) x0 = s.x
      if (s.x > x1) x1 = s.x
      if (s.y < y0) y0 = s.y
      if (s.y > y1) y1 = s.y
    }
    return [x0, y0, x1, y1]
  }

  const col = new T3.Color()
  const mtx = new T3.Matrix4()
  const tmpP = new T3.Vector3()
  const tmpQ = new T3.Quaternion()
  const tmpS = new T3.Vector3()
  const onPath = new Int8Array(g.n).fill(-1)
  g.path.forEach((p, i) => (onPath[p] = i))
  const pathEdgeIdx = new Int8Array(g.eFrom.length).fill(-1)
  g.pathEdges.forEach((e, i) => (pathEdgeIdx[e] = i))
  // 원본 행렬 보관(영향 노드 스케일 펄스용)
  const baseMats = new Float32Array(g.n * 16)
  nodes.forEach((m, l) => {
    for (let i = 0; i < LAYERS[l].count; i++) {
      m.getMatrixAt(i, mtx)
      mtx.toArray(baseMats, (g.offset[l] + i) * 16)
    }
  })
  const scaleList = Array.from(new Set([...g.affectedList, ...g.path]))

  const cp = { x: 0, y: 0, z: 0 }
  // 기본 섬유 정점별 감쇠(엣지 위치 s 의 함수 — 모든 엣지 공통).
  const edgeFade = new Float32Array(EDGE_SEGS * 2)
  for (let k = 0; k < EDGE_SEGS * 2; k++) {
    const s = edges.vS[k]
    edgeFade[k] = 0.22 + 0.78 * Math.pow(Math.abs(2 * s - 1), 1.4)
  }
  const fatMats = [aff.mat, path.mat, rings2.mat, shell.mat]
  const camTarget = new T3.Vector3(-1.1, 0.45, 0)

  let lastEdgeKey = -1
  const update = (t: number) => {
    const st = stateAt(t)

    // ── 카메라: 느린 돌리 + 스윙 ──
    const hp = easeInOutCubic(seg(t, 0, HERO))
    const az = t < HERO ? 0.4 - 0.28 * hp : 0.12 + 0.13 * Math.sin(((t - HERO) * Math.PI * 2) / 46)
    const dist = 22.5 - 2.4 * hp
    const elev = 3.4 - 0.7 * hp + (t < HERO ? 0 : 0.5 * Math.sin(((t - HERO) * Math.PI * 2) / 31))
    camera.position.set(camTarget.x + Math.sin(az) * dist, camTarget.y + elev, camTarget.z + Math.cos(az) * dist)
    camera.lookAt(camTarget)
    camera.updateMatrixWorld()

    // ── 포그: 수기 S/N 구간엔 짙은 호박색 안개 ──
    fog.color.copy(bg).lerp(fogAmber, st.ambig)
    fog.density = 0.02 + 0.028 * st.ambig
    ;(scene.background as THREE.Color).copy(fog.color)

    // ── 엣지 정점 색 ──
    const C = edges.colors
    const E = g.eFrom.length
    const VPE = EDGE_SEGS * 2
    const calmK = 1 - 0.5 * st.calm
    const baseI = 0.024 * calmK
    // 수기 S/N 깜빡임(ambig>0)이 없으면 색은 baseI 와 '몇 층까지 점등됐나' 로만 정해진다 —
    // 같으면 수만 개 정점 재계산·GPU 재업로드를 건너뛴다(앰비언트 루프 내내 해당).
    let litLayers = 0
    while (litLayers < 4 && st.fwdLit > litLayers) litLayers++
    const edgeKey = st.ambig > 0 ? NaN : baseI * 8 + litLayers
    const edgeDirty = edgeKey !== lastEdgeKey
    lastEdgeKey = edgeKey
    if (edgeDirty) for (let e = 0; e < E; e++) {
      const l = g.eLayer[e]
      const aff = g.affected[g.eFrom[e]] && g.affected[g.eTo[e]]
      const h = g.eHash[e]
      const fl = st.ambig > 0 ? 0.5 + 0.5 * Math.sin(t * 6.5 + h * 40) : 0
      // 불확실: 하류(상위 조립→제품) 일수록 강하게 — 어디까지 퍼졌는지 모름.
      const amb = st.ambig * (0.025 + 0.06 * fl) * (0.55 + 0.25 * l)
      // 영향 엣지는 점등되면 팻 라인이 대신 그린다 → 기본선은 물러난다.
      const dimAff = aff && st.fwdLit > l ? 0.3 : 1
      let o = e * VPE * 3
      for (let k = 0; k < VPE; k++, o += 3) {
        // 섬유 중간은 옅게(끝점 근처만 또렷) — 머리카락처럼 뭉개지지 않게.
        const w = edgeFade[k] * dimAff
        const r = (baseI * 0.86 + amb * AMBER[0]) * w
        const gg = (baseI * 0.97 + amb * AMBER[1]) * w
        const b = (baseI * 1.12 + amb * AMBER[2]) * w
        C[o] = r
        C[o + 1] = gg
        C[o + 2] = b
      }
    }
    if (edgeDirty) edges.colAttr.needsUpdate = true

    // ── 팻 라인: 영향 군집(순방향 점등) ──
    {
      const AC = aff.colors
      let k = 0
      for (const e of g.affectedEdges) {
        const l = g.eLayer[e]
        const h = g.eHash[e]
        const lp = st.fwdLit - l
        const sp = st.fwdSpark - l
        for (let j = 0; j < aff.segs; j++, k++) {
          for (let end = 0; end < 2; end++) {
            const s = aff.sA[k * 2 + end]
            let I = 0
            if (lp > 0) {
              const lit = clamp01((lp - s) * 6)
              const d = (sp - s) * 5
              const head = sp > -0.2 && sp < 1.3 ? Math.exp(-d * d) : 0
              I = lit * (0.1 + 0.025 * Math.sin(t * 2.2 + h * 6)) + head * 0.55
            }
            const o = k * 6 + end * 3
            AC[o] = TEAL[0] * I
            AC[o + 1] = TEAL[1] * I
            AC[o + 2] = TEAL[2] * I
          }
        }
      }
      aff.buf.needsUpdate = true
    }
    // ── 팻 라인: 역추적 경로(자식 s=1 → 부모 s=0) ──
    {
      const PC = path.colors
      let k = 0
      for (let pIdx = 0; pIdx < g.pathEdges.length; pIdx++) {
        const bLit = st.backLit - pIdx
        const bSp = st.backSpark - pIdx
        for (let j = 0; j < path.segs; j++, k++) {
          for (let end = 0; end < 2; end++) {
            const s = path.sA[k * 2 + end]
            let I = 0
            if (bLit > 0) {
              const lit = clamp01((bLit - (1 - s)) * 6)
              const d = (bSp - (1 - s)) * 5
              const head = bSp > -0.2 && bSp < 1.3 ? Math.exp(-d * d) : 0
              I = lit * 0.62 + head * 1.6
            }
            const o = k * 6 + end * 3
            PC[o] = WHITE_TEAL[0] * I
            PC[o + 1] = WHITE_TEAL[1] * I
            PC[o + 2] = WHITE_TEAL[2] * I
          }
        }
      }
      path.buf.needsUpdate = true
    }
    // 레이어 링: 수기 구간엔 호박색으로 흐려지고, 추적 이후 차분한 청색.
    rings2.mat.color.setRGB(0.29 + 0.55 * st.ambig, 0.7 - 0.2 * st.ambig, 0.8 - 0.55 * st.ambig)
    rings2.mat.opacity = 0.16 + 0.08 * st.calm

    // ── 노드 색 ──
    nodes.forEach((mesh, l) => {
      const off = g.offset[l]
      for (let i = 0; i < LAYERS[l].count; i++) {
        const gi = off + i
        const h = g.eHash[gi % E]
        let I = LAYER_BASE[l] * calmK
        let r = I
        let gg = I
        let b = I * 1.04
        if (st.ambig > 0 && l >= 2) {
          const fl = 0.5 + 0.5 * Math.sin(t * 5.3 + h * 50)
          const a = st.ambig * (0.35 + 0.75 * fl) * (l === 3 ? 1 : 0.6)
          r += AMBER[0] * a
          gg += AMBER[1] * a
          b += AMBER[2] * a
        }
        if (g.affected[gi] && st.fwdLit > 0 && st.fwdLit > l - 0.15) {
          const lit = clamp01((st.fwdLit - l + 0.15) * 4)
          const dd = (st.fwdSpark - l) * 4
          const flash = st.fwdSpark > l - 0.3 && st.fwdSpark < l + 0.8 ? Math.exp(-dd * dd) : 0
          I = lit * (l === 3 ? 1.1 : 1.3) + flash * 2.2
          r += TEAL[0] * I
          gg += TEAL[1] * I
          b += TEAL[2] * I
        }
        const pi = onPath[gi]
        if (pi >= 0) {
          if (pi === 0) {
            const pulse = 0.75 + 0.25 * Math.sin(t * 7)
            const k = st.defect * 3.2 * pulse
            r += RED[0] * k
            gg += RED[1] * k
            b += RED[2] * k
          } else if (pi === 3) {
            const k = st.lotFound * 1.9
            r += 1.0 * k
            gg += 0.62 * k
            b += 0.28 * k
          } else if (st.backLit > pi - 0.1) {
            const k = clamp01((st.backLit - pi + 0.1) * 4) * 1.8
            r += WHITE_TEAL[0] * k
            gg += WHITE_TEAL[1] * k
            b += WHITE_TEAL[2] * k
          }
        }
        col.setRGB(r, gg, b)
        mesh.setColorAt(i, col)
      }
      mesh.instanceColor!.needsUpdate = true
    })

    // ── 노드 스케일(영향/경로 노드만) ──
    for (const gi of scaleList) {
      const l = g.layerOf[gi]
      const i = gi - g.offset[l]
      mtx.fromArray(baseMats, gi * 16)
      mtx.decompose(tmpP, tmpQ, tmpS)
      let s = 1
      if (g.affected[gi]) s += 0.45 * clamp01((st.fwdLit - l + 0.15) * 4)
      const pi = onPath[gi]
      if (pi === 0) s = 1 + st.defect * (1.4 + 0.3 * Math.sin(t * 7))
      if (pi === 3) s = 1 + st.lotFound * 0.35
      tmpS.setScalar(s)
      mtx.compose(tmpP, tmpQ, tmpS)
      nodes[l].setMatrixAt(i, mtx)
    }
    for (const m of nodes) m.instanceMatrix.needsUpdate = true

    // ── 스파크 ──
    const SP = sparks.positions
    const SC = sparks.colors
    let n = 0
    const emit = (x: number, y: number, z: number, c: readonly number[], k: number) => {
      if (n >= SPARKS) return
      SP[n * 3] = x
      SP[n * 3 + 1] = y
      SP[n * 3 + 2] = z
      SC[n * 3] = c[0] * k
      SC[n * 3 + 1] = c[1] * k
      SC[n * 3 + 2] = c[2] * k
      n++
    }
    // 역추적 홉
    for (let h = 0; h < 3; h++) {
      const p = st.backSpark - h
      if (p <= 0 || p >= 1) continue
      const e = g.pathEdges[h]
      for (let tr = 0; tr < 4; tr++) {
        const s = 1 - p + tr * 0.045
        if (s < 0 || s > 1) continue
        curvePoint(g.pos, g.eFrom[e], g.eTo[e], s, cp)
        emit(cp.x, cp.y, cp.z, WHITE_TEAL, (tr === 0 ? 2.6 : 1.3 / tr) * Math.sin(Math.PI * Math.min(1, p * 1.2)) + 0.2)
      }
    }
    // 순방향 파면
    if (st.fwdSpark > 0 && st.fwdSpark < 3) {
      const l = Math.floor(st.fwdSpark)
      const p = st.fwdSpark - l
      for (const e of g.affectedEdges) {
        if (g.eLayer[e] !== l) continue
        for (let tr = 0; tr < 2; tr++) {
          const s = p - tr * 0.05
          if (s < 0) continue
          curvePoint(g.pos, g.eFrom[e], g.eTo[e], s, cp)
          emit(cp.x, cp.y, cp.z, TEAL, (tr === 0 ? 1.7 : 0.7) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, p * 1.1 + 0.05))))
        }
      }
    }
    // 미등록 토큰 꼬리
    if (st.tokenVis > 0) {
      const s = st.token * (GATE_S - 0.06)
      for (let tr = 1; tr < 6; tr++) {
        const ss = s - tr * 0.03
        if (ss < 0 || st.blocked) continue
        curvePoint(g.pos, g.unregFrom, g.unregTo, ss, cp)
        emit(cp.x, cp.y, cp.z, AMBER, (1.3 / tr) * st.tokenVis)
      }
    }
    // drawRange(0, n) 밖은 그려지지 않으므로 꼬리를 지우지 않고, 쓴 구간만 업로드한다.
    if (n === 0) {
      SC[0] = SC[1] = SC[2] = 0
      SP[0] = SP[1] = SP[2] = 0
    }
    const up = Math.max(1, n) * 3
    sparks.pa.clearUpdateRanges()
    sparks.pa.addUpdateRange(0, up)
    sparks.ca.clearUpdateRanges()
    sparks.ca.addUpdateRange(0, up)
    sparks.pa.needsUpdate = true
    sparks.ca.needsUpdate = true
    sparks.pts.geometry.setDrawRange(0, Math.max(1, n))

    // ── 헤이즈 ──
    haze.rotation.y = t * 0.012
    haze.rotation.x = Math.sin(t * 0.05) * 0.03
    const hm = haze.material as THREE.PointsMaterial
    hm.color.setRGB(0.16 + 0.75 * st.ambig, 0.17 + 0.45 * st.ambig, 0.19 + 0.18 * st.ambig)

    // ── 필드 불량 링 ──
    const dp = g.defect * 3
    rings.forEach((r, i) => {
      const ph = loopT(t - T.defectIn + i * 0.8, 1.6) / 1.6
      r.position.set(g.pos[dp], g.pos[dp + 1], g.pos[dp + 2])
      r.quaternion.copy(camera.quaternion)
      const s = 0.12 + ph * (st.hero && t < T.backStart ? 1.1 : 0.7)
      r.scale.setScalar(s)
      const amp = st.defect * (1 - 0.55 * st.calm)
      ;(r.material as THREE.MeshBasicMaterial).opacity = (1 - ph) * (1 - ph) * amp
      r.visible = amp > 0.001
    })

    // ── 원인 LOT 셸 ──
    lotShell.visible = st.lotFound > 0.001
    lotShell.scale.setScalar(1 + (1 - st.lotFound) * 1.5 + 0.04 * Math.sin(t * 3))
    lotShell.rotation.y = t * 0.4
    shell.mat.color.setRGB(1.6, 0.95, 0.42).multiplyScalar(st.lotFound)

    // ── 게이트 + 토큰 ──
    const gateVis = st.hero ? easeOutCubic(seg(t, T.gateStart - 0.6, T.gateStart)) : 1
    const fl = st.blockFlash
    gate.frameMat.color.setRGB(
      TEAL[0] * 0.75 * (1 - st.blocked) + RED[0] * (1.0 + 3 * fl) * st.blocked,
      TEAL[1] * 0.75 * (1 - st.blocked) + RED[1] * (1.0 + 3 * fl) * st.blocked,
      TEAL[2] * 0.75 * (1 - st.blocked) + RED[2] * (1.0 + 3 * fl) * st.blocked,
    )
    gate.frameMat.opacity = gateVis
    gate.paneMat.opacity = gateVis * (0.05 + 0.25 * fl)
    gate.paneMat.color.setRGB(st.blocked ? 1 : 0.31, st.blocked ? 0.2 : 0.88, st.blocked ? 0.18 : 0.77)
    gate.xMat.color.setRGB(2.2, 0.3, 0.25).multiplyScalar(1 + 1.5 * fl)
    gate.xMat.opacity = st.blocked * gateVis
    gate.xGroup.scale.setScalar(st.blocked ? 1 + 0.4 * fl : 0.001)
    gate.group.visible = gateVis > 0.001
    // 토큰: 게이트 앞에서 멈추고 살짝 튕겨남.
    const recoil = st.blocked ? 0.035 * Math.sin(Math.min(1, (1 - fl) * 1.4) * Math.PI) : 0
    const ts = Math.max(0, st.token * (GATE_S - 0.06) - recoil)
    curvePoint(g.pos, g.unregFrom, g.unregTo, ts, cp)
    token.position.set(cp.x, cp.y, cp.z)
    token.visible = st.tokenVis > 0.001
    token.scale.setScalar(0.6 + 0.4 * st.tokenVis)
    if (st.blocked) tokenMat.color.setRGB(2.6, 0.45, 0.35).multiplyScalar(st.tokenVis)
    else tokenMat.color.setRGB(2.4, 1.6, 0.8).multiplyScalar(st.tokenVis)

    // ── HUD ──
    const dS = nodeScreen(g.defect)
    placeLabel(elDefect, dS.x, dS.y, st.defect * (1 - 0.35 * st.calm))
    const lS = nodeScreen(g.lot)
    placeLabel(elLot, lS.x, lS.y, st.lotFound)
    const gS = proj(gp.x, gp.y + 0.7, gp.z)
    placeLabel(elGate, gS.x, gS.y, st.blocked ? Math.min(1, gateVis) : 0)
    LAYERS.forEach((L, i) => {
      const s = proj(L.x, L.y - L.r - 0.72, 0)
      placeLabel(elLayers[i], s.x, s.y, 0.9)
    })
    if (elBox) {
      const a = extents(allProducts)
      const b = st.box > 0 ? extents(affProducts) : a
      const pad = 14
      const m = st.box
      const x0 = a[0] + (b[0] - a[0]) * m - pad
      const y0 = a[1] + (b[1] - a[1]) * m - pad
      const x1 = a[2] + (b[2] - a[2]) * m + pad
      const y1 = a[3] + (b[3] - a[3]) * m + pad
      setStyle(elBox, 'transform', `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`)
      setStyle(elBox, 'width', `${(x1 - x0).toFixed(1)}px`)
      setStyle(elBox, 'height', `${(y1 - y0).toFixed(1)}px`)
      setStyle(elBox, 'opacity', st.boxVis.toFixed(3))
      setData(elBox, 'known', m > 0.5 ? '1' : '0')
      if (elBoxUnknown) setStyle(elBoxUnknown, 'opacity', (1 - clamp01(m * 2)).toFixed(3))
      if (elBoxKnown) setStyle(elBoxKnown, 'opacity', clamp01(m * 2 - 1).toFixed(3))
      if (elQ) setStyle(elQ, 'opacity', ((1 - clamp01(m * 3)) * (0.75 + 0.25 * Math.sin(t * 9))).toFixed(3))
    }
    st.steps.forEach((v, i) => {
      const el = elSteps[i]
      if (!el) return
      setStyle(el, 'opacity', v.toFixed(3))
      setStyle(el, 'transform', `translate3d(${((1 - v) * -10).toFixed(1)}px,0,0)`)
    })
  }

  return {
    update,
    resize(w, h) {
      for (const m of fatMats) m.resolution.set(w, h)
    },
    dispose() {
      tex.dispose()
      ringGeo.dispose()
      envRT.dispose()
      scene.environment = null
      scene.fog = null
    },
  }
}
