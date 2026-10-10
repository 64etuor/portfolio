// 단일 공유 rAF 스케줄러.
// 33개 씬이 각자 requestAnimationFrame 루프를 돌리는 대신, visible/running 씬만
// 여기에 tick 콜백을 등록한다. 구독자가 1명 이상일 때만 루프가 돌고, 0이 되면 멈춘다.
// document.hidden 동안에는 (브라우저가 이미 rAF 를 멈추지만) 명시적으로 일시정지해
// 탭 복귀 시 dt 폭주를 막는다.

export type RafCb = (now: number) => void

const subs = new Set<RafCb>()
let rafId: number | null = null
let lastHiddenPause = false

function loop(now: number) {
  rafId = null
  // 다음 프레임을 먼저 예약 — 콜백이 throw 해도 루프가 죽지 않는다.
  schedule()
  // Set 직접 순회(매 프레임 배열 할당 없음) — 도중에 해제된 콜백은 건너뛰고, 도중에 추가된 콜백은
  // 이번 프레임에 한 번 더 불릴 수 있다(첫 tick 이 now 기준으로 초기화하므로 무해).
  for (const cb of subs) {
    try {
      cb(now)
    } catch (err) {
      console.error('[raf] subscriber threw, continuing loop:', err)
    }
  }
}

function schedule() {
  if (rafId != null) return
  if (subs.size === 0) return
  if (typeof document !== 'undefined' && document.hidden) {
    lastHiddenPause = true
    return
  }
  rafId = requestAnimationFrame(loop)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && lastHiddenPause) {
      lastHiddenPause = false
      schedule()
    }
  })
}

/** tick 콜백 등록. 해제 함수를 반환. */
export function subscribe(cb: RafCb): () => void {
  subs.add(cb)
  schedule()
  return () => {
    subs.delete(cb)
    if (subs.size === 0 && rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
}
