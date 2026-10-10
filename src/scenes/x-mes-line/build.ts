import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import { canvasFont } from '../_host/fonts'
import { CORE, COLOR, LEGACY, LINE, PICK_X, PROTO_COLOR, ROLL, STACKER, STATIONS, SUB, type StationDef } from './data'

// 지오메트리/머티리얼 빌더. 런타임 상태 없음 — 핸들만 돌려준다.

export const hdr = (T: Three, hex: number, k: number) => new T.Color(hex).multiplyScalar(k)

/** three/examples 애드온 — runtime 이 동적 import 해서 넘긴다(코드스플릿 유지). */
export interface Addons {
  RoundedBox: typeof import('three/examples/jsm/geometries/RoundedBoxGeometry.js').RoundedBoxGeometry
  LineSegments2: typeof import('three/examples/jsm/lines/LineSegments2.js').LineSegments2
  LineSegmentsGeometry: typeof import('three/examples/jsm/lines/LineSegmentsGeometry.js').LineSegmentsGeometry
  LineMaterial: typeof import('three/examples/jsm/lines/LineMaterial.js').LineMaterial
  merge: typeof import('three/examples/jsm/utils/BufferGeometryUtils.js').mergeGeometries
  RoomEnvironment: typeof import('three/examples/jsm/environments/RoomEnvironment.js').RoomEnvironment
}

export async function loadAddons(): Promise<Addons> {
  const [rb, ls2, lsg, lm, bgu, re] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ])
  return {
    RoundedBox: rb.RoundedBoxGeometry,
    LineSegments2: ls2.LineSegments2,
    LineSegmentsGeometry: lsg.LineSegmentsGeometry,
    LineMaterial: lm.LineMaterial,
    merge: bgu.mergeGeometries,
    RoomEnvironment: re.RoomEnvironment,
  }
}

/** 빌드 컨텍스트 — 공유 머티리얼·텍스처·정적 지오메트리 수집기. */
export interface Kit {
  T: Three
  A: Addons
  scene: THREE.Scene
  mat: {
    paint: THREE.MeshStandardMaterial
    panel: THREE.MeshStandardMaterial
    chrome: THREE.MeshStandardMaterial
    steel: THREE.MeshStandardMaterial
    rubber: THREE.MeshStandardMaterial
    white: THREE.MeshPhysicalMaterial
    film: THREE.MeshPhysicalMaterial
    glass: THREE.MeshPhysicalMaterial
    wool: THREE.MeshStandardMaterial
    woolShell: THREE.MeshStandardMaterial
    retro: THREE.MeshStandardMaterial
  }
  tex: { glow: THREE.Texture; shadow: THREE.Texture }
  /** 정적 지오메트리를 머티리얼 키별로 모아 한 메시로 병합(드로콜 절감). */
  put(key: StaticKey, geo: THREE.BufferGeometry, x: number, y: number, z: number, rx?: number, ry?: number, rz?: number): void
  shadow(x: number, z: number, w: number, d: number, k?: number): void
  rbox(w: number, h: number, d: number, r: number, seg?: number): THREE.BufferGeometry
  /** 팻 라인 머티리얼 — resize 시 해상도 갱신 대상. */
  fat: THREE.Material[]
}
export type StaticKey = keyof Kit['mat'] | 'shadow'

export function radialTexture(T: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.3, 'rgba(255,255,255,0.42)')
  grd.addColorStop(0.65, 'rgba(255,255,255,0.08)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const tex = new T.CanvasTexture(c)
  tex.colorSpace = T.SRGBColorSpace
  return tex
}

/** 흐린 둥근 사각형 — 접지 그림자(늘려서 사용). */
function shadowTexture(T: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.filter = 'blur(14px)'
  g.fillStyle = 'rgba(255,255,255,1)'
  g.beginPath()
  g.roundRect(30, 30, 68, 68, 18)
  g.fill()
  const tex = new T.CanvasTexture(c)
  return tex
}

/** 글라스울 섬유 텍스처(맵 + 셸 알파). 결정적 난수. */
function woolTextures(T: Three) {
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const mk = (bg: string | null, n: number, light: boolean) => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    if (bg) {
      g.fillStyle = bg
      g.fillRect(0, 0, 256, 256)
    }
    g.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      const x = rnd() * 256
      const y = rnd() * 256
      const a = rnd() * Math.PI * 2
      const len = 18 + rnd() * 60
      const bend = (rnd() - 0.5) * 30
      const l = light ? 80 + rnd() * 20 : 55 + rnd() * 40
      g.strokeStyle = light ? `rgba(255,255,255,${0.25 + rnd() * 0.6})` : `hsla(${42 + rnd() * 8},${30 + rnd() * 25}%,${l}%,${0.25 + rnd() * 0.5})`
      g.lineWidth = 0.5 + rnd() * 1.1
      g.beginPath()
      g.moveTo(x, y)
      const ex = x + Math.cos(a) * len
      const ey = y + Math.sin(a) * len
      g.quadraticCurveTo((x + ex) / 2 + bend, (y + ey) / 2 - bend, ex, ey)
      g.stroke()
    }
    const t = new T.CanvasTexture(c)
    t.wrapS = t.wrapT = T.RepeatWrapping
    if (bg) t.colorSpace = T.SRGBColorSpace
    return t
  }
  const out = { map: mk('#cdbf98', 3200, false), alpha: mk('#000', 1400, true) }
  out.map.repeat.set(1.6, 1.6)
  out.alpha.repeat.set(2, 2)
  return out
}

