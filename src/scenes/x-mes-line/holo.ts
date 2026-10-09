import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import { buildPanel, hdr } from './build'
import { COLOR, LINE, STATIONS } from './data'

// 홀로그램 패널 내용 — Python Dash 대시보드 / MES 클라이언트(React·Electron).
// 모든 값은 t 로부터 결정적으로 계산한 추상 파형. 숫자·KPI 없음.

const smooth = (x: number) => x * x * (3 - 2 * x)
const hash = (n: number) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}
/** 정수 키프레임 사이를 부드럽게 보간한 의사난수. */
const vnoise = (x: number) => {
  const i = Math.floor(x)
  const f = x - i
  return hash(i) + (hash(i + 1) - hash(i)) * smooth(f)
}

export function buildDash(T: Three) {
  const W = 5.4
  const H = 3.0
  const p = buildPanel(T, W, H, COLOR.teal)
  const { group, add } = p

  // 내부 가이드 그리드.
  const gp: THREE.Vector3[] = []
  for (let i = 0; i <= 4; i++) {
    const y = 0.05 + i * 0.25
    gp.push(new T.Vector3(-2.45, y, 0.001), new T.Vector3(0.95, y, 0.001))
  }
  gp.push(new T.Vector3(-2.45, -0.3, 0.001), new T.Vector3(0.95, -0.3, 0.001))
  gp.push(new T.Vector3(1.2, -1.3, 0.001), new T.Vector3(1.2, 1.3, 0.001))
  group.add(
    new T.LineSegments(
      new T.BufferGeometry().setFromPoints(gp),
      add(new T.LineBasicMaterial({ color: hdr(T, COLOR.phos, 0.5), blending: T.AdditiveBlending }), 0.18),
    ),
  )

  // 헤더 바.
  const head = new T.Mesh(
    new T.PlaneGeometry(1.5, 0.07),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 1.0), blending: T.AdditiveBlending }), 0.5),
  )
  head.position.set(-1.65, 1.25, 0.002)
  group.add(head)

  // 라인 차트 2계열.
  const NP = 72
  const series = [COLOR.teal, COLOR.blue].map((hex, si) => {
    const pos = new Float32Array(NP * 3)
    const geo = new T.BufferGeometry()
    geo.setAttribute('position', new T.BufferAttribute(pos, 3))
    const line = new T.Line(
      geo,
      add(new T.LineBasicMaterial({ color: hdr(T, hex, si === 0 ? 2.4 : 1.6), blending: T.AdditiveBlending }), 1),
    )
    line.position.z = 0.004
    group.add(line)
    return { pos, geo, si }
  })

  // 막대.
  const NB = 20
  const bars = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 0.9),
    NB,
  )
  const bc = new T.Color()
  for (let i = 0; i < NB; i++) bars.setColorAt(i, bc.copy(hdr(T, i % 5 === 4 ? COLOR.amber : COLOR.teal, 1.1)))
  bars.position.z = 0.003
  bars.frustumCulled = false
  group.add(bars)

  // 우측: 링 게이지 + 상태 타일 + 진행 라인.
  const ringBg = new T.Mesh(
    new T.RingGeometry(0.36, 0.42, 64),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.6), blending: T.AdditiveBlending }), 0.18),
  )
  ringBg.position.set(1.85, 0.55, 0.002)
  group.add(ringBg)
  const arc = new T.Mesh(
    new T.RingGeometry(0.36, 0.42, 64, 1, 0, Math.PI * 1.35),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 2.2), blending: T.AdditiveBlending }), 1),
  )
  arc.position.set(1.85, 0.55, 0.004)
  group.add(arc)

  const tileMats = [COLOR.amber, COLOR.blue, COLOR.teal].map((hex, i) => {
    const m = new T.MeshBasicMaterial({ color: hdr(T, hex, 1.8), blending: T.AdditiveBlending })
    add(m, 0.9)
    const tile = new T.Mesh(new T.PlaneGeometry(0.3, 0.14), m)
    tile.position.set(1.48 + i * 0.37, 1.22, 0.003)
    group.add(tile)
    return m
  })

  const NPR = 4
  const prog = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 0.9),
    NPR,
  )
  for (let i = 0; i < NPR; i++) prog.setColorAt(i, bc.copy(hdr(T, [COLOR.amber, COLOR.blue, COLOR.teal, COLOR.phos][i], 1.4)))
  prog.position.z = 0.003
  prog.frustumCulled = false
  group.add(prog)

  // 스윕 라인.
  const sweep = new T.Mesh(
    new T.PlaneGeometry(0.02, 2.7),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 2.5), blending: T.AdditiveBlending }), 0.6),
  )
  sweep.position.z = 0.005
  group.add(sweep)

  const d = new T.Object3D()
  return {
    group,
    mats: p.mats,
    /** draw 0..1: 패널 내용 리빌 진행도. pulses: [ocv, vision, assy] 도착 펄스 0..1 */
    update(t: number, draw: number, pulses: number[]) {
      const x0 = -2.4
      const x1 = 0.9
      for (const s of series) {
        const off = s.si * 3.1
        for (let i = 0; i < NP; i++) {
          const u = i / (NP - 1)
          const k = u * 9 + t * 1.2 + off
          const y = 0.12 + 0.82 * (0.55 * vnoise(k) + 0.3 * vnoise(k * 2.3 + 11) + 0.15 * Math.sin(k * 0.7 + off))
          s.pos[i * 3] = x0 + (x1 - x0) * u
          s.pos[i * 3 + 1] = s.si === 0 ? y : y * 0.75
          s.pos[i * 3 + 2] = 0
        }
        s.geo.attributes.position.needsUpdate = true
        s.geo.setDrawRange(0, Math.max(0, Math.floor(NP * draw)))
      }
      for (let i = 0; i < NB; i++) {
        const v = 0.15 + 0.85 * vnoise(i * 1.7 + t * 0.9)
        const reveal = smooth(Math.min(1, Math.max(0, draw * 1.6 - i / NB)))
        const h = Math.max(0.001, v * 0.95 * reveal)
        d.position.set(x0 + 0.085 + i * 0.17, -1.3 + h / 2, 0)
        d.scale.set(0.11, h, 1)
        d.updateMatrix()
        bars.setMatrixAt(i, d.matrix)
      }
      bars.instanceMatrix.needsUpdate = true
      arc.rotation.z = -t * 0.9
      arc.scale.setScalar(Math.max(0.001, draw))
      for (let i = 0; i < 3; i++) {
        const k = 0.45 + 1.6 * pulses[i]
        tileMats[i].color.copy(hdr(T, [COLOR.amber, COLOR.blue, COLOR.teal][i], k))
      }
      for (let i = 0; i < NPR; i++) {
        const v = (0.35 + 0.6 * vnoise(i * 3.3 + t * 0.35)) * draw
        d.position.set(1.4 + (v * 0.95) / 2, -0.45 - i * 0.24, 0)
        d.scale.set(Math.max(0.001, v * 0.95), 0.05, 1)
        d.updateMatrix()
        prog.setMatrixAt(i, d.matrix)
      }
      prog.instanceMatrix.needsUpdate = true
      const sw = (t * 0.35) % 1
      sweep.position.x = -W / 2 + 0.1 + sw * (W - 0.2)
    },
  }
}

