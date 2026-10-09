import type * as T3 from 'three'
import type { Three } from '../_host/three/types'
import { COLORS, LAYOUT, SIGNALS_PER_SOURCE, SOURCES } from './data'

// 지오메트리/머티리얼 빌더. 런타임 값은 전부 넘겨받은 THREE 네임스페이스로 만든다.

type V3 = readonly [number, number, number]

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
  grd.addColorStop(0.25, 'rgba(255,255,255,0.65)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
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

/** 바닥 그리드 + 먼지. */
export function buildEnvironment(THREE: Three, scene: T3.Scene, sprite: T3.Texture) {
  const grid = new THREE.GridHelper(80, 80, 0x1a2a2a, 0x0d1514)
  grid.position.y = -0.04
  scene.add(grid)

  const r = rng(91)
  const n = 360
  const pos = new Float32Array(n * 3)
  const col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -24 + r() * 44
    pos[i * 3 + 1] = -0.5 + r() * 12
    pos[i * 3 + 2] = -22 + r() * 30
    const k = 0.05 + r() * 0.12
    col[i * 3] = k * 0.8
    col[i * 3 + 1] = k
    col[i * 3 + 2] = k
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const dust = new THREE.Points(g, pointsMat(THREE, sprite, 0.09))
  scene.add(dust)
  return { dust }
}

/** 아이젠하워 2×2 캡처 보드. */
export function buildMatrix(THREE: Three, scene: T3.Scene) {
  const { x, z, size } = LAYOUT.matrix
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  scene.add(group)

  const base = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 0.5, size + 0.5),
    new THREE.MeshBasicMaterial({ color: 0x07100f, transparent: true, opacity: 0.92 }),
  )
  base.rotation.x = -Math.PI / 2
  group.add(base)

  const half = size / 2
  const gap = 0.07
  const q = half - gap
  // 사분면: [중요·긴급, 중요, 긴급, 기타] — 긴급 = -x, 중요 = -z
  const tints = [
    hdr(THREE, COLORS.teal, 0.16),
    hdr(THREE, COLORS.blue, 0.09),
    hdr(THREE, COLORS.blue, 0.07),
    hdr(THREE, COLORS.dim, 0.05),
  ]
  const offs: Array<[number, number]> = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]
  const tileMats: T3.MeshBasicMaterial[] = []
  offs.forEach(([sx, sz], i) => {
    const m = new THREE.MeshBasicMaterial({ color: tints[i], transparent: true, opacity: 0.9, depthWrite: false })
    tileMats.push(m)
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(q, q), m)
    tile.rotation.x = -Math.PI / 2
    tile.position.set((sx * half) / 2, 0.005, (sz * half) / 2)
    group.add(tile)
  })

  // 미세 그리드
  const fine: number[] = []
  const step = size / 16
  for (let i = 0; i <= 16; i++) {
    const p = -half + i * step
    fine.push(p, 0.01, -half, p, 0.01, half, -half, 0.01, p, half, 0.01, p)
  }
  const fineGeo = new THREE.BufferGeometry()
  fineGeo.setAttribute('position', new THREE.Float32BufferAttribute(fine, 3))
  const fineMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.teal, 0.16), transparent: true, opacity: 0.6 })
  group.add(new THREE.LineSegments(fineGeo, fineMat))

  // 사분면 테두리 + 중앙 십자
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
      edges.push(a[0], 0.02, a[1], b[0], 0.02, b[1])
    }
  }
  const edgeGeo = new THREE.BufferGeometry()
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3))
  const edgeMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.teal, 1.1) })
  group.add(new THREE.LineSegments(edgeGeo, edgeMat))

  const crossGeo = new THREE.BufferGeometry()
  crossGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-half - 0.3, 0.03, 0, half + 0.3, 0.03, 0, 0, 0.03, -half - 0.3, 0, 0.03, half + 0.3], 3),
  )
  const crossMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 1.6) })
  group.add(new THREE.LineSegments(crossGeo, crossMat))

  return { group, tileMats, edgeMat, crossMat, tints }
}

export interface Rails {
  decA: T3.CatmullRomCurve3
  decB: T3.LineCurve3
  branches: T3.CatmullRomCurve3[]
  auto: T3.CatmullRomCurve3
  prop: T3.CatmullRomCurve3
  mats: {
    dec: T3.MeshBasicMaterial
    decGlow: T3.MeshBasicMaterial
    branch: T3.MeshBasicMaterial
    auto: T3.MeshBasicMaterial
    autoGlow: T3.MeshBasicMaterial
    prop: T3.MeshBasicMaterial
  }
}

