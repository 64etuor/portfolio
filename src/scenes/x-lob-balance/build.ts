import type * as THREE_NS from 'three'
import type { RoundedBoxGeometry as RoundedBoxGeometryT } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Three } from '../_host/three/types'
import { SPACING, STATIONS, TOWER_W } from './data'

// 지오메트리/머티리얼 빌더. 런타임 값은 전부 ctx.THREE 로 만든다.

export const COL = {
  phosphor: 0xd7d7d7,
  dim: 0x8d8d8d,
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xe0503a,
}

export const stationX = (i: number) => (i - (STATIONS - 1) / 2) * SPACING

/** HDR 컬러(블룸용). */
export const hdr = (THREE: Three, hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k)

/** 동적 import 한 addon 들(런타임이 주입). */
export type Kit = {
  RoundedBox: typeof RoundedBoxGeometryT
  merge: (g: THREE_NS.BufferGeometry[]) => THREE_NS.BufferGeometry | null
}

/** 스테이션(작업대) 상판 높이 — 게이지 유리관이 여기서 솟는다. */
export const BENCH_TOP = 0.24
/** 컨베이어: 작업대 앞쪽을 지나는 라인. */
export const CONV_Z = 1.08
export const BELT_TOP = 0.21

// ───────────────────────── helpers ─────────────────────────

/** 정점색을 칠한 non-indexed 지오메트리(머지용, uv 제거). */
function paint(THREE: Three, geo: THREE_NS.BufferGeometry, hex: number) {
  const g = geo.index ? geo.toNonIndexed() : geo
  g.deleteAttribute('uv')
  const n = g.getAttribute('position').count
  const c = new THREE.Color(hex)
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return g
}

function bare(geo: THREE_NS.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo
  g.deleteAttribute('uv')
  return g
}

