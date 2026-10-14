import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { FONT_SANS, ensureSceneFonts } from '../_host/fonts'
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
import { reportText } from './report'

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

const FONT_KR = FONT_SANS
// IBM Plex Mono(라틴) 뒤에 Pretendard — 파일명 접미사의 한글('최종', '사본')은 Pretendard 로.
const FONT_MONO = "'IBM Plex Mono', 'Pretendard Variable', monospace"

const SHEET_SUFFIXES = ['_v3_최종.xlsx', '_0412.xlsx', '_rev2.xlsx', '(사본).xlsx'] as const
// English sheet names for the EN locale (same slots as SHEET_TABS / SHEET_SUFFIXES).
const SHEET_TABS_EN = ['Output', 'Labor', 'Defects', 'KPI', 'BOM', 'ST', 'Work orders', 'OPEX'] as const
const SHEET_SUFFIXES_EN = ['_v3_final.xlsx', '_0412.xlsx', '_rev2.xlsx', '(copy).xlsx'] as const
const ERR_CELLS = ['#REF!', '#N/A', '#VALUE!'] as const

/** 아틀라스에 구울 모든 글자의 Pretendard 조각 + IBM Plex Mono 500 을 미리 로드. */
export async function loadFonts() {
  const text = [...SHEET_TABS, ...SHEET_SUFFIXES, ...ERR_CELLS, '0123456789.', reportText()].join(' ')
  const plex =
    typeof document !== 'undefined' && document.fonts
      ? document.fonts.load(`500 20px ${FONT_MONO}`, text).catch(() => undefined)
      : Promise.resolve()
  await Promise.all([ensureSceneFonts(text), Promise.race([plex, new Promise((r) => setTimeout(r, 1500))])])
}

// ─────────────────────────── 시트 아틀라스 ───────────────────────────
const TW = 512
const TH = 364

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

/**
 * 종이 스프레드시트 한 장 — 둥근 모서리 카드, 엑셀 그린 헤더 밴드, 옅은 격자, 절제된 숫자.
 * 밝기는 셰이더가 조명과 함께 조절한다(여기선 '종이 알베도'만).
 */