export function makeKit(T: Three, A: Addons, scene: THREE.Scene): Kit {
  const wool = woolTextures(T)
  const mat: Kit['mat'] = {
    paint: new T.MeshStandardMaterial({ color: 0x1a2127, roughness: 0.42, metalness: 0.55 }),
    panel: new T.MeshStandardMaterial({ color: 0x3a454c, roughness: 0.36, metalness: 0.6 }),
    chrome: new T.MeshStandardMaterial({ color: 0xc4ccd2, roughness: 0.16, metalness: 1.0 }),
    steel: new T.MeshStandardMaterial({ color: 0x6c777e, roughness: 0.3, metalness: 0.9 }),
    rubber: new T.MeshStandardMaterial({ color: 0x0b0e10, roughness: 0.75, metalness: 0.1 }),
    white: new T.MeshPhysicalMaterial({ color: 0x8f989e, roughness: 0.4, metalness: 0.08, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    film: new T.MeshPhysicalMaterial({
      color: 0x86939a,
      roughness: 0.48,
      metalness: 0.5,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
    }),
    glass: new T.MeshPhysicalMaterial({
      color: 0x1a2b33,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      clearcoat: 1,
    }),
    wool: new T.MeshStandardMaterial({
      map: wool.map,
      bumpMap: wool.map,
      color: 0xd9c891,
      bumpScale: 1.6,
      roughness: 0.95,
      metalness: 0,
      emissive: new T.Color(0x0c0a05),
    }),
    woolShell: new T.MeshStandardMaterial({
      color: 0xd8c896,
      alphaMap: wool.alpha,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
      emissive: new T.Color(0x0e0c07),
    }),
    retro: new T.MeshStandardMaterial({ color: 0x45433d, roughness: 0.55, metalness: 0.25 }),
  }
  const parts = new Map<StaticKey, THREE.BufferGeometry[]>()
  const m4 = new T.Matrix4()
  const q = new T.Quaternion()
  const e = new T.Euler()
  const one = new T.Vector3(1, 1, 1)
  const p = new T.Vector3()
  let shadowN = 0
  const kit: Kit = {
    T,
    A,
    scene,
    mat,
    tex: { glow: radialTexture(T), shadow: shadowTexture(T) },
    fat: [],
    put(key, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone()
      m4.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one)
      g.applyMatrix4(m4)
      if (!parts.has(key)) parts.set(key, [])
      parts.get(key)!.push(g)
    },
    shadow(x, z, w, d, k = 1) {
      const g = new T.PlaneGeometry(w * 1.75, d * 1.75)
      const n = g.attributes.position.count
      const c = new Float32Array(n * 4)
      for (let i = 0; i < n; i++) c[i * 4 + 3] = k
      g.setAttribute('color', new T.BufferAttribute(c, 4))
      shadowN++
      kit.put('shadow', g, x, 0.004 + shadowN * 0.0003, z, -Math.PI / 2)
      g.dispose()
    },
    rbox: (w, h, d, r, seg = 3) => new A.RoundedBox(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)),
  }
  ;(kit as Kit & { flush: () => void }).flush = () => {
    for (const [key, list] of parts) {
      const merged = A.merge(list, false)
      for (const g of list) g.dispose()
      if (!merged) continue
      let material: THREE.Material
      if (key === 'shadow') {
        material = new T.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, alphaMap: kit.tex.shadow, transparent: true, opacity: 0.8, depthWrite: false })
      } else material = mat[key]
      const mesh = new T.Mesh(merged, material)
      if (key === 'shadow') mesh.renderOrder = -1
      scene.add(mesh)
    }
    parts.clear()
  }
  return kit
}
export const flushKit = (k: Kit) => (k as Kit & { flush: () => void }).flush()

