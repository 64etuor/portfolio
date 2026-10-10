import type * as THREE_NS from 'three'
import type { RoundedBoxGeometry as RBG } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { mergeGeometries as MG } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { LineSegments2 as LS2 } from 'three/examples/jsm/lines/LineSegments2.js'
import type { LineSegmentsGeometry as LSG } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import type { LineMaterial as LM } from 'three/examples/jsm/lines/LineMaterial.js'
import type { Three } from '../_host/three/types'
import { canvasFont } from '../_host/fonts'
import { CELL_H, CELL_R, CELL_TOP, COLS, MACHINE_X, PITCH, REV_COL, REV_ROW, ROWS, TRAY_TOP, cellX, cellZ } from './data'

// 지오메트리/머티리얼 빌더. 런타임 값은 전부 인자로 받은 THREE 에서.

export const C = {
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xff3b30,
  phosphor: 0xd7d7d7,
}

// ── three 애드온(코드스플릿 유지: 런타임에서 동적 import) ──
export type Addons = {
  RoundedBoxGeometry: typeof RBG
  mergeGeometries: typeof MG
  LineSegments2: typeof LS2
  LineSegmentsGeometry: typeof LSG
  LineMaterial: typeof LM
}

export async function loadAddons(): Promise<Addons> {
  const [rb, bgu, ls2, lsg, lm] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    import('three/examples/jsm/lines/LineSegments2.js'),
    import('three/examples/jsm/lines/LineSegmentsGeometry.js'),
    import('three/examples/jsm/lines/LineMaterial.js'),
  ])
  return {
    RoundedBoxGeometry: rb.RoundedBoxGeometry,
    mergeGeometries: bgu.mergeGeometries,
    LineSegments2: ls2.LineSegments2,
    LineSegmentsGeometry: lsg.LineSegmentsGeometry,
    LineMaterial: lm.LineMaterial,
  }
}

/**
 * 정적 부품 수집기 — 머티리얼별로 지오메트리를 모아 하나의 메시로 병합(드로우콜 절약).
 * add() 는 넘겨받은 지오메트리를 소비(dispose)한다.
 */
export function kit(THREE: Three, A: Addons) {
  const parts = new Map<THREE_NS.Material, THREE_NS.BufferGeometry[]>()
  const m4 = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const e = new THREE.Euler()
  const p = new THREE.Vector3()
  const one = new THREE.Vector3(1, 1, 1)
  const add = (geo: THREE_NS.BufferGeometry, mat: THREE_NS.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone()
    geo.dispose()
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k)
    g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one))
    const list = parts.get(mat)
    if (list) list.push(g)
    else parts.set(mat, [g])
  }
  /** 라운드 박스(반경은 최소 치수의 절반 미만으로 클램프). */
  const rbox = (mat: THREE_NS.Material, w: number, h: number, d: number, x: number, y: number, z: number, r = 0.02, rx = 0, ry = 0, rz = 0) => {
    const rr = Math.min(r, Math.min(w, h, d) * 0.49)
    add(new A.RoundedBoxGeometry(w, h, d, 2, rr), mat, x, y, z, rx, ry, rz)
  }
  const cyl = (mat: THREE_NS.Material, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 24, rx = 0, ry = 0, rz = 0) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z, rx, ry, rz)
  const lathe = (mat: THREE_NS.Material, prof: Array<[number, number]>, x: number, y: number, z: number, seg = 40) =>
    add(new THREE.LatheGeometry(prof.map(([r, yy]) => new THREE.Vector2(r, yy)), seg), mat, x, y, z)
  const tube = (mat: THREE_NS.Material, pts: Array<[number, number, number]>, r: number, segs = 64) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((v) => new THREE.Vector3(...v)), false, 'catmullrom', 0.2), segs, r, 6, false), mat)
  const into = (group: THREE_NS.Object3D) => {
    parts.forEach((list, mat) => {
      const merged = A.mergeGeometries(list)
      list.forEach((g) => g.dispose())
      if (merged) group.add(new THREE.Mesh(merged, mat))
    })
    parts.clear()
  }
  return { add, rbox, cyl, lathe, tube, into }
}

