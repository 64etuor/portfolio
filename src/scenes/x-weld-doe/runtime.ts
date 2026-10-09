import { roomEnvironment } from '../_host/three/env'
import type * as THREE_NS from 'three'
import type { ThreeContext, ThreeSetupResult } from '../_host/three/types'
import { easeInOutCubic, easeOutBack, easeOutCubic, loopT, placeLabel, projectToScreen, seg, setData, setStyle, setText } from '../_host/three/helpers'
import {
  buildDust,
  buildFrame,
  buildHorn,
  buildPath,
  buildRuns,
  buildSurface,
  haloTexture,
  loadAddons,
  runColor,
  segBuffer,
  shadowTexture,
  runMeasured,
  TEAL,
} from './build'
import { COPY, TL } from './data'
import { FLOOR_Y, HS, RUNS, SPAN, START, center, defect, descentPath, surfaceY, type SurfState } from './model'

type Hud = {
  counter: HTMLElement | null
  phases: HTMLElement[]
  knob: HTMLElement | null
  title: HTMLElement | null
  counterBox: HTMLElement | null
  cost: HTMLElement | null
  legend: HTMLElement | null
  lblA: HTMLElement | null
  lblP: HTMLElement | null
  lblD: HTMLElement | null
  lblStart: HTMLElement | null
  lblOpt: HTMLElement | null
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** HUD 는 캔버스 컨테이너의 형제(data-hud="root"); 로케일은 그 data-locale 에서 읽는다. */
export async function setupWeldDoe(ctx: ThreeContext): Promise<ThreeSetupResult> {
  const { THREE, scene, camera } = ctx

  // 금속 반사용 환경맵(절차적)
  const envRT = await roomEnvironment(ctx)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.32

  if (ctx.bloom) {
    ctx.bloom.strength = 0.7
    ctx.bloom.radius = 0.55
    ctx.bloom.threshold = 0.42
  }

  const A = await loadAddons()
  const halo = haloTexture(THREE)
  const { surface, floor, uniforms } = buildSurface(THREE)
  scene.add(floor, surface)
  const frame = buildFrame(THREE, A)
  scene.add(frame)

  const runs = buildRuns(THREE, A, halo)
  scene.add(runs.sphere, runs.stems, runs.halos)

  const path2 = descentPath(160)
  const pathPts = path2.map(([a, p]) => new THREE.Vector3(a * SPAN, defect(a, p, 0) * HS + 0.045, p * SPAN))
  const path = buildPath(THREE, A, pathPts)
  scene.add(path.tube, path.marker, path.ring, path.drop)

  const horn = buildHorn(THREE, A)
  horn.group.position.set(START.a * SPAN, 0, START.p * SPAN)
  horn.group.rotation.y = 0.5
  horn.group.scale.setScalar(0.72)
  scene.add(horn.group)
  // 케이스 접지 그림자(혼과 함께 페이드)
  const caseShadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(THREE), transparent: true, depthWrite: false, color: 0x000000 })
  const caseShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.3), caseShadowMat)
  caseShadow.rotation.x = -Math.PI / 2
  caseShadow.position.y = 0.012
  caseShadow.renderOrder = 1
  horn.caseGroup.add(caseShadow)

  const dust = buildDust(THREE, halo)
  scene.add(dust.pts)

  const hemi = new THREE.HemisphereLight(0x9fc4d0, 0x0a0806, 0.6)
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(4, 8, 5)
  // 콜드 림 — 혼 실루엣 분리(곡면은 자체 셰이딩이라 영향 없음)
  const rim = new THREE.DirectionalLight(0x8fd8ff, 0.55)
  rim.position.set(-5, 3, -6)
  scene.add(hemi, key, rim)

  // HUD 노드 캐시(지연)
  let hud: Hud | null = null
  let hudRoot: HTMLElement | null = null
  const q = (root: HTMLElement, k: string) => root.querySelector<HTMLElement>(`[data-hud="${k}"]`)
  const getHud = (): Hud | null => {
    if (hud) return hud
    const root = ctx.container.parentElement?.querySelector<HTMLElement>('[data-hud="root"]')
    if (!root) return null
    hudRoot = root
    hud = {
      counter: q(root, 'counter'),
      phases: Array.from(root.querySelectorAll<HTMLElement>('[data-phase]')),
      knob: q(root, 'knob'),
      title: q(root, 'title'),
      counterBox: q(root, 'counterBox'),
      cost: q(root, 'cost'),
      legend: q(root, 'legend'),
      lblA: q(root, 'lblA'),
      lblP: q(root, 'lblP'),
      lblD: q(root, 'lblD'),
      lblStart: q(root, 'lblStart'),
      lblOpt: q(root, 'lblOpt'),
    }
    return hud
  }

  const st: SurfState = { w: 0, fit: 0, ripT: 0, ripA: 1 }
  const v3 = new THREE.Vector3()
  const col = new THREE.Color()
  const m4 = new THREE.Matrix4()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  const target = new THREE.Vector3()
  const scr = { x: 0, y: 0, visible: false }
  let lastCounter = ''
  let lastPhase = -1

  const T0 = new THREE.Vector3(-1.7, 1.0, 1.7)
  const T1 = new THREE.Vector3(0.35, 0.55, 0.2)

  const label = (el: HTMLElement | null, p: THREE_NS.Vector3, o: number) => {
    if (!el) return
    projectToScreen(ctx, p, scr)
    placeLabel(el, scr.x, scr.y, scr.visible ? o : 0)
  }

  function update(t: number) {
    const amb = Math.max(0, t - TL.ambient)
    const L = loopT(amb, TL.loop) / TL.loop // 0..1

    // ── 곡면 상태 ──
    st.fit = easeInOutCubic(seg(t, TL.fit[0], TL.fit[1]))
    st.ripT = t + 0.7
    st.ripA = 1 - seg(t, TL.ripFade[0], TL.ripFade[1])
    // 세 번째 인자(용착 시간): 앰비언트에서 low↔high 를 천천히 스윕
    st.w = amb > 0 ? 0.9 * Math.sin(L * Math.PI * 2) * Math.min(1, amb / 2) : 0
    const opt = easeOutCubic(seg(t, TL.opt[0], TL.opt[1]))
    uniforms.uFit.value = st.fit
    uniforms.uRipT.value = st.ripT
    uniforms.uRipA.value = st.ripA
    uniforms.uW.value = st.w
    uniforms.uOpt.value = opt
    uniforms.uRef.value = seg(t, 3.6, 4.4) * (1 - 0.6 * seg(t, 7, 8.5))

    // ── 혼 + 케이스 ──
    const lift = easeInOutCubic(seg(t, TL.hornLift[0], TL.hornLift[1]))
    const hornA = 1 - lift
    horn.group.visible = hornA > 0.01
    const vib = (1 - lift) * 0.012 * Math.sin(t * 95)
    horn.horn.position.y = 0.305 + vib + lift * 2.2
    horn.tip.position.y = horn.horn.position.y + 0.01
    horn.tip.scale.setScalar(1 + 0.15 * Math.sin(t * 40) * (1 - lift))
    for (const m of horn.mats) m.opacity = hornA
    ;(horn.tip.material as THREE_NS.MeshBasicMaterial).opacity = hornA
    caseShadowMat.opacity = hornA
    const seamPulse = 0.6 + 0.4 * Math.sin(t * 9)
    ;(horn.seam.material as THREE_NS.MeshBasicMaterial).opacity = hornA * seamPulse
    horn.caseGroup.position.y = -0.2 * lift

    // ── DOE 런 ──
    const sPos = runs.halos.geometry.getAttribute('position') as THREE_NS.BufferAttribute
    const sCol = runs.halos.geometry.getAttribute('color') as THREE_NS.BufferAttribute
    const stP = segBuffer(runs.stems.geometry, 'instanceStart')
    const stC = segBuffer(runs.stems.geometry, 'instanceColorStart')
    const sp = stP.array as Float32Array
    const sc = stC.array as Float32Array
    const runSpan = TL.runs[1] - TL.runs[0] - 0.45
    RUNS.forEach((r, i) => {
      const t0 = TL.runs[0] + (i / (RUNS.length - 1)) * runSpan
      const k = seg(t, t0, t0 + 0.45)
      const pop = k > 0 ? Math.max(0, easeOutBack(k)) : 0
      const x = r.a * SPAN
      const z = r.p * SPAN
      const y = runMeasured(r) * HS + (1 - easeOutCubic(k)) * 1.2
      // 현재 시간축 w 와 가까운 런일수록 밝게 (앰비언트에서 슬라이스 표현)
      const near = 1 - Math.min(1, Math.abs(r.w - st.w) / 1.6)
      const bright = amb > 0 ? 0.35 + 0.65 * near : 1
      scl.setScalar(Math.max(0.0001, pop * (0.75 + 0.35 * bright)))
      m4.compose(v3.set(x, y, z), quat, scl)
      runs.sphere.setMatrixAt(i, m4)
      sPos.setXYZ(i, x, y, z)
      col.set(runColor(r)).multiplyScalar(0.4 * pop * bright)
      sCol.setXYZ(i, col.r, col.g, col.b)
      const ys = surfaceY(r.a, r.p, st)
      const o = i * 6
      sp[o] = x
      sp[o + 1] = y
      sp[o + 2] = z
      sp[o + 3] = x
      sp[o + 4] = Math.min(ys, y)
      sp[o + 5] = z
      col.set(runColor(r)).multiplyScalar(0.9 * Math.min(1, pop) * bright)
      sc[o] = col.r
      sc[o + 1] = col.g
      sc[o + 2] = col.b
      col.multiplyScalar(0.15)
      sc[o + 3] = col.r
      sc[o + 4] = col.g
      sc[o + 5] = col.b
    })
    runs.sphere.instanceMatrix.needsUpdate = true

    // ── 경사 하강 마커 ──
    const dk = easeInOutCubic(seg(t, TL.descent[0], TL.descent[1]))
    const showM = seg(t, TL.descent[0] - 0.5, TL.descent[0])
    let ma: number, mp: number
    if (amb > 0) {
      const [ca, cp] = center(st.w)
      ma = ca
      mp = cp
    } else {
      const fi = dk * (path2.length - 1)
      const i0 = Math.floor(fi)
      const i1 = Math.min(path2.length - 1, i0 + 1)
      const f = fi - i0
      ma = lerp(path2[i0][0], path2[i1][0], f)
      mp = lerp(path2[i0][1], path2[i1][1], f)
    }
    const md = defect(ma, mp, st.w)
    const my = surfaceY(ma, mp, st) + 0.1
    path.marker.position.set(ma * SPAN, my, mp * SPAN)
    path.marker.scale.setScalar(showM * (1 + 0.12 * Math.sin(t * 5)))
    path.marker.visible = showM > 0
    path.ring.position.set(ma * SPAN, my - 0.05, mp * SPAN)
    const ringK = opt > 0 ? (t * 0.8) % 1 : 0
    path.ring.scale.setScalar(1 + ringK * 5)
    ;(path.ring.material as THREE_NS.MeshBasicMaterial).opacity = opt * (1 - ringK) * 0.9
    const dpb = segBuffer(path.drop.geometry, 'instanceStart')
    const dp = dpb.array as Float32Array
    dp[0] = ma * SPAN
    dp[1] = my
    dp[2] = mp * SPAN
    dp[3] = ma * SPAN
    dp[4] = FLOOR_Y
    dp[5] = mp * SPAN
    dpb.needsUpdate = true
    path.drop.material.opacity = showM * 0.7
    const segsShown = Math.floor(dk * path.segs)
    path.tube.geometry.setDrawRange(0, segsShown * path.radial * 6)
    ;(path.tube.material as THREE_NS.MeshBasicMaterial).opacity = 1 - seg(t, TL.ambient, TL.ambient + 2.5)
    path.tube.visible = segsShown > 0 && t < TL.ambient + 2.5
    sPos.setXYZ(RUNS.length, ma * SPAN, my, mp * SPAN)
    col.set(TEAL).multiplyScalar(2.2 * showM)
    sCol.setXYZ(RUNS.length, col.r, col.g, col.b)
    sPos.needsUpdate = true
    sCol.needsUpdate = true
    stP.needsUpdate = true
    stC.needsUpdate = true

    // ── 입자 ──
    const dpos = dust.pts.geometry.getAttribute('position') as THREE_NS.BufferAttribute
    for (let i = 0; i < dust.n; i++) {
      const y = dust.base[i * 3 + 1] + dust.vel[i * 3 + 1] * t
      dpos.setXYZ(
        i,
        dust.base[i * 3] + dust.vel[i * 3] * t + 0.15 * Math.sin(t * 0.3 + i),
        -0.6 + ((((y + 0.6) % 5.6) + 5.6) % 5.6),
        dust.base[i * 3 + 2] + dust.vel[i * 3 + 2] * t,
      )
    }
    dpos.needsUpdate = true

    // ── 카메라 ──
    const ck = easeInOutCubic(seg(t, 1.0, 4.6))
    target.lerpVectors(T0, T1, ck)
    let r = lerp(8.4, 13.2, ck)
    let az = lerp(0.3, 0.62, ck) + 0.12 * seg(t, 4.6, TL.ambient)
    let el = lerp(0.36, 0.5, ck)
    if (amb > 0) {
      const ph = L * Math.PI * 2
      const ramp = Math.min(1, amb / 3)
      az += 0.32 * Math.sin(ph) * ramp
      el += 0.05 * Math.sin(ph * 2) * ramp
      r += 0.5 * Math.sin(ph) * ramp
    }
    camera.position.set(
      target.x + r * Math.cos(el) * Math.sin(az),
      target.y + r * Math.sin(el),
      target.z + r * Math.cos(el) * Math.cos(az),
    )
    camera.lookAt(target)
    camera.updateMatrixWorld()

    // ── HUD ──
    const h = getHud()
    if (!h) return
    const loc = hudRoot?.dataset.locale === 'en' ? 'en' : 'ko'
    const c = COPY[loc]
    const done = md < 1 && dk > 0.98
    const txt = t < TL.descent[0] ? '15.0%' : done ? c.final : `${Math.max(md, 1).toFixed(1)}%`
    const state = t < TL.descent[0] ? 'hot' : done ? 'cool' : 'mid'
    const ckey = `${loc}|${txt}|${state}`
    if (ckey !== lastCounter && h.counter) {
      lastCounter = ckey
      setText(h.counter, txt)
      setData(h.counter, 'state', state)
    }
    if (h.cost) {
      const ck2 = easeOutCubic(seg(t, TL.cost[0], TL.cost[1]))
      setStyle(h.cost, 'opacity', ck2.toFixed(3))
      setStyle(h.cost, 'transform', `translate3d(0, ${((1 - ck2) * 14).toFixed(1)}px, 0)`)
    }
    if (h.legend) setStyle(h.legend, 'opacity', seg(t, TL.runs[0], TL.runs[0] + 0.6).toFixed(3))
    const phase = t < TL.runs[0] ? 0 : t < TL.fit[0] ? 1 : t < TL.descent[0] ? 2 : 3
    if (phase !== lastPhase) {
      lastPhase = phase
      h.phases.forEach((el, i) => (setData(el, 'on', i === phase ? '1' : i < phase ? 'done' : '0')))
    }
    if (h.knob) setStyle(h.knob, 'left', `${(50 + st.w * 50).toFixed(2)}%`)

    const axisO = seg(t, 1.6, 3.0)
    label(h.lblA, v3.set(0, FLOOR_Y, SPAN + 0.55), axisO)
    label(h.lblP, v3.set(SPAN + 0.6, FLOOR_Y, 0), axisO)
    label(h.lblD, v3.set(SPAN, 25 * HS + 0.25, -SPAN), axisO)
    const sy = surfaceY(START.a, START.p, st)
    label(
      h.lblStart,
      v3.set(START.a * SPAN, Math.max(sy, 0.4) + 0.35, START.p * SPAN),
      seg(t, 3.4, 4.2) * (1 - seg(t, 6.8, 7.6)),
    )
    label(h.lblOpt, v3.set(ma * SPAN, my + 0.35, mp * SPAN), opt)
  }

  return {
    update,
    dispose() {
      envRT.dispose()
      halo.dispose()
    },
  }
}