/** 세로 그라디언트(아래 1 → 위 0) — 빔/콘. */
export function beamMaterial(T: Three, hex: number, k: number, opacity: number) {
  return new T.ShaderMaterial({
    uniforms: { uColor: { value: hdr(T, hex, k) }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){ float a = (0.12 + 0.88 * pow(1.0 - vUv.y, 1.6)) * uOpacity * smoothstep(0.0, 0.08, vUv.y); gl_FragColor = vec4(uColor * a, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  })
}

/** 프레넬 가장자리 발광(가산). uI = 세기. */
export function fresnelMaterial(T: Three, hex: number, power = 2.2) {
  return new T.ShaderMaterial({
    uniforms: { uColor: { value: new T.Color(hex) }, uI: { value: 0 }, uP: { value: power } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uI; uniform float uP; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uP); gl_FragColor = vec4(uColor * (0.06 + f) * uI, 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  })
}

/** 가산 팻 라인(px 폭). */
export function fatMat(k: Kit, hex: number, k2: number, width: number, opacity = 1) {
  const m = new k.A.LineMaterial({
    color: hdr(k.T, hex, k2).getHex(),
    linewidth: width,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: k.T.AdditiveBlending,
    worldUnits: false,
  })
  m.color.copy(hdr(k.T, hex, k2))
  k.fat.push(m)
  return m
}
export function fatSegments(k: Kit, pts: number[], m: THREE.Material) {
  const g = new k.A.LineSegmentsGeometry()
  g.setPositions(pts)
  const l = new k.A.LineSegments2(g, m as InstanceType<Addons['LineMaterial']>)
  l.frustumCulled = false
  return l
}

/* ───────────────────────── 환경 ───────────────────────── */

export function buildEnvironment(k: Kit) {
  const { T, scene } = k
  scene.fog = new T.FogExp2(0x04070a, 0.03)
  scene.add(new T.HemisphereLight(0x8fa9b8, 0x05070a, 0.35))
  const key = new T.DirectionalLight(0xdfe9f0, 0.95)
  key.position.set(5, 11, 9)
  const rim = new T.DirectionalLight(0x4ab3cc, 0.45)
  rim.position.set(-9, 4, -10)
  const fill = new T.DirectionalLight(0xffe2c4, 0.25)
  fill.position.set(10, 3, 4)
  scene.add(key, rim, fill)

  // 바닥 — 은은한 타일 라인(필터링되는 텍스처, 1px GL 그리드 대신).
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#0a0f12'
  g.fillRect(0, 0, 256, 256)
  g.strokeStyle = 'rgba(120,170,175,0.16)'
  g.lineWidth = 2
  g.strokeRect(0, 0, 256, 256)
  g.fillStyle = 'rgba(120,170,175,0.22)'
  for (const [x, y] of [
    [0, 0],
    [256, 0],
    [0, 256],
    [256, 256],
  ]) {
    g.fillRect(x - 6, y - 1, 12, 2)
    g.fillRect(x - 1, y - 6, 2, 12)
  }
  const ft = new T.CanvasTexture(c)
  ft.colorSpace = T.SRGBColorSpace
  ft.wrapS = ft.wrapT = T.RepeatWrapping
  ft.repeat.set(36, 36)
  ft.anisotropy = 8
  const floor = new T.Mesh(
    new T.PlaneGeometry(72, 72),
    new T.MeshStandardMaterial({ map: ft, color: 0xffffff, roughness: 0.62, metalness: 0.35, envMapIntensity: 0.5 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, -4)
  scene.add(floor)

  // 바닥 광륜(코어 아래).
  const poolMat = new T.MeshBasicMaterial({
    map: k.tex.glow,
    color: hdr(T, COLOR.teal, 0.4),
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
  })
  const pool = new T.Mesh(new T.PlaneGeometry(10, 10), poolMat)
  pool.rotation.x = -Math.PI / 2
  pool.position.set(CORE.x, 0.012, CORE.z)
  scene.add(pool)

  // 부유 먼지 — 둥근 소프트 스프라이트.
  const N = 380
  const pos = new Float32Array(N * 3)
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rnd() - 0.5) * 30
    pos[i * 3 + 1] = rnd() * 8
    pos[i * 3 + 2] = (rnd() - 0.5) * 22 - 3
  }
  const dg = new T.BufferGeometry()
  dg.setAttribute('position', new T.BufferAttribute(pos, 3))
  const dust = new T.Points(
    dg,
    new T.PointsMaterial({
      size: 0.06,
      map: k.tex.glow,
      color: hdr(T, COLOR.phos, 0.7),
      transparent: true,
      opacity: 0.45,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(dust)
  return { poolMat, dust }
}

/* ───────────────────────── 파우치 ───────────────────────── */

/**
 * 파우치 — 스퀘어클 외곽 + 가장자리가 얇아지는 필로우 단면(실링 플랜지).
 * 단위 높이 1(y ±0.5) — 인스턴스 scale.y 로 두께를 정한다.
 */
export function pouchGeometry(T: Three, w: number, d: number) {
  const g = new T.BoxGeometry(1, 1, 1, 26, 1, 18)
  const pos = g.attributes.position as THREE.BufferAttribute
  const n = 8
  for (let i = 0; i < pos.count; i++) {
    let u = pos.getX(i) * 2
    let v = pos.getZ(i) * 2
    const y = pos.getY(i)
    const au = Math.abs(u)
    const av = Math.abs(v)
    const m = Math.max(au, av)
    const r = Math.pow(Math.pow(au, n) + Math.pow(av, n), 1 / n)
    if (m > 1e-6) {
      u *= m / r
      v *= m / r
    }
    const prof = Math.sqrt(Math.max(0, 1 - Math.pow(Math.min(1, m * 1.03), 5)))
    const th = 0.06 + 0.94 * prof
    pos.setXYZ(i, (u * w) / 2, Math.sign(y) * 0.5 * th, (v * d) / 2)
  }
  g.computeVertexNormals()
  return g
}

/** 둥근 사각 외곽 링(실링 라인) — XZ 평면. */
function sealRingGeometry(T: Three, w: number, d: number, inset: number, r: number) {
  const rr = (s: THREE.Shape | THREE.Path, hw: number, hd: number, rad: number) => {
    s.moveTo(-hw + rad, -hd)
    s.lineTo(hw - rad, -hd)
    s.quadraticCurveTo(hw, -hd, hw, -hd + rad)
    s.lineTo(hw, hd - rad)
    s.quadraticCurveTo(hw, hd, hw - rad, hd)
    s.lineTo(-hw + rad, hd)
    s.quadraticCurveTo(-hw, hd, -hw, hd - rad)
    s.lineTo(-hw, -hd + rad)
    s.quadraticCurveTo(-hw, -hd, -hw + rad, -hd)
  }
  const sh = new T.Shape()
  rr(sh, w / 2, d / 2, r)
  const hole = new T.Path()
  rr(hole, w / 2 - inset, d / 2 - inset, Math.max(0.01, r - inset))
  sh.holes.push(hole)
  const g = new T.ShapeGeometry(sh, 6)
  g.rotateX(-Math.PI / 2)
  return g
}

function barcodeTexture(T: Three) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 48
  const g = c.getContext('2d')!
  g.fillStyle = '#e9eef0'
  g.beginPath()
  g.roundRect(0, 0, 128, 48, 6)
  g.fill()
  g.fillStyle = '#11171b'
  let x = 10
  let s = 3
  while (x < 118) {
    s = (s * 7 + 3) % 11
    const w = 1 + (s % 3)
    g.fillRect(x, 8, w, 26)
    x += w + 1 + (s % 2)
  }
  g.fillRect(10, 38, 60, 3)
  const t = new T.CanvasTexture(c)
  t.colorSpace = T.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** 글라스울 배트 — 둥근 박스에 저주파 노이즈 변위(뭉실한 실루엣). 위치 기반이라 이음새가 벌어지지 않는다. */
export function woolGeometry(k: Kit, w: number, h: number, d: number, amp: number, seed = 0) {
  const g = k.rbox(w, h, d, Math.min(h / 2 - 0.004, 0.05), 4)
  const pos = g.attributes.position as THREE.BufferAttribute
  const nrm = g.attributes.normal as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const n =
      Math.sin(x * 23 + seed) * Math.sin(z * 19 + 1.3 * seed) * 0.6 +
      Math.sin(x * 47 + z * 31 + seed * 2.1) * 0.3 +
      Math.sin(y * 60 + x * 13) * 0.25
    const a = amp * (0.4 + n)
    pos.setXYZ(i, x + nrm.getX(i) * a, y + nrm.getY(i) * a * 0.6, z + nrm.getZ(i) * a)
  }
  g.computeVertexNormals()
  return g
}

export function buildPouches(k: Kit) {
  const { T, scene, mat } = k
  const n = LINE.count
  const geo = pouchGeometry(T, LINE.pw, LINE.pd)
  const pouches = new T.InstancedMesh(geo, mat.film, n)
  const rims = new T.InstancedMesh(
    sealRingGeometry(T, LINE.pw + 0.012, LINE.pd + 0.012, 0.05, 0.07),
    new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
    n,
  )
  const woolGeo = woolGeometry(k, 0.5, 0.1, 0.34, 0.008)
  const batts = new T.InstancedMesh(woolGeo, mat.wool, n)
  const shells = new T.InstancedMesh(woolGeometry(k, 0.53, 0.12, 0.37, 0.018, 2), mat.woolShell, n)
  const tags = new T.InstancedMesh(
    new T.PlaneGeometry(0.2, 0.075).rotateX(-Math.PI / 2),
    new T.MeshStandardMaterial({ map: barcodeTexture(T), roughness: 0.5, metalness: 0 }),
    n,
  )
  const black = new T.Color(0)
  for (let i = 0; i < n; i++) rims.setColorAt(i, black)
  for (const m of [pouches, rims, batts, shells, tags]) {
    m.instanceMatrix.setUsage(T.DynamicDrawUsage)
    m.frustumCulled = false
    scene.add(m)
  }
  shells.renderOrder = 2
  return { pouches, rims, batts, shells, tags, geo, woolGeo }
}

/* ───────────────────────── 컨베이어 + 언와인더 ───────────────────────── */

export function buildLine(k: Kit) {
  const { T, scene, mat } = k
  const xa = ROLL.x + 0.35
  const xb = PICK_X + 0.55
  const L = xb - xa
  const xm = (xa + xb) / 2
  // 섀시(둥근 판넬) + 사이드 레일 + 다리.
  k.put('paint', k.rbox(L, 0.3, 0.86, 0.06), xm, 0.4, 0)
  for (const z of [-0.5, 0.5]) {
    k.put('panel', k.rbox(L + 0.04, 0.17, 0.08, 0.035), xm, LINE.topY - 0.04, z)
    k.put('steel', new T.CylinderGeometry(0.012, 0.012, L, 8).rotateZ(Math.PI / 2), xm, LINE.topY + 0.05, z * 1.02)
  }
  const nLeg = 10
  for (let i = 0; i < nLeg; i++) {
    const x = xa + 0.25 + ((L - 0.5) * i) / (nLeg - 1)
    for (const z of [-0.36, 0.36]) {
      k.put('steel', k.rbox(0.08, 0.26, 0.08, 0.025), x, 0.13, z)
      k.put('rubber', new T.CylinderGeometry(0.07, 0.08, 0.03, 16), x, 0.015, z)
    }
  }
  k.shadow(xm, 0, L + 0.2, 1.05, 1)

  // 롤러(정적 — 둥근 크롬).
  const pitch = 0.2
  const nR = Math.floor((L - 0.2) / pitch)
  const rollers = new T.InstancedMesh(new T.CylinderGeometry(0.052, 0.052, 0.9, 20, 1).rotateX(Math.PI / 2), mat.chrome, nR)
  const d = new T.Object3D()
  for (let i = 0; i < nR; i++) {
    d.position.set(xa + 0.1 + i * pitch + pitch / 2, LINE.topY - 0.052, 0)
    d.updateMatrix()
    rollers.setMatrixAt(i, d.matrix)
  }
  scene.add(rollers)

  // 레일 발광 라인(가동 시 켜짐).
  const railMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.1), toneMapped: false })
  for (const z of [-0.545, 0.545]) {
    const r = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, L, 6).rotateZ(Math.PI / 2), railMat)
    r.position.set(xm, LINE.topY - 0.06, z)
    scene.add(r)
  }

  // 언와인더 — 필름 롤 + 사이드 플레이트.
  const roll = new T.Group()
  roll.position.set(ROLL.x, ROLL.y, 0)
  const body = new T.Mesh(new T.CylinderGeometry(ROLL.r, ROLL.r, LINE.pd + 0.02, 64, 1).rotateX(Math.PI / 2), mat.film)
  roll.add(body)
  // 측면 — 감긴 층(동심원 텍스처).
  const rc = document.createElement('canvas')
  rc.width = rc.height = 256
  const rg = rc.getContext('2d')!
  rg.fillStyle = '#9aa6ad'
  rg.fillRect(0, 0, 256, 256)
  for (let r = 30; r < 128; r += 1.6) {
    rg.strokeStyle = `rgba(${r % 5 < 2 ? '40,52,58' : '220,230,235'},${0.18 + ((r * 13) % 7) / 30})`
    rg.lineWidth = 0.8
    rg.beginPath()
    rg.arc(128, 128, r, 0, Math.PI * 2)
    rg.stroke()
  }
  const rt = new T.CanvasTexture(rc)
  rt.colorSpace = T.SRGBColorSpace
  const sideMat = new T.MeshStandardMaterial({ map: rt, roughness: 0.35, metalness: 0.6 })
  for (const z of [-1, 1]) {
    const side = new T.Mesh(new T.CircleGeometry(ROLL.r - 0.002, 64), sideMat)
    side.position.z = z * (LINE.pd / 2 + 0.011)
    if (z < 0) side.rotation.y = Math.PI
    roll.add(side)
  }
  const hub = new T.Group()
  const hubGeo = new T.CylinderGeometry(0.15, 0.15, LINE.pd + 0.14, 32).rotateX(Math.PI / 2)
  hub.add(new T.Mesh(hubGeo, mat.steel))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const bolt = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, LINE.pd + 0.18, 10).rotateX(Math.PI / 2), mat.chrome)
    bolt.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0)
    hub.add(bolt)
  }
  roll.add(hub)
  scene.add(roll)
  for (const z of [-1, 1]) {
    k.put('panel', k.rbox(0.9, 1.22, 0.06, 0.03), ROLL.x, 0.61, z * 0.42)
  }
  k.put('steel', new T.CylinderGeometry(0.04, 0.04, 0.98, 16).rotateX(Math.PI / 2), ROLL.x, ROLL.y, 0)
  k.put('paint', k.rbox(1.0, 0.1, 1.0, 0.04), ROLL.x, 0.05, 0)
  k.shadow(ROLL.x, 0, 1.1, 1.1, 1)

  // 필름 웹 — 롤 하단 → 재단기. 정합 마크가 이송과 함께 흐른다.
  const wc = document.createElement('canvas')
  wc.width = 128
  wc.height = 64
  const wg = wc.getContext('2d')!
  const grd = wg.createLinearGradient(0, 0, 0, 64)
  grd.addColorStop(0, '#8e9aa1')
  grd.addColorStop(0.5, '#c9d2d7')
  grd.addColorStop(1, '#8e9aa1')
  wg.fillStyle = grd
  wg.fillRect(0, 0, 128, 64)
  wg.fillStyle = 'rgba(20,30,36,0.85)'
  wg.fillRect(4, 4, 6, 6)
  wg.fillRect(4, 54, 6, 6)
  wg.fillStyle = 'rgba(255,255,255,0.25)'
  wg.fillRect(0, 0, 1, 64)
  const wt = new T.CanvasTexture(wc)
  wt.colorSpace = T.SRGBColorSpace
  wt.wrapS = T.RepeatWrapping
  const webX0 = ROLL.x
  const webX1 = LINE.x0 - LINE.pw / 2 - 0.06
  const webLen = webX1 - webX0
  wt.repeat.set(webLen / LINE.pitch, 1)
  const web = new T.Mesh(
    new T.PlaneGeometry(webLen, LINE.pd).rotateX(-Math.PI / 2),
    new T.MeshStandardMaterial({ map: wt, roughness: 0.72, metalness: 0.3 }),
  )
  web.position.set((webX0 + webX1) / 2, LINE.topY + 0.006, 0)
  scene.add(web)

  return { rollers, railMat, roll, webTex: wt }
}

