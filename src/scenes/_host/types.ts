// 하네스 공유 타입.

/** draw 콜백이 매 프레임 받는 프레임 정보. */
export interface Frame {
  /** CSS px 너비 (DPR 미적용 — ctx 에 이미 DPR transform 이 걸려 있음) */
  w: number
  /** CSS px 높이 */
  h: number
  /** devicePixelRatio (≤2 캡) */
  dpr: number
  /** 씬 마운트(또는 running 시작) 기준 경과 시간(초). 기존 frame 의 (now-start)/1000 대체. */
  t: number
  /** 직전 프레임과의 간격(초). 탭 비활성/일시정지 후 점프는 캡됨. */
  dt: number
}

export type TickFn = (ctx: CanvasRenderingContext2D, f: Frame) => void

export interface UseSceneCanvasOptions {
  /** false 면 tick 을 등록하지 않는다(컬링/일시정지). 기본 true. */
  running?: boolean
  /** prefers-reduced-motion 시 t=0 정적 1프레임만 그린다. 기본 true. */
  reducedMotionStatic?: boolean
}

/** 갤러리/필름 씬 공통 prop. */
export interface SceneProps {
  /** 화면 안(IntersectionObserver) 일 때 true → 캔버스 tick on. */
  running?: boolean
  /** 씬이 그릴 준비가 됐을 때(폰트/첫 프레임) — Film 클럭 arming 용. */
  onReady?: () => void
}
