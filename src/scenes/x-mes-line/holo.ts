import type * as THREE from 'three'
import { canvasFont } from '../_host/fonts'
import { buildPanel, fatMat, fatSegments, hdr, type Kit } from './build'
import { COLOR, LINE, STATIONS } from './data'

// 홀로그램 패널 내용 — Python Dash 대시보드 / MES 클라이언트(React·Electron).
// 모든 값은 t 로부터 결정적으로 계산한 추상 파형·통과 표시. 성과 수치·KPI 없음.

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

type IAttr = THREE.InterleavedBufferAttribute

export function buildDash(k: Kit) {
  const { T } = k
  const W = 5.4
  const H = 3.0
  const p = buildPanel(k, W, H, COLOR.teal)
  const { group, add } = p

  // 내부 가이드 그리드(얇은 팻 라인).
  const gp: number[] = []
  for (let i = 0; i <= 4; i++) {
    const y = 0.05 + i * 0.25
    gp.push(-2.45, y, 0.001, 0.95, y, 0.001)
  }
  gp.push(-2.45, -0.3, 0.001, 0.95, -0.3, 0.001, 1.2, -1.3, 0.001, 1.2, 1.3, 0.001)
  group.add(fatSegments(k, gp, add(fatMat(k, COLOR.phos, 0.5, 1, 0), 0.22)))

  // 헤더 바.
  const head = new T.Mesh(new T.PlaneGeometry(1.5, 0.06), add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 1.0), blending: T.AdditiveBlending }), 0.5))
  head.position.set(-1.65, 1.25, 0.002)
  group.add(head)

  // 라인 차트 2계열 — 팻 라인, 버퍼 직접 갱신(할당 없음).
  const NP = 64
  const series = [COLOR.teal, COLOR.blue].map((hex, si) => {
    const init = new Array((NP - 1) * 6).fill(0)
    const l = fatSegments(k, init, add(fatMat(k, hex, si === 0 ? 2.2 : 1.5, si === 0 ? 2.2 : 1.6, 0), 1))
    l.position.z = 0.004
    group.add(l)
    const geo = l.geometry as THREE.InstancedBufferGeometry
    const arr = ((geo.attributes.instanceStart as IAttr).data as THREE.InterleavedBuffer).array as Float32Array
    return { geo, arr, si, buf: (geo.attributes.instanceStart as IAttr).data as THREE.InterleavedBuffer }
  })

  // 막대.
  const NB = 20
  const bars = new T.InstancedMesh(new T.PlaneGeometry(1, 1), add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 0.9), NB)
  const bc = new T.Color()
  for (let i = 0; i < NB; i++) bars.setColorAt(i, bc.copy(hdr(T, i % 5 === 4 ? COLOR.blue : COLOR.teal, 1.0)))
  bars.position.z = 0.003
  bars.frustumCulled = false
  group.add(bars)

  // 우측: 링 게이지 + 프로토콜 상태 타일 + 진행 라인.
  const ringBg = new T.Mesh(new T.RingGeometry(0.37, 0.4, 96), add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.6), blending: T.AdditiveBlending }), 0.2))
  ringBg.position.set(1.85, 0.55, 0.002)
  group.add(ringBg)
  const arc = new T.Mesh(
    new T.RingGeometry(0.36, 0.41, 96, 1, 0, Math.PI * 1.35),
    add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 2.0), blending: T.AdditiveBlending }), 1),
  )
  arc.position.set(1.85, 0.55, 0.004)
  group.add(arc)

  const tileHex = [COLOR.teal, COLOR.blue, COLOR.amber]
  const tileMats = tileHex.map((hex, i) => {
    const m = new T.MeshBasicMaterial({ color: hdr(T, hex, 1.8), blending: T.AdditiveBlending })
    add(m, 0.9)
    const tile = new T.Mesh(new T.PlaneGeometry(0.3, 0.12), m)
    tile.position.set(1.48 + i * 0.37, 1.22, 0.003)
    group.add(tile)
    return m
  })

  const NPR = 4
  const prog = new T.InstancedMesh(new T.PlaneGeometry(1, 1), add(new T.MeshBasicMaterial({ color: 0xffffff, blending: T.AdditiveBlending }), 0.9), NPR)
  for (let i = 0; i < NPR; i++) prog.setColorAt(i, bc.copy(hdr(T, [COLOR.teal, COLOR.blue, COLOR.teal, COLOR.phos][i], 1.3)))
  prog.position.z = 0.003
  prog.frustumCulled = false
  group.add(prog)

  const sweep = new T.Mesh(new T.PlaneGeometry(0.014, 2.7), add(new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 2.2), blending: T.AdditiveBlending }), 0.5))
  sweep.position.z = 0.005
  group.add(sweep)

  const d = new T.Object3D()
  return {
    group,
    mats: p.mats,
    /** draw 0..1: 패널 내용 리빌. pulses: [opc, tcp, legacy] 도착 펄스 0..1 */
    update(t: number, draw: number, pulses: number[]) {
      const x0 = -2.4
      const x1 = 0.9
      for (const s of series) {
        const off = s.si * 3.1
        let px = 0
        let py = 0
        for (let i = 0; i < NP; i++) {
          const u = i / (NP - 1)
          const kk = u * 9 + t * 1.2 + off
          const y = 0.12 + 0.82 * (0.55 * vnoise(kk) + 0.3 * vnoise(kk * 2.3 + 11) + 0.15 * Math.sin(kk * 0.7 + off))
          const x = x0 + (x1 - x0) * u
          const yy = s.si === 0 ? y : y * 0.75
          if (i > 0) {
            const o = (i - 1) * 6
            s.arr[o] = px
            s.arr[o + 1] = py
            s.arr[o + 2] = 0
            s.arr[o + 3] = x
            s.arr[o + 4] = yy
            s.arr[o + 5] = 0
          }
          px = x
          py = yy
        }
        s.buf.needsUpdate = true
        s.geo.instanceCount = Math.max(0, Math.floor((NP - 1) * draw))
      }
      for (let i = 0; i < NB; i++) {
        const v = 0.15 + 0.85 * vnoise(i * 1.7 + t * 0.9)
        const reveal = smooth(Math.min(1, Math.max(0, draw * 1.6 - i / NB)))
        const h = Math.max(0.001, v * 0.95 * reveal)
        d.position.set(x0 + 0.085 + i * 0.17, -1.3 + h / 2, 0)
        d.scale.set(0.1, h, 1)
        d.updateMatrix()
        bars.setMatrixAt(i, d.matrix)
      }
      bars.instanceMatrix.needsUpdate = true
      arc.rotation.z = -t * 0.9
      arc.scale.setScalar(Math.max(0.001, draw))
      for (let i = 0; i < 3; i++) tileMats[i].color.copy(hdr(T, tileHex[i], 0.45 + 1.6 * pulses[i]))
      for (let i = 0; i < NPR; i++) {
        const v = (0.35 + 0.6 * vnoise(i * 3.3 + t * 0.35)) * draw
        d.position.set(1.4 + (v * 0.95) / 2, -0.45 - i * 0.24, 0)
        d.scale.set(Math.max(0.001, v * 0.95), 0.045, 1)
        d.updateMatrix()
        prog.setMatrixAt(i, d.matrix)
      }
      prog.instanceMatrix.needsUpdate = true
      const sw = (t * 0.35) % 1
      sweep.position.x = -W / 2 + 0.1 + sw * (W - 0.2)
    },
  }
}

