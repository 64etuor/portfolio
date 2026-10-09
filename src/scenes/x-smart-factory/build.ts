import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import { canvasFont } from '../_host/fonts'
import { BENCH_X, COLORS, LIFT, LINES, PANELS, T, TABLET_X } from './data'
import { buildFigures, type Figures, type OperatorSpec } from './figures'
import { type Addons, Kit, paperTexture, softShadowTexture } from './props'

// 지오메트리/머티리얼 빌더. 물리 바닥(클레이·금속 실물 — 병합 정적 지오메트리) + 홀로그램 트윈(셰이더로 스캔·부상).
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

/** 화면 공간 굵은 선(쿼드 확장) — aA/aB 끝점, aQ=(끝 선택 0/1, 옆 -1/1). 폭은 CSS px × uDpr. */
const GLSL_FAT = /* glsl */ `
uniform vec2 uRes;
uniform float uDpr;
attribute vec3 aA; attribute vec3 aB; attribute vec2 aQ;
vec4 fatClip(vec3 a, vec3 b, float wcss){
  vec4 ca = projectionMatrix*viewMatrix*vec4(a,1.);
  vec4 cb = projectionMatrix*viewMatrix*vec4(b,1.);
  vec2 dd = (cb.xy/cb.w - ca.xy/ca.w)*uRes;
  float l = length(dd);
  vec2 dir = l > 1e-4 ? dd/l : vec2(1.,0.);
  vec2 nrm = vec2(-dir.y, dir.x);
  vec4 c = aQ.x < .5 ? ca : cb;
  vec2 off = (nrm*aQ.y + dir*(aQ.x*2. - 1.)*0.6)*wcss*uDpr;
  c.xy += off/uRes*c.w;
  return c;
}
`

/* ─────────────── 레이아웃 ─────────────── */

