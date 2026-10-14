import { roomEnvironment } from '../_host/three/env'
import type * as THREE_NS from 'three'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import { easeInOutCubic, easeOutCubic, loopT, placeLabel, projectToScreen, seg, setStyle, setText } from '../_host/three/helpers'
import { fractHash } from '../_host/random'
import {
  COL,
  SEED_STRIDE,
  SLAB_D,
  SLAB_W,
  STREAM_LUT,
  STREAM_N,
  loadAddons,
  loadFonts,
  makeAtlas,
  paintAtlas,
  makeDb,
  makeDial,
  makeDot,
  makeDust,
  makeSheets,
  makeStreams,
  slabY,
  type StreamSpec,
} from './build'
import { DAY_MIN, N_MAIN, SAVED_MIN, SLABS, T, TILE_SCALE } from './data'
import { REPORT_H, makeReport, type VisualKind } from './report'

export const BG = '#05070a'

/** HUD DOM 은 data-k 로 찾는다(React 가 텍스트를 소유, 런타임은 transform/opacity/카운터만). */
function hudLookup(root: HTMLElement | null) {
  const q = (k: string) => (root?.querySelector(`[data-k="${k}"]`) as HTMLElement | null) ?? null
  return {
    phases: [0, 1, 2, 3].map((i) => q(`phase${i}`)),
    hero: q('hero'),
    count: q('count'),
    arc: root?.querySelector('[data-k="arc"]') as SVGCircleElement | null,
    st: q('st'),
    award: q('award'),
    slabs: SLABS.map((_, i) => q(`slab${i}`)),
    gateway: q('gateway'),
  }
}

const gauss = (x: number, w: number) => Math.exp(-(x * x) / (w * w))

function streamColor(kind: VisualKind) {
  if (kind === 'pareto' || kind === 'kpi2') return COL.amber
  if (kind === 'table' || kind === 'kpi3') return COL.phos
  return kind === 'kpi1' ? COL.teal : COL.blue
}

/** 호길이 균등 LUT 에서 u(0..1) 위치. */
function sampleLut(lut: Float32Array, u: number, out: THREE_NS.Vector3) {
  const x = Math.min(0.9999, Math.max(0, u)) * (STREAM_LUT - 1)
  const i = Math.floor(x)
  const f = x - i
  const o = i * 3
  out.set(lut[o] + (lut[o + 3] - lut[o]) * f, lut[o + 1] + (lut[o + 4] - lut[o + 1]) * f, lut[o + 2] + (lut[o + 5] - lut[o + 2]) * f)
}

