'use client'

import type { CSSProperties, ReactNode } from 'react'
import '../_styles/tokens.css'
import host from './host.module.css'

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
  return (
    <div
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
