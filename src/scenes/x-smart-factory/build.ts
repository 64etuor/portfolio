import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import { canvasFont } from '../_host/fonts'
import { BENCH_X, COLORS, LIFT, LINES, PANELS, T, TABLET_X } from './data'

// 지오메트리/머티리얼 빌더. 물리 바닥(어두운 실물) + 홀로그램 트윈(셰이더로 스캔·부상).
// 모든 애니메이션 상태는 uTime(=t) 에서 결정적으로 계산된다.

/* ─────────────── 결정적 타이밍(TS 쪽 미러 — GLSL 과 동일 식) ─────────────── */

export const actAt = (x: number) => T.scan0 + Math.min(1, Math.max(0, (x - T.x0) / (T.x1 - T.x0))) * (T.scan1 - T.scan0)
const fract = (v: number) => v - Math.floor(v)
const hash12 = (x: number, y: number) => fract(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453)
export const ease3 = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
export function riseAt(x: number, z: number, t: number) {
  const a = actAt(x) + T.riseDelay + hash12(x, z) * T.riseJitter
  return ease3(Math.min(1, Math.max(0, (t - a) / T.riseDur)))
}
export const bobAt = (x: number, t: number, r: number) => 0.05 * (0.5 + 0.5 * Math.sin(t * 0.8 + x * 0.35)) * r

const GLSL_COMMON = /* glsl */ `
uniform float uTime;
uniform float uLift;
uniform float uScanX;
uniform float uScanA;
float hash12(vec2 p){ return fract(sin(p.x*12.9898 + p.y*78.233)*43758.5453); }
float actAt(float x){ return ${T.scan0.toFixed(3)} + clamp((x - (${T.x0.toFixed(3)}))/(${(T.x1 - T.x0).toFixed(3)}), 0., 1.) * ${(T.scan1 - T.scan0).toFixed(3)}; }
float ease3(float p){ return p < .5 ? 4.*p*p*p : 1. - pow(-2.*p + 2., 3.)/2.; }
float riseAt(vec3 b){
  float a = actAt(b.x) + ${T.riseDelay.toFixed(3)} + hash12(b.xz) * ${T.riseJitter.toFixed(3)};
  return ease3(clamp((uTime - a)/${T.riseDur.toFixed(3)}, 0., 1.));
}
float bobAt(float x, float r){ return 0.05*(0.5 + 0.5*sin(uTime*0.8 + x*0.35))*r; }
`

/* ─────────────── 레이아웃 ─────────────── */

export interface Box {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  col: string
  twin: boolean
  phys: boolean
}
export interface Src {
  x: number
  y: number
  z: number
  kind: 'bc' | 'tab'
}
export interface Stack {
  x: number
  top: number
  z: number
  count: number
}
interface Layout {
  boxes: Box[]
  coils: { x: number; y: number; z: number; col: string }[]
  papers: { x: number; y: number; z: number; ry: number }[]
  labels: Src[]
  tablets: (Src & { ry: number })[]
  operators: { x: number; z: number }[]
  lamps: { x: number; z: number }[]
  pallets: Stack[]
  rackA: Stack
}

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALLET_POS: [number, number][] = [
  [4.7, -2.0],
  [6.3, -2.0],
  [7.9, -2.0],
  [4.7, 0.3],
  [6.3, 0.3],
  [7.9, 0.3],
  [5.5, 2.6],
  [7.3, 2.6],
]
const PALLET_LAYERS = [3, 2, 3, 2, 3, 1, 2, 3]

