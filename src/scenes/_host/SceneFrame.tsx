'use client'

import { Suspense, lazy, useMemo, type ComponentType } from 'react'
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
}: {
  load: Loader
  title: string
  bg?: string
  className?: string
  rootMargin?: string
  keepMounted?: boolean
}) {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold: 0,
    freezeOnceVisible: keepMounted,
  })

  const Lazy = useMemo(() => lazy(load), [load])
  // freezeOnceVisible(=keepMounted) 면 한번 보이면 isIntersecting 이 고정돼 계속 마운트 유지.
  const mounted = isIntersecting

  return (
    <div ref={ref} className={className} style={{ position: 'relative', background: bg, width: '100%', height: '100%' }}>
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
          {mounted ? <Lazy running={isIntersecting} /> : null}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

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