/* ───────────────────────── 스테이션 ───────────────────────── */

export interface StationHandle {
  def: StationDef
  strip: THREE.MeshBasicMaterial
  /** 바닥 광륜 인스턴스 인덱스 */
  glowIdx: number
  beamMat?: THREE.ShaderMaterial
  light?: THREE.PointLight
  parts: Record<string, THREE.Object3D>
  mats: Record<string, THREE.Material>
}

/** 문형 프레임(포스트 2 + 상부 빔) + 발광 스트립. */
function portal(k: Kit, x: number, z0: number, z1: number, top: number, strip: THREE.MeshBasicMaterial) {
  const { T, scene } = k
  for (const z of [z0, z1]) {
    k.put('paint', k.rbox(0.13, top, 0.13, 0.04), x, top / 2, z)
    k.put('rubber', k.rbox(0.24, 0.04, 0.24, 0.015), x, 0.02, z)
  }
  const span = z1 - z0 + 0.13
  k.put('panel', k.rbox(0.3, 0.18, span, 0.05), x, top, (z0 + z1) / 2)
  const sg = new T.BoxGeometry(0.012, 0.012, span - 0.12)
  const s = new T.Mesh(sg, strip)
  s.position.set(x + 0.152, top - 0.04, (z0 + z1) / 2)
  scene.add(s)
  for (const z of [z0, z1]) {
    const v = new T.Mesh(new T.BoxGeometry(0.01, top - 0.5, 0.01), strip)
    v.position.set(x + 0.07, top / 2, z)
    scene.add(v)
  }
}