/** XZ 평면(법선 +Y) 직사각형 묶음 → 하나의 BufferGeometry. 프레임 브래킷·글리프용. */
export function quadsGeometry(THREE: Three, rects: Array<[number, number, number, number]>) {
  const pos: number[] = []
  const idx: number[] = []
  rects.forEach(([x0, z0, x1, z1], i) => {
    pos.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1)
    const b = i * 4
    idx.push(b, b + 2, b + 1, b, b + 3, b + 2)
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** 모서리 브래킷 사각 프레임(검출 박스). */
export function bracketGeometry(THREE: Three, half: number, len: number, th: number) {
  const h = half
  const r: Array<[number, number, number, number]> = []
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      // 가로
      const xa = sx * h
      const xb = sx * (h - len)
      r.push([Math.min(xa, xb), sz * h - th / 2, Math.max(xa, xb), sz * h + th / 2])
      // 세로
      const za = sz * h
      const zb = sz * (h - len)
      r.push([sx * h - th / 2, Math.min(za, zb) + (sz < 0 ? th / 2 : 0), sx * h + th / 2, Math.max(za, zb) - (sz > 0 ? th / 2 : 0)])
    }
  return quadsGeometry(THREE, r)
}

export function minusGeometry(THREE: Three, s: number, th: number) {
  return quadsGeometry(THREE, [[-s, -th, s, th]])
}

/** 18650 형 셀: 수축튜브(wrap) lathe + 금속 단자(metal) lathe. y=0 바닥, +끝이 위. */
export function cellGeometries(THREE: Three) {
  const r = CELL_R
  const H = CELL_H
  const V = (x: number, y: number) => new THREE.Vector2(x, y)
  const wrap = new THREE.LatheGeometry(
    [V(0.8 * r, 0.004), V(0.93 * r, 0), V(0.99 * r, 0.006), V(r, 0.014), V(r, H - 0.014), V(0.99 * r, H - 0.006), V(0.93 * r, H), V(0.8 * r, H - 0.004)],
    48,
  )
  const metal = new THREE.LatheGeometry(
    [
      V(0, 0.003),
      V(0.82 * r, 0.003),
      V(0.82 * r, H - 0.008),
      V(0.66 * r, H - 0.004),
      V(0.44 * r, H - 0.004),
      V(0.4 * r, H + 0.016),
      V(0.34 * r, H + 0.021),
      V(0, H + 0.021),
    ],
    40,
  )
  // 절연 와셔(+극 링)
  const washer = new THREE.LatheGeometry([V(0.82 * r, H - 0.003), V(0.66 * r, H - 0.002)], 40)
  return { wrap, metal, washer }
}

export function materials(THREE: Three) {
  const wrap = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.32,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  })
  const nickel = new THREE.MeshStandardMaterial({ color: 0xb4b9be, metalness: 1, roughness: 0.32, side: THREE.DoubleSide })
  const washer = new THREE.MeshStandardMaterial({ color: 0xb9b2a4, metalness: 0, roughness: 0.6, side: THREE.DoubleSide })
  const anodized = new THREE.MeshStandardMaterial({ color: 0x1b1f24, metalness: 0.85, roughness: 0.38 })
  const holder = new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.2, roughness: 0.55 })
  // 압출 알루미늄(새틴) — 약간 거친 면 + 브러시드 상판
  const alu = new THREE.MeshStandardMaterial({ color: 0x8a9299, metalness: 0.9, roughness: 0.44 })
  const brushed = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.92, roughness: 0.3 })
  // 캐비닛: 프레임(짙은 차콜) + 도어 패널(분체 도장 슬레이트)
  const frame = new THREE.MeshStandardMaterial({ color: 0x1d2228, metalness: 0.25, roughness: 0.62 })
  const paint = new THREE.MeshStandardMaterial({ color: 0x4a545e, metalness: 0.12, roughness: 0.55 })
  const paintLight = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.45, roughness: 0.34 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.6, roughness: 0.3 })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0f11, metalness: 0, roughness: 0.82 })
  const matte = new THREE.MeshStandardMaterial({ color: 0x1a1f24, metalness: 0, roughness: 0.95 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1418, metalness: 0, roughness: 0.05, clearcoat: 1 })
  const additive = (color: number, mul: number, opacity = 1) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(mul),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  return { wrap, nickel, washer, anodized, holder, alu, brushed, frame, paint, paintLight, dark, rubber, matte, glass, additive }
}
export type Mats = ReturnType<typeof materials>

/** 부드러운 접지 그림자(라운드 사각 감쇠) — 바닥/상판 위 데칼 평면용. */
export function shadowTexture(THREE: Three) {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const img = g.createImageData(S, S)
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      // 슈퍼엘립스 거리 → 부드러운 감쇠
      const u = Math.abs((x + 0.5) / S - 0.5) * 2
      const v = Math.abs((y + 0.5) / S - 0.5) * 2
      const d = Math.pow(Math.pow(u, 4) + Math.pow(v, 4), 0.25)
      const a = Math.pow(1 - Math.min(1, Math.max(0, (d - 0.55) / 0.45)), 2)
      const i = (y * S + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 0
      img.data[i + 3] = Math.round(a * 255)
    }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  return t
}

/** 덮개 유리: 패널 가장자리 + 프레넬 글로우, 대각 반사 스트릭(평평한 면이 단색으로 뜨지 않게). */
export function coverGlassMaterial(THREE: Three) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x9fd8e8) }, uOp: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix*vec4(position,1.0);
        vN = normalize(mat3(modelMatrix)*normal);
        vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOp;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
        float edge = 1.0 - smoothstep(0.0, 0.035, e);
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 4.0);
        if (vN.y < -0.5) discard; // 바닥면 없음(상판 위에 놓인 덮개)
        float a = uOp*(0.004 + 0.02*fres + 0.05*edge);
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}