export function buildRails(THREE: Three, scene: T3.Scene): Rails {
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

  const basic = (hex: string, k: number, opacity = 1, additive = false) =>
    new THREE.MeshBasicMaterial({
      color: hdr(THREE, hex, k),
      transparent: opacity < 1 || additive,
      opacity,
      depthWrite: !additive,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
  const mats = {
    dec: basic(COLORS.phosphor, 1.2),
    decGlow: basic(COLORS.phosphor, 0.25, 0.35, true),
    branch: basic(COLORS.phosphor, 0.6),
    auto: basic(COLORS.amber, 1.2),
    autoGlow: basic(COLORS.amber, 0.25, 0.35, true),
    prop: basic(COLORS.proposal, 0.9, 0.85),
  }
  const tube = (c: T3.Curve<T3.Vector3>, r: number, m: T3.Material, seg = 96) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8, false), m)
    scene.add(mesh)
    return mesh
  }
  tube(decA, 0.03, mats.dec)
  tube(decA, 0.11, mats.decGlow)
  tube(decB, 0.03, mats.dec, 8)
  tube(decB, 0.11, mats.decGlow, 8)
  for (const b of branches) tube(b, 0.022, mats.branch, 64)
  tube(auto, 0.03, mats.auto)
  tube(auto, 0.11, mats.autoGlow)
  tube(prop, 0.024, mats.prop)

  return { decA, decB, branches, auto, prop, mats }
}

/** 사람 승인 게이트: 링 + 위/아래로 접히는 문짝. */
export function buildGate(THREE: Three, scene: T3.Scene) {
  const group = new THREE.Group()
  group.position.copy(v(THREE, LAYOUT.gate))
  group.rotation.y = Math.PI / 2
  scene.add(group)
  const R = 0.95
  const ringMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 1.6) })
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 12, 96), ringMat)
  group.add(ring)
  const haloMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 0.6), transparent: true, opacity: 0.5 })
  const halo = new THREE.Mesh(new THREE.TorusGeometry(R + 0.2, 0.008, 6, 96), haloMat)
  group.add(halo)

  const doorMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COLORS.phosphor, 0.5),
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const topGeo = new THREE.CircleGeometry(R - 0.03, 48, 0, Math.PI)
  topGeo.translate(0, -(R - 0.03), 0)
  const top = new THREE.Mesh(topGeo, doorMat)
  top.position.y = R - 0.03
  const botGeo = new THREE.CircleGeometry(R - 0.03, 48, Math.PI, Math.PI)
  botGeo.translate(0, R - 0.03, 0)
  const bot = new THREE.Mesh(botGeo, doorMat)
  bot.position.y = -(R - 0.03)
  group.add(top, bot)

  const seamMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 2.2), transparent: true })
  const seamGeo = new THREE.BufferGeometry()
  seamGeo.setAttribute('position', new THREE.Float32BufferAttribute([-R, 0, 0.01, R, 0, 0.01], 3))
  const seam = new THREE.Line(seamGeo, seamMat)
  group.add(seam)

  // 게이트 기둥(바닥에서 올라오는 얇은 빛기둥)
  const pillarMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 0.35), transparent: true, opacity: 0.5 })
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, LAYOUT.gate[1] - R, 6), pillarMat)
  pillar.position.y = -R - (LAYOUT.gate[1] - R) / 2
  group.add(pillar)

  return { group, ringMat, haloMat, doorMat, top, bot, seamMat, halo }
}

/** Codex job 격리 박스 + 한도 링 3개. */
export function buildBox(THREE: Three, scene: T3.Scene) {
  const { c, w, h, d } = LAYOUT.box
  const group = new THREE.Group()
  group.position.set(c[0], c[1], c[2])
  scene.add(group)

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLORS.amber).multiplyScalar(0.6),
    transparent: true,
    opacity: 0.1,
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMapIntensity: 1.4,
  })
  const boxGeo = new THREE.BoxGeometry(w, h, d)
  group.add(new THREE.Mesh(boxGeo, glassMat))
  const edgeMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.amber, 1.5) })
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), edgeMat))

  // 바닥 격자
  const fl: number[] = []
  for (let i = 0; i <= 6; i++) {
    const x = -w / 2 + (i * w) / 6
    const z = -d / 2 + (i * d) / 6
    fl.push(x, -h / 2 + 0.01, -d / 2, x, -h / 2 + 0.01, d / 2, -w / 2, -h / 2 + 0.01, z, w / 2, -h / 2 + 0.01, z)
  }
  const flGeo = new THREE.BufferGeometry()
  flGeo.setAttribute('position', new THREE.Float32BufferAttribute(fl, 3))
  const floorMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.amber, 0.35), transparent: true, opacity: 0.7 })
  group.add(new THREE.LineSegments(flGeo, floorMat))

  const ringDefs = [
    { r: 1.42, tilt: new THREE.Euler(Math.PI / 2 + 0.22, 0, 0.1), w: 0.55 },
    { r: 1.58, tilt: new THREE.Euler(Math.PI / 2 - 0.55, 0.5, 0), w: -0.42 },
    { r: 1.74, tilt: new THREE.Euler(Math.PI / 2 + 0.75, -0.6, 0.2), w: 0.34 },
  ]
  const rings = ringDefs.map((def) => {
    const outer = new THREE.Group()
    outer.rotation.copy(def.tilt)
    group.add(outer)
    const inner = new THREE.Group()
    outer.add(inner)
    const mat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.amber, 0.9), transparent: true, opacity: 0.85 })
    inner.add(new THREE.Mesh(new THREE.TorusGeometry(def.r, 0.011, 6, 128), mat))
    const beadMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COLORS.amber, 2.2) })
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), beadMat)
    bead.position.set(def.r, 0, 0)
    inner.add(bead)
    return { outer, inner, mat, beadMat, bead, w: def.w }
  })

  return { group, glassMat, edgeMat, floorMat, rings }
}

