// 소형 배터리팩 라인의 실제 스테이션.
// 유리 C/T 게이지(데이터)는 뒤에 두고, 컨베이어 위 팩을 만지는 장비는 여기 둔다.
// 병목 인덱스(data.ts): 2 Neck 커팅 프레스, 6 Core-pack 기능검사.

import type * as THREE_NS from 'three'
import type { Three } from '../_host/three/types'
import { BELT_TOP, COL, CONV_Z, hdr, type Kit } from './build'

export type StationKind = 'asm' | 'neck' | 'weld' | 'label' | 'ft' | 'final'

/** 왼쪽 → 오른쪽 공정 순서. */
export const STATION_KIND: StationKind[] = ['asm', 'asm', 'neck', 'weld', 'asm', 'label', 'ft', 'final', 'final']

export interface StationRig {
  kind: StationKind
  group: THREE_NS.Group
  /** 팩 위로 내려오는 헤드. y 를 headUp↔headDown 으로 움직인다. */
  head: THREE_NS.Object3D | null
  headUp: number
  headDown: number
  /** 조립 클램프. x 를 open→closed. */
  jaws: Array<{ obj: THREE_NS.Object3D; openX: number; closedX: number }>
  glow: THREE_NS.MeshBasicMaterial | null
  /** FT 스택라이트 [적, 황, 녹] */
  lamps: THREE_NS.MeshBasicMaterial[]
  screen: { cv: HTMLCanvasElement; tex: THREE_NS.CanvasTexture; mode: string } | null
}

const nestY = BELT_TOP + 0.012

function box(THREE: Three, w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(x, y, z)
  return g
}

function cyl(THREE: Three, r: number, h: number, x: number, y: number, z: number) {
  const g = new THREE.CylinderGeometry(r, r, h, 12)
  g.translate(x, y, z)
  return g
}

/** 검사기 화면. mode: sleep(지그 전) | wake(포고 전류) | test | ready. 바뀔 때만 호출. */
export function paintFtScreen(cv: HTMLCanvasElement, mode: string, en: boolean) {
  const g = cv.getContext('2d')
  if (!g) return
  const W = cv.width
  const H = cv.height
  g.clearRect(0, 0, W, H)
  g.fillStyle = '#061014'
  g.fillRect(0, 0, W, H)
  const accent = mode === 'wake' ? '#e0a15a' : mode === 'sleep' ? '#8a5a4a' : '#4fe0c4'
  g.strokeStyle = accent
  g.globalAlpha = 0.7
  g.lineWidth = 3
  g.strokeRect(3, 3, W - 6, H - 6)
  g.globalAlpha = 1
  g.fillStyle = '#8fd8e6'
  g.font = "600 20px 'Pretendard Variable', sans-serif"
  g.fillText(en ? 'CORE-PACK FT' : 'CORE-PACK 기능검사', 16, 32)
  g.font = "500 16px 'Pretendard Variable', sans-serif"
  g.fillStyle = '#9aa7ad'
  const sub =
    mode === 'sleep'
      ? en
        ? 'No jig · cell asleep'
        : '지그 없음 · 셀 슬립'
      : mode === 'wake'
        ? en
          ? '2 lines · current in'
          : '2라인 · 회로에 전류'
        : mode === 'test'
          ? en
            ? '2 lines · function test'
            : '2라인 · 기능검사'
          : en
            ? '2 lines · wake-up jig'
            : '2라인 · 웨이크업 지그'
  g.fillText(sub, 16, 58)
  const label =
    mode === 'sleep' ? (en ? 'SLEEP' : '슬립') : mode === 'wake' ? (en ? 'WAKE-UP' : '웨이크업') : mode === 'test' ? (en ? 'TEST' : '검사') : en ? 'READY' : '대기'
  g.fillStyle = accent
  g.font = "700 32px 'Pretendard Variable', sans-serif"
  g.fillText(label, 16, 108)
  g.font = "500 16px 'JetBrains Mono', 'Pretendard Variable', monospace"
  g.fillStyle = '#d5dee2'
  g.fillText(mode === 'wake' ? 'I  0.40 A' : mode === 'test' ? 'V 12.62   I 1.84 A' : mode === 'sleep' ? 'I  0.00 A' : 'PINS 15', 16, 142)
  for (let i = 0; i < 15; i++) {
    const on = mode === 'wake' || mode === 'test' || mode === 'ready'
    g.fillStyle = !on ? '#1c3338' : mode === 'wake' ? '#e0a15a' : '#4fe0c4'
    g.beginPath()
    g.arc(200 + (i % 5) * 20, 78 + Math.floor(i / 5) * 18, 5, 0, Math.PI * 2)
    g.fill()
  }
}