/** 라운드 사각 윤곽(xz 평면, 중심 원점). */
function roundedSquare(THREE: Three, half: number, r: number) {
  const s = new THREE.Shape()
  s.moveTo(-half + r, -half)
  s.lineTo(half - r, -half)
  s.absarc(half - r, -half + r, r, -Math.PI / 2, 0, false)
  s.lineTo(half, half - r)
  s.absarc(half - r, half - r, r, 0, Math.PI / 2, false)
  s.lineTo(-half + r, half)
  s.absarc(-half + r, half - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(-half, -half + r)
  s.absarc(-half + r, -half + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

/** 라운드 사각 단면의 측면만 있는 단위 높이 프리즘(y 0..1). y 스케일해도 모서리 R 이 유지된다. */
function prismSides(THREE: Three, half: number, r: number) {
  const raw = roundedSquare(THREE, half, r).getPoints(8)
  const pts: THREE_NS.Vector2[] = []
  for (const p of raw) if (!pts.length || pts[pts.length - 1].distanceTo(p) > 1e-5) pts.push(p)
  if (pts[0].distanceTo(pts[pts.length - 1]) < 1e-5) pts.pop()
  const n = pts.length
  // 정점 법선 = 인접 엣지 법선 평균(바깥 방향)
  const en: THREE_NS.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const e = new THREE.Vector2(b.y - a.y, -(b.x - a.x)).normalize()
    const mid = new THREE.Vector2((a.x + b.x) / 2, (a.y + b.y) / 2)
    if (e.dot(mid) < 0) e.multiplyScalar(-1)
    en.push(e)
  }
  const pos: number[] = []
  const nor: number[] = []
  for (let i = 0; i < n; i++) {
    const vn = en[i].clone().add(en[(i + n - 1) % n]).normalize()
    for (const y of [0, 1]) {
      pos.push(pts[i].x, y, pts[i].y)
      nor.push(vn.x, 0, vn.y)
    }
  }
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const a = i * 2
    const b = j * 2
    // 바깥을 보도록 와인딩 결정
    const dx = pts[j].x - pts[i].x
    const dz = pts[j].y - pts[i].y
    const cx = -dz
    const cz = dx
    const out = cx * en[i].x + cz * en[i].y > 0
    if (out) idx.push(a, b, b + 1, a, b + 1, a + 1)
    else idx.push(a, b + 1, b, a, a + 1, b + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}

/** 라운드 사각 프레임(링) — 높이 h, y 0..h. */
function squareFrame(THREE: Three, outer: number, inner: number, h: number, r = 0.06) {
  const s = roundedSquare(THREE, outer, r)
  s.holes.push(roundedSquare(THREE, inner, Math.max(0.01, r - (outer - inner))))
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 })
  g.rotateX(-Math.PI / 2)
  return g
}

/** 방사형 소프트 텍스처(그림자/글로우/디스크 공용). */
export function radialTexture(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.7, 'rgba(255,255,255,0.14)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// ───────────────────────── glass C/T gauge ─────────────────────────

const gaugeVert = /* glsl */ `
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const gaugeHead = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uH;
uniform float uTakt;
uniform float uHotAmt;
uniform float uTime;
uniform float uPulse;
uniform float uBase;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
float tick(float y, float step) {
  float q = y / step;
  float d = abs(fract(q + 0.5) - 0.5);
  return 1.0 - smoothstep(0.0, max(fwidth(q) * 1.3, 1e-4), d);
}
`

/** 유리 외피: 프레넬 림 + 전면 눈금(graduation) + 상단 하이라이트. */
const shellFrag = /* glsl */ `
${gaugeHead}
uniform float uHalf;
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = abs(dot(N, V));
  float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), 3.0);
  float y = vWorld.y;
  // 전면 눈금: 0.25 단위 소눈금, 1.0 단위 대눈금(왼쪽 가장자리)
  float front = smoothstep(0.6, 0.9, N.z);
  float lx = vLocal.x + uHalf;
  float minor = tick(y, 0.25) * step(0.07, lx) * step(lx, 0.15);
  float major = tick(y, 1.0) * step(0.07, lx) * step(lx, 0.27);
  float spine = (1.0 - smoothstep(0.0, max(fwidth(lx) * 1.5, 1e-4), abs(lx - 0.07))) * 0.35;
  float inside = step(uBase + 0.08, y) * (1.0 - smoothstep(uH - 0.05, uH - 0.01, y));
  float ticks = max(max(minor * 0.55, major), spine) * front * inside;
  float top = smoothstep(uH - 0.035, uH, y);
  float scan = smoothstep(0.965, 1.0, sin(y * 5.0 - uTime * 2.0) * 0.5 + 0.5) * 0.06;
  float over = smoothstep(uTakt - 0.02, uTakt + 0.05, y) * uHotAmt;
  vec3 col = mix(uColor, uHot, over);
  float k = 0.018 + 0.62 * fres + 0.5 * ticks + 0.55 * top + scan + uPulse * 0.35;
  gl_FragColor = vec4(col * k, 1.0);
}
`

/** 내부 액상 컬럼: 정면은 밀도감, 위로 갈수록 밝아지는 그라디언트. */
const coreFrag = /* glsl */ `
${gaugeHead}
void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndv = abs(dot(N, V));
  float y = vWorld.y;
  float yn = clamp((y - uBase) / max(uH - uBase, 0.001), 0.0, 1.0);
  float body = (0.05 + 0.22 * yn * yn) * (0.35 + 0.65 * ndv);
  float meniscus = smoothstep(uH - 0.22, uH, y) * 0.22;
  float stria = smoothstep(0.8, 1.0, sin(y * 38.0 - uTime * 1.2) * 0.5 + 0.5) * 0.025;
  float over = smoothstep(uTakt - 0.02, uTakt + 0.05, y) * uHotAmt;
  vec3 col = mix(uColor, uHot, over);
  float k = (body + meniscus + stria) * mix(1.0, 1.2, over) + uPulse * 0.25;
  gl_FragColor = vec4(col * k, 1.0);
}
`

/** 상단 메니스커스 캡: 라운드 사각 SDF 로 얇은 발광 테두리 + 옅은 면. */
const capFrag = /* glsl */ `
${gaugeHead}
uniform float uHalf;
uniform float uAlpha;
float sdRound(vec2 p, float b, float r) { vec2 q = abs(p) - vec2(b - r); return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  float d = sdRound(vLocal.xy, uHalf, 0.08);
  float rim = exp(-abs(d) * 90.0);
  float fill = (1.0 - smoothstep(-0.004, 0.004, d)) * (0.1 + 0.12 * smoothstep(-uHalf, 0.0, d));
  float halo = exp(-max(d, 0.0) * 30.0) * step(0.0, d) * 0.12;
  float over = step(uTakt + 0.02, uH) * uHotAmt;
  vec3 col = mix(uColor, uHot, over);
  float k = (rim * 1.25 + fill + halo) * (1.0 + uPulse * 1.2);
  gl_FragColor = vec4(col * k * uAlpha, 1.0);
}
`

export type GaugeUniforms = {
  uColor: { value: THREE_NS.Color }
  uHot: { value: THREE_NS.Color }
  uH: { value: number }
  uTakt: { value: number }
  uHotAmt: { value: number }
  uTime: { value: number }
  uPulse: { value: number }
  uBase: { value: number }
  uHalf: { value: number }
  uAlpha: { value: number }
}

export type Tower = {
  group: THREE_NS.Group
  shell: THREE_NS.Mesh
  core: THREE_NS.Mesh
  cap: THREE_NS.Mesh
  uni: GaugeUniforms
}

export type GaugeGeo = { shell: THREE_NS.BufferGeometry; core: THREE_NS.BufferGeometry; cap: THREE_NS.BufferGeometry }

export function buildGaugeGeometry(THREE: Three): GaugeGeo {
  const half = TOWER_W / 2
  const cap = new THREE.PlaneGeometry(TOWER_W + 0.16, TOWER_W + 0.16)
  return { shell: prismSides(THREE, half, 0.08), core: prismSides(THREE, half - 0.075, 0.05), cap }
}

const additive = (THREE: Three) => ({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})

export function buildTower(THREE: Three, x: number, color: number, geo: GaugeGeo): Tower {
  const group = new THREE.Group()
  group.position.set(x, 0, 0)
  const uni: GaugeUniforms = {
    uColor: { value: new THREE.Color(color) },
    uHot: { value: new THREE.Color(COL.red) },
    uH: { value: 1 },
    uTakt: { value: 2 },
    uHotAmt: { value: 0 },
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uBase: { value: BENCH_TOP },
    uHalf: { value: TOWER_W / 2 },
    uAlpha: { value: 1 },
  }
  const core = new THREE.Mesh(geo.core, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: gaugeVert, fragmentShader: coreFrag, ...additive(THREE) }))
  core.renderOrder = 2
  const shell = new THREE.Mesh(geo.shell, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: gaugeVert, fragmentShader: shellFrag, ...additive(THREE) }))
  shell.renderOrder = 3
  const cap = new THREE.Mesh(geo.cap, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: gaugeVert, fragmentShader: capFrag, ...additive(THREE), side: THREE.DoubleSide }))
  cap.rotation.x = -Math.PI / 2
  cap.renderOrder = 4
  group.add(core, shell, cap)
  return { group, shell, core, cap, uni }
}

