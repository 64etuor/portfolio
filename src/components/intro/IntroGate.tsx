'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { IntroSequence } from './IntroSequence'

/**
 * 홈 진입 시 인트로 시퀀스(부팅→turn-off→타이핑→릴)를 오버레이로 재생.
 * 세션당 한 번만 자동 재생(sessionStorage). ?intro 쿼리로 강제 재생 가능.
 * children(갤러리)은 항상 아래에 있고, 인트로가 끝나면 오버레이가 사라진다.
 */
export function IntroGate({ children }: { children: ReactNode }) {
  const [playing, setPlaying] = useState(true)

  useEffect(() => {
    const seen = sessionStorage.getItem('pf-intro-seen')
    const force = new URLSearchParams(window.location.search).has('intro')
    if (seen && !force) setPlaying(false)
  }, [])

  const finish = () => {
    sessionStorage.setItem('pf-intro-seen', '1')
    setPlaying(false)
  }

  return (
    <>
      {children}
      {playing && <IntroSequence onComplete={finish} />}
    </>
  )
}
