import type * as THREE_NS from 'three'
import type { RoundedBoxGeometry as RBG } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { LineSegments2 as LS2 } from 'three/examples/jsm/lines/LineSegments2.js'
import type { LineSegmentsGeometry as LSG } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import type { LineMaterial as LM } from 'three/examples/jsm/lines/LineMaterial.js'
import type { Three } from '../_host/three/types'
import { D_SAT, FLOOR_Y, HS, K, RUNS, SPAN, START, defect, type Run } from './model'

// 지오메트리/머티리얼 빌더.

// ── three 애드온(코드스플릿 유지: 런타임에서 동적 import) ──
export type Addons = {
  RoundedBoxGeometry: typeof RBG
  LineSegments2: typeof LS2
  LineSegmentsGeometry: typeof LSG
  LineMaterial: typeof LM
}

export async function loadAddons(): Promise<Addons> {
  const [rb, ls2, lsg, lm] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js'),
  ])
  return {
    RoundedBoxGeometry: rb.RoundedBoxGeometry,
    LineSegments2: ls2.LineSegments2,
    LineSegmentsGeometry: lsg.LineSegmentsGeometry,
    LineMaterial: lm.LineMaterial,
  }
}

/** 픽셀 폭 팻 라인 세그먼트. pts: [ax,ay,az,bx,by,bz, ...] */
function fatSegments(A: Addons, pts: ArrayLike<number>, opts: ConstructorParameters<typeof LM>[0]) {
  const geo = new A.LineSegmentsGeometry()
  geo.setPositions(Array.from(pts))
  const mat = new A.LineMaterial({ transparent: true, ...opts })
  const line = new A.LineSegments2(geo, mat)
  line.frustumCulled = false
  return { line, mat, geo }
}

/** LineSegmentsGeometry 의 인터리브 버퍼(세그먼트당 6 float) — 매 프레임 직접 갱신용. */
export function segBuffer(geo: THREE_NS.BufferGeometry, name: 'instanceStart' | 'instanceColorStart') {
  return (geo.getAttribute(name) as THREE_NS.InterleavedBufferAttribute).data
}

export const PHOS = 0xd7d7d7
export const TEAL = 0x4fe0c4
export const BLUE = 0x4ab3cc
export const AMBER = 0xd98a3d
export const RED = 0xe0503a

// ── 응답 곡면 셰이더 ────────────────────────────────────────────────
const SURF_COMMON = /* glsl */ `
uniform float uK, uW, uFit, uRipT, uRipA, uOpt, uRef;
uniform vec2 uStart;
const float SPAN = ${SPAN.toFixed(1)};
const float HS = ${HS};
const float DSAT = ${D_SAT.toFixed(1)};
float qb(vec2 ap, float w){
  vec2 c = vec2(0.25 + 0.2*w, -0.2 - 0.1*w);
  vec2 d = ap - c;
  float q = d.x*d.x + 0.9*d.y*d.y + 0.5*d.x*d.y;
  float b = 1.0 + 0.18*sin(2.3*ap.x + 1.1)*cos(1.7*ap.y - 0.4);
  return (1.0 + 0.25*w*w)*q*b;
}
float defectF(vec2 ap){ return 0.4 + DSAT*(1.0 - exp(-uK*qb(ap, uW)/DSAT)); }
float fitLocal(vec2 ap){ return smoothstep(0.0, 1.0, clamp(uFit*2.2 - length(ap)*0.8, 0.0, 1.0)); }
float rippleF(vec2 ap){
  float r = length(ap - uStart)*SPAN;
  float front = uRipT*2.4;
  return uRipA*0.06*sin(r*10.0 - uRipT*16.0)*exp(-r*0.35)*(1.0 - smoothstep(front - 0.8, front, r));
}
float surfH(vec2 ap){
  float l = fitLocal(ap);
  return defectF(ap)*HS*l + rippleF(ap)*(1.0 - l);
}
`

const SURF_VERT = /* glsl */ `
${SURF_COMMON}
varying float vD; varying vec2 vAP; varying vec3 vN; varying vec3 vWP; varying float vFit; varying float vRip;
void main(){
  vec2 ap = position.xz / SPAN;
  float e = 0.008;
  float h = surfH(ap);
  vec3 p = vec3(position.x, h, position.z);
  #ifdef FLOOR
  p.y = ${FLOOR_Y.toFixed(3)};
  #endif
  float hx = surfH(ap + vec2(e, 0.0));
  float hz = surfH(ap + vec2(0.0, e));
  vec3 n = normalize(vec3(-(hx - h)/(e*SPAN), 1.0, -(hz - h)/(e*SPAN)));
  vN = normalize(mat3(modelMatrix)*n);
  vD = defectF(ap); vAP = ap; vFit = fitLocal(ap); vRip = rippleF(ap);
  vec4 wp = modelMatrix*vec4(p, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix*viewMatrix*wp;
}
`

