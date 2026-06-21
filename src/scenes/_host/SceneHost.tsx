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
 */
export function SceneHost({
  children,
  bg = '#050505',
  className,
  style,
  film = true,
  scroll = false,
}: {
  children: ReactNode
  bg?: string
  className?: string
  style?: CSSProperties
  film?: boolean
  /** true: 콘텐츠가 스테이지보다 길 때 세로 스크롤 허용(키 큰 DOM 대시보드용). 기본 false=클립. */
  scroll?: boolean
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
