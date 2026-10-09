import type * as THREE_NS from 'three'
import { easeInOutCubic, easeOutCubic, loopT, placeLabel, projectToScreen, seg } from '../_host/three/helpers'
import type { ThreeContext, ThreeSetup } from '../_host/three/types'
import { canvasFont, ensureSceneFonts } from '../_host/fonts'
import { C, studioScene, buildFloor, buildMachine, buildScanner, buildTray, loadAddons, machineX, materials, shadowTexture } from './build'
import { CELL_TOP, COLS, HUD_LINES, MACHINES, OK_CELLS, REV_COL, REV_ROW, ROWS, T, TRAY_TOP, cellX, cellZ } from './data'

// 타임라인:
//  0.0–2.8  매크로 클로즈업. 구조광 스캔이 셀 열을 훑고 정상 셀에 teal 브래킷 + "+" 글리프.
//  2.8–4.0  스캔이 역삽 셀에서 정지(LOCK). 레드 브래킷 · "−" 글리프 · 역삽 검출 라벨, 타워 적색.
//  4.0–6.4  스캔 재개 · 역삽 셀이 들려 배출(리프트 아웃).
//  4.9–7.0  풀백 → 유휴 비전 M/C 4대와 역할 라벨.
//  7.6~     앰비언트 루프: 와이드 샷 느린 궤도 + M/C 3 반복 스캔(주기 3.6s, 이음매 없음).

const qs = <E extends Element>(root: ParentNode, sel: string) => Array.from(root.querySelectorAll<E>(sel))

type Key = { t: number; p: [number, number, number]; q: [number, number, number] }