const SURF_FRAG = /* glsl */ `
${SURF_COMMON}
varying float vD; varying vec2 vAP; varying vec3 vN; varying vec3 vWP; varying float vFit; varying float vRip;
vec3 ramp(float x){
  x = clamp(x, 0.0, 1.0);
  vec3 c0 = vec3(0.12, 0.88, 0.70);
  vec3 c1 = vec3(0.18, 0.52, 0.85);
  vec3 c2 = vec3(0.92, 0.50, 0.16);
  vec3 c3 = vec3(1.00, 0.16, 0.10);
  if (x < 0.3) return mix(c0, c1, x/0.3);
  if (x < 0.62) return mix(c1, c2, (x - 0.3)/0.32);
  return mix(c2, c3, (x - 0.62)/0.38);
}
float lineAt(float f, float w){
  float d = 0.5 - abs(fract(f) - 0.5);
  return 1.0 - smoothstep(0.0, fwidth(f)*w, d);
}
void main(){
  vec3 rc = ramp((vD - 0.4)/19.0);
  float contour = lineAt(vD/2.0, 1.0);
  vec2 g = vAP*5.0;
  float grid = max(lineAt(g.x, 1.0), lineAt(g.y, 1.0));
  float edge = smoothstep(0.96, 1.0, max(abs(vAP.x), abs(vAP.y)));
  vec3 teal = vec3(0.31, 0.88, 0.77);
  float refLine = (1.0 - smoothstep(0.0, fwidth(vD)*1.6, abs(vD - 15.0)))*uRef;
#ifdef FLOOR
  float rad = 1.0 - smoothstep(0.6, 1.45, length(vAP));
  vec3 col = rc*contour*0.35*uFit + vec3(0.5)*grid*0.05 + vec3(1.0, 0.6, 0.25)*refLine*0.6;
  float m = 1.0 - smoothstep(0.9, 1.6, vD);
  col += teal*m*uOpt*0.25;
  gl_FragColor = vec4(col*rad, 1.0);
#else
  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWP);
  vec3 L = normalize(vec3(0.35, 1.0, 0.45));
  float dif = 0.3 + 0.7*max(dot(N, L), 0.0);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 pre = vec3(0.012, 0.016, 0.022)*dif + vec3(0.45, 0.55, 0.62)*grid*0.11 + vec3(0.6)*edge*0.18;
  vec3 fit = rc*(0.05 + 0.09*dif) + rc*fres*0.22 + rc*contour*0.95 + vec3(0.8)*grid*0.025;
  fit += vec3(1.4, 0.75, 0.3)*refLine*1.6;
  float m = 1.0 - smoothstep(0.9, 1.6, vD);
  float rim = 1.0 - smoothstep(0.0, fwidth(vD)*1.6, abs(vD - 1.25));
  fit += teal*(m*0.3 + rim*2.2)*uOpt;
  vec3 col = mix(pre, fit, vFit);
  float rr = max(vRip, 0.0)/0.06;
  col += teal*pow(rr, 3.0)*uRipA*1.5*(1.0 - vFit);
  gl_FragColor = vec4(col, 1.0);
#endif
}
`

export type SurfUniforms = {
  uK: { value: number }
  uW: { value: number }
  uFit: { value: number }
  uRipT: { value: number }
  uRipA: { value: number }
  uOpt: { value: number }
  uRef: { value: number }
  uStart: { value: THREE_NS.Vector2 }
}

export function buildSurface(THREE: Three) {
  const uniforms: SurfUniforms = {
    uK: { value: K },
    uW: { value: 0 },
    uFit: { value: 0 },
    uRipT: { value: 0 },
    uRipA: { value: 1 },
    uOpt: { value: 0 },
    uRef: { value: 0 },
    uStart: { value: new THREE.Vector2(START.a, START.p) },
  }
  const geo = new THREE.PlaneGeometry(SPAN * 2, SPAN * 2, 140, 140)
  geo.rotateX(-Math.PI / 2)
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SURF_VERT,
    fragmentShader: SURF_FRAG,
    side: THREE.DoubleSide,
  })
  const surface = new THREE.Mesh(geo, mat)
  surface.frustumCulled = false

  const floorGeo = new THREE.PlaneGeometry(SPAN * 2, SPAN * 2, 100, 100)
  floorGeo.rotateX(-Math.PI / 2)
  const floorMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SURF_VERT,
    fragmentShader: SURF_FRAG,
    defines: { FLOOR: 1 },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.frustumCulled = false
  floor.renderOrder = -1
  return { surface, floor, uniforms }
}

