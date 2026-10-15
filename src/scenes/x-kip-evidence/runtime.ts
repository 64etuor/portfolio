import { roomEnvironment } from '../_host/three/env'
import type * as THREE from 'three'
import type { ThreeSetup } from '../_host/three/types'
import { createSoundTimeline, soundAt } from '../_host/sceneSound'
import { countUp, easeInOutCubic, easeOutBack, easeOutCubic, loopT, projectToScreen, seg, setStyle, setText } from '../_host/three/helpers'
import {
  HOT_ROW,
  anchorOf,
  buildBeam,
  buildCard,
  buildCore,
  buildDust,
  buildFloor,
  buildHitRays,
  buildLibrary,
  buildPulses,
  buildSources,
  buildThread,
  hdr,
  loadAddons,
  makeDotTexture,
} from './build'
import { CAM_A, CAM_B, CARD, METRICS, PALETTE, TEXT, TL } from './data'

// 타임라인: t(초)만으로 전체 상태를 결정한다(정지 프레임/프리스테이징 동일).

const bell = (t: number, c: number, w: number) => Math.exp(-(((t - c) / w) ** 2))
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** 지표 카운트업: 지표별 시작 간격 · 롤 길이(초). */
const METRIC_STAGGER = 0.16
const METRIC_ROLL = 0.9
/** 스레드: 소스별 시작 간격 · 그리는 시간(초). */
const THREAD_STAGGER = 0.38
const THREAD_DRAW = 0.95
/** 진입 경로: 경로별 시작 간격 · 끝 당김(초). */
const CONDUIT_STAGGER = 0.14
const CONDUIT_TRIM = 0.15
/** 표 승격: 소스별 시작 간격(초). */
const LIFT_STAGGER = 0.3

type Els = Record<string, HTMLElement>

