import type * as THREE from 'three'
import { mulberry32 } from '../_host/random'
import type { Three } from '../_host/three/types'
import { EDGE_SEGS, LAYERS, PARENTS } from './data'

// genealogy 그래프 생성 + three 빌더. 결정적(seeded) — 매 마운트 같은 그림.

export interface Graph {
  n: number
  /** 레이어별 시작 인덱스(전역 노드 인덱스). */
  offset: number[]
  layerOf: Uint8Array
  pos: Float32Array
  parents: number[][]
  children: number[][]
  /** 엣지: 부모(상류) → 자식(하류). */
  eFrom: Int32Array
  eTo: Int32Array
  eLayer: Uint8Array
  eHash: Float32Array
  /** 결함 원인 LOT, 그 하류 전체(영향 S/N 집합), 필드 불량 제품, 역추적 경로. */
  lot: number
  affected: Uint8Array
  affectedList: number[]
  affectedEdges: number[]
  defect: number
  /** [P0, A0, S0, LOT] — 역추적 순서. */
  path: number[]
  /** 경로 엣지 인덱스(역방향 홉 순서: P0←A0, A0←S0, S0←LOT). */
  pathEdges: number[]
  /** 미등록 제품 토큰: 출발(서브) / 목적(상위 조립) 노드. */
  unregFrom: number
  unregTo: number
}

const smooth = (s: number) => s * s * (3 - 2 * s)

/** 엣지 곡선 위 점 — x 는 선형, y/z 는 smoothstep → 흐르는 S 커브. */
export function curvePoint(pos: Float32Array, a: number, b: number, s: number, out: { x: number; y: number; z: number }) {
  const k = smooth(s)
  out.x = pos[a * 3] + (pos[b * 3] - pos[a * 3]) * s
  out.y = pos[a * 3 + 1] + (pos[b * 3 + 1] - pos[a * 3 + 1]) * k
  out.z = pos[a * 3 + 2] + (pos[b * 3 + 2] - pos[a * 3 + 2]) * k
  return out
}