// ── 프레임(바닥 사각, 세로축, 눈금) — 팻 라인 ─────────────────────────
export function buildFrame(THREE: Three, A: Addons) {
  const S = SPAN
  const y = FLOOR_Y
  const major: number[] = []
  const minor: number[] = []
  const L = (arr: number[], a: number[], b: number[]) => arr.push(...a, ...b)
  L(major, [-S, y, -S], [S, y, -S])
  L(major, [S, y, -S], [S, y, S])
  L(major, [S, y, S], [-S, y, S])
  L(major, [-S, y, S], [-S, y, -S])
  // 세로축(불량률) — 뒤 오른쪽 모서리, 5% 마다 주 눈금 · 1% 마다 보조 눈금
  L(major, [S, y, -S], [S, 25 * HS, -S])
  for (let d = 1; d <= 25; d++) {
    const len = d % 5 === 0 ? 0.2 : 0.08
    L(d % 5 === 0 ? major : minor, [S, d * HS, -S], [S - len, d * HS, -S])
  }
  // 바닥 눈금(바깥쪽) — 코딩 단위 0.2 마다
  for (let i = -5; i <= 5; i++) {
    const v = (i / 5) * S
    const len = i % 5 === 0 ? 0.18 : 0.1
    L(i === 0 ? major : minor, [v, y, S], [v, y, S + len])
    L(i === 0 ? major : minor, [S, y, v], [S + len, y, v])
  }
  const group = new THREE.Group()
  const a = fatSegments(A, major, { color: new THREE.Color(0x8d8d8d).multiplyScalar(0.7), linewidth: 1.3, opacity: 0.9 })
  const b = fatSegments(A, minor, { color: new THREE.Color(0x8d8d8d).multiplyScalar(0.5), linewidth: 1.0, opacity: 0.5 })
  group.add(a.line, b.line)
  return group
}

// ── 부드러운 원형 헤일로 텍스처 ──────────────────────────────────────
export function haloTexture(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  grd.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export const runColor = (r: Run) => (r.w < 0 ? BLUE : r.w > 0 ? AMBER : PHOS)
export const runMeasured = (r: Run) => defect(r.a, r.p, r.w) + r.res

// ── DOE 런: 구 인스턴스 + 헤일로 + 잔차 스템 ─────────────────────────
export function buildRuns(THREE: Three, A: Addons, halo: THREE_NS.Texture) {
  const n = RUNS.length
  const sphere = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.075, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    n,
  )
  sphere.frustumCulled = false
  const c = new THREE.Color()
  RUNS.forEach((r, i) => sphere.setColorAt(i, c.set(runColor(r)).multiplyScalar(2.6)))

  const hgeo = new THREE.BufferGeometry()
  hgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3))
  hgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((n + 1) * 3), 3))
  const halos = new THREE.Points(
    hgeo,
    new THREE.PointsMaterial({
      size: 0.6,
      map: halo,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  )
  halos.frustumCulled = false

  // 잔차 스템: 팻 라인(정점 색 · 가산) — 위치/색은 런타임이 인터리브 버퍼에 직접 기록
  const st = fatSegments(A, new Float32Array(n * 6), {
    vertexColors: true,
    linewidth: 1.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  st.geo.setColors(new Float32Array(n * 6))
  const stems = st.line
  return { sphere, halos, stems }
}

// ── 경사 하강 트레일(튜브, drawRange 로 점진 공개) + 마커 ─────────────
export function buildPath(THREE: Three, A: Addons, pts: THREE_NS.Vector3[]) {
  const curve = new THREE.CatmullRomCurve3(pts)
  const segs = pts.length - 1
  const radial = 6
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segs, 0.032, radial, false),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(TEAL).multiplyScalar(3.2),
      transparent: true,
    }),
  )
  tube.frustumCulled = false
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffffff).multiplyScalar(3),
    }),
  )
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.2, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(TEAL).multiplyScalar(2.5),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  )
  ring.rotation.x = -Math.PI / 2
  const dr = fatSegments(A, new Float32Array(6), {
    color: new THREE.Color(TEAL).multiplyScalar(0.8),
    linewidth: 1.2,
    depthWrite: false,
  })
  const drop = dr.line
  return { tube, segs, radial, marker, ring, drop }
}

