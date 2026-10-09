import type * as THREE_NS from 'three'
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

// ───────────────────────── glass C/T tower ─────────────────────────

const towerVert = /* glsl */ `
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

const towerFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uHot;
uniform float uH;
uniform float uTakt;
uniform float uHotAmt;
uniform float uTime;
uniform float uPulse;
varying vec3 vWorld;
varying vec3 vN;
varying vec3 vLocal;
void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vN), V)), 2.2);
  float y = vWorld.y;
  float yn = clamp(y / max(uH, 0.001), 0.0, 1.0);
  // 상승 스캔 밴드
  float band = smoothstep(0.92, 1.0, sin(y * 7.0 - uTime * 2.4) * 0.5 + 0.5);
  float fine = smoothstep(0.75, 1.0, sin(y * 46.0) * 0.5 + 0.5) * 0.25;
  // 세로 엣지 하이라이트(로컬 x/z 가 ±0.5 근처)
  float ex = smoothstep(0.42, 0.5, abs(vLocal.x));
  float ez = smoothstep(0.42, 0.5, abs(vLocal.z));
  float edge = max(ex * step(0.5, abs(vN.z)), ez * step(0.5, abs(vN.x)));
  float top = smoothstep(uH - 0.18, uH, y);
  float over = smoothstep(uTakt - 0.02, uTakt + 0.06, y) * uHotAmt;
  vec3 col = mix(uColor, uHot, over);
  float k = 0.015 + 0.05 * yn + 0.26 * fres + 0.16 * band + fine * 0.12 + 0.32 * edge + 0.75 * top + uPulse * 0.5;
  k *= mix(1.0, 1.8, over);
  gl_FragColor = vec4(col * k, 1.0);
}
`

export type Tower = {
  group: THREE_NS.Group
  body: THREE_NS.Mesh
  edges: THREE_NS.LineSegments
  cap: THREE_NS.Mesh
  uni: {
    uColor: { value: THREE_NS.Color }
    uHot: { value: THREE_NS.Color }
    uH: { value: number }
    uTakt: { value: number }
    uHotAmt: { value: number }
    uTime: { value: number }
    uPulse: { value: number }
  }
  capMat: THREE_NS.MeshBasicMaterial
  edgeMat: THREE_NS.LineBasicMaterial
}

