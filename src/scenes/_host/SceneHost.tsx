'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import '../_styles/tokens.css'
import '../_styles/scene-fonts'
import host from './host.module.css'

/** 모바일에서 고정폭 "계기판" 씬(예: .stage{width:1600px})이 잘리지 않게 컨테이너 폭에 맞춰 축소.
 *  - cw<=760(모바일/태블릿)에서만 동작 → 데스크톱 레이아웃은 그대로.
 *  - 씬 래퍼의 직속 자식 중 컨테이너보다 넓은 가장 큰 블록(스테이지)만 scale.
 *  - 캔버스 씬(자체 ResizeObserver)·이미 transform 으로 자체 스케일하는 씬(41-perspectives)은 건드리지 않음. */
const FIT_MAX_W = 760
function useFitWidth(hostRef: React.RefObject<HTMLDivElement | null>) {
  const scaledRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const hostEl = hostRef.current
    if (!hostEl) return
    const clear = (el: HTMLElement | null) => {
      if (!el) return
      el.style.removeProperty('transform')
      el.style.removeProperty('transform-origin')
    }
    // 강제 동기 reflow 방지: 측정(read)을 모두 끝낸 뒤에만 스타일을 쓴다(write).
    const apply = () => {
      // ── READ ──
      const cw = hostEl.clientWidth
      const wrap = hostEl.firstElementChild as HTMLElement | null
      const prev = scaledRef.current
      if (!cw || cw > FIT_MAX_W || !wrap || wrap.querySelector('iframe')) {
        clear(prev) // iframe 씬(41-perspectives 등)·데스크톱은 스케일 안 함
        scaledRef.current = null
        return
      }
      // 씬 래퍼의 직속 자식 중 가장 넓은 블록 = 설계 스테이지(예: width:1600px)
      let stage: HTMLElement | null = null
      let maxW = 0
      for (const c of Array.from(wrap.children) as HTMLElement[]) {
        const w = c.scrollWidth || c.offsetWidth
        if (w > maxW) {
          maxW = w
          stage = c
        }
      }
      // ── WRITE ──
      if (!stage || maxW <= cw + 1 || stage.tagName === 'CANVAS') {
        clear(prev) // 캔버스 씬·이미 맞는 씬은 스케일 불필요
        scaledRef.current = null
        return
      }
      if (prev && prev !== stage) clear(prev)
      // over-wide 요소라 margin:auto 는 0 으로 계산됨 → origin top-left 로 좌상단 기준 축소.
      stage.style.transformOrigin = 'top left'
      stage.style.transform = `scale(${cw / maxW})`
      scaledRef.current = stage
    }
    // ResizeObserver 버스트(방향전환·URL바 토글)를 rAF 한 프레임으로 합쳐 thrash 방지.
    let raf = 0
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        apply()
      })
    }
    schedule() // 씬 DOM 빌드 후 1회 측정
    const ro = new ResizeObserver(schedule)
    ro.observe(hostEl)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      clear(scaledRef.current)
      scaledRef.current = null
    }
  }, [hostRef])
}

/**
 * 씬 스테이지 프레이밍. 풀블리드(부모를 100% 채움)로 캔버스 + 정적 오버레이를
 * 한 좌표계에 겹친다. 배경 톤(bg)은 씬이 로드되기 전/여백을 메운다.
 *
 * 씬은 이 안에 <canvas ref={useSceneCanvas(...)} /> 와 오버레이 JSX 를 넣는다.
 * film=true(기본): 전 씬 공통 low-fi 필름 오버레이(그레인+스캔라인+비네팅)를 최상단에 깐다.
 *
 * overlay: CRT 씬들이 각자 복붙하던 grain/scan/vignette 오버레이의 공통 골격을 SceneHost 가
 * 대신 렌더한다. 씬마다 다른 수치(투명도·그라디언트·z-index)는 그대로 넘겨받아 CSS 변수로
 * 주입하므로 렌더 결과는 기존 로컬 오버레이와 픽셀 동일하다. 보일러플레이트만 한 곳으로 모은 것.
 */
type ScanOverlay = { bg: string; z?: number; opacity?: number }
type VignetteOverlay = { bg: string; z?: number; opacity?: number }
type GrainOverlay = { opacity?: number; z?: number; dur?: string }

export function SceneHost({
  children,
  bg = '#050505',
  className,
  style,
  film = true,
  scroll = false,
  overlay,
}: {
  children: ReactNode
  bg?: string
  className?: string
  style?: CSSProperties
  film?: boolean
  /** true: 콘텐츠가 스테이지보다 길 때 세로 스크롤 허용(키 큰 DOM 대시보드용). 기본 false=클립. */
  scroll?: boolean
  /** CRT 씬 전용 오버레이. 지정한 레이어만 렌더. 수치는 씬별 원본 그대로 전달한다. */
  overlay?: {
    grain?: GrainOverlay
    scan?: ScanOverlay
    vignette?: VignetteOverlay
  }
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useFitWidth(ref)
  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflowX: 'hidden',
        overflowY: scroll ? 'auto' : 'hidden',
        background: bg,
        ...style,
      }}
    >
      {children}
      {overlay?.grain && (
        <div
          className={host.sceneGrain}
          aria-hidden
          style={
            {
              '--ov-grain-opacity': overlay.grain.opacity,
              '--ov-grain-z': overlay.grain.z,
              '--ov-grain-dur': overlay.grain.dur,
            } as CSSProperties
          }
        />
      )}
      {overlay?.scan && (
        <div
          className={host.sceneScan}
          aria-hidden
          style={
            {
              '--ov-scan-bg': overlay.scan.bg,
              '--ov-scan-z': overlay.scan.z,
              '--ov-scan-opacity': overlay.scan.opacity,
            } as CSSProperties
          }
        />
      )}
      {overlay?.vignette && (
        <div
          className={host.sceneVignette}
          aria-hidden
          style={
            {
              '--ov-vignette-bg': overlay.vignette.bg,
              '--ov-vignette-z': overlay.vignette.z,
              '--ov-vignette-opacity': overlay.vignette.opacity,
            } as CSSProperties
          }
        />
      )}
      {/* 필름 오버레이(그레인)는 평평한 스크롤 대시보드에선 끔 — 다크 플랫 배경 위에서
         애니메이션 그레인이 "중앙 회색 움직임"으로 거슬리고, 그 씬들은 원래 클린 설계였음. */}
      {film && !scroll && (
        <div className={host.film} aria-hidden>
          <div className={host.grain} />
        </div>
      )}
    </div>
  )
}