function drawSheet(g: CanvasRenderingContext2D, ox: number, oy: number, idx: number, en: boolean) {
  const rnd = mulberry32(9100 + idx * 77)
  const tab = (en ? SHEET_TABS_EN : SHEET_TABS)[idx]
  const M = 6 // 밉맵 번짐 방지 여백
  const W = TW - M * 2
  const H = TH - M * 2
  const R = 16
  g.save()
  g.translate(ox + M, oy + M)
  roundRect(g, 0, 0, W, H, R)
  g.save()
  g.clip()
  // 종이
  g.fillStyle = '#e9ecea'
  g.fillRect(0, 0, W, H)
  // 헤더 밴드(엑셀 그린, 차분하게)
  const HB = 58
  g.fillStyle = '#2e6a4f'
  g.fillRect(0, 0, W, HB)
  g.fillStyle = 'rgba(255,255,255,0.96)'
  g.font = `700 32px ${FONT_KR}`
  g.textBaseline = 'middle'
  g.fillText(tab, 20, HB / 2 + 1)
  g.font = `500 16px ${FONT_MONO}`
  g.fillStyle = 'rgba(225,240,232,0.72)'
  const suffix = (en ? SHEET_SUFFIXES_EN : SHEET_SUFFIXES)[idx % 4]
  const tw = g.measureText(suffix).width
  g.fillText(suffix, W - tw - 18, HB / 2 + 1)
  // 그리드
  const gy0 = HB
  const cols = 7
  const rows = 9
  const rh = 26
  const ch = (H - gy0 - rh) / (rows - 1)
  const cw = (W - 40) / cols
  // 열 머리(A,B,C…) + 행 머리
  g.fillStyle = '#d6dbd8'
  g.fillRect(0, gy0, W, rh)
  g.fillRect(0, gy0, 40, H - gy0)
  g.font = `500 13px ${FONT_MONO}`
  g.fillStyle = 'rgba(40,52,48,0.55)'
  for (let c = 0; c < cols; c++) g.fillText(String.fromCharCode(65 + c), 40 + c * cw + cw / 2 - 4, gy0 + rh / 2 + 1)
  for (let r = 1; r < rows; r++) g.fillText(String(r), 14, gy0 + rh + (r - 0.5) * ch + 1)
  // 셀 값 — 오른쪽 정렬 숫자, 일부만(밀도 낮게)
  g.font = `500 14px ${FONT_MONO}`
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = rnd()
      const x = 40 + c * cw
      const y = gy0 + rh + (r - 1) * ch
      if (v < 0.08) {
        g.fillStyle = 'rgba(46,106,79,0.14)'
        g.fillRect(x, y, cw, ch)
      }
      if (v > 0.38) {
        g.fillStyle = c === 0 ? 'rgba(30,40,36,0.78)' : 'rgba(30,40,36,0.58)'
        const num = (rnd() * (c % 3 === 0 ? 100 : 2400)).toFixed(c % 3 === 0 ? 1 : 0)
        const nw = g.measureText(num).width
        g.fillText(num, x + cw - nw - 8, y + ch / 2 + 1)
      }
    }
  }
  // 엑셀 오류 셀 — 옅은 붉은 채움 + 붉은 글자
  const errs = 1 + Math.floor(rnd() * 2)
  for (let k = 0; k < errs; k++) {
    const c = 1 + Math.floor(rnd() * 5)
    const r = 2 + Math.floor(rnd() * 6)
    const x = 40 + c * cw
    const y = gy0 + rh + (r - 1) * ch
    g.fillStyle = 'rgba(224,82,74,0.22)'
    g.fillRect(x + 1, y + 1, cw - 2, ch - 2)
    g.fillStyle = 'rgba(190,40,34,0.95)'
    g.fillText(ERR_CELLS[k % 3], x + 8, y + ch / 2 + 1)
  }
  // 격자선(헤어라인)
  g.strokeStyle = 'rgba(60,80,72,0.18)'
  g.lineWidth = 1
  g.beginPath()
  for (let c = 0; c <= cols; c++) {
    const x = Math.round(40 + c * cw) + 0.5
    g.moveTo(x, gy0)
    g.lineTo(x, H)
  }
  for (let r = 0; r < rows; r++) {
    const y = Math.round(gy0 + rh + r * ch) + 0.5
    g.moveTo(0, y)
    g.lineTo(W, y)
  }
  g.stroke()
  g.restore()
  // 외곽 헤어라인
  roundRect(g, 0.75, 0.75, W - 1.5, H - 1.5, R)
  g.strokeStyle = 'rgba(255,255,255,0.9)'
  g.lineWidth = 1.5
  g.stroke()
  g.restore()
}

/** Paints the 8 sheet cards into the atlas canvas in the given language. */
export function paintAtlas(cv: HTMLCanvasElement, en: boolean) {
  const g = cv.getContext('2d')!
  g.clearRect(0, 0, cv.width, cv.height)
  for (let i = 0; i < 8; i++) drawSheet(g, (i % 4) * TW, Math.floor(i / 4) * TH, i, en)
}