export function createSetup(): ThreeSetup {
  return async (ctx: ThreeContext) => {
    const { THREE, scene, camera, renderer } = ctx
    const hudRoot: ParentNode = ctx.container.parentElement ?? ctx.container

    // ── 환경/조명 ──
    const pmrem = new THREE.PMREMGenerator(renderer)
    const studio = studioScene(THREE)
    const envRT = pmrem.fromScene(studio, 0.02)
    studio.traverse((o) => {
      const m = o as THREE_NS.Mesh
      if (m.isMesh) {
        m.geometry.dispose()
        ;(m.material as THREE_NS.Material).dispose()
      }
    })
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.75
    scene.fog = new THREE.FogExp2(0x040506, 0.034)

    const key = new THREE.SpotLight(0xffd6b0, 22, 0, 0.32, 0.7, 2)
    key.position.set(-3.2, 6.2, 4.2)
    key.target.position.set(0, 0.4, 0)
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0x7fd8ff, 2.4)
    rim.position.set(2.5, 3.2, -6)
    scene.add(rim)
    const rim2 = new THREE.DirectionalLight(0x4fe0c4, 0.35)
    rim2.position.set(-5, 1.5, -3)
    scene.add(rim2)
    scene.add(new THREE.HemisphereLight(0x2a3a44, 0x050505, 0.2))
    // 정면 소프트 필(캐비닛 도어 이음매 · 라운드 엣지가 읽히도록 아주 약하게)
    const fill = new THREE.DirectionalLight(0xa9c4d4, 0.6)
    fill.position.set(3, 2.5, 10)
    scene.add(fill)
    const scanLight = new THREE.PointLight(C.teal, 0, 1.4, 2)
    scene.add(scanLight)
    const redLight = new THREE.PointLight(C.red, 0, 1.6, 2)
    scene.add(redLight)

    // ── 캔버스 텍스처 글꼴 선로딩(모니터 화면 문구; 700 은 기본 로딩 스펙에 없음) ──
    const SCREEN_TEXT = 'POLARITY INSERT / NUT ASSY JIG CAM 01 · LOT-0417'
    await Promise.race([
      Promise.all([ensureSceneFonts(SCREEN_TEXT), document.fonts?.load(canvasFont(700, 13, 'mono'), SCREEN_TEXT).catch(() => undefined)]),
      new Promise((r) => setTimeout(r, 1500)),
    ])

    // ── 지오메트리 ──
    const A = await loadAddons()
    const M = materials(THREE)
    const shadowTex = shadowTexture(THREE)
    scene.add(buildFloor(THREE, shadowTex))
    const tray = buildTray(THREE, A, M, shadowTex)
    scene.add(tray.root)
    const machines = MACHINES.map((def, i) => {
      const m = buildMachine(THREE, A, M, def.kind)
      m.group.position.x = machineX[i]
      const footY = def.kind === 'battery' ? CELL_TOP + 0.03 : 0.3
      const sc = buildScanner(THREE, A, M, 2.2, def.kind === 'battery' ? tray.W - 0.04 : 1.4, def.kind === 'battery' ? tray.D - 0.04 : 0.95, footY)
      m.group.add(sc.group)
      if (def.kind !== 'battery') {
        sc.sheetPivot.visible = false
        sc.frustumMat.opacity = def.kind === 'spare' ? 0 : 0.22
        if (def.kind === 'spare') sc.ring.visible = false
      }
      scene.add(m.group)
      return { ...m, sc, def }
    })
    const hero = machines[2]
    const sc = hero.sc

    // ── 카메라 경로 ──
    const rx = cellX(REV_COL)
    const rz = cellZ(REV_ROW)
    const keys: Key[] = [
      { t: 0, p: [-1.85, 1.62, 2.2], q: [-0.25, 0.45, 0] },
      { t: 2.8, p: [-0.45, 1.6, 2.05], q: [0.3, 0.5, -0.1] },
      { t: 3.6, p: [rx - 0.4, 1.85, rz + 1.35], q: [rx + 0.05, 0.62, rz] },
      { t: 4.9, p: [rx - 0.8, 1.9, rz + 2.0], q: [rx, 1.15, rz] },
      { t: 6.0, p: [1.0, 2.8, 5.6], q: [-0.6, 0.85, -0.3] },
      { t: T.wideAt, p: [2.2, 5.3, 12.4], q: [-1.85, 0.5, -0.6] },
    ]
    const V3 = (a: [number, number, number]) => new THREE.Vector3(...a)
    const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => V3(k.p)), false, 'centripetal')
    const tgtCurve = new THREE.CatmullRomCurve3(keys.map((k) => V3(k.q)), false, 'centripetal')
    const camPos = new THREE.Vector3()
    const camTgt = new THREE.Vector3()
    const uAt = (t: number) => {
      const n = keys.length - 1
      if (t <= 0) return 0
      for (let i = 0; i < n; i++) {
        if (t < keys[i + 1].t) {
          let p = seg(t, keys[i].t, keys[i + 1].t)
          if (i === n - 1) p = easeOutCubic(p)
          return (i + p) / n
        }
      }
      return 1
    }
    const endPos = V3(keys[keys.length - 1].p)
    const endTgt = V3(keys[keys.length - 1].q)

    // ── HUD ──
    const lines = qs<HTMLElement>(hudRoot, '[data-hud="line"]')
    const oks = qs<HTMLElement>(hudRoot, '[data-hud="ok"]')
    const revEl = hudRoot.querySelector<HTMLElement>('[data-hud="rev"]')
    const mcs = qs<HTMLElement>(hudRoot, '[data-hud="mc"]')
    const countEl = hudRoot.querySelector<HTMLElement>('[data-hud="count"]')
    const ngEl = hudRoot.querySelector<HTMLElement>('[data-hud="ng"]')
    const tagEl = hudRoot.querySelector<HTMLElement>('[data-hud="tag"]')
    const proj = { x: 0, y: 0, visible: false }
    const tmp = new THREE.Vector3()
    const col = new THREE.Color()
    const tealC = new THREE.Color(C.teal)
    const redC = new THREE.Color(C.red)
    const frustumBase = new THREE.Color(C.teal).multiplyScalar(0.9)
    const total = COLS * ROWS
    let lastCount = -1

    const barState = (t: number) => {
      // x: 스캔 라인 위치, a: 가시도
      if (t < T.ambientStart) {
        let x: number
        if (t < T.lockAt) {
          const p = seg(t, 0, T.lockAt)
          x = T.barStartX + (rx - T.barStartX) * (1 - (1 - p) * (1 - p))
        } else if (t < T.resumeAt) x = rx
        else x = rx + (T.barEndX - rx) * Math.pow(seg(t, T.resumeAt, T.sweepEnd), 1.6)
        // 재개 이후엔 가상 라인이 계속 진행(플래시 감쇠용)
        if (t > T.sweepEnd) x = T.barEndX + (t - T.sweepEnd) * 0.8
        const a = 1 - seg(t, T.sweepEnd, T.sweepEnd + 0.35)
        return { x, a, ambient: false }
      }
      const c = loopT(t - T.ambientStart, T.ambientPeriod)
      const dur = 2.6
      const x = -1.02 + (2.04 * c) / dur
      const a = Math.min(seg(c, 0, 0.25), 1 - seg(c, dur - 0.25, dur))
      return { x, a, ambient: true }
    }

    return {
      update(t) {
        const bar = barState(t)
        const ambBlend = seg(t, T.wideAt - 1.2, T.ambientStart)

        // ── 카메라 ──
        if (t <= T.wideAt) {
          const u = uAt(t)
          posCurve.getPoint(u, camPos)
          tgtCurve.getPoint(u, camTgt)
        } else {
          const ramp = easeInOutCubic(seg(t, T.wideAt, T.wideAt + 3))
          const a = Math.sin(((t - T.wideAt) / 22) * Math.PI * 2) * 0.22 * ramp
          const rel = tmp.copy(endPos).sub(endTgt)
          const ca = Math.cos(a)
          const sa = Math.sin(a)
          camPos.set(rel.x * ca - rel.z * sa, rel.y + Math.sin(((t - T.wideAt) / 11) * Math.PI * 2) * 0.35 * ramp, rel.x * sa + rel.z * ca).add(endTgt)
          camTgt.copy(endTgt)
        }
        camera.position.copy(camPos)
        camera.lookAt(camTgt)

        // ── 스캔 시트/라인 ──
        sc.sheetPivot.position.x = bar.x
        sc.sheetPivot.visible = bar.a > 0.001
        sc.sheetMat.opacity = bar.a
        sc.lineMat.opacity = bar.a
        scanLight.position.set(bar.x, CELL_TOP + 0.18, 0)
        scanLight.intensity = bar.a * 0.05
        const lockP = !bar.ambient ? seg(t, T.lockAt, T.lockAt + 0.15) * (1 - seg(t, T.resumeAt + 0.2, T.resumeAt + 0.6)) : 0
        // 잠금 중 시트/프러스텀이 적색으로
        col.copy(tealC).lerp(redC, lockP)
        sc.sheetMat.color.copy(col).multiplyScalar(0.14 + lockP * 0.06)
        sc.lineMat.color.copy(col).multiplyScalar(2.5)
        sc.frustumMat.color.copy(frustumBase).lerp(redC, lockP * 0.85)
        sc.frustumMat.opacity = 0.5 + lockP * 0.35 - ambBlend * 0.15

        // ── 정상 셀 브래킷 ──
        const base = bar.ambient ? 0.55 : 1.0 - 0.45 * seg(t, 5.5, T.ambientStart)
        let count = 0
        for (let i = 0; i < tray.cells.length; i++) {
          const cell = tray.cells[i]
          const passed = bar.x - cell.x
          let k = 0
          if (bar.ambient) k = base + (passed > 0 ? 2.2 * Math.exp(-passed * 12) : 0)
          else if (passed > 0) k = base + 2.6 * Math.exp(-passed * 12)
          else if (t > T.sweepEnd) k = base
          if (passed > -0.02) count++
          col.copy(tealC).multiplyScalar(k)
          tray.frameI.setColorAt(i, col)
        }
        tray.frameI.instanceColor!.needsUpdate = true
        if (bar.x - rx > -0.02) count++
        count = Math.min(total, count)

        // ── 역삽 셀 ──
        const det = !bar.ambient && t >= T.lockAt ? 1 : 0
        const flash = det ? Math.exp(-(t - T.lockAt) * 5) : 0
        const pulse = det ? 0.75 + 0.25 * Math.sin((t - T.lockAt) * 14) : 0
        const lift = easeInOutCubic(seg(t, T.liftAt, 5.0)) * 0.72 + Math.pow(seg(t, 5.0, T.goneAt), 2.2) * 3.2
        tray.rev.position.y = TRAY_TOP + lift
        tray.revBody.rotation.z = Math.sin(seg(t, T.liftAt, T.goneAt) * Math.PI) * 0.18
        tray.rev.visible = t < T.goneAt && !bar.ambient
        const frameFade = 1 - seg(t, 5.2, 6.0)
        tray.redFrameMat.opacity = det * (pulse + flash * 1.5) * frameFade
        tray.redFrame.scale.setScalar(1 + flash * 0.6)
        tray.minus.visible = det > 0
        const slotMat = tray.slot.material as THREE_NS.MeshBasicMaterial
        slotMat.opacity = seg(t, 5.0, 5.8) * (0.55 + 0.15 * Math.sin(t * 3))
        redLight.position.set(rx, CELL_TOP + 0.15 + lift, rz)
        redLight.intensity = det * (0.12 * pulse + flash * 0.3) * (1 - seg(t, 5.0, 5.6))

        // 예비기 덮개 유리: 클로즈업 배경에선 죽이고 풀백에서 드러냄
        const cover = machines[3].coverMat
        if (cover) cover.uniforms.uOp.value = 0.25 + 0.75 * easeInOutCubic(seg(t, 5.0, 6.8))

        // ── 시그널 타워 ──
        machines.forEach((m, i) => {
          const [red, amber, green] = m.tower
          const isHero = i === 2
          const spare = m.def.kind === 'spare'
          const alarm = isHero && det && t < T.liftEnd ? (Math.sin((t - T.lockAt) * 12) > 0 ? 1 : 0.2) : 0
          red.color.setHex(C.red).multiplyScalar(0.18 + alarm * 3)
          amber.color.setHex(C.amber).multiplyScalar(spare ? 0.12 : 0.18)
          green.color.setHex(0x43e07a).multiplyScalar(spare ? 0.08 : alarm > 0 ? 0.18 : 2.2)
          if (!spare && !isHero) {
            const ring = m.sc.ring.material as THREE_NS.MeshBasicMaterial
            ring.opacity = 0.6 + 0.4 * Math.sin(t * 1.3 + i)
          }
        })

        // ── HUD ──
        lines.forEach((el, i) => {
          const at = HUD_LINES[i]?.at ?? 0
          const p = at === 0 ? 1 : easeOutCubic(seg(t, at, at + 0.55))
          el.style.opacity = p.toFixed(3)
          el.style.transform = `translate3d(${((1 - p) * -14).toFixed(1)}px,0,0)`
        })
        if (countEl && count !== lastCount) {
          lastCount = count
          countEl.textContent = `${String(count).padStart(2, '0')}/${total}`
        }
        if (ngEl) ngEl.style.opacity = (det * (1 - seg(t, 6.2, 6.8))).toFixed(3)
        if (tagEl) tagEl.style.opacity = seg(t, 5.4, 6.0).toFixed(3)

        // "+ OK" 라벨
        const closeFade = 1 - seg(t, 4.4, 5.0)
        OK_CELLS.forEach(([c, r], i) => {
          const el = oks[i]
          if (!el) return
          const x = cellX(c)
          const passed = bar.x - x
          const o = bar.ambient ? 0 : seg(passed, 0.0, 0.12) * closeFade
          projectToScreen(ctx, tmp.set(x, CELL_TOP + 0.04, cellZ(r)), proj)
          placeLabel(el, proj.x, proj.y, proj.visible ? o : 0)
        })
        if (revEl) {
          const o = det * seg(t, T.lockAt + 0.1, T.lockAt + 0.4) * (1 - seg(t, 5.3, 5.8))
          projectToScreen(ctx, tmp.set(rx, CELL_TOP + lift + 0.05, rz), proj)
          placeLabel(revEl, proj.x, proj.y, proj.visible ? o : 0)
        }
        mcs.forEach((el, i) => {
          const o = seg(t, 5.5 + i * 0.18, 6.0 + i * 0.18)
          projectToScreen(ctx, tmp.set(machineX[i], 3.05, -0.82), proj)
          // 풀백 도중 화면 위로 잘리는 라벨(밑줄만 남는 현상) 방지 — 화면 상단 근처에선 숨김
          const edge = seg(proj.y, 70, 120)
          placeLabel(el, proj.x, proj.y, proj.visible ? o * edge : 0)
        })
      },
      dispose() {
        envRT.dispose()
        pmrem.dispose()
        scene.environment = null
      },
    }
  }
}
