import type * as T3 from 'three'
import type { RoundedBoxGeometry as RBG } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { LineMaterial as LM } from 'three/examples/jsm/lines/LineMaterial.js'
import type { LineSegments2 as LS2 } from 'three/examples/jsm/lines/LineSegments2.js'
import type { LineSegmentsGeometry as LSG } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import type { mergeGeometries as MG } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Three } from '../_host/three/types'
import { COLORS, LAYOUT, SIGNALS_PER_SOURCE, SOURCES } from './data'

// 지오메트리/머티리얼 빌더. 런타임 값은 전부 넘겨받은 THREE 네임스페이스로 만든다.

type V3 = readonly [number, number, number]

/** async setup 에서 동적 import 한 three addons. */
export interface Addons {
  RoundedBoxGeometry: typeof RBG
  LineSegments2: typeof LS2
  LineSegmentsGeometry: typeof LSG
  LineMaterial: typeof LM
  mergeGeometries: typeof MG
}

export async function loadAddons(): Promise<Addons> {
  const [rb, ls2, lsg, lm, bgu] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
  ])
  return {
    RoundedBoxGeometry: rb.RoundedBoxGeometry,
    LineSegments2: ls2.LineSegments2,
    LineSegmentsGeometry: lsg.LineSegmentsGeometry,
    LineMaterial: lm.LineMaterial,
    mergeGeometries: bgu.mergeGeometries,
  }
}

export const hdr = (THREE: Three, hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k)
const v = (THREE: Three, p: V3) => new THREE.Vector3(p[0], p[1], p[2])

/** 결정적 의사난수. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeSprite(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.18, 'rgba(255,255,255,0.7)')
  grd.addColorStop(0.45, 'rgba(255,255,255,0.18)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 접지용 소프트 그림자 데칼(검정 radial falloff). */