export function buildStations(k: Kit) {
  const { T, scene, mat } = k
  const glows = new T.InstancedMesh(
    new T.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ map: k.tex.glow, transparent: true, blending: T.AdditiveBlending, depthWrite: false }),
    STATIONS.length + 1,
  )
  glows.frustumCulled = false
  const d = new T.Object3D()
  const black = new T.Color(0)

  const handles = STATIONS.map((def, idx) => {
    const color = PROTO_COLOR[def.proto]
    const strip = new T.MeshBasicMaterial({ color: hdr(T, color, 0.2), toneMapped: false })
    const h: StationHandle = { def, strip, glowIdx: idx, parts: {}, mats: {} }
    d.position.set(def.id === 'stack' ? STACKER.palletX - 0.3 : def.x, 0.014, def.id === 'stack' ? -0.3 : 0)
    d.updateMatrix()
    glows.setMatrixAt(idx, d.matrix)
    glows.setColorAt(idx, black)

    if (def.id === 'cut') {
      // 비전 정렬 카메라(웹 위) + 재단 블레이드 하우징.
      portal(k, SUB.align, -0.62, 0.62, 1.95, strip)
      k.put('panel', k.rbox(0.28, 0.3, 0.26, 0.05), SUB.align, 1.72, 0)
      k.put('rubber', new T.CylinderGeometry(0.075, 0.085, 0.14, 24), SUB.align, 1.52, 0)
      const lens = new T.Mesh(new T.CircleGeometry(0.06, 24).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: hdr(T, COLOR.blue, 2.2), toneMapped: false }))
      lens.position.set(SUB.align, 1.444, 0)
      scene.add(lens)
      const bm = beamMaterial(T, COLOR.blue, 1.6, 0)
      const cone = new T.Mesh(new T.ConeGeometry(0.34, 0.74, 48, 1, true), bm)
      cone.position.set(SUB.align, 1.07, 0)
      scene.add(cone)
      h.beamMat = bm
      const cx = def.x
      // 하우징 — 상부 박스 + 측면 가드.
      k.put('paint', k.rbox(0.52, 0.5, 1.4, 0.07), cx, 1.75, 0)
      for (const z of [-0.64, 0.64]) k.put('paint', k.rbox(0.42, 1.25, 0.12, 0.04), cx, 0.95, z)
      k.put('glass', k.rbox(0.44, 0.7, 0.02, 0.01), cx, 1.08, 0.71)
      const blade = new T.Group()
      const bl = new T.Mesh(k.rbox(0.05, 0.36, 1.08, 0.012), mat.chrome)
      blade.add(bl)
      const edge = new T.Mesh(new T.BoxGeometry(0.008, 0.008, 1.0), strip)
      edge.position.y = -0.18
      blade.add(edge)
      blade.position.set(cx, 1.2, 0)
      scene.add(blade)
      h.parts.blade = blade
      k.shadow(cx, 0, 0.8, 1.6, 0.9)
    } else if (def.id === 'wool') {
      // 갠트리(z 방향) + 진공 그리퍼 + 글라스울 매거진.
      const z0 = -1.55
      const z1 = 0.72
      portal(k, def.x - 0.42, z0, z1, 2.2, strip)
      portal(k, def.x + 0.42, z0, z1, 2.2, strip)
      k.put('panel', k.rbox(0.96, 0.1, 0.26, 0.04), def.x, 2.2, z0)
      k.put('panel', k.rbox(0.96, 0.1, 0.26, 0.04), def.x, 2.2, z1)
      // 매거진 — 테이블 + 쌓인 배트 + 가이드 포스트.
      k.put('paint', k.rbox(0.82, 0.62, 0.66, 0.05), def.x, 0.39, -1.05)
      for (let i = 0; i < 4; i++) {
        k.put('wool', woolGeometry(k, 0.5, 0.1, 0.34, 0.008, i), def.x + (i % 2) * 0.012 - 0.006, 0.755 + i * 0.106, -1.05 + ((i * 7) % 3) * 0.006)
      }
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        k.put('chrome', new T.CylinderGeometry(0.012, 0.012, 0.62, 8), def.x + sx * 0.3, 1.0, -1.05 + sz * 0.21)
      k.shadow(def.x, -0.4, 1.3, 2.6, 0.85)
      const grip = new T.Group()
      const carriage = new T.Mesh(k.rbox(1.0, 0.16, 0.26, 0.05), mat.white)
      carriage.position.y = 0
      grip.add(carriage)
      const rod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 16), mat.chrome)
      grip.add(rod)
      const pad = new T.Mesh(k.rbox(0.54, 0.035, 0.38, 0.015), mat.paint)
      grip.add(pad)
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const cup = new T.Mesh(new T.CylinderGeometry(0.03, 0.022, 0.03, 12), mat.rubber)
        cup.position.set(sx * 0.18, -0.03, sz * 0.12)
        pad.add(cup)
      }
      const held = new T.Mesh(woolGeometry(k, 0.5, 0.1, 0.34, 0.008, 5), mat.wool)
      const heldShell = new T.Mesh(woolGeometry(k, 0.53, 0.12, 0.37, 0.018, 7), mat.woolShell)
      heldShell.renderOrder = 2
      held.add(heldShell)
      scene.add(grip, held)
      Object.assign(h.parts, { grip, carriage, rod, pad, held })
    } else if (def.id === 'seal') {
      // 주입 노즐(SUB.inject) + 히트 실 바(SUB.seal) — 하나의 프레임.
      const xa = SUB.inject - 0.38
      const xb = SUB.seal + 0.38
      for (const x of [xa, xb]) portal(k, x, -0.72, 0.72, 2.05, strip)
      for (const z of [-0.72, 0.72]) k.put('panel', k.rbox(xb - xa, 0.14, 0.14, 0.05), (xa + xb) / 2, 2.05, z)
      k.put('panel', k.rbox(0.2, 0.14, 1.5, 0.05), SUB.inject, 2.05, 0)
      k.put('panel', k.rbox(0.26, 0.14, 1.5, 0.05), SUB.seal, 2.05, 0)
      // 노즐 — 실린더 + 테이퍼 팁.
      const noz = new T.Group()
      const body = new T.Mesh(k.rbox(0.18, 0.4, 0.18, 0.05), mat.white)
      noz.add(body)
      const tube = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.42, 16), mat.chrome)
      tube.position.y = -0.4
      noz.add(tube)
      const tip = new T.Mesh(new T.ConeGeometry(0.03, 0.08, 16).rotateX(Math.PI), mat.chrome)
      tip.position.y = -0.65
      noz.add(tip)
      const dropMat = new T.SpriteMaterial({ map: k.tex.glow, color: hdr(T, COLOR.phos, 1.4), transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 })
      const drop = new T.Sprite(dropMat)
      drop.scale.setScalar(0.22)
      drop.position.y = -0.7
      noz.add(drop)
      noz.position.set(SUB.inject, 1.55, 0.2)
      scene.add(noz)
      // 실 바 — 상부 조(가동) + 하부 앤빌(정적).
      const jaw = new T.Group()
      const jb = new T.Mesh(k.rbox(0.22, 0.2, 0.7, 0.05), mat.panel)
      jaw.add(jb)
      const heatMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.heat, 0.15), toneMapped: false })
      const heat = new T.Mesh(k.rbox(0.07, 0.03, 0.62, 0.012), heatMat)
      heat.position.y = -0.105
      jaw.add(heat)
      const ram = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.6, 16), mat.chrome)
      ram.position.y = 0.38
      jaw.add(ram)
      jaw.position.set(SUB.seal, 1.25, 0)
      scene.add(jaw)
      k.put('steel', k.rbox(0.12, 0.04, 0.62, 0.015), SUB.seal, LINE.topY - 0.02, 0)
      const light = new T.PointLight(COLOR.heat, 0, 3.2, 1.8)
      light.position.set(SUB.seal, 0.95, 0.5)
      scene.add(light)
      h.light = light
      Object.assign(h.parts, { noz, jaw })
      Object.assign(h.mats, { heat: heatMat, drop: dropMat })
      k.shadow((xa + xb) / 2, 0, xb - xa + 0.3, 1.6, 0.8)
    } else if (def.id === 'gauge') {
      // 치수 프레임(라이트 커튼) + 로드셀 + 리드아웃.
      const x = def.x
      const fy0 = LINE.topY + 0.02
      const fy1 = 1.36
      for (const z of [-0.62, 0.62]) k.put('panel', k.rbox(0.12, fy1 - 0.1, 0.1, 0.035), x, (fy1 + 0.1) / 2, z)
      k.put('panel', k.rbox(0.12, 0.1, 1.34, 0.035), x, fy1 + 0.05, 0)
      // 로드셀 블록(롤러 아래) + 크롬 계량판.
      k.put('chrome', k.rbox(0.62, 0.025, 0.66, 0.01), x, LINE.topY - 0.115, 0)
      k.put('steel', k.rbox(0.22, 0.12, 0.22, 0.03), x, LINE.topY - 0.2, 0)
      const pts: number[] = []
      for (let i = 0; i < 5; i++) {
        const y = fy0 + 0.04 + i * 0.13
        pts.push(x, y, -0.56, x, y, 0.56)
      }
      for (let i = 0; i < 7; i++) {
        const z = -0.45 + i * 0.15
        pts.push(x, fy1 - 0.02, z, x, fy0 + 0.02, z)
      }
      const curtainMat = fatMat(k, COLOR.teal, 1.6, 1.2, 0.0)
      scene.add(fatSegments(k, pts, curtainMat))
      h.mats.curtain = curtainMat
      // 리드아웃 디스플레이(라틴 문자만 — 수치 없음).
      const c = document.createElement('canvas')
      c.width = 256
      c.height = 128
      const g = c.getContext('2d')!
      g.fillStyle = '#061014'
      g.fillRect(0, 0, 256, 128)
      g.font = canvasFont(600, 15, 'mono')
      g.fillStyle = 'rgba(79,224,196,0.75)'
      g.fillText('LOAD CELL', 16, 28)
      g.fillStyle = 'rgba(215,215,215,0.45)'
      g.fillText('DIM · W', 160, 28)
      g.strokeStyle = 'rgba(79,224,196,0.35)'
      g.strokeRect(16, 52, 224, 22)
      g.font = canvasFont(700, 20, 'mono')
      g.fillStyle = 'rgba(79,224,196,0.95)'
      g.fillText('OK', 16, 112)
      g.fillStyle = 'rgba(215,215,215,0.3)'
      g.fillRect(64, 98, 172, 2)
      const dt = new T.CanvasTexture(c)
      dt.colorSpace = T.SRGBColorSpace
      dt.anisotropy = 4
      const disp = new T.Group()
      const bezel = new T.Mesh(k.rbox(0.62, 0.36, 0.06, 0.03), mat.paint)
      disp.add(bezel)
      const scr = new T.Mesh(new T.PlaneGeometry(0.56, 0.28), new T.MeshBasicMaterial({ map: dt, toneMapped: false, color: hdr(T, 0xffffff, 0.0) }))
      scr.position.z = 0.032
      disp.add(scr)
      const bar = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 1.8), toneMapped: false }))
      bar.position.set(-0.24, 0.03, 0.034)
      disp.add(bar)
      disp.position.set(x + 0.5, 1.08, 0.72)
      disp.rotation.y = -0.25
      scene.add(disp)
      k.put('steel', new T.CylinderGeometry(0.018, 0.018, 0.5, 8), x + 0.5, 0.8, 0.68)
      Object.assign(h.parts, { bar })
      h.mats.screen = scr.material as THREE.MeshBasicMaterial
      k.shadow(x, 0, 0.6, 1.5, 0.6)
    } else if (def.id === 'vision') {
      // 비전 검사 후드 — 상부 하우징 + 유리 스커트 + 내부 링 조명 + 상부 카메라.
      const x = def.x
      k.put('white', k.rbox(1.3, 0.5, 1.46, 0.12, 4), x, 1.86, 0)
      for (const z of [-0.69, 0.69]) {
        k.put('glass', k.rbox(1.18, 0.98, 0.03, 0.012), x, 1.12, z)
        k.put('paint', k.rbox(1.24, 0.06, 0.08, 0.02), x, 0.64, z)
      }
      for (const sx of [-0.62, 0.62]) for (const z of [-0.69, 0.69]) k.put('paint', k.rbox(0.06, 1.2, 0.06, 0.02), x + sx, 1.1, z)
      k.put('paint', new T.CylinderGeometry(0.13, 0.13, 0.26, 32), x, 2.24, 0)
      k.put('rubber', new T.CylinderGeometry(0.1, 0.1, 0.06, 32), x, 2.4, 0)
      const ringMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.blue, 0.2), toneMapped: false })
      const ringGeo = sealRingGeometry(T, 1.08, 1.2, 0.05, 0.12)
      ringGeo.rotateX(Math.PI)
      const ring = new T.Mesh(ringGeo, ringMat)
      ring.position.set(x, 1.6, 0)
      scene.add(ring)
      h.mats.ring = ringMat
      const bm = beamMaterial(T, COLOR.blue, 1.5, 0)
      const cone = new T.Mesh(new T.CylinderGeometry(0.36, 0.56, 0.88, 4, 1, true).rotateY(Math.PI / 4), bm)
      cone.scale.set(1, 1, 0.72)
      cone.position.set(x, 1.15, 0)
      scene.add(cone)
      h.beamMat = bm
      const light = new T.PointLight(COLOR.blue, 0, 3.2, 1.6)
      light.position.set(x, 1.3, 0.2)
      scene.add(light)
      h.light = light
      k.shadow(x, 0, 1.4, 1.6, 0.9)
    } else if (def.id === 'stack') {
      // 스트립만 — 로봇/팔레트는 buildStacker.
      const s = new T.Mesh(new T.BoxGeometry(0.012, 0.012, 0.5), strip)
      s.position.set(STACKER.baseX + 0.26, 0.2, STACKER.baseZ)
      scene.add(s)
    }
    return h
  })
  // 구형 검사 장비 광륜.
  d.position.set(LEGACY.x, 0.014, LEGACY.z)
  d.updateMatrix()
  glows.setMatrixAt(STATIONS.length, d.matrix)
  glows.setColorAt(STATIONS.length, black)
  scene.add(glows)
  return { handles, glows }
}