/** 픽셀 폭 팻 라인(LineSegments2). 좌표: [ax,ay,az,bx,by,bz, ...]. */
export function fatLines(THREE: Three, A: Addons, pts: number[], color: number, width: number, opacity = 1, additive = true) {
  const geo = new A.LineSegmentsGeometry()
  geo.setPositions(pts)
  const mat = new A.LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false })
  if (additive) mat.blending = THREE.AdditiveBlending
  const line = new A.LineSegments2(geo, mat)
  line.frustumCulled = false
  return { line, mat }
}

/** 세로 그라디언트(아래 밝음) 캔버스 텍스처 — 구조광 시트. */
export function sheetTexture(THREE: Three) {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createLinearGradient(0, 0, 0, 128)
  grd.addColorStop(0, 'rgba(255,255,255,0)')
  grd.addColorStop(0.75, 'rgba(255,255,255,0.06)')
  grd.addColorStop(0.95, 'rgba(255,255,255,0.35)')
  grd.addColorStop(1, 'rgba(255,255,255,1)')
  g.fillStyle = grd
  g.fillRect(0, 0, 4, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** 머신 모니터 화면(검사 UI 미니어처). */
export function screenTexture(THREE: Three, kind: 'kit' | 'insert' | 'battery' | 'spare') {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 160
  const g = c.getContext('2d')!
  g.fillStyle = '#04120f'
  g.fillRect(0, 0, 256, 160)
  g.strokeStyle = 'rgba(79,224,196,0.35)'
  g.lineWidth = 1
  g.strokeRect(6.5, 6.5, 243, 147)
  g.fillStyle = 'rgba(79,224,196,0.9)'
  g.font = canvasFont(700, 13, 'mono')
  g.fillText(kind === 'battery' ? 'POLARITY' : kind === 'insert' ? 'INSERT / NUT' : 'ASSY JIG', 14, 26)
  g.fillStyle = 'rgba(215,215,215,0.55)'
  g.font = canvasFont(400, 10, 'mono')
  g.fillText('CAM 01  ·  LOT-0417', 14, 42)
  if (kind === 'battery') {
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 8; k++) {
        const x = 30 + k * 27
        const y = 64 + r * 24
        const bad = r === 1 && k === 5
        g.strokeStyle = bad ? '#ff4b3e' : '#4fe0c4'
        g.lineWidth = bad ? 2 : 1.2
        g.beginPath()
        g.arc(x, y, 9, 0, Math.PI * 2)
        g.stroke()
      }
  } else {
    g.strokeStyle = '#4fe0c4'
    g.lineWidth = 1.2
    for (let k = 0; k < 4; k++) g.strokeRect(24 + k * 56, 66, 40, 60)
    for (let k = 0; k < 4; k++) {
      g.beginPath()
      g.arc(44 + k * 56, 96, 8, 0, Math.PI * 2)
      g.stroke()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** 배터리 트레이(M/C 3 테이블 위). 셀 인스턴스 + 역삽 셀 그룹 + 검출 오버레이. */
export function buildTray(THREE: Three, A: Addons, M: Mats, shadowTex: THREE_NS.Texture) {
  const root = new THREE.Group()
  const W = COLS * PITCH + 0.16
  const D = ROWS * PITCH + 0.16
  const k = kit(THREE, A)
  // 베이스 · 홀더 플레이트 · 4면 레일(라운드) + 코너 체결 볼트 · 위치 결정 핀
  k.rbox(M.anodized, W, TRAY_TOP, D, 0, TRAY_TOP / 2, 0, 0.014)
  k.rbox(M.holder, W - 0.03, 0.03, D - 0.03, 0, 0.24, 0, 0.01)
  k.rbox(M.anodized, W, 0.12, 0.045, 0, 0.13, D / 2 - 0.0225, 0.012)
  k.rbox(M.anodized, W, 0.12, 0.045, 0, 0.13, -D / 2 + 0.0225, 0.012)
  k.rbox(M.anodized, 0.045, 0.12, D - 0.09, W / 2 - 0.0225, 0.13, 0, 0.012)
  k.rbox(M.anodized, 0.045, 0.12, D - 0.09, -W / 2 + 0.0225, 0.13, 0, 0.012)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      k.cyl(M.nickel, 0.011, 0.011, 0.008, sx * (W / 2 - 0.0225), 0.194, sz * (D / 2 - 0.0225), 16)
      k.cyl(M.dark, 0.005, 0.005, 0.009, sx * (W / 2 - 0.0225), 0.194, sz * (D / 2 - 0.0225), 6)
    }
  // 엔드 핸들(측면 손잡이)
  for (const sx of [-1, 1]) {
    k.rbox(M.alu, 0.03, 0.03, D * 0.5, sx * (W / 2 + 0.05), 0.12, 0, 0.012)
    for (const sz of [-1, 1]) k.rbox(M.alu, 0.07, 0.025, 0.025, sx * (W / 2 + 0.02), 0.12, sz * D * 0.23, 0.01)
  }
  k.into(root)
  // 상판 위 접지 그림자
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.5, D + 0.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.75, depthWrite: false, color: 0x000000 }),
  )
  sh.rotation.x = -Math.PI / 2
  sh.position.y = 0.003
  sh.renderOrder = -1
  root.add(sh)

  const { wrap, metal, washer } = cellGeometries(THREE)
  const n = COLS * ROWS - 1
  const wrapI = new THREE.InstancedMesh(wrap, M.wrap, n)
  const metalI = new THREE.InstancedMesh(metal, M.nickel, n)
  const washerI = new THREE.InstancedMesh(washer, M.washer, n)
  const frameMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const ringGeo = new THREE.RingGeometry(CELL_R * 1.02, CELL_R * 1.1, 48)
  ringGeo.rotateX(-Math.PI / 2)
  const frameI = new THREE.InstancedMesh(ringGeo, frameMat, n)
  const cells: Array<{ x: number; z: number; c: number; r: number }> = []
  const m4 = new THREE.Matrix4()
  const col = new THREE.Color()
  const wraps = [0x1f5a73, 0x1b4f66, 0x22627c]
  let i = 0
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (c === REV_COL && r === REV_ROW) continue
      const x = cellX(c)
      const z = cellZ(r)
      m4.makeTranslation(x, TRAY_TOP, z)
      wrapI.setMatrixAt(i, m4)
      metalI.setMatrixAt(i, m4)
      washerI.setMatrixAt(i, m4)
      wrapI.setColorAt(i, col.setHex(wraps[(c * 7 + r * 3) % 3]))
      m4.makeTranslation(x, CELL_TOP + 0.004, z)
      frameI.setMatrixAt(i, m4)
      frameI.setColorAt(i, col.setRGB(0, 0, 0))
      cells.push({ x, z, c, r })
      i++
    }
  frameI.renderOrder = 5
  root.add(wrapI, metalI, washerI, frameI)

  // 역삽 셀: 같은 셀을 거꾸로(−극이 위). 들어올리기 위해 별도 그룹.
  const rev = new THREE.Group()
  const rx = cellX(REV_COL)
  const rz = cellZ(REV_ROW)
  rev.position.set(rx, TRAY_TOP, rz)
  const revBody = new THREE.Group()
  revBody.position.y = CELL_H / 2
  const flip = new THREE.Group()
  flip.rotation.x = Math.PI
  const inner = new THREE.Group()
  inner.position.y = -CELL_H / 2
  const wrapRevMat = M.wrap.clone()
  wrapRevMat.color.setHex(0x1f5a73)
  inner.add(new THREE.Mesh(wrap, wrapRevMat), new THREE.Mesh(metal, M.nickel), new THREE.Mesh(washer, M.washer))
  flip.add(inner)
  revBody.add(flip)
  rev.add(revBody)
  root.add(rev)

  const redFrameMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(C.red).multiplyScalar(4),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const redFrame = new THREE.Mesh(bracketGeometry(THREE, PITCH * 0.56, 0.06, 0.014), redFrameMat)
  redFrame.position.set(rx, CELL_TOP + 0.032, rz)
  redFrame.renderOrder = 6
  // −글리프(셀과 함께 움직임) — 정상 셀의 + 글리프와 같은 모서리
  const minus = new THREE.Mesh(minusGeometry(THREE, 0.06, 0.013), redFrameMat)
  minus.position.set(0, CELL_H + 0.1, 0)
  minus.renderOrder = 6
  root.add(redFrame)
  rev.add(minus)
  // 빈 슬롯 마커(배출 후)
  const slot = new THREE.Mesh(new THREE.RingGeometry(CELL_R * 0.92, CELL_R * 1.05, 40), redFrameMat.clone())
  // 역삽 셀 둘레 적색 링(셀과 함께)
  const redRing = new THREE.Mesh(new THREE.RingGeometry(CELL_R * 1.04, CELL_R * 1.16, 48), redFrameMat)
  redRing.rotation.x = -Math.PI / 2
  redRing.position.y = CELL_H + 0.006
  redRing.renderOrder = 6
  rev.add(redRing)
  slot.rotation.x = -Math.PI / 2
  slot.position.set(rx, 0.26, rz)
  root.add(slot)

  return { root, cells, wrapI, frameI, rev, revBody, redFrame, redFrameMat, slot, minus, W, D }
}