/** 개선 전 높이의 고스트 유리관(붉은 프레넬 림 + 상단 테두리). */
export function buildGhost(THREE: Three, geo: GaugeGeo) {
  const uni = {
    uColor: { value: hdr(THREE, COL.red, 1.4) },
    uH: { value: 1 },
    uAlpha: { value: 0 },
    uBase: { value: BENCH_TOP },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: gaugeVert,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uH; uniform float uAlpha; uniform float uBase;
      varying vec3 vWorld; varying vec3 vN; varying vec3 vLocal;
      void main(){
        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(clamp(1.0 - abs(dot(normalize(vN), V)), 0.0, 1.0), 3.0);
        float y = vWorld.y;
        float top = smoothstep(uH - 0.03, uH, y);
        float dash = step(0.5, fract(y * 6.0));
        float k = (0.5 * fres * (0.4 + 0.6 * dash) + 0.9 * top) * step(uBase, y);
        gl_FragColor = vec4(uColor * k * uAlpha, 1.0);
      }`,
    ...additive(THREE),
  })
  const mesh = new THREE.Mesh(geo.shell, mat)
  mesh.renderOrder = 2
  return { mesh, uni }
}

// ───────────────────────── bottleneck plane ─────────────────────────

const planeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float ex = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  float e = clamp(abs(vUv.y - 0.5) * 2.0, 0.0, 1.0);
  float ez = 1.0 - e;
  float sweep = smoothstep(0.96, 1.0, sin(vUv.x * 90.0 - uTime * 2.4) * 0.5 + 0.5) * 0.03;
  float e3 = e * e * e;
  float rim = e3 * e3 * 0.55;
  float k = (0.05 + 0.05 * ez + sweep + rim) * ex;
  gl_FragColor = vec4(uColor * k * uAlpha, 1.0);
}
`

export function buildPlane(THREE: Three, width: number, depth: number) {
  const uni = {
    uColor: { value: new THREE.Color(COL.red) },
    uTime: { value: 0 },
    uAlpha: { value: 1 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: planeFrag,
    ...additive(THREE),
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 5
  // 전/후면 엣지: 얇은 발광 바(1px GL 라인 대신)
  const lineMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.red, 2.4), ...additive(THREE) })
  const bar = new THREE.BoxGeometry(width * 0.94, 0.012, 0.012)
  const bars = new THREE.InstancedMesh(bar, lineMat, 2)
  const m = new THREE.Matrix4()
  m.makeTranslation(0, 0, depth / 2)
  bars.setMatrixAt(0, m)
  m.makeTranslation(0, 0, -depth / 2)
  bars.setMatrixAt(1, m)
  bars.renderOrder = 5
  const group = new THREE.Group()
  group.add(mesh, bars)
  return { group, uni, lineMat }
}

/** 점선 takt 기준선 — 대시 텍스처를 입힌 얇은 띠(1 draw). */
export function buildTaktLine(THREE: Three, width: number, z: number, y: number) {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 4
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 30, 4)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(width / 0.14, 1)
  const mat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COL.teal, 1.3),
    map: tex,
    opacity: 0.55,
    ...additive(THREE),
    side: THREE.DoubleSide,
  })
  const line = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.014), mat)
  line.position.set(0, y, z)
  return { line, mat }
}

