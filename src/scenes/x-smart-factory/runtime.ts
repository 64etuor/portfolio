import { roomEnvironment } from '../_host/three/env'
import type * as THREE from 'three'
import { easeInOutCubic, easeOutBack, easeOutCubic, loopT, seg, setData, setStyle } from '../_host/three/helpers'
import type { ThreeSetup } from '../_host/three/types'
import { actAt, bobAt, buildWorld, riseAt } from './build'
import { loadAddons } from './props'
import { BENCH_X, COLORS, LIFT, LINES, LOG_IDS, PANELS, SYSTEMS, T } from './data'

// 타임라인: 0–0.8 수작업 라인(종이) · 0.8–3.4 스캔 스윕 · 1.5–5.6 트윈 부상 ·
// 4.0/4.6/5.2 ERP·바코드·태블릿 패널 · 6.6 히어로 홀드 → 앰비언트(궤도 드리프트 + 주기 재스캔).

const ERP_LOG_TAGS = ['IN', 'OUT', 'STOCK', 'IN', 'MOVE', 'OUT', 'STOCK', 'IN']

export function createSetup(): ThreeSetup {
  return async (ctx) => {
    const { THREE: TH, scene, camera, container } = ctx
    scene.fog = new TH.FogExp2(COLORS.bg, 0.02)

    // 금속·클레이가 읽히도록 절차적 환경맵(낮은 강도)
    const [addons, envRT] = await Promise.all([loadAddons(), roomEnvironment(ctx)])
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.22

    const W = buildWorld(TH, scene, addons)

    /* HUD 요소(형제 DOM) — data-k 로 찾고, 리렌더로 교체되면 다시 찾는다. */
    const root = container.parentElement
    const cache = new Map<string, HTMLElement | null>()
    const el = (k: string) => {
      let e = cache.get(k)
      if (!e || !e.isConnected) {
        e = root?.querySelector<HTMLElement>(`[data-k="${k}"]`) ?? null
        cache.set(k, e)
      }
      return e
    }
    const tmp = new TH.Vector3()
    const place = (k: string, x: number, y: number, z: number, op: number) => {
      const e = el(k)
      if (!e) return
      tmp.set(x, y, z).project(camera)
      const sx = (tmp.x * 0.5 + 0.5) * ctx.size.w
      const sy = (-tmp.y * 0.5 + 0.5) * ctx.size.h
      const vis = tmp.z < 1 && tmp.z > -1
      setStyle(e, 'transform', `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`)
      setStyle(e, 'opacity', (vis ? op : 0).toFixed(3))
    }
    const setOp = (k: string, op: number) => {
      const e = el(k)
      if (e) setStyle(e, 'opacity', op.toFixed(3))
    }
    const setText = (k: string, s: string) => {
      const e = el(k)
      if (e && e.textContent !== s) e.textContent = s
    }
    const setOn = (k: string, on: boolean) => {
      const e = el(k)
      if (e) setData(e, 'on', on ? '1' : '0')
    }

    /* 재고 스택 → 태그 */
    const stacks = [W.pallets[0], W.pallets[3], W.pallets[5], W.rackA]

    /* 카메라 키 */
    const A = { p: new TH.Vector3(6.2, 2.5, 11.2), t: new TH.Vector3(-1.8, 1.3, -0.2) }
    const B = { p: new TH.Vector3(15.2, 9.6, 18.6), t: new TH.Vector3(0.4, 4.5, -0.9) }
    const camP = new TH.Vector3()
    const camT = new TH.Vector3()
    const off = new TH.Vector3()

    const m4 = new TH.Matrix4()
    const q = new TH.Quaternion()
    const e3 = new TH.Euler()
    const v = new TH.Vector3()
    const s = new TH.Vector3()
    const col = new TH.Color()
    const amber = new TH.Color(COLORS.amber)
    const blue = new TH.Color(COLORS.blue)
    const lineMat = W.scan.userData.lineMat as THREE.MeshBasicMaterial

    let aspect = ctx.size.w / ctx.size.h

    return {
      resize(w, h) {
        aspect = w / h
        W.setRes(w, h, ctx.size.dpr)
      },
      dispose() {
        scene.environment = null
        envRT.dispose()
      },
      update(t) {
        W.U.uTime.value = t
        W.figures.update(t)

        /* 카메라 */
        const cp = easeInOutCubic(seg(t, 0, T.hero))
        camP.lerpVectors(A.p, B.p, cp)
        camT.lerpVectors(A.t, B.t, cp)
        const u = Math.max(0, t - T.hero)
        const theta = 0.11 * (1 - Math.cos((2 * Math.PI * u) / 28)) - 0.04 * (1 - Math.cos((2 * Math.PI * u) / 17))
        const k = Math.min(1.8, Math.max(1, 1.7 / aspect))
        off.subVectors(camP, camT).multiplyScalar(1 + (k - 1) * (0.5 + 0.5 * cp))
        off.applyAxisAngle(v.set(0, 1, 0), theta)
        off.y += 0.6 * (1 - Math.cos((2 * Math.PI * u) / 21)) * 0.5
        camera.position.copy(camT).add(off)
        camera.lookAt(camT)
        camera.updateMatrixWorld()

        /* 스캔 */
        let sx = T.x0
        let sa = 0
        if (t < T.scan1 + 0.6) {
          sx = T.x0 + (T.x1 - T.x0) * seg(t, T.scan0, T.scan1)
          sa = (0.6 + 0.4 * seg(t, 0, T.scan0)) * (1 - seg(t, T.scan1, T.scan1 + 0.5))
        } else if (t > T.ambientScanStart) {
          const lu = loopT(t - T.ambientScanStart, T.ambientScanPeriod)
          if (lu < T.ambientScanDur) {
            const p = lu / T.ambientScanDur
            sx = T.x0 + (T.x1 - T.x0) * p
            sa = 0.45 * Math.sin(Math.PI * p)
          }
        }
        W.U.uScanX.value = sx
        W.U.uScanA.value = sa
        W.scan.position.x = sx
        W.scan.visible = sa > 0.002
        lineMat.opacity = Math.min(1, sa * 1.4)

        /* 바코드 라벨 */
        W.labels.forEach((l, i) => {
          const d = l.x - sx
          const flash = Math.exp(-d * d * 2.2) * sa
          const on = seg(t, actAt(l.x), actAt(l.x) + 0.3)
          const pulse = 1.2 + 0.35 * Math.sin(t * 2.2 + i * 1.7)
          col.setScalar(0.26 * (1 - on))
          col.r += amber.r * on * pulse + flash * 3
          col.g += amber.g * on * pulse + flash * 3
          col.b += amber.b * on * pulse + flash * 3
          W.labelMesh.setColorAt(i, col)
        })
        if (W.labelMesh.instanceColor) W.labelMesh.instanceColor.needsUpdate = true

        /* 태블릿 화면 */
        W.tablets.forEach((tb, i) => {
          const d = tb.x - sx
          const flash = Math.exp(-d * d * 2.2) * sa
          const on = seg(t, actAt(tb.x) + 0.1, actAt(tb.x) + 0.6)
          const g = 0.14 * (1 - on) + on * (1.7 + 0.2 * Math.sin(t * 3 + i))
          col.setRGB(0.14 * (1 - on) + blue.r * g * on + flash * 2, 0.14 * (1 - on) + blue.g * g * on + flash * 2, 0.14 * (1 - on) + blue.b * g * on + flash * 2)
          W.tabletMesh.setColorAt(i, col)
        })
        if (W.tabletMesh.instanceColor) W.tabletMesh.instanceColor.needsUpdate = true

        /* 종이 기록 — 스캔 지나가면 사라짐 */
        W.papers.forEach((p, i) => {
          const a = actAt(p.x)
          const gone = easeOutCubic(seg(t, a + 0.05, a + 0.55))
          const d = p.x - sx
          const flash = Math.exp(-d * d * 2.2) * sa
          const sc = Math.max(0.0001, 1 - gone)
          q.setFromEuler(e3.set(0, p.ry + gone * 0.4, 0))
          m4.compose(v.set(p.x, p.y + gone * 0.25, p.z), q, s.set(sc, sc, sc))
          W.paperMesh.setMatrixAt(i, m4)
          W.clipMesh.setMatrixAt(i, m4)
          col.setRGB(0.8 + flash * 2.5, 0.78 + flash * 2.6, 0.74 + flash * 2.6)
          W.paperMesh.setColorAt(i, col)
        })
        W.paperMesh.instanceMatrix.needsUpdate = true
        W.clipMesh.instanceMatrix.needsUpdate = true
        if (W.paperMesh.instanceColor) W.paperMesh.instanceColor.needsUpdate = true

        /* 패널 노드 */
        W.nodes.forEach((n, i) => {
          const p = easeOutBack(seg(t, n.at, n.at + 0.7))
          n.group.visible = p > 0.001
          n.group.scale.setScalar(Math.max(0.001, p) * (1 + 0.06 * Math.sin(t * 3.2 + i * 2)))
          n.group.quaternion.copy(camera.quaternion)
          n.ring2.rotation.z = t * 0.7 + i
        })

        /* ── HUD ── */
        // 단계 캡션
        const ph1 = seg(t, 1.0, 1.4) * (1 - seg(t, 3.7, 4.1))
        const ph2 = seg(t, 4.2, 4.8)
        setOp('ph0', 1 - seg(t, 0.9, 1.3))
        setOp('ph1', ph1)
        setOp('ph2', ph2)
        SYSTEMS.forEach((sy, i) => setOn(`sys${i}`, t >= sy.at))

        // 바닥 라인 라벨(물리)
        const floorOp = 1 - 0.45 * seg(t, 3.5, 5.0)
        LINES.forEach((ln, i) => place(`ln${i}`, BENCH_X[0] - 1.05, 0.02, ln.z + 0.35, floorOp))
        place('wh', 6.3, 0.02, 3.65, floorOp)

        // 패널 카드
        PANELS.forEach((p) => {
          const op = seg(t, p.at + 0.15, p.at + 0.6)
          place(`pn-${p.key}`, p.pos[0], p.pos[1], p.pos[2], op)
        })

        // 재고 태그(트윈 위 스택) + 패널 카운트
        stacks.forEach((st, i) => {
          const r = riseAt(st.x, st.z, t)
          const y = st.top + r * LIFT + bobAt(st.x, t, r) + 0.28
          const op = seg(r, 0.85, 1)
          place(`stk${i}`, st.x, y, st.z, op)
          const cnt = Math.round(st.count * easeOutCubic(seg(r, 0.85, 1)))
          setText(`stc${i}`, String(cnt))
          const pc = Math.round(st.count * easeOutCubic(seg(t, T.panelBarcode + 0.3 + i * 0.15, T.panelBarcode + 1.3 + i * 0.15)))
          setText(`pc${i}`, String(pc))
        })

        // ERP 모듈 + 로그
        for (let i = 0; i < 4; i++) setOn(`erpm${i}`, t >= T.panelErp + 0.5 + i * 0.35)
        const li = Math.floor(Math.max(0, t - T.panelErp) * 1.25)
        for (let j = 0; j < 3; j++) {
          const n = (li + j) % LOG_IDS.length
          setText(`erplog${j}`, `${LOG_IDS[n]} · ${ERP_LOG_TAGS[n]}`)
        }

        // 태블릿 진행 바(장식, 수치 없음)
        for (let i = 0; i < 3; i++) {
          const e = el(`tb${i}`)
          if (e) {
            const on = seg(t, T.panelTablet + 0.3 + i * 0.2, T.panelTablet + 1.1 + i * 0.2)
            const w = on * (0.42 + 0.3 * (0.5 + 0.5 * Math.sin(t * 0.45 + i * 2.1)))
            setStyle(e, 'transform', `scaleX(${w.toFixed(3)})`)
          }
        }
      },
    }
  }
}