/* ───────────────────────── 적재 로봇 + 팔레트 ───────────────────────── */

export const ARM = { l1: 0.95, l2: 0.9, y1: 1.62, y2: 1.46 }

export function buildStacker(k: Kit, pouchGeo: THREE.BufferGeometry) {
  const { T, scene, mat } = k
  const bx = STACKER.baseX
  const bz = STACKER.baseZ
  // 베이스 + 컬럼.
  k.put('paint', k.rbox(0.62, 0.14, 0.62, 0.05), bx, 0.07, bz)
  const prof: THREE.Vector2[] = [
    new T.Vector2(0, 0.14),
    new T.Vector2(0.21, 0.14),
    new T.Vector2(0.21, 0.2),
    new T.Vector2(0.17, 0.26),
    new T.Vector2(0.16, ARM.y1 - 0.12),
    new T.Vector2(0.2, ARM.y1 - 0.08),
    new T.Vector2(0, ARM.y1 - 0.08),
  ]
  k.put('white', new T.LatheGeometry(prof, 40), bx, 0, bz)
  k.shadow(bx, bz, 0.7, 0.7, 1)
  const strip = new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 1.2), toneMapped: false })

  const link1 = new T.Group()
  link1.position.set(bx, ARM.y1, bz)
  const l1 = new T.Mesh(k.rbox(ARM.l1 + 0.36, 0.18, 0.34, 0.08, 4), mat.white)
  l1.position.x = ARM.l1 / 2
  link1.add(l1)
  const s1 = new T.Mesh(new T.BoxGeometry(ARM.l1 - 0.2, 0.012, 0.012), strip)
  s1.position.set(ARM.l1 / 2, 0.02, 0.172)
  link1.add(s1)
  const link2 = new T.Group()
  link2.position.set(ARM.l1, ARM.y2 - ARM.y1, 0)
  const l2 = new T.Mesh(k.rbox(ARM.l2 + 0.3, 0.14, 0.26, 0.065, 4), mat.white)
  l2.position.x = ARM.l2 / 2
  link2.add(l2)
  const j2 = new T.Mesh(new T.CylinderGeometry(0.15, 0.15, 0.1, 32), mat.paint)
  j2.position.y = 0.1
  link2.add(j2)
  link1.add(link2)
  // 퀼(상하축) + 진공 플레이트.
  const quill = new T.Group()
  quill.position.set(ARM.l2, 0, 0)
  const rod = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.2, 16), mat.chrome)
  quill.add(rod)
  const plate = new T.Mesh(k.rbox(0.56, 0.04, 0.4, 0.015), mat.paint)
  quill.add(plate)
  link2.add(quill)
  const carried = new T.Mesh(pouchGeo, mat.film)
  carried.scale.set(1, LINE.ph, 1)
  scene.add(link1, carried)

  // 팔레트(2개 — 교체 연출) + 적재 파우치.
  const pg: THREE.BufferGeometry[] = []
  const add = (g: THREE.BufferGeometry, x: number, y: number, z: number) => {
    g.translate(x, y, z)
    pg.push(g)
  }
  for (let i = 0; i < 5; i++) add(k.rbox(1.0, 0.03, 0.14, 0.012), 0, 0.145, -0.34 + i * 0.17)
  for (const z of [-0.34, 0, 0.34]) add(k.rbox(1.0, 0.1, 0.1, 0.02), 0, 0.08, z)
  for (let i = 0; i < 3; i++) add(k.rbox(0.12, 0.025, 0.86, 0.01), -0.42 + i * 0.42, 0.015, 0)
  const palletGeo = k.A.merge(pg, false)!
  for (const g of pg) g.dispose()
  const pallets = new T.InstancedMesh(palletGeo, new T.MeshStandardMaterial({ color: 0x2b2722, roughness: 0.7, metalness: 0.1 }), 2)
  pallets.instanceMatrix.setUsage(T.DynamicDrawUsage)
  pallets.frustumCulled = false
  const stack = new T.InstancedMesh(pouchGeo, mat.film, 48)
  stack.instanceMatrix.setUsage(T.DynamicDrawUsage)
  stack.frustumCulled = false
  // 팔레트 그림자(이동) — 2개.
  const shMat = new T.MeshBasicMaterial({ color: 0, alphaMap: k.tex.shadow, transparent: true, opacity: 0.8, depthWrite: false })
  const shadows = [0, 1].map(() => {
    const m = new T.Mesh(new T.PlaneGeometry(1.9, 1.6).rotateX(-Math.PI / 2), shMat)
    m.renderOrder = -1
    scene.add(m)
    return m
  })
  // 팔레트 컨베이어(정적).
  k.put('paint', k.rbox(1.3, 0.06, 1.1, 0.03), STACKER.palletX, 0.03, STACKER.palletZ)
  scene.add(pallets, stack)
  return { link1, link2, quill, rod, plate, carried, pallets, stack, shadows }
}

