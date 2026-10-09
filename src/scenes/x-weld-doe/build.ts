import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { D_SAT, FLOOR_Y, HS, K, RUNS, SPAN, START, defect, type Run } from './model'

// 지오메트리/머티리얼 빌더.

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

// ── 프레임(바닥 사각, 세로축, 눈금) ─────────────────────────────────
export function buildFrame(THREE: Three) {
  const S = SPAN
  const y = FLOOR_Y
  const pts: number[] = []
  const L = (a: number[], b: number[]) => pts.push(...a, ...b)
  L([-S, y, -S], [S, y, -S])
  L([S, y, -S], [S, y, S])
  L([S, y, S], [-S, y, S])
  L([-S, y, S], [-S, y, -S])
  // 세로축(불량률) — 뒤 왼쪽 모서리
  L([S, y, -S], [S, 25 * HS, -S])
  for (let d = 5; d <= 25; d += 5) L([S, d * HS, -S], [S - 0.18, d * HS, -S])
  // 바닥 눈금
  for (let i = -4; i <= 4; i++) {
    const v = (i / 5) * S
    L([v, y, S], [v, y, S + 0.12])
    L([S, y, v], [S + 0.12, y, v])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const mat = new THREE.LineBasicMaterial({
    color: new THREE.Color(0x8d8d8d).multiplyScalar(0.55),
    transparent: true,
  })
  return new THREE.LineSegments(geo, mat)
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
export function buildRuns(THREE: Three, halo: THREE_NS.Texture) {
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

  const sgeo = new THREE.BufferGeometry()
  sgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3))
  sgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3))
  const stems = new THREE.LineSegments(
    sgeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  )
  stems.frustumCulled = false
  return { sphere, halos, stems }
}

// ── 경사 하강 트레일(튜브, drawRange 로 점진 공개) + 마커 ─────────────
export function buildPath(THREE: Three, pts: THREE_NS.Vector3[]) {
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
  const dropGeo = new THREE.BufferGeometry()
  dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
  const drop = new THREE.Line(
    dropGeo,
    new THREE.LineBasicMaterial({
      color: new THREE.Color(TEAL).multiplyScalar(0.8),
      transparent: true,
    }),
  )
  drop.frustumCulled = false
  return { tube, segs, radial, marker, ring, drop }
}

// ── 초음파 혼 + 사출 케이스 ─────────────────────────────────────────
export function buildHorn(THREE: Three) {
  const group = new THREE.Group()
  const prof: Array<[number, number]> = [
    [0.0, 0.0],
    [0.15, 0.0],
    [0.16, 0.05],
    [0.2, 0.55],
    [0.3, 1.05],
    [0.33, 1.25],
    [0.42, 1.27],
    [0.42, 1.36],
    [0.3, 1.38],
    [0.3, 2.3],
    [0.24, 2.32],
    [0.24, 3.0],
    [0.0, 3.0],
  ]
  const lathe = new THREE.LatheGeometry(
    prof.map(([r, y]) => new THREE.Vector2(r, y)),
    56,
  )
  const metal = new THREE.MeshStandardMaterial({
    color: 0x80898f,
    metalness: 1,
    roughness: 0.36,
    transparent: true,
  })
  const horn = new THREE.Mesh(lathe, metal)
  group.add(horn)

  // 혼 끝 링(초음파 에너지)
  const tip = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 8, 48),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(TEAL).multiplyScalar(3),
      transparent: true,
    }),
  )
  tip.rotation.x = Math.PI / 2
  tip.position.y = 0.02
  group.add(tip)

  // 케이스(하판 + 상판), 용착 접합선
  const caseGroup = new THREE.Group()
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x1a2128,
    metalness: 0.1,
    roughness: 0.45,
    transparent: true,
    opacity: 0.95,
  })
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.66), shellMat)
  lower.position.y = 0.08
  const upper = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.66), shellMat)
  upper.position.y = 0.16 + 0.07 + 0.005
  caseGroup.add(lower, upper)
  const edgeMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(PHOS).multiplyScalar(0.9),
    transparent: true,
  })
  for (const m of [lower, upper]) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat)
    e.position.copy(m.position)
    caseGroup.add(e)
  }
  // 용착 접합선(불량) — 얇은 발광 밴드
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(1.03, 0.018, 0.69),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(RED).multiplyScalar(3),
      transparent: true,
    }),
  )
  seam.position.y = 0.163
  caseGroup.add(seam)
  group.add(caseGroup)

  return { group, horn, tip, caseGroup, seam, metal, shellMat, edgeMat }
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
