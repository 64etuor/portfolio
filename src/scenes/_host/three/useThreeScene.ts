'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type * as THREE_NS from 'three'
import { subscribe } from '../raf'
import { ensureSceneFonts } from '../fonts'
import { useSceneClock } from '../sceneClock'
import type { ThreeContext, ThreeSceneOptions, ThreeSetup, ThreeSetupResult } from './types'

const MAX_DT = 1 / 20

/**
 * 품질 사다리 — 거버너가 프레임 시간이 계속 길면 한 칸씩 내린다(올리지는 않음: 진동 방지).
 * L0: DPR ≤1.25 + MSAA 4x · L1: MSAA 2x · L2: DPR ≤1.0 · L3: MSAA 끔.
 * 목표는 "평균 30fps 이상" 이 아니라 매끈한 60 — 40~50fps 의 떨림도 잡는다.
 */
const DPR_CAP = 1.25
const DPR_LOW = 1
const MSAA_SAMPLES = 4
/** 1초 창의 프레임 간격 중앙값(ms)이 이 값을 넘으면 '느린 창'. 60Hz=16.7ms, 50fps=20ms. */
const SLOW_FRAME_MS = 19
/** 느린 창이 연속 이만큼이면 한 칸 강등(히스테리시스 — 한 번의 출렁임으론 안 내린다). */
const SLOW_WINDOWS = 2
const GOV_WINDOW_MS = 1000
/** 시작/강등 직후 이 시간은 표본에서 뺀다(첫 업로드·재할당 프레임이 판단을 오염시키지 않게). */
const GOV_SETTLE_MS = 400
const MAX_LEVEL = 3

/**
 * 같은 탭에서 한 번 배운 품질 단계는 다음 씬도 그대로 시작한다 — 필름은 씬마다 새 렌더러라
 * 매번 L0 에서 다시 강등하면 씬마다 같은 끊김(강등 직전 느린 2초 + 재할당)이 반복된다.
 */
let learnedLevel = 0

/** 성능 측정용 — 씬별 update/render JS 시간 누적(?perf 없이도 상시, 비용은 now() 3회). */
interface Stats {
  frames: number
  updMs: number
  renderMs: number
  level: number
}
declare global {
  interface Window {
    __threeStats?: Stats[]
  }
}

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
 * WebGLRenderer(=WebGL 컨텍스트) 풀.
 *
 * 컨텍스트 생성(getContext + 확장 조회)과 파기(forceContextLoss)는 GPU 프로세스와의 동기 왕복이라,
 * GPU 가 다른 씬을 그리느라 바쁠 때 메인 스레드를 길게 세운다. 필름은 컷마다 숨은 슬롯의 씬을
 * 갈아 끼우므로(이전 씬 언마운트 + 다음 씬 마운트) 그 비용이 재생 중인 씬 위에서 터졌다.
 * 언마운트된 렌더러를 최대 2개(필름 슬롯 수) 보관했다가 다음 씬이 그대로 재사용한다 —
 * 씬 리소스(지오메트리·재질·텍스처·RT)는 언마운트 때 전부 해제되므로 컨텍스트만 이어 쓴다.
 * 풀을 넘치는 렌더러만 파기하며, 그 컨텍스트 파기는 유휴 시간으로 미룬다.
 */
const POOL_MAX = 2
const rendererPool: THREE_NS.WebGLRenderer[] = []

function acquireRenderer(THREE: typeof THREE_NS): THREE_NS.WebGLRenderer {
  while (rendererPool.length) {
    const r = rendererPool.pop()!
    if (!r.getContext().isContextLost()) {
      r.resetState()
      r.info.reset()
      return r
    }
    retireRenderer(r)
  }
  return new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
}

function releaseRenderer(r: THREE_NS.WebGLRenderer) {
  r.domElement.remove()
  r.setRenderTarget(null)
  r.renderLists.dispose()
  delete r.domElement.dataset.quality
  if (process.env.NODE_ENV !== 'production') {
    // 측정용: 풀에 들어가는 렌더러에 남은 GPU 리소스(누수 확인).
    ;(window as unknown as { __threePoolMem?: unknown[] }).__threePoolMem ??= []
    ;(window as unknown as { __threePoolMem: unknown[] }).__threePoolMem.push({ ...r.info.memory, programs: r.info.programs?.length ?? 0 })
  }
  if (rendererPool.length < POOL_MAX && !r.getContext().isContextLost()) rendererPool.push(r)
  else retireRenderer(r)
}