export interface Box {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
  twin: boolean
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
  papers: { x: number; y: number; z: number; ry: number }[]
  labels: Src[]
  tablets: (Src & { ry: number })[]
  operators: OperatorSpec[]
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
const RACK_Z = -4.45
const RACK_X = [5.0, 7.6]
const SHELF_Y = [0.12, 0.92, 1.72]
const TOP = 0.84

/** 트윈(데이터) 레이아웃 — 박스 엣지가 홀로그램이 된다. 실물은 buildPhysical 이 같은 좌표로 정교하게 만든다. */
function makeLayout(): Layout {
  const rnd = mulberry(20210801)
  const boxes: Box[] = []
  const add = (x: number, y0: number, z: number, w: number, h: number, d: number, twin = true) => boxes.push({ x, y: y0 + h / 2, z, w, h, d, twin })
  const L: Layout = {
    boxes,
    papers: [],
    labels: [],
    tablets: [],
    operators: [],
    pallets: [],
    rackA: { x: 0, top: 0, z: 0, count: 0 },
  }

  let seed = 3
  for (const line of LINES) {
    const z = line.z
    for (const bx of BENCH_X) {
      add(bx, 0, z, 1.6, 0.78, 0.72)
      add(bx, 0.78, z, 1.72, 0.06, 0.86)
      if (line.kind === 'battery') {
        add(bx - 0.295, TOP, z + 0.08, 0.76, 0.2, 0.37)
        add(bx + 0.45, TOP, z, 0.5, 0.2, 0.42)
      } else if (line.kind === 'filter') {
        add(bx - 0.2, TOP, z + 0.05, 0.7, 0.04, 0.45)
        for (let i = 0; i < 4; i++) add(bx - 0.45 + i * 0.17, TOP + 0.04, z + 0.05, 0.12, 0.32, 0.12)
        add(bx + 0.5, TOP, z - 0.1, 0.36, 0.26, 0.3)
      } else {
        add(bx, TOP, z, 1.5, 0.72, 0.05)
        add(bx - 0.1, TOP, z + 0.24, 1.0, 0.03, 0.06)
      }
      // 종이 기록: 작업물과 겹치지 않는 앞쪽 빈자리(배터리 라인은 가로로)
      const jr = (rnd() - 0.5) * 0.4
      if (line.kind === 'battery') L.papers.push({ x: bx + 0.45, y: TOP + 0.004, z: z + 0.32, ry: Math.PI / 2 + jr * 0.4 })
      else if (line.kind === 'filter') L.papers.push({ x: bx - 0.7, y: TOP + 0.004, z: z + 0.27, ry: jr * 0.5 })
      else L.papers.push({ x: bx + 0.58, y: TOP + 0.004, z: z + 0.27, ry: jr })
      const jx = bx + (rnd() - 0.5) * 0.24
      seed += 7
      if (line.kind === 'battery') L.operators.push({ x: jx, z: z - 0.55, yaw: 0, pose: 'stand', seed })
      else if (line.kind === 'filter') L.operators.push({ x: jx, z: z - 0.62, yaw: 0, pose: 'sit', seed })
      else L.operators.push({ x: jx, z: z + 0.56, yaw: Math.PI, pose: 'reach', seed })
    }
    // 라인 끝 태블릿 스탠드
    add(TABLET_X, 0, z, 0.06, 1.1, 0.06)
    add(TABLET_X, 0, z, 0.4, 0.04, 0.4)
    L.tablets.push({ x: TABLET_X + 0.04, y: 1.28, z: z + 0.04, kind: 'tab', ry: Math.PI * 0.28 })
  }

  // 창고 — 랙 2기(뒤쪽 벽)
  RACK_X.forEach((rx, ri) => {
    for (const dx of [-1.2, 1.2]) for (const dz of [-0.38, 0.38]) add(rx + dx, 0, RACK_Z + dz, 0.06, 2.55, 0.06)
    let bins = 0
    for (const sy of SHELF_Y) {
      add(rx, sy, RACK_Z, 2.46, 0.05, 0.8)
      for (let b = 0; b < 3; b++) {
        const bx = rx - 0.78 + b * 0.78
        const isBin = (b + Math.round(sy * 3) + ri) % 3 !== 0
        if (isBin) add(bx, sy + 0.05, RACK_Z, 0.66, 0.44, 0.62)
        else add(bx, sy + 0.05, RACK_Z, 0.6, 0.5, 0.6)
        bins++
        L.labels.push({ x: bx + 0.12, y: sy + 0.28, z: RACK_Z + 0.322, kind: 'bc' })
      }
    }
    if (ri === 0) L.rackA = { x: rx, top: 2.6, z: RACK_Z, count: bins }
  })

  // 팔레트 + 적재(트윈에선 층 단위 블록)
  PALLET_POS.forEach(([px, pz], i) => {
    add(px, 0, pz, 1.15, 0.14, 1.15)
    const layers = PALLET_LAYERS[i]
    const ch = 0.38
    for (let l = 0; l < layers; l++) add(px, 0.14 + l * ch, pz, 1.04, ch - 0.03, 1.04)
    const top = 0.14 + layers * ch
    L.labels.push({ x: px + 0.27, y: top - ch / 2, z: pz + 0.528, kind: 'bc' })
    L.pallets.push({ x: px, top, z: pz, count: layers * 4 })
    if (i === 1 || i === 4) L.papers.push({ x: px - 0.1, y: top - 0.02, z: pz + 0.05, ry: 0.3 })
  })

  return L
}

/* ─────────────── 텍스처 ─────────────── */

function barcodeTexture(TH: Three) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 116
  const g = c.getContext('2d')!
  g.fillStyle = '#f4f2ec'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = '#111111'
  const rnd = mulberry(417)
  let x = 16
  while (x < 240) {
    const w = 1.5 + Math.floor(rnd() * 4) * 1.5
    if (rnd() > 0.4) g.fillRect(x, 10, w, 72)
    x += w + 1.5 + Math.floor(rnd() * 2) * 1.5
  }
  g.font = canvasFont(500, 19, 'mono')
  g.fillText('8 801234 041721', 24, 104)
  const tex = new TH.CanvasTexture(c)
  tex.colorSpace = TH.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function tabletTexture(TH: Three) {
  const c = document.createElement('canvas')
  c.width = 320
  c.height = 224
  const g = c.getContext('2d')!
  g.fillStyle = '#0b161b'
  g.fillRect(0, 0, c.width, c.height)
  g.fillStyle = 'rgba(255,255,255,0.08)'
  g.fillRect(0, 0, c.width, 26)
  g.fillStyle = '#ffffff'
  g.fillRect(16, 9, 70, 8)
  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.fillRect(c.width - 52, 10, 36, 6)
  for (let i = 0; i < 5; i++) {
    const y = 44 + i * 30
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fillRect(16, y, 52, 7)
    g.fillStyle = 'rgba(255,255,255,0.14)'
    g.fillRect(84, y, 220, 7)
    g.fillStyle = '#ffffff'
    g.fillRect(84, y, 50 + ((i * 53) % 150), 7)
    g.fillStyle = 'rgba(255,255,255,0.3)'
    g.fillRect(16, y + 13, 30, 3)
  }
  const tex = new TH.CanvasTexture(c)
  tex.colorSpace = TH.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* ─────────────── 굵은 선 지오메트리 ─────────────── */

/** segs = [ax,ay,az,bx,by,bz]*n. extra 는 세그먼트당 값(size 개) — 4 버텍스에 복제. */
function fatGeometry(TH: Three, segs: number[], extra: Record<string, { size: number; data: number[] }> = {}) {
  const n = segs.length / 6
  const pos = new Float32Array(n * 12)
  const aA = new Float32Array(n * 12)
  const aB = new Float32Array(n * 12)
  const aQ = new Float32Array(n * 8)
  const idx = new Uint32Array(n * 6)
  const ex = Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, new Float32Array(n * 4 * v.size)]))
  const Q = [0, -1, 0, 1, 1, -1, 1, 1]
  for (let s = 0; s < n; s++) {
    for (let k = 0; k < 4; k++) {
      const v = s * 4 + k
      for (let j = 0; j < 3; j++) {
        aA[v * 3 + j] = segs[s * 6 + j]
        aB[v * 3 + j] = segs[s * 6 + 3 + j]
        pos[v * 3 + j] = segs[s * 6 + (k < 2 ? 0 : 3) + j]
      }
      aQ[v * 2] = Q[k * 2]
      aQ[v * 2 + 1] = Q[k * 2 + 1]
      for (const [key, e] of Object.entries(extra)) for (let j = 0; j < e.size; j++) ex[key][v * e.size + j] = e.data[s * e.size + j]
    }
    idx.set([s * 4, s * 4 + 1, s * 4 + 2, s * 4 + 2, s * 4 + 1, s * 4 + 3], s * 6)
  }
  const g = new TH.BufferGeometry()
  g.setAttribute('position', new TH.BufferAttribute(pos, 3))
  g.setAttribute('aA', new TH.BufferAttribute(aA, 3))
  g.setAttribute('aB', new TH.BufferAttribute(aB, 3))
  g.setAttribute('aQ', new TH.BufferAttribute(aQ, 2))
  for (const [key, e] of Object.entries(extra)) g.setAttribute(key, new TH.BufferAttribute(ex[key], e.size))
  g.setIndex(new TH.BufferAttribute(idx, 1))
  return g
}

/* ─────────────── 실물(병합 정적) ─────────────── */

type V3 = [number, number, number]

