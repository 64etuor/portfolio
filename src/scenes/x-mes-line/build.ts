import type * as THREE from 'three'
import type { Three } from '../_host/three/types'
import { CORE, COLOR, LINE, STATIONS, type StationDef } from './data'

// 지오메트리/머티리얼 빌더. 런타임 상태 없음 — 핸들만 돌려준다.

export const hdr = (T: Three, hex: number, k: number) => new T.Color(hex).multiplyScalar(k)

/** 방사형 그라디언트 CanvasTexture (글로우 스프라이트·바닥 광륜용). */
export function radialTexture(T: Three) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const tex = new T.CanvasTexture(c)
  tex.colorSpace = T.SRGBColorSpace
  return tex
}

/** 세로 그라디언트(아래 1 → 위 0) — 빔/콘. */
export function beamMaterial(T: Three, hex: number, k: number, opacity: number) {
  return new T.ShaderMaterial({
    uniforms: { uColor: { value: hdr(T, hex, k) }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){ float a = (0.18 + 0.82 * pow(vUv.y, 1.4)) * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
  })
}

export function buildEnvironment(T: Three, scene: THREE.Scene, glowTex: THREE.Texture) {
  scene.fog = new T.FogExp2(0x04070a, 0.034)

  const hemi = new T.HemisphereLight(0x7f9fb0, 0x05070a, 0.55)
  scene.add(hemi)
  const key = new T.DirectionalLight(0xc8dceb, 1.1)
  key.position.set(6, 12, 8)
  scene.add(key)
  const rim = new T.DirectionalLight(0x4ab3cc, 0.6)
  rim.position.set(-8, 5, -10)
  scene.add(rim)

  const floor = new T.Mesh(
    new T.PlaneGeometry(90, 90),
    new T.MeshStandardMaterial({ color: 0x080c0f, roughness: 0.55, metalness: 0.55 }),
  )
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  const grid = new T.GridHelper(70, 70, 0x1f3a3a, 0x15222a)
  const gm = grid.material as THREE.LineBasicMaterial
  gm.transparent = true
  gm.opacity = 0.35
  grid.position.y = 0.002
  scene.add(grid)

  // 바닥 광륜(코어 아래).
  const pool = new T.Mesh(
    new T.PlaneGeometry(9, 9),
    new T.MeshBasicMaterial({
      map: glowTex,
      color: hdr(T, COLOR.teal, 0.6),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.set(CORE.x, 0.01, CORE.z)
  scene.add(pool)

  // 부유 먼지.
  const N = 520
  const pos = new Float32Array(N * 3)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rnd() - 0.5) * 30
    pos[i * 3 + 1] = rnd() * 9
    pos[i * 3 + 2] = (rnd() - 0.5) * 24 - 3
  }
  const dg = new T.BufferGeometry()
  dg.setAttribute('position', new T.BufferAttribute(pos, 3))
  const dust = new T.Points(
    dg,
    new T.PointsMaterial({
      size: 0.05,
      map: glowTex,
      color: hdr(T, COLOR.phos, 0.9),
      transparent: true,
      opacity: 0.55,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  )
  scene.add(dust)
  return { pool, poolMat: pool.material as THREE.MeshBasicMaterial, dust }
}

/** 컨베이어 + 호퍼 + 셀(인스턴스). */
export function buildLine(T: Three, scene: THREE.Scene) {
  const L = LINE.cells * LINE.pitch
  const xMid = LINE.x0 + L / 2
  const metal = new T.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.4, metalness: 0.85 })
  const darkMetal = new T.MeshStandardMaterial({ color: 0x0d1216, roughness: 0.5, metalness: 0.8 })

  const frame = new T.Mesh(new T.BoxGeometry(L + 1.2, 0.22, 1.0), darkMetal)
  frame.position.set(xMid, 0.42, 0)
  scene.add(frame)

  // 다리.
  const legs = new T.InstancedMesh(new T.BoxGeometry(0.1, 0.36, 0.1), metal, 18)
  const d = new T.Object3D()
  for (let i = 0; i < 9; i++) {
    for (let s = 0; s < 2; s++) {
      d.position.set(LINE.x0 - 0.4 + (i * (L + 0.8)) / 8, 0.16, s ? 0.42 : -0.42)
      d.updateMatrix()
      legs.setMatrixAt(i * 2 + s, d.matrix)
    }
  }
  scene.add(legs)

  // 사이드 레일 발광 스트립.
  const railMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.25) })
  for (const z of [-0.52, 0.52]) {
    const r = new T.Mesh(new T.BoxGeometry(L + 1.2, 0.025, 0.025), railMat)
    r.position.set(xMid, 0.54, z)
    scene.add(r)
  }

  // 벨트 슬랫(이동).
  const slatN = LINE.cells * 2
  const slats = new T.InstancedMesh(
    new T.BoxGeometry(0.06, 0.02, 0.86),
    new T.MeshStandardMaterial({ color: 0x2b363d, roughness: 0.6, metalness: 0.5 }),
    slatN,
  )
  scene.add(slats)

  // 호퍼(셀 투입/배출구).
  const hopperGeo = new T.BoxGeometry(1.3, 1.5, 1.4)
  const hopperL = new T.Mesh(hopperGeo, darkMetal)
  hopperL.position.set(LINE.x0 - 0.35, 0.75, 0)
  const hopperR = new T.Mesh(hopperGeo, darkMetal)
  hopperR.position.set(LINE.x0 + L + 0.35, 0.75, 0)
  scene.add(hopperL, hopperR)
  const slotMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.35) })
  for (const [x, sx] of [
    [LINE.x0 + 0.31, 1],
    [LINE.x0 + L - 0.31, -1],
  ] as const) {
    const slot = new T.Mesh(new T.BoxGeometry(0.02, 0.9, 1.0), slotMat)
    slot.position.set(x + 0 * sx, 0.95, 0)
    scene.add(slot)
  }

  // 셀(원통형 배터리) — 바디 + 상단 상태 캡.
  const n = LINE.cells
  const bodies = new T.InstancedMesh(
    new T.CylinderGeometry(0.17, 0.17, 0.6, 24),
    new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0.75 }),
    n,
  )
  const caps = new T.InstancedMesh(
    new T.CylinderGeometry(0.11, 0.11, 0.035, 18),
    new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: true }),
    n,
  )
  const bands = new T.InstancedMesh(
    new T.CylinderGeometry(0.176, 0.176, 0.05, 24, 1, true),
    new T.MeshBasicMaterial({ color: 0xffffff }),
    n,
  )
  const c = new T.Color(0x333333)
  for (let i = 0; i < n; i++) {
    bodies.setColorAt(i, c)
    caps.setColorAt(i, c)
    bands.setColorAt(i, c)
  }
  for (const m of [bodies, caps, bands, slats]) m.instanceMatrix.setUsage(T.DynamicDrawUsage)
  scene.add(bodies, caps, bands)

  return { slats, bodies, caps, bands, railMat, slotMat }
}

