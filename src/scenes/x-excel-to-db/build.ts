import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { mulberry32 } from '../_host/random'
import {
  CELL_D,
  CELL_W,
  COLS,
  N_EXTRA,
  N_MAIN,
  ROWS,
  SHEET_H,
  SHEET_TABS,
  SHEET_W,
  SLAB_GAP,
  SLAB_Y0,
  SLABS,
} from './data'

// 색 — 선형 HDR 배수는 bloom 임계(≈0.55) 위로 올릴 것만 >1.
export const COL = {
  phos: 0xd7d7d7,
  dim: 0x8d8d8d,
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xe0524a,
}

const hdr = (THREE: Three, hex: number, k: number) => new THREE.Color(hex).multiplyScalar(k)

const FONT_KR = '"Pretendard Variable", sans-serif'
const FONT_MONO = '"IBM Plex Mono", "Pretendard Variable", monospace'

export async function loadFonts() {
  if (typeof document === 'undefined' || !document.fonts) return
  const wait = Promise.all([
    document.fonts.load(`600 40px ${FONT_KR}`, '생산실적공수불량워크오더'),
    document.fonts.load(`500 20px ${FONT_MONO}`, '0123456789.xlsx'),
  ])
  await Promise.race([wait, new Promise((r) => setTimeout(r, 900))]).catch(() => undefined)
}

// ─────────────────────────── 시트 아틀라스 ───────────────────────────
const TW = 512
const TH = 364

function drawSheet(g: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const rnd = mulberry32(9100 + idx * 77)
  const tab = SHEET_TABS[idx]
  g.save()
  g.translate(ox, oy)
  // 본문
  g.fillStyle = 'rgba(255,255,255,0.13)'
  g.fillRect(0, 0, TW, TH)
  // 헤더 밴드
  g.fillStyle = 'rgba(255,255,255,0.62)'
  g.fillRect(0, 0, TW, 62)
  g.fillStyle = 'rgba(8,12,12,0.95)'
  g.font = `700 36px ${FONT_KR}`
  g.textBaseline = 'middle'
  g.fillText(tab, 18, 33)
  g.font = `500 17px ${FONT_MONO}`
  g.fillStyle = 'rgba(8,12,12,0.7)'
  const suffix = ['_v3_최종.xlsx', '_0412.xlsx', '_rev2.xlsx', '(사본).xlsx'][idx % 4]
  const tw = g.measureText(suffix).width
  g.fillText(suffix, TW - tw - 16, 34)
  // 그리드
  const gx0 = 0
  const gy0 = 62
  const cw = TW / 8
  const ch = (TH - gy0) / 9
  // 열 헤더 줄
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.fillRect(0, gy0, TW, ch)
  g.fillStyle = 'rgba(255,255,255,0.08)'
  g.fillRect(0, gy0, cw * 0.55, TH - gy0)
  // 셀 채움 + 숫자
  g.font = `500 15px ${FONT_MONO}`
  for (let r = 1; r < 9; r++) {
    for (let c = 1; c < 8; c++) {
      const v = rnd()
      const x = gx0 + c * cw
      const y = gy0 + r * ch
      if (v < 0.14) {
        g.fillStyle = 'rgba(255,255,255,0.28)'
        g.fillRect(x + 1, y + 1, cw - 2, ch - 2)
      }
      if (v > 0.25) {
        g.fillStyle = 'rgba(255,255,255,0.78)'
        const num = (rnd() * (c % 3 === 0 ? 100 : 2400)).toFixed(c % 3 === 0 ? 1 : 0)
        g.fillText(num, x + 8, y + ch / 2 + 1)
      }
    }
  }
  // 엑셀 오류 셀 — 시각 텍스처(빨강 채널은 셰이더 틴트에도 남도록 채도 높게)
  const errs = 1 + Math.floor(rnd() * 2)
  for (let k = 0; k < errs; k++) {
    const c = 2 + Math.floor(rnd() * 5)
    const r = 2 + Math.floor(rnd() * 6)
    const x = c * cw
    const y = gy0 + r * ch
    g.fillStyle = 'rgba(255,70,60,0.85)'
    g.fillRect(x + 1, y + 1, cw - 2, ch - 2)
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.fillText(['#REF!', '#N/A', '#VALUE!'][k % 3], x + 6, y + ch / 2 + 1)
  }
  g.strokeStyle = 'rgba(255,255,255,0.32)'
  g.lineWidth = 1.5
  g.beginPath()
  for (let c = 1; c < 8; c++) {
    g.moveTo(c * cw, gy0)
    g.lineTo(c * cw, TH)
  }
  for (let r = 1; r < 9; r++) {
    g.moveTo(0, gy0 + r * ch)
    g.lineTo(TW, gy0 + r * ch)
  }
  g.stroke()
  // 외곽
  g.strokeStyle = 'rgba(255,255,255,0.95)'
  g.lineWidth = 5
  g.strokeRect(2.5, 2.5, TW - 5, TH - 5)
  g.restore()
}

