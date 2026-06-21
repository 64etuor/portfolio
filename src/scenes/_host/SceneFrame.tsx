'use client'

import { Suspense, lazy, useMemo, useState, type ComponentType } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useIntersectionObserver } from 'usehooks-ts'
import type { SceneProps } from './types'

type Loader = () => Promise<{ default: ComponentType<SceneProps> }>

/**
 * 갤러리/필름용 씬 래퍼. 화면에 가까워지면 lazy-mount + running, 멀어지면 pause.
 * 한 씬이 던져도 ErrorBoundary 로 격리돼 필름/갤러리 전체가 죽지 않는다.
 * (구 components/SceneFrame iframe 임시본을 대체.)
 */
export function SceneFrame({
  load,
  title,
  bg = '#050505',
  className,
  /** rootMargin — 뷰포트 도달 전에 미리 마운트할 여유. */
  rootMargin = '200px',
  /** keepMounted — 한번 마운트되면 화면 밖에서도 언마운트하지 않음(pause만). 필름 더블버퍼용. */
  keepMounted = false,
  /** hoverPlay — 갤러리용: 기본은 정지(포스터), 호버할 때만 재생. 자동재생 방지. */
  hoverPlay = false,
}: {
  load: Loader
  title: string
  bg?: string
  className?: string
  rootMargin?: string
  keepMounted?: boolean
  hoverPlay?: boolean
}) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold: 0,
    freezeOnceVisible: keepMounted,
  })
  const [hovered, setHovered] = useState(false)

  const Lazy = useMemo(() => lazy(load), [load])
  // freezeOnceVisible(=keepMounted) 면 한번 보이면 isIntersecting 이 고정돼 계속 마운트 유지.
  const mounted = isIntersecting
  // hoverPlay 면 호버 중에만 재생(SceneHost 가 freeze-resume → 떠날 때 마지막 프레임에서 정지).
  const running = hoverPlay ? isIntersecting && hovered : isIntersecting
  // 정지 상태: 캔버스(running=false)뿐 아니라 씬 CSS 오버레이(grain/scan/beat 등)도 멈춰
  // 카드가 완전 정지하도록 scene-frozen 클래스로 animation-play-state 를 paused 한다.
  const frozen = hoverPlay && !hovered
  const rootClass = [className, frozen ? 'scene-frozen' : ''].filter(Boolean).join(' ')

  return (
    <div
      ref={ref}
      className={rootClass}
      style={{ position: 'relative', background: bg, width: '100%', height: '100%' }}
      onMouseEnter={hoverPlay ? () => setHovered(true) : undefined}
      onMouseLeave={hoverPlay ? () => setHovered(false) : undefined}
    >
      <ErrorBoundary
        fallback={
          <div style={fallbackStyle}>
            <span>SCENE ERROR · {title}</span>
          </div>
        }
      >
        <Suspense
          fallback={
            <div style={fallbackStyle}>
              <span>LOADING · {title}</span>
            </div>
          }
        >
          {mounted ? <Lazy running={running} /> : null}
        </Suspense>
      </ErrorBoundary>
      {/* 호버 재생 힌트 — 정지 상태일 때만 표시. */}
      {hoverPlay && mounted && !hovered && (
        <div style={hintStyle} aria-hidden>
          ▶ 호버 시 재생
        </div>
      )}
    </div>
  )
}

const hintStyle = {
  position: 'absolute',
  bottom: 8,
  right: 10,
  padding: '3px 8px',
  borderRadius: 999,
  background: 'rgba(0,0,0,0.5)',
  border: '1px solid rgba(255,255,255,0.18)',
  color: 'rgba(255,255,255,0.62)',
  fontSize: 10,
  letterSpacing: '0.08em',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  pointerEvents: 'none',
} as const

const fallbackStyle = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: 'rgba(255,255,255,0.4)',
  fontSize: 12,
  letterSpacing: '0.2em',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
} as const
