import type * as THREE from 'three'
import type { RoundedBoxGeometry as RBG } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { mergeGeometries as MG } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Three } from '../_host/three/types'

// 정적 소품 지오메트리 킷 — 라운드 박스/선반/원통 조각에 버텍스 컬러를 구워 하나로 병합한다.
// (작업대·랙·팔레트·박스 전부 재질별 1 드로우.)

export interface Addons {
  RoundedBoxGeometry: typeof RBG
  mergeGeometries: typeof MG
}

export async function loadAddons(): Promise<Addons> {
  const [{ RoundedBoxGeometry }, { mergeGeometries }] = await Promise.all([
    import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
    import('three/examples/jsm/utils/BufferGeometryUtils.js'),
  ])
  return { RoundedBoxGeometry, mergeGeometries }
}

type V3 = [number, number, number]

export class Kit {
  private parts: THREE.BufferGeometry[] = []
  private TH: Three
  private A: Addons
  private m: THREE.Matrix4
  private q: THREE.Quaternion
  private e: THREE.Euler
  private c: THREE.Color
  /** 이후 add 에 곱해지는 부모 변환(오브젝트 단위 배치용). */
  parent: THREE.Matrix4

  constructor(TH: Three, A: Addons) {
    this.TH = TH
    this.A = A
    this.m = new TH.Matrix4()
    this.q = new TH.Quaternion()
    this.e = new TH.Euler()
    this.c = new TH.Color()
    this.parent = new TH.Matrix4()
  }

  /** 부모 변환: 위치 + Y 회전. */
  at(x: number, y: number, z: number, ry = 0) {
    this.parent.makeRotationY(ry).setPosition(x, y, z)
    return this
  }

  /** 지오메트리를 (부모 × 로컬) 변환해 색을 굽고 보관. */
  add(g: THREE.BufferGeometry, color: string | THREE.Color, pos: V3, rot: V3 = [0, 0, 0], scl: V3 = [1, 1, 1]) {
    const geo = g.index ? g.toNonIndexed() : g
    if (geo !== g) g.dispose()
    this.q.setFromEuler(this.e.set(rot[0], rot[1], rot[2], 'YXZ'))
    this.m.compose(new this.TH.Vector3(...pos), this.q, new this.TH.Vector3(...scl))
    this.m.premultiply(this.parent)
    geo.applyMatrix4(this.m)
    if (typeof color === 'string') this.c.set(color)
    else this.c.copy(color)
    const n = geo.attributes.position.count
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) col.set([this.c.r, this.c.g, this.c.b], i * 3)
    geo.setAttribute('color', new this.TH.BufferAttribute(col, 3))
    if (!geo.attributes.uv) geo.setAttribute('uv', new this.TH.BufferAttribute(new Float32Array(n * 2), 2))
    this.parts.push(geo)
  }

  rbox(w: number, h: number, d: number, r: number, color: string | THREE.Color, pos: V3, rot?: V3, seg = 2) {
    const rr = Math.min(r, Math.min(w, h, d) / 2 - 1e-4)
    this.add(new this.A.RoundedBoxGeometry(w, h, d, seg, rr), color, pos, rot)
  }

  box(w: number, h: number, d: number, color: string | THREE.Color, pos: V3, rot?: V3) {
    this.add(new this.TH.BoxGeometry(w, h, d), color, pos, rot)
  }

  cyl(rt: number, rb: number, h: number, color: string | THREE.Color, pos: V3, rot?: V3, seg = 16) {
    this.add(new this.TH.CylinderGeometry(rt, rb, h, seg, 1), color, pos, rot)
  }

  /** 두 점 사이 가는 봉(브레이싱). */
  rod(a: V3, b: V3, r: number, color: string, seg = 8) {
    const TH = this.TH
    const va = new TH.Vector3(...a)
    const vb = new TH.Vector3(...b)
    const len = va.distanceTo(vb)
    const g = new TH.CylinderGeometry(r, r, len, seg, 1)
    const dir = vb.clone().sub(va).normalize()
    g.applyQuaternion(new TH.Quaternion().setFromUnitVectors(new TH.Vector3(0, 1, 0), dir))
    const mid = va.add(vb).multiplyScalar(0.5)
    this.add(g, color, [mid.x, mid.y, mid.z])
  }

  lathe(pts: [number, number][], color: string, pos: V3, rot?: V3, seg = 20) {
    const TH = this.TH
    this.add(
      new TH.LatheGeometry(
        pts.map(([x, y]) => new TH.Vector2(x, y)),
        seg,
      ),
      color,
      pos,
      rot,
    )
  }

  tube(pts: V3[], r: number, color: string, seg = 48) {
    const TH = this.TH
    const curve = new TH.CatmullRomCurve3(pts.map((p) => new TH.Vector3(...p)))
    this.add(new TH.TubeGeometry(curve, seg, r, 6, false), color, [0, 0, 0])
  }

  torus(R: number, r: number, color: string, pos: V3, rot?: V3) {
    this.add(new this.TH.TorusGeometry(R, r, 8, 32), color, pos, rot)
  }

  get count() {
    return this.parts.length
  }

  build(): THREE.BufferGeometry {
    const g = this.A.mergeGeometries(this.parts, false)
    for (const p of this.parts) p.dispose()
    this.parts = []
    if (!g) throw new Error('merge failed')
    g.computeBoundingSphere()
    return g
  }
}