/** 구형 검사 장비 — 라인 밖 별도 캐비닛(앰버 화면). */
export function buildLegacy(k: Kit) {
  const { T, scene } = k
  const x = LEGACY.x
  const z = LEGACY.z
  k.put('retro', k.rbox(1.0, 1.3, 0.7, 0.05), x, 0.65, z)
  k.put('retro', k.rbox(1.06, 0.06, 0.76, 0.02), x, 1.33, z)
  k.put('rubber', k.rbox(0.5, 0.36, 0.04, 0.02), x - 0.12, 1.0, z + 0.36)
  for (let i = 0; i < 3; i++) k.put('steel', k.rbox(0.7, 0.012, 0.01, 0.004), x, 0.3 + i * 0.07, z + 0.355)
  k.shadow(x, z, 1.1, 0.8, 1)
  const scrMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.amber, 0.15), toneMapped: false })
  const scr = new T.Mesh(new T.PlaneGeometry(0.42, 0.28), scrMat)
  scr.position.set(x - 0.12, 1.0, z + 0.383)
  scene.add(scr)
  const led = new T.Mesh(new T.CircleGeometry(0.025, 16), scrMat)
  led.position.set(x + 0.32, 1.1, z + 0.352)
  scene.add(led)
  return { scrMat }
}

/* ───────────────────────── 데이터 경로 ───────────────────────── */

export interface PathHandle {
  color: number
  curve: THREE.CubicBezierCurve3
  core: THREE.Mesh
  glow: THREE.Mesh
  indexCount: number
}

export function buildPaths(k: Kit, list: { from: readonly [number, number, number]; entryY: number; color: number }[]): PathHandle[] {
  const { T, scene } = k
  return list.map(({ from, entryY, color }) => {
    const [fx, fy, fz] = from
    const ex = CORE.x + (fx - CORE.x) * 0.1
    const curve = new T.CubicBezierCurve3(
      new T.Vector3(fx, fy, fz),
      new T.Vector3(fx, fy + 1.7, fz - 0.6),
      new T.Vector3(CORE.x + (fx - CORE.x) * 0.5, entryY + 1.6, CORE.z + 3.4),
      new T.Vector3(ex, entryY + CORE.y, CORE.z + 1.12),
    )
    const coreMat = new T.MeshBasicMaterial({ color: hdr(T, color, 1.5), transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false })
    const glowMat = new T.MeshBasicMaterial({ color: hdr(T, color, 0.45), transparent: true, opacity: 0.18, blending: T.AdditiveBlending, depthWrite: false })
    const tg = new T.TubeGeometry(curve, 140, 0.011, 6, false)
    const gg = new T.TubeGeometry(curve, 140, 0.05, 8, false)
    const core = new T.Mesh(tg, coreMat)
    const glow = new T.Mesh(gg, glowMat)
    core.geometry.setDrawRange(0, 0)
    glow.geometry.setDrawRange(0, 0)
    scene.add(core, glow)
    return { color, curve, core, glow, indexCount: tg.index!.count }
  })
}

/* ───────────────────────── PostgreSQL 코어 ───────────────────────── */

