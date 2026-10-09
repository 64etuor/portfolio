import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { CELL_H, CELL_R, CELL_TOP, COLS, MACHINE_X, PITCH, REV_COL, REV_ROW, ROWS, TRAY_TOP, cellX, cellZ } from './data'

// 지오메트리/머티리얼 빌더. 런타임 값은 전부 인자로 받은 THREE 에서.

export const C = {
  teal: 0x4fe0c4,
  blue: 0x4ab3cc,
  amber: 0xd98a3d,
  red: 0xff3b30,
  phosphor: 0xd7d7d7,
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
  const alu = new THREE.MeshStandardMaterial({ color: 0x7c848b, metalness: 0.85, roughness: 0.52 })
  const paint = new THREE.MeshStandardMaterial({ color: 0x3a424a, metalness: 0.45, roughness: 0.42 })
  const paintLight = new THREE.MeshStandardMaterial({ color: 0x6b737b, metalness: 0.4, roughness: 0.42 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d10, metalness: 0.6, roughness: 0.3 })
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
  return { wrap, nickel, washer, anodized, holder, alu, paint, paintLight, dark, glass, additive }
}
export type Mats = ReturnType<typeof materials>

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
  g.font = 'bold 13px monospace'
  g.fillText(kind === 'battery' ? 'POLARITY' : kind === 'insert' ? 'INSERT / NUT' : 'ASSY JIG', 14, 26)
  g.fillStyle = 'rgba(215,215,215,0.55)'
  g.font = '10px monospace'
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
  return t
}

export function box(THREE: Three, mat: THREE_NS.Material, w: number, h: number, d: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

/** 배터리 트레이(M/C 3 테이블 위). 셀 인스턴스 + 역삽 셀 그룹 + 검출 오버레이. */
export function buildTray(THREE: Three, M: Mats) {
  const root = new THREE.Group()
  const W = COLS * PITCH + 0.16
  const D = ROWS * PITCH + 0.16
  root.add(box(THREE, M.anodized, W, TRAY_TOP, D, 0, TRAY_TOP / 2, 0))
  // 홀더 플레이트(셀이 관통) + 측면 레일
  root.add(box(THREE, M.holder, W - 0.02, 0.03, D - 0.02, 0, 0.24, 0))
  root.add(box(THREE, M.anodized, W, 0.12, 0.04, 0, 0.13, D / 2 - 0.02))
  root.add(box(THREE, M.anodized, W, 0.12, 0.04, 0, 0.13, -D / 2 + 0.02))

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

/** 비전 검사 헤드 + 프러스텀 + 구조광 시트(트레이 위). */
export function buildScanner(THREE: Three, M: Mats, headY: number, footW: number, footD: number, footY: number) {
  const g = new THREE.Group()
  const head = new THREE.Group()
  head.position.set(0, headY, 0)
  head.add(box(THREE, M.paintLight, 0.34, 0.26, 0.3, 0, 0.12, 0))
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.14, 32), M.dark)
  lens.position.y = -0.06
  head.add(lens)
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.07, 32), M.glass)
  glass.rotation.x = Math.PI / 2
  glass.position.y = -0.131
  head.add(glass)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 12, 48), M.additive(C.blue, 2.2))
  ring.rotation.x = Math.PI / 2
  ring.position.y = -0.1
  head.add(ring)
  g.add(head)

  // 프러스텀 라인
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
  const lg = new THREE.BufferGeometry()
  lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const frustumMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(C.teal).multiplyScalar(0.9),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const frustum = new THREE.LineSegments(lg, frustumMat)
  g.add(frustum)

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