/** 비전 검사 헤드(카메라 + 렌즈 + 링 조명) + 프러스텀(팻 라인) + 구조광 시트(트레이 위). */
export function buildScanner(THREE: Three, A: Addons, M: Mats, headY: number, footW: number, footD: number, footY: number) {
  const g = new THREE.Group()
  const head = new THREE.Group()
  head.position.set(0, headY, 0)
  const k = kit(THREE, A)
  // 산업용 카메라 바디(라운드) + 방열 핀 + 마운트 플레이트 + 후면 커넥터
  k.rbox(M.paintLight, 0.17, 0.2, 0.17, 0, 0.13, 0, 0.022)
  for (let f = 0; f < 5; f++)
    for (const sx of [-1, 1]) k.rbox(M.dark, 0.016, 0.012, 0.13, sx * 0.09, 0.065 + f * 0.032, 0, 0.004)
  k.rbox(M.dark, 0.2, 0.022, 0.2, 0, 0.243, 0, 0.006)
  k.rbox(M.alu, 0.12, 0.012, 0.06, 0, 0.17, 0.088, 0.004)
  k.cyl(M.alu, 0.016, 0.016, 0.04, 0, 0.17, -0.1, 16, Math.PI / 2)
  k.cyl(M.rubber, 0.012, 0.012, 0.05, 0, 0.17, -0.14, 12, Math.PI / 2)
  // 렌즈 경통: 마운트 → 포커스 그립 링(요철) → 경통 → 후드
  const prof: Array<[number, number]> = [
    [0.0, 0.03],
    [0.062, 0.03],
    [0.062, 0.0],
    [0.056, -0.004],
  ]
  for (let r = 0; r < 6; r++) {
    const y0 = -0.012 - r * 0.009
    prof.push([0.06, y0], [0.064, y0 - 0.0035], [0.06, y0 - 0.007])
  }
  prof.push([0.054, -0.07], [0.054, -0.11], [0.06, -0.118], [0.064, -0.13], [0.05, -0.132], [0.0, -0.132])
  k.lathe(M.dark, prof, 0, 0, 0, 40)
  // 링 조명 하우징(도넛) + 스포크
  k.lathe(M.anodized, [[0.1, -0.084], [0.168, -0.084], [0.18, -0.092], [0.18, -0.1], [0.172, -0.107], [0.1, -0.107], [0.1, -0.084]], 0, 0, 0, 48)
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * Math.PI * 2 + 0.5
    k.rbox(M.anodized, 0.05, 0.01, 0.014, Math.cos(a) * 0.078, -0.095, Math.sin(a) * 0.078, 0.003, 0, -a, 0)
  }
  k.into(head)
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), M.glass)
  glass.rotation.x = Math.PI / 2
  glass.position.y = -0.131
  head.add(glass)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.008, 10, 64), M.additive(C.blue, 2.2))
  ring.rotation.x = Math.PI / 2
  ring.position.y = -0.108
  head.add(ring)
  g.add(head)

  // 프러스텀 라인(팻 라인)
  const ly = headY - 0.13
  const fy = footY
  const fw = footW / 2
  const fd = footD / 2
  const pts = [
    [0, ly, 0, -fw, fy, -fd],
    [0, ly, 0, fw, fy, -fd],
    [0, ly, 0, fw, fy, fd],
    [0, ly, 0, -fw, fy, fd],
    [-fw, fy, -fd, fw, fy, -fd],
    [fw, fy, -fd, fw, fy, fd],
    [fw, fy, fd, -fw, fy, fd],
    [-fw, fy, fd, -fw, fy, -fd],
  ].flat()
  const fr = fatLines(THREE, A, pts, C.teal, 1.4, 0.55)
  fr.mat.color.multiplyScalar(0.9)
  const frustumMat = fr.mat
  g.add(fr.line)

  // 구조광 시트: 렌즈→트레이 사이 세로 평면(아래가 밝음) + 바닥 라인
  const sheetMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(C.teal).multiplyScalar(0.2),
    map: sheetTexture(THREE),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const sh = ly - fy
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(footD, sh), sheetMat)
  sheet.rotation.y = Math.PI / 2
  const sheetPivot = new THREE.Group()
  sheetPivot.add(sheet)
  sheet.position.y = fy + sh / 2
  g.add(sheetPivot)
  const lineMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(C.teal).multiplyScalar(2.5),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, footD), lineMat)
  line.position.y = fy
  sheetPivot.add(line)
  return { group: g, head, ring, frustumMat, sheetPivot, sheetMat, lineMat }
}