export interface StationHandle {
  def: StationDef
  strip: THREE.MeshBasicMaterial
  light: THREE.PointLight
  /** 스테이션별 가동부 */
  head?: THREE.Object3D
  pushers?: THREE.Object3D[]
  ring?: THREE.Mesh
  beam?: THREE.Mesh
  beamMat?: THREE.ShaderMaterial
  floorGlow: THREE.MeshBasicMaterial
  top: THREE.Vector3
}

export function buildStations(T: Three, scene: THREE.Scene, glowTex: THREE.Texture): StationHandle[] {
  const metal = new T.MeshStandardMaterial({ color: 0x222c33, roughness: 0.35, metalness: 0.85 })
  const postGeo = new T.BoxGeometry(0.14, 2.0, 0.14)
  const beamGeo = new T.BoxGeometry(0.34, 0.16, 1.62)
  return STATIONS.map((def) => {
    const g = new T.Group()
    g.position.x = def.x
    for (const z of [-0.74, 0.74]) {
      const p = new T.Mesh(postGeo, metal)
      p.position.set(0, 1.0, z)
      g.add(p)
    }
    const beam = new T.Mesh(beamGeo, metal)
    beam.position.set(0, 2.0, 0)
    g.add(beam)
    const strip = new T.MeshBasicMaterial({ color: hdr(T, def.color, 0.3) })
    const stripMesh = new T.Mesh(new T.BoxGeometry(0.36, 0.035, 1.5), strip)
    stripMesh.position.set(0, 1.905, 0)
    g.add(stripMesh)
    // 포스트 세로 스트립.
    for (const z of [-0.66, 0.66]) {
      const s = new T.Mesh(new T.BoxGeometry(0.03, 1.7, 0.03), strip)
      s.position.set(0.08, 1.0, z)
      g.add(s)
    }

    const light = new T.PointLight(def.color, 0, 5, 1.6)
    light.position.set(0, 1.5, 0.6)
    g.add(light)

    const fg = new T.MeshBasicMaterial({
      map: glowTex,
      color: hdr(T, def.color, 0.0),
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    })
    const floorGlow = new T.Mesh(new T.PlaneGeometry(3.2, 3.2), fg)
    floorGlow.rotation.x = -Math.PI / 2
    floorGlow.position.y = 0.015
    g.add(floorGlow)

    const h: StationHandle = { def, strip, light, floorGlow: fg, top: new T.Vector3(def.x, 2.12, 0) }

    if (def.id === 'scan') {
      const head = new T.Mesh(new T.BoxGeometry(0.26, 0.2, 0.36), metal)
      head.position.set(0, 1.78, 0)
      g.add(head)
      const bm = beamMaterial(T, COLOR.phos, 1.6, 0)
      const fan = new T.Mesh(new T.ConeGeometry(0.42, 0.95, 3, 1, true), bm)
      fan.scale.set(1, 1, 0.05)
      fan.rotation.y = Math.PI / 2
      fan.position.set(0, 1.2, 0)
      g.add(fan)
      h.beam = fan
      h.beamMat = bm
    } else if (def.id === 'ocv') {
      const head = new T.Group()
      const block = new T.Mesh(new T.BoxGeometry(0.42, 0.3, 0.5), metal)
      head.add(block)
      const pinMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.amber, 1.4) })
      for (const z of [-0.06, 0.06]) {
        const pin = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.3, 8), pinMat)
        pin.position.set(0, -0.28, z)
        head.add(pin)
      }
      head.position.set(0, 1.65, 0)
      g.add(head)
      h.head = head
    } else if (def.id === 'vision') {
      const cam = new T.Mesh(new T.BoxGeometry(0.3, 0.34, 0.3), metal)
      cam.position.set(0, 1.72, 0)
      g.add(cam)
      const lens = new T.Mesh(
        new T.CylinderGeometry(0.08, 0.08, 0.06, 16),
        new T.MeshBasicMaterial({ color: hdr(T, COLOR.blue, 2.2) }),
      )
      lens.position.set(0, 1.53, 0)
      g.add(lens)
      const bm = beamMaterial(T, COLOR.blue, 1.8, 0)
      const cone = new T.Mesh(new T.ConeGeometry(0.45, 0.85, 32, 1, true), bm)
      cone.position.set(0, 1.08, 0)
      g.add(cone)
      h.beam = cone
      h.beamMat = bm
    } else if (def.id === 'assy') {
      const pushers: THREE.Object3D[] = []
      for (const s of [-1, 1]) {
        const p = new T.Mesh(new T.BoxGeometry(0.34, 0.3, 0.16), metal)
        p.position.set(0, 0.88, s * 0.5)
        p.userData.side = s
        g.add(p)
        pushers.push(p)
      }
      const ring = new T.Mesh(
        new T.TorusGeometry(0.27, 0.014, 8, 48),
        new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 2.4), transparent: true, opacity: 0 }),
      )
      ring.rotation.x = Math.PI / 2
      ring.position.set(0, 0.9, 0)
      g.add(ring)
      h.pushers = pushers
      h.ring = ring
      const press = new T.Mesh(new T.BoxGeometry(0.3, 0.22, 0.3), metal)
      press.position.set(0, 1.78, 0)
      g.add(press)
    }
    scene.add(g)
    return h
  })
}