/** MES 클라이언트 — 셀 등록 행 리스트. 각 행 = 셀 1개, 3칸 = OCV/IR · 비전 · 조립 통과 여부. */
export function buildClient(T: Three) {
  const W = 3.2
  const H = 2.9
  const p = buildPanel(T, W, H, COLOR.blue)
  const { group, add } = p
  const head = new T.Mesh(
    new T.PlaneGeometry(1.1, 0.07),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 1.0), blending: T.AdditiveBlending }), 0.5),
  )
  head.position.set(-0.85, 1.22, 0.002)
  group.add(head)
  // 탭 3개.
  for (let i = 0; i < 3; i++) {
    const tab = new T.Mesh(
      new T.PlaneGeometry(0.4, 0.1),
      add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.blue, i === 0 ? 1.6 : 0.6), blending: T.AdditiveBlending }), 0.5),
    )
    tab.position.set(0.35 + i * 0.46, 1.22, 0.002)
    group.add(tab)
  }

  const ROWS = 20
  const rowH = 0.11
  const yTop = 1.04
  const rows = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 1),
    ROWS,
  )
  const cells = new T.InstancedMesh(
    new T.PlaneGeometry(1, 1),
    add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 1),
    ROWS * 3,
  )
  for (const m of [rows, cells]) {
    m.frustumCulled = false
    m.position.z = 0.003
    group.add(m)
  }
  const scanX = STATIONS[0].x
  const thresholds = STATIONS.slice(1).map((s) => s.x - scanX)
  const hexes = [COLOR.amber, COLOR.blue, COLOR.teal]
  const d = new T.Object3D()
  const c = new T.Color()
  const dim = new T.Color(0x151d22)
  for (let i = 0; i < ROWS; i++) rows.setColorAt(i, c.setRGB(0, 0, 0))
  for (let i = 0; i < ROWS * 3; i++) cells.setColorAt(i, c.setRGB(0, 0, 0))

  return {
    group,
    mats: p.mats,
    /** s = 컨베이어 이송 거리. draw = 리빌. */
    update(s: number, draw: number) {
      const n = s / LINE.pitch
      const k0 = Math.floor(n)
      const f = n - k0
      for (let i = 0; i < ROWS; i++) {
        const y = yTop - (i + f) * rowH
        const edge = i === 0 ? f : i === ROWS - 1 ? 1 - f : 1
        const reveal = Math.min(1, Math.max(0, draw * 1.5 - i / ROWS))
        const a = edge * reveal
        d.position.set(-0.55, y, 0)
        d.scale.set(1.75, rowH * 0.62, 1)
        d.updateMatrix()
        rows.setMatrixAt(i, d.matrix)
        const hi = i === 0 ? 1.0 : 0.32
        rows.setColorAt(i, c.copy(hdr(T, COLOR.phos, hi * 0.35 * a)))
        const dist = (i + f) * LINE.pitch
        for (let j = 0; j < 3; j++) {
          d.position.set(0.62 + j * 0.3, y, 0)
          d.scale.set(0.22, rowH * 0.62, 1)
          d.updateMatrix()
          cells.setMatrixAt(i * 3 + j, d.matrix)
          if (dist > thresholds[j]) c.copy(hdr(T, hexes[j], 1.3 * a))
          else c.copy(dim).multiplyScalar(a * 2)
          cells.setColorAt(i * 3 + j, c)
        }
      }
      rows.instanceMatrix.needsUpdate = true
      cells.instanceMatrix.needsUpdate = true
      if (rows.instanceColor) rows.instanceColor.needsUpdate = true
      if (cells.instanceColor) cells.instanceColor.needsUpdate = true
    },
  }
}