/** 범용 비전 검사 M/C. 테이블 상판 y=0, 바닥 y=−1.42. */
export function buildMachine(THREE: Three, A: Addons, M: Mats, kind: 'kit' | 'insert' | 'battery' | 'spare') {
  const g = new THREE.Group()
  const k = kit(THREE, A)
  const TW = 3.0
  const TD = 2.0
  const FZ = TD / 2 - 0.04 // 캐비닛 전면
  let coverMat: THREE_NS.ShaderMaterial | null = null

  // ── 캐비닛: 프레임 + 2도어(그림자 이음매) + 손잡이 + 루버 + 명판 + 레벨링 풋 ──
  k.rbox(M.frame, TW - 0.08, 1.28, TD - 0.08, 0, -0.72, 0, 0.035)
  for (const sx of [-1, 1]) {
    const dx = sx * 0.715
    k.rbox(M.paint, 1.39, 1.1, 0.03, dx, -0.71, FZ + 0.012, 0.012)
    // 손잡이(스탠드오프 2 + 바)
    k.rbox(M.brushed, 0.022, 0.26, 0.022, sx * 0.09, -0.52, FZ + 0.052, 0.01)
    k.cyl(M.brushed, 0.008, 0.008, 0.028, sx * 0.09, -0.42, FZ + 0.035, 10, Math.PI / 2)
    k.cyl(M.brushed, 0.008, 0.008, 0.028, sx * 0.09, -0.62, FZ + 0.035, 10, Math.PI / 2)
    // 하단 루버
    for (let v = 0; v < 4; v++) k.rbox(M.dark, 0.5, 0.018, 0.01, dx + sx * 0.18, -1.12 + v * 0.05, FZ + 0.029, 0.006)
    // 측면 패널 이음매
    k.rbox(M.dark, 0.008, 1.1, 0.01, sx * (TW / 2 - 0.04 + 0.002), -0.71, 0, 0.003, 0, Math.PI / 2, 0)
  }
  // 명판
  k.rbox(M.brushed, 0.24, 0.07, 0.006, -1.02, -0.3, FZ + 0.029, 0.003)
  // 플린스 + 레벨링 풋
  k.rbox(M.dark, TW - 0.3, 0.05, TD - 0.3, 0, -1.385, 0, 0.01)
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      k.cyl(M.brushed, 0.018, 0.018, 0.05, sx * 1.3, -1.37, sz * 0.78, 12)
      k.cyl(M.rubber, 0.055, 0.065, 0.022, sx * 1.3, -1.409, sz * 0.78, 24)
    }
  // 상판: 하부 스커트 + 브러시드 판(T 슬롯)
  k.rbox(M.dark, TW - 0.04, 0.05, TD - 0.04, 0, -0.06, 0, 0.012)
  k.rbox(kind === 'spare' ? M.matte : M.brushed, TW + 0.08, 0.05, TD + 0.08, 0, -0.025, 0, 0.014)
  if (kind !== 'spare') for (let s = -3; s <= 3; s++) k.rbox(M.dark, TW - 0.2, 0.004, 0.016, 0, 0.0008, s * 0.27, 0.002)

  // ── 갠트리: 압출 알루미늄 포스트(홈) + 빔 + 크로스 암 + 캐리지 ──
  const postH = 2.55
  for (const sx of [-1, 1]) {
    const px = sx * 1.38
    k.rbox(M.dark, 0.22, 0.02, 0.22, px, 0.01, -0.82, 0.006)
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) k.cyl(M.brushed, 0.01, 0.01, 0.012, px + bx * 0.085, 0.024, -0.82 + bz * 0.085, 8)
    k.rbox(M.alu, 0.1, postH, 0.1, px, postH / 2 + 0.02, -0.82, 0.012)
    // T 홈(4면)
    k.rbox(M.dark, 0.018, postH - 0.06, 0.012, px, postH / 2 + 0.02, -0.82 + 0.047, 0.004)
    k.rbox(M.dark, 0.018, postH - 0.06, 0.012, px, postH / 2 + 0.02, -0.82 - 0.047, 0.004)
    k.rbox(M.dark, 0.012, postH - 0.06, 0.018, px + 0.047, postH / 2 + 0.02, -0.82, 0.004)
    k.rbox(M.dark, 0.012, postH - 0.06, 0.018, px - 0.047, postH / 2 + 0.02, -0.82, 0.004)
    // 코너 브래킷
    k.rbox(M.frame, 0.03, 0.14, 0.11, px - sx * 0.065, postH - 0.13, -0.82, 0.006)
  }
  k.rbox(M.alu, 2.96, 0.12, 0.12, 0, postH, -0.82, 0.014)
  k.rbox(M.dark, 2.9, 0.018, 0.012, 0, postH, -0.82 + 0.057, 0.004)
  k.rbox(M.dark, 2.9, 0.018, 0.012, 0, postH + 0.032, -0.82 + 0.057, 0.004)
  // 캐리지 + 크로스 암 + 수직 드롭
  k.rbox(M.paintLight, 0.2, 0.2, 0.04, 0, postH, -0.74, 0.012)
  k.rbox(M.alu, 0.09, 0.09, 0.78, 0, postH, -0.39, 0.012)
  k.rbox(M.dark, 0.014, 0.012, 0.74, 0, postH + 0.042, -0.39, 0.004)
  k.rbox(M.alu, 0.07, 0.3, 0.07, 0, postH - 0.15, 0, 0.01)
  k.rbox(M.dark, 0.11, 0.11, 0.11, 0, postH - 0.01, 0, 0.012)
  // 케이블 런: 카메라 후면 → 암 → 빔 → 포스트 → 캐비닛
  k.tube(M.rubber, [
    [0, 2.37, -0.16],
    [0, 2.46, -0.2],
    [0.0, 2.62, -0.3],
    [0.04, 2.64, -0.62],
    [0.4, 2.64, -0.9],
    [1.2, 2.62, -0.9],
    [1.3, 2.4, -0.895],
    [1.3, 1.2, -0.895],
    [1.3, 0.1, -0.895],
    [1.32, -0.1, -0.9],
  ], 0.011, 96)
  // 케이블 클립
  for (const cy of [0.5, 1.2, 1.9]) k.rbox(M.dark, 0.05, 0.02, 0.03, 1.3, cy, -0.89, 0.006)

  // ── 시그널 타워(베이스 · 램프 3단 · 디바이더 · 캡) ──
  const TX = 1.38
  const TZ = -0.82
  k.cyl(M.dark, 0.03, 0.036, 0.04, TX, postH + 0.08, TZ, 20)
  k.cyl(M.brushed, 0.022, 0.022, 0.03, TX, postH + 0.11, TZ, 16)
  for (let d = 0; d < 4; d++) k.cyl(M.dark, 0.046, 0.046, 0.01, TX, postH + 0.125 - 0.04 + d * 0.08, TZ, 24)
  k.lathe(M.dark, [[0.046, 0], [0.044, 0.012], [0.03, 0.022], [0, 0.026]], TX, postH + 0.125 + 0.245, TZ, 24)
  const tower: THREE_NS.MeshBasicMaterial[] = []
  ;[C.red, C.amber, 0x43e07a].forEach((c, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.25) })
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.07, 24), mat)
    m.position.set(TX, postH + 0.12 + (2 - i) * 0.08, TZ)
    g.add(m)
    tower.push(mat)
  })

  // ── 모니터: VESA 암(캐비닛 측면 클램프) + 베젤 + 후면 하우징 ──
  const MX = -1.78
  const MZ = -0.45
  k.rbox(M.frame, 0.02, 0.16, 0.16, -TW / 2 + 0.03, -0.26, MZ, 0.005)
  k.rbox(M.alu, 0.32, 0.045, 0.06, -1.63, -0.26, MZ, 0.015)
  k.cyl(M.dark, 0.03, 0.03, 0.06, MX, -0.26, MZ, 20)
  k.cyl(M.alu, 0.018, 0.018, 0.92, MX, 0.21, MZ, 20)
  k.cyl(M.dark, 0.026, 0.026, 0.05, MX, 0.68, MZ, 20)
  k.into(g)

  const mon = new THREE.Group()
  mon.position.set(MX, 0.95, MZ)
  mon.rotation.y = 0.6
  const mk = kit(THREE, A)
  mk.rbox(M.dark, 0.76, 0.5, 0.036, 0, 0, 0, 0.018)
  mk.rbox(M.frame, 0.42, 0.3, 0.05, 0, -0.01, -0.04, 0.02)
  mk.rbox(M.dark, 0.08, 0.08, 0.06, 0, -0.04, -0.08, 0.01)
  mk.rbox(M.alu, 0.04, 0.2, 0.04, 0, -0.17, -0.09, 0.012)
  mk.into(mon)
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(THREE, kind), color: kind === 'spare' ? 0x111111 : 0xffffff })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), screenMat)
  screen.position.z = 0.0185
  mon.add(screen)
  g.add(mon)

  // ── 역할별 워크 ──
  if (kind === 'kit') {
    const white = new THREE.MeshPhysicalMaterial({ color: 0xd6dadc, roughness: 0.42, metalness: 0, clearcoat: 0.4, clearcoatRoughness: 0.4 })
    const clear = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ee, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1 })
    const amber = new THREE.MeshStandardMaterial({ color: 0xd98a3d, roughness: 0.38, metalness: 0.1 })
    const wk = kit(THREE, A)
    wk.rbox(M.frame, 1.5, 0.06, 1.0, 0, 0.03, 0, 0.02)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wk.cyl(M.brushed, 0.018, 0.018, 0.05, sx * 0.68, 0.085, sz * 0.43, 12)
    wk.rbox(white, 1.3, 0.1, 0.8, 0, 0.11, 0, 0.03)
    // 포켓 트레이 위 부품 2 + 시린지(배럴 · 플런저 · 허브)
    wk.rbox(white, 0.34, 0.12, 0.22, -0.35, 0.22, 0.18, 0.035)
    wk.rbox(white, 0.34, 0.12, 0.22, 0.25, 0.22, 0.18, 0.035)
    wk.rbox(M.dark, 0.2, 0.014, 0.12, -0.35, 0.285, 0.18, 0.006)
    wk.rbox(M.dark, 0.2, 0.014, 0.12, 0.25, 0.285, 0.18, 0.006)
    for (const sx of [-0.2, 0.2]) wk.rbox(white, 0.05, 0.05, 0.12, sx, 0.18, -0.16, 0.012) // 시린지 크래들
    wk.into(g)
    // 시린지(X 축으로 눕힘): 배럴(투명) · 플런저(앰버) · 노즐 허브
    const syr = new THREE.Group()
    syr.position.set(0, 0.22, -0.16)
    syr.rotation.z = Math.PI / 2
    const sk = kit(THREE, A)
    sk.lathe(clear, [[0, -0.32], [0.036, -0.32], [0.036, 0.3], [0.06, 0.3], [0.06, 0.315], [0, 0.315]], 0, 0, 0, 24)
    sk.lathe(amber, [[0, -0.3], [0.03, -0.3], [0.03, -0.27], [0.012, -0.26], [0.012, 0.42], [0.034, 0.43], [0.034, 0.45], [0, 0.45]], 0, 0, 0, 16)
    sk.lathe(white, [[0, -0.4], [0.008, -0.4], [0.02, -0.34], [0.02, -0.32], [0, -0.32]], 0, 0, 0, 16)
    sk.into(syr)
    g.add(syr)
  } else if (kind === 'insert') {
    const plastic = new THREE.MeshStandardMaterial({ color: 0x2f353b, roughness: 0.66, metalness: 0 })
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.28 })
    const wk = kit(THREE, A)
    wk.rbox(M.frame, 1.46, 0.05, 1.0, 0, 0.025, 0, 0.02)
    wk.rbox(plastic, 1.3, 0.2, 0.85, 0, 0.15, 0, 0.05)
    wk.rbox(plastic, 1.1, 0.04, 0.65, 0, 0.26, 0, 0.03)
    for (let i = 0; i < 6; i++) {
      const x = -0.45 + (i % 3) * 0.45
      const z = i < 3 ? -0.22 : 0.22
      wk.cyl(plastic, 0.1, 0.11, 0.04, x, 0.27, z, 32)
      wk.cyl(brass, 0.068, 0.068, 0.05, x, 0.295, z, 6)
      wk.cyl(M.dark, 0.034, 0.034, 0.052, x, 0.296, z, 16)
    }
    wk.into(g)
  } else if (kind === 'spare') {
    // 방진 덮개: 알루 프레임 + 엣지 글로우 유리 패널
    const CW = 3.25
    const CH = 2.95
    const CD = 2.25
    const cy = CH / 2 - 0.02
    const cz = -0.05
    const fk = kit(THREE, A)
    const b = 0.045
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) fk.rbox(M.alu, b, CH, b, sx * CW / 2, cy, cz + sz * CD / 2, 0.008)
    for (const yy of [cy - CH / 2, cy + CH / 2]) {
      for (const sz of [-1, 1]) fk.rbox(M.alu, CW, b, b, 0, yy, cz + sz * CD / 2, 0.008)
      for (const sx of [-1, 1]) fk.rbox(M.alu, b, b, CD, sx * CW / 2, yy, cz, 0.008)
    }
    fk.into(g)
    coverMat = coverGlassMaterial(THREE)
    const cover = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.05, CH - 0.05, CD - 0.05), coverMat)
    cover.position.set(0, cy, cz)
    cover.renderOrder = 2
    g.add(cover)
  }

  return { group: g, tower, screenMat, coverMat }
}

