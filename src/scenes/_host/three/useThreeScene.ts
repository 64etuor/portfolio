'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { subscribe } from '../raf'
import { ensureSceneFonts } from '../fonts'
import type { ThreeContext, ThreeSceneOptions, ThreeSetup, ThreeSetupResult } from './types'

const MAX_DT = 1 / 20

/**
 * 품질 사다리 — 거버너가 프레임 시간이 계속 길면 한 칸씩 내린다(올리지는 않음: 진동 방지).
 * L0: DPR ≤1.5 + MSAA 4x · L1: DPR ≤1.0 · L2: MSAA 끔.
 */
const DPR_CAP = 1.5
const DPR_LOW = 1
const MSAA_SAMPLES = 4
/** 프레임 간격 EMA 가 이 값(ms, ≈36fps)을 넘으면 강등. */
const SLOW_FRAME_MS = 28
const EMA_ALPHA = 0.05
/** 표본 하나의 상한(ms) — 탭 복귀 등 한 번의 긴 간격이 EMA 를 튀기지 않게. 아주 느린 기기도 결국 강등된다. */
const GOV_SAMPLE_CAP_MS = 200
/** 강등 판단: 표본 수 ≥ MIN_FRAMES 이거나(빠른 기기) 직전 단계 후 MIN_MS 경과(느린 기기) + 최소 표본. */
const GOV_MIN_FRAMES = 45
const GOV_MIN_MS = 1500
const GOV_MIN_SAMPLES = 6

interface Quality {
  /** 한 칸 강등. 더 내릴 게 없으면 false. */
  degrade(): boolean
}