export interface PathHandle {
  station: StationDef
  curve: THREE.CubicBezierCurve3
  core: THREE.Mesh
  glow: THREE.Mesh
  coreMat: THREE.MeshBasicMaterial
  glowMat: THREE.MeshBasicMaterial
  indexCount: number
  labelAnchor: THREE.Vector3
}

export function buildPaths(T: Three, scene: THREE.Scene): PathHandle[] {
  return STATIONS.filter((s) => s.path).map((st) => {
    const p = st.path!
    const ex = CORE.x + (st.x - CORE.x) * 0.12
    const curve = new T.CubicBezierCurve3(
      new T.Vector3(st.x, 2.12, 0),
      new T.Vector3(st.x, 4.1, -0.6),
      new T.Vector3(CORE.x + (st.x - CORE.x) * 0.55, p.entryY + 1.6, CORE.z + 3.2),
      new T.Vector3(ex, p.entryY + CORE.y, CORE.z + 1.05),
    )
    const coreMat = new T.MeshBasicMaterial({
      color: hdr(T, st.color, 1.6),
      transparent: true,
      opacity: 0.9,
      blending: T.AdditiveBlending,
      depthWrite: false,
    })
    const glowMat = new T.MeshBasicMaterial({
      color: hdr(T, st.color, 0.5),
      transparent: true,
      opacity: 0.22,
      blending: T.AdditiveBlending,
      depthWrite: false,
    })
    const tg = new T.TubeGeometry(curve, 120, 0.016, 6, false)
    const gg = new T.TubeGeometry(curve, 120, 0.07, 8, false)
    const core = new T.Mesh(tg, coreMat)
    const glow = new T.Mesh(gg, glowMat)
    core.geometry.setDrawRange(0, 0)
    glow.geometry.setDrawRange(0, 0)
    scene.add(core, glow)
    return {
      station: st,
      curve,
      core,
      glow,
      coreMat,
      glowMat,
      indexCount: tg.index!.count,
      labelAnchor: curve.getPointAt(0.3),
    }
  })
}