function makeShadowTex(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(0,0,0,0.85)')
  grd.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

/** 게이트 막(iris) — 가장자리가 밝고 가운데가 비치는 동심원 텍스처. */
function makeIrisTex(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grd.addColorStop(0, 'rgba(255,255,255,0.10)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.22)')
  grd.addColorStop(0.94, 'rgba(255,255,255,0.75)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(255,255,255,0.16)'
  g.lineWidth = 1
  for (let r = 18; r < 120; r += 12) {
    g.beginPath()
    g.arc(128, 128, r, 0, Math.PI * 2)
    g.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function pointsMat(THREE: Three, map: T3.Texture, size: number) {
  return new THREE.PointsMaterial({
    size,
    map,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
}

/** 프레넬 글로우 셸 — 정면은 밝고 실루엣 가장자리로 갈수록 사라진다(평평한 반투명 띠 대신). */
export type GlowMat = T3.ShaderMaterial & { uniforms: { uColor: { value: T3.Color }; uOpacity: { value: number } } }
export function glowMat(THREE: Three, hex: string, k: number, opacity: number, pow = 2.2): GlowMat {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: hdr(THREE, hex, k) },
      uOpacity: { value: opacity },
      uPow: { value: pow },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform float uPow;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = abs(dot(normalize(vN), normalize(vV)));
        float a = pow(f, uPow) * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }) as GlowMat
}

/** 공용 금속/그라파이트 머티리얼. */
function metal(THREE: Three, color: number, roughness = 0.38, metalness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.9 })
}

/** 바닥 그리드 + 먼지 + 접지 그림자. */
export function buildEnvironment(THREE: Three, scene: T3.Scene, sprite: T3.Texture) {
  const grid = new THREE.GridHelper(80, 80, 0x16211f, 0x0b1211)
  grid.position.y = -0.04
  scene.add(grid)

  const r = rng(91)
  const n = 300
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -24 + r() * 44
    pos[i * 3 + 1] = -0.5 + r() * 12
    pos[i * 3 + 2] = -22 + r() * 30
    const k = 0.04 + r() * 0.09
    col[i * 3] = k * 0.8
    col[i * 3 + 1] = k
    col[i * 3 + 2] = k
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const dust = new THREE.Points(g, pointsMat(THREE, sprite, 0.07))
  scene.add(dust)
  return { dust }
}

/** 접지 그림자 데칼들 — InstancedMesh 1콜. [x, z, sx, sz, y] */
export function buildShadows(THREE: Three, scene: T3.Scene, items: Array<[number, number, number, number, number?]>) {
  const geo = new THREE.PlaneGeometry(1, 1)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({ map: makeShadowTex(THREE), transparent: true, depthWrite: false, opacity: 0.9 })
  const mesh = new THREE.InstancedMesh(geo, mat, items.length)
  const d = new THREE.Object3D()
  items.forEach(([x, z, sx, sz, y], i) => {
    d.position.set(x, y ?? -0.03, z)
    d.scale.set(sx, 1, sz)
    d.updateMatrix()
    mesh.setMatrixAt(i, d.matrix)
  })
  mesh.renderOrder = -1
  scene.add(mesh)
  return mesh
}

function fatSegments(THREE: Three, A: Addons, pts: number[], color: T3.Color, width: number, opacity = 1) {
  const geo = new A.LineSegmentsGeometry()
  geo.setPositions(pts)
  const mat = new A.LineMaterial({ color: color.getHex(), linewidth: width, transparent: opacity < 1, opacity, worldUnits: false })
  mat.color.copy(color)
  const line = new A.LineSegments2(geo, mat)
  line.computeLineDistances()
  return { line, mat }
}

/** 아이젠하워 2×2 캡처 보드 — 베벨 슬래브 위의 사분면 타일 + 팻 라인 테두리. */
export function buildMatrix(THREE: Three, A: Addons, scene: T3.Scene) {
  const { x, z, size } = LAYOUT.matrix
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  const slab = new THREE.Mesh(
    new A.RoundedBoxGeometry(size + 0.5, 0.09, size + 0.5, 3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x0a1312, roughness: 0.42, metalness: 0.7, envMapIntensity: 0.7 }),
  )
  slab.position.y = -0.045
  group.add(slab)

  const half = size / 2
  const gap = 0.07
  const q = half - gap
  // 사분면: [중요·긴급, 중요, 긴급, 기타] — 긴급 = -x, 중요 = -z
  const tints = [
    hdr(THREE, COLORS.teal, 0.14),
    hdr(THREE, COLORS.blue, 0.08),
    hdr(THREE, COLORS.blue, 0.06),
    hdr(THREE, COLORS.dim, 0.045),
  ]
  const offs: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  const tileMats: T3.MeshBasicMaterial[] = []
  const tileGeo = new THREE.PlaneGeometry(q, q)
  offs.forEach(([sx, sz], i) => {
    const m = new THREE.MeshBasicMaterial({ color: tints[i], transparent: true, opacity: 0.9, depthWrite: false })
    tileMats.push(m)
    const tile = new THREE.Mesh(tileGeo, m)
    tile.rotation.x = -Math.PI / 2
    tile.position.set((sx * half) / 2, 0.004, (sz * half) / 2)
    group.add(tile)
  })

  // 미세 그리드(헤어라인 — 보조 정보라 1px 유지)
  const fine: number[] = []
  const step = size / 16
  for (let i = 0; i <= 16; i++) {
    const p = -half + i * step
    fine.push(p, 0.008, -half, p, 0.008, half, -half, 0.008, p, half, 0.008, p)
  }
  const fineGeo = new THREE.BufferGeometry()
  fineGeo.setAttribute('position', new THREE.Float32BufferAttribute(fine, 3))
  const fineMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.teal, 0.12), transparent: true, opacity: 0.55 })
  group.add(new THREE.LineSegments(fineGeo, fineMat))

  // 사분면 테두리 + 중앙 십자 — 팻 라인
  const edges: number[] = []
  for (const [sx, sz] of offs) {
    const cx = (sx * half) / 2
    const cz = (sz * half) / 2
    const h = q / 2
    const c = [
      [cx - h, cz - h],
      [cx + h, cz - h],
      [cx + h, cz + h],
      [cx - h, cz + h],
    ]
    for (let i = 0; i < 4; i++) {
      const a = c[i]
      const b = c[(i + 1) % 4]
      edges.push(a[0], 0.014, a[1], b[0], 0.014, b[1])
    }
  }
  const edge = fatSegments(THREE, A, edges, hdr(THREE, COLORS.teal, 1.0), 1.4)
  group.add(edge.line)
  const cross = fatSegments(
    THREE,
    A,
    [-half - 0.3, 0.02, 0, half + 0.3, 0.02, 0, 0, 0.02, -half - 0.3, 0, 0.02, half + 0.3],
    hdr(THREE, COLORS.phosphor, 1.4),
    1.8,
  )
  group.add(cross.line)

  return { group, tileMats, edgeMat: edge.mat, crossMat: cross.mat, tints }
}