export function buildStations(THREE: Three, kit: Kit): StationRig[] {
  const RB = kit.RoundedBox
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c343b, metalness: 0.72, roughness: 0.38 })
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x8e989f, metalness: 0.9, roughness: 0.28 })
  const nestMat = new THREE.MeshStandardMaterial({ color: 0x1a2126, metalness: 0.4, roughness: 0.55 })
  const rigs: StationRig[] = []

  const addMesh = (parent: THREE_NS.Object3D, geo: THREE_NS.BufferGeometry, mat: THREE_NS.Material) => {
    parent.add(new THREE.Mesh(geo, mat))
  }

  STATION_KIND.forEach((kind, index) => {
    const group = new THREE.Group()
    const rig: StationRig = { kind, group, head: null, headUp: 0, headDown: 0, jaws: [], glow: null, lamps: [], screen: null }
    // 팩이 앉는 네스트(가이드 두 줄). 조립·커팅·검사에서 정지 위치가 읽힌다.
    if (kind === 'asm' || kind === 'neck' || kind === 'ft') {
      const nest = new THREE.Group()
      addMesh(nest, box(THREE, 0.5, 0.012, 0.34, 0, nestY, CONV_Z), nestMat)
      addMesh(nest, box(THREE, 0.5, 0.04, 0.018, 0, nestY + 0.02, CONV_Z - 0.16), steelMat)
      addMesh(nest, box(THREE, 0.5, 0.04, 0.018, 0, nestY + 0.02, CONV_Z + 0.16), steelMat)
      group.add(nest)
    }

    if (kind === 'asm') {
      // 좌우 클램프. 인덱스마다 살짝 다른 폭이라 복제처럼 보이지 않게.
      for (const side of [-1, 1]) {
        const jaw = new THREE.Mesh(new RB(0.06, 0.07, 0.2, 1, 0.01), steelMat)
        jaw.position.set(side * 0.28, BELT_TOP + 0.08, CONV_Z)
        group.add(jaw)
        rig.jaws.push({ obj: jaw, openX: side * 0.3, closedX: side * (0.16 + (index % 2) * 0.02) })
      }
      // 벤치 위 픽스처 바디
      addMesh(group, new RB(0.34, 0.22, 0.2, 2, 0.02), darkMat)
      const body = group.children[group.children.length - 1] as THREE_NS.Mesh
      body.position.set((index % 2 === 0 ? -1 : 1) * 0.34, 0.38, 0.62)
    }

    if (kind === 'neck') {
      // C형 프레스: 벨트 안쪽 기둥 + 크라운, 플래튼이 팩 위로 내려온다.
      const colZ = CONV_Z - 0.38
      addMesh(group, box(THREE, 0.12, 0.86, 0.12, 0, 0.43, colZ), darkMat)
      addMesh(group, box(THREE, 0.22, 0.09, 0.58, 0, 0.84, CONV_Z - 0.14), darkMat)
      addMesh(group, cyl(THREE, 0.045, 0.22, 0, 0.7, CONV_Z - 0.02), steelMat)
      const head = new THREE.Group()
      addMesh(head, new RB(0.46, 0.07, 0.26, 2, 0.012), steelMat)
      const bladeMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 1.2) })
      const blade = new THREE.Mesh(box(THREE, 0.22, 0.012, 0.012, 0, -0.04, 0.04), bladeMat)
      head.add(blade)
      head.position.set(0, 0.62, CONV_Z)
      group.add(head)
      rig.head = head
      rig.headUp = 0.62
      rig.headDown = 0.4
      rig.glow = bladeMat
      // 지그 로케이터 핀 둘
      addMesh(group, cyl(THREE, 0.012, 0.05, -0.16, nestY + 0.03, CONV_Z - 0.08), steelMat)
      addMesh(group, cyl(THREE, 0.012, 0.05, 0.16, nestY + 0.03, CONV_Z + 0.08), steelMat)
    }

    if (kind === 'weld') {
      addMesh(group, box(THREE, 0.08, 0.7, 0.08, -0.22, 0.4, CONV_Z - 0.28), darkMat)
      addMesh(group, box(THREE, 0.28, 0.05, 0.06, -0.06, 0.72, CONV_Z - 0.1), steelMat)
      const head = new THREE.Group()
      addMesh(head, cyl(THREE, 0.02, 0.16, 0, -0.04, 0), steelMat)
      const tipMat = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.amber, 0.4) })
      head.add(new THREE.Mesh(cyl(THREE, 0.012, 0.03, 0, -0.14, 0), tipMat))
      head.position.set(0.02, 0.66, CONV_Z)
      group.add(head)
      rig.head = head
      rig.headUp = 0.66
      rig.headDown = 0.48
      rig.glow = tipMat
    }

    if (kind === 'label') {
      addMesh(group, new RB(0.28, 0.32, 0.2, 2, 0.016), darkMat)
      const cab = group.children[group.children.length - 1] as THREE_NS.Mesh
      cab.position.set(0, 0.42, 0.52)
      // 라벨 롤
      addMesh(group, cyl(THREE, 0.06, 0.08, 0.2, 0.58, 0.52), steelMat)
      const head = new THREE.Group()
      addMesh(head, new RB(0.2, 0.05, 0.14, 1, 0.01), steelMat)
      head.position.set(0, 0.58, CONV_Z)
      group.add(head)
      rig.head = head
      rig.headUp = 0.58
      rig.headDown = 0.4
    }

    if (kind === 'ft') {
      // 캐비닛 + 화면 + 스택라이트, 갠트리가 포고핀 헤드를 팩 위에 내린다.
      const cab = new THREE.Mesh(new RB(0.62, 0.78, 0.28, 2, 0.02), darkMat)
      cab.position.set(-0.52, 0.46, 0.62)
      group.add(cab)
      const cv = document.createElement('canvas')
      cv.width = 320
      cv.height = 180
      paintFtScreen(cv, 'sleep', false)
      const tex = new THREE.CanvasTexture(cv)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 0.17),
        new THREE.MeshBasicMaterial({ map: tex }),
      )
      screen.scale.set(1.6, 1.55, 1)
      screen.position.set(-0.52, 0.5, 0.78)
      group.add(screen)
      rig.screen = { cv, tex, mode: 'sleep' }
      const lampColors = [COL.red, COL.amber, COL.teal]
      lampColors.forEach((hex, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(0.15) })
        const lamp = new THREE.Mesh(cyl(THREE, 0.04, 0.07, -0.52, 0.9 + i * 0.08, 0.62), mat)
        group.add(lamp)
        rig.lamps.push(mat)
      })
      addMesh(group, box(THREE, 0.08, 0.07, 0.7, -0.22, 0.86, CONV_Z - 0.28), darkMat)
      const head = new THREE.Group()
      addMesh(head, new RB(0.5, 0.07, 0.24, 2, 0.012), darkMat)
      // 포고핀 3×5
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const pin = cyl(THREE, 0.008, 0.045, -0.12 + c * 0.06, -0.05, -0.06 + r * 0.06)
          head.add(new THREE.Mesh(pin, steelMat))
        }
      }
      head.position.set(0, 0.64, CONV_Z)
      group.add(head)
      rig.head = head
      rig.headUp = 0.64
      rig.headDown = 0.42
    }

    if (kind === 'final') {
      // 앞 스테이션은 링 라이트 비전, 뒤는 게이트 스캐너.
      const vision = index === 7
      if (vision) {
        addMesh(group, box(THREE, 0.06, 0.55, 0.06, -0.28, 0.4, CONV_Z - 0.05), darkMat)
        addMesh(group, box(THREE, 0.06, 0.55, 0.06, 0.28, 0.4, CONV_Z - 0.05), darkMat)
        addMesh(group, box(THREE, 0.62, 0.05, 0.06, 0, 0.66, CONV_Z - 0.05), steelMat)
        const glow = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.blue, 0.35) })
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), glow)
        ring.position.set(0, 0.5, CONV_Z - 0.02)
        group.add(ring)
        rig.glow = glow
      } else {
        addMesh(group, box(THREE, 0.05, 0.48, 0.05, -0.26, 0.28, CONV_Z), darkMat)
        addMesh(group, box(THREE, 0.05, 0.48, 0.05, 0.26, 0.28, CONV_Z), darkMat)
        const glow = new THREE.MeshBasicMaterial({ color: hdr(THREE, COL.teal, 0.3) })
        const beam = new THREE.Mesh(box(THREE, 0.46, 0.012, 0.012, 0, 0.42, CONV_Z), glow)
        group.add(beam)
        rig.glow = glow
      }
    }

    rigs.push(rig)
  })

  return rigs
}
