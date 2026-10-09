import type * as THREE from 'three'
import type { Three } from '../_host/three/types'

// 작업자 — 건축 시각화풍 클레이 피규어(≈7.4 등신). 선반·매끈한 테이퍼 사지, 목+머리.
// 부위별 InstancedMesh(10 드로우) + CPU FK/2본 IK. 모든 포즈는 t 에서 결정적으로 계산된다.

export type Pose = 'stand' | 'sit' | 'reach'

export interface OperatorSpec {
  x: number
  z: number
  yaw: number
  pose: Pose
  seed: number
}

/* ─────────────── 치수(m) ─────────────── */
const UPPER = 0.27
const FORE = 0.245
const THIGH = 0.43
const SHIN = 0.41
const ANKLE_Y = 0.075
const SHOULDER: [number, number, number] = [0.182, 0.385, -0.005]
const HIP_X = 0.088

/* ─────────────── 프로필 ─────────────── */

/** 테이퍼 캡슐: 원점(근위 관절)에서 -Y 로 L 만큼. */
function limbProfile(TH: Three, L: number, r0: number, r1: number, bulge = 0, n = 7) {
  const p: THREE.Vector2[] = [new TH.Vector2(0, -L - r1)]
  for (let k = 1; k <= 4; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 8
    p.push(new TH.Vector2(r1 * Math.cos(a), -L + r1 * Math.sin(a)))
  }
  for (let i = 1; i < n; i++) {
    const t = i / n
    p.push(new TH.Vector2(r1 + (r0 - r1) * t + bulge * Math.sin(Math.PI * t), -L + t * L))
  }
  for (let k = 0; k <= 4; k++) {
    const a = (k * Math.PI) / 8
    p.push(new TH.Vector2(r0 * Math.cos(a), r0 * Math.sin(a)))
  }
  return p
}

function limb(TH: Three, L: number, r0: number, r1: number, bulge = 0, seg = 16) {
  return new TH.LatheGeometry(limbProfile(TH, L, r0, r1, bulge), seg)
}

function smoothProfile(TH: Three, pts: [number, number][], seg: number) {
  return new TH.LatheGeometry(
    pts.map(([r, y]) => new TH.Vector2(r, y)),
    seg,
  )
}

export function buildGeometries(TH: Three) {
  // 몸통: 허리(0) → 어깨선(.385) → 목 밑(.46). 폭 1.1, 깊이 .64.
  const torso = smoothProfile(
    TH,
    [
      [0, -0.05],
      [0.1, -0.045],
      [0.118, -0.01],
      [0.122, 0.06],
      [0.132, 0.14],
      [0.148, 0.23],
      [0.158, 0.3],
      [0.162, 0.35],
      [0.152, 0.39],
      [0.118, 0.425],
      [0.07, 0.445],
      [0.045, 0.455],
      [0, 0.46],
    ],
    24,
  )
  torso.scale(1.17, 1, 0.66)
  // 골반
  const pelvis = smoothProfile(
    TH,
    [
      [0, -0.11],
      [0.07, -0.105],
      [0.118, -0.075],
      [0.14, -0.025],
      [0.142, 0.02],
      [0.128, 0.07],
      [0.116, 0.1],
      [0, 0.11],
    ],
    22,
  )
  pelvis.scale(1.05, 1, 0.76)
  // 머리: 턱 쪽이 좁은 달걀형
  const hp: [number, number][] = []
  for (let i = 0; i <= 16; i++) {
    const ph = (i / 16) * Math.PI
    const y = -Math.cos(ph) * 0.118
    const narrow = y < 0 ? 1 - 0.2 * (-y / 0.118) : 1
    hp.push([Math.sin(ph) * 0.094 * narrow, y])
  }
  const head = smoothProfile(TH, hp, 24)
  head.scale(1, 1, 1.1)
  head.translate(0, 0.108, 0.012)
  const neck = limb(TH, 0.085, 0.046, 0.041, 0, 14)
  neck.rotateZ(Math.PI)
  const upper = limb(TH, UPPER, 0.048, 0.036, 0.004)
  const fore = limb(TH, FORE, 0.037, 0.026, 0.006)
  const hand = limb(TH, 0.065, 0.026, 0.019, 0.004, 10)
  hand.scale(0.9, 1, 0.58)
  const thigh = limb(TH, THIGH, 0.079, 0.05, 0.007)
  const shin = limb(TH, SHIN, 0.05, 0.031, 0.011)
  const foot = limb(TH, 0.17, 0.042, 0.038, 0, 12)
  foot.rotateX(-Math.PI / 2)
  foot.scale(1, 0.55, 1)
  foot.translate(0, -0.047, -0.03)
  return { torso, pelvis, head, neck, upper, fore, hand, thigh, shin, foot }
}

