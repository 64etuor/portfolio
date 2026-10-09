import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import {
  BEAM_END,
  CARD,
  DOC_TYPES,
  PALETTE,
  SERVICE_CORE,
  SOURCES,
  SURFACES,
  TYPE_ASPECT,
  TYPE_COLOR,
  type DocType,
  type SourceDoc,
  CAM_B,
  HUD_ZONES,
} from './data'

// 지오메트리/머티리얼/프로시저럴 텍스처 빌더. 런타임 상태는 runtime.ts.

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hexRgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

/** HDR 색: hex × k (k>1 이면 bloom). */
export const hdr = (T: Three, hex: string, k: number) => new T.Color(hex).multiplyScalar(k)

function canvasTex(T: Three, c: HTMLCanvasElement) {
  const tex = new T.CanvasTexture(c)
  tex.colorSpace = T.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

// ─────────────────────────── 페이지 텍스처 ───────────────────────────

/** 문서 한 장(유리 페이지): 테두리 + 타입 칩 + 텍스트 줄/표/슬라이드 박스. 가산 블렌딩 전제(투명=무). */
function drawPage(g: CanvasRenderingContext2D, W: number, H: number, type: DocType, r: () => number, opts: { hero?: SourceDoc } = {}) {
  const col = TYPE_COLOR[type]
  const s = W / 256
  // 유리 면
  const grd = g.createLinearGradient(0, 0, W, H)
  grd.addColorStop(0, 'rgba(150,190,200,0.16)')
  grd.addColorStop(1, 'rgba(90,120,135,0.07)')
  g.fillStyle = grd
  g.fillRect(0, 0, W, H)
  // 테두리
  g.strokeStyle = 'rgba(215,225,230,0.55)'
  g.lineWidth = 2 * s
  g.strokeRect(s, s, W - 2 * s, H - 2 * s)
  // 접힌 모서리 하이라이트
  g.strokeStyle = hexRgba(col, 0.9)
  g.lineWidth = 3 * s
  g.beginPath()
  g.moveTo(1.5 * s, 40 * s)
  g.lineTo(1.5 * s, 1.5 * s)
  g.lineTo(40 * s, 1.5 * s)
  g.stroke()

  // 타입 칩
  const chipW = (type.length * 13 + 18) * s
  g.fillStyle = hexRgba(col, 0.92)
  g.fillRect(14 * s, 14 * s, chipW, 24 * s)
  g.fillStyle = '#000'
  g.font = `700 ${16 * s}px "JetBrains Mono", ui-monospace, monospace`
  g.textBaseline = 'middle'
  g.fillText(type, 23 * s, 26.5 * s)

  const pad = 16 * s
  let y = 54 * s
  if (opts.hero) {
    g.fillStyle = 'rgba(225,230,232,0.9)'
    g.font = `600 ${15 * s}px "IBM Plex Sans KR", "Malgun Gothic", sans-serif`
    g.fillText(opts.hero.file, chipW + 24 * s, 26.5 * s)
  }

  const bar = (x: number, yy: number, w: number, a = 0.3) => {
    g.fillStyle = `rgba(215,215,215,${a})`
    g.fillRect(x, yy, w, 4.5 * s)
  }
  const grid = (x: number, yy: number, w: number, h: number, rows: number, cols: number, a: number, head = true) => {
    g.strokeStyle = `rgba(200,225,230,${a})`
    g.lineWidth = 1.4 * s
    g.strokeRect(x, yy, w, h)
    for (let i = 1; i < rows; i++) {
      g.beginPath()
      g.moveTo(x, yy + (h * i) / rows)
      g.lineTo(x + w, yy + (h * i) / rows)
      g.stroke()
    }
    for (let j = 1; j < cols; j++) {
      g.beginPath()
      g.moveTo(x + (w * j) / cols, yy)
      g.lineTo(x + (w * j) / cols, yy + h)
      g.stroke()
    }
    if (head) {
      g.fillStyle = hexRgba(col, a * 0.5)
      g.fillRect(x, yy, w, h / rows)
    }
  }

  if (opts.hero) {
    const src = opts.hero
    const [u0, v0, u1, v1] = src.block
    const bx = u0 * W
    const by = v0 * H
    const bw = (u1 - u0) * W
    const bh = (v1 - v0) * H
    // 블록 위/아래 텍스트 줄
    for (y = 58 * s; y < by - 10 * s; y += 13 * s) bar(pad, y, (W - 2 * pad) * (0.45 + r() * 0.55), 0.32)
    if (src.table) {
      // 표가 빠져나간 자리(슬롯) — 옅은 점선 격자
      g.setLineDash([5 * s, 4 * s])
      grid(bx, by, bw, bh, src.table.rows, src.table.cols, 0.28, false)
      g.setLineDash([])
    } else {
      for (let yy = by + 8 * s; yy < by + bh - 6 * s; yy += 12 * s) bar(bx + 4 * s, yy, bw * (0.6 + r() * 0.38), 0.55)
    }
    for (y = by + bh + 16 * s; y < H - 20 * s; y += 13 * s) bar(pad, y, (W - 2 * pad) * (0.35 + r() * 0.65), 0.28)
    return
  }

  if (type === 'PPTX') {
    bar(pad, y, W * 0.45, 0.5)
    g.strokeStyle = 'rgba(215,215,215,0.35)'
    g.lineWidth = 1.5 * s
    g.strokeRect(pad, y + 18 * s, W * 0.42, H - y - 36 * s)
    for (let yy = y + 22 * s; yy < H - 26 * s; yy += 14 * s) bar(W * 0.52, yy, W * (0.2 + r() * 0.24), 0.3)
    return
  }
  if (type === 'XLSX') {
    grid(pad, y, W - 2 * pad, H - y - 16 * s, 7, 5, 0.42)
    return
  }
  // HWP / PDF — 문단 + (HWP 는 표가 큰 비중)
  const tableAt = type === 'HWP' ? 0.3 : 0.6
  let tableDone = false
  while (y < H - 20 * s) {
    if (!tableDone && y / H > tableAt) {
      tableDone = true
      const th = H * 0.24
      grid(pad, y, W - 2 * pad, th, 5, 4, 0.45)
      y += th + 12 * s
      continue
    }
    bar(pad, y, (W - 2 * pad) * (0.4 + r() * 0.6))
    y += 12 * s
    if (r() < 0.12) y += 10 * s
  }
}

function pageCanvas(type: DocType, base: number) {
  const a = TYPE_ASPECT[type]
  const W = a < 1 ? base : Math.round(base * 1.4)
  const H = Math.round(W / a)
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return { c, W, H }
}

export function makeLibTexture(T: Three, type: DocType, seed: number) {
  const { c, W, H } = pageCanvas(type, 256)
  drawPage(c.getContext('2d')!, W, H, type, rng(seed))
  return canvasTex(T, c)
}

export function makeHeroTexture(T: Three, src: SourceDoc, seed: number) {
  const { c, W, H } = pageCanvas(src.type, 512)
  drawPage(c.getContext('2d')!, W, H, src.type, rng(seed), { hero: src })
  return canvasTex(T, c)
}

export function makeDotTexture(T: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  return canvasTex(T, c)
}

// ─────────────────────────── 라이브러리 필드 ───────────────────────────

export interface LibPage {
  mesh: THREE.InstancedMesh
  idx: number
  pos: THREE.Vector3
  rot: THREE.Euler
  scale: number
  phase: number
  /** 빔 좌표: 빔 위 거리 s, 빔까지 수직거리 d */
  s: number
  d: number
}

export function buildLibrary(T: Three, scene: THREE.Scene) {
  const r = rng(417)
  const meshes: THREE.InstancedMesh[] = []
  const pages: LibPage[] = []
  const core = new T.Vector3(...SERVICE_CORE)
  const end = new T.Vector3(...BEAM_END)
  const dir = end.clone().sub(core).normalize()
  const len = end.distanceTo(core)
  const avoid = SOURCES.map((s) => new T.Vector3(...s.pos))
  const card = new T.Vector3(...CARD.pos)
  const PER = 34
  // 끝 카메라 기준으로 HUD 영역에 투영되는 페이지는 배치하지 않는다.
  const cam = new T.PerspectiveCamera(40, 16 / 9, 0.1, 200)
  cam.position.set(...CAM_B.pos)
  cam.lookAt(new T.Vector3(...CAM_B.look))
  cam.updateMatrixWorld()
  const ndc = new T.Vector3()
  const inHud = (p: THREE.Vector3, pad: number) => {
    ndc.copy(p).project(cam)
    const x = ndc.x * 0.5 + 0.5
    const y = -ndc.y * 0.5 + 0.5
    return HUD_ZONES.some(([x0, y0, x1, y1]) => x > x0 - pad && x < x1 + pad && y > y0 - pad && y < y1 + pad)
  }

  DOC_TYPES.forEach((type, ti) => {
    const tex = makeLibTexture(T, type, 900 + ti)
    const a = TYPE_ASPECT[type]
    const geo = new T.PlaneGeometry(a, 1)
    const mat = new T.MeshBasicMaterial({
      map: tex,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
      fog: true,
    })
    const mesh = new T.InstancedMesh(geo, mat, PER)
    mesh.frustumCulled = false
    const white = new T.Color(1, 1, 1)
    let i = 0
    let guard = 0
    while (i < PER && guard++ < 5000) {
      const p = new T.Vector3((r() * 2 - 1) * 19, (r() * 2 - 1) * 8, -7 - r() * 34)
      if (avoid.some((v) => v.distanceTo(p) < 2.6)) continue
      if (p.distanceTo(card) < 4.5) continue
      if (p.distanceTo(core) < 6) continue
      if (inHud(p, 1.6 / Math.max(6, -p.z + 14))) continue
      // 프레임 앞쪽 가운데는 비워 둔다(근거 카드/소스가 읽히게)
      if (p.z > -9 && Math.abs(p.x - 0.6) < 5.2 && Math.abs(p.y) < 4.2) continue
      const rel = p.clone().sub(core)
      const s = rel.dot(dir)
      const d = rel.clone().sub(dir.clone().multiplyScalar(s)).length()
      pages.push({
        mesh,
        idx: i,
        pos: p,
        rot: new T.Euler((r() - 0.5) * 0.35, (r() - 0.5) * 1.1, (r() - 0.5) * 0.25),
        scale: 1.3 + r() * 1.3,
        phase: r() * Math.PI * 2,
        s: Math.max(0, Math.min(len, s)),
        d,
      })
      mesh.setColorAt(i, white)
      i++
    }
    mesh.count = i
    scene.add(mesh)
    meshes.push(mesh)
  })
  return { meshes, pages, beamLen: len }
}

// ─────────────────────────── 근거 소스 페이지 + 표 승격 ───────────────────────────

export interface HeroSource {
  src: SourceDoc
  group: THREE.Group
  face: THREE.MeshBasicMaterial
  glass: THREE.MeshBasicMaterial
  w: number
  h: number
  /** 블록 로컬 사각형 */
  rect: { x0: number; y0: number; x1: number; y1: number }
  lift: number
  cells: THREE.InstancedMesh | null
  cellLocal: {
    x: number
    y: number
    w: number
    h: number
    row: number
    col: number
  }[]
  frame: THREE.LineSegments
  frameMat: THREE.LineBasicMaterial
  fill: THREE.Mesh
  fillMat: THREE.MeshBasicMaterial
  color: THREE.Color
}

export function buildSources(T: Three, scene: THREE.Scene) {
  return SOURCES.map((src, k) => {
    const h = src.height
    const w = h * TYPE_ASPECT[src.type]
    const group = new T.Group()
    group.position.set(...src.pos)
    group.rotation.y = src.rotY
    scene.add(group)

    const glass = new T.MeshBasicMaterial({
      color: '#0a1519',
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: T.DoubleSide,
    })
    const back = new T.Mesh(new T.PlaneGeometry(w, h), glass)
    back.position.z = -0.01
    back.renderOrder = 1
    group.add(back)

    const face = new T.MeshBasicMaterial({
      map: makeHeroTexture(T, src, 70 + k),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
    })
    const fm = new T.Mesh(new T.PlaneGeometry(w, h), face)
    fm.renderOrder = 2
    group.add(fm)

    const [u0, v0, u1, v1] = src.block
    const rect = {
      x0: (u0 - 0.5) * w,
      x1: (u1 - 0.5) * w,
      y0: (0.5 - v1) * h,
      y1: (0.5 - v0) * h,
    }
    const lift = src.table ? 0.95 : 0.04
    const color = new T.Color(src.color)

    // 표 셀(승격 단위)
    let cells: THREE.InstancedMesh | null = null
    const cellLocal: HeroSource['cellLocal'] = []
    if (src.table) {
      const { rows, cols } = src.table
      const cw = (rect.x1 - rect.x0) / cols
      const ch = (rect.y1 - rect.y0) / rows
      for (let rI = 0; rI < rows; rI++)
        for (let cI = 0; cI < cols; cI++)
          cellLocal.push({
            x: rect.x0 + cw * (cI + 0.5),
            y: rect.y1 - ch * (rI + 0.5),
            w: cw * 0.9,
            h: ch * 0.8,
            row: rI,
            col: cI,
          })
      cells = new T.InstancedMesh(
        new T.PlaneGeometry(1, 1),
        new T.MeshBasicMaterial({
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          side: T.DoubleSide,
          toneMapped: true,
        }),
        cellLocal.length,
      )
      cells.frustumCulled = false
      cells.renderOrder = 4
      for (let i = 0; i < cellLocal.length; i++) cells.setColorAt(i, new T.Color(0, 0, 0))
      group.add(cells)
    }

    // 블록 프레임: 리프트된 사각형 4 + 슬롯 4 + 커넥터 4 = 12 세그먼트
    const fg = new T.BufferGeometry()
    fg.setAttribute('position', new T.BufferAttribute(new Float32Array(12 * 2 * 3), 3))
    const frameMat = new T.LineBasicMaterial({
      color: color.clone().multiplyScalar(2.2),
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
    })
    const frame = new T.LineSegments(fg, frameMat)
    frame.frustumCulled = false
    frame.renderOrder = 5
    group.add(frame)

    // 블록 하이라이트 면
    const fillMat = new T.MeshBasicMaterial({
      color: color.clone().multiplyScalar(0.5),
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false,
      side: T.DoubleSide,
    })
    const fill = new T.Mesh(new T.PlaneGeometry(rect.x1 - rect.x0, rect.y1 - rect.y0), fillMat)
    fill.position.set((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2, 0.02)
    fill.renderOrder = 3
    group.add(fill)

    group.updateMatrixWorld(true)
    return {
      src,
      group,
      face,
      glass,
      w,
      h,
      rect,
      lift,
      cells,
      cellLocal,
      frame,
      frameMat,
      fill,
      fillMat,
      color,
    } satisfies HeroSource
  })
}

/** 근거 블록의 스레드 착지점(블록 오른쪽 변 중앙, 리프트 완료 위치) — 월드. */
export const HOT_ROW = 2

export function anchorOf(T: Three, hs: HeroSource) {
  const { rect } = hs
  const y = hs.src.table ? rect.y1 - ((rect.y1 - rect.y0) / hs.src.table.rows) * (HOT_ROW + 0.5) : (rect.y0 + rect.y1) / 2
  return hs.group.localToWorld(new T.Vector3(rect.x1, y, hs.lift))
}

// ─────────────────────────── 서비스 코어 + 진입 경로 ───────────────────────────

export function buildCore(T: Three, scene: THREE.Scene, dot: THREE.Texture) {
  const g = new T.Group()
  g.position.set(...SERVICE_CORE)
  scene.add(g)
  const ringMat = new T.MeshBasicMaterial({ color: hdr(T, PALETTE.teal, 2.4) })
  const ring = new T.Mesh(new T.TorusGeometry(0.62, 0.02, 8, 96), ringMat)
  g.add(ring)
  const ring2Mat = new T.MeshBasicMaterial({
    color: hdr(T, PALETTE.blue, 1.2),
    transparent: true,
    opacity: 0.8,
  })
  const ring2 = new T.Mesh(new T.TorusGeometry(0.92, 0.008, 6, 128), ring2Mat)
  g.add(ring2)
  const shellMat = new T.MeshBasicMaterial({
    color: hdr(T, PALETTE.teal, 0.6),
    wireframe: true,
    transparent: true,
    opacity: 0.7,
  })
  const shell = new T.Mesh(new T.IcosahedronGeometry(0.36, 1), shellMat)
  g.add(shell)
  const heartMat = new T.MeshBasicMaterial({ color: hdr(T, '#bff8ee', 2.2) })
  const heart = new T.Mesh(new T.SphereGeometry(0.1, 16, 12), heartMat)
  g.add(heart)
  const haloMat = new T.SpriteMaterial({
    map: dot,
    color: hdr(T, PALETTE.teal, 0.7),
    blending: T.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  })
  const halo = new T.Sprite(haloMat)
  halo.scale.setScalar(3.2)
  g.add(halo)

  const coreV = new T.Vector3(...SERVICE_CORE)
  const conduits = SURFACES.map((sf) => {
    const curve = new T.CatmullRomCurve3([new T.Vector3(...sf.from), new T.Vector3(...sf.mid), coreV.clone()], false, 'centripetal')
    const mat = new T.MeshBasicMaterial({ color: hdr(T, PALETTE.blue, 0.55) })
    const tube = new T.Mesh(new T.TubeGeometry(curve, 80, 0.026, 6, false), mat)
    scene.add(tube)
    const glowMat = new T.MeshBasicMaterial({
      color: hdr(T, PALETTE.blue, 0.5),
      transparent: true,
      opacity: 0.18,
      blending: T.AdditiveBlending,
      depthWrite: false,
    })
    const glow = new T.Mesh(new T.TubeGeometry(curve, 80, 0.1, 8, false), glowMat)
    scene.add(glow)
    return { curve, mat, glowMat }
  })
  return {
    group: g,
    ring,
    ring2,
    shell,
    ringMat,
    heartMat,
    haloMat,
    halo,
    conduits,
  }
}

// ─────────────────────────── 질의 빔 ───────────────────────────

export function buildBeam(T: Three, scene: THREE.Scene) {
  const a = new T.Vector3(...SERVICE_CORE)
  const b = new T.Vector3(...BEAM_END)
  const dir = b.clone().sub(a).normalize()
  const len = a.distanceTo(b)
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir)
  const coreMat = new T.MeshBasicMaterial({
    color: hdr(T, '#a8fff0', 2.6),
    transparent: true,
  })
  const beam = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 1, 8, 1, true), coreMat)
  beam.quaternion.copy(q)
  scene.add(beam)
  const glowMat = new T.MeshBasicMaterial({
    color: hdr(T, PALETTE.teal, 0.8),
    transparent: true,
    opacity: 0.22,
    blending: T.AdditiveBlending,
    depthWrite: false,
  })
  const glow = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 1, 12, 1, true), glowMat)
  glow.quaternion.copy(q)
  scene.add(glow)
  return { a, dir, len, beam, glow, coreMat, glowMat }
}