// HUD 루트는 캔버스 컨테이너의 형제([data-hud]) — ref 를 렌더에서 넘기지 않는다.
export const setupKip: ThreeSetup = async (ctx) => {
  const { THREE: T, scene, camera, bloom } = ctx
  scene.fog = new T.Fog(PALETTE.bg, 14, 46)
  if (bloom) {
    bloom.strength = 0.95
    bloom.radius = 0.6
    bloom.threshold = 0.62
  }

  // 유리 슬래브 반사용 환경맵(절차적, 낮은 강도) + addons
  const [envRT, A] = await Promise.all([roomEnvironment(ctx), loadAddons()])
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.45

  const dot = makeDotTexture(T)
  const lib = buildLibrary(T, scene)
  const sources = buildSources(T, A, scene)
  const core = buildCore(T, scene, dot)
  const beam = buildBeam(T, scene)
  const srcCenters = sources.map((s) => s.group.position.clone())
  const hits = buildHitRays(T, A, scene, beam.a, beam.dir, srcCenters)
  const camEnd = new T.Vector3(...CAM_B.pos)
  const card = buildCard(T, scene, camEnd)
  const anchors = sources.map((s) => anchorOf(T, s))
  const threads = sources.map((s, i) => buildThread(T, scene, card.anchors[i], s, anchors[i]))
  buildDust(T, scene, dot)
  buildFloor(T, scene)

  // pulses: 0 beam head · 1-3 conduits · 4-6 hit rays · 7-9 threads
  const NP = 10
  const pulses = buildPulses(T, scene, dot, NP)

  // 카드 모서리(월드) — DOM 카드 배치용
  const cardCorners = [
    [-CARD.w / 2, CARD.h / 2],
    [CARD.w / 2, CARD.h / 2],
    [CARD.w / 2, -CARD.h / 2],
    [-CARD.w / 2, -CARD.h / 2],
  ].map(([x, y]) => card.group.localToWorld(new T.Vector3(x, y, 0)))

  const tmpM = new T.Matrix4()
  const tmpQ = new T.Quaternion()
  const tmpE = new T.Euler()
  const tmpP = new T.Vector3()
  const tmpS = new T.Vector3()
  const tmpC = new T.Color()
  const look = new T.Vector3()
  const baseCol = new T.Color(0.42, 0.5, 0.54)
  const hitCol = hdr(T, PALETTE.teal, 2.2)
  const proj = { x: 0, y: 0, visible: false }

  let els: Els = {}
  let lastQuery = -1
  const lastMetric: string[] = []
  const getEls = () => {
    const root = ctx.container.parentElement?.querySelector<HTMLElement>('[data-hud]') ?? null
    const first = Object.values(els)[0]
    if (root && (!first || !first.isConnected)) {
      els = {}
      root.querySelectorAll<HTMLElement>('[data-k]').forEach((el) => {
        els[el.dataset.k!] = el
      })
      lastQuery = -1
      lastMetric.length = 0
    }
    return els
  }

  const setPulse = (i: number, p: THREE.Vector3 | null, col: THREE.Color | null, k = 1) => {
    if (!p || !col || k <= 0) {
      pulses.col.setXYZ(i, 0, 0, 0)
      return
    }
    pulses.pos.setXYZ(i, p.x, p.y, p.z)
    pulses.col.setXYZ(i, col.r * k, col.g * k, col.b * k)
  }
  const teal = new T.Color(PALETTE.teal)
  const white = new T.Color('#e8fffa')

  const place = (el: HTMLElement | undefined, world: THREE.Vector3, op: number) => {
    if (!el) return
    projectToScreen(ctx, world, proj)
    if (!proj.visible || op <= 0.001) {
      setStyle(el, 'opacity', '0')
      return
    }
    setStyle(el, 'transform', `translate3d(${proj.x.toFixed(1)}px, ${proj.y.toFixed(1)}px, 0)`)
    setStyle(el, 'opacity', op.toFixed(3))
  }

  // ── 사운드 이벤트(필름에서만 울림) — 화면 비트와 같은 TL 상수에서 발화, x 는 화면 위치(패닝). ──
  const cues = createSoundTimeline(ctx.sound)
  const sproj = { x: 0, y: 0, visible: false }
  const worldX = (p: THREE.Vector3) => clamp01(projectToScreen(ctx, p, sproj).x / Math.max(1, ctx.size.w))
  const elX = (el: Element | undefined) => {
    if (!el) return 0.5
    const r = el.getBoundingClientRect()
    const cr = ctx.container.getBoundingClientRect()
    return clamp01((r.left + r.width / 2 - cr.left) / Math.max(1, cr.width))
  }
  const nConduit = core.conduits.length
  const conduitEnd = TL.conduitB + (nConduit - 1) * CONDUIT_STAGGER - CONDUIT_TRIM
  const beamEnd = beam.a.clone().addScaledVector(beam.dir, beam.len)
  const head = Math.max(0, METRICS.findIndex((m) => m.headline))
  const hm = METRICS[head]
  // 헤드라인 지표가 최종 표기(1.0000)로 반올림되는 순간: easeOutCubic(s) ≥ 1 − ½·10^−digits.
  const headAt = TL.metricA + head * METRIC_STAGGER + (1 - Math.cbrt(0.5 * 10 ** -hm.digits)) * METRIC_ROLL
  // 타이핑: 둘째 글자가 찍히는 순간부터(첫 글자는 컷 직후라 컷 가드에 걸린다) — HUD 의 round(seg·len) 와 같은 식.
  const qLen = TEXT.query.ko.length
  const typeFrom = TL.typeA + (1.5 / qLen) * (TL.typeB - TL.typeA)
  const sounds = (t: number) => {
    if (t >= TL.heroEnd) return
    // 질의 타이핑
    soundAt(cues, t, typeFrom, 'type', () => ({ id: 'kip.query', x: elX(getEls().query), durationS: TL.typeB - typeFrom }))
    // CLI · REST · MCP 경로 → retrieval service
    soundAt(cues, t, TL.conduitA, 'data', () => ({ id: 'kip.conduits', x: worldX(core.conduits[0].curve.getPointAt(0)), toX: worldX(core.group.position), durationS: conduitEnd - TL.conduitA }))
    // 질의 빔이 라이브러리를 훑는다
    soundAt(cues, t, TL.beamA, 'scan', () => ({ id: 'kip.beam', x: worldX(beam.a), toX: worldX(beamEnd), durationS: TL.beamB - TL.beamA }))
    // 표 → 별도 단위로 승격
    sources.forEach((hs, i) => {
      if (hs.src.table) soundAt(cues, t, TL.liftA + i * LIFT_STAGGER, 'node', () => ({ id: `kip.table${hs.src.id}`, x: worldX(srcCenters[i]), intensity: 0.75 }))
    })
    // 답변 카드
    soundAt(cues, t, TL.cardA, 'reveal', () => ({ id: 'kip.card', x: elX(getEls().card), intensity: 0.7 }))
    // 답변 문장 → 원문 위치 스레드 착지
    sources.forEach((hs, i) => soundAt(cues, t, TL.threadA + i * THREAD_STAGGER + THREAD_DRAW, 'link', () => ({ id: `kip.thread${hs.src.id}`, x: worldX(anchors[i]) })))
    // lexical Recall@10 = 1.0000
    soundAt(cues, t, headAt, 'payoff', () => ({ id: 'kip.recall', x: elX(getEls()[`m${head}`]) }))
  }

  const update = (t: number) => {
    const amb = seg(t, TL.heroEnd, TL.heroEnd + 1.5)
    const lt = loopT(t - TL.heroEnd, TL.loop)

    // ── 카메라 ──
    const c = easeInOutCubic(seg(t, 0, TL.heroEnd))
    const sway = amb * Math.sin((t - TL.heroEnd) * 0.16)
    const sway2 = amb * Math.sin((t - TL.heroEnd) * 0.11)
    camera.position.set(
      CAM_A.pos[0] + (CAM_B.pos[0] - CAM_A.pos[0]) * c + sway * 0.7,
      CAM_A.pos[1] + (CAM_B.pos[1] - CAM_A.pos[1]) * c + sway2 * 0.25,
      CAM_A.pos[2] + (CAM_B.pos[2] - CAM_A.pos[2]) * c - sway2 * 0.3,
    )
    look.set(
      CAM_A.look[0] + (CAM_B.look[0] - CAM_A.look[0]) * c + sway * 0.25,
      CAM_A.look[1] + (CAM_B.look[1] - CAM_A.look[1]) * c,
      CAM_A.look[2] + (CAM_B.look[2] - CAM_A.look[2]) * c,
    )
    camera.lookAt(look)
    camera.updateMatrixWorld()
    sounds(t)

    // ── 빔 진행 ──
    const pb = easeOutCubic(seg(t, TL.beamA, TL.beamB))
    const headS = pb * beam.len
    const passFade = 1 - seg(t, TL.beamB, TL.beamB + 1.4) * 0.85
    const waveS = (lt / TL.loop) * beam.len * 1.25 - 2

    // ── 라이브러리 ──
    for (const pg of lib.pages) {
      tmpP.copy(pg.pos)
      tmpP.y += 0.16 * Math.sin(t * 0.33 + pg.phase)
      tmpP.x += 0.08 * Math.sin(t * 0.21 + pg.phase * 1.7)
      tmpE.set(pg.rot.x, pg.rot.y + 0.09 * Math.sin(t * 0.18 + pg.phase), pg.rot.z)
      tmpQ.setFromEuler(tmpE)
      tmpS.setScalar(pg.scale)
      tmpM.compose(tmpP, tmpQ, tmpS)
      pg.mesh.setMatrixAt(pg.idx, tmpM)
      const lat = Math.exp(-((pg.d / 2.8) ** 2))
      const pass = headS >= pg.s && pb > 0 ? Math.exp(-(headS - pg.s) / 5) * passFade : 0
      const wave = amb * 0.75 * Math.exp(-(((pg.s - waveS) / 2.2) ** 2))
      const h = Math.min(1, lat * Math.max(pass, wave))
      const shimmer = 0.92 + 0.08 * Math.sin(t * 0.7 + pg.phase * 3)
      tmpC.copy(baseCol).multiplyScalar(shimmer).lerp(hitCol, h)
      pg.mesh.setColorAt(pg.idx, tmpC)
    }
    for (const m of lib.meshes) {
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
    }

    // ── 서비스 코어 + 진입 경로 ──
    const flare = bell(t, TL.conduitB + 0.05, 0.35) + amb * 0.6 * bell(lt, 1.35, 0.25)
    core.ring.rotation.set(1.15 + 0.1 * Math.sin(t * 0.4), t * 0.5, 0)
    core.ring2.rotation.set(0.5, -t * 0.3, t * 0.2)
    core.shell.rotation.set(t * 0.2, t * 0.35, 0)
    core.ringMat.color.copy(hdr(T, PALETTE.teal, 1.8 + flare * 2.4))
    core.heartMat.color.copy(hdr(T, '#bff8ee', 1.6 + flare * 3))
    core.halo.scale.setScalar(3.0 + flare * 1.8 + 0.15 * Math.sin(t * 1.3))
    core.conduits.forEach((cd, k) => {
      const hp = seg(t, TL.conduitA + k * CONDUIT_STAGGER, TL.conduitB + k * CONDUIT_STAGGER - CONDUIT_TRIM)
      const lp = amb * seg(lt, 0.15 + k * 0.14, 1.25 + k * 0.14)
      const p = hp > 0 && hp < 1 ? hp : lp > 0 && lp < 1 ? lp : -1
      const on = p >= 0 ? 1 : 0
      cd.mat.color.copy(hdr(T, PALETTE.blue, 0.5 + on * 0.9))
      cd.glowMat.uniforms.uOpacity.value = 0.2 + on * 0.3
      setPulse(1 + k, p >= 0 ? cd.curve.getPointAt(easeInOutCubic(p)) : null, white, 1.6 * Math.sin(Math.PI * Math.max(0, p)) + 0.4)
    })

    // ── 빔 ──
    const L = Math.max(0.001, headS)
    beam.beam.visible = beam.glow.visible = pb > 0
    tmpP
      .copy(beam.dir)
      .multiplyScalar(L / 2)
      .add(beam.a)
    beam.beam.position.copy(tmpP)
    beam.glow.position.copy(tmpP)
    beam.beam.scale.set(1, L, 1)
    beam.glow.scale.set(1, L, 1)
    const beamK = pb < 1 ? 1 : 0.45 + 0.25 * amb * bell(lt, 2.0, 1.2)
    beam.coreMat.opacity = Math.min(1, beamK * 1.1)
    beam.glowMat.uniforms.uOpacity.value = 0.32 * beamK + 0.06
    setPulse(0, pb > 0 && pb < 0.995 ? tmpP.copy(beam.dir).multiplyScalar(L).add(beam.a) : null, white, 2.2)

    // ── 히트 레이 ──
    hits.mat.opacity = seg(t, TL.hitA, TL.hitA + 0.25) * (1 - seg(t, TL.hitB + 0.5, TL.hitB + 1.3)) * 0.9
    sources.forEach((_, i) => {
      const p = seg(t, TL.hitA + i * 0.12, TL.hitA + 0.55 + i * 0.12)
      setPulse(4 + i, p > 0 && p < 1 ? tmpP.lerpVectors(hits.from[i], srcCenters[i], easeOutCubic(p)) : null, teal, 2)
    })

    // ── 근거 소스: 히트 → 표 승격 → 스레드 착지 ──
    sources.forEach((hs, i) => {
      const hit = seg(t, TL.hitA + 0.4 + i * 0.12, TL.hitA + 0.9 + i * 0.12)
      const tStart = TL.threadA + i * THREAD_STAGGER
      const tEnd = tStart + THREAD_DRAW
      const arrive = seg(t, tEnd - 0.1, tEnd + 0.2)
      const flash = bell(t, tEnd + 0.05, 0.25) + amb * 0.5 * bell(loopT(t - TL.heroEnd - i * 0.55, TL.loop), 1.75, 0.22)
      hs.face.color.setScalar(0.8 + 0.5 * hit)
      hs.glass.opacity = 0.5 + 0.2 * hit

      const lStart = TL.liftA + i * LIFT_STAGGER
      const pl = easeOutCubic(seg(t, lStart, lStart + 1.0))
      const z = hs.lift * pl
      if (hs.cells && hs.src.table) {
        hs.cellLocal.forEach((cl, j) => {
          const d = 0.035 * (cl.row + cl.col)
          const pc = seg(t, lStart + d, lStart + d + 0.75)
          const zc = hs.lift * easeOutBack(pc)
          tmpP.set(cl.x, cl.y, zc)
          tmpS.set(cl.w * (0.85 + 0.15 * pc), cl.h, 1)
          tmpM.compose(tmpP, tmpQ.identity(), tmpS)
          hs.cells!.setMatrixAt(j, tmpM)
          const scan = amb * 0.5 * bell(loopT(t - TL.heroEnd + cl.row * 0.18, TL.loop), 3.2, 0.3)
          let k = cl.row === 0 ? 1.15 : 0.32 + 0.08 * ((cl.col + cl.row) % 2)
          if (cl.row === HOT_ROW) k += arrive * 1.3 + flash * 1.2
          k = k * pc + scan * pc
          tmpC.set(cl.row === 0 ? PALETTE.amber : hs.src.color).multiplyScalar(k)
          hs.cells!.setColorAt(j, tmpC)
        })
        hs.cells.instanceMatrix.needsUpdate = true
        if (hs.cells.instanceColor) hs.cells.instanceColor.needsUpdate = true
      }

      // 프레임(팻 라인): 리프트 사각형 이동 + 커넥터 늘이기
      const zz = hs.src.table ? z : 0.03
      const zs = 0.012
      hs.frameTop.position.z = zz
      hs.frameLegs.scale.z = Math.max(1e-4, zz - zs)
      hs.frameLegs.visible = zz - zs > 0.02
      hs.frameMat.opacity = hs.src.table ? Math.min(1, pl * 0.75 + flash * 0.4) : Math.min(1, arrive * 0.9 + flash * 0.5)
      hs.fillMat.opacity = hs.src.table ? pl * 0.12 : arrive * 0.55 + flash * 0.4

      // 스레드
      const th = threads[i]
      const pt = easeInOutCubic(seg(t, tStart, tEnd))
      th.tube.visible = th.glow.visible = pt > 0
      const cnt = Math.floor(pt * th.SEG) * th.idxPerSeg
      th.tube.geometry.setDrawRange(0, cnt)
      th.glow.geometry.setDrawRange(0, cnt)
      th.glowMat.uniforms.uOpacity.value = 0.26 + 0.3 * flash
      // 히어로: 그리는 머리 / 루프: 근거 → 답변으로 되돌아오는 펄스
      const loopP = amb * seg(loopT(t - TL.heroEnd - i * 0.55, TL.loop), 0.4, 1.75)
      let pp = -1
      if (pt > 0 && pt < 1) pp = pt
      else if (loopP > 0 && loopP < 1) pp = 1 - loopP
      tmpC.set(hs.src.color)
      setPulse(7 + i, pp >= 0 ? th.curve.getPoint(pp) : null, tmpC, 2.4)
    })
    pulses.pos.needsUpdate = true
    pulses.col.needsUpdate = true

    // ── 답변 카드 ──
    const pc = easeOutCubic(seg(t, TL.cardA, TL.cardB))
    card.glassMat.opacity = 0.9 * pc
    card.borderMat.opacity = pc
    card.divMat.opacity = pc * 0.7
    card.group.visible = pc > 0

    // ── HUD(DOM) ──
    const e = getEls()
    if (!e.query) return
    const full = e.query.dataset.full ?? ''
    const n = Math.round(seg(t, TL.typeA, TL.typeB) * full.length)
    if (n !== lastQuery) {
      setText(e.query, full.slice(0, n))
      lastQuery = n
    }
    if (e.gloss) setStyle(e.gloss, 'opacity', seg(t, TL.typeB, TL.typeB + 0.4).toFixed(3))

    core.conduits.forEach((cd, k) => {
      const on = seg(t, TL.conduitA + k * 0.14 - 0.3, TL.conduitA + k * 0.14)
      place(e[`surf${k}`], cd.curve.getPointAt(k === 2 ? 0.5 : 0.72), 0.55 + 0.45 * on)
    })
    place(
      e.core,
      tmpP.set(...core.group.position.toArray()).add(new T.Vector3(0.75, -1.2, 0)),
      0.55 + 0.45 * seg(t, TL.conduitB - 0.2, TL.conduitB + 0.2),
    )

    const a0 = sources[0]
    place(e.tableTag, a0.group.localToWorld(tmpP.set(a0.rect.x0, a0.rect.y1, a0.lift)), seg(t, TL.liftA + 0.5, TL.liftA + 1.0))
    sources.forEach((hs, i) => {
      const tEnd = TL.threadA + i * THREAD_STAGGER + THREAD_DRAW
      const [u, v] = hs.src.label.uv
      place(e[`loc${i}`], hs.group.localToWorld(tmpP.set((u - 0.5) * hs.w, (0.5 - v) * hs.h, 0.05)), seg(t, tEnd - 0.05, tEnd + 0.35))
    })

    // 카드 DOM: 투영된 모서리 bbox
    if (e.card) {
      let minX = 1e9
      let minY = 1e9
      let maxX = -1e9
      let maxY = -1e9
      for (const cw of cardCorners) {
        projectToScreen(ctx, cw, proj)
        minX = Math.min(minX, proj.x)
        maxX = Math.max(maxX, proj.x)
        minY = Math.min(minY, proj.y)
        maxY = Math.max(maxY, proj.y)
      }
      const st = e.card.style
      st.transform = `translate3d(${minX.toFixed(1)}px, ${minY.toFixed(1)}px, 0)`
      st.width = `${(maxX - minX).toFixed(1)}px`
      st.height = `${(maxY - minY).toFixed(1)}px`
      st.setProperty('--u', `${((maxX - minX) / 100).toFixed(3)}px`)
      st.opacity = pc.toFixed(3)
      for (let i = 0; i < 3; i++) {
        const el = e[`claim${i}`]
        if (el) setStyle(el, 'opacity', seg(t, TL.cardA + 0.45 + i * 0.22, TL.cardA + 0.85 + i * 0.22).toFixed(3))
      }
    }

    const cap = [seg(t, 0.8, 1.2) * (1 - seg(t, 2.9, 3.2)), seg(t, 3.2, 3.5) * (1 - seg(t, 4.7, 5.0)), seg(t, 5.0, 5.4)]
    cap.forEach((o, i) => {
      const el = e[`cap${i}`]
      if (el) {
        setStyle(el, 'opacity', o.toFixed(3))
        setStyle(el, 'transform', `translateY(${((1 - o) * 6).toFixed(1)}px)`)
      }
    })

    if (e.metrics) setStyle(e.metrics, 'opacity', (0.35 + 0.65 * seg(t, TL.metricA - 0.4, TL.metricA + 0.2)).toFixed(3))
    METRICS.forEach((m, i) => {
      const el = e[`m${i}`]
      if (!el) return
      const p = easeOutCubic(seg(t, TL.metricA + i * METRIC_STAGGER, TL.metricA + i * METRIC_STAGGER + METRIC_ROLL))
      const txt = t < TL.metricA + i * METRIC_STAGGER ? '—' : (m.prefix ?? '') + countUp(0, m.value, p, m.digits)
      if (lastMetric[i] !== txt) {
        setText(el, txt)
        lastMetric[i] = txt
      }
    })
  }

  return {
    update: (t) => update(t),
    dispose() {
      envRT.dispose()
      scene.environment = null
    },
  }
}