/** 백로그·안건·일정 패드 + 패드 위 장식 카드(비수치). */
export function buildPads(THREE: Three, scene: T3.Scene) {
  const padGeo = new THREE.BoxGeometry(1.3, 0.05, 0.85)
  const edgeGeo = new THREE.EdgesGeometry(padGeo)
  const pads = LAYOUT.pads.map((p) => {
    const g = new THREE.Group()
    g.position.set(p[0], p[1], p[2])
    scene.add(g)
    g.add(new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color: 0x0a1010 })))
    const edgeMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COLORS.phosphor, 1.5) })
    g.add(new THREE.LineSegments(edgeGeo, edgeMat))
    return { g, edgeMat }
  })
  const cardGeo = new THREE.BoxGeometry(0.26, 0.03, 0.18)
  const cards = new THREE.InstancedMesh(cardGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 9)
  const dummy = new THREE.Object3D()
  const col = new THREE.Color()
  for (let i = 0; i < 9; i++) {
    const p = LAYOUT.pads[Math.floor(i / 3)]
    const j = i % 3
    dummy.position.set(p[0] - 0.36 + j * 0.36, p[1] + 0.05, p[2] + (j === 1 ? 0.05 : -0.04))
    dummy.rotation.set(0, (j - 1) * 0.08, 0)
    dummy.updateMatrix()
    cards.setMatrixAt(i, dummy.matrix)
    cards.setColorAt(i, col.set(COLORS.phosphor).multiplyScalar(0.55))
  }
  scene.add(cards)
  return { pads }
}

/** 신호 글리프 — 소스별 InstancedMesh. */
export function buildSignals(THREE: Three, scene: T3.Scene) {
  const geos = [
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.OctahedronGeometry(0.12),
    new THREE.BoxGeometry(0.22, 0.035, 0.16),
    new THREE.TetrahedronGeometry(0.14),
    new THREE.IcosahedronGeometry(0.1, 0),
  ]
  const r = rng(7)
  const { x: mx, z: mz, size } = LAYOUT.matrix
  const half = size / 2
  type Sig = { src: number; idx: number; s: T3.Vector3; c: T3.Vector3; l: T3.Vector3; phase: number; spin: number }
  const sigs: Sig[] = []
  const meshes = SOURCES.map((src, si) => {
    const m = new THREE.InstancedMesh(geos[si], new THREE.MeshBasicMaterial({ color: 0xffffff }), SIGNALS_PER_SOURCE)
    m.frustumCulled = false
    const col = new THREE.Color(src.color)
    for (let i = 0; i < SIGNALS_PER_SOURCE; i++) {
      m.setColorAt(i, col)
      const quad = Math.floor(r() * 4)
      const qx = quad % 2 === 0 ? -1 : 1
      const qz = quad < 2 ? -1 : 1
      const l = new THREE.Vector3(
        mx + (qx * half) / 2 + (r() - 0.5) * (half - 0.35),
        0.1,
        mz + (qz * half) / 2 + (r() - 0.5) * (half - 0.35),
      )
      const s = new THREE.Vector3(-14 - r() * 6, 0.3 + r() * 2.6, -7 + r() * 8)
      const c = new THREE.Vector3((s.x + l.x) / 2 + 1, Math.max(s.y, 1.5) + 1.2 + r() * 1.4, (s.z + l.z) / 2)
      sigs.push({ src: si, idx: i, s, c, l, phase: r(), spin: 0.6 + r() * 1.4 })
    }
    scene.add(m)
    return m
  })
  return { meshes, sigs }
}

/** 이동 토큰(카드) + 헤일로 스프라이트. */
export function buildToken(THREE: Three, scene: T3.Scene, sprite: T3.Texture, hex: string) {
  const mat = new THREE.MeshBasicMaterial({ color: hdr(THREE, hex, 2.4), transparent: true })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.24), mat)
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