function makeLayout(): Layout {
  const rnd = mulberry(20210801)
  const boxes: Box[] = []
  const add = (x: number, y0: number, z: number, w: number, h: number, d: number, col: string, twin = true, phys = true) =>
    boxes.push({ x, y: y0 + h / 2, z, w, h, d, col, twin, phys })
  const L: Layout = {
    boxes,
    coils: [],
    papers: [],
    labels: [],
    tablets: [],
    operators: [],
    lamps: [],
    pallets: [],
    rackA: { x: 0, top: 0, z: 0, count: 0 },
  }

  for (const line of LINES) {
    const z = line.z
    for (const bx of BENCH_X) {
      add(bx, 0, z, 1.6, 0.78, 0.72, '#15181c')
      add(bx, 0.78, z, 1.72, 0.06, 0.86, '#2c3138')
      const top = 0.84
      if (line.kind === 'battery') {
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 3; j++) add(bx - 0.62 + i * 0.13, top, z - 0.05 + j * 0.13, 0.1, 0.2, 0.1, '#2c4a55', false)
        add(bx - 0.295, top, z + 0.08, 0.76, 0.2, 0.37, '#000', true, false)
        add(bx + 0.45, top, z, 0.5, 0.2, 0.42, '#3a4048')
      } else if (line.kind === 'filter') {
        add(bx - 0.2, top, z + 0.05, 0.7, 0.04, 0.45, '#30353b')
        for (let i = 0; i < 4; i++) add(bx - 0.45 + i * 0.17, top + 0.04, z + 0.05, 0.12, 0.32, 0.12, '#5d646b')
        add(bx + 0.5, top, z - 0.1, 0.36, 0.26, 0.3, '#3b4249')
      } else {
        add(bx, top, z - 0.32, 1.5, 0.72, 0.05, '#2a2622')
        const wires = ['#8a5524', '#6e2a2a', '#2a4a6e']
        for (let i = 0; i < 3; i++) L.coils.push({ x: bx - 0.48 + i * 0.48, y: top + 0.36, z: z - 0.27, col: wires[i] })
        add(bx, top, z + 0.12, 1.2, 0.03, 0.06, '#7a5a30')
      }
      L.papers.push({ x: bx + (line.kind === 'battery' ? 0.1 : -0.55), y: top + 0.005, z: z + 0.28, ry: (rnd() - 0.5) * 0.5 })
      L.operators.push({ x: bx + (rnd() - 0.5) * 0.3, z: z - 0.82 })
      L.lamps.push({ x: bx, z })
    }
    // 라인 끝 태블릿 스탠드
    add(TABLET_X, 0, z, 0.06, 1.1, 0.06, '#3a3f46')
    add(TABLET_X, 0, z, 0.4, 0.04, 0.4, '#2a2e33')
    L.tablets.push({ x: TABLET_X + 0.04, y: 1.28, z: z + 0.04, kind: 'tab', ry: Math.PI * 0.28 })
  }

  // 창고 — 랙 2기(뒤쪽 벽)
  const rackZ = -4.45
  ;[5.0, 7.6].forEach((rx, ri) => {
    for (const dx of [-1.2, 1.2]) for (const dz of [-0.38, 0.38]) add(rx + dx, 0, rackZ + dz, 0.06, 2.55, 0.06, '#3a3f46')
    let bins = 0
    for (const sy of [0.12, 0.92, 1.72]) {
      add(rx, sy, rackZ, 2.46, 0.05, 0.8, '#2a2e33')
      for (let b = 0; b < 3; b++) {
        const bx = rx - 0.78 + b * 0.78
        const isBin = (b + Math.round(sy * 3) + ri) % 3 !== 0
        if (isBin) add(bx, sy + 0.05, rackZ, 0.66, 0.44, 0.62, '#1f3c47')
        else add(bx, sy + 0.05, rackZ, 0.6, 0.5, 0.6, '#4a3a2a')
        bins++
        L.labels.push({ x: bx + 0.12, y: sy + 0.28, z: rackZ + 0.32, kind: 'bc' })
      }
    }
    if (ri === 0) L.rackA = { x: rx, top: 2.6, z: rackZ, count: bins }
  })

  // 팔레트 + 적재 박스
  PALLET_POS.forEach(([px, pz], i) => {
    add(px, 0, pz, 1.15, 0.14, 1.15, '#3a2f24')
    const layers = PALLET_LAYERS[i]
    const ch = 0.38
    for (let l = 0; l < layers; l++)
      for (const ox of [-0.27, 0.27])
        for (const oz of [-0.27, 0.27]) {
          const shade = 0.85 + rnd() * 0.3
          const c = (n: number) =>
            Math.round(n * shade)
              .toString(16)
              .padStart(2, '0')
          add(px + ox, 0.14 + l * ch, pz + oz, 0.5, ch - 0.02, 0.5, `#${c(0x4a)}${c(0x3a)}${c(0x2a)}`, false)
        }
    // 트윈에선 층 단위 블록(겹친 엣지로 하얗게 뭉개지지 않게)
    for (let l = 0; l < layers; l++) add(px, 0.14 + l * ch, pz, 1.04, ch - 0.03, 1.04, '#000', true, false)
    const top = 0.14 + layers * ch
    L.labels.push({ x: px + 0.27, y: top - ch / 2, z: pz + 0.525, kind: 'bc' })
    L.pallets.push({ x: px, top, z: pz, count: layers * 4 })
    if (i === 1 || i === 4) L.papers.push({ x: px - 0.1, y: top + 0.005, z: pz + 0.05, ry: 0.3 })
  })

  return L
}

/* ─────────────── 텍스처 ─────────────── */