export function makeAtlas(THREE: Three, en = false) {
  const cv = document.createElement('canvas')
  cv.width = TW * 4
  cv.height = TH * 2
  paintAtlas(cv, en)
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
attribute float aLand;
attribute vec3 aTint;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vUv;
varying vec2 vLocal;
varying float vGlow;
varying float vAlpha;
varying float vErr;
varying float vLand;
varying vec3 vTint;
varying float vFog;
varying vec3 vN;
varying vec3 vV;
void main() {
  float col = mod(aTile, 4.0);
  float row = floor(aTile / 4.0);
  vUv = vec2((uv.x + col) / 4.0, (uv.y + (1.0 - row)) / 2.0);
  vLocal = uv;
  vGlow = aGlow; vAlpha = aAlpha; vErr = aErr; vTint = aTint; vLand = aLand;
  vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0));
  vV = normalize(cameraPosition - wp.xyz);
  vec4 mv = viewMatrix * wp;
  vFog = smoothstep(uFogFar, uFogNear, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`
const SHEET_FS = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uGlow;
uniform vec3 uErr;
uniform vec3 uKey;
uniform vec3 uCell;
uniform vec3 uCellEdge;
varying vec2 vUv;
varying vec2 vLocal;
varying float vGlow;
varying float vAlpha;
varying float vErr;
varying float vLand;
varying vec3 vTint;
varying float vFog;
varying vec3 vN;
varying vec3 vV;
float rbox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  vec4 tx = texture2D(uMap, vUv);
  vec3 n = gl_FrontFacing ? vN : -vN;
  // 종이 셰이딩: 램버트 + 넓은 반사광 + 가장자리 프레넬 — 텀블링할 때 빛을 받는다.
  float lam = 0.38 + 0.62 * max(dot(n, uKey), 0.0);
  vec3 h = normalize(uKey + vV);
  float spec = pow(max(dot(n, h), 0.0), 48.0);
  float fres = pow(1.0 - abs(dot(n, vV)), 3.0);
  // 뒷면: 비쳐 보이는 인쇄(살짝 어둡게) — 빈 회색 카드처럼 보이지 않게.
  vec3 paper = gl_FrontFacing ? tx.rgb : tx.rgb * 0.78;
  vec3 c = paper * vTint * lam * 0.5 + vec3(spec) * 0.1 + vec3(0.55, 0.75, 0.8) * fres * 0.1;
  // 대기 원근: 먼 장은 어둡고 차갑게
  c *= 0.45 + 0.55 * vFog;
  float a = tx.a;
  float gmask = 0.28 * a;

  // 착지: 종이 → DB 레코드 셀(어두운 유리 + 또렷한 헤어라인 + 필드 바)
  float land = smoothstep(0.72, 1.0, vLand);
  if (land > 0.0) {
    vec2 p = (vLocal - 0.5) * vec2(1.0, 0.71);
    float d = rbox(p, vec2(0.47, 0.32), 0.06);
    float aw = fwidth(d);
    float fill = 1.0 - smoothstep(-aw, aw, d);
    float edge = 1.0 - smoothstep(0.0, aw * 1.6, abs(d + aw * 1.2));
    // 필드 바 3 개(레코드 컬럼)
    vec2 q = vLocal;
    float bars = 0.0;
    for (int i = 0; i < 3; i++) {
      float fx = 0.12 + float(i) * 0.27;
      float w = i == 0 ? 0.13 : 0.2;
      float bx = step(fx, q.x) * step(q.x, fx + w);
      float by = step(0.42, q.y) * step(q.y, 0.58);
      bars += bx * by * (i == 0 ? 1.0 : 0.55);
    }
    vec3 cell = uCell * (0.85 + 0.3 * vTint.g) + uCellEdge * edge + uCellEdge * 0.42 * bars;
    c = mix(c, cell, land);
    a = mix(a, max(fill * 0.92, edge), land);
    gmask = mix(gmask, 0.18 * fill + 0.8 * edge + 0.35 * bars, land);
  }

  c = mix(c, uErr * (0.35 + a), vErr);
  c += uGlow * vGlow * gmask;
  float al = clamp(a * (1.0 + vGlow * 0.6) + vErr * 0.35 * a, 0.0, 1.0) * vAlpha * vFog;
  if (al < 0.004) discard;
  gl_FragColor = vec4(c, al);
}
`

export interface SheetSet {
  mesh: THREE_NS.InstancedMesh
  glow: THREE_NS.InstancedBufferAttribute
  alpha: THREE_NS.InstancedBufferAttribute
  err: THREE_NS.InstancedBufferAttribute
  /** 착지 진행(0..1) — 1 에 가까우면 종이 → DB 레코드 셀 룩. */
  land: THREE_NS.InstancedBufferAttribute
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
  // 종이 톤 — 거의 흰색, 아주 미세한 온/냉 편차(문서마다 다른 출처 느낌).
  const tintsA = [
    [1.0, 1.0, 1.0],
    [0.95, 0.98, 1.0],
    [1.0, 0.98, 0.94],
    [0.96, 1.0, 0.97],
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
    const br = 0.88 + rnd() * 0.2
    tint.set([tA[0] * br, tA[1] * br, tA[2] * br], i * 3)
    // 혼돈 위치: 타원 구름 — 카메라 앞(z 큰 쪽)과 중심 축은 비워 화면이 덮이지 않게.
    let x = 0
    let y = 0
    let z = 0
    for (let tries = 0; tries < 8; tries++) {
      x = (rnd() * 2 - 1) * 11.5
      y = (rnd() * 2 - 1) * 5.0 + 0.5
      z = -13 + rnd() * 15.5
      if (Math.hypot(x * 0.6, y, z - 1) > 3.4) break
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
    seed[o + 9] = 0.62 + rnd() * 0.42
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
  const land = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
  land.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('aLand', land)
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
      uKey: { value: new THREE.Vector3(-0.35, 0.8, 0.5).normalize() },
      uCell: { value: new THREE.Color(0x0e2a33).multiplyScalar(0.9) },
      uCellEdge: { value: hdr(THREE, COL.blue, 0.75) },
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
  return { mesh, glow, alpha, err, land, seed, target, slab, row, col, bad, count }
}

// ─────────────────────────── 애드온 / 공용 ───────────────────────────
type LineMaterialT = import('three/examples/jsm/lines/LineMaterial.js').LineMaterial

/** three/examples 애드온 — runtime 이 동적 import 해서 넘긴다(코드스플릿 유지). */
export interface Addons {
  RoundedBox: typeof import('three/examples/jsm/geometries/RoundedBoxGeometry.js').RoundedBoxGeometry
  LineSegments2: typeof import('three/examples/jsm/lines/LineSegments2.js').LineSegments2
  LineSegmentsGeometry: typeof import('three/examples/jsm/lines/LineSegmentsGeometry.js').LineSegmentsGeometry
  Line2: typeof import('three/examples/jsm/lines/Line2.js').Line2
  LineGeometry: typeof import('three/examples/jsm/lines/LineGeometry.js').LineGeometry
  LineMaterial: typeof import('three/examples/jsm/lines/LineMaterial.js').LineMaterial
}

export async function loadAddons(): Promise<Addons> {
  const [rb, ls2, lsg, l2, lg, lm] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/Line2.js'),
    import('three/examples/jsm/lines/LineGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js'),
  ])
  return {
    RoundedBox: rb.RoundedBoxGeometry,
    LineSegments2: ls2.LineSegments2,
    LineSegmentsGeometry: lsg.LineSegmentsGeometry,
    Line2: l2.Line2,
    LineGeometry: lg.LineGeometry,
    LineMaterial: lm.LineMaterial,
  }
}

/** 팻 라인 머티리얼(px 폭). 만든 것은 모두 out 에 모아 runtime.resize 가 resolution 을 맞춘다. */
function fatMat(THREE: Three, A: Addons, out: LineMaterialT[], color: THREE_NS.Color, width: number) {
  const m = new A.LineMaterial({
    linewidth: width,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    worldUnits: false,
    blending: THREE.AdditiveBlending,
  })
  // HDR 색(>1)을 유지 — 생성자 hex 는 클램프되므로 직접 복사.
  m.color.copy(color)
  out.push(m)
  return m
}

/** 둥근 사각 외곽선(XZ 평면, y 고정) → 세그먼트 배열에 push. */
function pushRoundRectXZ(out: number[], w: number, d: number, r: number, y: number, seg = 6) {
  const pts: Array<[number, number]> = []
  const cx = w / 2 - r
  const cz = d / 2 - r
  const corners: Array<[number, number, number]> = [
    [cx, cz, 0],
    [-cx, cz, Math.PI / 2],
    [-cx, -cz, Math.PI],
    [cx, -cz, Math.PI * 1.5],
  ]
  for (const [x, z, a0] of corners)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      pts.push([x + Math.cos(a) * r, z + Math.sin(a) * r])
    }
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    out.push(p[0], y, p[1], q[0], y, q[1])
  }
}