function buildPhysical(TH: Three, A: Addons, lay: Layout) {
  const metal = new Kit(TH, A) // 도장 금속 프레임·랙·스탠드
  const matte = new Kit(TH, A) // 상판·박스·팔레트·플라스틱·보드
  const rnd = mulberry(99)
  const shade = (hex: string, k: number) => new TH.Color(hex).multiplyScalar(k)

  const FRAME = '#2c3238'
  const FRAME_D = '#1f2328'
  const TRIM = '#7d858c'

  /* 작업대 — 오픈 프레임 + ESD 매트 상판 + 양끝 업라이트 + 조명 바 */
  for (const line of LINES) {
    for (const bx of BENCH_X) {
      const z = line.z
      metal.at(bx, 0, z)
      matte.at(bx, 0, z)
      for (const sx of [-0.78, 0.78])
        for (const sz of [-0.34, 0.34]) {
          metal.rbox(0.05, 0.79, 0.05, 0.01, FRAME, [sx, 0.405, sz], undefined, 1)
          metal.cyl(0.03, 0.034, 0.016, FRAME_D, [sx, 0.008, sz], undefined, 12)
        }
      for (const sx of [-0.78, 0.78]) metal.rbox(0.04, 0.04, 0.66, 0.008, FRAME, [sx, 0.2, 0], undefined, 1)
      metal.rbox(1.52, 0.05, 0.03, 0.008, FRAME, [0, 0.77, -0.34], undefined, 1)
      metal.rbox(1.52, 0.05, 0.03, 0.008, FRAME, [0, 0.77, 0.34], undefined, 1)
      matte.rbox(1.5, 0.022, 0.5, 0.006, '#25292e', [0, 0.23, -0.04], undefined, 1)
      // 상판(라미네이트) + 앞 모서리 트림 + ESD 매트
      matte.rbox(1.72, 0.045, 0.86, 0.014, '#3b4046', [0, TOP - 0.0225, 0])
      matte.rbox(1.72, 0.012, 0.014, 0.004, TRIM, [0, TOP - 0.03, 0.432], undefined, 1)
      matte.rbox(1.46, 0.004, 0.58, 0.002, '#1f3a3a', [0, TOP + 0.002, 0.04], undefined, 1)
      // 서랍 페데스탈(작업자 반대쪽 끝)
      const dx = line.kind === 'harness' ? -0.5 : 0.5
      matte.rbox(0.42, 0.5, 0.6, 0.012, '#30363c', [dx, 0.5, 0], undefined, 1)
      for (let k = 0; k < 3; k++) {
        const y = 0.34 + k * 0.16
        const fz = line.kind === 'harness' ? 0.302 : -0.302
        matte.box(0.4, 0.004, 0.004, '#121417', [dx, y + 0.075, fz])
        matte.rbox(0.12, 0.012, 0.012, 0.004, TRIM, [dx, y + 0.02, fz + (fz > 0 ? 0.008 : -0.008)], undefined, 1)
      }
      // 양끝 업라이트 + 크로스바 + 조명 하우징
      for (const sx of [-0.8, 0.8]) metal.rbox(0.04, 1.12, 0.04, 0.008, FRAME, [sx, TOP + 0.56, -0.38], undefined, 1)
      metal.rbox(1.64, 0.04, 0.04, 0.008, FRAME, [0, 1.94, -0.38], undefined, 1)
      for (const sx of [-0.45, 0.45]) metal.rbox(0.025, 0.025, 0.2, 0.006, FRAME, [sx, 1.93, -0.28], undefined, 1)
      metal.rbox(1.16, 0.045, 0.13, 0.016, '#1a1d21', [0, 1.905, -0.18])
      // 전원 레일(업라이트 사이)
      metal.rbox(1.5, 0.05, 0.035, 0.008, '#22262b', [0, TOP + 0.32, -0.385], undefined, 1)

      // 라인별 작업물
      if (line.kind === 'battery') {
        for (let i = 0; i < 6; i++)
          for (let j = 0; j < 3; j++) {
            const p: V3 = [-0.62 + i * 0.13, TOP, -0.05 + j * 0.13]
            matte.cyl(0.046, 0.046, 0.19, '#2a5562', [p[0], TOP + 0.095, p[2]], undefined, 14)
            metal.cyl(0.03, 0.034, 0.012, '#c3c9ce', [p[0], TOP + 0.196, p[2]], undefined, 12)
          }
        // 셀 트레이 + 팩 케이스(벤트 슬롯)
        matte.rbox(0.82, 0.02, 0.38, 0.006, '#1c2024', [-0.295, TOP + 0.01, 0.08], undefined, 1)
        matte.rbox(0.5, 0.2, 0.42, 0.022, '#40474f', [0.45, TOP + 0.1, 0])
        matte.rbox(0.46, 0.012, 0.38, 0.005, '#565e66', [0.45, TOP + 0.205, 0], undefined, 1)
        for (let k = 0; k < 5; k++) matte.box(0.3, 0.012, 0.004, '#16191c', [0.45, TOP + 0.05 + k * 0.025, 0.211])
        metal.rbox(0.06, 0.03, 0.04, 0.008, '#b0402a', [0.66, TOP + 0.215, -0.12], undefined, 1)
      } else if (line.kind === 'filter') {
        matte.rbox(0.7, 0.035, 0.45, 0.01, '#30353b', [-0.2, TOP + 0.0175, 0.05])
        for (let i = 0; i < 4; i++) {
          const x = -0.45 + i * 0.17
          matte.lathe(
            [
              [0, 0],
              [0.058, 0],
              [0.06, 0.012],
              [0.054, 0.02],
              [0.054, 0.25],
              [0.062, 0.258],
              [0.062, 0.3],
              [0.05, 0.315],
              [0, 0.318],
            ],
            '#c9d1d4',
            [x, TOP + 0.035, 0.05],
          )
          matte.cyl(0.063, 0.063, 0.008, '#2f7486', [x, TOP + 0.035 + 0.262, 0.05], undefined, 20)
        }
        // 부품 토트
        matte.rbox(0.36, 0.26, 0.3, 0.024, '#3b4249', [0.5, TOP + 0.13, -0.1])
        matte.rbox(0.31, 0.01, 0.25, 0.004, '#15191c', [0.5, TOP + 0.257, -0.1], undefined, 1)
      } else {
        // 하네스 보드(합판) + 지지 다리 + 핀 + 배선 런 + 코일
        matte.rbox(1.5, 0.72, 0.04, 0.012, '#4a3d30', [0, TOP + 0.36, 0])
        matte.rbox(1.42, 0.64, 0.004, 0.002, '#5a4b3a', [0, TOP + 0.36, 0.021], undefined, 1)
        for (const sx of [-0.6, 0.6]) metal.rbox(0.04, 0.03, 0.3, 0.008, FRAME, [sx, TOP + 0.015, -0.06], undefined, 1)
        for (let r = 0; r < 3; r++)
          for (let k = 0; k < 7; k++) metal.cyl(0.006, 0.006, 0.05, '#c3c9ce', [-0.6 + k * 0.2, TOP + 0.18 + r * 0.2, 0.045], [Math.PI / 2, 0, 0], 6)
        const wires = ['#a06a2c', '#8a3030', '#2f5a86', '#c9c4b6']
        wires.forEach((wc, w) => {
          const y0 = TOP + 0.16 + w * 0.13
          matte.tube(
            [
              [-0.66, y0, 0.03],
              [-0.3, y0 + 0.04, 0.032],
              [0.0, y0 - 0.03 + (w % 2) * 0.06, 0.032],
              [0.32, y0 + 0.02, 0.032],
              [0.62, y0 + 0.18 - w * 0.05, 0.03],
            ],
            0.008,
            wc,
          )
        })
        const coilC = ['#a06a2c', '#8a3030', '#2f5a86']
        for (let i = 0; i < 3; i++) matte.torus(0.11, 0.02, coilC[i], [-0.48 + i * 0.48, TOP + 0.5, 0.05])
        matte.rbox(1.0, 0.03, 0.06, 0.008, '#7a5a30', [-0.1, TOP + 0.015, 0.24], undefined, 1)
        for (let k = 0; k < 8; k++) matte.rbox(0.05, 0.02, 0.04, 0.005, k % 2 ? '#d8d2c4' : '#2a2e33', [-0.52 + k * 0.12, TOP + 0.04, 0.24], undefined, 1)
      }
    }
  }

  /* 스툴(좌식 라인) */
  for (const op of lay.operators.filter((o) => o.pose === 'sit')) {
    metal.at(op.x, 0, op.z - 0.02)
    metal.cyl(0.2, 0.22, 0.025, FRAME_D, [0, 0.0125, 0], undefined, 24)
    metal.cyl(0.024, 0.024, 0.56, '#9aa1a8', [0, 0.3, 0], undefined, 12)
    metal.torus(0.19, 0.01, '#9aa1a8', [0, 0.27, 0], [Math.PI / 2, 0, 0])
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      metal.rod([0, 0.27, 0], [Math.cos(a) * 0.19, 0.27, Math.sin(a) * 0.19], 0.008, '#9aa1a8')
    }
    matte.at(op.x, 0, op.z - 0.02)
    matte.lathe(
      [
        [0, 0.57],
        [0.16, 0.57],
        [0.178, 0.585],
        [0.18, 0.61],
        [0.165, 0.625],
        [0, 0.628],
      ],
      '#23272c',
      [0, 0, 0],
      undefined,
      28,
    )
  }

  /* 태블릿 스탠드 + 본체 */
  const tq = new TH.Quaternion()
  const te = new TH.Euler()
  const tv = new TH.Vector3()
  for (const tb of lay.tablets) {
    const z = tb.z - 0.04
    metal.at(TABLET_X, 0, z)
    metal.cyl(0.18, 0.2, 0.03, FRAME_D, [0, 0.015, 0], undefined, 28)
    metal.cyl(0.022, 0.022, 1.18, '#8f979e', [0, 0.6, 0], undefined, 14)
    metal.cyl(0.03, 0.03, 0.04, FRAME, [0, 1.19, 0], undefined, 14)
    metal.parent.identity()
    tq.setFromEuler(te.set(-0.25, tb.ry, 0, 'YXZ'))
    tv.set(0, 0, -0.016).applyQuaternion(tq)
    const rot: V3 = [-0.25, tb.ry, 0]
    metal.rbox(0.5, 0.36, 0.022, 0.02, '#15181b', [tb.x + tv.x, tb.y + tv.y, tb.z + tv.z], rot)
    tv.set(0, 0, -0.04).applyQuaternion(tq)
    metal.rbox(0.1, 0.1, 0.03, 0.01, FRAME, [tb.x + tv.x, tb.y + tv.y, tb.z + tv.z], rot, 1)
  }

  /* 창고 랙 — 업라이트(스틸 블루) · 앰버 빔 · 데크 · 측면 브레이싱 */
  RACK_X.forEach((rx, ri) => {
    metal.at(rx, 0, RACK_Z)
    matte.at(rx, 0, RACK_Z)
    for (const dx of [-1.2, 1.2]) {
      for (const dz of [-0.38, 0.38]) {
        metal.rbox(0.07, 2.55, 0.06, 0.01, '#2c4250', [dx, 1.275, dz], undefined, 1)
        metal.rbox(0.12, 0.012, 0.1, 0.004, FRAME_D, [dx, 0.006, dz], undefined, 1)
      }
      for (let k = 0; k < 4; k++) {
        const y0 = 0.15 + k * 0.6
        metal.rod([dx, y0, -0.38], [dx, y0 + 0.6, 0.38], 0.01, '#2c4250')
        metal.rod([dx, y0, -0.38], [dx, y0, 0.38], 0.01, '#2c4250')
      }
    }
    for (const sy of SHELF_Y) {
      for (const dz of [-0.4, 0.4]) metal.rbox(2.36, 0.08, 0.045, 0.01, '#8a5a24', [0, sy + 0.01, dz], undefined, 1)
      metal.rbox(2.34, 0.018, 0.76, 0.004, '#3a4148', [0, sy + 0.045, 0], undefined, 1)
      for (let b = 0; b < 3; b++) {
        const bx = -0.78 + b * 0.78
        const isBin = (b + Math.round(sy * 3) + ri) % 3 !== 0
        if (isBin) {
          matte.rbox(0.66, 0.44, 0.62, 0.035, '#2a4855', [bx, sy + 0.05 + 0.22, 0])
          matte.rbox(0.58, 0.012, 0.54, 0.02, '#0f1c22', [bx, sy + 0.05 + 0.436, 0], undefined, 1)
          matte.rbox(0.3, 0.13, 0.012, 0.006, '#1e3640', [bx + 0.12, sy + 0.28, 0.312], undefined, 1)
        } else {
          const k = 0.9 + rnd() * 0.2
          matte.rbox(0.6, 0.5, 0.6, 0.016, shade('#6a5136', k), [bx, sy + 0.05 + 0.25, 0])
          matte.box(0.6, 0.004, 0.09, shade('#7c6648', k), [bx, sy + 0.05 + 0.501, 0])
          matte.box(0.09, 0.2, 0.004, shade('#7c6648', k), [bx, sy + 0.05 + 0.4, 0.301])
        }
      }
    }
  })

  /* 팔레트 + 카톤 */
  PALLET_POS.forEach(([px, pz], i) => {
    matte.at(px, 0, pz)
    const wood = (k: number) => shade('#6b5338', 0.85 + k * 0.25)
    for (const sz of [-0.5, 0, 0.5]) matte.rbox(1.15, 0.022, 0.14, 0.004, wood(rnd()), [0, 0.011, sz], undefined, 1)
    for (const sx of [-0.5, 0, 0.5]) for (const sz of [-0.5, 0, 0.5]) matte.rbox(0.14, 0.096, 0.14, 0.008, wood(rnd() * 0.6), [sx, 0.07, sz], undefined, 1)
    for (let k = 0; k < 5; k++) matte.rbox(1.15, 0.022, 0.18, 0.004, wood(rnd()), [0, 0.129, -0.47 + k * 0.235], undefined, 1)
    const layers = PALLET_LAYERS[i]
    const ch = 0.38
    for (let l = 0; l < layers; l++)
      for (const ox of [-0.27, 0.27])
        for (const oz of [-0.27, 0.27]) {
          const k = 0.88 + rnd() * 0.24
          const y = 0.14 + l * ch + (ch - 0.02) / 2
          matte.rbox(0.5, ch - 0.02, 0.5, 0.014, shade('#7a5c3c', k), [ox, y, oz])
          matte.box(0.5, 0.003, 0.08, shade('#8c7250', k), [ox, y + (ch - 0.02) / 2 + 0.0005, oz])
        }
  })

  metal.parent.identity()
  matte.parent.identity()
  const metalMat = new TH.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.55 })
  const matteMat = new TH.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.04 })
  return [new TH.Mesh(metal.build(), metalMat), new TH.Mesh(matte.build(), matteMat)]
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
  clipMesh: THREE.InstancedMesh
  figures: Figures
  scan: THREE.Group
  nodes: { group: THREE.Group; ring: THREE.Mesh; ring2: THREE.Mesh; at: number }[]
  pallets: Stack[]
  rackA: Stack
  pxUniform: { value: number }
  setRes(w: number, h: number, dpr: number): void
}

