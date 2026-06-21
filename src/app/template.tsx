'use client'

// 전역 라우트 전환 — template 은 네비게이션마다 re-mount 되므로, 여기 오버레이의
// CSS 애니메이션이 매 전환마다 재생된다(HOME 복귀 포함 전 라우트 일관 적용).
// CRT 컷 느낌: 다크 베일 리프트 + 스캔 스윕 + 페인트 플래시. reduced-motion 시 비활성.
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <>
      {children}
      <div key={pathname} className="route-tx" aria-hidden>
        <div className="route-tx-veil" />
        <div className="route-tx-scan" />
        <div className="route-tx-flash" />
      </div>
    </>
  )
}