/** 바닥 접지 — 부드러운 방사형 그라디언트 데칼(가산, 아주 옅게). */
function makeFloorPool(THREE: Three, radius: number, color: number) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const g = cv.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.45)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(cv)
  const mat = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2).rotateX(-Math.PI / 2), mat)
  mesh.renderOrder = 0
  return { mesh, mat }
}

// ─────────────────────────── DB 슬랩 + 관계선 ───────────────────────────
export interface Db {
  group: THREE_NS.Group
  slabMat: THREE_NS.MeshPhysicalMaterial
  metalMat: THREE_NS.MeshStandardMaterial
  edgeMat: LineMaterialT
  keyMat: LineMaterialT
  relMat: LineMaterialT
  curves: THREE_NS.QuadraticBezierCurve3[]
  pulses: THREE_NS.Points
  pulseMat: THREE_NS.PointsMaterial
  pool: { mesh: THREE_NS.Mesh; mat: THREE_NS.MeshBasicMaterial }
}

export const SLAB_W = COLS * CELL_W + 0.34
export const SLAB_D = ROWS * CELL_D + 0.3
const SLAB_T = 0.07

export function makeDb(THREE: Three, A: Addons, fat: LineMaterialT[], dot: THREE_NS.Texture): Db {
  const group = new THREE.Group()
  // 유리 슬랩: 둥근 모서리 + 클리어코트. 6 장은 같은 지오메트리·머티리얼 → 인스턴싱 1 드로우.
  const slabGeo = new A.RoundedBox(SLAB_W, SLAB_T, SLAB_D, 3, 0.035)
  const slabMat = new THREE.MeshPhysicalMaterial({
    color: 0x10303a,
    metalness: 0.15,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.3,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const slabs = new THREE.InstancedMesh(slabGeo, slabMat, SLABS.length)
  const m4 = new THREE.Matrix4()
  for (let s = 0; s < SLABS.length; s++) {
    m4.makeTranslation(0, slabY(s) - SLAB_T / 2 + 0.02, 0)
    slabs.setMatrixAt(s, m4)
  }
  slabs.renderOrder = 1
  group.add(slabs)

  // 상·하 테두리 헤어라인(둥근 사각) — 팻 라인
  const edgePos: number[] = []
  for (let s = 0; s < SLABS.length; s++) {
    const y = slabY(s) + 0.02
    pushRoundRectXZ(edgePos, SLAB_W, SLAB_D, 0.035, y)
    pushRoundRectXZ(edgePos, SLAB_W, SLAB_D, 0.035, y - SLAB_T)
  }
  const eg = new A.LineSegmentsGeometry()
  eg.setPositions(edgePos)
  const edgeMat = fatMat(THREE, A, fat, hdr(THREE, COL.blue, 1.05), 1.15)
  const edges = new A.LineSegments2(eg, edgeMat)
  edges.renderOrder = 2
  group.add(edges)

  // 랙 구조: 모서리 기둥 4 + 슬랩마다 스탠드오프·브래킷(인스턴스) — 브러시드 금속.
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.92, roughness: 0.32, transparent: true, opacity: 0 })
  const yTop = slabY(SLABS.length - 1) + 0.18
  const yBot = slabY(0) - 0.32
  const postGeo = new THREE.CylinderGeometry(0.022, 0.022, yTop - yBot, 12, 1).translate(0, (yTop + yBot) / 2, 0)
  const posts = new THREE.InstancedMesh(postGeo, metalMat, 4)
  const px = SLAB_W / 2 + 0.07
  const pz = SLAB_D / 2 + 0.07
  const corners: Array<[number, number]> = [
    [px, pz],
    [-px, pz],
    [px, -pz],
    [-px, -pz],
  ]
  corners.forEach(([x, z], i) => {
    m4.makeTranslation(x, 0, z)
    posts.setMatrixAt(i, m4)
  })
  group.add(posts)
  const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16, 1)
  const caps = new THREE.InstancedMesh(capGeo, metalMat, 4 * SLABS.length)
  let ci = 0
  for (let s = 0; s < SLABS.length; s++)
    for (const [x, z] of corners) {
      m4.makeTranslation(x, slabY(s) - SLAB_T / 2 + 0.02, z)
      caps.setMatrixAt(ci++, m4)
    }
  group.add(caps)
  const brGeo = new A.RoundedBox(0.13, 0.025, 0.025, 1, 0.008)
  const brackets = new THREE.InstancedMesh(brGeo, metalMat, 4 * SLABS.length)
  const qy = new THREE.Quaternion()
  const yAxis = new THREE.Vector3(0, 1, 0)
  const one = new THREE.Vector3(1, 1, 1)
  const bp = new THREE.Vector3()
  ci = 0
  for (let s = 0; s < SLABS.length; s++)
    for (const [x, z] of corners) {
      qy.setFromAxisAngle(yAxis, Math.sign(x) === Math.sign(z) ? -Math.PI / 4 : Math.PI / 4)
      bp.set(x - Math.sign(x) * 0.045, slabY(s) - SLAB_T / 2 + 0.02, z - Math.sign(z) * 0.045)
      m4.compose(bp, qy, one)
      brackets.setMatrixAt(ci++, m4)
    }
  group.add(brackets)

  // PK 열 키 라인(앞 가장자리)
  const keyPos: number[] = []
  for (let s = 0; s < SLABS.length; s++) {
    const y = slabY(s) + 0.025
    keyPos.push(-SLAB_W / 2 + 0.05, y, SLAB_D / 2, SLAB_W / 2 - 0.05, y, SLAB_D / 2)
  }
  const kg = new A.LineSegmentsGeometry()
  kg.setPositions(keyPos)
  const keyMat = fatMat(THREE, A, fat, hdr(THREE, COL.teal, 2.0), 2.0)
  group.add(new A.LineSegments2(kg, keyMat))

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
    const pts = cv.getPoints(36)
    for (let k = 0; k < pts.length - 1; k++) relPos.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z)
  })
  const rg = new A.LineSegmentsGeometry()
  rg.setPositions(relPos)
  const relMat = fatMat(THREE, A, fat, hdr(THREE, COL.teal, 1.25), 1.5)
  group.add(new A.LineSegments2(rg, relMat))

  const pg = new THREE.BufferGeometry()
  pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(curves.length * 2 * 3), 3))
  const pulseMat = new THREE.PointsMaterial({
    color: hdr(THREE, COL.teal, 3),
    size: 0.2,
    map: dot,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const pulses = new THREE.Points(pg, pulseMat)
  pulses.frustumCulled = false
  group.add(pulses)

  // 바닥 접지 풀(다이얼 면)
  const pool = makeFloorPool(THREE, 4.6, COL.blue)
  pool.mesh.position.y = SLAB_Y0 - 0.56
  group.add(pool.mesh)
  return { group, slabMat, metalMat, edgeMat, keyMat, relMat, curves, pulses, pulseMat, pool }
}

// ─────────────────────────── 451 다이얼(바닥 링) ───────────────────────────
export interface Dial {
  group: THREE_NS.Group
  baseMat: THREE_NS.MeshBasicMaterial
  tickMat: LineMaterialT
  tickMajorMat: LineMaterialT
  sweep: THREE_NS.Mesh
  sweepMat: THREE_NS.MeshBasicMaterial
  sweepSeg: number
  head: THREE_NS.Points
  headMat: THREE_NS.PointsMaterial
  radius: number
}

export const DIAL_Y = SLAB_Y0 - 0.55

export function makeDial(THREE: Three, A: Addons, fat: LineMaterialT[], dot: THREE_NS.Texture): Dial {
  const group = new THREE.Group()
  group.position.y = DIAL_Y
  const radius = 4.0
  const base = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 180, 1).rotateX(Math.PI / 2)
  const baseMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.dim).multiplyScalar(0.6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  group.add(new THREE.Mesh(base, baseMat))
  // 15분 눈금(96) — 시 눈금(24)은 길고 굵게, 별도 머티리얼
  const tp: number[] = []
  const tpMajor: number[] = []
  for (let i = 0; i < 96; i++) {
    const a = -Math.PI / 2 + (i / 96) * Math.PI * 2
    const hour = i % 4 === 0
    const r0 = radius + 0.1
    const r1 = radius + (hour ? 0.4 : 0.2)
    const out = hour ? tpMajor : tp
    out.push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * r1, 0, Math.sin(a) * r1)
  }
  const tg = new A.LineSegmentsGeometry()
  tg.setPositions(tp)
  const tickMat = fatMat(THREE, A, fat, new THREE.Color(COL.phos).multiplyScalar(0.42), 1.0)
  group.add(new A.LineSegments2(tg, tickMat))
  const tgm = new A.LineSegmentsGeometry()
  tgm.setPositions(tpMajor)
  const tickMajorMat = fatMat(THREE, A, fat, new THREE.Color(COL.phos).multiplyScalar(0.62), 1.7)
  group.add(new A.LineSegments2(tgm, tickMajorMat))
  // 스윕: rotateX(+π/2) 이면 θ 증가 = 위에서 볼 때 시계방향, 시작 θ=-π/2 = 먼 쪽(12시)
  const sweepSeg = 360
  const sg = new THREE.RingGeometry(radius - 0.12, radius + 0.06, sweepSeg, 1, -Math.PI / 2, Math.PI * 2).rotateX(Math.PI / 2)
  const sweepMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 2.1), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
  const sweep = new THREE.Mesh(sg, sweepMat)
  sweep.geometry.setDrawRange(0, 0)
  group.add(sweep)
  const hg = new THREE.BufferGeometry()
  hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
  const headMat = new THREE.PointsMaterial({ color: hdr(THREE, COL.amber, 3.5), size: 0.8, map: dot, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const head = new THREE.Points(hg, headMat)
  head.frustumCulled = false
  group.add(head)
  return { group, baseMat, tickMat, tickMajorMat, sweep, sweepMat, sweepSeg, head, headMat, radius }
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

// ─────────────────────────── DB → 리포트 데이터 스트림 ───────────────────────────
export const STREAM_N = 18 // 스트림당 입자
export const STREAM_LUT = 48

export interface StreamSpec {
  p0: THREE_NS.Vector3
  p1: THREE_NS.Vector3
  p2: THREE_NS.Vector3
  p3: THREE_NS.Vector3
  color: number
}
export interface Streams {
  /** 스트림별 호길이 균등 샘플 [x,y,z]×STREAM_LUT */
  lut: Float32Array[]
  base: THREE_NS.Color[]
  lineMats: LineMaterialT[]
  points: THREE_NS.Points
  pos: THREE_NS.BufferAttribute
  col: THREE_NS.BufferAttribute
  heads: THREE_NS.Points
  headPos: THREE_NS.BufferAttribute
  headCol: THREE_NS.BufferAttribute
  group: THREE_NS.Group
}

/** 슬랩 옆면에서 나와 휘어 올라가 특정 비주얼 앞면으로 흡수되는 3차 베지어 — 팻 라인 궤적 + 소프트 입자. */
export function makeStreams(THREE: Three, A: Addons, fat: LineMaterialT[], dot: THREE_NS.Texture, specs: StreamSpec[]): Streams {
  const group = new THREE.Group()
  const lut: Float32Array[] = []
  const base: THREE_NS.Color[] = []
  const lineMats: LineMaterialT[] = []
  for (const sp of specs) {
    const cv = new THREE.CubicBezierCurve3(sp.p0, sp.p1, sp.p2, sp.p3)
    const pts = cv.getSpacedPoints(STREAM_LUT - 1)
    const arr = new Float32Array(STREAM_LUT * 3)
    pts.forEach((p, i) => arr.set([p.x, p.y, p.z], i * 3))
    lut.push(arr)
    base.push(new THREE.Color(sp.color))
    const lg = new A.LineGeometry()
    lg.setPositions(arr)
    const m = fatMat(THREE, A, fat, hdr(THREE, sp.color, 0.9), 1.3)
    lineMats.push(m)
    const line = new A.Line2(lg, m)
    line.frustumCulled = false
    line.renderOrder = 4
    group.add(line)
  }
  const n = specs.length * STREAM_N
  const g = new THREE.BufferGeometry()
  const pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  const col = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
  pos.setUsage(THREE.DynamicDrawUsage)
  col.setUsage(THREE.DynamicDrawUsage)
  g.setAttribute('position', pos)
  g.setAttribute('color', col)
  const mat = new THREE.PointsMaterial({ size: 0.15, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const points = new THREE.Points(g, mat)
  points.frustumCulled = false
  points.renderOrder = 7
  group.add(points)
  // 도착 지점 임팩트(비주얼 앞면의 작은 섬광) — 스트림당 1
  const hg = new THREE.BufferGeometry()
  const headPos = new THREE.BufferAttribute(new Float32Array(specs.length * 3), 3)
  const headCol = new THREE.BufferAttribute(new Float32Array(specs.length * 3), 3)
  specs.forEach((sp, i) => headPos.setXYZ(i, sp.p3.x, sp.p3.y, sp.p3.z))
  headCol.setUsage(THREE.DynamicDrawUsage)
  hg.setAttribute('position', headPos)
  hg.setAttribute('color', headCol)
  const heads = new THREE.Points(hg, new THREE.PointsMaterial({ size: 0.9, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
  heads.frustumCulled = false
  heads.renderOrder = 7
  group.add(heads)
  return { lut, base, lineMats, points, pos, col, heads, headPos, headCol, group }
}