/** 검토용 정지 프레임: 단독 페이지 URL 의 `?t=<초>` 면 그 시점에 고정(루프 없음). */
function frozenTime(): number | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('t')
  if (raw === null) return null
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 ? v : null
}

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
  // 컨텍스트 소실 → 루프 정지. 복구되면 epoch 를 올려 렌더러를 통째로 재생성한다.
  const [lost, setLost] = useState(false)
  const [epoch, setEpoch] = useState(0)
  const qualityRef = useRef<Quality | null>(null)

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
  // 렌더 중 ref 쓰기 금지(React Compiler) — 커밋 직후 동기화.
  useLayoutEffect(() => {
    onReadyRef.current = onReady
    setupRef.current = setup
    runningRef.current = running
    reducedRef.current = reduced
  })

  // 옵션은 마운트 시 1회만 읽는다(렌더러 재생성 방지).
  const initOptsRef = useRef({ bloom, fov, near, far, exposure, background })

  const ref = useCallback((node: HTMLDivElement | null) => setContainer(node), [])

  const renderFrame = useCallback((t: number, dt: number) => {
    const ctx = ctxRef.current
    const res = resultRef.current
    if (!ctx || !res) return
    res.update(t, dt)
    if (dt === 0) {
      // 정지 프레임(포스터·프리스테이징·?t=): update 안에서 옮긴 카메라의 행렬이 아직 갱신 전이라
      // HUD 투영이 이전 위치 기준으로 계산된다. 행렬을 갱신하고 한 번 더 돌려 라벨을 맞춘다.
      ctx.scene.updateMatrixWorld()
      ctx.camera.updateMatrixWorld()
      res.update(t, dt)
    }
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
    let canvasEl: HTMLCanvasElement | null = null
    const onLost = (e: Event) => {
      e.preventDefault() // 기본 동작(복구 불가)을 막아 restored 이벤트를 받을 수 있게
      if (canvasEl) canvasEl.style.visibility = 'hidden'
      setLost(true)
    }
    const onRestored = () => {
      if (destroyed) return
      setLost(false)
      setEpoch((n) => n + 1)
    }

    const init = async () => {
      const THREE = await import('three')
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
        // CanvasTexture 에 굽는 글자가 OS 대체 폰트로 고정되지 않도록 웹폰트를 먼저 받는다.
        ensureSceneFonts(),
      ])
      if (destroyed) return

      const o = initOptsRef.current
      const w = Math.max(1, container.clientWidth)
      const h = Math.max(1, container.clientHeight)
      const deviceDpr = window.devicePixelRatio || 1
      const dpr = Math.min(deviceDpr, DPR_CAP)
      const useComposer = o.bloom !== false

      // 컴포저를 쓰면 화면 프레임버퍼는 OutputPass 의 풀스크린 쿼드만 받으므로 기본 MSAA 는 낭비 —
      // 대신 컴포저의 렌더 타깃을 멀티샘플로 만든다(아래).
      const renderer = new THREE.WebGLRenderer({ antialias: !useComposer, powerPreference: 'high-performance' })
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = o.exposure
      renderer.setClearColor(new THREE.Color(o.background), 1)
      const canvas = renderer.domElement
      canvasEl = canvas
      // 컨텍스트 소실(드라이버 리셋·컨텍스트 수 초과): 루프를 세우고 캔버스를 숨겨 배경색 정지 화면으로.
      // 복구 이벤트가 오면 전체 재초기화(epoch).
      canvas.addEventListener('webglcontextlost', onLost, false)
      canvas.addEventListener('webglcontextrestored', onRestored, false)
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
      const samples = Math.min(MSAA_SAMPLES, renderer.capabilities.maxSamples || 0)
      if (o.bloom !== false) {
        const b = o.bloom ?? {}
        // 멀티샘플 HalfFloat 타깃 — RenderPass 가 여기에 그려 가장자리가 매끈해진다(블룸 입력도 동일).
        const db = renderer.getDrawingBufferSize(new THREE.Vector2())
        const rt = new THREE.WebGLRenderTarget(db.x, db.y, { type: THREE.HalfFloatType, samples })
        rt.texture.name = 'EffectComposer.rt1'
        composer = new EffectComposer(renderer, rt)
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

      // 적응형 품질 — tick 루프의 거버너가 호출한다.
      let level = 0
      const setDpr = (d: number) => {
        ctx.size = { ...ctx.size, dpr: d }
        renderer.setPixelRatio(d)
        renderer.setSize(ctx.size.w, ctx.size.h, false)
        composer?.setPixelRatio(d) // 내부에서 setSize → 블룸 타깃까지 재할당
        result.resize?.(ctx.size.w, ctx.size.h) // dpr 에 의존하는 씬 리소스(포인트 크기·반사 RT) 갱신
      }
      qualityRef.current = {
        degrade() {
          while (level < 2) {
            level++
            canvas.dataset.quality = String(level) // 디버그/측정용
            if (level === 1 && ctx.size.dpr > DPR_LOW) {
              setDpr(Math.min(deviceDpr, DPR_LOW))
              return true
            }
            if (level === 2 && composer && composer.renderTarget1.samples > 0) {
              for (const t of [composer.renderTarget1, composer.renderTarget2]) {
                t.samples = 0
                t.dispose() // 다음 사용 시 샘플 없이 재할당
              }
              return true
            }
          }
          return false
        },
      }

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
      canvasEl?.removeEventListener('webglcontextlost', onLost, false)
      canvasEl?.removeEventListener('webglcontextrestored', onRestored, false)
      qualityRef.current = null
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
    // epoch: 컨텍스트 복구 시 렌더러 재생성 트리거.
  }, [container, renderFrame, epoch])

  // tick 루프 — running && !reduced 일 때만 공유 rAF 구독. 아니면 정적 1프레임.
  useEffect(() => {
    if (!ctxReady || lost) return
    const frozen = frozenTime()
    if (frozen !== null) {
      elapsedRef.current = frozen
      renderFrame(frozen, 0)
      return
    }
    if (reduced || !running) {
      renderFrame(elapsedRef.current, 0)
      return
    }
    startRef.current = 0
    lastRef.current = 0
    // 거버너: 실제 프레임 간격(상한 클램프)의 EMA 가 계속 느리면 품질 한 칸 강등.
    let ema = 0
    let samples = 0
    let lastStep = 0
    const unsub = subscribe((now) => {
      if (startRef.current === 0) {
        startRef.current = now
        lastRef.current = now
        lastStep = now
      }
      const raw = now - lastRef.current
      if (raw > 0) {
        const v = Math.min(raw, GOV_SAMPLE_CAP_MS)
        ema = samples === 0 ? v : ema + (v - ema) * EMA_ALPHA
        samples++
        const enough = samples >= GOV_MIN_FRAMES || (samples >= GOV_MIN_SAMPLES && now - lastStep > GOV_MIN_MS)
        if (enough && ema > SLOW_FRAME_MS) {
          lastStep = now
          samples = 0 // 강등 후(또는 더 내릴 게 없으면) 새로 측정
          qualityRef.current?.degrade()
        }
      }
      const t = elapsedRef.current + (now - startRef.current) / 1000
      const dt = Math.min(MAX_DT, raw / 1000)
      lastRef.current = now
      renderFrame(t, dt)
    })
    return () => {
      unsub()
      if (startRef.current !== 0) elapsedRef.current += (lastRef.current - startRef.current) / 1000
    }
  }, [ctxReady, lost, running, reduced, renderFrame])

  return ref
}
