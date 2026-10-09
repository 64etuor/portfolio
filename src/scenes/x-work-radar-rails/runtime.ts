import type * as T3 from 'three'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import { easeInOutCubic, easeOutCubic, loopT, placeLabel, projectToScreen, seg } from '../_host/three/helpers'
import { buildBox, buildEnvironment, buildGate, buildMatrix, buildPads, buildRails, buildSignals, buildToken, hdr, makeSprite, pointsMat, rng } from './build'
import { COLORS, LAYOUT, PERIOD, SOURCES, TL } from './data'

// 타임라인 런타임. update(t) 는 t 만으로 상태를 결정한다(정지 프레임 = 재생 프레임).

const win = (x: number, a: number, b: number, c: number, d: number) => seg(x, a, b) * (1 - seg(x, c, d))
const easeIn = (x: number) => x * x * x

/** HUD 라벨 키 — Scene.tsx 의 data-k 와 1:1. */
const LABEL_KEYS = [
  'matrix',
  'urgent',
  'important',
  'decision',
  'auto',
  'gate',
  'job',
  'ring0',
  'ring1',
  'ring2',
  'killed',
  'proposal',
  'pad0',
  'pad1',
  'pad2',
] as const
type LabelKey = (typeof LABEL_KEYS)[number]

export async function setupWorkRadar(ctx: ThreeContext): Promise<ThreeSetupResult> {
  const { THREE, scene, camera, renderer } = ctx
  const root = ctx.container.closest('[data-wr-root]') as HTMLElement | null
  const q = (k: string) => root?.querySelector<HTMLElement>(`[data-k="${k}"]`) ?? null
  const labels = Object.fromEntries(LABEL_KEYS.map((k) => [k, q(k)])) as Record<LabelKey, HTMLElement | null>
  const hudEls = {
    h1: q('h1'),
    h2: q('h2'),
    line2: q('line2'),
    log: [0, 1, 2, 3].map((i) => q(`log${i}`)),
  }

  scene.fog = new THREE.FogExp2(COLORS.bg, 0.034)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const dir = new THREE.DirectionalLight(0xffffff, 0.8)
  dir.position.set(-3, 8, 6)
  scene.add(dir)

  // 유리 박스 반사용 환경맵(절차적).
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  const sprite = makeSprite(THREE)
  buildEnvironment(THREE, scene, sprite)
  const matrix = buildMatrix(THREE, scene)
  const rails = buildRails(THREE, scene)
  const gate = buildGate(THREE, scene)
  const box = buildBox(THREE, scene)
  const pads = buildPads(THREE, scene)
  const signals = buildSignals(THREE, scene)
  const tokD = buildToken(THREE, scene, sprite, COLORS.phosphor)
  const tokJ = buildToken(THREE, scene, sprite, COLORS.amber)
  const tokX = buildToken(THREE, scene, sprite, COLORS.amber)

  // 박스 내부 작동 글로우
  const coreMat = new THREE.SpriteMaterial({
    map: sprite,
    color: hdr(THREE, COLORS.amber, 0.9),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const core = new THREE.Sprite(coreMat)
  core.position.set(LAYOUT.box.c[0], LAYOUT.box.c[1], LAYOUT.box.c[2])
  scene.add(core)

  // 게이트 승인 플래시
  const flashMat = new THREE.SpriteMaterial({
    map: sprite,
    color: hdr(THREE, COLORS.phosphor, 1),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const flash = new THREE.Sprite(flashMat)
  flash.position.set(LAYOUT.gate[0], LAYOUT.gate[1], LAYOUT.gate[2])
  scene.add(flash)

  // ── 신호 꼬리 Points ──
  const TRAIL = 7
  const nSig = signals.sigs.length
  const trailPos = new Float32Array(nSig * TRAIL * 3)
  const trailCol = new Float32Array(nSig * TRAIL * 3)
  const trailGeo = new THREE.BufferGeometry()
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3))
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3))
  const trails = new THREE.Points(trailGeo, pointsMat(THREE, sprite, 0.16))
  trails.frustumCulled = false
  scene.add(trails)
  const srcCols = SOURCES.map((s) => new THREE.Color(s.color))

  // ── 레일 흐름 점 ──
  type Flow = { curve: T3.Curve<T3.Vector3>; n: number; speed: number; col: T3.Color; kind: 'dec' | 'branch' | 'auto' | 'prop' }
  const flows: Flow[] = [
    { curve: rails.decA, n: 30, speed: 0.11, col: new THREE.Color(COLORS.phosphor), kind: 'dec' },
    { curve: rails.decB, n: 6, speed: 0.3, col: new THREE.Color(COLORS.phosphor), kind: 'dec' },
    ...rails.branches.map((b) => ({ curve: b, n: 12, speed: 0.16, col: new THREE.Color(COLORS.phosphor), kind: 'branch' as const })),
    { curve: rails.auto, n: 30, speed: 0.12, col: new THREE.Color(COLORS.amber), kind: 'auto' },
    { curve: rails.prop, n: 26, speed: 0.1, col: new THREE.Color(COLORS.proposal), kind: 'prop' },
  ]
  const nFlow = flows.reduce((a, f) => a + f.n, 0)
  const flowPos = new Float32Array(nFlow * 3)
  const flowCol = new Float32Array(nFlow * 3)
  const flowGeo = new THREE.BufferGeometry()
  flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3))
  flowGeo.setAttribute('color', new THREE.BufferAttribute(flowCol, 3))
  const flowPts = new THREE.Points(flowGeo, pointsMat(THREE, sprite, 0.2))
  flowPts.frustumCulled = false
  scene.add(flowPts)

  // ── kill 스파크 ──
  const NSPARK = 40
  const sr = rng(33)
  const sparkDir = Array.from({ length: NSPARK }, () =>
    new THREE.Vector3(sr() - 0.5, sr() - 0.3, sr() - 0.5).normalize().multiplyScalar(0.4 + sr() * 0.8),
  )
  const sparkPos = new Float32Array(NSPARK * 3)
  const sparkCol = new Float32Array(NSPARK * 3)
  const sparkGeo = new THREE.BufferGeometry()
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3))
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3))
  const sparks = new THREE.Points(sparkGeo, pointsMat(THREE, sprite, 0.13))
  sparks.frustumCulled = false
  scene.add(sparks)

  // 재사용 임시 객체
  const dummy = new THREE.Object3D()
  const tmpC = new THREE.Color()
  const tA = new THREE.Vector3()
  const tB = new THREE.Vector3()
  const look = new THREE.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  const V = (p: readonly [number, number, number]) => new THREE.Vector3(p[0], p[1], p[2])
  const qD = V(LAYOUT.qD)
  const qJ = V(LAYOUT.qJ)
  const qX = V(LAYOUT.qX)
  const boxC = V(LAYOUT.box.c)
  const gateP = V(LAYOUT.gate)
  const padP = LAYOUT.pads.map((p) => V(p))
  const white = new THREE.Color(COLORS.phosphor)
  const amber = new THREE.Color(COLORS.amber)
  const propCol = new THREE.Color(COLORS.proposal)
  const red = new THREE.Color(COLORS.red)

  const bez = (s: T3.Vector3, c: T3.Vector3, l: T3.Vector3, u: number, out: T3.Vector3) => {
    const a = (1 - u) * (1 - u)
    const b = 2 * (1 - u) * u
    const d = u * u
    return out.set(a * s.x + b * c.x + d * l.x, a * s.y + b * c.y + d * l.y, a * s.z + b * c.z + d * l.z)
  }

  const bead = (i: number, out: T3.Vector3) => out.setFromMatrixPosition(box.rings[i].bead.matrixWorld)

  const setToken = (
    tok: ReturnType<typeof buildToken>,
    pos: T3.Vector3 | null,
    scale: number,
    col: T3.Color,
    k: number,
    dirTo?: T3.Vector3,
  ) => {
    if (!pos || scale <= 0.001) {
      tok.mesh.visible = false
      tok.halo.visible = false
      return
    }
    tok.mesh.visible = tok.halo.visible = true
    tok.mesh.position.copy(pos)
    tok.mesh.scale.setScalar(scale * 1.35)
    if (dirTo && dirTo.distanceToSquared(pos) > 1e-6) {
      look.copy(dirTo)
      look.y = pos.y
      tok.mesh.lookAt(look)
    }
    tok.mat.color.copy(col).multiplyScalar(2.6 * k)
    tok.halo.position.copy(pos)
    tok.halo.scale.setScalar(1.1 * scale)
    tok.haloMat.color.copy(col).multiplyScalar(0.9 * k)
  }

  const label = (key: LabelKey, pos: T3.Vector3, op: number) => {
    const el = labels[key]
    if (!el) return
    projectToScreen(ctx, pos, scr)
    placeLabel(el, scr.x, scr.y, scr.visible ? Math.max(0, Math.min(1, op)) : 0)
  }
  const fade = (el: HTMLElement | null, op: number, dy = 0) => {
    if (!el) return
    el.style.opacity = Math.max(0, Math.min(1, op)).toFixed(3)
    el.style.transform = `translate3d(0, ${dy.toFixed(1)}px, 0)`
  }

  const camBase = new THREE.Vector3(-0.9, 6.6, 13.6)
  const camHero = new THREE.Vector3(-4.2, 4.8, 15.4)
  const tgtBase = new THREE.Vector3(-0.7, 1.0, -0.2)
  const tgtHero = new THREE.Vector3(-3.4, 0.8, -0.4)
  const camPos = new THREE.Vector3()
  const camTgt = new THREE.Vector3()

  // ── 토큰 위치 계산 ──
  /** 결정 토큰(D): 사분면 → 결정 레일 → 게이트 대기 → 승인 통과 → 패드. */
  const posD = (tc: number, pad: number, out: T3.Vector3): { p: T3.Vector3 | null; s: number; aim: T3.Vector3 } => {
    if (tc < TL.dLift || tc > TL.dFade) return { p: null, s: 0, aim: out }
    if (tc < TL.dGo) {
      const s = easeOutCubic(seg(tc, TL.dLift, TL.dGo))
      rails.decA.getPointAt(0, tA)
      out.lerpVectors(qD, tA, s)
      out.y += Math.sin(Math.PI * s) * 0.5
      return { p: out, s: s, aim: tA }
    }
    if (tc < TL.dWait) {
      const s = easeInOutCubic(seg(tc, TL.dGo, TL.dWait))
      if (s < 0.86) rails.decA.getPointAt(s / 0.86, out)
      else rails.decB.getPointAt(((s - 0.86) / 0.14) * LAYOUT.waitU, out)
      return { p: out, s: 1, aim: gateP }
    }
    if (tc < TL.dPass) {
      rails.decB.getPointAt(LAYOUT.waitU, out)
      out.y += Math.sin(tc * 9) * 0.02
      return { p: out, s: 1, aim: gateP }
    }
    if (tc < TL.dArrive) {
      const s = easeInOutCubic(seg(tc, TL.dPass, TL.dArrive))
      if (s < 0.16) rails.decB.getPointAt(LAYOUT.waitU + (s / 0.16) * (1 - LAYOUT.waitU), out)
      else rails.branches[pad].getPointAt((s - 0.16) / 0.84, out)
      return { p: out, s: 1, aim: padP[pad] }
    }
    const s = seg(tc, TL.dArrive, TL.dFade)
    rails.branches[pad].getPointAt(1, tA)
    out.lerpVectors(tA, padP[pad], easeOutCubic(s))
    out.y = padP[pad].y + 0.12 + (1 - s) * 0.05
    return { p: out, s: 1 - s * 0.85, aim: padP[pad] }
  }

  const orbit = (tc: number, r: number, w: number, ph: number, out: T3.Vector3) =>
    out.set(boxC.x + Math.cos(tc * w + ph) * r, boxC.y + Math.sin(tc * w * 2 + ph) * 0.15, boxC.z + Math.sin(tc * w + ph) * r)

  /** 제안이 되는 job(J): 자동화 레일 → 박스 안 실행 → proposal 로 게이트 복귀 → 승인 → 패드. */
  const posJ = (tc: number, pad: number, out: T3.Vector3): { p: T3.Vector3 | null; s: number; aim: T3.Vector3; prop: number } => {
    if (tc < TL.jLift || tc > TL.jFade) return { p: null, s: 0, aim: out, prop: 0 }
    if (tc < TL.jGo) {
      const s = easeOutCubic(seg(tc, TL.jLift, TL.jGo))
      rails.auto.getPointAt(0, tA)
      out.lerpVectors(qJ, tA, s)
      out.y += Math.sin(Math.PI * s) * 0.5
      return { p: out, s, aim: tA, prop: 0 }
    }
    if (tc < TL.jIn) {
      rails.auto.getPointAt(easeInOutCubic(seg(tc, TL.jGo, TL.jIn)), out)
      return { p: out, s: 1, aim: boxC, prop: 0 }
    }
    if (tc < TL.jOut) {
      rails.auto.getPointAt(1, tA)
      orbit(tc, 0.42, 2.1, 0, tB)
      out.lerpVectors(tA, tB, easeInOutCubic(seg(tc, TL.jIn, TL.jIn + 0.45)))
      return { p: out, s: 1, aim: boxC, prop: 0 }
    }
    if (tc < TL.jProp) {
      const s = easeInOutCubic(seg(tc, TL.jOut, TL.jProp))
      orbit(TL.jOut, 0.42, 2.1, 0, tA)
      rails.prop.getPointAt(0, tB)
      out.lerpVectors(tA, tB, s)
      return { p: out, s: 1, aim: tB, prop: s }
    }
    if (tc < TL.jWait) {
      const s = easeInOutCubic(seg(tc, TL.jProp, TL.jWait))
      if (s < 0.88) rails.prop.getPointAt(s / 0.88, out)
      else rails.decB.getPointAt(((s - 0.88) / 0.12) * LAYOUT.waitU, out)
      return { p: out, s: 1, aim: gateP, prop: 1 }
    }
    if (tc < TL.jPass) {
      rails.decB.getPointAt(LAYOUT.waitU, out)
      out.y += Math.sin(tc * 9) * 0.02
      return { p: out, s: 1, aim: gateP, prop: 1 }
    }
    if (tc < TL.jArrive) {
      const s = easeInOutCubic(seg(tc, TL.jPass, TL.jArrive))
      if (s < 0.16) rails.decB.getPointAt(LAYOUT.waitU + (s / 0.16) * (1 - LAYOUT.waitU), out)
      else rails.branches[pad].getPointAt((s - 0.16) / 0.84, out)
      return { p: out, s: 1, aim: padP[pad], prop: 1 }
    }
    const s = seg(tc, TL.jArrive, TL.jFade)
    rails.branches[pad].getPointAt(1, tA)
    out.lerpVectors(tA, padP[pad], easeOutCubic(s))
    out.y = padP[pad].y + 0.12 + (1 - s) * 0.05
    return { p: out, s: 1 - s * 0.85, aim: padP[pad], prop: 1 }
  }

  /** kill 되는 job(X): 박스 안에서 cost cap 링에 닿고 소멸. */
  const posX = (tc: number, out: T3.Vector3): { p: T3.Vector3 | null; s: number; aim: T3.Vector3; dead: number } => {
    if (tc < TL.xLift || tc > TL.xDead) return { p: null, s: 0, aim: out, dead: 0 }
    if (tc < TL.xGo) {
      const s = easeOutCubic(seg(tc, TL.xLift, TL.xGo))
      rails.auto.getPointAt(0, tA)
      out.lerpVectors(qX, tA, s)
      out.y += Math.sin(Math.PI * s) * 0.5
      return { p: out, s, aim: tA, dead: 0 }
    }
    if (tc < TL.xIn) {
      rails.auto.getPointAt(easeInOutCubic(seg(tc, TL.xGo, TL.xIn)), out)
      return { p: out, s: 1, aim: boxC, dead: 0 }
    }
    if (tc < TL.xHit) {
      rails.auto.getPointAt(1, tA)
      orbit(tc, 0.3, -2.6, 2.0, tB)
      out.lerpVectors(tA, tB, easeInOutCubic(seg(tc, TL.xIn, TL.xIn + 0.4)))
      bead(2, tA)
      out.lerp(tA, easeIn(seg(tc, TL.xIn + 0.35, TL.xHit)))
      return { p: out, s: 1, aim: tA, dead: 0 }
    }
    const d = seg(tc, TL.xHit, TL.xDead)
    bead(2, out)
    return { p: out, s: (1 - d) * (1 + 0.6 * Math.sin(d * 40) * (1 - d)), aim: boxC, dead: d }
  }

  const killHit = new THREE.Vector3()
  const hidden = new THREE.Vector3(0, -50, 0)

  const update = (t: number) => {
    const tc = loopT(t, PERIOD)
    const cyc = Math.floor(t / PERIOD)

    // 카메라: 히어로 푸시인 + 느린 앰비언트 드리프트(연속).
    const ch = easeInOutCubic(seg(t, 0, 7.2))
    camPos.lerpVectors(camHero, camBase, ch)
    camPos.x += Math.sin(t * 0.13) * 0.7
    camPos.y += Math.sin(t * 0.09 + 1) * 0.3
    camTgt.lerpVectors(tgtHero, tgtBase, ch)
    camTgt.x += Math.sin(t * 0.13) * 0.35
    camera.position.copy(camPos)
    camera.lookAt(camTgt)
    camera.updateMatrixWorld()

    // 박스 한도 링 회전(행렬 갱신해 비드 월드좌표 사용)
    box.rings.forEach((r, i) => {
      r.inner.rotation.z = t * r.w + i * 2.1
    })
    box.group.updateMatrixWorld(true)

    // ── 신호 ──
    const CYCLE = 7
    const FLY = 0.3
    const SINK = 0.9
    for (let n = 0; n < nSig; n++) {
      const g = signals.sigs[n]
      const u = loopT(t + g.phase * CYCLE, CYCLE) / CYCLE
      let sc = 1
      let br = 0.8
      if (u < FLY) {
        const f = easeInOutCubic(u / FLY)
        bez(g.s, g.c, g.l, f, tA)
        br = 1.8 + (1 - f) * 0.8
        sc = 0.6 + 0.4 * Math.min(1, u / 0.05)
      } else if (u < SINK) {
        tA.copy(g.l)
        const land = seg(u, FLY, FLY + 0.03)
        tA.y += Math.sin(t * 1.7 + g.phase * 20) * 0.03 * land
        br = 0.55 + 1.6 * (1 - seg(u, FLY, FLY + 0.06))
      } else {
        const k = seg(u, SINK, 1)
        tA.copy(g.l)
        tA.y -= k * 0.15
        sc = 1 - k
        br = 0.55 * (1 - k)
      }
      dummy.position.copy(tA)
      dummy.rotation.set(t * g.spin * 0.6 + g.phase * 6, t * g.spin + g.phase * 9, 0)
      dummy.scale.setScalar(Math.max(0.0001, sc))
      dummy.updateMatrix()
      const mesh = signals.meshes[g.src]
      mesh.setMatrixAt(g.idx, dummy.matrix)
      tmpC.copy(srcCols[g.src]).multiplyScalar(br)
      mesh.setColorAt(g.idx, tmpC)
      // 꼬리
      for (let k = 0; k < TRAIL; k++) {
        const o = (n * TRAIL + k) * 3
        const uu = u - (k + 1) * 0.011
        if (u < FLY && uu > 0) {
          bez(g.s, g.c, g.l, easeInOutCubic(uu / FLY), tB)
          trailPos[o] = tB.x
          trailPos[o + 1] = tB.y
          trailPos[o + 2] = tB.z
          const a = (1 - k / TRAIL) * 0.55
          trailCol[o] = srcCols[g.src].r * a
          trailCol[o + 1] = srcCols[g.src].g * a
          trailCol[o + 2] = srcCols[g.src].b * a
        } else {
          trailPos[o] = hidden.x
          trailPos[o + 1] = hidden.y
          trailPos[o + 2] = hidden.z
          trailCol[o] = trailCol[o + 1] = trailCol[o + 2] = 0
        }
      }
    }
    for (const m of signals.meshes) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    trailGeo.attributes.position.needsUpdate = true
    trailGeo.attributes.color.needsUpdate = true

    // 매트릭스 맥동
    const mp = 1 + 0.12 * Math.sin(t * 1.3)
    matrix.edgeMat.color.set(COLORS.teal).multiplyScalar(1.0 * mp)

    // ── 레일 점등 ──
    const decLit = 0.3 + 0.7 * seg(t, 0.9, 1.8)
    const autoLit = 0.3 + 0.7 * seg(t, 1.5, 2.4)
    const propLit = 0.25 + 0.75 * seg(t, 4.9, 5.7)
    rails.mats.dec.color.copy(white).multiplyScalar(1.25 * decLit)
    rails.mats.decGlow.opacity = 0.35 * decLit
    rails.mats.branch.color.copy(white).multiplyScalar(0.55 * decLit)
    rails.mats.auto.color.copy(amber).multiplyScalar(1.25 * autoLit)
    rails.mats.autoGlow.opacity = 0.35 * autoLit
    rails.mats.prop.color.copy(propCol).multiplyScalar(0.75 * propLit)

    let fo = 0
    for (const f of flows) {
      const lit = f.kind === 'auto' ? autoLit : f.kind === 'prop' ? propLit : f.kind === 'branch' ? decLit * 0.6 : decLit
      for (let j = 0; j < f.n; j++) {
        const u = loopT(j / f.n + t * f.speed, 1)
        f.curve.getPointAt(u, tA)
        const o = fo * 3
        flowPos[o] = tA.x
        flowPos[o + 1] = tA.y
        flowPos[o + 2] = tA.z
        const a = lit * (0.55 + 0.45 * Math.sin(u * Math.PI)) * 1.1
        flowCol[o] = f.col.r * a
        flowCol[o + 1] = f.col.g * a
        flowCol[o + 2] = f.col.b * a
        fo++
      }
    }
    flowGeo.attributes.position.needsUpdate = true
    flowGeo.attributes.color.needsUpdate = true

    // ── 게이트 ──
    const g1 = TL.gate1
    const g2 = TL.gate2
    const open = Math.max(win(tc, g1[0], g1[1], g1[2], g1[3]), win(tc, g2[0], g2[1], g2[2], g2[3]))
    const waiting = Math.max(win(tc, TL.dWait - 0.2, TL.dWait, g1[0], g1[1]), win(tc, TL.jWait - 0.2, TL.jWait, g2[0], g2[1]))
    const pulse = waiting * (0.5 + 0.5 * Math.sin(tc * 11))
    const oe = easeInOutCubic(open)
    gate.top.scale.y = Math.max(0.001, 1 - oe)
    gate.bot.scale.y = Math.max(0.001, 1 - oe)
    gate.doorMat.opacity = 0.26 + 0.12 * pulse
    gate.seamMat.opacity = 1 - oe
    gate.ringMat.color.copy(white).multiplyScalar(1.5 + 0.9 * pulse + 3.2 * open)
    gate.haloMat.color.copy(white).multiplyScalar(0.5 + 1.5 * open)
    gate.halo.scale.setScalar(1 + 0.15 * open)
    flashMat.color.copy(white).multiplyScalar(0.6 * open + 0.1 * pulse)
    flash.scale.setScalar(1.1 + 0.9 * open)

    // ── 박스 / 링 ──
    const running = Math.max(win(tc, TL.jIn - 0.1, TL.jIn + 0.3, TL.jOut - 0.1, TL.jOut + 0.3), win(tc, TL.xIn, TL.xIn + 0.3, TL.xHit, TL.xHit + 0.2))
    const killFlash = win(tc, TL.xHit - 0.05, TL.xHit + 0.02, TL.xHit + 0.3, TL.xDead + 0.3)
    coreMat.color.copy(amber).multiplyScalar(0.25 + 0.9 * running + Math.sin(t * 7) * 0.1 * running)
    core.scale.setScalar(1.6 + 0.8 * running)
    box.edgeMat.color.copy(amber).multiplyScalar(1.1 + 0.8 * running)
    box.glassMat.opacity = 0.09 + 0.05 * running
    box.rings.forEach((r, i) => {
      if (i === 2) {
        r.mat.color.copy(amber).lerp(red, killFlash).multiplyScalar(0.85 + 2.6 * killFlash)
        r.beadMat.color.copy(amber).lerp(red, killFlash).multiplyScalar(2.2 + 2 * killFlash)
      } else {
        r.mat.color.copy(amber).multiplyScalar(0.85 + 0.3 * running)
        r.beadMat.color.copy(amber).multiplyScalar(2.2)
      }
    })

    // ── 토큰 ──
    const padD = cyc % 3
    const padJ = (cyc + 1) % 3
    const d = posD(tc, padD, new THREE.Vector3())
    setToken(tokD, d.p, d.s, white, 1, d.aim)
    const j = posJ(tc, padJ, new THREE.Vector3())
    tmpC.copy(amber).lerp(propCol, j.prop)
    setToken(tokJ, j.p, j.s, tmpC, 1, j.aim)
    const x = posX(tc, new THREE.Vector3())
    tmpC.copy(amber).lerp(red, Math.min(1, x.dead * 4))
    setToken(tokX, x.p, x.s, tmpC, 1 + x.dead * 0.6, x.aim)

    // 스파크
    const age = tc - TL.xHit
    bead(2, killHit)
    for (let i = 0; i < NSPARK; i++) {
      const o = i * 3
      if (age > 0 && age < 1.0) {
        const e = easeOutCubic(age / 1.0)
        const dv = sparkDir[i]
        sparkPos[o] = killHit.x + dv.x * e
        sparkPos[o + 1] = killHit.y + dv.y * e - 0.35 * age * age
        sparkPos[o + 2] = killHit.z + dv.z * e
        const a = (1 - age) * 1.6
        sparkCol[o] = red.r * a
        sparkCol[o + 1] = red.g * a + 0.15 * a
        sparkCol[o + 2] = red.b * a
      } else {
        sparkPos[o] = hidden.x
        sparkPos[o + 1] = hidden.y
        sparkPos[o + 2] = hidden.z
        sparkCol[o] = sparkCol[o + 1] = sparkCol[o + 2] = 0
      }
    }
    sparkGeo.attributes.position.needsUpdate = true
    sparkGeo.attributes.color.needsUpdate = true

    // 패드 도착 플래시
    pads.pads.forEach((p, i) => {
      const fl = (i === padD ? win(tc, TL.dArrive - 0.1, TL.dArrive + 0.1, TL.dArrive + 0.3, TL.dFade + 0.4) : 0) +
        (i === padJ ? win(tc, TL.jArrive - 0.1, TL.jArrive + 0.1, TL.jArrive + 0.25, PERIOD) : 0)
      p.edgeMat.color.copy(white).multiplyScalar(0.7 + 2.4 * fl)
    })

    // ── 3D 앵커 라벨 ──
    const { x: mx, size } = LAYOUT.matrix
    const h = size / 2
    label('matrix', tA.set(mx, 0, -h - 0.2), 0.95)
    label('urgent', tA.set(mx - h + 0.2, 0, h + 0.45), 0.7)
    label('important', tA.set(mx - h - 0.35, 0, h - 0.2), 0.7)
    rails.decA.getPointAt(0.58, tB)
    label('decision', tB, seg(t, 1.0, 1.7))
    rails.auto.getPointAt(0.34, tB)
    label('auto', tB, seg(t, 1.7, 2.4))
    label('gate', tA.copy(gateP).add(tB.set(0, 1.25, 0)), 0.75 + 0.25 * Math.max(open, pulse))
    label('job', tA.copy(boxC).add(tB.set(0, -LAYOUT.box.h / 2 - 0.15, LAYOUT.box.d / 2)), 0.25 + 0.75 * seg(t, 2.6, 3.2))
        const killShow = win(tc, TL.xHit, TL.xHit + 0.15, TL.xDead + 0.5, TL.xDead + 1.0)
    const ringOp = 0.2 + 0.8 * seg(t, 2.6, 3.4)
    for (let i = 0; i < 3; i++) {
      bead(i, tA)
      label(`ring${i}` as LabelKey, tA, ringOp * (i === 2 ? 1 - killShow : 0.9))
    }
    label('killed', killHit, killShow)
    if (j.p && j.prop > 0) label('proposal', j.p, win(tc, TL.jProp - 0.1, TL.jProp + 0.2, TL.jPass, TL.jPass + 0.3))
    else label('proposal', hidden, 0)
    for (let i = 0; i < 3; i++) label(`pad${i}` as LabelKey, tA.copy(padP[i]).add(tB.set(0.75, 0.1, 0)), 0.8)

    // ── HUD 헤드라인/로그 ──
    fade(hudEls.h1, 0.55 + 0.45 * seg(t, 0, 0.8))
    const h2 = seg(t, 3.35, 4.0)
    fade(hudEls.h2, h2, (1 - h2) * 8)
    const l2 = seg(t, 5.1, 5.8)
    fade(hudEls.line2, l2, (1 - l2) * 8)
    hudEls.log.forEach((el, i) => {
      const a = TL.log[i]
      fade(el, win(tc, a, a + 0.25, PERIOD - 0.45, PERIOD - 0.05))
    })

  }

  return {
    update,
    dispose() {
      envRT.dispose()
      scene.environment = null
    },
  }
}