/* ─────────────── 런타임 ─────────────── */

export interface Figures {
  meshes: THREE.InstancedMesh[]
  update(t: number): void
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function buildFigures(TH: Three, specs: OperatorSpec[]): Figures {
  const G = buildGeometries(TH)
  const n = specs.length
  const mat = new TH.MeshStandardMaterial({ color: '#ffffff', roughness: 0.62, metalness: 0.0 })
  const mk = (g: THREE.BufferGeometry, count: number) => {
    const m = new TH.InstancedMesh(g, mat, count)
    m.instanceMatrix.setUsage(TH.DynamicDrawUsage)
    m.frustumCulled = false
    return m
  }
  const M = {
    torso: mk(G.torso, n),
    pelvis: mk(G.pelvis, n),
    head: mk(G.head, n),
    neck: mk(G.neck, n),
    upper: mk(G.upper, n * 2),
    fore: mk(G.fore, n * 2),
    hand: mk(G.hand, n * 2),
    thigh: mk(G.thigh, n * 2),
    shin: mk(G.shin, n * 2),
    foot: mk(G.foot, n * 2),
  }

  // 색: 상의(밝은 클레이 3톤) · 피부톤 없는 클레이 · 하의 그레이 · 신발 차콜
  const tops = ['#a9a49b', '#9ca1a4', '#a69f93', '#939a9e']
  const skin = new TH.Color('#bab3a8')
  const pants = ['#4a4f55', '#3f454b', '#545a60']
  const shoe = new TH.Color('#25282c')
  const c = new TH.Color()
  specs.forEach((sp, i) => {
    const top = c.set(tops[sp.seed % tops.length]).clone()
    const pant = new TH.Color(pants[(sp.seed >> 2) % pants.length])
    M.torso.setColorAt(i, top)
    M.pelvis.setColorAt(i, pant)
    M.head.setColorAt(i, skin)
    M.neck.setColorAt(i, skin)
    for (let s = 0; s < 2; s++) {
      M.upper.setColorAt(i * 2 + s, top)
      M.fore.setColorAt(i * 2 + s, top)
      M.hand.setColorAt(i * 2 + s, skin)
      M.thigh.setColorAt(i * 2 + s, pant)
      M.shin.setColorAt(i * 2 + s, pant)
      M.foot.setColorAt(i * 2 + s, shoe)
    }
  })

  // 프리할당 임시
  const root = new TH.Matrix4()
  const m4 = new TH.Matrix4()
  const one = new TH.Vector3(1, 1, 1)
  const scl = new TH.Vector3()
  const P = new TH.Vector3()
  const W = new TH.Vector3()
  const Nb = new TH.Vector3()
  const At = new TH.Vector3()
  const S = new TH.Vector3()
  const E = new TH.Vector3()
  const Wr = new TH.Vector3()
  const T = new TH.Vector3()
  const H = new TH.Vector3()
  const K = new TH.Vector3()
  const A = new TH.Vector3()
  const pole = new TH.Vector3()
  const d = new TH.Vector3()
  const tmp = new TH.Vector3()
  const look = new TH.Vector3()
  const hd = new TH.Vector3()
  const hands: THREE.Vector3[] = [new TH.Vector3(), new TH.Vector3()]
  const ankles: THREE.Vector3[] = [new TH.Vector3(), new TH.Vector3()]
  const DOWN = new TH.Vector3(0, -1, 0)
  const qP = new TH.Quaternion()
  const qT = new TH.Quaternion()
  const qH = new TH.Quaternion()
  const qs = new TH.Quaternion()
  const eu = new TH.Euler()

  const put = (mesh: THREE.InstancedMesh, idx: number, pos: THREE.Vector3, q: THREE.Quaternion, s: THREE.Vector3 = one) => {
    m4.compose(pos, q, s).premultiply(root)
    mesh.setMatrixAt(idx, m4)
  }
  const aim = (dir: THREE.Vector3) => qs.setFromUnitVectors(DOWN, tmp.copy(dir).normalize())

  /** 2본 IK: 근위 S → 목표 T, 길이 a,b, 폴 힌트. 결과 중간관절 → mid, 말단 → end. */
  const ik = (s: THREE.Vector3, t: THREE.Vector3, a: number, b: number, hint: THREE.Vector3, mid: THREE.Vector3, end: THREE.Vector3) => {
    d.subVectors(t, s)
    let len = d.length()
    d.divideScalar(Math.max(1e-5, len))
    len = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, len))
    const x = (a * a - b * b + len * len) / (2 * len)
    const h = Math.sqrt(Math.max(0, a * a - x * x))
    pole.copy(hint).addScaledVector(d, -hint.dot(d)).normalize()
    mid.copy(s).addScaledVector(d, x).addScaledVector(pole, h)
    end.copy(s).addScaledVector(d, len)
  }

  const hint = new TH.Vector3()

  function update(t: number) {
    specs.forEach((sp, i) => {
      const ph = sp.seed * 1.618
      const fr = 0.85 + ((sp.seed * 37) % 10) / 22
      root.makeRotationY(sp.yaw).setPosition(sp.x, 0, sp.z)
      const b = Math.sin(t * 1.45 * fr + ph) // 호흡
      const sit = sp.pose === 'sit'
      const reachPose = sp.pose === 'reach'

      // 손 목표(피규어 로컬, +z 정면)
      let twist = 0.03 * Math.sin(t * 0.37 + ph)
      if (reachPose) {
        hands[0].set(-0.2 + 0.11 * Math.sin(t * 0.52 * fr + ph), 1.04 + 0.1 * Math.sin(t * 0.37 + ph), 0.5)
        hands[1].set(0.17 + 0.1 * Math.sin(t * 0.47 * fr + ph + 1.2), 1.1 + 0.1 * Math.cos(t * 0.41 + ph), 0.5)
        twist += 0.12 * Math.sin(t * 0.5 * fr + ph + 0.6)
      } else {
        const wy = sit ? 0.915 : 0.94
        const wz = sit ? 0.38 : 0.31
        const w = 1.25 * fr
        hands[0].set(
          -0.11 + 0.03 * Math.sin(w * t + ph),
          wy + 0.022 * (0.5 + 0.5 * Math.sin(2 * w * t + ph)),
          wz + 0.025 * Math.cos(w * t + ph),
        )
        hands[1].set(
          0.11 + 0.028 * Math.sin(w * 1.13 * t + ph + 2),
          wy + 0.026 * (0.5 + 0.5 * Math.sin(2.2 * w * t + ph + 1)),
          wz + 0.03 * Math.cos(w * 1.13 * t + ph + 2),
        )
        // 가끔 옆 트레이로 손을 뻗었다 돌아옴
        const r = smooth(0.55, 0.95, Math.sin(t * 0.29 * fr + ph * 3))
        hands[1].lerp(tmp.set(0.4, wy + 0.04, wz - 0.06), r)
        twist += 0.2 * r
      }

      // 골반
      const pelvisY = sit ? 0.69 : 0.952 - 0.004 * (0.5 + 0.5 * b)
      const sway = sit ? 0 : 0.012 * Math.sin(t * 0.23 + ph)
      P.set(sway, pelvisY, 0)
      qP.setFromEuler(eu.set(0, twist * 0.3, sit ? 0 : -sway * 1.2, 'YXZ'))
      put(M.pelvis, i, P, qP)

      // 몸통(호흡 = 가슴 미세 팽창)
      const lean = (reachPose ? 0.27 : sit ? 0.2 : 0.24) + 0.012 * b
      W.set(0, 0.06, 0).applyQuaternion(qP).add(P)
      qT.setFromEuler(eu.set(lean, twist, sit ? 0 : sway * 1.5, 'YXZ'))
      scl.set(1 + 0.01 * b, 1 + 0.004 * b, 1 + 0.018 * b)
      put(M.torso, i, W, qT, scl)

      // 목 + 머리(손 사이를 바라봄)
      Nb.set(0, 0.43, 0).applyQuaternion(qT).add(W)
      put(M.neck, i, Nb, qT)
      At.set(0, 0.075, 0).applyQuaternion(qT).add(Nb)
      look.addVectors(hands[0], hands[1]).multiplyScalar(0.5)
      hd.subVectors(look, tmp.set(0, 0.1, 0.03).add(At))
      const yaw = Math.max(-0.6, Math.min(0.6, Math.atan2(hd.x, hd.z) * 0.8)) + 0.05 * Math.sin(t * 0.31 + ph * 2)
      const pitch = Math.max(-0.2, Math.min(0.75, Math.atan2(-hd.y, Math.hypot(hd.x, hd.z)) * 0.85))
      qH.setFromEuler(eu.set(pitch, yaw, 0, 'YXZ'))
      put(M.head, i, At, qH)

      // 팔
      for (let s = 0; s < 2; s++) {
        const sg = s === 0 ? -1 : 1
        S.set(sg * SHOULDER[0], SHOULDER[1] + 0.003 * b, SHOULDER[2]).applyQuaternion(qT).add(W)
        T.copy(hands[s])
        hint.set(sg * (reachPose ? 0.45 : 0.7), reachPose ? -0.85 : -0.55, reachPose ? -0.15 : -0.45)
        ik(S, T, UPPER, FORE, hint, E, Wr)
        put(M.upper, i * 2 + s, S, aim(d.subVectors(E, S)))
        put(M.fore, i * 2 + s, E, aim(d.subVectors(Wr, E)))
        d.subVectors(Wr, E).normalize()
        if (reachPose) d.z += 0.35
        else d.y -= 0.55
        put(M.hand, i * 2 + s, Wr, aim(d))
      }

      // 다리
      if (sit) {
        ankles[0].set(-0.13, ANKLE_Y, 0.42)
        ankles[1].set(0.12, 0.27, 0.23)
      } else {
        ankles[0].set(-0.115, ANKLE_Y, 0.03 + (reachPose ? -0.06 : 0))
        ankles[1].set(0.115, ANKLE_Y, -0.02 + (reachPose ? 0.04 : 0.05))
      }
      for (let s = 0; s < 2; s++) {
        const sg = s === 0 ? -1 : 1
        H.set(sg * HIP_X, -0.045, 0).applyQuaternion(qP).add(P)
        hint.set(sg * 0.12, 0.25, 1)
        ik(H, ankles[s], THIGH, SHIN, hint, K, A)
        put(M.thigh, i * 2 + s, H, aim(d.subVectors(K, H)))
        put(M.shin, i * 2 + s, K, aim(d.subVectors(A, K)))
        qs.setFromEuler(eu.set(0, sg * -0.14, 0))
        put(M.foot, i * 2 + s, A, qs)
      }
    })
    for (const m of Object.values(M)) m.instanceMatrix.needsUpdate = true
  }

  update(0)
  return { meshes: Object.values(M), update }
}