export interface Rails {
  decA: T3.CatmullRomCurve3
  decB: T3.LineCurve3
  branches: T3.CatmullRomCurve3[]
  auto: T3.CatmullRomCurve3
  prop: T3.CatmullRomCurve3
  mats: {
    dec: T3.MeshBasicMaterial
    decGlow: GlowMat
    branch: T3.MeshBasicMaterial
    auto: T3.MeshBasicMaterial
    autoGlow: GlowMat
    prop: T3.MeshBasicMaterial
    propGlow: GlowMat
  }
  /** 지지 기둥 발치(그림자 데칼용) */
  feet: Array<[number, number]>
}

/**
 * 레일 = 발광 코어 + 유리 슬리브 + 금속 클램프 칼라 + 지지 기둥.
 * 코어 색은 런타임이 점등 상태에 맞춰 갱신한다.
 */
export function buildRails(THREE: Three, A: Addons, scene: T3.Scene): Rails {
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const mEdge = LAYOUT.matrix.x + LAYOUT.matrix.size / 2
  const join = v(THREE, LAYOUT.join)
  const gate = v(THREE, LAYOUT.gate)
  const box = LAYOUT.box

  const decA = new THREE.CatmullRomCurve3(
    [P(mEdge + 0.15, 0.06, -1.2), P(mEdge + 1.3, 0.45, -1.25), P(-1.4, 1.75, -1.25), P(-0.4, 2.3, -1.2), join],
    false,
    'centripetal',
  )
  const decB = new THREE.LineCurve3(join.clone(), gate.clone())
  const branches = LAYOUT.pads.map((p) => {
    const end = v(THREE, p)
    return new THREE.CatmullRomCurve3(
      [gate.clone(), P(gate.x + 1.1, gate.y, gate.z), P(gate.x + 2.4, (gate.y + end.y) / 2, (gate.z + end.z) / 2), end.clone().add(P(-0.55, 0.12, 0))],
      false,
      'centripetal',
    )
  })
  const auto = new THREE.CatmullRomCurve3(
    [P(mEdge + 0.15, 0.06, 1.2), P(mEdge + 1.4, 0.18, 2.3), P(-1.0, 0.5, 3.0), P(box.c[0] - box.w / 2 - 0.05, box.c[1], box.c[2])],
    false,
    'centripetal',
  )
  const prop = new THREE.CatmullRomCurve3(
    [
      P(box.c[0] + 0.2, box.c[1] + box.h / 2 + 0.05, box.c[2]),
      P(box.c[0] + 0.5, 1.9, 2.3),
      P(0.9, 2.75, 0.6),
      P(0.0, 2.6, -0.6),
      join.clone(),
    ],
    false,
    'centripetal',
  )

  const basic = (hex: string, k: number, opacity = 1) =>
    new THREE.MeshBasicMaterial({ color: hdr(THREE, hex, k), transparent: opacity < 1, opacity })
  const mats = {
    dec: basic(COLORS.phosphor, 1.2),
    decGlow: glowMat(THREE, COLORS.phosphor, 0.5, 0.5),
    branch: basic(COLORS.phosphor, 0.6),
    auto: basic(COLORS.amber, 1.2),
    autoGlow: glowMat(THREE, COLORS.amber, 0.5, 0.5),
    prop: basic(COLORS.proposal, 0.9),
    propGlow: glowMat(THREE, COLORS.proposal, 0.4, 0.3),
  }
  const sleeveMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fb4b0,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    depthWrite: false,
    envMapIntensity: 1.2,
  })
  const tube = (c: T3.Curve<T3.Vector3>, r: number, m: T3.Material, seg = 120, radial = 12) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, radial, false), m)
    scene.add(mesh)
    return mesh
  }
  // 코어 · 슬리브 · 글로우 셸
  tube(decA, 0.022, mats.dec)
  tube(decA, 0.05, sleeveMat)
  tube(decA, 0.16, mats.decGlow, 96, 10)
  tube(decB, 0.022, mats.dec, 8)
  tube(decB, 0.05, sleeveMat, 8)
  tube(decB, 0.16, mats.decGlow, 8, 10)
  for (const b of branches) {
    tube(b, 0.014, mats.branch, 64, 8)
    tube(b, 0.032, sleeveMat, 64, 10)
  }
  tube(auto, 0.022, mats.auto)
  tube(auto, 0.05, sleeveMat)
  tube(auto, 0.16, mats.autoGlow, 96, 10)
  tube(prop, 0.017, mats.prop)
  tube(prop, 0.1, mats.propGlow, 96, 10)

  // 클램프 칼라 — 일정 간격 금속 링(InstancedMesh 1콜)
  const collarGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.045, 18, 1, false)
  collarGeo.rotateX(Math.PI / 2)
  const collarSmall = 0.68
  const collarDefs: Array<{ c: T3.Curve<T3.Vector3>; spacing: number; s: number; from: number; to: number }> = [
    { c: decA, spacing: 0.55, s: 1, from: 0.03, to: 0.97 },
    { c: auto, spacing: 0.55, s: 1, from: 0.03, to: 0.97 },
    ...branches.map((b) => ({ c: b as T3.Curve<T3.Vector3>, spacing: 0.6, s: collarSmall, from: 0.18, to: 0.96 })),
  ]
  const xf: T3.Matrix4[] = []
  const d = new THREE.Object3D()
  const p = new THREE.Vector3()
  const tg = new THREE.Vector3()
  for (const def of collarDefs) {
    const len = def.c.getLength()
    const n = Math.max(2, Math.floor((len * (def.to - def.from)) / def.spacing))
    for (let i = 0; i <= n; i++) {
      const u = def.from + ((def.to - def.from) * i) / n
      def.c.getPointAt(u, p)
      def.c.getTangentAt(u, tg)
      d.position.copy(p)
      d.lookAt(p.x + tg.x, p.y + tg.y, p.z + tg.z)
      d.scale.setScalar(def.s)
      d.updateMatrix()
      xf.push(d.matrix.clone())
    }
  }
  const collars = new THREE.InstancedMesh(collarGeo, metal(THREE, 0x6d7674, 0.32, 0.9), xf.length)
  xf.forEach((m, i) => collars.setMatrixAt(i, m))
  scene.add(collars)

  // 지지 기둥 — 레일 아래로 떨어지는 가는 스탠션 + 바닥 플레이트(병합 1콜)
  const feet: Array<[number, number]> = []
  const parts: T3.BufferGeometry[] = []
  const post = (top: T3.Vector3) => {
    const hgt = top.y - 0.06
    if (hgt < 0.25) return
    const cyl = new THREE.CylinderGeometry(0.014, 0.018, hgt, 10, 1, true)
    cyl.translate(top.x, hgt / 2, top.z)
    parts.push(cyl)
    const plate = new THREE.CylinderGeometry(0.09, 0.11, 0.025, 20, 1, false)
    plate.translate(top.x, 0.0125, top.z)
    parts.push(plate)
    feet.push([top.x, top.z])
  }
  for (const u of [0.42, 0.72]) post(decA.getPointAt(u, new THREE.Vector3()).add(P(0, -0.06, 0)))
  for (const u of [0.45, 0.78]) post(auto.getPointAt(u, new THREE.Vector3()).add(P(0, -0.06, 0)))
  const merged = A.mergeGeometries(parts.map((g) => g.toNonIndexed()))
  parts.forEach((g) => g.dispose())
  if (merged) scene.add(new THREE.Mesh(merged, metal(THREE, 0x3b4341, 0.45, 0.85)))

  return { decA, decB, branches, auto, prop, mats, feet }
}