function retireRenderer(r: THREE_NS.WebGLRenderer) {
  r.dispose()
  r.domElement.remove()
  const lose = () => r.forceContextLoss()
  if (typeof requestIdleCallback === 'function') requestIdleCallback(lose, { timeout: 4000 })
  else setTimeout(lose, 1500)
}

/** 다음 매크로태스크로 양보 — 무거운 초기화 단계 사이에서 재생 중인 다른 씬이 프레임을 그리게. */
const yieldToMain = () => new Promise<void>((r) => setTimeout(r, 0))

/**
 * 셰이더 프리컴파일 — 첫 렌더(또는 재생 도중 처음 보이는 오브젝트)에서 프로그램 링크를 동기로
 * 기다리느라 메인 스레드가 수백 ms~수 초 멈추던 것(three onFirstUse)을 초기화 단계로 옮긴다.
 * KHR_parallel_shader_compile 이 있으면 컴파일 완료를 폴링하며 기다리므로 그동안 메인 스레드는 놀고,
 * 재생 중인 다른 씬(필름 스테이징)도 끊기지 않는다.
 *
 * - 씬: 숨김(visible=false) 오브젝트까지 전부 — 히어로 시퀀스 도중 등장하는 재질이 재생 중 컴파일되지 않게.
 *   컴포저를 쓰면 실제 그리는 대상(HalfFloat RT: 톤매핑 없음·선형)과 같은 조건으로 컴파일해야
 *   프로그램 캐시 키가 맞는다.
 * - 후처리: 블룸(하이패스·블러·합성·블렌드)은 RT 대상, OutputPass 는 화면 대상(정의값을 미리 맞춤).
 */