export function buildGraph(): Graph {
  const rng = mulberry32(240317)
  const offset: number[] = []
  let n = 0
  for (const L of LAYERS) {
    offset.push(n)
    n += L.count
  }
  const layerOf = new Uint8Array(n)
  const pos = new Float32Array(n * 3)
  const norm = new Float32Array(n * 2)
  const golden = Math.PI * (3 - Math.sqrt(5))

  LAYERS.forEach((L, l) => {
    const thick = l === 3 ? 0.9 : l === 0 ? 0.15 : 0.45
    for (let i = 0; i < L.count; i++) {
      const g = offset[l] + i
      layerOf[g] = l
      const rr = Math.sqrt((i + 0.5) / L.count)
      const th = i * golden + l * 0.7
      const jy = (rng() - 0.5) * 0.06
      const jz = (rng() - 0.5) * 0.06
      const ny = rr * Math.sin(th) + jy
      const nz = rr * Math.cos(th) + jz
      norm[g * 2] = ny
      norm[g * 2 + 1] = nz
      pos[g * 3] = L.x + (rng() - 0.5) * thick
      pos[g * 3 + 1] = L.y + ny * L.r
      pos[g * 3 + 2] = nz * L.r * 0.82
    }
  })

  const parents: number[][] = Array.from({ length: n }, () => [])
  const children: number[][] = Array.from({ length: n }, () => [])
  const from: number[] = []
  const to: number[] = []
  const el: number[] = []

  for (let l = 1; l < LAYERS.length; l++) {
    const k = PARENTS[l - 1]
    const p0 = offset[l - 1]
    const pc = LAYERS[l - 1].count
    for (let i = 0; i < LAYERS[l].count; i++) {
      const c = offset[l] + i
      const ty = norm[c * 2] + (rng() - 0.5) * 0.22
      const tz = norm[c * 2 + 1] + (rng() - 0.5) * 0.22
      // k 개 최근접 부모(정규화 좌표) — 공간적으로 묶인 섬유 다발.
      const best: Array<[number, number]> = []
      for (let j = 0; j < pc; j++) {
        const p = p0 + j
        const dy = norm[p * 2] - ty
        const dz = norm[p * 2 + 1] - tz
        const d = dy * dy + dz * dz
        if (best.length < k) {
          best.push([d, p])
          best.sort((a, b) => a[0] - b[0])
        } else if (d < best[k - 1][0]) {
          best[k - 1] = [d, p]
          best.sort((a, b) => a[0] - b[0])
        }
      }
      for (const [, p] of best) {
        parents[c].push(p)
        children[p].push(c)
        from.push(p)
        to.push(c)
        el.push(l - 1)
      }
    }
  }

  const E = from.length
  const eFrom = Int32Array.from(from)
  const eTo = Int32Array.from(to)
  const eLayer = Uint8Array.from(el)
  const eHash = new Float32Array(E)
  for (let e = 0; e < E; e++) eHash[e] = rng()

  // 하류 집합 계산.
  const descend = (root: number) => {
    const set = new Uint8Array(n)
    const stack = [root]
    set[root] = 1
    while (stack.length) {
      const v = stack.pop()!
      for (const c of children[v]) if (!set[c]) {
        set[c] = 1
        stack.push(c)
      }
    }
    return set
  }
  // 원인 LOT: 위쪽 반(화면 상단), 하류 제품 수가 ~7% 에 가까운 LOT — "작은 군집".
  const target = LAYERS[3].count * 0.07
  let lot = offset[0]
  let bestScore = Infinity
  for (let i = 0; i < LAYERS[0].count; i++) {
    const g = offset[0] + i
    const set = descend(g)
    let cnt = 0
    for (let j = offset[3]; j < n; j++) cnt += set[j]
    if (cnt === 0) continue
    const up = norm[g * 2]
    const side = norm[g * 2 + 1]
    const score = Math.abs(cnt - target) + (up < 0.15 ? 60 : 0) + Math.abs(side) * 20
    if (score < bestScore) {
      bestScore = score
      lot = g
    }
  }
  const affected = descend(lot)
  const affectedList: number[] = []
  for (let g = 0; g < n; g++) if (affected[g]) affectedList.push(g)
  const affectedEdges: number[] = []
  for (let e = 0; e < E; e++) if (affected[eFrom[e]] && affected[eTo[e]]) affectedEdges.push(e)

  // 필드 불량 제품: 영향 제품 중 카메라 쪽(z 큰) + 위쪽인 것.
  let defect = -1
  let dScore = -Infinity
  for (let g = offset[3]; g < n; g++) {
    if (!affected[g]) continue
    const sc = pos[g * 3 + 2] * 0.6 + pos[g * 3 + 1] * 0.4
    if (sc > dScore) {
      dScore = sc
      defect = g
    }
  }
  const A0 = parents[defect].find((p) => affected[p])!
  const S0 = parents[A0].find((p) => affected[p])!
  const findEdge = (a: number, b: number) => {
    for (let e = 0; e < E; e++) if (eFrom[e] === a && eTo[e] === b) return e
    return 0
  }
  const path = [defect, A0, S0, lot]
  const pathEdges = [findEdge(A0, defect), findEdge(S0, A0), findEdge(lot, S0)]

  // 미등록 토큰: 영향 군집 밖, 위쪽 + 카메라 쪽 서브 → 위쪽 상위 조립.
  let unregFrom = offset[1]
  let uScore = -Infinity
  for (let i = 0; i < LAYERS[1].count; i++) {
    const g = offset[1] + i
    if (affected[g]) continue
    const sc = norm[g * 2] * 1.0 - Math.abs(norm[g * 2 + 1] - 0.35) * 0.8
    if (sc > uScore) {
      uScore = sc
      unregFrom = g
    }
  }
  let unregTo = offset[2]
  let vBest = Infinity
  for (let i = 0; i < LAYERS[2].count; i++) {
    const g = offset[2] + i
    if (affected[g]) continue
    const dy = norm[g * 2] - norm[unregFrom * 2] * 1.02
    const dz = norm[g * 2 + 1] - norm[unregFrom * 2 + 1]
    const d = dy * dy + dz * dz
    if (d < vBest) {
      vBest = d
      unregTo = g
    }
  }

  return {
    n,
    offset,
    layerOf,
    pos,
    parents,
    children,
    eFrom,
    eTo,
    eLayer,
    eHash,
    lot,
    affected,
    affectedList,
    affectedEdges,
    defect,
    path,
    pathEdges,
    unregFrom,
    unregTo,
  }
}

/** 곡선 엣지 LineSegments — 정점 색은 매 프레임 runtime 이 쓴다. vS = 엣지 위 위치(0..1). */
export function buildEdges(T3: Three, g: Graph) {
  const E = g.eFrom.length
  const V = E * EDGE_SEGS * 2
  const positions = new Float32Array(V * 3)
  const colors = new Float32Array(V * 3)
  const vS = new Float32Array(V)
  const p = { x: 0, y: 0, z: 0 }
  let v = 0
  for (let e = 0; e < E; e++) {
    for (let k = 0; k < EDGE_SEGS; k++) {
      for (const s of [k / EDGE_SEGS, (k + 1) / EDGE_SEGS]) {
        curvePoint(g.pos, g.eFrom[e], g.eTo[e], s, p)
        positions[v * 3] = p.x
        positions[v * 3 + 1] = p.y
        positions[v * 3 + 2] = p.z
        vS[v] = s
        v++
      }
    }
  }
  const geo = new T3.BufferGeometry()
  geo.setAttribute('position', new T3.BufferAttribute(positions, 3))
  const colAttr = new T3.BufferAttribute(colors, 3)
  colAttr.setUsage(T3.DynamicDrawUsage)
  geo.setAttribute('color', colAttr)
  const mat = new T3.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    fog: true,
  })
  const lines = new T3.LineSegments(geo, mat)
  lines.frustumCulled = false
  return { lines, colors, colAttr, vS }
}