/** 범용 비전 검사 M/C. 테이블 상판 y=0. */
export function buildMachine(THREE: Three, M: Mats, kind: 'kit' | 'insert' | 'battery' | 'spare') {
  const g = new THREE.Group()
  const TW = 3.0
  const TD = 2.0
  g.add(box(THREE, M.paint, TW, 1.4, TD, 0, -0.72, 0))
  g.add(box(THREE, M.dark, TW + 0.02, 0.08, TD + 0.02, 0, -1.38, 0))
  g.add(box(THREE, kind === 'spare' ? M.paint : M.alu, TW + 0.1, 0.04, TD + 0.1, 0, -0.02, 0))
  // 캐비닛 전면 도어 라인
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 1.1), M.dark)
  seam.position.set(0, -0.72, TD / 2 + 0.002)
  g.add(seam)
  // 갠트리
  const postH = 2.55
  g.add(box(THREE, M.alu, 0.1, postH, 0.1, -1.38, postH / 2, -0.82))
  g.add(box(THREE, M.alu, 0.1, postH, 0.1, 1.38, postH / 2, -0.82))
  g.add(box(THREE, M.alu, 2.86, 0.12, 0.12, 0, postH, -0.82))
  g.add(box(THREE, M.alu, 0.09, 0.09, 0.82, 0, postH, -0.41))
  g.add(box(THREE, M.alu, 0.07, 0.3, 0.07, 0, postH - 0.15, 0))
  // 시그널 타워
  const tower: THREE_NS.MeshBasicMaterial[] = []
  ;[C.red, C.amber, 0x43e07a].forEach((c, k) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.25) })
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.075, 16), mat)
    m.position.set(1.38, postH + 0.12 + (2 - k) * 0.08, -0.82)
    g.add(m)
    tower.push(mat)
  })
  // 모니터
  const mon = new THREE.Group()
  mon.position.set(-1.78, 0.95, -0.45)
  mon.rotation.y = 0.6
  mon.add(box(THREE, M.dark, 0.74, 0.48, 0.04, 0, 0, 0))
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture(THREE, kind), color: kind === 'spare' ? 0x111111 : 0xffffff })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.42), screenMat)
  screen.position.z = 0.021
  mon.add(screen)
  mon.add(box(THREE, M.alu, 0.04, 0.9, 0.04, 0, -0.65, -0.04))
  g.add(mon)

  // 역할별 워크
  if (kind === 'kit') {
    const white = new THREE.MeshStandardMaterial({ color: 0xc9cdd0, roughness: 0.5, metalness: 0.05 })
    g.add(box(THREE, M.paintLight, 1.5, 0.08, 1.0, 0, 0.04, 0))
    g.add(box(THREE, white, 1.3, 0.12, 0.8, 0, 0.14, 0))
    const syr = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0xd98a3d, roughness: 0.4 }))
    syr.rotation.z = Math.PI / 2
    syr.position.set(0, 0.24, -0.15)
    g.add(syr)
    g.add(box(THREE, white, 0.35, 0.14, 0.22, -0.35, 0.27, 0.18))
    g.add(box(THREE, white, 0.35, 0.14, 0.22, 0.25, 0.27, 0.18))
  } else if (kind === 'insert') {
    const plastic = new THREE.MeshStandardMaterial({ color: 0x31363c, roughness: 0.7, metalness: 0 })
    g.add(box(THREE, plastic, 1.3, 0.22, 0.85, 0, 0.11, 0))
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, metalness: 1, roughness: 0.3 })
    const nutG = new THREE.CylinderGeometry(0.07, 0.07, 0.05, 6)
    const nuts = new THREE.InstancedMesh(nutG, brass, 6)
    const m4 = new THREE.Matrix4()
    for (let k = 0; k < 6; k++) {
      m4.makeTranslation(-0.45 + (k % 3) * 0.45, 0.245, k < 3 ? -0.22 : 0.22)
      nuts.setMatrixAt(k, m4)
    }
    g.add(nuts)
  } else if (kind === 'spare') {
    const cover = new THREE.MeshPhysicalMaterial({
      color: 0x8fa3b0,
      roughness: 0.6,
      metalness: 0,
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    g.add(box(THREE, cover, 3.25, 2.95, 2.25, 0, 1.47 - 0.02, -0.05))
  }

  return { group: g, tower, screenMat }
}

export function buildFloor(THREE: Three) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0x07090b, metalness: 0.3, roughness: 0.6 }),
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = -1.42
  return m
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
