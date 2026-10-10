'use client'

// 전역 라우트 전환 — template 은 네비게이션마다 re-mount 되므로, 여기 오버레이의
// CSS 애니메이션이 매 전환마다 재생된다(HOME 복귀 포함 전 라우트 일관 적용).
// CRT 컷 느낌: 다크 베일 리프트 + 스캔 스윕 + 페인트 플래시. reduced-motion 시 비활성.
//
// 하드 로드(첫 문서 진입)에는 재생하지 않는다: "전환"할 이전 화면이 없는데 불투명 베일이
// 0.5s 동안 첫 페인트를 덮어 FCP/LCP 만 늦췄다. SSR 과 첫 클라이언트 렌더가 모두 오버레이
// 없이 렌더되므로 하이드레이션도 일치하고, 이후 클라이언트 내비게이션부터 재생된다.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

let hasNavigated = false

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const playTransition = hasNavigated
  useEffect(() => {
    hasNavigated = true
  }, [])
  return (
    <>
      {children}
      {playTransition && (
        <div key={pathname} className="route-tx" aria-hidden>
          <div className="route-tx-veil" />
          <div className="route-tx-scan" />
          <div className="route-tx-flash" />
        </div>
      )}
    </>
  )
}