/** PostgreSQL 코어 — 적층 디스크 + 발광 기둥 + 궤도 링. */
export function buildCore(T: Three, scene: THREE.Scene) {
  const g = new T.Group()
  g.position.set(CORE.x, CORE.y, CORE.z)
  const discMat = new T.MeshStandardMaterial({
    color: 0x16232a,
    roughness: 0.18,
    metalness: 0.6,
    transparent: true,
    opacity: 0.72,
  })
  const rimMats: THREE.MeshBasicMaterial[] = []
  const ys = [0.6, 1.3, 2.0, 2.7]
  for (const y of ys) {
    const disc = new T.Mesh(new T.CylinderGeometry(1.05, 1.05, 0.5, 64), discMat)
    disc.position.y = y
    g.add(disc)
    const rm = new T.MeshBasicMaterial({ color: hdr(T, COLOR.teal, 0.2) })
    rimMats.push(rm)
    for (const dy of [0.25, -0.25]) {
      const rim = new T.Mesh(new T.TorusGeometry(1.05, 0.012, 6, 96), rm)
      rim.rotation.x = Math.PI / 2
      rim.position.y = y + dy
      g.add(rim)
    }
  }
  const base = new T.Mesh(
    new T.CylinderGeometry(1.35, 1.5, 0.28, 64),
    new T.MeshStandardMaterial({ color: 0x0d1418, roughness: 0.4, metalness: 0.85 }),
  )
  base.position.y = 0.14
  g.add(base)

  const columnMat = new T.MeshBasicMaterial({
    color: hdr(T, COLOR.teal, 0.3),
    transparent: true,
    opacity: 0.9,
    blending: T.AdditiveBlending,
    depthWrite: false,
  })
  const column = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 2.8, 32, 1, true), columnMat)
  column.position.y = 1.65
  g.add(column)

  const orbitMats: THREE.LineBasicMaterial[] = []
  const orbits: THREE.Object3D[] = []
  for (let i = 0; i < 3; i++) {
    const pts: THREE.Vector3[] = []
    const R = 1.45 + i * 0.22
    for (let k = 0; k < 96; k++) {
      if (k % 8 > 5) continue
      const a0 = (k / 96) * Math.PI * 2
      const a1 = ((k + 1) / 96) * Math.PI * 2
      pts.push(new T.Vector3(Math.cos(a0) * R, 0, Math.sin(a0) * R), new T.Vector3(Math.cos(a1) * R, 0, Math.sin(a1) * R))
    }
    const om = new T.LineBasicMaterial({ color: hdr(T, i === 1 ? COLOR.blue : COLOR.teal, 0.2), transparent: true })
    orbitMats.push(om)
    const ln = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), om)
    ln.position.y = 0.9 + i * 0.9
    g.add(ln)
    orbits.push(ln)
  }

  // API 링(코어 상단 — Django/DRF).
  const apiMat = new T.MeshBasicMaterial({ color: hdr(T, COLOR.phos, 0.0), transparent: true })
  const api = new T.Mesh(new T.TorusGeometry(0.62, 0.03, 8, 64), apiMat)
  api.rotation.x = Math.PI / 2
  api.position.y = 3.35
  g.add(api)
  const api2 = new T.Mesh(new T.TorusGeometry(0.42, 0.015, 8, 64), apiMat)
  api2.rotation.x = Math.PI / 2
  api2.position.y = 3.55
  g.add(api2)

  const light = new T.PointLight(COLOR.teal, 0, 9, 1.4)
  light.position.set(0, 1.8, 1.6)
  g.add(light)

  scene.add(g)
  return { group: g, rimMats, columnMat, orbitMats, orbits, apiMat, light, top: new T.Vector3(CORE.x, 3.6, CORE.z) }
}