/** 사람 승인 게이트: 금속 프레임 + 발광 링 + 위/아래로 접히는 iris 막 + 스탠션. */
export function buildGate(THREE: Three, scene: T3.Scene) {
  const group = new THREE.Group()
  group.position.copy(v(THREE, LAYOUT.gate))
  group.rotation.y = Math.PI / 2
  scene.add(group)
  const R = 0.95
  const ringMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 1.6) })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.032, 16, 128), ringMat)
  group.add(ring)

  // 금속 프레임: 링을 감싸는 두 겹 베젤
  const frameMat = metal(THREE, 0x8a9290, 0.28, 0.92)
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R + 0.075, 0.042, 18, 128), frameMat)
  group.add(bezel)
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R + 0.075, 0.05, 6, 128, Math.PI * 2), metal(THREE, 0x2b3130, 0.5, 0.8))
  lip.scale.z = 0.5
  lip.position.z = -0.02
  group.add(lip)
  // 체결 볼트(12)
  const boltGeo = new THREE.SphereGeometry(0.018, 10, 8)
  const bolts = new THREE.InstancedMesh(boltGeo, frameMat, 12)
  const dd = new THREE.Object3D()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12
    dd.position.set(Math.cos(a) * (R + 0.075), Math.sin(a) * (R + 0.075), 0.045)
    dd.updateMatrix()
    bolts.setMatrixAt(i, dd.matrix)
  }
  group.add(bolts)

  const haloMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 0.6), transparent: true, opacity: 0.45 })
  const halo = new THREE.Mesh(new THREE.TorusGeometry(R + 0.26, 0.006, 6, 128), haloMat)
  group.add(halo)

  const doorMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COLORS.phosphor, 0.9),
    map: makeIrisTex(THREE),
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const rr = R - 0.025
  const topGeo = new THREE.CircleGeometry(rr, 64, 0, Math.PI)
  topGeo.translate(0, -rr, 0)
  const top = new THREE.Mesh(topGeo, doorMat)
  top.position.y = rr
  const botGeo = new THREE.CircleGeometry(rr, 64, Math.PI, Math.PI)
  botGeo.translate(0, rr, 0)
  const bot = new THREE.Mesh(botGeo, doorMat)
  bot.position.y = -rr
  group.add(top, bot)

  // 이음매: 얇은 발광 바
  const seamMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 2.2), transparent: true })
  const seam = new THREE.Mesh(new THREE.BoxGeometry(2 * rr, 0.01, 0.01), seamMat)
  seam.position.z = 0.005
  group.add(seam)

  // 스탠션: 링 하단 클램프 → 바닥 플레이트
  const H = LAYOUT.gate[1] - R - 0.075
  const stemMat = metal(THREE, 0x505857, 0.4, 0.88)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, H, 14), stemMat)
  stem.position.y = -R - 0.075 - H / 2
  group.add(stem)
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.04, 32), stemMat)
  foot.position.y = -LAYOUT.gate[1] + 0.02
  group.add(foot)

  return { group, ringMat, haloMat, doorMat, top, bot, seamMat, halo }
}