// ── 초음파 스택(컨버터 · 부스터 · 혼) + 사출 케이스 ───────────────────────
// 로컬 좌표: 혼 팁 면 y=0, 위로 부스터 → 컨버터. 케이스 상면 y≈0.30.
export function buildHorn(THREE: Three, A: Addons) {
  const group = new THREE.Group()
  const V = (r: number, y: number) => new THREE.Vector2(r, y)
  const fade = (m: THREE_NS.MeshStandardMaterial) => ((m.transparent = true), m)

  // 머티리얼: 티타늄 혼(밝은 새틴) · 부스터(알루) · 컨버터 하우징(다크 아노다이즈) · 클램프
  const titanium = fade(new THREE.MeshStandardMaterial({ color: 0xa3abb1, metalness: 1, roughness: 0.3 }))
  const booster = fade(new THREE.MeshStandardMaterial({ color: 0x858e95, metalness: 1, roughness: 0.38 }))
  const housing = fade(new THREE.MeshStandardMaterial({ color: 0x23292f, metalness: 0.7, roughness: 0.42 }))
  const clampM = fade(new THREE.MeshStandardMaterial({ color: 0x2e353c, metalness: 0.6, roughness: 0.5 }))
  const rubber = fade(new THREE.MeshStandardMaterial({ color: 0x0e1012, metalness: 0, roughness: 0.8 }))

  const stack = new THREE.Group()
  // 혼: 팁 모따기 → 카테노이드 곡선(r = r0·cosh) → 숄더 → 스터드 홈
  const hp: THREE_NS.Vector2[] = [V(0, 0), V(0.138, 0), V(0.15, 0.012)]
  const H = 1.08
  const r0 = 0.15
  const r1 = 0.3
  const k = Math.acosh(r1 / r0) / H
  for (let i = 1; i <= 24; i++) {
    const y = 0.012 + (i / 24) * (H - 0.012)
    hp.push(V(r0 * Math.cosh(k * y), y))
  }
  hp.push(V(0.3, 1.11), V(0.292, 1.12), V(0.27, 1.125))
  const horn = new THREE.Mesh(new THREE.LatheGeometry(hp, 64), titanium)
  // 혼 측면 플랫(렌치 플랫 느낌의 링 홈 2줄)
  const groove = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.006, 8, 64), booster)
  groove.rotation.x = Math.PI / 2
  groove.position.y = 1.05
  stack.add(horn, groove)

  // 부스터: 바디 + 노달 마운팅 링(모따기)
  const bp: THREE_NS.Vector2[] = [
    V(0, 1.125),
    V(0.27, 1.125),
    V(0.27, 1.5),
    V(0.3, 1.5),
    V(0.4, 1.53),
    V(0.405, 1.56),
    V(0.405, 1.62),
    V(0.4, 1.65),
    V(0.3, 1.68),
    V(0.255, 1.68),
    V(0.245, 2.02),
    V(0.27, 2.03),
    V(0, 2.03),
  ]
  stack.add(new THREE.Mesh(new THREE.LatheGeometry(bp, 64), booster))

  // 컨버터 하우징: 냉각 리브 + 상단 캡 + 커넥터
  const cp: THREE_NS.Vector2[] = [V(0, 2.03), V(0.3, 2.03), V(0.31, 2.05)]
  for (let r = 0; r < 7; r++) {
    const y = 2.12 + r * 0.075
    cp.push(V(0.31, y), V(0.325, y + 0.012), V(0.325, y + 0.035), V(0.31, y + 0.047))
  }
  cp.push(V(0.31, 2.72), V(0.31, 2.86), V(0.29, 2.9), V(0.12, 2.92), V(0.07, 2.92), V(0.07, 3.02), V(0.055, 3.04), V(0, 3.04))
  stack.add(new THREE.Mesh(new THREE.LatheGeometry(cp, 64), housing))
  // 커넥터 케이블(뒤로 휘어 빠짐)
  const cable = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 3.02, 0),
        new THREE.Vector3(0.02, 3.16, -0.06),
        new THREE.Vector3(0.12, 3.24, -0.32),
        new THREE.Vector3(0.3, 3.08, -0.62),
        new THREE.Vector3(0.45, 2.6, -0.85),
        new THREE.Vector3(0.5, 2.0, -0.95),
      ]),
      32,
      0.03,
      8,
      false,
    ),
    rubber,
  )
  stack.add(cable)

  // 마운팅 클램프(링을 잡는 두 블록 + 볼트)
  for (const sx of [-1, 1]) {
    const blk = new THREE.Mesh(new A.RoundedBoxGeometry(0.16, 0.2, 0.34, 2, 0.03), clampM)
    blk.position.set(sx * 0.47, 1.585, 0)
    stack.add(blk)
    for (const sz of [-1, 1]) {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 6), booster)
      bolt.rotation.z = Math.PI / 2
      bolt.position.set(sx * 0.56, 1.585, sz * 0.1)
      stack.add(bolt)
    }
  }
  group.add(stack)

  // 혼 팁 링(초음파 에너지)
  const tip = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.008, 8, 64),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(TEAL).multiplyScalar(3),
      transparent: true,
    }),
  )
  tip.rotation.x = Math.PI / 2
  tip.position.y = 0.02
  group.add(tip)

  // 케이스(하판 + 상판, 라운드) · 스크루 보스 · 벤트 · 용착 접합선(라운드 사각 튜브)
  const caseGroup = new THREE.Group()
  const lowerMat = fade(new THREE.MeshStandardMaterial({ color: 0x1a2128, metalness: 0.05, roughness: 0.42 }))
  const upperMat = fade(new THREE.MeshStandardMaterial({ color: 0x222a33, metalness: 0.05, roughness: 0.36 }))
  const detailMat = fade(new THREE.MeshStandardMaterial({ color: 0x0c0f12, metalness: 0.2, roughness: 0.6 }))
  const lower = new THREE.Mesh(new A.RoundedBoxGeometry(1.0, 0.16, 0.66, 3, 0.035), lowerMat)
  lower.position.y = 0.08
  const upper = new THREE.Mesh(new A.RoundedBoxGeometry(1.0, 0.14, 0.66, 3, 0.04), upperMat)
  upper.position.y = 0.16 + 0.07 + 0.005
  caseGroup.add(lower, upper)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 20), detailMat)
      boss.position.set(sx * 0.42, 0.306, sz * 0.26)
      caseGroup.add(boss)
    }
  for (let v = 0; v < 5; v++) {
    const slot = new THREE.Mesh(new A.RoundedBoxGeometry(0.2, 0.006, 0.022, 1, 0.003), detailMat)
    slot.position.set(0.28, 0.306, -0.1 + v * 0.05)
    caseGroup.add(slot)
  }
  // 용착 접합선(불량) — 접합부를 감싸는 라운드 사각 발광 튜브
  const rr = 0.04
  const hw = 0.5 + 0.006
  const hd = 0.33 + 0.006
  const shape = new THREE.Shape()
  shape.moveTo(-hw + rr, -hd)
  shape.lineTo(hw - rr, -hd)
  shape.quadraticCurveTo(hw, -hd, hw, -hd + rr)
  shape.lineTo(hw, hd - rr)
  shape.quadraticCurveTo(hw, hd, hw - rr, hd)
  shape.lineTo(-hw + rr, hd)
  shape.quadraticCurveTo(-hw, hd, -hw, hd - rr)
  shape.lineTo(-hw, -hd + rr)
  shape.quadraticCurveTo(-hw, -hd, -hw + rr, -hd)
  const loop = shape.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y))
  loop.pop()
  const seam = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 200, 0.007, 6, true),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(RED).multiplyScalar(3),
      transparent: true,
    }),
  )
  seam.position.y = 0.163
  caseGroup.add(seam)
  group.add(caseGroup)

  const mats = [titanium, booster, housing, clampM, rubber, lowerMat, upperMat, detailMat]
  return { group, horn: stack, tip, caseGroup, seam, mats }
}

/** 접지 그림자 텍스처(검정 · 방사 감쇠). */
export function shadowTexture(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(0,0,0,0.85)')
  grd.addColorStop(0.45, 'rgba(0,0,0,0.5)')
  grd.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// ── 부유 입자 ───────────────────────────────────────────────────────
export function buildDust(THREE: Three, halo: THREE_NS.Texture, n = 420) {
  const base = new Float32Array(n * 3)
  const vel = new Float32Array(n * 3)
  let s = 7
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < n; i++) {
    base[i * 3] = (rnd() * 2 - 1) * 7
    base[i * 3 + 1] = rnd() * 5 - 0.6
    base[i * 3 + 2] = (rnd() * 2 - 1) * 7
    vel[i * 3] = (rnd() - 0.5) * 0.08
    vel[i * 3 + 1] = 0.03 + rnd() * 0.06
    vel[i * 3 + 2] = (rnd() - 0.5) * 0.08
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.06,
      map: halo,
      color: new THREE.Color(0x9fd8e0).multiplyScalar(0.7),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  pts.frustumCulled = false
  return { pts, base, vel, n }
}