export async function setupScene(ctx: ThreeContext, hudRoot: () => HTMLElement | null): Promise<ThreeSetupResult> {
  const { THREE, scene, camera } = ctx
  const [A, envRT] = await Promise.all([loadAddons(), roomEnvironment(ctx), loadFonts()])
  scene.fog = new THREE.Fog(BG, 15, 40)

  // 환경맵(유리 슬랩·금속 랙 반사) + 키/림 — 낮은 세기, 팔레트 청색 림.
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.45
  const key = new THREE.DirectionalLight(0xeef2f4, 1.2)
  key.position.set(-5, 9, 8)
  const rim = new THREE.DirectionalLight(0x4ab3cc, 1.0)
  rim.position.set(6, 3, -9)
  scene.add(key, rim)
  const fat: InstanceType<typeof A.LineMaterial>[] = []

  const dot = makeDot(THREE)
  // Sheet names are baked into the atlas; repaint it when the page language changes.
  const pageEn = () => document.documentElement.lang === 'en'
  let atlasEn = pageEn()
  const atlas = makeAtlas(THREE, atlasEn)
  const sheets = makeSheets(THREE, atlas)
  const db = makeDb(THREE, A, fat, dot)
  const dial = makeDial(THREE, A, fat, dot)
  const dust = makeDust(THREE, dot)
  // 리포트는 슬랩 스택 위, 카메라가 거의 정면으로 읽는 높이. 오른쪽은 −451 HUD.
  const report = makeReport(THREE, A.RoundedBox, new THREE.Color(COL.teal))
  report.group.position.set(-1.35, 4.72, -0.42)
  report.group.scale.setScalar(0.9)
  report.group.updateMatrixWorld(true)
  const streamSpecs: StreamSpec[] = report.visuals.map((v, i) => {
    v.mesh.getWorldPosition(v.center)
    const src = v.def.src[0]
    const side = i % 2 === 0 ? -1 : 1
    const y = slabY(src)
    const z0 = ((i % 5) - 2) * 0.16
    const p0 = new THREE.Vector3(side * (SLAB_W / 2), y + 0.04, z0)
    const p3 = v.center.clone()
    p3.z += 0.05
    const p1 = new THREE.Vector3(p0.x + side * 0.85, y + 0.55, z0 * 0.4)
    const p2 = new THREE.Vector3(p3.x, p3.y - 1.15, p3.z + 0.65)
    return { p0, p1, p2, p3, color: streamColor(v.def.kind) }
  })
  const streams = makeStreams(THREE, A, fat, dot, streamSpecs)
  scene.add(dust, db.group, dial.group, report.group, streams.group, sheets.mesh)

  let hud = hudLookup(hudRoot())

  // temp
  const m4 = new THREE.Matrix4()
  const pos = new THREE.Vector3()
  const scl = new THREE.Vector3()
  const qa = new THREE.Quaternion()
  const qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
  const eul = new THREE.Euler()
  const camPos = new THREE.Vector3()
  const camTgt = new THREE.Vector3()
  const v3 = new THREE.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  const flash = new Float32Array(N_MAIN)
  const glowArr = sheets.glow.array as Float32Array
  const alphaArr = sheets.alpha.array as Float32Array
  const errArr = sheets.err.array as Float32Array
  const landArr = sheets.land.array as Float32Array
  const S = sheets.seed
  const TG = sheets.target

  /** 시트 하나의 혼돈 → 나선 → 착지 변환. p = 비행 진행(0..1). */
  function sheetXf(i: number, t: number, p: number, tx: number, ty: number, tz: number, rotOff: number, out: THREE_NS.Matrix4, trickle = false) {
    const o = i * SEED_STRIDE
    const ph = S[o + 10]
    // 혼돈 위치(부유)
    let cx = S[o] + Math.sin(t * 0.23 + ph) * 0.55
    let cy = S[o + 1] + Math.sin(t * 0.31 + ph * 1.3) * 0.4
    let cz = S[o + 2] + Math.cos(t * 0.19 + ph) * 0.55
    if (trickle) {
      // 앰비언트 트리클: 카메라 반대편 반원(먼 쪽)에서 출발 — 화면 앞을 가리지 않게.
      const a = 3.55 + loopT(rotOff * 0.731, 1) * 1.8
      const r = 6 + fractHash(i, 5) * 3
      cx = Math.cos(a) * r
      cz = Math.sin(a) * r
      cy = 3.2 + fractHash(i, 6) * 2.6 + Math.sin(t * 0.31 + ph) * 0.3
    }
    eul.set(S[o + 3] + t * S[o + 6], S[o + 4] + t * S[o + 7], S[o + 5] + t * S[o + 8])
    qa.setFromEuler(eul)
    const sc0 = trickle ? 0.55 + S[o + 9] * 0.2 : S[o + 9]
    if (p <= 0) {
      pos.set(cx, cy, cz)
      scl.setScalar(sc0)
    } else {
      const e = easeInOutCubic(p)
      // 원통 좌표 나선: 같은 방향으로 회전하며 축으로 모인다
      const r0 = Math.hypot(cx, cz)
      const r1 = Math.hypot(tx, tz)
      const a0 = Math.atan2(cz, cx)
      const a1 = Math.atan2(tz, tx)
      let da = (a1 - a0) % (Math.PI * 2)
      if (da < 0) da += Math.PI * 2
      // 착지 각도가 정확히 a1 이 되도록 2π 단위로만 추가 회전(최소 3/4 바퀴 나선)
      if (trickle) {
        if (da > Math.PI) da -= Math.PI * 2
      } else if (da < Math.PI * 0.75) da += Math.PI * 2
      const ang = a0 + da * easeInOutCubic(Math.min(1, p * 1.08))
      const r = r0 + (r1 - r0) * easeInOutCubic(seg(p, 0.15, 1))
      const y = cy + (ty - cy) * e + Math.sin(p * Math.PI) * 0.5
      pos.set(Math.cos(ang) * r, y, Math.sin(ang) * r)
      const f = easeInOutCubic(seg(p, 0.08, 0.75))
      qa.slerp(qb, f)
      scl.setScalar(sc0 + (TILE_SCALE - sc0) * e)
    }
    out.compose(pos, qa, scl)
  }

  function updateSheets(t: number) {
    const amb = seg(t, T.ambient, T.ambient + 1.6)
    flash.fill(0)
    const P = 7
    // 엑스트라(트리클)
    for (let i = N_MAIN; i < sheets.count; i++) {
      const o = i * SEED_STRIDE
      const j = i - N_MAIN
      let alpha = 0
      let p = 0
      let tx = TG[i * 3]
      let ty = TG[i * 3 + 1]
      let tz = TG[i * 3 + 2]
      let rotOff = 0
      let tt = t
      let trickle = false
      if (t < T.ambient) {
        const d = T.flyStart + S[o + 11]
        p = seg(t, d, d + T.flyDur)
        alpha = 1 - seg(p, 0.82, 1)
      } else {
        const phase = (j * 0.61803) % 1
        const u = t - T.ambient + phase * P
        const local = loopT(u, P)
        const cycle = Math.floor(u / P)
        const k = Math.floor(fractHash(j, cycle + 3) * N_MAIN)
        tx = TG[k * 3]
        ty = TG[k * 3 + 1] + 0.01
        tz = TG[k * 3 + 2]
        rotOff = cycle * 2.4 + j
        tt = local + j
        trickle = true
        p = seg(local, 0.9, 3.3)
        alpha = seg(local, 0, 0.9) * (1 - seg(p, 0.82, 1)) * amb
        if (local > 3.3) alpha = 0
        flash[k] += gauss(local - 3.35, 0.22) * amb
      }
      sheetXf(i, tt, p, tx, ty, tz, rotOff, m4, trickle)
      sheets.mesh.setMatrixAt(i, m4)
      alphaArr[i] = alpha
      glowArr[i] = Math.sin(p * Math.PI) * 0.25
      errArr[i] = 0
      landArr[i] = p
    }
    // 메인
    const sweepW = loopT(t - T.ambient, 6)
    for (let i = 0; i < N_MAIN; i++) {
      const o = i * SEED_STRIDE
      const d = T.flyStart + S[o + 11]
      const land = d + T.flyDur
      const p = seg(t, d, land)
      sheetXf(i, t, p, TG[i * 3], TG[i * 3 + 1], TG[i * 3 + 2], 0, m4)
      sheets.mesh.setMatrixAt(i, m4)
      const s = sheets.slab[i]
      const r = sheets.row[i]
      const c = sheets.col[i]
      const v = T.validate + s * 0.13 + r * 0.07 + c * 0.012
      let g = Math.sin(p * Math.PI) * 0.22
      if (t >= land - 0.05) g += gauss(t - land, 0.12) * 0.6
      g += gauss(t - v, 0.1) * 0.65
      if (t > v) g += 0.07 * seg(t, v, v + 0.3)
      // 앰비언트 검증 스윕
      g += gauss(sweepW - (1.0 + s * 0.12 + r * 0.06), 0.12) * 0.4 * amb
      g += flash[i] * 0.9
      glowArr[i] = g
      alphaArr[i] = 1
      landArr[i] = p
      errArr[i] = sheets.bad[i] ? seg(t, land - 0.3, land) * (1 - seg(t, v + 0.1, v + 0.45)) : 0
    }
    sheets.mesh.instanceMatrix.needsUpdate = true
    sheets.glow.needsUpdate = true
    sheets.alpha.needsUpdate = true
    sheets.err.needsUpdate = true
    sheets.land.needsUpdate = true
  }

  function updateDb(t: number) {
    const appear = seg(t, 1.4, 3.2)
    db.slabMat.opacity = 0.04 + 0.5 * appear
    db.metalMat.opacity = appear
    db.metalMat.visible = appear > 0.001
    db.edgeMat.opacity = 0.05 + 0.55 * appear
    db.pool.mat.opacity = 0.03 + 0.06 * appear
    db.keyMat.opacity = seg(t, T.validate, T.validate + 0.8) * 0.9
    const rel = seg(t, 4.4, 5.3)
    db.relMat.opacity = rel * 0.6
    db.pulseMat.opacity = rel
    const pa = db.pulses.geometry.getAttribute('position') as THREE_NS.BufferAttribute
    db.curves.forEach((cv, i) => {
      for (let k = 0; k < 2; k++) {
        const u = loopT(t * 0.32 + i * 0.137 + k * 0.5, 1)
        cv.getPoint(u, v3)
        pa.setXYZ(i * 2 + k, v3.x, v3.y, v3.z)
      }
    })
    pa.needsUpdate = true
  }

  const GROUP_AT = [0, 0.22, 0.44] // 사운드 pop 5.00 / 5.22 / 5.44
  const progress = new Array<number>(report.visuals.length).fill(0)

  function updateReport(t: number) {
    const pageIn = seg(t, T.dash - 0.08, T.dash + 0.42)
    report.page.mat.uniforms.uOpacity.value = pageIn
    report.page.mat.uniforms.uReveal.value = 1
    report.bezelMat.opacity = pageIn * 0.92
    report.bezel.visible = pageIn > 0.01
    for (let i = 0; i < report.visuals.length; i++) {
      const g = report.visuals[i].def.group
      const t0 = T.dash + GROUP_AT[g]
      progress[i] = easeOutCubic(seg(t, t0, t0 + 1.2))
    }
    // 게이트웨이 갱신: 차트 숫자는 그대로 두고 스탬프와 가장자리만 깜빡인다.
    let refreshN = 0
    let refreshFlash = 0
    if (t > T.ambient) {
      const cyc = (t - T.ambient) / 5.5
      const n = Math.floor(cyc)
      const f = cyc - n
      refreshN = f < 0.09 ? -1 : n
      refreshFlash = gauss(f - 0.05, 0.045)
    }
    report.paint(progress, pageEn(), refreshN)
    for (let i = 0; i < report.visuals.length; i++) {
      const v = report.visuals[i]
      const t0 = T.dash + GROUP_AT[v.def.group]
      const fade = seg(t, t0, t0 + 0.22)
      v.mat.uniforms.uOpacity.value = fade * pageIn
      v.mat.uniforms.uReveal.value = progress[i]
      const arrive = progress[i] > 0.72 && progress[i] < 1 ? gauss(progress[i] - 0.9, 0.055) : 0
      v.mat.uniforms.uFlash.value = Math.max(arrive, refreshFlash * fade)
    }
    // 슬랩 → 비주얼. 그려지는 동안 한 번씩 흘러가고, 이후엔 옅은 갱신 트리클.
    const amb = seg(t, T.ambient, T.ambient + 0.8)
    for (let s = 0; s < streams.lut.length; s++) {
      const p = progress[s]
      const drawing = p > 0.002 && p < 0.998
      streams.lineMats[s].opacity = (drawing ? 0.22 + 0.35 * Math.sin(p * Math.PI) : 0) + amb * 0.14
      let head = 0
      for (let k = 0; k < STREAM_N; k++) {
        const idx = s * STREAM_N + k
        let u = 0
        let a = 0
        if (drawing) {
          const start = (k / STREAM_N) * 0.62
          u = seg(p, start, Math.min(0.98, start + 0.4))
          a = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0
        } else if (amb > 0) {
          u = loopT(t * 0.18 + k / STREAM_N + s * 0.09, 1)
          a = 0.28 * Math.sin(u * Math.PI) * amb
        }
        sampleLut(streams.lut[s], u, v3)
        streams.pos.setXYZ(idx, v3.x, v3.y, v3.z)
        const c = streams.base[s]
        const boost = 1.4 * a
        streams.col.setXYZ(idx, c.r * boost, c.g * boost, c.b * boost)
        if (u > 0.86) head = Math.max(head, a * (u - 0.86) / 0.14)
      }
      const hc = streams.base[s]
      const hb = Math.max(head, refreshFlash * 0.5) * 2.2
      streams.headCol.setXYZ(s, hc.r * hb, hc.g * hb, hc.b * hb)
    }
    streams.pos.needsUpdate = true
    streams.col.needsUpdate = true
    streams.headCol.needsUpdate = true
  }

  function updateDial(t: number) {
    const a = seg(t, T.dial - 0.35, T.dial + 0.4)
    dial.baseMat.opacity = a * 0.9
    dial.tickMat.opacity = a * 0.8
    dial.tickMajorMat.opacity = a * 0.9
    const f = easeOutCubic(seg(t, T.dial, T.dialEnd)) * (SAVED_MIN / DAY_MIN)
    dial.sweepMat.opacity = a
    dial.sweep.geometry.setDrawRange(0, 6 * Math.floor(f * dial.sweepSeg))
    const ang = -Math.PI / 2 + f * Math.PI * 2
    const hp = dial.head.geometry.getAttribute('position') as THREE_NS.BufferAttribute
    hp.setXYZ(0, Math.cos(ang) * (dial.radius - 0.03), 0.02, Math.sin(ang) * (dial.radius - 0.03))
    hp.needsUpdate = true
    dial.headMat.opacity = a * (0.85 + 0.15 * Math.sin(t * 3))
    dial.group.rotation.y = 0
  }

  function updateCamera(t: number) {
    // A: 혼돈을 천천히 밀고 들어감 → B: 나선 흐름 근접 → C: 전체(대시보드+DB+다이얼) 프레이밍
    const ax = -1.4 + t * 0.35
    const ay = 2.1
    const az = 19 - t * 0.45
    const b = easeInOutCubic(seg(t, 2.0, 4.6))
    const c = easeInOutCubic(seg(t, 4.7, 7.3))
    camPos.set(ax + (6.2 - ax) * b, ay + (3.0 - ay) * b, az + (11.6 - az) * b)
    camTgt.set(0, 0.4 - 0.4 * b, 0)
    // 대시보드가 읽히도록 거의 정면. 시선은 리포트 왼쪽 — 오른쪽 여백은 −451.
    camPos.lerp(v3.set(-0.15, 5.15, 12.4), c)
    camTgt.lerp(v3.set(-0.55, 3.35, -0.2), c)
    // 앰비언트 궤도
    const orb = seg(t, 7.3, 9.5)
    const ang = 0.16 * Math.sin((t - 7.3) * 0.11) * orb
    const ca = Math.cos(ang)
    const sa = Math.sin(ang)
    const x = camPos.x * ca - camPos.z * sa
    const z = camPos.x * sa + camPos.z * ca
    camPos.set(x, camPos.y + 0.35 * Math.sin((t - 7.3) * 0.17) * orb, z)
    // 세로 화면 보정: 좁은 화면이면 뒤로
    const aspect = ctx.size.w / Math.max(1, ctx.size.h)
    const k = Math.pow(Math.max(1, 1.6 / aspect), 0.85)
    if (k > 1) {
      camPos.sub(camTgt).multiplyScalar(k).add(camTgt)
      camTgt.x *= 1 / k
    }
    camera.position.copy(camPos)
    camera.lookAt(camTgt)
    camera.updateMatrixWorld()
  }

  function updateHud(t: number) {
    if (!hud.hero || !hud.hero.isConnected) hud = hudLookup(hudRoot())
    const at = T.phaseAt
    for (let k = 0; k < 4; k++) {
      const inn = k === 0 ? 1 : seg(t, at[k], at[k] + 0.4)
      const out = k === 3 ? 1 : 1 - seg(t, at[k + 1] - 0.1, at[k + 1] + 0.2)
      const el = hud.phases[k]
      if (el) {
        const o = inn * out
        setStyle(el, 'opacity', o.toFixed(3))
        setStyle(el, 'transform', `translate3d(0, ${((1 - inn) * 10).toFixed(1)}px, 0)`)
      }
    }
    const hOp = seg(t, T.dial - 0.2, T.dial + 0.4)
    if (hud.hero) setStyle(hud.hero, 'opacity', hOp.toFixed(3))
    const f = easeOutCubic(seg(t, T.dial, T.dialEnd))
    if (hud.count) setText(hud.count, String(Math.round(SAVED_MIN * f)))
    if (hud.arc) setStyle(hud.arc, 'strokeDashoffset', (1 - f * (SAVED_MIN / DAY_MIN)).toFixed(4))
    if (hud.st) setStyle(hud.st, 'opacity', seg(t, 6.5, 7.0).toFixed(3))
    if (hud.award) setStyle(hud.award, 'opacity', seg(t, 7.0, 7.5).toFixed(3))

    for (let s = 0; s < SLABS.length; s++) {
      v3.set(-SLAB_W / 2 - 0.15, slabY(s), SLAB_D / 2)
      projectToScreen(ctx, v3, scr)
      const o = seg(t, 2.9 + s * 0.1, 3.5 + s * 0.1) * (scr.visible ? 1 : 0) * (1 - 0.45 * seg(t, T.dash, T.dash + 0.8))
      placeLabel(hud.slabs[s], scr.x, scr.y, o)
    }
    v3.set(SLAB_W / 2 + 0.35, (slabY(SLABS.length - 1) + report.group.position.y - (REPORT_H * report.group.scale.y) / 2) / 2, 0.2)
    projectToScreen(ctx, v3, scr)
    placeLabel(hud.gateway, scr.x, scr.y, seg(t, T.dash + 0.15, T.dash + 0.7) * (1 - 0.55 * seg(t, T.dial, T.dial + 0.6)))
  }

  return {
    resize(w, h) {
      for (const m of fat) m.resolution.set(w, h)
    },
    dispose() {
      envRT.dispose()
      scene.environment = null
    },
    update(t) {
      if (pageEn() !== atlasEn) {
        atlasEn = pageEn()
        paintAtlas(atlas.image as HTMLCanvasElement, atlasEn)
        atlas.needsUpdate = true
      }
      updateCamera(t)
      updateSheets(t)
      updateDb(t)
      updateReport(t)
      updateDial(t)
      dust.rotation.y = t * 0.01
      updateHud(t)
    },
  }
}