/** 빔 위 한 점 → 각 소스로 뻗는 히트 레이. */
export function buildHitRays(T: Three, scene: THREE.Scene, beamA: THREE.Vector3, dir: THREE.Vector3, targets: THREE.Vector3[]) {
  const pos = new Float32Array(targets.length * 6)
  const from: THREE.Vector3[] = []
  targets.forEach((tgt, i) => {
    const s = tgt.clone().sub(beamA).dot(dir)
    const f = beamA.clone().add(dir.clone().multiplyScalar(s))
    from.push(f)
    pos.set([f.x, f.y, f.z, tgt.x, tgt.y, tgt.z], i * 6)
  })
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.BufferAttribute(pos, 3))
  const mat = new T.LineBasicMaterial({
    color: hdr(T, PALETTE.teal, 2),
    transparent: true,
    opacity: 0,
    blending: T.AdditiveBlending,
    depthWrite: false,
  })
  const lines = new T.LineSegments(geo, mat)
  scene.add(lines)
  return { lines, mat, from }
}

// ─────────────────────────── 답변 카드 + 근거 스레드 ───────────────────────────

export function buildCard(T: Three, scene: THREE.Scene, lookAt: THREE.Vector3) {
  const g = new T.Group()
  g.position.set(...CARD.pos)
  g.lookAt(lookAt)
  scene.add(g)
  const { w, h } = CARD
  const glassMat = new T.MeshBasicMaterial({
    color: '#07141a',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const glass = new T.Mesh(new T.PlaneGeometry(w, h), glassMat)
  glass.renderOrder = 10
  g.add(glass)
  const pts = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
    [-w / 2, -h / 2],
  ].map(([x, y]) => new T.Vector3(x, y, 0.005))
  const borderMat = new T.LineBasicMaterial({
    color: hdr(T, PALETTE.teal, 1.6),
    transparent: true,
    opacity: 0,
  })
  const border = new T.Line(new T.BufferGeometry().setFromPoints(pts), borderMat)
  border.renderOrder = 11
  g.add(border)
  // 헤더 구분선
  const divY = h / 2 - h * 0.27
  const divMat = new T.LineBasicMaterial({
    color: hdr(T, PALETTE.dim, 0.9),
    transparent: true,
    opacity: 0,
  })
  const div = new T.Line(
    new T.BufferGeometry().setFromPoints([new T.Vector3(-w / 2 + 0.12, divY, 0.005), new T.Vector3(w / 2 - 0.12, divY, 0.005)]),
    divMat,
  )
  div.renderOrder = 11
  g.add(div)
  g.updateMatrixWorld(true)
  const anchors = CARD.claimV.map((v) => g.localToWorld(new T.Vector3(-w / 2, h / 2 - v * h, 0)))
  return { group: g, glassMat, borderMat, divMat, anchors }
}

export function buildThread(T: Three, scene: THREE.Scene, from: THREE.Vector3, hs: HeroSource, to: THREE.Vector3) {
  const right = new T.Vector3(1, 0, 0).applyQuaternion(hs.group.quaternion)
  const normal = new T.Vector3(0, 0, 1).applyQuaternion(hs.group.quaternion)
  const c1 = from.clone().add(new T.Vector3(-1.9, 0, -0.6))
  const c2 = to.clone().add(right.multiplyScalar(0.9)).add(normal.multiplyScalar(0.5))
  const curve = new T.CubicBezierCurve3(from.clone(), c1, c2, to.clone())
  const SEG = 140
  const RAD = 6
  const mat = new T.MeshBasicMaterial({
    color: hdr(T, hs.src.color, 2.6),
    fog: false,
  })
  const tube = new T.Mesh(new T.TubeGeometry(curve, SEG, 0.014, RAD, false), mat)
  tube.renderOrder = 12
  scene.add(tube)
  const glowMat = new T.MeshBasicMaterial({
    color: hdr(T, hs.src.color, 0.9),
    transparent: true,
    opacity: 0.22,
    blending: T.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const glow = new T.Mesh(new T.TubeGeometry(curve, SEG, 0.06, RAD, false), glowMat)
  glow.renderOrder = 12
  scene.add(glow)
  return { curve, tube, glow, mat, glowMat, idxPerSeg: RAD * 6, SEG }
}

// ─────────────────────────── 파티클 ───────────────────────────

export function buildPulses(T: Three, scene: THREE.Scene, dot: THREE.Texture, n: number) {
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3))
  geo.setAttribute('color', new T.BufferAttribute(new Float32Array(n * 3), 3))
  const mat = new T.PointsMaterial({
    map: dot,
    size: 0.55,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
    fog: false,
  })
  const pts = new T.Points(geo, mat)
  pts.frustumCulled = false
  pts.renderOrder = 20
  scene.add(pts)
  return {
    pts,
    pos: geo.attributes.position as THREE.BufferAttribute,
    col: geo.attributes.color as THREE.BufferAttribute,
  }
}

export function buildDust(T: Three, scene: THREE.Scene, dot: THREE.Texture) {
  const r = rng(77)
  const N = 900
  const p = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    p[i * 3] = (r() * 2 - 1) * 24
    p[i * 3 + 1] = (r() * 2 - 1) * 11
    p[i * 3 + 2] = 6 - r() * 46
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.BufferAttribute(p, 3))
  const mat = new T.PointsMaterial({
    map: dot,
    size: 0.07,
    color: hdr(T, PALETTE.blue, 0.55),
    transparent: true,
    blending: T.AdditiveBlending,
    depthWrite: false,
  })
  const pts = new T.Points(geo, mat)
  scene.add(pts)
  return pts
}

export function buildFloor(T: Three, scene: THREE.Scene) {
  const grid = new T.GridHelper(90, 60, new T.Color('#1d3a40'), new T.Color('#101d22'))
  grid.position.set(0, -7.2, -14)
  const m = grid.material as THREE.LineBasicMaterial
  m.transparent = true
  m.opacity = 0.55
  m.depthWrite = false
  scene.add(grid)
  return grid
}
