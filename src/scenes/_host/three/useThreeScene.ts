'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribe } from '../raf'
import type { ThreeContext, ThreeSceneOptions, ThreeSetup, ThreeSetupResult } from './types'

const DPR_CAP = 2
const MAX_DT = 1 / 20

/**
 * three.js 씬 하네스 — useSceneCanvas 의 WebGL 판.
 *
 * 하네스가 소유: three 동적 import, WebGLRenderer(ACES + sRGB), 카메라, Bloom 컴포저,
 * ResizeObserver, reduced-motion, 공유 rAF 구독(running && !reduced 일 때만), 정리(dispose).
 * 씬이 소유: setup(ctx) 본문 — 메시/조명/카메라 연출을 만들고 update(t, dt) 를 돌려준다.
 *
 * 필름 계약: onReady 는 **첫 프레임을 실제로 렌더한 다음 프레임**에 1회 호출된다
 * (마운트 시점이 아니라). 그래서 three 로딩 중 컷이 넘어가 빈 화면이 보이지 않는다.
 * running=false 이면 누적 시간 지점의 정지 프레임만 그린다(필름 프리스테이징·갤러리 포스터).
 *
 * 반환된 ref 콜백을 부모를 꽉 채우는 <div> 에 붙인다.
 */
export function useThreeScene(setup: ThreeSetup, opts: ThreeSceneOptions = {}) {
  const { running = true, onReady, bloom, fov = 40, near = 0.1, far = 200, exposure = 1, background = '#050607' } = opts

  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [reduced, setReduced] = useState(false)
  const [ctxReady, setCtxReady] = useState(false)

  const ctxRef = useRef<ThreeContext | null>(null)
  const resultRef = useRef<ThreeSetupResult | null>(null)
  const elapsedRef = useRef(0)
  const startRef = useRef(0)
  const lastRef = useRef(0)
  const onReadyRef = useRef(onReady)
  const readyFiredRef = useRef(false)
  const setupRef = useRef(setup)
  // 최신 running/reduced 를 ResizeObserver 콜백에 노출.
  const runningRef = useRef(running)
  const reducedRef = useRef(reduced)
  onReadyRef.current = onReady
  setupRef.current = setup
  runningRef.current = running
  reducedRef.current = reduced

  // 옵션은 마운트 시 1회만 읽는다(렌더러 재생성 방지).
  const initOptsRef = useRef({ bloom, fov, near, far, exposure, background })

  const ref = useCallback((node: HTMLDivElement | null) => setContainer(node), [])

  const renderFrame = useCallback((t: number, dt: number) => {
    const ctx = ctxRef.current
    const res = resultRef.current
    if (!ctx || !res) return
    res.update(t, dt)
    if (ctx.composer) ctx.composer.render(dt)
    else ctx.renderer.render(ctx.scene, ctx.camera)
  }, [])

  // reduced-motion 감지.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])

  // 렌더러/씬 마운트 — 컨테이너당 1회.
  useEffect(() => {
    if (!container) return
    let destroyed = false
    let ro: ResizeObserver | null = null
    let readyRaf = 0

    const init = async () => {
      const THREE = await import('three')
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ])
      if (destroyed) return

      const o = initOptsRef.current
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)

      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = o.exposure
      renderer.setClearColor(new THREE.Color(o.background), 1)
      const canvas = renderer.domElement
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.display = 'block'
      container.appendChild(canvas)

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(o.background)
      const camera = new THREE.PerspectiveCamera(o.fov, w / h, o.near, o.far)

      let composer: InstanceType<typeof EffectComposer> | null = null
      let bloomPass: InstanceType<typeof UnrealBloomPass> | null = null
      if (o.bloom !== false) {
        const b = o.bloom ?? {}
        composer = new EffectComposer(renderer)
        composer.setPixelRatio(dpr)
        composer.setSize(w, h)
        composer.addPass(new RenderPass(scene, camera))
        bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), b.strength ?? 0.9, b.radius ?? 0.55, b.threshold ?? 0.2)
        composer.addPass(bloomPass)
        composer.addPass(new OutputPass())
      }

      const ctx: ThreeContext = {
        THREE,
        renderer,
        scene,
        camera,
        composer,
        bloom: bloomPass,
        container,
        size: { w, h, dpr },
      }
      ctxRef.current = ctx

      const result = await setupRef.current(ctx)
      if (destroyed) {
        result.dispose?.()
        return
      }
      resultRef.current = result

      const applySize = () => {
        const nw = Math.max(1, container.clientWidth)
        const nh = Math.max(1, container.clientHeight)
        const s = ctx.size
        if (s.w === nw && s.h === nh) return
        ctx.size = { w: nw, h: nh, dpr: s.dpr }
        renderer.setSize(nw, nh, false)
        composer?.setSize(nw, nh)
        camera.aspect = nw / nh
        camera.updateProjectionMatrix()
        result.resize?.(nw, nh)
      }
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      result.resize?.(w, h)
      ro = new ResizeObserver(() => {
        applySize()
        // 정지 중이면 새 크기로 정적 프레임 재그림.
        if (!runningRef.current || reducedRef.current) renderFrame(elapsedRef.current, 0)
      })
      ro.observe(container)

      // 첫 프레임을 그리고, 그 프레임이 실제로 페인트된 다음 프레임에 onReady.
      renderFrame(elapsedRef.current, 0)
      readyRaf = requestAnimationFrame(() => {
        readyRaf = 0
        if (destroyed || readyFiredRef.current) return
        readyFiredRef.current = true
        onReadyRef.current?.()
      })
      setCtxReady(true)
    }

    init().catch((err) => {
      console.error('[useThreeScene] init failed:', err)
      // 실패해도 필름이 멈추지 않도록 ready 는 알린다.
      if (!readyFiredRef.current) {
        readyFiredRef.current = true
        onReadyRef.current?.()
      }
    })

    return () => {
      destroyed = true
      if (readyRaf) cancelAnimationFrame(readyRaf)
      ro?.disconnect()
      setCtxReady(false)
      resultRef.current?.dispose?.()
      resultRef.current = null
      const ctx = ctxRef.current
      ctxRef.current = null
      if (!ctx) return
      ctx.scene.traverse((obj) => {
        const mesh = obj as { geometry?: { dispose(): void }; material?: unknown }
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const m of mats as Array<Record<string, unknown> & { dispose(): void }>) {
          for (const v of Object.values(m)) {
            if (v && typeof v === 'object' && 'isTexture' in v) (v as unknown as { dispose(): void }).dispose()
          }
          m.dispose()
        }
      })
      ctx.composer?.dispose()
      ctx.renderer.dispose()
      ctx.renderer.forceContextLoss()
      ctx.renderer.domElement.remove()
    }
  }, [container, renderFrame])

  // tick 루프 — running && !reduced 일 때만 공유 rAF 구독. 아니면 정적 1프레임.
  useEffect(() => {
    if (!ctxReady) return
    if (reduced || !running) {
      renderFrame(elapsedRef.current, 0)
      return
    }
    startRef.current = 0
    lastRef.current = 0
    const unsub = subscribe((now) => {
      if (startRef.current === 0) {
        startRef.current = now
        lastRef.current = now
      }
      const t = elapsedRef.current + (now - startRef.current) / 1000
      const dt = Math.min(MAX_DT, (now - lastRef.current) / 1000)
      lastRef.current = now
      renderFrame(t, dt)
    })
    return () => {
      unsub()
      if (startRef.current !== 0) elapsedRef.current += (lastRef.current - startRef.current) / 1000
    }
  }, [ctxReady, running, reduced, renderFrame])

  return ref
}