/* ─────────────── 소프트 접지 그림자 텍스처 ─────────────── */

export function softShadowTexture(TH: Three) {
  const S = 64
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const img = g.createImageData(S, S)
  const sm = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S
      const v = (y + 0.5) / S
      // 둥근 사각 감쇠: 가장자리 0 → 안쪽 1
      const ex = sm(0, 0.42, Math.min(u, 1 - u))
      const ey = sm(0, 0.42, Math.min(v, 1 - v))
      const a = Math.pow(ex * ey, 1.2)
      const k = (y * S + x) * 4
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255
      img.data[k + 3] = Math.round(a * 255)
    }
  g.putImageData(img, 0, 0)
  const tex = new TH.CanvasTexture(c)
  return tex
}

/* ─────────────── 종이 기록(수기) 텍스처 ─────────────── */

export function paperTexture(TH: Three, rnd: () => number) {
  const W = 192
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#efeae0'
  g.fillRect(0, 0, W, H)
  // 양식 머리 + 표 괘선
  g.fillStyle = '#9aa0a6'
  g.fillRect(14, 16, 80, 7)
  g.fillRect(14, 28, 46, 4)
  g.strokeStyle = 'rgba(70,80,90,0.55)'
  g.lineWidth = 1
  for (let i = 0; i < 12; i++) {
    const y = 48 + i * 16
    g.beginPath()
    g.moveTo(12, y + 0.5)
    g.lineTo(W - 12, y + 0.5)
    g.stroke()
  }
  for (const x of [12, 56, 128, W - 12]) {
    g.beginPath()
    g.moveTo(x + 0.5, 48)
    g.lineTo(x + 0.5, 48 + 11 * 16)
    g.stroke()
  }
  // 손글씨 획(필기체 흉내 — 판독 불가 장식)
  g.strokeStyle = 'rgba(30,45,90,0.85)'
  g.lineWidth = 1.3
  g.lineCap = 'round'
  for (let i = 0; i < 11; i++) {
    const y = 48 + i * 16 + 11
    for (const [x0, x1] of [
      [16, 52],
      [60, 60 + 30 + rnd() * 60],
      [132, 140 + rnd() * 36],
    ]) {
      if (rnd() < 0.18) continue
      g.beginPath()
      let x = x0
      g.moveTo(x, y)
      while (x < x1) {
        const nx = x + 3 + rnd() * 4
        g.quadraticCurveTo(x + 1.5, y - 4 - rnd() * 4, nx, y - rnd() * 2)
        x = nx
      }
      g.stroke()
    }
  }
  const tex = new TH.CanvasTexture(c)
  tex.colorSpace = TH.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