/** 레이어별 노드 InstancedMesh. */
export function buildNodes(T3: Three, g: Graph) {
  const geos = [
    new T3.BoxGeometry(0.3, 0.3, 0.3),
    new T3.OctahedronGeometry(0.105, 0),
    new T3.OctahedronGeometry(0.075, 0),
    new T3.IcosahedronGeometry(0.048, 0),
  ]
  const meshes: THREE.InstancedMesh[] = []
  const m = new T3.Matrix4()
  const q = new T3.Quaternion()
  const e = new T3.Euler()
  const sc = new T3.Vector3(1, 1, 1)
  const ps = new T3.Vector3()
  const rng = mulberry32(77)
  LAYERS.forEach((L, l) => {
    const mat = new T3.MeshBasicMaterial({ color: 0xffffff, fog: true })
    const mesh = new T3.InstancedMesh(geos[l], mat, L.count)
    for (let i = 0; i < L.count; i++) {
      const gi = g.offset[l] + i
      ps.set(g.pos[gi * 3], g.pos[gi * 3 + 1], g.pos[gi * 3 + 2])
      e.set(rng() * 3, rng() * 3, rng() * 3)
      q.setFromEuler(e)
      m.compose(ps, l === 0 ? q.identity() : q, sc)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, new T3.Color(0.3, 0.3, 0.3))
    }
    mesh.instanceMatrix.setUsage(T3.DynamicDrawUsage)
    mesh.instanceColor!.setUsage(T3.DynamicDrawUsage)
    mesh.frustumCulled = false
    meshes.push(mesh)
  })
  return meshes
}

/** 원형 그라디언트 스프라이트(가산 파티클용). */
export function makeDotTexture(T3: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.18, 'rgba(255,255,255,0.85)')
  gr.addColorStop(0.45, 'rgba(255,255,255,0.22)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = gr
  x.fillRect(0, 0, 64, 64)
  const tex = new T3.CanvasTexture(c)
  tex.colorSpace = T3.SRGBColorSpace
  return tex
}

/** 동적 파티클 풀(스파크). 색이 0 이면 가산이라 안 보임. */
export function buildSparks(T3: Three, count: number, tex: THREE.Texture, size: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const geo = new T3.BufferGeometry()
  const pa = new T3.BufferAttribute(positions, 3)
  const ca = new T3.BufferAttribute(colors, 3)
  pa.setUsage(T3.DynamicDrawUsage)
  ca.setUsage(T3.DynamicDrawUsage)
  geo.setAttribute('position', pa)
  geo.setAttribute('color', ca)
  const mat = new T3.PointsMaterial({
    size,
    map: tex,
    vertexColors: true,
    transparent: true,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    fog: false,
  })
  const pts = new T3.Points(geo, mat)
  pts.frustumCulled = false
  return { pts, positions, colors, pa, ca }
}

/** 공간 헤이즈(먼지) — 정적 지오메트리, 색/회전만 runtime 이 바꾼다. */
export function buildHaze(T3: Three, count: number, tex: THREE.Texture) {
  const rng = mulberry32(9)
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * 24
    positions[i * 3 + 1] = (rng() - 0.5) * 13 + 0.3
    positions[i * 3 + 2] = (rng() - 0.5) * 12
  }
  const geo = new T3.BufferGeometry()
  geo.setAttribute('position', new T3.BufferAttribute(positions, 3))
  const mat = new T3.PointsMaterial({
    size: 0.09,
    map: tex,
    color: 0x333333,
    transparent: true,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })
  const pts = new T3.Points(geo, mat)
  return pts
}

/** 게이트(상위 공정 입구) — 사각 프레임 + 차단 X. */
export function buildGate(T3: Three) {
  const group = new T3.Group()
  const frameMat = new T3.MeshBasicMaterial({
    color: 0x4fe0c4,
    transparent: true,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    side: T3.DoubleSide,
    fog: false,
  })
  const frame = new T3.Mesh(new T3.RingGeometry(0.62, 0.68, 4, 1, Math.PI / 4), frameMat)
  frame.rotation.y = Math.PI / 2
  group.add(frame)
  // 안쪽 얇은 막(게이트 면)
  const paneMat = new T3.MeshBasicMaterial({
    color: 0x4fe0c4,
    transparent: true,
    opacity: 0.06,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    side: T3.DoubleSide,
    fog: false,
  })
  const pane = new T3.Mesh(new T3.PlaneGeometry(0.86, 0.86), paneMat)
  pane.rotation.y = Math.PI / 2
  group.add(pane)
  const xMat = new T3.MeshBasicMaterial({
    color: 0xff4040,
    transparent: true,
    blending: T3.AdditiveBlending,
    depthWrite: false,
    side: T3.DoubleSide,
    fog: false,
  })
  const xGroup = new T3.Group()
  const bar = new T3.PlaneGeometry(0.06, 0.62)
  const b1 = new T3.Mesh(bar, xMat)
  const b2 = new T3.Mesh(bar, xMat)
  b1.rotation.z = Math.PI / 4
  b2.rotation.z = -Math.PI / 4
  xGroup.rotation.y = Math.PI / 2
  xGroup.add(b1, b2)
  group.add(xGroup)
  return { group, frameMat, paneMat, xMat, xGroup }
}