export function buildTower(THREE: Three, x: number, color: number, unitBox: THREE_NS.BufferGeometry, unitEdges: THREE_NS.BufferGeometry): Tower {
  const group = new THREE.Group()
  group.position.set(x, 0, 0)
  const uni = {
    uColor: { value: new THREE.Color(color) },
    uHot: { value: new THREE.Color(COL.red) },
    uH: { value: 1 },
    uTakt: { value: 2 },
    uHotAmt: { value: 0 },
    uTime: { value: 0 },
    uPulse: { value: 0 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: towerVert,
    fragmentShader: towerFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const body = new THREE.Mesh(unitBox, mat)
  body.scale.set(TOWER_W, 1, TOWER_W)
  body.renderOrder = 2
  group.add(body)

  const edgeMat = new THREE.LineBasicMaterial({
    color: hdr(THREE, color, 1.6),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const edges = new THREE.LineSegments(unitEdges, edgeMat)
  edges.scale.set(TOWER_W, 1, TOWER_W)
  edges.renderOrder = 3
  group.add(edges)

  const capMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, color, 2.2),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(TOWER_W, TOWER_W), capMat)
  cap.rotation.x = -Math.PI / 2
  cap.renderOrder = 4
  group.add(cap)

  return { group, body, edges, cap, uni, capMat, edgeMat }
}

// ───────────────────────── bottleneck plane ─────────────────────────

const planeFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  float ex = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
  float ez = smoothstep(0.0, 0.5, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
  float grid = smoothstep(0.93, 1.0, sin(vUv.x * 160.0 - uTime * 3.0) * 0.5 + 0.5) * 0.15;
  float rim = smoothstep(0.42, 0.5, abs(vUv.y - 0.5)) * 1.4;
  float k = (0.10 + grid + rim) * ex + ez * 0.12 * ex;
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
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 5
  // 전면 엣지 라인(밝은 수평선)
  const lineMat = new THREE.LineBasicMaterial({
    color: hdr(THREE, COL.red, 2.4),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const g = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-width / 2, 0, depth / 2),
    new THREE.Vector3(width / 2, 0, depth / 2),
    new THREE.Vector3(-width / 2, 0, -depth / 2),
    new THREE.Vector3(width / 2, 0, -depth / 2),
  ])
  const line = new THREE.LineSegments(g, lineMat)
  const group = new THREE.Group()
  group.add(mesh, line)
  return { group, uni, lineMat }
}

/** 점선 takt 기준선. */
export function buildTaktLine(THREE: Three, width: number, z: number, y: number) {
  const pts: THREE_NS.Vector3[] = []
  const n = 120
  for (let i = 0; i < n; i++) {
    const a = -width / 2 + (width * i) / n
    pts.push(new THREE.Vector3(a, y, z), new THREE.Vector3(a + (width / n) * 0.5, y, z))
  }
  const mat = new THREE.LineBasicMaterial({
    color: hdr(THREE, COL.teal, 1.1),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  return {
    line: new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat),
    mat,
  }
}

// ───────────────────────── floor ─────────────────────────

const floorFrag = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uGrid;
varying vec3 vW;
void main() {
  vec2 p = vW.xz;
  vec2 g = abs(fract(p / 0.775 - 0.5) - 0.5) / fwidth(p / 0.775);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  float r = length(p * vec2(0.55, 1.0));
  float fade = smoothstep(4.0, 16.0, r);
  float alpha = mix(0.86, 1.0, fade);
  vec3 col = mix(uBg, uGrid, line * 0.22 * (1.0 - fade));
  gl_FragColor = vec4(col, alpha);
}
`

export function buildFloorOverlay(THREE: Three, bg: string) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uBg: { value: new THREE.Color(bg) },
      uGrid: { value: new THREE.Color(COL.blue).multiplyScalar(0.6) },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: floorFrag,
    transparent: true,
    depthWrite: false,
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat)
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.003
  m.renderOrder = 1
  return m
}

// ───────────────────────── jig ─────────────────────────

/**
 * 스타일화한 지그/픽스처: 상판 + 가이드 포스트 + (커팅: 블레이드 / 검사: 프로브 핀 어레이).
 * 그룹 원점 = 지그가 앉는 면(타워 상단).
 */
export function buildJig(THREE: Three, kind: 'cut' | 'test', mergeGeometries: (g: THREE_NS.BufferGeometry[]) => THREE_NS.BufferGeometry | null) {
  const group = new THREE.Group()
  const W = TOWER_W + 0.34
  const metal = new THREE.MeshStandardMaterial({
    color: 0x6b757d,
    metalness: 0.6,
    roughness: 0.35,
    emissive: new THREE.Color(0x1c2328),
  })
  const parts: THREE_NS.BufferGeometry[] = []
  const plate = new THREE.BoxGeometry(W, 0.09, W)
  plate.translate(0, 0.42, 0)
  parts.push(plate)
  const bridge = new THREE.BoxGeometry(W * 0.5, 0.16, 0.24)
  bridge.translate(0, 0.55, 0)
  parts.push(bridge)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const post = new THREE.CylinderGeometry(0.035, 0.035, 0.46, 10)
      post.translate((sx * W) / 2 - sx * 0.07, 0.2, (sz * W) / 2 - sz * 0.07)
      parts.push(post)
    }
  const body = new THREE.Mesh(mergeGeometries(parts) ?? plate, metal)
  group.add(body)

  const glowMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COL.amber, 3.0),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  let tool: THREE_NS.Mesh
  if (kind === 'cut') {
    const blade = new THREE.BoxGeometry(W * 0.92, 0.02, 0.05)
    blade.translate(0, 0.02, 0)
    const blade2 = blade.clone()
    blade2.rotateY(Math.PI / 2)
    tool = new THREE.Mesh(mergeGeometries([blade, blade2]) ?? blade, glowMat)
  } else {
    const pins: THREE_NS.BufferGeometry[] = []
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++) {
        const p = new THREE.CylinderGeometry(0.018, 0.018, 0.38, 6)
        p.translate(-0.27 + i * 0.18, 0.19, -0.18 + j * 0.18)
        pins.push(p)
      }
    tool = new THREE.Mesh(mergeGeometries(pins) ?? pins[0], glowMat)
  }
  group.add(tool)

  const edgeMat = new THREE.LineBasicMaterial({
    color: hdr(THREE, COL.amber, 2.6),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const plateEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, 0.09, W)), edgeMat)
  plateEdges.position.y = 0.42
  group.add(plateEdges)

  return { group, glowMat, edgeMat }
}

/** 절삭 링(커터): 타워를 감싸는 사각 링. */
export function buildCutter(THREE: Three) {
  const s = TOWER_W / 2 + 0.07
  const pts = [
    [-s, -s],
    [s, -s],
    [s, -s],
    [s, s],
    [s, s],
    [-s, s],
    [-s, s],
    [-s, -s],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z))
  const mat = new THREE.LineBasicMaterial({
    color: hdr(THREE, 0xffd2a0, 5),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ring = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat)
  const discMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COL.amber, 1.4),
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const disc = new THREE.Mesh(new THREE.PlaneGeometry(s * 2.6, s * 2.6), discMat)
  disc.rotation.x = -Math.PI / 2
  const g = new THREE.Group()
  g.add(ring, disc)
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
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uT * 1.3 + ph * 3.0));
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 0.028 * uScale / -mv.z;
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){ float d = length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor = vec4(vec3(0.35,0.75,0.7) * vA * smoothstep(0.5,0.0,d), 1.0); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const pts = new THREE.Points(g, mat)
  pts.frustumCulled = false
  return { points: pts, uni }
}

// ───────────────────────── station plinths / conveyor / products ─────────────────────────

export function buildLineBase(THREE: Three, length: number) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({
    color: 0x14191d,
    metalness: 0.7,
    roughness: 0.45,
  })
  const plinth = new THREE.InstancedMesh(new THREE.BoxGeometry(TOWER_W + 0.3, 0.12, TOWER_W + 0.3), metal, STATIONS)
  const m = new THREE.Matrix4()
  for (let i = 0; i < STATIONS; i++) {
    m.makeTranslation(stationX(i), 0.06, 0)
    plinth.setMatrixAt(i, m)
  }
  group.add(plinth)

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.05, 0.42),
    new THREE.MeshStandardMaterial({
      color: 0x0d1114,
      metalness: 0.5,
      roughness: 0.6,
    }),
  )
  belt.position.set(0, 0.145, 0)
  group.add(belt)

  // 벨트 양쪽 레일 글로우
  const railMat = new THREE.LineBasicMaterial({
    color: hdr(THREE, COL.blue, 0.9),
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const rails = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-length / 2, 0.17, 0.22),
      new THREE.Vector3(length / 2, 0.17, 0.22),
      new THREE.Vector3(-length / 2, 0.17, -0.22),
      new THREE.Vector3(length / 2, 0.17, -0.22),
    ]),
    railMat,
  )
  group.add(rails)
  return { group, railMat }
}

export function buildProducts(THREE: Three, count: number) {
  // 소형 배터리팩: 납작한 셀 바디
  const geo = new THREE.BoxGeometry(0.26, 0.11, 0.2)
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a3036,
    metalness: 0.4,
    roughness: 0.4,
    emissive: new THREE.Color(COL.teal),
    emissiveIntensity: 0.3,
  })
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.frustumCulled = false
  // 상단 라벨 스트립(밝은 띠)
  const stripGeo = new THREE.BoxGeometry(0.27, 0.012, 0.06)
  const stripMat = new THREE.MeshBasicMaterial({
    color: hdr(THREE, COL.teal, 2.4),
  })
  const strip = new THREE.InstancedMesh(stripGeo, stripMat, count)
  strip.frustumCulled = false
  return { mesh, strip, mat, stripMat }
}