/** 데이터 패킷(인스턴스 큐브). */
export function buildPackets(T: Three, scene: THREE.Scene, count: number) {
  const m = new T.InstancedMesh(new T.BoxGeometry(0.11, 0.11, 0.11), new T.MeshBasicMaterial({ color: 0xffffff }), count)
  m.instanceMatrix.setUsage(T.DynamicDrawUsage)
  const c = new T.Color()
  for (let i = 0; i < count; i++) m.setColorAt(i, c.setRGB(0, 0, 0))
  m.frustumCulled = false
  scene.add(m)
  return m
}

/** 홀로그램 패널 골격(배경 + 프레임 + 그리드). 내용은 runtime 이 붙인다. */
export function buildPanel(T: Three, w: number, h: number, hex: number) {
  const g = new T.Group()
  const mats: { m: THREE.Material & { opacity: number }; base: number }[] = []
  const add = <M extends THREE.Material & { opacity: number }>(m: M, base: number) => {
    m.transparent = true
    m.depthWrite = false
    ;(m as unknown as { fog: boolean }).fog = false
    mats.push({ m, base })
    return m
  }
  const bg = new T.Mesh(
    new T.PlaneGeometry(w, h),
    add(new T.MeshBasicMaterial({ color: hdr(T, hex, 0.35), blending: T.AdditiveBlending, side: T.DoubleSide }), 0.12),
  )
  g.add(bg)
  // 외곽선 + 코너 브래킷.
  const hw = w / 2
  const hh = h / 2
  const b = 0.32
  const frame = [
    [-hw, -hh, hw, -hh],
    [hw, -hh, hw, hh],
    [hw, hh, -hw, hh],
    [-hw, hh, -hw, -hh],
  ]
  const pts: THREE.Vector3[] = []
  for (const [x0, y0, x1, y1] of frame) pts.push(new T.Vector3(x0, y0, 0), new T.Vector3(x1, y1, 0))
  g.add(
    new T.LineSegments(
      new T.BufferGeometry().setFromPoints(pts),
      add(new T.LineBasicMaterial({ color: hdr(T, hex, 0.9), blending: T.AdditiveBlending }), 0.5),
    ),
  )
  const br: THREE.Vector3[] = []
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = sx * (hw + 0.06)
    const y = sy * (hh + 0.06)
    br.push(new T.Vector3(x, y, 0), new T.Vector3(x - sx * b, y, 0))
    br.push(new T.Vector3(x, y, 0), new T.Vector3(x, y - sy * b, 0))
  }
  g.add(
    new T.LineSegments(
      new T.BufferGeometry().setFromPoints(br),
      add(new T.LineBasicMaterial({ color: hdr(T, hex, 2.4), blending: T.AdditiveBlending }), 1),
    ),
  )
  return { group: g, mats, add }
}