const hdr = (TH: Three, hex: string, k: number) => new TH.Color(hex).multiplyScalar(k)

export function buildWorld(TH: Three, scene: THREE.Scene, addons: Addons): World {
  const lay = makeLayout()
  const U = {
    uTime: { value: 0 },
    uLift: { value: LIFT },
    uScanX: { value: T.x0 },
    uScanA: { value: 0 },
  }
  const pxUniform = { value: 300 }
  const FAT = { uRes: { value: new TH.Vector2(1600, 900) }, uDpr: { value: 1 } }

  /* 조명 — 차가운 키 + 블루 림 + 작업등 앰버 */
  scene.add(new TH.HemisphereLight('#5d7080', '#0a0a0a', 0.75))
  const key = new TH.DirectionalLight('#c8d4de', 1.35)
  key.position.set(-6, 10, 9)
  scene.add(key)
  const rim = new TH.DirectionalLight('#4ab3cc', 0.9)
  rim.position.set(4, 6, -12)
  scene.add(rim)
  for (const line of LINES) {
    const pl = new TH.PointLight('#e09a50', 13, 11, 1.5)
    pl.position.set(-3.6, 2.9, line.z + 0.1)
    scene.add(pl)
  }
  const wl = new TH.PointLight('#e09a50', 10, 10, 1.5)
  wl.position.set(6.3, 2.6, -0.8)
  scene.add(wl)

  /* 바닥 — 매끈한 콘크리트 + AA 그리드(거리 감쇠) */
  const floor = new TH.Mesh(new TH.PlaneGeometry(40, 28), new TH.MeshStandardMaterial({ color: '#0c0e11', roughness: 0.62, metalness: 0.1 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, -0.5)
  scene.add(floor)
  const gridMat = new TH.ShaderMaterial({
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vW;
      float gl(vec2 p, float s, float w){ vec2 g = abs(fract(p/s - .5) - .5)*s; vec2 fw = fwidth(p)*w; vec2 l = 1. - smoothstep(vec2(0.), fw, g); return max(l.x, l.y); }
      void main(){
        float d = length((vW.xz - vec2(0., -0.5))*vec2(0.75, 1.));
        float fade = 1. - smoothstep(4., 11., d);
        float a = (gl(vW.xz, 0.5, 0.9)*0.016 + gl(vW.xz, 2.5, 1.1)*0.05)*fade;
        gl_FragColor = vec4(vec3(0.5, 0.6, 0.66), a);
      }`,
    transparent: true,
    depthWrite: false,
  })
  const grid = new TH.Mesh(new TH.PlaneGeometry(40, 28), gridMat)
  grid.rotation.x = -Math.PI / 2
  grid.position.set(0, 0.002, -0.5)
  scene.add(grid)
  // 통로 라인(앰버 페인트, 블룸 임계 아래)
  const laneMat = new TH.MeshStandardMaterial({ color: '#6b4a1e', roughness: 0.5, metalness: 0, emissive: '#2a1a08' })
  const lanes: [number, number, number, number][] = [
    [-3.0, -1.2, 12.2, 0.07],
    [-3.0, 1.4, 12.2, 0.07],
    [3.3, -0.4, 0.07, 9.4],
    [6.4, 3.75, 6.2, 0.07],
    [6.4, -1.1 + 0.05, 6.2, 0.04],
  ]
  const laneMesh = new TH.InstancedMesh(new TH.PlaneGeometry(1, 1), laneMat, lanes.length)
  const m4 = new TH.Matrix4()
  const qFlat = new TH.Quaternion().setFromEuler(new TH.Euler(-Math.PI / 2, 0, 0))
  const v = new TH.Vector3()
  const s = new TH.Vector3()
  lanes.forEach(([x, z, w, d], i) => {
    m4.compose(v.set(x, 0.004, z), qFlat, s.set(w, d, 1))
    laneMesh.setMatrixAt(i, m4)
  })
  scene.add(laneMesh)

  /* 실물 소품(병합 2 드로우) */
  for (const m of buildPhysical(TH, addons, lay)) scene.add(m)

  /* 접지 그림자(소프트 데칼, 1 드로우) */
  const shadows: [number, number, number, number][] = []
  for (const line of LINES) {
    for (const bx of BENCH_X) shadows.push([bx, line.z, 2.1, 1.15])
    shadows.push([TABLET_X, line.z, 0.62, 0.62])
  }
  for (const op of lay.operators) shadows.push([op.x, op.z + (op.pose === 'sit' ? 0.1 : 0), op.pose === 'sit' ? 0.7 : 0.6, op.pose === 'sit' ? 0.85 : 0.5])
  for (const [px, pz] of PALLET_POS) shadows.push([px, pz, 1.55, 1.55])
  for (const rx of RACK_X) shadows.push([rx, RACK_Z, 3.0, 1.25])
  const shadowMesh = new TH.InstancedMesh(
    new TH.PlaneGeometry(1, 1),
    new TH.MeshBasicMaterial({ color: '#000000', map: softShadowTexture(TH), transparent: true, opacity: 0.62, depthWrite: false }),
    shadows.length,
  )
  shadows.forEach(([x, z, w, d], i) => {
    m4.compose(v.set(x, 0.006, z), qFlat, s.set(w, d, 1))
    shadowMesh.setMatrixAt(i, m4)
  })
  shadowMesh.renderOrder = -1
  scene.add(shadowMesh)

  /* 작업자 */
  const figures = buildFigures(TH, lay.operators)
  for (const m of figures.meshes) scene.add(m)

  /* 작업등 발광 스트립(하우징 아래) */
  const lampMesh = new TH.InstancedMesh(
    new TH.BoxGeometry(1.06, 0.006, 0.07),
    new TH.MeshBasicMaterial({ color: hdr(TH, COLORS.amber, 1.45) }),
    LINES.length * BENCH_X.length,
  )
  const qi = new TH.Quaternion()
  let li = 0
  for (const line of LINES)
    for (const bx of BENCH_X) {
      m4.compose(v.set(bx, 1.88, line.z - 0.18), qi, s.set(1, 1, 1))
      lampMesh.setMatrixAt(li++, m4)
    }
  scene.add(lampMesh)

  /* 종이 기록(클립보드 + 수기 양식) — 스캔 지나가면 사라짐 */
  const clipKit = new Kit(TH, addons)
  clipKit.rbox(0.25, 0.008, 0.33, 0.006, '#5a4632', [0, 0.004, 0], undefined, 1)
  clipKit.rbox(0.09, 0.012, 0.03, 0.005, '#b9c0c6', [0, 0.012, -0.145], undefined, 1)
  const clipMesh = new TH.InstancedMesh(clipKit.build(), new TH.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }), lay.papers.length)
  clipMesh.instanceMatrix.setUsage(TH.DynamicDrawUsage)
  scene.add(clipMesh)
  const paperGeo = new TH.PlaneGeometry(0.22, 0.29)
  paperGeo.rotateX(-Math.PI / 2)
  paperGeo.translate(0, 0.0095, 0.012)
  const paperMat = new TH.MeshStandardMaterial({ map: paperTexture(TH, mulberry(1208)), roughness: 0.9, metalness: 0 })
  paperMat.onBeforeCompile = (sh) => {
    // 종이는 어두운 바닥에서도 읽히게 약한 자체발광 — 인스턴스 색(스캔 플래시)이 같이 곱해진다.
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.1;')
  }
  const paperMesh = new TH.InstancedMesh(paperGeo, paperMat, lay.papers.length)
  paperMesh.instanceMatrix.setUsage(TH.DynamicDrawUsage)
  scene.add(paperMesh)

  /* 바코드 라벨 / 태블릿 화면 */
  const labelMesh = new TH.InstancedMesh(new TH.PlaneGeometry(0.22, 0.1), new TH.MeshBasicMaterial({ map: barcodeTexture(TH) }), lay.labels.length)
  const col = new TH.Color()
  lay.labels.forEach((l, i) => {
    m4.compose(v.set(l.x, l.y, l.z), qi, s.set(1, 1, 1))
    labelMesh.setMatrixAt(i, m4)
    labelMesh.setColorAt(i, col.setScalar(0.3))
  })
  scene.add(labelMesh)

  const tabletMesh = new TH.InstancedMesh(new TH.PlaneGeometry(0.46, 0.32), new TH.MeshBasicMaterial({ map: tabletTexture(TH) }), lay.tablets.length)
  lay.tablets.forEach((tb, i) => {
    m4.compose(v.set(tb.x, tb.y, tb.z), new TH.Quaternion().setFromEuler(new TH.Euler(-0.25, tb.ry, 0, 'YXZ')), s.set(1, 1, 1))
    tabletMesh.setMatrixAt(i, m4)
    tabletMesh.setColorAt(i, col.setScalar(0.12))
  })
  scene.add(tabletMesh)

  /* ─────────── 트윈 ─────────── */
  const twinBoxes = lay.boxes.filter((b) => b.twin)
  // 박스 엣지 → 굵은 선 쿼드(aBase = 박스 중심)
  const segs: number[] = []
  const base: number[] = []
  const E = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]
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
    for (let k = 0; k < E.length; k += 2) {
      const p = c[E[k]]
      const q = c[E[k + 1]]
      segs.push(b.x + p[0], b.y + p[1], b.z + p[2], b.x + q[0], b.y + q[1], b.z + q[2])
      base.push(b.x, b.y, b.z)
    }
  }
  const edgeGeo = fatGeometry(TH, segs, { aBase: { size: 3, data: base } })

  const twinLineMat = new TH.ShaderMaterial({
    uniforms: { ...U, ...FAT, uCol: { value: hdr(TH, COLORS.teal, 1.0) }, uHot: { value: new TH.Color(1.3, 1.9, 1.8) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_FAT}
      attribute vec3 aBase;
      varying float vR; varying float vOn; varying float vS; varying float vY;
      void main(){
        float r = riseAt(aBase);
        vec3 lift = vec3(0., r*uLift + bobAt(aBase.x, r), 0.);
        vR = r;
        float a = actAt(aBase.x);
        vOn = smoothstep(a, a + 0.12, uTime);
        vS = aQ.y;
        vY = mix(aA.y, aB.y, aQ.x) + lift.y;
        gl_Position = fatClip(aA + lift, aB + lift, 2.6);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCol; uniform vec3 uHot;
      varying float vR; varying float vOn; varying float vS; varying float vY;
      void main(){
        if (vOn < 0.002) discard;
        float prof = exp(-vS*vS*4.2);
        float core = exp(-vS*vS*18.);
        float travel = sin(3.14159*vR);
        float hot = max(1. - smoothstep(0., 0.25, vR), travel*0.6);
        float sh = 0.86 + 0.14*sin(vY*22. - uTime*2.2);
        vec3 c = mix(uCol*sh, uHot, hot*0.4) + vec3(0.25, 0.4, 0.38)*core;
        gl_FragColor = vec4(c, vOn*(0.28 + 0.12*hot)*prof);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
    side: TH.DoubleSide, // 쿼드 와인딩은 선 방향에 따라 뒤집힌다
  })
  const twinLines = new TH.Mesh(edgeGeo, twinLineMat)
  twinLines.frustumCulled = false
  scene.add(twinLines)

  // 바닥에 남는 스캔 잔상(같은 지오메트리, 얇게)
  const ghostMat = new TH.ShaderMaterial({
    uniforms: { ...U, ...FAT, uCol: { value: hdr(TH, COLORS.teal, 1) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_FAT}
      attribute vec3 aBase;
      varying float vOn; varying float vX; varying float vS;
      void main(){
        float a = actAt(aBase.x);
        vOn = smoothstep(a, a + 0.3, uTime);
        vX = mix(aA.x, aB.x, aQ.x);
        vS = aQ.y;
        gl_Position = fatClip(aA, aB, 1.5);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uScanX; uniform float uScanA; uniform vec3 uCol;
      varying float vOn; varying float vX; varying float vS;
      void main(){
        float d = (vX - uScanX);
        float flash = exp(-d*d*2.2)*uScanA;
        float a = (vOn*0.08 + flash*1.4)*exp(-vS*vS*3.);
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(uCol, vec3(2.4,2.8,2.7), clamp(flash,0.,1.)), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
    side: TH.DoubleSide, // 쿼드 와인딩은 선 방향에 따라 뒤집힌다
  })
  const ghost = new TH.Mesh(edgeGeo, ghostMat)
  ghost.frustumCulled = false
  scene.add(ghost)

  // 트윈 면 — 프레넬 유리(가장자리만 빛남) + 미세 스캔라인
  const faceMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.blue, 1.0) }, uRim: { value: hdr(TH, COLORS.teal, 1.0) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      varying float vR; varying vec3 vN; varying vec3 vV; varying float vH; varying float vWy;
      void main(){
        vec3 b = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        vec4 w = modelMatrix*instanceMatrix*vec4(position,1.);
        float r = riseAt(b);
        w.y += r*uLift + bobAt(b.x, r);
        vR = r; vN = normal; vH = position.y + .5;
        vV = cameraPosition - w.xyz; vWy = w.y;
        gl_Position = projectionMatrix*viewMatrix*w;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol; uniform vec3 uRim; uniform float uTime;
      varying float vR; varying vec3 vN; varying vec3 vV; varying float vH; varying float vWy;
      void main(){
        float on = smoothstep(0.08, 0.5, vR);
        if (on < 0.002) discard;
        float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 2.4);
        float sl = 0.82 + 0.18*smoothstep(0.3, 0.7, fract(vWy*30. - uTime*0.8));
        vec3 c = mix(uCol, uRim, f);
        float a = on*(0.006 + 0.07*f + 0.02*vH*abs(vN.y))*sl;
        gl_FragColor = vec4(c, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const faces = new TH.InstancedMesh(new TH.BoxGeometry(1, 1, 1), faceMat, twinBoxes.length)
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
        float border = smoothstep(0.986, 0.993, edge)*(1. - smoothstep(0.996, 1.0, edge));
        float r = ease3(clamp((uTime - actAt(p.x) - 0.3)/1.2, 0., 1.));
        float front = r*(1.-r)*4.;
        float minor = gridLine(p, 0.5, 1.0);
        float major = gridLine(p, 2.5, 1.5);
        // 모서리 브래킷 강조
        vec2 cq = smoothstep(0.9, 0.93, q);
        float corner = cq.x*cq.y*border;
        float vis = 0.18 + 0.82*r;
        float a = (minor*0.035 + major*0.13 + border*0.42 + corner*0.6)*vis + front*0.1*(1.-edge*.5);
        a *= 1. - smoothstep(0.996, 1.0, edge);
        gl_FragColor = vec4(uCol*(1. + front*1.5 + corner*1.5), a);
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

  // 수직 빔 (소스 → 트윈) — 굵은 점선 광선
  const beamSegs: number[] = []
  const beamK: number[] = []
  for (const src of sources) {
    beamSegs.push(src.x, src.y, src.z, src.x, src.y, src.z)
    beamK.push(src.kind === 'tab' ? 1 : 0)
  }
  const beamGeo = fatGeometry(TH, beamSegs, { aK: { size: 1, data: beamK } })
  const beamMat = new TH.ShaderMaterial({
    uniforms: { ...U, ...FAT, uA: { value: hdr(TH, COLORS.amber, 1.6) }, uB: { value: hdr(TH, COLORS.blue, 1.8) } },
    vertexShader: /* glsl */ `
      ${GLSL_COMMON}
      ${GLSL_FAT}
      attribute float aK;
      varying float vT; varying float vK; varying float vR; varying float vLen; varying float vS;
      void main(){
        float r = riseAt(aA);
        float len = r*uLift + bobAt(aA.x, r);
        vT = aQ.x; vK = aK; vR = r; vLen = len; vS = aQ.y;
        gl_Position = fatClip(aA, aB + vec3(0., len, 0.), 1.8);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uA; uniform vec3 uB;
      varying float vT; varying float vK; varying float vR; varying float vLen; varying float vS;
      void main(){
        if (vR < 0.01) discard;
        float d = fract(vT*vLen*0.9 - uTime*1.1 - vK*0.37);
        float dash = smoothstep(0.72, 1.0, d);
        float a = (0.12 + 0.85*dash)*smoothstep(0.0, 0.06, vT)*exp(-vS*vS*3.5);
        gl_FragColor = vec4(mix(uA, uB, vK), a*smoothstep(0.01, 0.2, vR));
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
    side: TH.DoubleSide, // 쿼드 와인딩은 선 방향에 따라 뒤집힌다
  })
  const beams = new TH.Mesh(beamGeo, beamMat)
  beams.frustumCulled = false
  scene.add(beams)

  // 트윈 안 바코드 마커
  const mk = new TH.BufferGeometry()
  mk.setAttribute('position', new TH.Float32BufferAttribute(sources.flatMap((x) => [x.x, x.y, x.z]), 3))
  mk.setAttribute('aK', new TH.Float32BufferAttribute(beamK, 1))
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
        float m = max(c.x, c.y);
        float frame = smoothstep(0.36, 0.42, m)*(1. - smoothstep(0.44, 0.5, m));
        float core = 1. - smoothstep(0.08, 0.2, length(gl_PointCoord - .5));
        gl_FragColor = vec4(mix(uA, uB, vK), (frame*0.7 + core*0.9)*smoothstep(0.3, 0.8, vR));
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
  const N = 1300
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
      uC0: { value: hdr(TH, COLORS.amber, 2.4) },
      uC1: { value: hdr(TH, COLORS.teal, 2.4) },
      uC2: { value: hdr(TH, COLORS.blue, 2.6) },
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
        float d = length(gl_PointCoord - .5)*2.;
        float a = exp(-d*d*4.5);
        vec3 c = vK < .5 ? uC0 : (vK < 1.5 ? uC1 : uC2);
        gl_FragColor = vec4(c, a*vA);
      }`,
    transparent: true,
    depthWrite: false,
    blending: TH.AdditiveBlending,
  })
  const parts = new TH.Points(pGeo, pMat)
  parts.frustumCulled = false
  scene.add(parts)

  /* 먼지 입자(분위기) — 결정적 표류 */
  const DN = 320
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
    uniforms: { ...U, uPx: pxUniform, uW: { value: new TH.Color(COLORS.amber).multiplyScalar(0.5) }, uC: { value: new TH.Color(COLORS.teal).multiplyScalar(0.5) } },
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
      void main(){ float d = length(gl_PointCoord - .5)*2.; float a = exp(-d*d*4.);
        gl_FragColor = vec4(mix(uW, uC, smoothstep(2.5, 5., vY)), a*vA*0.55); }`,
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
      new TH.RingGeometry(0.3, 0.322, 64),
      new TH.MeshBasicMaterial({ color: hdr(TH, c, 2.6), transparent: true, blending: TH.AdditiveBlending, depthWrite: false }),
    )
    const ring2 = new TH.Mesh(
      new TH.RingGeometry(0.46, 0.47, 64, 1, 0, Math.PI * 1.4),
      new TH.MeshBasicMaterial({ color: hdr(TH, c, 1.4), transparent: true, blending: TH.AdditiveBlending, depthWrite: false }),
    )
    const core = new TH.Mesh(new TH.SphereGeometry(0.08, 20, 14), new TH.MeshBasicMaterial({ color: hdr(TH, c, 4) }))
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
        float lines = 0.6 + 0.4*smoothstep(0.35, 0.65, fract(y*70. - uTime*2.));
        float ez = smoothstep(0., 0.08, vUv.x)*smoothstep(1., 0.92, vUv.x);
        float top = 1. - smoothstep(0.75, 1., y);
        gl_FragColor = vec4(uCol, uScanA*base*lines*ez*top*0.45);
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
  const line = new TH.Mesh(new TH.BoxGeometry(0.03, 0.016, 11.5), lineMat)
  line.position.set(0, 0.012, -0.6)
  const trailMat = new TH.ShaderMaterial({
    uniforms: { ...U, uCol: { value: hdr(TH, COLORS.teal, 1.2) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform float uScanA; uniform vec3 uCol; varying vec2 vUv;
      void main(){ float ez = smoothstep(0., 0.08, vUv.y)*smoothstep(1., 0.92, vUv.y); gl_FragColor = vec4(uCol, pow(vUv.x, 3.)*0.32*uScanA*ez); }`,
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
    clipMesh,
    figures,
    scan,
    nodes,
    pallets: lay.pallets,
    rackA: lay.rackA,
    pxUniform,
    setRes(w, h, dpr) {
      FAT.uRes.value.set(w * dpr, h * dpr)
      FAT.uDpr.value = dpr
      pxUniform.value = 1.6 * h * dpr
    },
  }
}
