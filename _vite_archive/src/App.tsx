import { ReactLenis } from 'lenis/react'
import { Experience } from '@/three/Experience'
import { Nav } from '@/components/Nav'
import { HeroOverlay } from '@/sections/Hero'
import { About } from '@/sections/About'
import { ResumeSection } from '@/sections/Resume'
import { Contact } from '@/sections/Contact'

export default function App() {
  return (
    <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
      <Nav />

      {/* 풀스크린 인터랙티브 3D 히어로 (드래그 가능) + 이름 오버레이 */}
      <section id="top" className="relative h-screen w-full overflow-hidden">
        <Experience />
        <HeroOverlay />
      </section>

      {/* 본문 — 종이 배경 위 라이트 에디토리얼 */}
      <main className="relative z-10 bg-paper">
        <About />
        <ResumeSection />
        <Contact />
      </main>
    </ReactLenis>
  )
}