/** Codex job 격리 박스(라운드 유리 + 금속 프레임 + 플린스) + 한도 링 3개. */
export function buildBox(THREE: Three, A: Addons, scene: T3.Scene) {
  const { c, w, h, d } = LAYOUT.box
  const group = new THREE.Group()
  group.position.set(c[0], c[1], c[2])
  scene.add(group)

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLORS.amber).multiplyScalar(0.55),
    transparent: true,
    opacity: 0.1,
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.6,
  })
  group.add(new THREE.Mesh(new A.RoundedBoxGeometry(w, h, d, 4, 0.07), glassMat))

  // 엣지: 12개 발광 바(병합) — 1px 라인 대신 두께 있는 프레임
  const edgeMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.amber, 1.5) })
  const bars: T3.BufferGeometry[] = []
  const r0 = 0.012
  const hx = w / 2 - 0.035
  const hy = h / 2 - 0.035
  const hz = d / 2 - 0.035
  for (const sy of [-1, 1])
    for (const sz of [-1, 1]) {
      const g = new THREE.CylinderGeometry(r0, r0, 2 * hx, 8)
      g.rotateZ(Math.PI / 2)
      g.translate(0, sy * hy, sz * hz)
      bars.push(g)
    }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const g = new THREE.CylinderGeometry(r0, r0, 2 * hy, 8)
      g.translate(sx * hx, 0, sz * hz)
      bars.push(g)
    }
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const g = new THREE.CylinderGeometry(r0, r0, 2 * hz, 8)
      g.rotateX(Math.PI / 2)
      g.translate(sx * hx, sy * hy, 0)
      bars.push(g)
    }
  const barGeo = A.mergeGeometries(bars)
  bars.forEach((g) => g.dispose())
  if (barGeo) group.add(new THREE.Mesh(barGeo, edgeMat))

  // 코너 캡(금속)
  const capGeo = new A.RoundedBoxGeometry(0.075, 0.075, 0.075, 2, 0.02)
  const caps = new THREE.InstancedMesh(capGeo, metal(THREE, 0x8f8578, 0.3, 0.9), 8)
  const dd = new THREE.Object3D()
  let ci = 0
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        dd.position.set(sx * hx, sy * hy, sz * hz)
        dd.updateMatrix()
        caps.setMatrixAt(ci++, dd.matrix)
      }
  group.add(caps)

  // 플린스
  const plinth = new THREE.Mesh(
    new A.RoundedBoxGeometry(w + 0.3, 0.06, d + 0.3, 2, 0.025),
    new THREE.MeshStandardMaterial({ color: 0x14100c, roughness: 0.5, metalness: 0.7, envMapIntensity: 0.8 }),
  )
  plinth.position.y = -c[1] + 0.03
  group.add(plinth)

  // 바닥 격자
  const fl: number[] = []
  for (let i = 1; i < 6; i++) {
    const x = -w / 2 + (i * w) / 6
    const z = -d / 2 + (i * d) / 6
    fl.push(x, -h / 2 + 0.02, -hz, x, -h / 2 + 0.02, hz, -hx, -h / 2 + 0.02, z, hx, -h / 2 + 0.02, z)
  }
  const flGeo = new THREE.BufferGeometry()
  flGeo.setAttribute('position', new THREE.Float32BufferAttribute(fl, 3))
  const floorMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.amber, 0.35), transparent: true, opacity: 0.6 })
  group.add(new THREE.LineSegments(flGeo, floorMat))

  const ringDefs = [
    { r: 1.42, tilt: new THREE.Euler(Math.PI / 2 + 0.22, 0, 0.1), w: 0.55 },
    { r: 1.58, tilt: new THREE.Euler(Math.PI / 2 - 0.55, 0.5, 0), w: -0.42 },
    { r: 1.74, tilt: new THREE.Euler(Math.PI / 2 + 0.75, -0.6, 0.2), w: 0.34 },
  ]
  const beadGeo = new THREE.SphereGeometry(0.05, 16, 12)
  const rings = ringDefs.map((def) => {
    const outer = new THREE.Group()
    outer.rotation.copy(def.tilt)
    group.add(outer)
    const inner = new THREE.Group()
    outer.add(inner)
    const mat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.amber, 0.9), transparent: true, opacity: 0.85 })
    inner.add(new THREE.Mesh(new THREE.TorusGeometry(def.r, 0.009, 8, 160), mat))
    // 눈금(tick) 4개 — 링이 회전하는 것이 읽히도록
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), mat)
      tick.position.set(Math.cos(a) * def.r, Math.sin(a) * def.r, 0)
      tick.rotation.z = a
      inner.add(tick)
    }
    const beadMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.amber, 2.2) })
    const bead = new THREE.Mesh(beadGeo, beadMat)
    bead.position.set(def.r, 0, 0)
    inner.add(bead)
    return { outer, inner, mat, beadMat, bead, w: def.w, r: def.r }
  })

  return { group, glassMat, edgeMat, floorMat, rings }
}