async function precompile(THREE: typeof THREE_NS, ctx: ThreeContext, alive: () => boolean) {
  const { renderer, scene, camera, composer } = ctx
  const prev = renderer.getRenderTarget()
  const waits: Promise<unknown>[] = []
  // 확장이 없으면 compileAsync 는 경고만 찍고 동기 compile 과 같다 — 그땐 compile 로(링크 대기는 첫 사용 시).
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile')
  // three 의 compileAsync 는 폴링 중 재질이 해제되면(필름 컷으로 씬이 정리될 때) currentProgram 이
  // 사라져 내부 setTimeout 에서 'isReady' TypeError 를 던진다. compile(병렬 확장에선 링크가 드라이버에서
  // 비동기로 진행) 후 우리가 직접, 해제된 재질은 건너뛰고 씬이 죽으면 멈추는 폴링으로 대체한다.
  const compile = (sc: THREE_NS.Object3D, cam: THREE_NS.Camera): Promise<unknown> => {
    const mats = renderer.compile(sc, cam) as unknown as Set<THREE_NS.Material> | undefined
    if (!parallel || !mats || mats.size === 0) return Promise.resolve()
    const pending = new Set(mats)
    return new Promise<void>((resolve) => {
      const check = () => {
        if (!alive()) return resolve()
        for (const m of pending) {
          const prog = (renderer.properties.get(m) as { currentProgram?: { isReady?: () => boolean } }).currentProgram
          if (!prog || typeof prog.isReady !== 'function' || prog.isReady()) pending.delete(m)
        }
        if (pending.size === 0) resolve()
        else setTimeout(check, 10)
      }
      check()
    })
  }
  renderer.setRenderTarget(composer ? composer.readBuffer : null)
  waits.push(compile(scene, camera))
  if (composer) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2))
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const rtScene = new THREE.Scene()
    const screenScene = new THREE.Scene()
    for (const pass of composer.passes) {
      const p = pass as unknown as Record<string, unknown> & { renderToScreen: boolean }
      if ('_outputColorSpace' in p && p.material) {
        // OutputPass.render 가 첫 호출에 하는 정의값 설정을 미리 — 그래야 같은 프로그램이 된다.
        const mat = p.material as THREE_NS.ShaderMaterial
        p._outputColorSpace = renderer.outputColorSpace
        p._toneMapping = renderer.toneMapping
        mat.defines = {}
        if (THREE.ColorManagement.getTransfer(renderer.outputColorSpace) === THREE.SRGBTransfer) mat.defines.SRGB_TRANSFER = ''
        if (renderer.toneMapping === THREE.ACESFilmicToneMapping) mat.defines.ACES_FILMIC_TONE_MAPPING = ''
        else if (renderer.toneMapping === THREE.AgXToneMapping) mat.defines.AGX_TONE_MAPPING = ''
        else if (renderer.toneMapping === THREE.NeutralToneMapping) mat.defines.NEUTRAL_TONE_MAPPING = ''
        else if (renderer.toneMapping === THREE.ReinhardToneMapping) mat.defines.REINHARD_TONE_MAPPING = ''
        else if (renderer.toneMapping === THREE.LinearToneMapping) mat.defines.LINEAR_TONE_MAPPING = ''
        else if (renderer.toneMapping === THREE.CineonToneMapping) mat.defines.CINEON_TONE_MAPPING = ''
        mat.needsUpdate = true
        ;(p.renderToScreen ? screenScene : rtScene).add(new THREE.Mesh(geo, mat))
        continue
      }
      const mats: THREE_NS.Material[] = []
      for (const v of Object.values(p)) {
        if (v && (v as THREE_NS.ShaderMaterial).isShaderMaterial) mats.push(v as THREE_NS.Material)
        else if (Array.isArray(v)) for (const m of v) if (m && (m as THREE_NS.ShaderMaterial).isShaderMaterial) mats.push(m)
      }
      for (const m of mats) rtScene.add(new THREE.Mesh(geo, m))
    }
    if (rtScene.children.length) waits.push(compile(rtScene, cam))
    if (screenScene.children.length) {
      renderer.setRenderTarget(null)
      waits.push(compile(screenScene, cam))
    }
    // 메시는 버려도 프로그램은 재질 속성에 남는다(재질/지오메트리는 패스 소유가 아님 → geo 만 정리).
    void Promise.all(waits).then(() => geo.dispose())
  }
  renderer.setRenderTarget(prev)
  await Promise.all(waits)
  // 확장이 없을 때: 링크 결과 확인(동기 대기)을 프로그램 하나씩 나눠 사이사이 양보한다 —
  // 첫 렌더 한 번에 몰리던 수백 ms 정지를 여러 개의 짧은 태스크로 쪼갠다(Firefox·SwiftShader 등).
  if (parallel) return
  // 재질 하나가 여러 프로그램(양면 투명의 앞/뒷면, 인스턴싱 유무 등)을 가질 수 있어 renderer.info.programs 전체를 돈다.
  const programs = [...((renderer.info.programs ?? []) as unknown as Array<{ getUniforms(): unknown }>)]
  // 의도적으로 순차(프로그램 사이마다 양보) — 병렬로 묶으면 쪼갠 의미가 없다.
  await programs.reduce<Promise<void>>(
    (chain, program) =>
      chain.then(yieldToMain).then(() => {
        if (alive()) program.getUniforms()
      }),
    Promise.resolve(),
  )
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
  const statsRef = useRef<Stats>({ frames: 0, updMs: 0, renderMs: 0, level: 0 })
  // 필름의 마스터 클럭(필름 안에 마운트됐을 때만). 매 프레임 ref 로 새로 읽는다(의존성 아님) —
  // 늦게 드러난 씬도 자기 마운트 이후 경과가 아니라 샷의 올바른 순간을 그리게.
  const clock = useSceneClock()
  const clockRef = useRef(clock)
  useLayoutEffect(() => {
    clockRef.current = clock
  }, [clock])

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
    const t0 = performance.now()
    res.update(t, dt)
    if (dt === 0) {
      // 정지 프레임(포스터·프리스테이징·?t=): update 안에서 옮긴 카메라의 행렬이 아직 갱신 전이라
      // HUD 투영이 이전 위치 기준으로 계산된다. 행렬을 갱신하고 한 번 더 돌려 라벨을 맞춘다.
      ctx.scene.updateMatrixWorld()
      ctx.camera.updateMatrixWorld()
      res.update(t, dt)
    }
    const t1 = performance.now()
    if (ctx.composer) ctx.composer.render(dt)
    else ctx.renderer.render(ctx.scene, ctx.camera)
    if (dt > 0) {
      const s = statsRef.current
      s.frames++
      s.updMs += t1 - t0
      s.renderMs += performance.now() - t1
    }
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
    /** 정지 프레임 시각: 클럭이 있으면 클럭, 없으면 누적 경과. */
    const staticT = () => clockRef.current?.now() ?? elapsedRef.current
    let destroyed = false
    let ro: ResizeObserver | null = null
    let readyRaf = 0
    let canvasEl: HTMLCanvasElement | null = null
    const stats = statsRef.current
    const allStats = (window.__threeStats ??= [])
    allStats.push(stats)
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
      // 독립적인 로딩(three 본체·후처리 패스·웹폰트)을 한 번에 — 순차 대기 없음.
      const [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three'),
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
      const startLevel = learnedLevel
      const dprFor = (lv: number) => Math.min(deviceDpr, lv >= 2 ? DPR_LOW : DPR_CAP)
      const samplesFor = (lv: number) => (lv >= 3 ? 0 : lv >= 1 ? 2 : MSAA_SAMPLES)
      const dpr = dprFor(startLevel)
      const useComposer = o.bloom !== false

      // 컴포저를 쓰면 화면 프레임버퍼는 OutputPass 의 풀스크린 쿼드만 받으므로 기본 MSAA 는 낭비 —
      // 대신 컴포저의 렌더 타깃을 멀티샘플로 만든다(아래).
      const renderer = useComposer
        ? acquireRenderer(THREE)
        : new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(dpr)
      renderer.setSize(w, h, false)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = o.exposure
      renderer.setClearColor(new THREE.Color(o.background), 1)
      const canvas = renderer.domElement
      canvasEl = canvas
      canvas.dataset.quality = String(startLevel)
      // 컨텍스트 소실(드라이버 리셋·컨텍스트 수 초과): 루프를 세우고 캔버스를 숨겨 배경색 정지 화면으로.
      // 복구 이벤트가 오면 전체 재초기화(epoch).
      canvas.addEventListener('webglcontextlost', onLost, false)
      canvas.addEventListener('webglcontextrestored', onRestored, false)
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
      canvas.style.width = '100%'
      canvas.style.height = '100%'
      canvas.style.display = 'block'

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(o.background)
      const camera = new THREE.PerspectiveCamera(o.fov, w / h, o.near, o.far)

      let composer: InstanceType<typeof EffectComposer> | null = null
      let bloomPass: InstanceType<typeof UnrealBloomPass> | null = null
      const maxSamples = renderer.capabilities.maxSamples || 0
      if (o.bloom !== false) {
        const b = o.bloom ?? {}
        // 멀티샘플 HalfFloat 타깃 — RenderPass 가 여기에 그려 가장자리가 매끈해진다(블룸 입력도 동일).
        const db = renderer.getDrawingBufferSize(new THREE.Vector2())
        const rt = new THREE.WebGLRenderTarget(db.x, db.y, { type: THREE.HalfFloatType, samples: Math.min(samplesFor(startLevel), maxSamples) })
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
        // 호출 시점의 클럭을 읽는다 — 보이는·재생 중 슬롯일 때만 clock.emit 이 있다.
        sound: (ev, sopts) => {
          if (runningRef.current) clockRef.current?.emit?.(ev, sopts)
        },
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

      // 첫 정지 프레임 상태를 만든 뒤(지연 생성되는 instanceColor 등이 프로그램 키에 반영되게)
      // 셰이더를 비동기로 미리 컴파일한다. 실패해도 렌더는 기존처럼 동기 컴파일로 진행.
      result.update(staticT(), 0)
      scene.updateMatrixWorld()
      await yieldToMain()
      if (destroyed) return
      try {
        await precompile(THREE, ctx, () => !destroyed)
      } catch (err) {
        console.warn('[useThreeScene] precompile failed:', err)
      }
      if (destroyed) return
      // 캔버스는 컴파일이 끝난 뒤에 붙인다 — 빈 캔버스가 먼저 보이지 않게(배경은 컨테이너 색).
      container.appendChild(canvas)

      ro = new ResizeObserver(() => {
        applySize()
        // 정지 중이면 새 크기로 정적 프레임 재그림.
        if (!runningRef.current || reducedRef.current) renderFrame(staticT(), 0)
      })
      ro.observe(container)

      // 적응형 품질 — tick 루프의 거버너가 호출한다. 한 번 호출에 정확히 한 칸.
      let level = startLevel
      stats.level = level
      const setDpr = (d: number) => {
        if (Math.abs(ctx.size.dpr - d) < 1e-3) return false
        ctx.size = { ...ctx.size, dpr: d }
        renderer.setPixelRatio(d)
        renderer.setSize(ctx.size.w, ctx.size.h, false)
        composer?.setPixelRatio(d) // 내부에서 setSize → 블룸 타깃까지 재할당
        result.resize?.(ctx.size.w, ctx.size.h) // dpr 에 의존하는 씬 리소스(포인트 크기·반사 RT) 갱신
        return true
      }
      const setSamples = (n: number) => {
        if (!composer) return false
        const want = Math.min(n, maxSamples)
        if (composer.renderTarget1.samples === want) return false
        for (const t of [composer.renderTarget1, composer.renderTarget2]) {
          t.samples = want
          t.dispose() // 다음 사용 시 새 샘플 수로 재할당
        }
        return true
      }
      qualityRef.current = {
        degrade() {
          while (level < MAX_LEVEL) {
            level++
            learnedLevel = Math.max(learnedLevel, level)
            stats.level = level
            canvas.dataset.quality = String(level) // 디버그/측정용
            const changed = level === 1 || level === 3 ? setSamples(samplesFor(level)) : setDpr(dprFor(level))
            if (changed) return true
          }
          return false
        },
      }

      // 첫 프레임을 그리고, 그 프레임이 실제로 페인트된 다음 프레임에 onReady.
      renderFrame(staticT(), 0)
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
      const i = allStats.indexOf(stats)
      if (i >= 0) allStats.splice(i, 1)
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
      // EffectComposer.dispose 는 자기 RT 만 정리한다 — 컨텍스트를 재사용하므로 패스(블룸 RT·재질)도 직접.
      for (const pass of ctx.composer?.passes ?? []) pass.dispose()
      ctx.composer?.dispose()
      if (ctx.composer) releaseRenderer(ctx.renderer)
      else retireRenderer(ctx.renderer)
    }
    // epoch: 컨텍스트 복구 시 렌더러 재생성 트리거.
  }, [container, renderFrame, epoch])

  // tick 루프 — running && !reduced 일 때만 공유 rAF 구독. 아니면 정적 1프레임.
  useEffect(() => {
    if (!ctxReady || lost) return
    const staticT = () => clockRef.current?.now() ?? elapsedRef.current
    const frozen = frozenTime()
    if (frozen !== null) {
      elapsedRef.current = frozen
      renderFrame(frozen, 0)
      return
    }
    if (reduced || !running) {
      renderFrame(staticT(), 0)
      return
    }
    startRef.current = 0
    lastRef.current = 0
    // 거버너: 1초 창마다 프레임 간격 중앙값을 본다(중앙값이라 한 번의 긴 끊김에 흔들리지 않음).
    // 느린 창이 SLOW_WINDOWS 번 연속이면 한 칸 강등, 강등 직후 GOV_SETTLE_MS 는 표본 제외.
    const win = new Float32Array(240)
    let wn = 0
    let winStart = 0
    let settleUntil = 0
    let slowRun = 0
    let lastT = -1
    const unsub = subscribe((now) => {
      if (startRef.current === 0) {
        startRef.current = now
        lastRef.current = now
        settleUntil = now + GOV_SETTLE_MS
        winStart = settleUntil
      }
      const raw = now - lastRef.current
      if (raw > 0 && now >= settleUntil) {
        if (wn < win.length) win[wn++] = raw
        if (now - winStart >= GOV_WINDOW_MS && wn >= 6) {
          const med = win.subarray(0, wn).sort()[wn >> 1]
          slowRun = med > SLOW_FRAME_MS ? slowRun + 1 : 0
          wn = 0
          winStart = now
          if (slowRun >= SLOW_WINDOWS) {
            slowRun = 0
            if (qualityRef.current?.degrade()) {
              settleUntil = now + GOV_SETTLE_MS
              winStart = settleUntil
            }
          }
        }
      }
      const clockT = clockRef.current?.now()
      const t = clockT != null ? clockT : elapsedRef.current + (now - startRef.current) / 1000
      const dt = Math.min(MAX_DT, raw / 1000)
      // 시각이 프레임 간격과 어긋나게 튀면(컷·되감기·클럭 보정) 그 직후 프레임은 거버너 표본에서 뺀다.
      if (lastT >= 0 && Math.abs(t - lastT - raw / 1000) > 0.25) {
        settleUntil = now + GOV_SETTLE_MS
        winStart = settleUntil
        wn = 0
      }
      lastT = t
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