export function buildFloor(THREE: Three, shadowTex: THREE_NS.Texture) {
  const g = new THREE.Group()
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.05, roughness: 0.92 }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = -1.42
  g.add(m)
  // 머신 4대 접지 그림자 — 한 메시로 병합
  const planes = MACHINE_X.map((x) => {
    const p = new THREE.PlaneGeometry(4.2, 3.0)
    p.rotateX(-Math.PI / 2)
    p.translate(x, -1.417, 0.05)
    return p
  })
  // 인덱스 공유 형식이 같으므로 단순 병합
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  planes.forEach((p, i) => {
    pos.push(...(p.attributes.position.array as Float32Array))
    uv.push(...(p.attributes.uv.array as Float32Array))
    const ix = p.index!.array
    for (let j = 0; j < ix.length; j++) idx.push(ix[j] + i * 4)
    p.dispose()
  })
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  sg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  sg.setIndex(idx)
  const shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTex, transparent: true, opacity: 0.85, depthWrite: false }))
  shadow.renderOrder = -1
  g.add(shadow)
  return g
}

export const machineX = MACHINE_X

/** 제품 촬영용 다크 스튜디오 환경(소프트박스 몇 장) — PMREM 입력. */
export function studioScene(THREE: Three) {
  const s = new THREE.Scene()
  s.background = new THREE.Color(0x000000)
  const panel = (w: number, h: number, color: number, k: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    s.add(m)
  }
  panel(6, 3, 0xffffff, 0.65, [0, 8, 1]) // 탑 소프트박스
  panel(1.2, 8, 0x9fe8ff, 1.4, [-7, 2, -4]) // 좌후방 스트립(콜드)
  panel(1.2, 8, 0x4fe0c4, 0.45, [7, 2, -5]) // 우후방 스트립(teal)
  panel(4, 2, 0xffd2a8, 0.7, [-6, 3, 6]) // 전면 키(웜)
  return s
}
