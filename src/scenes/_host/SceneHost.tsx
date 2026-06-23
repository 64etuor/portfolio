'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import '../_styles/tokens.css'
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
    const reset = () => {
      const prev = scaledRef.current
      if (prev) {
        prev.style.removeProperty('transform')
        prev.style.removeProperty('transform-origin')
        prev.style.removeProperty('margin-left')
        prev.style.removeProperty('margin-right')
        scaledRef.current = null
      }
    }
    const fit = () => {
      reset()
      const cw = hostEl.clientWidth
      if (!cw || cw > FIT_MAX_W) return
      const wrap = hostEl.firstElementChild as HTMLElement | null
      if (!wrap) return
      if (wrap.querySelector('iframe')) return // 자체 스케일하는 iframe 씬(41-perspectives 등)
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
      if (!stage || maxW <= cw + 1) return
      if (stage.tagName === 'CANVAS') return // 캔버스 씬은 자체 리사이즈
      if (getComputedStyle(stage).transform !== 'none') return // 이미 자체 스케일
      const scale = cw / maxW
      // origin top-left + margin 0 → 좌상단 기준으로 축소(가로 중앙정렬 margin:auto 무력화)
      stage.style.transformOrigin = 'top left'
      stage.style.transform = `scale(${scale})`
      stage.style.marginLeft = '0'
      stage.style.marginRight = '0'
      scaledRef.current = stage
    }
    const raf = requestAnimationFrame(fit) // 씬 DOM 빌드 후 측정
    const ro = new ResizeObserver(fit)
    ro.observe(hostEl)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      reset()
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