/** 백로그·안건·일정 패드(라운드 슬래브 + 하부 림 라이트) + 패드 위 카드(비수치). */
export function buildPads(THREE: Three, A: Addons, scene: T3.Scene) {
  const padGeo = new A.RoundedBoxGeometry(1.3, 0.06, 0.85, 3, 0.025)
  const rimGeo = new A.RoundedBoxGeometry(1.36, 0.02, 0.91, 3, 0.01)
  const padMat = new THREE.MeshStandardMaterial({ color: 0x0c1312, roughness: 0.55, metalness: 0.45, envMapIntensity: 0.5 })
  const pads = LAYOUT.pads.map((p) => {
    const g = new THREE.Group()
    g.position.set(p[0], p[1], p[2])
    scene.add(g)
    g.add(new THREE.Mesh(padGeo, padMat))
    const edgeMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 1.5) })
    const rim = new THREE.Mesh(rimGeo, edgeMat)
    rim.position.y = -0.026
    g.add(rim)
    return { g, edgeMat }
  })
  const cardGeo = new A.RoundedBoxGeometry(0.26, 0.022, 0.18, 2, 0.008)
  const cards = new THREE.InstancedMesh(
    cardGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.6 }),
    9,
  )
  const dummy = new THREE.Object3D()
  const col = new THREE.Color()
  for (let i = 0; i < 9; i++) {
    const p = LAYOUT.pads[Math.floor(i / 3)]
    const j = i % 3
    dummy.position.set(p[0] - 0.36 + j * 0.36, p[1] + 0.045, p[2] + (j === 1 ? 0.05 : -0.04))
    dummy.rotation.set(0, (j - 1) * 0.08, 0)
    dummy.updateMatrix()
    cards.setMatrixAt(i, dummy.matrix)
    cards.setColorAt(i, col.set(COLORS.phosphor).multiplyScalar(0.5))
  }
  scene.add(cards)
  return { pads }
}