// ───────────────────────── floor ─────────────────────────

const floorFrag = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uBase;
uniform vec3 uGrid;
varying vec3 vW;
float grid(vec2 p, float s, float w) {
  vec2 q = p / s;
  vec2 fw = fwidth(q);
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fw * w, vec2(1e-4));
  float l = 1.0 - min(min(g.x, g.y), 1.0);
  // 멀어져 격자가 촘촘해지면 페이드(모아레 방지)
  return l * (1.0 - smoothstep(0.08, 0.3, max(fw.x, fw.y)));
}
void main() {
  vec2 p = vW.xz;
  float r = length((p - vec2(0.0, 0.6)) * vec2(0.42, 1.0));
  float near = 1.0 - smoothstep(1.5, 9.5, r);
  float minor = grid(p, 0.3875, 1.0);
  float major = grid(p - vec2(0.775, 0.0), 1.55, 1.1);
  vec3 col = mix(uBg, uBase, near);
  col += uGrid * (minor * 0.022 + major * 0.06) * near;
  gl_FragColor = vec4(col, 1.0);
}
`

export function buildFloor(THREE: Three, bg: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: new THREE.Color(bg) },
      uBase: { value: new THREE.Color(0x0b0f12) },
      uGrid: { value: new THREE.Color(COL.blue) },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: floorFrag,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat)
  m.rotation.x = -Math.PI / 2
  m.renderOrder = 0
  return m
}

/** 접지: 스테이션 아래 소프트 그림자 + 게이지 색으로 바닥에 번지는 빛 웅덩이. */
export function buildGrounding(THREE: Three, tex: THREE_NS.Texture, length: number) {
  const group = new THREE.Group()
  const shMat = new THREE.MeshBasicMaterial({ color: 0x000000, map: tex, transparent: true, opacity: 0.85, depthWrite: false })
  const quad = new THREE.PlaneGeometry(1, 1)
  quad.rotateX(-Math.PI / 2)
  const shadows = new THREE.InstancedMesh(quad, shMat, STATIONS + 1)
  const m = new THREE.Matrix4()
  const s = new THREE.Matrix4()
  for (let i = 0; i < STATIONS; i++) {
    m.makeTranslation(stationX(i), 0.002, -0.08)
    s.makeScale(2.0, 1, 1.9)
    shadows.setMatrixAt(i, m.multiply(s))
  }
  m.makeTranslation(0, 0.002, CONV_Z)
  s.makeScale(length + 1.2, 1, 1.1)
  shadows.setMatrixAt(STATIONS, m.multiply(s))
  shadows.renderOrder = 1
  group.add(shadows)

  const poolMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex, ...additive(THREE) })
  const pools = new THREE.InstancedMesh(quad, poolMat, STATIONS)
  for (let i = 0; i < STATIONS; i++) {
    m.makeTranslation(stationX(i), 0.004, -0.15)
    s.makeScale(2.9, 1, 2.6)
    pools.setMatrixAt(i, m.multiply(s))
    pools.setColorAt(i, new THREE.Color(0))
  }
  pools.renderOrder = 1
  group.add(pools)
  return { group, pools }
}

// ───────────────────────── station benches ─────────────────────────

/** 소형 배터리팩 라인 작업대: 라운드 하우징 + 상판 + 게이지 칼라 + 볼트 + 패널 심. 9 대 인스턴싱. */
export function buildBenches(THREE: Three, kit: Kit) {
  const RB = kit.RoundedBox
  const parts: THREE_NS.BufferGeometry[] = []
  const add = (g: THREE_NS.BufferGeometry, hex: number, x: number, y: number, z: number) => {
    g.translate(x, y, z)
    parts.push(paint(THREE, g, hex))
  }
  const W = 1.18
  const D = 0.98
  const Z0 = -0.12
  add(new RB(W, BENCH_TOP - 0.03, D, 3, 0.035), 0x252c32, 0, (BENCH_TOP - 0.03) / 2, Z0)
  add(new RB(W - 0.04, 0.03, D - 0.04, 2, 0.012), 0x2c343a, 0, BENCH_TOP - 0.015, Z0)
  // 전면 패널 심(두 짝 도어)
  add(new THREE.BoxGeometry(0.006, BENCH_TOP - 0.09, 0.006), 0x07090a, 0, (BENCH_TOP - 0.03) / 2, Z0 + D / 2 + 0.001)
  add(new THREE.BoxGeometry(W - 0.14, 0.006, 0.006), 0x07090a, 0, 0.03, Z0 + D / 2 + 0.001)
  // 게이지 베이스 칼라
  add(squareFrame(THREE, TOWER_W / 2 + 0.07, TOWER_W / 2 + 0.004, 0.07, 0.12), 0x3d474e, 0, BENCH_TOP - 0.005, 0)
  // 상판 볼트
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 10), 0x59636a, sx * (W / 2 - 0.07), BENCH_TOP + 0.004, Z0 + sz * (D / 2 - 0.07))
  // 레벨링 풋
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.035, 0.04, 0.03, 12), 0x0d1012, sx * (W / 2 - 0.08), 0.015, Z0 + sz * (D / 2 - 0.08))
  const geo = kit.merge(parts)!
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.44 })
  const mesh = new THREE.InstancedMesh(geo, mat, STATIONS)
  const m = new THREE.Matrix4()
  for (let i = 0; i < STATIONS; i++) {
    m.makeTranslation(stationX(i), 0, 0)
    mesh.setMatrixAt(i, m)
  }

  // 전면 상태 라이트 바(인스턴스 컬러로 병목/균형 표시)
  const lbGeo = new RB(0.5, 0.016, 0.01, 1, 0.004)
  lbGeo.translate(0.22, BENCH_TOP - 0.06, Z0 + D / 2 + 0.004)
  const lbMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const lights = new THREE.InstancedMesh(lbGeo, lbMat, STATIONS)
  for (let i = 0; i < STATIONS; i++) {
    m.makeTranslation(stationX(i), 0, 0)
    lights.setMatrixAt(i, m)
    lights.setColorAt(i, new THREE.Color(COL.teal))
  }
  return { mesh, lights }
}

// ───────────────────────── conveyor ─────────────────────────

export function buildConveyor(THREE: Three, kit: Kit, length: number) {
  const RB = kit.RoundedBox
  const group = new THREE.Group()
  const half = length / 2
  const BW = 0.5
  // 알루미늄 프레임(사이드 레일 + 다리 + 엔드 롤러 하우징) — 단일 머지
  const alu: THREE_NS.BufferGeometry[] = []
  const add = (g: THREE_NS.BufferGeometry, x: number, y: number, z: number) => {
    g.translate(x, y, z)
    alu.push(bare(g))
  }
  for (const sz of [-1, 1]) {
    add(new RB(length, 0.075, 0.045, 2, 0.012), 0, BELT_TOP - 0.02, CONV_Z + sz * (BW / 2 + 0.03))
    add(new RB(length, 0.02, 0.03, 1, 0.006), 0, BELT_TOP - 0.11, CONV_Z + sz * (BW / 2 + 0.02))
  }
  for (let i = -1; i < STATIONS; i++) {
    const x = stationX(i) + SPACING / 2
    if (Math.abs(x) > half - 0.1) continue
    for (const sz of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.022, 0.022, BELT_TOP - 0.05, 10), x, (BELT_TOP - 0.05) / 2, CONV_Z + sz * (BW / 2 + 0.02))
      add(new THREE.CylinderGeometry(0.04, 0.045, 0.02, 12), x, 0.01, CONV_Z + sz * (BW / 2 + 0.02))
    }
  }
  for (const sx of [-1, 1]) {
    const roll = new THREE.CylinderGeometry(0.05, 0.05, BW + 0.02, 18)
    roll.rotateX(Math.PI / 2)
    add(roll, sx * (half - 0.02), BELT_TOP - 0.05, CONV_Z)
  }
  const frame = new THREE.Mesh(kit.merge(alu)!, new THREE.MeshStandardMaterial({ color: 0x8a949b, metalness: 0.85, roughness: 0.32 }))
  group.add(frame)

  // 벨트 — 슬랫 텍스처를 t 로 스크롤
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 8
  const g = c.getContext('2d')!
  g.fillStyle = '#1b2125'
  g.fillRect(0, 0, 32, 8)
  g.fillStyle = '#0a0d0f'
  g.fillRect(0, 0, 3, 8)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.repeat.set(length / 0.11, 1)
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(length - 0.04, 0.02, BW),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, metalness: 0.2, roughness: 0.7 }),
  )
  belt.position.set(0, BELT_TOP - 0.01, CONV_Z)
  group.add(belt)

  // 레일 상단 발광 트림(얇은 바, 2 인스턴스)
  const railMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.blue, 0.9), ...additive(THREE) })
  const trims = new THREE.InstancedMesh(new THREE.BoxGeometry(length - 0.1, 0.006, 0.008), railMat, 2)
  const m = new THREE.Matrix4()
  for (const [k, sz] of [
    [0, -1],
    [1, 1],
  ]) {
    m.makeTranslation(0, BELT_TOP + 0.019, CONV_Z + sz * (BW / 2 + 0.03))
    trims.setMatrixAt(k, m)
  }
  group.add(trims)
  return { group, railMat, beltTex: tex }
}

// ───────────────────────── products: small battery packs ─────────────────────────

/** 소형 배터리팩: 수축튜브 바디 + 상단 라벨 + 보호회로(PCB) 엔드 + 니켈 탭 + 커넥터. 정점색 머지 1 draw. */
export function buildProducts(THREE: Three, kit: Kit, count: number) {
  const RB = kit.RoundedBox
  const parts: THREE_NS.BufferGeometry[] = []
  const add = (g: THREE_NS.BufferGeometry, hex: number, x: number, y: number, z: number) => {
    g.translate(x, y, z)
    parts.push(paint(THREE, g, hex))
  }
  const L = 0.4
  const H = 0.12
  const D = 0.27
  add(new RB(L, H, D, 3, 0.045), 0x24525f, 0, H / 2, 0)
  // 셀 경계(두 셀 병렬) — 얕은 홈
  add(new THREE.BoxGeometry(L - 0.06, 0.004, 0.008), 0x10262e, -0.01, H + 0.0005, 0)
  // 라벨
  add(new RB(0.18, 0.006, 0.17, 1, 0.003), 0xb9c0c4, -0.06, H + 0.001, 0)
  add(new THREE.BoxGeometry(0.12, 0.002, 0.02), 0x2b3236, -0.07, H + 0.0045, 0.04)
  add(new THREE.BoxGeometry(0.08, 0.002, 0.012), 0x2b3236, -0.09, H + 0.0045, -0.01)
  // PCB 엔드 + 니켈 탭
  add(new RB(0.03, H * 0.82, D * 0.86, 1, 0.006), 0x22332d, L / 2 + 0.012, H / 2, 0)
  add(new THREE.BoxGeometry(0.008, H * 0.5, 0.06), 0xc9ced1, L / 2 + 0.03, H / 2, -0.06)
  add(new THREE.BoxGeometry(0.008, H * 0.5, 0.06), 0xc9ced1, L / 2 + 0.03, H / 2, 0.06)
  // 커넥터
  add(new RB(0.04, 0.035, 0.07, 1, 0.006), 0xd7d7d7, L / 2 + 0.05, H * 0.55, 0)
  const geo = kit.merge(parts)!
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.25, roughness: 0.38 })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.frustumCulled = false
  // 상태 LED(검사 통과 표시 — 흐름이 빨라지면 밝아짐)
  const ledGeo = new THREE.BoxGeometry(0.03, 0.006, 0.03)
  ledGeo.translate(0.1, H + 0.003, -0.07)
  const stripMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.teal, 2.4) })
  const strip = new THREE.InstancedMesh(ledGeo, stripMat, count)
  strip.frustumCulled = false
  return { mesh, strip, mat, stripMat }
}

// ───────────────────────── jig ─────────────────────────

/**
 * 지그/픽스처: 아노다이징 상판 + 크롬 가이드 포스트/부싱 + (커팅: 공압 실린더 + 프레임 블레이드 / 검사: 프로브 헤드 + 포고핀 + 케이블).
 * 그룹 원점 = 지그가 앉는 면(타워 상단).
 */
export function buildJig(THREE: Three, kind: 'cut' | 'test', kit: Kit) {
  const RB = kit.RoundedBox
  const group = new THREE.Group()
  const W = TOWER_W + 0.34
  const P = W / 2 - 0.08
  const dark: THREE_NS.BufferGeometry[] = []
  const chrome: THREE_NS.BufferGeometry[] = []
  const glow: THREE_NS.BufferGeometry[] = []
  const put = (arr: THREE_NS.BufferGeometry[], g: THREE_NS.BufferGeometry, x: number, y: number, z: number) => {
    g.translate(x, y, z)
    arr.push(bare(g))
  }
  // 상판 + 부싱 + 포스트
  put(dark, new RB(W, 0.07, W, 3, 0.022), 0, 0.46, 0)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      put(chrome, new THREE.CylinderGeometry(0.02, 0.02, 0.56, 12), sx * P, 0.28, sz * P)
      put(dark, new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16), sx * P, 0.46, sz * P)
      put(chrome, new THREE.CylinderGeometry(0.032, 0.032, 0.015, 12), sx * P, 0.0075, sz * P)
    }
  // 엣지 트림(전면/후면 발광 바) — runtime edgeMat
  const trim: THREE_NS.BufferGeometry[] = []
  for (const sz of [-1, 1]) put(trim, new THREE.BoxGeometry(W - 0.08, 0.008, 0.006), 0, 0.46, sz * (W / 2 + 0.002))

  if (kind === 'cut') {
    // 공압 실린더
    put(dark, new RB(0.32, 0.05, 0.32, 2, 0.012), 0, 0.52, 0)
    put(chrome, new THREE.CylinderGeometry(0.1, 0.1, 0.26, 24), 0, 0.67, 0)
    put(dark, new RB(0.28, 0.05, 0.28, 2, 0.012), 0, 0.82, 0)
    put(chrome, new THREE.CylinderGeometry(0.028, 0.028, 0.36, 12), 0, 0.25, 0)
    put(dark, new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), 0.12, 0.88, 0.1)
    // 블레이드 홀더 프레임 + 발광 블레이드 엣지(타워를 감싸는 사각 날)
    put(dark, squareFrame(THREE, TOWER_W / 2 + 0.09, TOWER_W / 2 + 0.03, 0.05, 0.12), 0, 0.03, 0)
    put(dark, new RB(0.62, 0.04, 0.08, 1, 0.01), 0, 0.09, 0)
    put(dark, new RB(0.08, 0.04, 0.62, 1, 0.01), 0, 0.09, 0)
    put(glow, squareFrame(THREE, TOWER_W / 2 + 0.03, TOWER_W / 2 + 0.012, 0.012, 0.1), 0, 0.012, 0)
  } else {
    // 프로브 헤드 + 포고핀 어레이 + 커넥터 + 케이블
    put(dark, new RB(0.72, 0.08, 0.52, 2, 0.018), 0, 0.28, 0)
    put(chrome, new THREE.CylinderGeometry(0.028, 0.028, 0.16, 12), 0, 0.38, 0)
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < 3; j++) {
        const x = -0.24 + i * 0.12
        const z = -0.14 + j * 0.14
        put(chrome, new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), x, 0.14, z)
        put(glow, new THREE.CylinderGeometry(0.016, 0.008, 0.03, 8), x, 0.025, z)
      }
    put(dark, new RB(0.18, 0.07, 0.12, 1, 0.012), 0.32, 0.53, -0.3)
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.32, 0.56, -0.36),
      new THREE.Vector3(0.36, 0.72, -0.62),
      new THREE.Vector3(0.62, 0.86, -0.82),
      new THREE.Vector3(0.95, 1.05, -0.95),
    ])
    put(dark, new THREE.TubeGeometry(curve, 24, 0.018, 8, false), 0, 0, 0)
  }

  const darkMat = new THREE.MeshStandardMaterial({ color: 0x343c43, metalness: 0.7, roughness: 0.36 })
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd2d7da, metalness: 1.0, roughness: 0.16 })
  group.add(new THREE.Mesh(kit.merge(dark)!, darkMat), new THREE.Mesh(kit.merge(chrome)!, chromeMat))

  const glowMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 3.0), ...additive(THREE) })
  group.add(new THREE.Mesh(kit.merge(glow)!, glowMat))
  const edgeMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 2.6), ...additive(THREE) })
  group.add(new THREE.Mesh(kit.merge(trim)!, edgeMat))
  return { group, glowMat, edgeMat }
}

/** 절삭 링(커터): 타워를 감싸는 라운드 사각 발광 밴드 + 소프트 방사 디스크. */
export function buildCutter(THREE: Three, tex: THREE_NS.Texture) {
  const s = TOWER_W / 2
  const ringShape = roundedSquare(THREE, s + 0.035, 0.11)
  ringShape.holes.push(roundedSquare(THREE, s + 0.012, 0.09))
  const ringGeo = new THREE.ShapeGeometry(ringShape, 6)
  ringGeo.rotateX(-Math.PI / 2)
  const mat = new THREE.MeshBasicMaterial({ color: hdr(THREE, 0xffd2a0, 5), ...additive(THREE), side: THREE.DoubleSide })
  const ring = new THREE.Mesh(ringGeo, mat)
  ring.position.y = 0.004
  const discMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COL.amber, 1.6),
    map: tex,
    opacity: 0.5,
    ...additive(THREE),
    side: THREE.DoubleSide,
  })
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(s * 4.2, s * 4.2), discMat)
  disc.rotation.x = -Math.PI / 2
  const g = new THREE.Group()
  g.add(ring, disc)
  g.renderOrder = 6
  return { group: g, mat, discMat }
}

// ───────────────────────── sparks ─────────────────────────

const sparkVert = /* glsl */ `
attribute vec4 aSeed;
uniform float uT;
uniform vec2 uWin;
uniform vec2 uH;
uniform float uHalf;
uniform float uScale;
varying float vLife;
varying float vSeed;
float ease(float x){ x = clamp(x,0.0,1.0); return x*x*(3.0-2.0*x); }
void main() {
  float tb = uWin.x + (uWin.y - uWin.x) * aSeed.x;
  float life = 0.45 + 0.75 * aSeed.y;
  float age = uT - tb;
  vLife = age / life;
  vSeed = aSeed.w;
  if (age < 0.0 || age > life) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  float cy = mix(uH.x, uH.y, ease((tb - uWin.x) / (uWin.y - uWin.x)));
  float a = aSeed.z * 6.2831853;
  vec2 d = vec2(cos(a), sin(a));
  vec2 sq = d / max(abs(d.x), abs(d.y)) * uHalf;
  vec3 o = vec3(sq.x, cy, sq.y);
  vec3 v = vec3(d.x, 0.0, d.y) * (0.9 + 2.6 * aSeed.w) + vec3(0.0, 0.4 + 1.8 * aSeed.y, 0.0);
  vec3 p = o + v * age + vec3(0.0, -7.5, 0.0) * age * age * 0.5;
  p.y = max(p.y, 0.02);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (1.0 - vLife) * (0.025 + 0.06 * aSeed.w) * uScale / -mv.z;
}
`

const sparkFrag = /* glsl */ `
varying float vLife;
varying float vSeed;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float s = smoothstep(0.5, 0.0, d);
  vec3 hot = vec3(4.0, 3.2, 2.2);
  vec3 warm = vec3(2.6, 0.95, 0.25);
  vec3 col = mix(hot, warm, smoothstep(0.0, 0.6, vLife + vSeed * 0.2));
  gl_FragColor = vec4(col * s * (1.0 - vLife * 0.7), 1.0);
}
`

export function buildSparks(THREE: Three, count: number, seed: number) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const s = new Float32Array(count * 4)
  let r = seed
  const rnd = () => {
    r = (r * 16807) % 2147483647
    return (r - 1) / 2147483646
  }
  for (let i = 0; i < count * 4; i++) s[i] = rnd()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aSeed', new THREE.BufferAttribute(s, 4))
  const uni = {
    uT: { value: 0 },
    uWin: { value: new THREE.Vector2(0, 1) },
    uH: { value: new THREE.Vector2(1, 0) },
    uHalf: { value: TOWER_W / 2 },
    uScale: { value: 300 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: sparkVert,
    fragmentShader: sparkFrag,
    ...additive(THREE),
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  pts.renderOrder = 6
  return { points: pts, uni }
}

// ───────────────────────── ambient dust ─────────────────────────

export function buildDust(THREE: Three, count: number) {
  const g = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  let r = 7
  const rnd = () => {
    r = (r * 16807) % 2147483647
    return (r - 1) / 2147483646
  }
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rnd() - 0.5) * 26
    pos[i * 3 + 1] = rnd() * 7
    pos[i * 3 + 2] = (rnd() - 0.5) * 14
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const uni = { uT: { value: 0 }, uScale: { value: 300 } }
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: /* glsl */ `
      uniform float uT; uniform float uScale; varying float vA;
      void main(){
        vec3 p = position;
        float ph = position.x * 1.7 + position.z * 2.3;
        p.y = mod(p.y + uT * 0.12, 7.0);
        p.x += sin(uT * 0.3 + ph) * 0.3;
        vA = 0.25 + 0.5 * (0.5 + 0.5 * sin(uT * 1.3 + ph * 3.0));
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.024 * uScale / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; float s = smoothstep(0.5,0.0,d); gl_FragColor = vec4(vec3(0.35,0.75,0.7) * vA * s * s, 1.0); }`,
    ...additive(THREE),
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  return { points: pts, uni }
}