function barcodeTexture(TH: Three) {
  const c = document.createElement('canvas')
  c.width = 160
  c.height = 72
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#000000'
  const rnd = mulberry(417)
  let x = 10
  while (x < 150) {
    const w = 1 + Math.floor(rnd() * 4)
    if (rnd() > 0.4) g.fillRect(x, 6, w, 46)
    x += w + 1 + Math.floor(rnd() * 2)
  }
  g.font = canvasFont(400, 13, 'mono')
  g.fillText('8 801234 041721', 14, 66)
  const tex = new TH.CanvasTexture(c)
  tex.colorSpace = TH.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function tabletTexture(TH: Three) {
  const c = document.createElement('canvas')
  c.width = 160
  c.height = 112
  const g = c.getContext('2d')!
  g.fillStyle = '#0d1a20'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#ffffff'
  g.fillRect(10, 10, 60, 8)
  for (let i = 0; i < 4; i++) {
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(10, 32 + i * 18, 140, 8)
    g.fillStyle = '#ffffff'
    g.fillRect(10, 32 + i * 18, 40 + ((i * 37) % 90), 8)
  }
  const tex = new TH.CanvasTexture(c)
  tex.colorSpace = TH.SRGBColorSpace
  return tex
}

/* ─────────────── 월드 ─────────────── */

export interface World {
  U: Record<string, { value: number }>
  labels: Src[]
  tablets: Src[]
  papers: Layout['papers']
  labelMesh: THREE.InstancedMesh
  tabletMesh: THREE.InstancedMesh
  paperMesh: THREE.InstancedMesh
  scan: THREE.Group
  nodes: { group: THREE.Group; ring: THREE.Mesh; ring2: THREE.Mesh; at: number }[]
  pallets: Stack[]
  rackA: Stack
  pxUniform: { value: number }
}

const hdr = (TH: Three, hex: string, k: number) => new TH.Color(hex).multiplyScalar(k)

export function buildWorld(TH: Three, scene: THREE.Scene): World {
  const lay = makeLayout()
  const U = {
    uTime: { value: 0 },
    uLift: { value: LIFT },
    uScanX: { value: T.x0 },
    uScanA: { value: 0 },
  }
  const pxUniform = { value: 300 }

  /* 조명 */
  scene.add(new TH.HemisphereLight('#6a8090', '#0a0a0a', 1.1))
  const key = new TH.DirectionalLight('#c8d4de', 1.7)
  key.position.set(-6, 10, 9)
  scene.add(key)
  const rim = new TH.DirectionalLight('#4ab3cc', 0.6)
  rim.position.set(4, 6, -12)
  scene.add(rim)
  for (const line of LINES) {
    const pl = new TH.PointLight('#e09a50', 16, 10, 1.5)
    pl.position.set(-3.6, 2.3, line.z + 0.3)
    scene.add(pl)
  }
  const wl = new TH.PointLight('#e09a50', 12, 10, 1.5)
  wl.position.set(6.3, 2.6, -0.8)
  scene.add(wl)

  /* 바닥 */
  const floor = new TH.Mesh(
    new TH.PlaneGeometry(40, 28),
    new TH.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.82, metalness: 0.15 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, -0.5)
  scene.add(floor)
  const grid = new TH.GridHelper(40, 80, '#161b20', '#11151a')
  grid.position.set(0, 0.002, -0.5)
  scene.add(grid)
  // 통로 라인(앰버, 블룸 임계 아래)
  const laneGeo = new TH.PlaneGeometry(1, 1)
  const laneMat = new TH.MeshBasicMaterial({ color: '#3d2a12' })
  const lanes: [number, number, number, number][] = [
    [-3.0, -1.2, 12.2, 0.07],
    [-3.0, 1.4, 12.2, 0.07],
    [3.3, -0.4, 0.07, 9.4],
    [6.4, 3.75, 6.2, 0.07],
    [6.4, -1.1 + 0.05, 6.2, 0.04],
  ]
  const laneMesh = new TH.InstancedMesh(laneGeo, laneMat, lanes.length)
  const m4 = new TH.Matrix4()
  const q = new TH.Quaternion().setFromEuler(new TH.Euler(-Math.PI / 2, 0, 0))
  const v = new TH.Vector3()
  const s = new TH.Vector3()
  lanes.forEach(([x, z, w, d], i) => {
    m4.compose(v.set(x, 0.004, z), q, s.set(w, d, 1))
    laneMesh.setMatrixAt(i, m4)
  })
  scene.add(laneMesh)

  /* 물리 박스(인스턴스 1 드로우) */
  const unitBox = new TH.BoxGeometry(1, 1, 1)
  const physBoxes = lay.boxes.filter((b) => b.phys)
  const phys = new TH.InstancedMesh(
    unitBox,
    new TH.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.35 }),
    physBoxes.length,
  )
  const qi = new TH.Quaternion()
  const col = new TH.Color()
  physBoxes.forEach((b, i) => {
    m4.compose(v.set(b.x, b.y, b.z), qi, s.set(b.w, b.h, b.d))
    phys.setMatrixAt(i, m4)
    phys.setColorAt(i, col.set(b.col))
  })
  scene.add(phys)

  // 하네스 코일
  const coilMesh = new TH.InstancedMesh(
    new TH.TorusGeometry(0.12, 0.022, 6, 20),
    new TH.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0.2 }),
    lay.coils.length,
  )
  lay.coils.forEach((c, i) => {
    m4.compose(v.set(c.x, c.y, c.z), qi, s.set(1, 1, 1))
    coilMesh.setMatrixAt(i, m4)
    coilMesh.setColorAt(i, col.set(c.col))
  })
  scene.add(coilMesh)

  // 작업자(캡슐 + 머리)
  const opMat = new TH.MeshStandardMaterial({ color: '#232a31', roughness: 0.7, metalness: 0.1 })
  const body = new TH.InstancedMesh(new TH.CapsuleGeometry(0.17, 0.62, 4, 10), opMat, lay.operators.length)
  const head = new TH.InstancedMesh(new TH.SphereGeometry(0.12, 12, 10), opMat, lay.operators.length)
  lay.operators.forEach((o, i) => {
    m4.compose(v.set(o.x, 0.58, o.z), qi, s.set(1, 1, 1))
    body.setMatrixAt(i, m4)
    m4.compose(v.set(o.x, 1.26, o.z), qi, s.set(1, 1, 1))
    head.setMatrixAt(i, m4)
  })
  scene.add(body, head)

  // 작업등(따뜻한 펜던트)
  const lampMesh = new TH.InstancedMesh(
    new TH.BoxGeometry(0.62, 0.03, 0.1),
    new TH.MeshBasicMaterial({ color: hdr(TH, COLORS.amber, 2.2) }),
    lay.lamps.length,
  )
  const wireGeoPts: number[] = []
  lay.lamps.forEach((l, i) => {
    m4.compose(v.set(l.x, 2.25, l.z), qi, s.set(1, 1, 1))
    lampMesh.setMatrixAt(i, m4)
    wireGeoPts.push(l.x, 2.25, l.z, l.x, 3.6, l.z)
  })
  scene.add(lampMesh)
  const wireGeo = new TH.BufferGeometry()
  wireGeo.setAttribute('position', new TH.Float32BufferAttribute(wireGeoPts, 3))
  scene.add(new TH.LineSegments(wireGeo, new TH.LineBasicMaterial({ color: '#1c2228' })))

  // 종이 기록(스캔 지나가면 사라짐)
  const paperMesh = new TH.InstancedMesh(
    new TH.PlaneGeometry(0.22, 0.3),
    new TH.MeshBasicMaterial({ color: '#ffffff' }),
    lay.papers.length,
  )
  scene.add(paperMesh)

  /* 바코드 라벨 / 태블릿 화면 */
  const labelMesh = new TH.InstancedMesh(
    new TH.PlaneGeometry(0.22, 0.1),
    new TH.MeshBasicMaterial({ map: barcodeTexture(TH) }),
    lay.labels.length,
  )
  lay.labels.forEach((l, i) => {
    m4.compose(v.set(l.x, l.y, l.z), qi, s.set(1, 1, 1))
    labelMesh.setMatrixAt(i, m4)
    labelMesh.setColorAt(i, col.setScalar(0.3))
  })
  scene.add(labelMesh)

  const tabletMesh = new TH.InstancedMesh(
    new TH.PlaneGeometry(0.44, 0.31),
    new TH.MeshBasicMaterial({ map: tabletTexture(TH) }),
    lay.tablets.length,
  )
  lay.tablets.forEach((tb, i) => {
    m4.compose(v.set(tb.x, tb.y, tb.z), new TH.Quaternion().setFromEuler(new TH.Euler(-0.25, tb.ry, 0, 'YXZ')), s.set(1, 1, 1))
    tabletMesh.setMatrixAt(i, m4)
    tabletMesh.setColorAt(i, col.setScalar(0.12))
  })
  scene.add(tabletMesh)

  /* ─────────── 트윈 ─────────── */
  const twinBoxes = lay.boxes.filter((b) => b.twin)
  // 박스 엣지 → 하나의 LineSegments (aBase = 박스 중심)
  const pos: number[] = []
  const base: number[] = []
  for (const b of twinBoxes) {
    const hx = b.w / 2
    const hy = b.h / 2
    const hz = b.d / 2
    const c = [
      [-hx, -hy, -hz],
      [hx, -hy, -hz],
      [hx, -hy, hz],
      [-hx, -hy, hz],
      [-hx, hy, -hz],
      [hx, hy, -hz],
      [hx, hy, hz],
      [-hx, hy, hz],
    ]
    const E = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
    for (const e of E) {
      pos.push(b.x + c[e][0], b.y + c[e][1], b.z + c[e][2])
      base.push(b.x, b.y, b.z)
    }
  }
  const edgeGeo = new TH.BufferGeometry()
  edgeGeo.setAttribute('position', new TH.Float32BufferAttribute(pos, 3))
  edgeGeo.setAttribute('aBase', new TH.Float32BufferAttribute(base, 3))

  const twinLineMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.teal, 1.05) }, uHot: { value: new TH.Color(1.3, 1.9, 1.8) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      attribute vec3 aBase;
      varying float vR; varying float vOn; varying vec3 vW;
      void main(){
        float r = riseAt(aBase);
        vec3 p = position;
        p.y += r*uLift + bobAt(aBase.x, r);
        vR = r;
        float a = actAt(aBase.x);
        vOn = smoothstep(a, a + 0.12, uTime);
        vec4 w = modelMatrix*vec4(p,1.);
        vW = w.xyz;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCol; uniform vec3 uHot;
      varying float vR; varying float vOn; varying vec3 vW;
      void main(){
        if (vOn < 0.002) discard;
        float travel = sin(3.14159*vR);
        float hot = max(1. - smoothstep(0., 0.25, vR), travel*0.6);
        float sh = 0.8 + 0.2*sin(vW.y*26. - uTime*2.4 + vW.x*0.7);
        vec3 c = mix(uCol*sh, uHot, hot*0.6);
        gl_FragColor = vec4(c, vOn*(0.45 + 0.25*hot));
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const twinLines = new TH.LineSegments(edgeGeo, twinLineMat)
  twinLines.frustumCulled = false
  scene.add(twinLines)

  // 바닥에 남는 스캔 잔상(같은 지오메트리)
  const ghostMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.teal, 1) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      attribute vec3 aBase;
      varying float vOn; varying vec3 vW;
      void main(){
        float a = actAt(aBase.x);
        vOn = smoothstep(a, a + 0.3, uTime);
        vec4 w = modelMatrix*vec4(position,1.);
        vW = w.xyz;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uScanX; uniform float uScanA; uniform vec3 uCol;
      varying float vOn; varying vec3 vW;
      void main(){
        float d = (vW.x - uScanX);
        float flash = exp(-d*d*2.2)*uScanA;
        float a = vOn*0.09 + flash*1.6;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(uCol, vec3(2.4,2.8,2.7), clamp(flash,0.,1.)), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const ghost = new TH.LineSegments(edgeGeo, ghostMat)
  ghost.frustumCulled = false
  scene.add(ghost)

  // 트윈 면(반투명 홀로그램)
  const faceMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.blue, 1.0) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vR; varying vec3 vN; varying float vH;
      void main(){
        vec3 b = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        vec4 w = modelMatrix*instanceMatrix*vec4(position,1.);
        float r = riseAt(b);
        w.y += r*uLift + bobAt(b.x, r);
        vR = r; vN = normal; vH = position.y + .5;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol;
      varying float vR; varying vec3 vN; varying float vH;
      void main(){
        float on = smoothstep(0.08, 0.5, vR);
        if (on < 0.002) discard;
        float a = on*(0.012 + 0.03*abs(vN.y) + 0.025*vH);
        gl_FragColor = vec4(uCol, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const faces = new TH.InstancedMesh(unitBox, faceMat, twinBoxes.length)
  twinBoxes.forEach((b, i) => {
    m4.compose(v.set(b.x, b.y, b.z), qi, s.set(b.w, b.h, b.d))
    faces.setMatrixAt(i, m4)
  })
  faces.frustumCulled = false
  scene.add(faces)

  // 트윈 바닥 그리드
  const gw = 19.6
  const gd = 10.2
  const gcx = 0.3
  const gcz = -0.7
  const tgMat = new TH.ShaderMaterial({
    uniforms: {
      ...U,
      uCol: { value: hdr(TH, COLORS.teal, 1) },
      uHalf: { value: new TH.Vector2(gw / 2, gd / 2) },
      uC: { value: new TH.Vector2(gcx, gcz) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform vec3 uCol; uniform vec2 uHalf; uniform vec2 uC;
      varying vec3 vW;
      float gridLine(vec2 p, float s, float w){ vec2 g = abs(fract(p/s - .5) - .5)*s; vec2 fw = fwidth(p); vec2 l = 1. - smoothstep(vec2(0.), fw*w, g); return max(l.x, l.y); }
      void main(){
        vec2 p = vW.xz;
        vec2 q = abs(p - uC) / uHalf;
        float edge = max(q.x, q.y);
        float border = smoothstep(0.985, 0.995, edge);
        float r = ease3(clamp((uTime - actAt(p.x) - 0.3)/1.2, 0., 1.));
        float front = r*(1.-r)*4.;
        float minor = gridLine(p, 0.5, 1.0);
        float major = gridLine(p, 2.5, 1.6);
        float vis = 0.18 + 0.82*r;
        float a = (minor*0.05 + major*0.16 + border*0.55)*vis + front*0.12*(1.-edge*.5);
        a *= 1. - smoothstep(0.995, 1.0, edge);
        gl_FragColor = vec4(uCol*(1. + front*1.5), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const twinGrid = new TH.Mesh(new TH.PlaneGeometry(gw, gd), tgMat)
  twinGrid.rotation.x = -Math.PI / 2
  twinGrid.position.set(gcx, LIFT - 0.01, gcz)
  scene.add(twinGrid)

  /* 데이터 소스: 바코드 + 태블릿 */
  const sources: Src[] = [...lay.labels, ...lay.tablets]

  // 수직 빔 (소스 → 트윈)
  const beamPos: number[] = []
  const beamT: number[] = []
  const beamK: number[] = []
  for (const src of sources) {
    beamPos.push(src.x, src.y, src.z, src.x, src.y, src.z)
    beamT.push(0, 1)
    const k = src.kind === 'tab' ? 1 : 0
    beamK.push(k, k)
  }
  const beamGeo = new TH.BufferGeometry()
  beamGeo.setAttribute('position', new TH.Float32BufferAttribute(beamPos, 3))
  beamGeo.setAttribute('aT', new TH.Float32BufferAttribute(beamT, 1))
  beamGeo.setAttribute('aK', new TH.Float32BufferAttribute(beamK, 1))
  const beamMat = new TH.ShaderMaterial({
    uniforms: { ...U, uA: { value: hdr(TH, COLORS.amber, 1.6) }, uB: { value: hdr(TH, COLORS.blue, 1.8) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      attribute float aT; attribute float aK;
      varying float vT; varying float vK; varying float vR; varying float vLen;
      void main(){
        float r = riseAt(position);
        vec3 p = position;
        float len = r*uLift + bobAt(position.x, r);
        p.y += aT*len;
        vT = aT; vK = aK; vR = r; vLen = len;
        gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uA; uniform vec3 uB;
      varying float vT; varying float vK; varying float vR; varying float vLen;
      void main(){
        if (vR < 0.01) discard;
        float d = fract(vT*vLen*0.9 - uTime*1.1 - vK*0.37);
        float dash = smoothstep(0.75, 1.0, d);
        float a = (0.14 + 0.85*dash)*smoothstep(0.0, 0.06, vT);
        gl_FragColor = vec4(mix(uA, uB, vK), a*smoothstep(0.01, 0.2, vR));
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const beams = new TH.LineSegments(beamGeo, beamMat)
  beams.frustumCulled = false
  scene.add(beams)

  // 트윈 안 바코드 마커
  const mk = new TH.BufferGeometry()
  mk.setAttribute('position', new TH.Float32BufferAttribute(beamPos.filter((_, i) => i % 6 < 3), 3))
  mk.setAttribute('aK', new TH.Float32BufferAttribute(beamK.filter((_, i) => i % 2 === 0), 1))
  const mkMat = new TH.ShaderMaterial({
    uniforms: { ...U, uPx: pxUniform, uA: { value: hdr(TH, COLORS.amber, 3) }, uB: { value: hdr(TH, COLORS.blue, 3) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uPx; attribute float aK;
      varying float vK; varying float vR;
      void main(){
        float r = riseAt(position);
        vec3 p = position; p.y += r*uLift + bobAt(position.x, r);
        vK = aK; vR = r;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        gl_PointSize = uPx*0.16*(1. + 0.25*sin(uTime*3. + position.x*2.)) / -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB;
      varying float vK; varying float vR;
      void main(){
        if (vR < 0.3) discard;
        vec2 c = abs(gl_PointCoord - .5);
        float sq = 1. - smoothstep(0.32, 0.5, max(c.x, c.y));
        float core = 1. - smoothstep(0.0, 0.3, max(c.x, c.y));
        gl_FragColor = vec4(mix(uA, uB, vK), (sq*0.5 + core*0.6)*smoothstep(0.3, 0.8, vR));
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const markers = new TH.Points(mk, mkMat)
  markers.frustumCulled = false
  scene.add(markers)

  /* 데이터 입자 → 패널 */
  const panelPos = Object.fromEntries(PANELS.map((p) => [p.key, p])) as Record<string, (typeof PANELS)[number]>
  const N = 1500
  const pSrc = new Float32Array(N * 3)
  const pDst = new Float32Array(N * 3)
  const pMeta = new Float32Array(N * 4)
  const rnd = mulberry(2022)
  const bcSources = sources.filter((x) => x.kind === 'bc')
  const tabSources = sources.filter((x) => x.kind === 'tab')
  for (let i = 0; i < N; i++) {
    const fromTab = i % 10 < 3
    const src = fromTab ? tabSources[i % tabSources.length] : bcSources[Math.floor(rnd() * bcSources.length)]
    const toErp = rnd() < 0.28
    const dstKey = toErp ? 'erp' : fromTab ? 'tablet' : 'barcode'
    const d = panelPos[dstKey]
    pSrc.set([src.x, src.y, src.z], i * 3)
    pDst.set([d.pos[0] + (rnd() - 0.5) * 0.25, d.pos[1] + (rnd() - 0.5) * 0.25, d.pos[2] + (rnd() - 0.5) * 0.25], i * 3)
    const srcRiseEnd = actAt(src.x) + T.riseDelay + T.riseJitter + T.riseDur * 0.5
    const act = Math.max(srcRiseEnd, d.at - 1.2)
    const kind = toErp ? 1 : fromTab ? 2 : 0
    pMeta.set([rnd(), 1 / (2.6 + rnd() * 1.4), act, kind], i * 4)
  }
  const pGeo = new TH.BufferGeometry()
  pGeo.setAttribute('position', new TH.BufferAttribute(pSrc, 3))
  pGeo.setAttribute('aDst', new TH.BufferAttribute(pDst, 3))
  pGeo.setAttribute('aMeta', new TH.BufferAttribute(pMeta, 4))
  const pMat = new TH.ShaderMaterial({
    uniforms: {
      ...U,
      uPx: pxUniform,
      uC0: { value: hdr(TH, COLORS.amber, 2.6) },
      uC1: { value: hdr(TH, COLORS.teal, 2.6) },
      uC2: { value: hdr(TH, COLORS.blue, 2.8) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uPx;
      attribute vec3 aDst; attribute vec4 aMeta;
      varying float vA; varying float vK;
      vec3 bez(vec3 a, vec3 b, vec3 c, float t){ float u = 1.-t; return u*u*a + 2.*u*t*b + t*t*c; }
      void main(){
        float sp = aMeta.y;
        float life = fract(uTime*sp + aMeta.x);
        float emit = uTime - life/sp;
        float on = step(aMeta.z, emit);
        vec3 src = position;
        vec3 mid = src + vec3(0., uLift + 0.35, 0.);
        vec3 p;
        float split = 0.45;
        if (life < split) {
          float k = life/split;
          p = mix(src, mid, k);
        } else {
          float k = (life - split)/(1. - split);
          k = k*k*(3. - 2.*k);
          vec3 ctrl = vec3(mix(mid.x, aDst.x, 0.25), max(mid.y, aDst.y) + 1.4, mix(mid.z, aDst.z, 0.25));
          p = bez(mid, ctrl, aDst, k);
        }
        float j = aMeta.x*6.2831;
        float sw = (1. - smoothstep(0.3, 0.45, life))*0.035 + 0.02;
        p.x += sin(life*21. + j)*sw; p.z += cos(life*17. + j)*sw;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        float fade = smoothstep(0., 0.05, life)*(1. - smoothstep(0.93, 1., life));
        vA = on*fade; vK = aMeta.w;
        gl_PointSize = on*uPx*(0.05 + 0.05*fract(aMeta.x*7.31)) / -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;
      varying float vA; varying float vK;
      void main(){
        if (vA < 0.01) discard;
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0., d);
        vec3 c = vK < .5 ? uC0 : (vK < 1.5 ? uC1 : uC2);
        gl_FragColor = vec4(c, a*a*vA);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const parts = new TH.Points(pGeo, pMat)
  parts.frustumCulled = false
  scene.add(parts)

  /* 먼지 입자(분위기) — 결정적 표류 */
  const DN = 420
  const dPos = new Float32Array(DN * 3)
  const dSeed = new Float32Array(DN)
  const drnd = mulberry(77)
  for (let i = 0; i < DN; i++) {
    dPos.set([-10 + drnd() * 20, drnd() * 9, -5.5 + drnd() * 10], i * 3)
    dSeed[i] = drnd()
  }
  const dGeo = new TH.BufferGeometry()
  dGeo.setAttribute('position', new TH.BufferAttribute(dPos, 3))
  dGeo.setAttribute('aS', new TH.BufferAttribute(dSeed, 1))
  const dMat = new TH.ShaderMaterial({
    uniforms: { ...U, uPx: pxUniform, uW: { value: new TH.Color(COLORS.amber).multiplyScalar(0.55) }, uC: { value: new TH.Color(COLORS.teal).multiplyScalar(0.55) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      uniform float uPx; attribute float aS; varying float vA; varying float vY;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime*(0.05 + aS*0.08), 9.);
        p.x += sin(uTime*0.2 + aS*40.)*0.4;
        p.z += cos(uTime*0.17 + aS*30.)*0.4;
        vY = p.y;
        vec4 mv = modelViewMatrix*vec4(p,1.);
        vA = (0.35 + 0.65*fract(aS*13.7))*smoothstep(0., 0.6, p.y)*(1. - smoothstep(8., 9., p.y));
        gl_PointSize = uPx*0.035/ -mv.z;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uW; uniform vec3 uC; varying float vA; varying float vY;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
        gl_FragColor = vec4(mix(uW, uC, smoothstep(2.5, 5., vY)), a*vA*0.6); }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const dust = new TH.Points(dGeo, dMat)
  dust.frustumCulled = false
  scene.add(dust)

  /* 패널 노드 */
  const nodes: World['nodes'] = PANELS.map((p) => {
    const g = new TH.Group()
    g.position.set(...p.pos)
    const c = p.key === 'erp' ? COLORS.teal : p.key === 'tablet' ? COLORS.blue : COLORS.amber
    const ring = new TH.Mesh(
      new TH.RingGeometry(0.3, 0.335, 48),
      new TH.MeshBasicMaterial({ color: hdr(TH, c, 2.6), transparent: true, blending: TH.AdditiveBlending, depthWrite: false }),
    )
    const ring2 = new TH.Mesh(
      new TH.RingGeometry(0.46, 0.475, 48, 1, 0, Math.PI * 1.4),
      new TH.MeshBasicMaterial({ color: hdr(TH, c, 1.4), transparent: true, blending: TH.AdditiveBlending, depthWrite: false }),
    )
    const core = new TH.Mesh(new TH.SphereGeometry(0.09, 16, 12), new TH.MeshBasicMaterial({ color: hdr(TH, c, 4) }))
    g.add(ring, ring2, core)
    scene.add(g)
    return { group: g, ring, ring2, at: p.at }
  })

  /* 스캔 평면 + 바닥 라인 + 트레일 */
  const scan = new TH.Group()
  const sh = LIFT + 2.2
  const planeMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.teal, 1.6) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uScanA; uniform float uTime; uniform vec3 uCol;
      varying vec2 vUv;
      void main(){
        float y = vUv.y;
        float base = exp(-y*4.0)*0.75 + 0.05;
        float lines = 0.55 + 0.45*smoothstep(0.4, 0.6, fract(y*70. - uTime*2.));
        float ez = smoothstep(0., 0.06, vUv.x)*smoothstep(1., 0.94, vUv.x);
        float top = 1. - smoothstep(0.8, 1., y);
        gl_FragColor = vec4(uCol, uScanA*base*lines*ez*top*0.5);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
    side: TH.DoubleSide,
  })
  const plane = new TH.Mesh(new TH.PlaneGeometry(11.5, sh), planeMat)
  plane.rotation.y = Math.PI / 2
  plane.position.set(0, sh / 2, -0.6)
  const lineMat = new TH.MeshBasicMaterial({
    color: hdr(TH, COLORS.teal, 5),
    transparent: true,
    blending: TH.AdditiveBlending,
    depthWrite: false,
  })
  const line = new TH.Mesh(new TH.BoxGeometry(0.035, 0.02, 11.5), lineMat)
  line.position.set(0, 0.012, -0.6)
  const trailMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.teal, 1.2) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uScanA; uniform vec3 uCol; varying vec2 vUv;
      void main(){ float ez = smoothstep(0., 0.06, vUv.y)*smoothstep(1., 0.94, vUv.y); gl_FragColor = vec4(uCol, pow(vUv.x, 3.)*0.35*uScanA*ez); }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const trail = new TH.Mesh(new TH.PlaneGeometry(3.2, 11.5), trailMat)
  trail.rotation.x = -Math.PI / 2
  trail.position.set(-1.6, 0.006, -0.6)
  scan.add(plane, line, trail)
  scene.add(scan)
  // lineMat 투명도는 runtime 에서 uScanA 로.
  scan.userData.lineMat = lineMat

  return {
    U,
    labels: lay.labels,
    tablets: lay.tablets,
    papers: lay.papers,
    labelMesh,
    tabletMesh,
    paperMesh,
    scan,
    nodes,
    pallets: lay.pallets,
    rackA: lay.rackA,
    pxUniform,
  }
}