export function makeAtlas(THREE: Three) {
  const cv = document.createElement('canvas')
  cv.width = TW * 4
  cv.height = TH * 2
  const g = cv.getContext('2d')!
  g.clearRect(0, 0, cv.width, cv.height)
  for (let i = 0; i < 8; i++) drawSheet(g, (i % 4) * TW, Math.floor(i / 4) * TH, i)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

export function makeDot(THREE: Three) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const g = cv.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.65)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(cv)
  return tex
}

// ─────────────────────────── 시트 인스턴스 ───────────────────────────
const SHEET_VS = /* glsl */ `
attribute float aTile;
attribute float aGlow;
attribute float aAlpha;
attribute float aErr;
attribute vec3 aTint;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying float vGlow;
varying float vAlpha;
varying float vErr;
varying vec3 vTint;
varying float vFog;
void main() {
  float col = mod(aTile, 4.0);
  float row = floor(aTile / 4.0);
  vUv = vec2((uv.x + col) / 4.0, (uv.y + (1.0 - row)) / 2.0);
  vGlow = aGlow; vAlpha = aAlpha; vErr = aErr; vTint = aTint;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vFog = smoothstep(uFogFar, uFogNear, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`
const SHEET_FS = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uGlow;
uniform vec3 uErr;
varying vec2 vUv;
varying float vGlow;
varying float vAlpha;
varying float vErr;
varying vec3 vTint;
varying float vFog;
void main() {
  vec4 tx = texture2D(uMap, vUv);
  float face = gl_FrontFacing ? 1.0 : 0.45;
  vec3 c = tx.rgb * vTint * face;
  c = mix(c, uErr * (0.35 + tx.a), vErr);
  c += uGlow * vGlow * (0.25 + tx.a * 0.9);
  float a = clamp(tx.a * (1.0 + vGlow * 0.6) + vErr * 0.35, 0.0, 1.0) * vAlpha * vFog;
  if (a < 0.004) discard;
  gl_FragColor = vec4(c, a);
}
`

export interface SheetSet {
  mesh: THREE_NS.InstancedMesh
  glow: THREE_NS.InstancedBufferAttribute
  alpha: THREE_NS.InstancedBufferAttribute
  err: THREE_NS.InstancedBufferAttribute
  /** 인스턴스별 결정적 파라미터 */
  seed: Float32Array // [x,y,z, rx,ry,rz, wx,wy,wz, scale, phase, delay] × N
  target: Float32Array // [x,y,z] × N (메인: 슬랩 셀 / 엑스트라: 대상 셀 위치)
  slab: Uint8Array
  row: Uint8Array
  col: Uint8Array
  bad: Uint8Array // 검증에서 걸리는 행(빨강)
  count: number
}

export const SEED_STRIDE = 12

export function slabY(s: number) {
  return SLAB_Y0 + s * SLAB_GAP
}
export function cellPos(s: number, r: number, c: number, out: number[]) {
  out[0] = (c - (COLS - 1) / 2) * CELL_W
  out[1] = slabY(s) + 0.035
  out[2] = (r - (ROWS - 1) / 2) * CELL_D
  return out
}

export function makeSheets(THREE: Three, atlas: THREE_NS.Texture): SheetSet {
  const count = N_MAIN + N_EXTRA
  const geo = new THREE.PlaneGeometry(SHEET_W, SHEET_H)
  const tile = new Float32Array(count)
  const tint = new Float32Array(count * 3)
  const seed = new Float32Array(count * SEED_STRIDE)
  const target = new Float32Array(count * 3)
  const slab = new Uint8Array(count)
  const row = new Uint8Array(count)
  const col = new Uint8Array(count)
  const bad = new Uint8Array(count)
  const rnd = mulberry32(20231001)
  const tmp = [0, 0, 0]
  const tintsA = [
    [0.36, 0.44, 0.4], // 엑셀 그린-그레이
    [0.42, 0.42, 0.42],
    [0.3, 0.42, 0.44],
    [0.44, 0.4, 0.34],
  ]
  for (let i = 0; i < count; i++) {
    const main = i < N_MAIN
    // 메인: 슬랩 s 의 (r,c) 셀. 엑스트라: 메인 셀 중 하나를 겨냥.
    const k = main ? i : (i * 53) % N_MAIN
    const s = Math.floor(k / (ROWS * COLS))
    const r = Math.floor((k % (ROWS * COLS)) / COLS)
    const c = k % COLS
    slab[i] = s
    row[i] = r
    col[i] = c
    const tiles = SLABS[s].tiles
    tile[i] = tiles[(r + c) % tiles.length]
    cellPos(s, r, c, tmp)
    target.set(tmp, i * 3)
    const tA = tintsA[Math.floor(rnd() * tintsA.length)]
    const br = 0.85 + rnd() * 0.3
    tint.set([tA[0] * br, tA[1] * br, tA[2] * br], i * 3)
    // 혼돈 위치: 넓은 타원 구름(카메라 쪽은 비움)
    let x = 0
    let y = 0
    let z = 0
    for (let tries = 0; tries < 8; tries++) {
      x = (rnd() * 2 - 1) * 12.5
      y = (rnd() * 2 - 1) * 5.6 + 0.4
      z = -11 + rnd() * 16
      if (Math.hypot(x * 0.6, y, z - 1) > 2.6) break
    }
    const o = i * SEED_STRIDE
    seed[o] = x
    seed[o + 1] = y
    seed[o + 2] = z
    seed[o + 3] = rnd() * Math.PI * 2
    seed[o + 4] = rnd() * Math.PI * 2
    seed[o + 5] = rnd() * Math.PI * 2
    seed[o + 6] = (rnd() - 0.5) * 0.7
    seed[o + 7] = (rnd() - 0.5) * 0.9
    seed[o + 8] = (rnd() - 0.5) * 0.5
    seed[o + 9] = 0.75 + rnd() * 0.55
    seed[o + 10] = rnd() * Math.PI * 2
    // 출발 지연: 아래 슬랩부터, 슬랩 안에서는 흩어지게
    seed[o + 11] = s * 0.17 + rnd() * 1.0
    bad[i] = main && rnd() < 0.035 ? 1 : 0
  }
  geo.setAttribute('aTile', new THREE.InstancedBufferAttribute(tile, 1))
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3))
  const glow = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1)
  const err = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
  glow.setUsage(THREE.DynamicDrawUsage)
  alpha.setUsage(THREE.DynamicDrawUsage)
  err.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('aGlow', glow)
  geo.setAttribute('aAlpha', alpha)
  geo.setAttribute('aErr', err)

  const mat = new THREE.ShaderMaterial({
    vertexShader: SHEET_VS,
    fragmentShader: SHEET_FS,
    uniforms: {
      uMap: { value: atlas },
      uGlow: { value: hdr(THREE, COL.teal, 1.3) },
      uErr: { value: hdr(THREE, COL.red, 1.25) },
      uFogNear: { value: 12 },
      uFogFar: { value: 34 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.renderOrder = 3
  return { mesh, glow, alpha, err, seed, target, slab, row, col, bad, count }
}

// ─────────────────────────── DB 슬랩 + 관계선 ───────────────────────────
export interface Db {
  group: THREE_NS.Group
  slabMats: THREE_NS.MeshBasicMaterial[]
  edgeMat: THREE_NS.LineBasicMaterial
  keyMat: THREE_NS.LineBasicMaterial
  relMat: THREE_NS.LineBasicMaterial
  curves: THREE_NS.QuadraticBezierCurve3[]
  pulses: THREE_NS.Points
  pulseMat: THREE_NS.PointsMaterial
}

export const SLAB_W = COLS * CELL_W + 0.34
export const SLAB_D = ROWS * CELL_D + 0.3

export function makeDb(THREE: Three, dot: THREE_NS.Texture): Db {
  const group = new THREE.Group()
  const slabGeo = new THREE.BoxGeometry(SLAB_W, 0.05, SLAB_D)
  const edgesGeo = new THREE.EdgesGeometry(slabGeo)
  const slabMats: THREE_NS.MeshBasicMaterial[] = []
  const edgeMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COL.blue, 1.25), transparent: true, opacity: 0.5, depthWrite: false })
  const edgePos: number[] = []
  const ep = edgesGeo.getAttribute('position')
  for (let s = 0; s < SLABS.length; s++) {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(COL.blue).multiplyScalar(0.55),
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    slabMats.push(m)
    const mesh = new THREE.Mesh(slabGeo, m)
    mesh.position.y = slabY(s) - 0.01
    mesh.renderOrder = 1
    group.add(mesh)
    for (let k = 0; k < ep.count; k++) edgePos.push(ep.getX(k), ep.getY(k) + slabY(s) - 0.01, ep.getZ(k))
  }
  const eg = new THREE.BufferGeometry()
  eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3))
  const edges = new THREE.LineSegments(eg, edgeMat)
  edges.renderOrder = 2
  group.add(edges)

  // PK 열(맨 왼쪽 열 앞 가장자리) 키 라인 — 슬랩마다 짧은 HDR 띠
  const keyPos: number[] = []
  for (let s = 0; s < SLABS.length; s++) {
    const y = slabY(s) + 0.02
    keyPos.push(-SLAB_W / 2, y, SLAB_D / 2, SLAB_W / 2, y, SLAB_D / 2)
  }
  const kg = new THREE.BufferGeometry()
  kg.setAttribute('position', new THREE.Float32BufferAttribute(keyPos, 3))
  const keyMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COL.teal, 2.2), transparent: true, opacity: 0, depthWrite: false })
  group.add(new THREE.LineSegments(kg, keyMat))

  // 관계선 — 슬랩 바깥으로 휘는 베지어(FK). 좌/우/뒤 세 면.
  const rel: Array<[number, number, number]> = [
    [0, 1, -1],
    [0, 2, 1],
    [1, 3, -1],
    [2, 3, 1],
    [0, 4, 1],
    [4, 5, -1],
    [0, 5, 1],
    [3, 5, -1],
    [1, 2, 0],
    [2, 4, 0],
  ]
  const curves: THREE_NS.QuadraticBezierCurve3[] = []
  const relPos: number[] = []
  rel.forEach(([a, b, side], i) => {
    const ya = slabY(a)
    const yb = slabY(b)
    const span = Math.abs(b - a)
    let p0: THREE_NS.Vector3
    let p1: THREE_NS.Vector3
    let p2: THREE_NS.Vector3
    if (side === 0) {
      const x = -1.4 + i * 0.35
      p0 = new THREE.Vector3(x, ya, -SLAB_D / 2)
      p2 = new THREE.Vector3(x + 0.6, yb, -SLAB_D / 2)
      p1 = new THREE.Vector3(x + 0.3, (ya + yb) / 2, -SLAB_D / 2 - 0.5 - span * 0.25)
    } else {
      const x = (side * SLAB_W) / 2
      const z0 = -0.7 + ((i * 0.37) % 1.4)
      p0 = new THREE.Vector3(x, ya, z0)
      p2 = new THREE.Vector3(x, yb, z0 + 0.25 * side)
      p1 = new THREE.Vector3(x + side * (0.45 + span * 0.28), (ya + yb) / 2, z0 + 0.1)
    }
    const cv = new THREE.QuadraticBezierCurve3(p0, p1, p2)
    curves.push(cv)
    const pts = cv.getPoints(28)
    for (let k = 0; k < pts.length - 1; k++) relPos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z)
  })
  const rg = new THREE.BufferGeometry()
  rg.setAttribute('position', new THREE.Float32BufferAttribute(relPos, 3))
  const relMat = new THREE.LineBasicMaterial({ color: hdr(THREE, COL.teal, 1.5), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  group.add(new THREE.LineSegments(rg, relMat))

  const pg = new THREE.BufferGeometry()
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(curves.length * 2 * 3), 3))
  const pulseMat = new THREE.PointsMaterial({
    color: hdr(THREE, COL.teal, 3),
    size: 0.22,
    map: dot,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const pulses = new THREE.Points(pg, pulseMat)
  pulses.frustumCulled = false
  group.add(pulses)
  return { group, slabMats, edgeMat, keyMat, relMat, curves, pulses, pulseMat }
}

// ─────────────────────────── 대시보드 ───────────────────────────
export interface Dash {
  group: THREE_NS.Group
  panels: THREE_NS.Group[]
  panelMats: THREE_NS.MeshBasicMaterial[]
  frameMats: THREE_NS.LineBasicMaterial[]
  bars: THREE_NS.InstancedMesh
  barBase: number[]
  donut: THREE_NS.Mesh[]
  donutSeg: number
  line: THREE_NS.Line
  linePts: number
  kpi: THREE_NS.InstancedMesh
  uplink: THREE_NS.Points
  uplinkMat: THREE_NS.PointsMaterial
  contentMats: THREE_NS.Material[]
}

export const PANEL_W = 2.55
export const PANEL_H = 1.55
export const PANEL_X = [-2.8, 0, 2.8]
export const DASH_Y = 3.75

export function makeDash(THREE: Three, dot: THREE_NS.Texture): Dash {
  const group = new THREE.Group()
  group.position.set(0, DASH_Y, -0.4)
  group.rotation.x = -0.12
  const panels: THREE_NS.Group[] = []
  const panelMats: THREE_NS.MeshBasicMaterial[] = []
  const frameMats: THREE_NS.LineBasicMaterial[] = []
  const contentMats: THREE_NS.Material[] = []
  const pGeo = new THREE.PlaneGeometry(PANEL_W, PANEL_H)
  const fGeo = new THREE.EdgesGeometry(pGeo)
  for (let k = 0; k < 3; k++) {
    const p = new THREE.Group()
    p.position.x = PANEL_X[k]
    const pm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x0b1a22), transparent: true, opacity: 0, depthWrite: false })
    const fm = new THREE.LineBasicMaterial({ color: hdr(THREE, COL.blue, 1.1), transparent: true, opacity: 0, depthWrite: false })
    panelMats.push(pm)
    frameMats.push(fm)
    p.add(new THREE.Mesh(pGeo, pm))
    p.add(new THREE.LineSegments(fGeo, fm))
    group.add(p)
    panels.push(p)
  }
  // 생산현황: 막대
  const nb = 12
  const bars = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.blue, 1.5), transparent: true, opacity: 0, depthWrite: false }),
    nb,
  )
  contentMats.push(bars.material as THREE_NS.Material)
  const barBase: number[] = []
  const rb = mulberry32(451)
  for (let i = 0; i < nb; i++) barBase.push(0.35 + rb() * 0.55)
  bars.position.set(0, 0, 0.01)
  bars.frustumCulled = false
  panels[0].add(bars)

  // 불량현황: 도넛 세그먼트
  const donutSeg = 64
  const segs: Array<[number, number, number]> = [
    [0.46, COL.amber, 1.4],
    [0.24, COL.red, 1.1],
    [0.18, COL.dim, 0.9],
    [0.12, COL.blue, 1.3],
  ]
  const donut: THREE_NS.Mesh[] = []
  let a0 = Math.PI / 2
  for (const [f, c, k] of segs) {
    const len = -f * Math.PI * 2 + 0.04
    const g = new THREE.RingGeometry(0.36, 0.56, donutSeg, 1, a0, len)
    const m = new THREE.MeshBasicMaterial({ color: hdr(THREE, c, k), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    contentMats.push(m)
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(-0.45, -0.08, 0.01)
    panels[1].add(mesh)
    donut.push(mesh)
    a0 += -f * Math.PI * 2
  }
  // 불량 파레토 막대(작게)
  const pareto = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0),
    new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 0.9), transparent: true, opacity: 0, depthWrite: false }),
    5,
  )
  contentMats.push(pareto.material as THREE_NS.Material)
  const m4 = new THREE.Matrix4()
  for (let i = 0; i < 5; i++) {
    m4.makeScale(0.75 * (1 - i * 0.17), 0.09, 1)
    m4.setPosition(0.3, 0.32 - i * 0.18, 0.01)
    pareto.setMatrixAt(i, m4)
  }
  pareto.frustumCulled = false
  panels[1].add(pareto)

  // KPI: 라인 + 타일
  const linePts = 40
  const lp = new Float32Array(linePts * 3)
  const rl = mulberry32(2023)
  let v = 0.1
  for (let i = 0; i < linePts; i++) {
    v += (rl() - 0.42) * 0.12
    v = Math.min(0.42, Math.max(-0.1, v))
    lp[i * 3] = -1.05 + (i / (linePts - 1)) * 2.1
    lp[i * 3 + 1] = -0.5 + (v + 0.12) * 0.9 + (i / linePts) * 0.25
    lp[i * 3 + 2] = 0.01
  }
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3))
  const lm = new THREE.LineBasicMaterial({ color: hdr(THREE, COL.teal, 2.2), transparent: true, opacity: 0, depthWrite: false })
  contentMats.push(lm)
  const line = new THREE.Line(lg, lm)
  line.frustumCulled = false
  panels[2].add(line)
  const kpi = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.62, 0.32),
    new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.teal, 0.55), transparent: true, opacity: 0, depthWrite: false }),
    3,
  )
  contentMats.push(kpi.material as THREE_NS.Material)
  for (let i = 0; i < 3; i++) {
    m4.makeTranslation(-0.75 + i * 0.75, 0.44, 0.01)
    kpi.setMatrixAt(i, m4)
  }
  kpi.frustumCulled = false
  panels[2].add(kpi)

  // 게이트웨이 업링크 입자(DB 상단 → 대시보드)
  const nu = 64
  const ug = new THREE.BufferGeometry()
  ug.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nu * 3), 3))
  const uplinkMat = new THREE.PointsMaterial({
    color: hdr(THREE, COL.blue, 2.4),
    size: 0.12,
    map: dot,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const uplink = new THREE.Points(ug, uplinkMat)
  uplink.frustumCulled = false

  return { group, panels, panelMats, frameMats, bars, barBase, donut, donutSeg, line, linePts, kpi, uplink, uplinkMat, contentMats }
}

// ─────────────────────────── 451 다이얼(바닥 링) ───────────────────────────
export interface Dial {
  group: THREE_NS.Group
  baseMat: THREE_NS.MeshBasicMaterial
  tickMat: THREE_NS.LineBasicMaterial
  sweep: THREE_NS.Mesh
  sweepMat: THREE_NS.MeshBasicMaterial
  sweepSeg: number
  head: THREE_NS.Points
  headMat: THREE_NS.PointsMaterial
  radius: number
}

export const DIAL_Y = SLAB_Y0 - 0.55

export function makeDial(THREE: Three, dot: THREE_NS.Texture): Dial {
  const group = new THREE.Group()
  group.position.y = DIAL_Y
  const radius = 4.0
  const base = new THREE.RingGeometry(radius - 0.03, radius + 0.03, 180, 1).rotateX(Math.PI / 2)
  const baseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.dim).multiplyScalar(0.6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  group.add(new THREE.Mesh(base, baseMat))
  // 15분 눈금(96), 시 눈금은 길게
  const tp: number[] = []
  for (let i = 0; i < 96; i++) {
    const a = -Math.PI / 2 + (i / 96) * Math.PI * 2
    const hour = i % 4 === 0
    const r0 = radius + 0.1
    const r1 = radius + (hour ? 0.42 : 0.2)
    tp.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1)
  }
  const tg = new THREE.BufferGeometry()
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3))
  const tickMat = new THREE.LineBasicMaterial({ color: new THREE.Color(COL.phos).multiplyScalar(0.5), transparent: true, opacity: 0, depthWrite: false })
  group.add(new THREE.LineSegments(tg, tickMat))
  // 스윕: rotateX(+π/2) 이면 θ 증가 = 위에서 볼 때 시계방향, 시작 θ=-π/2 = 먼 쪽(12시)
  const sweepSeg = 360
  const sg = new THREE.RingGeometry(radius - 0.14, radius + 0.08, sweepSeg, 1, -Math.PI / 2, Math.PI * 2).rotateX(Math.PI / 2)
  const sweepMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 2.3), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  const sweep = new THREE.Mesh(sg, sweepMat)
  sweep.geometry.setDrawRange(0, 0)
  group.add(sweep)
  const hg = new THREE.BufferGeometry()
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
  const headMat = new THREE.PointsMaterial({ color: hdr(THREE, COL.amber, 4), size: 0.9, map: dot, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const head = new THREE.Points(hg, headMat)
  head.frustumCulled = false
  group.add(head)
  return { group, baseMat, tickMat, sweep, sweepMat, sweepSeg, head, headMat, radius }
}

// ─────────────────────────── 먼지 ───────────────────────────
export function makeDust(THREE: Three, dot: THREE_NS.Texture) {
  const n = 700
  const p = new Float32Array(n * 3)
  const r = mulberry32(77)
  for (let i = 0; i < n; i++) {
    p[i * 3] = (r() * 2 - 1) * 22
    p[i * 3 + 1] = (r() * 2 - 1) * 10
    p[i * 3 + 2] = -20 + r() * 30
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(p, 3))
  const m = new THREE.PointsMaterial({ color: new THREE.Color(COL.blue).multiplyScalar(0.5), size: 0.07, map: dot, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })
  const pts = new THREE.Points(g, m)
  pts.frustumCulled = false
  return pts
}
