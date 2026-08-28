'use client'

import { useRef, useState, type ComponentType } from 'react'
import { useIntersectionObserver } from 'usehooks-ts'
import { LazyScene } from './LazyScene'
import type { SceneProps } from './types'
import { SITE } from '@content/site'
import { useLocale } from '@/components/LocaleProvider'

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
  const { t } = useLocale()
  // freezeOnceVisible 을 쓰지 않고, 실제 교차 상태를 항상 추적한다.
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold: 0,
  })
  const [hovered, setHovered] = useState(false)
  // keepMounted: 한번이라도 보인 적 있으면 true 로 래치 — 이후 마운트를 유지.
  const hasEverIntersectedRef = useRef(false)
  if (isIntersecting) hasEverIntersectedRef.current = true

  // keepMounted 면 한 번 보인 후에는 마운트를 유지(pause 만). 아니면 교차 중에만 마운트.
  const mounted = keepMounted ? hasEverIntersectedRef.current : isIntersecting
  // running 은 항상 실제 교차 여부에 따른다 — keepMounted 씬도 화면 밖이면 멈춘다.
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
      {mounted ? (
        <LazyScene
          load={load}
          running={running}
          errorFallback={
            <div style={fallbackStyle}>
              <span>{t(SITE.scene.error)} · {title}</span>
            </div>
          }
          loadingFallback={
            <div style={fallbackStyle}>
              <span>{t(SITE.scene.loading)} · {title}</span>
            </div>
          }
        />
      ) : null}
      {/* 호버 재생 힌트 — 정지 상태일 때만 표시. */}
      {hoverPlay && mounted && !hovered && (
        <div style={hintStyle} aria-hidden>
          ▶ {t(SITE.scene.playOnHover)}
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
