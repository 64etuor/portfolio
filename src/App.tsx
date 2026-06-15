import { ReactLenis } from 'lenis/react'
import { Experience } from '@/three/Experience'
import { Nav } from '@/components/Nav'
import { Hero } from '@/sections/Hero'
import { About } from '@/sections/About'
import { ResumeSection } from '@/sections/Resume'
import { Contact } from '@/sections/Contact'

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      {/* 화면 전체를 덮는 고정 3D 배경 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Experience />
      </div>

      <Nav />

      {/* 히어로: 투명 — 뒤의 3D 가 보인다 */}
      <Hero />

      {/* 본문: 불투명 배경으로 가독성 확보 (3D 위로 슬라이드업) */}
      <main className="relative z-0 bg-ink">
        <About />
        <ResumeSection />
        <Contact />
      </main>
    </ReactLenis>
  )
}