export function buildCore(k: Kit) {
  const { T, scene } = k
  const g = new T.Group()
  g.position.set(CORE.x, CORE.y, CORE.z)
  // 베벨 디스크(래이스 프로파일) — 유리질.
  const R = 1.05
  const H = 0.48
  const b = 0.06
  const prof = [
    new T.Vector2(0, -H / 2),
    new T.Vector2(R - b, -H / 2),
    new T.Vector2(R, -H / 2 + b),
    new T.Vector2(R, H / 2 - b),
    new T.Vector2(R - b, H / 2),
    new T.Vector2(0, H / 2),
  ]
  const discGeo = new T.LatheGeometry(prof, 72)
  const ys = [0.62, 1.3, 1.98, 2.66]
  const discs = k.A.merge(
    ys.map((y) => discGeo.clone().translate(0, y, 0)),
    false,
  )!
  discGeo.dispose()
  const discMat = new T.MeshPhysicalMaterial({
    color: 0x0f1d23,
    roughness: 0.12,
    metalness: 0.4,
    transparent: true,
    opacity: 0.78,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  })
  g.add(new T.Mesh(discs, discMat))
  const rimMats: THREE.MeshBasicMaterial[] = []
  for (const y of ys) {
    const rm = new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 0.2), toneMapped: false })
    rimMats.push(rm)
    const tg = k.A.merge(
      [H / 2 - 0.03, -H / 2 + 0.03].map((dy) => new T.TorusGeometry(R + 0.004, 0.008, 6, 128).rotateX(Math.PI / 2).translate(0, y + dy, 0)),
      false,
    )!
    g.add(new T.Mesh(tg, rm))
  }
  const base = new T.Mesh(
    new T.LatheGeometry([new T.Vector2(0, 0), new T.Vector2(1.5, 0), new T.Vector2(1.5, 0.08), new T.Vector2(1.36, 0.28), new T.Vector2(0, 0.28)], 72),
    k.mat.paint,
  )
  g.add(base)
  const shadow = new T.Mesh(new T.PlaneGeometry(4.4, 4.4).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0, alphaMap: k.tex.shadow, transparent: true, opacity: 0.85, depthWrite: false }))
  shadow.position.y = 0.008
  shadow.renderOrder = -1
  g.add(shadow)

  const columnMat = fresnelMaterial(k.T, COLOR.teal, 1.6)
  const column = new T.Mesh(new T.CylinderGeometry(0.4, 0.4, 2.8, 48, 1, true), columnMat)
  column.position.y = 1.65
  g.add(column)

  const orbitMats: THREE.Material[] = []
  const orbits: THREE.Object3D[] = []
  for (let i = 0; i < 3; i++) {
    const pts: number[] = []
    const Rr = 1.42 + i * 0.2
    for (let j = 0; j < 96; j++) {
      if (j % 8 > 5) continue
      const a0 = (j / 96) * Math.PI * 2
      const a1 = ((j + 1) / 96) * Math.PI * 2
      pts.push(Math.cos(a0) * Rr, 0, Math.sin(a0) * Rr, Math.cos(a1) * Rr, 0, Math.sin(a1) * Rr)
    }
    const om = fatMat(k, i === 1 ? COLOR.blue : COLOR.teal, 1.1, 1.5, 0)
    orbitMats.push(om)
    const ln = fatSegments(k, pts, om)
    ln.position.y = 0.9 + i * 0.9
    g.add(ln)
    orbits.push(ln)
  }

  // API 링(코어 상단 — Django/DRF).
  const apiMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.0), transparent: true, toneMapped: false })
  const api = k.A.merge(
    [
      new T.TorusGeometry(0.62, 0.022, 8, 96).rotateX(Math.PI / 2).translate(0, 3.32, 0),
      new T.TorusGeometry(0.42, 0.012, 8, 96).rotateX(Math.PI / 2).translate(0, 3.52, 0),
    ],
    false,
  )!
  g.add(new T.Mesh(api, apiMat))

  const light = new T.PointLight(COLOR.teal, 0, 9, 1.4)
  light.position.set(0, 1.8, 1.7)
  g.add(light)

  scene.add(g)
  return { group: g, rimMats, columnMat, orbitMats, orbits, apiMat, light, top: new T.Vector3(CORE.x, 3.6, CORE.z) }
}

/** 데이터 패킷 — 소프트 라운드 스프라이트(거리 감쇠). */
export function buildPackets(k: Kit, count: number) {
  const { T, scene } = k
  const geo = new T.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  geo.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage))
  geo.setAttribute('color', new T.BufferAttribute(col, 3).setUsage(T.DynamicDrawUsage))
  const pts = new T.Points(
    geo,
    new T.PointsMaterial({ size: 0.26, map: k.tex.glow, vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }),
  )
  pts.frustumCulled = false
  scene.add(pts)
  return { pts, pos, col, geo }
}

/* ───────────────────────── 홀로그램 패널 ───────────────────────── */

export type PanelMat = { m: THREE.Material; base: number }
export const setOpacity = (m: THREE.Material, v: number) => {
  const u = (m as THREE.ShaderMaterial).uniforms
  if (u && u.uOpacity) u.uOpacity.value = v
  else m.opacity = v
}

/** 패널 골격 — 가장자리 발광 배경(셰이더) + 팻 라인 프레임 + 코너 브래킷. */
export function buildPanel(k: Kit, w: number, h: number, hex: number) {
  const { T } = k
  const g = new T.Group()
  const mats: PanelMat[] = []
  const add = <M extends THREE.Material>(m: M, base: number) => {
    m.transparent = true
    m.depthWrite = false
    ;(m as unknown as { fog: boolean }).fog = false
    mats.push({ m, base })
    return m
  }
  const bgMat = new T.ShaderMaterial({
    uniforms: { uColor: { value: new T.Color(hex) }, uOpacity: { value: 0 }, uSize: { value: new T.Vector2(w, h) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uOpacity; uniform vec2 uSize; varying vec2 vUv;
      void main(){
        vec2 p = vUv * uSize; vec2 q = min(p, uSize - p); float e = min(q.x, q.y);
        float edge = exp(-e * 7.0) * 0.55 + exp(-e * 40.0) * 0.6;
        float scan = 0.82 + 0.18 * sin(vUv.y * uSize.y * 140.0);
        float grad = 0.7 + 0.3 * vUv.y;
        gl_FragColor = vec4(uColor * (0.06 * scan * grad + edge * 0.35) * uOpacity, 1.0);
      }`,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  })
  g.add(new T.Mesh(new T.PlaneGeometry(w, h), add(bgMat, 1)))
  const hw = w / 2
  const hh = h / 2
  const frame = [-hw, -hh, 0, hw, -hh, 0, hw, -hh, 0, hw, hh, 0, hw, hh, 0, -hw, hh, 0, -hw, hh, 0, -hw, -hh, 0]
  g.add(fatSegments(k, frame, add(fatMat(k, hex, 0.8, 1.2, 0), 0.45)))
  const br: number[] = []
  const b = 0.3
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = sx * (hw + 0.06)
    const y = sy * (hh + 0.06)
    br.push(x, y, 0, x - sx * b, y, 0, x, y, 0, x, y - sy * b, 0)
  }
  g.add(fatSegments(k, br, add(fatMat(k, hex, 2.0, 2.2, 0), 1)))
  return { group: g, mats, add }
}