/**
 * MES 클라이언트 — 파우치 S/N 행 리스트. 각 행 = 파우치 1개,
 * 3칸 = 크기 · 무게(측정 스테이션) · 비전(검사 스테이션) 통과 표시. 측정값 숫자는 쓰지 않는다.
 */
export function buildClient(k: Kit) {
  const { T } = k
  const W = 3.2
  const H = 2.9
  const p = buildPanel(k, W, H, COLOR.blue)
  const { group, add } = p

  const CW = 512
  const CH = 464
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  const g = c.getContext('2d')!
  const tex = new T.CanvasTexture(c)
  tex.colorSpace = T.SRGBColorSpace
  tex.anisotropy = 4
  const screen = new T.Mesh(
    new T.PlaneGeometry(W - 0.12, H - 0.12),
    add(new T.MeshBasicMaterial({ map: tex, blending: T.AdditiveBlending, color: hdr(T, 0xffffff, 1.6) }), 1),
  )
  screen.position.z = 0.003
  group.add(screen)

  const ROWS = 12
  const top = 92
  const rowH = 29
  const colX = { sn: 26, size: 250, weight: 335, vision: 420 }
  const xGauge = STATIONS.find((s) => s.id === 'gauge')!.x - LINE.x0
  const xVision = STATIONS.find((s) => s.id === 'vision')!.x - LINE.x0
  const pill = (x: number, y: number, on: boolean, hex: string) => {
    g.beginPath()
    g.roundRect(x, y - 9, 58, 18, 9)
    if (on) {
      g.fillStyle = hex.replace('A', '0.22')
      g.fill()
      g.strokeStyle = hex.replace('A', '0.9')
      g.lineWidth = 1
      g.stroke()
      g.fillStyle = hex.replace('A', '1')
      g.font = canvasFont(700, 11, 'mono')
      g.fillText('✓ OK', x + 10, y + 4)
    } else {
      g.strokeStyle = 'rgba(141,141,141,0.28)'
      g.lineWidth = 1
      g.setLineDash([3, 3])
      g.stroke()
      g.setLineDash([])
    }
  }

  let lastKey = -1
  const draw = (k0: number, f: number) => {
    g.clearRect(0, 0, CW, CH)
    g.fillStyle = 'rgba(74,179,204,0.10)'
    g.fillRect(14, 14, CW - 28, 38)
    g.font = canvasFont(700, 13, 'mono')
    g.fillStyle = 'rgba(215,215,215,0.9)'
    g.fillText('MES CLIENT', 26, 38)
    g.font = canvasFont(500, 11, 'mono')
    g.fillStyle = 'rgba(74,179,204,0.85)'
    g.fillText('POUCH · S/N', 140, 38)
    g.fillStyle = 'rgba(79,224,196,0.9)'
    g.beginPath()
    g.arc(CW - 34, 33, 4, 0, Math.PI * 2)
    g.fill()
    g.font = canvasFont(600, 10.5, 'mono')
    g.fillStyle = 'rgba(141,141,141,0.95)'
    g.fillText('S/N', colX.sn, 76)
    g.fillText('SIZE', colX.size + 12, 76)
    g.fillText('WEIGHT', colX.weight + 4, 76)
    g.fillText('VISION', colX.vision + 4, 76)
    g.fillStyle = 'rgba(215,215,215,0.14)'
    g.fillRect(14, 84, CW - 28, 1)
    for (let i = 0; i < ROWS; i++) {
      const id = k0 - i
      const y = top + i * rowH + rowH / 2
      const dist = (i + f) * LINE.pitch
      if (i === 0) {
        g.fillStyle = 'rgba(74,179,204,0.12)'
        g.fillRect(14, y - rowH / 2 + 2, CW - 28, rowH - 4)
      }
      g.font = canvasFont(500, 12.5, 'mono')
      g.fillStyle = i === 0 ? 'rgba(235,235,235,0.95)' : 'rgba(215,215,215,0.62)'
      const sn = String(((id % 10000) + 10000) % 10000).padStart(4, '0')
      g.fillText(`GWP-${sn}`, colX.sn, y + 4)
      const okDim = dist > xGauge
      pill(colX.size, y, okDim, 'rgba(79,224,196,A)')
      pill(colX.weight, y, okDim, 'rgba(79,224,196,A)')
      pill(colX.vision, y, dist > xVision, 'rgba(74,179,204,A)')
      g.fillStyle = 'rgba(215,215,215,0.06)'
      g.fillRect(14, y + rowH / 2, CW - 28, 1)
    }
    tex.needsUpdate = true
  }

  const fg = (xGauge / LINE.pitch) % 1
  const fv = (xVision / LINE.pitch) % 1
  return {
    group,
    mats: p.mats,
    /** s = 컨베이어 이송 거리. */
    update(s: number) {
      const n = s / LINE.pitch
      const k0 = Math.floor(n)
      const f = n - k0
      // 통과 상태는 f 가 임계값을 넘을 때만 바뀐다 → 키가 바뀔 때만 다시 그린다.
      const key = (k0 + 1000) * 4 + (f > fg ? 1 : 0) + (f > fv ? 2 : 0)
      if (key !== lastKey) {
        lastKey = key
        draw(412 + k0, f)
      }
    },
  }
}