/**
 * 신호 글리프 — 소스별 InstancedMesh(라운드/베벨 형상 + 물리 재질).
 * 인스턴스 색이 발광(emissive)에도 들어가 비행 중엔 빛나고, 착지하면 단정한 칩으로 가라앉는다.
 */
export function buildSignals(THREE: Three, A: Addons, scene: T3.Scene) {
  const tri = new THREE.CylinderGeometry(0.105, 0.105, 0.05, 3, 1)
  const geos: T3.BufferGeometry[] = [
    new A.RoundedBoxGeometry(0.15, 0.15, 0.15, 2, 0.03),
    new THREE.OctahedronGeometry(0.115, 0),
    new A.RoundedBoxGeometry(0.24, 0.045, 0.15, 2, 0.016),
    tri,
    new THREE.SphereGeometry(0.075, 20, 14),
  ]
  // 착지 시 보드 위 높이(반높이 + 여유)
  const restY = [0.085, 0.125, 0.032, 0.035, 0.085]
  const glow = { value: 0.32 }
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.8,
    flatShading: false,
  })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow
    sh.fragmentShader =
      'uniform float uGlow;\n' +
      sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n totalEmissiveRadiance += vColor.rgb * uGlow;\n#endif',
      )
  }
  const r = rng(7)
  const { x: mx, z: mz, size } = LAYOUT.matrix
  const half = size / 2
  // 보드 셀(16×16) 중 사분면 테두리 안쪽만 — 중복 없이 셀 중심에 정렬 착지
  const cell = size / 16
  const free: Array<Array<[number, number]>> = [[], [], [], []]
  for (let i = 0; i < 16; i++)
    for (let j = 0; j < 16; j++) {
      const qi = (i < 8 ? 0 : 1) + (j < 8 ? 0 : 2)
      const li = i % 8
      const lj = j % 8
      if (li < 1 || li > 6 || lj < 1 || lj > 6) continue
      free[qi].push([mx - half + (i + 0.5) * cell, mz - half + (j + 0.5) * cell])
    }
  for (const list of free)
    for (let i = list.length - 1; i > 0; i--) {
      const k = Math.floor(r() * (i + 1))
      ;[list[i], list[k]] = [list[k], list[i]]
    }
  type Sig = { src: number; idx: number; s: T3.Vector3; c: T3.Vector3; l: T3.Vector3; phase: number; spin: number; yaw: number }
  const sigs: Sig[] = []
  const meshes = SOURCES.map((src, si) => {
    const m = new THREE.InstancedMesh(geos[si], mat, SIGNALS_PER_SOURCE)
    m.frustumCulled = false
    const col = new THREE.Color(src.color)
    for (let i = 0; i < SIGNALS_PER_SOURCE; i++) {
      m.setColorAt(i, col)
      // 중요·긴급 사분면에 약간 더 몰리도록
      let quad = Math.floor(r() * 4.6) % 4
      if (free[quad].length === 0) quad = free.findIndex((f) => f.length > 0)
      const [lx, lz] = free[quad].pop()!
      const l = new THREE.Vector3(lx, restY[si], lz)
      const s = new THREE.Vector3(-14 - r() * 6, 0.3 + r() * 2.6, -7 + r() * 8)
      const c = new THREE.Vector3((s.x + l.x) / 2 + 1, Math.max(s.y, 1.5) + 1.2 + r() * 1.4, (s.z + l.z) / 2)
      sigs.push({ src: si, idx: i, s, c, l, phase: r(), spin: 0.6 + r() * 1.4, yaw: Math.round(r() * 3) * (Math.PI / 2) })
    }
    scene.add(m)
    return m
  })
  return { meshes, sigs }
}

/** 이동 토큰(라운드 카드) + 헤일로 스프라이트. */
export function buildToken(THREE: Three, A: Addons, scene: T3.Scene, sprite: T3.Texture, hex: string) {
  const mat = new THREE.MeshBasicMaterial({ color: hdr(THREE, hex, 2.4), transparent: true })
  const mesh = new THREE.Mesh(new A.RoundedBoxGeometry(0.34, 0.05, 0.24, 2, 0.02), mat)
  scene.add(mesh)
  const haloMat = new THREE.SpriteMaterial({
    map: sprite,
    color: hdr(THREE, hex, 1.2),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const halo = new THREE.Sprite(haloMat)
  halo.scale.setScalar(0.9)
  scene.add(halo)
  return { mesh, mat, halo, haloMat }
}
